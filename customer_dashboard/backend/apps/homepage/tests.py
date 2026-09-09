"""
FAAZO – Homepage CMS & Special Offers Page Content Tests
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User
from apps.homepage.models import SpecialOffersPageContent, LimitedTimeOffer


class SpecialOffersPageContentTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            email="admin@faazo.com",
            password="AdminPassword123!",
            full_name="Admin User",
            role="admin",
            is_staff=True,
            is_superuser=True,
        )
        self.customer_user = User.objects.create_user(
            email="customer@faazo.com",
            password="CustomerPassword123!",
            full_name="Customer User",
            role="customer",
        )

    def test_default_singleton_instance_creation(self):
        content = SpecialOffersPageContent.get_instance()
        self.assertEqual(content.hero_badge, "PROFESSIONAL CLINICAL SAVINGS")
        self.assertEqual(content.hero_title, "Special Offers")
        self.assertEqual(content.hero_cta_text, "EXPLORE OFFERS")
        self.assertEqual(content.hero_trust_text, "✓ 100% Genuine Direct Import • Manufacturer Warranty")

    def test_public_get_endpoint(self):
        # Public access without authentication
        response = self.client.get("/api/v1/homepage/offers-page-content/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data["data"]["hero_title"], "Special Offers")
        self.assertEqual(data["data"]["hero_badge"], "PROFESSIONAL CLINICAL SAVINGS")

    def test_customer_cannot_update_page_content(self):
        self.client.force_authenticate(user=self.customer_user)
        response = self.client.patch("/api/v1/homepage/offers-page-content/", {
            "hero_title": "Hacked Title"
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_update_page_content(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "hero_badge": "PREMIUM CLINICAL SAVINGS",
            "hero_title": "FAAZO Dental Offers",
            "hero_description": "Exclusive savings for dental professionals and clinics.",
            "hero_cta_text": "VIEW ALL OFFERS",
            "hero_trust_text": "✓ Genuine Products • Manufacturer Warranty"
        }
        response = self.client.patch("/api/v1/homepage/offers-page-content/", payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data["data"]["hero_title"], "FAAZO Dental Offers")
        self.assertEqual(data["data"]["hero_badge"], "PREMIUM CLINICAL SAVINGS")
        self.assertEqual(data["data"]["hero_description"], "Exclusive savings for dental professionals and clinics.")
        self.assertEqual(data["data"]["hero_cta_text"], "VIEW ALL OFFERS")
        self.assertEqual(data["data"]["hero_trust_text"], "✓ Genuine Products • Manufacturer Warranty")

        # Verify DB persistence
        db_instance = SpecialOffersPageContent.get_instance()
        self.assertEqual(db_instance.hero_title, "FAAZO Dental Offers")
        self.assertEqual(db_instance.hero_badge, "PREMIUM CLINICAL SAVINGS")

    def test_featured_offer_exclusive_toggle(self):
        # Create two offers
        offer1 = LimitedTimeOffer.objects.create(
            heading="Offer 1",
            original_price=10000,
            discounted_price=8000,
            is_featured=True,
            is_active=True
        )
        offer2 = LimitedTimeOffer.objects.create(
            heading="Offer 2",
            original_price=5000,
            discounted_price=4000,
            is_featured=False,
            is_active=True
        )

        self.client.force_authenticate(user=self.admin_user)
        # Set offer2 as featured via PATCH
        response = self.client.patch(f"/api/v1/homepage/offers/{offer2.id}/", {
            "is_featured": True
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        offer1.refresh_from_db()
        offer2.refresh_from_db()
        self.assertFalse(offer1.is_featured)
        self.assertTrue(offer2.is_featured)


class HomepageBrandTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            email="brandadmin@faazo.com",
            password="AdminPassword123!",
            full_name="Brand Admin",
            role="admin",
            is_staff=True,
            is_superuser=True,
        )
        from apps.brands.models import Brand
        self.brand_a = Brand.objects.create(name="Brand Alpha", slug="brand-alpha", is_active=True, display_order=1)
        self.brand_b = Brand.objects.create(name="Brand Beta", slug="brand-beta", is_active=True, display_order=2)
        self.brand_c = Brand.objects.create(name="Brand Gamma", slug="brand-gamma", is_active=True, display_order=3)

    def test_single_homepage_brand_per_brand_enforced(self):
        self.client.force_authenticate(user=self.admin_user)
        # Create first entry for Brand Alpha
        res1 = self.client.post("/api/v1/homepage/brands/", {
            "brand": str(self.brand_a.id),
            "is_visible": True,
        })
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Attempt to create duplicate entry for Brand Alpha
        res2 = self.client.post("/api/v1/homepage/brands/", {
            "brand": str(self.brand_a.id),
            "is_visible": True,
        })
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        data = res2.json()
        self.assertIn("brand", str(data))

    def test_latest_brand_first_ordering(self):
        import time
        from apps.homepage.models import HomepageBrand
        # Create entries with staggered created_at
        hb1 = HomepageBrand.objects.create(brand=self.brand_a, is_visible=True)
        time.sleep(0.05)
        hb2 = HomepageBrand.objects.create(brand=self.brand_b, is_visible=True)
        time.sleep(0.05)
        hb3 = HomepageBrand.objects.create(brand=self.brand_c, is_visible=True)

        res = self.client.get("/api/v1/homepage/brands/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.json().get("results", res.json().get("data", res.json()))
        brand_names = [r["brand_name"] for r in results]
        # Most recently created (Brand Gamma) should be first, then Beta, then Alpha
        self.assertEqual(brand_names[:3], ["Brand Gamma", "Brand Beta", "Brand Alpha"])

    def test_global_brand_ordering_unaffected(self):
        from apps.homepage.models import HomepageBrand
        HomepageBrand.objects.create(brand=self.brand_c, is_visible=True)
        HomepageBrand.objects.create(brand=self.brand_b, is_visible=True)
        HomepageBrand.objects.create(brand=self.brand_a, is_visible=True)

        # Public catalog brands endpoint should still order by display_order / name
        res = self.client.get("/api/v1/brands/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.json().get("results", res.json().get("data", res.json()))
        brand_names = [b["name"] for b in results if b["name"] in ["Brand Alpha", "Brand Beta", "Brand Gamma"]]
        self.assertEqual(brand_names, ["Brand Alpha", "Brand Beta", "Brand Gamma"])


class RecommendedProductTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            email="recadmin@faazo.com",
            password="AdminPassword123!",
            full_name="Rec Admin",
            role="admin",
            is_staff=True,
            is_superuser=True,
        )
        from apps.brands.models import Brand
        from apps.categories.models import Category
        from apps.products.models import Product, ProductStatus
        from apps.pricing.models import ProductPricing
        from apps.homepage.models import RecommendedProduct

        self.brand = Brand.objects.create(name="NSK", slug="nsk", is_active=True)
        self.category = Category.objects.create(name="Turbines", slug="turbines", is_active=True)
        
        # Product 1
        self.prod1 = Product.objects.create(
            name="NSK Pana-Max 2 M4 High Speed Turbine",
            slug="nsk-pana-max-2-m4-high-speed-turbine",
            sku="NSK-PM2-M4",
            brand=self.brand,
            category=self.category,
            status=ProductStatus.ACTIVE,
            average_rating=4.75,
            total_reviews=18,
        )
        ProductPricing.objects.create(
            product=self.prod1,
            mrp=22000.00,
            selling_price=18500.00,
        )

        # Product 2 (no reviews)
        self.prod2 = Product.objects.create(
            name="Woodpecker LED.H Orthodontic Curing Light",
            slug="woodpecker-ledh-orthodontic-curing-light",
            sku="WP-LEDH-ORTHO",
            brand=self.brand,
            category=self.category,
            status=ProductStatus.ACTIVE,
            average_rating=0.00,
            total_reviews=0,
        )
        ProductPricing.objects.create(
            product=self.prod2,
            mrp=8000.00,
            selling_price=6400.00,
        )

        # Inactive product
        self.prod_inactive = Product.objects.create(
            name="Inactive Handpiece",
            slug="inactive-handpiece",
            sku="INACT-001",
            brand=self.brand,
            category=self.category,
            status=ProductStatus.DRAFT,
        )

        # Soft-deleted product
        self.prod_deleted = Product.objects.create(
            name="Deleted Scaler",
            slug="deleted-scaler",
            sku="DEL-001",
            brand=self.brand,
            category=self.category,
            status=ProductStatus.ACTIVE,
            is_deleted=True,
        )

    def test_zero_recommendations_returns_empty_list_without_fallback(self):
        """When no RecommendedProduct rows exist, return empty list (no arbitrary fallback)."""
        res = self.client.get("/api/v1/homepage/recommended/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json().get("results", res.json().get("data", res.json()))
        self.assertEqual(len(data), 0)

    def test_recommended_returns_real_products_with_full_details(self):
        from apps.homepage.models import RecommendedProduct
        RecommendedProduct.objects.create(product=self.prod1, sort_order=0, is_visible=True)
        RecommendedProduct.objects.create(product=self.prod2, sort_order=1, is_visible=True)

        res = self.client.get("/api/v1/homepage/recommended/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json().get("results", res.json().get("data", res.json()))
        self.assertEqual(len(data), 2)

        # Item 1 checks
        item1 = data[0]
        self.assertEqual(item1["product_name"], "NSK Pana-Max 2 M4 High Speed Turbine")
        self.assertEqual(item1["product_slug"], "nsk-pana-max-2-m4-high-speed-turbine")
        self.assertEqual(item1["product_sku"], "NSK-PM2-M4")
        self.assertEqual(item1["brand_name"], "NSK")
        self.assertEqual(item1["category_name"], "Turbines")
        self.assertEqual(item1["pricing"]["effective_price"], "18500.00")
        self.assertEqual(item1["pricing"]["mrp"], "22000.00")
        self.assertEqual(float(item1["average_rating"]), 4.75)
        self.assertEqual(item1["total_reviews"], 18)

        # Item 2 checks (no reviews)
        item2 = data[1]
        self.assertEqual(item2["product_name"], "Woodpecker LED.H Orthodontic Curing Light")
        self.assertEqual(item2["pricing"]["effective_price"], "6400.00")
        self.assertEqual(float(item2["average_rating"]), 0.0)
        self.assertEqual(item2["total_reviews"], 0)

    def test_inactive_and_deleted_products_excluded_from_recommendations(self):
        from apps.homepage.models import RecommendedProduct
        RecommendedProduct.objects.create(product=self.prod_inactive, sort_order=0, is_visible=True)
        RecommendedProduct.objects.create(product=self.prod_deleted, sort_order=1, is_visible=True)

        res = self.client.get("/api/v1/homepage/recommended/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json().get("results", res.json().get("data", res.json()))
        self.assertEqual(len(data), 0)

    def test_hidden_recommendation_excluded_for_public(self):
        from apps.homepage.models import RecommendedProduct
        RecommendedProduct.objects.create(product=self.prod1, sort_order=0, is_visible=False)

        res = self.client.get("/api/v1/homepage/recommended/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json().get("results", res.json().get("data", res.json()))
        self.assertEqual(len(data), 0)

    def test_latest_uploaded_recommended_first_ordering(self):
        import time
        from apps.homepage.models import RecommendedProduct
        rec1 = RecommendedProduct.objects.create(product=self.prod1, is_visible=True)
        time.sleep(0.05)
        rec2 = RecommendedProduct.objects.create(product=self.prod2, is_visible=True)

        res = self.client.get("/api/v1/homepage/recommended/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json().get("results", res.json().get("data", res.json()))
        # Latest uploaded (prod2 - Woodpecker) comes first, then prod1 (NSK)
        self.assertEqual(data[0]["product_slug"], "woodpecker-ledh-orthodontic-curing-light")
        self.assertEqual(data[1]["product_slug"], "nsk-pana-max-2-m4-high-speed-turbine")


