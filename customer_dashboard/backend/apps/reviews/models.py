"""
FAAZO – Product Reviews & Ratings Models
=========================================
Supports verified purchase product ratings (1-5 stars), text reviews,
and image/video media attachments with admin moderation workflows.
"""

import uuid
from django.conf import settings
from django.db import models
from apps.common.image_optimizer import OptimizedImageField
from apps.common.mixins import FullAuditModel, AuditedModel



class ReviewStatus(models.TextChoices):
    PENDING  = "pending",  "Pending Moderation"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    HIDDEN   = "hidden",   "Hidden"


class MediaType(models.TextChoices):
    IMAGE = "image", "Image"
    VIDEO = "video", "Video"


class ProductReview(FullAuditModel):
    """
    Core review model.
    Enforces 1 review per product per user via unique_together constraint.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name="Product",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name="User",
    )
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviews",
        verbose_name="Verified Order",
    )

    rating = models.PositiveSmallIntegerField(
        choices=[(i, f"{i} Stars") for i in range(1, 6)],
        verbose_name="Rating (1-5)",
    )
    title = models.CharField(max_length=200, verbose_name="Title")
    comment = models.TextField(verbose_name="Review Content")
    pros = models.TextField(blank=True, default="", verbose_name="Pros")
    cons = models.TextField(blank=True, default="", verbose_name="Cons")
    would_recommend = models.BooleanField(default=True, verbose_name="Would Recommend")

    is_verified_purchase = models.BooleanField(default=True, db_index=True, verbose_name="Verified Purchase")
    status = models.CharField(
        max_length=20,
        choices=ReviewStatus.choices,
        default=ReviewStatus.PENDING,
        db_index=True,
        verbose_name="Moderation Status",
    )
    rejection_reason = models.TextField(blank=True, default="", verbose_name="Rejection Reason")

    helpful_count = models.PositiveIntegerField(default=0, verbose_name="Helpful Votes")
    unhelpful_count = models.PositiveIntegerField(default=0, verbose_name="Unhelpful Votes")

    class Meta:
        db_table = "product_reviews"
        verbose_name = "Product Review"
        verbose_name_plural = "Product Reviews"
        unique_together = ("user", "product")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["product", "status", "-created_at"]),
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["rating", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.product.name} ({self.rating}★)"


class ReviewMedia(AuditedModel):
    """
    Media attachments (Images & Videos) for product reviews.
    Max 5 images and 1 video allowed per review (enforced in serializer/service).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    review = models.ForeignKey(
        ProductReview,
        on_delete=models.CASCADE,
        related_name="media",
        verbose_name="Review",
    )
    media_type = models.CharField(
        max_length=10,
        choices=MediaType.choices,
        verbose_name="Media Type",
    )
    file = models.FileField(upload_to="reviews/%Y/%m/", verbose_name="File")
    thumbnail = OptimizedImageField(
        upload_to="reviews/thumbnails/%Y/%m/",
        null=True,
        blank=True,
        verbose_name="Thumbnail",
    )
    display_order = models.PositiveSmallIntegerField(default=0, verbose_name="Display Order")
    file_size = models.PositiveIntegerField(default=0, help_text="Size in bytes")
    mime_type = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        db_table = "review_media"
        verbose_name = "Review Media"
        verbose_name_plural = "Review Media Attachments"
        ordering = ["display_order", "created_at"]

    def __str__(self) -> str:
        return f"{self.media_type.upper()} for Review {self.review_id}"


class ReviewHelpfulVote(models.Model):
    """
    Tracks community votes on review helpfulness.
    1 vote per user per review.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    review = models.ForeignKey(
        ProductReview,
        on_delete=models.CASCADE,
        related_name="votes",
        verbose_name="Review",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="review_votes",
        verbose_name="User",
    )
    is_helpful = models.BooleanField(verbose_name="Is Helpful")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "review_helpful_votes"
        verbose_name = "Review Helpful Vote"
        verbose_name_plural = "Review Helpful Votes"
        unique_together = ("review", "user")
