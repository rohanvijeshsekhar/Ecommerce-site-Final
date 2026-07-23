"""
FAAZO – Shipping Provider Pattern Architecture

Implements:
  - ShippingConfigValidator
  - BaseShippingProvider (Abstract Interface)
  - OfflineShippingProvider (Simulation Mode)
  - DelhiverySandboxProvider (Staging API)
  - DelhiveryLiveProvider (Production API)
  - get_shipping_provider() (Factory with transparent fallback)

All providers expose identical methods:
  create_shipment() | track_shipment() | cancel_shipment() | schedule_pickup() | sync_tracking()
"""

import logging
from abc import ABC, abstractmethod
from datetime import date, timedelta
from django.conf import settings
from django.utils import timezone

from apps.orders.models import Order, OrderStatus
from .models import Shipment, ShipmentTrackingEvent, ShipmentStatus, PickupStatus
from .client import DelhiveryAPIClient, DelhiveryAPIError, DelhiveryValidationError

logger = logging.getLogger("faazo")


# ============================================================
# Status Mapping
# ============================================================

DELHIVERY_STATUS_MAP = {
    "Shipment Created":              ShipmentStatus.CREATED,
    "Manifest Created":              ShipmentStatus.CREATED,
    "Pickup Scheduled":              ShipmentStatus.PICKUP_SCHEDULED,
    "Pickup Requested":              ShipmentStatus.PICKUP_SCHEDULED,
    "Picked Up":                     ShipmentStatus.PICKED_UP,
    "In Transit":                    ShipmentStatus.IN_TRANSIT,
    "Reached at Destination Hub":    ShipmentStatus.REACHED_HUB,
    "Reached at Delivery Location":  ShipmentStatus.OUT_FOR_DELIVERY,
    "Out For Delivery":              ShipmentStatus.OUT_FOR_DELIVERY,
    "Delivered":                     ShipmentStatus.DELIVERED,
    "Failed Delivery":               ShipmentStatus.FAILED_DELIVERY,
    "Return To Origin":              ShipmentStatus.RTO_INITIATED,
    "RTO Initiated":                 ShipmentStatus.RTO_INITIATED,
    "RTO In Transit":                ShipmentStatus.RTO_IN_TRANSIT,
    "RTO Delivered":                 ShipmentStatus.RTO_DELIVERED,
    "Cancelled":                     ShipmentStatus.CANCELLED,
    "Lost":                          ShipmentStatus.LOST,
}


# ============================================================
# Configuration Validator
# ============================================================

class ShippingConfigValidator:
    """
    Validates shipping provider configuration before initialization.
    If required settings are missing, logs exact reasons and enables graceful offline fallback.
    """

    @staticmethod
    def validate_delhivery_config(provider_name: str) -> tuple[bool, list[str]]:
        reasons = []

        token = getattr(settings, "DELHIVERY_API_TOKEN", "") or getattr(settings, "DELHIVERY_TOKEN", "")
        if not token or not token.strip():
            reasons.append("DELHIVERY_API_TOKEN is not configured in environment settings.")

        pickup_loc = getattr(settings, "DELHIVERY_PICKUP_LOCATION", "")
        if not pickup_loc or not pickup_loc.strip():
            reasons.append("DELHIVERY_PICKUP_LOCATION is not configured.")

        seller_name = getattr(settings, "DELHIVERY_SELLER_NAME", "")
        if not seller_name or not seller_name.strip():
            reasons.append("DELHIVERY_SELLER_NAME is not configured.")

        phone = getattr(settings, "DELHIVERY_PHONE", "")
        if not phone or not phone.strip():
            reasons.append("DELHIVERY_PHONE is not configured.")

        base_url = (
            getattr(settings, "DELHIVERY_BASE_URL_SANDBOX", "")
            if provider_name == "sandbox"
            else getattr(settings, "DELHIVERY_BASE_URL_LIVE", "")
        )
        if not base_url or not base_url.strip():
            reasons.append(f"DELHIVERY_BASE_URL_{provider_name.upper()} is not configured.")

        is_valid = len(reasons) == 0
        return is_valid, reasons


# ============================================================
# Abstract Shipping Provider
# ============================================================

class BaseShippingProvider(ABC):
    """
    Unified Shipping Provider Interface.
    All providers (Offline, Sandbox, Live) implement these exact methods.
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
            raise DelhiveryValidationError(errors)

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
        """
        Creates or updates a simulated offline shipment.
        If existing_shipment is provided, updates that record instead of creating a new one.
        """
        # Idempotency: return existing if AWB already present
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
            # Update the pre-existing warehouse record
            shipment = existing_shipment
            shipment.provider = "offline"
            shipment.courier_name = "Delhivery (Offline Simulation)"
            shipment.delhivery_shipment_id = fake_awb
            shipment.awb_number = fake_awb
            shipment.tracking_number = fake_awb
            shipment.tracking_url = f"http://localhost:5173/orders/{order.id}"
            shipment.shipment_status = ShipmentStatus.CREATED
            shipment.pickup_status = PickupStatus.PENDING
            shipment.current_location = "FAAZO Central Warehouse, Mumbai"
            shipment.request_payload = {"mode": "offline", "order_number": order_ref, "package": package_info}
            shipment.response_payload = fake_raw
            shipment.raw_response = fake_raw
            shipment.request_timestamp = req_time
            shipment.response_timestamp = resp_time
            shipment.api_status_code = 200
            shipment.execution_time_ms = exec_ms
            shipment.last_synced_at = resp_time
            if created_by:
                shipment.created_by = created_by
            shipment.save()
        else:
            shipment = Shipment.objects.create(
                order=order,
                created_by=created_by,
                provider="offline",
                courier_name="Delhivery (Offline Simulation)",
                delhivery_shipment_id=fake_awb,
                awb_number=fake_awb,
                tracking_number=fake_awb,
                tracking_url=f"http://localhost:5173/orders/{order.id}",
                shipment_status=ShipmentStatus.CREATED,
                pickup_status=PickupStatus.PENDING,
                current_location="FAAZO Central Warehouse, Mumbai",
                request_payload={"mode": "offline", "order_number": order_ref, "package": package_info},
                response_payload=fake_raw,
                raw_response=fake_raw,
                request_timestamp=req_time,
                response_timestamp=resp_time,
                api_status_code=200,
                execution_time_ms=exec_ms,
                last_synced_at=resp_time,
            )

        # Create tracking event
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

    def track_shipment(self, shipment: Shipment) -> dict:
        return {
            "awb": shipment.awb_number,
            "status": shipment.get_shipment_status_display(),
            "location": shipment.current_location,
            "mode": "offline"
        }

    def cancel_shipment(self, shipment: Shipment, reason: str = "") -> dict:
        if not shipment.is_cancellable:
            raise DelhiveryAPIError(f"Cannot cancel shipment in status '{shipment.shipment_status}'.")
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
# Delhivery Sandbox Provider (Staging API)
# ============================================================

class DelhiverySandboxProvider(BaseShippingProvider):
    """
    Delhivery Sandbox Provider (Communicates with staging-express.delhivery.com).
    Uses DelhiveryAPIClient for transient retries, execution, and error handling.
    """

    def __init__(self, base_url: str = None, token: str = None):
        self.base_url = base_url or getattr(settings, "DELHIVERY_BASE_URL_SANDBOX", "https://staging-express.delhivery.com")
        self.token = token or getattr(settings, "DELHIVERY_API_TOKEN", "") or getattr(settings, "DELHIVERY_TOKEN", "")
        self.client_name = getattr(settings, "DELHIVERY_CLIENT_NAME", "FAAZO")
        self.pickup_location = getattr(settings, "DELHIVERY_PICKUP_LOCATION", "FAAZO Central Warehouse")
        self.seller_name = getattr(settings, "DELHIVERY_SELLER_NAME", "FAAZO Dental Solutions Pvt. Ltd.")
        self.provider_mode = "sandbox"
        self.client = DelhiveryAPIClient(self.base_url, self.token, self.client_name)

    def create_shipment(self, order: Order, package_info: dict, created_by=None, existing_shipment=None) -> Shipment:
        """
        Creates or updates a Delhivery courier shipment via the Sandbox API.
        If existing_shipment is provided, updates that warehouse record (no new DB row).
        """
        # Idempotency: return if AWB already present
        if existing_shipment and existing_shipment.awb_number:
            return existing_shipment

        self.validate_for_shipment(order, package_info)

        addr = order.shipping_address
        weight = package_info.get("weight", 0.5)
        length = package_info.get("length", 10)
        breadth = package_info.get("breadth", 10)
        height = package_info.get("height", 10)
        payment_mode = package_info.get("payment_mode", "Prepaid")
        cod_amount = float(order.total_amount) if payment_mode == "COD" else 0

        product_names = ", ".join([f"{item.product.name} x{item.quantity}" for item in order.items.all()])

        payload = {
            "shipments": [{
                "name": addr.full_name,
                "add": f"{addr.line1}{', ' + addr.line2 if addr.line2 else ''}",
                "city": addr.city,
                "state": addr.state,
                "country": "India",
                "pin": addr.pincode,
                "phone": addr.mobile,
                "order": str(order.order_number),
                "payment_mode": payment_mode,
                "return_pin": addr.pincode,
                "return_city": addr.city,
                "return_phone": addr.mobile,
                "return_add": f"{addr.line1}{', ' + addr.line2 if addr.line2 else ''}",
                "return_state": addr.state,
                "return_country": "India",
                "products_desc": product_names[:500],
                "hsn_code": "",
                "cod_amount": str(cod_amount),
                "order_date": order.created_at.strftime("%Y-%m-%dT%H:%M:%S"),
                "total_amount": str(float(order.total_amount)),
                "seller_name": self.seller_name,
                "seller_inv": order.invoice_number or "",
                "quantity": str(sum(item.quantity for item in order.items.all())),
                "weight": str(weight),
                "shipment_length": str(length),
                "shipment_width": str(breadth),
                "shipment_height": str(height),
                "shipping_mode": "Surface",
                "address_type": "home",
            }],
            "pickup_location": {"name": self.pickup_location},
        }

        req_time = timezone.now()
        try:
            res_data, status_code, exec_ms = self.client.create_shipment_api(payload)
            resp_time = timezone.now()

            packages = res_data.get("packages", [])
            pkg = packages[0] if packages else {}
            awb = pkg.get("waybill") or pkg.get("upload_wbn") or ""
            refnum = pkg.get("refnum") or str(order.order_number)
            is_success = pkg.get("status") in ["Success", "Created", "Manifested"] or bool(awb)

            if not is_success or not awb:
                errMsg = ", ".join(pkg.get("remarks", [])) or res_data.get("rmk") or "Delhivery API returned failure status."
                raise DelhiveryAPIError(f"Delhivery Shipment Creation Failed: {errMsg}", status_code=status_code, details=res_data)

            common_fields = dict(
                provider=self.provider_mode,
                courier_name=f"Delhivery ({self.provider_mode.title()})",
                delhivery_shipment_id=awb,
                external_shipment_id=refnum,
                awb_number=awb,
                tracking_number=awb,
                tracking_url=f"https://track.delhivery.com/tracking/{awb}",
                shipment_status=ShipmentStatus.CREATED,
                pickup_status=PickupStatus.PENDING,
                current_location="FAAZO Origin Facility",
                request_payload=payload,
                response_payload=res_data,
                raw_response=res_data,
                request_timestamp=req_time,
                response_timestamp=resp_time,
                api_status_code=status_code,
                execution_time_ms=exec_ms,
                last_synced_at=resp_time,
            )

            if existing_shipment:
                # Update the pre-existing warehouse record
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
                event_label=f"Shipment Manifested ({self.provider_mode.title()} API)",
                status_mapped=ShipmentStatus.CREATED,
                event_timestamp=req_time,
                location="Delhivery Staging Network",
                description=f"Shipment registered with Delhivery. AWB: {awb}",
                event_source="api_poll"
            )

            logger.info("[%s_PROVIDER] Shipment created for order %s (AWB: %s)", self.provider_mode.upper(), order.order_number, awb)
            return shipment

        except (DelhiveryAPIError, DelhiveryValidationError) as err:
            logger.error("[%s_PROVIDER_ERROR] %s", self.provider_mode.upper(), str(err))
            raise err


# ============================================================
# Delhivery Live Provider (Production API)
# ============================================================

class DelhiveryLiveProvider(DelhiverySandboxProvider):
    """
    Delhivery Live Provider (Communicates with express.delhivery.com).
    Subclasses Sandbox provider with production base_url.
    """

    def __init__(self, base_url: str = None, token: str = None):
        live_base = base_url or getattr(settings, "DELHIVERY_BASE_URL_LIVE", "https://express.delhivery.com")
        super().__init__(base_url=live_base, token=token)
        self.provider_mode = "live"


# ============================================================
# Provider Factory
# ============================================================

def get_shipping_provider() -> BaseShippingProvider:
    """
    Factory function instantiating active Shipping Provider based on settings.SHIPPING_PROVIDER.
    Validates configuration first; gracefully falls back to OfflineShippingProvider if misconfigured.
    """
    provider_name = getattr(settings, "SHIPPING_PROVIDER", "offline").lower().strip()

    if provider_name in ["sandbox", "live"]:
        is_valid, reasons = ShippingConfigValidator.validate_delhivery_config(provider_name)
        if not is_valid:
            logger.warning(
                "[SHIPPING_PROVIDER_FALLBACK] Requested Provider: %s | Reasons: %s | Fallback: Offline Provider Activated.",
                provider_name.upper(), " | ".join(reasons)
            )
            return OfflineShippingProvider()

        if provider_name == "sandbox":
            return DelhiverySandboxProvider()
        else:
            return DelhiveryLiveProvider()

    # Default offline mode
    logger.info("[SHIPPING_PROVIDER_ACTIVE] Offline Shipping Provider Activated.")
    return OfflineShippingProvider()
