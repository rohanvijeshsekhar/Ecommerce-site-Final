"""
FAAZO – Enterprise Shipping Provider Architecture

Implements:
  - ShippingConfigValidator
  - BaseShippingProvider (Abstract Interface)
  - OfflineShippingProvider (Simulation Mode)
  - ShiprocketProvider (Production Logistics Provider)
  - get_shipping_provider() (Factory with transparent fallback)

All providers expose identical methods:
  create_shipment() | track_shipment() | cancel_shipment() | schedule_pickup() | sync_tracking() | generate_label() | generate_manifest()
"""

import logging
from abc import ABC, abstractmethod
from datetime import date, timedelta
from django.conf import settings
from django.utils import timezone

from apps.orders.models import Order, OrderStatus
from .models import Shipment, ShipmentTrackingEvent, ShipmentStatus, PickupStatus
from .shiprocket_client import (
    ShiprocketAPIClient,
    ShiprocketAPIError,
    ShiprocketValidationError,
    DelhiveryAPIError,
    DelhiveryValidationError,
)

logger = logging.getLogger("faazo")


# ============================================================
# ============================================================
# Status Mapping & Lifecycle Ranking
# ============================================================

SHIPROCKET_STATUS_MAP = {
    "NEW":                          ShipmentStatus.CREATED,
    "AWB ASSIGNED":                 ShipmentStatus.CREATED,
    "LABEL GENERATED":              ShipmentStatus.CREATED,
    "MANIFEST GENERATED":           ShipmentStatus.CREATED,
    "PICKUP SCHEDULED":             ShipmentStatus.PICKUP_SCHEDULED,
    "PICKUP GENERATED":             ShipmentStatus.PICKUP_SCHEDULED,
    "PICKUP QUEUED":                ShipmentStatus.PICKUP_SCHEDULED,
    "PICKUP RESCHEDULED":           ShipmentStatus.PICKUP_SCHEDULED,
    "OUT FOR PICKUP":               ShipmentStatus.PICKUP_SCHEDULED,
    "PICKED UP":                    ShipmentStatus.PICKED_UP,
    "HANDOVER TO COURIER":          ShipmentStatus.PICKED_UP,
    "SELF DROP":                    ShipmentStatus.PICKED_UP,
    "IN TRANSIT":                   ShipmentStatus.IN_TRANSIT,
    "SHIPPED":                      ShipmentStatus.IN_TRANSIT,
    "REACHED AT ORIGIN HUB":        ShipmentStatus.IN_TRANSIT,
    "REACHED AT SUB HUB":           ShipmentStatus.IN_TRANSIT,
    "REACHED AT DESTINATION HUB":   ShipmentStatus.REACHED_HUB,
    "REACHED HUB":                  ShipmentStatus.REACHED_HUB,
    "REACHED NEAREST HUB":          ShipmentStatus.REACHED_HUB,
    "DESTINATION HUB":              ShipmentStatus.REACHED_HUB,
    "OUT FOR DELIVERY":             ShipmentStatus.OUT_FOR_DELIVERY,
    "HANDED OVER TO LAST MILE":     ShipmentStatus.OUT_FOR_DELIVERY,
    "DELIVERED":                    ShipmentStatus.DELIVERED,
    "FULFILLED":                    ShipmentStatus.DELIVERED,
    "UNDELIVERED":                  ShipmentStatus.FAILED_DELIVERY,
    "FAILED DELIVERY":              ShipmentStatus.FAILED_DELIVERY,
    "CUSTOMER REFUSED":             ShipmentStatus.FAILED_DELIVERY,
    "ADDRESS ISSUE":                ShipmentStatus.FAILED_DELIVERY,
    "DOOR CLOSED":                  ShipmentStatus.FAILED_DELIVERY,
    "DELIVERY RESCHEDULED":         ShipmentStatus.FAILED_DELIVERY,
    "CANCELED":                     ShipmentStatus.CANCELLED,
    "CANCELLED":                    ShipmentStatus.CANCELLED,
    "RTO INITIATED":                ShipmentStatus.RTO_INITIATED,
    "RTO IN TRANSIT":               ShipmentStatus.RTO_IN_TRANSIT,
    "RTO OFD":                      ShipmentStatus.RTO_IN_TRANSIT,
    "RTO DELIVERED":                ShipmentStatus.RTO_DELIVERED,
    "RTO UNDELIVERED":              ShipmentStatus.RTO_IN_TRANSIT,
    "LOST":                         ShipmentStatus.LOST,
    "DAMAGED":                      ShipmentStatus.LOST,
    "DESTROYED":                    ShipmentStatus.LOST,
}

# Alias for backward compatibility
DELHIVERY_STATUS_MAP = SHIPROCKET_STATUS_MAP

# All provider values that represent the Shiprocket live integration
# (includes legacy 'sandbox' and 'live' DB values from before naming was normalized)
SHIPROCKET_PROVIDERS = {"shiprocket", "sandbox", "live"}

# Monotonic forward lifecycle ranking to prevent status regression
SHIPMENT_STATUS_RANK = {
    ShipmentStatus.NOT_CREATED: 0,
    ShipmentStatus.CREATED: 10,
    ShipmentStatus.PICKUP_SCHEDULED: 20,
    ShipmentStatus.PICKED_UP: 30,
    ShipmentStatus.REACHED_HUB: 40,
    ShipmentStatus.IN_TRANSIT: 50,
    ShipmentStatus.OUT_FOR_DELIVERY: 60,
    ShipmentStatus.DELIVERED: 70,
    # Exceptions / Terminal branch:
    ShipmentStatus.FAILED_DELIVERY: 65,
    ShipmentStatus.RTO_INITIATED: 80,
    ShipmentStatus.RTO_IN_TRANSIT: 85,
    ShipmentStatus.RTO_DELIVERED: 90,
    ShipmentStatus.CANCELLED: 100,
    ShipmentStatus.LOST: 100,
}


def map_shiprocket_status(status_val, current_status=ShipmentStatus.NOT_CREATED) -> str:
    """
    Robustly maps Shiprocket status values (string labels or integer status codes)
    to the authoritative FAAZO ShipmentStatus enum.
    """
    if status_val is None:
        return current_status

    # Numeric status code mapping
    if isinstance(status_val, int) or (isinstance(status_val, str) and str(status_val).strip().isdigit()):
        code_map = {
            1: ShipmentStatus.CREATED,
            2: ShipmentStatus.CREATED,
            3: ShipmentStatus.PICKUP_SCHEDULED,
            4: ShipmentStatus.PICKUP_SCHEDULED,
            5: ShipmentStatus.CREATED,
            6: ShipmentStatus.IN_TRANSIT,
            7: ShipmentStatus.DELIVERED,
            8: ShipmentStatus.CANCELLED,
            9: ShipmentStatus.RTO_INITIATED,
            10: ShipmentStatus.RTO_DELIVERED,
            12: ShipmentStatus.LOST,
            13: ShipmentStatus.FAILED_DELIVERY,
            14: ShipmentStatus.RTO_IN_TRANSIT,
            15: ShipmentStatus.OUT_FOR_DELIVERY,
            16: ShipmentStatus.IN_TRANSIT,
            17: ShipmentStatus.PICKUP_SCHEDULED,
            18: ShipmentStatus.PICKUP_SCHEDULED,
            19: ShipmentStatus.FAILED_DELIVERY,
            20: ShipmentStatus.IN_TRANSIT,
            22: ShipmentStatus.LOST,
            23: ShipmentStatus.LOST,
            24: ShipmentStatus.DELIVERED,
            25: ShipmentStatus.REACHED_HUB,
            26: ShipmentStatus.IN_TRANSIT,
            40: ShipmentStatus.FAILED_DELIVERY,
            41: ShipmentStatus.FAILED_DELIVERY,
            42: ShipmentStatus.FAILED_DELIVERY,
            44: ShipmentStatus.FAILED_DELIVERY,
            46: ShipmentStatus.PICKED_UP,
            48: ShipmentStatus.IN_TRANSIT,
            50: ShipmentStatus.IN_TRANSIT,
            51: ShipmentStatus.REACHED_HUB,
            52: ShipmentStatus.PICKED_UP,
            54: ShipmentStatus.IN_TRANSIT,
            55: ShipmentStatus.REACHED_HUB,
            56: ShipmentStatus.RTO_IN_TRANSIT,
            57: ShipmentStatus.RTO_IN_TRANSIT,
            59: ShipmentStatus.LOST,
            60: ShipmentStatus.LOST,
            67: ShipmentStatus.REACHED_HUB,
            75: ShipmentStatus.OUT_FOR_DELIVERY,
        }
        mapped = code_map.get(int(status_val))
        if mapped:
            return mapped

    # String label normalization
    cleaned = str(status_val).strip().upper().replace("_", " ").replace("-", " ")
    return SHIPROCKET_STATUS_MAP.get(cleaned, current_status)


def sync_order_status_from_shipment(shipment: Shipment, mapped_status: str):
    """
    Synchronizes the parent Order status based on courier shipment progress.
    Warehouse steps (processing/packed/qc_passed) remain under admin control.
    Courier progress automatically advances Order status:
      - Picked Up / In Transit / Out for Delivery -> SHIPPED
      - Delivered -> DELIVERED
      - Cancelled -> CANCELLED (if all shipments cancelled)
    """
    order = shipment.order
    if not order:
        return

    from apps.orders.models import OrderStatus, OrderStatusHistory

    status_updated = False
    new_order_status = None
    note = ""

    if mapped_status in [
        ShipmentStatus.CREATED,
        ShipmentStatus.PICKUP_SCHEDULED,
        ShipmentStatus.PICKED_UP,
        ShipmentStatus.REACHED_HUB,
        ShipmentStatus.IN_TRANSIT,
        ShipmentStatus.OUT_FOR_DELIVERY,
    ]:
        if order.status not in [OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
            new_order_status = OrderStatus.SHIPPED
            order.status = OrderStatus.SHIPPED
            order.tracking_number = shipment.awb_number or order.tracking_number
            order.shipping_carrier = shipment.courier_name or order.shipping_carrier
            if not order.shipped_at:
                order.shipped_at = timezone.now()
            note = f"Order status moved to Shipped via Shiprocket ({shipment.get_shipment_status_display()}). AWB: {shipment.awb_number}"
            status_updated = True

    elif mapped_status == ShipmentStatus.DELIVERED:
        if order.status != OrderStatus.DELIVERED:
            new_order_status = OrderStatus.DELIVERED
            order.status = OrderStatus.DELIVERED
            if not order.delivered_at:
                order.delivered_at = timezone.now()
            note = f"Order marked as Delivered via Shiprocket tracking. AWB: {shipment.awb_number}"
            status_updated = True

    elif mapped_status == ShipmentStatus.CANCELLED:
        other_active = order.shipments.filter(is_deleted=False).exclude(pk=shipment.pk).exclude(shipment_status=ShipmentStatus.CANCELLED).exists()
        if not other_active and order.status != OrderStatus.CANCELLED:
            new_order_status = OrderStatus.CANCELLED
            order.status = OrderStatus.CANCELLED
            note = f"Order cancelled via Shiprocket courier cancellation."
            status_updated = True

    if status_updated:
        fields_to_update = ["status", "updated_at"]
        if order.shipped_at:
            fields_to_update.append("shipped_at")
        if order.delivered_at:
            fields_to_update.append("delivered_at")
        if order.tracking_number:
            fields_to_update.append("tracking_number")
        if order.shipping_carrier:
            fields_to_update.append("shipping_carrier")
        order.save(update_fields=list(set(fields_to_update)))

        if new_order_status:
            OrderStatusHistory.objects.create(
                order=order,
                status=new_order_status,
                notes=note,
            )


# ============================================================
# Configuration Validator
# ============================================================

class ShippingConfigValidator:
    """
    Validates shipping provider configuration before initialization.
    If required settings are missing, logs exact reasons and enables graceful offline fallback.
    """

    @staticmethod
    def validate_shiprocket_config(provider_name: str = "shiprocket") -> tuple[bool, list[str]]:
        reasons = []

        email = getattr(settings, "SHIPROCKET_EMAIL", "")
        if not email or not email.strip():
            reasons.append("SHIPROCKET_EMAIL is not configured in environment settings.")

        password = getattr(settings, "SHIPROCKET_PASSWORD", "")
        if not password or not password.strip():
            reasons.append("SHIPROCKET_PASSWORD is not configured in environment settings.")

        pickup_loc = getattr(settings, "SHIPROCKET_PICKUP_LOCATION", "")
        if not pickup_loc or not pickup_loc.strip():
            reasons.append("SHIPROCKET_PICKUP_LOCATION is not configured.")

        is_valid = len(reasons) == 0
        return is_valid, reasons

    # Backward compatibility alias
    validate_delhivery_config = validate_shiprocket_config


# ============================================================
# Abstract Shipping Provider
# ============================================================

class BaseShippingProvider(ABC):
    """
    Unified Shipping Provider Interface.
    All providers (Offline, Shiprocket) implement these exact methods.
    """

    def validate_for_shipment(self, order: Order, package_info: dict) -> None:
        """Pre-flight address and package validation from order snapshot."""
        errors: list[str] = []
        snapshot = getattr(order, "shipping_address_snapshot", None) or {}
        addr = order.shipping_address

        full_name = snapshot.get("full_name") or getattr(order, "shipping_full_name", "") or (addr.full_name if addr else "")
        mobile = snapshot.get("mobile") or getattr(order, "shipping_mobile", "") or (addr.mobile if addr else "")
        line1 = snapshot.get("line1") or getattr(order, "shipping_line1", "") or (addr.line1 if addr else "")
        city = snapshot.get("city") or getattr(order, "shipping_city", "") or (addr.city if addr else "")
        state = snapshot.get("state") or getattr(order, "shipping_state", "") or (addr.state if addr else "")
        pincode = snapshot.get("pincode") or getattr(order, "shipping_pincode", "") or (addr.pincode if addr else "")

        if not full_name or not full_name.strip():
            errors.append("Shipping address is missing customer name.")
        if not mobile or not str(mobile).strip():
            errors.append("Shipping address is missing phone number.")
        elif len(str(mobile).strip().replace(" ", "")) < 10:
            errors.append("Phone number must be at least 10 digits.")
        if not line1 or not line1.strip():
            errors.append("Shipping address line 1 is missing.")
        elif len(line1.strip()) < 3:
            errors.append(f"Shipping address line 1 ('{line1}') must be at least 3 characters.")
        if not city or not city.strip():
            errors.append("City is missing in shipping address.")
        elif len(city.strip()) < 2:
            errors.append(f"City name ('{city}') must be at least 2 characters.")
        if not state or not state.strip():
            errors.append("State is missing in shipping address.")
        elif len(state.strip()) < 2:
            errors.append(f"State name ('{state}') must be at least 2 characters.")
        if not pincode:
            errors.append("Pincode is missing in shipping address.")
        elif not str(pincode).strip().isdigit() or len(str(pincode).strip()) != 6:
            errors.append(f"Invalid 6-digit Indian pincode: '{pincode}'.")

        weight = float(package_info.get("weight", 0))
        if weight <= 0:
            # Fallback: calculate from order items
            calculated_weight = sum(
                float(getattr(item.product, "weight", 0.5) or 0.5) * item.quantity
                for item in order.items.all()
            )
            if calculated_weight > 0:
                package_info["weight"] = calculated_weight
                weight = calculated_weight
            else:
                errors.append("Package weight must be greater than 0 kg.")
        elif weight > 50:
            errors.append(f"Package weight {weight} kg exceeds maximum limit of 50 kg.")

        for dim, label in [("length", "Length"), ("breadth", "Breadth"), ("height", "Height")]:
            val = float(package_info.get(dim, 0))
            if val <= 0:
                errors.append(f"Package {label} must be greater than 0 cm.")
            elif val > 150:
                errors.append(f"Package {label} ({val} cm) exceeds maximum limit of 150 cm.")

        if errors:
            raise ShiprocketValidationError(errors, error_code="PREFLIGHT_VALIDATION_FAILED")

    @abstractmethod
    def create_shipment(self, order: Order, package_info: dict, created_by=None, existing_shipment=None) -> Shipment:
        pass

    @abstractmethod
    def track_shipment(self, shipment: Shipment) -> dict:
        pass

    @abstractmethod
    def cancel_shipment(self, shipment: Shipment, reason: str = "") -> dict:
        pass

    @abstractmethod
    def schedule_pickup(self, shipment: Shipment, pickup_date: date = None) -> dict:
        pass

    @abstractmethod
    def sync_tracking(self, shipment: Shipment) -> Shipment:
        pass


# ============================================================
# Offline Shipping Provider (Simulation Mode)
# ============================================================

class OfflineShippingProvider(BaseShippingProvider):
    """
    Offline Shipment Simulation Provider.
    Zero external HTTP calls. Generates local AWBs and handles instant tracking simulation.
    """

    def create_shipment(self, order: Order, package_info: dict, created_by=None, existing_shipment=None) -> Shipment:
        if existing_shipment and existing_shipment.awb_number:
            return existing_shipment

        if float(package_info.get("weight", 0) or 0) <= 0:
            package_info["weight"] = 1.0
        if float(package_info.get("length", 0) or 0) <= 0:
            package_info["length"] = 10.0
        if float(package_info.get("breadth", 0) or 0) <= 0:
            package_info["breadth"] = 10.0
        if float(package_info.get("height", 0) or 0) <= 0:
            package_info["height"] = 10.0

        addr = order.shipping_address
        if not addr:
            from apps.orders.models import Address
            addr = Address(
                user=order.user,
                full_name="Doctor Customer",
                mobile="9876543210",
                line1="123 Dental Clinic Road",
                city="Mumbai",
                state="Maharashtra",
                pincode="400001",
            )
            order.shipping_address = addr
        else:
            if not addr.full_name or not addr.full_name.strip():
                addr.full_name = "Doctor Customer"
            if not addr.mobile or len(str(addr.mobile).strip().replace(" ", "")) < 10:
                addr.mobile = "9876543210"
            if not addr.line1 or not addr.line1.strip():
                addr.line1 = "123 Dental Clinic Road"
            if not addr.city or not addr.city.strip():
                addr.city = "Mumbai"
            if not addr.state or not addr.state.strip():
                addr.state = "Maharashtra"
            if not addr.pincode or not str(addr.pincode).strip().isdigit() or len(str(addr.pincode).strip()) != 6:
                addr.pincode = "400001"

        self.validate_for_shipment(order, package_info)

        req_time = timezone.now()
        order_ref = str(order.order_number or order.id)
        fake_awb = f"DEV{order_ref.replace('-', '')[:14].upper()}"

        fake_raw = {
            "packages": [{
                "status": "Success",
                "waybill": fake_awb,
                "refnum": order_ref,
                "remarks": ["Simulated shipment (Offline Provider)"]
            }]
        }

        resp_time = timezone.now()
        exec_ms = round((resp_time - req_time).total_seconds() * 1000, 2)

        if existing_shipment:
            shipment = existing_shipment
            shipment.provider = "offline"
            shipment.courier_name = "Shiprocket (Offline Simulation)"
            shipment.delhivery_shipment_id = fake_awb
            shipment.awb_number = fake_awb
            shipment.tracking_number = fake_awb
            shipment.tracking_url = f"http://localhost:3000/orders/{order.id}"
            shipment.shipment_status = ShipmentStatus.CREATED
            shipment.pickup_status = PickupStatus.PENDING
            shipment.current_location = "FAAZO Central Warehouse, Mumbai"
            shipment.raw_response = fake_raw
            shipment.last_synced_at = resp_time
            if created_by:
                shipment.created_by = created_by
            shipment.save()
        else:
            shipment = Shipment.objects.create(
                order=order,
                created_by=created_by,
                provider="offline",
                courier_name="Shiprocket (Offline Simulation)",
                delhivery_shipment_id=fake_awb,
                awb_number=fake_awb,
                tracking_number=fake_awb,
                tracking_url=f"http://localhost:3000/orders/{order.id}",
                shipment_status=ShipmentStatus.CREATED,
                pickup_status=PickupStatus.PENDING,
                current_location="FAAZO Central Warehouse, Mumbai",
                raw_response=fake_raw,
                last_synced_at=resp_time,
            )


        ShipmentTrackingEvent.objects.create(
            shipment=shipment,
            event_code="MANIFEST_CREATED",
            event_label="Shipment Created (Offline Mode)",
            status_mapped=ShipmentStatus.CREATED,
            event_timestamp=req_time,
            location="FAAZO Central Warehouse, Mumbai",
            description="Package manifest generated in Offline Simulation Mode.",
            event_source="manual"
        )

        logger.info("[OFFLINE_PROVIDER] Created simulated shipment for order %s (AWB: %s)", order.order_number, fake_awb)
        return shipment

    def generate_label(self, shipment: Shipment) -> dict:
        if not shipment.label_url:
            shipment.label_url = f"http://localhost:3000/shipping/labels/{shipment.awb_number}.pdf"
            shipment.save(update_fields=["label_url", "updated_at"])
        return {"label_url": shipment.label_url, "awb": shipment.awb_number}

    def generate_manifest(self, shipment: Shipment) -> dict:
        if not shipment.manifest_url:
            shipment.manifest_url = f"http://localhost:3000/shipping/manifests/{shipment.shipment_number}.pdf"
            shipment.save(update_fields=["manifest_url", "updated_at"])
        return {"manifest_url": shipment.manifest_url, "shipment_number": shipment.shipment_number}

    def track_shipment(self, shipment: Shipment) -> dict:
        return {
            "awb": shipment.awb_number,
            "status": shipment.get_shipment_status_display(),
            "location": shipment.current_location,
            "mode": "offline"
        }

    def cancel_shipment(self, shipment: Shipment, reason: str = "") -> dict:
        if not shipment.is_cancellable:
            raise ShiprocketAPIError(f"Cannot cancel shipment in status '{shipment.shipment_status}'.")
        shipment.shipment_status = ShipmentStatus.CANCELLED
        shipment.pickup_status = PickupStatus.CANCELLED
        shipment.save(update_fields=["shipment_status", "pickup_status", "updated_at"])

        ShipmentTrackingEvent.objects.create(
            shipment=shipment,
            event_code="CANCELLED",
            event_label="Shipment Cancelled",
            status_mapped=ShipmentStatus.CANCELLED,
            event_timestamp=timezone.now(),
            location="FAAZO System",
            description=reason or "Shipment cancelled by admin.",
            event_source="manual"
        )
        return {"status": "Cancelled", "awb": shipment.awb_number}

    def schedule_pickup(self, shipment: Shipment, pickup_date: date = None) -> dict:
        target_date = pickup_date or (date.today() + timedelta(days=1))
        shipment.pickup_status = PickupStatus.SCHEDULED
        shipment.pickup_scheduled_date = target_date
        shipment.shipment_status = ShipmentStatus.PICKUP_SCHEDULED
        shipment.save(update_fields=["pickup_status", "pickup_scheduled_date", "shipment_status", "updated_at"])

        ShipmentTrackingEvent.objects.create(
            shipment=shipment,
            event_code="PICKUP_SCHEDULED",
            event_label="Pickup Scheduled",
            status_mapped=ShipmentStatus.PICKUP_SCHEDULED,
            event_timestamp=timezone.now(),
            location="FAAZO Central Warehouse",
            description=f"Pickup scheduled for {target_date.strftime('%Y-%m-%d')}.",
            event_source="manual"
        )
        return {"status": "Scheduled", "pickup_date": target_date.strftime("%Y-%m-%d")}

    def sync_tracking(self, shipment: Shipment) -> Shipment:
        shipment.last_synced_at = timezone.now()
        shipment.save(update_fields=["last_synced_at"])
        return shipment


# ============================================================
# Shiprocket Enterprise Provider (Production API)
# ============================================================

class ShiprocketProvider(BaseShippingProvider):
    """
    Shiprocket Enterprise Shipping Provider.
    Implements core atomic shipment creation (Create Order + Assign Courier/AWB) and independent,
    on-demand post-commit operations (Generate Label, Generate Manifest, Schedule Pickup, Sync Tracking).
    """

    def __init__(self, base_url: str = None, email: str = None, password: str = None):
        self.client = ShiprocketAPIClient(base_url=base_url, email=email, password=password)
        self.pickup_location = getattr(settings, "SHIPROCKET_PICKUP_LOCATION", "Primary")

    def create_shipment(self, order: Order, package_info: dict, created_by=None, existing_shipment=None) -> Shipment:
        """
        CORE BUSINESS TRANSACTION BOUNDARY:
          1. Create Order via Shiprocket Adhoc API (/v1/external/orders/create/adhoc).
          2. Check if AWB is already assigned on Shiprocket (recovery/reuse).
          3. Only call Assign Courier (/v1/external/courier/assign/awb) if genuinely unassigned.
          4. Save Shipment record & transition status to CREATED / PICKUP_SCHEDULED.
          5. Synchronize parent Order status to SHIPPED.
        """
        # Step 0A: Check if existing shipment already has AWB (accept any legacy Shiprocket provider name)
        if existing_shipment and existing_shipment.awb_number and existing_shipment.provider in SHIPROCKET_PROVIDERS:
            logger.info("[SHIPROCKET_PROVIDER] Existing shipment %s already has AWB %s. Reusing.", existing_shipment.shipment_number, existing_shipment.awb_number)
            return existing_shipment

        # Step 0B: Idempotency check: Does this order already have a valid Shiprocket shipment with AWB?
        # Include legacy provider values ('sandbox', 'live') that may exist in the database.
        active_sr_shipment = order.shipments.filter(
            provider__in=list(SHIPROCKET_PROVIDERS),
            is_deleted=False
        ).exclude(shipment_status=ShipmentStatus.CANCELLED).first()

        if active_sr_shipment and active_sr_shipment.awb_number:
            logger.info("[SHIPROCKET_PROVIDER] Existing active shipment found for order %s (AWB: %s). Returning existing.", order.order_number, active_sr_shipment.awb_number)
            return active_sr_shipment

        self.validate_for_shipment(order, package_info)

        snapshot = getattr(order, "shipping_address_snapshot", None) or {}
        addr = order.shipping_address

        full_name = snapshot.get("full_name") or getattr(order, "shipping_full_name", "") or (addr.full_name if addr else "Customer")
        mobile = snapshot.get("mobile") or getattr(order, "shipping_mobile", "") or (addr.mobile if addr else "0000000000")
        line1 = snapshot.get("line1") or getattr(order, "shipping_line1", "") or (addr.line1 if addr else "")
        line2 = snapshot.get("line2") or getattr(order, "shipping_line2", "") or (addr.line2 if addr else "")
        city = snapshot.get("city") or getattr(order, "shipping_city", "") or (addr.city if addr else "")
        state = snapshot.get("state") or getattr(order, "shipping_state", "") or (addr.state if addr else "")
        pincode = snapshot.get("pincode") or getattr(order, "shipping_pincode", "") or (addr.pincode if addr else "")
        country = snapshot.get("country") or getattr(order, "shipping_country", "") or "India"

        weight = float(package_info.get("weight", 0.5))
        length = float(package_info.get("length", 10))
        breadth = float(package_info.get("breadth", 10))
        height = float(package_info.get("height", 10))
        payment_mode = package_info.get("payment_mode", "Prepaid")
        is_cod = payment_mode.upper() == "COD"

        name_parts = (full_name or "Doctor").strip().split()
        first_name = name_parts[0] if name_parts else "Doctor"
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else "Dental"

        order_items = []
        for item in order.items.all():
            unit_val = float(getattr(item, "price", None) or getattr(item, "unit_price", 0.0) or 0.0)
            order_items.append({
                "name": item.product.name,
                "sku": getattr(item.product, "sku", str(item.product.id)) or str(item.product.id),
                "units": item.quantity,
                "selling_price": str(unit_val),
                "discount": "",
                "tax": "",
                "hsn": getattr(item, "hsn_code", "") or getattr(item.product, "hsn_code", "") or "9018",
            })

        order_payload = {
            "order_id": str(order.order_number),
            "order_date": order.created_at.strftime("%Y-%m-%d %H:%M"),
            "pickup_location": self.pickup_location,
            "channel_id": "",
            "comment": "FAAZO Enterprise Order",
            "billing_customer_name": first_name,
            "billing_last_name": last_name,
            "billing_address": line1,
            "billing_address_2": line2 or "",
            "billing_city": city,
            "billing_pincode": pincode,
            "billing_state": state,
            "billing_country": country,
            "billing_email": getattr(order.user, "email", "") or "customer@faazo.com",
            "billing_phone": mobile,
            "shipping_is_billing": True,
            "order_items": order_items,
            "payment_method": "COD" if is_cod else "Prepaid",
            "shipping_charges": 0,
            "giftwrap_charges": 0,
            "transaction_charges": 0,
            "total_discount": 0,
            "sub_total": float(order.total_amount),
            "length": length,
            "breadth": breadth,
            "height": height,
            "weight": weight,
        }

        req_time = timezone.now()

        # Step 1: Create or fetch Order in Shiprocket.
        # If Shiprocket rejects with a duplicate-order error (order_id already exists on their side),
        # attempt to extract or search for the existing SR order/shipment IDs and proceed to AWB
        # recovery (Steps 2A-2C) instead of failing immediately.
        sr_order_id = None
        sr_shipment_id = None
        order_res = {}
        exec_ms_1 = 0
        awb_code = None
        courier_name = None
        sr_status = None

        try:
            order_res, order_status, exec_ms_1 = self.client.create_order(order_payload)
            sr_order_id = order_res.get("order_id")
            sr_shipment_id = order_res.get("shipment_id")

            if not sr_order_id or not sr_shipment_id:
                errMsg = order_res.get("message") or "Shiprocket order creation failed."
                raise ShiprocketAPIError(f"Shiprocket Order Creation Failed: {errMsg}", status_code=order_status, details=order_res, error_code="SHIPMENT_CREATION_FAILED")

            awb_code = order_res.get("awb_code") or order_res.get("response", {}).get("data", {}).get("awb_code") or order_res.get("awb")
            courier_name = order_res.get("courier_name") or order_res.get("response", {}).get("data", {}).get("courier_name")
            sr_status = order_res.get("status")

        except (ShiprocketValidationError, ShiprocketAPIError) as dup_err:
            # Shiprocket returns 422/409 when order_id already exists on their side.
            # Attempt to recover SR IDs from the error response body.
            err_details = getattr(dup_err, 'details', None) or {}
            sr_order_id = (
                err_details.get("order_id") or
                err_details.get("id") or
                (err_details.get("data") or {}).get("order_id")
            )
            sr_shipment_id = (
                err_details.get("shipment_id") or
                (err_details.get("data") or {}).get("shipment_id")
            )

            if not sr_order_id:
                # Error body didn't include IDs — search Shiprocket by channel_order_id
                logger.warning(
                    "[SHIPROCKET_PROVIDER] create_order failed for %s (%s). "
                    "Attempting recovery by channel_order_id search.",
                    order.order_number, dup_err
                )
                sr_order_id, sr_shipment_id = self._find_existing_sr_order(order_payload["order_id"])

            if sr_order_id:
                logger.info(
                    "[SHIPROCKET_PROVIDER] Recovered SR order %s / shipment %s for FAAZO order %s. "
                    "Proceeding to AWB recovery.",
                    sr_order_id, sr_shipment_id, order.order_number
                )
                # awb_code, courier_name, sr_status remain None — will be recovered in Steps 2A/2B
            else:
                # Genuine error — not a duplicate-order situation
                logger.error(
                    "[SHIPROCKET_PROVIDER] create_order failed for %s and no existing SR order found. Error: %s",
                    order.order_number, dup_err
                )
                raise

        # Step 2: Check for existing AWB (already partially initialised above from create response)
        courier_res = {}
        exec_ms_2 = 0

        # Step 2A: If AWB not in create response, inspect Shiprocket Shipment details
        if not awb_code and sr_shipment_id:
            try:
                shipment_details, _, _ = self.client.get_shipment_details(sr_shipment_id)
                shipment_data = shipment_details.get("data", {}) if isinstance(shipment_details, dict) else {}
                if isinstance(shipment_data, dict):
                    awb_code = shipment_data.get("awb") or shipment_data.get("awb_code")
                    courier_name = shipment_data.get("courier") or shipment_data.get("courier_name") or courier_name
                    sr_status = shipment_data.get("status") or sr_status
                    if awb_code:
                        logger.info("[SHIPROCKET_PROVIDER] Recovered existing AWB %s for shipment %s (%s)", awb_code, sr_shipment_id, courier_name)
            except Exception as e:
                logger.warning("[SHIPROCKET_PROVIDER] Failed to fetch shipment details for %s: %s", sr_shipment_id, e)

        # Step 2B: If AWB still not found, inspect Shiprocket Order details
        if not awb_code and sr_order_id:
            try:
                order_details, _, _ = self.client.get_order_details(sr_order_id)
                order_data = order_details.get("data", {}) if isinstance(order_details, dict) else {}
                if isinstance(order_data, dict):
                    awb_data = order_data.get("awb_data", {})
                    if isinstance(awb_data, dict) and awb_data.get("awb"):
                        awb_code = awb_data.get("awb")
                    shipments_info = order_data.get("shipments", {})
                    if isinstance(shipments_info, dict):
                        awb_code = awb_code or shipments_info.get("awb") or shipments_info.get("awb_code")
                        courier_name = courier_name or shipments_info.get("courier") or shipments_info.get("courier_name")
                        sr_status = sr_status or shipments_info.get("status")
                    elif isinstance(shipments_info, list) and shipments_info:
                        s0 = shipments_info[0]
                        if isinstance(s0, dict):
                            awb_code = awb_code or s0.get("awb") or s0.get("awb_code")
                            courier_name = courier_name or s0.get("courier") or s0.get("courier_name")
                            sr_status = sr_status or s0.get("status")
                    if awb_code:
                        logger.info("[SHIPROCKET_PROVIDER] Recovered existing AWB %s for order %s (%s)", awb_code, sr_order_id, courier_name)
            except Exception as e:
                logger.warning("[SHIPROCKET_PROVIDER] Failed to fetch order details for %s: %s", sr_order_id, e)

        # Step 2C: Only if Shiprocket genuinely has NO assigned AWB, assign courier
        if not awb_code:
            courier_res, courier_status, exec_ms_2 = self.client.assign_courier(sr_shipment_id)
            awb_data = courier_res.get("response", {}).get("data", {})
            awb_code = awb_data.get("awb_code") or courier_res.get("awb_code") or courier_res.get("awb")
            courier_name = awb_data.get("courier_name") or courier_res.get("courier_name") or courier_name or "Shiprocket Carrier"

        resp_time = timezone.now()
        tracking_url = f"https://shiprocket.co/tracking/{awb_code}" if awb_code else ""

        if not awb_code:
            errMsg = courier_res.get("message") or "Shiprocket courier assignment / AWB generation failed."
            raise ShiprocketAPIError(f"Shiprocket AWB Generation Failed: {errMsg}", status_code=502, details=courier_res, error_code="AWB_GENERATION_FAILED")

        courier_name = courier_name or "Shiprocket Carrier"
        mapped_initial_status = map_shiprocket_status(sr_status, ShipmentStatus.CREATED)

        # Always normalize provider to 'shiprocket' — never persist legacy 'sandbox'/'live' values
        common_fields = dict(
            provider="shiprocket",
            courier_name=courier_name,
            delhivery_shipment_id=str(sr_shipment_id) if sr_shipment_id else "",
            external_shipment_id=str(sr_order_id) if sr_order_id else "",
            awb_number=awb_code,
            tracking_number=awb_code,
            tracking_url=tracking_url,
            shipment_status=mapped_initial_status,
            pickup_status=PickupStatus.PENDING,
            current_location="Origin Warehouse",
            raw_response={"order_response": order_res, "courier_response": courier_res},
            last_synced_at=resp_time,
        )

        if existing_shipment:
            for field, value in common_fields.items():
                setattr(existing_shipment, field, value)
            if created_by:
                existing_shipment.created_by = created_by
            existing_shipment.save()
            shipment = existing_shipment
        else:
            shipment = Shipment.objects.create(
                order=order,
                created_by=created_by,
                **common_fields,
            )

        ShipmentTrackingEvent.objects.get_or_create(
            shipment=shipment,
            event_code="MANIFEST_CREATED",
            defaults={
                "event_label": "Courier Assigned & AWB Generated (Shiprocket)",
                "status_mapped": mapped_initial_status,
                "event_timestamp": req_time,
                "location": "Shiprocket Logistics Network",
                "description": f"Shipment created and AWB assigned: {awb_code} ({courier_name})",
                "event_source": "api_poll",
            }
        )

        # Synchronize order lifecycle to Shipped
        sync_order_status_from_shipment(shipment, mapped_initial_status)

        logger.info("[SHIPROCKET_PROVIDER] Shipment created successfully for order %s (AWB: %s, Courier: %s)", order.order_number, awb_code, courier_name)
        return shipment

    def generate_label(self, shipment: Shipment) -> dict:
        """Post-commit operational action to generate shipping label."""
        sr_shipment_id = shipment.delhivery_shipment_id or shipment.awb_number
        if not sr_shipment_id:
            raise ShiprocketAPIError("Cannot generate label: missing shipment identifier.", error_code="LABEL_GENERATION_FAILED")

        res_data, status_code, _ = self.client.generate_label([sr_shipment_id])
        label_url = res_data.get("label_url") or res_data.get("label_created")
        if not label_url:
            label_url = f"https://shiprocket.co/tracking/{shipment.awb_number}"

        shipment.label_url = label_url
        shipment.save(update_fields=["label_url", "updated_at"])

        ShipmentTrackingEvent.objects.create(
            shipment=shipment,
            event_code="LABEL_GENERATED",
            event_label="Shipping Label Generated",
            status_mapped=shipment.shipment_status,
            event_timestamp=timezone.now(),
            location="Shiprocket System",
            description=f"Label generated for AWB: {shipment.awb_number}",
            event_source="manual"
        )

        return {"label_url": shipment.label_url, "awb": shipment.awb_number}

    def generate_manifest(self, shipment: Shipment) -> dict:
        """Post-commit operational action to generate manifest document."""
        sr_shipment_id = shipment.delhivery_shipment_id or shipment.awb_number
        if not sr_shipment_id:
            raise ShiprocketAPIError("Cannot generate manifest: missing shipment identifier.", error_code="MANIFEST_GENERATION_FAILED")

        res_data, status_code, _ = self.client.generate_manifest([sr_shipment_id])
        manifest_url = res_data.get("manifest_url") or res_data.get("url")
        if not manifest_url:
            manifest_url = f"https://shiprocket.co/tracking/{shipment.awb_number}"

        shipment.manifest_url = manifest_url
        shipment.save(update_fields=["manifest_url", "updated_at"])

        ShipmentTrackingEvent.objects.create(
            shipment=shipment,
            event_code="MANIFEST_GENERATED",
            event_label="Manifest Document Generated",
            status_mapped=shipment.shipment_status,
            event_timestamp=timezone.now(),
            location="Shiprocket System",
            description=f"Manifest generated for shipment: {shipment.shipment_number}",
            event_source="manual"
        )

        return {"manifest_url": shipment.manifest_url, "shipment_number": shipment.shipment_number}

    def schedule_pickup(self, shipment: Shipment, pickup_date: date = None) -> dict:
        """Post-commit operational action to schedule courier pickup."""
        sr_shipment_id = shipment.delhivery_shipment_id or shipment.awb_number
        if not sr_shipment_id:
            raise ShiprocketAPIError("Cannot schedule pickup: missing shipment identifier.", error_code="PICKUP_FAILED")

        res_data, status_code, _ = self.client.generate_pickup([sr_shipment_id])

        target_date = pickup_date or (date.today() + timedelta(days=1))
        shipment.pickup_status = PickupStatus.SCHEDULED
        shipment.pickup_scheduled_date = target_date
        shipment.shipment_status = ShipmentStatus.PICKUP_SCHEDULED
        shipment.save(update_fields=["pickup_status", "pickup_scheduled_date", "shipment_status", "updated_at"])

        ShipmentTrackingEvent.objects.create(
            shipment=shipment,
            event_code="PICKUP_SCHEDULED",
            event_label="Pickup Scheduled with Courier",
            status_mapped=ShipmentStatus.PICKUP_SCHEDULED,
            event_timestamp=timezone.now(),
            location="Shiprocket Logistics",
            description=f"Courier pickup scheduled for {target_date.strftime('%Y-%m-%d')}.",
            event_source="manual"
        )

        return {"status": "Scheduled", "pickup_date": target_date.strftime("%Y-%m-%d")}

    def track_shipment(self, shipment: Shipment) -> dict:
        if not shipment.awb_number:
            return {"status": shipment.get_shipment_status_display(), "location": shipment.current_location}

        res_data, status_code, _ = self.client.track_awb(shipment.awb_number)
        tracking_data = res_data.get("tracking_data", {})
        track_status = tracking_data.get("track_status") or shipment.shipment_status
        current_loc = tracking_data.get("current_status") or shipment.current_location

        return {
            "awb": shipment.awb_number,
            "status": track_status,
            "location": current_loc,
            "raw": res_data,
        }

    def cancel_shipment(self, shipment: Shipment, reason: str = "") -> dict:
        if not shipment.is_cancellable:
            raise ShiprocketAPIError(f"Cannot cancel shipment in status '{shipment.shipment_status}'.", error_code="CANCEL_FAILED")

        sr_order_id = shipment.external_shipment_id or str(shipment.order.order_number)
        res_data, status_code, _ = self.client.cancel_order([sr_order_id])

        shipment.shipment_status = ShipmentStatus.CANCELLED
        shipment.pickup_status = PickupStatus.CANCELLED
        shipment.save(update_fields=["shipment_status", "pickup_status", "updated_at"])

        ShipmentTrackingEvent.objects.create(
            shipment=shipment,
            event_code="CANCELLED",
            event_label="Shipment Cancelled",
            status_mapped=ShipmentStatus.CANCELLED,
            event_timestamp=timezone.now(),
            location="Shiprocket System",
            description=reason or "Shipment cancelled by admin.",
            event_source="manual"
        )

        return {"status": "Cancelled", "awb": shipment.awb_number}

    def sync_tracking(self, shipment: Shipment) -> Shipment:
        # If AWB is missing, attempt recovery from Shiprocket before giving up.
        # This handles the case where shipment creation succeeded on Shiprocket but AWB was
        # not persisted locally (e.g. due to a duplicate-order error on a previous attempt).
        if not shipment.awb_number:
            sr_shipment_id = shipment.delhivery_shipment_id or None
            sr_order_id = shipment.external_shipment_id or None
            channel_order_id = str(shipment.order.order_number) if shipment.order else None

            awb_recovered, courier_recovered, rec_sid, rec_oid = self._recover_awb(sr_shipment_id, sr_order_id, channel_order_id)

            updated_fields = []
            if rec_sid and not shipment.delhivery_shipment_id:
                shipment.delhivery_shipment_id = str(rec_sid)
                updated_fields.append("delhivery_shipment_id")
            if rec_oid and not shipment.external_shipment_id:
                shipment.external_shipment_id = str(rec_oid)
                updated_fields.append("external_shipment_id")
            if shipment.provider != "shiprocket":
                shipment.provider = "shiprocket"
                updated_fields.append("provider")

            if awb_recovered:
                logger.info(
                    "[SYNC_TRACKING_AWB_RECOVERY] Recovered AWB %s for shipment %s (courier: %s)",
                    awb_recovered, shipment.shipment_number, courier_recovered
                )
                tracking_url = f"https://shiprocket.co/tracking/{awb_recovered}"
                shipment.awb_number = awb_recovered
                shipment.tracking_number = awb_recovered
                shipment.tracking_url = tracking_url
                if courier_recovered:
                    shipment.courier_name = courier_recovered
                    updated_fields.append("courier_name")
                if shipment.shipment_status == ShipmentStatus.NOT_CREATED:
                    shipment.shipment_status = ShipmentStatus.CREATED
                    updated_fields.append("shipment_status")
                shipment.last_synced_at = timezone.now()
                updated_fields.extend(["awb_number", "tracking_number", "tracking_url", "last_synced_at", "updated_at"])
                shipment.save(update_fields=list(set(updated_fields)))
                # Synchronize order lifecycle now that we have the AWB
                sync_order_status_from_shipment(shipment, shipment.shipment_status)
            else:
                logger.warning(
                    "[SYNC_TRACKING] No AWB found for shipment %s on Shiprocket. Sync aborted.",
                    shipment.shipment_number
                )
                shipment.last_synced_at = timezone.now()
                updated_fields.extend(["last_synced_at", "updated_at"])
                shipment.save(update_fields=list(set(updated_fields)))
                return shipment

        res_data, status_code, _ = self.client.track_awb(shipment.awb_number)
        tracking_data = res_data.get("tracking_data", {}) if isinstance(res_data, dict) else {}
        shipment_track = tracking_data.get("shipment_track", []) if isinstance(tracking_data, dict) else []
        track_obj = shipment_track[0] if shipment_track and isinstance(shipment_track[0], dict) else {}

        raw_status = track_obj.get("current_status") or tracking_data.get("track_status") or track_obj.get("status") or ""
        mapped_status = map_shiprocket_status(raw_status, shipment.shipment_status)

        # Status Regression Protection
        cur_rank = SHIPMENT_STATUS_RANK.get(shipment.shipment_status, 0)
        new_rank = SHIPMENT_STATUS_RANK.get(mapped_status, 0)
        is_exception = mapped_status in [
            ShipmentStatus.FAILED_DELIVERY,
            ShipmentStatus.RTO_INITIATED,
            ShipmentStatus.RTO_IN_TRANSIT,
            ShipmentStatus.RTO_DELIVERED,
            ShipmentStatus.CANCELLED,
            ShipmentStatus.LOST,
        ]

        if new_rank >= cur_rank or is_exception:
            shipment.shipment_status = mapped_status
        else:
            logger.warning(
                "[STATUS_REGRESSION_PREVENTED] Shipment %s: Regressive status '%s' ignored; current status is '%s'.",
                shipment.shipment_number, mapped_status, shipment.shipment_status
            )

        # Update Location from tracking data
        courier_loc = track_obj.get("destination") or track_obj.get("location") or track_obj.get("origin")
        if courier_loc:
            shipment.current_location = courier_loc

        # Update Courier Name if provided
        courier_from_track = track_obj.get("courier_name") or tracking_data.get("courier_name")
        if courier_from_track:
            shipment.courier_name = courier_from_track

        # Update Delivered timestamp
        if shipment.shipment_status == ShipmentStatus.DELIVERED and not shipment.delivered_at:
            shipment.delivered_at = timezone.now()

        shipment.last_synced_at = timezone.now()
        shipment.save(update_fields=["shipment_status", "current_location", "courier_name", "delivered_at", "last_synced_at", "updated_at"])

        # Synchronize order lifecycle
        sync_order_status_from_shipment(shipment, shipment.shipment_status)

        # Append scans as tracking events (deduplicated)
        scans = track_obj.get("scans", [])
        existing_events = set(shipment.tracking_events.values_list("event_timestamp", "event_code"))

        for scan in scans:
            if not isinstance(scan, dict):
                continue
            scan_date_str = scan.get("date")
            scan_loc = scan.get("location", "")
            scan_activity = scan.get("activity", "")
            scan_status = scan.get("status", "") or "SCAN"

            from django.utils.dateparse import parse_datetime
            evt_time = parse_datetime(scan_date_str) if scan_date_str else None
            if not evt_time:
                continue

            event_key = (evt_time, scan_status)
            if event_key not in existing_events:
                existing_events.add(event_key)
                m_stat = map_shiprocket_status(scan_status, shipment.shipment_status)
                ShipmentTrackingEvent.objects.create(
                    shipment=shipment,
                    event_code=scan_status,
                    event_label=scan_activity or scan_status or "Tracking Scan",
                    status_mapped=m_stat,
                    event_timestamp=evt_time,
                    location=scan_loc or shipment.current_location,
                    description=scan_activity or f"Status updated to {scan_status}",
                    event_source="api_poll"
                )

        return shipment


    def _find_existing_sr_order(self, channel_order_id: str) -> tuple:
        """
        Search Shiprocket orders by channel_order_id to recover existing SR order/shipment IDs.
        Returns (sr_order_id, sr_shipment_id) or (None, None).
        """
        try:
            res_data, _, _ = self.client._execute_request(
                "GET", "/v1/external/orders",
                params={"filter_by": "channel_order_id", "filter": channel_order_id, "page": 1, "per_page": 5}
            )
            raw = res_data.get("data", {})
            orders = raw.get("data", []) if isinstance(raw, dict) else (raw if isinstance(raw, list) else [])
            if orders and isinstance(orders[0], dict):
                o = orders[0]
                sr_order_id = str(o.get("id") or "")
                # shipments can be a dict or list inside the order object
                shipments_info = o.get("shipments") or {}
                if isinstance(shipments_info, list) and shipments_info:
                    shipments_info = shipments_info[0]
                sr_shipment_id = str(shipments_info.get("id") or "") if isinstance(shipments_info, dict) else ""
                if sr_order_id:
                    logger.info(
                        "[SR_ORDER_SEARCH] Found SR order %s / shipment %s for channel_order_id %s",
                        sr_order_id, sr_shipment_id, channel_order_id
                    )
                    return sr_order_id, sr_shipment_id
        except Exception as ex:
            logger.warning("[SR_ORDER_SEARCH] Search by channel_order_id '%s' failed: %s", channel_order_id, ex)
        return None, None

    def _recover_awb(self, sr_shipment_id: str, sr_order_id: str, channel_order_id: str = None) -> tuple:
        """
        Attempt to recover an existing AWB from Shiprocket using available identifiers.
        Tries in order: (1) SR shipment details, (2) SR order details, (3) channel_order_id search.
        Returns (awb_code, courier_name, sr_shipment_id, sr_order_id).
        """
        awb_code = None
        courier_name = None
        found_sid = sr_shipment_id
        found_oid = sr_order_id

        # Strategy 1: SR shipment details by shipment_id
        if sr_shipment_id:
            try:
                d, _, _ = self.client.get_shipment_details(sr_shipment_id)
                data = d.get("data", {}) if isinstance(d, dict) else {}
                if isinstance(data, dict):
                    awb_code = data.get("awb") or data.get("awb_code")
                    courier_name = data.get("courier") or data.get("courier_name")
                    found_oid = found_oid or (str(data.get("order_id")) if data.get("order_id") else None)
                if awb_code:
                    logger.info("[AWB_RECOVERY] Recovered AWB %s from SR shipment %s", awb_code, sr_shipment_id)
                    return awb_code, courier_name, found_sid, found_oid
            except Exception as ex:
                logger.warning("[AWB_RECOVERY] get_shipment_details(%s) failed: %s", sr_shipment_id, ex)

        # Strategy 2: SR order details by order_id
        if sr_order_id:
            try:
                d, _, _ = self.client.get_order_details(sr_order_id)
                data = d.get("data", {}) if isinstance(d, dict) else {}
                if isinstance(data, dict):
                    awb_data = data.get("awb_data") or {}
                    if isinstance(awb_data, dict):
                        awb_code = awb_data.get("awb")
                    shipments_info = data.get("shipments") or {}
                    if isinstance(shipments_info, list) and shipments_info:
                        shipments_info = shipments_info[0]
                    if isinstance(shipments_info, dict):
                        awb_code = awb_code or shipments_info.get("awb") or shipments_info.get("awb_code")
                        courier_name = shipments_info.get("courier") or shipments_info.get("courier_name")
                        found_sid = found_sid or (str(shipments_info.get("id")) if shipments_info.get("id") else None)
                if awb_code:
                    logger.info("[AWB_RECOVERY] Recovered AWB %s from SR order %s", awb_code, sr_order_id)
                    return awb_code, courier_name, found_sid, found_oid
            except Exception as ex:
                logger.warning("[AWB_RECOVERY] get_order_details(%s) failed: %s", sr_order_id, ex)

        # Strategy 3: Search Shiprocket by channel_order_id
        if channel_order_id:
            searched_oid, searched_sid = self._find_existing_sr_order(str(channel_order_id))
            found_oid = found_oid or searched_oid
            found_sid = found_sid or searched_sid

            if found_sid:
                try:
                    d, _, _ = self.client.get_shipment_details(found_sid)
                    data = d.get("data", {}) if isinstance(d, dict) else {}
                    if isinstance(data, dict):
                        awb_code = data.get("awb") or data.get("awb_code")
                        courier_name = data.get("courier") or data.get("courier_name")
                        found_oid = found_oid or (str(data.get("order_id")) if data.get("order_id") else None)
                    if awb_code:
                        logger.info(
                            "[AWB_RECOVERY] Recovered AWB %s via channel_order_id search for %s",
                            awb_code, channel_order_id
                        )
                        return awb_code, courier_name, found_sid, found_oid
                except Exception as ex:
                    logger.warning("[AWB_RECOVERY] get_shipment_details(%s) after search failed: %s", found_sid, ex)

            if not awb_code and found_oid:
                try:
                    d, _, _ = self.client.get_order_details(found_oid)
                    data = d.get("data", {}) if isinstance(d, dict) else {}
                    if isinstance(data, dict):
                        awb_data = data.get("awb_data") or {}
                        if isinstance(awb_data, dict):
                            awb_code = awb_data.get("awb")
                        shipments_info = data.get("shipments") or {}
                        if isinstance(shipments_info, list) and shipments_info:
                            shipments_info = shipments_info[0]
                        if isinstance(shipments_info, dict):
                            awb_code = awb_code or shipments_info.get("awb") or shipments_info.get("awb_code")
                            courier_name = shipments_info.get("courier") or shipments_info.get("courier_name")
                            found_sid = found_sid or (str(shipments_info.get("id")) if shipments_info.get("id") else None)
                    if awb_code:
                        logger.info(
                            "[AWB_RECOVERY] Recovered AWB %s via channel_order_id order details for %s",
                            awb_code, channel_order_id
                        )
                        return awb_code, courier_name, found_sid, found_oid
                except Exception as ex:
                    logger.warning("[AWB_RECOVERY] get_order_details after search failed: %s", ex)

        logger.warning(
            "[AWB_RECOVERY] Could not recover AWB — sr_shipment_id=%s, sr_order_id=%s, channel_order_id=%s",
            found_sid, found_oid, channel_order_id
        )
        return None, None, found_sid, found_oid


# Backward-compatible alias
DelhiverySandboxProvider = ShiprocketProvider
DelhiveryLiveProvider = ShiprocketProvider


# ============================================================
# Provider Factory
# ============================================================

def get_shipping_provider() -> BaseShippingProvider:
    """
    Factory function instantiating active Shipping Provider based on settings.SHIPPING_PROVIDER.
    Validates configuration first; gracefully falls back to OfflineShippingProvider if misconfigured.
    """
    provider_name = getattr(settings, "SHIPPING_PROVIDER", "offline").lower().strip()

    if provider_name in ["shiprocket", "sandbox", "live"]:
        is_valid, reasons = ShippingConfigValidator.validate_shiprocket_config(provider_name)
        if not is_valid:
            logger.warning(
                "[SHIPPING_PROVIDER_FALLBACK] Requested Provider: %s | Reasons: %s | Fallback: Offline Provider Activated.",
                provider_name.upper(), " | ".join(reasons)
            )
            return OfflineShippingProvider()

        return ShiprocketProvider()

    logger.info("[SHIPPING_PROVIDER_ACTIVE] Offline Shipping Provider Activated.")
    return OfflineShippingProvider()
