"""
FAAZO – Pricing Models (Phase 6A)

Design decisions:
- ProductPricing is a one-to-one extension of Product.
  It lives in a separate app so it can evolve independently.
- No price fields exist on Product itself (clean catalogue / pricing separation).
- Offer dates control automatic offer activation/deactivation.
- Dealer Price is stored here but only exposed to dealer accounts by the API.
- GST is stored for reference only (UI does not show tax-inclusive/exclusive toggle).
- AuditedModel gives created_at, updated_at, created_by, updated_by.

Future hooks:
- PriceHistory model can reference ProductPricing.
- Coupons / Promotions can reference effective_price for discount stacking.
- Bulk pricing tiers (for dealers) can extend via separate DealerPricingTier model.
"""

from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from apps.common.mixins import AuditedModel


class ProductPricing(AuditedModel):
    """
    Pricing extension for a single Product.

    One-to-one: one Product → one ProductPricing.
    Auto-created when a product is first saved (via signal in apps.py).
    """

    class Meta:
        verbose_name = "Product Pricing"
        verbose_name_plural = "Product Pricing"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["selling_price"]),
        ]

    # ── Core relationship ─────────────────────────────────────────────────────

    product = models.OneToOneField(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="pricing",
        verbose_name="Product",
    )

    # ── Prices ────────────────────────────────────────────────────────────────

    mrp = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="MRP (Maximum Retail Price)",
        help_text="Original / maximum retail price before any discount.",
    )

    selling_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Selling Price (GST Inclusive)",
        help_text="Final customer-facing price INCLUDING GST. Must be ≤ MRP. Example: if taxable value is ₹1,000 and GST is 18%, enter ₹1,180.",
    )

    offer_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Offer Price (GST Inclusive)",
        help_text="Temporary discounted GST-inclusive price. Must be ≤ Selling Price.",
    )

    dealer_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Dealer Price (GST Inclusive)",
        help_text="GST-inclusive wholesale price for verified dealers only. Must be ≤ Selling Price.",
    )

    # ── Tax ───────────────────────────────────────────────────────────────────

    gst_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("18.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="GST Rate (%)",
        help_text="Applicable GST slab (0, 5, 12, 18, 28). All selling prices are GST-INCLUSIVE.",
    )

    hsn_code = models.CharField(
        max_length=20,
        blank=True,
        default="",
        verbose_name="HSN Code",
        help_text="Harmonised System of Nomenclature code. Required for GST invoices.",
    )

    tax_inclusive = models.BooleanField(
        default=True,
        verbose_name="Tax Inclusive Pricing",
        help_text="If True (default), all admin-entered prices include GST. GST is extracted at checkout, not added on top.",
    )

    # ── Offer window ──────────────────────────────────────────────────────────

    offer_start_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Offer Start Date",
        help_text="Offer activates from this date (inclusive).",
    )

    offer_end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Offer End Date",
        help_text="Offer expires after this date (inclusive).",
    )

    # ── Computed Properties ───────────────────────────────────────────────────

    @property
    def is_offer_active(self) -> bool:
        """True if an offer_price exists and today is within the offer window."""
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
        """The price a customer actually pays. Offer if active, else selling_price."""
        if self.is_offer_active and self.offer_price is not None:
            return self.offer_price
        return self.selling_price

    @property
    def discount_percentage(self) -> float | None:
        """Percentage saved vs MRP. None if MRP is 0 or no discount."""
        if not self.mrp or self.mrp == Decimal("0.00"):
            return None
        if self.effective_price >= self.mrp:
            return None
        return round(float((self.mrp - self.effective_price) / self.mrp * 100), 1)

    @property
    def you_save(self) -> Decimal | None:
        """Amount saved vs MRP. None if no discount."""
        saved = self.mrp - self.effective_price
        return saved if saved > Decimal("0.00") else None

    # ── String ────────────────────────────────────────────────────────────────

    def __str__(self):
        return f"{self.product.name} — ₹{self.effective_price}"
