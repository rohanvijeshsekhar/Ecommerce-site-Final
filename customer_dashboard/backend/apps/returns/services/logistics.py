"""
FAAZO – Return Shipping & Reverse Logistics Service

Provides provider abstraction for reverse logistics:
- ShiprocketReturnShippingProvider: Calls Shiprocket return pickup API when configured.
- OfflineReturnShippingProvider: Simulates reverse logistics for local dev/testing.
- Updates ReturnShipment and transitions ReturnRequest status to PICKUP_SCHEDULED.
"""

import logging
import uuid
from typing import Dict, Any
from django.utils import timezone
from django.db import transaction

from apps.shipping.providers import get_shipping_provider, ShippingConfigValidator
from apps.returns.models import (
    ReturnRequest,
    ReturnShipment,
    ReturnPickupStatus,
    ReturnStatus,
)
from apps.returns.services.state_machine import ReturnStateMachineService

logger = logging.getLogger("faazo.returns")


class OfflineReturnShippingProvider:
    """Simulated reverse logistics provider for offline dev/testing."""

    @classmethod
    def schedule_pickup(cls, return_request: ReturnRequest) -> Dict[str, Any]:
        awb_number = f"RETFAAZO{timezone.now().strftime('%Y%m')}{uuid.uuid4().hex[:6].upper()}"
        tracking_url = f"https://faazo.com/track/return/{awb_number}"

        logger.info(f"[OfflineReturnShippingProvider] Simulating return pickup for Return {return_request.id} (AWB: {awb_number}).")

        return {
            "status": "scheduled",
            "provider": "Offline Simulated Reverse Logistics",
            "courier_name": "Delhivery Reverse Express (Simulated)",
            "awb_number": awb_number,
            "tracking_url": tracking_url,
            "pickup_scheduled_date": timezone.now() + timezone.timedelta(days=1),
        }


class ShiprocketReturnShippingProvider:
    """Production Shiprocket Reverse Logistics Provider."""

    @classmethod
    def schedule_pickup(cls, return_request: ReturnRequest) -> Dict[str, Any]:
        is_valid, reasons = ShippingConfigValidator.validate_shiprocket_config()
        if not is_valid:
            logger.warning(f"[ShiprocketReturnShipping] Credentials unverified ({reasons}). Falling back to Offline simulation.")
            res = OfflineReturnShippingProvider.schedule_pickup(return_request)
            res["provider"] = "Offline Fallback (Shiprocket Unconfigured)"
            res["verification_note"] = "REQUIRES CLIENT SHIPROCKET ACCOUNT VERIFICATION"
            return res

        # If Shiprocket is configured, call provider client
        try:
            provider = get_shipping_provider()
            # If provider supports create_return_order
            if hasattr(provider, "create_return_order"):
                ret_res = provider.create_return_order(return_request)
                return {
                    "status": "scheduled",
                    "provider": "Shiprocket Reverse",
                    "courier_name": ret_res.get("courier_name", "Shiprocket Return"),
                    "awb_number": ret_res.get("awb_code"),
                    "tracking_url": ret_res.get("tracking_url"),
                    "pickup_scheduled_date": timezone.now() + timezone.timedelta(days=1),
                }
            else:
                logger.info("[ShiprocketReturnShipping] Return pickup API not present on active provider facade. Using simulated reverse dispatch.")
                res = OfflineReturnShippingProvider.schedule_pickup(return_request)
                res["verification_note"] = "REQUIRES CLIENT SHIPROCKET ACCOUNT VERIFICATION"
                return res

        except Exception as exc:
            logger.error(f"[ShiprocketReturnShipping] Error scheduling return pickup: {exc}", exc_info=True)
            res = OfflineReturnShippingProvider.schedule_pickup(return_request)
            res["error"] = str(exc)
            return res


class ReturnShippingService:
    """
    Main Return Logistics Service Facade.
    """

    @classmethod
    def schedule_return_pickup(cls, return_request_id: str, actor=None) -> Dict[str, Any]:
        """
        Schedules a courier return pickup for a ReturnRequest.
        """
        with transaction.atomic():
            return_req = ReturnRequest.objects.select_for_update().get(pk=return_request_id)

            # Delegate to return provider
            provider_res = ShiprocketReturnShippingProvider.schedule_pickup(return_req)

            shipment, _ = ReturnShipment.objects.get_or_create(
                return_request=return_req,
                defaults={
                    "courier_name": provider_res.get("courier_name", "Delhivery Return"),
                    "awb_number": provider_res.get("awb_number"),
                    "pickup_status": ReturnPickupStatus.SCHEDULED,
                    "pickup_scheduled_date": provider_res.get("pickup_scheduled_date"),
                    "tracking_url": provider_res.get("tracking_url"),
                    "provider_response": provider_res,
                },
            )

            if shipment.pickup_status != ReturnPickupStatus.SCHEDULED:
                shipment.pickup_status = ReturnPickupStatus.SCHEDULED
                shipment.awb_number = provider_res.get("awb_number")
                shipment.tracking_url = provider_res.get("tracking_url")
                shipment.provider_response = provider_res
                shipment.save()

            # Transition ReturnRequest state to PICKUP_SCHEDULED
            ReturnStateMachineService.transition_to(
                return_request_id=str(return_req.id),
                target_status=ReturnStatus.PICKUP_SCHEDULED,
                actor=actor,
                notes=f"Return pickup scheduled via {shipment.courier_name} (AWB: {shipment.awb_number})",
            )

            logger.info(f"[ReturnShippingService] Scheduled return pickup for Return {return_request_id} (AWB: {shipment.awb_number}).")
            return {
                "status": "scheduled",
                "return_id": str(return_req.id),
                "awb_number": shipment.awb_number,
                "courier_name": shipment.courier_name,
                "tracking_url": shipment.tracking_url,
                "verification_note": provider_res.get("verification_note", ""),
            }
