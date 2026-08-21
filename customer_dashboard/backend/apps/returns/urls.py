"""
FAAZO – Return Module URL Routing Configuration
"""

from django.urls import path
from apps.returns.views.customer_views import (
    CustomerReturnEligibilityView,
    CustomerReturnListCreateView,
    CustomerReturnDetailView,
    CustomerReturnCancelView,
)
from apps.returns.views.admin_views import (
    AdminReturnListFilterView,
    AdminReturnDetailView,
    AdminReturnApproveView,
    AdminReturnRejectView,
    AdminReturnSchedulePickupView,
    AdminReturnReceiveView,
    AdminReturnQCView,
    AdminReturnApproveRefundView,
    AdminReturnApproveReplacementView,
    AdminRefundRetryView,
)

app_name = "returns"

urlpatterns = [
    # ── Customer Endpoints ──────────────────────────────────────────────────
    path("returns/eligibility/", CustomerReturnEligibilityView.as_view(), name="customer-return-eligibility"),
    path("returns/", CustomerReturnListCreateView.as_view(), name="customer-return-list-create"),
    path("returns/<uuid:pk>/", CustomerReturnDetailView.as_view(), name="customer-return-detail"),
    path("returns/<uuid:pk>/cancel/", CustomerReturnCancelView.as_view(), name="customer-return-cancel"),

    # ── Admin Endpoints ─────────────────────────────────────────────────────
    path("admin/returns/", AdminReturnListFilterView.as_view(), name="admin-return-list"),
    path("admin/returns/<uuid:pk>/", AdminReturnDetailView.as_view(), name="admin-return-detail"),
    path("admin/returns/<uuid:pk>/approve/", AdminReturnApproveView.as_view(), name="admin-return-approve"),
    path("admin/returns/<uuid:pk>/reject/", AdminReturnRejectView.as_view(), name="admin-return-reject"),
    path("admin/returns/<uuid:pk>/schedule-pickup/", AdminReturnSchedulePickupView.as_view(), name="admin-return-schedule-pickup"),
    path("admin/returns/<uuid:pk>/receive/", AdminReturnReceiveView.as_view(), name="admin-return-receive"),
    path("admin/returns/<uuid:pk>/qc/", AdminReturnQCView.as_view(), name="admin-return-qc"),
    path("admin/returns/<uuid:pk>/approve-refund/", AdminReturnApproveRefundView.as_view(), name="admin-return-approve-refund"),
    path("admin/returns/<uuid:pk>/approve-replacement/", AdminReturnApproveReplacementView.as_view(), name="admin-return-approve-replacement"),
    path("admin/refunds/<uuid:pk>/retry/", AdminRefundRetryView.as_view(), name="admin-refund-retry"),
]
