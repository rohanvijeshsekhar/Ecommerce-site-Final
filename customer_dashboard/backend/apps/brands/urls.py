from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import BrandViewSet, BrandPageBannerView

router = DefaultRouter()
router.register(r"brands", BrandViewSet, basename="brand")

urlpatterns = [
    path("brands/banner/", BrandPageBannerView.as_view(), name="brand-page-banner"),
    path("brands/admin/banner/", BrandPageBannerView.as_view(), name="brand-admin-page-banner"),
] + router.urls
