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
    Channel handler for Transactional SMS using SangamamSMSProvider.
    Enforces that SMS is sent only for specified transactional notification types with approved DLT templates.
    """
    channel_name = DeliveryChannel.SMS

    # Allowed SMS types with approved DLT templates
    ALLOWED_SMS_TYPES = {
        NotificationType.ORDER_CONFIRMED,
        NotificationType.ORDER_PLACED,
        NotificationType.REFUND_INITIATED,
        NotificationType.REFUND_COMPLETED,
        NotificationType.RETURN_REQUESTED,
    }

    def deliver(self, notification: Notification, context: Dict[str, Any]) -> NotificationDelivery:
        delivery, _ = NotificationDelivery.objects.get_or_create(
            notification=notification,
            channel=DeliveryChannel.SMS,
            defaults={"status": DeliveryStatus.PROCESSING, "attempt_count": 1},
        )

        user = notification.user
        phone = (
            context.get("phone")
            or getattr(user, "phone_number", None)
            or getattr(getattr(user, "profile", None), "phone_number", None)
            or context.get("mobile")
        )

        if not phone:
            delivery.status = DeliveryStatus.FAILED
            delivery.error_message = "User has no registered phone number for SMS delivery."
            delivery.save(update_fields=["status", "error_message", "updated_at"])
            return delivery

        if notification.notification_type not in self.ALLOWED_SMS_TYPES:
            logger.info(
                f"[SMSChannel] Skipping SMS for notification_type={notification.notification_type} "
                f"(not in approved DLT transactional SMS list)."
            )
            delivery.status = DeliveryStatus.DELIVERED
            delivery.provider_response = {"skipped": True, "reason": "no_approved_dlt_template"}
            delivery.save(update_fields=["status", "provider_response", "updated_at"])
            return delivery

        try:
            from apps.authentication.providers import get_sms_provider, SangamamSMSProvider
            sms_provider = get_sms_provider()

            if notification.notification_type == NotificationType.RETURN_REQUESTED:
                customer_name = (
                    context.get("customer_name")
                    or context.get("first_name")
                    or getattr(user, "full_name", None)
                    or getattr(user, "first_name", None)
                    or "Doctor"
                )
                return_window = context.get("return_window") or context.get("return_days") or "7 days"

                if isinstance(sms_provider, SangamamSMSProvider) or hasattr(sms_provider, "send_return_requested_sms"):
                    result = sms_provider.send_return_requested_sms(
                        target=phone,
                        customer_name=customer_name,
                        return_window=return_window,
                    )
                elif hasattr(sms_provider, "send_sms_detailed"):
                    sms_text = context.get("sms_text", notification.message)
                    result = sms_provider.send_sms_detailed(target=phone, message=sms_text)
                else:
                    result = {"success": True, "status": "mock_accepted"}

            elif notification.notification_type in (NotificationType.REFUND_INITIATED, NotificationType.REFUND_COMPLETED):
                customer_name = (
                    context.get("customer_name")
                    or context.get("first_name")
                    or getattr(user, "full_name", None)
                    or getattr(user, "first_name", None)
                    or "Customer"
                )
                order_number = context.get("order_number") or notification.metadata.get("order_number") or ""
                refund_amount = context.get("refund_amount") or context.get("amount") or ""

                if isinstance(sms_provider, SangamamSMSProvider) or hasattr(sms_provider, "send_refund_processed_sms"):
                    result = sms_provider.send_refund_processed_sms(
                        target=phone,
                        customer_name=customer_name,
                        order_number=order_number,
                        refund_amount=refund_amount,
                    )
                elif hasattr(sms_provider, "send_sms_detailed"):
                    sms_text = context.get("sms_text", notification.message)
                    result = sms_provider.send_sms_detailed(target=phone, message=sms_text)
            elif notification.notification_type == NotificationType.ORDER_SHIPPED:
                customer_name = (
                    context.get("customer_name")
                    or context.get("first_name")
                    or getattr(user, "full_name", None)
                    or getattr(user, "first_name", None)
                    or "Doctor"
                )
                order_number = context.get("order_number") or notification.metadata.get("order_number") or ""

                if isinstance(sms_provider, SangamamSMSProvider) or hasattr(sms_provider, "send_order_shipped_sms"):
                    result = sms_provider.send_order_shipped_sms(
                        target=phone,
                        customer_name=customer_name,
                        order_number=order_number,
                    )
                elif hasattr(sms_provider, "send_sms_detailed"):
                    sms_text = context.get("sms_text", notification.message)
                    result = sms_provider.send_sms_detailed(target=phone, message=sms_text)
                else:
                    result = {"success": True, "status": "mock_accepted"}

            else:
                order_number = context.get("order_number") or notification.metadata.get("order_number") or "FAAZO-ORDER"
                if isinstance(sms_provider, SangamamSMSProvider) or hasattr(sms_provider, "send_order_confirmed_sms"):
                    result = sms_provider.send_order_confirmed_sms(target=phone, order_number=order_number)
                elif hasattr(sms_provider, "send_sms_detailed"):
                    sms_text = context.get("sms_text", notification.message)
                    result = sms_provider.send_sms_detailed(target=phone, message=sms_text)
                elif hasattr(sms_provider, "send_sms"):
                    sms_text = context.get("sms_text", notification.message)
                    success = sms_provider.send_sms(target=phone, message=sms_text)
                    result = {"success": success, "status": "accepted" if success else "failed"}
                else:
                    result = {"success": True, "status": "mock_accepted"}

            if result.get("success"):
                delivery.status = DeliveryStatus.DELIVERED
                delivery.sent_at = timezone.now()
                delivery.provider_response = {
                    "provider": "sangamam",
                    "template_id": result.get("template_id", "1777178496694995515"),
                    "sender_id": result.get("sender_id", "FAZODT"),
                    "entity_id": result.get("entity_id", "1701178461438263453"),
                    "submission_id": result.get("submission_id", ""),
                    "status": result.get("status", "accepted"),
                }
                logger.info(f"[SMSChannel] Transactional SMS delivered to {phone} for {notification.notification_type}")
            else:
                delivery.status = DeliveryStatus.FAILED
                delivery.error_message = result.get("error") or "Sangamam SMS gateway returned failure."
                delivery.provider_response = {
                    "provider": "sangamam",
                    "status": result.get("status", "failed"),
                    "error": result.get("error", "Unknown error"),
                }
                logger.error(f"[SMSChannel Error] Failed to send Sangamam SMS to {phone}: {delivery.error_message}")

        except Exception as exc:
            delivery.status = DeliveryStatus.FAILED
            delivery.error_message = str(exc)
            logger.error(f"[SMSChannel Exception] Exception sending SMS to {phone}: {exc}", exc_info=True)

        delivery.save(update_fields=["status", "sent_at", "provider_response", "error_message", "updated_at"])
        return delivery


class EmailChannel(BaseNotificationChannel):
    """Production Email Notification Delivery Channel (SMTP / Amazon SES)."""
    channel_name = DeliveryChannel.EMAIL

    ALLOWED_EMAIL_TYPES = [
        NotificationType.ORDER_PLACED,
        NotificationType.ORDER_CONFIRMED,
        NotificationType.PAYMENT_SUCCESS,
        NotificationType.ORDER_SHIPPED,
        NotificationType.ORDER_DELIVERED,
        NotificationType.ORDER_CANCELLED,
        NotificationType.PASSWORD_CHANGED,
        NotificationType.EMAIL_VERIFIED,
        NotificationType.SUPPORT_REPLY,
        NotificationType.WARRANTY_APPROVED,
        NotificationType.RETURN_REQUESTED,
        NotificationType.RETURN_APPROVED,
        NotificationType.RETURN_REJECTED,
        NotificationType.REFUND_COMPLETED,
    ]

    TEMPLATE_MAP = {
        NotificationType.ORDER_PLACED: "emails/order_placed",
        NotificationType.PAYMENT_SUCCESS: "emails/payment_success",
        NotificationType.ORDER_CONFIRMED: "emails/order_placed",
        NotificationType.ORDER_SHIPPED: "emails/order_shipped",
        NotificationType.ORDER_DELIVERED: "emails/order_delivered",
        NotificationType.ORDER_CANCELLED: "emails/order_cancelled",
        NotificationType.SUPPORT_REPLY: "emails/support_reply",
        NotificationType.WARRANTY_APPROVED: "emails/warranty_approved",
        NotificationType.PASSWORD_CHANGED: "emails/password_reset_success",
        NotificationType.EMAIL_VERIFIED: "emails/email_verify",
        NotificationType.RETURN_REQUESTED: "emails/return_requested",
        NotificationType.RETURN_APPROVED: "emails/return_approved",
        NotificationType.RETURN_REJECTED: "emails/return_rejected",
        NotificationType.REFUND_COMPLETED: "emails/refund_completed",
    }

    def deliver(self, notification: Notification, context: Dict[str, Any]) -> NotificationDelivery:
        from django.core.mail import EmailMultiAlternatives
        from django.template.loader import render_to_string
        from django.conf import settings

        delivery, created = NotificationDelivery.objects.get_or_create(
            notification=notification,
            channel=DeliveryChannel.EMAIL,
            defaults={
                "status": DeliveryStatus.QUEUED,
                "provider_response": {"provider": "Django EmailBackend", "status": "queued"},
            },
        )

        # Idempotency guard: do not re-deliver if already delivered
        if not created and delivery.status == DeliveryStatus.DELIVERED:
            logger.info(
                f"[EmailChannel] Skipping already delivered email notification {notification.id} "
                f"to user {notification.user.email}"
            )
            return delivery

        user_email = context.get("email") or getattr(notification.user, "email", "")
        if not user_email:
            delivery.status = DeliveryStatus.FAILED
            delivery.error_message = "User has no recipient email address."
            delivery.save(update_fields=["status", "error_message", "updated_at"])
            logger.warning(f"[EmailChannel] Cannot send email for notification {notification.id}: missing email address.")
            return delivery

        template_prefix = self.TEMPLATE_MAP.get(
            notification.notification_type, "emails/order_placed"
        )
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "FAAZO <noreply@faazo.com>")
        subject = notification.title or f"FAAZO Notification: {notification.get_notification_type_display()}"

        # Combine context dictionary
        email_context = {
            "first_name": getattr(notification.user, "full_name", None) or "Doctor",
            "action_url": notification.action_url or getattr(settings, "FRONTEND_URL", "http://localhost:5173"),
            "notification_title": notification.title,
            "notification_message": notification.message,
            **context,
        }

        try:
            try:
                html_content = render_to_string(f"{template_prefix}.html", email_context)
            except Exception as e:
                logger.warning(f"[EmailChannel] Failed to render HTML template {template_prefix}.html: {e}")
                html_content = None

            try:
                text_content = render_to_string(f"{template_prefix}.txt", email_context)
            except Exception:
                text_content = (
                    f"Hello {email_context.get('first_name', '')},\n\n"
                    f"{notification.message or 'You have a new update on FAAZO Dental Solutions.'}\n\n"
                    f"View details: {email_context.get('action_url')}"
                )

            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=from_email,
                to=[user_email],
            )

            if html_content:
                msg.attach_alternative(html_content, "text/html")

            # Support optional file attachments passed in context
            attachments = context.get("attachments", [])
            for attachment in attachments:
                # Attachment tuple: (filename, content, mime_type)
                if isinstance(attachment, (tuple, list)) and len(attachment) == 3:
                    msg.attach(attachment[0], attachment[1], attachment[2])

            # Auto-attach official GST Tax Invoice PDF for order placement / payment emails
            order_id = context.get("order_id") or (notification.metadata and notification.metadata.get("order_id"))
            if order_id or notification.notification_type in [NotificationType.ORDER_PLACED, NotificationType.PAYMENT_SUCCESS]:
                try:
                    from apps.orders.models import Order
                    from apps.orders.invoice import generate_gst_invoice_pdf
                    order_obj = Order.objects.filter(pk=order_id).first() if order_id else None
                    if not order_obj and notification.metadata and notification.metadata.get("order_id"):
                        order_obj = Order.objects.filter(pk=notification.metadata.get("order_id")).first()

                    if order_obj:
                        pdf_bytes = generate_gst_invoice_pdf(order_obj)
                        inv_num = order_obj.invoice_number or f"INV-{order_obj.order_number}"
                        msg.attach(f"FAAZO-Invoice-{inv_num}.pdf", pdf_bytes, "application/pdf")
                except Exception as pdf_err:
                    logger.warning(f"[EmailChannel] Failed to attach PDF invoice for notification {notification.id}: {pdf_err}")

            msg.send(fail_silently=False)

            delivery.status = DeliveryStatus.DELIVERED
            delivery.sent_at = timezone.now()
            delivery.provider_response = {
                "provider": getattr(settings, "EMAIL_BACKEND", "smtp"),
                "status": "sent",
                "recipient": user_email,
                "sent_at": delivery.sent_at.isoformat(),
            }
            delivery.error_message = ""
            logger.info(f"[EmailChannel SUCCESS] Dispatched email for notification {notification.id} to {user_email}")

        except Exception as exc:
            delivery.status = DeliveryStatus.FAILED
            delivery.error_message = str(exc)
            delivery.provider_response = {
                "provider": getattr(settings, "EMAIL_BACKEND", "smtp"),
                "status": "error",
                "error": str(exc),
            }
            logger.error(f"[EmailChannel Exception] Failed sending email for notification {notification.id} to {user_email}: {exc}", exc_info=True)
            delivery.save(update_fields=["status", "sent_at", "provider_response", "error_message", "updated_at"])
            raise exc

        delivery.save(update_fields=["status", "sent_at", "provider_response", "error_message", "updated_at"])
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
