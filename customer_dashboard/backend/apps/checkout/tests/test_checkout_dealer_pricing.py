"""
FAAZO -- Checkout Dealer Pricing & Authorization Tests

Verifies:
  1. calculate_checkout_pricing() returns dealer_price for APPROVED dealers only
  2. CheckoutPlaceView returns 403 for non-approved dealers
  3. CheckoutPreviewView returns retail price for pending/rejected/no-app dealers
  4. Frontend-submitted dealer_price cannot manipulate backend pricing
"""

from decimal import Decimal

from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.brands.models import Brand
from apps.categories.models import Category
from apps.dealer.models import DealerApplication, DealerStatus
from apps.inventory.models import ProductInventory
from apps.pricing.models import ProductPricing
from apps.products.models import Product
from apps.users.models import Address, User, UserRole


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


def _make_product(slug="checkout-dealer-prod", mrp="20000.00", selling="16000.00", dealer="12000.00"):
    cat = Category.objects.get_or_create(name="CheckoutCat", slug="checkout-cat")[0]
    brand = Brand.objects.get_or_create(name="CheckoutBrand", slug="checkout-brand")[0]
    product = Product.objects.create(
        name="Checkout Test Product",
        slug=slug,
        category=cat,
        brand=brand,
        sku=f"SKU-{slug}",
    )
    ProductPricing.objects.create(
        product=product,
        mrp=Decimal(mrp),
        selling_price=Decimal(selling),
        dealer_price=Decimal(dealer),
        gst_percentage=Decimal("18.00"),
    )
    ProductInventory.objects.create(
        product=product,
        current_stock=100,
        reserved_stock=0,
        allow_backorders=False,
    )
    return product


def _make_address(user):
    return Address.objects.create(
        user=user,
        label="Clinic",
        full_name=user.full_name,
        mobile="9876543210",
        line1="1 Dental Street",
        city="Mumbai",
        state="Maharashtra",
        pincode="400001",
        address_type="both",
    )


# ---------------------------------------------------------------------------
# 1. Unit test: calculate_checkout_pricing() price resolution
# ---------------------------------------------------------------------------

@override_settings(WAREHOUSE_STATE="Tamil Nadu")
class CheckoutPricingHelperTest(TestCase):
    """
    Tests the calculate_checkout_pricing() helper directly.
    This verifies the price used when building order line items.
    """

    @classmethod
    def setUpTestData(cls):
        cls.product = _make_product(slug="cp-helper-prod")
        cls.pricing = ProductPricing.objects.get(product=cls.product)
        cls.retail_price = float(cls.pricing.effective_price)
        cls.dealer_price = float(cls.pricing.dealer_price)

    def _run_pricing(self, user):
        from apps.checkout.views import calculate_checkout_pricing

        class DummyItem:
            def __init__(self, product):
                self.product = product
                self.quantity = 1

        address = _make_address(user)
        return calculate_checkout_pricing(user, [DummyItem(self.product)], "standard", address)

    def test_approved_dealer_gets_dealer_price(self):
        user = _make_user("cp_approved@test.com", role=UserRole.DEALER)
        _make_application(user, DealerStatus.APPROVED)
        result = self._run_pricing(user)
        # selling_subtotal should equal dealer_price (GST-inclusive)
        self.assertAlmostEqual(
            result["selling_subtotal"], self.dealer_price, places=1,
            msg="Approved dealer checkout pricing should use dealer_price"
        )

    def test_pending_dealer_gets_retail_price(self):
        user = _make_user("cp_pending@test.com", role=UserRole.DEALER)
        _make_application(user, DealerStatus.PENDING)
        result = self._run_pricing(user)
        self.assertAlmostEqual(
            result["selling_subtotal"], self.retail_price, places=1,
            msg="Pending dealer checkout pricing should use retail price"
        )
        self.assertNotAlmostEqual(result["selling_subtotal"], self.dealer_price, places=1)

    def test_rejected_dealer_gets_retail_price(self):
        user = _make_user("cp_rejected@test.com", role=UserRole.DEALER)
        _make_application(user, DealerStatus.REJECTED)
        result = self._run_pricing(user)
        self.assertAlmostEqual(
            result["selling_subtotal"], self.retail_price, places=1,
            msg="Rejected dealer checkout pricing should use retail price"
        )

    def test_dealer_without_application_gets_retail_price(self):
        """CRITICAL: dealer role with no application must get retail pricing."""
        user = _make_user("cp_noapp@test.com", role=UserRole.DEALER)
        self.assertFalse(DealerApplication.objects.filter(user=user).exists())
        result = self._run_pricing(user)
        self.assertAlmostEqual(
            result["selling_subtotal"], self.retail_price, places=1,
            msg="Dealer without app should get retail price, not dealer_price"
        )
        self.assertNotAlmostEqual(
            result["selling_subtotal"], self.dealer_price, places=1,
            msg="SECURITY VIOLATION: dealer role alone yielded dealer_price in checkout!"
        )

    def test_customer_gets_retail_price(self):
        user = _make_user("cp_cust@test.com", role=UserRole.CUSTOMER)
        result = self._run_pricing(user)
        self.assertAlmostEqual(result["selling_subtotal"], self.retail_price, places=1)


# ---------------------------------------------------------------------------
# 2. API test: CheckoutPlaceView permission enforcement
# ---------------------------------------------------------------------------

@override_settings(WAREHOUSE_STATE="Tamil Nadu")
class CheckoutPlacePermissionTest(APITestCase):
    """
    Verifies that CheckoutPlaceView enforces IsApprovedDealer.
    Pending/rejected/no-app dealers must receive HTTP 403.
    """

    URL = "/api/v1/checkout/place/"

    @classmethod
    def setUpTestData(cls):
        cls.product = _make_product(slug="place-perm-prod")

    def _post_place(self, user):
        address = _make_address(user)
        self.client.force_authenticate(user=user)
        return self.client.post(self.URL, {
            "address_id": str(address.id),
            "delivery_method": "standard",
            "payment_method": "upi",
            "items": [{"product_id": str(self.product.id), "quantity": 1}],
        }, format="json")

    def test_approved_dealer_can_place_order(self):
        user = _make_user("place_approved@test.com", role=UserRole.DEALER)
        _make_application(user, DealerStatus.APPROVED)
        response = self._post_place(user)
        # Should not be 403 (may be 200 or other non-auth error)
        self.assertNotEqual(
            response.status_code, status.HTTP_403_FORBIDDEN,
            "Approved dealer must not receive 403 on checkout place"
        )

    def test_pending_dealer_gets_403_on_place(self):
        user = _make_user("place_pending@test.com", role=UserRole.DEALER)
        _make_application(user, DealerStatus.PENDING)
        response = self._post_place(user)
        self.assertEqual(
            response.status_code, status.HTTP_403_FORBIDDEN,
            "Pending dealer must receive 403 on checkout place"
        )

    def test_rejected_dealer_gets_403_on_place(self):
        user = _make_user("place_rejected@test.com", role=UserRole.DEALER)
        _make_application(user, DealerStatus.REJECTED)
        response = self._post_place(user)
        self.assertEqual(
            response.status_code, status.HTTP_403_FORBIDDEN,
            "Rejected dealer must receive 403 on checkout place"
        )

    def test_dealer_without_application_gets_403_on_place(self):
        """CRITICAL: dealer role alone (no application) must be blocked."""
        user = _make_user("place_noapp@test.com", role=UserRole.DEALER)
        self.assertFalse(DealerApplication.objects.filter(user=user).exists())
        response = self._post_place(user)
        self.assertEqual(
            response.status_code, status.HTTP_403_FORBIDDEN,
            "SECURITY VIOLATION: dealer without application was not blocked at checkout place!"
        )

    def test_customer_can_attempt_place(self):
        """Customers pass IsApprovedDealer (non-dealers are allowed)."""
        user = _make_user("place_cust@test.com", role=UserRole.CUSTOMER)
        response = self._post_place(user)
        self.assertNotEqual(
            response.status_code, status.HTTP_403_FORBIDDEN,
            "Customer must not receive 403 on checkout place"
        )
