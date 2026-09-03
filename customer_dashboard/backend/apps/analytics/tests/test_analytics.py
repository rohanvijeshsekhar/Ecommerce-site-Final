import time
from datetime import timedelta
from unittest.mock import MagicMock, patch
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.analytics.services.ga4_service import GA4AnalyticsService
from apps.analytics.services.presence_service import PresenceService
from apps.analytics.services.sales_service import SalesAnalyticsService
from apps.orders.models import Address, Order, OrderStatus
from apps.users.models import UserRole

User = get_user_model()
IST = ZoneInfo("Asia/Kolkata")


class MockRow:
    def __init__(self, dimension_values=None, metric_values=None):
        self.dimension_values = [MagicMock(value=v) for v in (dimension_values or [])]
        self.metric_values = [MagicMock(value=v) for v in (metric_values or [])]


class MockReportResponse:
    def __init__(self, rows=None):
        self.rows = rows or []


class PresenceServiceTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_record_heartbeat_public_storefront(self):
        res = PresenceService.record_heartbeat("visitor_1", path="/products", user_agent="Mozilla/5.0")
        self.assertTrue(res)
        self.assertEqual(PresenceService.get_live_visitor_count(), 1)

    def test_record_heartbeat_admin_excluded(self):
        res_exact = PresenceService.record_heartbeat("admin_1", path="/admin", user_agent="Mozilla/5.0")
        self.assertFalse(res_exact)
        res_sub = PresenceService.record_heartbeat("admin_2", path="/admin/analytics", user_agent="Mozilla/5.0")
        self.assertFalse(res_sub)
        self.assertEqual(PresenceService.get_live_visitor_count(), 0)

    def test_record_heartbeat_bot_excluded(self):
        res = PresenceService.record_heartbeat("bot_1", path="/products", user_agent="Googlebot/2.1")
        self.assertFalse(res)
        self.assertEqual(PresenceService.get_live_visitor_count(), 0)

    def test_duplicate_heartbeats_same_visitor(self):
        PresenceService.record_heartbeat("user_abc", path="/")
        PresenceService.record_heartbeat("user_abc", path="/products")
        PresenceService.record_heartbeat("user_abc", path="/cart")
        self.assertEqual(PresenceService.get_live_visitor_count(), 1)


class SalesAnalyticsServiceTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email="shopper@faazo.com",
            full_name="Shopper",
            password="Password123!",
            role=UserRole.CUSTOMER,
        )
        self.address = Address.objects.create(
            user=self.user,
            full_name="Shopper",
            mobile="9876543210",
            line1="123 Dental St",
            city="Kochi",
            state="Kerala",
            pincode="682001",
        )

    def test_sales_aggregation_excludes_cancelled_orders(self):
        now = timezone.now()

        # Valid COD order
        Order.objects.create(
            user=self.user,
            shipping_address=self.address,
            status=OrderStatus.PROCESSING,
            payment_method="cod",
            mrp_subtotal=1000,
            selling_subtotal=900,
            gst_amount=100,
            total_amount=1000,
            created_at=now,
        )

        # Valid Online Paid order
        Order.objects.create(
            user=self.user,
            shipping_address=self.address,
            status=OrderStatus.DELIVERED,
            payment_method="razorpay",
            mrp_subtotal=2000,
            selling_subtotal=1800,
            gst_amount=200,
            total_amount=2000,
            created_at=now,
        )

        # Cancelled order (must NOT be counted)
        Order.objects.create(
            user=self.user,
            shipping_address=self.address,
            status=OrderStatus.CANCELLED,
            payment_method="upi",
            mrp_subtotal=5000,
            selling_subtotal=4500,
            gst_amount=500,
            total_amount=5000,
            created_at=now,
        )

        res = SalesAnalyticsService.get_sales_over_time("today")
        self.assertEqual(res["total_sales"], 3000.0)
        self.assertEqual(res["total_orders"], 2)
        self.assertEqual(res["cod_orders"], 1)
        self.assertEqual(res["paid_orders"], 1)
        self.assertEqual(len(res["series"]), 24)

    def test_zero_sales_and_division_safety(self):
        res = SalesAnalyticsService.get_sales_over_time("7d")
        self.assertEqual(res["total_sales"], 0.0)
        self.assertEqual(res["total_orders"], 0)
        self.assertIsNone(res["pct_sales_change"])
        self.assertFalse(res["is_new_activity"])
        self.assertEqual(len(res["series"]), 7)


class GA4AnalyticsAPIViewTests(TestCase):

    def setUp(self):
        cache.clear()
        self.client = APIClient()

        self.customer = User.objects.create_user(
            email="customer@faazo.com",
            full_name="Customer User",
            password="Password123!",
            role=UserRole.CUSTOMER,
        )

        self.admin = User.objects.create_superuser(
            email="admin@faazo.com",
            full_name="Admin User",
            password="AdminPassword123!",
            role=UserRole.ADMIN,
        )

    def test_unauthenticated_user_denied(self):
        url = reverse("analytics-dashboard")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_admin_user_denied(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse("analytics-dashboard")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_public_heartbeat_endpoint(self):
        url = reverse("analytics-heartbeat")
        response = self.client.post(url, {"visitor_id": "test_vis_99", "path": "/products"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["success"])

    @patch.object(GA4AnalyticsService, "is_configured", return_value=False)
    def test_admin_access_analytics_dashboard(self, mock_configured):
        self.client.force_authenticate(user=self.admin)
        url = reverse("analytics-dashboard")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("configured", data)
        self.assertIn("overview", data)
        self.assertIn("realtime", data)
        self.assertIn("live_storefront_visitors", data)
        self.assertIn("sales_over_time", data)
        self.assertIn("faazo_db_metrics", data)

    def test_admin_access_live_visitors_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("analytics-live-visitors")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("live_visitors", data["data"])

    def test_admin_access_sales_over_time_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("analytics-sales-over-time") + "?period=7d"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("series", data["data"])
        self.assertIn("total_sales", data["data"])

    def test_analytics_export_csv_view(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("analytics-export-csv") + "?period=7d"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")
        self.assertIn("FAAZO Sales Analytics Report", response.content.decode("utf-8"))
