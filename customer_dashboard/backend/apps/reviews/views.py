"""
FAAZO – Product Reviews API Views
=================================
REST controllers for public product reviews, customer review submissions,
helpful voting, and admin moderation workflows.
"""

import logging
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, JSONParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdmin
from apps.products.models import Product
from apps.reviews.models import ProductReview, ReviewStatus, ReviewMedia, MediaType
from apps.reviews.serializers import (
    ProductReviewSerializer,
    ReviewCreateUpdateSerializer,
    AdminReviewModerationSerializer,
)
from apps.reviews.services import ReviewService

logger = logging.getLogger("faazo.reviews")


def _ok(data=None, message: str = "Success.", status_code: int = status.HTTP_200_OK):
    payload = {"success": True, "message": message}
    if data is not None:
        payload["data"] = data
    return Response(payload, status=status_code)


def _error(message: str, errors=None, status_code: int = status.HTTP_400_BAD_REQUEST):
    payload = {"success": False, "message": message}
    if errors is not None:
        payload["errors"] = errors
    return Response(payload, status=status_code)


class PublicProductReviewsView(APIView):
    """
    GET /api/v1/products/<slug_or_id>/reviews/

    Public API to list approved reviews for a product with rating summary & filtering.
    Filters:
      - rating: 1, 2, 3, 4, 5
      - has_photos: true
      - has_videos: true
      - sort: recent (default), rating_high, rating_low, helpful
    """
    permission_classes = [AllowAny]

    def get(self, request, identifier):
        # Resolve product by ID or slug
        try:
            if identifier.count("-") == 4 and len(identifier) == 36:
                product = Product.objects.get(id=identifier, is_deleted=False)
            else:
                product = Product.objects.get(slug=identifier, is_deleted=False)
        except Product.DoesNotExist:
            return _error("Product not found.", status_code=status.HTTP_404_NOT_FOUND)

        queryset = ProductReview.objects.filter(
            product=product,
            status=ReviewStatus.APPROVED,
            is_deleted=False,
        ).select_related("user", "user__profile").prefetch_related("media", "votes")

        # Filters
        rating_filter = request.query_params.get("rating")
        if rating_filter and rating_filter.isdigit():
            queryset = queryset.filter(rating=int(rating_filter))

        if request.query_params.get("has_photos") == "true":
            queryset = queryset.filter(media__media_type=MediaType.IMAGE).distinct()

        if request.query_params.get("has_videos") == "true":
            queryset = queryset.filter(media__media_type=MediaType.VIDEO).distinct()

        # Sort
        sort = request.query_params.get("sort", "recent")
        if sort == "rating_high":
            queryset = queryset.order_by("-rating", "-created_at")
        elif sort == "rating_low":
            queryset = queryset.order_by("rating", "-created_at")
        elif sort == "helpful":
            queryset = queryset.order_by("-helpful_count", "-created_at")
        else:
            queryset = queryset.order_by("-created_at")

        # Pagination
        try:
            page = int(request.query_params.get("page", 1))
            page_size = int(request.query_params.get("page_size", 10))
        except ValueError:
            page, page_size = 1, 10

        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        reviews = queryset[start:end]

        serializer = ProductReviewSerializer(reviews, many=True, context={"request": request})

        summary = {
            "average_rating": float(product.average_rating),
            "total_reviews": product.total_reviews,
            "rating_distribution": product.rating_distribution or {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
        }

        return _ok(
            data={
                "summary": summary,
                "reviews": serializer.data,
                "pagination": {
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
                },
            }
        )


class ReviewEligibilityView(APIView):
    """
    GET /api/v1/reviews/eligibility/?product_id=<id>

    Checks if current authenticated user can write or edit a review for the product.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        product_id = request.query_params.get("product_id")
        if not product_id:
            return _error("product_id parameter is required.")

        result = ReviewService.check_eligibility(request.user, product_id)
        return _ok(data=result)


class CustomerReviewViewSet(viewsets.ViewSet):
    """
    Customer Review Operations:
      - POST   /api/v1/reviews/               (Create review + files)
      - PUT    /api/v1/reviews/<id>/          (Edit review)
      - DELETE /api/v1/reviews/<id>/          (Soft delete review)
      - GET    /api/v1/reviews/me/            (My review history)
      - POST   /api/v1/reviews/<id>/vote/     (Helpful vote)
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def create(self, request):
        serializer = ReviewCreateUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Invalid review data.", errors=serializer.errors)

        product_id = request.data.get("product_id")
        if not product_id:
            return _error("product_id is required.")

        # Extract uploaded files (files or media or images/video)
        files = request.FILES.getlist("files") or request.FILES.getlist("media") or []
        for key in request.FILES:
            if key not in ["files", "media"]:
                files.extend(request.FILES.getlist(key))

        try:
            review = ReviewService.create_review(
                user=request.user,
                product_id=product_id,
                data=serializer.validated_data,
                files=files,
            )
            output = ProductReviewSerializer(review, context={"request": request})
            return _ok(
                data=output.data,
                message="Review submitted successfully! It is pending moderation.",
                status_code=status.HTTP_201_CREATED,
            )
        except Exception as exc:
            logger.error("[ReviewViewSet] Error creating review: %s", exc)
            return _error(str(exc))

    def update(self, request, pk=None):
        try:
            review = ProductReview.objects.get(id=pk, is_deleted=False)
        except ProductReview.DoesNotExist:
            return _error("Review not found.", status_code=status.HTTP_404_NOT_FOUND)

        serializer = ReviewCreateUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return _error("Invalid review data.", errors=serializer.errors)

        files = request.FILES.getlist("files") or request.FILES.getlist("media") or []
        delete_media_ids = request.data.getlist("delete_media_ids") if hasattr(request.data, "getlist") else request.data.get("delete_media_ids", [])

        try:
            updated = ReviewService.update_review(
                review=review,
                user=request.user,
                data=serializer.validated_data,
                new_files=files,
                delete_media_ids=delete_media_ids,
            )
            output = ProductReviewSerializer(updated, context={"request": request})
            return _ok(data=output.data, message="Review updated successfully.")
        except Exception as exc:
            return _error(str(exc))

    def destroy(self, request, pk=None):
        try:
            review = ProductReview.objects.get(id=pk, user=request.user, is_deleted=False)
        except ProductReview.DoesNotExist:
            return _error("Review not found.", status_code=status.HTTP_404_NOT_FOUND)

        review.is_deleted = True
        review.save()
        ReviewService.recalculate_product_ratings(str(review.product_id))
        return _ok(message="Review deleted successfully.")

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        reviews = ProductReview.objects.filter(
            user=request.user, is_deleted=False
        ).select_related("product").prefetch_related("media").order_by("-created_at")

        serializer = ProductReviewSerializer(reviews, many=True, context={"request": request})
        return _ok(data=serializer.data)

    @action(detail=True, methods=["post"], url_path="vote")
    def vote(self, request, pk=None):
        try:
            review = ProductReview.objects.get(id=pk, is_deleted=False)
        except ProductReview.DoesNotExist:
            return _error("Review not found.", status_code=status.HTTP_404_NOT_FOUND)

        is_helpful = request.data.get("is_helpful", True)
        if isinstance(is_helpful, str):
            is_helpful = is_helpful.lower() == "true"

        counts = ReviewService.vote_helpful(review, request.user, bool(is_helpful))
        return _ok(data=counts, message="Vote recorded.")


class AdminReviewModerationViewSet(viewsets.ViewSet):
    """
    Admin Moderation ViewSet:
      - GET   /api/v1/admin/reviews/
      - PATCH /api/v1/admin/reviews/<id>/status/
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [JSONParser]

    def list(self, request):
        queryset = ProductReview.objects.filter(
            is_deleted=False
        ).select_related("user", "product", "order").prefetch_related("media")

        # Filters
        status_filter = request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        rating_filter = request.query_params.get("rating")
        if rating_filter and rating_filter.isdigit():
            queryset = queryset.filter(rating=int(rating_filter))

        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(product__name__icontains=search) |
                Q(user__email__icontains=search) |
                Q(user__full_name__icontains=search) |
                Q(title__icontains=search)
            )

        queryset = queryset.order_by("-created_at")

        # Pagination
        try:
            page = int(request.query_params.get("page", 1))
            page_size = int(request.query_params.get("page_size", 10))
        except ValueError:
            page, page_size = 1, 10

        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        reviews = queryset[start:end]

        serializer = ProductReviewSerializer(reviews, many=True, context={"request": request})

        counts_by_status = {
            "pending": ProductReview.objects.filter(status=ReviewStatus.PENDING, is_deleted=False).count(),
            "approved": ProductReview.objects.filter(status=ReviewStatus.APPROVED, is_deleted=False).count(),
            "rejected": ProductReview.objects.filter(status=ReviewStatus.REJECTED, is_deleted=False).count(),
            "hidden": ProductReview.objects.filter(status=ReviewStatus.HIDDEN, is_deleted=False).count(),
        }

        return _ok(
            data={
                "counts": counts_by_status,
                "reviews": serializer.data,
                "pagination": {
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
                },
            }
        )

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        try:
            review = ProductReview.objects.get(id=pk, is_deleted=False)
        except ProductReview.DoesNotExist:
            return _error("Review not found.", status_code=status.HTTP_404_NOT_FOUND)

        serializer = AdminReviewModerationSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Invalid moderation request.", errors=serializer.errors)

        new_status = serializer.validated_data["status"]
        reason = serializer.validated_data.get("rejection_reason", "")

        try:
            updated = ReviewService.moderate_review(
                review=review,
                status=new_status,
                rejection_reason=reason,
                admin_user=request.user,
            )
            output = ProductReviewSerializer(updated, context={"request": request})
            return _ok(data=output.data, message=f"Review status updated to {new_status}.")
        except Exception as exc:
            return _error(str(exc))
