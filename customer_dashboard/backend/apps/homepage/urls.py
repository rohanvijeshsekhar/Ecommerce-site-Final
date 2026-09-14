"""
FAAZO – Homepage CMS URL Configuration

All routes live under /api/v1/ via the root urls.py.

Public endpoints (AllowAny GET):
  /api/v1/homepage/hero/
  /api/v1/homepage/categories/
  /api/v1/homepage/brands/
  /api/v1/homepage/best-sellers/
  /api/v1/homepage/featured-collections/
  /api/v1/homepage/offers/
  /api/v1/homepage/explore-solutions/
  /api/v1/homepage/testimonials/
  /api/v1/homepage/recommended/

Admin CRUD (IsAdmin):
  POST/PATCH/DELETE on any of the above
  PATCH /api/v1/homepage/<section>/reorder/
  Full collection item CRUD: /api/v1/homepage/collection-items/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    HeroSlideViewSet,
    HomepageCategoryViewSet,
    HomepageBrandViewSet,
    BestSellerViewSet,
    FeaturedCollectionViewSet,
    FeaturedCollectionItemViewSet,
    LimitedTimeOfferViewSet,
    ExploreSolutionViewSet,
    TestimonialViewSet,
    RecommendedProductViewSet,
    SpecialOffersPageContentView,
    HomepagePromoBannerView,
)

router = DefaultRouter()
router.register(r"homepage/hero",                 HeroSlideViewSet,              basename="homepage-hero")
router.register(r"homepage/categories",           HomepageCategoryViewSet,       basename="homepage-categories")
router.register(r"homepage/brands",               HomepageBrandViewSet,          basename="homepage-brands")
router.register(r"homepage/best-sellers",         BestSellerViewSet,             basename="homepage-best-sellers")
router.register(r"homepage/featured-collections", FeaturedCollectionViewSet,     basename="homepage-featured-collections")
router.register(r"homepage/collection-items",     FeaturedCollectionItemViewSet, basename="homepage-collection-items")
router.register(r"homepage/offers",               LimitedTimeOfferViewSet,       basename="homepage-offers")
router.register(r"homepage/explore-solutions",    ExploreSolutionViewSet,        basename="homepage-explore-solutions")
router.register(r"homepage/testimonials",         TestimonialViewSet,            basename="homepage-testimonials")
router.register(r"homepage/recommended",          RecommendedProductViewSet,     basename="homepage-recommended")

urlpatterns = [
    path("homepage/promo-banner/", HomepagePromoBannerView.as_view(), name="homepage-promo-banner"),
    path("homepage/offers-page-content/", SpecialOffersPageContentView.as_view(), name="homepage-offers-page-content"),
    path("", include(router.urls)),
]
