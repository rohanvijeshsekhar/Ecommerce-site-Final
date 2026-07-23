"""
FAAZO – Inventory Models (Phase 6A)

Design decisions:
- ProductInventory is a one-to-one extension of Product.
- current_stock: total physical units on hand (admin-editable).
- reserved_stock: units allocated to pending orders (managed internally,
  not editable from admin UI — future orders module will update this).
- available_stock: current_stock - reserved_stock (computed property).
- low_stock_threshold: configurable per product; defaults to 5 units.
- allow_backorders: if True, product can be purchased even at 0 available_stock.
- stock_status: automatically derived from available_stock vs threshold.

Future hooks:
- Orders module will increment reserved_stock on order placement.
- Orders module will decrement current_stock on fulfilment.
- Purchase Order module will increment current_stock on receipt.
- Stock adjustment history can be a separate StockAdjustment model.
"""

from django.core.validators import MinValueValidator
from django.db import models

from apps.common.mixins import AuditedModel


class StockStatus:
    IN_STOCK    = "in_stock"
    LOW_STOCK   = "low_stock"
    OUT_OF_STOCK = "out_of_stock"

    CHOICES = [
        (IN_STOCK,    "In Stock"),
        (LOW_STOCK,   "Low Stock"),
        (OUT_OF_STOCK, "Out of Stock"),
    ]


class ProductInventory(AuditedModel):
    """
    Inventory extension for a single Product.

    One-to-one: one Product → one ProductInventory.
    Auto-created when a product is first saved (via signal in apps.py).
    """

    class Meta:
        verbose_name = "Product Inventory"
        verbose_name_plural = "Product Inventory"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                check=models.Q(current_stock__gte=0),
                name="product_inventory_current_stock_non_negative",
            ),
            models.CheckConstraint(
                check=models.Q(reserved_stock__gte=0),
                name="product_inventory_reserved_stock_non_negative",
            ),
            models.CheckConstraint(
                check=models.Q(allow_backorders=True) | models.Q(reserved_stock__lte=models.F("current_stock")),
                name="product_inventory_no_oversell_without_backorder",
            ),
        ]

    # ── Core relationship ─────────────────────────────────────────────────────

    product = models.OneToOneField(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="inventory",
        verbose_name="Product",
    )

    # ── Stock ─────────────────────────────────────────────────────────────────

    current_stock = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Current Stock",
        help_text="Total physical units on hand. Cannot be negative.",
    )

    reserved_stock = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Reserved Stock",
        help_text=(
            "Units allocated to pending orders. "
            "Managed internally by the Orders module — do not edit manually."
        ),
    )

    # ── Thresholds ────────────────────────────────────────────────────────────

    low_stock_threshold = models.IntegerField(
        default=5,
        validators=[MinValueValidator(0)],
        verbose_name="Low Stock Threshold",
        help_text="Alert / badge triggers when available_stock falls to or below this value.",
    )

    allow_backorders = models.BooleanField(
        default=False,
        verbose_name="Allow Backorders",
        help_text=(
            "If enabled, customers can purchase this product even when out of stock. "
            "The product will be fulfilled when restocked."
        ),
    )

    # ── Computed Properties ───────────────────────────────────────────────────

    @property
    def available_stock(self) -> int:
        """Units available for new orders = current_stock - reserved_stock."""
        return max(0, self.current_stock - self.reserved_stock)

    @property
    def stock_status(self) -> str:
        """
        Derived stock status for display badges.

        Resolution:
        - available_stock == 0 → out_of_stock
        - available_stock ≤ low_stock_threshold → low_stock
        - available_stock > low_stock_threshold → in_stock
        """
        if self.available_stock <= 0:
            return StockStatus.OUT_OF_STOCK
        if self.available_stock <= self.low_stock_threshold:
            return StockStatus.LOW_STOCK
        return StockStatus.IN_STOCK

    @property
    def is_purchasable(self) -> bool:
        """True if the product can be added to cart."""
        return self.available_stock > 0 or self.allow_backorders

    # ── String ────────────────────────────────────────────────────────────────

    def __str__(self):
        return f"{self.product.name} — {self.available_stock} available ({self.stock_status})"
