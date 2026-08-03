"""
FAAZO – Notification Template Engine
Centralized templates for transactional SMS and notification content generation.
"""

from typing import Dict, Any, Tuple
from apps.notifications.models import NotificationType


class NotificationTemplateEngine:
    """
    Centralized template store and variable renderer for all notification channels.
    """

    TEMPLATES: Dict[str, Dict[str, str]] = {
        NotificationType.ORDER_PLACED: {
            "title": "Order Placed Successfully",
            "message": "Hi {first_name}, your order #{order_number} for ₹{total_amount} has been placed.",
            "sms": "FAAZO: Hi {first_name}, your order #{order_number} for Rs.{total_amount} has been placed. Thank you for shopping with FAAZO!",
        },
        NotificationType.ORDER_CONFIRMED: {
            "title": "Order Confirmed",
            "message": "Your order #{order_number} has been confirmed and is being processed.",
            "sms": "FAAZO: Order #{order_number} confirmed! We are preparing your item(s). Track your order on www.fazo.in.",
        },
        NotificationType.ORDER_PACKED: {
            "title": "Order Packed",
            "message": "Your order #{order_number} has been packed and is ready for dispatch.",
            "sms": "FAAZO: Order #{order_number} packed and ready for dispatch.",
        },
        NotificationType.ORDER_SHIPPED: {
            "title": "Order Shipped",
            "message": "Your order #{order_number} has been shipped via {courier_name}. AWB: {awb_number}.",
            "sms": "FAAZO: Order #{order_number} shipped via {courier_name} (AWB: {awb_number}). Track on www.fazo.in.",
        },
        NotificationType.OUT_FOR_DELIVERY: {
            "title": "Out For Delivery",
            "message": "Your order #{order_number} is out for delivery today. OTP: {delivery_otp}.",
            "sms": "FAAZO: Order #{order_number} is out for delivery today. Share delivery OTP {delivery_otp} with courier agent.",
        },
        NotificationType.ORDER_DELIVERED: {
            "title": "Order Delivered",
            "message": "Your order #{order_number} has been delivered successfully. Thank you for choosing FAAZO!",
            "sms": "FAAZO: Order #{order_number} delivered successfully. We hope to serve you again on www.fazo.in!",
        },
        NotificationType.ORDER_CANCELLED: {
            "title": "Order Cancelled",
            "message": "Your order #{order_number} has been cancelled. Reason: {reason}.",
            "sms": "FAAZO: Order #{order_number} has been cancelled. Reason: {reason}.",
        },
        NotificationType.REFUND_INITIATED: {
            "title": "Refund Initiated",
            "message": "Refund of ₹{refund_amount} for order #{order_number} has been initiated.",
            "sms": "FAAZO: Refund of Rs.{refund_amount} for order #{order_number} initiated. Will reflect in 3-5 business days.",
        },
        NotificationType.REFUND_COMPLETED: {
            "title": "Refund Completed",
            "message": "Refund of ₹{refund_amount} for order #{order_number} completed. Reference: {txn_id}.",
            "sms": "FAAZO: Refund of Rs.{refund_amount} for order #{order_number} completed. Ref: {txn_id}.",
        },
        NotificationType.PASSWORD_CHANGED: {
            "title": "Password Changed Successfully",
            "message": "The password for your FAAZO account ({email}) was recently updated.",
            "sms": "FAAZO Security: The password for your account {email} was changed recently. If this wasn't you, contact support immediately.",
        },
        NotificationType.LOGIN_NEW_DEVICE: {
            "title": "New Device Login Detected",
            "message": "A new login to your account was detected from {device_name} ({ip_address}).",
            "sms": "FAAZO Security Alert: New login to your account from {device_name} ({ip_address}).",
        },
        NotificationType.SUPPORT_CREATED: {
            "title": "Support Ticket Created",
            "message": "Ticket #{ticket_id} ('{subject}') created. Our team will respond shortly.",
            "sms": "FAAZO Support: Ticket #{ticket_id} created. We will update you shortly.",
        },
        NotificationType.SUPPORT_REPLY: {
            "title": "New Support Reply",
            "message": "New response on ticket #{ticket_id}: '{reply_snippet}'",
            "sms": "FAAZO Support: New reply on ticket #{ticket_id}. Check your account dashboard.",
        },
        NotificationType.DEALER_APPROVED: {
            "title": "Dealer Account Approved",
            "message": "Congratulations! Your FAAZO Dealer application has been approved.",
            "sms": "FAAZO: Congratulations! Your Dealer application has been approved. Log in to access wholesale pricing.",
        },
        NotificationType.DEALER_REJECTED: {
            "title": "Dealer Application Update",
            "message": "Your FAAZO Dealer application status update: {reason}.",
            "sms": "FAAZO: Update on your Dealer application: {reason}.",
        },
        NotificationType.WARRANTY_REGISTERED: {
            "title": "Warranty Registered",
            "message": "Warranty registration submitted for product: {product_name} (Serial: {serial_number}).",
            "sms": "FAAZO Warranty: Registration received for {product_name} (Serial: {serial_number}).",
        },
        NotificationType.COUPON_RECEIVED: {
            "title": "Special Offer Coupon Received!",
            "message": "You received coupon '{coupon_code}' for {discount_text} off your next order!",
            "sms": "FAAZO Offer: Use code {coupon_code} to get {discount_text} off on www.fazo.in!",
        },
    }

    @classmethod
    def render(cls, notification_type: str, context: Dict[str, Any]) -> Tuple[str, str, str]:
        """
        Renders title, message, and SMS string for a given notification_type and context dictionary.
        Returns: (title, message, sms_text)
        """
        tmpl = cls.TEMPLATES.get(notification_type, {})
        title_tmpl = tmpl.get("title", f"Notification: {notification_type}")
        msg_tmpl = tmpl.get("message", "You have a new update on FAAZO Marketplace.")
        sms_tmpl = tmpl.get("sms", msg_tmpl)

        # Safe formatting with fallback to empty string
        safe_ctx = {k: str(v) for k, v in context.items()}
        title = cls._safe_format(title_tmpl, safe_ctx)
        message = cls._safe_format(msg_tmpl, safe_ctx)
        sms_text = cls._safe_format(sms_tmpl, safe_ctx)

        return title, message, sms_text

    @staticmethod
    def _safe_format(template_str: str, context: Dict[str, str]) -> str:
        try:
            return template_str.format(**context)
        except KeyError:
            # If missing context keys, replace gracefully
            import re
            return re.sub(r"\{(\w+)\}", lambda m: context.get(m.group(1), f"<{m.group(1)}>"), template_str)
