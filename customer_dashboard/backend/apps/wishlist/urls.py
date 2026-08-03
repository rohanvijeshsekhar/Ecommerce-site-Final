from django.urls import path
from apps.wishlist.views import (
    WishlistDetailView,
    WishlistToggleView,
    WishlistItemDetailView,
    WishlistMoveToCartView,
    WishlistSyncGuestView,
)

urlpatterns = [
    path("", WishlistDetailView.as_view(), name="wishlist-detail"),
    path("toggle/", WishlistToggleView.as_view(), name="wishlist-toggle"),
    path("items/<uuid:product_id>/", WishlistItemDetailView.as_view(), name="wishlist-item-detail"),
    path("items/<uuid:product_id>/move-to-cart/", WishlistMoveToCartView.as_view(), name="wishlist-move-to-cart"),
    path("sync/", WishlistSyncGuestView.as_view(), name="wishlist-sync-guest"),
]
