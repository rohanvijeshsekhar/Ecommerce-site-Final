"""
FAAZO – Authentication Background Celery Tasks
==============================================

Handles asynchronous, non-blocking email dispatch for authentication workflows:
- Password reset emails
- Password reset success confirmation
- Email verification links
- Welcome emails
"""

import logging
from celery import shared_task
from django.contrib.auth import get_user_model
from apps.common.tasks.base import FAAZOBaseTask

logger = logging.getLogger("faazo.auth.tasks")
User = get_user_model()


@shared_task(
    bind=True,
    base=FAAZOBaseTask,
    name="faazo.auth.send_password_reset_email",
    max_retries=3,
    queue="notifications",
    ignore_result=True,
)
def send_password_reset_email_async(self, *, user_id: str, raw_token: str) -> dict:

    """
    Asynchronously send password reset email to user.

    Arguments:
        user_id   - str(user.pk)
        raw_token - Unhashed 64-char hex reset token
    """
    from apps.authentication.services.legacy_services import EmailService

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.warning("[AUTH_TASK] User %s not found. Dropping password reset email task.", user_id)
        return {"status": "dropped", "reason": "user_not_found"}

    try:
        success = EmailService.send_password_reset_email(user, raw_token)
        logger.info("[AUTH_TASK] Password reset email sent async to %s (success=%s)", user.email, success)
        return {"status": "ok" if success else "failed", "user_id": str(user_id)}
    except Exception as exc:
        return self.safe_retry(exc, user_id=user_id, raw_token=raw_token)


@shared_task(
    bind=True,
    base=FAAZOBaseTask,
    name="faazo.auth.send_password_reset_success_async",
    max_retries=3,
    queue="notifications",
    ignore_result=True,
)
def send_password_reset_success_async(self, *, user_id: str) -> dict:

    """
    Asynchronously send password reset success confirmation email.
    """
    from apps.authentication.services.legacy_services import EmailService

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.warning("[AUTH_TASK] User %s not found. Dropping success email task.", user_id)
        return {"status": "dropped", "reason": "user_not_found"}

    try:
        success = EmailService.send_password_reset_success(user)
        logger.info("[AUTH_TASK] Password reset success email sent async to %s", user.email)
        return {"status": "ok" if success else "failed", "user_id": str(user_id)}
    except Exception as exc:
        return self.safe_retry(exc, user_id=user_id)


@shared_task(
    bind=True,
    base=FAAZOBaseTask,
    name="faazo.auth.send_password_reset_otp_email",
    max_retries=3,
    queue="notifications",
    ignore_result=True,
)
def send_password_reset_otp_email_async(self, *, email: str, otp_code: str, user_id: str | None = None) -> dict:
    """
    Asynchronously dispatch 6-digit Password Reset OTP email.
    """
    from apps.authentication.providers import EmailOTPProvider

    user = None
    if user_id:
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            pass

    try:
        success = EmailOTPProvider().send_otp(
            target=email,
            otp_code=otp_code,
            purpose="password_reset",
            user=user,
        )
        logger.info("[AUTH_TASK] Password reset OTP email dispatched async to %s (success=%s)", email, success)
        return {"status": "ok" if success else "failed", "email": email}
    except Exception as exc:
        return self.safe_retry(exc, email=email, otp_code=otp_code, user_id=user_id)

