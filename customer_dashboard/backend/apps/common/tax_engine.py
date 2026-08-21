"""
FAAZO - Central Tax Engine
===========================

All prices on FAAZO are GST-INCLUSIVE.

When an admin enters Rs.1,180 as the selling price, the customer pays Rs.1,180.
GST is EXTRACTED from that price -- never added on top.

Formula (18% GST-inclusive):
    taxable_value = inclusive_price / (1 + gst_rate / 100)
    gst_amount    = inclusive_price - taxable_value

    Rs.1,180 -> taxable Rs.1,000 + GST Rs.180 = TOTAL Rs.1,180  OK

Intra-state (seller state == buyer state):
    CGST = gst_amount / 2
    SGST = gst_amount / 2

Inter-state (seller state != buyer state):
    IGST = gst_amount

Rules:
- Decimal ONLY. No floats.
- Rounding via ROUND_HALF_UP at final output stage only.
- Intermediate calculations carry full Decimal precision.
"""

from decimal import Decimal, ROUND_HALF_UP

PAISE = Decimal("0.01")   # Monetary precision: 2 decimal places


def extract_gst_from_inclusive(
    inclusive_price,
    gst_rate,
    quantity,
    is_intra_state,
):
    """
    Given a GST-INCLUSIVE price and a GST rate, extract the tax component.

    Args:
        inclusive_price: The admin-entered final price per unit (Decimal, e.g. Decimal("1180.00"))
        gst_rate:        GST slab as a percentage (Decimal, e.g. Decimal("18.00"))
        quantity:        Number of units (int)
        is_intra_state:  True -> CGST+SGST split; False -> IGST

    Returns:
        dict with full breakdown.

    Examples:
        extract_gst_from_inclusive(Decimal("1180"), Decimal("18"), 1, True)
        # taxable_value_per_unit=1000.00, cgst=90.00, sgst=90.00, total_gst=180.00
    """
    inclusive_price = Decimal(str(inclusive_price))
    gst_rate = Decimal(str(gst_rate))
    quantity = int(quantity)

    divisor = Decimal("1") + (gst_rate / Decimal("100"))

    # Per-unit taxable value - keep full precision during intermediate steps
    taxable_per_unit_raw = inclusive_price / divisor
    taxable_per_unit = taxable_per_unit_raw.quantize(PAISE, rounding=ROUND_HALF_UP)

    # Per-unit GST = inclusive_price - taxable_per_unit
    gst_per_unit = inclusive_price - taxable_per_unit

    # Aggregate for this line
    taxable_subtotal = (taxable_per_unit * quantity).quantize(PAISE, rounding=ROUND_HALF_UP)
    gst_subtotal = (gst_per_unit * quantity).quantize(PAISE, rounding=ROUND_HALF_UP)
    line_total = (inclusive_price * quantity).quantize(PAISE, rounding=ROUND_HALF_UP)

    # Verify: line_total must equal taxable + gst (absorb rounding in gst)
    derived_total = taxable_subtotal + gst_subtotal
    if derived_total != line_total:
        gst_subtotal = line_total - taxable_subtotal

    # Split GST
    if is_intra_state:
        cgst = (gst_subtotal / Decimal("2")).quantize(PAISE, rounding=ROUND_HALF_UP)
        sgst = gst_subtotal - cgst  # sgst absorbs any Rs.0.01 rounding
        igst = Decimal("0.00")
    else:
        cgst = Decimal("0.00")
        sgst = Decimal("0.00")
        igst = gst_subtotal

    return {
        "quantity": quantity,
        "unit_price_inclusive": inclusive_price,
        "gst_rate": gst_rate,
        "taxable_value_per_unit": taxable_per_unit,
        "taxable_subtotal": taxable_subtotal,
        "gst_subtotal": gst_subtotal,
        "cgst_amount": cgst,
        "sgst_amount": sgst,
        "igst_amount": igst,
        "total_gst_amount": gst_subtotal,
        "line_total": line_total,
        "is_intra_state": is_intra_state,
    }


def calculate_order_tax_summary(line_items, shipping_fee, is_intra_state, discount_amount=Decimal("0.00")):
    """
    Aggregate tax summary for all line items in an order.

    Args:
        line_items: list of dicts, each with:
            - "inclusive_price": Decimal (GST-inclusive unit price)
            - "gst_rate": Decimal (e.g. Decimal("18.00"))
            - "quantity": int
        shipping_fee: Decimal
        is_intra_state: bool
        discount_amount: Decimal (order-level coupon or additional discount)

    Returns:
        dict with selling_subtotal, taxable_subtotal, total_cgst, total_sgst,
              total_igst, total_gst, shipping_fee, discount_amount, total_amount, is_intra_state
    """
    gross_selling_subtotal = Decimal("0.00")
    for item in line_items:
        inc_p = Decimal(str(item["inclusive_price"]))
        qty = int(item["quantity"])
        gross_selling_subtotal += inc_p * qty

    discount_d = Decimal(str(discount_amount)).quantize(PAISE, rounding=ROUND_HALF_UP)
    if discount_d > gross_selling_subtotal:
        discount_d = gross_selling_subtotal

    net_selling_subtotal = gross_selling_subtotal - discount_d

    taxable_subtotal = Decimal("0.00")
    total_cgst = Decimal("0.00")
    total_sgst = Decimal("0.00")
    total_igst = Decimal("0.00")
    line_breakdowns = []

    for item in line_items:
        inc_p = Decimal(str(item["inclusive_price"]))
        gst_rate = Decimal(str(item["gst_rate"]))
        qty = int(item["quantity"])

        # Proportionately allocate discount to line item consideration if discount exists
        if gross_selling_subtotal > Decimal("0.00") and discount_d > Decimal("0.00"):
            item_gross = inc_p * qty
            item_discount = (discount_d * item_gross / gross_selling_subtotal).quantize(PAISE, rounding=ROUND_HALF_UP)
            item_net = item_gross - item_discount
            effective_unit_price = item_net / Decimal(str(qty))
        else:
            effective_unit_price = inc_p

        breakdown = extract_gst_from_inclusive(
            inclusive_price=effective_unit_price,
            gst_rate=gst_rate,
            quantity=qty,
            is_intra_state=is_intra_state,
        )
        # Store original un-discounted price for item snapshot representation
        breakdown["unit_price_inclusive_original"] = inc_p

        taxable_subtotal += breakdown["taxable_subtotal"]
        total_cgst += breakdown["cgst_amount"]
        total_sgst += breakdown["sgst_amount"]
        total_igst += breakdown["igst_amount"]
        line_breakdowns.append(breakdown)

    total_gst = (total_cgst + total_sgst + total_igst).quantize(PAISE, rounding=ROUND_HALF_UP)
    shipping_fee_d = Decimal(str(shipping_fee)).quantize(PAISE, rounding=ROUND_HALF_UP)
    total_amount = (net_selling_subtotal + shipping_fee_d).quantize(PAISE, rounding=ROUND_HALF_UP)

    return {
        "selling_subtotal": gross_selling_subtotal.quantize(PAISE, rounding=ROUND_HALF_UP),
        "net_selling_subtotal": net_selling_subtotal.quantize(PAISE, rounding=ROUND_HALF_UP),
        "taxable_subtotal": taxable_subtotal.quantize(PAISE, rounding=ROUND_HALF_UP),
        "total_cgst": total_cgst.quantize(PAISE, rounding=ROUND_HALF_UP),
        "total_sgst": total_sgst.quantize(PAISE, rounding=ROUND_HALF_UP),
        "total_igst": total_igst.quantize(PAISE, rounding=ROUND_HALF_UP),
        "total_gst": total_gst,
        "shipping_fee": shipping_fee_d,
        "discount_amount": discount_d,
        "total_amount": total_amount,
        "is_intra_state": is_intra_state,
        "line_breakdowns": line_breakdowns,
    }


def determine_is_intra_state(warehouse_state, delivery_state):
    """
    Returns True if the delivery state matches the warehouse/seller state.
    Comparison is case-insensitive and strips whitespace.
    """
    if not warehouse_state or not delivery_state:
        return True
    return warehouse_state.strip().lower() == delivery_state.strip().lower()


def get_warehouse_state():
    """
    Returns the configured warehouse state from Django settings.

    In production, FAAZO_WAREHOUSE_STATE must be explicitly set.
    In development/testing, falls back to 'Maharashtra' with a warning log if unset.
    """
    import logging
    from django.conf import settings
    from django.core.exceptions import ImproperlyConfigured

    logger = logging.getLogger("faazo.tax")
    state = getattr(settings, "FAAZO_WAREHOUSE_STATE", None)
    if not state or not isinstance(state, str) or not state.strip():
        if getattr(settings, "DEBUG", False):
            logger.warning("FAAZO_WAREHOUSE_STATE setting is empty. Using 'Maharashtra' for development/testing.")
            return "Maharashtra"
        raise ImproperlyConfigured(
            "FAAZO_WAREHOUSE_STATE must be set in environment/settings. "
            "Example: FAAZO_WAREHOUSE_STATE = 'Maharashtra'"
        )
    return state.strip()

