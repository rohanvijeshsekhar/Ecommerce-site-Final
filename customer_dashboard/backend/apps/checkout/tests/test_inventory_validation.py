"""
FAAZO – Comprehensive Inventory Validation & Concurrency Test Suite

Tests:
  1. Normal in-stock purchase succeeds.
  2. Zero stock Add-to-Cart rejected.
  3. Zero stock Buy Now rejected.
  4. Zero stock checkout rejected.
  5. Stale cart becomes invalid when stock drops.
  6. Requested quantity exceeds current stock rejected.
  7. COD out-of-stock rejected.
  8. Razorpay payment-order creation out-of-stock rejected.
  9. Razorpay final verification cannot create an out-of-stock order.
  10. Missing inventory record is handled correctly as unavailable.
  11. Concurrent purchase of final unit allows only one success (thread concurrency with locks).
  12. reserved_stock cannot exceed available inventory.
  13. Successful order reserves/deducts stock exactly once.
  14. Cancellation releases reservation exactly once.
  15. Duplicate payment/webhook does not reserve stock twice.
  16. Failed payment does not corrupt inventory.
  17. Existing payment/order tests remain green.
"""

import threading
from decimal import Decimal
from unittest.mock import patch
from django.test import TransactionTestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.brands.models import Brand
from apps.categories.models import Category
from apps.cart.models import Cart, CartItem
from apps.dealer.models import DealerApplication, DealerStatus
from apps.inventory.models import ProductInventory
from apps.pricing.models import ProductPricing
from apps.products.models import Product
from apps.users.models import Address, User, UserRole
from apps.orders.models import Order, OrderStatus
from apps.payments.models import Payment, PaymentStatus
from apps.payments.views import create_order_from_payment
from apps.inventory.services import validate_items_inventory, reserve_items_stock, release_items_stock


class InventoryValidationTestSuite(TransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="dr.dentist.inventory@faazo.com",
            full_name="Dr. Dentist Inventory",
            password="StrongPassword123!",
            role=UserRole.CUSTOMER,
        )
        self.dealer_app = DealerApplication.objects.create(
            user=self.user,
            company_name="Dentist Clinic",
            status=DealerStatus.APPROVED,
        )

        self.user2 = User.objects.create_user(
            email="dr.dentist.two@faazo.com",
            full_name="Dr. Dentist Two",
            password="StrongPassword123!",
            role=UserRole.CUSTOMER,
        )
        DealerApplication.objects.create(
            user=self.user2,
            company_name="Dentist Clinic Two",
            status=DealerStatus.APPROVED,
        )

        self.cat = Category.objects.get_or_create(name="Instruments", slug="instruments")[0]
        self.brand = Brand.objects.get_or_create(name="FAAZO Pro", slug="faazo-pro")[0]

        # In-stock product
        self.in_stock_product = Product.objects.create(
            name="Scaler Tip In-Stock",
            slug="scaler-tip-in-stock",
            category=self.cat,
            brand=self.brand,
            sku="SKU-SCALER-01",
            status="published",
        )
        ProductPricing.objects.create(
            product=self.in_stock_product,
            mrp=Decimal("5000.00"),
            selling_price=Decimal("4000.00"),
            dealer_price=Decimal("3500.00"),
            gst_percentage=Decimal("18.00"),
        )
        self.in_stock_inv = ProductInventory.objects.create(
            product=self.in_stock_product,
            current_stock=10,
            reserved_stock=0,
            allow_backorders=False,
        )

        # Zero-stock product
        self.out_of_stock_product = Product.objects.create(
            name="Turbine Handpiece Zero-Stock",
            slug="turbine-handpiece-zero-stock",
            category=self.cat,
            brand=self.brand,
            sku="SKU-TURBINE-00",
            status="published",
        )
        ProductPricing.objects.create(
            product=self.out_of_stock_product,
            mrp=Decimal("12000.00"),
            selling_price=Decimal("9500.00"),
            dealer_price=Decimal("8500.00"),
            gst_percentage=Decimal("18.00"),
        )
        self.out_of_stock_inv = ProductInventory.objects.create(
            product=self.out_of_stock_product,
            current_stock=0,
            reserved_stock=0,
            allow_backorders=False,
        )

        # Product without ProductInventory record
        self.missing_inv_product = Product.objects.create(
            name="Missing Inventory Product",
            slug="missing-inv-product",
            category=self.cat,
            brand=self.brand,
            sku="SKU-MISSING-00",
            status="published",
        )
        ProductPricing.objects.create(
            product=self.missing_inv_product,
            mrp=Decimal("2000.00"),
            selling_price=Decimal("1500.00"),
            dealer_price=Decimal("1200.00"),
            gst_percentage=Decimal("18.00"),
        )

        self.address = Address.objects.create(
            user=self.user,
            full_name="Dr. Dentist",
            mobile="9876543210",
            line1="101 Medical Plaza, MG Road",
            city="Mumbai",
            state="Maharashtra",
            pincode="400001",
        )

        self.address2 = Address.objects.create(
            user=self.user2,
            full_name="Dr. Dentist Two",
            mobile="9876543211",
            line1="102 Medical Plaza, MG Road",
            city="Mumbai",
            state="Maharashtra",
            pincode="400001",
        )

        self.client.force_authenticate(user=self.user)

    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_01_normal_in_stock_purchase_succeeds(self, mock_srv):
        mock_srv.return_value = {"is_serviceable": True}
        url = reverse("checkout-place")
        payload = {
            "address_id": str(self.address.id),
            "delivery_method": "standard",
            "payment_method": "cod",
            "items": [{"product_id": str(self.in_stock_product.id), "quantity": 2}],
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.in_stock_inv.refresh_from_db()
        self.assertEqual(self.in_stock_inv.reserved_stock, 2)
        self.assertEqual(self.in_stock_inv.available_stock, 8)

    def test_02_zero_stock_add_to_cart_rejected(self):
        url = reverse("cart-add")
        payload = {
            "product_id": str(self.out_of_stock_product.id),
            "quantity": 1,
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("INSUFFICIENT_STOCK", str(res.json()))

    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_03_zero_stock_buy_now_rejected(self, mock_srv):
        mock_srv.return_value = {"is_serviceable": True}
        url = reverse("checkout-place")
        payload = {
            "address_id": str(self.address.id),
            "delivery_method": "standard",
            "payment_method": "cod",
            "items": [{"product_id": str(self.out_of_stock_product.id), "quantity": 1}],
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.json().get("error", {}).get("code"), "INSUFFICIENT_STOCK")

    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_04_zero_stock_checkout_preview_rejected(self, mock_srv):
        mock_srv.return_value = {"is_serviceable": True}
        url = reverse("checkout-preview")
        payload = {
            "address_id": str(self.address.id),
            "delivery_method": "standard",
            "items": [{"product_id": str(self.out_of_stock_product.id), "quantity": 1}],
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.json().get("error", {}).get("code"), "INSUFFICIENT_STOCK")

    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_05_stale_cart_becomes_invalid_when_stock_drops(self, mock_srv):
        mock_srv.return_value = {"is_serviceable": True}
        # Customer added 3 units when stock was 10
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, product=self.in_stock_product, quantity=3)

        # Later, stock drops to 0
        self.in_stock_inv.current_stock = 0
        self.in_stock_inv.save()

        # Customer visits cart view
        cart_res = self.client.get(reverse("cart-detail"))
        self.assertEqual(cart_res.status_code, status.HTTP_200_OK)
        cart_data = cart_res.json()["data"]
        self.assertFalse(cart_data["is_checkout_allowed"])
        self.assertTrue(len(cart_data["stock_warnings"]) > 0)

        # Customer attempts to place order anyway
        checkout_res = self.client.post(
            reverse("checkout-place"),
            {"address_id": str(self.address.id), "delivery_method": "standard", "payment_method": "cod"},
            format="json"
        )
        self.assertEqual(checkout_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(checkout_res.json().get("error", {}).get("code"), "INSUFFICIENT_STOCK")

    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_06_requested_quantity_exceeds_current_stock_rejected(self, mock_srv):
        mock_srv.return_value = {"is_serviceable": True}
        # Stock is 10, customer requests 15
        url = reverse("checkout-place")
        payload = {
            "address_id": str(self.address.id),
            "delivery_method": "standard",
            "payment_method": "cod",
            "items": [{"product_id": str(self.in_stock_product.id), "quantity": 15}],
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.json().get("error", {}).get("code"), "INSUFFICIENT_STOCK")

    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_07_cod_out_of_stock_rejected(self, mock_srv):
        mock_srv.return_value = {"is_serviceable": True}
        url = reverse("checkout-place")
        payload = {
            "address_id": str(self.address.id),
            "delivery_method": "standard",
            "payment_method": "cod",
            "items": [{"product_id": str(self.out_of_stock_product.id), "quantity": 1}],
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.json().get("error", {}).get("code"), "INSUFFICIENT_STOCK")

    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_08_razorpay_payment_order_creation_out_of_stock_rejected(self, mock_srv):
        mock_srv.return_value = {"is_serviceable": True}
        url = reverse("payment-create-order")
        payload = {
            "address_id": str(self.address.id),
            "delivery_method": "standard",
            "payment_method": "razorpay",
            "items": [{"product_id": str(self.out_of_stock_product.id), "quantity": 1}],
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.json().get("error", {}).get("code"), "INSUFFICIENT_STOCK")

    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_09_razorpay_final_verification_cannot_create_out_of_stock_order(self, mock_srv):
        mock_srv.return_value = {"is_serviceable": True}
        # Simulate payment record created while stock was 1
        self.in_stock_inv.current_stock = 1
        self.in_stock_inv.save()

        payment = Payment.objects.create(
            user=self.user,
            razorpay_order_id="order_test_razorpay_999",
            amount=Decimal("3500.00"),
            currency="INR",
            status=PaymentStatus.CREATED,
            payment_method="razorpay",
            idempotency_key="test_idemp_key_09",
            checkout_data={
                "address_id": str(self.address.id),
                "delivery_method": "standard",
                "payment_method": "razorpay",
                "items": [{"product_id": str(self.in_stock_product.id), "quantity": 1}],
                "pricing": {
                    "mrp_subtotal": 5000.0,
                    "selling_subtotal": 3500.0,
                    "taxable_subtotal": 2966.1,
                    "gst_amount": 533.9,
                    "shipping_fee": 0.0,
                    "total_amount": 3500.0,
                },
            },
            gateway_response={"amount": 350000},
        )

        # In the interim before verification, stock dropped to 0 (purchased by someone else)
        self.in_stock_inv.current_stock = 0
        self.in_stock_inv.save()

        # Call create_order_from_payment
        with self.assertRaises(ValueError):
            create_order_from_payment(
                payment=payment,
                razorpay_payment_id="pay_test_999",
                razorpay_signature="sig_test_999",
            )

        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.FAILED)
        self.assertEqual(payment.error_code, "INSUFFICIENT_STOCK_REFUND_REQUIRED")
        self.assertIsNone(payment.order)
        self.assertEqual(Order.objects.count(), 0)

    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_10_missing_inventory_record_handled_correctly(self, mock_srv):
        mock_srv.return_value = {"is_serviceable": True}
        url = reverse("checkout-place")
        payload = {
            "address_id": str(self.address.id),
            "delivery_method": "standard",
            "payment_method": "cod",
            "items": [{"product_id": str(self.missing_inv_product.id), "quantity": 1}],
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.json().get("error", {}).get("code"), "INSUFFICIENT_STOCK")

    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_11_concurrent_purchase_of_final_unit_allows_only_one_success(self, mock_srv):
        mock_srv.return_value = {"is_serviceable": True}
        # Product with only 1 remaining unit
        single_prod = Product.objects.create(
            name="Rare Dental Handpiece",
            slug="rare-dental-handpiece",
            category=self.cat,
            brand=self.brand,
            sku="SKU-RARE-01",
            status="published",
        )
        ProductPricing.objects.create(
            product=single_prod,
            mrp=Decimal("50000.00"),
            selling_price=Decimal("45000.00"),
            dealer_price=Decimal("40000.00"),
            gst_percentage=Decimal("18.00"),
        )
        ProductInventory.objects.create(
            product=single_prod,
            current_stock=1,
            reserved_stock=0,
            allow_backorders=False,
        )

        results = []

        def buyer1_action():
            c = APIClient()
            c.force_authenticate(user=self.user)
            res = c.post(
                reverse("checkout-place"),
                {
                    "address_id": str(self.address.id),
                    "delivery_method": "standard",
                    "payment_method": "cod",
                    "items": [{"product_id": str(single_prod.id), "quantity": 1}],
                },
                format="json"
            )
            results.append(res.status_code)

        def buyer2_action():
            c = APIClient()
            c.force_authenticate(user=self.user2)
            res = c.post(
                reverse("checkout-place"),
                {
                    "address_id": str(self.address2.id),
                    "delivery_method": "standard",
                    "payment_method": "cod",
                    "items": [{"product_id": str(single_prod.id), "quantity": 1}],
                },
                format="json"
            )
            results.append(res.status_code)

        t1 = threading.Thread(target=buyer1_action)
        t2 = threading.Thread(target=buyer2_action)

        t1.start()
        t2.start()
        t1.join()
        t2.join()

        # Exactly one must succeed (200) and one must be rejected (400)
        self.assertEqual(sorted(results), [200, 400])

        inv = ProductInventory.objects.get(product=single_prod)
        self.assertEqual(inv.reserved_stock, 1)
        self.assertEqual(inv.available_stock, 0)
        self.assertFalse(inv.is_purchasable)

    def test_12_reserved_stock_cannot_exceed_available_inventory(self):
        # Service level check
        self.in_stock_inv.current_stock = 5
        self.in_stock_inv.reserved_stock = 4
        self.in_stock_inv.save()

        # Request 2 units (available = 1)
        valid, err, _ = validate_items_inventory(
            [{"product": self.in_stock_product, "quantity": 2}],
            lock=False
        )
        self.assertFalse(valid)
        self.assertEqual(err["code"], "INSUFFICIENT_STOCK")

    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_13_successful_order_reserves_stock_exactly_once(self, mock_srv):
        mock_srv.return_value = {"is_serviceable": True}
        initial_reserved = self.in_stock_inv.reserved_stock
        res = self.client.post(
            reverse("checkout-place"),
            {
                "address_id": str(self.address.id),
                "delivery_method": "standard",
                "payment_method": "cod",
                "items": [{"product_id": str(self.in_stock_product.id), "quantity": 3}],
            },
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.in_stock_inv.refresh_from_db()
        self.assertEqual(self.in_stock_inv.reserved_stock, initial_reserved + 3)

    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_14_cancellation_releases_reservation_exactly_once(self, mock_srv):
        mock_srv.return_value = {"is_serviceable": True}
        res = self.client.post(
            reverse("checkout-place"),
            {
                "address_id": str(self.address.id),
                "delivery_method": "standard",
                "payment_method": "cod",
                "items": [{"product_id": str(self.in_stock_product.id), "quantity": 3}],
            },
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order_id = res.json()["data"]["id"]
        self.in_stock_inv.refresh_from_db()
        self.assertEqual(self.in_stock_inv.reserved_stock, 3)

        # Cancel order
        cancel_url = reverse("order-cancel", kwargs={"pk": order_id})
        cancel_res = self.client.post(cancel_url, {"reason": "Customer requested cancellation."}, format="json")
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)

        self.in_stock_inv.refresh_from_db()
        self.assertEqual(self.in_stock_inv.reserved_stock, 0)
        self.assertEqual(self.in_stock_inv.available_stock, 10)

    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_15_duplicate_payment_verification_does_not_reserve_stock_twice(self, mock_srv):
        mock_srv.return_value = {"is_serviceable": True}
        payment = Payment.objects.create(
            user=self.user,
            razorpay_order_id="order_test_razorpay_dup",
            amount=Decimal("3500.00"),
            currency="INR",
            status=PaymentStatus.CREATED,
            payment_method="razorpay",
            idempotency_key="test_idemp_key_dup",
            checkout_data={
                "address_id": str(self.address.id),
                "delivery_method": "standard",
                "payment_method": "razorpay",
                "items": [{"product_id": str(self.in_stock_product.id), "quantity": 2}],
                "pricing": {
                    "mrp_subtotal": 5000.0,
                    "selling_subtotal": 3500.0,
                    "taxable_subtotal": 2966.1,
                    "gst_amount": 533.9,
                    "shipping_fee": 0.0,
                    "total_amount": 3500.0,
                },
            },
            gateway_response={"amount": 350000},
        )

        # First verification
        order1 = create_order_from_payment(
            payment=payment,
            razorpay_payment_id="pay_test_dup",
            razorpay_signature="sig_test_dup",
        )
        self.assertIsNotNone(order1)
        self.in_stock_inv.refresh_from_db()
        self.assertEqual(self.in_stock_inv.reserved_stock, 2)

        # Duplicate call with same payment
        order2 = create_order_from_payment(
            payment=payment,
            razorpay_payment_id="pay_test_dup",
            razorpay_signature="sig_test_dup",
        )
        self.assertEqual(order1.id, order2.id)
        self.in_stock_inv.refresh_from_db()
        # Reserved stock MUST remain 2, not 4
        self.assertEqual(self.in_stock_inv.reserved_stock, 2)

    @patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check")
    def test_16_failed_payment_does_not_corrupt_inventory(self, mock_srv):
        mock_srv.return_value = {"is_serviceable": True}
        initial_reserved = self.in_stock_inv.reserved_stock

        url = reverse("payment-verify")
        res = self.client.post(url, {
            "payment_id": "non-existent-payment-id",
            "razorpay_order_id": "order_invalid",
            "razorpay_payment_id": "pay_invalid",
            "razorpay_signature": "sig_invalid",
        }, format="json")

        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.in_stock_inv.refresh_from_db()
        self.assertEqual(self.in_stock_inv.reserved_stock, initial_reserved)
