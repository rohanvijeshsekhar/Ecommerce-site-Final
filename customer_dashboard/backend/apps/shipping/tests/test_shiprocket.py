"""
FAAZO – Shiprocket & Logistics Module Unit Tests

Comprehensive verification across 18 key scenarios:
1. Offline provider in development
2. Live provider selection in production
3. Shiprocket authentication & token caching
4. Serviceability failure handling
5. Successful Shiprocket order creation
6. Successful shipment creation
7. AWB assignment
8. Duplicate shipment prevention & idempotency
9. Connection & read timeout handling
10. Shiprocket 4xx client errors
11. Shiprocket 5xx server errors & transient retries
12. Missing & automatic weight calculation
13. Invalid address validation
14. Invalid pickup location handling
15. COD payment method mapping
16. Prepaid payment method mapping
17. Safe retry after shipment failure
18. Webhook processing & idempotency
"""

import json
from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
import requests

from apps.users.models import User, Address
from apps.orders.models import Order, OrderStatus
from apps.products.models import Product
from apps.categories.models import Category
from apps.brands.models import Brand

from apps.shipping.models import Shipment, ShipmentStatus, PackingStatus, ShiprocketWebhookLog
from apps.shipping.shiprocket_client import (
    ShiprocketAPIClient,
    ShiprocketCircuitBreaker,
    ShiprocketAPIError,
    ShiprocketValidationError,
)
from apps.shipping.providers import (
    get_shipping_provider,
    OfflineShippingProvider,
    ShiprocketProvider,
    ShippingConfigValidator,
)
from apps.shipping.services import ShiprocketService


class ShiprocketUnitTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email="dr.dentist@faazo.com",
            password="TestPassword123!",
            full_name="Dr. Dentist",
            role="customer",
        )
        self.admin = User.objects.create_user(
            email="admin@faazo.com",
            password="AdminPassword123!",
            full_name="FAAZO Admin",
            role="admin",
        )
        self.address = Address.objects.create(
            user=self.user,
            full_name="Dr. Dentist",
            mobile="9876543210",
            line1="Dental Clinic 101, Main Road",
            city="Bangalore",
            state="Karnataka",
            pincode="560001",
        )
        self.category = Category.objects.create(name="Dental Equipment", slug="dental-equipment")
        self.brand = Brand.objects.create(name="FAAZO Premium", slug="faazo-premium")
        self.product = Product.objects.create(
            name="Intraoral Scanner X1",
            slug="intraoral-scanner-x1",
            category=self.category,
            brand=self.brand,
            sku="FAAZO-SCAN-01",
        )
        self.order = Order.objects.create(
            user=self.user,
            order_number="FAAZO-202608-TEST01",
            shipping_address=self.address,
            shipping_address_snapshot={
                "id": str(self.address.id),
                "full_name": "Dr. Dentist",
                "mobile": "9876543210",
                "line1": "Dental Clinic 101, Main Road",
                "line2": "Opposite Metro Pillar 200",
                "city": "Bangalore",
                "state": "Karnataka",
                "pincode": "560001",
            },
            mrp_subtotal=10000.00,
            selling_subtotal=8000.00,
            gst_amount=1440.00,
            shipping_fee=0.00,
            total_amount=9440.00,
            status=OrderStatus.PROCESSING,
        )
        self.client_obj = ShiprocketAPIClient(
            base_url="https://apiv2.shiprocket.in",
            email="faazodental.shiprocket@gmail.com",
            password="test_password",
        )

    # 1. Offline provider in development
    @override_settings(SHIPPING_PROVIDER="offline")
    def test_01_offline_provider_in_development(self):
        provider = get_shipping_provider()
        self.assertIsInstance(provider, OfflineShippingProvider)
        package_info = {"weight": 1.0, "length": 10, "breadth": 10, "height": 10}
        shipment = provider.create_shipment(order=self.order, package_info=package_info)
        self.assertEqual(shipment.provider, "offline")
        self.assertTrue(shipment.awb_number.startswith("DEVFAAZO"))

    # 2. Live provider selection in production
    @override_settings(
        SHIPPING_PROVIDER="shiprocket",
        SHIPROCKET_EMAIL="faazodental.shiprocket@gmail.com",
        SHIPROCKET_PASSWORD="real_password",
        SHIPROCKET_PICKUP_LOCATION="Primary"
    )
    def test_02_live_provider_selection_in_production(self):
        provider = get_shipping_provider()
        self.assertIsInstance(provider, ShiprocketProvider)

    # 3. Shiprocket authentication & token caching
    @patch("requests.post")
    def test_03_shiprocket_authentication_and_caching(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"token": "jwt_token_sample_123"}
        mock_post.return_value = mock_resp

        token = self.client_obj.get_auth_token()
        self.assertEqual(token, "jwt_token_sample_123")
        self.assertEqual(mock_post.call_count, 1)

        # Reusing token from cache
        token2 = self.client_obj.get_auth_token()
        self.assertEqual(token2, "jwt_token_sample_123")
        self.assertEqual(mock_post.call_count, 1)

    # 4. Serviceability failure
    @override_settings(SHIPPING_PROVIDER="shiprocket")
    @patch.object(ShiprocketAPIClient, "check_serviceability")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="jwt_tok")
    def test_04_serviceability_failure_handling(self, mock_auth, mock_check):
        from apps.shipping.pincode_service import PincodeServiceabilityEngine
        mock_check.return_value = ({
            "status": 200,
            "data": {
                "available_courier_companies": []
            }
        }, 200, 50.0)

        res = PincodeServiceabilityEngine.check("190001", force_refresh=True)
        self.assertFalse(res["is_serviceable"])
        self.assertIn("unavailable", res["message"].lower())

    # 5. Successful Shiprocket order creation
    @patch("requests.post")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="jwt_tok")
    def test_05_successful_shiprocket_order_creation(self, mock_auth, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"order_id": 100200, "shipment_id": 300400, "status": "NEW"}
        mock_post.return_value = mock_resp

        res, status_code, _ = self.client_obj.create_order({"order_id": "FAAZO-01"})
        self.assertEqual(status_code, 200)
        self.assertEqual(res.get("order_id"), 100200)

    # 6. Successful shipment creation
    @override_settings(SHIPPING_PROVIDER="shiprocket")
    @patch.object(ShiprocketAPIClient, "assign_courier")
    @patch.object(ShiprocketAPIClient, "create_order")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="jwt_tok")
    def test_06_successful_shipment_creation(self, mock_auth, mock_create, mock_assign):
        mock_create.return_value = ({"order_id": 555, "shipment_id": 666}, 200, 100.0)
        mock_assign.return_value = ({"response": {"data": {"awb_code": "143256789012", "courier_name": "Delhivery Surface"}}}, 200, 90.0)

        provider = ShiprocketProvider()
        package_info = {"weight": 1.5, "length": 15, "breadth": 15, "height": 10, "payment_mode": "Prepaid"}
        shipment = provider.create_shipment(order=self.order, package_info=package_info, created_by=self.admin)

        self.assertEqual(shipment.provider, "shiprocket")
        self.assertEqual(shipment.awb_number, "143256789012")
        self.assertEqual(shipment.courier_name, "Delhivery Surface")
        self.assertEqual(shipment.external_shipment_id, "555")
        self.assertEqual(shipment.delhivery_shipment_id, "666")

    # 7. AWB assignment
    @patch("requests.post")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="jwt_tok")
    def test_07_awb_assignment(self, mock_auth, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"response": {"data": {"awb_code": "BLUEDART888", "courier_name": "BlueDart"}}}
        mock_post.return_value = mock_resp

        res, code, _ = self.client_obj.assign_courier(666)
        self.assertEqual(code, 200)
        self.assertEqual(res["response"]["data"]["awb_code"], "BLUEDART888")

    # 8. Duplicate shipment prevention
    @override_settings(SHIPPING_PROVIDER="shiprocket")
    @patch.object(ShiprocketAPIClient, "create_order")
    def test_08_duplicate_shipment_prevention(self, mock_create):
        existing = Shipment.objects.create(
            order=self.order,
            provider="shiprocket",
            awb_number="EXISTING_AWB_999",
            shipment_status=ShipmentStatus.CREATED,
        )
        provider = ShiprocketProvider()
        res = provider.create_shipment(order=self.order, package_info={"weight": 1.0}, existing_shipment=existing)
        self.assertEqual(res.id, existing.id)
        mock_create.assert_not_called()

    # 9. Timeout handling
    @patch("requests.post")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="jwt_tok")
    def test_09_timeout_handling(self, mock_auth, mock_post):
        mock_post.side_effect = requests.Timeout("Connection timed out")
        with self.assertRaises(ShiprocketAPIError) as cm:
            self.client_obj.create_order({"order_id": "ORD-TIMEOUT"})
        self.assertEqual(cm.exception.error_code, "NETWORK_TIMEOUT")

    # 10. Shiprocket 4xx
    @patch("requests.post")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="jwt_tok")
    def test_10_shiprocket_4xx_client_error(self, mock_auth, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 422
        mock_resp.json.return_value = {"message": "Invalid pickup postcode"}
        mock_post.return_value = mock_resp

        with self.assertRaises(ShiprocketValidationError):
            self.client_obj.create_order({"order_id": "ORD-422"})

    # 11. Shiprocket 5xx
    @patch("requests.post")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="jwt_tok")
    def test_11_shiprocket_5xx_server_error(self, mock_auth, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_resp.text = "Internal Server Error"
        mock_resp.json.side_effect = ValueError("No JSON")
        mock_post.return_value = mock_resp

        with self.assertRaises(ShiprocketAPIError):
            self.client_obj.create_order({"order_id": "ORD-500"})

    # 12. Missing weight with automatic calculation fallback
    def test_12_missing_weight_with_fallback(self):
        provider = ShiprocketProvider()
        from apps.orders.models import OrderItem
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2,
            price=8000.00,
        )
        pkg_info = {"weight": 0, "length": 10, "breadth": 10, "height": 10}
        provider.validate_for_shipment(self.order, pkg_info)
        self.assertGreater(pkg_info["weight"], 0)

    # 13. Invalid address
    def test_13_invalid_address_validation(self):
        self.order.shipping_address_snapshot = {
            "full_name": "",
            "mobile": "123",
            "line1": "",
            "city": "",
            "state": "",
            "pincode": "999",
        }
        self.order.shipping_line1 = ""
        self.order.shipping_pincode = "999"
        self.order.save()

        provider = ShiprocketProvider()
        with self.assertRaises(ShiprocketValidationError):
            provider.validate_for_shipment(self.order, {"weight": 1.0, "length": 10, "breadth": 10, "height": 10})

    # 14. Invalid pickup location
    def test_14_missing_pickup_location_fails_config_validator(self):
        with override_settings(SHIPROCKET_PICKUP_LOCATION=""):
            is_valid, reasons = ShippingConfigValidator.validate_shiprocket_config("shiprocket")
            self.assertFalse(is_valid)
            self.assertTrue(any("SHIPROCKET_PICKUP_LOCATION" in r for r in reasons))

    # 15. COD payment method mapping
    @override_settings(SHIPPING_PROVIDER="shiprocket")
    @patch.object(ShiprocketAPIClient, "assign_courier")
    @patch.object(ShiprocketAPIClient, "create_order")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="jwt_tok")
    def test_15_cod_payment_method_mapping(self, mock_auth, mock_create, mock_assign):
        mock_create.return_value = ({"order_id": 11, "shipment_id": 22}, 200, 100.0)
        mock_assign.return_value = ({"response": {"data": {"awb_code": "COD_AWB_123", "courier_name": "Delhivery"}}}, 200, 90.0)

        provider = ShiprocketProvider()
        pkg = {"weight": 1.0, "length": 10, "breadth": 10, "height": 10, "payment_mode": "COD"}
        provider.create_shipment(order=self.order, package_info=pkg)

        payload_sent = mock_create.call_args[0][0]
        self.assertEqual(payload_sent["payment_method"], "COD")

    # 16. Prepaid payment method mapping
    @override_settings(SHIPPING_PROVIDER="shiprocket")
    @patch.object(ShiprocketAPIClient, "assign_courier")
    @patch.object(ShiprocketAPIClient, "create_order")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="jwt_tok")
    def test_16_prepaid_payment_method_mapping(self, mock_auth, mock_create, mock_assign):
        mock_create.return_value = ({"order_id": 33, "shipment_id": 44}, 200, 100.0)
        mock_assign.return_value = ({"response": {"data": {"awb_code": "PRE_AWB_123", "courier_name": "Delhivery"}}}, 200, 90.0)

        provider = ShiprocketProvider()
        pkg = {"weight": 1.0, "length": 10, "breadth": 10, "height": 10, "payment_mode": "Prepaid"}
        provider.create_shipment(order=self.order, package_info=pkg)

        payload_sent = mock_create.call_args[0][0]
        self.assertEqual(payload_sent["payment_method"], "Prepaid")

    # 17. Safe retry after failure
    @override_settings(SHIPPING_PROVIDER="shiprocket")
    @patch.object(ShiprocketAPIClient, "assign_courier")
    @patch.object(ShiprocketAPIClient, "create_order")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="jwt_tok")
    def test_17_safe_retry_after_failure(self, mock_auth, mock_create, mock_assign):
        mock_create.return_value = ({"order_id": 77, "shipment_id": 88}, 200, 100.0)
        # First attempt fails AWB assignment
        mock_assign.side_effect = [
            ({"message": "Courier timeout"}, 500, 100.0),
            ({"response": {"data": {"awb_code": "RETRY_AWB_123", "courier_name": "BlueDart"}}}, 200, 100.0),
        ]

        service = ShiprocketService()
        pkg = {"weight": 1.0, "length": 10, "breadth": 10, "height": 10}

        # First call fails
        with self.assertRaises(ShiprocketAPIError):
            service.create_shipment(order=self.order, package_info=pkg)

        # Second retry call succeeds
        shipment = service.create_shipment(order=self.order, package_info=pkg)
        self.assertEqual(shipment.awb_number, "RETRY_AWB_123")

    # 18. Webhook processing & idempotency
    def test_18_webhook_processing_and_idempotency(self):
        shipment = Shipment.objects.create(
            order=self.order,
            provider="shiprocket",
            awb_number="WH_AWB_100",
            shipment_status=ShipmentStatus.CREATED,
        )

        api_client = APIClient()
        webhook_payload = {
            "awb": "WH_AWB_100",
            "current_status": "DELIVERED",
            "location": "Bangalore Hub",
            "current_timestamp": "2026-08-19 15:30:00",
        }

        # First webhook delivery
        resp1 = api_client.post(
            "/api/v1/shipping/webhooks/shiprocket/",
            data=webhook_payload,
            format="json",
            HTTP_X_SHIPROCKET_WEBHOOK_ID="WH_EVT_001",
        )
        self.assertEqual(resp1.status_code, 200)
        shipment.refresh_from_db()
        self.assertEqual(shipment.shipment_status, ShipmentStatus.DELIVERED)

        # Second duplicate webhook delivery
        resp2 = api_client.post(
            "/api/v1/shipping/webhooks/shiprocket/",
            data=webhook_payload,
            format="json",
            HTTP_X_SHIPROCKET_WEBHOOK_ID="WH_EVT_001",
        )
        self.assertEqual(resp2.status_code, 200)
        self.assertIn("Idempotent", resp2.data.get("message", ""))
