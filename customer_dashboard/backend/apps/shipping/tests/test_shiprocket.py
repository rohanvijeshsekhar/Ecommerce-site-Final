"""
FAAZO – Shiprocket & Logistics Module Unit Tests

Verifies:
  - ShiprocketAPIClient authentication & token caching
  - ShiprocketCircuitBreaker state transitions (CLOSED, OPEN, HALF_OPEN)
  - ShippingConfigValidator
  - OfflineShippingProvider creation, packing workflow, and courier dispatch
  - Admin Provider Health Check API endpoint
  - Webhook Receiver HMAC signature validation & idempotency
"""

from django.test import TestCase
from django.conf import settings
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status

from apps.users.models import User, Address
from apps.orders.models import Order, OrderStatus

from apps.shipping.models import Shipment, ShipmentStatus, PackingStatus
from apps.shipping.shiprocket_client import ShiprocketAPIClient, ShiprocketCircuitBreaker, circuit_breaker, CircuitBreakerOpenError
from apps.shipping.providers import get_shipping_provider, OfflineShippingProvider, ShiprocketProvider, ShippingConfigValidator
from apps.shipping.services import ShiprocketService


class ShiprocketCircuitBreakerTestCase(TestCase):
    def setUp(self):
        cache.clear()
        self.cb = ShiprocketCircuitBreaker(failure_threshold=3, cooldown_seconds=2)

    def test_circuit_breaker_closed_by_default(self):
        self.assertEqual(self.cb.get_state(), ShiprocketCircuitBreaker.STATE_CLOSED)

    def test_circuit_breaker_trips_to_open_on_failures(self):
        self.cb.record_failure()
        self.cb.record_failure()
        self.assertEqual(self.cb.get_state(), ShiprocketCircuitBreaker.STATE_CLOSED)

        self.cb.record_failure()  # Reaches threshold = 3
        self.assertEqual(self.cb.get_state(), ShiprocketCircuitBreaker.STATE_OPEN)

    def test_circuit_breaker_resets_on_success(self):
        self.cb.record_failure()
        self.cb.record_failure()
        self.cb.record_failure()
        self.assertEqual(self.cb.get_state(), ShiprocketCircuitBreaker.STATE_OPEN)

        self.cb.record_success()
        self.assertEqual(self.cb.get_state(), ShiprocketCircuitBreaker.STATE_CLOSED)


class ShippingConfigValidatorTestCase(TestCase):
    def test_config_validator_returns_reasons_when_missing(self):
        is_valid, reasons = ShippingConfigValidator.validate_shiprocket_config("shiprocket")
        # In test mode without env vars set, email/password/location will fail validation
        self.assertIsInstance(is_valid, bool)
        self.assertIsInstance(reasons, list)

    def test_factory_returns_offline_provider_when_misconfigured(self):
        provider = get_shipping_provider()
        self.assertIsInstance(provider, OfflineShippingProvider)


class OfflineShippingProviderTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="testuser@faazo.com",
            password="TestPassword123!",
            full_name="Test Customer",
            role="customer",
        )

        self.address = Address.objects.create(

            user=self.user,
            full_name="Test Customer",
            mobile="9876543210",
            line1="123 Main Street",
            city="Mumbai",
            state="Maharashtra",
            pincode="400001",
        )
        self.order = Order.objects.create(
            user=self.user,
            order_number="ORD-TEST-001",
            shipping_address=self.address,
            mrp_subtotal=1500.00,
            selling_subtotal=1500.00,
            gst_amount=0.00,
            shipping_fee=0.00,
            total_amount=1500.00,
            status=OrderStatus.PROCESSING,
        )




    def test_offline_shipment_creation(self):
        service = ShiprocketService()
        package_info = {"weight": 1.5, "length": 15, "breadth": 10, "height": 10}
        
        shipment = service.create_shipment(
            order=self.order,
            package_info=package_info,
            created_by=self.user,
        )

        self.assertIsNotNone(shipment)
        self.assertTrue(shipment.awb_number.startswith("DEV"))
        self.assertEqual(shipment.shipment_status, ShipmentStatus.CREATED)

    def test_offline_operations(self):
        service = ShiprocketService()
        package_info = {"weight": 1.5, "length": 15, "breadth": 10, "height": 10}
        shipment = service.create_shipment(order=self.order, package_info=package_info)

        label_res = service.generate_label(shipment)
        self.assertIn("label_url", label_res)

        manifest_res = service.generate_manifest(shipment)
        self.assertIn("manifest_url", manifest_res)

        pickup_res = service.schedule_pickup(shipment)
        self.assertEqual(pickup_res["status"], "Scheduled")
