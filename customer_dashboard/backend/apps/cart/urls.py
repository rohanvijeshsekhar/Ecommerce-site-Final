from django.urls import path
from .views import (
    CartView,
    CartAddView,
    CartItemDetailView,
    CartClearView,
    CartSaveForLaterView,
    CartMoveToCartView,
)

urlpatterns = [
    path('', CartView.as_view(), name='cart-detail'),
    path('add/', CartAddView.as_view(), name='cart-add'),
    path('items/<uuid:pk>/', CartItemDetailView.as_view(), name='cart-item-detail'),
    path('items/<uuid:pk>/save-for-later/', CartSaveForLaterView.as_view(), name='cart-item-save-for-later'),
    path('items/<uuid:pk>/move-to-cart/', CartMoveToCartView.as_view(), name='cart-item-move-to-cart'),
    path('clear/', CartClearView.as_view(), name='cart-clear'),
]
