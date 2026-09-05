from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.viewsets import BaseModelViewSet
from apps.common.permissions import IsAdmin
from apps.common.responses import success_response, error_response

from .models import ComboDeal, ComboDealProduct, ComboDealImage, ComboDealStatus, ComboDealBannerSetting
from .serializers import (
    ComboDealReadSerializer,
    ComboDealWriteSerializer,
    ComboDealImageSerializer,
    ComboDealBannerSettingSerializer,
)


class ComboDealViewSet(BaseModelViewSet):
    """
    CRUD for Combo Deals.
    """
    lookup_field = "slug"
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    filterset_fields = ["status", "is_featured"]
    search_fields    = ["title", "short_description"]
    ordering_fields  = ["title", "created_at", "status", "combo_price"]
    ordering         = ["-created_at"]

    def get_queryset(self):
        qs = ComboDeal.objects.prefetch_related(
            "images",
            "combo_products",
            "combo_products__product",
            "combo_products__product__brand",
            "combo_products__product__category",
            "combo_products__product__images",
            "combo_products__product__pricing",
            "combo_products__product__inventory"
        )
        # Non-admins only see active published combos
        if not (self.request.user.is_authenticated and getattr(self.request.user, "role", None) == "admin"):
            qs = qs.filter(status=ComboDealStatus.ACTIVE)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ComboDealWriteSerializer
        return ComboDealReadSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def create(self, request, *args, **kwargs):
        """Override to return read serializer data after creation."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        instance = serializer.instance
        read_serializer = ComboDealReadSerializer(instance, context=self.get_serializer_context())
        headers = self.get_success_headers(read_serializer.data)
        return Response(
            {
                "success": True,
                "data": read_serializer.data,
                "message": "Combo deal created successfully.",
                "meta": None,
            },
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def update(self, request, *args, **kwargs):
        """Override to return read serializer data after update."""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, "_prefetched_objects_cache", None):
            instance._prefetched_objects_cache = {}

        # Re-fetch to get updated prefetch data
        instance = self.get_object()
        read_serializer = ComboDealReadSerializer(instance, context=self.get_serializer_context())
        return Response(
            {
                "success": True,
                "data": read_serializer.data,
                "message": "Combo deal updated successfully.",
                "meta": None,
            },
            status=status.HTTP_200_OK,
        )

    # ── Duplicate Combo action ───────────────────────────────────────────────
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdmin])
    def duplicate(self, request, slug=None):
        """POST /api/v1/combos/{slug}/duplicate/ — duplicate combo deal."""
        original = self.get_object()

        # Clone the main object
        cloned = ComboDeal.objects.create(
            title=f"{original.title} (Copy)",
            short_description=original.short_description,
            full_description=original.full_description,
            thumbnail=original.thumbnail,
            banner=original.banner,
            combo_price=original.combo_price,
            dealer_price=original.dealer_price,
            offer_price=original.offer_price,
            offer_start_date=original.offer_start_date,
            offer_end_date=original.offer_end_date,
            is_featured=False,
            status=ComboDealStatus.DRAFT,
            inventory=original.inventory,
            meta_title=original.meta_title,
            meta_description=original.meta_description,
            meta_keywords=original.meta_keywords,
            created_by=request.user,
            updated_by=request.user,
        )

        # Clone the products
        for cp in original.combo_products.all():
            ComboDealProduct.objects.create(
                combo_deal=cloned,
                product=cp.product,
                quantity=cp.quantity
            )

        # Clone the gallery images
        for img in original.images.all():
            ComboDealImage.objects.create(
                combo_deal=cloned,
                image=img.image,
                alt_text=img.alt_text,
                sort_order=img.sort_order
            )

        cloned.calculate_original_price()

        serializer = ComboDealReadSerializer(cloned, context=self.get_serializer_context())
        return success_response(
            data=serializer.data,
            message="Combo deal duplicated.",
            status_code=status.HTTP_201_CREATED
        )

    # ── Image management actions ──────────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="images",
            permission_classes=[IsAuthenticated, IsAdmin],
            parser_classes=[MultiPartParser, FormParser])
    def upload_image(self, request, slug=None):
        """POST /api/v1/combos/{slug}/images/ — upload gallery image."""
        combo_deal = self.get_object()
        serializer = ComboDealImageSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        serializer.save(combo_deal=combo_deal)

        return success_response(
            data=serializer.data,
            message="Gallery image uploaded.",
            status_code=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["delete"], url_path=r"images/(?P<image_id>[^/.]+)",
            permission_classes=[IsAuthenticated, IsAdmin])
    def delete_image(self, request, slug=None, image_id=None):
        """DELETE /api/v1/combos/{slug}/images/{id}/ — delete gallery image."""
        combo_deal = self.get_object()
        try:
            image = combo_deal.images.get(id=image_id)
        except ComboDealImage.DoesNotExist:
            return error_response("Image not found.", status_code=status.HTTP_404_NOT_FOUND)
        image.delete()
        return success_response(message="Gallery image deleted.")


class ComboDealBannerSettingView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get(self, request):
        setting, created = ComboDealBannerSetting.objects.get_or_create(id=1)
        serializer = ComboDealBannerSettingSerializer(setting, context={"request": request})
        return Response({
            "success": True,
            "data": serializer.data,
            "message": "Banner settings retrieved successfully."
        })

    def patch(self, request):
        setting, created = ComboDealBannerSetting.objects.get_or_create(id=1)
        serializer = ComboDealBannerSettingSerializer(setting, data=request.data, partial=True, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True,
                "data": serializer.data,
                "message": "Banner settings updated successfully."
            })
        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        return self.patch(request)

