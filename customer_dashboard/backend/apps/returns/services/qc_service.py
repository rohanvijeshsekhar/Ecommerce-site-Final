"""
FAAZO – Quality Control (QC) & Inventory Safety Workflow Service

Manages warehouse inspection upon item receipt:
- Validates QC pass / fail results.
- Protects inventory against double restoration (checks is_inventory_restored flag).
- Restores sellable inventory ONLY when QC_PASSED AND is_restockable is True.
- Uses transaction.atomic() with F() expressions for thread-safe stock updates.
"""

import logging
from typing import Dict, Any
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import F

from apps.authentication.services.audit_service import AuditService
from apps.inventory.models import ProductInventory
from apps.returns.models import ReturnRequest, ReturnStatus
from apps.returns.services.state_machine import ReturnStateMachineService

logger = logging.getLogger("faazo.returns")


class QCService:
    """
    Quality Control & Inventory Safety authority.
    """

    @classmethod
    def record_item_receipt(cls, return_request_id: str, actor=None, notes: str = "") -> ReturnRequest:
        """
        Marks returned item as received at warehouse (transitions ITEM_RECEIVED -> QC_PENDING).
        """
        with transaction.atomic():
            return_req = ReturnRequest.objects.select_for_update().get(pk=return_request_id)

            # Move through ITEM_RECEIVED then QC_PENDING
            if return_req.status in [ReturnStatus.APPROVED, ReturnStatus.PICKUP_PENDING, ReturnStatus.PICKUP_SCHEDULED]:
                return_req = ReturnStateMachineService.transition_to(
                    return_request_id=return_request_id,
                    target_status=ReturnStatus.ITEM_RECEIVED,
                    actor=actor,
                    notes=notes or "Returned package received at central warehouse.",
                )

            if return_req.status == ReturnStatus.ITEM_RECEIVED:
                return_req = ReturnStateMachineService.transition_to(
                    return_request_id=return_request_id,
                    target_status=ReturnStatus.QC_PENDING,
                    actor=actor,
                    notes=notes or "Awaiting physical QC inspection.",
                )

            return return_req

    @classmethod
    def process_qc(
        cls,
        return_request_id: str,
        qc_result: str,
        is_restockable: bool = True,
        notes: str = "",
        actor=None,
    ) -> Dict[str, Any]:
        """
        Executes QC inspection result. Restores stock safely if QC_PASSED and is_restockable.
        """
        qc_result_upper = qc_result.upper().strip()
        if qc_result_upper not in ["PASS", "FAIL"]:
            raise ValidationError("QC result must be either 'PASS' or 'FAIL'.")

        with transaction.atomic():
            return_req = ReturnRequest.objects.select_for_update().get(pk=return_request_id)

            # Enforce QC_PENDING status prior to processing
            if return_req.status != ReturnStatus.QC_PENDING:
                # If currently ITEM_RECEIVED, advance to QC_PENDING first
                if return_req.status == ReturnStatus.ITEM_RECEIVED:
                    return_req = ReturnStateMachineService.transition_to(
                        return_request_id=return_request_id,
                        target_status=ReturnStatus.QC_PENDING,
                        actor=actor,
                    )
                elif return_req.status in [ReturnStatus.QC_PASSED, ReturnStatus.QC_FAILED]:
                    logger.warning(f"[QCService] Return {return_request_id} already has QC result ({return_req.status}). No-op.")
                    return {
                        "status": "already_processed",
                        "return_id": str(return_req.id),
                        "qc_status": return_req.status,
                    }

            if qc_result_upper == "PASS":
                # Transition state machine to QC_PASSED
                return_req = ReturnStateMachineService.transition_to(
                    return_request_id=return_request_id,
                    target_status=ReturnStatus.QC_PASSED,
                    actor=actor,
                    notes=f"QC Passed. Restockable: {is_restockable}. {notes}",
                )

                # Inventory Restoration Safety
                if is_restockable and not return_req.is_inventory_restored:
                    for item in return_req.items.select_related("order_item__product").all():
                        qty = item.approved_quantity or item.requested_quantity
                        product = item.order_item.product

                        inv = ProductInventory.objects.select_for_update().filter(product=product).first()
                        if inv:
                            ProductInventory.objects.filter(id=inv.id).update(
                                current_stock=F("current_stock") + qty
                            )
                            logger.info(f"[QCService] Restored {qty} units of stock for product '{product.name}' (Product ID: {product.id}).")

                    return_req.is_inventory_restored = True
                    return_req.save(update_fields=["is_inventory_restored"])

                    AuditService.log_event(
                        user=actor,
                        action="RETURN_INVENTORY_RESTORED",
                        status="SUCCESS",
                        ip_address=None,
                        details={
                            "return_id": str(return_req.id),
                            "is_restockable": True,
                        },
                    )

                return {
                    "status": "qc_passed",
                    "return_id": str(return_req.id),
                    "is_inventory_restored": return_req.is_inventory_restored,
                }

            else:
                # Transition state machine to QC_FAILED
                return_req = ReturnStateMachineService.transition_to(
                    return_request_id=return_request_id,
                    target_status=ReturnStatus.QC_FAILED,
                    actor=actor,
                    notes=f"QC Failed: Item damaged / rejected. {notes}",
                )

                AuditService.log_event(
                    user=actor,
                    action="RETURN_QC_FAILED",
                    status="SUCCESS",
                    ip_address=None,
                    details={
                        "return_id": str(return_req.id),
                        "notes": notes,
                    },
                )

                return {
                    "status": "qc_failed",
                    "return_id": str(return_req.id),
                    "is_inventory_restored": False,
                }
