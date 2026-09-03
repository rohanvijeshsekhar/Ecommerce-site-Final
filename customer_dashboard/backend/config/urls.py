"""
FAAZO Backend – Root URL Configuration

API namespace: /api/v1/
Documentation: /api/schema/ · /api/docs/ · /api/redoc/
Admin:         /admin/
"""

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

# ============================================================
# Django Admin Branding
# ============================================================
admin.site.site_header = "FAAZO Dental Solutions – Admin"
admin.site.site_title = "FAAZO Admin"
admin.site.index_title = "FAAZO Management Portal"

# ============================================================
# URL Patterns
# ============================================================
urlpatterns = [
    # ── Django Admin ────────────────────────────────────────
    path("admin/", admin.site.urls),
    # ── OpenAPI / Swagger Documentation ─────────────────────
    # Schema (raw OpenAPI JSON)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    # Swagger UI (interactive)
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    # ReDoc UI (alternative read-only view)
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
    # ── API v1 ──────────────────────────────────────────────
    path(
        "api/v1/",
        include(
            [
                # Phase 1/2 – Health check
                path("", include("apps.common.urls")),
                # Admin Dashboard Analytics
                path("admin/dashboard/", include("apps.common.dashboard_urls")),
                # Admin Enterprise Reports & Business Intelligence
                path("admin/reports/", include("apps.common.reports_urls")),
                # Phase 3 – Authentication (v1 - legacy, preserved)
                path("auth/", include("apps.authentication.urls")),
                # Phase 5 – Enterprise Authentication API v2
                path("auth/v2/", include("apps.authentication.v2_urls")),
                # Phase 3 – Users (Profile + Addresses)
                path("users/", include("apps.users.urls")),
                # Phase 3 – Dealer
                path("dealer/", include("apps.dealer.urls")),
                # Phase 6A – Pricing & Inventory (Include before products to avoid slug collisions)
                path("",            include("apps.pricing.urls")),
                path("",            include("apps.inventory.urls")),
                # Phase 5B – Catalogue (Brands / Categories / Products)
                path("",            include("apps.brands.urls")),
                path("",            include("apps.categories.urls")),
                path("",            include("apps.products.urls")),
                # Phase 5B – Homepage CMS
                path("",            include("apps.homepage.urls")),
                path("combos/",     include("apps.combos.urls")),
                path("solutions/",  include("apps.solutions.urls")),
                # Phase 8+ – Cart & Wishlist
                path("cart/", include("apps.cart.urls")),
                path("wishlist/", include("apps.wishlist.urls")),
                # Phase 9+ – Checkout
                path("checkout/", include("apps.checkout.urls")),
                # Phase 10+ – Orders
                path("orders/", include("apps.orders.urls")),
                # Phase 11 – Payments
                path("payments/", include("apps.payments.urls")),
                # Phase 11+ – Warranty
                path("warranty/", include("apps.warranty.urls")),
                # Phase 12+ – Support
                path("support/", include("apps.support.urls")),
                # Phase 13+ – Notifications
                path("notifications/", include("apps.notifications.urls")),
                # Best Sellers Module
                path("bestsellers/", include("apps.bestsellers.urls")),
                # Product Reviews & Ratings
                path("", include("apps.reviews.urls")),
                # Phase 13+ – Shipping & Fulfillment
                path("", include("apps.shipping.urls")),
                # Phase 4 – Returns & Refunds
                path("", include("apps.returns.urls")),
                # Blog & Content Management CMS
                path("blog/", include("apps.blog.urls")),
                # Google Analytics Integration
                path("analytics/", include("apps.analytics.urls")),
            ]
        ),
    ),
]

# ============================================================
# Development – Serve media and static files locally
# ============================================================
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

    # Django Debug Toolbar
    try:
        import debug_toolbar

        urlpatterns = [
            path("__debug__/", include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        pass
