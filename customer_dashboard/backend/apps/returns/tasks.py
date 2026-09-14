"""
FAAZO – Return Module Celery Asynchronous Tasks

Asynchronous background tasks for:
- Refund execution (process_refund_async)
- Reverse logistics return pickup scheduling (process_return_pickup_async)

Built on FAAZOBaseTask providing:
- Bounded exponential retries (3 retries: 30s -> 120s -> 480s).
- Fail-fast handling on validation errors.
- Structured logging.
"""

import logging
from celery import shared_task
from apps.common.tasks.base import FAAZOBaseTask
from apps.returns.services.refund_service import RefundService
from apps.returns.services.logistics import ReturnShippingService

logger = logging.getLogger("faazo.returns")


@shared_task(
    base=FAAZOBaseTask,
    name="faazo.returns.process_refund_async",
    bind=True,
    max_retries=3,
)
def process_refund_async(self, *, refund_id: str) -> dict:
    """
    Asynchronously executes a Razorpay payment refund.
    """
    logger.info(f"[RETURN_TASK] Starting process_refund_async task_id={self.request.id} refund_id={refund_id}")
    try:
        res = RefundService.execute_refund(refund_id=refund_id)
        logger.info(f"[RETURN_TASK] Refund task completed task_id={self.request.id} result={res}")
        return res
    except Exception as exc:
        logger.error(f"[RETURN_TASK] Refund task failed task_id={self.request.id}: {exc}", exc_info=True)
        raise self.retry(exc=exc, countdown=30 * (4 ** self.request.retries))


@shared_task(
    base=FAAZOBaseTask,
    name="faazo.returns.process_return_pickup_async",
    bind=True,
    max_retries=3,
)
def process_return_pickup_async(self, *, return_request_id: str) -> dict:
    """
    Asynchronously schedules a courier return pickup.
    """
    logger.info(f"[RETURN_TASK] Starting process_return_pickup_async task_id={self.request.id} return_id={return_request_id}")
    try:
        res = ReturnShippingService.schedule_return_pickup(return_request_id=return_request_id)
        logger.info(f"[RETURN_TASK] Return pickup task completed task_id={self.request.id} result={res}")
        return res
    except Exception as exc:
        logger.error(f"[RETURN_TASK] Return pickup task failed task_id={self.request.id}: {exc}", exc_info=True)
        raise self.retry(exc=exc, countdown=30 * (4 ** self.request.retries))


@shared_task(
    base=FAAZOBaseTask,
    name="faazo.returns.reconcile_active_return_shipments",
    bind=True,
    max_retries=2,
)
def reconcile_active_return_shipments(self) -> dict:
    """
    Periodic task to reconcile active, non-terminal reverse shipments with Shiprocket.
    """
    from apps.returns.models import ReturnShipment, ReturnStatus
    from apps.returns.services.logistics import ShiprocketReturnService

    terminal_statuses = [
        ReturnStatus.COMPLETED,
        ReturnStatus.REFUNDED,
        ReturnStatus.REJECTED,
        ReturnStatus.CANCELLED,
        ReturnStatus.VERIFICATION_FAILED,
        ReturnStatus.RETURN_LOST,
    ]

    active_shipments = (
        ReturnShipment.objects.filter(awb_number__isnull=False)
        .exclude(return_request__status__in=terminal_statuses)
        .select_related("return_request")
    )

    logger.info(f"[RECONCILE_RETURNS] Found {active_shipments.count()} active return shipments to reconcile.")
    synced_count = 0
    service = ShiprocketReturnService()

    for shipment in active_shipments[:50]:  # batch up to 50 per execution
        try:
            service.sync_return_tracking(shipment)
            synced_count += 1
        except Exception as e:
            logger.warning(f"[RECONCILE_RETURNS] Error syncing shipment AWB {shipment.awb_number}: {e}")

    return {"synced_count": synced_count}

