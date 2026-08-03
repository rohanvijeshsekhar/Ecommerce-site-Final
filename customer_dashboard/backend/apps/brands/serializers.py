"""
FAAZO – Brand Serializers
"""

from rest_framework import serializers
from .models import Brand, BrandDocument, BrandPageBanner


class BrandPageBannerSerializer(serializers.ModelSerializer):
    banner_image_url = serializers.SerializerMethodField()

    class Meta:
        model = BrandPageBanner
        fields = [
            "id", "title", "subtitle", "banner_image",
            "banner_image_url", "button_text", "button_link", "is_active",
        ]

    def get_banner_image_url(self, obj):
        if obj.banner_image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.banner_image.url)
            return obj.banner_image.url
        return None


class BrandDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = BrandDocument
        fields = [
            "id", "title", "document_type", "file",
            "external_url", "is_public", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class BrandListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views and cards."""
    product_count = serializers.IntegerField(read_only=True, default=0)
    logo_url = serializers.SerializerMethodField()
    banner_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = [
            "id", "name", "slug", "logo", "logo_url", "banner_image", "banner_image_url",
            "short_description", "full_description", "country_of_origin",
            "warranty_months_default", "display_order", "is_featured",
            "is_active", "product_count", "created_at",
        ]
        read_only_fields = ["id", "slug", "product_count"]

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None

    def get_banner_image_url(self, obj):
        if obj.banner_image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.banner_image.url)
            return obj.banner_image.url
        return None


class BrandDetailSerializer(serializers.ModelSerializer):
    """Full serializer including after-sales policy, documents, and SEO."""
    documents = BrandDocumentSerializer(many=True, read_only=True)
    product_count = serializers.IntegerField(read_only=True, default=0)
    logo_url = serializers.SerializerMethodField()
    banner_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = [
            "id", "name", "slug", "short_description", "full_description", "description",
            "logo", "logo_url", "banner_image", "banner_image_url",
            "country_of_origin", "website_url", "support_email", "support_phone",
            "warranty_policy_text", "warranty_months_default", "is_warranty_transferable",
            "service_policy_text", "service_turnaround_days",
            "certifications", "documentation_url",
            "display_order", "is_featured", "is_active",
            "seo_title", "seo_description", "product_count", "documents",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at", "documents", "product_count"]

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None

    def get_banner_image_url(self, obj):
        if obj.banner_image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.banner_image.url)
            return obj.banner_image.url
        return None


class BrandWriteSerializer(serializers.ModelSerializer):
    """Serializer for create / update operations."""

    class Meta:
        model = Brand
        fields = [
            "id", "slug",
            "name", "short_description", "full_description", "description",
            "logo", "banner_image", "country_of_origin",
            "website_url", "support_email", "support_phone",
            "warranty_policy_text", "warranty_months_default", "is_warranty_transferable",
            "service_policy_text", "service_turnaround_days",
            "certifications", "documentation_url", "display_order", "is_featured",
            "is_active", "seo_title", "seo_description",
        ]
        read_only_fields = ["id", "slug"]

    def validate_name(self, value):
        qs = Brand.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A brand with this name already exists.")
        return value


class BrandAfterSalesSerializer(serializers.ModelSerializer):
    """
    Minimal after-sales policy block embedded in Product detail responses.
    Never exposes internal admin fields.
    """

    class Meta:
        model = Brand
        fields = [
            "id", "name", "slug", "logo",
            "warranty_policy_text", "warranty_months_default", "is_warranty_transferable",
            "service_policy_text", "service_turnaround_days",
            "support_email", "support_phone", "documentation_url",
        ]

