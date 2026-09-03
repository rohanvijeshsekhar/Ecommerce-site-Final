"""
FAAZO – Analytics API Views (Staff Dashboard & Storefront Presence)
===================================================================

REST API Endpoints:
- POST /api/v1/analytics/heartbeat/       (Public storefront visitor heartbeat)
- GET  /api/v1/analytics/live-visitors/   (Admin: real-time storefront live visitors)
- GET  /api/v1/analytics/sales-over-time/ (Admin: real sales & order time-series)
- GET  /api/v1/analytics/dashboard/       (Consolidated staff analytics payload)
- GET  /api/v1/analytics/overview/        (GA4 overview only)
- GET  /api/v1/analytics/realtime/        (GA4 realtime only)
- GET  /api/v1/analytics/export/          (CSV export)
"""

import csv
from datetime import datetime
from typing import Any, Dict

from django.http import HttpResponse
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services.ga4_service import GA4AnalyticsService
from .services.presence_service import PresenceService
from .services.sales_service import SalesAnalyticsService


class AnalyticsBaseView(APIView):
    """Base class enforcing Admin Authentication."""
    permission_classes = [IsAuthenticated, IsAdminUser]


class HeartbeatView(APIView):
    """
    POST /api/v1/analytics/heartbeat/

    Public, lightweight presence beacon sent by the customer storefront.
    Strictly ignores /admin routes and automated bot crawlers.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data or {}
        visitor_id = str(data.get("visitor_id") or "").strip()
        path = str(data.get("path") or "").strip()
        user_agent = request.META.get("HTTP_USER_AGENT", "")
        ip_address = request.META.get("REMOTE_ADDR", "")

        success = PresenceService.record_heartbeat(
            visitor_id=visitor_id,
            path=path,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        return Response({"success": success}, status=status.HTTP_200_OK)


class LiveVisitorsView(AnalyticsBaseView):
    """
    GET /api/v1/analytics/live-visitors/

    Returns the number of real customers currently active on the public storefront.
    """
    def get(self, request):
        count = PresenceService.get_live_visitor_count()
        return Response(
            {
                "success": True,
                "data": {
                    "live_visitors": count,
                    "updated_at": datetime.now().isoformat(),
                },
            },
            status=status.HTTP_200_OK,
        )


class SalesOverTimeView(AnalyticsBaseView):
    """
    GET /api/v1/analytics/sales-over-time/?period=today

    Returns time-series revenue and order breakdown from the FAAZO database.
    """
    def get(self, request):
        period = request.query_params.get("period", "7d")
        data = SalesAnalyticsService.get_sales_over_time(period=period)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)


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
        ga4_realtime = service.get_realtime()
        live_visitors_count = PresenceService.get_live_visitor_count()
        return Response(
            {
                **ga4_realtime,
                "live_storefront_visitors": live_visitors_count,
            },
            status=status.HTTP_200_OK,
        )


class AnalyticsDashboardView(AnalyticsBaseView):
    """
    GET /api/v1/analytics/dashboard/?period=today&compare=true

    Consolidated staff analytics payload — GA4 + FAAZO Database.
    """

    def get(self, request):
        period = request.query_params.get("period", "7d")
        compare = request.query_params.get("compare", "true").lower() == "true"
        service = GA4AnalyticsService()

        overview = service.get_overview(period=period, compare=compare)
        trend = service.get_traffic_trend(period=period)
        realtime = service.get_realtime()
        pages = service.get_top_pages(period=period)
        sources = service.get_traffic_sources(period=period)
        devices = service.get_devices(period=period)
        geography = service.get_geography(period=period)
        
        # Real FAAZO database analytics
        sales_over_time = SalesAnalyticsService.get_sales_over_time(period=period)
        live_storefront_visitors = PresenceService.get_live_visitor_count()

        configured = overview.get("configured", False)

        return Response(
            {
                "configured": configured,
                "period": period,
                "compared_to_previous": compare,
                "property_id": service.property_id,
                "timezone": "Asia/Kolkata",
                "source_labels": {"ga4": "GA4", "faazo_db": "FAAZO Data"},
                "live_storefront_visitors": live_storefront_visitors,
                "sales_over_time": sales_over_time,
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
                "faazo_db_metrics": {
                    "source_label": "FAAZO Data",
                    "total_orders": sales_over_time.get("total_orders", 0),
                    "paid_orders": sales_over_time.get("paid_orders", 0) + sales_over_time.get("cod_orders", 0),
                    "cod_orders": sales_over_time.get("cod_orders", 0),
                    "total_revenue": sales_over_time.get("total_sales", 0.0),
                    "period": period,
                    "timezone": "Asia/Kolkata",
                },
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
        sales_data = SalesAnalyticsService.get_sales_over_time(period=period)

        filename = f"faazo_sales_analytics_{period}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(["FAAZO Sales Analytics Report", f"Period: {period}", f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"])
        writer.writerow([])
        writer.writerow(["Time / Date", "Sales (INR)", "Orders Count"])

        for row in sales_data.get("series", []):
            writer.writerow([row.get("label", ""), row.get("sales", 0.0), row.get("orders", 0)])

        writer.writerow([])
        writer.writerow(["Total Sales (INR)", sales_data.get("total_sales", 0.0)])
        writer.writerow(["Total Orders", sales_data.get("total_orders", 0)])
        writer.writerow(["COD Orders", sales_data.get("cod_orders", 0)])
        writer.writerow(["Paid Online Orders", sales_data.get("paid_orders", 0)])

        return response
