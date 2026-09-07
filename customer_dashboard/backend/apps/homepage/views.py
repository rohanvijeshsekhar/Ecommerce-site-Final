"""
FAAZO – Homepage CMS Views

Pattern:
  - Public GET endpoints (AllowAny) for storefront consumption
  - Admin CRUD (IsAdmin + IsAuthenticated) for all sections
  - Shared /reorder/ action on each viewset
"""

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.viewsets import BaseModelViewSet
from apps.common.permissions import IsAdmin
from apps.common.responses import success_response, error_response

from .models import (
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
    ordering = ["sort_order", "created_at"]

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
    ordering = ["sort_order", "created_at"]

    def get_queryset(self):
        qs = FeaturedCollection.objects.prefetch_related(
            "items__product__images"
        )
        if not (self.request.user.is_authenticated and
                getattr(self.request.user, "role", None) == "admin"):
            qs = qs.filter(is_visible=True)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return FeaturedCollectionWriteSerializer
        return FeaturedCollectionReadSerializer


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
    ordering = ["sort_order", "created_at"]

    def get_queryset(self):
        qs = RecommendedProduct.objects.select_related(
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
