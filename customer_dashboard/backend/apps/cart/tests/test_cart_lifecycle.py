"""
FAAZO – Cart Lifecycle & Inventory Protection Tests

Verifies complete cart lifecycle operations:
  - Adding ACTIVE products by slug and UUID
  - CartItem creation and ownership validation
  - Idempotent duplicate-add quantity incrementation
  - Inventory protections: out-of-stock rejection, overselling rejection
  - Product status restrictions: draft, archived, discontinued, deleted products rejected
  - Unauthenticated rejection (401)
  - Customer data isolation (Customer A cannot see Customer B's cart)
"""

from decimal import Decimal
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.brands.models import Brand
from apps.categories.models import Category
from apps.products.models import Product, ProductStatus
from apps.pricing.models import ProductPricing
from apps.inventory.models import ProductInventory
from apps.cart.models import Cart, CartItem
from apps.users.models import User, UserRole


class CartLifecycleTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.user_a = User.objects.create_user(
            email="customera@faazo.com",
            full_name="Customer A",
            password="Password123!",
            role=UserRole.CUSTOMER,
        )
        self.user_b = User.objects.create_user(
            email="customerb@faazo.com",
            full_name="Customer B",
            password="Password123!",
            role=UserRole.CUSTOMER,
        )

        # Category and Brand
        self.category = Category.objects.create(name="Dental Tools", slug="dental-tools")
        self.brand = Brand.objects.create(name="Faazo Tools", slug="faazo-tools")

        # Active Product with stock 10
        self.active_product = Product.objects.create(
            name="Scaler Pro",
            slug="scaler-pro",
            sku="SCALER-01",
            category=self.category,
            brand=self.brand,
            status=ProductStatus.ACTIVE,
        )
        ProductPricing.objects.create(
            product=self.active_product,
            mrp=Decimal("5000.00"),
            selling_price=Decimal("4500.00"),
        )
        self.active_inventory = ProductInventory.objects.create(
            product=self.active_product,
            current_stock=10,
            reserved_stock=0,
            allow_backorders=False,
        )

        # Out-of-Stock Product
        self.oos_product = Product.objects.create(
            name="Out of Stock Handpiece",
            slug="oos-handpiece",
            sku="OOS-01",
            category=self.category,
            brand=self.brand,
            status=ProductStatus.ACTIVE,
        )
        ProductPricing.objects.create(
            product=self.oos_product,
            mrp=Decimal("3000.00"),
            selling_price=Decimal("2500.00"),
        )
        ProductInventory.objects.create(
            product=self.oos_product,
            current_stock=0,
            reserved_stock=0,
            allow_backorders=False,
        )

        # Draft Product
        self.draft_product = Product.objects.create(
            name="Draft Instrument",
            slug="draft-instrument",
            sku="DRAFT-01",
            category=self.category,
            brand=self.brand,
            status=ProductStatus.DRAFT,
        )
        ProductPricing.objects.create(
            product=self.draft_product,
            mrp=Decimal("1000.00"),
            selling_price=Decimal("800.00"),
        )
        ProductInventory.objects.create(
            product=self.draft_product,
            current_stock=50,
            reserved_stock=0,
        )

        # Archived Product
        self.archived_product = Product.objects.create(
            name="Archived Forceps",
            slug="archived-forceps",
            sku="ARCH-01",
            category=self.category,
            brand=self.brand,
            status=ProductStatus.ARCHIVED,
        )

        # Discontinued Product
        self.discontinued_product = Product.objects.create(
            name="Old Model Bur",
            slug="old-model-bur",
            sku="DISC-01",
            category=self.category,
            brand=self.brand,
            status=ProductStatus.DISCONTINUED,
        )

        # Deleted Product
        self.deleted_product = Product.objects.create(
            name="Deleted Mirror",
            slug="deleted-mirror",
            sku="DEL-01",
            category=self.category,
            brand=self.brand,
            status=ProductStatus.ACTIVE,
            is_deleted=True,
        )

    def test_01_authenticated_customer_can_add_active_product_by_slug(self):
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post("/api/v1/cart/add/", {"product_id": "scaler-pro", "quantity": 2}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get("success"))

        cart = Cart.objects.get(user=self.user_a)
        self.assertEqual(cart.items.count(), 1)
        item = cart.items.first()
        self.assertEqual(item.product, self.active_product)
        self.assertEqual(item.quantity, 2)

    def test_02_authenticated_customer_can_add_active_product_by_uuid(self):
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post("/api/v1/cart/add/", {"product_id": str(self.active_product.id), "quantity": 1}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get("success"))

        cart = Cart.objects.get(user=self.user_a)
        self.assertEqual(cart.items.filter(product=self.active_product).first().quantity, 1)

    def test_03_cart_item_is_created_correctly_with_metadata(self):
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post("/api/v1/cart/add/", {"product_id": "scaler-pro", "quantity": 3}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data.get("data", {})
        self.assertEqual(data.get("item_count"), 3)
        items = data.get("items", [])
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["product"]["slug"], "scaler-pro")
        self.assertEqual(items[0]["quantity"], 3)
        self.assertEqual(items[0]["price"], 4500.0)

    def test_04_correct_customer_owns_cart_item(self):
        self.client.force_authenticate(user=self.user_a)
        self.client.post("/api/v1/cart/add/", {"product_id": "scaler-pro", "quantity": 1}, format="json")

        cart_a = Cart.objects.get(user=self.user_a)
        item = CartItem.objects.get(cart=cart_a, product=self.active_product)
        self.assertEqual(item.cart.user, self.user_a)
        self.assertNotEqual(item.cart.user, self.user_b)

    def test_05_duplicate_add_increments_quantity(self):
        self.client.force_authenticate(user=self.user_a)
        # First add: qty = 2
        res1 = self.client.post("/api/v1/cart/add/", {"product_id": "scaler-pro", "quantity": 2}, format="json")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Second add: qty = 3 (target total = 5)
        res2 = self.client.post("/api/v1/cart/add/", {"product_id": "scaler-pro", "quantity": 3}, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

        cart = Cart.objects.get(user=self.user_a)
        self.assertEqual(cart.items.count(), 1)
        self.assertEqual(cart.items.first().quantity, 5)

    def test_06_out_of_stock_product_is_rejected(self):
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post("/api/v1/cart/add/", {"product_id": "oos-handpiece", "quantity": 1}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res.data.get("success"))
        error_msg = str(res.data.get("error", {}))
        self.assertIn("out of stock", error_msg.lower())

    def test_07_quantity_greater_than_available_stock_is_rejected(self):
        self.client.force_authenticate(user=self.user_a)
        # Available stock is 10; requesting 11
        res = self.client.post("/api/v1/cart/add/", {"product_id": "scaler-pro", "quantity": 11}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        error_msg = str(res.data.get("error", {}))
        self.assertIn("insufficient stock", error_msg.lower())

    def test_08_draft_product_is_rejected(self):
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post("/api/v1/cart/add/", {"product_id": "draft-instrument", "quantity": 1}, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_09_archived_product_is_rejected(self):
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post("/api/v1/cart/add/", {"product_id": "archived-forceps", "quantity": 1}, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_10_discontinued_product_is_rejected(self):
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post("/api/v1/cart/add/", {"product_id": "old-model-bur", "quantity": 1}, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_11_deleted_product_is_rejected(self):
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post("/api/v1/cart/add/", {"product_id": "deleted-mirror", "quantity": 1}, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_12_unauthenticated_request_is_rejected(self):
        res = self.client.post("/api/v1/cart/add/", {"product_id": "scaler-pro", "quantity": 1}, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_13_customer_a_cannot_see_customer_b_cart(self):
        # Customer A adds item
        self.client.force_authenticate(user=self.user_a)
        self.client.post("/api/v1/cart/add/", {"product_id": "scaler-pro", "quantity": 2}, format="json")

        # Customer B fetches their own cart
        self.client.force_authenticate(user=self.user_b)
        res = self.client.get("/api/v1/cart/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        items = res.data.get("data", {}).get("items", [])
        self.assertEqual(len(items), 0)
        self.assertEqual(res.data.get("data", {}).get("item_count"), 0)

    def test_14_existing_inventory_validation_protects_incremental_adds(self):
        self.client.force_authenticate(user=self.user_a)
        # Add 9 items (allowed, available is 10)
        res1 = self.client.post("/api/v1/cart/add/", {"product_id": "scaler-pro", "quantity": 9}, format="json")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Add 2 more items (9 + 2 = 11 > 10, should be rejected)
        res2 = self.client.post("/api/v1/cart/add/", {"product_id": "scaler-pro", "quantity": 2}, format="json")
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        error_msg = str(res2.data.get("error", {}))
        self.assertIn("insufficient stock", error_msg.lower())

        # Existing cart should remain untouched at 9 items
        cart = Cart.objects.get(user=self.user_a)
        self.assertEqual(cart.items.first().quantity, 9)
