"""
FAAZO – FAAZOBaseTask

Base Celery task class for all FAAZO background tasks.

Retry Policy
------------
Attempt 1 → fails → wait 30s  → Attempt 2
Attempt 2 → fails → wait 120s → Attempt 3
Attempt 3 → fails → wait 480s → FINAL FAILURE

Maximum of 3 retries (4 attempts total).
Exponential backoff: delay = 30 * (4 ** retry_number) seconds.

Idempotency
-----------
FAAZOBaseTask does NOT maintain a separate TaskIdempotencyRecord
database table. Instead, each task explicitly uses the authoritative
business-level idempotency mechanisms:

  - Notifications:  Notification.idempotency_key (unique constraint)
  - Webhooks:       WebhookEvent.event_id (unique + select_for_update)
  - Deliveries:     NotificationDelivery.get_or_create per channel

Task callers pass an idempotency_key argument. The task's business
logic uses it to call the appropriate guard before acting.

Security
--------
Task arguments must NOT contain:
  - Passwords, JWT tokens, refresh tokens
  - API keys or payment credentials
  - Full card/payment data
  - Sensitive PII beyond what the business operation requires

Always pass identifiers (UUIDs, order numbers) — never raw secrets.
"""

import logging
from celery import Task
from celery.exceptions import MaxRetriesExceededError, SoftTimeLimitExceeded

logger = logging.getLogger("faazo.tasks")


# ── Retry configuration constants ────────────────────────────────────────────
MAX_RETRIES = 3

# Exponential backoff delays in seconds.
# Retry 0 → 30s, Retry 1 → 120s, Retry 2 → 480s
def _backoff_delay(retry_number: int) -> int:
    """Returns exponential backoff delay in seconds for the given retry number."""
    return 30 * (4 ** retry_number)


# ── Exceptions that should NOT be retried ────────────────────────────────────
NON_RETRYABLE_EXCEPTIONS = (
    ValueError,
    TypeError,
    PermissionError,
    AttributeError,
    KeyError,
)


class FAAZOBaseTask(Task):
    """
    Base class for all FAAZO Celery tasks.

    Provides:
    - Bounded exponential retry policy (max 3 retries)
    - Structured logging on start, success, retry, and failure
    - SoftTimeLimitExceeded handling
    - Clear non-retryable exception classification
    - on_failure hook for failure observability

    Usage:
        @shared_task(bind=True, base=FAAZOBaseTask, name="faazo.notifications.deliver")
        def deliver_notification_async(self, *, notification_id, idempotency_key, **kwargs):
            ...
    """

    abstract = True         # Celery: do not register this as a task
    max_retries = MAX_RETRIES
    acks_late = True        # Acknowledge AFTER completion, not on receipt

    def apply_async(self, args=None, kwargs=None, **options):
        """
        Override to provide clear diagnostics when Redis is unreachable.

        If CELERY_TASK_ALWAYS_EAGER is False and Redis is down, the
        ConnectionError from Kombu surfaces here immediately rather
        than being swallowed. We log it and re-raise so callers know
        the task was NOT dispatched.
        """
        try:
            return super().apply_async(args=args, kwargs=kwargs, **options)
        except Exception as exc:
            # Re-classify connection errors for clearer diagnosis
            exc_name = type(exc).__name__
            if any(term in exc_name for term in ("Connection", "Broker", "Transport")):
                logger.critical(
                    "[FAAZO_TASK] Failed to dispatch task '%s' — Redis broker unreachable. "
                    "Ensure Redis is running and REDIS_URL is correct. Error: %s",
                    self.name,
                    exc,
                )
            else:
                logger.error(
                    "[FAAZO_TASK] Failed to dispatch task '%s': %s",
                    self.name, exc,
                )
            raise

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """
        Called by Celery after all retries are exhausted.
        Logs the final failure with structured context.

        IMPORTANT: Do NOT log secrets, tokens, or credentials.
        Log only task_id, task name, and safe context identifiers.
        """
        logger.error(
            "[FAAZO_TASK_FAILED] task=%s task_id=%s error=%s retries=%s",
            self.name,
            task_id,
            repr(exc),
            self.request.retries,
            exc_info=einfo,
        )

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Called by Celery each time a task is scheduled for retry."""
        retry_number = self.request.retries
        delay = _backoff_delay(retry_number)
        logger.warning(
            "[FAAZO_TASK_RETRY] task=%s task_id=%s retry=%d/%d delay=%ds reason=%s",
            self.name,
            task_id,
            retry_number,
            self.max_retries,
            delay,
            repr(exc),
        )

    def on_success(self, retval, task_id, args, kwargs):
        """Called by Celery when a task completes successfully."""
        logger.info(
            "[FAAZO_TASK_SUCCESS] task=%s task_id=%s",
            self.name,
            task_id,
        )

    def safe_retry(self, exc: Exception, **extra_context):
        """
        Retry helper for use inside task functions.

        - Checks whether the exception is retryable.
        - Computes exponential backoff delay.
        - Raises MaxRetriesExceededError as a non-retryable after max retries.
        - Logs all retryable failures clearly.

        Usage:
            except SomeTransientError as exc:
                return self.safe_retry(exc, order_id=order_id)
        """
        if isinstance(exc, NON_RETRYABLE_EXCEPTIONS):
            logger.error(
                "[FAAZO_TASK_NON_RETRYABLE] task=%s task_id=%s error=%s context=%s",
                self.name,
                self.request.id,
                repr(exc),
                extra_context,
            )
            raise exc  # Do not retry — bubble up as a final failure

        if isinstance(exc, SoftTimeLimitExceeded):
            logger.error(
                "[FAAZO_TASK_TIMEOUT] task=%s task_id=%s exceeded soft time limit.",
                self.name, self.request.id,
            )
            raise exc  # Don't retry a timed-out task — log and fail

        retry_number = self.request.retries
        delay = _backoff_delay(retry_number)

        logger.warning(
            "[FAAZO_TASK_WILL_RETRY] task=%s task_id=%s retry=%d/%d delay=%ds error=%s context=%s",
            self.name,
            self.request.id,
            retry_number + 1,
            self.max_retries,
            delay,
            repr(exc),
            extra_context,
        )

        try:
            raise self.retry(exc=exc, countdown=delay)
        except MaxRetriesExceededError:
            logger.error(
                "[FAAZO_TASK_MAX_RETRIES] task=%s task_id=%s all %d retries exhausted. "
                "Final error: %s context=%s",
                self.name,
                self.request.id,
                self.max_retries,
                repr(exc),
                extra_context,
            )
            raise
