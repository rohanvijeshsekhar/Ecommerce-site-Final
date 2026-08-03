"""
FAAZO – Enterprise Shipping Cost Calculation Engine

Calculates dynamic shipping costs, volumetric weights, shipping zone rules, COD surcharges,
and free shipping thresholds.
"""

from decimal import Decimal
from typing import Dict, Any
from django.conf import settings


class ShippingCostCalculator:
    """
    Enterprise Shipping Cost Engine supporting:
      - Actual vs Volumetric weight calculation
      - Zone-based freight charges (Intra-city, Intra-state, Metro, National)
      - Dynamic COD collection fees
      - Minimum Order Value for Free Shipping rules
    """

    VOLUMETRIC_DIVISOR = 5000.0 # Standard logistics divisor: (L * W * H) / 5000
    DEFAULT_FREE_SHIPPING_THRESHOLD = Decimal("999.00")
    DEFAULT_FLAT_RATE = Decimal("70.00")
    DEFAULT_COD_FEE = Decimal("40.00")

    @classmethod
    def calculate_volumetric_weight(cls, length_cm: float, width_cm: float, height_cm: float) -> float:
        """Returns volumetric weight in kilograms."""
        if length_cm <= 0 or width_cm <= 0 or height_cm <= 0:
            return 0.0
        return round((length_cm * width_cm * height_cm) / cls.VOLUMETRIC_DIVISOR, 2)

    @classmethod
    def determine_zone(cls, origin_pincode: str, destination_pincode: str) -> str:
        """
        Determines Indian logistics zone:
          - ZONE_A: Intra-city (same 3-digit prefix)
          - ZONE_B: Intra-state (same 2-digit prefix)
          - ZONE_C: Metro-to-Metro
          - ZONE_D: Rest of India
        """
        orig = str(origin_pincode).strip()
        dest = str(destination_pincode).strip()

        if not orig or not dest or len(orig) != 6 or len(dest) != 6:
            return "ZONE_D"

        if orig[:3] == dest[:3]:
            return "ZONE_A"
        elif orig[:2] == dest[:2]:
            return "ZONE_B"

        metro_prefixes = ("11", "20", "40", "56", "60", "70", "50", "38")
        if orig.startswith(metro_prefixes) and dest.startswith(metro_prefixes):
            return "ZONE_C"

        return "ZONE_D"

    @classmethod
    def calculate_cost(
        cls,
        order_subtotal: Decimal,
        weight_kg: float = 1.0,
        length_cm: float = 10.0,
        width_cm: float = 10.0,
        height_cm: float = 10.0,
        origin_pincode: str = "400001",
        destination_pincode: str = "110001",
        is_cod: bool = False,
    ) -> Dict[str, Any]:
        """
        Computes final shipping fee & breakdown.
        """
        subtotal = Decimal(str(order_subtotal))
        free_threshold = getattr(settings, "FREE_SHIPPING_THRESHOLD", cls.DEFAULT_FREE_SHIPPING_THRESHOLD)

        # Weight calculation
        vol_weight = cls.calculate_volumetric_weight(length_cm, width_cm, height_cm)
        chargeable_weight = max(float(weight_kg), vol_weight, 0.5)

        # Zone & base rate
        zone = cls.determine_zone(origin_pincode, destination_pincode)
        zone_base_rates = {
            "ZONE_A": Decimal("40.00"),
            "ZONE_B": Decimal("60.00"),
            "ZONE_C": Decimal("80.00"),
            "ZONE_D": Decimal("110.00"),
        }
        base_rate = zone_base_rates.get(zone, Decimal("100.00"))
        weight_multiplier = Decimal(str(max(1.0, chargeable_weight)))
        freight_charge = round(base_rate * weight_multiplier, 2)

        # Free shipping rule check
        is_free_shipping = subtotal >= free_threshold
        final_freight = Decimal("0.00") if is_free_shipping else freight_charge

        # COD Fee check
        cod_fee = Decimal("0.00")
        if is_cod:
            cod_fee = getattr(settings, "COD_SURCHARGE_FEE", cls.DEFAULT_COD_FEE)

        total_shipping_fee = final_freight + cod_fee

        return {
            "order_subtotal": float(subtotal),
            "free_shipping_threshold": float(free_threshold),
            "is_free_shipping": is_free_shipping,
            "actual_weight_kg": float(weight_kg),
            "volumetric_weight_kg": vol_weight,
            "chargeable_weight_kg": chargeable_weight,
            "zone": zone,
            "freight_charge": float(freight_charge),
            "applied_freight_charge": float(final_freight),
            "cod_fee": float(cod_fee),
            "total_shipping_fee": float(total_shipping_fee),
        }
