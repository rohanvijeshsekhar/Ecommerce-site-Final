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
        ordering = ["sort_order", "created_at"]

    brand = models.ForeignKey(
        "brands.Brand",
        on_delete=models.CASCADE,
        related_name="homepage_showcases",
        verbose_name="Brand",
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
        verbose_name="Collection Title",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Collection Description",
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
        ordering = ["sort_order", "created_at"]

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
    description = models.TextField(
        blank=True,
        verbose_name="Description",
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
        ordering = ["sort_order", "created_at"]

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
