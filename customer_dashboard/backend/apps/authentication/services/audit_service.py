"""
Enterprise Security Audit Logging Service.
Logs security-sensitive actions to the AuditLog model.
"""

import logging
import uuid
from datetime import datetime
from django.utils import timezone
from apps.authentication.models import AuditLog

logger = logging.getLogger("faazo.audit")


def _json_safe(obj):
    """Recursively convert non-JSON-serializable values to strings."""
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_json_safe(v) for v in obj]
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


class AuditService:
    @staticmethod
    def log_event(
        action: str,
        user=None,
        status: str = "SUCCESS",
        ip_address: str | None = None,
        user_agent: str | None = None,
        details: dict | None = None,
    ) -> AuditLog:
        """
        Record a security event in the immutable AuditLog table.
        """
        details = _json_safe(details or {})
        try:
            log_entry = AuditLog.objects.create(
                user=user if getattr(user, "is_authenticated", False) else None,
                action=action,
                status=status,
                ip_address=ip_address,
                user_agent=user_agent or "",
                details=details,
            )
            logger.info(
                f"[AuditLog] Action={action} Status={status} User={user} IP={ip_address}"
            )
            return log_entry
        except Exception as exc:
            logger.error(f"[AuditLog Error] Failed to log event {action}: {exc}", exc_info=True)
            return None
