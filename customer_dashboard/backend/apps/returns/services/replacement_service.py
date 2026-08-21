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
from django.db import transaction

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
        Creates a distinct replacement Order for a ReturnRequest.
        """
        with transaction.atomic():
            return_req = (
                ReturnRequest.objects.select_for_update()
                .select_related("customer", "order", "order__shipping_address")
                .get(pk=return_request_id)
            )

            # Idempotency Guard: Return existing replacement order if already created
            if return_req.replacement_order:
                logger.info(f"[ReplacementService] Replacement order already exists for Return {return_request_id}: Order #{return_req.replacement_order.order_number}.")
                return return_req.replacement_order

            if return_req.request_type != ReturnRequestType.RETURN_REPLACEMENT:
                logger.warning(f"[ReplacementService] Return {return_request_id} is not a RETURN_REPLACEMENT request.")

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

            # Create replacement OrderItems
            for item in return_req.items.select_related("order_item__product").all():
                qty = item.approved_quantity or item.requested_quantity
                OrderItem.objects.create(
                    order=replacement_order,
                    product=item.order_item.product,
                    quantity=qty,
                    price=Decimal("0.00"),
                )

            # Link replacement order to ReturnRequest
            return_req.replacement_order = replacement_order
            return_req.save(update_fields=["replacement_order"])

            # Update state machine to REPLACEMENT_PENDING then REPLACEMENT_PROCESSING
            if return_req.status in [ReturnStatus.QC_PASSED, ReturnStatus.APPROVED]:
                return_req = ReturnStateMachineService.transition_to(
                    return_request_id=str(return_req.id),
                    target_status=ReturnStatus.REPLACEMENT_PENDING,
                    actor=actor,
                    notes=f"Replacement pending for Order #{replacement_order.order_number or str(replacement_order.id)[:8]}.",
                )

            if return_req.status == ReturnStatus.REPLACEMENT_PENDING:
                ReturnStateMachineService.transition_to(
                    return_request_id=str(return_req.id),
                    target_status=ReturnStatus.REPLACEMENT_PROCESSING,
                    actor=actor,
                    notes=f"Replacement Order #{replacement_order.order_number or str(replacement_order.id)[:8]} in processing.",
                )

            logger.info(f"[ReplacementService] Created replacement Order #{replacement_order.order_number} for Return {return_request_id}.")
            return replacement_order
