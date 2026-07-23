"""
FAAZO – Shipping Service Layer

Acts as a backward-compatible facade delegating operations to the active provider
(Offline, Sandbox, or Live) obtained via get_shipping_provider().
"""

import logging
from datetime import date
from apps.orders.models import Order
from .models import Shipment
from .client import DelhiveryAPIError, DelhiveryValidationError
from .providers import get_shipping_provider, BaseShippingProvider, DELHIVERY_STATUS_MAP, ShippingConfigValidator

logger = logging.getLogger("faazo")


class DelhiveryService:
    """
    Facade class maintaining backward compatibility for existing view calls.
    Delegates all operations (validate, create, track, cancel, pickup, sync)
    to the active Shipping Provider (Offline, Sandbox, or Live).
    """

    def __init__(self):
        self.provider: BaseShippingProvider = get_shipping_provider()

    def validate_for_shipment(self, order: Order, package_info: dict) -> None:
        return self.provider.validate_for_shipment(order, package_info)

    def create_shipment(self, order: Order, package_info: dict, created_by=None, existing_shipment=None) -> Shipment:
        return self.provider.create_shipment(order, package_info, created_by=created_by, existing_shipment=existing_shipment)

    def track_shipment(self, shipment: Shipment) -> dict:
        return self.provider.track_shipment(shipment)

    def cancel_shipment(self, shipment: Shipment, reason: str = "") -> dict:
        return self.provider.cancel_shipment(shipment, reason=reason)

    def schedule_pickup(self, shipment: Shipment, pickup_date: date = None) -> dict:
        return self.provider.schedule_pickup(shipment, pickup_date=pickup_date)

    def sync_tracking(self, shipment: Shipment) -> Shipment:
        return self.provider.sync_tracking(shipment)
