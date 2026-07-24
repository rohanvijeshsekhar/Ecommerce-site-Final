import uuid
import datetime
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.common.mixins import BaseModel

# ============================================================
# Choices
# ============================================================

class WarrantyRegistrationStatus(models.TextChoices):
    PENDING_REGISTRATION = "pending_registration", "Pending Registration"
    PENDING_VERIFICATION = "pending_verification", "Pending Verification"
    NEED_MORE_INFO       = "need_more_info",       "Need More Info"
    ACTIVE               = "active",               "Active"
    REJECTED             = "rejected",             "Rejected"
    EXPIRED              = "expired",              "Expired"


class WarrantyProvider(models.TextChoices):
    FAAZO        = "faazo",        "FAAZO"
    MANUFACTURER = "manufacturer", "Manufacturer"
    DISTRIBUTOR  = "distributor",  "Distributor"
    THIRD_PARTY  = "third_party",  "Third Party"


class ClaimPriority(models.TextChoices):
    LOW      = "low",      "Low"
    MEDIUM   = "medium",   "Medium"
    HIGH     = "high",     "High"
    CRITICAL = "critical", "Critical"


class ClaimStatus(models.TextChoices):
    SUBMITTED           = "submitted",           "Submitted"
    UNDER_REVIEW        = "under_review",        "Under Review"
    NEED_MORE_INFO      = "need_more_info",      "Need More Info"
    APPROVED            = "approved",            "Approved"
    ASSIGNED            = "assigned",            "Assigned"
    REPAIR_IN_PROGRESS  = "repair_in_progress",  "Repair In Progress"
    COMPLETED           = "completed",           "Completed"
    CLOSED              = "closed",              "Closed"
    REJECTED            = "rejected",            "Rejected"


class AttachmentType(models.TextChoices):
    INVOICE       = "invoice",       "Invoice"
    PRODUCT_IMAGE = "product_image", "Product Image"
    VIDEO         = "video",         "Video"
    OTHER         = "other",         "Other"


# ============================================================
# Validators
# ============================================================

def validate_invoice_file(value):
    import os
    if not value:
        return
    ext = os.path.splitext(value.name)[1].lower()
    valid_extensions = ['.pdf', '.jpg', '.jpeg', '.png']
    if ext not in valid_extensions:
        raise ValidationError(
            f"Unsupported invoice file extension: {ext}. Allowed: PDF, JPG, JPEG, PNG."
        )
    limit = 5 * 1024 * 1024
    if value.size > limit:
        raise ValidationError("Invoice file size exceeds 5MB limit.")


def validate_attachment_file(value):
    import os
    if not value:
        return
    ext = os.path.splitext(value.name)[1].lower()
    valid_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.mp4', '.avi', '.mov']
    if ext not in valid_extensions:
        raise ValidationError(
            f"Unsupported file extension: {ext}. Allowed: PDF, JPG, JPEG, PNG, MP4, AVI, MOV."
        )
    limit = 20 * 1024 * 1024
    if value.size > limit:
        raise ValidationError("File size exceeds 20MB limit.")


# ============================================================
# Models
# ============================================================

class WarrantyRegistration(BaseModel):
    """
    Tracks warranty coverage for a FAAZO product purchased in an order.
    Created on order delivery as pending_registration, requiring manual customer action.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="warranty_registrations",
        verbose_name="User"
    )
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="warranty_registrations",
        verbose_name="Order"
    )
    order_item = models.ForeignKey(
        "orders.OrderItem",
        on_delete=models.CASCADE,
        related_name="warranty_registrations",
        verbose_name="Order Item"
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="warranty_registrations",
        verbose_name="Product"
    )
    serial_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Serial Number"
    )
    purchase_date = models.DateField(
        verbose_name="Purchase Date"
    )
    warranty_start = models.DateField(
        verbose_name="Warranty Start Date"
    )
    warranty_end = models.DateField(
        verbose_name="Warranty End Date"
    )
    warranty_provider = models.CharField(
        max_length=50,
        choices=WarrantyProvider.choices,
        default=WarrantyProvider.FAAZO,
        verbose_name="Warranty Provider"
    )
    warranty_status = models.CharField(
        max_length=50,
        choices=WarrantyRegistrationStatus.choices,
        default=WarrantyRegistrationStatus.PENDING_REGISTRATION,
        verbose_name="Warranty Status"
    )
    invoice = models.FileField(
        upload_to="warranty_invoices/%Y/%m/",
        null=True,
        blank=True,
        validators=[validate_invoice_file],
        verbose_name="Purchase Invoice"
    )
    notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Notes"
    )
    admin_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Admin Notes"
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Warranty Registration"
        verbose_name_plural = "Warranty Registrations"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.product.name} ({self.serial_number or 'No S/N'}) - {self.warranty_status}"

    @property
    def days_remaining(self) -> int:
        """Calculates days remaining under active coverage."""
        if self.warranty_status != WarrantyRegistrationStatus.ACTIVE:
            return 0
        today = timezone.now().date()
        if today > self.warranty_end:
            return 0
        return (self.warranty_end - today).days

    def clean(self):
        super().clean()
        if self.warranty_status in [WarrantyRegistrationStatus.PENDING_VERIFICATION, WarrantyRegistrationStatus.ACTIVE]:
            if not self.invoice:
                raise ValidationError("Invoice file is required for registration.")
            if self.product.serial_number_required and not self.serial_number:
                raise ValidationError("Manufacturer serial number is required for this product.")

    def save(self, *args, **kwargs):
        self.full_clean()
        # Automatically transition to expired if coverage end date has passed, and status is active
        if self.warranty_status == WarrantyRegistrationStatus.ACTIVE:
            today = timezone.now().date()
            if today > self.warranty_end:
                self.warranty_status = WarrantyRegistrationStatus.EXPIRED
        super().save(*args, **kwargs)


class WarrantyClaim(BaseModel):
    """
    A claim filed against an active or registered warranty.
    """
    claim_number = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        db_index=True,
        verbose_name="Claim Number"
    )
    registration = models.ForeignKey(
        WarrantyRegistration,
        on_delete=models.CASCADE,
        related_name="claims",
        verbose_name="Warranty Registration"
    )
    description = models.TextField(
        verbose_name="Problem Description"
    )
    priority = models.CharField(
        max_length=30,
        choices=ClaimPriority.choices,
        default=ClaimPriority.MEDIUM,
        verbose_name="Priority"
    )
    status = models.CharField(
        max_length=30,
        choices=ClaimStatus.choices,
        default=ClaimStatus.SUBMITTED,
        verbose_name="Status"
    )
    assigned_provider = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="Assigned Provider"
    )
    admin_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Admin Notes"
    )
    resolution = models.TextField(
        blank=True,
        default="",
        verbose_name="Resolution Details"
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Warranty Claim"
        verbose_name_plural = "Warranty Claims"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.claim_number} ({self.status})"

    def save(self, *args, **kwargs):
        # Generate Claim Number if missing
        if not self.claim_number:
            now = timezone.now()
            date_str = now.strftime("%Y%m")
            # Generate sequential ID (scoped to the month for safety)
            count = WarrantyClaim.objects.filter(
                created_at__year=now.year,
                created_at__month=now.month
            ).count() + 1
            self.claim_number = f"WTY-{date_str}-{count:05d}"
        super().save(*args, **kwargs)


class WarrantyAttachment(BaseModel):
    """
    An invoice, product photo, or troubleshooting video uploaded
    to support a warranty claim.
    """
    claim = models.ForeignKey(
        WarrantyClaim,
        on_delete=models.CASCADE,
        related_name="attachments",
        verbose_name="Warranty Claim"
    )
    file = models.FileField(
        upload_to="warranty_attachments/%Y/%m/",
        validators=[validate_attachment_file],
        verbose_name="Attachment File"
    )
    attachment_type = models.CharField(
        max_length=30,
        choices=AttachmentType.choices,
        default=AttachmentType.OTHER,
        verbose_name="Attachment Type"
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Warranty Attachment"
        verbose_name_plural = "Warranty Attachments"

    def clean(self):
        super().clean()
        if not self.file:
            return
        import os
        ext = os.path.splitext(self.file.name)[1].lower()
        size = self.file.size
        
        if self.attachment_type == AttachmentType.INVOICE:
            valid_extensions = ['.pdf', '.jpg', '.jpeg', '.png']
            if ext not in valid_extensions:
                raise ValidationError(f"Unsupported invoice file extension: {ext}. Allowed: PDF, JPG, JPEG, PNG.")
            if size > 5 * 1024 * 1024:
                raise ValidationError("Invoice file size exceeds 5MB limit.")
        elif self.attachment_type == AttachmentType.PRODUCT_IMAGE:
            valid_extensions = ['.jpg', '.jpeg', '.png']
            if ext not in valid_extensions:
                raise ValidationError(f"Unsupported image file extension: {ext}. Allowed: JPG, JPEG, PNG.")
            if size > 5 * 1024 * 1024:
                raise ValidationError("Image file size exceeds 5MB limit.")
        elif self.attachment_type == AttachmentType.VIDEO:
            valid_extensions = ['.mp4', '.avi', '.mov']
            if ext not in valid_extensions:
                raise ValidationError(f"Unsupported video file extension: {ext}. Allowed: MP4, AVI, MOV.")
            if size > 20 * 1024 * 1024:
                raise ValidationError("Video file size exceeds 20MB limit.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.attachment_type} for claim {self.claim.claim_number}"


class ClaimTimeline(BaseModel):
    """
    Immutable log tracking the state changes and notes of a claim.
    """
    claim = models.ForeignKey(
        WarrantyClaim,
        on_delete=models.CASCADE,
        related_name="timeline",
        verbose_name="Warranty Claim"
    )
    action = models.CharField(
        max_length=200,
        verbose_name="Action"
    )
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Actor"
    )
    notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Notes"
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Claim Timeline Event"
        verbose_name_plural = "Claim Timeline Events"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.claim.claim_number} - {self.action} at {self.created_at}"

    def save(self, *args, **kwargs):
        # Enforce Immutability: prevent edits
        if not self._state.adding:
            raise ValidationError("Timeline entries are immutable.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Enforce Immutability: prevent deletion
        raise ValidationError("Timeline entries cannot be deleted.")
