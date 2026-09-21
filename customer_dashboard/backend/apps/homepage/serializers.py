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
    DailyOffer,
    DailyOfferProduct,
    BrandDeal,
    BrandDealProduct,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def abs_image_url(request, field):
    """Return absolute URL for an ImageField value, or None."""
    if field and hasattr(field, 'url'):
        return request.build_absolute_uri(field.url) if request else field.url
    return None


# ============================================================
# 0. Homepage Promo / Announcement Banner
# ============================================================

class HomepagePromoBannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomepagePromoBanner
        fields = [
            "id",
            "title",
            "subtitle",
            "link_url",
            "is_active",
            "bg_color",
            "tagline_color",
            "text_color",
            "border_color",
            "created_at",
            "updated_at",
        ]


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

    def validate_brand(self, value):
        qs = HomepageBrand.objects.filter(brand=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This brand is already showcased on the homepage.")
        return value

    def validate_logo_override(self, value):
        if isinstance(value, list):
            raise serializers.ValidationError("Only a single image is allowed for brand logo.")
        return value



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
    average_rating   = serializers.DecimalField(source="product.average_rating", max_digits=3, decimal_places=2, read_only=True)
    total_reviews    = serializers.IntegerField(source="product.total_reviews", read_only=True)

    class Meta:
        model  = BestSeller
        fields = [
            "id", "product", "product_slug", "product_name",
            "display_heading", "display_short_description",
            "display_image_url", "sort_order", "is_visible",
            "pricing", "inventory",
            "average_rating", "total_reviews",
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
    average_rating   = serializers.DecimalField(source="product.average_rating", max_digits=3, decimal_places=2, read_only=True)
    total_reviews    = serializers.IntegerField(source="product.total_reviews", read_only=True)

    class Meta:
        model  = FeaturedCollectionItem
        fields = [
            "id", "product", "product_name", "product_slug", "product_image",
            "sort_order", "pricing", "inventory",
            "average_rating", "total_reviews",
        ]

    def get_product_image(self, obj):
        request = self.context.get("request")
        primary = obj.product.primary_image
        if primary and primary.image:
            return abs_image_url(request, primary.image)
        return None


class FeaturedCollectionReadSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    mobile_image_url = serializers.SerializerMethodField()
    items = FeaturedCollectionItemReadSerializer(many=True, read_only=True)

    class Meta:
        model  = FeaturedCollection
        fields = [
            "id", "title", "description", "font_family", "image", "image_url",
            "mobile_image", "mobile_image_url",
            "banner_layout", "content_width", "horizontal_alignment", "vertical_alignment",
            "badge_text", "offer_text", "secondary_text",
            "cta_text", "cta_action_type", "cta_target_id", "cta_url", "cta_style", "cta_open_in_new_tab",
            "heading_size", "heading_weight", "heading_color", "description_color",
            "badge_color", "badge_bg_color", "cta_bg_color", "cta_text_color", "cta_border_color",
            "bg_color", "image_position", "image_fit", "overlay_gradient", "overlay_opacity",
            "start_date", "end_date", "sort_order", "is_visible", "items"
        ]

    def get_image_url(self, obj):
        return abs_image_url(self.context.get("request"), obj.image)

    def get_mobile_image_url(self, obj):
        return abs_image_url(self.context.get("request"), obj.mobile_image)


class FeaturedCollectionItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = FeaturedCollectionItem
        fields = ["id", "collection", "product", "sort_order"]
        read_only_fields = ["id"]


class FeaturedCollectionWriteSerializer(serializers.ModelSerializer):
    title = serializers.CharField(required=False, allow_blank=True)
    font_family = serializers.CharField(required=False, allow_blank=True)
    image = serializers.ImageField(required=False, allow_null=True)
    image_url = serializers.SerializerMethodField(read_only=True)
    mobile_image = serializers.ImageField(required=False, allow_null=True)
    mobile_image_url = serializers.SerializerMethodField(read_only=True)
    start_date = serializers.DateTimeField(required=False, allow_null=True)
    end_date = serializers.DateTimeField(required=False, allow_null=True)
    cta_target_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model  = FeaturedCollection
        fields = [
            "id", "title", "description", "font_family", "image", "image_url",
            "mobile_image", "mobile_image_url",
            "banner_layout", "content_width", "horizontal_alignment", "vertical_alignment",
            "badge_text", "offer_text", "secondary_text",
            "cta_text", "cta_action_type", "cta_target_id", "cta_url", "cta_style", "cta_open_in_new_tab",
            "heading_size", "heading_weight", "heading_color", "description_color",
            "badge_color", "badge_bg_color", "cta_bg_color", "cta_text_color", "cta_border_color",
            "bg_color", "image_position", "image_fit", "overlay_gradient", "overlay_opacity",
            "start_date", "end_date", "sort_order", "is_visible"
        ]
        read_only_fields = ["id", "image_url", "mobile_image_url"]

    def get_image_url(self, obj):
        return abs_image_url(self.context.get("request"), obj.image)

    def get_mobile_image_url(self, obj):
        return abs_image_url(self.context.get("request"), obj.mobile_image)

    def to_internal_value(self, data):
        if hasattr(data, 'copy'):
            data = data.copy()
        elif isinstance(data, dict):
            data = dict(data)
        
        for field in ("image", "mobile_image", "start_date", "end_date"):
            if field in data and (data[field] == "" or data[field] == "null" or data[field] is False):
                data[field] = None
        if "cta_target_id" in data and (data["cta_target_id"] is None or data["cta_target_id"] == "null"):
            data["cta_target_id"] = ""
        return super().to_internal_value(data)



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
    category_name = serializers.CharField(source="product.category.name", read_only=True)
    category_slug = serializers.CharField(source="product.category.slug", read_only=True)
    short_description = serializers.CharField(source="product.short_description", read_only=True)
    is_featured   = serializers.BooleanField(source="product.is_featured", read_only=True)
    pricing          = ProductPricingInlineSerializer(source="product.pricing", read_only=True, allow_null=True)
    inventory        = ProductInventoryInlineSerializer(source="product.inventory", read_only=True, allow_null=True)
    average_rating   = serializers.DecimalField(source="product.average_rating", max_digits=3, decimal_places=2, read_only=True)
    total_reviews    = serializers.IntegerField(source="product.total_reviews", read_only=True)

    class Meta:
        model  = RecommendedProduct
        fields = [
            "id", "product", "product_name", "product_slug", "product_sku",
            "brand_name", "category_name", "category_slug", "short_description", "is_featured",
            "primary_image", "sort_order", "is_visible",
            "pricing", "inventory",
            "average_rating", "total_reviews",
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


# ============================================================
# 12. Daily Offers / Hot Deals Serializers
# ============================================================

class DailyOfferProductReadSerializer(serializers.ModelSerializer):
    product_id = serializers.UUIDField(source="product.id", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    product_image = serializers.SerializerMethodField()
    brand_name = serializers.CharField(source="product.brand.name", read_only=True, default="")
    category_name = serializers.CharField(source="product.category.name", read_only=True, default="")
    pricing = ProductPricingInlineSerializer(source="product.pricing", read_only=True, allow_null=True)
    inventory = ProductInventoryInlineSerializer(source="product.inventory", read_only=True, allow_null=True)
    average_rating = serializers.DecimalField(source="product.average_rating", max_digits=3, decimal_places=2, read_only=True)
    total_reviews = serializers.IntegerField(source="product.total_reviews", read_only=True)
    effective_deal_price = serializers.SerializerMethodField()
    discount_percentage = serializers.SerializerMethodField()

    class Meta:
        model = DailyOfferProduct
        fields = [
            "id", "product", "product_id", "product_name", "product_slug", "product_sku",
            "product_image", "brand_name", "category_name", "deal_price", "effective_deal_price",
            "badge_override", "discount_percentage", "sort_order", "pricing", "inventory",
            "average_rating", "total_reviews",
        ]

    def get_product_image(self, obj):
        request = self.context.get("request")
        primary = obj.product.primary_image
        if primary and primary.image:
            return abs_image_url(request, primary.image)
        first_img = obj.product.images.first()
        if first_img and first_img.image:
            return abs_image_url(request, first_img.image)
        return None

    def get_effective_deal_price(self, obj):
        if obj.deal_price is not None:
            return float(obj.deal_price)
        if hasattr(obj.product, 'pricing') and obj.product.pricing:
            return float(obj.product.pricing.effective_price or obj.product.pricing.selling_price or 0)
        return 0

    def get_discount_percentage(self, obj):
        deal_price = self.get_effective_deal_price(obj)
        if hasattr(obj.product, 'pricing') and obj.product.pricing and obj.product.pricing.mrp:
            mrp = float(obj.product.pricing.mrp)
            if mrp > deal_price and mrp > 0:
                return round(((mrp - deal_price) / mrp) * 100)
        return None


class DailyOfferProductWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyOfferProduct
        fields = ["id", "daily_offer", "product", "deal_price", "badge_override", "sort_order"]
        read_only_fields = ["id"]


class DailyOfferReadSerializer(serializers.ModelSerializer):
    desktop_image_url = serializers.SerializerMethodField()
    mobile_image_url = serializers.SerializerMethodField()
    items = DailyOfferProductReadSerializer(many=True, read_only=True)

    class Meta:
        model = DailyOffer
        fields = [
            "id", "badge_text", "title", "subheading", "offer_text", "secondary_text",
            "font_family",
            "offer_type", "desktop_image", "desktop_image_url", "mobile_image", "mobile_image_url",
            "image_position", "image_fit", "overlay_gradient", "overlay_opacity",
            "horizontal_alignment", "vertical_alignment", "content_width",
            "theme", "bg_color", "bg_gradient", "heading_color", "description_color",
            "badge_bg_color", "badge_text_color", "offer_color",
            "cta_bg_color", "cta_text_color", "cta_border_color",
            "countdown_bg_color", "countdown_text_color", "product_badge_color",
            "countdown_enabled", "countdown_position", "start_date", "end_date",
            "cta_enabled", "cta_position", "cta_text", "cta_action_type", "cta_target_id", "cta_url",
            "status", "is_active", "sort_order", "created_at", "updated_at",
            "items",
        ]

    def get_desktop_image_url(self, obj):
        return abs_image_url(self.context.get("request"), obj.desktop_image)

    def get_mobile_image_url(self, obj):
        return abs_image_url(self.context.get("request"), obj.mobile_image)


class DailyOfferWriteSerializer(serializers.ModelSerializer):
    title = serializers.CharField(required=False, allow_blank=True)
    badge_text = serializers.CharField(required=False, allow_blank=True)
    subheading = serializers.CharField(required=False, allow_blank=True)
    offer_text = serializers.CharField(required=False, allow_blank=True)
    secondary_text = serializers.CharField(required=False, allow_blank=True)
    font_family = serializers.CharField(required=False, allow_blank=True)
    countdown_position = serializers.CharField(required=False, allow_blank=True)
    cta_enabled = serializers.BooleanField(required=False, default=True)
    cta_position = serializers.CharField(required=False, allow_blank=True)
    cta_text = serializers.CharField(required=False, allow_blank=True)
    desktop_image = serializers.ImageField(required=False, allow_null=True)
    desktop_image_url = serializers.SerializerMethodField(read_only=True)
    mobile_image = serializers.ImageField(required=False, allow_null=True)
    mobile_image_url = serializers.SerializerMethodField(read_only=True)
    start_date = serializers.DateTimeField(required=False, allow_null=True)
    end_date = serializers.DateTimeField(required=False, allow_null=True)
    cta_target_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    items_data = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)

    class Meta:
        model = DailyOffer
        fields = [
            "id", "badge_text", "title", "subheading", "offer_text", "secondary_text",
            "font_family",
            "offer_type", "desktop_image", "desktop_image_url", "mobile_image", "mobile_image_url",
            "image_position", "image_fit", "overlay_gradient", "overlay_opacity",
            "horizontal_alignment", "vertical_alignment", "content_width",
            "theme", "bg_color", "bg_gradient", "heading_color", "description_color",
            "badge_bg_color", "badge_text_color", "offer_color",
            "cta_bg_color", "cta_text_color", "cta_border_color",
            "countdown_bg_color", "countdown_text_color", "product_badge_color",
            "countdown_enabled", "countdown_position", "start_date", "end_date",
            "cta_enabled", "cta_position", "cta_text", "cta_action_type", "cta_target_id", "cta_url",
            "status", "is_active", "sort_order", "items_data",
        ]
        read_only_fields = ["id", "desktop_image_url", "mobile_image_url"]

    def get_desktop_image_url(self, obj):
        return abs_image_url(self.context.get("request"), obj.desktop_image)

    def get_mobile_image_url(self, obj):
        return abs_image_url(self.context.get("request"), obj.mobile_image)

    def to_internal_value(self, data):
        if hasattr(data, 'copy'):
            data = data.copy()
        elif isinstance(data, dict):
            data = dict(data)
        
        for field in ("desktop_image", "mobile_image", "start_date", "end_date"):
            if field in data and (data[field] == "" or data[field] == "null" or data[field] is False):
                data[field] = None
        if "cta_target_id" in data and (data["cta_target_id"] is None or data["cta_target_id"] == "null"):
            data["cta_target_id"] = ""

        if "items_data" in data:
            val = data["items_data"]
            if isinstance(val, str):
                import json
                try:
                    val = json.loads(val)
                except Exception:
                    val = []
            if hasattr(data, "setlist") and isinstance(val, list):
                data.setlist("items_data", val)
            else:
                data["items_data"] = val

        return super().to_internal_value(data)

    def create(self, validated_data):
        items_data = validated_data.pop("items_data", None)
        instance = super().create(validated_data)
        if items_data is not None:
            self._sync_items(instance, items_data)
        return instance

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items_data", None)
        instance = super().update(instance, validated_data)
        if items_data is not None:
            self._sync_items(instance, items_data)
        return instance

    def _sync_items(self, instance, items_data):
        import json
        from apps.products.models import Product
        if isinstance(items_data, str):
            try:
                items_data = json.loads(items_data)
            except Exception:
                items_data = []

        instance.items.all().delete()
        for idx, item in enumerate(items_data):
            prod_id = item.get("product_id") or item.get("product")
            if not prod_id:
                continue
            try:
                product = Product.objects.get(id=prod_id)
                dp = item.get("deal_price")
                if dp in ("", "null", None):
                    dp = None
                DailyOfferProduct.objects.create(
                    daily_offer=instance,
                    product=product,
                    deal_price=dp,
                    badge_override=item.get("badge_override", "") or "",
                    sort_order=item.get("sort_order", idx),
                )
            except Product.DoesNotExist:
                continue


# ============================================================
# 8. Brand Deal Campaign Serializers
# ============================================================

class BrandDealProductReadSerializer(serializers.ModelSerializer):
    product = serializers.CharField(source="product.id", read_only=True)
    product_id = serializers.CharField(source="product.id", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    product_image = serializers.SerializerMethodField()
    product_image_url = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="product.category.name", read_only=True)
    brand_name = serializers.CharField(source="product.brand.name", read_only=True)
    mrp = serializers.SerializerMethodField()
    product_mrp = serializers.SerializerMethodField()
    regular_selling_price = serializers.SerializerMethodField()
    product_selling_price = serializers.SerializerMethodField()
    deal_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    discount_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = BrandDealProduct
        fields = [
            "id",
            "product",
            "product_id",
            "product_name",
            "product_slug",
            "product_sku",
            "product_image",
            "product_image_url",
            "category_name",
            "brand_name",
            "mrp",
            "product_mrp",
            "regular_selling_price",
            "product_selling_price",
            "deal_price",
            "discount_percentage",
            "in_stock",
            "is_active",
            "sort_order",
            "created_at",
        ]

    def get_product_image(self, obj):
        if not obj.product:
            return None
        primary = obj.product.images.filter(is_primary=True).first()
        if primary and primary.image:
            return abs_image_url(self.context.get("request"), primary.image)
        first = obj.product.images.first()
        if first and first.image:
            return abs_image_url(self.context.get("request"), first.image)
        return None

    def get_product_image_url(self, obj):
        return self.get_product_image(obj)

    def get_mrp(self, obj):
        pricing = getattr(obj.product, "pricing", None)
        return float(pricing.mrp) if pricing and pricing.mrp else 0.0

    def get_product_mrp(self, obj):
        return self.get_mrp(obj)

    def get_regular_selling_price(self, obj):
        pricing = getattr(obj.product, "pricing", None)
        return float(pricing.selling_price) if pricing and pricing.selling_price else 0.0

    def get_product_selling_price(self, obj):
        return self.get_regular_selling_price(obj)

    def get_in_stock(self, obj):
        inv = getattr(obj.product, "inventory", None)
        if not inv:
            return True
        return getattr(inv, "available_stock", getattr(inv, "current_stock", 0)) > 0


class BrandDealProductWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = BrandDealProduct
        fields = [
            "id",
            "brand_deal",
            "product",
            "deal_price",
            "discount_percentage",
            "is_active",
            "sort_order",
        ]


class BrandDealReadSerializer(serializers.ModelSerializer):
    brand_id = serializers.CharField(source="brand.id", read_only=True)
    brand_name = serializers.CharField(source="brand.name", read_only=True)
    brand_slug = serializers.CharField(source="brand.slug", read_only=True)
    brand_logo_url = serializers.SerializerMethodField()
    desktop_image_url = serializers.SerializerMethodField()
    mobile_image_url = serializers.SerializerMethodField()
    banner_desktop = serializers.SerializerMethodField()
    banner_mobile = serializers.SerializerMethodField()
    deal_products = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()
    max_discount_percentage = serializers.SerializerMethodField()
    is_currently_valid = serializers.BooleanField(read_only=True)
    is_homepage_eligible = serializers.BooleanField(read_only=True)

    class Meta:
        model = BrandDeal
        fields = [
            "id",
            "brand",
            "brand_id",
            "brand_name",
            "brand_slug",
            "brand_logo_url",
            "name",
            "slug",
            "title",
            "subtitle",
            "description",
            "promotional_tag",
            "offer_text",
            "cta_text",
            "desktop_image",
            "desktop_image_url",
            "mobile_image",
            "mobile_image_url",
            "banner_desktop",
            "banner_mobile",
            "bg_color",
            "text_color",
            "accent_color",
            "show_on_homepage",
            "status",
            "start_datetime",
            "end_datetime",
            "is_active",
            "is_currently_valid",
            "is_homepage_eligible",
            "sort_order",
            "is_all_brand_products",
            "deal_products",
            "product_count",
            "max_discount_percentage",
            "created_at",
            "updated_at",
        ]

    def get_brand_logo_url(self, obj):
        if obj.brand and getattr(obj.brand, "logo", None):
            return abs_image_url(self.context.get("request"), obj.brand.logo)
        return None

    def get_desktop_image_url(self, obj):
        return abs_image_url(self.context.get("request"), obj.desktop_image)

    def get_mobile_image_url(self, obj):
        return abs_image_url(self.context.get("request"), obj.mobile_image)

    def get_banner_desktop(self, obj):
        return self.get_desktop_image_url(obj)

    def get_banner_mobile(self, obj):
        return self.get_mobile_image_url(obj)

    def get_deal_products(self, obj):
        explicit_deals = list(
            obj.deal_products.all()
            .select_related("product", "product__pricing", "product__brand", "product__category")
            .prefetch_related("product__images")
        )
        if explicit_deals:
            return BrandDealProductReadSerializer(explicit_deals, many=True, context=self.context).data
        if obj.is_all_brand_products and obj.brand:
            from apps.products.models import Product
            products = (
                Product.objects.filter(brand=obj.brand, status="active", is_deleted=False)
                .select_related("pricing", "category")
                .prefetch_related("images")
            )
            items = []
            for p in products:
                pricing = getattr(p, "pricing", None)
                mrp = float(pricing.mrp) if pricing and pricing.mrp else 0.0
                effective = float(pricing.effective_price) if pricing and pricing.effective_price else mrp
                disc = round(((mrp - effective) / mrp) * 100) if mrp > effective > 0 else 0
                items.append({
                    "id": str(p.id),
                    "brand_deal": str(obj.id),
                    "product": str(p.id),
                    "product_id": str(p.id),
                    "product_name": p.name,
                    "product_slug": p.slug,
                    "product_sku": p.sku or "",
                    "product_image_url": abs_image_url(self.context.get("request"), p.primary_image.image) if p.primary_image and p.primary_image.image else None,
                    "product_mrp": mrp,
                    "product_selling_price": effective,
                    "deal_price": effective,
                    "discount_percentage": disc,
                    "is_active": True,
                    "sort_order": 0,
                })
            return items
        return []

    def get_product_count(self, obj):
        count = obj.deal_products.count()
        if count == 0 and obj.is_all_brand_products and obj.brand:
            from apps.products.models import Product
            return Product.objects.filter(brand=obj.brand, status="active", is_deleted=False).count()
        return count

    def get_max_discount_percentage(self, obj):
        discounts = [p.discount_percentage for p in obj.deal_products.all() if p.discount_percentage]
        return float(max(discounts)) if discounts else 0.0


class ProductsDataField(serializers.Field):
    """
    Handles products_data arriving as JSON string, parsed list/dict, or empty/null.
    Prevents DRF's JSONField in MultiPartParser from casting Python lists to single-quoted strings.
    """
    def to_internal_value(self, data):
        import json
        if not data or data in ("", "null", "[]"):
            return []
        if isinstance(data, list):
            return data
        if isinstance(data, str):
            try:
                parsed = json.loads(data)
                if isinstance(parsed, list):
                    return parsed
                return []
            except (json.JSONDecodeError, ValueError):
                raise serializers.ValidationError("Invalid JSON format for products_data.")
        return []

    def to_representation(self, value):
        return value


class BrandDealWriteSerializer(serializers.ModelSerializer):
    desktop_image_url = serializers.SerializerMethodField()
    mobile_image_url = serializers.SerializerMethodField()
    banner_desktop = serializers.SerializerMethodField()
    banner_mobile = serializers.SerializerMethodField()
    products_data = ProductsDataField(required=False, write_only=True)

    class Meta:
        model = BrandDeal
        fields = [
            "id",
            "brand",
            "name",
            "slug",
            "title",
            "subtitle",
            "description",
            "promotional_tag",
            "offer_text",
            "cta_text",
            "desktop_image",
            "mobile_image",
            "desktop_image_url",
            "mobile_image_url",
            "banner_desktop",
            "banner_mobile",
            "bg_color",
            "text_color",
            "accent_color",
            "show_on_homepage",
            "status",
            "start_datetime",
            "end_datetime",
            "is_active",
            "sort_order",
            "is_all_brand_products",
            "products_data",
        ]
        read_only_fields = ["id", "desktop_image_url", "mobile_image_url", "banner_desktop", "banner_mobile"]

    def get_desktop_image_url(self, obj):
        return abs_image_url(self.context.get("request"), obj.desktop_image)

    def get_mobile_image_url(self, obj):
        return abs_image_url(self.context.get("request"), obj.mobile_image)

    def get_banner_desktop(self, obj):
        return self.get_desktop_image_url(obj)

    def get_banner_mobile(self, obj):
        return self.get_mobile_image_url(obj)

    def to_internal_value(self, data):
        if hasattr(data, "copy"):
            data = data.copy()
        elif isinstance(data, dict):
            data = dict(data)

        # Image fields: if an existing URL string is sent (not a new file), remove the field
        # so the existing image is preserved. If empty/null, set to None to clear.
        for field in ("desktop_image", "mobile_image"):
            if field in data:
                val = data[field]
                if val in ("", "null", False, None):
                    data[field] = None
                elif isinstance(val, str) and not hasattr(val, "read"):
                    # It's an existing URL string, not a new File — preserve existing image
                    del data[field]

        # Datetime fields: if empty/null, set to None; valid ISO strings are passed through
        for field in ("start_datetime", "end_datetime"):
            if field in data:
                val = data[field]
                if val in ("", "null", False, None):
                    data[field] = None

        return super().to_internal_value(data)

    def create(self, validated_data):
        products_data = validated_data.pop("products_data", None)
        instance = super().create(validated_data)
        if products_data is not None:
            self._sync_products(instance, products_data)
        return instance

    def update(self, instance, validated_data):
        products_data = validated_data.pop("products_data", None)
        instance = super().update(instance, validated_data)
        if products_data is not None:
            self._sync_products(instance, products_data)
        return instance

    def _sync_products(self, instance, products_data):
        import json
        from decimal import Decimal
        from apps.products.models import Product

        if isinstance(products_data, str):
            try:
                products_data = json.loads(products_data)
            except Exception:
                products_data = []

        instance.deal_products.all().delete()
        for idx, item in enumerate(products_data):
            prod_id = item.get("product_id") or item.get("product")
            if not prod_id:
                continue
            try:
                product = Product.objects.get(id=prod_id)
                pricing = getattr(product, "pricing", None)
                mrp = pricing.mrp if pricing and pricing.mrp else Decimal("0.00")

                dp = item.get("deal_price")
                disc_pct = item.get("discount_percentage")

                if dp not in ("", "null", None):
                    dp = Decimal(str(dp))
                    if mrp > Decimal("0.00") and dp < mrp:
                        calculated_disc = Decimal(str(round(float((mrp - dp) / mrp * 100), 2)))
                    else:
                        calculated_disc = Decimal("0.00")
                elif disc_pct not in ("", "null", None) and mrp > Decimal("0.00"):
                    disc_pct_dec = Decimal(str(disc_pct))
                    dp = mrp * (Decimal("1.00") - (disc_pct_dec / Decimal("100.00")))
                    calculated_disc = disc_pct_dec
                else:
                    dp = pricing.effective_price if pricing else Decimal("0.00")
                    calculated_disc = Decimal("0.00")

                BrandDealProduct.objects.create(
                    brand_deal=instance,
                    product=product,
                    deal_price=dp,
                    discount_percentage=calculated_disc,
                    is_active=item.get("is_active", True),
                    sort_order=item.get("sort_order", idx),
                )
            except Product.DoesNotExist:
                continue



