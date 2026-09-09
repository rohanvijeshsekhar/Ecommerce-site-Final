"""
Tests for Related Products ("You may also like this") endpoint
GET /api/v1/products/{slug}/related/
"""

from decimal import Decimal
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from apps.products.models import Product, ProductImage, ProductStatus
from apps.brands.models import Brand
from apps.categories.models import Category
from apps.pricing.models import ProductPricing
from apps.solutions.models import ClinicalSolution, ClinicalSolutionProduct


class RelatedProductsTests(APITestCase):

    def setUp(self):
        # Category tree:
        # Root: Dental Handpieces
        #  ├── High Speed Handpieces
        #  │    └── Air Turbines
        #  └── Low Speed Handpieces
        #       └── Contra Angles
        # Separate Root: Dental Chairs
        self.cat_root_handpieces = Category.objects.create(
            name="Dental Handpieces",
            slug="dental-handpieces",
            is_active=True,
        )
        self.cat_high_speed = Category.objects.create(
            name="High Speed Handpieces",
            slug="high-speed-handpieces",
            parent=self.cat_root_handpieces,
            is_active=True,
        )
        self.cat_air_turbines = Category.objects.create(
            name="Air Turbines",
            slug="air-turbines",
            parent=self.cat_high_speed,
            is_active=True,
        )
        self.cat_low_speed = Category.objects.create(
            name="Low Speed Handpieces",
            slug="low-speed-handpieces",
            parent=self.cat_root_handpieces,
            is_active=True,
        )
        self.cat_contra_angles = Category.objects.create(
            name="Contra Angles",
            slug="contra-angles",
            parent=self.cat_low_speed,
            is_active=True,
        )
        self.cat_chairs = Category.objects.create(
            name="Dental Chairs",
            slug="dental-chairs",
            is_active=True,
        )

        # Brands
        self.brand_nsk = Brand.objects.create(name="NSK", slug="nsk")
        self.brand_woodpecker = Brand.objects.create(name="Woodpecker", slug="woodpecker")
        self.brand_wh = Brand.objects.create(name="W&H", slug="wh")

        # Clinical Solution
        self.solution_endo = ClinicalSolution.objects.create(
            title="Endodontic Solutions",
            slug="endodontic-solutions",
            is_active=True,
        )

        # Target Product: NSK Air Turbine
        self.target_product = Product.objects.create(
            name="NSK Pana-Max 2 M4",
            slug="nsk-pana-max-2-m4",
            sku="NSK-PM2-01",
            brand=self.brand_nsk,
            category=self.cat_air_turbines,
            status=ProductStatus.ACTIVE,
            tags=["air turbine", "high-speed", "endodontics"],
        )
        pricing_target, _ = ProductPricing.objects.get_or_create(product=self.target_product)
        pricing_target.selling_price = Decimal("12000.00")
        pricing_target.mrp = Decimal("15000.00")
        pricing_target.save()

        # Link target product to solution
        ClinicalSolutionProduct.objects.create(
            clinical_solution=self.solution_endo,
            product=self.target_product,
        )

        # Candidate 1: Same category + Same brand (highest relevance)
        self.prod_same_cat_same_brand = Product.objects.create(
            name="NSK Ti-Max Z900L",
            slug="nsk-ti-max-z900l",
            sku="NSK-TMZ-01",
            brand=self.brand_nsk,
            category=self.cat_air_turbines,
            status=ProductStatus.ACTIVE,
            tags=["air turbine", "premium"],
        )
        pricing1, _ = ProductPricing.objects.get_or_create(product=self.prod_same_cat_same_brand)
        pricing1.selling_price = Decimal("28000.00")
        pricing1.mrp = Decimal("32000.00")
        pricing1.save()

        # Candidate 2: Same category + Different brand
        self.prod_same_cat_diff_brand = Product.objects.create(
            name="Woodpecker Turbine W1",
            slug="woodpecker-turbine-w1",
            sku="WP-TRB-01",
            brand=self.brand_woodpecker,
            category=self.cat_air_turbines,
            status=ProductStatus.ACTIVE,
        )
        pricing2, _ = ProductPricing.objects.get_or_create(product=self.prod_same_cat_diff_brand)
        pricing2.selling_price = Decimal("8000.00")
        pricing2.save()

        # Candidate 3: Branch category + shared clinical solution
        self.prod_branch_cat_solution = Product.objects.create(
            name="W&H Synea Contra Angle",
            slug="wh-synea-contra-angle",
            sku="WH-SYN-01",
            brand=self.brand_wh,
            category=self.cat_contra_angles,
            status=ProductStatus.ACTIVE,
        )
        pricing3, _ = ProductPricing.objects.get_or_create(product=self.prod_branch_cat_solution)
        pricing3.selling_price = Decimal("18000.00")
        pricing3.save()
        ClinicalSolutionProduct.objects.create(
            clinical_solution=self.solution_endo,
            product=self.prod_branch_cat_solution,
        )

        # Candidate 4: Inactive product (should be excluded)
        self.prod_inactive = Product.objects.create(
            name="NSK Draft Turbine",
            slug="nsk-draft-turbine",
            sku="NSK-DFT-01",
            brand=self.brand_nsk,
            category=self.cat_air_turbines,
            status=ProductStatus.DRAFT,
        )

        # Candidate 5: Soft-deleted product (should be excluded)
        self.prod_deleted = Product.objects.create(
            name="NSK Deleted Turbine",
            slug="nsk-deleted-turbine",
            sku="NSK-DEL-01",
            brand=self.brand_nsk,
            category=self.cat_air_turbines,
            status=ProductStatus.ACTIVE,
            is_deleted=True,
        )

        # Candidate 6: Completely unrelated product (Dental Chair, no shared solution, no shared tags)
        self.prod_unrelated = Product.objects.create(
            name="Comfort Dental Chair Pro",
            slug="comfort-dental-chair-pro",
            sku="CHR-PRO-01",
            brand=self.brand_woodpecker,
            category=self.cat_chairs,
            status=ProductStatus.ACTIVE,
        )
        pricing6, _ = ProductPricing.objects.get_or_create(product=self.prod_unrelated)
        pricing6.selling_price = Decimal("150000.00")
        pricing6.save()

        # Product with image
        small_gif = (
            b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x00\x00\x00\x21\xf9\x04'
            b'\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02'
            b'\x02\x44\x01\x00\x3b'
        )
        img_file = SimpleUploadedFile("hero.gif", small_gif, content_type="image/gif")
        self.primary_img = ProductImage.objects.create(
            product=self.prod_same_cat_same_brand,
            image=img_file,
            alt_text="NSK Ti-Max Hero",
            is_primary=True,
            sort_order=0,
        )

    def test_related_products_returned_and_current_excluded(self):
        """Valid product returns related products, and current product is excluded."""
        url = f"/api/v1/products/{self.target_product.slug}/related/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get("data", [])
        self.assertGreater(len(data), 0)

        # Current product must not be in results
        returned_ids = [p["id"] for p in data]
        returned_slugs = [p["slug"] for p in data]
        self.assertNotIn(str(self.target_product.id), returned_ids)
        self.assertNotIn(self.target_product.slug, returned_slugs)

    def test_same_category_and_brand_prioritization(self):
        """Same category + same brand product ranks highest."""
        url = f"/api/v1/products/{self.target_product.slug}/related/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get("data", [])

        # Top product should be NSK Ti-Max (same category + same brand)
        self.assertEqual(data[0]["slug"], self.prod_same_cat_same_brand.slug)

    def test_unrelated_products_excluded(self):
        """Completely unrelated product (Dental Chair) is NOT returned."""
        url = f"/api/v1/products/{self.target_product.slug}/related/"
        response = self.client.get(url)
        data = response.data.get("data", [])
        returned_slugs = [p["slug"] for p in data]
        self.assertNotIn(self.prod_unrelated.slug, returned_slugs)

    def test_inactive_and_deleted_products_excluded(self):
        """Draft and soft-deleted products are strictly excluded."""
        url = f"/api/v1/products/{self.target_product.slug}/related/"
        response = self.client.get(url)
        data = response.data.get("data", [])
        returned_slugs = [p["slug"] for p in data]
        self.assertNotIn(self.prod_inactive.slug, returned_slugs)
        self.assertNotIn(self.prod_deleted.slug, returned_slugs)

    def test_no_duplicate_products(self):
        """Each related product appears at most once."""
        url = f"/api/v1/products/{self.target_product.slug}/related/"
        response = self.client.get(url)
        data = response.data.get("data", [])
        slugs = [p["slug"] for p in data]
        self.assertEqual(len(slugs), len(set(slugs)))

    def test_pricing_and_canonical_image(self):
        """Pricing is sourced from ProductPricing and canonical image is returned."""
        url = f"/api/v1/products/{self.target_product.slug}/related/"
        response = self.client.get(url)
        data = response.data.get("data", [])
        top_prod = data[0]

        # Check pricing
        self.assertIn("pricing", top_prod)
        self.assertEqual(float(top_prod["pricing"]["effective_price"]), 28000.00)

        # Check canonical image
        self.assertIsNotNone(top_prod["primary_image"])
        self.assertTrue("hero" in top_prod["primary_image"])

    def test_empty_state_for_isolated_product(self):
        """Product with no category, brand, solution or tag relationships returns []."""
        url = f"/api/v1/products/{self.prod_unrelated.slug}/related/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get("data", [])
        self.assertEqual(data, [])

    def test_lookup_by_uuid(self):
        """Endpoint accepts UUID as well as slug."""
        url = f"/api/v1/products/{self.target_product.id}/related/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get("data", [])
        self.assertGreater(len(data), 0)
