"""
FAAZO – Payment Models

Stores payment transactions and webhook events for Razorpay integration.
All payment records are immutable audit entries — never delete or modify
historical payment data.
"""

from django.conf import settings
from django.db import models

from apps.common.mixins import BaseModel


class PaymentStatus(models.TextChoices):
    CREATED    = "created",    "Created"
    AUTHORIZED = "authorized", "Authorized"
    CAPTURED   = "captured",   "Captured"
    FAILED     = "failed",     "Failed"
    REFUNDED   = "refunded",   "Refunded"


class Payment(BaseModel):
    """
    Records every payment attempt against a Razorpay order.

    Lifecycle:
      1. Created (Razorpay order created, awaiting user payment)
      2. Authorized / Captured (payment successful, signature verified)
      3. Failed (payment rejected or signature invalid)
      4. Refunded (refund processed via webhook)
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payments",
        verbose_name="User",
    )

    # Razorpay identifiers
    razorpay_order_id = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        verbose_name="Razorpay Order ID",
    )
    razorpay_payment_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="Razorpay Payment ID",
    )
    razorpay_signature = models.CharField(
        max_length=256,
        blank=True,
        default="",
        verbose_name="Razorpay Signature",
    )

    # Financial
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Amount (INR)",
    )
    currency = models.CharField(
        max_length=3,
        default="INR",
        verbose_name="Currency",
    )

    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.CREATED,
        db_index=True,
        verbose_name="Status",
    )
    payment_method = models.CharField(
        max_length=50,
        blank=True,
        default="",
        verbose_name="Payment Method",
    )

    # Link to Order (set after successful verification)
    order = models.OneToOneField(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment",
        verbose_name="Order",
    )

    # Idempotency – prevents duplicate payment creation for same checkout
    idempotency_key = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        verbose_name="Idempotency Key",
    )

    # Checkout context snapshot (used during verification to recreate order)
    checkout_data = models.JSONField(
        default=dict,
        verbose_name="Checkout Data Snapshot",
        help_text="Address ID, delivery method, items, pricing — frozen at order creation time.",
    )

    # Razorpay full response (audit trail)
    gateway_response = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Gateway Response",
    )

    # Error tracking
    error_code = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="Error Code",
    )
    error_description = models.TextField(
        blank=True,
        default="",
        verbose_name="Error Description",
    )

    # Verification timestamp
    verified_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Verified At",
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Payment"
        verbose_name_plural = "Payments"
        indexes = [
            models.Index(fields=["user", "status"], name="payment_user_status_idx"),
        ]

    def __str__(self):
        return f"Payment {self.razorpay_order_id} – {self.status} – ₹{self.amount}"


class WebhookEvent(BaseModel):
    """
    Logs every incoming Razorpay webhook event for auditing
    and idempotent processing.
    """

    event_id = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        verbose_name="Razorpay Event ID",
    )
    event_type = models.CharField(
        max_length=100,
        verbose_name="Event Type",
        help_text="e.g. payment.captured, payment.failed, refund.created",
    )
    payload = models.JSONField(
        default=dict,
        verbose_name="Event Payload",
    )
    processed = models.BooleanField(
        default=False,
        verbose_name="Processed",
    )
    processing_error = models.TextField(
        blank=True,
        default="",
        verbose_name="Processing Error",
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Webhook Event"
        verbose_name_plural = "Webhook Events"

    def __str__(self):
        return f"{self.event_type} – {self.event_id} – {'✓' if self.processed else '✗'}"
