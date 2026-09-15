from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
User = get_user_model()
from apps.brands.models import Brand
from apps.categories.models import Category
from apps.products.models import Product
from apps.pricing.models import ProductPricing
from apps.homepage.models import DailyOffer, DailyOfferProduct

class DailyOffersTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email="admin_daily@faazo.com",
            full_name="Admin Daily",
            password="adminpassword123",
            role="admin",
            is_staff=True,
        )
        self.customer = User.objects.create_user(
            email="cust_daily@faazo.com",
            full_name="Cust Daily",
            password="custpassword123",
            role="customer",
        )
        self.brand = Brand.objects.create(name="FAAZO Tools", slug="faazo-tools")
        self.category = Category.objects.create(name="Instruments", slug="instruments")
        self.product1 = Product.objects.create(
            name="Test Handpiece Pro",
            slug="test-handpiece-pro",
            sku="THP-001",
            brand=self.brand,
            category=self.category,
        )
        ProductPricing.objects.create(
            product=self.product1,
            mrp=15000,
            selling_price=12000,
        )
        self.product2 = Product.objects.create(
            name="Test Curing Unit",
            slug="test-curing-unit",
            sku="TCU-002",
            brand=self.brand,
            category=self.category,
        )
        ProductPricing.objects.create(
            product=self.product2,
            mrp=8000,
            selling_price=6000,
        )

    def test_create_daily_offer_admin(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "title": "Flash Friday Deals",
            "badge_text": "⚡ FLASH SALE",
            "subheading": "Special dental kit discounts",
            "offer_text": "UP TO 50% OFF",
            "offer_type": "percentage",
            "theme": "red_hot",
            "countdown_enabled": True,
            "status": "live",
            "is_active": True,
            "items_data": [
                {"product_id": str(self.product1.id), "deal_price": 11000, "badge_override": "HOT DEAL", "sort_order": 0},
                {"product_id": str(self.product2.id), "deal_price": 5500, "badge_override": "50% OFF", "sort_order": 1},
            ],
        }
        res = self.client.post("/api/v1/homepage/daily-offers/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["data"]["title"], "Flash Friday Deals")
        self.assertEqual(len(res.data["data"]["items"]), 2)

    def test_duplicate_daily_offer(self):
        offer = DailyOffer.objects.create(
            title="Original Deals Campaign",
            badge_text="🔥 LIMITED",
            status="live",
            is_active=True,
        )
        DailyOfferProduct.objects.create(
            daily_offer=offer,
            product=self.product1,
            deal_price=10500,
            sort_order=0,
        )
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f"/api/v1/homepage/daily-offers/{offer.id}/duplicate/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("Copy", res.data["data"]["title"])
        self.assertEqual(len(res.data["data"]["items"]), 1)

    def test_public_filtering_active_only(self):
        # Create one live active offer
        DailyOffer.objects.create(
            title="Live Public Offer",
            badge_text="🔥 LIVE",
            status="live",
            is_active=True,
        )
        # Create one draft offer
        DailyOffer.objects.create(
            title="Draft Secret Offer",
            badge_text="DRAFT",
            status="draft",
            is_active=False,
        )
        # Unauthenticated customer request
        res = self.client.get("/api/v1/homepage/daily-offers/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Non-admins only see 1 live offer
        self.assertEqual(len(res.data["data"]), 1)
        self.assertEqual(res.data["data"][0]["title"], "Live Public Offer")
