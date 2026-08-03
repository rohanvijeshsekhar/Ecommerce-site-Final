from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.reviews.views import (
    PublicProductReviewsView,
    ReviewEligibilityView,
    CustomerReviewViewSet,
    AdminReviewModerationViewSet,
)

router = DefaultRouter()
router.register(r"reviews", CustomerReviewViewSet, basename="customer-review")
router.register(r"admin/reviews", AdminReviewModerationViewSet, basename="admin-review")

urlpatterns = [
    path("products/<str:identifier>/reviews/", PublicProductReviewsView.as_view(), name="product-reviews-list"),
    path("reviews/eligibility/", ReviewEligibilityView.as_view(), name="review-eligibility"),
    path("", include(router.urls)),
]
