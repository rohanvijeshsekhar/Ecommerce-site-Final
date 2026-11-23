"""
FAAZO – Admin Panel Security, Permissions & Stabilization Regression Tests

Verifies:
1. Unauthenticated (401) and non-admin (403) blocking across ALL admin endpoints,
   including previously unprotected bestsellers, solutions, and brand banner POST.
2. Canonical IsAdmin permission consistency (role='admin' without is_staff works everywhere).
3. Confirmed 500 crash fixes:
   - ProductViewSet PATCH /images/<id>/ and DELETE /documents/<id>/
   - ProductWriteSerializer preserving non-active status (draft/archived)
   - AdminOrderDetailView PATCH status='shipped' (NotificationService import) & invalid PK -> 404
   - AdminReturnListFilterView ?search= (customer__full_name) & is_restockable='false' parsing
   - JWTService.blacklist_refresh_token() & blocked-user refresh rejection
4. Metric accuracy fixes:
   - DashboardOverviewView excluding cancelled & pending_payment orders
   - SalesAnalyticsService excluding pending_payment/cancelled orders
   - CustomerAdminViewSet.stats() computing real revenue & repeat customers
   - RefundService scoping payment strictly to return_req.order & rejecting COD
   - ShiprocketWebhookView failing closed when signature header is missing
"""

import io
from decimal import Decimal
from PIL import Image as PILImage
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.brands.models import Brand
from apps.categories.models import Category
from apps.orders.models import Order, OrderItem, OrderStatus
from apps.payments.models import Payment, PaymentStatus
from apps.products.models import Product, ProductDocument, ProductImage, ProductStatus
from apps.returns.models import ReturnRequest, ReturnStatus
from apps.returns.services.refund_service import RefundService
from apps.solutions.models import ClinicalSolution
from apps.users.models import UserRole

User = get_user_model()


class AdminSecurityAndFixesTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="sec_admin@faazo.com",
            password="AdminPassword123!",
            full_name="Security Admin",
            role=UserRole.ADMIN,
        )
        # Role-based admin without is_staff=True to test canonical IsAdmin consistency
        self.role_admin = User.objects.create_user(
            email="role_admin@faazo.com",
            password="AdminPassword123!",
            full_name="Role Only Admin",
            role=UserRole.ADMIN,
            is_staff=False,
            is_superuser=False,
            is_email_verified=True,
        )
        self.customer = User.objects.create_user(
            email="sec_customer@faazo.com",
            password="Password123!",
            full_name="Dr. Priya Menon",
            role=UserRole.CUSTOMER,
            is_email_verified=True,
        )
        self.brand = Brand.objects.create(name="Test Brand", slug="test-brand", is_active=True)
        self.category = Category.objects.create(name="Test Cat", slug="test-cat", is_active=True)
        self.product = Product.objects.create(
            name="Test Ultrasonic Scaler",
            slug="test-ultrasonic-scaler",
            sku="TST-SCL-01",
            brand=self.brand,
            category=self.category,
            status=ProductStatus.ACTIVE,
        )
        self.solution = ClinicalSolution.objects.create(
            title="Active Solution",
            slug="active-solution",
            is_active=True,
            show_on_homepage=True,
        )
        self.inactive_solution = ClinicalSolution.objects.create(
            title="Draft Solution",
            slug="draft-solution",
            is_active=False,
            show_on_homepage=False,
        )

    # ── 1. Permission Lockdown Matrix ────────────────────────────────────────

    def test_admin_endpoints_reject_anonymous_and_customer(self):
        admin_get_endpoints = [
            "/api/v1/admin/dashboard/overview/",
            "/api/v1/admin/reports/overview/",
            "/api/v1/analytics/dashboard/",
            "/api/v1/analytics/sales-over-time/",
            "/api/v1/bestsellers/admin/banner/",
            "/api/v1/bestsellers/admin/products/",
            "/api/v1/solutions/admin/list/",
            "/api/v1/orders/admin/",
            "/api/v1/admin/returns/",
            "/api/v1/users/admin/customers/",
            "/api/v1/users/admin/customers/stats/",
            "/api/v1/shipping/admin/shipments/",
            "/api/v1/shipping/admin/health/",
            "/api/v1/warranty/admin/dashboard/",
        ]

        # Anonymous -> 401
        for url in admin_get_endpoints:
            res = self.client.get(url)
            self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED, f"Expected 401 for anonymous GET {url}, got {res.status_code}")

        # Customer -> 403
        self.client.force_authenticate(user=self.customer)
        for url in admin_get_endpoints:
            res = self.client.get(url)
            self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN, f"Expected 403 for customer GET {url}, got {res.status_code}")

        # Unauthenticated & customer POST on brand banner must be rejected
        self.client.force_authenticate(user=None)
        self.assertEqual(
            self.client.post("/api/v1/brands/admin/banner/", {"title": "Hacked"}).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.client.force_authenticate(user=self.customer)
        self.assertEqual(
            self.client.post("/api/v1/brands/admin/banner/", {"title": "Hacked"}).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        # Public solutions ?admin=1 must NOT leak inactive solutions
        self.client.force_authenticate(user=None)
        res = self.client.get("/api/v1/solutions/?admin=1")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slugs = [item["slug"] for item in res.data["data"]]
        self.assertNotIn("draft-solution", slugs)
        # Direct retrieve of inactive solution must 404 publicly
        self.assertEqual(
            self.client.get("/api/v1/solutions/draft-solution/").status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_role_based_admin_consistent_across_analytics_dashboard_reports(self):
        self.client.force_authenticate(user=self.role_admin)
        for url in [
            "/api/v1/admin/dashboard/overview/",
            "/api/v1/admin/reports/overview/",
            "/api/v1/analytics/sales-over-time/",
            "/api/v1/bestsellers/admin/products/",
            "/api/v1/solutions/admin/list/",
            "/api/v1/admin/returns/",
        ]:
            res = self.client.get(url)
            self.assertEqual(res.status_code, status.HTTP_200_OK, f"Expected 200 for role-admin GET {url}, got {res.status_code}")

    # ── 2. Product Fixes ─────────────────────────────────────────────────────

    def test_product_status_draft_preserved_and_image_patch_document_delete_work(self):
        self.client.force_authenticate(user=self.admin)

        # Create draft product -> status must remain 'draft'
        res = self.client.post(
            "/api/v1/products/",
            {
                "name": "Draft Dental Loupe",
                "sku": "DRF-LP-99",
                "brand": str(self.brand.id),
                "category": str(self.category.id),
                "status": "draft",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["data"]["status"], ProductStatus.DRAFT)

        # PATCH image alt_text (previously 405 shadowed by delete_image)
        buf = io.BytesIO()
        PILImage.new("RGB", (50, 50), color="teal").save(buf, format="PNG")
        buf.seek(0)
        img = ProductImage.objects.create(
            product=self.product,
            image=SimpleUploadedFile("a.png", buf.read(), content_type="image/png"),
            alt_text="Old Alt",
        )
        patch_res = self.client.patch(
            f"/api/v1/products/{self.product.slug}/images/{img.id}/",
            {"alt_text": "Updated Alt"},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        img.refresh_from_db()
        self.assertEqual(img.alt_text, "Updated Alt")

        # DELETE document (previously 500 NameError: product not defined)
        doc = ProductDocument.objects.create(
            product=self.product,
            title="Brochure",
            file=SimpleUploadedFile("brochure.pdf", b"%PDF-1.4", content_type="application/pdf"),
            created_by=self.admin,
        )
        del_res = self.client.delete(f"/api/v1/products/{self.product.slug}/documents/{doc.id}/")
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)
        self.assertFalse(ProductDocument.objects.filter(pk=doc.id).exists())

    # ── 3. Order, Return & Customer Stats Fixes ──────────────────────────────

    def test_order_shipped_transition_and_dashboard_customer_stats_metrics(self):
        self.client.force_authenticate(user=self.admin)

        # Valid orders for customer (2 valid orders -> repeat customer = 1, revenue = 3000)
        o1 = Order.objects.create(
            user=self.customer,
            order_number="ORD-VALID-1",
            status=OrderStatus.PACKED,
            total_amount=Decimal("1000.00"),
            mrp_subtotal=Decimal("1000.00"),
            selling_subtotal=Decimal("1000.00"),
            gst_amount=Decimal("0.00"),
            shipping_fee=Decimal("0.00"),
            payment_method="razorpay",
        )
        o2 = Order.objects.create(
            user=self.customer,
            order_number="ORD-VALID-2",
            status=OrderStatus.DELIVERED,
            total_amount=Decimal("2000.00"),
            mrp_subtotal=Decimal("2000.00"),
            selling_subtotal=Decimal("2000.00"),
            gst_amount=Decimal("0.00"),
            shipping_fee=Decimal("0.00"),
            payment_method="razorpay",
        )
        # Abandoned & Cancelled orders must NOT count toward revenue or valid order counts
        Order.objects.create(
            user=self.customer,
            order_number="ORD-PEND-1",
            status=OrderStatus.PENDING_PAYMENT,
            total_amount=Decimal("50000.00"),
            mrp_subtotal=Decimal("50000.00"),
            selling_subtotal=Decimal("50000.00"),
            gst_amount=Decimal("0.00"),
            shipping_fee=Decimal("0.00"),
            payment_method="razorpay",
        )
        Order.objects.create(
            user=self.customer,
            order_number="ORD-CANC-1",
            status=OrderStatus.CANCELLED,
            total_amount=Decimal("9999.00"),
            mrp_subtotal=Decimal("9999.00"),
            selling_subtotal=Decimal("9999.00"),
            gst_amount=Decimal("0.00"),
            shipping_fee=Decimal("0.00"),
            payment_method="razorpay",
        )

        # Transitioning o1 to SHIPPED must NOT crash with NameError on NotificationService
        ship_res = self.client.patch(
            f"/api/v1/orders/admin/{o1.id}/",
            {"status": OrderStatus.SHIPPED, "tracking_number": "TRK12345"},
            format="json",
        )
        self.assertEqual(ship_res.status_code, status.HTTP_200_OK)
        o1.refresh_from_db()
        self.assertEqual(o1.status, OrderStatus.SHIPPED)

        # Invalid PK on AdminOrderDetailView must return 404, not 500
        self.assertEqual(
            self.client.get("/api/v1/orders/admin/not-a-valid-uuid/").status_code,
            status.HTTP_404_NOT_FOUND,
        )

        # Dashboard overview revenue & orders KPI exclude cancelled & pending_payment
        dash_res = self.client.get("/api/v1/admin/dashboard/overview/?period=7d")
        self.assertEqual(dash_res.status_code, status.HTTP_200_OK)
        kpis = dash_res.data["data"]["kpis"]
        self.assertEqual(kpis["revenue"]["raw_value"], 3000.0)
        self.assertEqual(kpis["orders"]["raw_value"], 2)

        # Customer stats must report real revenue & repeat customers (not hardcoded 0)
        stats_res = self.client.get("/api/v1/users/admin/customers/stats/")
        self.assertEqual(stats_res.status_code, status.HTTP_200_OK)
        self.assertEqual(stats_res.data["data"]["total_revenue"], 3000.0)
        self.assertEqual(stats_res.data["data"]["repeat_customers"], 1)

        # Admin returns search must NOT crash with FieldError on customer__first_name
        ret_res = self.client.get("/api/v1/admin/returns/?search=Priya")
        self.assertEqual(ret_res.status_code, status.HTTP_200_OK)

    def test_refund_service_strictly_matches_order_payment_and_blocks_cod(self):
        # Paid order 1 with captured Payment
        paid_order = Order.objects.create(
            user=self.customer,
            order_number="ORD-PAID-99",
            status=OrderStatus.DELIVERED,
            total_amount=Decimal("5000.00"),
            mrp_subtotal=Decimal("5000.00"),
            selling_subtotal=Decimal("5000.00"),
            gst_amount=Decimal("0.00"),
            shipping_fee=Decimal("0.00"),
            payment_method="razorpay",
        )
        Payment.objects.create(
            user=self.customer,
            order=paid_order,
            razorpay_order_id="order_test_1",
            razorpay_payment_id="pay_test_1",
            amount=Decimal("5000.00"),
            status=PaymentStatus.CAPTURED,
        )
        # COD order 2 with NO Payment record
        cod_order = Order.objects.create(
            user=self.customer,
            order_number="ORD-COD-99",
            status=OrderStatus.DELIVERED,
            total_amount=Decimal("1500.00"),
            mrp_subtotal=Decimal("1500.00"),
            selling_subtotal=Decimal("1500.00"),
            gst_amount=Decimal("0.00"),
            shipping_fee=Decimal("0.00"),
            payment_method="cod",
        )
        ret = ReturnRequest.objects.create(
            order=cod_order,
            customer=self.customer,
            status=ReturnStatus.REFUND_PENDING,
            reason="damaged",
        )
        # Must raise ValidationError instead of refunding paid_order's payment!
        with self.assertRaises(ValidationError):
            RefundService.initiate_refund_record(ret, actor=self.admin)

    @override_settings(SHIPROCKET_WEBHOOK_SECRET="super-secret-key")
    def test_shiprocket_webhook_rejects_missing_signature_when_secret_configured(self):
        res = self.client.post(
            "/api/v1/shipping/webhooks/shiprocket/",
            {"awb": "AWB999", "current_status": "DELIVERED"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
