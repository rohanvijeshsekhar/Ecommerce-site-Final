"""
FAAZO – Cash on Delivery (COD) Calculation & Policy Engine

Authoritative server-side COD business logic:
- Calculates dynamic COD collection fee based strictly on final selling price (after discounts, NOT MRP).
- Enforces configurable fee policies: percentage, minimum floor, maximum ceiling.
- Validates COD eligibility and courier serviceability.
- Strictly separates customer collection fee from Shiprocket internal logistics charges.
"""

from decimal import Decimal, ROUND_HALF_UP
import logging
from django.conf import settings

logger = logging.getLogger("faazo.checkout.cod")


def calculate_cod_fee(selling_subtotal: Decimal) -> Decimal:
    """
    Calculates the FAAZO customer-facing COD collection fee.
    
    Rule:
      Calculated from final applicable SELLING PRICE (not MRP).
      effective_fee = max(percentage_fee, configured_minimum_fee)
      Optionally capped by configured_maximum_fee.
    """
    if not getattr(settings, "COD_ENABLED", True):
        return Decimal("0.00")

    subtotal = Decimal(str(selling_subtotal))
    if subtotal <= Decimal("0.00"):
        return Decimal("0.00")

    fee_type = getattr(settings, "COD_FEE_TYPE", "percentage").lower()
    min_fee = Decimal(str(getattr(settings, "COD_MINIMUM_FEE", "49.00")))
    max_fee = getattr(settings, "COD_MAXIMUM_FEE", None)
    if max_fee is not None:
        max_fee = Decimal(str(max_fee))

    if fee_type == "fixed":
        fee = min_fee
    else:
        pct = Decimal(str(getattr(settings, "COD_PERCENTAGE", "0.02")))
        pct_fee = (subtotal * pct).quantize(Decimal("1.00"), rounding=ROUND_HALF_UP)
        fee = max(pct_fee, min_fee)

    if max_fee is not None and fee > max_fee:
        fee = max_fee

    return fee.quantize(Decimal("1.00"), rounding=ROUND_HALF_UP)


def check_cod_eligibility(order_total: Decimal, address=None) -> tuple[bool, str]:
    """
    Validates whether the customer and order are eligible for Cash on Delivery.
    
    Returns:
        tuple (is_eligible: bool, reason: str)
    """
    if not getattr(settings, "COD_ENABLED", True):
        return False, "Cash on Delivery is currently disabled."

    max_order_val = getattr(settings, "COD_MAX_ORDER_VALUE", None)
    if max_order_val is not None:
        max_order_val = Decimal(str(max_order_val))
        if Decimal(str(order_total)) > max_order_val:
            return False, f"Cash on Delivery is only available for orders up to ₹{max_order_val:,.0f}."

    if address and getattr(address, "pincode", None):
        try:
            from apps.shipping.pincode_service import PincodeServiceabilityEngine
            srv = PincodeServiceabilityEngine.check(
                destination_pincode=address.pincode,
                cod=True
            )
            if not srv.get("is_serviceable", False):
                return False, srv.get("message", "Cash on Delivery is not available for this delivery pincode.")
        except Exception as err:
            logger.warning("[COD_ELIGIBILITY] Pincode serviceability check error: %s", err)
            # Fail-safe: do not block if courier API check encounters transient error
            pass

    return True, ""
