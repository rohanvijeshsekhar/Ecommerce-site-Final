from django.db import models
from django.conf import settings
from apps.common.mixins import BaseModel
from apps.products.models import Product

class Cart(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart",
        verbose_name="User"
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Cart"
        verbose_name_plural = "Carts"

    def __str__(self):
        return f"Cart of {self.user.email}"

class CartItem(BaseModel):
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Cart"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        verbose_name="Product"
    )
    quantity = models.PositiveIntegerField(
        default=1,
        verbose_name="Quantity"
    )
    is_saved_for_later = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Saved For Later"
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Cart Item"
        verbose_name_plural = "Cart Items"
        unique_together = ('cart', 'product')

    def __str__(self):
        return f"{self.quantity} x {self.product.name} in {self.cart}"
