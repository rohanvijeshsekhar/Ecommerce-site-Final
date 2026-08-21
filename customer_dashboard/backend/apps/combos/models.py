from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from django.utils.text import slugify

from apps.common.image_optimizer import OptimizedImageField
from apps.common.mixins import FullAuditModel
from apps.common.managers import ActiveManager, SoftDeleteManager



class ComboDealStatus(models.TextChoices):
    DRAFT        = "draft",        "Draft"
    ACTIVE       = "active",       "Active"
    ARCHIVED     = "archived",     "Archived"


class ComboDeal(FullAuditModel):
    class Meta:
        verbose_name = "Combo Deal"
        verbose_name_plural = "Combo Deals"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "is_deleted"]),
        ]

    # ── Identity ─────────────────────────────────────────────
    title = models.CharField(max_length=300, verbose_name="Combo Title")
    slug = models.SlugField(max_length=320, unique=True, blank=True, db_index=True, verbose_name="Slug")

    # ── Content ──────────────────────────────────────────────
    short_description = models.TextField(blank=True, max_length=500, verbose_name="Short Description")
    full_description = models.TextField(blank=True, verbose_name="Full Description")
    thumbnail = OptimizedImageField(upload_to="combos/thumbnails/", null=True, blank=True, verbose_name="Thumbnail")
    banner = OptimizedImageField(upload_to="combos/banners/", null=True, blank=True, verbose_name="Banner")


    # ── Pricing ──────────────────────────────────────────────
    original_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Original Price (Calculated)",
    )
    combo_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Combo Price",
    )
    dealer_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Dealer Price",
    )
    offer_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Offer Price",
    )
    offer_start_date = models.DateField(null=True, blank=True, verbose_name="Offer Start Date")
    offer_end_date = models.DateField(null=True, blank=True, verbose_name="Offer End Date")

    # ── Status & Flags ───────────────────────────────────────
    is_featured = models.BooleanField(default=False, db_index=True, verbose_name="Featured")
    status = models.CharField(
        max_length=20,
        choices=ComboDealStatus.choices,
        default=ComboDealStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )

    # ── Inventory ────────────────────────────────────────────
    inventory = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Current Stock",
    )

    # ── SEO ──────────────────────────────────────────────────
    meta_title = models.CharField(max_length=150, blank=True, verbose_name="Meta Title")
    meta_description = models.TextField(blank=True, verbose_name="Meta Description")
    meta_keywords = models.CharField(max_length=255, blank=True, verbose_name="Meta Keywords")

    # ── Managers ─────────────────────────────────────────────
    objects     = ActiveManager()      # default: excludes soft-deleted
    all_objects = SoftDeleteManager()  # admin use: includes deleted

    # ── Computed Properties ───────────────────────────────────
    @property
    def is_offer_active(self) -> bool:
        if self.offer_price is None:
            return False
        today = timezone.localdate()
        if self.offer_start_date and today < self.offer_start_date:
            return False
        if self.offer_end_date and today > self.offer_end_date:
            return False
        return True

    @property
    def effective_price(self) -> Decimal:
        if self.is_offer_active and self.offer_price is not None:
            return self.offer_price
        return self.combo_price

    @property
    def discount_percentage(self) -> float | None:
        if not self.original_price or self.original_price == Decimal("0.00"):
            return None
        if self.effective_price >= self.original_price:
            return None
        return round(float((self.original_price - self.effective_price) / self.original_price * 100), 1)

    @property
    def you_save(self) -> Decimal | None:
        saved = self.original_price - self.effective_price
        return saved if saved > Decimal("0.00") else None

    # ── Lifecycle ────────────────────────────────────────────
    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            n = 1
            while ComboDeal.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def calculate_original_price(self):
        """Recalculates and updates original_price based on combo_products."""
        total = Decimal("0.00")
        for cp in self.combo_products.all():
            if hasattr(cp.product, "pricing"):
                total += cp.product.pricing.effective_price * cp.quantity
        if self.original_price != total:
            self.original_price = total
            ComboDeal.all_objects.filter(pk=self.pk).update(original_price=total)
        return total

    def __str__(self):
        return f"{self.title} — ₹{self.effective_price}"


class ComboDealProduct(models.Model):
    combo_deal = models.ForeignKey(
        ComboDeal,
        on_delete=models.CASCADE,
        related_name="combo_products",
        verbose_name="Combo Deal",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="combo_memberships",
        verbose_name="Product",
    )
    quantity = models.PositiveIntegerField(default=1, verbose_name="Quantity")

    class Meta:
        verbose_name = "Combo Product"
        verbose_name_plural = "Combo Products"
        unique_together = ("combo_deal", "product")

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.combo_deal.calculate_original_price()

    def delete(self, *args, **kwargs):
        combo_deal = self.combo_deal
        super().delete(*args, **kwargs)
        combo_deal.calculate_original_price()

    def __str__(self):
        return f"{self.quantity}x {self.product.name} in {self.combo_deal.title}"


class ComboDealImage(models.Model):
    combo_deal = models.ForeignKey(
        ComboDeal,
        on_delete=models.CASCADE,
        related_name="images",
        verbose_name="Combo Deal",
    )
    image = OptimizedImageField(upload_to="combos/gallery/", verbose_name="Image")
    alt_text = models.CharField(max_length=200, blank=True, verbose_name="Alt Text")
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name="Sort Order")

    class Meta:
        verbose_name = "Combo Image"
        verbose_name_plural = "Combo Images"
        ordering = ["sort_order"]

    def __str__(self):
        return f"Image for {self.combo_deal.title}"


class ComboDealBannerSetting(models.Model):
    badge_text = models.CharField(max_length=100, default="SUPER SAVER BUNDLES", verbose_name="Badge Text")
    title = models.CharField(max_length=200, default="Premium Combo Deals", verbose_name="Title")
    description = models.TextField(
        default="Equip your clinical workflows with carefully curated packages of leading tools. Save big vs buying individual components.",
        verbose_name="Description"
    )
    banner_image = OptimizedImageField(upload_to="combos/banner/", null=True, blank=True, verbose_name="Banner Image")


    class Meta:
        verbose_name = "Combo Deal Banner Setting"
        verbose_name_plural = "Combo Deal Banner Settings"

    def __str__(self):
        return "Combo Deals Page Banner Setting"

