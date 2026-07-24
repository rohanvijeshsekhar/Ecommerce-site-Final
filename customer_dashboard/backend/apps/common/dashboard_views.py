"""
FAAZO – Admin Dashboard Analytics Views

Provides real-time business statistics, graphs, trend metrics,
and operational logs calculated dynamically from the production database.
"""

from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Avg, Q, F
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from apps.orders.models import Order, OrderItem, OrderStatus
from apps.users.models import User, UserRole, UserProfile
from apps.products.models import Product, ProductStatus
from apps.inventory.models import ProductInventory
from apps.categories.models import Category
from apps.dealer.models import DealerApplication, DealerStatus
from apps.payments.models import Payment, PaymentStatus
from apps.warranty.models import WarrantyRegistration, WarrantyRegistrationStatus
from apps.support.models import SupportTicket, TicketStatus


class IsAdminUserPermission(permissions.BasePermission):
    """Allows access to superusers, staff, or users with role='admin'."""
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.is_staff or user.is_superuser or user.role == UserRole.ADMIN or getattr(user, 'is_admin_user', False)


def get_date_range(period_str):
    """Helper to return start_date and previous_start_date based on period string."""
    now = timezone.now()
    today = now.date()
    
    if period_str == '30 Days' or period_str == '30d':
        days = 30
    elif period_str == '90 Days' or period_str == '90d':
        days = 90
    elif period_str == '1 Year' or period_str == '1y' or period_str == '365d':
        days = 365
    else: # Default 7 Days
        days = 7

    start_date = now - timedelta(days=days)
    prev_start_date = start_date - timedelta(days=days)
    return start_date, prev_start_date, days, now


class DashboardOverviewView(APIView):
    """
    Consolidated Dashboard Overview API.
    GET /api/v1/admin/dashboard/overview/?period=7d|30d|90d|1y
    """
    permission_classes = [IsAdminUserPermission]

    def get(self, request):
        period_param = request.query_params.get('period', '7 Days')
        start_date, prev_start_date, days_count, now = get_date_range(period_param)
        
        # Valid Paid Orders filter (exclude cancelled, failed, refunded)
        valid_orders_q = Q(status__in=[
            OrderStatus.PROCESSING,
            OrderStatus.PACKED,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED
        ])
        
        # ---------------------------------------------------------------------
        # 1. KPI Aggregations
        # ---------------------------------------------------------------------
        # Revenue
        current_rev_res = Order.objects.filter(valid_orders_q, created_at__gte=start_date).aggregate(total=Sum('total_amount'))
        current_rev = float(current_rev_res['total'] or 0)

        prev_rev_res = Order.objects.filter(valid_orders_q, created_at__gte=prev_start_date, created_at__lt=start_date).aggregate(total=Sum('total_amount'))
        prev_rev = float(prev_rev_res['total'] or 0)

        rev_growth = round(((current_rev - prev_rev) / prev_rev * 100), 2) if prev_rev > 0 else (100.0 if current_rev > 0 else 0.0)

        total_alltime_rev_res = Order.objects.filter(valid_orders_q).aggregate(total=Sum('total_amount'))
        total_alltime_rev = float(total_alltime_rev_res['total'] or 0)

        # Orders Count
        current_orders_count = Order.objects.filter(created_at__gte=start_date).count()
        prev_orders_count = Order.objects.filter(created_at__gte=prev_start_date, created_at__lt=start_date).count()
        orders_growth = round(((current_orders_count - prev_orders_count) / prev_orders_count * 100), 2) if prev_orders_count > 0 else (100.0 if current_orders_count > 0 else 0.0)

        # Customers Count
        total_customers = User.objects.filter(role=UserRole.CUSTOMER, is_active=True).count()
        new_customers_period = User.objects.filter(role=UserRole.CUSTOMER, created_at__gte=start_date).count()
        
        # Products Count
        total_products = Product.objects.filter(is_deleted=False).count()
        active_products = Product.objects.filter(is_deleted=False, status=ProductStatus.ACTIVE).count()

        # ---------------------------------------------------------------------
        # 2. Analytics Chart Data (Date Buckets)
        # ---------------------------------------------------------------------
        chart_labels = []
        chart_dates = []
        revenue_values = []
        orders_values = []

        if days_count == 7:
            for i in range(6, -1, -1):
                day = now - timedelta(days=i)
                day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)

                chart_labels.append(day.strftime('%a'))
                chart_dates.append(day.strftime('%b %d'))

                r_val = Order.objects.filter(valid_orders_q, created_at__range=(day_start, day_end)).aggregate(t=Sum('total_amount'))['t'] or 0
                o_val = Order.objects.filter(created_at__range=(day_start, day_end)).count()

                revenue_values.append(float(r_val))
                orders_values.append(o_val)
        elif days_count == 30:
            for w in range(3, -1, -1):
                w_start = now - timedelta(days=(w+1)*7)
                w_end = now - timedelta(days=w*7)

                chart_labels.append(f'W{4-w}')
                chart_dates.append(f"{w_start.strftime('%b %d')} - {w_end.strftime('%b %d')}")

                r_val = Order.objects.filter(valid_orders_q, created_at__range=(w_start, w_end)).aggregate(t=Sum('total_amount'))['t'] or 0
                o_val = Order.objects.filter(created_at__range=(w_start, w_end)).count()

                revenue_values.append(float(r_val))
                orders_values.append(o_val)
        elif days_count == 90:
            for m in range(2, -1, -1):
                m_date = now - timedelta(days=m*30)
                m_start = m_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                next_m = (m_start + timedelta(days=32)).replace(day=1)
                m_end = next_m - timedelta(microseconds=1)

                chart_labels.append(m_start.strftime('%b'))
                chart_dates.append(m_start.strftime('%B %Y'))

                r_val = Order.objects.filter(valid_orders_q, created_at__range=(m_start, m_end)).aggregate(t=Sum('total_amount'))['t'] or 0
                o_val = Order.objects.filter(created_at__range=(m_start, m_end)).count()

                revenue_values.append(float(r_val))
                orders_values.append(o_val)
        else: # 1 Year
            for q in range(3, -1, -1):
                q_start = now - timedelta(days=(q+1)*90)
                q_end = now - timedelta(days=q*90)

                chart_labels.append(f'Q{4-q}')
                chart_dates.append(f"Q{4-q} {q_start.strftime('%Y')}")

                r_val = Order.objects.filter(valid_orders_q, created_at__range=(q_start, q_end)).aggregate(t=Sum('total_amount'))['t'] or 0
                o_val = Order.objects.filter(created_at__range=(q_start, q_end)).count()

                revenue_values.append(float(r_val))
                orders_values.append(o_val)

        # ---------------------------------------------------------------------
        # 3. Inventory Breakdown
        # ---------------------------------------------------------------------
        all_products = Product.objects.filter(is_deleted=False).select_related('inventory')
        in_stock_cnt = 0
        low_stock_cnt = 0
        out_stock_cnt = 0
        low_stock_list = []

        for prod in all_products:
            inv = getattr(prod, 'inventory', None)
            if inv:
                avail = inv.available_stock
                thresh = inv.low_stock_threshold
                curr = inv.current_stock
            else:
                avail = 0
                thresh = 5
                curr = 0

            if avail <= 0:
                out_stock_cnt += 1
            elif avail <= thresh:
                low_stock_cnt += 1
            else:
                in_stock_cnt += 1

            if avail <= thresh:
                low_stock_list.append({
                    'id': str(prod.id),
                    'name': prod.name,
                    'sku': prod.sku,
                    'current_stock': curr,
                    'available_stock': avail,
                    'low_stock_threshold': thresh,
                    'status': 'Out of stock' if avail <= 0 else 'Low stock'
                })

        total_inv_count = in_stock_cnt + low_stock_cnt + out_stock_cnt or 1
        in_stock_pct = round((in_stock_cnt / total_inv_count) * 100, 1)
        low_stock_pct = round((low_stock_cnt / total_inv_count) * 100, 1)
        out_stock_pct = round((out_stock_cnt / total_inv_count) * 100, 1)

        # ---------------------------------------------------------------------
        # 4. Recent Orders Table Data
        # ---------------------------------------------------------------------
        recent_orders_qs = Order.objects.select_related('user', 'shipping_address').order_by('-created_at')[:5]
        recent_orders_data = []
        for ord_obj in recent_orders_qs:
            cust_name = ord_obj.user.get_full_name() or ord_obj.user.email
            initials = "".join([part[0].upper() for part in cust_name.split()[:2]]) or "CU"
            status_display = ord_obj.get_status_display()

            recent_orders_data.append({
                'id': ord_obj.order_number or f"ORD-{ord_obj.id}",
                'raw_id': str(ord_obj.id),
                'customer': cust_name,
                'avatar': initials,
                'amount': f"₹{float(ord_obj.total_amount):,.2f}",
                'raw_amount': float(ord_obj.total_amount),
                'status': status_display,
                'raw_status': ord_obj.status,
                'date': ord_obj.created_at.strftime('%b %d, %Y')
            })

        # ---------------------------------------------------------------------
        # 5. Operational Logs / Activity
        # ---------------------------------------------------------------------
        pending_orders_cnt = Order.objects.filter(status=OrderStatus.PENDING_PAYMENT).count()
        pending_dealer_cnt = DealerApplication.objects.filter(status=DealerStatus.PENDING).count()
        open_tickets_cnt = SupportTicket.objects.filter(status=TicketStatus.OPEN).count()
        active_warranties_cnt = WarrantyRegistration.objects.filter(warranty_status=WarrantyRegistrationStatus.ACTIVE).count()

        recent_activities = []
        for ord_act in Order.objects.order_by('-created_at')[:2]:
            recent_activities.append({
                'type': 'product',
                'title': f"Order {ord_act.order_number or ord_act.id}",
                'desc': f"Order for ₹{float(ord_act.total_amount):,.2f} placed by {ord_act.user.get_full_name() or ord_act.user.email}",
                'time': ord_act.created_at.strftime('%b %d, %H:%M')
            })
        for dealer_act in DealerApplication.objects.order_by('-created_at')[:2]:
            recent_activities.append({
                'type': 'dealer',
                'title': 'Dealer Application',
                'desc': f"Application from {dealer_act.company_name} ({dealer_act.get_status_display()})",
                'time': dealer_act.created_at.strftime('%b %d, %H:%M')
            })

        # ---------------------------------------------------------------------
        # 6. Action Center / Pending Admin Tasks
        # ---------------------------------------------------------------------
        action_items = []
        for d_app in DealerApplication.objects.filter(status=DealerStatus.PENDING).order_by('-created_at')[:3]:
            action_items.append({
                'id': str(d_app.id),
                'title': f"Dealer App: {d_app.company_name}",
                'subtitle': f"Submitted by {d_app.user.get_full_name() or d_app.user.email}",
                'tag': 'Dealer Approval',
                'type': 'dealer',
                'status_color': 'bg-amber-50 text-amber-700 border-amber-200/80',
                'link': '/admin/dealers',
                'action_label': 'Review App',
                'time': d_app.created_at.strftime('%b %d')
            })
        for p_ord in Order.objects.filter(status=OrderStatus.PROCESSING).order_by('-created_at')[:3]:
            action_items.append({
                'id': str(p_ord.id),
                'title': f"Order {p_ord.order_number or p_ord.id}",
                'subtitle': f"₹{float(p_ord.total_amount):,.2f} • Awaiting fulfillment",
                'tag': 'Fulfillment',
                'type': 'order',
                'status_color': 'bg-sky-50 text-sky-700 border-sky-200/80',
                'link': '/admin/orders',
                'action_label': 'Fulfill Order',
                'time': p_ord.created_at.strftime('%b %d')
            })
        for ticket in SupportTicket.objects.filter(status=TicketStatus.OPEN).order_by('-created_at')[:3]:
            action_items.append({
                'id': str(ticket.id),
                'title': f"Support #{ticket.ticket_number}",
                'subtitle': ticket.subject or 'Customer inquiry',
                'tag': 'Support',
                'type': 'support',
                'status_color': 'bg-rose-50 text-rose-700 border-rose-200/80',
                'link': '/admin/support',
                'action_label': 'Resolve',
                'time': ticket.created_at.strftime('%b %d')
            })

        # ---------------------------------------------------------------------
        # 7. Top Selling Products / Best Sellers
        # ---------------------------------------------------------------------
        top_products_data = []
        top_items_qs = OrderItem.objects.values(
            'product__id', 'product__name', 'product__sku', 'product__category__name'
        ).annotate(
            total_qty=Sum('quantity'),
            total_rev=Sum(F('quantity') * F('price'))
        ).order_by('-total_rev')[:4]

        if top_items_qs.exists():
            for item in top_items_qs:
                prod_obj = Product.objects.filter(id=item['product__id']).first()
                inv_obj = getattr(prod_obj, 'inventory', None) if prod_obj else None
                avail = inv_obj.available_stock if inv_obj else 0
                top_products_data.append({
                    'id': str(item['product__id']),
                    'name': item['product__name'],
                    'sku': item['product__sku'] or 'SKU-001',
                    'category': item['product__category__name'] or 'Dental Equipment',
                    'units_sold': item['total_qty'],
                    'revenue': f"₹{float(item['total_rev']):,.2f}",
                    'stock': avail,
                    'stock_status': 'In Stock' if avail > 5 else ('Low Stock' if avail > 0 else 'Out of Stock')
                })
        else:
            for prod_obj in Product.objects.filter(is_deleted=False).select_related('inventory', 'category')[:4]:
                inv_obj = getattr(prod_obj, 'inventory', None)
                avail = inv_obj.available_stock if inv_obj else 0
                items_qs = OrderItem.objects.filter(product=prod_obj)
                units_cnt = items_qs.aggregate(t=Sum('quantity'))['t'] or 0
                rev_calc = items_qs.aggregate(t=Sum(F('quantity') * F('price')))['t'] or 0

                top_products_data.append({
                    'id': str(prod_obj.id),
                    'name': prod_obj.name,
                    'sku': prod_obj.sku or f"SKU-{str(prod_obj.id)[:6]}",
                    'category': prod_obj.category.name if prod_obj.category else 'Dental Equipment',
                    'units_sold': units_cnt,
                    'revenue': f"₹{float(rev_calc):,.2f}",
                    'stock': avail,
                    'stock_status': 'In Stock' if avail > 5 else ('Low Stock' if avail > 0 else 'Out of Stock')
                })

        # ---------------------------------------------------------------------
        # 8. Dealer Applications Hub
        # ---------------------------------------------------------------------
        recent_dealers_data = []
        for dealer_obj in DealerApplication.objects.select_related('user').order_by('-created_at')[:4]:
            applicant_name = dealer_obj.user.get_full_name() or dealer_obj.user.email
            initials = "".join([part[0].upper() for part in applicant_name.split()[:2]]) or "DL"
            recent_dealers_data.append({
                'id': str(dealer_obj.id),
                'company_name': dealer_obj.company_name,
                'applicant_name': applicant_name,
                'avatar': initials,
                'status': dealer_obj.get_status_display(),
                'raw_status': dealer_obj.status,
                'date': dealer_obj.created_at.strftime('%b %d, %Y')
            })

        response_payload = {
            'period': period_param,
            'kpis': {
                'revenue': {
                    'value': f"₹{current_rev:,.2f}",
                    'raw_value': current_rev,
                    'total_alltime': f"₹{total_alltime_rev:,.2f}",
                    'trend': f"{'+' if rev_growth >= 0 else ''}{rev_growth:.2f}%",
                    'trend_type': 'up' if rev_growth >= 0 else 'down',
                    'desc': 'vs previous period'
                },
                'orders': {
                    'value': str(current_orders_count),
                    'raw_value': current_orders_count,
                    'pending_orders': pending_orders_cnt,
                    'trend': f"{'+' if orders_growth >= 0 else ''}{orders_growth:.2f}%",
                    'trend_type': 'up' if orders_growth >= 0 else 'down',
                    'desc': 'vs previous period'
                },
                'customers': {
                    'value': str(total_customers),
                    'raw_value': total_customers,
                    'new_period': new_customers_period,
                    'desc': 'active registered accounts'
                },
                'products': {
                    'value': str(total_products),
                    'raw_value': total_products,
                    'active': active_products,
                    'desc': 'active catalog listings'
                }
            },
            'chart': {
                'Revenue': {
                    'labels': chart_labels,
                    'values': revenue_values,
                    'dates': chart_dates
                },
                'Orders': {
                    'labels': chart_labels,
                    'values': orders_values,
                    'dates': chart_dates
                }
            },
            'inventory_health': {
                'in_stock': {'count': in_stock_cnt, 'pct': in_stock_pct},
                'low_stock': {'count': low_stock_cnt, 'pct': low_stock_pct},
                'out_of_stock': {'count': out_stock_cnt, 'pct': out_stock_pct},
                'items': low_stock_list
            },
            'recent_orders': recent_orders_data,
            'activities': recent_activities,
            'action_items': action_items,
            'top_products': top_products_data,
            'recent_dealers': recent_dealers_data,
            'summary_counts': {
                'pending_orders': pending_orders_cnt,
                'pending_dealers': pending_dealer_cnt,
                'open_tickets': open_tickets_cnt,
                'active_warranties': active_warranties_cnt,
                'stock_alerts': low_stock_cnt + out_stock_cnt
            }
        }

        return Response({
            'success': True,
            'data': response_payload
        })


class DashboardRevenueView(APIView):
    permission_classes = [IsAdminUserPermission]
    def get(self, request):
        valid_orders_q = Q(status__in=[OrderStatus.PROCESSING, OrderStatus.PACKED, OrderStatus.SHIPPED, OrderStatus.DELIVERED])
        total_rev = Order.objects.filter(valid_orders_q).aggregate(t=Sum('total_amount'))['t'] or 0
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_rev = Order.objects.filter(valid_orders_q, created_at__gte=today_start).aggregate(t=Sum('total_amount'))['t'] or 0
        month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_rev = Order.objects.filter(valid_orders_q, created_at__gte=month_start).aggregate(t=Sum('total_amount'))['t'] or 0

        return Response({
            'success': True,
            'data': {
                'total_revenue': float(total_rev),
                'today_revenue': float(today_rev),
                'monthly_revenue': float(month_rev)
            }
        })


class DashboardOrdersView(APIView):
    permission_classes = [IsAdminUserPermission]
    def get(self, request):
        status_counts = dict(Order.objects.values('status').annotate(count=Count('id')).values_list('status', 'count'))
        total_orders = Order.objects.count()
        return Response({
            'success': True,
            'data': {
                'total_orders': total_orders,
                'status_counts': status_counts
            }
        })


class DashboardCustomersView(APIView):
    permission_classes = [IsAdminUserPermission]
    def get(self, request):
        total_cust = User.objects.filter(role=UserRole.CUSTOMER).count()
        active_cust = User.objects.filter(role=UserRole.CUSTOMER, is_active=True).count()
        returning_cust = User.objects.filter(role=UserRole.CUSTOMER).annotate(ord_cnt=Count('orders')).filter(ord_cnt__gt=1).count()
        avg_orders = Order.objects.count() / (total_cust or 1)
        return Response({
            'success': True,
            'data': {
                'total_customers': total_cust,
                'active_customers': active_cust,
                'returning_customers': returning_cust,
                'avg_orders_per_customer': round(avg_orders, 2)
            }
        })


class DashboardProductsView(APIView):
    permission_classes = [IsAdminUserPermission]
    def get(self, request):
        total_prod = Product.objects.filter(is_deleted=False).count()
        active_prod = Product.objects.filter(is_deleted=False, status=ProductStatus.ACTIVE).count()
        
        best_sellers_qs = OrderItem.objects.values('product__id', 'product__name', 'product__sku') \
            .annotate(units_sold=Sum('quantity'), revenue=Sum(F('quantity') * F('price'))) \
            .order_by('-units_sold')[:5]

        best_sellers = []
        for bs in best_sellers_qs:
            best_sellers.append({
                'product_id': str(bs['product__id']),
                'name': bs['product__name'],
                'sku': bs['product__sku'],
                'units_sold': bs['units_sold'],
                'revenue': float(bs['revenue'] or 0)
            })

        return Response({
            'success': True,
            'data': {
                'total_products': total_prod,
                'active_products': active_prod,
                'best_sellers': best_sellers
            }
        })


class DashboardDealersView(APIView):
    permission_classes = [IsAdminUserPermission]
    def get(self, request):
        total_dealers = User.objects.filter(role=UserRole.DEALER).count()
        pending_apps = DealerApplication.objects.filter(status=DealerStatus.PENDING).count()
        dealer_orders_cnt = Order.objects.filter(user__role=UserRole.DEALER).count()
        dealer_rev = Order.objects.filter(user__role=UserRole.DEALER).aggregate(t=Sum('total_amount'))['t'] or 0

        return Response({
            'success': True,
            'data': {
                'total_dealers': total_dealers,
                'pending_applications': pending_apps,
                'dealer_orders': dealer_orders_cnt,
                'dealer_revenue': float(dealer_rev)
            }
        })


class DashboardInventoryView(APIView):
    permission_classes = [IsAdminUserPermission]
    def get(self, request):
        inventories = ProductInventory.objects.all()
        in_stock = 0
        low_stock = 0
        out_of_stock = 0
        total_units = 0

        for inv in inventories:
            avail = inv.available_stock
            total_units += inv.current_stock
            if avail <= 0:
                out_of_stock += 1
            elif avail <= inv.low_stock_threshold:
                low_stock += 1
            else:
                in_stock += 1

        return Response({
            'success': True,
            'data': {
                'total_items': len(inventories),
                'total_units': total_units,
                'in_stock': in_stock,
                'low_stock': low_stock,
                'out_of_stock': out_of_stock
            }
        })


class DashboardPaymentsView(APIView):
    permission_classes = [IsAdminUserPermission]
    def get(self, request):
        captured = Payment.objects.filter(status=PaymentStatus.CAPTURED).count()
        failed = Payment.objects.filter(status=PaymentStatus.FAILED).count()
        created = Payment.objects.filter(status=PaymentStatus.CREATED).count()
        cod_orders = Order.objects.filter(payment_method='cod').count()
        online_orders = Order.objects.exclude(payment_method='cod').count()

        return Response({
            'success': True,
            'data': {
                'successful_payments': captured,
                'failed_payments': failed,
                'pending_payments': created,
                'cod_orders': cod_orders,
                'online_orders': online_orders
            }
        })
