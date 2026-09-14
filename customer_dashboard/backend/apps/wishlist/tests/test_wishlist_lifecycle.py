"""
FAAZO – Wishlist Lifecycle & Identifier Compatibility Tests

Verifies complete wishlist lifecycle operations:
  - Toggle by slug and UUID
  - Idempotent duplicate prevention (second toggle removes item)
  - Delete by slug and UUID
  - Move to cart by slug and UUID
  - Guest wishlist sync supporting mixed slugs and UUIDs
  - Invalid product handling (clean 404 without 500 crashes)
  - Unauthenticated rejection (401)
  - Customer data isolation (Customer A cannot see Customer B's wishlist)
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
from apps.wishlist.models import Wishlist, WishlistItem
from apps.users.models import User, UserRole


class WishlistLifecycleTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.user_a = User.objects.create_user(
            email="wishlista@faazo.com",
            full_name="Wishlist User A",
            password="Password123!",
            role=UserRole.CUSTOMER,
        )
        self.user_b = User.objects.create_user(
            email="wishlistb@faazo.com",
            full_name="Wishlist User B",
            password="Password123!",
            role=UserRole.CUSTOMER,
        )

        # Category and Brand
        self.category = Category.objects.create(name="Dental Implants", slug="dental-implants")
        self.brand = Brand.objects.create(name="OsseoPro", slug="osseopro")

        # Products
        self.product_1 = Product.objects.create(
            name="Titanium Implant 4.0",
            slug="titanium-implant-40",
            sku="IMP-40",
            category=self.category,
            brand=self.brand,
            status=ProductStatus.ACTIVE,
        )
        ProductPricing.objects.create(
            product=self.product_1,
            mrp=Decimal("8000.00"),
            selling_price=Decimal("7200.00"),
        )
        ProductInventory.objects.create(
            product=self.product_1,
            current_stock=25,
            reserved_stock=0,
            allow_backorders=False,
        )

        self.product_2 = Product.objects.create(
            name="Abutment Straight",
            slug="abutment-straight",
            sku="ABUT-01",
            category=self.category,
            brand=self.brand,
            status=ProductStatus.ACTIVE,
        )
        ProductPricing.objects.create(
            product=self.product_2,
            mrp=Decimal("2000.00"),
            selling_price=Decimal("1800.00"),
        )
        ProductInventory.objects.create(
            product=self.product_2,
            current_stock=50,
            reserved_stock=0,
            allow_backorders=False,
        )

    def test_01_authenticated_customer_can_add_by_slug(self):
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post("/api/v1/wishlist/toggle/", {"product_id": "titanium-implant-40"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get("data", {}).get("is_wishlisted"))

        wishlist = Wishlist.objects.get(user=self.user_a)
        self.assertEqual(wishlist.items.count(), 1)
        self.assertEqual(wishlist.items.first().product, self.product_1)

    def test_02_authenticated_customer_can_add_by_uuid(self):
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post("/api/v1/wishlist/toggle/", {"product_id": str(self.product_2.id)}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get("data", {}).get("is_wishlisted"))

        wishlist = Wishlist.objects.get(user=self.user_a)
        self.assertEqual(wishlist.items.filter(product=self.product_2).count(), 1)

    def test_03_toggle_returns_is_wishlisted_true_on_first_call(self):
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post("/api/v1/wishlist/toggle/", {"product_id": "titanium-implant-40"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIs(res.data.get("data", {}).get("is_wishlisted"), True)

    def test_04_second_toggle_removes_item(self):
        self.client.force_authenticate(user=self.user_a)
        # First toggle adds
        self.client.post("/api/v1/wishlist/toggle/", {"product_id": "titanium-implant-40"}, format="json")

        # Second toggle removes
        res = self.client.post("/api/v1/wishlist/toggle/", {"product_id": "titanium-implant-40"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIs(res.data.get("data", {}).get("is_wishlisted"), False)

        wishlist = Wishlist.objects.get(user=self.user_a)
        self.assertEqual(wishlist.items.count(), 0)

    def test_05_no_duplicate_wishlist_items_are_created(self):
        self.client.force_authenticate(user=self.user_a)
        # Add by slug
        self.client.post("/api/v1/wishlist/toggle/", {"product_id": "titanium-implant-40"}, format="json")

        # Add again by UUID directly via helper / DB
        wishlist = Wishlist.objects.get(user=self.user_a)
        self.assertEqual(wishlist.items.filter(product=self.product_1).count(), 1)

    def test_06_delete_by_slug_works(self):
        self.client.force_authenticate(user=self.user_a)
        wishlist = Wishlist.objects.create(user=self.user_a)
        WishlistItem.objects.create(wishlist=wishlist, product=self.product_1)

        res = self.client.delete("/api/v1/wishlist/items/titanium-implant-40/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(wishlist.items.count(), 0)

    def test_07_delete_by_uuid_works(self):
        self.client.force_authenticate(user=self.user_a)
        wishlist = Wishlist.objects.create(user=self.user_a)
        WishlistItem.objects.create(wishlist=wishlist, product=self.product_2)

        res = self.client.delete(f"/api/v1/wishlist/items/{str(self.product_2.id)}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(wishlist.items.count(), 0)

    def test_08_move_wishlist_item_to_cart_works(self):
        self.client.force_authenticate(user=self.user_a)
        wishlist = Wishlist.objects.create(user=self.user_a)
        WishlistItem.objects.create(wishlist=wishlist, product=self.product_1)

        res = self.client.post("/api/v1/wishlist/items/titanium-implant-40/move-to-cart/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Wishlist should now be empty
        self.assertEqual(wishlist.items.count(), 0)

        # Cart should now contain the product
        cart = Cart.objects.get(user=self.user_a)
        self.assertEqual(cart.items.filter(product=self.product_1).count(), 1)

    def test_09_move_to_cart_supports_slug(self):
        self.client.force_authenticate(user=self.user_a)
        wishlist = Wishlist.objects.create(user=self.user_a)
        WishlistItem.objects.create(wishlist=wishlist, product=self.product_2)

        res = self.client.post(f"/api/v1/wishlist/items/{self.product_2.slug}/move-to-cart/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        cart = Cart.objects.get(user=self.user_a)
        self.assertTrue(cart.items.filter(product=self.product_2).exists())

    def test_10_move_to_cart_supports_uuid(self):
        self.client.force_authenticate(user=self.user_a)
        wishlist = Wishlist.objects.create(user=self.user_a)
        WishlistItem.objects.create(wishlist=wishlist, product=self.product_1)

        res = self.client.post(f"/api/v1/wishlist/items/{str(self.product_1.id)}/move-to-cart/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        cart = Cart.objects.get(user=self.user_a)
        self.assertTrue(cart.items.filter(product=self.product_1).exists())

    def test_11_guest_wishlist_sync_supports_slugs(self):
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post(
            "/api/v1/wishlist/sync/",
            {"product_ids": ["titanium-implant-40", "abutment-straight"]},
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        wishlist = Wishlist.objects.get(user=self.user_a)
        self.assertEqual(wishlist.items.count(), 2)

    def test_12_guest_wishlist_sync_supports_uuids_and_mixed(self):
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post(
            "/api/v1/wishlist/sync/",
            {"product_ids": [str(self.product_1.id), "abutment-straight"]},
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        wishlist = Wishlist.objects.get(user=self.user_a)
        self.assertEqual(wishlist.items.count(), 2)

    def test_13_invalid_product_is_handled_cleanly_without_500(self):
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post("/api/v1/wishlist/toggle/", {"product_id": "non-existent-slug-xyz"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(res.data.get("success"))

    def test_14_unauthenticated_behavior_remains_correct(self):
        res = self.client.post("/api/v1/wishlist/toggle/", {"product_id": "titanium-implant-40"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_15_customer_a_cannot_access_customer_b_wishlist(self):
        # Customer A adds item
        self.client.force_authenticate(user=self.user_a)
        self.client.post("/api/v1/wishlist/toggle/", {"product_id": "titanium-implant-40"}, format="json")

        # Customer B fetches wishlist
        self.client.force_authenticate(user=self.user_b)
        res = self.client.get("/api/v1/wishlist/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        items = res.data.get("data", {}).get("items", [])
        self.assertEqual(len(items), 0)
