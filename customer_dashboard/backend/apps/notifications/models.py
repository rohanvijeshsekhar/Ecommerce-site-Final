import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


class NotificationCategory(models.TextChoices):
    AUTHENTICATION = "AUTHENTICATION", "Authentication"
    ORDERS         = "ORDERS", "Orders"
    SUPPORT        = "SUPPORT", "Support"
    WARRANTY       = "WARRANTY", "Warranty"
    DEALER         = "DEALER", "Dealer"
    OFFERS         = "OFFERS", "Offers"
    REVIEWS        = "REVIEWS", "Reviews"
    SYSTEM         = "SYSTEM", "System"


class NotificationPriority(models.TextChoices):
    LOW    = "LOW", "Low"
    NORMAL = "NORMAL", "Normal"
    HIGH   = "HIGH", "High"
    URGENT = "URGENT", "Urgent"


class NotificationType(models.TextChoices):
    # Authentication
    LOGIN_NEW_DEVICE      = "LOGIN_NEW_DEVICE", "New Device Login"
    PASSWORD_CHANGED      = "PASSWORD_CHANGED", "Password Changed"
    MOBILE_VERIFIED       = "MOBILE_VERIFIED", "Mobile Verified"
    EMAIL_VERIFIED        = "EMAIL_VERIFIED", "Email Verified"

    # Orders & Payments
    ORDER_PLACED          = "ORDER_PLACED", "Order Placed"
    PAYMENT_SUCCESS       = "PAYMENT_SUCCESS", "Payment Successful"
    ORDER_CONFIRMED       = "ORDER_CONFIRMED", "Order Confirmed"
    ORDER_PACKED          = "ORDER_PACKED", "Order Packed"
    ORDER_SHIPPED         = "ORDER_SHIPPED", "Order Shipped"
    OUT_FOR_DELIVERY      = "OUT_FOR_DELIVERY", "Out For Delivery"
    ORDER_DELIVERED       = "ORDER_DELIVERED", "Order Delivered"
    ORDER_CANCELLED       = "ORDER_CANCELLED", "Order Cancelled"
    REFUND_INITIATED      = "REFUND_INITIATED", "Refund Initiated"
    REFUND_COMPLETED      = "REFUND_COMPLETED", "Refund Completed"
    RETURN_REQUESTED      = "RETURN_REQUESTED", "Return Requested"
    RETURN_APPROVED       = "RETURN_APPROVED", "Return Approved"
    RETURN_REJECTED       = "RETURN_REJECTED", "Return Rejected"

    # Support
    SUPPORT_CREATED       = "SUPPORT_CREATED", "Support Ticket Created"
    SUPPORT_REPLY         = "SUPPORT_REPLY", "Support Ticket Reply"
    SUPPORT_CLOSED        = "SUPPORT_CLOSED", "Support Ticket Closed"

    # Warranty
    WARRANTY_REGISTERED   = "WARRANTY_REGISTERED", "Warranty Registered"
    WARRANTY_APPROVED     = "WARRANTY_APPROVED", "Warranty Approved"

    # Dealer
    DEALER_APPROVED       = "DEALER_APPROVED", "Dealer Application Approved"
    DEALER_REJECTED       = "DEALER_REJECTED", "Dealer Application Rejected"

    # Reviews
    REVIEW_APPROVED       = "REVIEW_APPROVED", "Review Approved"
    REVIEW_REJECTED       = "REVIEW_REJECTED", "Review Rejected"

    # Offers & Marketing
    COUPON_RECEIVED       = "COUPON_RECEIVED", "Coupon Received"
    PRODUCT_BACK_IN_STOCK = "PRODUCT_BACK_IN_STOCK", "Product Back In Stock"
    FLASH_SALE            = "FLASH_SALE", "Flash Sale Alert"


class DeliveryChannel(models.TextChoices):
    IN_APP   = "IN_APP", "In-App"
    SMS      = "SMS", "SMS"
    EMAIL    = "EMAIL", "Email"
    PUSH     = "PUSH", "Push Notification"
    WHATSAPP = "WHATSAPP", "WhatsApp"


class DeliveryStatus(models.TextChoices):
    QUEUED     = "QUEUED", "Queued"
    PROCESSING = "PROCESSING", "Processing"
    SENT       = "SENT", "Sent"
    DELIVERED  = "DELIVERED", "Delivered"
    FAILED     = "FAILED", "Failed"
    RETRYING   = "RETRYING", "Retrying"


class Notification(models.Model):
    """
    Channel-agnostic Notification model representing a single business notification event.
    Multiple Delivery records can be associated with a single Notification.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_index=True,
    )
    idempotency_key = models.CharField(
        max_length=128,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text="Optional unique key to guarantee duplicate-prevention.",
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=64,
        choices=NotificationType.choices,
        default=NotificationType.ORDER_PLACED,
        db_index=True,
    )
    category = models.CharField(
        max_length=32,
        choices=NotificationCategory.choices,
        default=NotificationCategory.SYSTEM,
        db_index=True,
    )
    priority = models.CharField(
        max_length=16,
        choices=NotificationPriority.choices,
        default=NotificationPriority.NORMAL,
    )
    action_url = models.CharField(max_length=500, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notifications"
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["user", "is_read"]),
            models.Index(fields=["user", "category"]),
            models.Index(fields=["user", "notification_type"]),
            models.Index(fields=["user", "expires_at"]),
        ]

    def __str__(self) -> str:
        return f"Notification({self.user.email} - {self.notification_type} - read={self.is_read})"

    @property
    def is_expired(self) -> bool:
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False

    def mark_read(self) -> None:
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at", "updated_at"])


class NotificationDelivery(models.Model):
    """
    Per-channel delivery tracking record for a notification.
    Enables single notifications to deliver via multiple channels (In-App, SMS, Email, Push, WhatsApp).
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True,
    )
    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name="deliveries",
        db_index=True,
    )
    channel = models.CharField(
        max_length=32,
        choices=DeliveryChannel.choices,
        db_index=True,
    )
    status = models.CharField(
        max_length=32,
        choices=DeliveryStatus.choices,
        default=DeliveryStatus.QUEUED,
        db_index=True,
    )
    provider_response = models.JSONField(default=dict, blank=True)
    attempt_count = models.IntegerField(default=0)
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notification_deliveries"
        verbose_name = "Notification Delivery"
        verbose_name_plural = "Notification Deliveries"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["notification", "channel"]),
            models.Index(fields=["channel", "status"]),
        ]

    def __str__(self) -> str:
        return f"Delivery({self.notification_id} - {self.channel} - {self.status})"
