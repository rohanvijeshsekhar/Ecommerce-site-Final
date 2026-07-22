"""
FAAZO – Enterprise Reports & Business Intelligence API Views
Provides dedicated REST API endpoints for each analytics report section.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from apps.common.responses import success_response, error_response
from apps.common.reports_services import ReportsAnalyticsService


class IsAdminUserPermission(permissions.BasePermission):
    """Allows access to superusers, staff, or users with role='admin'."""
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
            return True
        role = getattr(user, 'role', None)
        role_name = getattr(role, 'name', None) or str(role)
        return role_name == 'admin'


class ReportsOverviewView(APIView):
    """GET /api/v1/admin/reports/overview/"""
    permission_classes = [IsAdminUserPermission]

    def get(self, request):
        period = request.query_params.get('period', '30d')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        date_info = ReportsAnalyticsService.parse_period(period, start_date, end_date)

        kpis = ReportsAnalyticsService.get_executive_kpis(date_info)
        revenue = ReportsAnalyticsService.get_revenue_analytics(date_info)
        products = ReportsAnalyticsService.get_product_intelligence(date_info)
        categories = ReportsAnalyticsService.get_category_analytics(date_info)
        dealers = ReportsAnalyticsService.get_dealer_analytics(date_info)
        customers = ReportsAnalyticsService.get_customer_analytics(date_info)
        inventory = ReportsAnalyticsService.get_inventory_intelligence()
        payments = ReportsAnalyticsService.get_payment_analytics(date_info)
        warranty = ReportsAnalyticsService.get_warranty_analytics()
        support = ReportsAnalyticsService.get_support_analytics()
        activities = ReportsAnalyticsService.get_recent_activities()
        insights = ReportsAnalyticsService.generate_business_insights(kpis, inventory, dealers, products)
        sales_channel = ReportsAnalyticsService.get_sales_channel_breakdown(date_info)
        weekly_heatmap = ReportsAnalyticsService.get_weekly_sales_heatmap(date_info)
        customer_geography = ReportsAnalyticsService.get_customer_geography()

        payload = {
            'date_info': {
                'period': date_info['period'],
                'start_date': date_info['start_date'].strftime('%Y-%m-%d'),
                'end_date': date_info['end_date'].strftime('%Y-%m-%d'),
                'days': date_info['days']
            },
            'kpis': kpis,
            'revenue_analytics': revenue,
            'products_intelligence': products,
            'category_analytics': categories,
            'dealer_analytics': dealers,
            'customer_analytics': customers,
            'customer_geography': customer_geography,
            'inventory_intelligence': inventory,
            'payment_analytics': payments,
            'warranty_analytics': warranty,
            'support_analytics': support,
            'sales_channel': sales_channel,
            'weekly_heatmap': weekly_heatmap,
            'recent_activities': activities,
            'business_insights': insights
        }

        return success_response(data=payload, message="Enterprise reports analytics retrieved successfully.")


class ReportsKPIsView(APIView):
    """GET /api/v1/admin/reports/kpis/"""
    permission_classes = [IsAdminUserPermission]

    def get(self, request):
        date_info = ReportsAnalyticsService.parse_period(
            request.query_params.get('period', '30d'),
            request.query_params.get('start_date'),
            request.query_params.get('end_date')
        )
        return success_response(data=ReportsAnalyticsService.get_executive_kpis(date_info))


class ReportsRevenueView(APIView):
    """GET /api/v1/admin/reports/revenue/"""
    permission_classes = [IsAdminUserPermission]

    def get(self, request):
        date_info = ReportsAnalyticsService.parse_period(
            request.query_params.get('period', '30d'),
            request.query_params.get('start_date'),
            request.query_params.get('end_date')
        )
        return success_response(data=ReportsAnalyticsService.get_revenue_analytics(date_info))


class ReportsProductsView(APIView):
    """GET /api/v1/admin/reports/products/"""
    permission_classes = [IsAdminUserPermission]

    def get(self, request):
        date_info = ReportsAnalyticsService.parse_period(
            request.query_params.get('period', '30d'),
            request.query_params.get('start_date'),
            request.query_params.get('end_date')
        )
        return success_response(data=ReportsAnalyticsService.get_product_intelligence(date_info))


class ReportsCategoriesView(APIView):
    """GET /api/v1/admin/reports/categories/"""
    permission_classes = [IsAdminUserPermission]

    def get(self, request):
        date_info = ReportsAnalyticsService.parse_period(
            request.query_params.get('period', '30d'),
            request.query_params.get('start_date'),
            request.query_params.get('end_date')
        )
        return success_response(data=ReportsAnalyticsService.get_category_analytics(date_info))


class ReportsDealersView(APIView):
    """GET /api/v1/admin/reports/dealers/"""
    permission_classes = [IsAdminUserPermission]

    def get(self, request):
        date_info = ReportsAnalyticsService.parse_period(
            request.query_params.get('period', '30d'),
            request.query_params.get('start_date'),
            request.query_params.get('end_date')
        )
        return success_response(data=ReportsAnalyticsService.get_dealer_analytics(date_info))


class ReportsCustomersView(APIView):
    """GET /api/v1/admin/reports/customers/"""
    permission_classes = [IsAdminUserPermission]

    def get(self, request):
        date_info = ReportsAnalyticsService.parse_period(
            request.query_params.get('period', '30d'),
            request.query_params.get('start_date'),
            request.query_params.get('end_date')
        )
        return success_response(data=ReportsAnalyticsService.get_customer_analytics(date_info))


class ReportsInventoryView(APIView):
    """GET /api/v1/admin/reports/inventory/"""
    permission_classes = [IsAdminUserPermission]

    def get(self, request):
        return success_response(data=ReportsAnalyticsService.get_inventory_intelligence())


class ReportsPaymentsView(APIView):
    """GET /api/v1/admin/reports/payments/"""
    permission_classes = [IsAdminUserPermission]

    def get(self, request):
        date_info = ReportsAnalyticsService.parse_period(
            request.query_params.get('period', '30d'),
            request.query_params.get('start_date'),
            request.query_params.get('end_date')
        )
        return success_response(data=ReportsAnalyticsService.get_payment_analytics(date_info))


class ReportsWarrantyView(APIView):
    """GET /api/v1/admin/reports/warranty/"""
    permission_classes = [IsAdminUserPermission]

    def get(self, request):
        return success_response(data=ReportsAnalyticsService.get_warranty_analytics())


class ReportsSupportView(APIView):
    """GET /api/v1/admin/reports/support/"""
    permission_classes = [IsAdminUserPermission]

    def get(self, request):
        return success_response(data=ReportsAnalyticsService.get_support_analytics())


class ReportsActivitiesView(APIView):
    """GET /api/v1/admin/reports/recent-activities/"""
    permission_classes = [IsAdminUserPermission]

    def get(self, request):
        return success_response(data=ReportsAnalyticsService.get_recent_activities())
