"""
FAAZO – Brand Serializers
"""

from rest_framework import serializers
from .models import Brand, BrandDocument, BrandPageBanner


def _resolve_logo_url(brand_obj, request):
    """
    Canonical logo resolution for all brand serializers:
    1. Use Brand.logo if set (uploaded via Admin → Brands).
    2. Fall back to HomepageBrand.logo_override (Admin → Homepage → Brand Logos).
    3. Return None if neither exists.
    This ensures images uploaded in the homepage brand ticker section
    also appear in the Brands directory and all brand cards sitewide.
    """
    logo_file = brand_obj.logo or None

    # Fallback: check HomepageBrand.logo_override via reverse relation.
    # related_name="homepage_showcases" (plural); unique=True means at most one record.
    if not logo_file:
        try:
            # If prefetch_related('homepage_showcases') was applied on the queryset
            # this is zero extra queries. Otherwise it triggers one DB hit.
            showcases = brand_obj.homepage_showcases.all()
            for showcase in showcases:
                if showcase.logo_override:
                    logo_file = showcase.logo_override
                    break
        except Exception:
            pass

    if logo_file:
        try:
            url = logo_file.url
            if request:
                return request.build_absolute_uri(url)
            return url
        except Exception:
            pass
    return None


class BrandPageBannerSerializer(serializers.ModelSerializer):
    banner_image_url = serializers.SerializerMethodField()
    visual_layout = serializers.JSONField(required=False, default=dict)

    class Meta:
        model = BrandPageBanner
        fields = [
            "id", "title", "subtitle", "banner_image",
            "banner_image_url", "button_text", "button_link", "visual_layout", "is_active",
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
        return _resolve_logo_url(obj, self.context.get("request"))

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
        return _resolve_logo_url(obj, self.context.get("request"))

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

    def to_internal_value(self, data):
        # Allow mutable copy
        data = data.dict() if hasattr(data, "dict") else dict(data)

        # 1. Sanitize empty string integer fields to avoid DRF validation failure
        for int_field in ("service_turnaround_days",):
            val = data.get(int_field)
            if val in ("", "null", "undefined", None):
                data[int_field] = None

        for int_default_field, default_val in [("warranty_months_default", 12), ("display_order", 0)]:
            val = data.get(int_default_field)
            if val in ("", "null", "undefined", None):
                data[int_default_field] = default_val

        # 2. Parse certifications JSON string if passed via FormData
        certs = data.get("certifications")
        if isinstance(certs, str):
            import json
            try:
                data["certifications"] = json.loads(certs)
            except Exception:
                data["certifications"] = []
        elif certs is None:
            data["certifications"] = []

        # 3. Sanitize URL fields (ensure http/https protocol or empty string)
        for url_field in ("website_url", "documentation_url"):
            u = data.get(url_field)
            if isinstance(u, str):
                u = u.strip()
                if not u or u.lower() in ("null", "undefined"):
                    data[url_field] = ""
                elif not u.lower().startswith(("http://", "https://")):
                    data[url_field] = f"https://{u}"

        # 4. Sanitize email field
        email = data.get("support_email")
        if isinstance(email, str):
            email = email.strip()
            if not email or email.lower() in ("null", "undefined"):
                data["support_email"] = ""

        # 5. Automatically truncate uploaded logo filename if length exceeds 60
        img = data.get("logo")
        if img and hasattr(img, "name") and len(img.name) > 60:
            import os, uuid
            stem, ext = os.path.splitext(img.name)
            img.name = f"{stem[:30]}_{uuid.uuid4().hex[:6]}{ext}"

        # 6. Truncate banner_image filename if length exceeds 60
        banner = data.get("banner_image")
        if banner and hasattr(banner, "name") and len(banner.name) > 60:
            import os, uuid
            stem, ext = os.path.splitext(banner.name)
            banner.name = f"{stem[:30]}_{uuid.uuid4().hex[:6]}{ext}"

        return super().to_internal_value(data)

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

