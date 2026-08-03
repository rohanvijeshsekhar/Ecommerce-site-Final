"""
Brute-force protection & account lockout service.
Manages consecutive failed login tracking and temporary account locking.
"""

from datetime import timedelta
import logging
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger("faazo.auth")


class LockoutService:
    @classmethod
    def get_max_attempts(cls) -> int:
        return getattr(settings, "LOGIN_FAIL_MAX_ATTEMPTS", 5)

    @classmethod
    def get_lockout_minutes(cls) -> int:
        return getattr(settings, "LOGIN_FAIL_LOCKOUT_MINUTES", 15)

    @classmethod
    def check_lockout(cls, user) -> tuple[bool, timezone.datetime | None]:
        """
        Check if user is locked out due to failed attempts.
        """
        if not user or not getattr(user, "locked_until", None):
            return False, None

        if user.is_locked:
            return True, user.locked_until

        # Lockout expired — clear lockout status
        user.locked_until = None
        user.failed_login_attempts = 0
        user.save(update_fields=["locked_until", "failed_login_attempts"])
        return False, None

    @classmethod
    def register_failed_attempt(cls, user) -> int:
        """
        Increment failed attempt counter and lock account if max attempts reached.
        """
        if not user:
            return 0

        # Check if already locked out
        is_locked, _ = cls.check_lockout(user)
        if is_locked:
            return user.failed_login_attempts

        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= cls.get_max_attempts():
            user.locked_until = timezone.now() + timedelta(minutes=cls.get_lockout_minutes())
            logger.warning(
                f"[LockoutService] Account locked for email={user.email} until {user.locked_until}"
            )

        user.save(update_fields=["failed_login_attempts", "locked_until"])
        return user.failed_login_attempts

    @classmethod
    def reset_attempts(cls, user) -> None:
        """
        Reset failed login counter and update last login timestamp on successful auth.
        """
        if not user:
            return

        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_at = timezone.now()
        user.save(update_fields=["failed_login_attempts", "locked_until", "last_login_at"])
