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
