"""
FAAZO – Admin Dashboard URL Patterns
Routes for analytics and real-time dashboard data.
"""

from django.urls import path
from .dashboard_views import (
    DashboardOverviewView,
    DashboardRevenueView,
    DashboardOrdersView,
    DashboardCustomersView,
    DashboardProductsView,
    DashboardDealersView,
    DashboardInventoryView,
    DashboardPaymentsView,
    DashboardSearchView,
)

urlpatterns = [
    path("overview/", DashboardOverviewView.as_view(), name="admin-dashboard-overview"),
    path("revenue/", DashboardRevenueView.as_view(), name="admin-dashboard-revenue"),
    path("orders/", DashboardOrdersView.as_view(), name="admin-dashboard-orders"),
    path("customers/", DashboardCustomersView.as_view(), name="admin-dashboard-customers"),
    path("products/", DashboardProductsView.as_view(), name="admin-dashboard-products"),
    path("dealers/", DashboardDealersView.as_view(), name="admin-dashboard-dealers"),
    path("inventory/", DashboardInventoryView.as_view(), name="admin-dashboard-inventory"),
    path("payments/", DashboardPaymentsView.as_view(), name="admin-dashboard-payments"),
    path("search/", DashboardSearchView.as_view(), name="admin-dashboard-search"),
]
