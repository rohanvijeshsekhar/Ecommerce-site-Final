"""
FAAZO – Brand Views
"""

from django.db.models import Count, Q
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from apps.common.viewsets import BaseModelViewSet
from apps.common.permissions import IsAdmin, IsAdminOrReadOnly
from apps.common.responses import success_response, error_response
from apps.products.models import Product
from apps.products.serializers import ProductListSerializer

from .models import Brand, BrandDocument, BrandPageBanner
from .serializers import (
    BrandListSerializer,
    BrandDetailSerializer,
    BrandWriteSerializer,
    BrandDocumentSerializer,
    BrandPageBannerSerializer,
)


class BrandPageBannerView(APIView):
    """
    Public and Admin endpoint for managing the main Brands page hero banner.
    GET  /api/v1/brands/banner/       — retrieve active banner (or default)
    POST /api/v1/brands/admin/banner/ — create / update banner
    """

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        banner = BrandPageBanner.objects.filter(is_active=True).first()
        if not banner:
            # Fallback default if not yet created in admin
            return Response({
                "success": True,
                "data": {
                    "title": "Our Trusted Brands",
                    "subtitle": "Explore premium dental brands trusted by clinics and professionals worldwide.",
                    "banner_image_url": None,
                    "button_text": "Explore Products",
                    "button_link": "#brands-grid",
                    "is_active": True,
                }
            })
        return Response({
            "success": True,
            "data": BrandPageBannerSerializer(banner, context={"request": request}).data,
        })

    def post(self, request):
        banner = BrandPageBanner.objects.first()
        if banner:
            serializer = BrandPageBannerSerializer(banner, data=request.data, partial=True, context={"request": request})
        else:
            serializer = BrandPageBannerSerializer(data=request.data, context={"request": request})

        if serializer.is_valid():
            serializer.save()
            return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK if banner else status.HTTP_201_CREATED)
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class BrandViewSet(BaseModelViewSet):
    """
    CRUD for Brands.

    - Public / authenticated: list + retrieve (read-only)
    - Admin: full CRUD
    """

    lookup_field = "slug"
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    filterset_fields = ["is_active", "is_featured", "country_of_origin"]
    search_fields    = ["name", "short_description", "full_description", "country_of_origin"]
    ordering_fields  = ["display_order", "name", "created_at", "is_featured"]
    ordering         = ["display_order", "name"]

    def get_queryset(self):
        qs = (
            Brand.objects
            .annotate(
                product_count=Count(
                    "products",
                    filter=Q(products__is_deleted=False, products__status="active"),
                    distinct=True,
                )
            )
            .select_related("created_by", "updated_by")
            .prefetch_related("documents")
        )
        if not (self.request.user.is_authenticated and getattr(self.request.user, "role", None) == "admin"):
            qs = qs.filter(is_active=True)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve", "products"):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return BrandWriteSerializer
        if self.action == "list":
            return BrandListSerializer
        return BrandDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """Soft delete — marks as inactive + deleted."""
        brand = self.get_object()
        if brand.products.filter(is_deleted=False).exists():
            return error_response(
                "Cannot delete a brand that has active products. "
                "Archive or reassign all products first.",
                status_code=status.HTTP_409_CONFLICT,
            )
        brand.delete(deleted_by=request.user)
        return success_response(message="Brand deleted successfully.")

    @action(detail=True, methods=["get"], url_path="products", permission_classes=[AllowAny])
    def products(self, request, slug=None):
        """GET /api/v1/brands/{slug}/products/ — list products for a specific brand."""
        brand = self.get_object()
        qs = Product.objects.filter(
            brand=brand,
            is_deleted=False,
            status="active",
        ).select_related("brand", "category", "pricing", "inventory").prefetch_related("images")

        # Category filter
        cat = request.query_params.get("category")
        if cat and cat.lower() != "all":
            qs = qs.filter(category__name__iexact=cat)

        # In-stock filter
        if request.query_params.get("in_stock") in ["true", "1"]:
            qs = qs.filter(inventory__stock_quantity__gt=0)

        # Search filter
        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(short_description__icontains=search) |
                Q(sku__icontains=search)
            )

        # Sorting
        sort = request.query_params.get("ordering") or request.query_params.get("sort")
        if sort == "price_asc":
            qs = qs.order_by("pricing__selling_price", "-created_at")
        elif sort == "price_desc":
            qs = qs.order_by("-pricing__selling_price", "-created_at")
        elif sort == "newest":
            qs = qs.order_by("-created_at")
        elif sort == "rating":
            qs = qs.order_by("-rating", "-created_at")
        else:
            qs = qs.order_by("sort_order", "-created_at")

        paginator = PageNumberPagination()
        paginator.page_size = int(request.query_params.get("page_size", 24))
        page_obj = paginator.paginate_queryset(qs, request)
        serializer = ProductListSerializer(page_obj, many=True, context={"request": request})

        return Response({
            "success": True,
            "count": paginator.page.paginator.count,
            "total_pages": paginator.page.paginator.num_pages,
            "current_page": paginator.page.number,
            "data": serializer.data,
            "products": serializer.data,
        })

    @action(detail=True, methods=["post"], url_path="documents",
            permission_classes=[IsAuthenticated, IsAdmin],
            parser_classes=[MultiPartParser, FormParser])
    def upload_document(self, request, slug=None):
        """POST /api/v1/brands/{slug}/documents/ — upload a brand document."""
        brand = self.get_object()
        serializer = BrandDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(brand=brand, created_by=request.user)
        return success_response(
            data=serializer.data,
            message="Document uploaded.",
            status_code=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["delete"], url_path=r"documents/(?P<doc_id>[^/.]+)",
            permission_classes=[IsAuthenticated, IsAdmin])
    def delete_document(self, request, slug=None, doc_id=None):
        """DELETE /api/v1/brands/{slug}/documents/{doc_id}/ — delete a brand document."""
        brand = self.get_object()
        try:
            doc = brand.documents.get(id=doc_id)
        except BrandDocument.DoesNotExist:
            return error_response("Document not found.", status_code=status.HTTP_404_NOT_FOUND)
        doc.delete()
        return success_response(message="Document deleted.")

    @action(detail=False, methods=["get"], url_path="dropdown",
            permission_classes=[IsAuthenticated])
    def dropdown(self, request):
        """GET /api/v1/brands/dropdown/ — minimal list for admin form selects."""
        qs = Brand.objects.all().order_by("name").values("id", "name", "slug", "is_active")
        return success_response(data=list(qs))

