"""
FAAZO – Shipping & Fulfillment Views

Admin endpoints:
  POST   /api/v1/shipping/admin/shipments/                → create shipment
  GET    /api/v1/shipping/admin/shipments/                → list all shipments
  GET    /api/v1/shipping/admin/shipments/<pk>/           → shipment detail
  POST   /api/v1/shipping/admin/shipments/<pk>/sync/      → sync tracking
  POST   /api/v1/shipping/admin/shipments/<pk>/schedule-pickup/ → schedule pickup
  POST   /api/v1/shipping/admin/shipments/<pk>/cancel/    → cancel shipment
  GET    /api/v1/shipping/admin/stats/                    → fulfillment stats

Customer endpoints:
  GET    /api/v1/shipping/orders/<order_pk>/shipment/     → own order tracking

Webhook endpoint (no auth):
  POST   /api/v1/shipping/webhooks/delhivery/             → Delhivery callback
"""

import logging
from django.db import transaction
from django.db.models import Q
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from apps.common.responses import success_response, error_response
from apps.common.permissions import IsAdmin
from apps.orders.models import Order, OrderStatus

from .models import Shipment, ShipmentStatus
from .serializers import ShipmentSerializer, ShipmentListSerializer
from .services import DelhiveryService, DelhiveryAPIError, DelhiveryValidationError

logger = logging.getLogger("faazo")


# ============================================================
# Admin — Create Shipment
# ============================================================

class AdminShipmentCreateView(APIView):
    """
    POST /api/v1/shipping/admin/shipments/

    Body:
      order_id (UUID): required
      weight (float): kg
      length, breadth, height (float): cm
      payment_mode (str): 'Prepaid' | 'COD'
      pickup_date (str): YYYY-MM-DD (optional)
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        order_id = request.data.get("order_id")
        if not order_id:
            return error_response("order_id is required.", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.prefetch_related("items__product", "shipping_address").get(pk=order_id)
        except Order.DoesNotExist:
            return error_response("Order not found.", status_code=status.HTTP_404_NOT_FOUND)

        # Only allow shipment creation for packed (or processing) orders
        if order.status not in [OrderStatus.PACKED, OrderStatus.PROCESSING]:
            return error_response(
                f"Cannot create shipment for order in '{order.status}' status. "
                f"Order must be in 'packed' or 'processing' status.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if hasattr(order, "shipment"):
            return error_response(
                "A shipment already exists for this order.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        package_info = {
            "weight": float(request.data.get("weight", 0.5)),
            "length": float(request.data.get("length", 10)),
            "breadth": float(request.data.get("breadth", 10)),
            "height": float(request.data.get("height", 10)),
            "payment_mode": request.data.get("payment_mode", "Prepaid"),
        }

        try:
            with transaction.atomic():
                svc = DelhiveryService()
                shipment = svc.create_shipment(order, package_info, created_by=request.user)

                # Move order to shipped status if it was packed
                if order.status in [OrderStatus.PACKED, OrderStatus.PROCESSING]:
                    from apps.orders.models import OrderStatusHistory
                    order.status = OrderStatus.SHIPPED
                    order.tracking_number = shipment.awb_number
                    order.shipping_carrier = shipment.courier_name
                    order.shipped_at = shipment.created_at
                    order.save(update_fields=["status", "tracking_number", "shipping_carrier", "shipped_at"])
                    OrderStatusHistory.objects.create(
                        order=order,
                        status=OrderStatus.SHIPPED,
                        changed_by=request.user,
                        notes=f"Shipment created via Delhivery. AWB: {shipment.awb_number}",
                    )

                    # Inventory: deduct physical stock
                    for item in order.items.all():
                        inventory = getattr(item.product, "inventory", None)
                        if inventory:
                            inventory.current_stock = max(0, inventory.current_stock - item.quantity)
                            inventory.reserved_stock = max(0, inventory.reserved_stock - item.quantity)
                            inventory.save()

                # Auto-schedule pickup if pickup_date provided
                pickup_date_str = request.data.get("pickup_date")
                if pickup_date_str:
                    from datetime import date
                    try:
                        from django.utils.dateparse import parse_date
                        pd = parse_date(pickup_date_str)
                        if pd:
                            svc.schedule_pickup(shipment, pickup_date=pd)
                    except Exception as e:
                        logger.warning("Failed to schedule pickup: %s", e)

        except DelhiveryValidationError as e:
            # Return structured validation errors (user-friendly list)
            return error_response(
                "Shipment validation failed. Please fix the issues below.",
                status_code=status.HTTP_400_BAD_REQUEST,
                details=e.errors,
            )
        except DelhiveryAPIError as e:
            return error_response(str(e), status_code=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            logger.exception("Unexpected error creating shipment: %s", e)
            return error_response("Failed to create shipment.", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

        serializer = ShipmentSerializer(shipment)
        return success_response(
            data=serializer.data,
            message=f"Shipment created successfully. AWB: {shipment.awb_number}",
            status_code=status.HTTP_201_CREATED,
        )


# ============================================================
# Admin — List Shipments
# ============================================================

class AdminShipmentListView(APIView):
    """
    GET /api/v1/shipping/admin/shipments/
    Multi-filtering: status, packing_status, search (AWB/order/customer/phone/ref),
    pickup_date, delivery_date, payment_type, state, city, dealer vs customer, page, page_size, sort_by
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        shipments = Shipment.objects.filter(is_deleted=False).select_related(
            "order__user", "order__shipping_address", "created_by"
        ).prefetch_related("tracking_events")

        # Sorting
        sort_by = request.query_params.get("sort_by", "newest")
        if sort_by == "oldest":
            shipments = shipments.order_by("created_at")
        elif sort_by == "pickup_date":
            shipments = shipments.order_by("-pickup_scheduled_date")
        elif sort_by == "delivery_date":
            shipments = shipments.order_by("-estimated_delivery_date")
        elif sort_by == "status":
            shipments = shipments.order_by("shipment_status")
        else:
            shipments = shipments.order_by("-created_at")

        # Filter by shipment status
        status_filter = request.query_params.get("status")
        if status_filter and status_filter != "all":
            shipments = shipments.filter(shipment_status=status_filter)

        # Filter by packing status
        packing_filter = request.query_params.get("packing_status")
        if packing_filter and packing_filter != "all":
            shipments = shipments.filter(packing_status=packing_filter)

        # Filter by payment mode (COD / Prepaid)
        payment_type = request.query_params.get("payment_type")
        if payment_type and payment_type != "all":
            if payment_type.upper() == "COD":
                shipments = shipments.filter(order__payment_method__iexact="cod")
            else:
                shipments = shipments.exclude(order__payment_method__iexact="cod")

        # Filter by State & City (resolved dynamically from single source of truth order.shipping_address)
        state_filter = request.query_params.get("state")
        if state_filter and state_filter.strip():
            shipments = shipments.filter(order__shipping_address__state__iexact=state_filter.strip())

        city_filter = request.query_params.get("city")
        if city_filter and city_filter.strip():
            shipments = shipments.filter(order__shipping_address__city__iexact=city_filter.strip())

        # Filter by Order Type (Dealer vs Customer)
        order_type = request.query_params.get("order_type")
        if order_type == "dealer":
            shipments = shipments.filter(order__user__role="dealer")
        elif order_type == "customer":
            shipments = shipments.filter(order__user__role="customer")

        # Global Search
        search = request.query_params.get("search", "").strip()
        if search:
            shipments = shipments.filter(
                Q(shipment_number__icontains=search) |
                Q(awb_number__icontains=search) |
                Q(tracking_number__icontains=search) |
                Q(order__order_number__icontains=search) |
                Q(order__user__full_name__icontains=search) |
                Q(order__user__email__icontains=search) |
                Q(order__shipping_address__full_name__icontains=search) |
                Q(order__shipping_address__mobile__icontains=search) |
                Q(courier_reference__icontains=search)
            ).distinct()

        # Date filters
        pickup_date = request.query_params.get("pickup_date")
        if pickup_date:
            shipments = shipments.filter(pickup_scheduled_date=pickup_date)

        delivery_date = request.query_params.get("delivery_date")
        if delivery_date:
            shipments = shipments.filter(estimated_delivery_date=delivery_date)

        # Pagination (supports 20, 50, 100)
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))
        total = shipments.count()
        start = (page - 1) * page_size
        end = start + page_size
        shipments_page = shipments[start:end]

        serializer = ShipmentListSerializer(shipments_page, many=True)
        return success_response(
            data=serializer.data,
            message="Shipments retrieved.",
            meta={"pagination": {"page": page, "page_size": page_size, "total": total,
                                  "total_pages": (total + page_size - 1) // page_size if total > 0 else 1}},
        )


# ============================================================
# Admin — Shipment Detail
# ============================================================

class AdminShipmentDetailView(APIView):
    """GET /api/v1/shipping/admin/shipments/<pk>/"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, pk):
        try:
            shipment = Shipment.objects.filter(is_deleted=False).select_related(
                "order__user", "order__shipping_address", "created_by"
            ).prefetch_related("tracking_events", "order__items__product").get(pk=pk)
        except Shipment.DoesNotExist:
            return error_response("Shipment not found.", status_code=status.HTTP_404_NOT_FOUND)

        serializer = ShipmentSerializer(shipment)
        return success_response(data=serializer.data)


# ============================================================
# Admin — Action Views (Label, Manifest, Bulk, Export)
# ============================================================

class AdminShipmentLabelView(APIView):
    """POST /api/v1/shipping/admin/shipments/<pk>/label/"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            shipment = Shipment.objects.get(pk=pk, is_deleted=False)
        except Shipment.DoesNotExist:
            return error_response("Shipment not found.", status_code=status.HTTP_404_NOT_FOUND)

        # Generate or return existing shipping label URL
        if not shipment.label_url:
            shipment.label_url = f"https://express.delhivery.com/api/v1/packages/label/?waybill={shipment.awb_number}"
            shipment.save(update_fields=["label_url", "updated_at"])

        from .models import ShipmentEvent
        ShipmentEvent.objects.create(
            shipment=shipment,
            event_code="LABEL_GENERATED",
            event_label="Shipping Label Generated",
            status_mapped=shipment.shipment_status,
            description=f"Shipping label generated for AWB: {shipment.awb_number}",
            event_source="manual",
            created_by=request.user,
        )

        return success_response(
            data={"label_url": shipment.label_url, "awb": shipment.awb_number},
            message="Shipping label generated successfully.",
        )


class AdminShipmentManifestView(APIView):
    """POST /api/v1/shipping/admin/shipments/<pk>/manifest/"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            shipment = Shipment.objects.get(pk=pk, is_deleted=False)
        except Shipment.DoesNotExist:
            return error_response("Shipment not found.", status_code=status.HTTP_404_NOT_FOUND)

        if not shipment.manifest_url:
            shipment.manifest_url = f"https://express.delhivery.com/api/v1/manifest/?waybill={shipment.awb_number}"
            shipment.save(update_fields=["manifest_url", "updated_at"])

        from .models import ShipmentEvent
        ShipmentEvent.objects.create(
            shipment=shipment,
            event_code="MANIFEST_GENERATED",
            event_label="Manifest Document Generated",
            status_mapped=shipment.shipment_status,
            description=f"Manifest document created for shipment {shipment.shipment_number}",
            event_source="manual",
            created_by=request.user,
        )

        return success_response(
            data={"manifest_url": shipment.manifest_url, "shipment_number": shipment.shipment_number},
            message="Manifest generated successfully.",
        )


class AdminShipmentBulkActionView(APIView):
    """
    POST /api/v1/shipping/admin/shipments/bulk-action/
    Body:
      action: 'sync' | 'pickup' | 'manifest' | 'label' | 'cancel'
      shipment_ids: list of UUIDs
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        action_name = request.data.get("action")
        shipment_ids = request.data.get("shipment_ids", [])

        if not action_name or not shipment_ids:
            return error_response("action and shipment_ids are required.", status_code=status.HTTP_400_BAD_REQUEST)

        shipments = Shipment.objects.filter(id__in=shipment_ids, is_deleted=False)
        processed_count = 0

        with transaction.atomic():
            svc = DelhiveryService()
            for shipment in shipments:
                try:
                    if action_name == "sync":
                        svc.sync_tracking(shipment)
                    elif action_name == "pickup":
                        svc.schedule_pickup(shipment)
                    elif action_name == "cancel":
                        svc.cancel_shipment(shipment)
                    processed_count += 1
                except Exception as e:
                    logger.warning("Bulk action '%s' failed for shipment %s: %s", action_name, shipment.id, e)

        return success_response(
            data={"processed": processed_count, "total_requested": len(shipment_ids)},
            message=f"Bulk {action_name} executed for {processed_count} shipment(s).",
        )


class AdminShipmentExportView(APIView):
    """
    GET /api/v1/shipping/admin/shipments/export/?format=csv|excel|pdf
    Returns downloadable report export of filtered shipment records.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        export_format = request.query_params.get("format", "csv").lower()
        shipments = Shipment.objects.filter(is_deleted=False).select_related(
            "order__user", "order__shipping_address"
        ).order_by("-created_at")[:500]

        import csv
        from django.http import HttpResponse

        if export_format == "csv":
            response = HttpResponse(content_type="text/csv")
            response["Content-Disposition"] = 'attachment; filename="FAAZO_Shipments_Export.csv"'
            writer = csv.writer(response)
            writer.writerow([
                "Shipment Number", "AWB Number", "Order Number", "Customer Name",
                "Phone", "State", "City", "Courier", "Status", "Pickup Date",
                "Estimated Delivery", "Created At"
            ])
            for s in shipments:
                writer.writerow([
                    s.shipment_number,
                    s.awb_number,
                    s.order.order_number if s.order else "",
                    s.order.shipping_address.full_name if s.order and s.order.shipping_address else (s.order.user.full_name if s.order and s.order.user else ""),
                    s.order.shipping_address.mobile if s.order and s.order.shipping_address else "",
                    s.order.shipping_address.state if s.order and s.order.shipping_address else "",
                    s.order.shipping_address.city if s.order and s.order.shipping_address else "",
                    s.courier_name,
                    s.get_shipment_status_display(),
                    s.pickup_scheduled_date or "",
                    s.estimated_delivery_date or "",
                    s.created_at.strftime("%Y-%m-%d %H:%M"),
                ])
            return response

        return error_response("Unsupported export format.", status_code=status.HTTP_400_BAD_REQUEST)


# ============================================================
# Admin — Sync Tracking
# ============================================================

class AdminShipmentSyncView(APIView):
    """POST /api/v1/shipping/admin/shipments/<pk>/sync/"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            shipment = Shipment.objects.filter(is_deleted=False).select_related("order").prefetch_related("tracking_events").get(pk=pk)
        except Shipment.DoesNotExist:
            return error_response("Shipment not found.", status_code=status.HTTP_404_NOT_FOUND)

        try:
            with transaction.atomic():
                svc = DelhiveryService()
                svc.sync_tracking(shipment)
        except DelhiveryAPIError as e:
            return error_response(str(e), status_code=status.HTTP_502_BAD_GATEWAY)

        shipment.refresh_from_db()
        serializer = ShipmentSerializer(shipment)
        return success_response(
            data=serializer.data,
            message="Tracking synced successfully.",
        )


# ============================================================
# Admin — Schedule Pickup
# ============================================================

class AdminSchedulePickupView(APIView):
    """POST /api/v1/shipping/admin/shipments/<pk>/schedule-pickup/"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            shipment = Shipment.objects.filter(is_deleted=False).get(pk=pk)
        except Shipment.DoesNotExist:
            return error_response("Shipment not found.", status_code=status.HTTP_404_NOT_FOUND)

        pickup_date_str = request.data.get("pickup_date")
        pickup_date = None
        if pickup_date_str:
            from django.utils.dateparse import parse_date
            pickup_date = parse_date(pickup_date_str)

        try:
            with transaction.atomic():
                svc = DelhiveryService()
                svc.schedule_pickup(shipment, pickup_date=pickup_date)
        except DelhiveryAPIError as e:
            return error_response(str(e), status_code=status.HTTP_502_BAD_GATEWAY)

        serializer = ShipmentSerializer(shipment)
        return success_response(data=serializer.data, message="Pickup scheduled successfully.")


# ============================================================
# Admin — Cancel Shipment
# ============================================================

class AdminCancelShipmentView(APIView):
    """POST /api/v1/shipping/admin/shipments/<pk>/cancel/"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            shipment = Shipment.objects.filter(is_deleted=False).select_related("order").get(pk=pk)
        except Shipment.DoesNotExist:
            return error_response("Shipment not found.", status_code=status.HTTP_404_NOT_FOUND)

        try:
            with transaction.atomic():
                svc = DelhiveryService()
                svc.cancel_shipment(shipment, reason=request.data.get("reason", ""))
        except DelhiveryAPIError as e:
            return error_response(str(e), status_code=status.HTTP_400_BAD_REQUEST)

        serializer = ShipmentSerializer(shipment)
        return success_response(data=serializer.data, message="Shipment cancelled successfully.")


# ============================================================
# Admin — Fulfillment Stats
# ============================================================

class AdminFulfillmentStatsView(APIView):
    """GET /api/v1/shipping/admin/stats/"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from django.utils import timezone
        today = timezone.now().date()
        base = Shipment.objects.filter(is_deleted=False)

        stats = {
            "total_shipments":  base.count(),
            "created":          base.filter(shipment_status=ShipmentStatus.CREATED).count(),
            "pickup_scheduled": base.filter(shipment_status=ShipmentStatus.PICKUP_SCHEDULED).count(),
            "picked_up":        base.filter(shipment_status=ShipmentStatus.PICKED_UP).count(),
            "reached_hub":      base.filter(shipment_status=ShipmentStatus.REACHED_HUB).count(),
            "in_transit":       base.filter(shipment_status=ShipmentStatus.IN_TRANSIT).count(),
            "out_for_delivery": base.filter(shipment_status=ShipmentStatus.OUT_FOR_DELIVERY).count(),
            "delivered":        base.filter(shipment_status=ShipmentStatus.DELIVERED).count(),
            "failed_delivery":  base.filter(shipment_status=ShipmentStatus.FAILED_DELIVERY).count(),
            "cancelled":        base.filter(shipment_status=ShipmentStatus.CANCELLED).count(),
            "rto_initiated":    base.filter(shipment_status=ShipmentStatus.RTO_INITIATED).count(),
            # Operational Metrics
            "todays_dispatches": base.filter(pickup_date__date=today).count(),
            "todays_deliveries": base.filter(delivered_at__date=today).count(),
            "delivery_success_rate": round((base.filter(shipment_status=ShipmentStatus.DELIVERED).count() / max(1, base.count())) * 100, 1),
            "rto_percentage": round((base.filter(shipment_status=ShipmentStatus.RTO_INITIATED).count() / max(1, base.count())) * 100, 1),
        }

        # Pending packing — orders in processing or packed without a shipment
        from apps.orders.models import Order
        pending_packing = Order.objects.filter(
            status__in=[OrderStatus.PROCESSING, OrderStatus.PACKED],
            shipments__isnull=True,
        ).count()
        stats["pending_packing"] = pending_packing

        return success_response(data=stats, message="Fulfillment stats retrieved.")


# ============================================================
# Customer — Order Shipment Tracking
# ============================================================

class CustomerShipmentTrackingView(APIView):
    """
    GET /api/v1/shipping/orders/<order_pk>/shipment/
    Returns shipment tracking for the authenticated customer's own order.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, order_pk):
        try:
            order = Order.objects.get(pk=order_pk, user=request.user)
        except Order.DoesNotExist:
            return error_response("Order not found.", status_code=status.HTTP_404_NOT_FOUND)

        shipment = Shipment.objects.filter(order=order, is_deleted=False).prefetch_related("tracking_events").first()
        if not shipment:
            return success_response(data=None, message="No shipment found for this order.")

        data = {
            "id": str(shipment.id),
            "shipment_number": shipment.shipment_number,
            "courier_name": shipment.courier_name,
            "awb_number": shipment.awb_number,
            "tracking_number": shipment.tracking_number,
            "shipment_status": shipment.shipment_status,
            "pickup_status": shipment.pickup_status,
            "current_location": shipment.current_location,
            "estimated_delivery_date": str(shipment.estimated_delivery_date) if shipment.estimated_delivery_date else None,
            "delivered_at": shipment.delivered_at.isoformat() if shipment.delivered_at else None,
            "last_synced_at": shipment.last_synced_at.isoformat() if shipment.last_synced_at else None,
            "tracking_events": [
                {
                    "id": str(evt.id),
                    "event_label": evt.event_label,
                    "status_mapped": evt.status_mapped,
                    "event_timestamp": evt.event_timestamp.isoformat(),
                    "location": evt.location,
                    "description": evt.description,
                    "is_delivered": evt.is_delivered,
                }
                for evt in shipment.tracking_events.order_by("event_timestamp")
            ],
        }
        return success_response(data=data, message="Shipment tracking retrieved.")


# ============================================================
# Webhook — Delhivery Callback
# ============================================================

class DelhiveryWebhookView(APIView):
    """
    POST /api/v1/shipping/webhooks/delhivery/
    Idempotent, transaction-safe webhook callback handler.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.data
        webhook_id = request.headers.get("X-Delhivery-Webhook-ID") or payload.get("waybill") or str(uuid.uuid4())

        from .models import DelhiveryWebhookLog
        if DelhiveryWebhookLog.objects.filter(webhook_id=webhook_id, is_processed=True).exists():
            logger.info("[WEBHOOK_IDEMPOTENT] Webhook %s already processed.", webhook_id)
            return success_response(data={}, message="Webhook already processed (Idempotent).")

        log_entry, _ = DelhiveryWebhookLog.objects.get_or_create(
            webhook_id=webhook_id,
            defaults={"raw_payload": payload, "received_at": timezone.now()}
        )

        try:
            with transaction.atomic():
                svc = DelhiveryService()
                new_events = svc.process_webhook(payload)
                log_entry.is_processed = True
                log_entry.processed_at = timezone.now()
                log_entry.processing_result = f"Successfully appended {len(new_events)} event(s)."
                log_entry.save()
        except Exception as e:
            logger.exception("Delhivery webhook processing error: %s", e)
            log_entry.processing_result = f"Error: {str(e)}"
            log_entry.retry_count += 1
            log_entry.save()
            return success_response(data={}, message="Webhook acknowledged.")

        return success_response(
            data={"new_events": len(new_events)},
            message="Webhook processed.",
        )


# ============================================================
# Admin — Provider Health Check
# ============================================================

class AdminProviderHealthCheckView(APIView):
    """GET /api/v1/shipping/admin/health/"""
    permission_classes = [IsAdmin]

    def get(self, request):
        from .providers import ShippingConfigValidator, get_shipping_provider

        cfg_provider = getattr(settings, "SHIPPING_PROVIDER", "sandbox").lower()
        active_provider_obj = get_shipping_provider()
        active_provider_class = active_provider_obj.__class__.__name__

        is_valid, validation_reasons = ShippingConfigValidator.validate_delhivery_config(cfg_provider) if cfg_provider in ["sandbox", "live"] else (True, [])
        last_shipment = Shipment.objects.filter(is_deleted=False).order_by("-created_at").first()

        health_data = {
            "status": "Online" if (cfg_provider == "offline" or is_valid) else "Fallback (Offline)",
            "configured_provider": cfg_provider,
            "active_provider_class": active_provider_class,
            "is_config_valid": is_valid,
            "validation_reasons": validation_reasons,
            "pickup_location": getattr(settings, "DELHIVERY_PICKUP_LOCATION", ""),
            "seller_name": getattr(settings, "DELHIVERY_SELLER_NAME", ""),
            "last_shipment": {
                "id": str(last_shipment.id) if last_shipment else None,
                "shipment_number": last_shipment.shipment_number if last_shipment else None,
                "awb_number": last_shipment.awb_number if last_shipment else None,
                "provider": last_shipment.provider if last_shipment else None,
                "created_at": last_shipment.created_at.isoformat() if last_shipment else None,
            } if last_shipment else None,
        }
        return success_response(data=health_data, message="Provider health status retrieved.")

