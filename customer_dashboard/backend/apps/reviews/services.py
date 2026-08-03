"""
FAAZO – Product Reviews Service Layer
======================================
Contains all business logic for review eligibility verification,
rating aggregation recalculation, file processing, and admin moderation notifications.
"""

import html
import logging
import os
from decimal import Decimal
from typing import Dict, Any, List, Tuple, Optional

from django.db import transaction
from django.db.models import Avg, Count
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.orders.models import Order, OrderStatus
from apps.products.models import Product
from apps.reviews.models import ProductReview, ReviewMedia, ReviewHelpfulVote, ReviewStatus, MediaType
from apps.notifications.services import NotificationService
from apps.notifications.models import NotificationType, DeliveryChannel, NotificationPriority

logger = logging.getLogger("faazo.reviews")

# Validation limits
MAX_IMAGES_PER_REVIEW = 5
MAX_VIDEOS_PER_REVIEW = 1
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024    # 5 MB
MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB

ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_MIMES = {"video/mp4", "video/quicktime", "video/webm"}


def _sanitize_text(text: Optional[str]) -> str:
    """Strip dangerous HTML tags to prevent XSS attacks."""
    if not text:
        return ""
    return html.escape(text.strip())


class ReviewService:
    @staticmethod
    def check_eligibility(user, product_id: str) -> Dict[str, Any]:
        """
        Check if the user is eligible to write or edit a review for the given product.
        Must have a DELIVERED order containing this product.
        """
        if not user or not user.is_authenticated:
            return {
                "can_review": False,
                "reason": "You must be logged in to review products.",
                "existing_review_id": None,
                "order_id": None,
            }

        # Check for existing review
        existing_review = ProductReview.objects.filter(
            user=user, product_id=product_id, is_deleted=False
        ).first()

        if existing_review:
            return {
                "can_review": True,
                "is_edit": True,
                "existing_review_id": str(existing_review.id),
                "order_id": str(existing_review.order_id) if existing_review.order_id else None,
                "reason": "You have already submitted a review. You can edit your existing review.",
            }

        # Check for delivered order containing product
        delivered_order = Order.objects.filter(
            user=user,
            status=OrderStatus.DELIVERED,
            items__product_id=product_id,
        ).order_by("-created_at").first()

        if not delivered_order:
            return {
                "can_review": False,
                "is_edit": False,
                "existing_review_id": None,
                "order_id": None,
                "reason": "Only verified customers who have purchased and received this product can write a review.",
            }

        return {
            "can_review": True,
            "is_edit": False,
            "existing_review_id": None,
            "order_id": str(delivered_order.id),
            "reason": "Eligible to write a verified purchase review.",
        }

    @staticmethod
    def recalculate_product_ratings(product_id: str) -> None:
        """
        Recalculate average rating, total count, and 1-5 star distribution
        for all APPROVED reviews of a product, and update the Product model.
        """
        try:
            approved_reviews = ProductReview.objects.filter(
                product_id=product_id,
                status=ReviewStatus.APPROVED,
                is_deleted=False,
            )

            total_count = approved_reviews.count()

            if total_count == 0:
                Product.objects.filter(id=product_id).update(
                    average_rating=Decimal("0.00"),
                    total_reviews=0,
                    rating_distribution={"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
                )
                return

            avg_rating = approved_reviews.aggregate(avg=Avg("rating"))["avg"] or 0.0
            avg_decimal = Decimal(str(round(avg_rating, 2)))

            # Calculate rating distribution
            distribution = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
            counts_by_rating = approved_reviews.values("rating").annotate(count=Count("id"))
            for item in counts_by_rating:
                r_key = str(item["rating"])
                if r_key in distribution:
                    distribution[r_key] = item["count"]

            Product.objects.filter(id=product_id).update(
                average_rating=avg_decimal,
                total_reviews=total_count,
                rating_distribution=distribution,
            )
            logger.info("[ReviewService] Recalculated ratings for product %s: avg=%s total=%d", product_id, avg_decimal, total_count)
        except Exception as exc:
            logger.error("[ReviewService Error] Failed to recalculate ratings for product %s: %s", product_id, exc, exc_info=True)

    @classmethod
    @transaction.atomic
    def create_review(cls, user, product_id: str, data: Dict[str, Any], files: List[Any] = None) -> ProductReview:
        """
        Create a new product review after validating eligibility & file constraints.
        """
        eligibility = cls.check_eligibility(user, product_id)
        if not eligibility["can_review"]:
            raise ValidationError(eligibility["reason"])

        if eligibility.get("is_edit"):
            raise ValidationError("You have already submitted a review for this product. Please use edit instead.")

        product = Product.objects.get(id=product_id)
        order_id = eligibility["order_id"]

        # Instantiate review
        review = ProductReview.objects.create(
            product=product,
            user=user,
            order_id=order_id,
            rating=data["rating"],
            title=_sanitize_text(data.get("title", "")),
            comment=_sanitize_text(data.get("comment", "")),
            pros=_sanitize_text(data.get("pros", "")),
            cons=_sanitize_text(data.get("cons", "")),
            would_recommend=data.get("would_recommend", True),
            is_verified_purchase=True,
            status=ReviewStatus.PENDING,
        )

        # Process uploaded files
        if files:
            cls._attach_media(review, files)

        logger.info("[ReviewService] Created review %s for product %s by %s", review.id, product_id, user.email)
        return review

    @classmethod
    @transaction.atomic
    def update_review(
        cls,
        review: ProductReview,
        user,
        data: Dict[str, Any],
        new_files: List[Any] = None,
        delete_media_ids: List[str] = None,
    ) -> ProductReview:
        """
        Update an existing review. Resets status to PENDING for re-moderation.
        """
        if review.user_id != user.id and not getattr(user, "is_staff", False):
            raise ValidationError("You do not have permission to edit this review.")

        if "rating" in data:
            review.rating = data["rating"]
        if "title" in data:
            review.title = _sanitize_text(data["title"])
        if "comment" in data:
            review.comment = _sanitize_text(data["comment"])
        if "pros" in data:
            review.pros = _sanitize_text(data["pros"])
        if "cons" in data:
            review.cons = _sanitize_text(data["cons"])
        if "would_recommend" in data:
            review.would_recommend = data["would_recommend"]

        # Reset moderation status on user edit
        review.status = ReviewStatus.PENDING
        review.save()

        # Delete requested media attachments
        if delete_media_ids:
            ReviewMedia.objects.filter(review=review, id__in=delete_media_ids).delete()

        # Attach new media within limits
        if new_files:
            cls._attach_media(review, new_files)

        cls.recalculate_product_ratings(str(review.product_id))
        logger.info("[ReviewService] Updated review %s by %s", review.id, user.email)
        return review

    @classmethod
    def _attach_media(cls, review: ProductReview, files: List[Any]) -> None:
        """
        Validate and attach image/video files to a review.
        Enforces maximum 5 images and 1 video limits + file size checks.
        """
        existing_images = ReviewMedia.objects.filter(review=review, media_type=MediaType.IMAGE).count()
        existing_videos = ReviewMedia.objects.filter(review=review, media_type=MediaType.VIDEO).count()

        new_images_count = 0
        new_videos_count = 0

        for f in files:
            content_type = getattr(f, "content_type", "").lower()
            size = getattr(f, "size", 0)

            is_image = content_type.startswith("image/") or any(f.name.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"])
            is_video = content_type.startswith("video/") or any(f.name.lower().endswith(ext) for ext in [".mp4", ".mov", ".webm"])

            if is_image:
                new_images_count += 1
                if existing_images + new_images_count > MAX_IMAGES_PER_REVIEW:
                    raise ValidationError(f"Maximum {MAX_IMAGES_PER_REVIEW} images allowed per review.")
                if size > MAX_IMAGE_SIZE_BYTES:
                    raise ValidationError(f"Image '{f.name}' exceeds the 5 MB size limit.")
                
                ReviewMedia.objects.create(
                    review=review,
                    media_type=MediaType.IMAGE,
                    file=f,
                    file_size=size,
                    mime_type=content_type or "image/jpeg",
                    display_order=existing_images + new_images_count,
                )

            elif is_video:
                new_videos_count += 1
                if existing_videos + new_videos_count > MAX_VIDEOS_PER_REVIEW:
                    raise ValidationError(f"Maximum {MAX_VIDEOS_PER_REVIEW} video allowed per review.")
                if size > MAX_VIDEO_SIZE_BYTES:
                    raise ValidationError(f"Video '{f.name}' exceeds the 100 MB size limit.")

                ReviewMedia.objects.create(
                    review=review,
                    media_type=MediaType.VIDEO,
                    file=f,
                    file_size=size,
                    mime_type=content_type or "video/mp4",
                    display_order=existing_videos + new_videos_count,
                )

            else:
                raise ValidationError(f"Unsupported file type '{f.name}'. Allowed: JPG, PNG, WEBP, MP4, MOV, WEBM.")

    @classmethod
    @transaction.atomic
    def moderate_review(cls, review: ProductReview, status: str, rejection_reason: str = "", admin_user=None) -> ProductReview:
        """
        Admin moderation action (APPROVE, REJECT, HIDE).
        Triggers NotificationService alert to the customer.
        """
        old_status = review.status
        review.status = status
        if rejection_reason:
            review.rejection_reason = _sanitize_text(rejection_reason)
        review.save()

        # Recalculate ratings
        cls.recalculate_product_ratings(str(review.product_id))

        # Send notification to user
        if status == ReviewStatus.APPROVED:
            try:
                NotificationService.create(
                    user=review.user,
                    notification_type=NotificationType.REVIEW_APPROVED,
                    title="Review Published",
                    message=f"Your review for '{review.product.name}' has been approved and is now live!",
                    channels=[DeliveryChannel.IN_APP, DeliveryChannel.EMAIL],
                    priority=NotificationPriority.NORMAL,
                    metadata={"review_id": str(review.id), "product_id": str(review.product_id)},
                )
            except Exception as e:
                logger.error("[ReviewService] Failed to send approval notification: %s", e)

        elif status == ReviewStatus.REJECTED:
            try:
                NotificationService.create(
                    user=review.user,
                    notification_type=NotificationType.REVIEW_REJECTED,
                    title="Review Moderation Notice",
                    message=f"Your review for '{review.product.name}' could not be published. Reason: {review.rejection_reason or 'Does not meet guidelines.'}",
                    channels=[DeliveryChannel.IN_APP, DeliveryChannel.EMAIL],
                    priority=NotificationPriority.NORMAL,
                    metadata={"review_id": str(review.id), "product_id": str(review.product_id), "reason": review.rejection_reason},
                )
            except Exception as e:
                logger.error("[ReviewService] Failed to send rejection notification: %s", e)

        logger.info("[ReviewService] Admin %s changed review %s status from %s to %s", admin_user, review.id, old_status, status)
        return review

    @staticmethod
    def vote_helpful(review: ProductReview, user, is_helpful: bool) -> Dict[str, int]:
        """
        Vote helpful or unhelpful on a review.
        """
        vote, created = ReviewHelpfulVote.objects.get_or_create(
            review=review, user=user, defaults={"is_helpful": is_helpful}
        )
        if not created:
            if vote.is_helpful != is_helpful:
                vote.is_helpful = is_helpful
                vote.save()
            else:
                # Toggle off vote if clicked again
                vote.delete()

        # Recount votes
        helpful_count = ReviewHelpfulVote.objects.filter(review=review, is_helpful=True).count()
        unhelpful_count = ReviewHelpfulVote.objects.filter(review=review, is_helpful=False).count()

        review.helpful_count = helpful_count
        review.unhelpful_count = unhelpful_count
        review.save(update_fields=["helpful_count", "unhelpful_count"])

        return {"helpful_count": helpful_count, "unhelpful_count": unhelpful_count}
