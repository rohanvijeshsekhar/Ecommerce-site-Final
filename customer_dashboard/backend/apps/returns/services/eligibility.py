"""
FAAZO – Return Eligibility Service

Evaluates server-side business rules for return & replacement requests:
1. Order delivery status (must be DELIVERED).
2. Return window (default 7 days, configurable via settings.RETURN_WINDOW_DAYS).
3. Product returnability constraint (is_returnable flag on Product).
4. Delivered quantity vs previously returned/requested quantities.
5. Active return request gating (prevents duplicate requests for the same order item).
"""

import logging
from datetime import timedelta
from typing import Dict, Any, List
from django.conf import settings
from django.utils import timezone

from apps.orders.models import Order, OrderItem, OrderStatus
from apps.returns.models import ReturnItem, ReturnStatus

logger = logging.getLogger("faazo.returns")


class ReturnEligibilityService:
    """
    Authoritative server-side evaluation engine for return & replacement eligibility.
    """

    ACTIVE_RETURN_STATUSES = [
        ReturnStatus.REQUESTED,
        ReturnStatus.UNDER_REVIEW,
        ReturnStatus.APPROVED,
        ReturnStatus.PICKUP_PENDING,
        ReturnStatus.PICKUP_SCHEDULED,
        ReturnStatus.ITEM_RECEIVED,
        ReturnStatus.QC_PENDING,
        ReturnStatus.QC_PASSED,
        ReturnStatus.REFUND_PENDING,
        ReturnStatus.REFUND_PROCESSING,
        ReturnStatus.REFUNDED,
        ReturnStatus.REPLACEMENT_PENDING,
        ReturnStatus.REPLACEMENT_PROCESSING,
        ReturnStatus.REPLACEMENT_SHIPPED,
        ReturnStatus.COMPLETED,
    ]

    @classmethod
    def get_return_window_days(cls) -> int:
        """Returns configured return window (defaults to 7 days)."""
        return int(getattr(settings, "RETURN_WINDOW_DAYS", 7))

    @classmethod
    def evaluate_item_eligibility(cls, order_item: OrderItem) -> Dict[str, Any]:
        """
        Evaluates eligibility for a single OrderItem.
        """
        order = order_item.order

        # 1. Order Status Check
        if order.status != OrderStatus.DELIVERED:
            return {
                "is_eligible": False,
                "reason": "ORDER_NOT_DELIVERED",
                "message": "Items can only be returned after the order is delivered.",
                "max_returnable_qty": 0,
            }

        # 2. Return Window Check
        delivery_time = order.delivered_at or order.updated_at
        window_days = cls.get_return_window_days()
        cutoff_date = timezone.now() - timedelta(days=window_days)

        if delivery_time < cutoff_date:
            return {
                "is_eligible": False,
                "reason": "RETURN_WINDOW_EXPIRED",
                "message": f"The {window_days}-day return window for this item has expired.",
                "max_returnable_qty": 0,
            }

        # 3. Product Returnability Check
        product = order_item.product
        is_returnable = getattr(product, "is_returnable", True)
        if not is_returnable:
            return {
                "is_eligible": False,
                "reason": "PRODUCT_NOT_RETURNABLE",
                "message": f"'{product.name}' is non-returnable under company policy.",
                "max_returnable_qty": 0,
            }

        # 4. Quantity & Active Request Check
        returned_items = ReturnItem.objects.filter(
            order_item=order_item,
            return_request__status__in=cls.ACTIVE_RETURN_STATUSES,
        )

        already_returned_qty = sum(item.requested_quantity for item in returned_items)
        max_returnable_qty = order_item.quantity - already_returned_qty

        if max_returnable_qty <= 0:
            return {
                "is_eligible": False,
                "reason": "ALREADY_RETURNED",
                "message": "All purchased quantities for this item have already been returned or requested.",
                "max_returnable_qty": 0,
            }

        return {
            "is_eligible": True,
            "reason": "ELIGIBLE",
            "message": "Item is eligible for return or replacement.",
            "max_returnable_qty": max_returnable_qty,
            "unit_price": str(order_item.price),
        }

    @classmethod
    def evaluate_order_eligibility(cls, order: Order) -> Dict[str, Any]:
        """
        Evaluates return eligibility for all items in an Order.
        """
        items_result = []
        any_eligible = False

        for item in order.items.select_related("product").all():
            res = cls.evaluate_item_eligibility(item)
            if res["is_eligible"]:
                any_eligible = True
            items_result.append({
                "order_item_id": str(item.id),
                "product_id": str(item.product.id),
                "product_name": item.product.name,
                "ordered_quantity": item.quantity,
                "unit_price": str(item.price),
                **res,
            })

        return {
            "order_id": str(order.id),
            "order_number": order.order_number,
            "order_status": order.status,
            "is_order_eligible": any_eligible,
            "return_window_days": cls.get_return_window_days(),
            "items": items_result,
        }
