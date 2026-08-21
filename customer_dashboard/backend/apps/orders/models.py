from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.common.mixins import BaseModel
from apps.products.models import Product
from apps.users.models import Address

class OrderStatus(models.TextChoices):
    PENDING_PAYMENT = "pending_payment", "Pending Payment"
    PROCESSING      = "processing",      "Processing"
    PACKED          = "packed",          "Packed"
    SHIPPED         = "shipped",         "Shipped"
    DELIVERED       = "delivered",       "Delivered"
    CANCELLED       = "cancelled",       "Cancelled"

class Order(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="orders",
        verbose_name="User"
    )
    shipping_address = models.ForeignKey(
        Address,
        on_delete=models.PROTECT,
        verbose_name="Shipping Address"
    )
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PROCESSING,
        verbose_name="Status"
    )
    payment_method = models.CharField(
        max_length=50,
        default="upi",
        verbose_name="Payment Method"
    )
    
    # Immutable Shipping Address Snapshot (preserves historical address if user modifies/deletes Address)
    shipping_full_name = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Shipping Full Name"
    )
    shipping_mobile = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Shipping Mobile"
    )
    shipping_line1 = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Shipping Address Line 1"
    )
    shipping_line2 = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Shipping Address Line 2"
    )
    shipping_city = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Shipping City"
    )
    shipping_state = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Shipping State"
    )
    shipping_pincode = models.CharField(
        max_length=10,
        blank=True,
        verbose_name="Shipping Pincode"
    )
    shipping_country = models.CharField(
        max_length=50,
        default="India",
        verbose_name="Shipping Country"
    )
    shipping_address_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Shipping Address Snapshot"
    )
    
    # Financial details snapshot
    mrp_subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="MRP Subtotal"
    )
    selling_subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Selling Subtotal (GST Inclusive)"
    )
    taxable_subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        verbose_name="Taxable Subtotal (GST Exclusive)",
        help_text="GST-exclusive product value"
    )
    gst_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="GST Amount"
    )
    shipping_fee = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        verbose_name="Shipping Fee"
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Total Amount"
    )

    # Production-ready fields
    order_number = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        verbose_name="Order Number"
    )
    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        verbose_name="Invoice Number"
    )
    estimated_delivery_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Estimated Delivery Date"
    )
    tracking_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Tracking Number"
    )
    shipping_carrier = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Shipping Carrier"
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Admin Notes"
    )
    cancellation_reason = models.TextField(
        blank=True,
        null=True,
        verbose_name="Cancellation Reason"
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Cancelled At"
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_orders",
        verbose_name="Cancelled By"
    )
    packed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Packed At"
    )
    shipped_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Shipped At"
    )
    delivered_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Delivered At"
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Order"
        verbose_name_plural = "Orders"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"], name="order_user_created_idx"),
            models.Index(fields=["status", "-created_at"], name="order_status_created_idx"),
        ]

    def __str__(self):
        return f"Order {self.order_number or self.id} - {self.status}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        if not self.estimated_delivery_date:
            self.estimated_delivery_date = (timezone.now() + timezone.timedelta(days=4)).date()

        # Auto-populate immutable snapshot from shipping_address if snapshot fields are empty
        if self.shipping_address and not self.shipping_line1:
            addr = self.shipping_address
            self.shipping_full_name = self.shipping_full_name or getattr(addr, "full_name", "") or ""
            self.shipping_mobile = self.shipping_mobile or getattr(addr, "mobile", "") or ""
            self.shipping_line1 = self.shipping_line1 or getattr(addr, "line1", "") or ""
            self.shipping_line2 = self.shipping_line2 or getattr(addr, "line2", "") or ""
            self.shipping_city = self.shipping_city or getattr(addr, "city", "") or ""
            self.shipping_state = self.shipping_state or getattr(addr, "state", "") or ""
            self.shipping_pincode = self.shipping_pincode or getattr(addr, "pincode", "") or ""
            self.shipping_country = self.shipping_country or "India"
            if not self.shipping_address_snapshot:
                self.shipping_address_snapshot = {
                    "full_name": self.shipping_full_name,
                    "mobile": self.shipping_mobile,
                    "line1": self.shipping_line1,
                    "line2": self.shipping_line2,
                    "city": self.shipping_city,
                    "state": self.shipping_state,
                    "pincode": self.shipping_pincode,
                    "country": self.shipping_country,
                    "label": getattr(addr, "label", "Clinic"),
                }

        if not (is_new or not self.order_number):
            if not self.invoice_number:
                self.invoice_number = f"INV-{self.order_number}"
            return super().save(*args, **kwargs)

        from django.db import transaction, IntegrityError
        import uuid

        now = timezone.now()
        date_prefix = f"FAAZO-{now.strftime('%Y%m')}-"

        existing_numbers = Order.objects.filter(
            order_number__startswith=date_prefix
        ).values_list("order_number", flat=True)

        max_seq = 0
        for num_str in existing_numbers:
            if num_str and num_str.startswith(date_prefix):
                parts = num_str.split("-")
                if len(parts) >= 3 and parts[-1].isdigit():
                    seq = int(parts[-1])
                    if seq > max_seq:
                        max_seq = seq

        next_seq = max_seq + 1
        candidate = f"{date_prefix}{next_seq:04d}"
        while Order.objects.filter(order_number=candidate).exists():
            next_seq += 1
            candidate = f"{date_prefix}{next_seq:04d}"

        # Concurrency safety: handle savepoint collision if parallel transactions attempt same candidate
        save_success = False
        retries = 0
        while not save_success and retries < 5:
            self.order_number = candidate
            self.invoice_number = f"INV-{self.order_number}"
            try:
                sid = transaction.savepoint()
                super().save(*args, **kwargs)
                transaction.savepoint_commit(sid)
                save_success = True
            except IntegrityError as ie:
                transaction.savepoint_rollback(sid)
                if "order_number" in str(ie) or "orders_order" in str(ie) or "unique" in str(ie).lower():
                    next_seq += 1
                    candidate = f"{date_prefix}{next_seq:04d}"
                    retries += 1
                else:
                    raise ie

        if not save_success:
            self.order_number = f"{date_prefix}{next_seq:04d}-{uuid.uuid4().hex[:4].upper()}"
            self.invoice_number = f"INV-{self.order_number}"
            super().save(*args, **kwargs)


class OrderItem(BaseModel):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Order"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        verbose_name="Product"
    )
    quantity = models.PositiveIntegerField(
        verbose_name="Quantity"
    )
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Purchase Unit Price (GST Inclusive)"
    )

    # Tax Snapshot Fields
    gst_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="GST Rate % (Snapshot)"
    )
    hsn_code = models.CharField(
        max_length=20,
        blank=True,
        default="",
        verbose_name="HSN Code (Snapshot)"
    )
    taxable_value_per_unit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Taxable Value Per Unit",
        help_text="Pre-tax value per unit = price / (1 + gst_rate/100)"
    )
    taxable_subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Taxable Subtotal",
        help_text="taxable_value_per_unit x quantity"
    )
    cgst_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="CGST Amount",
        help_text="Central GST (intra-state orders only). Zero for inter-state."
    )
    sgst_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="SGST Amount",
        help_text="State GST (intra-state orders only). Zero for inter-state."
    )
    igst_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="IGST Amount",
        help_text="Integrated GST (inter-state orders only). Zero for intra-state."
    )
    total_gst_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Total GST Amount",
        help_text="cgst + sgst + igst for this line."
    )
    is_intra_state = models.BooleanField(
        null=True,
        blank=True,
        verbose_name="Intra-State Order",
        help_text="True = warehouse state matches delivery state (CGST+SGST). False = IGST."
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Order Item"
        verbose_name_plural = "Order Items"

    def __str__(self):
        return f"{self.quantity} x {self.product.name} in Order {self.order.order_number or self.order.id}"


class OrderStatusHistory(BaseModel):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="status_history",
        verbose_name="Order"
    )
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        verbose_name="Status"
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Changed By"
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Notes"
    )
    
    class Meta(BaseModel.Meta):
        ordering = ["created_at"]
        verbose_name = "Order Status History"
        verbose_name_plural = "Order Status Histories"

    def __str__(self):
        return f"{self.order.order_number or self.order.id} changed to {self.status} at {self.created_at}"


class OutboxStatus(models.TextChoices):
    PENDING    = "pending",    "Pending"
    PROCESSING = "processing", "Processing"
    PROCESSED  = "processed",  "Processed"
    FAILED     = "failed",     "Failed"


class OutboxEvent(BaseModel):
    """
    Transactional Outbox for mission-critical asynchronous event execution.
    Guarantees at-least-once delivery of post-order operations (email, SMS, invoice PDF, notifications)
    even if Redis, Celery, or external network providers are temporarily unavailable at checkout.
    """
    event_type = models.CharField(
        max_length=64,
        db_index=True,
        help_text="Event identifier (e.g. ORDER_PLACED, ORDER_CONFIRMED)",
    )
    aggregate_type = models.CharField(
        max_length=64,
        default="Order",
        db_index=True,
        help_text="Aggregate root entity type",
    )
    aggregate_id = models.CharField(
        max_length=128,
        db_index=True,
        help_text="PK of the aggregate entity (e.g. order_id)",
    )
    payload = models.JSONField(
        default=dict,
        blank=True,
        help_text="Context data required for background processing",
    )
    idempotency_key = models.CharField(
        max_length=128,
        unique=True,
        db_index=True,
        help_text="Unique key ensuring duplicate events are discarded at the database level",
    )
    status = models.CharField(
        max_length=20,
        choices=OutboxStatus.choices,
        default=OutboxStatus.PENDING,
        db_index=True,
    )
    attempt_count = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=5)
    last_error = models.TextField(blank=True, default="")
    next_retry_at = models.DateTimeField(default=timezone.now, db_index=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta(BaseModel.Meta):
        db_table = "outbox_events"
        verbose_name = "Outbox Event"
        verbose_name_plural = "Outbox Events"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["status", "next_retry_at"]),
            models.Index(fields=["aggregate_type", "aggregate_id"]),
            models.Index(fields=["event_type", "status"]),
        ]

    def __str__(self):
        return f"OutboxEvent({self.event_type} - {self.aggregate_id} - {self.status})"
