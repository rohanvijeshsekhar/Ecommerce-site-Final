"""
FAAZO – Shipping & Fulfillment Views

Admin endpoints:
  POST   /api/v1/shipping/admin/shipments/                → create packing record (internal)
  POST   /api/v1/shipping/admin/shipments/<pk>/courier/   → push to courier (Delhivery)
  PATCH  /api/v1/shipping/admin/shipments/<pk>/packing/   → update packing status
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
from apps.orders.models import Order, OrderStatus, OrderStatusHistory

from .models import Shipment, ShipmentStatus, PackingStatus, ShipmentEvent
from .serializers import ShipmentSerializer, ShipmentListSerializer
from .services import DelhiveryService, DelhiveryAPIError, DelhiveryValidationError

logger = logging.getLogger("faazo")


# ============================================================
# Admin — Create Packing Record
# ============================================================

class AdminShipmentCreateView(APIView):
    """
    POST /api/v1/shipping/admin/shipments/

    Creates a WAREHOUSE-ONLY fulfilment record for packing workflow tracking.
    Does NOT call Delhivery. Sets packing_status=PENDING, courier_status=NOT_CREATED.

    To create the actual Delhivery shipment once packing is complete, call:
      POST /api/v1/shipping/admin/shipments/<pk>/create-courier/

    Body:
      order_id (UUID): required
      weight (float): kg
      length, breadth, height (float): cm
      warehouse (str): optional
      dispatch_location (str): optional
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

        allowed_order_statuses = [
            OrderStatus.PROCESSING,
            OrderStatus.PACKED,
        ]
        if order.status not in allowed_order_statuses:
            return error_response(
                f"Cannot initiate fulfilment for order in '{order.status}' status. "
                f"Order must be processing or packed.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        existing_shipment = order.shipments.filter(is_deleted=False).first()
        if existing_shipment:
            if existing_shipment.shipment_status != ShipmentStatus.NOT_CREATED or existing_shipment.awb_number:
                return error_response(
                    f"Courier shipment already created for this order (AWB: '{existing_shipment.awb_number}').",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
            # Update existing warehouse shipment with new package dimensions
            shipment = existing_shipment
            shipment.weight = float(request.data.get("weight", shipment.weight))
            shipment.length = float(request.data.get("length", shipment.length))
            shipment.width = float(request.data.get("breadth", shipment.width))
            shipment.height = float(request.data.get("height", shipment.height))
            if request.data.get("warehouse"):
                shipment.warehouse = request.data.get("warehouse")
            if request.data.get("dispatch_location"):
                shipment.dispatch_location = request.data.get("dispatch_location")
            shipment.save()
            serializer = ShipmentSerializer(shipment)
            return success_response(
                data=serializer.data,
                message="Warehouse fulfilment record updated.",
                status_code=status.HTTP_200_OK,
            )

        from .models import ShipmentEvent
        with transaction.atomic():
            shipment = Shipment.objects.create(
                order=order,
                created_by=request.user,
                packing_status=PackingStatus.PENDING,
                shipment_status=ShipmentStatus.NOT_CREATED,
                weight=float(request.data.get("weight", 1.0)),
                length=float(request.data.get("length", 10.0)),
                width=float(request.data.get("breadth", 10.0)),
                height=float(request.data.get("height", 10.0)),
                warehouse=request.data.get("warehouse", "FAAZO Central Warehouse - Hub 1"),
                dispatch_location=request.data.get("dispatch_location", "Mumbai Fulfillment Hub"),
            )
            ShipmentEvent.objects.create(
                shipment=shipment,
                event_code="WAREHOUSE_INITIATED",
                event_label="Warehouse Fulfilment Record Created",
                status_mapped=ShipmentStatus.NOT_CREATED,
                description="Fulfilment record initialised. Packing workflow started.",
                event_source="manual",
                created_by=request.user,
            )

        serializer = ShipmentSerializer(shipment)
        return success_response(
            data=serializer.data,
            message="Warehouse fulfilment record created. Progress through packing workflow, "
                    "then create the courier shipment.",
            status_code=status.HTTP_201_CREATED,
        )


# ============================================================
# Admin — Update Packing Status
# ============================================================

class AdminUpdatePackingStatusView(APIView):
    """
    PATCH /api/v1/shipping/admin/shipments/<pk>/packing/

    Advances the warehouse packing state along the approved forward-only path:
      pending → packing → packed → qc_passed → ready_for_pickup

    Body:
      status (str): target packing status  [optional — auto-advances to next if omitted]
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    # Allowed forward-only transitions
    TRANSITIONS = {
        PackingStatus.PENDING:          PackingStatus.PACKING,
        PackingStatus.PACKING:          PackingStatus.PACKED,
        PackingStatus.PACKED:           PackingStatus.QC_PASSED,
        PackingStatus.QC_PASSED:        PackingStatus.READY_FOR_PICKUP,
        PackingStatus.READY_FOR_PICKUP: None,
    }
    EVENT_LABELS = {
        PackingStatus.PACKING:          "Packing Started",
        PackingStatus.PACKED:           "Packing Completed",
        PackingStatus.QC_PASSED:        "QC Inspection Passed",
        PackingStatus.READY_FOR_PICKUP: "Package Ready for Courier Pickup",
    }

    def patch(self, request, pk):
        try:
            shipment = Shipment.objects.filter(is_deleted=False).get(pk=pk)
        except Shipment.DoesNotExist:
            return error_response("Shipment not found.", status_code=status.HTTP_404_NOT_FOUND)

        requested = request.data.get("status")
        current   = shipment.packing_status

        if requested:
            valid = [c[0] for c in PackingStatus.choices]
            if requested not in valid:
                return error_response(
                    f"Invalid packing status '{requested}'. Allowed: {valid}",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
            target = requested
        else:
            target = self.TRANSITIONS.get(current)
            if target is None:
                return error_response(
                    "Packing is already at the terminal state 'ready_for_pickup'.",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

        # Enforce forward-only order
        status_order = list(PackingStatus.values)
        if status_order.index(target) <= status_order.index(current):
            return error_response(
                f"Invalid packing transition: '{current}' → '{target}'. "
                "Only forward transitions are permitted.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        from .models import ShipmentEvent
        from django.utils import timezone
        with transaction.atomic():
            shipment.packing_status = target
            if target == PackingStatus.PACKED:
                shipment.packed_by = request.user
                shipment.packed_at = timezone.now()
            elif target == PackingStatus.QC_PASSED:
                shipment.qc_by  = request.user
                shipment.qc_at  = timezone.now()
            shipment.save(update_fields=[
                "packing_status", "packed_by", "packed_at",
                "qc_by", "qc_at", "updated_at",
            ])
            ShipmentEvent.objects.create(
                shipment=shipment,
                event_code=f"PACKING_{target.upper()}",
                event_label=self.EVENT_LABELS.get(target, f"Packing: {target}"),
                status_mapped=shipment.shipment_status,
                description=f"Packing status advanced to '{target}' by {request.user}.",
                event_source="manual",
                created_by=request.user,
            )

        shipment.refresh_from_db()
        serializer = ShipmentSerializer(shipment)
        return success_response(
            data=serializer.data,
            message=f"Packing status updated to '{target}'.",
        )


# ============================================================
# Admin — Create Courier Shipment
# ============================================================

class AdminCreateCourierShipmentView(APIView):
    """
    POST /api/v1/shipping/admin/shipments/<pk>/create-courier/

    *** BUSINESS RULE ***
    Only allowed when packing_status == READY_FOR_PICKUP.
    Calls Delhivery, receives AWB, transitions shipment_status → CREATED.

    Body:
      weight (float): kg  [optional — overrides stored default]
      length, breadth, height (float): cm
      payment_mode (str): 'Prepaid' | 'COD'
      pickup_date (str): YYYY-MM-DD (optional — auto-schedules pickup)
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            shipment = Shipment.objects.filter(is_deleted=False).select_related(
                "order__user", "order__shipping_address"
            ).prefetch_related("order__items__product").get(pk=pk)
        except Shipment.DoesNotExist:
            return error_response("Shipment not found.", status_code=status.HTTP_404_NOT_FOUND)

        # ── Auto-advance packing status if not ready ─────────────────────────
        if shipment.packing_status != PackingStatus.READY_FOR_PICKUP:
            shipment.packing_status = PackingStatus.READY_FOR_PICKUP
            shipment.save(update_fields=["packing_status", "updated_at"])

        if shipment.shipment_status != ShipmentStatus.NOT_CREATED and shipment.awb_number:
            return error_response(
                f"Courier shipment already exists "
                f"(status: '{shipment.shipment_status}', AWB: '{shipment.awb_number}').",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        # ──────────────────────────────────────────────────────────────────

        package_info = {
            "weight":       float(request.data.get("weight",  shipment.weight)),
            "length":       float(request.data.get("length",  shipment.length)),
            "breadth":      float(request.data.get("breadth", shipment.width)),
            "height":       float(request.data.get("height",  shipment.height)),
            "payment_mode": request.data.get("payment_mode", "Prepaid"),
        }

        try:
            with transaction.atomic():
                order  = shipment.order
                svc    = DelhiveryService()

                # Call Delhivery via create_shipment_for_existing (updates the
                # pre-existing Shipment record rather than creating a new one)
                shipment = svc.create_shipment(
                    order       = order,
                    package_info= package_info,
                    created_by  = request.user,
                    existing_shipment = shipment,
                )

                # Move order to FULFILLED
                order.status          = OrderStatus.FULFILLED
                order.tracking_number = shipment.awb_number
                order.shipping_carrier= shipment.courier_name
                from django.utils import timezone
                order.shipped_at = timezone.now()
                order.save(update_fields=[
                    "status", "tracking_number", "shipping_carrier", "shipped_at",
                ])
                OrderStatusHistory.objects.create(
                    order=order,
                    status=OrderStatus.FULFILLED,
                    changed_by=request.user,
                    notes=f"Courier shipment created via Delhivery. AWB: {shipment.awb_number}",
                )

                # Deduct inventory
                for item in order.items.all():
                    inv = getattr(item.product, "inventory", None)
                    if inv:
                        inv.current_stock  = max(0, inv.current_stock  - item.quantity)
                        inv.reserved_stock = max(0, inv.reserved_stock - item.quantity)
                        inv.save()

                # Auto-schedule pickup if date provided
                pickup_date_str = request.data.get("pickup_date")
                if pickup_date_str:
                    from django.utils.dateparse import parse_date
                    pd = parse_date(pickup_date_str)
                    if pd:
                        try:
                            svc.schedule_pickup(shipment, pickup_date=pd)
                        except Exception as exc:
                            logger.warning("Auto-pickup scheduling failed: %s", exc)

        except DelhiveryValidationError as e:
            return error_response(
                "Courier shipment validation failed.",
                status_code=status.HTTP_400_BAD_REQUEST,
                details=e.errors,
            )
        except DelhiveryAPIError as e:
            return error_response(str(e), status_code=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            logger.exception("Unexpected error creating courier shipment: %s", e)
            return error_response(
                "Failed to create courier shipment.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        shipment.refresh_from_db()
        serializer = ShipmentSerializer(shipment)
        return success_response(
            data=serializer.data,
            message=f"Courier shipment created with Delhivery. AWB: {shipment.awb_number}",
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
            # ── Warehouse dual-workflow metrics ───────────────────────────────────────
            # Courier not yet contacted for any of these records
            "not_created":      base.filter(shipment_status=ShipmentStatus.NOT_CREATED).count(),
            # Packing done + courier not yet created — action required
            "ready_for_pickup_count": base.filter(
                packing_status=PackingStatus.READY_FOR_PICKUP,
                shipment_status=ShipmentStatus.NOT_CREATED,
            ).count(),
            # Admin attention required (AWB exists but packing mismatch)
            "needs_review":     base.filter(needs_review=True).count(),
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

        # Pending packing — orders without any fulfilment record yet
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

