"""
Multi-device active session management service.
Tracks user sessions, device metadata, and handles remote session revocation.
"""

import logging
from django.utils import timezone
from apps.authentication.models import DeviceSession

logger = logging.getLogger("faazo.auth")


class SessionService:
    @staticmethod
    def create_session(
        user,
        session_key: str,
        device_name: str = "Unknown Device",
        ip_address: str | None = None,
        user_agent: str | None = None,
        expires_at=None,
    ) -> DeviceSession:
        """
        Record a new active device session on successful login.
        """
        session, created = DeviceSession.objects.update_or_create(
            user=user,
            session_key=session_key,
            defaults={
                "device_name": device_name,
                "ip_address": ip_address,
                "user_agent": user_agent or "",
                "is_active": True,
                "last_active_at": timezone.now(),
                "expires_at": expires_at,
            },
        )
        return session

    @staticmethod
    def revoke_session(user, session_key: str) -> bool:
        """
        Revoke a specific active device session by session key / JTI.
        """
        updated_count = DeviceSession.objects.filter(
            user=user, session_key=session_key, is_active=True
        ).update(is_active=False)
        return updated_count > 0

    @staticmethod
    def revoke_all_sessions(user, exclude_session_key: str | None = None) -> int:
        """
        Revoke all active device sessions for a user (e.g. Logout All Devices).
        Optionally exclude the current session.
        """
        queryset = DeviceSession.objects.filter(user=user, is_active=True)
        if exclude_session_key:
            queryset = queryset.exclude(session_key=exclude_session_key)

        updated_count = queryset.update(is_active=False)
        logger.info(f"[SessionService] Revoked {updated_count} active sessions for user {user.email}")
        return updated_count

    @staticmethod
    def get_active_sessions(user):
        """
        Retrieve all active device sessions for a user.
        """
        return DeviceSession.objects.filter(user=user, is_active=True).order_by("-last_active_at")
