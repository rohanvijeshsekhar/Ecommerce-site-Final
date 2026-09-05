"""
FAAZO – Enterprise Order Background & Outbox Tasks

Production-grade asynchronous background processing using Celery + Transactional Outbox.

Architecture:
1. Critical database transaction commits (Order, Inventory, Cart, Payment, OutboxEvent).
2. transaction.on_commit() dispatches `process_outbox_event.apply_async()`.
3. Celery worker executes `process_outbox_event` (In-App notification, GST Invoice PDF, Email, SMS).
4. If Redis/Celery is temporarily offline at checkout time:
   The OutboxEvent is 100% ACID-committed in the database.
   The periodic `sweep_pending_outbox_events` Celery Beat task drains and executes it automatically.
5. All operations are strictly idempotent (OutboxEvent status lock + Notification.idempotency_key).
"""

from datetime import timedelta
import logging
from celery import shared_task
from django.conf import settings
from django.db import models, transaction
from django.utils import timezone

from apps.common.tasks.base import FAAZOBaseTask

logger = logging.getLogger("faazo.tasks")


@shared_task(
    bind=True,
    base=FAAZOBaseTask,
    name="faazo.orders.post_order_success_notify",
    max_retries=3,
    queue="notifications",
)
def post_order_success_notify(self=None, *, order_id: str) -> dict:
    """
    Send ORDER_PLACED in-app notification, email with attached PDF GST Tax Invoice, and SMS.

    Idempotency: NotificationService.create() uses
        idempotency_key=f"order_placed_{order_id}"
    which maps to Notification.idempotency_key (unique DB constraint).
    Celery retries are safe — duplicates are de-duplicated at the DB level.
    """
    from apps.orders.models import Order
    from apps.notifications.services.notification_service import NotificationService
    from apps.notifications.models import NotificationType

    task_id = str(self.request.id) if self and hasattr(self, "request") and self.request else "sync"

    logger.info(
        "[ORDER_TASK] post_order_success_notify task_id=%s order_id=%s",
        task_id, order_id,
    )

    try:
        order = Order.objects.select_related("user", "shipping_address").get(pk=order_id)
    except Order.DoesNotExist:
        logger.warning(
            "[ORDER_TASK] Order %s not found. Dropping notification. task_id=%s",
            order_id, task_id,
        )
        return {"status": "dropped", "reason": "order_not_found", "task_id": task_id}

    try:
        from apps.notifications.models import DeliveryChannel

        # Build order item summary context for email template
        items_serialized = []
        for order_item in order.items.select_related("product").all():
            items_serialized.append({
                "name": order_item.product.name,
                "qty": order_item.quantity,
                "price": str(order_item.price),
            })

        phone = (
            order.shipping_mobile
            or getattr(order.user, "phone_number", None)
            or getattr(getattr(order.user, "profile", None), "phone_number", None)
            or (order.shipping_address.mobile if order.shipping_address else None)
        )

        shipping_name = (
            order.shipping_full_name
            or getattr(order.user, "full_name", None)
            or "Doctor"
        )

        addr_line1 = order.shipping_line1 or (order.shipping_address.line1 if order.shipping_address else "")
        addr_line2 = order.shipping_line2 or (order.shipping_address.line2 if order.shipping_address else "")
        city = order.shipping_city or (order.shipping_address.city if order.shipping_address else "")
        state = order.shipping_state or (order.shipping_address.state if order.shipping_address else "")
        pincode = order.shipping_pincode or (order.shipping_address.pincode if order.shipping_address else "")

        order_date_str = order.created_at.strftime("%d %b %Y, %I:%M %p") if order.created_at else timezone.now().strftime("%d %b %Y, %I:%M %p")

        notification = NotificationService.create(
            user=order.user,
            notification_type=NotificationType.ORDER_PLACED,
            idempotency_key=f"order_placed_{order_id}",
            channels=[DeliveryChannel.IN_APP, DeliveryChannel.EMAIL, DeliveryChannel.SMS],
            context={
                "order_id": str(order.id),
                "order_number": order.order_number or str(order.id)[:8],
                "invoice_number": order.invoice_number or f"INV-{order.order_number}",
                "total_amount": str(order.total_amount),
                "taxable_subtotal": str(order.taxable_subtotal) if hasattr(order, "taxable_subtotal") else str(order.total_amount),
                "gst_amount": str(order.gst_amount) if hasattr(order, "gst_amount") else "0.00",
                "shipping_fee": str(order.shipping_fee) if hasattr(order, "shipping_fee") else "0.00",
                "payment_method": (order.payment_method or "Online (Razorpay)").upper(),
                "order_date": order_date_str,
                "first_name": getattr(order.user, "full_name", None) or "Doctor",
                "shipping_name": shipping_name,
                "shipping_address_line1": addr_line1,
                "shipping_address_line2": addr_line2,
                "shipping_city": city,
                "shipping_state": state,
                "shipping_pincode": pincode,
                "items": items_serialized,
                "email": getattr(order.user, "email", ""),
                "phone": phone,
            },
            action_url=f"/orders/{order.id}",
            metadata={"order_id": str(order.id), "order_number": order.order_number or str(order.id)[:8]},
        )

        logger.info(
            "[ORDER_TASK] ORDER_PLACED notification sent (IN_APP + EMAIL + SMS) notification_id=%s order_id=%s task_id=%s",
            str(notification.id), order_id, task_id,
        )
        return {
            "status": "ok",
            "notification_id": str(notification.id),
            "order_id": order_id,
            "task_id": task_id,
        }

    except Exception as exc:
        if self and hasattr(self, "safe_retry"):
            return self.safe_retry(exc, order_id=order_id)
        logger.error("[ORDER_TASK_EXCEPTION] Error in post_order_success_notify for order %s: %s", order_id, exc)
        return {"status": "error", "reason": str(exc), "order_id": order_id}


@shared_task(
    bind=True,
    base=FAAZOBaseTask,
    name="faazo.orders.process_outbox_event",
    max_retries=5,
    queue="notifications",
)
def process_outbox_event(self=None, *, outbox_id: str) -> dict:
    """
    Process a single Transactional Outbox Event asynchronously.
    Guarantees at-least-once execution with row-level locking and idempotency protection.
    """
    from apps.orders.models import OutboxEvent, OutboxStatus

    task_id = str(self.request.id) if self and hasattr(self, "request") and self.request else "sync"

    with transaction.atomic():
        outbox = (
            OutboxEvent.objects.select_for_update()
            .filter(id=outbox_id)
            .first()
        )

        if not outbox:
            logger.warning("[OUTBOX_TASK] OutboxEvent %s not found. task_id=%s", outbox_id, task_id)
            return {"status": "dropped", "reason": "outbox_not_found", "task_id": task_id}

        # Idempotency guard: do not re-process already completed events
        if outbox.status == OutboxStatus.PROCESSED:
            logger.info("[OUTBOX_TASK] OutboxEvent %s is already PROCESSED. Skipping.", outbox_id)
            return {"status": "already_processed", "outbox_id": outbox_id}

        outbox.status = OutboxStatus.PROCESSING
        outbox.attempt_count += 1
        outbox.save(update_fields=["status", "attempt_count", "updated_at"])

    try:
        if outbox.event_type in ("ORDER_PLACED", "ORDER_CONFIRMED"):
            result = post_order_success_notify(order_id=outbox.aggregate_id)
        else:
            logger.info("[OUTBOX_TASK] Unhandled event_type: %s", outbox.event_type)
            result = {"status": "unhandled_event_type"}

        with transaction.atomic():
            outbox.refresh_from_db()
            outbox.status = OutboxStatus.PROCESSED
            outbox.processed_at = timezone.now()
            outbox.last_error = ""
            outbox.save(update_fields=["status", "processed_at", "last_error", "updated_at"])

        logger.info("[OUTBOX_TASK_SUCCESS] Processed OutboxEvent %s (type=%s)", outbox_id, outbox.event_type)
        return {"status": "processed", "outbox_id": outbox_id, "result": result}

    except Exception as exc:
        logger.error("[OUTBOX_TASK_FAILED] Failed processing OutboxEvent %s: %s", outbox_id, exc, exc_info=True)
        delay = 30 * (2 ** min(outbox.attempt_count, 5))

        with transaction.atomic():
            outbox.refresh_from_db()
            outbox.last_error = str(exc)[:2000]
            outbox.next_retry_at = timezone.now() + timedelta(seconds=delay)
            if outbox.attempt_count >= outbox.max_attempts:
                outbox.status = OutboxStatus.FAILED
            else:
                outbox.status = OutboxStatus.PENDING
            outbox.save(update_fields=["status", "last_error", "next_retry_at", "updated_at"])

        if self and hasattr(self, "safe_retry"):
            return self.safe_retry(exc, outbox_id=outbox_id)
        return {"status": "error", "outbox_id": outbox_id, "error": str(exc)}


@shared_task(
    name="faazo.orders.sweep_pending_outbox_events",
    queue="notifications",
)
def sweep_pending_outbox_events(limit: int = 50) -> dict:
    """
    Celery Beat Periodic Sweeper (runs every 60s).
    1. Recovers stale PROCESSING events in DB (workers killed or crashed > 5 minutes ago).
    2. Finds PENDING or FAILED OutboxEvents whose next_retry_at <= now, and dispatches them to workers.
    Ensures zero lost events even if Redis or workers were offline during customer checkout.
    """
    from apps.orders.models import OutboxEvent, OutboxStatus

    now = timezone.now()

    # Step 1: Recover stale PROCESSING events (workers crashed / timed out)
    stale_cutoff = now - timedelta(minutes=5)
    stale_events = OutboxEvent.objects.filter(
        status=OutboxStatus.PROCESSING,
        updated_at__lte=stale_cutoff,
        attempt_count__lt=models.F("max_attempts"),
    )
    recovered_stale_count = stale_events.update(
        status=OutboxStatus.PENDING,
        last_error="Recovered by sweeper from stale PROCESSING state (worker crash/timeout)",
        updated_at=now,
    )
    if recovered_stale_count > 0:
        logger.warning("[OUTBOX_SWEEPER] Recovered %d stale PROCESSING outbox events back to PENDING.", recovered_stale_count)

    # Step 2: Check broker reachability before attempting dispatch
    if not _is_broker_reachable() and not getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
        logger.warning("[OUTBOX_SWEEPER] Broker is offline. Dispatches deferred to next schedule cycle.")
        return {
            "status": "broker_offline",
            "recovered_stale_count": recovered_stale_count,
            "dispatched_count": 0,
        }

    # Step 3: Fetch runnable pending events
    pending_events = (
        OutboxEvent.objects.filter(
            status__in=[OutboxStatus.PENDING, OutboxStatus.FAILED],
            attempt_count__lt=models.F("max_attempts"),
            next_retry_at__lte=now,
        )
        .order_by("created_at")[:limit]
    )

    dispatched_count = 0
    for event in pending_events:
        try:
            if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
                process_outbox_event(outbox_id=str(event.id))
            else:
                process_outbox_event.apply_async(kwargs={"outbox_id": str(event.id)}, queue="notifications")
            dispatched_count += 1
        except Exception as exc:
            logger.warning("[OUTBOX_SWEEPER] Failed to dispatch OutboxEvent %s: %s", event.id, exc)
            break

    if dispatched_count > 0:
        logger.info("[OUTBOX_SWEEPER] Dispatched %d pending outbox events to Celery worker.", dispatched_count)

    return {
        "status": "ok",
        "recovered_stale_count": recovered_stale_count,
        "dispatched_count": dispatched_count,
    }


def _is_broker_reachable() -> bool:
    """
    Quick Redis broker connectivity probe with a 200ms timeout.
    Prevents Celery apply_async() from hanging and retrying 20+ times
    when the Redis broker is offline during HTTP requests.
    """
    try:
        import redis
        url = getattr(settings, "CELERY_BROKER_URL", None) or getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
        r = redis.from_url(url, socket_connect_timeout=0.2, socket_timeout=0.2)
        r.ping()
        return True
    except Exception:
        return False


def dispatch_order_success_notification(order_id: str):
    """
    Dispatcher called by transaction.on_commit() when an order is created.
    Guarantees that OutboxEvent is created in DB and queued to Celery.
    """
    from apps.orders.models import OutboxEvent, OutboxStatus

    outbox_event, _ = OutboxEvent.objects.get_or_create(
        idempotency_key=f"outbox_order_placed_{order_id}",
        defaults={
            "event_type": "ORDER_PLACED",
            "aggregate_type": "Order",
            "aggregate_id": str(order_id),
            "payload": {"order_id": str(order_id)},
            "status": OutboxStatus.PENDING,
            "next_retry_at": timezone.now(),
        },
    )

    outbox_id = str(outbox_event.id)

    # In Eager / Synchronous mode (e.g. Unit tests): execute in-process immediately
    if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
        process_outbox_event(outbox_id=outbox_id)
        return

    # Production Asynchronous Path: dispatch to Celery worker if broker is reachable
    if _is_broker_reachable():
        try:
            process_outbox_event.apply_async(
                kwargs={"outbox_id": outbox_id},
                queue="notifications",
                expires=1800,
            )
        except Exception as exc:
            logger.warning("[OUTBOX_DISPATCH_WARNING] Celery apply_async failed: %s", exc)
    else:
        logger.info(
            "[OUTBOX] Celery broker is currently offline. OutboxEvent %s committed in DB (PENDING) and will be processed by Celery Sweeper.",
            outbox_id,
        )
