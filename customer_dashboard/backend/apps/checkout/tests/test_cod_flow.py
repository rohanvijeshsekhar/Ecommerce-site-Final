"""
FAAZO – Cash on Delivery (COD) Integration & Regression Test Suite

Validates:
1. COD fee calculation (percentage, minimum floor, maximum ceiling, based on selling price not MRP).
2. Checkout preview with COD payment method.
3. Checkout preview with Razorpay (returns estimated_cod_fee for UI, cod_fee=0).
4. Direct COD order creation via /api/v1/checkout/place/ with zero Razorpay calls.
5. Immutable COD fee and collectable amount snapshots on Order record.
6. Inventory reservation and cart clearing on COD order placement.
7. Duplicate submission protection (idempotency).
8. Shiprocket forward shipment COD payload and collectable amount matching total payable.
9. OrderSerializer payment status for COD orders ("pending_cod", not paid).
"""

from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.test import override_settings
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
from apps.cart.models import Cart, CartItem
from apps.orders.models import Order, OrderStatus
from apps.orders.serializers import OrderSerializer
from apps.checkout.cod import calculate_cod_fee, check_cod_eligibility
from apps.shipping.providers import ShiprocketProvider


class CashOnDeliveryTestSuite(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="dr.dentist.cod@faazo.com",
            full_name="Dr. Dentist COD",
            password="StrongPassword123!",
            role=UserRole.CUSTOMER,
        )
        self.dealer_app = DealerApplication.objects.create(
            user=self.user,
            company_name="Dentist COD Clinic",
            status=DealerStatus.APPROVED,
        )

        cat, _ = Category.objects.get_or_create(name="Handpieces", slug="handpieces")
        brand, _ = Brand.objects.get_or_create(name="NSK", slug="nsk")

        self.product = Product.objects.create(
            name="NSK Pana-Max High Speed",
            slug="nsk-pana-max-cod-test",
            category=cat,
            brand=brand,
            sku="SKU-COD-001",
        )
        ProductPricing.objects.create(
            product=self.product,
            mrp=Decimal("20000.00"),
            selling_price=Decimal("18000.00"),
            gst_percentage=Decimal("18.00"),
        )
        self.inventory, _ = ProductInventory.objects.get_or_create(
            product=self.product,
            defaults={"current_stock": 10, "reserved_stock": 0}
        )
        self.inventory.current_stock = 10
        self.inventory.reserved_stock = 0
        self.inventory.save()

        self.address = Address.objects.create(
            user=self.user,
            full_name="Dr. Dentist COD",
            mobile="9876543210",
            line1="102 Medical Arcade",
            line2="Linking Road, Bandra",
            city="Mumbai",
            state="Maharashtra",
            pincode="400050",
            is_default=True,
        )

        self.cart = Cart.objects.create(user=self.user)
        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=1,
        )

        self.client.force_authenticate(user=self.user)

    # 1. COD Fee Unit Tests
    def test_cod_fee_percentage_calculation(self):
        """Verify COD fee is 2% of final selling price when above minimum."""
        with override_settings(
            COD_ENABLED=True,
            COD_FEE_TYPE="percentage",
            COD_PERCENTAGE=Decimal("0.02"),
            COD_MINIMUM_FEE=Decimal("49.00"),
            COD_MAXIMUM_FEE=Decimal("500.00"),
        ):
            # Selling price ₹18,000 * 2% = ₹360 (exceeds min ₹49)
            fee = calculate_cod_fee(Decimal("18000.00"))
            self.assertEqual(fee, Decimal("360.00"))

    def test_cod_fee_minimum_floor_enforcement(self):
        """Verify COD fee respects configured minimum fee floor."""
        with override_settings(
            COD_ENABLED=True,
            COD_FEE_TYPE="percentage",
            COD_PERCENTAGE=Decimal("0.02"),
            COD_MINIMUM_FEE=Decimal("49.00"),
            COD_MAXIMUM_FEE=Decimal("500.00"),
        ):
            # Selling price ₹1,000 * 2% = ₹20 -> should enforce min fee ₹49
            fee = calculate_cod_fee(Decimal("1000.00"))
            self.assertEqual(fee, Decimal("49.00"))

    def test_cod_fee_maximum_cap(self):
        """Verify COD fee is capped at maximum fee if configured."""
        with override_settings(
            COD_ENABLED=True,
            COD_FEE_TYPE="percentage",
            COD_PERCENTAGE=Decimal("0.05"),
            COD_MINIMUM_FEE=Decimal("49.00"),
            COD_MAXIMUM_FEE=Decimal("199.00"),
        ):
            # ₹18,000 * 5% = ₹900 -> capped at ₹199
            fee = calculate_cod_fee(Decimal("18000.00"))
            self.assertEqual(fee, Decimal("199.00"))

    def test_cod_fee_calculated_on_selling_price_not_mrp(self):
        """Verify COD fee is calculated strictly on Selling Price (₹18,000), NOT MRP (₹20,000)."""
        with override_settings(
            COD_ENABLED=True,
            COD_FEE_TYPE="percentage",
            COD_PERCENTAGE=Decimal("0.02"),
            COD_MINIMUM_FEE=Decimal("49.00"),
            COD_MAXIMUM_FEE=Decimal("1000.00"),
        ):
            fee = calculate_cod_fee(Decimal("18000.00"))
            self.assertEqual(fee, Decimal("360.00"))
            # If it were wrongly based on MRP ₹20,000, it would be ₹400
            self.assertNotEqual(fee, Decimal("400.00"))

    # 2. Checkout Preview Tests
    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_checkout_preview_with_cod(self, mock_pincode):
        mock_pincode.return_value = {"is_serviceable": True, "destination_pincode": "400050"}
        url = reverse("checkout-preview")
        with override_settings(
            COD_ENABLED=True,
            COD_FEE_TYPE="percentage",
            COD_PERCENTAGE=Decimal("0.02"),
            COD_MINIMUM_FEE=Decimal("49.00"),
            COD_MAXIMUM_FEE=Decimal("500.00"),
        ):
            res = self.client.post(url, {
                "address_id": str(self.address.id),
                "delivery_method": "standard",
                "payment_method": "cod",
            }, format="json")

            self.assertEqual(res.status_code, status.HTTP_200_OK)
            data = res.data["data"]
            self.assertEqual(data["selling_subtotal"], 18000.0)
            self.assertEqual(data["cod_fee"], 360.0)
            self.assertEqual(data["total_amount"], 18360.0)
            self.assertEqual(data["cod_collectable_amount"], 18360.0)
            self.assertTrue(data["cod_eligible"])
            # Savings (20,000 - 18,000 = 2,000) must NOT be reduced by COD fee
            self.assertEqual(data["savings"], 2000.0)

    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_checkout_preview_with_razorpay(self, mock_pincode):
        mock_pincode.return_value = {"is_serviceable": True, "destination_pincode": "400050"}
        url = reverse("checkout-preview")
        with override_settings(
            COD_ENABLED=True,
            COD_FEE_TYPE="percentage",
            COD_PERCENTAGE=Decimal("0.02"),
            COD_MINIMUM_FEE=Decimal("49.00"),
            COD_MAXIMUM_FEE=Decimal("500.00"),
        ):
            res = self.client.post(url, {
                "address_id": str(self.address.id),
                "delivery_method": "standard",
                "payment_method": "razorpay",
            }, format="json")

            self.assertEqual(res.status_code, status.HTTP_200_OK)
            data = res.data["data"]
            self.assertEqual(data["cod_fee"], 0.0)
            self.assertEqual(data["total_amount"], 18000.0)
            # Must return estimated_cod_fee for frontend UI badge display
            self.assertEqual(data["estimated_cod_fee"], 360.0)

    # 3. Direct COD Order Creation (0 Razorpay calls)
    @patch("apps.orders.tasks.dispatch_order_success_notification")
    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_checkout_place_cod_order_bypasses_razorpay(self, mock_pincode, mock_notify):
        mock_pincode.return_value = {"is_serviceable": True, "destination_pincode": "400050"}
        url = reverse("checkout-place")

        initial_reserved = self.inventory.reserved_stock

        with patch("apps.payments.services.create_razorpay_order") as mock_rz_create:
            with override_settings(
                COD_ENABLED=True,
                COD_FEE_TYPE="percentage",
                COD_PERCENTAGE=Decimal("0.02"),
                COD_MINIMUM_FEE=Decimal("49.00"),
                COD_MAXIMUM_FEE=Decimal("500.00"),
            ):
                res = self.client.post(url, {
                    "address_id": str(self.address.id),
                    "delivery_method": "standard",
                    "payment_method": "cod",
                }, format="json")

                # CRITICAL: Verify Razorpay was NOT called at all
                self.assertEqual(mock_rz_create.call_count, 0)

                self.assertEqual(res.status_code, status.HTTP_200_OK)
                order_data = res.data["data"]

                order = Order.objects.get(pk=order_data["id"])
                self.assertEqual(order.payment_method, "cod")
                self.assertEqual(order.cod_fee, Decimal("360.00"))
                self.assertEqual(order.cod_collectable_amount, Decimal("18360.00"))
                self.assertEqual(order.total_amount, Decimal("18360.00"))

                # Inventory reservation check
                self.inventory.refresh_from_db()
                self.assertEqual(self.inventory.reserved_stock, 1)
                self.assertEqual(self.inventory.available_stock, 9)

                # Cart cleared check
                self.assertEqual(self.cart.items.count(), 0)

                # Serializer payment status check
                serializer = OrderSerializer(order)
                self.assertEqual(serializer.data["payment_status"], "pending_cod")
                self.assertEqual(serializer.data["cod_fee"], "360.00")
                self.assertEqual(serializer.data["cod_collectable_amount"], "18360.00")

    # 4. Duplicate Order Submission (Idempotency)
    @patch("apps.orders.tasks.dispatch_order_success_notification")
    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_duplicate_cod_order_prevention(self, mock_pincode, mock_notify):
        mock_pincode.return_value = {"is_serviceable": True, "destination_pincode": "400050"}
        url = reverse("checkout-place")

        with override_settings(
            COD_ENABLED=True,
            COD_MINIMUM_FEE=Decimal("49.00"),
        ):
            # First submit
            res1 = self.client.post(url, {
                "address_id": str(self.address.id),
                "delivery_method": "standard",
                "payment_method": "cod",
            }, format="json")
            self.assertEqual(res1.status_code, status.HTTP_200_OK)
            order_id = res1.data["data"]["id"]

            # Second submit immediately (simulating rapid double-click)
            res2 = self.client.post(url, {
                "address_id": str(self.address.id),
                "delivery_method": "standard",
                "payment_method": "cod",
            }, format="json")

            # Must return HTTP 200 with the existing order, NOT create another order
            self.assertEqual(res2.status_code, status.HTTP_200_OK)
            self.assertEqual(res2.data["data"]["id"], order_id)
            self.assertEqual(Order.objects.filter(user=self.user, payment_method="cod").count(), 1)

    # 5. Shiprocket Forward Shipment Payload Test
    @patch("apps.shipping.shiprocket_client.ShiprocketAPIClient.create_order")
    def test_shiprocket_cod_payload_and_collectable_amount(self, mock_sr_create):
        mock_sr_create.return_value = (
            {"order_id": 99999, "shipment_id": 88888, "status": "NEW", "awb_code": "SR-AWB-COD-123", "courier_name": "Delhivery"},
            200,
            150.0
        )

        order = Order.objects.create(
            user=self.user,
            shipping_address=self.address,
            shipping_full_name=self.address.full_name,
            shipping_mobile=self.address.mobile,
            shipping_line1=self.address.line1,
            shipping_city=self.address.city,
            shipping_state=self.address.state,
            shipping_pincode=self.address.pincode,
            status=OrderStatus.PROCESSING,
            payment_method="cod",
            mrp_subtotal=Decimal("20000.00"),
            selling_subtotal=Decimal("18000.00"),
            taxable_subtotal=Decimal("15254.24"),
            gst_amount=Decimal("2745.76"),
            shipping_fee=Decimal("0.00"),
            cod_fee=Decimal("360.00"),
            cod_collectable_amount=Decimal("18360.00"),
            total_amount=Decimal("18360.00"),
            order_number="FAAZO-COD-001",
        )

        provider = ShiprocketProvider()
        pkg = {"weight": 1.0, "length": 10, "breadth": 10, "height": 10}
        provider.create_shipment(order=order, package_info=pkg)

        # Inspect the order_payload sent to client.create_order
        self.assertTrue(mock_sr_create.called)
        sent_payload = mock_sr_create.call_args[0][0]

        # Verify Shiprocket payload fields
        self.assertEqual(sent_payload["payment_method"], "COD")
        self.assertEqual(sent_payload["sub_total"], 18360.0)
        self.assertEqual(sent_payload["billing_pincode"], "400050")
