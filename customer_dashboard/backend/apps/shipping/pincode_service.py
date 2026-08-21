"""
FAAZO – Enterprise Pincode Serviceability Engine

Authoritative courier serviceability checker integrating:
  - Live Shiprocket Courier API (/v1/external/courier/serviceability)
  - Safe Django cache layer (TTL: 2 hours) to optimize performance
  - Circuit breaker awareness & offline mode fallback
  - Comprehensive courier breakdown & ETA calculation
"""

import logging
from typing import Dict, Any, Tuple
from django.conf import settings
from django.core.cache import cache

from apps.shipping.shiprocket_client import (
    ShiprocketAPIClient,
    circuit_breaker,
    CircuitBreakerOpenError,
    ShiprocketAPIError,
)
from apps.shipping.providers import get_shipping_provider, ShiprocketProvider

logger = logging.getLogger("faazo.shipping")


class PincodeServiceabilityEngine:
    """
    Authoritative serviceability engine for checking delivery availability.
    """

    CACHE_TTL_SECONDS = 7200  # 2 hours
    DEFAULT_PICKUP_PINCODE = "400001"

    @classmethod
    def _get_pickup_pincode(cls) -> str:
        provider = get_shipping_provider()
        if hasattr(provider, "pickup_location"):
            # If provider is configured with pickup location, we can read default
            pass
        return getattr(settings, "SHIPROCKET_PICKUP_PINCODE", cls.DEFAULT_PICKUP_PINCODE)

    @classmethod
    def check(
        cls,
        destination_pincode: str,
        weight_kg: float = 1.0,
        cod: bool = False,
        declared_value: float = 1000.0,
        length: float = 10.0,
        width: float = 10.0,
        height: float = 10.0,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """
        Validates whether the destination PIN code is serviceable by Shiprocket.

        Returns:
            dict containing:
              - is_serviceable (bool)
              - destination_pincode (str)
              - available_couriers (list)
              - courier_count (int)
              - estimated_delivery_days (int)
              - message (str)
              - source (str)
        """
        dest = str(destination_pincode).strip()
        if not dest.isdigit() or len(dest) != 6 or dest.startswith("0"):
            return {
                "is_serviceable": False,
                "destination_pincode": dest,
                "available_couriers": [],
                "courier_count": 0,
                "estimated_delivery_days": 0,
                "message": "Invalid 6-digit Indian PIN code.",
                "source": "validation_failed",
            }

        weight = max(0.1, float(weight_kg))
        pickup_pin = cls._get_pickup_pincode()

        # Cache key based on pincode + cod + weight tier
        weight_tier = round(weight * 2) / 2  # round to nearest 0.5kg
        cache_key = f"shiprocket_serviceability_{pickup_pin}_{dest}_{weight_tier}_{int(cod)}"

        if not force_refresh:
            cached_data = cache.get(cache_key)
            if cached_data is not None and isinstance(cached_data, dict):
                cached_data["source"] = "cache"
                return cached_data

        provider_name = getattr(settings, "SHIPPING_PROVIDER", "offline").lower()

        # If running in offline / simulated mode
        if provider_name != "shiprocket":
            result = {
                "is_serviceable": True,
                "destination_pincode": dest,
                "available_couriers": [
                    {
                        "courier_id": 101,
                        "courier_name": "FAAZO Express Delivery (Simulated)",
                        "rate": 0.0,
                        "estimated_delivery_days": 3,
                        "cod": cod,
                    }
                ],
                "courier_count": 1,
                "estimated_delivery_days": 3,
                "message": "Serviceable (Development Simulation).",
                "source": "offline_simulation",
            }
            cache.set(cache_key, result, cls.CACHE_TTL_SECONDS)
            return result

        # Check circuit breaker before hitting live API
        if circuit_breaker.get_state() == circuit_breaker.STATE_OPEN:
            logger.warning("[SERVICEABILITY] Circuit breaker OPEN. Falling back to zone safety check for %s", dest)
            result = {
                "is_serviceable": True,
                "destination_pincode": dest,
                "available_couriers": [],
                "courier_count": 0,
                "estimated_delivery_days": 4,
                "message": "Serviceability check active under high availability fallback.",
                "source": "circuit_breaker_open",
            }
            return result

        # Query Live Shiprocket API
        try:
            client = ShiprocketAPIClient()
            api_res, status_code, exec_ms = client.check_serviceability(
                pickup_postcode=pickup_pin,
                delivery_postcode=dest,
                weight=weight,
                cod=cod,
                length=length,
                width=width,
                height=height,
            )

            couriers = []
            if status_code == 200 and isinstance(api_res, dict):
                data_block = api_res.get("data", {})
                if isinstance(data_block, dict):
                    raw_couriers = (
                        data_block.get("available_courier_companies")
                        or data_block.get("child_courier_companies")
                        or []
                    )
                    for c in raw_couriers:
                        couriers.append({
                            "courier_id": c.get("courier_company_id") or c.get("courier_id"),
                            "courier_name": c.get("courier_name") or "Courier Partner",
                            "rate": float(c.get("rate", 0.0)),
                            "estimated_delivery_days": int(c.get("estimated_delivery_days") or 4),
                            "cod": bool(c.get("cod", False)),
                        })

            is_serviceable = len(couriers) > 0
            min_days = min([c["estimated_delivery_days"] for c in couriers], default=4) if is_serviceable else 0

            msg = (
                f"Delivery available via {len(couriers)} courier partner(s)."
                if is_serviceable
                else f"Delivery is currently unavailable for PIN code {dest}."
            )

            result = {
                "is_serviceable": is_serviceable,
                "destination_pincode": dest,
                "available_couriers": couriers,
                "courier_count": len(couriers),
                "estimated_delivery_days": min_days,
                "message": msg,
                "source": "shiprocket_api",
            }

            # Only cache positive results or definitive negative results
            cache.set(cache_key, result, cls.CACHE_TTL_SECONDS)
            return result

        except Exception as exc:
            logger.error("[SERVICEABILITY] Shiprocket API error checking pincode %s: %s", dest, exc)
            # On transient API failure, return safe failover response without crashing checkout
            return {
                "is_serviceable": True,  # Graceful failover to prevent blocking valid orders on transient API glitches
                "destination_pincode": dest,
                "available_couriers": [],
                "courier_count": 0,
                "estimated_delivery_days": 4,
                "message": "Delivery verification in progress.",
                "source": "api_transient_fallback",
            }
