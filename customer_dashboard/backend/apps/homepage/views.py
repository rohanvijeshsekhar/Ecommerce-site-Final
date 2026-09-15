"""
FAAZO – Homepage CMS Views

Pattern:
  - Public GET endpoints (AllowAny) for storefront consumption
  - Admin CRUD (IsAdmin + IsAuthenticated) for all sections
  - Shared /reorder/ action on each viewset
"""

from django.db import models
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.viewsets import BaseModelViewSet
from apps.common.permissions import IsAdmin
from apps.common.responses import success_response, error_response

from .models import (
    HomepagePromoBanner,
    HeroSlide,
    HomepageCategory,
    HomepageBrand,
    BestSeller,
    FeaturedCollection,
    FeaturedCollectionItem,
    LimitedTimeOffer,
    ExploreSolution,
    Testimonial,
    RecommendedProduct,
    SpecialOffersPageContent,
)
from .serializers import (
    HomepagePromoBannerSerializer,
    HeroSlideReadSerializer, HeroSlideWriteSerializer,
    HomepageCategoryReadSerializer, HomepageCategoryWriteSerializer,
    HomepageBrandReadSerializer, HomepageBrandWriteSerializer,
    BestSellerReadSerializer, BestSellerWriteSerializer,
    FeaturedCollectionReadSerializer, FeaturedCollectionWriteSerializer,
    FeaturedCollectionItemReadSerializer, FeaturedCollectionItemWriteSerializer,
    LimitedTimeOfferReadSerializer, LimitedTimeOfferWriteSerializer,
    ExploreSolutionReadSerializer, ExploreSolutionWriteSerializer,
    TestimonialReadSerializer, TestimonialWriteSerializer,
    RecommendedProductReadSerializer, RecommendedProductWriteSerializer,
    ReorderSerializer,
    SpecialOffersPageContentSerializer,
)


# ── Mixin: shared reorder action ──────────────────────────────────────────────

class ReorderMixin:
    """
    Adds a PATCH /reorder/ action that accepts [{id, sort_order}] and bulk-updates.
    """

    @action(detail=False, methods=["patch"], url_path="reorder",
            permission_classes=[IsAuthenticated, IsAdmin])
    def reorder(self, request):
        serializer = ReorderSerializer(data=request.data, many=True)
        if not serializer.is_valid():
            return error_response(serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        model = self.get_queryset().model
        for item in serializer.validated_data:
            model.objects.filter(pk=item["id"]).update(sort_order=item["sort_order"])

        return success_response(message="Sort order updated.")


# ============================================================
# 1. Hero Slides
# ============================================================

class HeroSlideViewSet(ReorderMixin, BaseModelViewSet):
    """
    list/retrieve: public
    create/update/delete/reorder: admin only
    """
    ordering = ["sort_order", "created_at"]

    def get_queryset(self):
        qs = HeroSlide.objects.all()
        if not (self.request.user.is_authenticated and
                getattr(self.request.user, "role", None) == "admin"):
            qs = qs.filter(is_active=True)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return HeroSlideWriteSerializer
        return HeroSlideReadSerializer


# ============================================================
# 2. Homepage Categories
# ============================================================

class HomepageCategoryViewSet(ReorderMixin, BaseModelViewSet):
    ordering = ["sort_order", "created_at"]

    def get_queryset(self):
        qs = HomepageCategory.objects.select_related("category")
        if not (self.request.user.is_authenticated and
                getattr(self.request.user, "role", None) == "admin"):
            qs = qs.filter(is_visible=True, category__is_active=True)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return HomepageCategoryWriteSerializer
        return HomepageCategoryReadSerializer


# ============================================================
# 3. Homepage Brands
# ============================================================

class HomepageBrandViewSet(ReorderMixin, BaseModelViewSet):
    ordering = ["-updated_at"]

    def get_queryset(self):
        qs = HomepageBrand.objects.select_related("brand")
        if not (self.request.user.is_authenticated and
                getattr(self.request.user, "role", None) == "admin"):
            qs = qs.filter(is_visible=True, brand__is_active=True)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return HomepageBrandWriteSerializer
        return HomepageBrandReadSerializer


# ============================================================
# 4. Best Sellers
# ============================================================

class BestSellerViewSet(ReorderMixin, BaseModelViewSet):
    ordering = ["sort_order", "created_at"]

    def get_queryset(self):
        qs = BestSeller.objects.select_related(
            "product", "product__brand", "product__category"
        ).prefetch_related("product__images")
        if not (self.request.user.is_authenticated and
                getattr(self.request.user, "role", None) == "admin"):
            qs = qs.filter(is_visible=True, product__status="active", product__is_deleted=False)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return BestSellerWriteSerializer
        return BestSellerReadSerializer


# ============================================================
# 5. Featured Collections
# ============================================================

class FeaturedCollectionViewSet(ReorderMixin, BaseModelViewSet):
    ordering = ["sort_order", "-updated_at"]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = FeaturedCollection.objects.prefetch_related(
            "items__product__images"
        )
        if not (self.request.user.is_authenticated and
                getattr(self.request.user, "role", None) == "admin"):
            from django.utils import timezone
            now = timezone.now()
            qs = qs.filter(
                is_visible=True
            ).filter(
                models.Q(start_date__isnull=True) | models.Q(start_date__lte=now),
                models.Q(end_date__isnull=True) | models.Q(end_date__gte=now),
            )
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return FeaturedCollectionWriteSerializer
        return FeaturedCollectionReadSerializer

    @action(detail=True, methods=["post"], url_path="duplicate")
    def duplicate(self, request, pk=None):
        original = self.get_object()
        cloned = FeaturedCollection.objects.create(
            title=f"{original.title} (Copy)",
            description=original.description,
            image=original.image,
            mobile_image=original.mobile_image,
            banner_layout=original.banner_layout,
            content_width=original.content_width,
            horizontal_alignment=original.horizontal_alignment,
            vertical_alignment=original.vertical_alignment,
            badge_text=original.badge_text,
            offer_text=original.offer_text,
            secondary_text=original.secondary_text,
            cta_text=original.cta_text,
            cta_action_type=original.cta_action_type,
            cta_target_id=original.cta_target_id,
            cta_url=original.cta_url,
            cta_style=original.cta_style,
            cta_open_in_new_tab=original.cta_open_in_new_tab,
            heading_size=original.heading_size,
            heading_weight=original.heading_weight,
            heading_color=original.heading_color,
            description_color=original.description_color,
            badge_color=original.badge_color,
            badge_bg_color=original.badge_bg_color,
            cta_bg_color=original.cta_bg_color,
            cta_text_color=original.cta_text_color,
            cta_border_color=original.cta_border_color,
            bg_color=original.bg_color,
            image_position=original.image_position,
            image_fit=original.image_fit,
            overlay_gradient=original.overlay_gradient,
            overlay_opacity=original.overlay_opacity,
            sort_order=original.sort_order + 1,
            is_visible=False,
        )
        serializer = FeaturedCollectionReadSerializer(cloned, context={"request": request})
        return Response({"success": True, "message": "Banner duplicated successfully.", "data": serializer.data})


class FeaturedCollectionItemViewSet(BaseModelViewSet):
    """Nested under collections for admin item management."""
    ordering = ["sort_order"]

    def get_queryset(self):
        return FeaturedCollectionItem.objects.select_related(
            "product", "collection"
        ).prefetch_related("product__images")

    def get_permissions(self):
        return [IsAuthenticated(), IsAdmin()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return FeaturedCollectionItemWriteSerializer
        return FeaturedCollectionItemReadSerializer


# ============================================================
# 6. Limited Time Offers
# ============================================================

class LimitedTimeOfferViewSet(ReorderMixin, BaseModelViewSet):
    ordering = ["sort_order", "-created_at"]

    def get_queryset(self):
        qs = LimitedTimeOffer.objects.all()
        if not (self.request.user.is_authenticated and
                getattr(self.request.user, "role", None) == "admin"):
            qs = qs.filter(is_active=True)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return LimitedTimeOfferWriteSerializer
        return LimitedTimeOfferReadSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        if instance.is_featured:
            LimitedTimeOffer.objects.exclude(id=instance.id).update(is_featured=False)

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.is_featured:
            LimitedTimeOffer.objects.exclude(id=instance.id).update(is_featured=False)



# ============================================================
# 7. Explore Solutions
# ============================================================

class ExploreSolutionViewSet(ReorderMixin, BaseModelViewSet):
    ordering = ["sort_order", "created_at"]

    def get_queryset(self):
        qs = ExploreSolution.objects.select_related("category")
        if not (self.request.user.is_authenticated and
                getattr(self.request.user, "role", None) == "admin"):
            qs = qs.filter(is_visible=True, category__is_active=True)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ExploreSolutionWriteSerializer
        return ExploreSolutionReadSerializer


# ============================================================
# 8. Testimonials
# ============================================================

class TestimonialViewSet(ReorderMixin, BaseModelViewSet):
    ordering = ["sort_order", "created_at"]

    def get_queryset(self):
        qs = Testimonial.objects.all()
        if not (self.request.user.is_authenticated and
                getattr(self.request.user, "role", None) == "admin"):
            qs = qs.filter(is_active=True)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return TestimonialWriteSerializer
        return TestimonialReadSerializer


# ============================================================
# 9. Recommended Products
# ============================================================

class RecommendedProductViewSet(ReorderMixin, BaseModelViewSet):
    ordering = ["sort_order", "-created_at"]

    def get_queryset(self):
        qs = RecommendedProduct.objects.select_related(
            "product", "product__brand", "product__category", "product__pricing", "product__inventory"
        ).prefetch_related("product__images")
        if not (self.request.user.is_authenticated and
                getattr(self.request.user, "role", None) == "admin"):
            qs = qs.filter(is_visible=True, product__status="active", product__is_deleted=False)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return RecommendedProductWriteSerializer
        return RecommendedProductReadSerializer


# ============================================================
# 10. Special Offers Page Content (CMS Singleton)
# ============================================================

class SpecialOffersPageContentView(APIView):
    """
    GET: Public (AllowAny) - retrieves the singleton Special Offers page hero copy.
    PUT/PATCH: Admin only (IsAuthenticated, IsAdmin) - updates the page hero copy.
    """
    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get(self, request):
        content = SpecialOffersPageContent.get_instance()
        serializer = SpecialOffersPageContentSerializer(content, context={"request": request})
        return success_response(data=serializer.data)

    def patch(self, request):
        content = SpecialOffersPageContent.get_instance()
        serializer = SpecialOffersPageContentSerializer(content, data=request.data, partial=True, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return success_response(data=serializer.data, message="Special offers page content updated successfully.")
        return error_response(message="Invalid data provided.", details=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        return self.patch(request)


# ============================================================
# 11. Homepage Promo Banner (CMS Singleton)
# ============================================================

class HomepagePromoBannerView(APIView):
    """
    GET: Public (AllowAny) - retrieves the singleton Promo / Announcement Banner copy & status.
    PUT/PATCH: Admin only (IsAuthenticated, IsAdmin) - updates the banner.
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get(self, request):
        banner = HomepagePromoBanner.get_instance()
        serializer = HomepagePromoBannerSerializer(banner, context={"request": request})
        return success_response(data=serializer.data)

    def patch(self, request):
        banner = HomepagePromoBanner.get_instance()
        serializer = HomepagePromoBannerSerializer(banner, data=request.data, partial=True, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return success_response(data=serializer.data, message="Homepage promo banner updated successfully.")
        return error_response(message="Invalid data provided.", details=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        return self.patch(request)

