from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.products.models import Product, ProductStatus
from apps.categories.models import Category
from apps.brands.models import Brand
from apps.pricing.models import ProductPricing
from apps.orders.models import Order, OrderItem
from apps.homepage.models import BestSeller
from apps.users.models import Address
from apps.reviews.models import ProductReview, ReviewStatus
from apps.reviews.services import ReviewService

User = get_user_model()

class ProductRatingPipelineTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser(
            email="admin_review@faazo.com",
            phone_number="+919876543210",
            password="AdminPassword123!",
            full_name="Admin Faazo",
        )
        self.customer_user = User.objects.create_user(
            email="customer1@faazo.com",
            phone_number="+919876543211",
            password="UserPassword123!",
            full_name="Dr. John Doe",
        )
        self.customer_user_2 = User.objects.create_user(
            email="customer2@faazo.com",
            phone_number="+919876543212",
            password="UserPassword123!",
            full_name="Dr. Jane Smith",
        )
        self.customer_user_3 = User.objects.create_user(
            email="customer3@faazo.com",
            phone_number="+919876543213",
            password="UserPassword123!",
            full_name="Dr. Bob Wilson",
        )

        self.category = Category.objects.create(name="Handpieces", slug="handpieces")
        self.brand = Brand.objects.create(name="NSK", slug="nsk")
        
        self.product = Product.objects.create(
            name="NSK Pana-Max Test Unit",
            slug="nsk-pana-max-test-unit",
            sku="NSK-TEST-001",
            category=self.category,
            brand=self.brand,
            status=ProductStatus.ACTIVE,
            average_rating=Decimal("0.00"),
            total_reviews=0,
            rating_distribution={"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
        )
        self.pricing, _ = ProductPricing.objects.get_or_create(
            product=self.product,
            defaults={"mrp": Decimal("15000.00"), "selling_price": Decimal("12000.00")},
        )

        self.bestseller = BestSeller.objects.create(
            product=self.product,
            sort_order=1,
            is_visible=True,
        )

    def test_zero_reviews_default_state(self):
        """Zero review product should return 0.00 and 0 in APIs."""
        # Product List API
        res_prod_list = self.client.get("/api/v1/products/")
        self.assertEqual(res_prod_list.status_code, 200)
        items = res_prod_list.data.get("results", res_prod_list.data.get("data", []))
        prod_item = [i for i in items if i["slug"] == self.product.slug][0]
        self.assertEqual(float(prod_item["average_rating"]), 0.0)
        self.assertEqual(prod_item["total_reviews"], 0)

        # Product Detail API
        res_prod = self.client.get(f"/api/v1/products/{self.product.slug}/")
        self.assertEqual(res_prod.status_code, 200)
        data = res_prod.data.get("data", res_prod.data)
        self.assertEqual(float(data["average_rating"]), 0.0)
        self.assertEqual(data["total_reviews"], 0)

        # Best Seller API
        res_bs = self.client.get("/api/v1/homepage/best-sellers/")
        self.assertEqual(res_bs.status_code, 200)
        bs_items = res_bs.data.get("data", res_bs.data)
        self.assertTrue(len(bs_items) > 0)
        item = [i for i in bs_items if i["product_slug"] == self.product.slug][0]
        self.assertEqual(float(item["average_rating"]), 0.0)
        self.assertEqual(item["total_reviews"], 0)

    def test_review_eligibility_non_purchased(self):
        """Customer who has not purchased cannot submit a review."""
        self.client.force_authenticate(user=self.customer_user)
        # Check eligibility endpoint
        res_elig = self.client.get(f"/api/v1/reviews/eligibility/?product_id={self.product.id}")
        self.assertEqual(res_elig.status_code, 200)
        elig_data = res_elig.data.get("data", res_elig.data)
        self.assertFalse(elig_data["can_review"])

        # Attempt to create review
        res = self.client.post("/api/v1/reviews/", {
            "product_id": str(self.product.id),
            "rating": 5,
            "title": "Great Product",
            "comment": "Works well",
        })
        self.assertEqual(res.status_code, 400)
        self.assertFalse(res.data.get("success", True))

    def test_delivered_customer_review_pipeline_and_aggregation(self):
        """
        Full lifecycle:
        1. Customer purchases and order is marked delivered
        2. Customer becomes eligible to review
        3. Customer submits review -> status: pending
        4. Pending review does not affect product rating (remains 0.00, 0)
        5. Admin approves review
        6. Aggregation recalculates: average_rating = 5.00, total_reviews = 1
        7. Best seller and product APIs reflect 5.00 (1)
        8. Additional approved reviews (4 stars and 5 stars) update to 4.67 (3)
        """
        # 1. Create delivered order for customer 1
        addr1 = Address.objects.create(
            user=self.customer_user,
            full_name="Dr. John Doe",
            mobile="+919876543211",
            line1="123 Clinic St",
            city="Mumbai",
            state="Maharashtra",
            pincode="400001",
        )
        order1 = Order.objects.create(
            user=self.customer_user,
            shipping_address=addr1,
            status="delivered",
            mrp_subtotal=Decimal("15000.00"),
            selling_subtotal=Decimal("12000.00"),
            taxable_subtotal=Decimal("10169.49"),
            gst_amount=Decimal("1830.51"),
            total_amount=Decimal("12000.00"),
            shipping_line1="123 Clinic St",
        )
        OrderItem.objects.create(
            order=order1,
            product=self.product,
            quantity=1,
            price=Decimal("12000.00"),
        )

        # 2. Check customer is eligible
        self.client.force_authenticate(user=self.customer_user)
        res_elig = self.client.get(f"/api/v1/reviews/eligibility/?product_id={self.product.id}")
        self.assertEqual(res_elig.status_code, 200)
        elig_data = res_elig.data.get("data", res_elig.data)
        self.assertTrue(elig_data["can_review"])

        # 3. Customer 1 submits review
        res_post = self.client.post("/api/v1/reviews/", {
            "product_id": str(self.product.id),
            "rating": 5,
            "title": "Superb Quality",
            "comment": "Genuine build and smooth operation.",
        })
        self.assertEqual(res_post.status_code, 201)
        review1_id = res_post.data.get("data", res_post.data)["id"]
        review1 = ProductReview.objects.get(id=review1_id)
        self.assertEqual(review1.status, ReviewStatus.PENDING)

        # 4. Verify product ratings NOT updated when pending
        self.product.refresh_from_db()
        self.assertEqual(float(self.product.average_rating), 0.0)
        self.assertEqual(self.product.total_reviews, 0)

        # 5. Admin approves review 1
        ReviewService.moderate_review(
            review=review1,
            status=ReviewStatus.APPROVED,
            admin_user=self.admin_user,
        )

        # 6. Verify product ratings updated after approval
        self.product.refresh_from_db()
        self.assertEqual(float(self.product.average_rating), 5.0)
        self.assertEqual(self.product.total_reviews, 1)
        self.assertEqual(self.product.rating_distribution["5"], 1)

        # 7. Verify APIs reflect genuine values
        res_prod = self.client.get(f"/api/v1/products/{self.product.slug}/")
        data_prod = res_prod.data.get("data", res_prod.data)
        self.assertEqual(float(data_prod["average_rating"]), 5.0)
        self.assertEqual(data_prod["total_reviews"], 1)

        res_bs = self.client.get("/api/v1/homepage/best-sellers/")
        bs_items = res_bs.data.get("data", res_bs.data)
        item = [i for i in bs_items if i["product_slug"] == self.product.slug][0]
        self.assertEqual(float(item["average_rating"]), 5.0)
        self.assertEqual(item["total_reviews"], 1)

        # 8. Add 2 more delivered orders and approved reviews:
        # Customer 2 -> 4 stars
        addr2 = Address.objects.create(
            user=self.customer_user_2,
            full_name="Dr. Jane Smith",
            mobile="+919876543212",
            line1="456 Dental Ave",
            city="Mumbai",
            state="Maharashtra",
            pincode="400001",
        )
        order2 = Order.objects.create(
            user=self.customer_user_2,
            shipping_address=addr2,
            status="delivered",
            mrp_subtotal=Decimal("15000.00"),
            selling_subtotal=Decimal("12000.00"),
            taxable_subtotal=Decimal("10169.49"),
            gst_amount=Decimal("1830.51"),
            total_amount=Decimal("12000.00"),
            shipping_line1="456 Dental Ave",
        )
        OrderItem.objects.create(
            order=order2,
            product=self.product,
            quantity=1,
            price=Decimal("12000.00"),
        )
        
        self.client.force_authenticate(user=self.customer_user_2)
        res_post2 = self.client.post("/api/v1/reviews/", {
            "product_id": str(self.product.id),
            "rating": 4,
            "title": "Good performance",
            "comment": "Pretty good.",
        })
        self.assertEqual(res_post2.status_code, 201)
        review2_id = res_post2.data.get("data", res_post2.data)["id"]
        review2 = ProductReview.objects.get(id=review2_id)
        ReviewService.moderate_review(review=review2, status=ReviewStatus.APPROVED, admin_user=self.admin_user)

        # Customer 3 -> 5 stars
        addr3 = Address.objects.create(
            user=self.customer_user_3,
            full_name="Dr. Bob Wilson",
            mobile="+919876543213",
            line1="789 Hospital Rd",
            city="Mumbai",
            state="Maharashtra",
            pincode="400001",
        )
        order3 = Order.objects.create(
            user=self.customer_user_3,
            shipping_address=addr3,
            status="delivered",
            mrp_subtotal=Decimal("15000.00"),
            selling_subtotal=Decimal("12000.00"),
            taxable_subtotal=Decimal("10169.49"),
            gst_amount=Decimal("1830.51"),
            total_amount=Decimal("12000.00"),
            shipping_line1="789 Hospital Rd",
        )
        OrderItem.objects.create(
            order=order3,
            product=self.product,
            quantity=1,
            price=Decimal("12000.00"),
        )

        self.client.force_authenticate(user=self.customer_user_3)
        res_post3 = self.client.post("/api/v1/reviews/", {
            "product_id": str(self.product.id),
            "rating": 5,
            "title": "Excellent",
            "comment": "Five stars.",
        })
        self.assertEqual(res_post3.status_code, 201)
        review3_id = res_post3.data.get("data", res_post3.data)["id"]
        review3 = ProductReview.objects.get(id=review3_id)
        ReviewService.moderate_review(review=review3, status=ReviewStatus.APPROVED, admin_user=self.admin_user)

        # Recalculated aggregation: (5 + 4 + 5) / 3 = 14 / 3 = 4.67
        self.product.refresh_from_db()
        self.assertEqual(str(self.product.average_rating), "4.67")
        self.assertEqual(self.product.total_reviews, 3)
        self.assertEqual(self.product.rating_distribution["5"], 2)
        self.assertEqual(self.product.rating_distribution["4"], 1)

        # Check Best Seller API returns 4.67 and 3
        res_bs2 = self.client.get("/api/v1/homepage/best-sellers/")
        bs_items2 = res_bs2.data.get("data", res_bs2.data)
        item2 = [i for i in bs_items2 if i["product_slug"] == self.product.slug][0]
        self.assertEqual(str(item2["average_rating"]), "4.67")
        self.assertEqual(item2["total_reviews"], 3)
