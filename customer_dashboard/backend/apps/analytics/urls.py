from django.urls import path
from .views import (
    AnalyticsOverviewView,
    AnalyticsRealtimeView,
    AnalyticsDashboardView,
    AnalyticsExportCSVView,
    HeartbeatView,
    LiveVisitorsView,
    SalesOverTimeView,
)

urlpatterns = [
    path("dashboard/", AnalyticsDashboardView.as_view(), name="analytics-dashboard"),
    path("overview/", AnalyticsOverviewView.as_view(), name="analytics-overview"),
    path("realtime/", AnalyticsRealtimeView.as_view(), name="analytics-realtime"),
    path("live-visitors/", LiveVisitorsView.as_view(), name="analytics-live-visitors"),
    path("sales-over-time/", SalesOverTimeView.as_view(), name="analytics-sales-over-time"),
    path("heartbeat/", HeartbeatView.as_view(), name="analytics-heartbeat"),
    path("export/", AnalyticsExportCSVView.as_view(), name="analytics-export-csv"),
]
