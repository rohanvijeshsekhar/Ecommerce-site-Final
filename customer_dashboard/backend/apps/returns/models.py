"""
FAAZO – Production-Grade Returns, Refunds & Replacements Models

Domain models for returns management:
- ReturnRequest: Master return/replacement record.
- ReturnItem: Line-item breakdown of returned items and quantities.
- ReturnEvidence: Uploaded images/documents verifying defect/damage.
- ReturnEvent: Append-only audit stream for status transitions.
- Refund: Authoritative ledger record for Razorpay payment refunds.
- ReturnShipment: Courier return pickup tracking record.
"""

from django.conf import settings
from django.db import models
from apps.common.mixins import BaseModel
from apps.orders.models import Order, OrderItem
from apps.payments.models import Payment


class ReturnRequestType(models.TextChoices):
    RETURN_REFUND = "return_refund", "Return & Refund"
    RETURN_REPLACEMENT = "return_replacement", "Return & Replacement"


class ReturnStatus(models.TextChoices):
    REQUESTED = "requested", "Requested"
    UNDER_REVIEW = "under_review", "Under Review"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    PICKUP_PENDING = "pickup_pending", "Pickup Pending"
    PICKUP_SCHEDULED = "pickup_scheduled", "Pickup Scheduled"
    ITEM_RECEIVED = "item_received", "Item Received"
    QC_PENDING = "qc_pending", "QC Pending"
    QC_PASSED = "qc_passed", "QC Passed"
    QC_FAILED = "qc_failed", "QC Failed"
    REFUND_PENDING = "refund_pending", "Refund Pending"
    REFUND_PROCESSING = "refund_processing", "Refund Processing"
    REFUNDED = "refunded", "Refunded"
    REPLACEMENT_PENDING = "replacement_pending", "Replacement Pending"
    REPLACEMENT_PROCESSING = "replacement_processing", "Replacement Processing"
    REPLACEMENT_SHIPPED = "replacement_shipped", "Replacement Shipped"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class ReturnReason(models.TextChoices):
    DAMAGED = "damaged", "Product Damaged in Transit"
    DEFECTIVE = "defective", "Defective / Not Working"
    WRONG_ITEM = "wrong_item", "Wrong Item Received"
    WRONG_SIZE = "wrong_size", "Wrong Size / Specification"
    MISSING_PART = "missing_part", "Missing Parts / Accessories"
    NOT_AS_DESCRIBED = "not_as_described", "Not as Described"
    OTHER = "other", "Other"


class EvidenceType(models.TextChoices):
    PRODUCT_DAMAGE = "product_damage", "Product Damage Photo"
    PACKAGE_DAMAGE = "package_damage", "Package Damage Photo"
    WRONG_ITEM = "wrong_item", "Wrong Item Photo"
    OTHER = "other", "Other Evidence"


class RefundStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PROCESSING = "processing", "Processing"
    SUCCESS = "success", "Success"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"
    UNKNOWN_RECONCILIATION = "unknown_reconciliation", "Requires Reconciliation"


class ReturnPickupStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SCHEDULED = "scheduled", "Scheduled"
    PICKED_UP = "picked_up", "Picked Up"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


class ReturnRequest(BaseModel):
    """
    Master Return / Replacement Request model.
    """
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="return_requests",
        verbose_name="Customer",
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="return_requests",
        verbose_name="Original Order",
    )
    request_type = models.CharField(
        max_length=30,
        choices=ReturnRequestType.choices,
        default=ReturnRequestType.RETURN_REFUND,
        verbose_name="Request Type",
    )
    status = models.CharField(
        max_length=30,
        choices=ReturnStatus.choices,
        default=ReturnStatus.REQUESTED,
        db_index=True,
        verbose_name="Return Status",
    )
    reason = models.CharField(
        max_length=30,
        choices=ReturnReason.choices,
        verbose_name="Return Reason",
    )
    customer_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Customer Description",
    )
    admin_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Admin Review Notes",
    )
    rejection_reason = models.TextField(
        blank=True,
        default="",
        verbose_name="Rejection Reason",
    )
    total_refund_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        verbose_name="Total Calculated Refund Amount",
    )
    replacement_order = models.ForeignKey(
        Order,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replacement_source_returns",
        verbose_name="Replacement Order",
    )
    is_inventory_restored = models.BooleanField(
        default=False,
        verbose_name="Is Inventory Restored",
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Return Request"
        verbose_name_plural = "Return Requests"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["customer", "-created_at"], name="return_cust_created_idx"),
            models.Index(fields=["status", "-created_at"], name="return_status_created_idx"),
            models.Index(fields=["order", "status"], name="return_order_status_idx"),
        ]

    def __str__(self):
        return f"Return {str(self.id)[:8]} - Order {self.order.order_number or str(self.order.id)[:8]} ({self.get_status_display()})"


class ReturnItem(BaseModel):
    """
    Individual item and quantity included in a ReturnRequest.
    """
    return_request = models.ForeignKey(
        ReturnRequest,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Return Request",
    )
    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.CASCADE,
        related_name="return_items",
        verbose_name="Original Order Item",
    )
    requested_quantity = models.PositiveIntegerField(
        verbose_name="Requested Quantity",
    )
    approved_quantity = models.PositiveIntegerField(
        default=0,
        verbose_name="Approved Quantity",
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Unit Price Snapshot",
    )
    refund_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        verbose_name="Line Refund Amount",
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Return Item"
        verbose_name_plural = "Return Items"

    def __str__(self):
        return f"{self.requested_quantity}x {self.order_item.product.name} (Return {str(self.return_request.id)[:8]})"


class ReturnEvidence(BaseModel):
    """
    Evidence media (images/documents) uploaded for a ReturnRequest.
    """
    return_request = models.ForeignKey(
        ReturnRequest,
        on_delete=models.CASCADE,
        related_name="evidence",
        verbose_name="Return Request",
    )
    file = models.FileField(
        upload_to="returns/evidence/%Y/%m/",
        verbose_name="Evidence File",
    )
    file_type = models.CharField(
        max_length=50,
        default="image/jpeg",
        verbose_name="File MIME Type",
    )
    file_size = models.PositiveIntegerField(
        default=0,
        verbose_name="File Size (Bytes)",
    )
    evidence_type = models.CharField(
        max_length=30,
        choices=EvidenceType.choices,
        default=EvidenceType.PRODUCT_DAMAGE,
        verbose_name="Evidence Category",
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name="Uploaded By",
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Return Evidence"
        verbose_name_plural = "Return Evidences"

    def __str__(self):
        return f"Evidence {str(self.id)[:8]} for Return {str(self.return_request.id)[:8]}"


class ReturnEvent(BaseModel):
    """
    Append-only audit stream for return request status transitions.
    """
    return_request = models.ForeignKey(
        ReturnRequest,
        on_delete=models.CASCADE,
        related_name="events",
        verbose_name="Return Request",
    )
    from_status = models.CharField(
        max_length=30,
        choices=ReturnStatus.choices,
        verbose_name="From Status",
    )
    to_status = models.CharField(
        max_length=30,
        choices=ReturnStatus.choices,
        verbose_name="To Status",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Actor User",
    )
    notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Event Notes",
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Return Event"
        verbose_name_plural = "Return Events"
        ordering = ["created_at"]

    def __str__(self):
        return f"Event {self.from_status} -> {self.to_status} on Return {str(self.return_request.id)[:8]}"


class Refund(BaseModel):
    """
    Authoritative ledger for payment refunds.
    Calculates remaining refundable amount and enforces double refund protection.
    """
    return_request = models.OneToOneField(
        ReturnRequest,
        on_delete=models.CASCADE,
        related_name="refund",
        verbose_name="Return Request",
    )
    payment = models.ForeignKey(
        Payment,
        on_delete=models.PROTECT,
        related_name="refunds",
        verbose_name="Payment",
    )
    razorpay_refund_id = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Razorpay Refund ID",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Refund Amount",
    )
    status = models.CharField(
        max_length=30,
        choices=RefundStatus.choices,
        default=RefundStatus.PENDING,
        db_index=True,
        verbose_name="Refund Status",
    )
    idempotency_key = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        verbose_name="Idempotency Key",
    )
    attempts = models.PositiveIntegerField(
        default=0,
        verbose_name="Execution Attempts",
    )
    failure_reason = models.TextField(
        blank=True,
        default="",
        verbose_name="Failure Reason",
    )
    provider_response = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Raw Provider Response",
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Refund"
        verbose_name_plural = "Refunds"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"], name="refund_status_created_idx"),
            models.Index(fields=["payment", "status"], name="refund_payment_status_idx"),
        ]

    def __str__(self):
        return f"Refund ₹{self.amount} ({self.get_status_display()}) for Return {str(self.return_request.id)[:8]}"


class ReturnShipment(BaseModel):
    """
    Logistics tracking record for courier return pickups.
    """
    return_request = models.OneToOneField(
        ReturnRequest,
        on_delete=models.CASCADE,
        related_name="shipment",
        verbose_name="Return Request",
    )
    courier_name = models.CharField(
        max_length=100,
        default="Delhivery Return",
        verbose_name="Courier Name",
    )
    awb_number = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name="AWB Number",
    )
    pickup_status = models.CharField(
        max_length=30,
        choices=ReturnPickupStatus.choices,
        default=ReturnPickupStatus.PENDING,
        verbose_name="Pickup Status",
    )
    pickup_scheduled_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Pickup Scheduled Date",
    )
    tracking_url = models.URLField(
        null=True,
        blank=True,
        verbose_name="Tracking URL",
    )
    provider_response = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Provider Response",
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Return Shipment"
        verbose_name_plural = "Return Shipments"

    def __str__(self):
        return f"Return Shipment (AWB: {self.awb_number or 'Pending'}) for Return {str(self.return_request.id)[:8]}"
