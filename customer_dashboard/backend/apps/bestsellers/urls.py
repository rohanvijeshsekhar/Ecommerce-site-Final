from django.urls import path
from .views import (
    BestSellerBannerView,
    BestSellerProductListView,
    AdminBestSellerBannerView,
    AdminBestSellerBannerDetailView,
    AdminBestSellerProductListView,
    AdminBestSellerProductDetailView,
)

app_name = "bestsellers"

urlpatterns = [
    # Storefront (public)
    path("banner/",    BestSellerBannerView.as_view(),      name="banner"),
    path("products/",  BestSellerProductListView.as_view(), name="products"),

    # Admin CRUD
    path("admin/banner/",           AdminBestSellerBannerView.as_view(),         name="admin-banner-list"),
    path("admin/banner/<int:pk>/",  AdminBestSellerBannerDetailView.as_view(),   name="admin-banner-detail"),
    path("admin/products/",         AdminBestSellerProductListView.as_view(),    name="admin-products-list"),
    path("admin/products/<int:pk>/",AdminBestSellerProductDetailView.as_view(),  name="admin-products-detail"),
]
