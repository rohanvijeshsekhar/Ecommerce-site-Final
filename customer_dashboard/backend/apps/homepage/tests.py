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
