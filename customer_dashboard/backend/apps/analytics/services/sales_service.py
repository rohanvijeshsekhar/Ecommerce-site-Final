"""
FAAZO – Sales Over Time Analytics Service
=========================================

Calculates accurate, real-time sales and order aggregation from the FAAZO
Django database, using Indian Standard Time (Asia/Kolkata).

Rules:
1. Sourced 100% from PostgreSQL / Django database (Order model).
2. Cancelled orders (OrderStatus.CANCELLED) are strictly excluded.
3. Includes valid COD orders and completed/paid online orders.
4. Correct hourly grouping for 'today' / 'yesterday' and daily grouping for '7d' / '30d'.
5. Safe percentage comparison with no divide-by-zero errors.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Tuple
from zoneinfo import ZoneInfo
import logging

from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.orders.models import Order, OrderStatus

logger = logging.getLogger("faazo.analytics")

IST = ZoneInfo("Asia/Kolkata")


class SalesAnalyticsService:
    """Service providing server-side sales over time time-series data."""

    @staticmethod
    def _get_date_ranges(period: str) -> Tuple[datetime, datetime, datetime, datetime, str]:
        """
        Calculate (cur_start, cur_end, prev_start, prev_end, interval_type) in IST.
        """
        now_ist = timezone.now().astimezone(IST)
        today_start = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
        p = (period or "7d").lower().strip()

        if p == "today":
            cur_start = today_start
            cur_end = now_ist
            prev_start = today_start - timedelta(days=1)
            prev_end = prev_start + (cur_end - cur_start)
            interval = "hourly"
        elif p == "yesterday":
            cur_start = today_start - timedelta(days=1)
            cur_end = cur_start.replace(hour=23, minute=59, second=59, microsecond=999999)
            prev_start = today_start - timedelta(days=2)
            prev_end = prev_start.replace(hour=23, minute=59, second=59, microsecond=999999)
            interval = "hourly"
        elif p in ("30d", "30days", "month"):
            cur_start = (today_start - timedelta(days=29))
            cur_end = now_ist
            prev_start = cur_start - timedelta(days=30)
            prev_end = cur_start - timedelta(microseconds=1)
            interval = "daily"
        else:  # Default '7d'
            cur_start = (today_start - timedelta(days=6))
            cur_end = now_ist
            prev_start = cur_start - timedelta(days=7)
            prev_end = cur_start - timedelta(microseconds=1)
            interval = "daily"

        return cur_start, cur_end, prev_start, prev_end, interval

    @classmethod
    def get_sales_over_time(cls, period: str = "7d") -> Dict[str, Any]:
        """
        Aggregate sales and order volume over time for the given period.
        """
        cur_start, cur_end, prev_start, prev_end, interval = cls._get_date_ranges(period)

        # Base valid orders filter (non-cancelled)
        valid_orders_q = ~Q(status=OrderStatus.CANCELLED)

        # Query orders in current period
        cur_orders = (
            Order.objects.filter(created_at__gte=cur_start, created_at__lte=cur_end)
            .filter(valid_orders_q)
            .values("id", "total_amount", "payment_method", "status", "created_at")
        )

        # Query orders in previous period for comparison
        prev_orders = (
            Order.objects.filter(created_at__gte=prev_start, created_at__lte=prev_end)
            .filter(valid_orders_q)
            .values("id", "total_amount", "payment_method", "status", "created_at")
        )

        # Current period summary totals
        total_sales = 0.0
        total_orders = 0
        cod_orders = 0
        paid_orders = 0

        for o in cur_orders:
            amt = float(o["total_amount"] or 0.0)
            total_sales += amt
            total_orders += 1
            pm = (o["payment_method"] or "").lower()
            if "cod" in pm or pm == "cash on delivery":
                cod_orders += 1
            else:
                paid_orders += 1

        # Previous period summary totals
        prev_total_sales = 0.0
        prev_total_orders = 0
        for o in prev_orders:
            prev_total_sales += float(o["total_amount"] or 0.0)
            prev_total_orders += 1

        # Calculate percentage growth safely
        pct_sales_change = None
        is_new_activity = False
        if prev_total_sales > 0:
            diff = total_sales - prev_total_sales
            pct_sales_change = round((diff / prev_total_sales) * 100, 1)
        elif prev_total_sales == 0 and total_sales > 0:
            is_new_activity = True

        # Build time-series buckets
        series: List[Dict[str, Any]] = []

        if interval == "hourly":
            # 24 hourly buckets: 00:00 to 23:00
            hourly_buckets = {h: {"sales": 0.0, "orders": 0} for h in range(24)}

            for o in cur_orders:
                o_time_ist = o["created_at"].astimezone(IST)
                h = o_time_ist.hour
                hourly_buckets[h]["sales"] += float(o["total_amount"] or 0.0)
                hourly_buckets[h]["orders"] += 1

            for h in range(24):
                label = f"{h:02d}:00"
                display_time = f"{h % 12 or 12}:00 {'AM' if h < 12 else 'PM'}"
                series.append({
                    "time": label,
                    "label": display_time,
                    "sales": round(hourly_buckets[h]["sales"], 2),
                    "orders": hourly_buckets[h]["orders"],
                })
        else:
            # Daily buckets for 7d or 30d
            num_days = 30 if period in ("30d", "30days", "month") else 7
            daily_buckets: Dict[str, Dict[str, Any]] = {}

            for d in range(num_days):
                day_date = (cur_start + timedelta(days=d)).date()
                key = day_date.strftime("%Y-%m-%d")
                label = day_date.strftime("%d %b")
                daily_buckets[key] = {
                    "time": key,
                    "label": label,
                    "sales": 0.0,
                    "orders": 0,
                }

            for o in cur_orders:
                o_date_ist = o["created_at"].astimezone(IST).date()
                key = o_date_ist.strftime("%Y-%m-%d")
                if key in daily_buckets:
                    daily_buckets[key]["sales"] += float(o["total_amount"] or 0.0)
                    daily_buckets[key]["orders"] += 1

            for key in sorted(daily_buckets.keys()):
                daily_buckets[key]["sales"] = round(daily_buckets[key]["sales"], 2)
                series.append(daily_buckets[key])

        return {
            "period": period,
            "interval": interval,
            "timezone": "Asia/Kolkata",
            "total_sales": round(total_sales, 2),
            "total_orders": total_orders,
            "cod_orders": cod_orders,
            "paid_orders": paid_orders,
            "prev_total_sales": round(prev_total_sales, 2),
            "prev_total_orders": prev_total_orders,
            "pct_sales_change": pct_sales_change,
            "is_new_activity": is_new_activity,
            "series": series,
        }
