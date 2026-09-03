"""
FAAZO – Google Analytics 4 (GA4) Service Layer

Communicates with the Google Analytics Data API v1beta (google-analytics-data 0.23.0).
Service account credentials remain server-side in Django.

Only methods whose data is ACTUALLY USED by the staff analytics dashboard are kept.
Removed: get_campaigns, get_events, get_ecommerce_analytics, get_landing_pages
(these returned data that was either unused, uninstrumented, or confusing for staff).
"""

import json
import logging
import os
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger("faazo.analytics")

DEFAULT_GA4_PROPERTY_ID = os.environ.get(
    "GA4_PROPERTY_ID",
    getattr(settings, "GA4_PROPERTY_ID", "546256915"),
)


class GA4AnalyticsService:
    """Server-side service layer for GA4 Data API reporting."""

    def __init__(self, property_id: Optional[str] = None):
        self.property_id = property_id or DEFAULT_GA4_PROPERTY_ID

    # ------------------------------------------------------------------
    # Configuration helpers
    # ------------------------------------------------------------------
    def is_configured(self) -> bool:
        """Check if GA4 credentials are configured in the environment."""
        if not self.property_id:
            return False

        service_account_json = getattr(settings, "GA4_SERVICE_ACCOUNT_JSON", None) or os.environ.get(
            "GA4_SERVICE_ACCOUNT_JSON"
        )
        google_app_credentials = getattr(settings, "GOOGLE_APPLICATION_CREDENTIALS", None) or os.environ.get(
            "GOOGLE_APPLICATION_CREDENTIALS"
        )

        return bool(service_account_json or (google_app_credentials and os.path.exists(google_app_credentials)))

    def _get_client(self):
        """Instantiate BetaAnalyticsDataClient with service account."""
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.oauth2 import service_account

        service_account_json = getattr(settings, "GA4_SERVICE_ACCOUNT_JSON", None) or os.environ.get(
            "GA4_SERVICE_ACCOUNT_JSON"
        )
        google_app_credentials = getattr(settings, "GOOGLE_APPLICATION_CREDENTIALS", None) or os.environ.get(
            "GOOGLE_APPLICATION_CREDENTIALS"
        )

        if service_account_json:
            try:
                raw_json = service_account_json
                if isinstance(raw_json, str):
                    raw_json = raw_json.strip()
                    if (raw_json.startswith("'") and raw_json.endswith("'")) or (
                        raw_json.startswith('"') and raw_json.endswith('"')
                    ):
                        raw_json = raw_json[1:-1]
                    info = json.loads(raw_json)
                else:
                    info = raw_json
                credentials = service_account.Credentials.from_service_account_info(
                    info, scopes=["https://www.googleapis.com/auth/analytics.readonly"]
                )
                return BetaAnalyticsDataClient(credentials=credentials)
            except Exception as e:
                logger.error(f"[GA4] Error parsing GA4_SERVICE_ACCOUNT_JSON: {e}")

        if google_app_credentials and os.path.exists(google_app_credentials):
            try:
                credentials = service_account.Credentials.from_service_account_file(
                    google_app_credentials,
                    scopes=["https://www.googleapis.com/auth/analytics.readonly"],
                )
                return BetaAnalyticsDataClient(credentials=credentials)
            except Exception as e:
                logger.error(f"[GA4] Error loading GOOGLE_APPLICATION_CREDENTIALS file: {e}")

        return BetaAnalyticsDataClient()

    # ------------------------------------------------------------------
    # Date range helpers
    # ------------------------------------------------------------------
    def _resolve_date_ranges(self, period: str) -> Tuple[str, str, str, str]:
        """
        Map period string to current and previous DateRanges.
        Returns (start_cur, end_cur, start_prev, end_prev).
        """
        period_clean = (period or "7d").lower()
        if period_clean == "today":
            return "today", "today", "yesterday", "yesterday"
        elif period_clean == "yesterday":
            return "yesterday", "yesterday", "2daysAgo", "2daysAgo"
        elif period_clean in ("30d", "30days", "month"):
            return "30daysAgo", "today", "60daysAgo", "31daysAgo"
        else:  # default 7d
            return "7daysAgo", "today", "14daysAgo", "8daysAgo"

    def _calculate_pct_change(self, current: float, previous: float) -> Optional[float]:
        """
        Safe percentage change. Returns None when previous is 0 to allow
        UI to display 'New activity' instead of misleading +100%.
        """
        if previous <= 0:
            return None
        return round(((current - previous) / previous) * 100.0, 1)

    # ==================================================================
    # 1. OVERVIEW (core KPI metrics with previous-period comparison)
    # ==================================================================
    def get_overview(self, period: str = "7d", compare: bool = True) -> Dict[str, Any]:
        cache_key = f"ga4_overview_{self.property_id}_{period}_{compare}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        empty_metrics = {
            "total_users": 0, "prev_total_users": 0, "pct_total_users": None,
            "new_users": 0, "prev_new_users": 0, "pct_new_users": None,
            "sessions": 0, "prev_sessions": 0, "pct_sessions": None,
            "engagement_rate": 0.0, "prev_engagement_rate": 0.0, "pct_engagement_rate": None,
            "page_views": 0, "prev_page_views": 0, "pct_page_views": None,
            "avg_engagement_time": "0s",
        }

        if not self.is_configured():
            return {
                "configured": False,
                "message": "Google Analytics service account credentials not configured on server.",
                "period": period,
                "metrics": empty_metrics,
            }

        try:
            from google.analytics.data_v1beta import DateRange, Metric, RunReportRequest

            client = self._get_client()
            start_cur, end_cur, start_prev, end_prev = self._resolve_date_ranges(period)

            date_ranges = [DateRange(start_date=start_cur, end_date=end_cur)]
            if compare:
                date_ranges.append(DateRange(start_date=start_prev, end_date=end_prev))

            # Only request metrics that the staff dashboard actually uses
            request = RunReportRequest(
                property=f"properties/{self.property_id}",
                date_ranges=date_ranges,
                metrics=[
                    Metric(name="totalUsers"),
                    Metric(name="newUsers"),
                    Metric(name="sessions"),
                    Metric(name="engagementRate"),
                    Metric(name="screenPageViews"),
                    Metric(name="userEngagementDuration"),
                    Metric(name="activeUsers"),
                ],
            )
            response = client.run_report(request)

            cur_vals = [0.0] * 7
            prev_vals = [0.0] * 7

            if response.rows:
                for row in response.rows:
                    m_vals = [float(m.value) for m in row.metric_values]
                    if len(date_ranges) > 1 and len(m_vals) >= 14:
                        cur_vals = m_vals[0:7]
                        prev_vals = m_vals[7:14]
                    else:
                        cur_vals = m_vals[0:7]

            total_users = int(cur_vals[0])
            prev_total_users = int(prev_vals[0])

            new_users = int(cur_vals[1])
            prev_new_users = int(prev_vals[1])

            sessions = int(cur_vals[2])
            prev_sessions = int(prev_vals[2])

            engagement_rate = round(cur_vals[3] * 100, 1) if cur_vals[3] <= 1.0 else round(cur_vals[3], 1)
            prev_engagement_rate = round(prev_vals[3] * 100, 1) if prev_vals[3] <= 1.0 else round(prev_vals[3], 1)

            page_views = int(cur_vals[4])
            prev_page_views = int(prev_vals[4])

            total_engagement_sec = cur_vals[5]
            active_users = int(cur_vals[6]) or max(total_users, 1)
            avg_engagement_sec = round(total_engagement_sec / max(active_users, 1), 1)
            if avg_engagement_sec >= 60:
                engagement_str = f"{int(avg_engagement_sec // 60)}m {int(avg_engagement_sec % 60)}s"
            else:
                engagement_str = f"{avg_engagement_sec}s"

            result = {
                "configured": True,
                "property_id": self.property_id,
                "period": period,
                "compared_to_previous": compare,
                "metrics": {
                    "total_users": total_users,
                    "prev_total_users": prev_total_users,
                    "pct_total_users": self._calculate_pct_change(total_users, prev_total_users),

                    "new_users": new_users,
                    "prev_new_users": prev_new_users,
                    "pct_new_users": self._calculate_pct_change(new_users, prev_new_users),

                    "sessions": sessions,
                    "prev_sessions": prev_sessions,
                    "pct_sessions": self._calculate_pct_change(sessions, prev_sessions),

                    "engagement_rate": engagement_rate,
                    "prev_engagement_rate": prev_engagement_rate,
                    "pct_engagement_rate": self._calculate_pct_change(engagement_rate, prev_engagement_rate),

                    "page_views": page_views,
                    "prev_page_views": prev_page_views,
                    "pct_page_views": self._calculate_pct_change(page_views, prev_page_views),

                    "avg_engagement_time": engagement_str,
                },
            }
            cache_ttl = 30 if (period or "").lower() == "today" else 300
            cache.set(cache_key, result, cache_ttl)
            return result

        except Exception as exc:
            logger.error(f"[GA4 Error] get_overview failed: {exc}", exc_info=True)
            return {
                "configured": True,
                "error": True,
                "message": f"Google Analytics API call failed: {str(exc)}",
                "metrics": empty_metrics,
            }

    # ==================================================================
    # 2. TRAFFIC TREND (daily time series for chart)
    # ==================================================================
    def get_traffic_trend(self, period: str = "7d") -> Dict[str, Any]:
        cache_key = f"ga4_trend_{self.property_id}_{period}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        if not self.is_configured():
            return {"configured": False, "message": "Google Analytics credentials not configured.", "trend": []}

        try:
            from google.analytics.data_v1beta import DateRange, Dimension, Metric, OrderBy, RunReportRequest

            client = self._get_client()
            start_cur, end_cur, _, _ = self._resolve_date_ranges(period)

            request = RunReportRequest(
                property=f"properties/{self.property_id}",
                date_ranges=[DateRange(start_date=start_cur, end_date=end_cur)],
                dimensions=[Dimension(name="date")],
                metrics=[
                    Metric(name="totalUsers"),
                    Metric(name="screenPageViews"),
                    Metric(name="sessions"),
                ],
                order_bys=[OrderBy(dimension=OrderBy.DimensionOrderBy(dimension_name="date"))],
            )
            response = client.run_report(request)

            trend_data = []
            for row in response.rows:
                raw_date = row.dimension_values[0].value
                try:
                    formatted_date = datetime.strptime(raw_date, "%Y%m%d").strftime("%b %d")
                except Exception:
                    formatted_date = raw_date

                trend_data.append({
                    "date": formatted_date,
                    "raw_date": raw_date,
                    "users": int(row.metric_values[0].value) if len(row.metric_values) > 0 else 0,
                    "page_views": int(row.metric_values[1].value) if len(row.metric_values) > 1 else 0,
                    "sessions": int(row.metric_values[2].value) if len(row.metric_values) > 2 else 0,
                })

            result = {"configured": True, "period": period, "trend": trend_data}
            cache_ttl = 60 if (period or "").lower() == "today" else 300
            cache.set(cache_key, result, cache_ttl)
            return result

        except Exception as exc:
            logger.error(f"[GA4 Error] get_traffic_trend failed: {exc}", exc_info=True)
            return {"configured": True, "error": True, "message": str(exc), "trend": []}

    # ==================================================================
    # 3. REALTIME (GA4 Realtime API — separate from standard reports)
    # ==================================================================
    def get_realtime(self) -> Dict[str, Any]:
        cache_key = f"ga4_realtime_{self.property_id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        if not self.is_configured():
            return {
                "configured": False,
                "message": "Google Analytics credentials not configured.",
                "active_users": 0,
                "top_pages": [],
                "refreshed_at": datetime.now().strftime("%H:%M:%S"),
            }

        try:
            from google.analytics.data_v1beta import Dimension, Metric, RunRealtimeReportRequest

            client = self._get_client()

            # Get total active users
            request = RunRealtimeReportRequest(
                property=f"properties/{self.property_id}",
                metrics=[Metric(name="activeUsers")],
            )
            response = client.run_realtime_report(request)

            total_active = 0
            if response.rows:
                total_active = int(response.rows[0].metric_values[0].value)

            # Get top pages currently being viewed
            top_pages = []
            try:
                pages_req = RunRealtimeReportRequest(
                    property=f"properties/{self.property_id}",
                    dimensions=[Dimension(name="unifiedScreenName")],
                    metrics=[Metric(name="activeUsers")],
                    limit=5,
                )
                pages_res = client.run_realtime_report(pages_req)
                for row in pages_res.rows:
                    p_name = row.dimension_values[0].value
                    # Filter out admin pages from realtime
                    if p_name and ("/admin" in p_name or p_name.startswith("/admin")):
                        continue
                    top_pages.append({
                        "page": p_name,
                        "active_users": int(row.metric_values[0].value),
                    })
            except Exception as e:
                logger.warning(f"[GA4] Realtime pages sub-query skipped: {e}")

            result = {
                "configured": True,
                "active_users": total_active,
                "top_pages": top_pages,
                "refreshed_at": datetime.now().strftime("%H:%M:%S"),
            }
            cache.set(cache_key, result, 15)
            return result

        except Exception as exc:
            logger.error(f"[GA4 Error] get_realtime failed: {exc}", exc_info=True)
            return {
                "configured": True,
                "error": True,
                "message": str(exc),
                "active_users": 0,
                "top_pages": [],
                "refreshed_at": datetime.now().strftime("%H:%M:%S"),
            }

    # ==================================================================
    # 4. TOP PAGES (most viewed storefront pages)
    # ==================================================================
    def get_top_pages(self, period: str = "7d") -> Dict[str, Any]:
        cache_key = f"ga4_toppages_{self.property_id}_{period}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        if not self.is_configured():
            return {"configured": False, "message": "Credentials unconfigured.", "pages": []}

        try:
            from google.analytics.data_v1beta import DateRange, Dimension, Metric, OrderBy, RunReportRequest

            client = self._get_client()
            start_cur, end_cur, _, _ = self._resolve_date_ranges(period)

            request = RunReportRequest(
                property=f"properties/{self.property_id}",
                date_ranges=[DateRange(start_date=start_cur, end_date=end_cur)],
                dimensions=[
                    Dimension(name="pagePath"),
                    Dimension(name="pageTitle"),
                ],
                metrics=[
                    Metric(name="screenPageViews"),
                    Metric(name="totalUsers"),
                ],
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="screenPageViews"), desc=True)],
                limit=15,
            )
            response = client.run_report(request)

            pages = []
            for row in response.rows:
                path = row.dimension_values[0].value
                # Strict admin path exclusion
                if path and (path == "/admin" or path.startswith("/admin/")):
                    continue
                pages.append({
                    "path": path,
                    "title": row.dimension_values[1].value,
                    "views": int(row.metric_values[0].value) if len(row.metric_values) > 0 else 0,
                    "users": int(row.metric_values[1].value) if len(row.metric_values) > 1 else 0,
                })

            result = {"configured": True, "period": period, "pages": pages}
            cache.set(cache_key, result, 300)
            return result

        except Exception as exc:
            logger.error(f"[GA4 Error] get_top_pages failed: {exc}", exc_info=True)
            return {"configured": True, "error": True, "message": str(exc), "pages": []}

    # ==================================================================
    # 5. TRAFFIC SOURCES (where visitors came from)
    # ==================================================================
    def get_traffic_sources(self, period: str = "7d") -> Dict[str, Any]:
        cache_key = f"ga4_sources_{self.property_id}_{period}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        if not self.is_configured():
            return {"configured": False, "message": "Credentials unconfigured.", "sources": []}

        try:
            from google.analytics.data_v1beta import DateRange, Dimension, Metric, OrderBy, RunReportRequest

            client = self._get_client()
            start_cur, end_cur, _, _ = self._resolve_date_ranges(period)

            request = RunReportRequest(
                property=f"properties/{self.property_id}",
                date_ranges=[DateRange(start_date=start_cur, end_date=end_cur)],
                dimensions=[
                    Dimension(name="sessionSource"),
                    Dimension(name="sessionMedium"),
                ],
                metrics=[
                    Metric(name="totalUsers"),
                    Metric(name="sessions"),
                ],
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)],
                limit=10,
            )
            response = client.run_report(request)

            sources = []
            for row in response.rows:
                sources.append({
                    "source": row.dimension_values[0].value,
                    "medium": row.dimension_values[1].value,
                    "users": int(row.metric_values[0].value),
                    "sessions": int(row.metric_values[1].value),
                })

            result = {"configured": True, "period": period, "sources": sources}
            cache.set(cache_key, result, 300)
            return result

        except Exception as exc:
            logger.error(f"[GA4 Error] get_traffic_sources failed: {exc}", exc_info=True)
            return {"configured": True, "error": True, "message": str(exc), "sources": []}

    # ==================================================================
    # 6. DEVICES (how visitors access the site)
    # ==================================================================
    def get_devices(self, period: str = "7d") -> Dict[str, Any]:
        cache_key = f"ga4_devices_{self.property_id}_{period}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        if not self.is_configured():
            return {"configured": False, "message": "Credentials unconfigured.", "devices": []}

        try:
            from google.analytics.data_v1beta import DateRange, Dimension, Metric, RunReportRequest

            client = self._get_client()
            start_cur, end_cur, _, _ = self._resolve_date_ranges(period)

            request = RunReportRequest(
                property=f"properties/{self.property_id}",
                date_ranges=[DateRange(start_date=start_cur, end_date=end_cur)],
                dimensions=[Dimension(name="deviceCategory")],
                metrics=[Metric(name="totalUsers")],
            )
            response = client.run_report(request)

            devices = []
            for row in response.rows:
                devices.append({
                    "category": row.dimension_values[0].value,
                    "users": int(row.metric_values[0].value),
                })

            result = {"configured": True, "period": period, "devices": devices}
            cache.set(cache_key, result, 300)
            return result

        except Exception as exc:
            logger.error(f"[GA4 Error] get_devices failed: {exc}", exc_info=True)
            return {"configured": True, "error": True, "message": str(exc), "devices": []}

    # ==================================================================
    # 7. GEOGRAPHY (where visitors are located)
    # ==================================================================
    def get_geography(self, period: str = "7d") -> Dict[str, Any]:
        cache_key = f"ga4_geography_{self.property_id}_{period}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        if not self.is_configured():
            return {"configured": False, "message": "Credentials unconfigured.", "geography": []}

        try:
            from google.analytics.data_v1beta import DateRange, Dimension, Metric, OrderBy, RunReportRequest

            client = self._get_client()
            start_cur, end_cur, _, _ = self._resolve_date_ranges(period)

            request = RunReportRequest(
                property=f"properties/{self.property_id}",
                date_ranges=[DateRange(start_date=start_cur, end_date=end_cur)],
                dimensions=[
                    Dimension(name="country"),
                    Dimension(name="city"),
                ],
                metrics=[Metric(name="totalUsers")],
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="totalUsers"), desc=True)],
                limit=10,
            )
            response = client.run_report(request)

            geography = []
            for row in response.rows:
                geography.append({
                    "country": row.dimension_values[0].value,
                    "city": row.dimension_values[1].value,
                    "users": int(row.metric_values[0].value),
                })

            result = {"configured": True, "period": period, "geography": geography}
            cache.set(cache_key, result, 300)
            return result

        except Exception as exc:
            logger.error(f"[GA4 Error] get_geography failed: {exc}", exc_info=True)
            return {"configured": True, "error": True, "message": str(exc), "geography": []}
