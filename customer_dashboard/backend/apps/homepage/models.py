"""
FAAZO – Homepage CMS Models

Design decisions:
- Each homepage section is a separate model, fully independent.
- All models include sort_order + is_visible so the admin can reorder
  and hide sections without deleting data.
- Product / Category / Brand references use FK to prevent orphaned data.
- Image fields use nullable ImageField so sections can be saved without
  images during draft state.
- No pricing logic here — Best Sellers and Recommended reference
  existing Product records which carry their own status.
"""

from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models

from apps.common.image_optimizer import OptimizedImageField
from apps.common.mixins import BaseModel



# ============================================================
# 0. Homepage Announcement / Top Promo Banner
# ============================================================

class HomepagePromoBanner(BaseModel):
    """
    Top Announcement / Promo Strip shown right above the Hero carousel.
    """

    class Meta:
        verbose_name = "Homepage Promo Banner"
        verbose_name_plural = "Homepage Promo Banners"

    title = models.CharField(
        max_length=150,
        default="FAAZO SUPER DEALS ARE LIVE:",
        blank=True,
        verbose_name="Promo Tag / Prefix",
    )
    subtitle = models.CharField(
        max_length=255,
        default="UP TO 50% OFF + EXTRA 10% OFF ON PREMIUM DENTAL BRANDS",
        blank=True,
        verbose_name="Main Announcement Text",
    )
    link_url = models.CharField(
        max_length=300,
        blank=True,
        default="/offers",
        verbose_name="Click Link URL",
        help_text="Optional link e.g. /offers or /products",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Is Active / Visible",
    )

    @classmethod
    def get_instance(cls):
        instance = cls.objects.first()
        if not instance:
            instance = cls.objects.create(
                title="FAAZO SUPER DEALS ARE LIVE:",
                subtitle="UP TO 50% OFF + EXTRA 10% OFF ON PREMIUM DENTAL BRANDS",
                link_url="/offers",
                is_active=True,
            )
        return instance

    def __str__(self):
        return f"{self.title} {self.subtitle}"


# ============================================================
# 1. Hero Slides
# ============================================================

class HeroSlide(BaseModel):
    """
    A single hero banner slide for the homepage carousel.

    Supports separate images for desktop and mobile to allow
    responsive art direction without CSS cropping hacks.
    """

    class Meta:
        verbose_name = "Hero Slide"
        verbose_name_plural = "Hero Slides"
        ordering = ["sort_order", "created_at"]

    desktop_image = OptimizedImageField(
        upload_to="homepage/hero/desktop/",
        null=True,
        blank=True,
        verbose_name="Desktop Image",
        help_text="Recommended: 1440×480 px or 3:1 aspect ratio.",
    )
    mobile_image = OptimizedImageField(
        upload_to="homepage/hero/mobile/",
        null=True,
        blank=True,
        verbose_name="Mobile Image",
        help_text="Recommended: 375×500 px or 3:4 aspect ratio.",
    )
    heading = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Heading",
    )
    subheading = models.CharField(
        max_length=300,
        blank=True,
        verbose_name="Sub Heading",
    )
    cta_text = models.CharField(
        max_length=80,
        blank=True,
        default="Explore Products",
        verbose_name="CTA Button Text",
    )
    cta_link = models.CharField(
        max_length=300,
        blank=True,
        default="#products",
        verbose_name="CTA Link",
        help_text="Relative path or anchor e.g. /products or #products",
    )
    sort_order = models.PositiveSmallIntegerField(
        default=0,
        db_index=True,
        verbose_name="Sort Order",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
    )

    def __str__(self):
        return self.heading or f"Hero Slide #{self.pk}"


# ============================================================
# 2. Homepage Category Showcase ("Shop By Category")
# ============================================================

class HomepageCategory(BaseModel):
    """
    A category displayed in the 'Shop By Category' animated card section.

    References an existing catalogue category; allows admin to override
    the display image and title without touching the catalogue.
    """

    class Meta:
        verbose_name = "Homepage Category"
        verbose_name_plural = "Homepage Categories"
        ordering = ["sort_order", "created_at"]

    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.CASCADE,
        related_name="homepage_showcases",
        verbose_name="Catalogue Category",
    )
    card_image = OptimizedImageField(
        upload_to="homepage/categories/",
        null=True,
        blank=True,
        verbose_name="Card Image",
        help_text="Override image shown on the homepage card. Falls back to category image.",
    )
    title_override = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Title Override",
        help_text="Override the category name shown on the card.",
    )
    icon_key = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Icon Key",
        help_text=(
            "Key for the predefined SVG icon to show on the card badge. "
            "Options: handpiece, imaging, instruments, equipment, materials, chairs, sterilization, endo, implants, other"
        ),
    )
    sort_order = models.PositiveSmallIntegerField(
        default=0,
        db_index=True,
        verbose_name="Sort Order",
    )
    is_visible = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Visible",
    )

    @property
    def display_title(self) -> str:
        return self.title_override or self.category.name

    def __str__(self):
        return f"Homepage Category: {self.display_title}"


# ============================================================
# 3. Homepage Brand Showcase ("Trusted by Leading Global Brands")
# ============================================================

class HomepageBrand(BaseModel):
    """
    A brand logo shown in the 'Trusted by Leading Global Brands' ticker.

    References an existing Brand; allows logo override for homepage display.
    """

    class Meta:
        verbose_name = "Homepage Brand"
        verbose_name_plural = "Homepage Brands"
        ordering = ["-updated_at"]

    brand = models.ForeignKey(
        "brands.Brand",
        on_delete=models.CASCADE,
        related_name="homepage_showcases",
        verbose_name="Brand",
        unique=True,
    )
    logo_override = OptimizedImageField(
        upload_to="homepage/brands/",
        null=True,
        blank=True,
        verbose_name="Logo Override",
        help_text="Override the brand logo for homepage display. Falls back to Brand.logo.",
    )
    sort_order = models.PositiveSmallIntegerField(
        default=0,
        db_index=True,
        verbose_name="Sort Order",
    )
    is_visible = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Visible",
    )

    def __str__(self):
        return f"Homepage Brand: {self.brand.name}"


# ============================================================
# 4. Best Sellers
# ============================================================

class BestSeller(BaseModel):
    """
    A product featured in the 'Best Sellers' section.

    References an existing Product; allows display image and copy override
    so the homepage presentation can differ from the product detail page.
    """

    class Meta:
        verbose_name = "Best Seller"
        verbose_name_plural = "Best Sellers"
        ordering = ["sort_order", "created_at"]

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="best_seller_entries",
        verbose_name="Product",
    )
    display_image = OptimizedImageField(
        upload_to="homepage/bestsellers/",
        null=True,
        blank=True,
        verbose_name="Display Image",
        help_text="Override product image for the homepage card.",
    )
    custom_heading = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Custom Heading",
        help_text="Override product name on the card.",
    )
    short_description = models.CharField(
        max_length=300,
        blank=True,
        verbose_name="Short Description",
        help_text="Override product short_description on the card.",
    )
    sort_order = models.PositiveSmallIntegerField(
        default=0,
        db_index=True,
        verbose_name="Sort Order",
    )
    is_visible = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Visible",
    )

    def __str__(self):
        return f"Best Seller: {self.custom_heading or self.product.name}"


# ============================================================
# 5 & 6. Featured Collections
# ============================================================

class FeaturedCollection(BaseModel):
    """
    A curated collection of products shown in the 'Featured Collections' section.
    """

    class Meta:
        verbose_name = "Featured Collection"
        verbose_name_plural = "Featured Collections"
        ordering = ["sort_order", "created_at"]

    title = models.CharField(
        max_length=200,
        verbose_name="Collection Title / Main Heading",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Collection Description / Subtitle",
    )
    image = OptimizedImageField(
        upload_to="homepage/collections/",
        null=True,
        blank=True,
        verbose_name="Desktop Banner Image",
        help_text="Featured image shown on the promotional banner.",
    )
    mobile_image = OptimizedImageField(
        upload_to="homepage/collections/mobile/",
        null=True,
        blank=True,
        verbose_name="Mobile Banner Image",
        help_text="Optional mobile-specific image for responsive art direction.",
    )

    # ── Composition & Layout Controls ──
    banner_layout = models.CharField(
        max_length=30,
        default="split",
        choices=[
            ("split", "Split Image + Content"),
            ("background", "Full Background Image"),
            ("solid", "Solid / Gradient Minimal"),
        ],
        verbose_name="Banner Layout",
    )
    content_width = models.CharField(
        max_length=20,
        default="medium",
        choices=[
            ("narrow", "Narrow"),
            ("medium", "Medium"),
            ("wide", "Wide"),
            ("full", "Full Width"),
            ("small", "Small"),
            ("large", "Large"),
        ],
        verbose_name="Content Max Width",
    )
    horizontal_alignment = models.CharField(
        max_length=20,
        default="left",
        choices=[("left", "Left"), ("center", "Center"), ("right", "Right")],
        verbose_name="Horizontal Text Alignment",
    )
    vertical_alignment = models.CharField(
        max_length=20,
        default="center",
        choices=[("top", "Top"), ("center", "Center"), ("bottom", "Bottom")],
        verbose_name="Vertical Text Alignment",
    )

    # ── Content & Promotional Messaging ──
    badge_text = models.CharField(
        max_length=100,
        default="FEATURED COLLECTION",
        blank=True,
        verbose_name="Small Label / Badge Text",
    )
    offer_text = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Offer Text",
        help_text="e.g. UP TO 25% OFF or SPECIAL CLINICAL PROMO",
    )
    secondary_text = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Secondary Text / Footnote",
    )

    # ── Call To Action (CTA) ──
    cta_text = models.CharField(
        max_length=100,
        default="Explore Collection",
        verbose_name="CTA Button Text",
    )
    cta_action_type = models.CharField(
        max_length=30,
        default="url",
        choices=[
            ("product", "Product"),
            ("category", "Product Category / Collection"),
            ("brand", "Brand"),
            ("url", "Custom URL / Internal Page"),
        ],
        verbose_name="CTA Destination Type",
    )
    cta_target_id = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="CTA Target Identifier",
        help_text="Selected Product SKU/ID, Category slug, or Brand slug.",
    )
    cta_url = models.CharField(
        max_length=500,
        default="/offers",
        blank=True,
        verbose_name="CTA URL",
    )
    cta_style = models.CharField(
        max_length=20,
        default="filled",
        choices=[("filled", "Filled"), ("outline", "Outline"), ("ghost", "Ghost")],
        verbose_name="CTA Button Style",
    )
    cta_open_in_new_tab = models.BooleanField(
        default=False,
        verbose_name="Open CTA In New Tab",
    )

    # ── Visual Styling & Typography ──
    heading_size = models.CharField(
        max_length=20,
        default="lg",
        choices=[
            ("sm", "Small"),
            ("md", "Medium"),
            ("lg", "Large"),
            ("xl", "Extra Large"),
            ("2xl", "2XL / Jumbo"),
            ("medium", "Medium"),
            ("large", "Large"),
            ("xlarge", "Extra Large"),
            ("jumbo", "Jumbo"),
        ],
        verbose_name="Heading Size",
    )
    heading_weight = models.CharField(
        max_length=20,
        default="black",
        choices=[
            ("normal", "Normal (400)"),
            ("medium", "Medium (500)"),
            ("semibold", "Semi-Bold (600)"),
            ("bold", "Bold (700)"),
            ("extrabold", "Extra-Bold (800)"),
            ("black", "Black / Heavy (900)"),
        ],
        verbose_name="Heading Weight",
    )
    heading_color = models.CharField(
        max_length=30,
        default="#1E293B",
        blank=True,
        verbose_name="Heading Color",
    )
    description_color = models.CharField(
        max_length=30,
        default="#475569",
        blank=True,
        verbose_name="Description Color",
    )
    badge_color = models.CharField(
        max_length=30,
        default="#006670",
        blank=True,
        verbose_name="Badge Text Color",
    )
    badge_bg_color = models.CharField(
        max_length=30,
        default="#E6F3F5",
        blank=True,
        verbose_name="Badge Background Color",
    )
    cta_bg_color = models.CharField(
        max_length=30,
        default="#006670",
        blank=True,
        verbose_name="CTA Button Background Color",
    )
    cta_text_color = models.CharField(
        max_length=30,
        default="#FFFFFF",
        blank=True,
        verbose_name="CTA Button Text Color",
    )
    cta_border_color = models.CharField(
        max_length=30,
        default="#006670",
        blank=True,
        verbose_name="CTA Button Border Color",
    )
    bg_color = models.CharField(
        max_length=100,
        default="#F0F7F7",
        blank=True,
        verbose_name="Banner Background Color / Gradient",
        help_text="Hex code (e.g. #F0F7F7) or linear-gradient string.",
    )

    # ── Image Position & Overlays ──
    image_position = models.CharField(
        max_length=20,
        default="right",
        choices=[("left", "Left"), ("right", "Right"), ("center", "Center")],
        verbose_name="Image Position (Split Layout)",
    )
    image_fit = models.CharField(
        max_length=20,
        default="cover",
        choices=[("cover", "Cover"), ("contain", "Contain")],
        verbose_name="Image Fit",
    )
    overlay_gradient = models.CharField(
        max_length=30,
        default="left",
        choices=[
            ("none", "None"),
            ("left", "Left to Right"),
            ("right", "Right to Left"),
            ("top", "Top to Bottom"),
            ("bottom", "Bottom to Top"),
            ("radial", "Radial Glow"),
            ("dark", "Dark Contrast"),
            ("light", "Light Subtle"),
            ("teal", "Teal Brand Gradient"),
        ],
        verbose_name="Overlay Gradient Type",
    )
    overlay_opacity = models.PositiveSmallIntegerField(
        default=40,
        verbose_name="Overlay Opacity %",
        help_text="Percentage from 0 to 100",
    )

    # ── Scheduling ──
    start_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Schedule Start Date",
    )
    end_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Schedule End Date",
    )

    sort_order = models.PositiveSmallIntegerField(
        default=0,
        db_index=True,
        verbose_name="Sort Order",
    )
    is_visible = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Visible",
    )

    def __str__(self):
        return self.title


class FeaturedCollectionItem(models.Model):
    """A product within a FeaturedCollection."""

    class Meta:
        verbose_name = "Featured Collection Item"
        verbose_name_plural = "Featured Collection Items"
        ordering = ["sort_order"]
        unique_together = [["collection", "product"]]

    collection = models.ForeignKey(
        FeaturedCollection,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Collection",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="featured_collection_items",
        verbose_name="Product",
    )
    sort_order = models.PositiveSmallIntegerField(
        default=0,
        verbose_name="Sort Order",
    )

    def __str__(self):
        return f"{self.collection.title} → {self.product.name}"


# ============================================================
# 7. Limited Time Offers
# ============================================================

class LimitedTimeOffer(BaseModel):
    """
    A promotional banner for the 'Limited Time Offers' section.

    Has start/end dates so it can be scheduled in advance.
    """

    class Meta:
        verbose_name = "Limited Time Offer"
        verbose_name_plural = "Limited Time Offers"
        ordering = ["sort_order", "-created_at"]

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="limited_time_offers",
        verbose_name="Associated Product",
        help_text="Link to a real catalogue product for direct cart/inventory connection.",
    )
    banner_image = OptimizedImageField(
        upload_to="homepage/offers/",
        null=True,
        blank=True,
        verbose_name="Banner Image",
    )
    heading = models.CharField(
        max_length=200,
        verbose_name="Heading",
    )
    category = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Category",
    )
    brand = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Brand",
    )
    badge = models.CharField(
        max_length=100,
        default="Limited Time",
        blank=True,
        verbose_name="Badge",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Description",
    )
    original_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Original Price",
    )
    discounted_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Discounted Price",
    )
    validity_text = models.CharField(
        max_length=200,
        default="Valid while stock lasts",
        blank=True,
        verbose_name="Validity & Stock Note",
    )
    image_url = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Image URL",
    )
    offer_text = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Offer Text",
        help_text="e.g. 'UP TO 50% OFF'",
    )
    start_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Start Date",
    )
    end_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="End Date",
    )
    cta_text = models.CharField(
        max_length=80,
        blank=True,
        default="Shop Now",
        verbose_name="CTA Text",
    )
    cta_link = models.CharField(
        max_length=300,
        blank=True,
        verbose_name="CTA Link",
    )
    sort_order = models.PositiveSmallIntegerField(
        default=0,
        db_index=True,
        verbose_name="Sort Order",
    )
    is_featured = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Featured Promotion",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
    )

    def __str__(self):
        return self.heading


# ============================================================
# 8. Explore by Solution
# ============================================================

class ExploreSolution(BaseModel):
    """
    A solution/use-case card in the 'Explore by Solution' section.

    References a Category so clicking navigates to the correct product listing.
    """

    class Meta:
        verbose_name = "Explore Solution"
        verbose_name_plural = "Explore Solutions"
        ordering = ["sort_order", "created_at"]

    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.CASCADE,
        related_name="explore_solution_entries",
        verbose_name="Category",
    )
    image = OptimizedImageField(
        upload_to="homepage/solutions/",
        null=True,
        blank=True,
        verbose_name="Card Image",
    )
    heading = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Heading",
        help_text="Override category name for the card heading.",
    )
    sort_order = models.PositiveSmallIntegerField(
        default=0,
        db_index=True,
        verbose_name="Sort Order",
    )
    is_visible = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Visible",
    )

    @property
    def display_heading(self) -> str:
        return self.heading or self.category.name

    def __str__(self):
        return f"Explore Solution: {self.display_heading}"


# ============================================================
# 9. Testimonials
# ============================================================

class Testimonial(BaseModel):
    """
    A customer testimonial for the homepage testimonial slider.
    """

    class Meta:
        verbose_name = "Testimonial"
        verbose_name_plural = "Testimonials"
        ordering = ["sort_order", "created_at"]

    customer_name = models.CharField(
        max_length=150,
        verbose_name="Customer Name",
    )
    clinic_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Clinic Name",
    )
    photo = OptimizedImageField(
        upload_to="homepage/testimonials/",
        null=True,
        blank=True,
        verbose_name="Customer Photo",
    )
    photo_url = models.URLField(
        blank=True,
        verbose_name="Photo URL",
        help_text="External URL for the photo. Used if no uploaded photo.",
    )
    rating = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name="Rating (1-5)",
    )
    review = models.TextField(
        verbose_name="Review Text",
    )
    sort_order = models.PositiveSmallIntegerField(
        default=0,
        db_index=True,
        verbose_name="Sort Order",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
    )

    def __str__(self):
        return f"{self.customer_name} ({self.clinic_name})"

    @property
    def display_photo(self):
        """Returns uploaded photo URL if present, otherwise photo_url."""
        if self.photo:
            return self.photo.url
        return self.photo_url or ""


# ============================================================
# 10. Recommended For You
# ============================================================

class RecommendedProduct(BaseModel):
    """
    A product in the 'Recommended For You' section.

    Simple ordered list of product references — no content override needed.
    """

    class Meta:
        verbose_name = "Recommended Product"
        verbose_name_plural = "Recommended Products"
        ordering = ["-created_at"]

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="recommended_entries",
        verbose_name="Product",
    )
    sort_order = models.PositiveSmallIntegerField(
        default=0,
        db_index=True,
        verbose_name="Sort Order",
    )
    is_visible = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Visible",
    )

    def __str__(self):
        return f"Recommended: {self.product.name}"


# ============================================================
# 11. Special Offers Page Content (CMS)
# ============================================================

class SpecialOffersPageContent(BaseModel):
    """
    Singleton / page-level CMS configuration for the customer-facing Special Offers page (/offers).
    Controls the top Hero section content (Left Column).
    """

    class Meta:
        verbose_name = "Special Offers Page Content"
        verbose_name_plural = "Special Offers Page Content"

    hero_badge = models.CharField(
        max_length=150,
        default="PROFESSIONAL CLINICAL SAVINGS",
        blank=True,
        verbose_name="Hero Badge",
    )
    hero_title = models.CharField(
        max_length=200,
        default="Special Offers",
        blank=True,
        verbose_name="Hero Heading",
    )
    hero_description = models.TextField(
        default="Discover exclusive deals, bundle offers and limited-time savings on premium certified dental equipment, imaging systems, and clinical consumables.",
        blank=True,
        verbose_name="Hero Description",
    )
    hero_cta_text = models.CharField(
        max_length=100,
        default="EXPLORE OFFERS",
        blank=True,
        verbose_name="Hero CTA Text",
    )
    hero_trust_text = models.CharField(
        max_length=255,
        default="✓ 100% Genuine Direct Import • Manufacturer Warranty",
        blank=True,
        verbose_name="Hero Trust Statement",
    )

    @classmethod
    def get_instance(cls):
        """Always return the single instance or create default."""
        obj, _ = cls.objects.get_or_create(
            id="00000000-0000-0000-0000-000000000001",
            defaults={
                "hero_badge": "PROFESSIONAL CLINICAL SAVINGS",
                "hero_title": "Special Offers",
                "hero_description": "Discover exclusive deals, bundle offers and limited-time savings on premium certified dental equipment, imaging systems, and clinical consumables.",
                "hero_cta_text": "EXPLORE OFFERS",
                "hero_trust_text": "✓ 100% Genuine Direct Import • Manufacturer Warranty",
            },
        )
        return obj

    def __str__(self):
        return f"Special Offers Page Content: {self.hero_title}"


# ============================================================
# 12. Daily Offers / Hot Deals
# ============================================================

class DailyOffer(BaseModel):
    """
    Dedicated promotional section for high-conversion Daily Offers and Hot Deals.
    Independent from Featured Collections with its own promotional hierarchy,
    countdown timer, discount callouts, and deal product row.
    """

    class Meta:
        verbose_name = "Daily Offer / Hot Deal"
        verbose_name_plural = "Daily Offers / Hot Deals"
        ordering = ["sort_order", "-created_at"]

    # ── Promotional Messaging & Content ──
    badge_text = models.CharField(
        max_length=100,
        default="🔥 DAILY DEALS",
        blank=True,
        verbose_name="Badge / Label",
    )
    title = models.CharField(
        max_length=200,
        default="Big Savings Today",
        verbose_name="Section Heading",
    )
    subheading = models.TextField(
        blank=True,
        default="Limited-time deals on selected products.",
        verbose_name="Subheading / Description",
    )
    offer_text = models.CharField(
        max_length=100,
        default="UP TO 40% OFF",
        blank=True,
        verbose_name="Offer Text / Discount Tag",
    )
    secondary_text = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Secondary Text / Microcopy",
    )

    # ── Offer Type ──
    offer_type = models.CharField(
        max_length=30,
        default="percentage",
        choices=[
            ("percentage", "Percentage Discount"),
            ("flat", "Flat Discount"),
            ("bogo", "Buy One Get One"),
            ("limited", "Limited Time Deal"),
            ("new_arrival", "New Arrival Deal"),
            ("clearance", "Clearance"),
            ("custom", "Custom Promotion"),
        ],
        verbose_name="Offer Type",
    )

    # ── Media & Artwork (Optional) ──
    desktop_image = OptimizedImageField(
        upload_to="homepage/daily_offers/",
        null=True,
        blank=True,
        verbose_name="Desktop Banner Image",
        help_text="Optional promotional banner artwork for desktop.",
    )
    mobile_image = OptimizedImageField(
        upload_to="homepage/daily_offers/mobile/",
        null=True,
        blank=True,
        verbose_name="Mobile Banner Image",
        help_text="Optional mobile artwork.",
    )
    image_position = models.CharField(
        max_length=20,
        default="center",
        choices=[
            ("center", "Center"),
            ("left", "Left"),
            ("right", "Right"),
            ("top", "Top"),
            ("bottom", "Bottom"),
        ],
        verbose_name="Image Position",
    )
    image_fit = models.CharField(
        max_length=20,
        default="cover",
        choices=[("cover", "Cover"), ("contain", "Contain"), ("auto", "Auto")],
        verbose_name="Image Fit",
    )
    overlay_gradient = models.CharField(
        max_length=50,
        default="none",
        choices=[
            ("none", "None"),
            ("dark", "Dark Shadow"),
            ("light", "Light Glow"),
            ("fade-right", "Fade Right"),
            ("fade-bottom", "Fade Bottom"),
        ],
        verbose_name="Overlay Style",
    )
    overlay_opacity = models.PositiveSmallIntegerField(
        default=40,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="Overlay Opacity %",
    )

    # ── Layout & Alignment ──
    horizontal_alignment = models.CharField(
        max_length=20,
        default="center",
        choices=[("left", "Left"), ("center", "Center"), ("right", "Right")],
        verbose_name="Horizontal Text Alignment",
    )
    vertical_alignment = models.CharField(
        max_length=20,
        default="center",
        choices=[("top", "Top"), ("center", "Center"), ("bottom", "Bottom")],
        verbose_name="Vertical Text Alignment",
    )
    content_width = models.CharField(
        max_length=20,
        default="large",
        choices=[
            ("small", "Small"),
            ("medium", "Medium"),
            ("large", "Large"),
            ("full", "Full Width"),
        ],
        verbose_name="Content Width",
    )

    # ── Themes & Color Customization ──
    theme = models.CharField(
        max_length=30,
        default="red_hot",
        choices=[
            ("dark_premium", "Dark Premium"),
            ("red_hot", "Red Hot Deal"),
            ("orange_sale", "Orange Sale"),
            ("teal_premium", "Teal Premium"),
            ("minimal_light", "Minimal Light"),
            ("custom", "Custom"),
        ],
        verbose_name="Visual Theme Preset",
    )
    bg_color = models.CharField(
        max_length=50,
        default="#991B1B",
        verbose_name="Background Color",
    )
    bg_gradient = models.CharField(
        max_length=255,
        blank=True,
        default="linear-gradient(135deg, #7F1D1D 0%, #DC2626 50%, #991B1B 100%)",
        verbose_name="Background Gradient",
    )
    heading_color = models.CharField(
        max_length=50,
        default="#FFFFFF",
        verbose_name="Heading Color",
    )
    description_color = models.CharField(
        max_length=50,
        default="#FEE2E2",
        verbose_name="Description Color",
    )
    badge_bg_color = models.CharField(
        max_length=50,
        default="#FEF3C7",
        verbose_name="Badge Background Color",
    )
    badge_text_color = models.CharField(
        max_length=50,
        default="#B45309",
        verbose_name="Badge Text Color",
    )
    offer_color = models.CharField(
        max_length=50,
        default="#FDE047",
        verbose_name="Offer / Highlight Text Color",
    )
    cta_bg_color = models.CharField(
        max_length=50,
        default="#FBBF24",
        verbose_name="CTA Background Color",
    )
    cta_text_color = models.CharField(
        max_length=50,
        default="#78350F",
        verbose_name="CTA Text Color",
    )
    cta_border_color = models.CharField(
        max_length=50,
        default="#F59E0B",
        blank=True,
        verbose_name="CTA Border Color",
    )
    countdown_bg_color = models.CharField(
        max_length=50,
        default="#000000",
        verbose_name="Countdown Box Background",
    )
    countdown_text_color = models.CharField(
        max_length=50,
        default="#FFFFFF",
        verbose_name="Countdown Text Color",
    )
    product_badge_color = models.CharField(
        max_length=50,
        default="#DC2626",
        verbose_name="Product Discount Badge Color",
    )

    # ── Countdown Timer ──
    countdown_enabled = models.BooleanField(
        default=True,
        verbose_name="Enable Countdown Timer",
    )
    start_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Start Date & Time",
    )
    end_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="End Date & Time",
    )

    # ── Call To Action (CTA) ──
    cta_text = models.CharField(
        max_length=100,
        default="Shop Today's Deals →",
        verbose_name="CTA Button Text",
    )
    cta_action_type = models.CharField(
        max_length=30,
        default="url",
        choices=[
            ("product", "Specific Product"),
            ("category", "Product Category"),
            ("brand", "Brand"),
            ("collection", "Product Collection"),
            ("url", "Custom URL"),
        ],
        verbose_name="CTA Destination Type",
    )
    cta_target_id = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="CTA Target Identifier",
        help_text="Selected Product SKU/ID, Category slug, or Brand slug.",
    )
    cta_url = models.CharField(
        max_length=500,
        default="/offers",
        blank=True,
        verbose_name="CTA URL",
    )

    # ── Status & Scheduling ──
    status = models.CharField(
        max_length=20,
        default="live",
        choices=[
            ("draft", "Draft"),
            ("scheduled", "Scheduled"),
            ("live", "Live"),
            ("expired", "Expired"),
            ("disabled", "Disabled"),
        ],
        verbose_name="Publication Status",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Is Active / Visible",
    )
    sort_order = models.PositiveSmallIntegerField(
        default=0,
        db_index=True,
        verbose_name="Sort Order",
    )

    def __str__(self):
        return f"Daily Offer: {self.title} ({self.status})"


class DailyOfferProduct(BaseModel):
    """
    A curated deal product item within a Daily Offer section.
    Allows reordering and optional custom promotional badge/price overrides.
    """

    class Meta:
        verbose_name = "Daily Offer Product"
        verbose_name_plural = "Daily Offer Products"
        ordering = ["sort_order", "created_at"]

    daily_offer = models.ForeignKey(
        DailyOffer,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Daily Offer Section",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="daily_offer_entries",
        verbose_name="Product",
    )
    deal_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Custom Deal Price (Optional)",
        help_text="Override regular selling price specifically for this daily deal.",
    )
    badge_override = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Badge Override",
        help_text="e.g. 'HOT DEAL', 'LIMITED DEAL', '50% OFF'.",
    )
    sort_order = models.PositiveSmallIntegerField(
        default=0,
        db_index=True,
        verbose_name="Sort Order",
    )

    def __str__(self):
        return f"{self.product.name} in {self.daily_offer.title}"


