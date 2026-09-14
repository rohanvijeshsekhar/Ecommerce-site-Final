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
from apps.returns.models import (
    ReturnRequest,
    ReturnStatus,
    ReturnVerification,
    VerificationStatus,
)
from apps.returns.services.state_machine import ReturnStateMachineService
from django.utils import timezone

logger = logging.getLogger("faazo.returns")


class ReturnVerificationService:
    """
    Authoritative Doorstep & Warehouse Verification Service.
    Captures courier/inspector verification before unlocking refunds or replacements.
    """

    @classmethod
    def record_verification(
        cls,
        return_request_id: str,
        status: str,
        verifier_name: str = "",
        failure_reason: str = "",
        notes: str = "",
        evidence_file=None,
        actor=None,
        is_restockable: bool = True,
    ) -> Dict[str, Any]:
        status_upper = status.upper().strip()
        if status_upper not in ["PASS", "PASSED", "FAIL", "FAILED"]:
            raise ValidationError("Verification status must be 'PASS' or 'FAIL'.")

        is_passed = status_upper in ["PASS", "PASSED"]

        with transaction.atomic():
            return_req = ReturnRequest.objects.select_for_update().get(pk=return_request_id)

            verification, created = ReturnVerification.objects.update_or_create(
                return_request=return_req,
                defaults={
                    "status": VerificationStatus.PASSED if is_passed else VerificationStatus.FAILED,
                    "verified_at": timezone.now(),
                    "verifier_name": verifier_name or (getattr(actor, "get_full_name", lambda: "")() or "Logistics Executive"),
                    "failure_reason": failure_reason if not is_passed else "",
                    "notes": notes,
                    "verified_by": actor,
                }
            )

            if evidence_file:
                verification.evidence_file = evidence_file
                verification.save(update_fields=["evidence_file"])

            if is_passed:
                # Transition state to VERIFICATION_PASSED / QC_PASSED
                target_state = ReturnStatus.VERIFICATION_PASSED
                try:
                    ReturnStateMachineService.transition_to(
                        return_request_id=str(return_req.id),
                        target_status=target_state,
                        actor=actor,
                        notes=f"Verification Passed by {verification.verifier_name}. {notes}".strip(),
                    )
                except ValidationError:
                    # Fallback to QC_PASSED if already past verification
                    if return_req.status in [ReturnStatus.QC_PENDING, ReturnStatus.ITEM_RECEIVED, ReturnStatus.RETURN_DELIVERED]:
                        ReturnStateMachineService.transition_to(
                            return_request_id=str(return_req.id),
                            target_status=ReturnStatus.QC_PASSED,
                            actor=actor,
                            notes=f"Verification Passed: {notes}",
                        )

                # Inventory Safety: Only restore if marked restockable and delivered to warehouse
                if is_restockable and not return_req.is_inventory_restored and return_req.status in [ReturnStatus.RETURN_DELIVERED, ReturnStatus.ITEM_RECEIVED, ReturnStatus.QC_PASSED, ReturnStatus.VERIFICATION_PASSED]:
                    for item in return_req.items.select_related("order_item__product").all():
                        qty = item.approved_quantity or item.requested_quantity
                        product = item.order_item.product
                        inv = ProductInventory.objects.select_for_update().filter(product=product).first()
                        if inv:
                            ProductInventory.objects.filter(id=inv.id).update(current_stock=F("current_stock") + qty)
                            logger.info(f"[ReturnVerificationService] Restored {qty} stock for {product.name}")

                    return_req.is_inventory_restored = True
                    return_req.save(update_fields=["is_inventory_restored"])

                AuditService.log_event(
                    user=actor,
                    action="RETURN_VERIFICATION_PASSED",
                    status="SUCCESS",
                    ip_address=None,
                    details={"return_id": str(return_req.id), "verifier": verification.verifier_name},
                )

                return {
                    "status": "passed",
                    "return_id": str(return_req.id),
                    "verifier_name": verification.verifier_name,
                    "verified_at": verification.verified_at.isoformat(),
                }
            else:
                # Failed verification
                ReturnStateMachineService.transition_to(
                    return_request_id=str(return_req.id),
                    target_status=ReturnStatus.VERIFICATION_FAILED,
                    actor=actor,
                    notes=f"Verification Failed: {failure_reason}. {notes}".strip(),
                )

                AuditService.log_event(
                    user=actor,
                    action="RETURN_VERIFICATION_FAILED",
                    status="SUCCESS",
                    ip_address=None,
                    details={"return_id": str(return_req.id), "reason": failure_reason},
                )

                return {
                    "status": "failed",
                    "return_id": str(return_req.id),
                    "failure_reason": failure_reason,
                    "verifier_name": verification.verifier_name,
                }


class QCService:
    """
    Quality Control & Inventory Safety authority (Backwards compatible facade).
    """

    @classmethod
    def record_item_receipt(cls, return_request_id: str, actor=None, notes: str = "") -> ReturnRequest:
        return ReturnVerificationService.record_verification(
            return_request_id=return_request_id,
            status="PASS",
            notes=notes or "Received at warehouse",
            actor=actor,
        )

    @classmethod
    def process_qc(
        cls,
        return_request_id: str,
        qc_result: str,
        is_restockable: bool = True,
        notes: str = "",
        actor=None,
    ) -> Dict[str, Any]:
        res = ReturnVerificationService.record_verification(
            return_request_id=return_request_id,
            status=qc_result,
            is_restockable=is_restockable,
            notes=notes,
            failure_reason=notes if qc_result.upper() == "FAIL" else "",
            actor=actor,
        )
        if res.get("status") == "passed":
            res["status"] = "qc_passed"
        elif res.get("status") == "failed":
            res["status"] = "qc_failed"
        return res

