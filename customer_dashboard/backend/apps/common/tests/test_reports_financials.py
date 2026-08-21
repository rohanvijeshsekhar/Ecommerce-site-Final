"""
FAAZO – Financial Accuracy & Business Intelligence Reports Unit Test Suite

Tests Decimal financial calculations:
- Gross Sales (Sum of Order.total_amount for valid orders)
- Successful Refund Deduction (RefundStatus.SUCCESS)
- Pending / Failed / Rejected refund non-deduction
- Net Sales (Gross Sales - Refunds)
- GST-Inclusive Tax Decomposition (Taxable Subtotal + Total GST Amount)
- Multiple products with distinct GST rates (5%, 12%, 18%)
- CGST + SGST vs IGST order items
- Historical OrderItem without tax snapshot handling
- Valid order count vs total attempts
- AOV correctness (excluding cancelled / pending orders)
- API endpoint integration (/api/v1/admin/reports/overview/)
"""

from decimal import Decimal
from datetime import timedelta
from django.db import transaction
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.orders.models import Order, OrderItem, OrderStatus
from apps.products.models import Product
from apps.brands.models import Brand
from apps.pricing.models import ProductPricing
from apps.categories.models import Category
from apps.users.models import Address
from apps.returns.models import ReturnRequest, ReturnStatus, ReturnReason, ReturnRequestType, Refund, RefundStatus
from apps.payments.models import Payment, PaymentStatus
from apps.common.reports_services import ReportsAnalyticsService

User = get_user_model()


class ReportsFinancialAccuracyTestCase(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.admin = User.objects.create_superuser(
            email="admin_reports_test@faazo.com",
            password="Password123!",
            full_name="Admin User",
            role="admin"
        )
        self.customer = User.objects.create_user(
            email="customer_reports_test@faazo.com",
            password="Password123!",
            full_name="Customer User",
            role="customer"
        )
        self.address = Address.objects.create(
            user=self.customer,
            full_name="Customer User",
            mobile="9876543210",
            line1="123 Dental Clinic Road",
            city="Kochi",
            state="Kerala",
            pincode="682001"
        )
        self.category = Category.objects.create(name="Dental Tools", slug="dental-tools")
        self.brand = Brand.objects.create(name="FAAZO Brand", slug="faazo-brand")

        # Product 1: 18% GST
        self.prod_18 = Product.objects.create(
            name="Handpiece 18%",
            sku="SKU-HP-18",
            category=self.category,
            brand=self.brand,
        )
        ProductPricing.objects.update_or_create(
            product=self.prod_18,
            defaults={
                'mrp': Decimal("1500.00"),
                'selling_price': Decimal("1180.00"),
                'gst_percentage': Decimal("18.00")
            }
        )

        # Product 2: 12% GST
        self.prod_12 = Product.objects.create(
            name="Curing Light 12%",
            sku="SKU-CL-12",
            category=self.category,
            brand=self.brand,
        )
        ProductPricing.objects.update_or_create(
            product=self.prod_12,
            defaults={
                'mrp': Decimal("1500.00"),
                'selling_price': Decimal("1120.00"),
                'gst_percentage': Decimal("12.00")
            }
        )

    def get_date_info(self):
        return ReportsAnalyticsService.parse_period("30d")

    def create_test_order(self, status, total_amount, mrp_subtotal=None, selling_subtotal=None, gst_amount=None):
        amount = Decimal(str(total_amount))
        mrp = Decimal(str(mrp_subtotal)) if mrp_subtotal is not None else amount
        selling = Decimal(str(selling_subtotal)) if selling_subtotal is not None else amount
        gst = Decimal(str(gst_amount)) if gst_amount is not None else (amount - (amount / Decimal("1.18"))).quantize(Decimal("0.01"))
        taxable = selling - gst
        return Order.objects.create(
            user=self.customer,
            shipping_address=self.address,
            status=status,
            total_amount=amount,
            mrp_subtotal=mrp,
            selling_subtotal=selling,
            taxable_subtotal=taxable,
            gst_amount=gst,
            shipping_fee=Decimal("0.00")
        )

    def test_1_gross_sales_calculation(self):
        """Verify Gross Sales sums Order.total_amount for valid orders (PROCESSING, PACKED, SHIPPED, DELIVERED)."""
        self.create_test_order(OrderStatus.DELIVERED, "1180.00")
        self.create_test_order(OrderStatus.SHIPPED, "2360.00")

        date_info = self.get_date_info()
        fin = ReportsAnalyticsService._compute_period_financials(
            date_info['start_date'], date_info['end_date']
        )
        self.assertEqual(fin['gross_sales'], Decimal("3540.00"))
        self.assertEqual(fin['valid_orders_count'], 2)

    def test_2_successful_refund_deduction(self):
        """Verify successful refunds (RefundStatus.SUCCESS) are deducted from Net Sales."""
        order = self.create_test_order(OrderStatus.DELIVERED, "5000.00")
        payment = Payment.objects.create(
            order=order,
            user=self.customer,
            payment_method="razorpay",
            amount=Decimal("5000.00"),
            status=PaymentStatus.CAPTURED
        )
        ret_req = ReturnRequest.objects.create(
            order=order,
            customer=self.customer,
            reason=ReturnReason.DEFECTIVE,
            request_type=ReturnRequestType.RETURN_REFUND,
            status=ReturnStatus.REFUNDED
        )
        Refund.objects.create(
            return_request=ret_req,
            payment=payment,
            razorpay_refund_id="rfnd_test_succ_001",
            amount=Decimal("1180.00"),
            status=RefundStatus.SUCCESS,
            idempotency_key="idem_test_succ_001"
        )

        date_info = self.get_date_info()
        fin = ReportsAnalyticsService._compute_period_financials(
            date_info['start_date'], date_info['end_date']
        )
        self.assertEqual(fin['gross_sales'], Decimal("5000.00"))
        self.assertEqual(fin['refunds'], Decimal("1180.00"))
        self.assertEqual(fin['net_sales'], Decimal("3820.00"))

    def test_3_pending_refund_not_deducted(self):
        """Verify pending refunds (RefundStatus.PENDING) are NOT deducted from Net Sales."""
        order = self.create_test_order(OrderStatus.DELIVERED, "5000.00")
        payment = Payment.objects.create(
            order=order,
            user=self.customer,
            payment_method="razorpay",
            amount=Decimal("5000.00"),
            status=PaymentStatus.CAPTURED
        )
        ret_req = ReturnRequest.objects.create(
            order=order,
            customer=self.customer,
            reason=ReturnReason.DEFECTIVE,
            request_type=ReturnRequestType.RETURN_REFUND,
            status=ReturnStatus.REQUESTED
        )
        Refund.objects.create(
            return_request=ret_req,
            payment=payment,
            razorpay_refund_id="rfnd_test_pend_002",
            amount=Decimal("1180.00"),
            status=RefundStatus.PENDING,
            idempotency_key="idem_test_pend_002"
        )

        date_info = self.get_date_info()
        fin = ReportsAnalyticsService._compute_period_financials(
            date_info['start_date'], date_info['end_date']
        )
        self.assertEqual(fin['gross_sales'], Decimal("5000.00"))
        self.assertEqual(fin['refunds'], Decimal("0.00"))
        self.assertEqual(fin['net_sales'], Decimal("5000.00"))

    def test_4_failed_refund_not_deducted(self):
        """Verify failed refunds (RefundStatus.FAILED) are NOT deducted from Net Sales."""
        order = self.create_test_order(OrderStatus.DELIVERED, "3000.00")
        payment = Payment.objects.create(
            order=order,
            user=self.customer,
            payment_method="razorpay",
            amount=Decimal("3000.00"),
            status=PaymentStatus.CAPTURED
        )
        ret_req = ReturnRequest.objects.create(
            order=order,
            customer=self.customer,
            reason=ReturnReason.DEFECTIVE,
            request_type=ReturnRequestType.RETURN_REFUND,
            status=ReturnStatus.REJECTED
        )
        Refund.objects.create(
            return_request=ret_req,
            payment=payment,
            razorpay_refund_id="rfnd_test_fail_003",
            amount=Decimal("3000.00"),
            status=RefundStatus.FAILED,
            idempotency_key="idem_test_fail_003"
        )

        date_info = self.get_date_info()
        fin = ReportsAnalyticsService._compute_period_financials(
            date_info['start_date'], date_info['end_date']
        )
        self.assertEqual(fin['refunds'], Decimal("0.00"))
        self.assertEqual(fin['net_sales'], Decimal("3000.00"))

    def test_5_multiple_refunds(self):
        """Verify multiple successful refunds in period are correctly aggregated."""
        order1 = self.create_test_order(OrderStatus.DELIVERED, "5000.00")
        payment1 = Payment.objects.create(order=order1, user=self.customer, amount=Decimal("5000.00"), status=PaymentStatus.CAPTURED, idempotency_key="pay_m_1", razorpay_order_id="order_rzp_m_1")
        req1 = ReturnRequest.objects.create(order=order1, customer=self.customer, reason=ReturnReason.DAMAGED, request_type=ReturnRequestType.RETURN_REFUND, status=ReturnStatus.REFUNDED)
        Refund.objects.create(return_request=req1, payment=payment1, amount=Decimal("1000.00"), status=RefundStatus.SUCCESS, idempotency_key="ref_m_1")

        order2 = self.create_test_order(OrderStatus.DELIVERED, "4000.00")
        payment2 = Payment.objects.create(order=order2, user=self.customer, amount=Decimal("4000.00"), status=PaymentStatus.CAPTURED, idempotency_key="pay_m_2", razorpay_order_id="order_rzp_m_2")
        req2 = ReturnRequest.objects.create(order=order2, customer=self.customer, reason=ReturnReason.WRONG_ITEM, request_type=ReturnRequestType.RETURN_REFUND, status=ReturnStatus.REFUNDED)
        Refund.objects.create(return_request=req2, payment=payment2, amount=Decimal("500.00"), status=RefundStatus.SUCCESS, idempotency_key="ref_m_2")

        date_info = self.get_date_info()
        fin = ReportsAnalyticsService._compute_period_financials(
            date_info['start_date'], date_info['end_date']
        )
        self.assertEqual(fin['gross_sales'], Decimal("9000.00"))
        self.assertEqual(fin['refunds'], Decimal("1500.00"))
        self.assertEqual(fin['net_sales'], Decimal("7500.00"))

    def test_6_duplicate_refund_protection(self):
        """Verify Refund model 1-to-1 return_request & unique idempotency_key prevents double refund counting."""
        order = self.create_test_order(OrderStatus.DELIVERED, "2000.00")
        payment = Payment.objects.create(order=order, user=self.customer, amount=Decimal("2000.00"), status=PaymentStatus.CAPTURED, idempotency_key="pay_uniq_1")
        req = ReturnRequest.objects.create(order=order, customer=self.customer, reason=ReturnReason.DEFECTIVE, status=ReturnStatus.REFUNDED)
        
        Refund.objects.create(return_request=req, payment=payment, amount=Decimal("500.00"), status=RefundStatus.SUCCESS, idempotency_key="ref_uniq_1")
        
        # Verify 1-to-1 constraint enforcement
        with transaction.atomic(), self.assertRaises(Exception):
            Refund.objects.create(return_request=req, payment=payment, amount=Decimal("500.00"), status=RefundStatus.SUCCESS, idempotency_key="ref_uniq_2")

        date_info = self.get_date_info()
        fin = ReportsAnalyticsService._compute_period_financials(
            date_info['start_date'], date_info['end_date']
        )
        self.assertEqual(fin['refunds'], Decimal("500.00"))

    def test_7_date_range_filtering(self):
        """Verify refunds and orders outside selected date range are excluded."""
        now = timezone.now()
        past_start = now - timedelta(days=60)

        # Order & Refund in the past (outside 30d window)
        old_order = self.create_test_order(OrderStatus.DELIVERED, "8000.00")
        old_order.created_at = past_start
        old_order.save()

        old_pay = Payment.objects.create(order=old_order, user=self.customer, amount=Decimal("8000.00"), status=PaymentStatus.CAPTURED)
        old_req = ReturnRequest.objects.create(order=old_order, customer=self.customer, reason=ReturnReason.DEFECTIVE, status=ReturnStatus.REFUNDED)
        old_ref = Refund.objects.create(return_request=old_req, payment=old_pay, amount=Decimal("2000.00"), status=RefundStatus.SUCCESS, idempotency_key="ref_old_01")
        old_ref.created_at = past_start
        old_ref.save()

        date_info = self.get_date_info()
        fin = ReportsAnalyticsService._compute_period_financials(
            date_info['start_date'], date_info['end_date']
        )
        self.assertEqual(fin['gross_sales'], Decimal("0.00"))
        self.assertEqual(fin['refunds'], Decimal("0.00"))

    def test_8_net_sales_calculation(self):
        """Verify Net Sales = Gross Sales - Refunds."""
        order = self.create_test_order(OrderStatus.DELIVERED, "10000.00")
        payment = Payment.objects.create(order=order, user=self.customer, amount=Decimal("10000.00"), status=PaymentStatus.CAPTURED)
        req = ReturnRequest.objects.create(order=order, customer=self.customer, reason=ReturnReason.DEFECTIVE, status=ReturnStatus.REFUNDED)
        Refund.objects.create(return_request=req, payment=payment, amount=Decimal("1180.00"), status=RefundStatus.SUCCESS, idempotency_key="ref_net_01")

        date_info = self.get_date_info()
        fin = ReportsAnalyticsService._compute_period_financials(
            date_info['start_date'], date_info['end_date']
        )
        self.assertEqual(fin['gross_sales'], Decimal("10000.00"))
        self.assertEqual(fin['refunds'], Decimal("1180.00"))
        self.assertEqual(fin['net_sales'], Decimal("8820.00"))

    def test_9_gst_inclusive_1180_example(self):
        """Verify GST-inclusive ₹1,180 example: Taxable = ₹1,000, GST = ₹180, Gross = ₹1,180."""
        order = self.create_test_order(OrderStatus.DELIVERED, "1180.00")
        OrderItem.objects.create(
            order=order,
            product=self.prod_18,
            quantity=1,
            price=Decimal("1180.00"),
            gst_rate=Decimal("18.00"),
            taxable_value_per_unit=Decimal("1000.00"),
            taxable_subtotal=Decimal("1000.00"),
            cgst_amount=Decimal("90.00"),
            sgst_amount=Decimal("90.00"),
            igst_amount=Decimal("0.00"),
            total_gst_amount=Decimal("180.00")
        )

        date_info = self.get_date_info()
        fin = ReportsAnalyticsService._compute_period_financials(
            date_info['start_date'], date_info['end_date']
        )
        self.assertEqual(fin['gross_sales'], Decimal("1180.00"))
        self.assertEqual(fin['taxable_sales'], Decimal("1000.00"))
        self.assertEqual(fin['gst_included'], Decimal("180.00"))
        self.assertEqual(fin['taxable_sales'] + fin['gst_included'], Decimal("1180.00"))

    def test_10_multiple_products_different_gst_rates(self):
        """Verify multiple products with different GST rates (18% and 12%) aggregate correctly."""
        order = self.create_test_order(OrderStatus.DELIVERED, "2300.00")
        # Item 1: 18% GST (Gross = 1180, Taxable = 1000, GST = 180)
        OrderItem.objects.create(
            order=order, product=self.prod_18, quantity=1, price=Decimal("1180.00"),
            gst_rate=Decimal("18.00"), taxable_subtotal=Decimal("1000.00"), total_gst_amount=Decimal("180.00")
        )
        # Item 2: 12% GST (Gross = 1120, Taxable = 1000, GST = 120)
        OrderItem.objects.create(
            order=order, product=self.prod_12, quantity=1, price=Decimal("1120.00"),
            gst_rate=Decimal("12.00"), taxable_subtotal=Decimal("1000.00"), total_gst_amount=Decimal("120.00")
        )

        date_info = self.get_date_info()
        fin = ReportsAnalyticsService._compute_period_financials(
            date_info['start_date'], date_info['end_date']
        )
        self.assertEqual(fin['gross_sales'], Decimal("2300.00"))
        self.assertEqual(fin['taxable_sales'], Decimal("2000.00"))
        self.assertEqual(fin['gst_included'], Decimal("300.00"))

    def test_11_cgst_sgst_intra_state(self):
        """Verify intra-state orders with CGST + SGST equal total_gst_amount."""
        order = self.create_test_order(OrderStatus.DELIVERED, "1180.00")
        item = OrderItem.objects.create(
            order=order, product=self.prod_18, quantity=1, price=Decimal("1180.00"),
            gst_rate=Decimal("18.00"), taxable_subtotal=Decimal("1000.00"),
            cgst_amount=Decimal("90.00"), sgst_amount=Decimal("90.00"), igst_amount=Decimal("0.00"),
            total_gst_amount=Decimal("180.00")
        )
        self.assertEqual(item.cgst_amount + item.sgst_amount, item.total_gst_amount)

    def test_12_igst_inter_state(self):
        """Verify inter-state orders with IGST equal total_gst_amount."""
        order = self.create_test_order(OrderStatus.DELIVERED, "1180.00")
        item = OrderItem.objects.create(
            order=order, product=self.prod_18, quantity=1, price=Decimal("1180.00"),
            gst_rate=Decimal("18.00"), taxable_subtotal=Decimal("1000.00"),
            cgst_amount=Decimal("0.00"), sgst_amount=Decimal("0.00"), igst_amount=Decimal("180.00"),
            total_gst_amount=Decimal("180.00")
        )
        self.assertEqual(item.igst_amount, item.total_gst_amount)

    def test_13_historical_order_item_without_tax_snapshot(self):
        """Verify historical OrderItem without tax snapshot (taxable_subtotal=None) uses fallback calculation safely."""
        order = self.create_test_order(OrderStatus.DELIVERED, "1180.00")
        # Legacy item: taxable_subtotal and total_gst_amount are None
        OrderItem.objects.create(
            order=order, product=self.prod_18, quantity=1, price=Decimal("1180.00"),
            gst_rate=None, taxable_subtotal=None, total_gst_amount=None
        )

        date_info = self.get_date_info()
        fin = ReportsAnalyticsService._compute_period_financials(
            date_info['start_date'], date_info['end_date']
        )
        self.assertEqual(fin['gross_sales'], Decimal("1180.00"))
        self.assertEqual(fin['taxable_sales'], Decimal("1000.00"))
        self.assertEqual(fin['gst_included'], Decimal("180.00"))

    def test_14_valid_order_count(self):
        """Verify valid order count only counts PROCESSING, PACKED, SHIPPED, DELIVERED."""
        self.create_test_order(OrderStatus.PROCESSING, "100.00")
        self.create_test_order(OrderStatus.PACKED, "100.00")
        self.create_test_order(OrderStatus.SHIPPED, "100.00")
        self.create_test_order(OrderStatus.DELIVERED, "100.00")
        self.create_test_order(OrderStatus.PENDING_PAYMENT, "100.00")
        self.create_test_order(OrderStatus.CANCELLED, "100.00")

        date_info = self.get_date_info()
        fin = ReportsAnalyticsService._compute_period_financials(
            date_info['start_date'], date_info['end_date']
        )
        self.assertEqual(fin['valid_orders_count'], 4)

    def test_15_total_order_attempts(self):
        """Verify total order attempts includes all created orders."""
        self.create_test_order(OrderStatus.DELIVERED, "100.00")
        self.create_test_order(OrderStatus.CANCELLED, "100.00")
        self.create_test_order(OrderStatus.PENDING_PAYMENT, "100.00")

        date_info = self.get_date_info()
        kpis = ReportsAnalyticsService.get_executive_kpis(date_info)
        self.assertEqual(kpis['orders']['value'], 1)  # Valid orders
        self.assertEqual(kpis['orders']['total_attempts'], 3)
        self.assertEqual(kpis['orders']['other_attempts'], 2)

    def test_16_aov_remains_correct(self):
        """Verify AOV = Gross Sales / Valid Orders Count (excluding cancelled/pending)."""
        self.create_test_order(OrderStatus.DELIVERED, "2000.00")
        self.create_test_order(OrderStatus.SHIPPED, "4000.00")
        self.create_test_order(OrderStatus.CANCELLED, "9999.00")

        date_info = self.get_date_info()
        kpis = ReportsAnalyticsService.get_executive_kpis(date_info)
        self.assertEqual(kpis['aov']['value'], 3000.0)  # (2000 + 4000) / 2

    def test_17_csv_financials_in_payload(self):
        """Verify financials structure is exposed in executive KPIs payload."""
        self.create_test_order(OrderStatus.DELIVERED, "1180.00")
        date_info = self.get_date_info()
        kpis = ReportsAnalyticsService.get_executive_kpis(date_info)
        
        self.assertIn('financials', kpis)
        fin = kpis['financials']
        self.assertEqual(fin['gross_sales'], 1180.0)
        self.assertEqual(fin['refunds'], 0.0)
        self.assertEqual(fin['net_sales'], 1180.0)

    def test_18_existing_overview_api_endpoint(self):
        """Verify /api/v1/admin/reports/overview/ returns 200 OK with financials payload."""
        self.api_client.force_authenticate(user=self.admin)
        response = self.api_client.get('/api/v1/admin/reports/overview/?period=30d')
        self.assertEqual(response.status_code, 200)
        res_data = response.json()
        self.assertTrue(res_data['success'])
        self.assertIn('kpis', res_data['data'])
        self.assertIn('financials', res_data['data']['kpis'])
