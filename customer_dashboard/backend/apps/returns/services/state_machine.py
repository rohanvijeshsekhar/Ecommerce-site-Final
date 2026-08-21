"""
FAAZO – Return State Machine Service

Enforces controlled, forward-only status transitions for ReturnRequest.
- Prevents illegal or arbitrary API status modifications.
- Records append-only ReturnEvent audit entries.
- Emits central NotificationService notifications on major transitions.
- Executes within transaction.atomic() with select_for_update() row locking.
"""

import logging
from typing import Optional, Dict, Any, List
from django.core.exceptions import ValidationError
from django.db import transaction

from apps.authentication.services.audit_service import AuditService
from apps.notifications.services.notification_service import NotificationService
from apps.notifications.models import NotificationType
from apps.returns.models import (
    ReturnRequest,
    ReturnStatus,
    ReturnEvent,
    ReturnRequestType,
)

logger = logging.getLogger("faazo.returns")


class ReturnStateMachineService:
    """
    Centralized state transition authority for ReturnRequest.
    """

    ALLOWED_TRANSITIONS: Dict[ReturnStatus, List[ReturnStatus]] = {
        ReturnStatus.REQUESTED: [
            ReturnStatus.UNDER_REVIEW,
            ReturnStatus.APPROVED,
            ReturnStatus.REJECTED,
            ReturnStatus.CANCELLED,
        ],
        ReturnStatus.UNDER_REVIEW: [
            ReturnStatus.APPROVED,
            ReturnStatus.REJECTED,
            ReturnStatus.CANCELLED,
        ],
        ReturnStatus.APPROVED: [
            ReturnStatus.PICKUP_PENDING,
            ReturnStatus.PICKUP_SCHEDULED,
            ReturnStatus.ITEM_RECEIVED,
        ],
        ReturnStatus.PICKUP_PENDING: [
            ReturnStatus.PICKUP_SCHEDULED,
            ReturnStatus.ITEM_RECEIVED,
        ],
        ReturnStatus.PICKUP_SCHEDULED: [
            ReturnStatus.ITEM_RECEIVED,
        ],
        ReturnStatus.ITEM_RECEIVED: [
            ReturnStatus.QC_PENDING,
        ],
        ReturnStatus.QC_PENDING: [
            ReturnStatus.QC_PASSED,
            ReturnStatus.QC_FAILED,
        ],
        ReturnStatus.QC_PASSED: [
            ReturnStatus.REFUND_PENDING,
            ReturnStatus.REPLACEMENT_PENDING,
        ],
        ReturnStatus.REFUND_PENDING: [
            ReturnStatus.REFUND_PROCESSING,
            ReturnStatus.REFUNDED,
        ],
        ReturnStatus.REFUND_PROCESSING: [
            ReturnStatus.REFUNDED,
            ReturnStatus.REFUND_PENDING,
        ],
        ReturnStatus.REFUNDED: [
            ReturnStatus.COMPLETED,
        ],
        ReturnStatus.REPLACEMENT_PENDING: [
            ReturnStatus.REPLACEMENT_PROCESSING,
            ReturnStatus.REPLACEMENT_SHIPPED,
        ],
        ReturnStatus.REPLACEMENT_PROCESSING: [
            ReturnStatus.REPLACEMENT_SHIPPED,
        ],
        ReturnStatus.REPLACEMENT_SHIPPED: [
            ReturnStatus.COMPLETED,
        ],
        ReturnStatus.QC_FAILED: [],
        ReturnStatus.REJECTED: [],
        ReturnStatus.COMPLETED: [],
        ReturnStatus.CANCELLED: [],
    }

    STATUS_NOTIFICATION_MAP = {
        ReturnStatus.REQUESTED: NotificationType.RETURN_REQUESTED,
        ReturnStatus.APPROVED: NotificationType.RETURN_APPROVED,
        ReturnStatus.REJECTED: NotificationType.RETURN_REJECTED,
        ReturnStatus.PICKUP_SCHEDULED: NotificationType.ORDER_SHIPPED,
        ReturnStatus.ITEM_RECEIVED: NotificationType.ORDER_PACKED,
        ReturnStatus.QC_PASSED: NotificationType.ORDER_PACKED,
        ReturnStatus.QC_FAILED: NotificationType.ORDER_CANCELLED,
        ReturnStatus.REFUNDED: NotificationType.REFUND_COMPLETED,
        ReturnStatus.REPLACEMENT_SHIPPED: NotificationType.ORDER_SHIPPED,
        ReturnStatus.COMPLETED: NotificationType.ORDER_DELIVERED,
    }

    @classmethod
    def transition_to(
        cls,
        return_request_id: str,
        target_status: ReturnStatus,
        actor=None,
        notes: str = "",
        rejection_reason: str = "",
    ) -> ReturnRequest:
        """
        Executes a controlled state transition on a ReturnRequest.
        """
        with transaction.atomic():
            return_req = (
                ReturnRequest.objects.select_for_update()
                .select_related("customer", "order")
                .get(pk=return_request_id)
            )

            current_status = return_req.status

            if current_status == target_status:
                logger.info(f"[ReturnStateMachine] Return {return_request_id} already in status {target_status}. No-op.")
                return return_req

            allowed_next = cls.ALLOWED_TRANSITIONS.get(current_status, [])
            if target_status not in allowed_next:
                raise ValidationError(
                    f"Illegal return transition from '{current_status}' to '{target_status}'. Allowed: {allowed_next}"
                )

            # Update ReturnRequest attributes
            return_req.status = target_status
            if rejection_reason and target_status == ReturnStatus.REJECTED:
                return_req.rejection_reason = rejection_reason
            if notes and not return_req.admin_notes:
                return_req.admin_notes = notes

            return_req.save()

            # Create ReturnEvent audit entry
            ReturnEvent.objects.create(
                return_request=return_req,
                from_status=current_status,
                to_status=target_status,
                actor=actor,
                notes=notes or rejection_reason or f"Transitioned from {current_status} to {target_status}",
            )

            # Record system AuditLog
            AuditService.log_event(
                user=actor,
                action="RETURN_STATUS_TRANSITION",
                status="SUCCESS",
                ip_address=None,
                details={
                    "return_id": str(return_req.id),
                    "order_id": str(return_req.order.id),
                    "from_status": current_status,
                    "to_status": target_status,
                    "notes": notes,
                },
            )

            # Trigger NotificationService if mapping exists
            notif_type = cls.STATUS_NOTIFICATION_MAP.get(target_status)
            if notif_type:
                try:
                    c_name = (
                        getattr(return_req.customer, "full_name", None)
                        or getattr(return_req.customer, "first_name", None)
                        or "Doctor"
                    )
                    cust_phone = (
                        getattr(return_req.customer, "phone_number", None)
                        or getattr(getattr(return_req.customer, "profile", None), "phone_number", None)
                    )
                    NotificationService.create(
                        user=return_req.customer,
                        notification_type=notif_type,
                        title=f"Return Status Update: {return_req.get_status_display()}",
                        message=f"Your return request for Order #{return_req.order.order_number} is now: {return_req.get_status_display()}.",
                        metadata={
                            "return_id": str(return_req.id),
                            "order_id": str(return_req.order.id),
                            "status": target_status,
                            "order_number": return_req.order.order_number,
                        },
                        context={
                            "customer_name": c_name,
                            "order_number": return_req.order.order_number,
                            "return_window": "7 days",
                            "phone": cust_phone,
                        },
                    )
                except Exception as exc:
                    logger.warning(f"[ReturnStateMachine] Notification dispatch failed: {exc}")

            logger.info(f"[ReturnStateMachine] Successfully transitioned Return {return_request_id} from {current_status} to {target_status}.")
            return return_req
