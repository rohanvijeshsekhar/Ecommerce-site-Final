"""
FAAZO – Google Analytics 4 Backend Unit Tests

Tests:
1. Unconfigured state when GA4 credentials are missing.
2. Analytics service methods with mocked Google Analytics Data API.
3. REST API endpoints authentication & response structure.
4. Previous period comparison calculation.
5. Real CSV export view.
"""

from unittest.mock import MagicMock, patch
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.analytics.services.ga4_service import GA4AnalyticsService
from apps.users.models import UserRole

User = get_user_model()


class MockMetricValue:
    def __init__(self, value):
        self.value = value


class MockDimensionValue:
    def __init__(self, value):
        self.value = value


class MockRow:
    def __init__(self, dimension_values, metric_values):
        self.dimension_values = [MockDimensionValue(v) for v in dimension_values]
        self.metric_values = [MockMetricValue(v) for v in metric_values]


class MockReportResponse:
    def __init__(self, rows=None):
        self.rows = rows or []


class GA4AnalyticsServiceTests(TestCase):

    def setUp(self):
        cache.clear()
        self.service = GA4AnalyticsService(property_id="546256915")

    def test_unconfigured_credentials_returns_graceful_fallback(self):
        with patch.object(self.service, "is_configured", return_value=False):
            res = self.service.get_overview(period="7d")
            self.assertFalse(res["configured"])
            self.assertIn("message", res)
            self.assertEqual(res["metrics"]["total_users"], 0)

            realtime = self.service.get_realtime()
            self.assertFalse(realtime["configured"])
            self.assertEqual(realtime["active_users"], 0)

    @patch.object(GA4AnalyticsService, "is_configured", return_value=True)
    @patch.object(GA4AnalyticsService, "_get_client")
    def test_get_overview_success_with_comparison(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        # Mock current (6 values) and previous (6 values) = 12 metric values
        # [totalUsers, sessions, engagementRate, screenPageViews, userEngagementDuration, activeUsers]
        mock_client.run_report.return_value = MockReportResponse(
            rows=[MockRow(dimension_values=[], metric_values=[
                "1500", "1800", "0.6", "4500", "9000.0", "1400",
                "1000", "1200", "0.5", "3000", "6000.0", "900"
            ])]
        )

        data = self.service.get_overview(period="7d", compare=True)
        self.assertTrue(data["configured"])
        self.assertEqual(data["metrics"]["total_users"], 1500)
        self.assertEqual(data["metrics"]["prev_total_users"], 1000)
        self.assertEqual(data["metrics"]["pct_total_users"], 50.0)

    @patch.object(GA4AnalyticsService, "is_configured", return_value=True)
    @patch.object(GA4AnalyticsService, "_get_client")
    def test_get_realtime_success(self, mock_get_client, mock_is_configured):
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        mock_client.run_realtime_report.return_value = MockReportResponse(
            rows=[
                MockRow(dimension_values=[], metric_values=["8"]),
            ]
        )

        data = self.service.get_realtime()
        self.assertTrue(data["configured"])
        self.assertEqual(data["active_users"], 8)


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
