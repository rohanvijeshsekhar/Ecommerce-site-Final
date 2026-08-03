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
# Status Mapping
# ============================================================

SHIPROCKET_STATUS_MAP = {
    "NEW":                          ShipmentStatus.CREATED,
    "AWB ASSIGNED":                 ShipmentStatus.CREATED,
    "LABEL GENERATED":              ShipmentStatus.CREATED,
    "MANIFEST GENERATED":           ShipmentStatus.CREATED,
    "PICKUP SCHEDULED":             ShipmentStatus.PICKUP_SCHEDULED,
    "PICKUP GENERATED":             ShipmentStatus.PICKUP_SCHEDULED,
    "PICKUP QUEUED":                ShipmentStatus.PICKUP_SCHEDULED,
    "PICKED UP":                    ShipmentStatus.PICKED_UP,
    "IN TRANSIT":                   ShipmentStatus.IN_TRANSIT,
    "REACHED AT DESTINATION HUB":   ShipmentStatus.REACHED_HUB,
    "OUT FOR DELIVERY":             ShipmentStatus.OUT_FOR_DELIVERY,
    "DELIVERED":                    ShipmentStatus.DELIVERED,
    "CANCELED":                     ShipmentStatus.CANCELLED,
    "CANCELLED":                    ShipmentStatus.CANCELLED,
    "RTO INITIATED":                ShipmentStatus.RTO_INITIATED,
    "RTO DELIVERED":                ShipmentStatus.RTO_DELIVERED,
    "LOST":                         ShipmentStatus.LOST,
}

# Alias for backward compatibility
DELHIVERY_STATUS_MAP = SHIPROCKET_STATUS_MAP


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
        """Pre-flight address and package validation."""
        errors: list[str] = []
        addr = order.shipping_address

        if not addr or not addr.full_name or not addr.full_name.strip():
            errors.append("Shipping address is missing customer name.")
        if not addr or not addr.mobile or not str(addr.mobile).strip():
            errors.append("Shipping address is missing phone number.")
        elif len(str(addr.mobile).strip().replace(" ", "")) < 10:
            errors.append("Phone number must be at least 10 digits.")
        if not addr or not addr.line1 or not addr.line1.strip():
            errors.append("Shipping address line 1 is missing.")
        if not addr or not addr.city or not addr.city.strip():
            errors.append("City is missing in shipping address.")
        if not addr or not addr.state or not addr.state.strip():
            errors.append("State is missing in shipping address.")
        if not addr or not addr.pincode:
            errors.append("Pincode is missing in shipping address.")
        elif not str(addr.pincode).strip().isdigit() or len(str(addr.pincode).strip()) != 6:
            errors.append(f"Invalid 6-digit Indian pincode: '{addr.pincode}'.")

        weight = float(package_info.get("weight", 0))
        if weight <= 0:
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
            raise ShiprocketValidationError(errors)

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
          2. Assign Courier & Generate AWB (/v1/external/courier/assign/awb).
          3. Save Shipment record & transition status to CREATED (ACTIVE).
        """
        if existing_shipment and existing_shipment.awb_number:
            return existing_shipment

        self.validate_for_shipment(order, package_info)

        addr = order.shipping_address
        weight = float(package_info.get("weight", 0.5))
        length = float(package_info.get("length", 10))
        breadth = float(package_info.get("breadth", 10))
        height = float(package_info.get("height", 10))
        payment_mode = package_info.get("payment_mode", "Prepaid")
        is_cod = payment_mode.upper() == "COD"

        first_name = addr.full_name.split()[0] if addr.full_name else "Customer"
        last_name = " ".join(addr.full_name.split()[1:]) if len(addr.full_name.split()) > 1 else ""

        order_items = []
        for item in order.items.all():
            order_items.append({
                "name": item.product.name,
                "sku": getattr(item.product, "sku", str(item.product.id)) or str(item.product.id),
                "units": item.quantity,
                "selling_price": str(float(item.unit_price)),
                "discount": "",
                "tax": "",
                "hsn": 4411,
            })

        order_payload = {
            "order_id": str(order.order_number),
            "order_date": order.created_at.strftime("%Y-%m-%d %H:%M"),
            "pickup_location": self.pickup_location,
            "channel_id": "",
            "comment": "FAAZO Enterprise Order",
            "billing_customer_name": first_name,
            "billing_last_name": last_name,
            "billing_address": addr.line1,
            "billing_address_2": addr.line2 or "",
            "billing_city": addr.city,
            "billing_pincode": addr.pincode,
            "billing_state": addr.state,
            "billing_country": "India",
            "billing_email": getattr(order.user, "email", "") or "customer@faazo.com",
            "billing_phone": addr.mobile,
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
        # Step 1: Create Order in Shiprocket
        order_res, order_status, exec_ms_1 = self.client.create_order(order_payload)
        
        sr_order_id = order_res.get("order_id")
        sr_shipment_id = order_res.get("shipment_id")

        if not sr_order_id or not sr_shipment_id:
            errMsg = order_res.get("message") or "Shiprocket order creation failed."
            raise ShiprocketAPIError(f"Shiprocket Order Creation Failed: {errMsg}", status_code=order_status, details=order_res, error_code="SHIPMENT_CREATION_FAILED")

        # Step 2: Assign Courier & Generate AWB
        courier_res, courier_status, exec_ms_2 = self.client.assign_courier(sr_shipment_id)
        resp_time = timezone.now()

        awb_data = courier_res.get("response", {}).get("data", {})
        awb_code = awb_data.get("awb_code") or courier_res.get("awb_code")
        courier_name = awb_data.get("courier_name") or courier_res.get("courier_name") or "Shiprocket Carrier"
        tracking_url = f"https://shiprocket.co/tracking/{awb_code}" if awb_code else ""

        if not awb_code:
            errMsg = courier_res.get("message") or "Shiprocket courier assignment / AWB generation failed."
            raise ShiprocketAPIError(f"Shiprocket AWB Generation Failed: {errMsg}", status_code=courier_status, details=courier_res, error_code="AWB_GENERATION_FAILED")

        total_exec_ms = exec_ms_1 + exec_ms_2

        common_fields = dict(
            provider="shiprocket",
            courier_name=courier_name,
            delhivery_shipment_id=str(sr_shipment_id),  # DB column stores provider shipment ID
            external_shipment_id=str(sr_order_id),
            awb_number=awb_code,
            tracking_number=awb_code,
            tracking_url=tracking_url,
            shipment_status=ShipmentStatus.CREATED,
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

        ShipmentTrackingEvent.objects.create(
            shipment=shipment,
            event_code="MANIFEST_CREATED",
            event_label="Courier Assigned & AWB Generated (Shiprocket)",
            status_mapped=ShipmentStatus.CREATED,
            event_timestamp=req_time,
            location="Shiprocket Logistics Network",
            description=f"Shipment created and AWB assigned: {awb_code} ({courier_name})",
            event_source="api_poll"
        )

        logger.info("[SHIPROCKET_PROVIDER] Shipment created successfully for order %s (AWB: %s)", order.order_number, awb_code)
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
        if not shipment.awb_number:
            return shipment

        res_data, status_code, _ = self.client.track_awb(shipment.awb_number)
        tracking_data = res_data.get("tracking_data", {})
        shipment_track = tracking_data.get("shipment_track", [])
        track_obj = shipment_track[0] if shipment_track else {}

        raw_status = track_obj.get("current_status") or tracking_data.get("track_status") or ""
        mapped_status = SHIPROCKET_STATUS_MAP.get(raw_status.upper(), shipment.shipment_status)

        shipment.shipment_status = mapped_status
        if track_obj.get("destination"):
            shipment.current_location = track_obj.get("destination")
        shipment.last_synced_at = timezone.now()

        if mapped_status == ShipmentStatus.DELIVERED and not shipment.delivered_at:
            shipment.delivered_at = timezone.now()

        shipment.save(update_fields=["shipment_status", "current_location", "delivered_at", "last_synced_at", "updated_at"])

        # Append scans as tracking events
        scans = track_obj.get("scans", [])
        existing_timestamps = set(shipment.tracking_events.values_list("event_timestamp", flat=True))

        for scan in scans:
            scan_date_str = scan.get("date")
            scan_loc = scan.get("location", "")
            scan_activity = scan.get("activity", "")
            scan_status = scan.get("status", "")

            from django.utils.dateparse import parse_datetime
            evt_time = parse_datetime(scan_date_str) if scan_date_str else timezone.now()

            if evt_time and evt_time not in existing_timestamps:
                m_stat = SHIPROCKET_STATUS_MAP.get(scan_status.upper(), mapped_status)
                ShipmentTrackingEvent.objects.create(
                    shipment=shipment,
                    event_code=scan_status or "SYNC_SCAN",
                    event_label=scan_activity or scan_status or "Tracking Scan",
                    status_mapped=m_stat,
                    event_timestamp=evt_time,
                    location=scan_loc,
                    description=scan_activity,
                    event_source="api_poll"
                )

        return shipment


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
