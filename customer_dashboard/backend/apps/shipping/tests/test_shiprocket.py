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
    @patch.object(ShiprocketAPIClient, "get_order_details", return_value=({}, 200, 0.0))
    @patch.object(ShiprocketAPIClient, "get_shipment_details", return_value=({}, 200, 0.0))
    @patch.object(ShiprocketAPIClient, "create_order")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="jwt_tok")
    def test_06_successful_shipment_creation(self, mock_auth, mock_create, mock_ship_details, mock_order_details, mock_assign):
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
    @patch.object(ShiprocketAPIClient, "get_order_details", return_value=({}, 200, 0.0))
    @patch.object(ShiprocketAPIClient, "get_shipment_details", return_value=({}, 200, 0.0))
    @patch.object(ShiprocketAPIClient, "create_order")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="jwt_tok")
    def test_15_cod_payment_method_mapping(self, mock_auth, mock_create, mock_ship_details, mock_order_details, mock_assign):
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
    @patch.object(ShiprocketAPIClient, "get_order_details", return_value=({}, 200, 0.0))
    @patch.object(ShiprocketAPIClient, "get_shipment_details", return_value=({}, 200, 0.0))
    @patch.object(ShiprocketAPIClient, "create_order")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="jwt_tok")
    def test_16_prepaid_payment_method_mapping(self, mock_auth, mock_create, mock_ship_details, mock_order_details, mock_assign):
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
    @patch.object(ShiprocketAPIClient, "get_order_details", return_value=({}, 200, 0.0))
    @patch.object(ShiprocketAPIClient, "get_shipment_details", return_value=({}, 200, 0.0))
    @patch.object(ShiprocketAPIClient, "create_order")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="jwt_tok")
    def test_17_safe_retry_after_failure(self, mock_auth, mock_create, mock_ship_details, mock_order_details, mock_assign):
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
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.DELIVERED)

        # Second duplicate webhook delivery
        resp2 = api_client.post(
            "/api/v1/shipping/webhooks/shiprocket/",
            data=webhook_payload,
            format="json",
            HTTP_X_SHIPROCKET_WEBHOOK_ID="WH_EVT_001",
        )
        self.assertEqual(resp2.status_code, 200)
        self.assertIn("Idempotent", resp2.data.get("message", ""))

    # 19. AWB Recovery: Local AWB empty + Shiprocket shipment details have AWB -> Reuse AWB, no assign_courier call
    @override_settings(SHIPPING_PROVIDER="shiprocket")
    @patch.object(ShiprocketAPIClient, "assign_courier")
    @patch.object(ShiprocketAPIClient, "get_shipment_details")
    @patch.object(ShiprocketAPIClient, "create_order")
    def test_19_awb_recovery_from_shiprocket_shipment_details(self, mock_create, mock_ship_details, mock_assign):
        mock_create.return_value = ({"order_id": 1564117650, "shipment_id": 1560336097}, 200, 50.0)
        mock_ship_details.return_value = ({
            "data": {
                "id": 1560336097,
                "order_id": 1564117650,
                "status": "PICKUP GENERATED",
                "awb": "90654796212",
                "courier": "Blue Dart Air",
            }
        }, 200, 50.0)

        provider = ShiprocketProvider()
        pkg = {"weight": 1.0, "length": 10, "breadth": 10, "height": 10}
        shipment = provider.create_shipment(order=self.order, package_info=pkg)

        # AWB should be recovered from shipment details
        self.assertEqual(shipment.awb_number, "90654796212")
        self.assertEqual(shipment.courier_name, "Blue Dart Air")
        self.assertEqual(shipment.delhivery_shipment_id, "1560336097")
        self.assertEqual(shipment.external_shipment_id, "1564117650")
        # assign_courier must NOT have been called!
        mock_assign.assert_not_called()

        # Order status should automatically advance to SHIPPED
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.SHIPPED)

    # 20. AWB Recovery: Local AWB empty + Shiprocket order details have AWB -> Reuse AWB, no assign_courier call
    @override_settings(SHIPPING_PROVIDER="shiprocket")
    @patch.object(ShiprocketAPIClient, "assign_courier")
    @patch.object(ShiprocketAPIClient, "get_order_details")
    @patch.object(ShiprocketAPIClient, "get_shipment_details")
    @patch.object(ShiprocketAPIClient, "create_order")
    def test_20_awb_recovery_from_shiprocket_order_details(self, mock_create, mock_ship_details, mock_order_details, mock_assign):
        mock_create.return_value = ({"order_id": 1564117650, "shipment_id": 1560336097}, 200, 50.0)
        mock_ship_details.return_value = ({"data": {}}, 200, 50.0)
        mock_order_details.return_value = ({
            "data": {
                "id": 1564117650,
                "status": "PICKUP GENERATED",
                "awb_data": {"awb": "90654796212"},
                "shipments": {"id": 1560336097, "courier": "Blue Dart Air"},
            }
        }, 200, 50.0)

        provider = ShiprocketProvider()
        pkg = {"weight": 1.0, "length": 10, "breadth": 10, "height": 10}
        shipment = provider.create_shipment(order=self.order, package_info=pkg)

        self.assertEqual(shipment.awb_number, "90654796212")
        self.assertEqual(shipment.courier_name, "Blue Dart Air")
        mock_assign.assert_not_called()

    # 21. Status Regression Protection: Delayed In Transit webhook does not revert Delivered status
    def test_21_status_regression_protection(self):
        shipment = Shipment.objects.create(
            order=self.order,
            provider="shiprocket",
            awb_number="REG_AWB_100",
            shipment_status=ShipmentStatus.DELIVERED,
            delivered_at=timezone.now(),
        )
        self.order.status = OrderStatus.DELIVERED
        self.order.save()

        api_client = APIClient()
        # Delayed webhook arriving with IN_TRANSIT
        delayed_payload = {
            "awb": "REG_AWB_100",
            "current_status": "IN TRANSIT",
            "location": "Transit Hub Mumbai",
            "current_timestamp": "2026-08-19 12:00:00",
        }

        resp = api_client.post(
            "/api/v1/shipping/webhooks/shiprocket/",
            data=delayed_payload,
            format="json",
            HTTP_X_SHIPROCKET_WEBHOOK_ID="WH_REG_001",
        )
        self.assertEqual(resp.status_code, 200)
        shipment.refresh_from_db()
        # Status MUST remain DELIVERED
        self.assertEqual(shipment.shipment_status, ShipmentStatus.DELIVERED)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.DELIVERED)

    # 22. Status Synchronization via tracking sync
    @override_settings(SHIPPING_PROVIDER="shiprocket")
    @patch.object(ShiprocketAPIClient, "track_awb")
    def test_22_tracking_sync_with_scans_and_order_update(self, mock_track):
        mock_track.return_value = ({
            "tracking_data": {
                "track_status": 1,
                "shipment_track": [{
                    "current_status": "OUT FOR DELIVERY",
                    "destination": "Bangalore Urban",
                    "courier_name": "Blue Dart Express",
                    "scans": [
                        {"date": "2026-09-07T08:00:00Z", "location": "Bangalore Hub", "activity": "Arrived at Hub", "status": "REACHED AT DESTINATION HUB"},
                        {"date": "2026-09-07T10:30:00Z", "location": "Bangalore Delivery Center", "activity": "Out for delivery", "status": "OUT FOR DELIVERY"},
                    ]
                }]
            }
        }, 200, 50.0)

        shipment = Shipment.objects.create(
            order=self.order,
            provider="shiprocket",
            awb_number="SYNC_AWB_100",
            shipment_status=ShipmentStatus.IN_TRANSIT,
        )

        provider = ShiprocketProvider()
        updated = provider.sync_tracking(shipment)

        self.assertEqual(updated.shipment_status, ShipmentStatus.OUT_FOR_DELIVERY)
        self.assertEqual(updated.current_location, "Bangalore Urban")
        self.assertEqual(updated.courier_name, "Blue Dart Express")
        self.assertEqual(updated.tracking_events.count(), 2)

        # Calling sync_tracking a second time with same scans must NOT create duplicate tracking events
        provider.sync_tracking(updated)
        self.assertEqual(updated.tracking_events.count(), 2)

    # ───────────────────────────────────────────────────────────────────────
    # AWB Synchronization Fix Tests (tests 23-32)
    # ───────────────────────────────────────────────────────────────────────

    # 23. Successful create_shipment persists AWB and courier to local DB
    @override_settings(SHIPPING_PROVIDER="shiprocket")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="mock-token")
    @patch.object(ShiprocketAPIClient, "assign_courier")
    @patch.object(ShiprocketAPIClient, "create_order")
    def test_23_create_shipment_persists_awb_to_db(self, mock_create, mock_assign, mock_auth):
        mock_create.return_value = ({"order_id": 9001, "shipment_id": 8001, "awb_code": "AWB_NEW_TEST", "courier_name": "Blue Dart"}, 200, 100.0)
        mock_assign.return_value = ({}, 200, 50.0)

        existing = Shipment.objects.create(order=self.order, provider="shiprocket", shipment_status=ShipmentStatus.NOT_CREATED)
        provider = ShiprocketProvider()
        pkg = {"weight": 1.0, "length": 10.0, "breadth": 10.0, "height": 10.0, "payment_mode": "Prepaid"}
        result = provider.create_shipment(self.order, pkg, existing_shipment=existing)

        result.refresh_from_db()
        self.assertEqual(result.awb_number, "AWB_NEW_TEST")
        self.assertEqual(result.courier_name, "Blue Dart")
        self.assertEqual(result.provider, "shiprocket")
        self.assertNotEqual(result.shipment_status, ShipmentStatus.NOT_CREATED)
        self.assertEqual(result.delhivery_shipment_id, "8001")
        self.assertEqual(result.external_shipment_id, "9001")

    # 24. create_shipment with duplicate order_id recovers existing AWB via shipment details
    @override_settings(SHIPPING_PROVIDER="shiprocket")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="mock-token")
    @patch.object(ShiprocketAPIClient, "get_shipment_details")
    @patch.object(ShiprocketAPIClient, "create_order")
    def test_24_duplicate_order_recovery_via_shipment_details(self, mock_create, mock_ship_details, mock_auth):
        """When Shiprocket rejects create_order (duplicate), AWB is recovered from get_shipment_details."""
        # create_order raises validation error with SR IDs in details
        dup_err = ShiprocketValidationError(
            ["Order already exists."],
            error_code="VALIDATION_FAILED"
        )
        dup_err.details = {"order_id": 9002, "shipment_id": 8002}
        mock_create.side_effect = dup_err

        mock_ship_details.return_value = (
            {"data": {"awb": "AWB_RECOVERED_23", "awb_code": None, "courier": "DTDC Courier", "courier_name": None}},
            200, 60.0
        )

        existing = Shipment.objects.create(order=self.order, provider="shiprocket", shipment_status=ShipmentStatus.NOT_CREATED)
        provider = ShiprocketProvider()
        pkg = {"weight": 1.0, "length": 10.0, "breadth": 10.0, "height": 10.0, "payment_mode": "Prepaid"}
        result = provider.create_shipment(self.order, pkg, existing_shipment=existing)

        result.refresh_from_db()
        self.assertEqual(result.awb_number, "AWB_RECOVERED_23")
        self.assertEqual(result.courier_name, "DTDC Courier")
        self.assertEqual(result.provider, "shiprocket")

    # 25. Existing local AWB is never overwritten (strict idempotency)
    @override_settings(SHIPPING_PROVIDER="shiprocket")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="mock-token")
    @patch.object(ShiprocketAPIClient, "create_order")
    def test_25_existing_awb_never_overwritten(self, mock_create, mock_auth):
        """If existing_shipment already has AWB and provider=shiprocket, return it untouched."""
        existing = Shipment.objects.create(
            order=self.order,
            provider="shiprocket",
            awb_number="EXISTING_AWB_SAFE",
            shipment_status=ShipmentStatus.CREATED,
        )
        provider = ShiprocketProvider()
        pkg = {"weight": 1.0, "length": 10.0, "breadth": 10.0, "height": 10.0, "payment_mode": "Prepaid"}
        result = provider.create_shipment(self.order, pkg, existing_shipment=existing)

        mock_create.assert_not_called()
        self.assertEqual(result.awb_number, "EXISTING_AWB_SAFE")

    # 26. sync_tracking recovers AWB when awb_number is empty but SR shipment ID is known
    @override_settings(SHIPPING_PROVIDER="shiprocket")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="mock-token")
    @patch.object(ShiprocketAPIClient, "track_awb")
    @patch.object(ShiprocketAPIClient, "get_shipment_details")
    def test_26_sync_tracking_recovers_awb_via_shipment_details(self, mock_ship_details, mock_track, mock_auth):
        mock_ship_details.return_value = (
            {"data": {"awb": "AWB_SYNC_RECOVERED", "courier": "Ekart Logistics"}},
            200, 45.0
        )
        # After AWB is recovered, sync_tracking proceeds to track_awb — mock that call
        mock_track.return_value = (
            {"tracking_data": {"track_status": 1, "shipment_track": [{
                "current_status": "AWB ASSIGNED", "destination": "Origin Hub"
            }]}},
            200, 30.0
        )
        shipment = Shipment.objects.create(
            order=self.order,
            provider="shiprocket",
            awb_number="",
            delhivery_shipment_id="99001",
            shipment_status=ShipmentStatus.NOT_CREATED,
        )

        provider = ShiprocketProvider()
        updated = provider.sync_tracking(shipment)

        updated.refresh_from_db()
        self.assertEqual(updated.awb_number, "AWB_SYNC_RECOVERED")
        self.assertEqual(updated.courier_name, "Ekart Logistics")
        self.assertNotEqual(updated.shipment_status, ShipmentStatus.NOT_CREATED)
        self.assertEqual(updated.provider, "shiprocket")

    # 27. sync_tracking with no AWB and no SR IDs → search by channel_order_id
    @override_settings(SHIPPING_PROVIDER="shiprocket")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="mock-token")
    @patch.object(ShiprocketAPIClient, "get_shipment_details")
    @patch.object(ShiprocketAPIClient, "_execute_request")
    def test_27_sync_tracking_recovers_awb_via_channel_order_id_search(self, mock_exec, mock_ship_details, mock_auth):
        # _execute_request for the search returns matching order
        def side_exec(method, path, json_data=None, params=None, **kwargs):
            if method == "GET" and "/orders" in path:
                return (
                    {"data": {"data": [{"id": "5001", "shipments": {"id": "4001"}}]}},
                    200, 30.0
                )
            return ({}, 200, 10.0)
        mock_exec.side_effect = side_exec
        mock_ship_details.return_value = (
            {"data": {"awb": "AWB_CHAN_RECOVERED", "courier": "Delhivery"}},
            200, 50.0
        )

        shipment = Shipment.objects.create(
            order=self.order,
            provider="shiprocket",
            awb_number="",
            delhivery_shipment_id="",
            external_shipment_id="",
            shipment_status=ShipmentStatus.NOT_CREATED,
        )

        provider = ShiprocketProvider()
        updated = provider.sync_tracking(shipment)
        updated.refresh_from_db()
        self.assertEqual(updated.awb_number, "AWB_CHAN_RECOVERED")

    # 28. provider='sandbox' is treated as a Shiprocket provider in SHIPROCKET_PROVIDERS
    def test_28_shiprocket_providers_includes_legacy_values(self):
        from apps.shipping.providers import SHIPROCKET_PROVIDERS
        self.assertIn("shiprocket", SHIPROCKET_PROVIDERS)
        self.assertIn("sandbox", SHIPROCKET_PROVIDERS)
        self.assertIn("live", SHIPROCKET_PROVIDERS)

    # 29. Idempotency check accepts legacy provider='sandbox' — does not create duplicate AWB
    @override_settings(SHIPPING_PROVIDER="shiprocket")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="mock-token")
    @patch.object(ShiprocketAPIClient, "create_order")
    def test_29_idempotency_accepts_legacy_sandbox_provider(self, mock_create, mock_auth):
        """If active shipment has provider='sandbox' and awb_number set, return it without calling create_order."""
        existing = Shipment.objects.create(
            order=self.order,
            provider="sandbox",
            awb_number="SANDBOX_AWB_IDEMPOTENT",
            shipment_status=ShipmentStatus.CREATED,
        )
        provider = ShiprocketProvider()
        pkg = {"weight": 1.0, "length": 10.0, "breadth": 10.0, "height": 10.0, "payment_mode": "Prepaid"}
        result = provider.create_shipment(self.order, pkg, existing_shipment=existing)

        mock_create.assert_not_called()
        self.assertEqual(result.awb_number, "SANDBOX_AWB_IDEMPOTENT")

    # 30. After create_shipment succeeds, provider is always 'shiprocket' (never 'sandbox')
    @override_settings(SHIPPING_PROVIDER="shiprocket")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="mock-token")
    @patch.object(ShiprocketAPIClient, "assign_courier")
    @patch.object(ShiprocketAPIClient, "create_order")
    def test_30_provider_normalized_to_shiprocket_on_save(self, mock_create, mock_assign, mock_auth):
        mock_create.return_value = ({"order_id": 9050, "shipment_id": 8050, "awb_code": "AWB_NORM_TEST"}, 200, 100.0)
        mock_assign.return_value = ({}, 200, 50.0)

        # Start with legacy sandbox provider
        existing = Shipment.objects.create(order=self.order, provider="sandbox", shipment_status=ShipmentStatus.NOT_CREATED)
        provider = ShiprocketProvider()
        pkg = {"weight": 1.0, "length": 10.0, "breadth": 10.0, "height": 10.0, "payment_mode": "Prepaid"}
        result = provider.create_shipment(self.order, pkg, existing_shipment=existing)

        result.refresh_from_db()
        self.assertEqual(result.provider, "shiprocket")

    # 31. _find_existing_sr_order parses nested 'data.data' response structure
    @override_settings(SHIPPING_PROVIDER="shiprocket")
    @patch.object(ShiprocketAPIClient, "get_auth_token", return_value="mock-token")
    @patch.object(ShiprocketAPIClient, "_execute_request")
    def test_31_find_existing_sr_order_parses_response(self, mock_exec, mock_auth):
        mock_exec.return_value = (
            {"data": {"data": [{"id": "7777", "shipments": {"id": "6666"}}]}},
            200, 20.0
        )
        provider = ShiprocketProvider()
        sr_order_id, sr_shipment_id = provider._find_existing_sr_order("FAAZO-999")
        self.assertEqual(sr_order_id, "7777")
        self.assertEqual(sr_shipment_id, "6666")

    # 32. Admin create-courier API returns awb_number in response on success
    @override_settings(SHIPPING_PROVIDER="shiprocket", SHIPROCKET_PICKUP_LOCATION="Primary")
    @patch("apps.shipping.views.ShiprocketService")
    def test_32_create_courier_api_returns_awb_in_response(self, MockSvc):
        """Admin POST /create-courier/ must return awb_number in response data."""
        api_client = APIClient()
        api_client.force_authenticate(user=self.admin)

        # Seed a shipment record at ready_for_pickup
        shipment = Shipment.objects.create(
            order=self.order,
            provider="shiprocket",
            packing_status=PackingStatus.READY_FOR_PICKUP,
            shipment_status=ShipmentStatus.NOT_CREATED,
        )

        # The mock must persist AWB to DB because the view calls shipment.refresh_from_db()
        def mock_create(order, package_info, created_by=None, existing_shipment=None):
            s = existing_shipment or shipment
            s.awb_number = "AWB_API_RESPONSE"
            s.courier_name = "Blue Dart"
            s.shipment_status = ShipmentStatus.CREATED
            s.provider = "shiprocket"
            s.save()
            return s

        mock_instance = MagicMock()
        mock_instance.create_shipment.side_effect = mock_create
        MockSvc.return_value = mock_instance

        resp = api_client.post(
            f"/api/v1/shipping/admin/shipments/{shipment.id}/create-courier/",
            data={"weight": 1.0, "length": 10.0, "breadth": 10.0, "height": 10.0},
            format="json",
        )

        self.assertIn(resp.status_code, [200, 201])
        data = resp.json()
        self.assertTrue(data.get("success"))
        # Response data must include awb_number so the frontend can display it immediately
        self.assertEqual(data["data"]["awb_number"], "AWB_API_RESPONSE")
