"""
FAAZO – Email Authentication Backend

Replaces Django's default ModelBackend.
Authenticates users by email (case-insensitive) instead of username.

Full implementation used by Phase 3 login flow.
"""

import logging

from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

logger = logging.getLogger("faazo.auth")


class EmailAuthBackend(ModelBackend):
    """
    Authenticate using email address (case-insensitive).

    Falls back to Django's default permission and session logic
    via ModelBackend parent class.
    """

    def authenticate(self, request, email: str = None, password: str = None, username: str = None, **kwargs):
        # Support email passed in username or email kwarg, or phone number
        identifier = email or username
        if not identifier or not password:
            return None

        from apps.users.models import User
        from apps.authentication.services import LockoutService, AuditService

        try:
            # Flexible lookup: case-insensitive email or phone number match
            user = User.objects.get(
                Q(email__iexact=identifier) | Q(phone_number=identifier)
            )
        except User.DoesNotExist:
            # Run the hasher to mitigate timing attacks
            User().set_password(password)
            AuditService.log_event(
                action="LOGIN_FAILED",
                status="FAILURE",
                ip_address=request.META.get("REMOTE_ADDR") if request else None,
                details={"reason": "user_not_found", "identifier": identifier},
            )
            return None
        except User.MultipleObjectsReturned:
            logger.error("Multiple users found for identifier %s — database integrity issue", identifier)
            return None

        # Check account lockout status
        is_locked, locked_until = LockoutService.check_lockout(user)
        if is_locked:
            AuditService.log_event(
                action="LOGIN_LOCKED",
                user=user,
                status="FAILURE",
                ip_address=request.META.get("REMOTE_ADDR") if request else None,
                details={"locked_until": str(locked_until)},
            )
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            LockoutService.reset_attempts(user)
            AuditService.log_event(
                action="LOGIN_SUCCESS",
                user=user,
                status="SUCCESS",
                ip_address=request.META.get("REMOTE_ADDR") if request else None,
            )
            return user
        else:
            attempts = LockoutService.register_failed_attempt(user)
            AuditService.log_event(
                action="LOGIN_FAILED",
                user=user,
                status="FAILURE",
                ip_address=request.META.get("REMOTE_ADDR") if request else None,
                details={"failed_attempts": attempts},
            )
            return None

    def get_user(self, user_id):
        from apps.users.models import User
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None


from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

class FAAZOJWTAuthentication(JWTAuthentication):
    """
    Enterprise Custom JWT Authentication class.
    Validates token signature, user active status, account lockout, profile block status,
    and active DeviceSession binding.
    """
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if user is None:
            return None

        if not user.is_active:
            raise AuthenticationFailed("User account is inactive.", code="user_inactive")

        if user.is_locked:
            raise AuthenticationFailed("Account is temporarily locked due to failed login attempts.", code="user_locked")

        profile = getattr(user, "profile", None)
        if profile:
            if profile.is_blocked:
                raise AuthenticationFailed("This account has been blocked by an administrator.", code="user_blocked")
            if profile.is_deleted:
                raise AuthenticationFailed("This account has been deleted.", code="user_deleted")

        # Verify active DeviceSession if token contains session key / JTI
        jti = validated_token.get("jti")
        if jti:
            from apps.authentication.models import DeviceSession
            session = DeviceSession.objects.filter(session_key=jti).first()
            if session and not session.is_active:
                raise AuthenticationFailed("Session has been revoked or logged out.", code="session_revoked")

        return user
