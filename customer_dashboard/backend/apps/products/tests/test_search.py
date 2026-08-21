from decimal import Decimal
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.products.models import Product, ProductStatus
from apps.brands.models import Brand
from apps.categories.models import Category
from apps.pricing.models import ProductPricing
from apps.inventory.models import ProductInventory, StockStatus
from apps.orders.models import Order, OrderItem, OrderStatus
from apps.users.models import Address

User = get_user_model()


class ProductSearchAndFilterTests(APITestCase):

    def setUp(self):
        # Create categories
        self.cat_handpieces = Category.objects.create(
            name="Dental Handpieces",
            slug="dental-handpieces",
        )
        self.cat_high_speed = Category.objects.create(
            name="High Speed Handpieces",
            slug="high-speed-handpieces",
            parent=self.cat_handpieces,
        )
        self.cat_scanners = Category.objects.create(
            name="3D Oral Scanners",
            slug="3d-oral-scanners",
        )

        # Create brands
        self.brand_nsk = Brand.objects.create(
            name="NSK",
            slug="nsk",
        )
        self.brand_woodpecker = Brand.objects.create(
            name="Woodpecker",
            slug="woodpecker",
        )

        # Create products
        # Product 1: NSK Pana-Max
        self.p1 = Product.objects.create(
            name="NSK Pana-Max High Speed Handpiece",
            slug="nsk-pana-max-high-speed-handpiece",
            sku="SKU-NSK-001",
            brand=self.brand_nsk,
            category=self.cat_high_speed,
            short_description="Advanced air turbine dental handpiece",
            long_description="High precision ceramic bearings for quiet endodontic operation",
            status=ProductStatus.ACTIVE,
            tags=["handpiece", "high-speed", "air turbine"],
        )
        pricing1, _ = ProductPricing.objects.get_or_create(product=self.p1)
        pricing1.selling_price = Decimal("18999.00")
        pricing1.mrp = Decimal("22000.00")
        pricing1.save()
        inv1, _ = ProductInventory.objects.get_or_create(product=self.p1)
        inv1.current_stock = 10
        inv1.save()

        # Product 2: Woodpecker Endo Radar
        self.p2 = Product.objects.create(
            name="Woodpecker Endo Radar Apex Locator",
            slug="woodpecker-endo-radar-apex-locator",
            sku="SKU-WP-002",
            brand=self.brand_woodpecker,
            category=self.cat_handpieces,
            short_description="Micro-precise root canal diagnostic endo file console",
            status=ProductStatus.ACTIVE,
            tags=["endo", "apex locator", "file"],
        )
        pricing2, _ = ProductPricing.objects.get_or_create(product=self.p2)
        pricing2.selling_price = Decimal("24999.00")
        pricing2.mrp = Decimal("28000.00")
        pricing2.save()
        inv2, _ = ProductInventory.objects.get_or_create(product=self.p2)
        inv2.current_stock = 5
        inv2.save()

        # Product 3: Woodpecker Scaler (Out of stock)
        self.p3 = Product.objects.create(
            name="Woodpecker Ultrasonic Scaler",
            slug="woodpecker-ultrasonic-scaler",
            sku="SKU-WP-003",
            brand=self.brand_woodpecker,
            category=self.cat_scanners,
            short_description="Clinical ultrasonic calculus scaler unit",
            status=ProductStatus.ACTIVE,
            tags=["scaler", "cleaning"],
        )
        pricing3, _ = ProductPricing.objects.get_or_create(product=self.p3)
        pricing3.selling_price = Decimal("8999.00")
        pricing3.mrp = Decimal("10000.00")
        pricing3.save()
        inv3, _ = ProductInventory.objects.get_or_create(product=self.p3)
        inv3.current_stock = 0
        inv3.save()

        # Product 4: Draft product (Non-admins must NOT see this)
        self.p4_draft = Product.objects.create(
            name="Draft Dental Laser System",
            slug="draft-dental-laser-system",
            sku="SKU-DRAFT-004",
            brand=self.brand_nsk,
            category=self.cat_handpieces,
            short_description="Unpublished laser prototype",
            status=ProductStatus.DRAFT,
        )

        self.list_url = reverse("product-list")
        self.suggestions_url = reverse("product-suggestions")

    def test_01_search_by_product_name_partial(self):
        """Search by partial product name finds matching active product."""
        response = self.client.get(f"{self.list_url}?q=Pana-Max")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]
        self.assertTrue(any(p["id"] == str(self.p1.id) for p in results))
        self.assertFalse(any(p["id"] == str(self.p2.id) for p in results))

    def test_02_search_by_product_name_exact(self):
        """Search by exact product name ranks exact match highest."""
        response = self.client.get(f"{self.list_url}?q=NSK Pana-Max High Speed Handpiece")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]
        self.assertGreater(len(results), 0)
        self.assertEqual(results[0]["id"], str(self.p1.id))

    def test_03_search_by_sku(self):
        """Search by exact SKU matches product."""
        response = self.client.get(f"{self.list_url}?q=SKU-WP-002")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(self.p2.id))

    def test_04_search_by_brand_name(self):
        """Search by brand name in text query finds brand products."""
        response = self.client.get(f"{self.list_url}?q=Woodpecker")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]
        returned_ids = [p["id"] for p in results]
        self.assertIn(str(self.p2.id), returned_ids)
        self.assertIn(str(self.p3.id), returned_ids)
        self.assertNotIn(str(self.p1.id), returned_ids)

    def test_05_search_by_category_name(self):
        """Search by root or child category name returns products belonging to that category or its descendants."""
        # 1. Search root category 'Dental Handpieces' (matches p1 in High Speed Handpieces & p2 in Dental Handpieces)
        response1 = self.client.get(f"{self.list_url}?q=Dental Handpieces")
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        ids1 = [p["id"] for p in response1.data["data"]]
        self.assertIn(str(self.p1.id), ids1)
        self.assertIn(str(self.p2.id), ids1)

        # 2. Search child category 'High Speed'
        response2 = self.client.get(f"{self.list_url}?q=High Speed")
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        ids2 = [p["id"] for p in response2.data["data"]]
        self.assertIn(str(self.p1.id), ids2)

    def test_06_search_by_description(self):
        """Search by description text matches."""
        response = self.client.get(f"{self.list_url}?q=ultrasonic")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(self.p3.id))

    def test_07_case_insensitive_search(self):
        """Search is case-insensitive ('pana-max' vs 'PANA-MAX')."""
        res1 = self.client.get(f"{self.list_url}?q=pana-max")
        res2 = self.client.get(f"{self.list_url}?q=PANA-MAX")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res1.data["data"]), len(res2.data["data"]))

    def test_08_empty_search(self):
        """Empty search query returns all active products."""
        response = self.client.get(f"{self.list_url}?q=")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]), 3)  # p1, p2, p3 (p4 is draft)

    def test_09_multi_word_search(self):
        """Multi-word search ('endo file') finds products matching multiple keywords."""
        response = self.client.get(f"{self.list_url}?q=endo file")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]
        self.assertTrue(any(p["id"] == str(self.p2.id) for p in results))

    def test_10_combined_filters(self):
        """Combined filters: q + brand + category."""
        response = self.client.get(f"{self.list_url}?q=Handpiece&brand=nsk&category=high-speed-handpieces")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(self.p1.id))

    def test_11_price_range_filter(self):
        """Filtering by min_price and max_price works on selling_price."""
        response = self.client.get(f"{self.list_url}?min_price=10000&max_price=20000")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(self.p1.id))

    def test_12_stock_filter(self):
        """Filtering by in_stock=true excludes out-of-stock products."""
        response = self.client.get(f"{self.list_url}?in_stock=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]
        returned_ids = [p["id"] for p in results]
        self.assertIn(str(self.p1.id), returned_ids)
        self.assertIn(str(self.p2.id), returned_ids)
        self.assertNotIn(str(self.p3.id), returned_ids)

    def test_13_sorting_price_asc_desc(self):
        """Sorting by price_asc and price_desc."""
        res_asc = self.client.get(f"{self.list_url}?ordering=price_asc")
        self.assertEqual(res_asc.status_code, status.HTTP_200_OK)
        prices_asc = [float(p["pricing"]["selling_price"]) for p in res_asc.data["data"]]
        self.assertEqual(prices_asc, sorted(prices_asc))

        res_desc = self.client.get(f"{self.list_url}?ordering=price_desc")
        self.assertEqual(res_desc.status_code, status.HTTP_200_OK)
        prices_desc = [float(p["pricing"]["selling_price"]) for p in res_desc.data["data"]]
        self.assertEqual(prices_desc, sorted(prices_desc, reverse=True))

    def test_14_pagination(self):
        """Pagination returns meta with page, page_size, total_pages, count."""
        response = self.client.get(f"{self.list_url}?page=1&page_size=2")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]), 2)
        meta = response.data["meta"]
        self.assertEqual(meta["count"], 3)
        self.assertEqual(meta["page"], 1)
        self.assertEqual(meta["page_size"], 2)
        self.assertEqual(meta["total_pages"], 2)

    def test_15_invalid_parameters_graceful(self):
        """Invalid filter parameters are ignored or return graceful validation."""
        response = self.client.get(f"{self.list_url}?min_price=invalid&ordering=nonexistent")
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

    def test_16_no_results_experience(self):
        """Search query with no matches returns 200 OK with empty data list."""
        response = self.client.get(f"{self.list_url}?q=nonexistentxyz123")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"], [])
        self.assertEqual(response.data["meta"]["count"], 0)

    def test_17_relevance_ordering(self):
        """Exact name match ranks above keyword match in description."""
        response = self.client.get(f"{self.list_url}?q=Endo Radar")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]
        self.assertGreater(len(results), 0)
        self.assertEqual(results[0]["id"], str(self.p2.id))

    def test_18_suggestions_endpoint(self):
        """Suggestions endpoint returns lightweight autocomplete list."""
        response = self.client.get(f"{self.suggestions_url}?q=Handpiece")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        self.assertIsInstance(data, list)
        self.assertLessEqual(len(data), 8)
        if len(data) > 0:
            item = data[0]
            self.assertIn("id", item)
            self.assertIn("name", item)
            self.assertIn("slug", item)
            self.assertIn("category_name", item)
            self.assertIn("type", item)
            self.assertEqual(item["type"], "product")

    def test_19_security_and_non_admin_gating(self):
        """Non-admin public search never returns DRAFT or deleted products."""
        response = self.client.get(f"{self.list_url}?q=Laser")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [p["id"] for p in response.data["data"]]
        self.assertNotIn(str(self.p4_draft.id), returned_ids)

    def test_20_deep_multi_level_category_taxonomy_search(self):
        """Root, middle, and leaf category search returns all descendant products down the tree."""
        cat_leaf = Category.objects.create(
            name="Air Turbines Leaf",
            slug="air-turbines-leaf",
            parent=self.cat_high_speed
        )
        p_leaf = Product.objects.create(
            name="Deep Leaf Turbine",
            slug="deep-leaf-turbine",
            sku="SKU-LEAF-999",
            brand=self.brand_nsk,
            category=cat_leaf,
            status=ProductStatus.ACTIVE
        )

        # 1. Search Root ('Dental Handpieces') -> returns p_leaf
        res_root = self.client.get(f"{self.list_url}?q=Dental Handpieces")
        self.assertEqual(res_root.status_code, status.HTTP_200_OK)
        root_ids = [p["id"] for p in res_root.data["data"]]
        self.assertIn(str(p_leaf.id), root_ids)

        # 2. Search Middle ('High Speed Handpieces') -> returns p_leaf
        res_mid = self.client.get(f"{self.list_url}?q=High Speed Handpieces")
        self.assertEqual(res_mid.status_code, status.HTTP_200_OK)
        mid_ids = [p["id"] for p in res_mid.data["data"]]
        self.assertIn(str(p_leaf.id), mid_ids)

        # 3. Search Leaf ('Air Turbines Leaf') -> returns p_leaf
        res_leaf = self.client.get(f"{self.list_url}?q=Air Turbines Leaf")
        self.assertEqual(res_leaf.status_code, status.HTTP_200_OK)
        leaf_ids = [p["id"] for p in res_leaf.data["data"]]
        self.assertIn(str(p_leaf.id), leaf_ids)
