"""
FAAZO – Inventory Service & Concurrency Engine

Provides authoritative, race-condition-safe inventory validation,
row-locking via select_for_update(), atomic reservations, and releases.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple
from django.db.models import F
from django.db.models.functions import Greatest

from apps.inventory.models import ProductInventory

logger = logging.getLogger("faazo.inventory")


def get_product_stock_info(product: Any) -> Dict[str, Any]:
    """
    Get current stock metrics for a product.
    If no ProductInventory record exists, treats available_stock as 0 (no inventory = unavailable).
    """
    if not product or getattr(product, "is_deleted", False) or getattr(product, "status", "") in ["archived", "discontinued"]:
        return {
            "current_stock": 0,
            "reserved_stock": 0,
            "available_stock": 0,
            "allow_backorders": False,
            "stock_status": "out_of_stock",
            "is_purchasable": False,
            "is_available": False,
        }

    inventory = getattr(product, "inventory", None)
    if not inventory:
        # Check DB directly in case it wasn't prefetched
        inventory = ProductInventory.objects.filter(product=product).first()

    if not inventory:
        return {
            "current_stock": 0,
            "reserved_stock": 0,
            "available_stock": 0,
            "allow_backorders": False,
            "stock_status": "out_of_stock",
            "is_purchasable": False,
            "is_available": False,
        }

    avail = inventory.available_stock
    allow_bo = inventory.allow_backorders
    return {
        "current_stock": inventory.current_stock,
        "reserved_stock": inventory.reserved_stock,
        "available_stock": avail,
        "allow_backorders": allow_bo,
        "stock_status": inventory.stock_status,
        "is_purchasable": inventory.is_purchasable,
        "is_available": avail > 0 or allow_bo,
    }


def validate_items_inventory(
    items: List[Any],
    lock: bool = False
) -> Tuple[bool, Optional[Dict[str, Any]], Dict[str, ProductInventory]]:
    """
    Authoritatively checks live database inventory for a list of items.

    Args:
        items: List of objects or dicts with .product / .quantity
        lock: If True (must be called inside transaction.atomic()), acquires
              select_for_update() on ProductInventory rows in deterministic sorted order.

    Returns:
        (is_valid: bool, error_dict_or_none: Optional[dict], inventory_map: dict[str, ProductInventory])
    """
    if not items:
        return True, None, {}

    # Extract distinct product IDs
    product_dict = {}
    for item in items:
        prod = getattr(item, "product", None)
        if prod is None and isinstance(item, dict):
            prod = item.get("product")
        if prod:
            product_dict[str(prod.id)] = prod

    sorted_pids = sorted(product_dict.keys())

    # Query inventories (with row lock if requested)
    if lock:
        inv_qs = ProductInventory.objects.select_for_update().filter(product_id__in=sorted_pids)
    else:
        inv_qs = ProductInventory.objects.filter(product_id__in=sorted_pids)

    inventory_map = {str(inv.product_id): inv for inv in inv_qs}

    # Aggregate quantities requested per product (in case same product appears multiple times)
    requested_qty_per_product: Dict[str, int] = {}
    for item in items:
        prod = getattr(item, "product", None)
        if prod is None and isinstance(item, dict):
            prod = item.get("product")
        qty = getattr(item, "quantity", 0)
        if qty == 0 and isinstance(item, dict):
            qty = item.get("quantity", item.get("qty", 1))

        if prod:
            pid = str(prod.id)
            requested_qty_per_product[pid] = requested_qty_per_product.get(pid, 0) + int(qty)

    # Validate each product
    for pid, total_qty in requested_qty_per_product.items():
        prod = product_dict.get(pid)
        if not prod:
            return False, {
                "code": "INSUFFICIENT_STOCK",
                "message": "One or more products are no longer available.",
                "details": {"product_id": pid, "requested_quantity": total_qty, "available_stock": 0},
            }, inventory_map

        if getattr(prod, "is_deleted", False) or getattr(prod, "status", "") in ["archived", "discontinued"]:
            return False, {
                "code": "INSUFFICIENT_STOCK",
                "message": f"'{prod.name}' is no longer available.",
                "details": {"product_id": pid, "product_name": prod.name, "requested_quantity": total_qty, "available_stock": 0},
            }, inventory_map

        inventory = inventory_map.get(pid)
        if not inventory:
            # No inventory record = 0 available stock
            return False, {
                "code": "INSUFFICIENT_STOCK",
                "message": f"'{prod.name}' is currently out of stock.",
                "details": {"product_id": pid, "product_name": prod.name, "requested_quantity": total_qty, "available_stock": 0},
            }, inventory_map

        avail = inventory.available_stock
        if not inventory.allow_backorders and total_qty > avail:
            if avail <= 0:
                msg = f"'{prod.name}' is currently out of stock."
            else:
                msg = f"Only {avail} unit(s) of '{prod.name}' are available (requested: {total_qty}). Please update your cart."
            
            return False, {
                "code": "INSUFFICIENT_STOCK",
                "message": msg,
                "details": {
                    "product_id": pid,
                    "product_name": prod.name,
                    "requested_quantity": total_qty,
                    "available_stock": avail,
                    "allow_backorders": inventory.allow_backorders,
                },
            }, inventory_map

    return True, None, inventory_map


def reserve_items_stock(
    items: List[Any],
    inventory_map: Dict[str, ProductInventory]
) -> None:
    """
    Atomically increments reserved_stock for each item's inventory row.
    Must be called within an active transaction where rows were locked.
    """
    for item in items:
        prod = getattr(item, "product", None)
        if prod is None and isinstance(item, dict):
            prod = item.get("product")
        qty = getattr(item, "quantity", 0)
        if qty == 0 and isinstance(item, dict):
            qty = item.get("quantity", item.get("qty", 1))

        if prod:
            inv = inventory_map.get(str(prod.id))
            if inv:
                ProductInventory.objects.filter(id=inv.id).update(
                    reserved_stock=F("reserved_stock") + int(qty)
                )


def release_items_stock(items: List[Any]) -> None:
    """
    Atomically decrements reserved_stock when an order is cancelled or aborted.
    Guarantees reserved_stock never falls below 0.
    """
    for item in items:
        prod = getattr(item, "product", None)
        qty = getattr(item, "quantity", 0)
        if prod:
            inv = ProductInventory.objects.filter(product=prod).first()
            if inv:
                ProductInventory.objects.filter(id=inv.id).update(
                    reserved_stock=Greatest(0, F("reserved_stock") - int(qty))
                )
