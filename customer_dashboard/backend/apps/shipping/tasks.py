"""
FAAZO – Shipping Background Tasks

Background tasks for Shiprocket/shipping synchronization.

Design Principles
-----------------
1. This task calls the EXISTING ShiprocketService.sync_tracking() — it
   does NOT duplicate any Shiprocket or shipping business logic.

2. The existing management command (sync_shiprocket_shipments) is the
   reference implementation. This task is its Celery equivalent for
   single-shipment async dispatch.

3. Idempotency: sync_tracking() is inherently idempotent — it reads
   current state from the Shiprocket API and updates the local record.
   Running it multiple times for the same shipment is safe.

4. This task uses the ShiprocketService.sync_tracking() method so that:
   - Notification dispatch (dispatch_shipment_notification) happens inside
     the service layer as it always has.
   - ShippingAPILog records are created by the service layer.
   - No shipping business rules are duplicated here.

5. Do NOT use this task to create shipments, schedule pickups, or
   make state-changing API calls. Those are administrative operations
   that must remain synchronous.
"""

import logging
from celery import shared_task
from apps.common.tasks.base import FAAZOBaseTask

logger = logging.getLogger("faazo.tasks")


@shared_task(
    bind=True,
    base=FAAZOBaseTask,
    name="faazo.shipping.sync_single_shipment",
    max_retries=3,
    queue="shipping",
)
def sync_single_shipment(self, *, shipment_id: str) -> dict:
    """
    Sync tracking status for a single shipment via ShiprocketService.

    Calls ShiprocketService.sync_tracking() which:
    - Fetches the latest status from Shiprocket API
    - Updates the Shipment record in the database
    - Calls dispatch_shipment_notification() if status changed
    - Logs to ShippingAPILog

    Idempotency: sync_tracking() reads remote state and overwrites
    local state. Safe to call multiple times — idempotent by nature.

    Arguments:
        shipment_id – str(shipment.pk) — not the full Shipment object
    """
    from apps.shipping.models import Shipment
    from apps.shipping.services import ShiprocketService

    logger.info(
        "[SHIPPING_TASK] sync_single_shipment task_id=%s shipment_id=%s",
        self.request.id, shipment_id,
    )

    try:
        shipment = Shipment.objects.select_related("order", "order__user").get(pk=shipment_id)
    except Shipment.DoesNotExist:
        logger.warning(
            "[SHIPPING_TASK] Shipment %s not found. Dropping task. task_id=%s",
            shipment_id, self.request.id,
        )
        return {"status": "dropped", "reason": "shipment_not_found", "task_id": str(self.request.id)}

    if shipment.is_deleted:
        logger.info(
            "[SHIPPING_TASK] Shipment %s is deleted. Skipping sync. task_id=%s",
            shipment_id, self.request.id,
        )
        return {"status": "skipped", "reason": "shipment_deleted", "task_id": str(self.request.id)}

    try:
        service = ShiprocketService()
        prev_status = shipment.shipment_status

        updated_shipment = service.sync_tracking(shipment)

        logger.info(
            "[SHIPPING_TASK] Sync complete task_id=%s shipment_id=%s "
            "prev_status=%s new_status=%s",
            self.request.id,
            shipment_id,
            prev_status,
            updated_shipment.shipment_status,
        )
        return {
            "status": "ok",
            "shipment_id": shipment_id,
            "previous_status": prev_status,
            "current_status": updated_shipment.shipment_status,
            "task_id": str(self.request.id),
        }

    except Exception as exc:
        return self.safe_retry(
            exc,
            shipment_id=shipment_id,
        )
