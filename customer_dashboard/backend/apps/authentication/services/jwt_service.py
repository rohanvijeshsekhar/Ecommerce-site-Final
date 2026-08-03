"""
Enterprise Production-Ready JWT & Session Management Service.
Handles Refresh Token Rotation, Reuse Detection, Token Blacklisting,
DeviceSession binding, and Logout All Devices.
"""

from datetime import timedelta
import logging
from typing import Tuple

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken

from apps.authentication.models import DeviceSession
from apps.authentication.services.audit_service import AuditService
from apps.authentication.services.session_service import SessionService

logger = logging.getLogger("faazo.auth")
User = get_user_model()


class JWTService:
    @classmethod
    def get_max_active_sessions(cls) -> int:
        return getattr(settings, "MAX_ACTIVE_SESSIONS", 10)

    @classmethod
    def generate_tokens_for_user(cls, user, remember_me=False) -> dict:
        """
        Legacy compatibility method for registration, dealer registration and v1 login.
        Invokes issue_token_pair_for_user internally to ensure DeviceSession binding.
        """
        return cls.issue_token_pair_for_user(
            user=user,
            device_name="Web Browser (V1 Session)",
        )

    @classmethod
    def issue_token_pair_for_user(
        cls,
        user,
        device_name: str = "Unknown Device",
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict:
        """
        Issue a new JWT access & refresh token pair and bind it to a DeviceSession.
        Enforces maximum active session limit by revoking oldest active session.
        """
        # Enforce max active sessions per user
        max_allowed = cls.get_max_active_sessions()
        active_sessions = SessionService.get_active_sessions(user)
        if active_sessions.count() >= max_allowed:
            oldest_session = active_sessions.last()
            if oldest_session:
                oldest_session.is_active = False
                oldest_session.save(update_fields=["is_active"])
                logger.info(f"[JWTService] Pruned oldest active session {oldest_session.session_key} for {user.email}")

        refresh = RefreshToken.for_user(user)
        refresh["email"] = user.email
        refresh["role"] = user.role
        refresh["full_name"] = user.full_name

        access = refresh.access_token
        access["email"] = user.email
        access["role"] = user.role
        access["is_staff"] = user.is_staff
        access["is_superuser"] = user.is_superuser
        access["full_name"] = user.full_name

        jti = str(refresh.get("jti", ""))
        refresh_lifetime = getattr(
            settings,
            "SIMPLE_JWT",
            {},
        ).get("REFRESH_TOKEN_LIFETIME", timedelta(days=7))
        expires_at = timezone.now() + refresh_lifetime

        # Create & bind DeviceSession
        session = SessionService.create_session(
            user=user,
            session_key=jti,
            device_name=device_name,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=expires_at,
        )

        return {
            "access": str(access),
            "refresh": str(refresh),
            "access_expires_in": int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
            "refresh_expires_in": int(refresh_lifetime.total_seconds()),
            "session_key": session.session_key,
        }

    @classmethod
    def rotate_and_refresh_token(
        cls,
        refresh_token_str: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> Tuple[bool, dict | None, str]:
        """
        Refresh access token using refresh token rotation.
        Detects token reuse: if a previously rotated/blacklisted refresh token is presented,
        immediately revokes ALL user sessions and logs TOKEN_REUSE_DETECTED.
        """
        if not refresh_token_str:
            return False, None, "Refresh token is required."

        try:
            old_token = RefreshToken(refresh_token_str)
            jti = str(old_token.get("jti", ""))
            user_id = old_token.get("user_id")

            try:
                user = User.objects.get(pk=user_id)
            except User.DoesNotExist:
                return False, None, "User associated with token does not exist."

            # Check if matching session exists and is active
            session = DeviceSession.objects.filter(session_key=jti).first()

            # REUSE DETECTION: If token is blacklisted or session is revoked/inactive
            is_blacklisted = BlacklistedToken.objects.filter(token__jti=jti).exists()
            if is_blacklisted or (session and not session.is_active):
                logger.critical(
                    f"[SECURITY ALERT] Refresh token reuse detected for user {user.email}! Revoking all sessions."
                )
                cls.logout_all_devices(user, ip_address=ip_address, user_agent=user_agent)
                AuditService.log_event(
                    action="TOKEN_REUSE_DETECTED",
                    user=user,
                    status="FAILURE",
                    ip_address=ip_address,
                    user_agent=user_agent,
                    details={"jti": jti, "reason": "reuse_of_rotated_token"},
                )
                return False, None, "Security violation: Token reuse detected. All active sessions have been terminated."

            # Check automatic session expiration
            if session and session.expires_at and timezone.now() > session.expires_at:
                session.is_active = False
                session.save(update_fields=["is_active"])
                return False, None, "Session expired. Please log in again."

            # Rotate token
            new_refresh = RefreshToken.for_user(user)
            new_refresh["email"] = user.email
            new_refresh["role"] = user.role
            new_refresh["full_name"] = user.full_name
            new_jti = str(new_refresh.get("jti", ""))

            # Blacklist old token
            old_token.blacklist()

            # Update DeviceSession key to new rotated JTI
            # Note: last_active_at is auto_now=True — it updates on every save() automatically.
            if session:
                session.session_key = new_jti
                session.save(update_fields=["session_key"])

            AuditService.log_event(
                action="TOKEN_REFRESHED",
                user=user,
                status="SUCCESS",
                ip_address=ip_address,
                user_agent=user_agent,
            )

            refresh_lifetime = settings.SIMPLE_JWT.get("REFRESH_TOKEN_LIFETIME", timedelta(days=7))
            payload = {
                "access": str(new_refresh.access_token),
                "refresh": str(new_refresh),
                "access_expires_in": int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
                "refresh_expires_in": int(refresh_lifetime.total_seconds()),
            }
            return True, payload, "Token refreshed successfully."

        except TokenError as exc:
            err_msg = str(exc)
            if "blacklisted" in err_msg.lower():
                try:
                    untyped = UntypedToken(refresh_token_str)
                    user_id = untyped.get("user_id")
                    jti = str(untyped.get("jti", ""))
                    if user_id:
                        user = User.objects.filter(pk=user_id).first()
                        if user:
                            logger.critical(
                                f"[SECURITY ALERT] Blacklisted refresh token reuse detected for user {user.email}! Revoking all active sessions."
                            )
                            cls.logout_all_devices(user, ip_address=ip_address, user_agent=user_agent)
                            AuditService.log_event(
                                action="TOKEN_REUSE_DETECTED",
                                user=user,
                                status="FAILURE",
                                ip_address=ip_address,
                                user_agent=user_agent,
                                details={"jti": jti, "reason": "blacklisted_token_reuse"},
                            )
                            return False, None, "Security violation: Token reuse detected. All active sessions have been terminated."
                except Exception as e:
                    logger.error(f"Error inspecting blacklisted token reuse: {e}")

            logger.warning(f"[JWTService] Token refresh failed: {exc}")
            return False, None, "Invalid or expired refresh token."

    @classmethod
    def logout_session(
        cls,
        refresh_token_str: str,
        user=None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> Tuple[bool, str]:
        """
        Log out current device session, blacklist refresh token, and deactivate session.
        """
        if not refresh_token_str:
            return False, "Refresh token is required."

        try:
            token = RefreshToken(refresh_token_str)
            jti = str(token.get("jti", ""))
            user_id = token.get("user_id")

            if not user and user_id:
                user = User.objects.filter(pk=user_id).first()

            token.blacklist()
            DeviceSession.objects.filter(session_key=jti).update(is_active=False)

            AuditService.log_event(
                action="LOGOUT",
                user=user,
                status="SUCCESS",
                ip_address=ip_address,
                user_agent=user_agent,
            )
            return True, "Successfully logged out."
        except TokenError:
            return False, "Token is invalid or already blacklisted."

    @classmethod
    def logout_all_devices(
        cls,
        user,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> Tuple[bool, str]:
        """
        Revoke all active device sessions and blacklist all outstanding JWT tokens for user.
        """
        if not user:
            return False, "User reference required."

        try:
            # ── H1 Fix: Bulk blacklist in one query instead of N+1 per token ──
            tokens = OutstandingToken.objects.filter(user=user)
            token_ids = list(tokens.values_list("id", flat=True))

            # Identify which tokens are NOT already blacklisted
            already_blacklisted_ids = set(
                BlacklistedToken.objects.filter(token_id__in=token_ids).values_list("token_id", flat=True)
            )
            new_blacklist_entries = [
                BlacklistedToken(token_id=tid)
                for tid in token_ids
                if tid not in already_blacklisted_ids
            ]
            if new_blacklist_entries:
                BlacklistedToken.objects.bulk_create(new_blacklist_entries, ignore_conflicts=True)

            SessionService.revoke_all_sessions(user)

            AuditService.log_event(
                action="LOGOUT_ALL",
                user=user,
                status="SUCCESS",
                ip_address=ip_address,
                user_agent=user_agent,
            )
            return True, "Successfully logged out from all devices."
        except Exception as exc:
            logger.error(f"[JWTService Error] Failed logout all devices for {user}: {exc}", exc_info=True)
            return False, "Failed to log out from all devices."

    @classmethod
    def blacklist_all_user_tokens(cls, user) -> Tuple[bool, str]:
        """Alias method to revoke all device sessions and blacklist all outstanding tokens."""
        return cls.logout_all_devices(user)

