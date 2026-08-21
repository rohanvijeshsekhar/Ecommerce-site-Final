"""
FAAZO – Brand Models

Design decisions:
- Brand is the after-sales anchor. All warranty, service, support, certifications,
  and documentation are owned by Brand, not Product.
- Products simply reference a Brand via FK; brand policy is resolved at runtime.
- BrandDocument separates file assets from policy text for clean querying.
- Soft delete via FullAuditModel — brands are never physically removed because
  historical orders and warranty records must still resolve their brand.
"""

from django.db import models
from django.utils.text import slugify

from apps.common.image_optimizer import OptimizedImageField
from apps.common.mixins import AuditedModel, FullAuditModel
from apps.common.managers import ActiveManager, SoftDeleteManager



# ============================================================
# Choices
# ============================================================

class BrandDocumentType(models.TextChoices):
    CATALOGUE     = "catalogue",     "Product Catalogue"
    CERTIFICATION = "certification", "Certification"
    IFU           = "ifu",           "Instructions for Use (IFU)"
    PRICE_LIST    = "price_list",    "Price List"
    OTHER         = "other",         "Other"


# ============================================================
# Brand
# ============================================================

class Brand(FullAuditModel):
    """
    A manufacturer / supplier in the FAAZO dental marketplace.

    The Brand entity owns:
      - Warranty policy (terms + default duration + transferability)
      - Service policy (repair terms + SLA)
      - Support contacts (email, phone)
      - Certifications (JSON list)
      - Documentation portal URL

    Products FK to Brand. All after-sales routing resolves through Brand.
    """

    class Meta:
        verbose_name = "Brand"
        verbose_name_plural = "Brands"
        ordering = ["display_order", "name"]

    # ── Identity ─────────────────────────────────────────────

    name = models.CharField(
        max_length=200,
        unique=True,
        verbose_name="Brand Name",
    )
    slug = models.SlugField(
        max_length=220,
        unique=True,
        blank=True,
        db_index=True,
        verbose_name="Slug",
    )
    short_description = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Short Description",
    )
    full_description = models.TextField(
        blank=True,
        verbose_name="Full Description",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Legacy Description",
    )
    logo = OptimizedImageField(
        upload_to="brands/logos/",
        null=True,
        blank=True,
        verbose_name="Logo",
    )
    banner_image = OptimizedImageField(
        upload_to="brands/banners/",
        null=True,
        blank=True,
        verbose_name="Banner Image",
        help_text="Hero banner displayed on the brand detail page.",
    )
    country_of_origin = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Country of Origin",
    )

    # ── Contact ──────────────────────────────────────────────

    website_url = models.URLField(
        blank=True,
        verbose_name="Website URL",
    )
    support_email = models.EmailField(
        blank=True,
        verbose_name="Support Email",
    )
    support_phone = models.CharField(
        max_length=30,
        blank=True,
        verbose_name="Support Phone",
    )

    # ── Warranty Policy ──────────────────────────────────────

    warranty_policy_text = models.TextField(
        blank=True,
        verbose_name="Warranty Policy",
        help_text="Human-readable warranty terms for this brand.",
    )
    warranty_months_default = models.PositiveSmallIntegerField(
        default=12,
        verbose_name="Default Warranty (months)",
        help_text="Applied to all products unless overridden at product level.",
    )
    is_warranty_transferable = models.BooleanField(
        default=False,
        verbose_name="Warranty Transferable",
        help_text="Can warranty be transferred if the device is resold?",
    )

    # ── Service Policy ───────────────────────────────────────

    service_policy_text = models.TextField(
        blank=True,
        verbose_name="Service Policy",
        help_text="Repair and service terms for this brand.",
    )
    service_turnaround_days = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name="Service Turnaround (days)",
        help_text="Typical repair / service SLA in business days.",
    )

    # ── Compliance & Certifications ──────────────────────────

    certifications = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Certifications",
        help_text='List: [{"name": "", "number": "", "issued_by": "", "valid_until": "YYYY-MM-DD"}]',
    )
    documentation_url = models.URLField(
        blank=True,
        verbose_name="Documentation Portal URL",
        help_text="Central brand documentation / IFU portal.",
    )

    # ── Admin & Display ──────────────────────────────────────

    display_order = models.PositiveIntegerField(
        default=0,
        db_index=True,
        verbose_name="Display Order",
        help_text="Lower numbers appear first.",
    )
    is_featured = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Featured Brand",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
    )

    # ── SEO ──────────────────────────────────────────────────

    seo_title = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="SEO Title",
    )
    seo_description = models.TextField(
        blank=True,
        verbose_name="SEO Description",
    )

    # ── Managers ─────────────────────────────────────────────

    objects     = ActiveManager()      # default: excludes soft-deleted
    all_objects = SoftDeleteManager()  # admin: includes deleted

    # ── Lifecycle ────────────────────────────────────────────

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    # ── Properties ───────────────────────────────────────────

    @property
    def active_product_count(self):
        """Number of active (non-deleted) products for this brand."""
        return self.products.filter(is_deleted=False, status="active").count()


# ============================================================
# BrandDocument
# ============================================================

class BrandDocument(AuditedModel):
    """
    A file asset owned by a Brand (catalogue PDFs, certifications, IFU).

    Kept separate from product documents so brand-level assets can be
    queried and managed independently.
    """

    class Meta:
        verbose_name = "Brand Document"
        verbose_name_plural = "Brand Documents"
        ordering = ["brand", "document_type", "title"]

    brand = models.ForeignKey(
        Brand,
        on_delete=models.CASCADE,
        related_name="documents",
        verbose_name="Brand",
    )
    title = models.CharField(
        max_length=200,
        verbose_name="Title",
    )
    document_type = models.CharField(
        max_length=30,
        choices=BrandDocumentType.choices,
        default=BrandDocumentType.OTHER,
        db_index=True,
        verbose_name="Document Type",
    )
    file = models.FileField(
        upload_to="brands/documents/",
        null=True,
        blank=True,
        verbose_name="File",
    )
    external_url = models.URLField(
        blank=True,
        verbose_name="External URL",
        help_text="Use if the document is hosted externally.",
    )
    is_public = models.BooleanField(
        default=False,
        verbose_name="Public",
        help_text="If true, visible to authenticated customers.",
    )

    def __str__(self):
        return f"{self.brand.name} — {self.title}"


# ============================================================
# BrandPageBanner
# ============================================================

class BrandPageBanner(AuditedModel):
    """
    Hero Banner configuration for the main Brands listing page (/brands).
    Fully managed via Django Admin.
    """

    title = models.CharField(
        max_length=255,
        default="Our Trusted Brands",
        verbose_name="Title",
    )
    subtitle = models.TextField(
        blank=True,
        default="Explore premium dental brands trusted by clinics and professionals worldwide.",
        verbose_name="Subtitle",
    )
    banner_image = OptimizedImageField(
        upload_to="brands/page_banners/",
        null=True,
        blank=True,
        verbose_name="Banner Image",
    )
    button_text = models.CharField(
        max_length=100,
        blank=True,
        default="Explore Brands",
        verbose_name="Button Text",
    )
    button_link = models.CharField(
        max_length=255,
        blank=True,
        default="#brands-grid",
        verbose_name="Button Link",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
    )

    class Meta:
        verbose_name = "Brand Page Banner"
        verbose_name_plural = "Brand Page Banners"

    def __str__(self):
        return f"Brands Banner: {self.title}"

