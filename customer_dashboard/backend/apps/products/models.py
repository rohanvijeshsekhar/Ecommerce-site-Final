"""
FAAZO – Product Models

Design decisions:
- Product is brand-agnostic in customer UX. Brand FK is used only for
  after-sales routing (warranty, service, support).
- warranty_months_override: null → use Brand.warranty_months_default.
  Resolution order: Product override → Brand default.
- ProductVariant, Pricing, and Inventory are Phase 5C concerns.
  This model deliberately has no price or stock fields.
- Soft delete via FullAuditModel (orders reference products; never hard-delete).
- ProductImage.sort_order controls display sequence. is_primary marks hero image.
- ProductAttribute handles flexible key-value specs (voltage, frequency, weight).
- ProductDocument handles product-level files (IFU, brochure, CE cert).
"""

from django.db import models
from django.conf import settings
from django.utils.text import slugify

from apps.common.mixins import AuditedModel, FullAuditModel
from apps.common.managers import ActiveManager, SoftDeleteManager
from apps.common.image_optimizer import OptimizedImageField



# ============================================================
# Choices
# ============================================================

class ProductStatus(models.TextChoices):
    DRAFT        = "draft",        "Draft"
    ACTIVE       = "active",       "Active"
    ARCHIVED     = "archived",     "Archived"
    DISCONTINUED = "discontinued", "Discontinued"


class ProductDocumentType(models.TextChoices):
    BROCHURE   = "brochure",   "Brochure"
    IFU        = "ifu",        "Instructions for Use (IFU)"
    COMPLIANCE = "compliance", "Compliance / CE Certificate"
    MANUAL     = "manual",     "User Manual"
    OTHER      = "other",      "Other"


class ProductWarrantyProvider(models.TextChoices):
    FAAZO        = "faazo",        "FAAZO"
    MANUFACTURER = "manufacturer", "Manufacturer"
    DISTRIBUTOR  = "distributor",  "Distributor"
    THIRD_PARTY  = "third_party",  "Third Party"



# ============================================================
# Product
# ============================================================

class Product(FullAuditModel):
    """
    A dental product in the FAAZO marketplace.

    Brand-agnostic in UX:
      - Customers browse by category, not by brand.
      - Brand is used internally for after-sales routing.

    No price / stock fields here (Phase 5C).
    """

    class Meta:
        verbose_name = "Product"
        verbose_name_plural = "Products"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "is_deleted"]),
            models.Index(fields=["brand", "status"]),
            models.Index(fields=["category", "status"]),
        ]

    # ── Identity ─────────────────────────────────────────────

    name = models.CharField(
        max_length=300,
        verbose_name="Product Name",
    )
    slug = models.SlugField(
        max_length=320,
        unique=True,
        blank=True,
        db_index=True,
        verbose_name="Slug",
    )
    sku = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        verbose_name="SKU",
        help_text="Unique stock-keeping unit code.",
    )

    # ── Relations ────────────────────────────────────────────

    brand = models.ForeignKey(
        "brands.Brand",
        on_delete=models.PROTECT,  # cannot delete a brand with products
        related_name="products",
        db_index=True,
        verbose_name="Brand",
        help_text="After-sales routing (warranty, service) is resolved through Brand.",
    )
    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.PROTECT,
        related_name="products",
        db_index=True,
        verbose_name="Category",
    )

    # ── Content ──────────────────────────────────────────────

    short_description = models.TextField(
        blank=True,
        max_length=500,
        verbose_name="Short Description",
        help_text="Shown in listing cards. Max 500 chars.",
    )
    long_description = models.TextField(
        blank=True,
        verbose_name="Full Description",
        help_text="Rich text / HTML. Shown on product detail page.",
    )
    tags = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Tags",
        help_text='String list: ["implant", "surgical", "titanium"]',
    )

    # ── Status ───────────────────────────────────────────────

    status = models.CharField(
        max_length=20,
        choices=ProductStatus.choices,
        default=ProductStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )
    is_featured = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Featured",
        help_text="Pinned in homepage featured section.",
    )
    is_returnable = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Is Returnable",
        help_text="Determines if product is eligible for return/replacement under company policy.",
    )
    launched_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Launch Date",
        help_text="When this product became / will become publicly visible.",
    )

    # ── Ratings & Reviews Summary ──────────────────────────────
    average_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.00,
        db_index=True,
        verbose_name="Average Rating",
    )
    total_reviews = models.PositiveIntegerField(
        default=0,
        db_index=True,
        verbose_name="Total Approved Reviews",
    )
    rating_distribution = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Rating Distribution",
        help_text='{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}',
    )

    # ── Physical ─────────────────────────────────────────────

    weight_kg = models.DecimalField(
        max_digits=8,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name="Weight (kg)",
    )
    dimensions_cm = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Dimensions (cm)",
        help_text='{"length": 0, "width": 0, "height": 0}',
    )

    warranty_months_override = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name="Warranty Override (months)",
        help_text=(
            "Override the brand default warranty for this product. "
            "Leave blank to use Brand.warranty_months_default."
        ),
    )

    warranty_provider = models.CharField(
        max_length=50,
        choices=ProductWarrantyProvider.choices,
        default=ProductWarrantyProvider.MANUFACTURER,
        verbose_name="Warranty Provider",
    )
    warranty_terms = models.TextField(
        blank=True,
        default="",
        verbose_name="Warranty Terms",
    )
    warranty_contact_details = models.TextField(
        blank=True,
        default="",
        verbose_name="Warranty Contact Details",
    )
    warranty_months = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name="Warranty Months",
        help_text="Warranty period in months. If blank, falls back to brand default.",
    )
    serial_number_required = models.BooleanField(
        default=False,
        verbose_name="Serial Number Required",
        help_text="Toggle if serial number is mandatory for manual registration approval.",
    )
    warranty_website_url = models.URLField(
        blank=True,
        default="",
        verbose_name="Manufacturer Warranty Website",
        help_text="Website URL where customer can register warranty for imported brands.",
    )

    # ── Managers ─────────────────────────────────────────────

    objects     = ActiveManager()      # default: excludes soft-deleted
    all_objects = SoftDeleteManager()  # admin use: includes deleted

    # ── Lifecycle ────────────────────────────────────────────

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            n = 1
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.sku})"

    # ── Properties ───────────────────────────────────────────

    @property
    def effective_warranty_months(self) -> int:
        """
        Resolve warranty duration.
        Resolution order: Product warranty_months -> Product override → Brand default.
        """
        if self.warranty_months is not None:
            return self.warranty_months
        if self.warranty_months_override is not None:
            return self.warranty_months_override
        if self.brand:
            return self.brand.warranty_months_default
        return 12

    @property
    def primary_image(self):
        """Returns the primary ProductImage, or the first image, or None."""
        images = self.images.all()
        primary = images.filter(is_primary=True).first()
        return primary or images.first()

    @property
    def is_published(self) -> bool:
        """True if this product is visible to customers."""
        return self.status == ProductStatus.ACTIVE and not self.is_deleted


# ============================================================
# ProductImage
# ============================================================

class ProductImage(models.Model):
    """Ordered images for a product. is_primary marks the hero image."""

    class Meta:
        verbose_name = "Product Image"
        verbose_name_plural = "Product Images"
        ordering = ["sort_order", "created_at"]

    created_at = models.DateTimeField(auto_now_add=True)

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
        verbose_name="Product",
    )
    image = OptimizedImageField(
        upload_to="products/images/",
        verbose_name="Image",
    )
    alt_text = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Alt Text",
        help_text="Accessibility description for this image.",
    )
    sort_order = models.PositiveSmallIntegerField(
        default=0,
        verbose_name="Sort Order",
    )
    is_primary = models.BooleanField(
        default=False,
        verbose_name="Primary Image",
        help_text="Shown as the hero/thumbnail image.",
    )

    def __str__(self):
        return f"{self.product.name} — image {self.sort_order}"

    def save(self, *args, **kwargs):
        # Enforce only one primary image per product
        if self.is_primary:
            ProductImage.objects.filter(
                product=self.product, is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)


# ============================================================
# ProductAttribute
# ============================================================

class ProductAttribute(models.Model):
    """
    Flexible key-value technical specifications for a product.

    Examples:
        name="Voltage",   value="220",  unit="V"
        name="Frequency", value="50",   unit="Hz"
        name="Wattage",   value="1500", unit="W"
    """

    class Meta:
        verbose_name = "Product Attribute"
        verbose_name_plural = "Product Attributes"
        ordering = ["sort_order", "name"]

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="attributes",
        verbose_name="Product",
    )
    name = models.CharField(
        max_length=100,
        verbose_name="Attribute Name",
    )
    value = models.CharField(
        max_length=300,
        verbose_name="Value",
    )
    unit = models.CharField(
        max_length=30,
        blank=True,
        verbose_name="Unit",
        help_text="e.g. V, Hz, kg, cm",
    )
    sort_order = models.PositiveSmallIntegerField(
        default=0,
        verbose_name="Sort Order",
    )

    def __str__(self):
        unit_str = f" {self.unit}" if self.unit else ""
        return f"{self.name}: {self.value}{unit_str}"


# ============================================================
# ProductDocument
# ============================================================

class ProductDocument(AuditedModel):
    """
    Product-level file assets (IFU, brochure, CE cert).

    Separate from BrandDocument — these are product-specific.
    """

    class Meta:
        verbose_name = "Product Document"
        verbose_name_plural = "Product Documents"
        ordering = ["product", "document_type", "title"]

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="documents",
        verbose_name="Product",
    )
    title = models.CharField(
        max_length=200,
        verbose_name="Title",
    )
    document_type = models.CharField(
        max_length=30,
        choices=ProductDocumentType.choices,
        default=ProductDocumentType.OTHER,
        db_index=True,
        verbose_name="Document Type",
    )
    file = models.FileField(
        upload_to="products/documents/",
        null=True,
        blank=True,
        verbose_name="File",
    )
    external_url = models.URLField(
        blank=True,
        verbose_name="External URL",
    )
    is_public = models.BooleanField(
        default=False,
        verbose_name="Public",
        help_text="If true, visible to authenticated customers.",
    )

    def __str__(self):
        return f"{self.product.name} — {self.title}"


# ============================================================
# Product Share Analytics Log
# ============================================================

class SharePlatform(models.TextChoices):
    WHATSAPP = "whatsapp", "WhatsApp"
    TELEGRAM = "telegram", "Telegram"
    FACEBOOK = "facebook", "Facebook"
    TWITTER = "twitter", "X (Twitter)"
    LINKEDIN = "linkedin", "LinkedIn"
    EMAIL = "email", "Email"
    COPY_LINK = "copy_link", "Copy Link"
    NATIVE_SHARE = "native_share", "Native Share"
    OTHER = "other", "Other"


class ProductShareLog(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="share_logs",
        verbose_name="Product",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="product_shares",
        verbose_name="User",
    )
    platform = models.CharField(
        max_length=30,
        choices=SharePlatform.choices,
        default=SharePlatform.COPY_LINK,
        db_index=True,
        verbose_name="Platform",
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="IP Address")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="Created At")

    class Meta:
        db_table = "product_share_logs"
        verbose_name = "Product Share Log"
        verbose_name_plural = "Product Share Logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Share ({self.platform}) for {self.product.name} at {self.created_at}"

