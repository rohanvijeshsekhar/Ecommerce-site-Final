"""
FAAZO – Product Views
"""

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.common.viewsets import BaseModelViewSet
from apps.common.permissions import IsAdmin
from apps.common.responses import success_response, error_response

from .models import Product, ProductImage, ProductAttribute, ProductStatus, ProductDocument
from .serializers import (
    ProductListSerializer,
    ProductDetailSerializer,
    ProductWriteSerializer,
    ProductImageSerializer,
    ProductAttributeSerializer,
    ProductDocumentSerializer,
)


class ProductViewSet(BaseModelViewSet):
    """
    CRUD for Products.

    - Public / authenticated: list + retrieve (active products only)
    - Admin: full CRUD including draft / archived products
    """

    lookup_field = "slug"
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    filterset_fields = ["status", "is_featured", "brand", "category"]
    search_fields    = ["name", "sku", "short_description", "tags"]
    ordering_fields  = ["name", "created_at", "status"]
    ordering         = ["-created_at"]

    def get_queryset(self):
        qs = Product.objects.select_related(
            "brand", "category", "created_by", "updated_by"
        ).prefetch_related("images", "attributes", "documents", "pricing", "inventory")

        # Non-admins only see active published products
        if not (self.request.user.is_authenticated and self.request.user.role == "admin"):
            qs = qs.filter(status=ProductStatus.ACTIVE)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

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

