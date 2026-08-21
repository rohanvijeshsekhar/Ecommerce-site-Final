"""
FAAZO – Product Serializers (extended Phase 6A: pricing + inventory embedded)
"""

from rest_framework import serializers
from .models import Product, ProductImage, ProductAttribute, ProductDocument, ProductStatus
from apps.brands.serializers import BrandListSerializer, BrandAfterSalesSerializer
from apps.categories.serializers import CategoryListSerializer
from apps.pricing.serializers import ProductPricingInlineSerializer
from apps.inventory.serializers import ProductInventoryInlineSerializer


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "alt_text", "sort_order", "is_primary", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProductAttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductAttribute
        fields = ["id", "name", "value", "unit", "sort_order"]
        read_only_fields = ["id"]


class ProductDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductDocument
        fields = ["id", "title", "document_type", "file", "external_url", "is_public", "created_at"]
        read_only_fields = ["id", "created_at"]


# ── List / Card ───────────────────────────────────────────────────────────────

class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for admin tables and storefront listing cards."""

    brand_name    = serializers.CharField(source="brand.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    primary_image = serializers.SerializerMethodField()
    pricing       = ProductPricingInlineSerializer(read_only=True, allow_null=True)
    inventory     = ProductInventoryInlineSerializer(read_only=True, allow_null=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "sku",
            "brand", "brand_name",
            "category", "category_name",
            "short_description",
            "status", "is_featured",
            "tags",
            "weight_kg",
            "warranty_months_override",
            "primary_image",
            # Phase 6A — pricing + inventory
            "pricing",
            "inventory",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]

    def get_primary_image(self, obj):
        img = obj.primary_image
        if img:
            request = self.context.get("request")
            return request.build_absolute_uri(img.image.url) if request and img.image else None
        return None


# ── Detail ────────────────────────────────────────────────────────────────────

class ProductDetailSerializer(serializers.ModelSerializer):
    """
    Full product detail.
    Embeds brand after-sales policy so the frontend has everything
    needed to render the product page and warranty info in one call.
    Phase 6A: also embeds pricing and inventory.
    """

    brand_detail         = BrandAfterSalesSerializer(source="brand", read_only=True)
    category_detail      = CategoryListSerializer(source="category", read_only=True)
    images               = ProductImageSerializer(many=True, read_only=True)
    attributes           = ProductAttributeSerializer(many=True, read_only=True)
    documents            = ProductDocumentSerializer(many=True, read_only=True)
    effective_warranty   = serializers.IntegerField(source="effective_warranty_months", read_only=True)
    is_published         = serializers.BooleanField(read_only=True)
    pricing              = ProductPricingInlineSerializer(read_only=True, allow_null=True)
    inventory            = ProductInventoryInlineSerializer(read_only=True, allow_null=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "sku",
            # Relations
            "brand", "brand_detail",
            "category", "category_detail",
            # Content
            "short_description", "long_description", "tags",
            # Status
            "status", "is_featured", "launched_at", "is_published",
            # Physical
            "weight_kg", "dimensions_cm",
            # Warranty
            "warranty_months_override", "effective_warranty",
            # Assets
            "images", "attributes", "documents",
            # Phase 6A — pricing + inventory
            "pricing",
            "inventory",
            # Timestamps
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "is_published", "effective_warranty", "created_at", "updated_at"]


# ── Write ─────────────────────────────────────────────────────────────────────

class ProductWriteSerializer(serializers.ModelSerializer):
    """Serializer for create / update operations."""

    class Meta:
        model = Product
        fields = [
            "id",
            "slug",
            "name",
            "sku",
            "brand",
            "category",
            "short_description",
            "long_description",
            "tags",
            "status",
            "is_featured",
            "launched_at",
            "weight_kg",
            "dimensions_cm",
            "warranty_months_override",
        ]
        read_only_fields = ["id", "slug"]

    def validate_sku(self, value):
        qs = Product.all_objects.filter(sku__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A product with this SKU already exists.")
        return value.upper()

    def validate_status(self, value):
        # We always force status to active so that products created in the admin panel
        # are immediately visible on the customer storefront.
        return ProductStatus.ACTIVE


# ── Admin Stats ───────────────────────────────────────────────────────────────

class ProductStatusCountSerializer(serializers.Serializer):
    """Used by the admin dashboard to show catalogue health."""
    draft        = serializers.IntegerField()
    active       = serializers.IntegerField()
    archived     = serializers.IntegerField()
    discontinued = serializers.IntegerField()
    total        = serializers.IntegerField()


# ── Search Suggestions ────────────────────────────────────────────────────────

class ProductSuggestionSerializer(serializers.ModelSerializer):
    """Slim, lightweight serializer for header search autocomplete suggestions."""

    category_name = serializers.CharField(source="category.name", read_only=True)
    primary_image = serializers.SerializerMethodField()
    type          = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "slug", "sku", "category_name", "primary_image", "type"]
        read_only_fields = fields

    def get_primary_image(self, obj):
        img = obj.primary_image
        if img and img.image:
            request = self.context.get("request")
            return request.build_absolute_uri(img.image.url) if request else img.image.url
        return None

    def get_type(self, obj):
        return "product"

