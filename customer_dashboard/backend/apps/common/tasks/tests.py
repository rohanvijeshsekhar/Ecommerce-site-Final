"""
FAAZO – Infrastructure Verification Tasks

These tasks exist solely to verify the end-to-end Celery + Redis
infrastructure path. They do NOT implement any business logic.

Tasks:
    faazo.infra.ping         – Basic connectivity test
    faazo.infra.ping_with_retry – Tests retry behavior
    faazo.infra.ping_fail    – Tests non-retryable failure path

Usage (Django shell):
    from apps.common.tasks.tests import celery_ping, ping_with_retry, ping_fail

    # Basic round-trip
    result = celery_ping.delay()
    result.get(timeout=10)    # Should return {"status": "ok", "message": "pong"}

    # Retry test (will retry 3 times then raise)
    result = ping_with_retry.delay(fail_times=2)
    result.get(timeout=120)

    # Non-retryable failure test
    result = ping_fail.delay()
    result.get(timeout=10)    # Raises ValueError immediately, no retries
"""

import logging
from celery import shared_task
from apps.common.tasks.base import FAAZOBaseTask

logger = logging.getLogger("faazo.tasks")


@shared_task(
    bind=True,
    base=FAAZOBaseTask,
    name="faazo.infra.ping",
    max_retries=3,
)
def celery_ping(self, message: str = "pong") -> dict:
    """
    Infrastructure smoke test.
    Returns a deterministic JSON-serializable result.

    Call: celery_ping.delay()
    Expected: {"status": "ok", "message": "pong", "task_id": "..."}
    """
    logger.info("[FAAZO_PING] task_id=%s message=%s", self.request.id, message)
    return {
        "status": "ok",
        "message": message,
        "task_id": str(self.request.id),
        "retries": self.request.retries,
    }


# Track call count per task invocation for retry testing
_PING_RETRY_FAIL_COUNTER: dict = {}


@shared_task(
    bind=True,
    base=FAAZOBaseTask,
    name="faazo.infra.ping_with_retry",
    max_retries=3,
)
def ping_with_retry(self, fail_times: int = 1) -> dict:
    """
    Infrastructure retry test.

    Simulates a transient failure 'fail_times' times, then succeeds.
    Demonstrates exponential backoff retry behavior.

    Call: ping_with_retry.delay(fail_times=2)
    Expected: fails twice → retries with backoff → succeeds on 3rd attempt
    """
    task_id = str(self.request.id)

    if task_id not in _PING_RETRY_FAIL_COUNTER:
        _PING_RETRY_FAIL_COUNTER[task_id] = 0

    if _PING_RETRY_FAIL_COUNTER[task_id] < fail_times:
        _PING_RETRY_FAIL_COUNTER[task_id] += 1
        attempt = _PING_RETRY_FAIL_COUNTER[task_id]
        logger.info(
            "[FAAZO_PING_RETRY] Simulating transient failure (attempt %d of %d)",
            attempt, fail_times,
        )
        exc = ConnectionError(f"Simulated transient failure #{attempt}")
        return self.safe_retry(exc, task_id=task_id)

    # Cleanup counter
    _PING_RETRY_FAIL_COUNTER.pop(task_id, None)

    return {
        "status": "ok",
        "message": "ping_with_retry succeeded after simulated failures",
        "task_id": task_id,
        "retries": self.request.retries,
    }


@shared_task(
    bind=True,
    base=FAAZOBaseTask,
    name="faazo.infra.ping_fail",
    max_retries=3,
)
def ping_fail(self) -> dict:
    """
    Infrastructure non-retryable failure test.

    Demonstrates that ValueError is NOT retried — it propagates
    immediately as a final task failure.

    Call: ping_fail.delay()
    Expected: raises ValueError immediately, no retries, task fails
    """
    logger.info("[FAAZO_PING_FAIL] Demonstrating non-retryable failure path.")
    raise ValueError("This is a non-retryable test failure. No retries should occur.")
