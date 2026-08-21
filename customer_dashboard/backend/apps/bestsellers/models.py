from django.db import models
from apps.common.image_optimizer import OptimizedImageField


class BestSellerBanner(models.Model):
    """
    Top full-width hero banner for the Best Sellers marketplace module.
    Only active banners are served to the storefront.
    """

    title = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Banner Title",
        help_text="Optional heading displayed over the banner image",
    )
    subtitle = models.CharField(
        max_length=300,
        blank=True,
        verbose_name="Banner Subtitle",
        help_text="Optional short description displayed over the banner image",
    )
    banner_image = OptimizedImageField(
        upload_to="bestsellers/banners/",
        null=True,
        blank=True,
        verbose_name="Banner Image",
        help_text="High-resolution hero image (Desktop ~420px height, Mobile ~220px height)",
    )
    button_text = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Button Text",
        help_text="Optional call-to-action button label (e.g. 'Explore Collection')",
    )
    button_link = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Button Redirect Link",
        help_text="Optional URL or route (e.g. '/products' or '/combos')",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Is Active",
        help_text="Enable or disable banner display on the storefront without deleting",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        verbose_name = "Best Seller Banner"
        verbose_name_plural = "Best Seller Banners"
        ordering = ["-updated_at"]

    def __str__(self):
        status = "Active" if self.is_active else "Inactive"
        return f"{self.title or 'Best Seller Banner'} ({status})"


class BestSellerProduct(models.Model):
    """
    Curation model linking products to the Best Sellers showcase.
    Admin can select products, set display order, and toggle active status.
    """

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="bestseller_entries",
        verbose_name="Product",
    )
    display_order = models.PositiveIntegerField(
        default=0,
        db_index=True,
        verbose_name="Display Order",
        help_text="Lower numbers appear first (e.g. 1, 2, 3)",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Is Active",
        help_text="Enable or disable product visibility in Best Sellers module",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")

    class Meta:
        verbose_name = "Best Seller Product"
        verbose_name_plural = "Best Seller Products"
        ordering = ["display_order", "-created_at"]
        unique_together = ("product",)

    def __str__(self):
        return f"#{self.display_order} — {self.product.name} ({'Active' if self.is_active else 'Inactive'})"
