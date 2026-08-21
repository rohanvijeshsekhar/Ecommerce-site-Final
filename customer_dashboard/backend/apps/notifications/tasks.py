"""
FAAZO – Notification Background Tasks

Background delivery for notification channels that involve external
API calls (SMS via Sangamam, future Email via SES, future Push via FCM).

Design Principles
-----------------
1. NotificationService remains the SINGLE entry point for notifications.
   These tasks call NotificationService — they do NOT duplicate its logic.

2. Business-level idempotency is enforced by NotificationService itself
   via Notification.idempotency_key (unique DB constraint).
   Celery retries are safe — duplicate dispatch is caught at the DB level.

3. No secrets are passed as task arguments. Only identifiers (UUIDs, strings).

4. transaction.on_commit() is the responsibility of the CALLER.
   Tasks are dispatched from within on_commit() wherever the notification
   depends on data created in the same database transaction.

Usage
-----
# Inside a view or service (after DB commit):
from django.db import transaction
from apps.notifications.tasks import deliver_notification_async

with transaction.atomic():
    order = Order.objects.create(...)
    transaction.on_commit(lambda: deliver_notification_async.delay(
        user_id=str(order.user_id),
        notification_type="ORDER_PLACED",
        idempotency_key=f"order_placed_{order.id}",
        context={
            "order_number": order.order_number,
            "total_amount": str(order.total_amount),
        },
    ))
"""

import logging
from celery import shared_task
from apps.common.tasks.base import FAAZOBaseTask

logger = logging.getLogger("faazo.tasks")


@shared_task(
    bind=True,
    base=FAAZOBaseTask,
    name="faazo.notifications.deliver",
    max_retries=3,
    queue="notifications",
)
def deliver_notification_async(
    self,
    *,
    user_id: str,
    notification_type: str,
    idempotency_key: str,
    context: dict = None,
    channels: list = None,
    action_url: str = None,
    title: str = None,
    message: str = None,
    priority: str = None,
    metadata: dict = None,
) -> dict:
    """
    Dispatch a notification asynchronously via NotificationService.

    Idempotency: NotificationService.create() checks Notification.idempotency_key
    before creating a new record. Celery retries are safe — duplicates are
    silently de-duplicated at the database level.

    Arguments:
        user_id         – str(user.pk) — do NOT pass the User object
        notification_type – NotificationType choice value
        idempotency_key – Unique string for deduplication (required)
        context         – Template context dict (must be JSON-serializable)
        channels        – List of DeliveryChannel values (default: IN_APP)
        action_url      – Optional deep-link URL
        title           – Optional override title (NotificationService renders default)
        message         – Optional override message body
        priority        – Optional NotificationPriority value
        metadata        – Optional extra JSON metadata

    Returns:
        {"status": "ok", "notification_id": str, "task_id": str}
    """
    from django.contrib.auth import get_user_model
    from apps.notifications.services.notification_service import NotificationService

    User = get_user_model()
    context = context or {}
    metadata = metadata or {}

    logger.info(
        "[NOTIFY_TASK] Starting deliver_notification_async task_id=%s "
        "user_id=%s type=%s idempotency_key=%s",
        self.request.id, user_id, notification_type, idempotency_key,
    )

    # Resolve user by PK — never pass full user objects as task args
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        # User was deleted between task dispatch and execution.
        # This is a non-retryable condition — retrying will always fail.
        logger.warning(
            "[NOTIFY_TASK] User %s not found. Dropping notification task_id=%s type=%s",
            user_id, self.request.id, notification_type,
        )
        return {"status": "dropped", "reason": "user_not_found", "task_id": str(self.request.id)}

    try:
        notification = NotificationService.create(
            user=user,
            notification_type=notification_type,
            idempotency_key=idempotency_key,
            context=context,
            channels=channels,
            action_url=action_url,
            title=title,
            message=message,
            priority=priority,
            metadata=metadata,
        )

        logger.info(
            "[NOTIFY_TASK] Notification delivered task_id=%s notification_id=%s type=%s",
            self.request.id, str(notification.id), notification_type,
        )
        return {
            "status": "ok",
            "notification_id": str(notification.id),
            "task_id": str(self.request.id),
        }

    except Exception as exc:
        # Retry on transient errors (network, DB lock, SMS gateway timeout).
        # NotificationService's idempotency_key check ensures a Celery retry
        # won't create a duplicate notification if the record was already committed.
        return self.safe_retry(
            exc,
            user_id=user_id,
            notification_type=notification_type,
            idempotency_key=idempotency_key,
        )
