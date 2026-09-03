"""
FAAZO – Analytics API Views (Simplified Staff Dashboard)

REST API Endpoints:
- GET /api/v1/analytics/dashboard/  (Consolidated staff analytics)
- GET /api/v1/analytics/overview/   (GA4 overview only)
- GET /api/v1/analytics/realtime/   (GA4 realtime only)
- GET /api/v1/analytics/export/     (CSV export)
"""

import csv
from datetime import datetime, timedelta
from typing import Any, Dict
from zoneinfo import ZoneInfo

from django.db.models import Count, Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services.ga4_service import GA4AnalyticsService


class AnalyticsBaseView(APIView):
    """Base class enforcing Admin Authentication."""
    permission_classes = [IsAuthenticated, IsAdminUser]


def _get_faazo_db_metrics(period: str) -> Dict[str, Any]:
    """
    Fetches actual order transaction metrics from FAAZO Django database
    using Asia/Kolkata timezone for date boundaries.
    """
    try:
        from apps.orders.models import Order, OrderStatus

        ist = ZoneInfo("Asia/Kolkata")
        now_ist = timezone.now().astimezone(ist)
        period_clean = (period or "7d").lower()

        if period_clean == "today":
            start_date = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period_clean == "yesterday":
            start_date = (now_ist - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        elif period_clean in ("30d", "30days", "month"):
            start_date = now_ist - timedelta(days=30)
        else:
            start_date = now_ist - timedelta(days=7)

        orders_qs = Order.objects.filter(created_at__gte=start_date)

        agg = orders_qs.aggregate(
            total_orders=Count("id"),
            paid_orders=Count("id", filter=~Q(status=OrderStatus.CANCELLED)),
            total_rev=Sum("total_amount", filter=~Q(status=OrderStatus.CANCELLED)),
        )

        return {
            "source_label": "FAAZO Data",
            "total_orders": agg["total_orders"] or 0,
            "paid_orders": agg["paid_orders"] or 0,
            "total_revenue": float(agg["total_rev"] or 0.0),
            "period": period,
            "timezone": "Asia/Kolkata",
        }
    except Exception:
        return {
            "source_label": "FAAZO Data",
            "total_orders": 0,
            "paid_orders": 0,
            "total_revenue": 0.0,
            "period": period,
            "timezone": "Asia/Kolkata",
        }


class AnalyticsOverviewView(AnalyticsBaseView):
    """GET /api/v1/analytics/overview/?period=today&compare=true"""

    def get(self, request):
        period = request.query_params.get("period", "today")
        compare = request.query_params.get("compare", "true").lower() == "true"
        service = GA4AnalyticsService()
        data = service.get_overview(period=period, compare=compare)
        return Response(data, status=status.HTTP_200_OK)


class AnalyticsRealtimeView(AnalyticsBaseView):
    """GET /api/v1/analytics/realtime/"""

    def get(self, request):
        service = GA4AnalyticsService()
        data = service.get_realtime()
        return Response(data, status=status.HTTP_200_OK)


class AnalyticsDashboardView(AnalyticsBaseView):
    """
    GET /api/v1/analytics/dashboard/?period=today&compare=true

    Consolidated staff analytics payload — GA4 + FAAZO Database.
    """

    def get(self, request):
        period = request.query_params.get("period", "today")
        compare = request.query_params.get("compare", "true").lower() == "true"
        service = GA4AnalyticsService()

        overview = service.get_overview(period=period, compare=compare)
        trend = service.get_traffic_trend(period=period)
        realtime = service.get_realtime()
        pages = service.get_top_pages(period=period)
        sources = service.get_traffic_sources(period=period)
        devices = service.get_devices(period=period)
        geography = service.get_geography(period=period)
        faazo_db = _get_faazo_db_metrics(period=period)

        configured = overview.get("configured", False)

        return Response(
            {
                "configured": configured,
                "period": period,
                "compared_to_previous": compare,
                "property_id": service.property_id,
                "timezone": "Asia/Kolkata",
                "source_labels": {"ga4": "GA4", "faazo_db": "FAAZO Data"},
                "overview": overview.get("metrics", {}),
                "trend": trend.get("trend", []),
                "realtime": {
                    "active_users": realtime.get("active_users", 0),
                    "top_pages": realtime.get("top_pages", []),
                    "refreshed_at": realtime.get("refreshed_at", ""),
                },
                "top_pages": pages.get("pages", []),
                "traffic_sources": sources.get("sources", []),
                "devices": devices.get("devices", []),
                "geography": geography.get("geography", []),
                "faazo_db_metrics": faazo_db,
            },
            status=status.HTTP_200_OK,
        )


class AnalyticsExportCSVView(AnalyticsBaseView):
    """
    GET /api/v1/analytics/export/?period=today&tab=overview
    Real CSV export of the selected report data.
    """

    def get(self, request):
        period = request.query_params.get("period", "today")
        tab = request.query_params.get("tab", "overview").lower()
        service = GA4AnalyticsService()

        filename = f"faazo_analytics_{tab}_{period}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)

        if tab in ("traffic_sources", "sources"):
            data = service.get_traffic_sources(period=period)
            writer.writerow(["Traffic Source", "Medium", "Visitors", "Visits"])
            for row in data.get("sources", []):
                writer.writerow([row.get("source"), row.get("medium"), row.get("users"), row.get("sessions")])

        elif tab in ("pages", "top_pages"):
            data = service.get_top_pages(period=period)
            writer.writerow(["Page Title", "Page Path", "Pages Viewed", "Visitors"])
            for row in data.get("pages", []):
                writer.writerow([row.get("title"), row.get("path"), row.get("views"), row.get("users")])

        elif tab in ("orders", "revenue"):
            db_m = _get_faazo_db_metrics(period=period)
            writer.writerow(["Metric Name", "Data Source", "Value"])
            writer.writerow(["Total Orders", "FAAZO Data", db_m.get("total_orders")])
            writer.writerow(["Paid Orders", "FAAZO Data", db_m.get("paid_orders")])
            writer.writerow(["Actual Order Revenue (INR)", "FAAZO Data", db_m.get("total_revenue")])

        else:  # overview
            data = service.get_overview(period=period)
            m = data.get("metrics", {})
            writer.writerow(["Metric Name", "Data Source", "Current Value", "Previous Period Value"])
            writer.writerow(["Visitors", "GA4", m.get("total_users"), m.get("prev_total_users")])
            writer.writerow(["Visits", "GA4", m.get("sessions"), m.get("prev_sessions")])
            writer.writerow(["Pages Viewed", "GA4", m.get("page_views"), m.get("prev_page_views")])

            db_m = _get_faazo_db_metrics(period=period)
            writer.writerow(["Actual Orders", "FAAZO Data", db_m.get("total_orders"), "-"])
            writer.writerow(["Actual Order Revenue (INR)", "FAAZO Data", db_m.get("total_revenue"), "-"])

        return response
