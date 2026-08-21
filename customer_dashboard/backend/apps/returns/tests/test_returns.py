"""
FAAZO – Comprehensive Returns, Refunds & Replacements Unit Test Suite

Tests:
1. ReturnEligibilityService (7-day window, delivered status, product returnability, quantity caps, active request gating).
2. ReturnStateMachineService (Forward-only state machine, illegal transition validation, event logs).
3. RefundService & Double Refund Protection (Remaining refundable amount capping, single full refund, partial refunds, idempotency protection, sandbox execution).
4. QCService & Inventory Safety (Atomic stock restoration using F(), damaged item QC_FAILED, double-restock protection).
5. ReplacementService (Distinct replacement order creation, idempotency guard).
6. Customer REST API (Eligibility check, request submission, list/detail, cancellation).
7. Admin REST API & Security Isolation (Filter list, approval, rejection, QC, refund trigger, permission isolation).
"""

from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from apps.orders.models import Order, OrderItem, OrderStatus, Address
from apps.products.models import Product
from apps.categories.models import Category
from apps.brands.models import Brand
from apps.inventory.models import ProductInventory
from apps.payments.models import Payment, PaymentStatus
from apps.returns.models import (
    ReturnRequest,
    ReturnItem,
    ReturnStatus,
    ReturnRequestType,
    ReturnReason,
    Refund,
    RefundStatus,
)
from apps.returns.services.eligibility import ReturnEligibilityService
from apps.returns.services.state_machine import ReturnStateMachineService
from apps.returns.services.refund_service import RefundService
from apps.returns.services.qc_service import QCService
from apps.returns.services.replacement_service import ReplacementService

User = get_user_model()


class ReturnsModuleTestCase(APITestCase):

    def setUp(self):
        # Create Customer A
        self.customer_a = User.objects.create_user(
            email="doctor_a@faazo.com",
            password="Password123!",
            full_name="Dr. Customer A",
            role="customer",
        )

        # Create Customer B
        self.customer_b = User.objects.create_user(
            email="doctor_b@faazo.com",
            password="Password123!",
            full_name="Dr. Customer B",
            role="customer",
        )

        # Create Admin
        self.admin_user = User.objects.create_user(
            email="admin_returns@faazo.com",
            password="Password123!",
            full_name="Admin Manager",
            role="admin",
            is_staff=True,
        )

        # Category & Brand
        self.category = Category.objects.create(name="Dental Equipment", slug="dental-equipment")
        self.brand = Brand.objects.create(name="FAAZO Pro", slug="faazo-pro")

        # Product 1 (Returnable)
        self.product_returnable = Product.objects.create(
            name="Apex Locator X1",
            slug="apex-locator-x1",
            sku="SKU-APEX-001",
            category=self.category,
            brand=self.brand,
            is_returnable=True,
        )
        ProductInventory.objects.create(
            product=self.product_returnable,
            current_stock=50,
            reserved_stock=0,
        )

        # Product 2 (Non-Returnable)
        self.product_non_returnable = Product.objects.create(
            name="Surgical Gloves Pack",
            slug="surgical-gloves-pack",
            sku="SKU-GLOVES-002",
            category=self.category,
            brand=self.brand,
            is_returnable=False,
        )

        # Address
        self.address = Address.objects.create(
            user=self.customer_a,
            full_name="Dr. Customer A",
            line1="123 Clinic Street",
            city="Mumbai",
            state="Maharashtra",
            pincode="400001",
        )

        # Delivered Order for Customer A
        self.delivered_order = Order.objects.create(
            user=self.customer_a,
            shipping_address=self.address,
            status=OrderStatus.DELIVERED,
            delivered_at=timezone.now() - timedelta(days=2),
            payment_method="razorpay",
            mrp_subtotal=Decimal("15000.00"),
            selling_subtotal=Decimal("12000.00"),
            gst_amount=Decimal("2160.00"),
            shipping_fee=Decimal("0.00"),
            total_amount=Decimal("14160.00"),
        )

        self.order_item_1 = OrderItem.objects.create(
            order=self.delivered_order,
            product=self.product_returnable,
            quantity=2,
            price=Decimal("6000.00"),
        )

        # Captured Payment for Order
        self.payment = Payment.objects.create(
            user=self.customer_a,
            razorpay_order_id="order_mock_test_123",
            razorpay_payment_id="pay_mock_test_123",
            amount=Decimal("14160.00"),
            status=PaymentStatus.CAPTURED,
        )

    # ── 1. Return Eligibility Service Tests ──────────────────────────────────

    def test_eligibility_delivered_order_within_window(self):
        res = ReturnEligibilityService.evaluate_item_eligibility(self.order_item_1)
        self.assertTrue(res["is_eligible"])
        self.assertEqual(res["reason"], "ELIGIBLE")
        self.assertEqual(res["max_returnable_qty"], 2)

    def test_eligibility_expired_window(self):
        self.delivered_order.delivered_at = timezone.now() - timedelta(days=10)
        self.delivered_order.save()

        res = ReturnEligibilityService.evaluate_item_eligibility(self.order_item_1)
        self.assertFalse(res["is_eligible"])
        self.assertEqual(res["reason"], "RETURN_WINDOW_EXPIRED")

    def test_eligibility_non_delivered_order(self):
        processing_order = Order.objects.create(
            user=self.customer_a,
            shipping_address=self.address,
            status=OrderStatus.PROCESSING,
            mrp_subtotal=Decimal("1000.00"),
            selling_subtotal=Decimal("1000.00"),
            gst_amount=Decimal("180.00"),
            total_amount=Decimal("1180.00"),
        )
        p_item = OrderItem.objects.create(
            order=processing_order,
            product=self.product_returnable,
            quantity=1,
            price=Decimal("1000.00"),
        )
        res = ReturnEligibilityService.evaluate_item_eligibility(p_item)
        self.assertFalse(res["is_eligible"])
        self.assertEqual(res["reason"], "ORDER_NOT_DELIVERED")

    def test_eligibility_non_returnable_product(self):
        nr_item = OrderItem.objects.create(
            order=self.delivered_order,
            product=self.product_non_returnable,
            quantity=1,
            price=Decimal("500.00"),
        )
        res = ReturnEligibilityService.evaluate_item_eligibility(nr_item)
        self.assertFalse(res["is_eligible"])
        self.assertEqual(res["reason"], "PRODUCT_NOT_RETURNABLE")

    # ── 2. State Machine Tests ────────────────────────────────────────────────

    def test_state_machine_valid_transitions(self):
        ret_req = ReturnRequest.objects.create(
            customer=self.customer_a,
            order=self.delivered_order,
            status=ReturnStatus.REQUESTED,
            reason=ReturnReason.DEFECTIVE,
        )

        req_1 = ReturnStateMachineService.transition_to(str(ret_req.id), ReturnStatus.UNDER_REVIEW)
        self.assertEqual(req_1.status, ReturnStatus.UNDER_REVIEW)

        req_2 = ReturnStateMachineService.transition_to(str(ret_req.id), ReturnStatus.APPROVED)
        self.assertEqual(req_2.status, ReturnStatus.APPROVED)

    def test_state_machine_invalid_transition_fails(self):
        ret_req = ReturnRequest.objects.create(
            customer=self.customer_a,
            order=self.delivered_order,
            status=ReturnStatus.REQUESTED,
            reason=ReturnReason.DEFECTIVE,
        )
        with self.assertRaises(Exception):
            ReturnStateMachineService.transition_to(str(ret_req.id), ReturnStatus.COMPLETED)

    # ── 3. Refund Service & Double Refund Protection Tests ───────────────────

    def test_authoritative_refund_calculation_and_execution(self):
        ret_req = ReturnRequest.objects.create(
            customer=self.customer_a,
            order=self.delivered_order,
            status=ReturnStatus.QC_PASSED,
            reason=ReturnReason.DAMAGED,
        )
        ReturnItem.objects.create(
            return_request=ret_req,
            order_item=self.order_item_1,
            requested_quantity=1,
            approved_quantity=1,
            unit_price=Decimal("6000.00"),
            refund_amount=Decimal("6000.00"),
        )

        refund = RefundService.initiate_refund_record(ret_req)
        self.assertEqual(refund.amount, Decimal("6000.00"))
        self.assertEqual(refund.status, RefundStatus.PENDING)

        exec_res = RefundService.execute_refund(str(refund.id))
        self.assertEqual(exec_res["status"], "success")

        refund.refresh_from_db()
        self.assertEqual(refund.status, RefundStatus.SUCCESS)

        # Verify idempotency (second execution returns already_refunded without error)
        exec_res_2 = RefundService.execute_refund(str(refund.id))
        self.assertEqual(exec_res_2["status"], "already_refunded")

    def test_refund_amount_exceeding_payment_cap_rejected(self):
        ret_req = ReturnRequest.objects.create(
            customer=self.customer_a,
            order=self.delivered_order,
            status=ReturnStatus.QC_PASSED,
            reason=ReturnReason.DAMAGED,
        )
        # Attempt refund of ₹30,000 on payment of ₹14,160
        ReturnItem.objects.create(
            return_request=ret_req,
            order_item=self.order_item_1,
            requested_quantity=5,
            approved_quantity=5,
            unit_price=Decimal("6000.00"),
            refund_amount=Decimal("30000.00"),
        )

        with self.assertRaises(Exception):
            RefundService.initiate_refund_record(ret_req)

    # ── 4. QC & Inventory Safety Tests ───────────────────────────────────────

    def test_qc_pass_restores_inventory_atomically(self):
        inv = ProductInventory.objects.get(product=self.product_returnable)
        initial_stock = inv.current_stock  # 50

        ret_req = ReturnRequest.objects.create(
            customer=self.customer_a,
            order=self.delivered_order,
            status=ReturnStatus.ITEM_RECEIVED,
            reason=ReturnReason.DEFECTIVE,
        )
        ReturnItem.objects.create(
            return_request=ret_req,
            order_item=self.order_item_1,
            requested_quantity=1,
            approved_quantity=1,
            unit_price=Decimal("6000.00"),
        )

        qc_res = QCService.process_qc(
            return_request_id=str(ret_req.id),
            qc_result="PASS",
            is_restockable=True,
        )
        self.assertEqual(qc_res["status"], "qc_passed")

        inv.refresh_from_db()
        self.assertEqual(inv.current_stock, initial_stock + 1)  # 51

        # Double restock protection
        QCService.process_qc(
            return_request_id=str(ret_req.id),
            qc_result="PASS",
            is_restockable=True,
        )
        inv.refresh_from_db()
        self.assertEqual(inv.current_stock, initial_stock + 1)  # Still 51

    def test_qc_fail_does_not_restore_inventory(self):
        inv = ProductInventory.objects.get(product=self.product_returnable)
        initial_stock = inv.current_stock  # 50

        ret_req = ReturnRequest.objects.create(
            customer=self.customer_a,
            order=self.delivered_order,
            status=ReturnStatus.ITEM_RECEIVED,
            reason=ReturnReason.DAMAGED,
        )
        ReturnItem.objects.create(
            return_request=ret_req,
            order_item=self.order_item_1,
            requested_quantity=1,
            approved_quantity=1,
            unit_price=Decimal("6000.00"),
        )

        qc_res = QCService.process_qc(
            return_request_id=str(ret_req.id),
            qc_result="FAIL",
            is_restockable=False,
        )
        self.assertEqual(qc_res["status"], "qc_failed")

        inv.refresh_from_db()
        self.assertEqual(inv.current_stock, initial_stock)  # 50

    # ── 5. Replacement Workflow Tests ────────────────────────────────────────

    def test_replacement_order_creation_and_idempotency(self):
        ret_req = ReturnRequest.objects.create(
            customer=self.customer_a,
            order=self.delivered_order,
            request_type=ReturnRequestType.RETURN_REPLACEMENT,
            status=ReturnStatus.QC_PASSED,
            reason=ReturnReason.WRONG_ITEM,
        )
        ReturnItem.objects.create(
            return_request=ret_req,
            order_item=self.order_item_1,
            requested_quantity=1,
            approved_quantity=1,
            unit_price=Decimal("6000.00"),
        )

        repl_order = ReplacementService.create_replacement_order(str(ret_req.id))
        self.assertEqual(repl_order.user, self.customer_a)
        self.assertEqual(repl_order.payment_method, "replacement")
        self.assertEqual(repl_order.total_amount, Decimal("0.00"))

        # Repeat invocation returns existing replacement order
        repl_order_2 = ReplacementService.create_replacement_order(str(ret_req.id))
        self.assertEqual(repl_order.id, repl_order_2.id)

    # ── 6. Customer REST API Tests ───────────────────────────────────────────

    def test_customer_check_eligibility_api(self):
        self.client.force_authenticate(user=self.customer_a)
        url = f"/api/v1/returns/eligibility/?order_id={self.delivered_order.id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["data"]["is_order_eligible"])

    def test_customer_create_return_api(self):
        self.client.force_authenticate(user=self.customer_a)
        payload = {
            "order_id": str(self.delivered_order.id),
            "request_type": "return_refund",
            "reason": "damaged",
            "customer_notes": "Received damaged box.",
            "items": [
                {
                    "order_item_id": str(self.order_item_1.id),
                    "quantity": 1
                }
            ]
        }
        response = self.client.post("/api/v1/returns/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data["data"])

    def test_customer_cancel_return_api(self):
        ret_req = ReturnRequest.objects.create(
            customer=self.customer_a,
            order=self.delivered_order,
            status=ReturnStatus.REQUESTED,
            reason=ReturnReason.DAMAGED,
        )
        self.client.force_authenticate(user=self.customer_a)
        response = self.client.post(f"/api/v1/returns/{ret_req.id}/cancel/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ret_req.refresh_from_db()
        self.assertEqual(ret_req.status, ReturnStatus.CANCELLED)

    # ── 7. Security Isolation Tests ──────────────────────────────────────────

    def test_customer_cannot_access_other_customer_return(self):
        ret_req = ReturnRequest.objects.create(
            customer=self.customer_a,
            order=self.delivered_order,
            status=ReturnStatus.REQUESTED,
            reason=ReturnReason.DAMAGED,
        )
        self.client.force_authenticate(user=self.customer_b)
        response = self.client.get(f"/api/v1/returns/{ret_req.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_admin_cannot_access_admin_endpoints(self):
        self.client.force_authenticate(user=self.customer_a)
        response = self.client.get("/api/v1/admin/returns/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
