import csv
from decimal import Decimal
from django.db import transaction
from django.db.models import Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from apps.common.responses import success_response, error_response
from apps.common.permissions import IsAdmin
from apps.inventory.models import ProductInventory
from .models import Order, OrderItem, OrderStatus, OrderStatusHistory
from .serializers import OrderSerializer

class OrderListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        orders = Order.objects.filter(user=user).prefetch_related(
            'items__product__images', 
            'shipping_address',
            'status_history__changed_by'
        )

        # Filters
        status_filter = request.query_params.get('status')
        if status_filter and status_filter != 'all':
            orders = orders.filter(status=status_filter)

        search_query = request.query_params.get('search')
        if search_query:
            orders = orders.filter(
                Q(order_number__icontains=search_query) |
                Q(items__product__name__icontains=search_query)
            ).distinct()

        # Simple manual pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        total = orders.count()
        
        start = (page - 1) * page_size
        end = start + page_size
        orders_page = orders[start:end]

        serializer = OrderSerializer(orders_page, many=True)
        
        pagination_data = {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size
        }
        
        return success_response(
            data=serializer.data,
            message="Orders retrieved successfully.",
            status_code=status.HTTP_200_OK,
            meta={"pagination": pagination_data}
        )


class OrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            order = Order.objects.prefetch_related(
                'items__product__images', 
                'shipping_address',
                'status_history__changed_by'
            ).get(pk=pk, user=request.user)
        except Order.DoesNotExist:
            return error_response("Order not found.", status_code=status.HTTP_404_NOT_FOUND)

        serializer = OrderSerializer(order)
        return success_response(data=serializer.data)


class OrderCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        cancellation_reason = request.data.get("reason", "").strip()
        if not cancellation_reason:
            return error_response("Cancellation reason is required.", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                order = Order.objects.select_for_update().get(pk=pk, user=request.user)

                # Check if order can be cancelled (before shipment)
                if order.status in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
                    return error_response(
                        f"Cannot cancel order because it has already been {order.status}.",
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
                
                if order.status == OrderStatus.CANCELLED:
                    return error_response("Order is already cancelled.", status_code=status.HTTP_400_BAD_REQUEST)

                old_status = order.status

                # Update order fields
                order.status = OrderStatus.CANCELLED
                order.cancellation_reason = cancellation_reason
                order.cancelled_at = timezone.now()
                order.cancelled_by = request.user
                order.save()

                # Record status history audit log
                OrderStatusHistory.objects.create(
                    order=order,
                    status=OrderStatus.CANCELLED,
                    changed_by=request.user,
                    notes=f"Cancelled by customer. Reason: {cancellation_reason}"
                )

                # Release inventory reservations
                if old_status in [OrderStatus.PROCESSING, OrderStatus.PACKED, OrderStatus.PENDING_PAYMENT]:
                    for item in order.items.all():
                        inventory = getattr(item.product, "inventory", None)
                        if inventory:
                            inventory.reserved_stock = max(0, inventory.reserved_stock - item.quantity)
                            inventory.save()

                serializer = OrderSerializer(order)
                return success_response(
                    data=serializer.data,
                    message="Order cancelled successfully, inventory reservation released."
                )

        except Order.DoesNotExist:
            return error_response("Order not found.", status_code=status.HTTP_404_NOT_FOUND)


# ── ADMIN OPERATIONS ──

class AdminOrderListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        orders = Order.objects.prefetch_related(
            'items__product__images', 
            'shipping_address',
            'status_history__changed_by',
            'user'
        )

        # Filters
        status_filter = request.query_params.get('status')
        if status_filter and status_filter != 'all':
            orders = orders.filter(status=status_filter)

        search_query = request.query_params.get('search')
        if search_query:
            orders = orders.filter(
                Q(order_number__icontains=search_query) |
                Q(user__full_name__icontains=search_query) |
                Q(user__email__icontains=search_query) |
                Q(items__product__name__icontains=search_query)
            ).distinct()

        # Date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            orders = orders.filter(created_at__date__gte=start_date)
        if end_date:
            orders = orders.filter(created_at__date__lte=end_date)

        # Stats summary calculations
        stats = {
            "total_orders": orders.count(),
            "pending_payment": orders.filter(status=OrderStatus.PENDING_PAYMENT).count(),
            "processing": orders.filter(status=OrderStatus.PROCESSING).count(),
            "packed": orders.filter(status=OrderStatus.PACKED).count(),
            "shipped": orders.filter(status=OrderStatus.SHIPPED).count(),
            "delivered": orders.filter(status=OrderStatus.DELIVERED).count(),
            "cancelled": orders.filter(status=OrderStatus.CANCELLED).count(),
            "total_sales": float(orders.exclude(status=OrderStatus.CANCELLED).aggregate(total=Sum('total_amount'))['total'] or 0.0)
        }

        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        total = orders.count()

        start = (page - 1) * page_size
        end = start + page_size
        orders_page = orders[start:end]

        serializer = OrderSerializer(orders_page, many=True)

        pagination_data = {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size
        }

        return success_response(
            data=serializer.data,
            message="Admin orders list retrieved.",
            meta={"stats": stats, "pagination": pagination_data}
        )


class AdminOrderDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, pk):
        try:
            order = Order.objects.prefetch_related(
                'items__product__images', 
                'shipping_address',
                'status_history__changed_by',
                'user'
            ).get(pk=pk)
        except Order.DoesNotExist:
            return error_response("Order not found.", status_code=status.HTTP_404_NOT_FOUND)

        serializer = OrderSerializer(order)
        return success_response(data=serializer.data)

    def patch(self, request, pk):
        """Update Order Status with forward-only rule checks & inventory sync."""
        new_status = request.data.get("status")
        notes = request.data.get("notes", "").strip()
        tracking_number = request.data.get("tracking_number")
        shipping_carrier = request.data.get("shipping_carrier")
        estimated_delivery_date = request.data.get("estimated_delivery_date")

        if not new_status:
            return error_response("status is a required field.", status_code=status.HTTP_400_BAD_REQUEST)

        if new_status not in OrderStatus.values:
            return error_response(f"Invalid status: {new_status}.", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                order = Order.objects.select_for_update().get(pk=pk)
                old_status = order.status

                if old_status == new_status:
                    # Update tracking or estimated date details without status changes
                    if tracking_number is not None:
                        order.tracking_number = tracking_number
                    if shipping_carrier is not None:
                        order.shipping_carrier = shipping_carrier
                    if estimated_delivery_date is not None:
                        order.estimated_delivery_date = estimated_delivery_date
                    order.save()
                    return success_response(data=OrderSerializer(order).data, message="Order details updated.")

                # Forward-only status validation
                status_hierarchy = {
                    OrderStatus.PENDING_PAYMENT: 0,
                    OrderStatus.PROCESSING: 1,
                    OrderStatus.PACKED: 2,
                    OrderStatus.SHIPPED: 3,
                    OrderStatus.DELIVERED: 4,
                    OrderStatus.CANCELLED: 5,
                }

                # Disallow reversing status flow (except cancellation to/from terminal states)
                if old_status == OrderStatus.CANCELLED or old_status == OrderStatus.DELIVERED:
                    return error_response(
                        f"Cannot modify order status in final state: '{old_status}'.",
                        status_code=status.HTTP_400_BAD_REQUEST
                    )

                if new_status != OrderStatus.CANCELLED:
                    if status_hierarchy[new_status] <= status_hierarchy[old_status]:
                        return error_response(
                            f"Forward-only transition rule failure: Cannot change status from {old_status} to {new_status}.",
                            status_code=status.HTTP_400_BAD_REQUEST
                        )

                # Set timing fields
                if new_status == OrderStatus.PACKED:
                    order.packed_at = timezone.now()
                elif new_status == OrderStatus.SHIPPED:
                    order.shipped_at = timezone.now()
                    if tracking_number:
                        order.tracking_number = tracking_number
                    if shipping_carrier:
                        order.shipping_carrier = shipping_carrier
                elif new_status == OrderStatus.DELIVERED:
                    order.delivered_at = timezone.now()
                elif new_status == OrderStatus.CANCELLED:
                    order.cancelled_at = timezone.now()
                    order.cancelled_by = request.user
                    order.cancellation_reason = notes or "Cancelled by admin"

                order.status = new_status
                order.save()

                if new_status == OrderStatus.DELIVERED:
                    from apps.warranty.services import create_warranty_registrations
                    create_warranty_registrations(order)

                # Audit History Log
                OrderStatusHistory.objects.create(
                    order=order,
                    status=new_status,
                    changed_by=request.user,
                    notes=notes or f"Status changed from {old_status} to {new_status}."
                )

                # Inventory Synchronization on Transitions
                # A: Transition to Shipped -> Deduct from physical stock and release reserved stock
                if new_status == OrderStatus.SHIPPED and old_status in [OrderStatus.PROCESSING, OrderStatus.PACKED]:
                    for item in order.items.all():
                        inventory = getattr(item.product, "inventory", None)
                        if inventory:
                            inventory.current_stock = max(0, inventory.current_stock - item.quantity)
                            inventory.reserved_stock = max(0, inventory.reserved_stock - item.quantity)
                            inventory.save()

                # B: Transition to Cancelled -> Release reserved stock back to available pool
                elif new_status == OrderStatus.CANCELLED and old_status in [OrderStatus.PROCESSING, OrderStatus.PACKED, OrderStatus.PENDING_PAYMENT]:
                    for item in order.items.all():
                        inventory = getattr(item.product, "inventory", None)
                        if inventory:
                            inventory.reserved_stock = max(0, inventory.reserved_stock - item.quantity)
                            inventory.save()

                return success_response(
                    data=OrderSerializer(order).data,
                    message=f"Order status updated from {old_status} to {new_status}."
                )

        except Order.DoesNotExist:
            return error_response("Order not found.", status_code=status.HTTP_404_NOT_FOUND)


class AdminOrderExportView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        orders = Order.objects.select_related('user', 'shipping_address').prefetch_related('items__product').all()

        # Simple CSV format response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="faazo_orders_export_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Order ID', 'Order Number', 'Invoice Number', 'Date', 'Customer Name', 
            'Customer Email', 'Status', 'Payment Method', 'Selling Subtotal', 
            'GST Amount', 'Shipping Fee', 'Total Amount', 'Items Count'
        ])

        for order in orders:
            writer.writerow([
                str(order.id),
                order.order_number or "",
                order.invoice_number or "",
                order.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                order.user.full_name,
                order.user.email,
                order.status,
                order.payment_method,
                order.selling_subtotal,
                order.gst_amount,
                order.shipping_fee,
                order.total_amount,
                order.items.count()
            ])

        return response
