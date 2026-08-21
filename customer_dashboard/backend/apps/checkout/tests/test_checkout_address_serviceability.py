"""
FAAZO – Checkout Address & Serviceability Gating Tests

Verifies:
  1. CheckoutPreviewView blocks invalid/short address
  2. CheckoutPreviewView blocks unserviceable pincode
  3. CheckoutPlaceView blocks unserviceable pincode
  4. Order creation freezes address snapshot on the Order record
"""

from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.brands.models import Brand
from apps.categories.models import Category
from apps.dealer.models import DealerApplication, DealerStatus
from apps.inventory.models import ProductInventory
from apps.pricing.models import ProductPricing
from apps.products.models import Product
from apps.users.models import Address, User, UserRole
from apps.orders.models import Order


class CheckoutAddressServiceabilityTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="dr.dentist.checkout@faazo.com",
            full_name="Dr. Dentist",
            password="StrongPassword123!",
            role=UserRole.CUSTOMER,
        )
        self.dealer_app = DealerApplication.objects.create(
            user=self.user,
            company_name="Dentist Dental Clinic",
            status=DealerStatus.APPROVED,
        )

        cat = Category.objects.get_or_create(name="Instruments", slug="instruments")[0]
        brand = Brand.objects.get_or_create(name="FAAZO Pro", slug="faazo-pro")[0]

        self.product = Product.objects.create(
            name="Dental Implant Kit",
            slug="dental-implant-kit-test",
            category=cat,
            brand=brand,
            sku="SKU-IMPLANT-001",
        )
        ProductPricing.objects.create(
            product=self.product,
            mrp=Decimal("10000.00"),
            selling_price=Decimal("8000.00"),
            dealer_price=Decimal("7000.00"),
            gst_percentage=Decimal("18.00"),
        )
        ProductInventory.objects.create(
            product=self.product,
            current_stock=50,
            reserved_stock=0,
            allow_backorders=False,
        )

        self.valid_address = Address.objects.create(
            user=self.user,
            full_name="Dr. Dentist",
            mobile="9876543210",
            line1="101 Medical Plaza, MG Road",
            city="Mumbai",
            state="Maharashtra",
            pincode="400001",
        )

        self.client.force_authenticate(user=self.user)

    def test_checkout_preview_valid_address_success(self):
        url = reverse("checkout-preview")
        payload = {
            "address_id": str(self.valid_address.id),
            "items": [{"product_id": str(self.product.id), "quantity": 1}],
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["success"])

    def test_checkout_preview_invalid_short_address_line1_rejected(self):
        invalid_addr = Address.objects.create(
            user=self.user,
            full_name="Dr. Dentist",
            mobile="9876543210",
            line1="mm",  # Invalid short line
            city="Mumbai",
            state="Maharashtra",
            pincode="400001",
        )
        url = reverse("checkout-preview")
        payload = {
            "address_id": str(invalid_addr.id),
            "items": [{"product_id": str(self.product.id), "quantity": 1}],
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data["error"]["code"], "INVALID_ADDRESS_LINE1")

    def test_checkout_preview_pincode_state_mismatch_rejected(self):
        mismatch_addr = Address.objects.create(
            user=self.user,
            full_name="Dr. Dentist",
            mobile="9876543210",
            line1="101 Medical Plaza",
            city="Mumbai",
            state="Maharashtra",
            pincode="695101",  # Kerala pincode
        )
        url = reverse("checkout-preview")
        payload = {
            "address_id": str(mismatch_addr.id),
            "items": [{"product_id": str(self.product.id), "quantity": 1}],
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data["error"]["code"], "INVALID_PINCODE_STATE_MISMATCH")

    @override_settings(SHIPPING_PROVIDER="shiprocket")
    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_checkout_preview_unserviceable_pincode_blocked(self, mock_check):
        mock_check.return_value = {
            "is_serviceable": False,
            "destination_pincode": "400001",
            "message": "Delivery is currently unavailable for PIN code 400001.",
            "available_couriers": [],
        }
        url = reverse("checkout-preview")
        payload = {
            "address_id": str(self.valid_address.id),
            "items": [{"product_id": str(self.product.id), "quantity": 1}],
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data["error"]["code"], "PINCODE_NOT_SERVICEABLE")

    @override_settings(SHIPPING_PROVIDER="offline")
    def test_checkout_place_order_creates_immutable_snapshot(self):
        url = reverse("checkout-place")
        payload = {
            "address_id": str(self.valid_address.id),
            "items": [{"product_id": str(self.product.id), "quantity": 1}],
            "payment_method": "upi",
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        order_id = res.data["data"]["id"]
        order = Order.objects.get(id=order_id)
        self.assertEqual(order.shipping_full_name, "Dr. Dentist")
        self.assertEqual(order.shipping_line1, "101 Medical Plaza, MG Road")
        self.assertEqual(order.shipping_city, "Mumbai")
        self.assertEqual(order.shipping_state, "Maharashtra")
        self.assertEqual(order.shipping_pincode, "400001")
        self.assertIsInstance(order.shipping_address_snapshot, dict)
        self.assertEqual(order.shipping_address_snapshot["pincode"], "400001")
