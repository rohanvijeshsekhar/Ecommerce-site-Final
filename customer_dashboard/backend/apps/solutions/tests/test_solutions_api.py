"""
Comprehensive test suite for Clinical Solutions APIs.
Covers public homepage solutions list, public solution detail,
admin sync of attached products, active/show_on_homepage rules,
display order, pricing, and image resolution.
"""

from decimal import Decimal
from rest_framework import status
from rest_framework.test import APITestCase

from apps.products.models import Product, ProductImage, ProductStatus
from apps.brands.models import Brand
from apps.categories.models import Category
from apps.pricing.models import ProductPricing
from apps.inventory.models import ProductInventory
from apps.solutions.models import ClinicalSolution, ClinicalSolutionProduct


class ClinicalSolutionsAPITests(APITestCase):

    def setUp(self):
        self.brand = Brand.objects.create(name="FAAZO Pro", slug="faazo-pro", is_active=True)
        self.category = Category.objects.create(name="Endodontics", slug="endodontics", is_active=True)

        self.product1 = Product.objects.create(
            name="Rotary Endo Motor X1",
            slug="rotary-endo-motor-x1",
            sku="ENDO-MOT-01",
            brand=self.brand,
            category=self.category,
            status=ProductStatus.ACTIVE,
            average_rating=Decimal("4.50"),
            total_reviews=10,
        )
        pricing1, _ = ProductPricing.objects.get_or_create(product=self.product1)
        pricing1.selling_price = Decimal("22500.00")
        pricing1.mrp = Decimal("30000.00")
        pricing1.save()

        # Update or create inventory
        inv1, _ = ProductInventory.objects.get_or_create(product=self.product1)
        inv1.current_stock = 15
        inv1.save()

        self.product2 = Product.objects.create(
            name="Apex Locator Pro",
            slug="apex-locator-pro",
            sku="APEX-LOC-02",
            brand=self.brand,
            category=self.category,
            status=ProductStatus.ACTIVE,
            average_rating=Decimal("0.00"),
            total_reviews=0,
        )
        pricing2, _ = ProductPricing.objects.get_or_create(product=self.product2)
        pricing2.selling_price = Decimal("13999.00")
        pricing2.mrp = Decimal("18000.00")
        pricing2.save()

        inv2, _ = ProductInventory.objects.get_or_create(product=self.product2)
        inv2.current_stock = 5
        inv2.save()

        # Solution 1: Active + Show on Homepage, display_order 2
        self.solution_endo = ClinicalSolution.objects.create(
            title="Endodontic Treatment Workflow",
            slug="endodontic-treatment-workflow",
            short_description="Comprehensive root canal equipment kit.",
            description="Detailed workflow from access cavity to obturation.",
            banner_image_url="/images/hero_ecommerce.png",
            thumbnail_image_url="/images/bestseller_locator.png",
            display_order=2,
            is_active=True,
            show_on_homepage=True,
        )

        # Solution 2: Active + Show on Homepage, display_order 1
        self.solution_resto = ClinicalSolution.objects.create(
            title="Restorative Composite Workflow",
            slug="restorative-composite-workflow",
            short_description="Direct anterior and posterior restorations.",
            description="High output curing lights and nano composites.",
            banner_image_url="/images/hero1_ecommerce.png",
            thumbnail_image_url="/images/bestseller_curing.png",
            display_order=1,
            is_active=True,
            show_on_homepage=True,
        )

        # Attach products to Solution 1
        ClinicalSolutionProduct.objects.create(
            clinical_solution=self.solution_endo,
            product=self.product1,
            display_order=1,
            is_featured=True,
        )
        ClinicalSolutionProduct.objects.create(
            clinical_solution=self.solution_endo,
            product=self.product2,
            display_order=2,
            is_featured=False,
        )

    def test_01_active_and_show_on_homepage_appears_in_homepage_api(self):
        """1. Active + Show on Homepage solution appears in homepage API."""
        url = "/api/v1/solutions/?homepage=true"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slugs = [s["slug"] for s in res.data["data"]]
        self.assertIn("endodontic-treatment-workflow", slugs)
        self.assertIn("restorative-composite-workflow", slugs)

    def test_02_show_on_homepage_off_does_not_appear(self):
        """2. Active + Show on Homepage OFF does not appear in homepage API."""
        hidden_sol = ClinicalSolution.objects.create(
            title="Hidden Specialty Solution",
            slug="hidden-specialty-solution",
            short_description="Only visible by direct link.",
            display_order=5,
            is_active=True,
            show_on_homepage=False,
        )
        url = "/api/v1/solutions/?homepage=true"
        res = self.client.get(url)
        slugs = [s["slug"] for s in res.data["data"]]
        self.assertNotIn("hidden-specialty-solution", slugs)

    def test_03_inactive_solution_does_not_appear(self):
        """3. Inactive solution does not appear in public homepage or listing."""
        inactive_sol = ClinicalSolution.objects.create(
            title="Archived Solution",
            slug="archived-solution",
            display_order=0,
            is_active=False,
            show_on_homepage=True,
        )
        url = "/api/v1/solutions/?homepage=true"
        res = self.client.get(url)
        slugs = [s["slug"] for s in res.data["data"]]
        self.assertNotIn("archived-solution", slugs)

    def test_04_display_order_is_respected(self):
        """4. Solutions are strictly sorted by display_order, then title."""
        url = "/api/v1/solutions/?homepage=true"
        res = self.client.get(url)
        slugs = [s["slug"] for s in res.data["data"]]
        # solution_resto has display_order=1, solution_endo has display_order=2
        idx_resto = slugs.index("restorative-composite-workflow")
        idx_endo = slugs.index("endodontic-treatment-workflow")
        self.assertLess(idx_resto, idx_endo)

    def test_05_solution_data_comes_from_database(self):
        """5. Solution attributes match exact database fields."""
        url = f"/api/v1/solutions/{self.solution_endo.slug}/"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data["data"]
        self.assertEqual(data["title"], "Endodontic Treatment Workflow")
        self.assertEqual(data["slug"], "endodontic-treatment-workflow")
        self.assertEqual(data["description"], "Detailed workflow from access cavity to obturation.")

    def test_06_correct_solution_image_is_returned(self):
        """6. Correct banner and thumbnail are returned from database."""
        url = f"/api/v1/solutions/{self.solution_endo.slug}/"
        res = self.client.get(url)
        data = res.data["data"]
        self.assertEqual(data["banner"], "/images/hero_ecommerce.png")
        self.assertEqual(data["thumbnail"], "/images/bestseller_locator.png")

    def test_07_correct_short_description_is_returned(self):
        """7. Homepage API returns the exact short description."""
        url = "/api/v1/solutions/?homepage=true"
        res = self.client.get(url)
        endo_card = next(s for s in res.data["data"] if s["slug"] == "endodontic-treatment-workflow")
        self.assertEqual(endo_card["short_description"], "Comprehensive root canal equipment kit.")

    def test_08_attached_products_appear_on_solution_detail(self):
        """8. Attached products appear on the public solution detail page."""
        url = f"/api/v1/solutions/{self.solution_endo.slug}/"
        res = self.client.get(url)
        products = res.data["data"]["products"]
        self.assertEqual(len(products), 2)
        skus = [p["product_sku"] for p in products]
        self.assertIn("ENDO-MOT-01", skus)
        self.assertIn("APEX-LOC-02", skus)

    def test_09_detached_products_disappear(self):
        """9. When products are detached via admin update, they disappear from public detail."""
        # Detach product2, keep only product1
        payload = {
            "title": self.solution_endo.title,
            "product_ids": [str(self.product1.id)],
            "featured_product_ids": [],
        }
        admin_update_url = f"/api/v1/solutions/admin/{self.solution_endo.id}/"
        update_res = self.client.put(admin_update_url, payload, format="json")
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)

        # Check public detail page
        public_url = f"/api/v1/solutions/{self.solution_endo.slug}/"
        res = self.client.get(public_url)
        products = res.data["data"]["products"]
        self.assertEqual(len(products), 1)
        self.assertEqual(products[0]["product_sku"], "ENDO-MOT-01")

    def test_10_authoritative_pricing_and_stock(self):
        """10. Attached products use ProductPricing.effective_price and real stock."""
        url = f"/api/v1/solutions/{self.solution_endo.slug}/"
        res = self.client.get(url)
        products = res.data["data"]["products"]
        p1_data = next(p for p in products if p["product_sku"] == "ENDO-MOT-01")
        self.assertEqual(p1_data["product_price"], 22500.00)
        self.assertTrue(p1_data["in_stock"])

    def test_11_product_rating_is_real_and_not_fake_4_8(self):
        """11. Real product rating is delivered without fake fallback."""
        url = f"/api/v1/solutions/{self.solution_endo.slug}/"
        res = self.client.get(url)
        products = res.data["data"]["products"]
        p1 = next(p for p in products if p["product_sku"] == "ENDO-MOT-01")
        p2 = next(p for p in products if p["product_sku"] == "APEX-LOC-02")
        self.assertEqual(p1["product_rating"], 4.5)
        self.assertEqual(p2["product_rating"], 0.0)  # zero rating, not 4.8!

    def test_12_no_dummy_records_returned(self):
        """12. All returned items correspond to real database records."""
        url = "/api/v1/solutions/?homepage=true"
        res = self.client.get(url)
        db_slugs = set(ClinicalSolution.objects.filter(is_active=True, show_on_homepage=True).values_list("slug", flat=True))
        for item in res.data["data"]:
            self.assertIn(item["slug"], db_slugs)

    def test_13_empty_homepage_list_returns_cleanly(self):
        """13. When all solutions have show_on_homepage=False, empty list returned cleanly."""
        ClinicalSolution.objects.all().update(show_on_homepage=False)
        url = "/api/v1/solutions/?homepage=true"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["data"]), 0)
        self.assertEqual(res.data["count"], 0)

    def test_14_correct_slug_resolves_correct_solution(self):
        """14. Correct slug resolves to the correct solution record."""
        url = f"/api/v1/solutions/{self.solution_resto.slug}/"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["data"]["title"], "Restorative Composite Workflow")

    def test_15_homepage_max_12_limit_with_15_solutions(self):
        """15. When 15 eligible solutions exist, homepage API returns exactly 12."""
        # Clean up existing test solutions to have exactly 15 solutions with orders 1..15
        ClinicalSolution.objects.all().delete()
        for i in range(1, 16):
            ClinicalSolution.objects.create(
                title=f"Clinical Solution #{i:02d}",
                slug=f"clinical-solution-{i:02d}",
                short_description=f"Description for solution {i}",
                display_order=i,
                is_active=True,
                show_on_homepage=True,
            )

        url = "/api/v1/solutions/?homepage=true"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["data"]), 12)
        self.assertEqual(res.data["count"], 12)

    def test_16_latest_uploaded_solution_views_first_on_homepage(self):
        """16. The latest uploaded solutions view first on the homepage (newest first)."""
        ClinicalSolution.objects.all().delete()
        for i in range(1, 16):
            ClinicalSolution.objects.create(
                title=f"Solution {i:02d}",
                slug=f"solution-{i:02d}",
                display_order=i,
                is_active=True,
                show_on_homepage=True,
            )

        url = "/api/v1/solutions/?homepage=true"
        res = self.client.get(url)
        slugs = [s["slug"] for s in res.data["data"]]
        # Latest uploaded (solution-15, solution-14, ...) appear first
        expected_slugs = [f"solution-{i:02d}" for i in range(15, 3, -1)]
        self.assertEqual(slugs, expected_slugs)
        self.assertEqual(slugs[0], "solution-15")
        self.assertNotIn("solution-01", slugs)
        self.assertNotIn("solution-02", slugs)
        self.assertNotIn("solution-03", slugs)

    def test_17_view_all_page_returns_all_solutions_unlimited(self):
        """17. View All API (without homepage=true) returns all 15 solutions without limit."""
        ClinicalSolution.objects.all().delete()
        for i in range(1, 16):
            ClinicalSolution.objects.create(
                title=f"Solution {i:02d}",
                slug=f"solution-{i:02d}",
                display_order=i,
                is_active=True,
                show_on_homepage=True,
            )

        url = "/api/v1/solutions/"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["data"]), 15)
        self.assertEqual(res.data["count"], 15)

    def test_18_fewer_than_12_solutions_returns_exact_count(self):
        """18. When fewer than 12 eligible solutions exist (e.g. 5), homepage returns exactly 5."""
        ClinicalSolution.objects.all().delete()
        for i in range(1, 6):
            ClinicalSolution.objects.create(
                title=f"Solution {i}",
                slug=f"solution-{i}",
                display_order=i,
                is_active=True,
                show_on_homepage=True,
            )

        url = "/api/v1/solutions/?homepage=true"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["data"]), 5)

    def test_19_no_solution_deleted_or_deactivated_by_limit(self):
        """19. Solutions beyond limit are not deleted or deactivated in database."""
        ClinicalSolution.objects.all().delete()
        for i in range(1, 16):
            ClinicalSolution.objects.create(
                title=f"Solution {i:02d}",
                slug=f"solution-{i:02d}",
                display_order=i,
                is_active=True,
                show_on_homepage=True,
            )

        # Call homepage API
        self.client.get("/api/v1/solutions/?homepage=true")

        # Verify DB still contains all 15 active solutions
        self.assertEqual(ClinicalSolution.objects.count(), 15)
        self.assertEqual(ClinicalSolution.objects.filter(is_active=True, show_on_homepage=True).count(), 15)

    def test_20_ordering_param_allows_custom_display_order(self):
        """20. Explicit ordering=display_order allows custom admin ordering when requested."""
        ClinicalSolution.objects.all().delete()
        for i in range(1, 16):
            ClinicalSolution.objects.create(
                title=f"Solution {i:02d}",
                slug=f"solution-{i:02d}",
                display_order=i,
                is_active=True,
                show_on_homepage=True,
            )

        res = self.client.get("/api/v1/solutions/?homepage=true&ordering=display_order")
        slugs = [s["slug"] for s in res.data["data"]]
        self.assertEqual(len(slugs), 12)
        self.assertEqual(slugs[0], "solution-01")
        self.assertNotIn("solution-13", slugs)

