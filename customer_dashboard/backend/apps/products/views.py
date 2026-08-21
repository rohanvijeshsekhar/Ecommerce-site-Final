"""
FAAZO – Product Views
"""

from decimal import Decimal
from django.db.models import Case, When, Value, IntegerField, F, Q, Sum
from django.db.models.functions import Coalesce

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.common.viewsets import BaseModelViewSet
from apps.common.permissions import IsAdmin
from apps.common.responses import success_response, error_response

from .models import Product, ProductImage, ProductAttribute, ProductStatus, ProductDocument
from .filters import ProductFilterSet
from .serializers import (
    ProductListSerializer,
    ProductDetailSerializer,
    ProductWriteSerializer,
    ProductImageSerializer,
    ProductAttributeSerializer,
    ProductDocumentSerializer,
    ProductSuggestionSerializer,
)


class ProductViewSet(BaseModelViewSet):
    """
    CRUD for Products.

    - Public / authenticated: list + retrieve (active products only)
    - Admin: full CRUD including draft / archived products
    """

    lookup_field = "slug"
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    filterset_class = ProductFilterSet
    search_fields    = ["name", "sku", "short_description", "tags"]
    ordering_fields  = ["name", "created_at", "launched_at", "status", "effective_price_value", "total_units_sold", "relevance_score"]
    ordering         = ["-created_at"]

    def get_queryset(self):
        qs = Product.objects.select_related(
            "brand", "category", "created_by", "updated_by"
        ).prefetch_related("images", "attributes", "documents", "pricing", "inventory")

        # Non-admins only see active published products
        if not (self.request.user.is_authenticated and self.request.user.role == "admin"):
            qs = qs.filter(status=ProductStatus.ACTIVE)

        # Annotate selling price for price sorting
        qs = qs.annotate(
            effective_price_value=Coalesce(F("pricing__selling_price"), Value(Decimal("0.00")))
        )

        # Annotate units sold for popular sorting (valid non-cancelled orders)
        valid_order_statuses = ["processing", "packed", "shipped", "delivered"]
        qs = qs.annotate(
            total_units_sold=Coalesce(
                Sum(
                    "orderitem__quantity",
                    filter=Q(orderitem__order__status__in=valid_order_statuses)
                ),
                Value(0)
            )
        )

        # Annotate relevance if search query 'q' is present
        query_param = self.request.query_params.get("q", "").strip() if getattr(self, "request", None) else ""
        if query_param:
            relevance = Case(
                When(name__iexact=query_param, then=Value(100)),
                When(name__istartswith=query_param, then=Value(80)),
                When(name__icontains=query_param, then=Value(60)),
                When(sku__iexact=query_param, then=Value(55)),
                When(sku__icontains=query_param, then=Value(50)),
                When(brand__name__icontains=query_param, then=Value(40)),
                When(category__name__icontains=query_param, then=Value(35)),
                When(category__parent__name__icontains=query_param, then=Value(32)),
                When(category__parent__parent__name__icontains=query_param, then=Value(30)),
                When(short_description__icontains=query_param, then=Value(20)),
                When(long_description__icontains=query_param, then=Value(15)),
                When(tags__icontains=query_param, then=Value(10)),
                default=Value(0),
                output_field=IntegerField(),
            )
            qs = qs.annotate(relevance_score=relevance)

        # Handle custom ordering parameter mapping
        ordering_param = self.request.query_params.get("ordering", "").strip() if getattr(self, "request", None) else ""
        if ordering_param:
            if ordering_param in ["price_asc", "price"]:
                qs = qs.order_by("effective_price_value", "-created_at")
            elif ordering_param in ["price_desc", "-price"]:
                qs = qs.order_by("-effective_price_value", "-created_at")
            elif ordering_param in ["newest", "-newest"]:
                qs = qs.order_by("-launched_at", "-created_at")
            elif ordering_param in ["popular", "-popular"]:
                qs = qs.order_by("-total_units_sold", "-total_reviews", "-created_at")
            elif ordering_param in ["relevance", "-relevance"]:
                if query_param:
                    qs = qs.order_by("-relevance_score", "-created_at")
                else:
                    qs = qs.order_by("-created_at")
        elif query_param:
            qs = qs.order_by("-relevance_score", "-created_at")

        return qs

    @action(detail=False, methods=["get"], url_path="suggestions", permission_classes=[AllowAny])
    def suggestions(self, request):
        """
        GET /api/v1/products/suggestions/?q=term
        Returns up to 8 lightweight product search suggestions for header autocomplete.
        """
        q = request.query_params.get("q", "").strip()
        qs = Product.objects.filter(status=ProductStatus.ACTIVE).select_related("category", "brand").prefetch_related("images")

        if q:
            qs = ProductFilterSet(data={"q": q}, queryset=qs).qs
            relevance = Case(
                When(name__iexact=q, then=Value(100)),
                When(name__istartswith=q, then=Value(80)),
                When(name__icontains=q, then=Value(60)),
                When(sku__iexact=q, then=Value(55)),
                When(sku__icontains=q, then=Value(50)),
                When(brand__name__icontains=q, then=Value(40)),
                When(category__name__icontains=q, then=Value(35)),
                When(category__parent__name__icontains=q, then=Value(32)),
                When(category__parent__parent__name__icontains=q, then=Value(30)),
                default=Value(0),
                output_field=IntegerField(),
            )
            qs = qs.annotate(relevance_score=relevance).order_by("-relevance_score", "-created_at")
        else:
            qs = qs.order_by("-created_at")

        suggestions_qs = list(qs[:8])
        serializer = ProductSuggestionSerializer(suggestions_qs, many=True, context={"request": request})
        return success_response(data=serializer.data)


    def get_permissions(self):
        if self.action in ("list", "retrieve", "suggestions"):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def filter_queryset(self, queryset):
        q_param = self.request.query_params.get("q", "").strip() if getattr(self, "request", None) else ""
        ordering_param = self.request.query_params.get("ordering", "").strip() if getattr(self, "request", None) else ""

        if ordering_param in ["price_asc", "price_desc", "price", "-price", "newest", "-newest", "popular", "-popular", "relevance", "-relevance"] or (q_param and not ordering_param):
            from rest_framework import filters
            for backend in list(self.filter_backends):
                if backend == filters.OrderingFilter:
                    continue
                queryset = backend().filter_queryset(self.request, queryset, self)
            return queryset
        return super().filter_queryset(queryset)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ProductWriteSerializer
        if self.action == "list":
            return ProductListSerializer
        return ProductDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        """GET /api/v1/products/{slug}/ — return product wrapped in standard envelope."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success_response(data=serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Soft delete — product is never physically removed (orders reference it)."""
        product = self.get_object()
        product.delete(deleted_by=request.user)
        return success_response(message="Product deleted.")

    # ── Image management ──────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="images",
            permission_classes=[IsAuthenticated, IsAdmin],
            parser_classes=[MultiPartParser, FormParser])
    def upload_image(self, request, slug=None):
        """POST /api/v1/products/{slug}/images/ — add a product image."""
        product = self.get_object()
        serializer = ProductImageSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        serializer.save(product=product)
        return success_response(
            data=serializer.data,
            message="Image uploaded.",
            status_code=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["delete"], url_path=r"images/(?P<image_id>[^/.]+)",
            permission_classes=[IsAuthenticated, IsAdmin])
    def delete_image(self, request, slug=None, image_id=None):
        """DELETE /api/v1/products/{slug}/images/{id}/"""
        product = self.get_object()
        try:
            image = product.images.get(id=image_id)
        except ProductImage.DoesNotExist:
            return error_response("Image not found.", status_code=status.HTTP_404_NOT_FOUND)
        image.delete()
        return success_response(message="Image deleted.")

    @action(detail=True, methods=["patch"], url_path=r"images/(?P<image_id>[^/.]+)/primary",
            permission_classes=[IsAuthenticated, IsAdmin])
    def set_primary_image(self, request, slug=None, image_id=None):
        """PATCH /api/v1/products/{slug}/images/{id}/primary — set hero image."""
        product = self.get_object()
        try:
            image = product.images.get(id=image_id)
        except ProductImage.DoesNotExist:
            return error_response("Image not found.", status_code=status.HTTP_404_NOT_FOUND)
        image.is_primary = True
        image.save()  # save() enforces single-primary constraint
        return success_response(message="Primary image updated.")

    # ── Attribute management ──────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="attributes",
            permission_classes=[IsAuthenticated, IsAdmin])
    def add_attribute(self, request, slug=None):
        """POST /api/v1/products/{slug}/attributes/"""
        product = self.get_object()
        serializer = ProductAttributeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(product=product)
        return success_response(
            data=serializer.data,
            message="Attribute added.",
            status_code=status.HTTP_201_CREATED,
        )

    # ── Document management ───────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="documents",
            permission_classes=[IsAuthenticated, IsAdmin],
            parser_classes=[MultiPartParser, FormParser])
    def upload_document(self, request, slug=None):
        """POST /api/v1/products/{slug}/documents/"""
        product = self.get_object()
        serializer = ProductDocumentSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        serializer.save(product=product, created_by=request.user)
        return success_response(
            data=serializer.data,
            message="Document uploaded.",
            status_code=status.HTTP_201_CREATED,
        )

    # ── Admin stats ───────────────────────────────────────────────────────────

    @action(detail=False, methods=["get"], url_path="status-counts",
            permission_classes=[IsAuthenticated, IsAdmin])
    def status_counts(self, request):
        """
        GET /api/v1/products/status-counts/
        Returns catalogue health counts for the admin dashboard.
        """
        qs = Product.all_objects.filter(is_deleted=False)
        data = {
            "draft":        qs.filter(status=ProductStatus.DRAFT).count(),
            "active":       qs.filter(status=ProductStatus.ACTIVE).count(),
            "archived":     qs.filter(status=ProductStatus.ARCHIVED).count(),
            "discontinued": qs.filter(status=ProductStatus.DISCONTINUED).count(),
            "total":        qs.count(),
        }
        return success_response(data=data)

    @action(detail=True, methods=["patch"], url_path=r"images/(?P<image_id>[^/.]+)",
            permission_classes=[IsAuthenticated, IsAdmin])
    def update_image(self, request, slug=None, image_id=None):
        """PATCH /api/v1/products/{slug}/images/{image_id}/ — update alt text or sort order."""
        product = self.get_object()
        try:
            image = product.images.get(id=image_id)
        except ProductImage.DoesNotExist:
            return error_response("Image not found.", status_code=status.HTTP_404_NOT_FOUND)
        
        serializer = ProductImageSerializer(image, data=request.data, partial=True, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(data=serializer.data, message="Image updated.")

    @action(detail=True, methods=["patch"], url_path="images-reorder",
            permission_classes=[IsAuthenticated, IsAdmin])
    def reorder_images(self, request, slug=None):
        """
        PATCH /api/v1/products/{slug}/images-reorder/
        Accepts a list of {"id": "...", "sort_order": 2} to update ordering bulk-style.
        """
        product = self.get_object()
        items = request.data
        if not isinstance(items, list):
            return error_response("Expected a list of image updates.", status_code=status.HTTP_400_BAD_REQUEST)
        
        for item in items:
            img_id = item.get("id")
            sort_order = item.get("sort_order")
            if img_id is not None and sort_order is not None:
                product.images.filter(id=img_id).update(sort_order=sort_order)
                
        return success_response(message="Images reordered successfully.")

    @action(detail=True, methods=["patch", "delete"], url_path=r"attributes/(?P<attr_id>[^/.]+)",
            permission_classes=[IsAuthenticated, IsAdmin])
    def manage_attribute(self, request, slug=None, attr_id=None):
        """
        PATCH/DELETE /api/v1/products/{slug}/attributes/{attr_id}/
        Update or delete a technical specification row.
        """
        product = self.get_object()
        try:
            attr = product.attributes.get(id=attr_id)
        except ProductAttribute.DoesNotExist:
            return error_response("Attribute not found.", status_code=status.HTTP_404_NOT_FOUND)

        if request.method == "DELETE":
            attr.delete()
            return success_response(message="Attribute deleted.")
            
        serializer = ProductAttributeSerializer(attr, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(data=serializer.data, message="Attribute updated.")

    @action(detail=True, methods=["delete"], url_path=r"documents/(?P<doc_id>[^/.]+)",
            permission_classes=[IsAuthenticated, IsAdmin])
    def delete_document(self, request, slug=None, doc_id=None):
        try:
            doc = product.documents.get(id=doc_id)
        except ProductDocument.DoesNotExist:
            return error_response("Document not found.", status_code=status.HTTP_404_NOT_FOUND)
        doc.delete()
        return success_response(message="Document deleted.")

    @action(detail=True, methods=["post"], url_path="share-log", permission_classes=[AllowAny])
    def log_share(self, request, slug=None):
        """
        POST /api/v1/products/{slug}/share-log/
        Record product share analytics event.
        Body: { "platform": "whatsapp" | "facebook" | "twitter" | "linkedin" | "email" | "copy_link" | "native_share" }
        """
        product = self.get_object()
        platform = request.data.get("platform", "copy_link")
        user = request.user if request.user.is_authenticated else None
        ip_address = request.META.get("REMOTE_ADDR")

        from .models import ProductShareLog
        share_log = ProductShareLog.objects.create(
            product=product,
            user=user,
            platform=platform,
            ip_address=ip_address,
        )

        return success_response(
            data={"id": str(share_log.id), "platform": share_log.platform},
            message="Share event logged.",
        )

