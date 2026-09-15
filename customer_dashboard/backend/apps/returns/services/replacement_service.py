"""
FAAZO – Replacement Workflow Service

Manages replacement order creation for approved Return & Replacement requests.
- Creates a distinct replacement Order linked to ReturnRequest without altering accounting.
- Idempotency Protection: Prevents duplicate replacement creation on repeated admin actions.
- Reserves product inventory for replacement items.
"""

import logging
from decimal import Decimal
from typing import Dict, Any
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import F

from apps.inventory.models import ProductInventory
from apps.orders.models import Order, OrderItem, OrderStatus
from apps.returns.models import ReturnRequest, ReturnStatus, ReturnRequestType
from apps.returns.services.state_machine import ReturnStateMachineService

logger = logging.getLogger("faazo.returns")


class ReplacementService:
    """
    Replacement fulfillment authority.
    """

    @classmethod
    def create_replacement_order(cls, return_request_id: str, actor=None) -> Order:
        """
        Creates a distinct replacement Order for a ReturnRequest and reserves inventory.
        """
        with transaction.atomic():
            return_req = (
                ReturnRequest.objects.select_for_update()
                .select_related("customer", "order", "order__shipping_address")
                .get(pk=return_request_id)
            )

            # Verification Gate: Must not be failed verification
            if hasattr(return_req, "verification") and return_req.verification.status == "failed":
                raise ValidationError("Cannot approve replacement: doorstep/warehouse verification has failed.")

            # Idempotency Guard: Return existing replacement order if already created
            if return_req.replacement_order:
                logger.info(f"[ReplacementService] Replacement order already exists for Return {return_request_id}: Order #{return_req.replacement_order.order_number}.")
                return return_req.replacement_order

            if return_req.request_type != ReturnRequestType.RETURN_REPLACEMENT:
                logger.warning(f"[ReplacementService] Return {return_request_id} is not a RETURN_REPLACEMENT request.")

            # Check and reserve inventory transactionally
            for item in return_req.items.select_related("order_item__product").all():
                qty = item.approved_quantity or item.requested_quantity
                prod = item.order_item.product
                inv = ProductInventory.objects.select_for_update().filter(product=prod).first()
                if inv and inv.current_stock < qty:
                    raise ValidationError(f"Insufficient inventory for replacement item '{prod.name}' (Available: {inv.current_stock}, Needed: {qty}).")

            # Create distinct replacement Order
            replacement_order = Order.objects.create(
                user=return_req.customer,
                shipping_address=return_req.order.shipping_address,
                status=OrderStatus.PROCESSING,
                payment_method="replacement",
                mrp_subtotal=Decimal("0.00"),
                selling_subtotal=Decimal("0.00"),
                gst_amount=Decimal("0.00"),
                shipping_fee=Decimal("0.00"),
                total_amount=Decimal("0.00"),
                notes=f"Replacement Order for Return #{str(return_req.id)[:8]} (Original Order #{return_req.order.order_number or str(return_req.order.id)[:8]}).",
            )

            # Create replacement OrderItems & deduct stock safely
            for item in return_req.items.select_related("order_item__product").all():
                qty = item.approved_quantity or item.requested_quantity
                prod = item.order_item.product
                OrderItem.objects.create(
                    order=replacement_order,
                    product=prod,
                    quantity=qty,
                    price=Decimal("0.00"),
                )
                ProductInventory.objects.filter(product=prod).update(
                    current_stock=F("current_stock") - qty
                )
                logger.info(f"[ReplacementService] Reserved {qty} units of stock for replacement item '{prod.name}'.")

            # Link replacement order to ReturnRequest
            return_req.replacement_order = replacement_order
            return_req.save(update_fields=["replacement_order"])

            # Update state machine to REPLACEMENT_APPROVED then REPLACEMENT_PROCESSING
            if return_req.status in [ReturnStatus.VERIFICATION_PASSED, ReturnStatus.QC_PASSED, ReturnStatus.APPROVED]:
                return_req = ReturnStateMachineService.transition_to(
                    return_request_id=str(return_req.id),
                    target_status=ReturnStatus.REPLACEMENT_APPROVED,
                    actor=actor,
                    notes=f"Replacement approved for Order #{replacement_order.order_number or str(replacement_order.id)[:8]}.",
                )

            if return_req.status in [ReturnStatus.REPLACEMENT_APPROVED, ReturnStatus.REPLACEMENT_PENDING]:
                ReturnStateMachineService.transition_to(
                    return_request_id=str(return_req.id),
                    target_status=ReturnStatus.REPLACEMENT_PROCESSING,
                    actor=actor,
                    notes=f"Replacement Order #{replacement_order.order_number or str(replacement_order.id)[:8]} in processing.",
                )

            logger.info(f"[ReplacementService] Created replacement Order #{replacement_order.order_number} for Return {return_request_id}.")
            return replacement_order

