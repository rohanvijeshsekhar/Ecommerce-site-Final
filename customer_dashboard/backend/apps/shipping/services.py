"""
FAAZO – Shipping Service Layer & Enterprise Facade

Acts as a backward-compatible facade delegating operations to the active provider
(Offline or Shiprocket) obtained via get_shipping_provider(). Integrates cleanly with
NotificationService and provides enterprise failure recovery & retry workflows.
"""

import logging
from datetime import date
from django.utils import timezone
from apps.orders.models import Order
from .models import Shipment, ShipmentStatus, PickupStatus
from .shiprocket_client import ShiprocketAPIError, ShiprocketValidationError, DelhiveryAPIError, DelhiveryValidationError
from .providers import get_shipping_provider, BaseShippingProvider, SHIPROCKET_STATUS_MAP, ShippingConfigValidator

logger = logging.getLogger("faazo.shipping")


def dispatch_shipment_notification(shipment: Shipment, event_type: str = None) -> None:
    """
    Integrates Shipment Module directly with Centralized NotificationService.
    Publishes real-time notifications across In-App, SMS, and Email channels.
    """
    try:
        from apps.notifications.services.notification_service import NotificationService
        from apps.notifications.models import NotificationType

        status_type_map = {
            ShipmentStatus.CREATED: NotificationType.ORDER_PACKED,
            ShipmentStatus.PICKUP_SCHEDULED: NotificationType.ORDER_PACKED,
            ShipmentStatus.PICKED_UP: NotificationType.ORDER_SHIPPED,
            ShipmentStatus.IN_TRANSIT: NotificationType.ORDER_SHIPPED,
            ShipmentStatus.OUT_FOR_DELIVERY: NotificationType.OUT_FOR_DELIVERY,
            ShipmentStatus.DELIVERED: NotificationType.ORDER_DELIVERED,
            ShipmentStatus.FAILED_DELIVERY: NotificationType.ORDER_SHIPPED,
            ShipmentStatus.RTO_INITIATED: NotificationType.ORDER_SHIPPED,
            ShipmentStatus.CANCELLED: NotificationType.ORDER_CANCELLED,
        }

        notif_type = status_type_map.get(shipment.shipment_status, NotificationType.ORDER_SHIPPED)
        user = shipment.order.user

        title = f"Shipment Update for Order #{shipment.order.order_number}"
        body = f"Your shipment ({shipment.courier_name} - AWB: {shipment.awb_number or 'Assigned'}) is currently: {shipment.get_shipment_status_display()}."

        if shipment.current_location:
            body += f" Current location: {shipment.current_location}."

        NotificationService.create(
            user=user,
            notification_type=notif_type,
            title=title,
            message=body,
            metadata={
                "order_id": str(shipment.order.id),
                "shipment_id": str(shipment.id),
                "shipment_number": shipment.shipment_number,
                "awb_number": shipment.awb_number,
                "courier_name": shipment.courier_name,
                "status": shipment.shipment_status,
                "current_location": shipment.current_location,
                "tracking_url": shipment.tracking_url,
            },
        )
        logger.info("Dispatched notification for shipment %s (Status: %s)", shipment.shipment_number, shipment.shipment_status)
    except Exception as exc:
        logger.warning("Notification Service dispatch skipped or encountered non-fatal error: %s", exc)


class ShiprocketService:
    """
    Service layer delegating logistics operations (validate, create, track, cancel, pickup, sync, label, manifest)
    to the active Shipping Provider (Offline or Shiprocket) with retry capabilities & failure recovery.
    """

    def __init__(self):
        self.provider: BaseShippingProvider = get_shipping_provider()

    def validate_for_shipment(self, order: Order, package_info: dict) -> None:
        return self.provider.validate_for_shipment(order, package_info)

    def create_shipment(self, order: Order, package_info: dict, created_by=None, existing_shipment=None) -> Shipment:
        try:
            shipment = self.provider.create_shipment(order, package_info, created_by=created_by, existing_shipment=existing_shipment)
            # Reset failure flags on successful creation
            shipment.failure_reason = ""
            shipment.last_error_code = ""
            shipment.save(update_fields=["failure_reason", "last_error_code"])
            dispatch_shipment_notification(shipment, event_type="created")
            return shipment
        except (ShiprocketAPIError, ShiprocketValidationError, Exception) as exc:
            error_code = getattr(exc, "error_code", "SHIPMENT_CREATION_FAILED")
            error_msg = str(exc)

            if existing_shipment:
                existing_shipment.failure_reason = error_msg
                existing_shipment.last_error_code = error_code
                existing_shipment.retry_count += 1
                if existing_shipment.retry_count >= 5:
                    existing_shipment.max_retries_exceeded = True
                existing_shipment.save(update_fields=["failure_reason", "last_error_code", "retry_count", "max_retries_exceeded"])
            raise

    def generate_label(self, shipment: Shipment) -> dict:
        if hasattr(self.provider, "generate_label"):
            res = self.provider.generate_label(shipment)
            return res
        return {"label_url": shipment.label_url, "awb": shipment.awb_number}

    def generate_manifest(self, shipment: Shipment) -> dict:
        if hasattr(self.provider, "generate_manifest"):
            res = self.provider.generate_manifest(shipment)
            return res
        return {"manifest_url": shipment.manifest_url, "shipment_number": shipment.shipment_number}

    def track_shipment(self, shipment: Shipment) -> dict:
        return self.provider.track_shipment(shipment)

    def cancel_shipment(self, shipment: Shipment, reason: str = "") -> dict:
        res = self.provider.cancel_shipment(shipment, reason=reason)
        dispatch_shipment_notification(shipment, event_type="cancelled")
        return res

    def schedule_pickup(self, shipment: Shipment, pickup_date: date = None) -> dict:
        res = self.provider.schedule_pickup(shipment, pickup_date=pickup_date)
        dispatch_shipment_notification(shipment, event_type="pickup_scheduled")
        return res

    def sync_tracking(self, shipment: Shipment) -> Shipment:
        prev_status = shipment.shipment_status
        updated_shipment = self.provider.sync_tracking(shipment)
        if prev_status != updated_shipment.shipment_status:
            dispatch_shipment_notification(updated_shipment, event_type="status_changed")
        return updated_shipment

    def retry_failed_shipment(self, shipment: Shipment, action: str = "create_courier") -> dict:
        """
        Enterprise 1-click failure recovery action for warehouse managers.
        Retries failed API creation, pickup, label, or manifest steps without database editing.
        """
        shipment.retry_count += 1
        shipment.save(update_fields=["retry_count"])

        package_info = {
            "weight": float(shipment.weight),
            "length": float(shipment.length),
            "breadth": float(shipment.width),
            "height": float(shipment.height),
            "declared_value": float(getattr(shipment, "declared_value", 1000.0)),
        }

        try:
            if action == "create_courier":
                res_shipment = self.create_shipment(shipment.order, package_info, existing_shipment=shipment)
                return {"success": True, "message": "Courier shipment recreated successfully.", "shipment_id": str(res_shipment.id)}
            elif action == "schedule_pickup":
                res = self.schedule_pickup(shipment)
                return {"success": True, "message": "Pickup scheduled successfully.", "data": res}
            elif action == "generate_label":
                res = self.generate_label(shipment)
                return {"success": True, "message": "Label regenerated successfully.", "data": res}
            elif action == "generate_manifest":
                res = self.generate_manifest(shipment)
                return {"success": True, "message": "Manifest regenerated successfully.", "data": res}
            else:
                raise ValueError(f"Unknown retry action: {action}")
        except Exception as exc:
            shipment.failure_reason = str(exc)
            shipment.last_error_code = getattr(exc, "error_code", "RETRY_FAILED")
            shipment.save(update_fields=["failure_reason", "last_error_code"])
            return {"success": False, "message": f"Retry failed: {str(exc)}", "error_code": shipment.last_error_code}


# Aliases for clean backward compatibility
ShippingService = ShiprocketService
DelhiveryService = ShiprocketService
