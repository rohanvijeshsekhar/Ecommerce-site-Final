from django.urls import path
from .views import (
    OrderListView,
    OrderDetailView,
    OrderCancelView,
    OrderInvoiceView,
    AdminOrderListView,
    AdminOrderDetailView,
    AdminOrderExportView,
)

urlpatterns = [
    # Admin endpoints (placed before customer <str:pk> wildcards)
    path('admin/', AdminOrderListView.as_view(), name='admin-order-list'),
    path('admin/export/', AdminOrderExportView.as_view(), name='admin-order-export'),
    path('admin/<str:pk>/', AdminOrderDetailView.as_view(), name='admin-order-detail'),

    # Customer endpoints
    path('', OrderListView.as_view(), name='order-list'),
    path('<str:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('<str:pk>/cancel/', OrderCancelView.as_view(), name='order-cancel'),
    path('<str:pk>/invoice/', OrderInvoiceView.as_view(), name='order-invoice'),
]
