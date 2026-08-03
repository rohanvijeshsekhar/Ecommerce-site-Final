"""
FAAZO – Enterprise Shipping & Fulfillment Models

Stores production Delhivery shipment records, multi-shipment dispatches,
packing/QC workflows, append-only event histories, and complete audit API logs.
"""

import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone
from apps.common.mixins import BaseModel
from apps.orders.models import Order


# ============================================================
# Status Choices
# ============================================================

class ShipmentStatus(models.TextChoices):
    """
    Courier-side workflow status for Delhivery shipments.
    NOT_CREATED is the initial state — it means Delhivery has not yet been called.
    Delhivery operations are only permitted once the Warehouse Workflow (packing_status)
    reaches READY_FOR_PICKUP and an admin explicitly triggers 'Create Courier Shipment'.
    """
    # ── Warehouse gate (pre-Delhivery) ──────────────────────────────────────
    NOT_CREATED       = "not_created",       "Not Created"

    # ── Delhivery lifecycle ─────────────────────────────────────────────────
    CREATED           = "created",           "Shipment Created"
    PICKUP_SCHEDULED  = "pickup_scheduled",  "Pickup Scheduled"
    PICKED_UP         = "picked_up",         "Picked Up"
    REACHED_HUB       = "reached_hub",       "Reached Hub"
    IN_TRANSIT        = "in_transit",        "In Transit"
    OUT_FOR_DELIVERY  = "out_for_delivery",  "Out for Delivery"
    DELIVERED         = "delivered",         "Delivered"
    FAILED_DELIVERY   = "failed_delivery",   "Failed Delivery"
    RTO_INITIATED     = "rto_initiated",     "RTO Initiated"
    RTO_IN_TRANSIT    = "rto_in_transit",    "RTO In Transit"
    RTO_DELIVERED     = "rto_delivered",     "RTO Delivered"
    CANCELLED         = "cancelled",         "Cancelled"
    LOST              = "lost",              "Lost"


class PickupStatus(models.TextChoices):
    PENDING    = "pending",    "Pending"
    SCHEDULED  = "scheduled",  "Scheduled"
    PICKED_UP  = "picked_up",  "Picked Up"
    FAILED     = "failed",     "Failed"
    CANCELLED  = "cancelled",  "Cancelled"


class PackingStatus(models.TextChoices):
    PENDING          = "pending",          "Pending"
    PACKING          = "packing",          "Packing"
    PACKED           = "packed",           "Packed"
    QC_PASSED        = "qc_passed",        "QC Passed"
    READY_FOR_PICKUP = "ready_for_pickup", "Ready for Pickup"


# ============================================================
# Shipment
# ============================================================

class Shipment(BaseModel):
    """
    Central fulfillment record for FAAZO orders dispatched via Delhivery or partner logistics.
    Supports multi-shipment dispatches per order.
    """

    shipment_number = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        verbose_name="Shipment Number",
        db_index=True,
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="shipments",
        verbose_name="Order",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_shipments",
        verbose_name="Created By",
    )

    # ── Provider & Execution Mode ────────────────────────────
    provider = models.CharField(
        max_length=20,
        choices=[
            ("offline", "Offline Simulation"),
            ("sandbox", "Delhivery Sandbox"),
            ("live", "Delhivery Live"),
        ],
        default="sandbox",
        verbose_name="Shipping Provider",
        db_index=True,
    )

    # ── Delhivery & Provider Identifiers ─────────────────────
    courier_name = models.CharField(
        max_length=100,
        default="Delhivery",
        verbose_name="Courier Name",
    )
    delhivery_shipment_id = models.CharField(
        max_length=200,
        blank=True,
        default="",
        verbose_name="Delhivery Shipment ID",
        db_index=True,
    )
    external_shipment_id = models.CharField(
        max_length=200,
        blank=True,
        default="",
        verbose_name="External Shipment ID",
    )
    awb_number = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="AWB Number",
        db_index=True,
    )
    tracking_number = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="Tracking Number",
    )
    pickup_request_id = models.CharField(
        max_length=200,
        blank=True,
        default="",
        verbose_name="Pickup Request ID",
    )
    courier_reference = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="Courier Reference",
    )

    # ── URLs & Documents ─────────────────────────────────────
    tracking_url = models.URLField(
        max_length=500,
        blank=True,
        default="",
        verbose_name="Tracking URL",
    )
    label_url = models.URLField(
        max_length=500,
        blank=True,
        default="",
        verbose_name="Shipping Label URL",
    )
    manifest_url = models.URLField(
        max_length=500,
        blank=True,
        default="",
        verbose_name="Manifest URL",
    )

    # ── Warehouse & QC Workflow ──────────────────────────────
    packing_status = models.CharField(
        max_length=30,
        choices=PackingStatus.choices,
        default=PackingStatus.PENDING,
        verbose_name="Packing Status",
        db_index=True,
    )
    packed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="packed_shipments",
        verbose_name="Packed By",
    )
    packed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Packed At",
    )
    qc_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="qc_shipments",
        verbose_name="QC By",
    )
    qc_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="QC At",
    )
    warehouse = models.CharField(
        max_length=150,
        default="FAAZO Central Warehouse - Hub 1",
        verbose_name="Warehouse / Fulfillment Center",
    )
    dispatch_location = models.CharField(
        max_length=200,
        default="Mumbai Fulfillment Hub",
        verbose_name="Dispatch Location",
    )

    # ── Package Dimensions & Financial Metrics ───────────────
    weight = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=1.00,
        verbose_name="Weight (kg)",
    )
    length = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=10.00,
        verbose_name="Length (cm)",
    )
    width = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=10.00,
        verbose_name="Width (cm)",
    )
    height = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=10.00,
        verbose_name="Height (cm)",
    )
    volumetric_weight = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=1.00,
        verbose_name="Volumetric Weight (kg)",
    )
    shipping_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        verbose_name="Shipping Charges (₹)",
    )
    cod_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        verbose_name="COD Collection Amount (₹)",
    )
    delivery_type = models.CharField(
        max_length=50,
        default="Express Surface",
        verbose_name="Delivery Type",
    )

    # ── Courier Shipment State ───────────────────────────────
    # NOT_CREATED = no Delhivery call has been made yet.
    # Transitions to CREATED only after packing_status == READY_FOR_PICKUP
    # and admin explicitly triggers 'Create Courier Shipment'.
    shipment_status = models.CharField(
        max_length=30,
        choices=ShipmentStatus.choices,
        default=ShipmentStatus.NOT_CREATED,
        verbose_name="Courier Status",
        db_index=True,
    )
    pickup_status = models.CharField(
        max_length=20,
        choices=PickupStatus.choices,
        default=PickupStatus.PENDING,
        verbose_name="Pickup Status",
    )

    # ── Admin Review Flag ────────────────────────────────────
    # Set by the data migration when a record has a valid AWB but packing
    # was not complete — requires manual admin review before continuing.
    needs_review = models.BooleanField(
        default=False,
        verbose_name="Needs Admin Review",
        db_index=True,
    )
    current_location = models.CharField(
        max_length=500,
        blank=True,
        default="",
        verbose_name="Current Location",
    )
    current_hub = models.CharField(
        max_length=200,
        blank=True,
        default="",
        verbose_name="Current Hub",
    )

    # ── Scheduling & Delivery ────────────────────────────────
    pickup_scheduled_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Pickup Scheduled Date",
    )
    pickup_date = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Picked Up At",
    )
    estimated_delivery_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Estimated Delivery Date",
    )
    delivered_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Delivered At",
    )

    # ── Sync Metadata & Soft Delete ──────────────────────────
    last_synced_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Last Synced At",
    )

    # ── Courier & Failure Recovery Details ───────────────────
    courier_code = models.CharField(
        max_length=50,
        blank=True,
        default="",
        verbose_name="Courier Code",
    )
    courier_contact = models.CharField(
        max_length=50,
        blank=True,
        default="",
        verbose_name="Courier Contact",
    )
    failure_reason = models.TextField(
        blank=True,
        default="",
        verbose_name="Failure Reason",
    )
    last_error_code = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="Last Error Code",
    )
    raw_provider_response = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Raw Provider Response",
    )
    retry_count = models.IntegerField(
        default=0,
        verbose_name="Retry Count",
    )
    max_retries_exceeded = models.BooleanField(
        default=False,
        verbose_name="Max Retries Exceeded",
    )

    is_deleted = models.BooleanField(
        default=False,
        verbose_name="Is Deleted (Soft)",
        db_index=True,
    )
    deleted_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Deleted At",
    )

    # ── Audit Storage ────────────────────────────────────────
    raw_response = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Raw Delhivery API Response",
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Shipment"
        verbose_name_plural = "Shipments"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.shipment_number:
            date_str = timezone.now().strftime("%Y%m")
            short_id = uuid.uuid4().hex[:6].upper()
            self.shipment_number = f"SHP-{date_str}-{short_id}"
        super().save(*args, **kwargs)

    def __str__(self):
        courier = self.awb_number or self.shipment_status
        return f"{self.shipment_number} ({courier}) — packing:{self.packing_status}"

    @property
    def courier_submitted(self) -> bool:
        """True if Delhivery has been contacted (AWB exists)."""
        return self.shipment_status != ShipmentStatus.NOT_CREATED

    @property
    def is_cancellable(self) -> bool:
        """
        True if shipment can still be cancelled with Delhivery (before pickup).
        NOT_CREATED records cannot be 'cancelled' with courier — they haven't been
        submitted yet. Use warehouse workflow controls to revert packing instead.
        """
        return self.shipment_status in [
            ShipmentStatus.CREATED,
            ShipmentStatus.PICKUP_SCHEDULED,
        ]

    @property
    def is_delivered(self) -> bool:
        return self.shipment_status == ShipmentStatus.DELIVERED


# ============================================================
# ShipmentTrackingEvent (ShipmentEvent)
# ============================================================

class ShipmentTrackingEvent(BaseModel):
    """
    Immutable, append-only log of every shipment event and tracking update.
    """

    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        related_name="tracking_events",
        verbose_name="Shipment",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="shipment_events",
        verbose_name="Created By",
    )

    # ── Event Details ────────────────────────────────────────
    event_code = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="Delhivery Event Code",
    )
    event_label = models.CharField(
        max_length=200,
        verbose_name="Event Label",
    )
    status_mapped = models.CharField(
        max_length=30,
        choices=ShipmentStatus.choices,
        verbose_name="Mapped Shipment Status",
    )
    event_timestamp = models.DateTimeField(
        default=timezone.now,
        verbose_name="Event Timestamp",
    )
    location = models.CharField(
        max_length=500,
        blank=True,
        default="",
        verbose_name="Location",
    )
    description = models.TextField(
        blank=True,
        default="",
        verbose_name="Description",
    )

    # ── Source ───────────────────────────────────────────────
    event_source = models.CharField(
        max_length=50,
        choices=[
            ("api_poll", "API Poll"),
            ("webhook", "Delhivery Webhook"),
            ("manual", "Manual Admin"),
            ("system", "System Process"),
        ],
        default="api_poll",
        verbose_name="Event Source",
    )
    is_delivered = models.BooleanField(
        default=False,
        verbose_name="Is Delivered Event",
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Shipment Tracking Event"
        verbose_name_plural = "Shipment Tracking Events"
        ordering = ["-event_timestamp"]

    def __str__(self):
        return f"{self.shipment.shipment_number} — {self.event_label} @ {self.event_timestamp}"


# Alias for clean backward compatibility
ShipmentEvent = ShipmentTrackingEvent


# ============================================================
# Audit & Webhook Logs
# ============================================================

class DelhiveryWebhookLog(BaseModel):
    """
    Audit log of all incoming webhooks received from Delhivery to guarantee idempotency and non-repudiation.
    """
    webhook_id = models.CharField(
        max_length=200,
        unique=True,
        verbose_name="Webhook Transaction ID",
        db_index=True,
    )
    verification_status = models.CharField(
        max_length=50,
        default="verified",
        verbose_name="HMAC Verification Status",
    )
    raw_payload = models.JSONField(
        default=dict,
        verbose_name="Raw Webhook Payload",
    )
    received_at = models.DateTimeField(
        default=timezone.now,
        verbose_name="Received At",
    )
    processed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Processed At",
    )
    is_processed = models.BooleanField(
        default=False,
        verbose_name="Is Processed",
    )
    retry_count = models.IntegerField(
        default=0,
        verbose_name="Retry Count",
    )
    processing_result = models.TextField(
        blank=True,
        default="",
        verbose_name="Processing Result",
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Delhivery Webhook Log"
        verbose_name_plural = "Delhivery Webhook Logs"
        ordering = ["-received_at"]


# Alias for clean Shiprocket webhook logging
ShiprocketWebhookLog = DelhiveryWebhookLog



class ShippingAPILog(BaseModel):
    """
    Audit log for all outbound communication with Delhivery logistics APIs.
    """
    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="api_logs",
        verbose_name="Shipment",
    )
    endpoint = models.CharField(
        max_length=300,
        verbose_name="API Endpoint",
    )
    request_method = models.CharField(
        max_length=10,
        default="POST",
        verbose_name="HTTP Method",
    )
    request_payload = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Request Payload",
    )
    response_payload = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Response Payload",
    )
    http_status = models.IntegerField(
        verbose_name="HTTP Status Code",
    )
    latency_ms = models.IntegerField(
        default=0,
        verbose_name="Execution Time (ms)",
    )
    error_message = models.TextField(
        blank=True,
        default="",
        verbose_name="Error Message",
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Shipping API Log"
        verbose_name_plural = "Shipping API Logs"
        ordering = ["-created_at"]

