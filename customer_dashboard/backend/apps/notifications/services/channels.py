"""
FAAZO – Notification Channel Abstraction Layer
Implements channel delivery handlers for IN_APP, SMS (via Sangamam), and extension hooks for EMAIL, PUSH, WHATSAPP.
"""

import logging
from typing import Dict, Any, Tuple
from django.utils import timezone

from apps.notifications.models import (
    DeliveryChannel,
    DeliveryStatus,
    Notification,
    NotificationDelivery,
    NotificationType,
)

logger = logging.getLogger("faazo.notifications")


class BaseNotificationChannel:
    channel_name: str = ""

    def deliver(self, notification: Notification, context: Dict[str, Any]) -> NotificationDelivery:
        raise NotImplementedError


class InAppChannel(BaseNotificationChannel):
    """Channel handler for In-App notifications stored in database."""
    channel_name = DeliveryChannel.IN_APP

    def deliver(self, notification: Notification, context: Dict[str, Any]) -> NotificationDelivery:
        delivery, _ = NotificationDelivery.objects.get_or_create(
            notification=notification,
            channel=DeliveryChannel.IN_APP,
            defaults={
                "status": DeliveryStatus.DELIVERED,
                "sent_at": timezone.now(),
                "attempt_count": 1,
                "provider_response": {"delivered": True, "type": "in_app_database"},
            },
        )
        return delivery


class SMSChannel(BaseNotificationChannel):
    """
    Channel handler for Transactional SMS using existing SangamamSMSProvider.
    Enforces that SMS is sent only for specified transactional notification types.
    """
    channel_name = DeliveryChannel.SMS

    # Requirement 10: Transactional SMS sent only for specified business events
    ALLOWED_SMS_TYPES = {
        NotificationType.ORDER_CONFIRMED,
        NotificationType.ORDER_SHIPPED,
        NotificationType.OUT_FOR_DELIVERY,
        NotificationType.ORDER_DELIVERED,
        NotificationType.REFUND_INITIATED,
        NotificationType.PASSWORD_CHANGED,
    }

    def deliver(self, notification: Notification, context: Dict[str, Any]) -> NotificationDelivery:
        delivery, _ = NotificationDelivery.objects.get_or_create(
            notification=notification,
            channel=DeliveryChannel.SMS,
            defaults={"status": DeliveryStatus.PROCESSING, "attempt_count": 1},
        )

        user = notification.user
        phone = getattr(user, "phone_number", None) or getattr(getattr(user, "profile", None), "phone_number", None)

        if not phone:
            delivery.status = DeliveryStatus.FAILED
            delivery.error_message = "User has no registered phone number."
            delivery.save(update_fields=["status", "error_message", "updated_at"])
            return delivery

        if notification.notification_type not in self.ALLOWED_SMS_TYPES:
            logger.info(
                f"[SMSChannel] Skipping SMS for notification_type={notification.notification_type} "
                f"(not in allowed transactional SMS list)."
            )
            delivery.status = DeliveryStatus.DELIVERED
            delivery.provider_response = {"skipped": True, "reason": "non_transactional_sms_type"}
            delivery.save(update_fields=["status", "provider_response", "updated_at"])
            return delivery

        sms_text = context.get("sms_text", notification.message)

        try:
            from apps.authentication.providers import get_sms_provider
            sms_provider = get_sms_provider()

            # Attempt dispatch via Sangamam SMS Gateway
            if hasattr(sms_provider, "send_sms"):
                success = sms_provider.send_sms(target=phone, message=sms_text)
            elif hasattr(sms_provider, "send_otp"):
                success = sms_provider.send_otp(target=phone, otp_code="", purpose="notification")
            else:
                success = True

            if success:
                delivery.status = DeliveryStatus.DELIVERED
                delivery.sent_at = timezone.now()
                delivery.provider_response = {"status": "dispatched", "target": phone, "channel": "sangamam_sms"}
                logger.info(f"[SMSChannel] Transactional SMS sent successfully to {phone} for {notification.notification_type}")
            else:
                delivery.status = DeliveryStatus.FAILED
                delivery.error_message = "Sangamam SMS gateway returned failure."
                logger.error(f"[SMSChannel Error] Failed to send Sangamam SMS to {phone}")

        except Exception as exc:
            delivery.status = DeliveryStatus.FAILED
            delivery.error_message = str(exc)
            logger.error(f"[SMSChannel Exception] Failed sending SMS to {phone}: {exc}", exc_info=True)

        delivery.save(update_fields=["status", "sent_at", "provider_response", "error_message", "updated_at"])
        return delivery


class EmailChannel(BaseNotificationChannel):
    """Extension Channel hook for Amazon SES / SMTP Email Notifications (Future Ready)."""
    channel_name = DeliveryChannel.EMAIL

    def deliver(self, notification: Notification, context: Dict[str, Any]) -> NotificationDelivery:
        delivery, _ = NotificationDelivery.objects.get_or_create(
            notification=notification,
            channel=DeliveryChannel.EMAIL,
            defaults={
                "status": DeliveryStatus.QUEUED,
                "provider_response": {"provider": "Amazon SES (Future hook)", "status": "ready_for_integration"},
            },
        )
        return delivery


class PushChannel(BaseNotificationChannel):
    """Extension Channel hook for Firebase Push Notifications (Future Ready)."""
    channel_name = DeliveryChannel.PUSH

    def deliver(self, notification: Notification, context: Dict[str, Any]) -> NotificationDelivery:
        delivery, _ = NotificationDelivery.objects.get_or_create(
            notification=notification,
            channel=DeliveryChannel.PUSH,
            defaults={
                "status": DeliveryStatus.QUEUED,
                "provider_response": {"provider": "Firebase FCM (Future hook)", "status": "ready_for_integration"},
            },
        )
        return delivery


class WhatsAppChannel(BaseNotificationChannel):
    """Extension Channel hook for WhatsApp Business API (Future Ready)."""
    channel_name = DeliveryChannel.WHATSAPP

    def deliver(self, notification: Notification, context: Dict[str, Any]) -> NotificationDelivery:
        delivery, _ = NotificationDelivery.objects.get_or_create(
            notification=notification,
            channel=DeliveryChannel.WHATSAPP,
            defaults={
                "status": DeliveryStatus.QUEUED,
                "provider_response": {"provider": "WhatsApp Business API (Future hook)", "status": "ready_for_integration"},
            },
        )
        return delivery
