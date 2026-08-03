from django.db import models
from django.conf import settings
from apps.common.mixins import BaseModel
from apps.products.models import Product


class Wishlist(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wishlist",
        verbose_name="User",
    )

    class Meta(BaseModel.Meta):
        db_table = "wishlists"
        verbose_name = "Wishlist"
        verbose_name_plural = "Wishlists"

    def __str__(self):
        return f"Wishlist of {self.user.email}"


class WishlistItem(BaseModel):
    wishlist = models.ForeignKey(
        Wishlist,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Wishlist",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="wishlist_items",
        verbose_name="Product",
    )

    class Meta(BaseModel.Meta):
        db_table = "wishlist_items"
        verbose_name = "Wishlist Item"
        verbose_name_plural = "Wishlist Items"
        unique_together = ("wishlist", "product")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.product.name} in {self.wishlist}"
