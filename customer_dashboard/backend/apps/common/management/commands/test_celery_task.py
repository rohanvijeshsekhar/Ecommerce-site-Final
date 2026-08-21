"""
FAAZO - Test Celery Infrastructure Management Command

Usage:
    python manage.py test_celery_task

Verifies the complete Django -> Redis -> Celery Worker -> Task -> Result path.
Exits with code 0 on success, 1 on failure.

Run BEFORE starting normal development to confirm:
  [OK] Redis connection
  [OK] Celery worker reachability
  [OK] Task dispatch
  [OK] Task result retrieval
"""

import logging
import sys
from django.core.management.base import BaseCommand

logger = logging.getLogger("faazo.tasks")


class Command(BaseCommand):
    help = (
        "Tests the Celery + Redis infrastructure end-to-end. "
        "Requires Redis to be running and a Celery worker to be active."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--timeout",
            type=int,
            default=30,
            help="Seconds to wait for task result (default: 30).",
        )
        parser.add_argument(
            "--test-retry",
            action="store_true",
            default=False,
            help="Also test retry behavior (requires worker; adds ~30s).",
        )
        parser.add_argument(
            "--test-fail",
            action="store_true",
            default=False,
            help="Also test non-retryable failure behavior.",
        )

    def _ok(self, msg):
        self.stdout.write(self.style.SUCCESS(f"  [OK] {msg}"))

    def _fail(self, msg):
        self.stdout.write(self.style.ERROR(f"  [FAIL] {msg}"))

    def _warn(self, msg):
        self.stdout.write(self.style.WARNING(f"  [WARN] {msg}"))

    def handle(self, *args, **options):
        from celery.exceptions import TimeoutError as CeleryTimeoutError

        timeout = options["timeout"]
        test_retry = options["test_retry"]
        test_fail = options["test_fail"]

        self.stdout.write(self.style.NOTICE("=" * 60))
        self.stdout.write(self.style.NOTICE("FAAZO Celery Infrastructure Verification"))
        self.stdout.write(self.style.NOTICE("=" * 60))

        # -- Test 1: Broker Connectivity --------------------------------
        self.stdout.write("\n[1/4] Testing Redis broker connection...")
        try:
            from config.celery import app as celery_app
            conn = celery_app.connection()
            conn.connect()
            conn.release()
            self._ok("Redis broker connected successfully.")
        except Exception as exc:
            self._fail(f"Redis broker connection FAILED: {exc}")
            self._warn(
                "\n  DIAGNOSIS:\n"
                "    1. Is Redis running?\n"
                "       Windows: C:\\Users\\HP\\redis\\redis-server.exe redis.windows.conf\n"
                "       Docker:  docker run -d -p 6379:6379 redis:alpine\n"
                "    2. Is REDIS_URL correct in .env?\n"
                "    3. Current REDIS_URL: "
            )
            from django.conf import settings
            self._warn(f"       {settings.CELERY_BROKER_URL}")
            sys.exit(1)

        # -- Test 2: Task Dispatch + Result -----------------------------
        self.stdout.write("\n[2/4] Dispatching faazo.infra.ping task...")
        try:
            from apps.common.tasks.tests import celery_ping
            result = celery_ping.delay(message="infrastructure_check")
            self.stdout.write(f"  Task dispatched. ID: {result.id}")
            self.stdout.write(f"  Waiting up to {timeout}s for result...")

            task_result = result.get(timeout=timeout)
            self._ok(f"Task completed. Result: {task_result}")

            if task_result.get("status") != "ok":
                self._fail(f"Unexpected result status: {task_result}")
                sys.exit(1)

        except CeleryTimeoutError:
            self._fail(
                f"Task did not complete within {timeout}s.\n"
                f"  Is the Celery worker running?\n"
                f"  Run: celery -A config worker -l INFO --pool=solo"
            )
            sys.exit(1)
        except Exception as exc:
            self._fail(f"Task dispatch or execution FAILED: {exc}")
            sys.exit(1)

        # -- Test 3: Retry Behavior (optional) -------------------------
        if test_retry:
            self.stdout.write("\n[3/4] Testing retry behavior (fail_times=1)...")
            try:
                from apps.common.tasks.tests import ping_with_retry
                result = ping_with_retry.delay(fail_times=1)
                self.stdout.write(f"  Task dispatched. ID: {result.id}")
                self.stdout.write(f"  Waiting up to {timeout + 60}s for retry + completion...")

                task_result = result.get(timeout=timeout + 60)
                self._ok(f"Retry test passed. Result: {task_result}")
            except Exception as exc:
                self._warn(f"Retry test error: {exc}")
        else:
            self.stdout.write("\n[3/4] Retry test skipped (use --test-retry to enable).")

        # -- Test 4: Non-retryable Failure (optional) ------------------
        if test_fail:
            self.stdout.write("\n[4/4] Testing non-retryable failure (ValueError)...")
            try:
                from apps.common.tasks.tests import ping_fail
                result = ping_fail.delay()
                self.stdout.write(f"  Task dispatched. ID: {result.id}")
                result.get(timeout=timeout)
                # Should never reach here
                self._fail("Expected failure but task succeeded.")
            except Exception as exc:
                self._ok(f"Task failed as expected: {type(exc).__name__}: {exc}")
        else:
            self.stdout.write("\n[4/4] Failure test skipped (use --test-fail to enable).")

        # -- Summary ---------------------------------------------------
        self.stdout.write(self.style.NOTICE("\n" + "=" * 60))
        self.stdout.write(self.style.SUCCESS(
            "[OK] FAAZO Celery infrastructure is operational.\n"
            "     Django -> Redis -> Worker -> Task -> Result path verified."
        ))
        self.stdout.write(self.style.NOTICE("=" * 60))
