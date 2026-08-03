import os
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.common.mixins import BaseModel

class TicketPriority(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"

class TicketStatus(models.TextChoices):
    OPEN = "open", "Open"
    IN_PROGRESS = "in_progress", "In Progress"
    WAITING_CUSTOMER = "waiting_customer", "Waiting for Customer"
    RESOLVED = "resolved", "Resolved"
    CLOSED = "closed", "Closed"

class TicketCategory(models.TextChoices):
    PRODUCT_ENQUIRY = "product_enquiry", "Product Enquiry"
    TECHNICAL_ASSISTANCE = "technical_assistance", "Technical Assistance"
    INSTALLATION_HELP = "installation_help", "Installation Help"
    ORDER_ISSUE = "order_issue", "Order Issue"
    DELIVERY_ISSUE = "delivery_issue", "Delivery Issue"
    BILLING_ISSUE = "billing_issue", "Billing Issue"
    DEALER_SUPPORT = "dealer_support", "Dealer Support"
    GENERAL_COMPLAINT = "general_complaint", "General Complaint"
    GENERAL_FEEDBACK = "general_feedback", "General Feedback"
    OTHER = "other", "Other Support Requests"

def validate_support_attachment(value):
    if not value:
        return
    ext = os.path.splitext(value.name)[1].lower()
    valid_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.mp4', '.avi', '.mov', '.zip', '.txt', '.docx']
    if ext not in valid_extensions:
        raise ValidationError(
            f"Unsupported file extension: {ext}. Allowed formats: PDF, JPG, JPEG, PNG, MP4, AVI, MOV, ZIP, TXT, DOCX."
        )
    limit = 20 * 1024 * 1024
    if value.size > limit:
        raise ValidationError("File size exceeds 20MB limit.")

class SupportTicket(BaseModel):
    ticket_number = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        db_index=True,
        verbose_name="Ticket Number"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="support_tickets",
        verbose_name="Customer/Dealer"
    )
    subject = models.CharField(max_length=255, verbose_name="Subject")
    category = models.CharField(
        max_length=50,
        choices=TicketCategory.choices,
        default=TicketCategory.OTHER,
        verbose_name="Category"
    )
    priority = models.CharField(
        max_length=30,
        choices=TicketPriority.choices,
        default=TicketPriority.MEDIUM,
        verbose_name="Priority"
    )
    description = models.TextField(verbose_name="Description")
    status = models.CharField(
        max_length=30,
        choices=TicketStatus.choices,
        default=TicketStatus.OPEN,
        verbose_name="Status"
    )
    assigned_admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tickets",
        verbose_name="Assigned Admin"
    )
    related_order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_tickets",
        verbose_name="Related Order"
    )
    related_product = models.ForeignKey(
        "products.Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_tickets",
        verbose_name="Related Product"
    )
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name="Resolved At")

    class Meta(BaseModel.Meta):
        verbose_name = "Support Ticket"
        verbose_name_plural = "Support Tickets"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.ticket_number} - {self.subject} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            now = timezone.now()
            date_str = now.strftime("%Y%m")
            count = SupportTicket.objects.filter(
                created_at__year=now.year,
                created_at__month=now.month
            ).count() + 1
            self.ticket_number = f"SUP-{date_str}-{count:05d}"
        
        if self.status == TicketStatus.RESOLVED and not self.resolved_at:
            self.resolved_at = timezone.now()
        elif self.status != TicketStatus.RESOLVED:
            self.resolved_at = None
            
        super().save(*args, **kwargs)

class SupportMessage(BaseModel):
    ticket = models.ForeignKey(
        SupportTicket,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="Support Ticket"
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="support_messages",
        verbose_name="Sender"
    )
    message = models.TextField(verbose_name="Message")
    attachment = models.FileField(
        upload_to="support_attachments/%Y/%m/",
        null=True,
        blank=True,
        validators=[validate_support_attachment],
        verbose_name="Attachment File"
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Support Message"
        verbose_name_plural = "Support Messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"Msg from {self.sender.email} on ticket {self.ticket.ticket_number}"

class TicketTimeline(BaseModel):
    ticket = models.ForeignKey(
        SupportTicket,
        on_delete=models.CASCADE,
        related_name="timeline",
        verbose_name="Support Ticket"
    )
    action = models.CharField(max_length=255, verbose_name="Action")
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Performed By"
    )
    notes = models.TextField(blank=True, default="", verbose_name="Notes")

    class Meta(BaseModel.Meta):
        verbose_name = "Ticket Timeline Event"
        verbose_name_plural = "Ticket Timeline Events"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.ticket.ticket_number} - {self.action} at {self.created_at}"

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("Timeline entries are immutable.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Timeline entries cannot be deleted.")


# ============================================================
# Tier-1 Customer Support FAQ System
# ============================================================

class FAQCategory(BaseModel):
    name = models.CharField(max_length=100, verbose_name="Category Name")
    slug = models.SlugField(max_length=120, unique=True, db_index=True)
    icon = models.CharField(max_length=50, default="HelpCircle", verbose_name="Icon Name")
    display_order = models.PositiveIntegerField(default=0, verbose_name="Display Order")
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta(BaseModel.Meta):
        db_table = "faq_categories"
        verbose_name = "FAQ Category"
        verbose_name_plural = "FAQ Categories"
        ordering = ["display_order", "name"]

    def __str__(self):
        return self.name


class ActionButtonType(models.TextChoices):
    TRACK_ORDER = "track_order", "Track Order"
    VIEW_ORDERS = "view_orders", "View Orders"
    RETRY_PAYMENT = "retry_payment", "Retry Payment"
    REQUEST_RETURN = "request_return", "Request Return"
    CUSTOM_LINK = "custom_link", "Custom Link"


class FAQItem(BaseModel):
    category = models.ForeignKey(
        FAQCategory,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Category",
    )
    question = models.CharField(max_length=255, verbose_name="Question")
    slug = models.SlugField(max_length=280, unique=True, db_index=True)
    answer = models.TextField(verbose_name="Answer Content (Markdown Supported)")

    action_button_label = models.CharField(max_length=100, blank=True, default="", verbose_name="Action Button Label")
    action_button_url = models.CharField(max_length=255, blank=True, default="", verbose_name="Action Button Target URL")
    action_button_type = models.CharField(
        max_length=30,
        choices=ActionButtonType.choices,
        default=ActionButtonType.CUSTOM_LINK,
        blank=True,
    )

    icon_name = models.CharField(max_length=50, default="HelpCircle", verbose_name="Icon Name")
    display_order = models.PositiveIntegerField(default=0, verbose_name="Display Order")
    is_featured = models.BooleanField(default=True, db_index=True, verbose_name="Featured on Support Center Landing")
    is_active = models.BooleanField(default=True, db_index=True)

    helpful_count = models.PositiveIntegerField(default=0)
    unhelpful_count = models.PositiveIntegerField(default=0)

    class Meta(BaseModel.Meta):
        db_table = "faq_items"
        verbose_name = "FAQ Item"
        verbose_name_plural = "FAQ Items"
        ordering = ["display_order", "created_at"]

    def __str__(self):
        return self.question


class FAQFeedback(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    faq = models.ForeignKey(FAQItem, on_delete=models.CASCADE, related_name="feedback_entries")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    is_helpful = models.BooleanField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "faq_feedback"
        verbose_name = "FAQ Feedback"
        verbose_name_plural = "FAQ Feedback Entries"

