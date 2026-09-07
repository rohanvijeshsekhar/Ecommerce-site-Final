"""
FAAZO – Homepage CMS Serializers

Two serializer layers per section:
  - *ReadSerializer  → public storefront GET (AllowAny) – compact, fast
  - *WriteSerializer → admin CRUD (IsAdmin) – full field control
"""

from rest_framework import serializers
from apps.pricing.serializers import ProductPricingInlineSerializer
from apps.inventory.serializers import ProductInventoryInlineSerializer


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


# ── Helpers ───────────────────────────────────────────────────────────────────

def abs_image_url(request, field):
    """Return absolute URL for an ImageField value, or None."""
    if field and hasattr(field, 'url'):
        return request.build_absolute_uri(field.url) if request else field.url
    return None


# ============================================================
# 1. Hero Slides
# ============================================================

class HeroSlideReadSerializer(serializers.ModelSerializer):
    desktop_image_url = serializers.SerializerMethodField()
    mobile_image_url  = serializers.SerializerMethodField()

    class Meta:
        model  = HeroSlide
        fields = [
            "id", "heading", "subheading",
            "cta_text", "cta_link",
            "desktop_image_url", "mobile_image_url",
            "sort_order", "is_active",
        ]

    def get_desktop_image_url(self, obj):
        return abs_image_url(self.context.get("request"), obj.desktop_image)

    def get_mobile_image_url(self, obj):
        return abs_image_url(self.context.get("request"), obj.mobile_image)


class HeroSlideWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = HeroSlide
        fields = [
            "id", "heading", "subheading",
            "cta_text", "cta_link",
            "desktop_image", "mobile_image",
            "sort_order", "is_active",
        ]
        read_only_fields = ["id"]


# ============================================================
# 2. Homepage Categories
# ============================================================

class HomepageCategoryReadSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    display_title = serializers.CharField(read_only=True)
    card_image_url = serializers.SerializerMethodField()

    class Meta:
        model  = HomepageCategory
        fields = [
            "id", "category", "category_name", "category_slug",
            "display_title", "card_image_url", "icon_key",
            "sort_order", "is_visible",
        ]

    def get_card_image_url(self, obj):
        request = self.context.get("request")
        # Prefer override → category image
        if obj.card_image:
            return abs_image_url(request, obj.card_image)
        if obj.category.image:
            return abs_image_url(request, obj.category.image)
        return None


class HomepageCategoryWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = HomepageCategory
        fields = [
            "id", "category", "card_image", "title_override",
            "icon_key", "sort_order", "is_visible",
        ]
        read_only_fields = ["id"]


# ============================================================
# 3. Homepage Brands
# ============================================================

class HomepageBrandReadSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name", read_only=True)
    brand_slug = serializers.CharField(source="brand.slug", read_only=True)
    logo_url   = serializers.SerializerMethodField()

    class Meta:
        model  = HomepageBrand
        fields = [
            "id", "brand", "brand_name", "brand_slug",
            "logo_url", "sort_order", "is_visible",
        ]

    def get_logo_url(self, obj):
        request = self.context.get("request")
        if obj.logo_override:
            return abs_image_url(request, obj.logo_override)
        if obj.brand.logo:
            return abs_image_url(request, obj.brand.logo)
        return None


class HomepageBrandWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = HomepageBrand
        fields = ["id", "brand", "logo_override", "sort_order", "is_visible"]
        read_only_fields = ["id"]


# ============================================================
# 4. Best Sellers
# ============================================================

class BestSellerReadSerializer(serializers.ModelSerializer):
    product_slug     = serializers.CharField(source="product.slug", read_only=True)
    product_name     = serializers.CharField(source="product.name", read_only=True)
    display_heading  = serializers.SerializerMethodField()
    display_image_url = serializers.SerializerMethodField()
    display_short_description = serializers.SerializerMethodField()
    pricing          = ProductPricingInlineSerializer(source="product.pricing", read_only=True, allow_null=True)
    inventory        = ProductInventoryInlineSerializer(source="product.inventory", read_only=True, allow_null=True)

    class Meta:
        model  = BestSeller
        fields = [
            "id", "product", "product_slug", "product_name",
            "display_heading", "display_short_description",
            "display_image_url", "sort_order", "is_visible",
            "pricing", "inventory",
        ]

    def get_display_heading(self, obj):
        return obj.custom_heading or obj.product.name

    def get_display_short_description(self, obj):
        return obj.short_description or obj.product.short_description

    def get_display_image_url(self, obj):
        request = self.context.get("request")
        if obj.display_image:
            return abs_image_url(request, obj.display_image)
        primary = obj.product.primary_image
        if primary and primary.image:
            return abs_image_url(request, primary.image)
        return None


class BestSellerWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BestSeller
        fields = [
            "id", "product", "display_image",
            "custom_heading", "short_description",
            "sort_order", "is_visible",
        ]
        read_only_fields = ["id"]


# ============================================================
# 5 & 6. Featured Collections
# ============================================================

class FeaturedCollectionItemReadSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    product_image = serializers.SerializerMethodField()
    pricing          = ProductPricingInlineSerializer(source="product.pricing", read_only=True, allow_null=True)
    inventory        = ProductInventoryInlineSerializer(source="product.inventory", read_only=True, allow_null=True)

    class Meta:
        model  = FeaturedCollectionItem
        fields = ["id", "product", "product_name", "product_slug", "product_image", "sort_order", "pricing", "inventory"]

    def get_product_image(self, obj):
        request = self.context.get("request")
        primary = obj.product.primary_image
        if primary and primary.image:
            return abs_image_url(request, primary.image)
        return None


class FeaturedCollectionReadSerializer(serializers.ModelSerializer):
    items = FeaturedCollectionItemReadSerializer(many=True, read_only=True)

    class Meta:
        model  = FeaturedCollection
        fields = ["id", "title", "description", "sort_order", "is_visible", "items"]


class FeaturedCollectionItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = FeaturedCollectionItem
        fields = ["id", "collection", "product", "sort_order"]
        read_only_fields = ["id"]


class FeaturedCollectionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = FeaturedCollection
        fields = ["id", "title", "description", "sort_order", "is_visible"]
        read_only_fields = ["id"]


# ============================================================
# 7. Limited Time Offers
# ============================================================


def _get_linked_pricing(obj):
    """Return ProductPricing for the linked product, or None for orphan offers."""
    if not obj.product:
        return None
    return getattr(obj.product, "pricing", None)


class LimitedTimeOfferReadSerializer(serializers.ModelSerializer):
    """
    Public read serializer for LimitedTimeOffer.

    PRICING AUTHORITY:
    When the offer has a linked product, all price fields are sourced from
    ProductPricing (the single authoritative transactional pricing model).
    - original_price  → ProductPricing.mrp  (the MRP displayed for savings calc)
    - discounted_price → ProductPricing.effective_price  (the price customer pays)
    - savings_text     → computed from ProductPricing.mrp vs effective_price

    For orphan offers (no linked product) the local model fields are used as
    a display-only fallback. Orphan offers CANNOT participate in cart/checkout.
    """
    title = serializers.CharField(source="heading", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True, allow_null=True)
    product_name = serializers.CharField(source="product.name", read_only=True, allow_null=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True, allow_null=True)
    stock_quantity = serializers.SerializerMethodField()
    banner_image_url = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    savings_text = serializers.SerializerMethodField()
    badge = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    brand = serializers.SerializerMethodField()
    # NOTE: original_price and discounted_price are overridden below via
    # SerializerMethodField so they reflect ProductPricing, not the local CMS fields.
    original_price = serializers.SerializerMethodField()
    discounted_price = serializers.SerializerMethodField()
    pricing = ProductPricingInlineSerializer(source="product.pricing", read_only=True, allow_null=True)
    inventory = ProductInventoryInlineSerializer(source="product.inventory", read_only=True, allow_null=True)

    class Meta:
        model  = LimitedTimeOffer
        fields = [
            "id", "product", "product_slug", "product_name", "product_sku", "stock_quantity",
            "heading", "title", "category", "brand", "badge",
            "description", "original_price", "discounted_price",
            "savings_text", "validity_text", "image_url", "banner_image_url",
            "image", "offer_text", "start_date", "end_date",
            "cta_text", "cta_link", "sort_order", "is_featured", "is_active",
            "pricing", "inventory", "created_at",
        ]

    def get_original_price(self, obj):
        """
        AUTHORITATIVE: Return ProductPricing.mrp when a product is linked.
        This is the 'before discount' price shown on the offer card.
        Falls back to local field for orphan offers (display-only, not transactional).
        """
        pricing = _get_linked_pricing(obj)
        if pricing:
            return float(pricing.mrp)
        return float(obj.original_price or 0)

    def get_discounted_price(self, obj):
        """
        AUTHORITATIVE: Return ProductPricing.effective_price when a product is linked.
        This is the exact price the customer will be charged at checkout.
        Falls back to local field for orphan offers (display-only, not transactional).
        """
        pricing = _get_linked_pricing(obj)
        if pricing:
            return float(pricing.effective_price)
        return float(obj.discounted_price or 0)

    def get_stock_quantity(self, obj):
        if obj.product and hasattr(obj.product, "inventory") and obj.product.inventory:
            inv = obj.product.inventory
            return getattr(inv, "available_stock", getattr(inv, "current_stock", 0))
        return None

    def get_category(self, obj):
        if obj.category:
            return obj.category
        if obj.product and obj.product.category:
            return obj.product.category.name
        return ""

    def get_brand(self, obj):
        if obj.brand:
            return obj.brand
        if obj.product and obj.product.brand:
            return obj.product.brand.name
        return ""

    def get_banner_image_url(self, obj):
        return abs_image_url(self.context.get("request"), obj.banner_image)

    def get_image(self, obj):
        if obj.image_url:
            return obj.image_url
        if obj.banner_image:
            return abs_image_url(self.context.get("request"), obj.banner_image)
        if obj.product:
            primary = obj.product.primary_image
            if primary and primary.image:
                return abs_image_url(self.context.get("request"), primary.image)
        return ""

    def get_badge(self, obj):
        return obj.badge or obj.offer_text or "Limited Time"

    def get_savings_text(self, obj):
        """
        Calculate savings from AUTHORITATIVE ProductPricing values when linked.
        Falls back to local fields for orphan offers.
        """
        pricing = _get_linked_pricing(obj)
        if pricing:
            mrp = float(pricing.mrp)
            effective = float(pricing.effective_price)
            if mrp > effective > 0:
                diff = mrp - effective
                pct = round((diff / mrp) * 100)
                return f"Save Rs.{diff:,.0f} ({pct}% OFF)"
            return ""
        # Orphan offer fallback
        orig = float(obj.original_price or 0)
        disc = float(obj.discounted_price or 0)
        if orig > disc > 0:
            diff = orig - disc
            pct = round((diff / orig) * 100)
            return f"Save Rs.{diff:,.0f} ({pct}% OFF)"
        return ""


class NullableDateTimeField(serializers.DateTimeField):
    """Custom DateTimeField that coerces empty string ("") to None (null)."""
    def to_internal_value(self, value):
        if value == "" or value is None:
            return None
        return super().to_internal_value(value)


class LimitedTimeOfferWriteSerializer(serializers.ModelSerializer):
    """
    Admin write serializer for LimitedTimeOffer.

    PRICING WRITE-THROUGH:
    When a product is linked and the offer is active, this serializer propagates
    the promotional price to ProductPricing so the cart/checkout use it automatically:

        Admin enters discounted_price = 8000
            -> LimitedTimeOffer.discounted_price = 8000  (retained for CMS display)
            -> ProductPricing.offer_price = 8000         (AUTHORITATIVE for transactions)

        Admin enters start_date / end_date
            -> ProductPricing.offer_start_date / offer_end_date

    ProductPricing.mrp is NEVER modified here.
    Write-through only occurs when the offer has a linked product and is active.
    If the offer is deactivated, ProductPricing offer fields are cleared ONLY when
    no other active LimitedTimeOffer for that product exists.
    """
    title = serializers.CharField(source="heading", required=False)
    start_date = NullableDateTimeField(allow_null=True, required=False)
    end_date = NullableDateTimeField(allow_null=True, required=False)

    class Meta:
        model  = LimitedTimeOffer
        fields = [
            "id", "product", "banner_image", "heading", "title", "category", "brand", "badge",
            "description", "original_price", "discounted_price",
            "validity_text", "image_url", "offer_text", "start_date", "end_date",
            "cta_text", "cta_link", "sort_order", "is_featured", "is_active",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        orig = attrs.get("original_price")
        disc = attrs.get("discounted_price")
        if orig is not None and disc is not None:
            if disc < 0:
                raise serializers.ValidationError({"discounted_price": "Special discounted price cannot be negative."})
            if orig > 0 and disc > orig:
                raise serializers.ValidationError({"discounted_price": "Special discounted price cannot exceed original price."})

        # Date range validation: end_date cannot be before start_date
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({
                "end_date": "Offer end date cannot be earlier than the start date."
            })

        # Prevent multiple simultaneous active offers for the same product
        product = attrs.get("product", getattr(self.instance, "product", None))
        is_active = attrs.get("is_active", getattr(self.instance, "is_active", True))
        if product and is_active:
            qs = LimitedTimeOffer.objects.filter(product=product, is_active=True)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                existing = qs.first()
                raise serializers.ValidationError({
                    "product": (
                        f"'{product.name}' already has an active Limited Time Offer "
                        f"('{existing.heading}'). Deactivate it before creating a new one."
                    )
                })
        return attrs

    def _sync_pricing(self, instance):
        """
        Write-through: propagate promotional price into ProductPricing.
        This is the ONLY place where LimitedTimeOffer touches ProductPricing.
        ProductPricing.mrp is never modified here.
        """
        product = instance.product
        if not product:
            # Orphan offer — no write-through possible
            return
        pricing = getattr(product, "pricing", None)
        if not pricing:
            # No ProductPricing record yet — skip silently
            return

        if instance.is_active:
            disc = instance.discounted_price
            # Only write offer_price if it passes ProductPricing constraints
            # (must be > 0 and <= selling_price)
            if disc and disc > 0 and disc <= pricing.selling_price:
                pricing.offer_price = disc
            elif disc and disc > pricing.selling_price:
                # Discounted price exceeds selling price — clip to selling_price
                # This guards against stale/incorrect admin data
                pricing.offer_price = pricing.selling_price
            else:
                pricing.offer_price = None

            # Copy dates (LimitedTimeOffer uses DateTimeField; ProductPricing uses DateField)
            pricing.offer_start_date = (
                instance.start_date.date() if instance.start_date else None
            )
            pricing.offer_end_date = (
                instance.end_date.date() if instance.end_date else None
            )
        else:
            # Offer is being deactivated.
            # Only clear ProductPricing offer fields if no OTHER active offer
            # exists for this same product. This prevents clearing a valid price
            # set by a different active offer.
            other_active = LimitedTimeOffer.objects.filter(
                product=product, is_active=True
            ).exclude(pk=instance.pk).exists()
            if not other_active:
                pricing.offer_price = None
                pricing.offer_start_date = None
                pricing.offer_end_date = None

        pricing.save(
            update_fields=["offer_price", "offer_start_date", "offer_end_date", "updated_at"]
        )

    def create(self, validated_data):
        instance = super().create(validated_data)
        self._sync_pricing(instance)
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        self._sync_pricing(instance)
        return instance


# ============================================================
# 8. Explore Solutions
# ============================================================

class ExploreSolutionReadSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    display_heading = serializers.CharField(read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model  = ExploreSolution
        fields = [
            "id", "category", "category_name", "category_slug",
            "display_heading", "image_url", "sort_order", "is_visible",
        ]

    def get_image_url(self, obj):
        return abs_image_url(self.context.get("request"), obj.image)


class ExploreSolutionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ExploreSolution
        fields = ["id", "category", "image", "heading", "sort_order", "is_visible"]
        read_only_fields = ["id"]


# ============================================================
# 9. Testimonials
# ============================================================

class TestimonialReadSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model  = Testimonial
        fields = [
            "id", "customer_name", "clinic_name",
            "photo_url", "rating", "review",
            "sort_order", "is_active",
        ]

    def get_photo_url(self, obj):
        request = self.context.get("request")
        if obj.photo:
            return abs_image_url(request, obj.photo)
        return obj.photo_url or None


class TestimonialWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Testimonial
        fields = [
            "id", "customer_name", "clinic_name",
            "photo", "photo_url", "rating", "review",
            "sort_order", "is_active",
        ]
        read_only_fields = ["id"]


# ============================================================
# 10. Recommended Products
# ============================================================

class RecommendedProductReadSerializer(serializers.ModelSerializer):
    product_name  = serializers.CharField(source="product.name", read_only=True)
    product_slug  = serializers.CharField(source="product.slug", read_only=True)
    product_sku   = serializers.CharField(source="product.sku", read_only=True)
    primary_image = serializers.SerializerMethodField()
    brand_name    = serializers.CharField(source="product.brand.name", read_only=True)
    short_description = serializers.CharField(source="product.short_description", read_only=True)
    is_featured   = serializers.BooleanField(source="product.is_featured", read_only=True)
    pricing          = ProductPricingInlineSerializer(source="product.pricing", read_only=True, allow_null=True)
    inventory        = ProductInventoryInlineSerializer(source="product.inventory", read_only=True, allow_null=True)

    class Meta:
        model  = RecommendedProduct
        fields = [
            "id", "product", "product_name", "product_slug", "product_sku",
            "brand_name", "short_description", "is_featured",
            "primary_image", "sort_order", "is_visible",
            "pricing", "inventory",
        ]

    def get_primary_image(self, obj):
        request = self.context.get("request")
        primary = obj.product.primary_image
        if primary and primary.image:
            return abs_image_url(request, primary.image)
        return None


class RecommendedProductWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = RecommendedProduct
        fields = ["id", "product", "sort_order", "is_visible"]
        read_only_fields = ["id"]


# ============================================================
# Reorder Serializer (shared)
# ============================================================

class ReorderSerializer(serializers.Serializer):
    """Used by all reorder endpoints: PATCH /reorder/ with [{id, sort_order}]"""
    id         = serializers.UUIDField()
    sort_order = serializers.IntegerField(min_value=0)


# ============================================================
# 11. Special Offers Page Content (CMS)
# ============================================================

class SpecialOffersPageContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpecialOffersPageContent
        fields = [
            "id",
            "hero_badge",
            "hero_title",
            "hero_description",
            "hero_cta_text",
            "hero_trust_text",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]
