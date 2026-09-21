import json
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from apps.brands.models import Brand
from apps.categories.models import Category
from apps.products.models import Product, ProductStatus
from apps.pricing.models import ProductPricing
from apps.homepage.models import BrandDeal, BrandDealProduct, get_active_brand_deal_price

User = get_user_model()


class BrandDealTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser(
            email="admin@faazo.com",
            password="adminpassword123",
            full_name="Admin User",
        )
        self.admin_user.role = "admin"
        self.admin_user.save()

        self.regular_user = User.objects.create_user(
            email="doctor@faazo.com",
            password="doctorpassword123",
            full_name="Dr. Jane Doe",
        )

        self.brand = Brand.objects.create(
            name="Waldent",
            slug="waldent",
            is_active=True,
        )

        self.category = Category.objects.create(
            name="Endodontics",
            slug="endodontics",
            is_active=True,
        )

        self.product = Product.objects.create(
            name="Waldent Endomotor Pro",
            slug="waldent-endomotor-pro",
            sku="WAL-ENDO-001",
            brand=self.brand,
            category=self.category,
            status=ProductStatus.ACTIVE,
        )
        self.pricing = ProductPricing.objects.create(
            product=self.product,
            mrp=Decimal("20000.00"),
            selling_price=Decimal("16000.00"),
            gst_percentage=Decimal("18.00"),
        )

        self.now = timezone.now()

    def test_brand_deal_creation_and_properties(self):
        deal = BrandDeal.objects.create(
            name="Waldent Mega Endo Deal",
            slug="waldent-mega-endo-deal",
            brand=self.brand,
            title="Waldent Mega Endo Fest",
            subtitle="Save up to 40% on rotary instruments",
            offer_text="UP TO 40% OFF",
            start_datetime=self.now - timedelta(days=1),
            end_datetime=self.now + timedelta(days=5),
            status="active",
            is_active=True,
            show_on_homepage=True,
        )

        self.assertTrue(deal.is_currently_valid)
        self.assertTrue(deal.is_homepage_eligible)

        deal_product = BrandDealProduct.objects.create(
            brand_deal=deal,
            product=self.product,
            deal_price=Decimal("12000.00"),
        )
        # 12000 vs 20000 MRP -> 40% discount
        self.assertEqual(deal_product.discount_percentage, Decimal("40.00"))

        # Test helper function
        resolved_price = get_active_brand_deal_price(self.product)
        self.assertEqual(resolved_price, Decimal("12000.00"))

    def test_expired_or_inactive_deal_price_resolution(self):
        expired_deal = BrandDeal.objects.create(
            name="Waldent Past Sale",
            slug="waldent-past-sale",
            brand=self.brand,
            start_datetime=self.now - timedelta(days=10),
            end_datetime=self.now - timedelta(days=1),
            status="active",
            is_active=True,
        )
        BrandDealProduct.objects.create(
            brand_deal=expired_deal,
            product=self.product,
            deal_price=Decimal("9999.00"),
        )

        resolved_price = get_active_brand_deal_price(self.product)
        self.assertIsNone(resolved_price)

    def test_public_and_admin_api_endpoints(self):
        deal = BrandDeal.objects.create(
            name="Waldent Exclusive Sale",
            slug="waldent-exclusive",
            brand=self.brand,
            title="Exclusive Waldent Launch",
            start_datetime=self.now - timedelta(hours=2),
            end_datetime=self.now + timedelta(days=7),
            status="active",
            is_active=True,
            show_on_homepage=True,
        )
        BrandDealProduct.objects.create(
            brand_deal=deal,
            product=self.product,
            deal_price=Decimal("11500.00"),
        )

        # Public list
        response = self.client.get("/api/v1/homepage/brand-deals/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        res_data = response.json()
        deals = res_data.get("data", res_data)
        self.assertTrue(any(d["slug"] == "waldent-exclusive" for d in deals))

        # Public by_slug
        response = self.client.get("/api/v1/homepage/brand-deals/by-slug/waldent-exclusive/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        res_data = response.json()
        data = res_data.get("data", res_data)
        self.assertEqual(data["slug"], "waldent-exclusive")
        self.assertEqual(len(data["deal_products"]), 1)
        self.assertEqual(float(data["deal_products"][0]["deal_price"]), 11500.0)

        # Admin duplicate action
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(f"/api/v1/homepage/brand-deals/{deal.id}/duplicate/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        dup_res = response.json()
        dup_data = dup_res.get("data", dup_res)
        self.assertTrue("Copy" in dup_data["name"])
        self.assertEqual(len(dup_data["deal_products"]), 1)

    def test_brand_deal_create_with_products_data_and_colors(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "brand": str(self.brand.id),
            "name": "Woodpecker Ultrasonic Mega Deal",
            "slug": "woodpecker-mega-deal",
            "title": "Woodpecker Scalers & Tips",
            "subtitle": "Get flat 25% off",
            "offer_text": "FLAT 25% OFF",
            "cta_text": "Shop Now",
            "bg_color": "#0F4C81",
            "text_color": "#FFFFFF",
            "accent_color": "#F5DF4D",
            "status": "active",
            "is_active": True,
            "show_on_homepage": True,
            "products_data": json.dumps([
                {
                    "product": str(self.product.id),
                    "deal_price": "15000.00",
                    "is_active": True,
                    "sort_order": 0,
                }
            ]),
        }

        response = self.client.post("/api/v1/homepage/brand-deals/", data=payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        res = response.json()
        data = res.get("data", res)
        self.assertEqual(data["slug"], "woodpecker-mega-deal")
        self.assertEqual(data["bg_color"], "#0F4C81")
        self.assertEqual(data["text_color"], "#FFFFFF")
        self.assertEqual(data["accent_color"], "#F5DF4D")
        self.assertEqual(len(data["deal_products"]), 1)
        # 15000 vs 20000 MRP -> 25% discount
        self.assertEqual(float(data["deal_products"][0]["deal_price"]), 15000.0)
        self.assertEqual(float(data["deal_products"][0]["discount_percentage"]), 25.0)

        # Update without changing image
        deal_id = data["id"]
        update_payload = {
            "title": "Updated Woodpecker Deal",
            "desktop_image": data["banner_desktop"] or "http://example.com/existing.jpg",
        }
        update_response = self.client.patch(f"/api/v1/homepage/brand-deals/{deal_id}/", data=update_payload)
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        up_data = update_response.json().get("data", update_response.json())
        self.assertEqual(up_data["title"], "Updated Woodpecker Deal")

