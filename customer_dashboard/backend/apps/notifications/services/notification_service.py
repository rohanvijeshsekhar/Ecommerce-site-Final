"""
FAAZO – Centralized Enterprise Notification Service
Single source of truth for all notifications platform-wide.
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from django.db import models
from django.utils import timezone

from apps.authentication.services import AuditService
from apps.notifications.models import (
    DeliveryChannel,
    DeliveryStatus,
    Notification,
    NotificationCategory,
    NotificationDelivery,
    NotificationPriority,
    NotificationType,
)
from apps.notifications.services.channels import (
    InAppChannel,
    SMSChannel,
    EmailChannel,
    PushChannel,
    WhatsAppChannel,
)
from apps.notifications.services.templates import NotificationTemplateEngine
from apps.notifications.signals import notification_created

logger = logging.getLogger("faazo.notifications")


class NotificationService:
    """
    Enterprise Notification Service providing centralized notification creation,
    idempotent deduplication, channel dispatching, template rendering, and audit logging.
    """

    CHANNEL_HANDLERS = {
        DeliveryChannel.IN_APP: InAppChannel(),
        DeliveryChannel.SMS: SMSChannel(),
        DeliveryChannel.EMAIL: EmailChannel(),
        DeliveryChannel.PUSH: PushChannel(),
        DeliveryChannel.WHATSAPP: WhatsAppChannel(),
    }

    # Default category mapping for notification types
    TYPE_CATEGORY_MAP = {
        NotificationType.LOGIN_NEW_DEVICE: NotificationCategory.AUTHENTICATION,
        NotificationType.PASSWORD_CHANGED: NotificationCategory.AUTHENTICATION,
        NotificationType.MOBILE_VERIFIED: NotificationCategory.AUTHENTICATION,
        NotificationType.EMAIL_VERIFIED: NotificationCategory.AUTHENTICATION,

        NotificationType.ORDER_PLACED: NotificationCategory.ORDERS,
        NotificationType.PAYMENT_SUCCESS: NotificationCategory.ORDERS,
        NotificationType.ORDER_CONFIRMED: NotificationCategory.ORDERS,
        NotificationType.ORDER_PACKED: NotificationCategory.ORDERS,
        NotificationType.ORDER_SHIPPED: NotificationCategory.ORDERS,
        NotificationType.OUT_FOR_DELIVERY: NotificationCategory.ORDERS,
        NotificationType.ORDER_DELIVERED: NotificationCategory.ORDERS,
        NotificationType.ORDER_CANCELLED: NotificationCategory.ORDERS,
        NotificationType.REFUND_INITIATED: NotificationCategory.ORDERS,
        NotificationType.REFUND_COMPLETED: NotificationCategory.ORDERS,

        NotificationType.SUPPORT_CREATED: NotificationCategory.SUPPORT,
        NotificationType.SUPPORT_REPLY: NotificationCategory.SUPPORT,
        NotificationType.SUPPORT_CLOSED: NotificationCategory.SUPPORT,

        NotificationType.WARRANTY_REGISTERED: NotificationCategory.WARRANTY,
        NotificationType.WARRANTY_APPROVED: NotificationCategory.WARRANTY,

        NotificationType.DEALER_APPROVED: NotificationCategory.DEALER,
        NotificationType.DEALER_REJECTED: NotificationCategory.DEALER,

        NotificationType.REVIEW_APPROVED: NotificationCategory.REVIEWS,
        NotificationType.REVIEW_REJECTED: NotificationCategory.REVIEWS,

        NotificationType.COUPON_RECEIVED: NotificationCategory.OFFERS,
        NotificationType.PRODUCT_BACK_IN_STOCK: NotificationCategory.OFFERS,
        NotificationType.FLASH_SALE: NotificationCategory.OFFERS,
    }

    @classmethod
    def create(
        cls,
        user,
        notification_type: str,
        title: Optional[str] = None,
        message: Optional[str] = None,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        action_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
        channels: Optional[List[str]] = None,
        expires_at: Optional[Any] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Notification:
        """
        Creates a new notification and dispatches it to configured channels.

        - Idempotency Protection: Prevents duplicate creation if idempotency_key matches an existing record.
        - Template Rendering: Automatically generates title, message, and sms_text if not provided.
        - Asynchronous / Queue Ready: Decouples notification storage from channel delivery.
        """
        if not user:
            raise ValueError("User reference is required to create a notification.")

        metadata = metadata or {}
        context = context or metadata

        # Requirement 2: Idempotency Protection
        if idempotency_key:
            existing = Notification.objects.filter(idempotency_key=idempotency_key).first()
            if existing:
                logger.info(f"[NotificationService] Idempotency key match: '{idempotency_key}'. Returning existing notification {existing.id}.")
                return existing

        # Template Rendering
        rendered_title, rendered_msg, rendered_sms = NotificationTemplateEngine.render(
            notification_type, context
        )
        final_title = title or rendered_title
        final_message = message or rendered_msg

        # Determine Category & Priority
        final_category = category or cls.TYPE_CATEGORY_MAP.get(notification_type, NotificationCategory.SYSTEM)
        final_priority = priority or NotificationPriority.NORMAL

        # Persist Notification
        notification = Notification.objects.create(
            user=user,
            idempotency_key=idempotency_key,
            title=final_title,
            message=final_message,
            notification_type=notification_type,
            category=final_category,
            priority=final_priority,
            action_url=action_url,
            metadata=metadata,
            expires_at=expires_at,
        )

        # Requirement 1 & 10: Determine Target Channels
        target_channels = channels or [DeliveryChannel.IN_APP]
        if notification_type in SMSChannel.ALLOWED_SMS_TYPES and DeliveryChannel.SMS not in target_channels:
            target_channels.append(DeliveryChannel.SMS)

        # Execute Deliveries via Channel Handlers
        deliveries = []
        delivery_ctx = {**context, "sms_text": rendered_sms}

        for ch in target_channels:
            handler = cls.CHANNEL_HANDLERS.get(ch)
            if handler:
                try:
                    deliv = handler.deliver(notification, delivery_ctx)
                    deliveries.append(deliv)
                except Exception as exc:
                    logger.error(f"[NotificationService Error] Channel '{ch}' delivery failed: {exc}", exc_info=True)

        # Requirement 9: Emit Signal Event for subscribers (WebSockets, SSE, FCM)
        try:
            notification_created.send(
                sender=cls,
                notification=notification,
                context=delivery_ctx,
                deliveries=deliveries,
            )
        except Exception as sig_err:
            logger.warning(f"[NotificationService Warning] Signal emission failed: {sig_err}")

        # Audit Event Logging
        AuditService.log_event(
            action="NOTIFICATION_CREATED",
            user=user,
            status="SUCCESS",
            details={
                "notification_id": str(notification.id),
                "notification_type": notification_type,
                "category": final_category,
                "channels": target_channels,
            },
        )

        logger.info(f"[NotificationService] Notification {notification.id} ({notification_type}) created for {user.email}.")
        return notification

    @classmethod
    def get_notifications(
        cls,
        user,
        category: Optional[str] = None,
        is_read: Optional[bool] = None,
        priority: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ):
        """
        Returns a filtered queryset of active (non-expired) notifications for the specified user.
        Uses select_related and prefetch_related to eliminate N+1 queries.
        """
        now = timezone.now()
        qs = (
            Notification.objects.filter(user=user)
            .filter(models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now))
            .select_related("user")
            .prefetch_related("deliveries")
        )

        if category:
            qs = qs.filter(category=category)
        if is_read is not None:
            qs = qs.filter(is_read=is_read)
        if priority:
            qs = qs.filter(priority=priority)

        return qs

    @classmethod
    def get_unread_count(cls, user) -> int:
        """Requirement 8: Optimized unread count query excluding expired notifications."""
        now = timezone.now()
        return (
            Notification.objects.filter(user=user, is_read=False)
            .filter(models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now))
            .count()
        )

    @classmethod
    def mark_as_read(cls, notification_id: str, user) -> Tuple[bool, Optional[Notification], str]:
        """Marks a specific notification as read."""
        try:
            notification = Notification.objects.get(id=notification_id, user=user)
        except Notification.DoesNotExist:
            return False, None, "Notification not found."

        notification.mark_read()

        AuditService.log_event(
            action="NOTIFICATION_READ",
            user=user,
            status="SUCCESS",
            details={"notification_id": str(notification.id)},
        )
        return True, notification, "Notification marked as read."

    @classmethod
    def mark_all_as_read(cls, user) -> int:
        """Requirement 8: Bulk mark-as-read operation."""
        updated_count = Notification.objects.filter(user=user, is_read=False).update(
            is_read=True, read_at=timezone.now(), updated_at=timezone.now()
        )

        AuditService.log_event(
            action="NOTIFICATION_READ",
            user=user,
            status="SUCCESS",
            details={"bulk_count": updated_count},
        )
        return updated_count

    @classmethod
    def delete_notification(cls, notification_id: str, user) -> Tuple[bool, str]:
        """Deletes a specific notification."""
        deleted_count, _ = Notification.objects.filter(id=notification_id, user=user).delete()
        if deleted_count > 0:
            AuditService.log_event(
                action="NOTIFICATION_DELETED",
                user=user,
                status="SUCCESS",
                details={"notification_id": str(notification_id)},
            )
            return True, "Notification deleted."
        return False, "Notification not found."

    @classmethod
    def delete_all_notifications(cls, user) -> int:
        """Requirement 8: Bulk delete operation for user."""
        deleted_count, _ = Notification.objects.filter(user=user).delete()

        AuditService.log_event(
            action="NOTIFICATION_DELETED",
            user=user,
            status="SUCCESS",
            details={"bulk_count": deleted_count},
        )
        return deleted_count
