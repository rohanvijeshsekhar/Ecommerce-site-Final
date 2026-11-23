"""
FAAZO – Dealer Model

DealerApplication
    Submitted by users who wish to become approved dealers.
    Admin reviews the submitted document and approves or rejects.

Dealer Pricing Activation:
    When an application is approved, user.role is changed to "dealer".
    The pricing engine will then resolve dealer-tier pricing automatically.
    No frontend change is required.

Document Security:
    Documents are stored in dealer_documents/.
    In production, this path maps to a PRIVATE S3 prefix (no public URLs).
    Access is gated behind authenticated admin-only views with signed URLs.

Status Lifecycle:
    pending → approved  (admin approves → user.role = "dealer")
    pending → rejected  (admin rejects → rejection_reason populated)
"""

import uuid

from django.conf import settings
from django.db import models
from apps.common.storage import PrivateFileField


class DealerStatus(models.TextChoices):
    PENDING = "pending", "Pending Review"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class DealerApplication(models.Model):
    """
    Dealer application submitted during dealer registration.

    One application per user (OneToOne).
    Company name + document are collected at registration time.
    All other fields are populated by admin during the review process.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dealer_application",
        verbose_name="Applicant",
    )
    company_name = models.CharField(
        max_length=200,
        verbose_name="Company / Clinic Name",
    )
    document = PrivateFileField(
        upload_to="dealer_documents/%Y/%m/",
        verbose_name="Registration Document",
        null=True,
        blank=True,
        help_text=(
            "GST certificate, trade license, or any business registration document. "
            "Served via signed URL in production — never publicly accessible."
        ),
    )
    status = models.CharField(
        max_length=20,
        choices=DealerStatus.choices,
        default=DealerStatus.PENDING,
        db_index=True,
        verbose_name="Application Status",
    )
    rejection_reason = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Rejection Reason",
        help_text="Populated by admin when rejecting an application.",
    )

    # ── Admin Internal Notes ─────────────────────────────────────
    admin_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Admin Notes",
        help_text="Internal notes added by admin during review. Not visible to the dealer.",
    )

    # ── Review Metadata ─────────────────────────────────────────
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_dealer_applications",
        verbose_name="Reviewed By",
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Reviewed At",
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Submitted At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "dealer_applications"
        verbose_name = "Dealer Application"
        verbose_name_plural = "Dealer Applications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.company_name} ({self.user.email}) — {self.get_status_display()}"

    # ── Status Helpers ───────────────────────────────────────────

    @property
    def is_pending(self) -> bool:
        return self.status == DealerStatus.PENDING

    @property
    def is_approved(self) -> bool:
        return self.status == DealerStatus.APPROVED

    @property
    def is_rejected(self) -> bool:
        return self.status == DealerStatus.REJECTED


class DealerApplicationDocument(models.Model):
    """
    Model to store multiple documents submitted with a dealer application.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    application = models.ForeignKey(
        DealerApplication,
        on_delete=models.CASCADE,
        related_name="documents",
        verbose_name="Dealer Application",
    )
    document = PrivateFileField(
        upload_to="dealer_documents/%Y/%m/",
        verbose_name="Document File",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="Uploaded At")

    class Meta:
        db_table = "dealer_application_documents"
        verbose_name = "Dealer Application Document"
        verbose_name_plural = "Dealer Application Documents"
        ordering = ["uploaded_at"]

    def __str__(self) -> str:
        return f"{self.application.company_name} — Document ({self.id.hex[:6]})"
