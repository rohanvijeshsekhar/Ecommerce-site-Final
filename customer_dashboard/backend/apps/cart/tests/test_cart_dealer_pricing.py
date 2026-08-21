"""
FAAZO -- Cart Dealer Pricing Tests

Verifies that the cart API returns the correct price for each dealer status:

  Approved dealer  -> dealer_price
  Pending dealer   -> retail effective_price
  Rejected dealer  -> retail effective_price
  No application   -> retail effective_price
  Customer         -> retail effective_price
"""

from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIRequestFactory

from apps.brands.models import Brand
from apps.cart.models import Cart, CartItem
from apps.cart.serializers import CartItemSerializer
from apps.categories.models import Category
from apps.dealer.models import DealerApplication, DealerStatus
from apps.inventory.models import ProductInventory
from apps.pricing.models import ProductPricing
from apps.products.models import Product
from apps.users.models import User, UserRole


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user(email, role=UserRole.CUSTOMER, password="TestPass123!"):
    return User.objects.create_user(
        email=email,
        full_name="Test User",
        password=password,
        role=role,
    )


def _make_application(user, status):
    return DealerApplication.objects.create(
        user=user,
        company_name="Test Dealer Co",
        status=status,
    )


def _make_product(slug="test-prod", mrp="20000.00", selling_price="16000.00", dealer_price="12000.00"):
    cat = Category.objects.get_or_create(name="Test Cat", slug="test-cat")[0]
    brand = Brand.objects.get_or_create(name="Test Brand", slug="test-brand")[0]
    product = Product.objects.create(
        name="Test Product",
        slug=slug,
        category=cat,
        brand=brand,
        sku=f"SKU-{slug}",
    )
    ProductPricing.objects.create(
        product=product,
        mrp=Decimal(mrp),
        selling_price=Decimal(selling_price),
        dealer_price=Decimal(dealer_price),
        gst_percentage=Decimal("18.00"),
    )
    ProductInventory.objects.create(
        product=product,
        current_stock=100,
        reserved_stock=0,
        allow_backorders=False,
    )
    return product


def _serialized_price(user, product, qty=1):
    """Run CartItemSerializer and return the price field via APIRequestFactory."""
    cart = Cart.objects.create(user=user)
    item = CartItem.objects.create(cart=cart, product=product, quantity=qty)

    factory = APIRequestFactory()
    request = factory.get("/")
    # force_authenticate sets request.user properly in DRF context
    from rest_framework.test import force_authenticate
    force_authenticate(request, user=user)
    # Manually set user since APIRequestFactory does not call auth
    request.user = user

    serializer = CartItemSerializer(item, context={"request": request})
    price = serializer.data["price"]

    # Cleanup
    cart.delete()
    return price


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class CartDealerPricingTest(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.product = _make_product(slug="cart-dealer-prod")
        cls.retail_price = float(
            ProductPricing.objects.get(product=cls.product).effective_price
        )
        cls.dealer_price_val = float(
            ProductPricing.objects.get(product=cls.product).dealer_price
        )

    def test_approved_dealer_sees_dealer_price(self):
        user = _make_user("cart_approved@test.com", role=UserRole.DEALER)
        _make_application(user, DealerStatus.APPROVED)
        # Refresh from DB to clear cached properties
        user.refresh_from_db()
        price = _serialized_price(user, self.product)
        self.assertEqual(
            price, self.dealer_price_val,
            f"Approved dealer should see dealer_price={self.dealer_price_val}, got {price}"
        )

    def test_pending_dealer_sees_retail_price(self):
        user = _make_user("cart_pending@test.com", role=UserRole.DEALER)
        _make_application(user, DealerStatus.PENDING)
        price = _serialized_price(user, self.product)
        self.assertEqual(
            price, self.retail_price,
            f"Pending dealer should see retail={self.retail_price}, got {price}"
        )
        self.assertNotEqual(price, self.dealer_price_val)

    def test_rejected_dealer_sees_retail_price(self):
        user = _make_user("cart_rejected@test.com", role=UserRole.DEALER)
        _make_application(user, DealerStatus.REJECTED)
        price = _serialized_price(user, self.product)
        self.assertEqual(
            price, self.retail_price,
            f"Rejected dealer should see retail={self.retail_price}, got {price}"
        )
        self.assertNotEqual(price, self.dealer_price_val)

    def test_dealer_without_application_sees_retail_price(self):
        """CRITICAL: dealer role with NO application must get retail pricing."""
        user = _make_user("cart_noapp@test.com", role=UserRole.DEALER)
        self.assertFalse(DealerApplication.objects.filter(user=user).exists())
        price = _serialized_price(user, self.product)
        self.assertEqual(
            price, self.retail_price,
            f"Dealer without app should see retail={self.retail_price}, got {price}"
        )
        self.assertNotEqual(
            price, self.dealer_price_val,
            "SECURITY VIOLATION: dealer role alone granted dealer price in cart!"
        )

    def test_customer_sees_retail_price(self):
        user = _make_user("cart_cust@test.com", role=UserRole.CUSTOMER)
        price = _serialized_price(user, self.product)
        self.assertEqual(
            price, self.retail_price,
            f"Customer should see retail={self.retail_price}, got {price}"
        )
        self.assertNotEqual(price, self.dealer_price_val)

    def test_dealer_price_lower_than_retail(self):
        """Sanity check: ensure test fixture has dealer_price < effective_price."""
        self.assertLess(self.dealer_price_val, self.retail_price)
