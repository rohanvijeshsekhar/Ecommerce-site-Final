"""
Enterprise Production-Ready OTP Engine.
Manages OTP generation, SHA-256 hashing, 60s resend cooldown, 1-hour rate limiting,
attempt enforcement, replay attack prevention, and pluggable provider dispatching.
"""

from datetime import timedelta
import hashlib
import logging
import secrets
from typing import Tuple

from django.conf import settings
from django.utils import timezone

from apps.authentication.models import OTPRecord, OtpPurpose
from apps.authentication.providers import EmailOTPProvider, get_sms_provider
from apps.authentication.services.audit_service import AuditService

logger = logging.getLogger("faazo.auth")


class OTPService:
    COOLDOWN_SECONDS = getattr(settings, "OTP_RESEND_COOLDOWN_SECONDS", 60)
    MAX_PER_HOUR = getattr(settings, "OTP_MAX_PER_HOUR", 5)
    EXPIRATION_MINUTES = getattr(settings, "OTP_EXPIRATION_MINUTES", 10)
    MAX_ATTEMPTS = getattr(settings, "OTP_MAX_ATTEMPTS", 3)

    @classmethod
    def generate_otp(cls) -> str:
        """
        Generate a cryptographically secure 6-digit numeric OTP code.
        """
        return str(secrets.randbelow(900000) + 100000)

    @classmethod
    def hash_otp(cls, raw_otp: str) -> str:
        """
        Return SHA-256 hex digest of raw OTP code.
        """
        return hashlib.sha256(raw_otp.encode("utf-8")).hexdigest()

    @classmethod
    def is_mobile_number(cls, target: str) -> bool:
        """
        Check if target is a phone number (contains digits/leading + and no @).
        """
        cleaned = target.strip()
        return "@" not in cleaned and any(c.isdigit() for c in cleaned)

    @classmethod
    def send_otp(
        cls,
        target: str,
        purpose: str = OtpPurpose.REGISTRATION,
        user=None,
        ip_address: str | None = None,
    ) -> Tuple[bool, str]:
        """
        Generate and dispatch a new OTP with rate limiting and cooldown checks.
        """
        target = target.strip()
        if cls.is_mobile_number(target):
            from apps.common.utils import normalize_phone_number
            from django.core.exceptions import ValidationError as DjangoValidationError
            try:
                target = normalize_phone_number(target, allow_empty=False)
            except DjangoValidationError as exc:
                return False, "Enter a valid mobile number (e.g. 9876543210 or +919876543210)."

        now = timezone.now()

        # 1. Cooldown Check (e.g. 60 seconds between resends)
        cooldown_cutoff = now - timedelta(seconds=cls.COOLDOWN_SECONDS)
        recent_otp = OTPRecord.objects.filter(
            target=target,
            purpose=purpose,
            created_at__gte=cooldown_cutoff,
        ).first()

        if recent_otp:
            return False, f"Please wait {cls.COOLDOWN_SECONDS} seconds before requesting another OTP."

        # 2. Hourly Rate Limiting Check (max 5 per hour)
        hour_cutoff = now - timedelta(hours=1)
        hourly_count = OTPRecord.objects.filter(
            target=target,
            purpose=purpose,
            created_at__gte=hour_cutoff,
        ).count()

        if hourly_count >= cls.MAX_PER_HOUR:
            return False, "Too many OTP requests. Please wait an hour before requesting again."

        # 3. Invalidate prior active unused OTPs for this target & purpose
        OTPRecord.objects.filter(target=target, purpose=purpose, is_used=False).update(is_used=True)

        # 4. Generate & Hash OTP
        otp_code = cls.generate_otp()
        otp_hash = cls.hash_otp(otp_code)
        expires_at = now + timedelta(minutes=cls.EXPIRATION_MINUTES)

        # 5. Save OTP Record
        otp_record = OTPRecord.objects.create(
            user=user if getattr(user, "is_authenticated", False) else None,
            target=target,
            purpose=purpose,
            otp_hash=otp_hash,
            expires_at=expires_at,
            max_attempts=cls.MAX_ATTEMPTS,
            ip_address=ip_address,
        )

        # 6. Dispatch via appropriate provider
        if cls.is_mobile_number(target):
            dispatched = get_sms_provider().send_otp(target, otp_code, purpose)
        else:
            dispatched = EmailOTPProvider().send_otp(target, otp_code, purpose)

        if not dispatched:
            return False, "Failed to dispatch OTP. Please try again."

        AuditService.log_event(
            action="OTP_SENT",
            user=user,
            status="SUCCESS",
            ip_address=ip_address,
            details={"target": target, "purpose": purpose},
        )
        return True, "OTP sent successfully."

    @classmethod
    def verify_otp(
        cls,
        target: str,
        purpose: str,
        raw_otp: str,
        user=None,
        ip_address: str | None = None,
    ) -> Tuple[bool, str]:
        """
        Verify an incoming OTP code against stored SHA-256 hash.
        Enforces single-use, expiry, and max attempts.
        """
        target = target.strip()
        if cls.is_mobile_number(target):
            from apps.common.utils import normalize_phone_number
            from django.core.exceptions import ValidationError as DjangoValidationError
            try:
                target = normalize_phone_number(target, allow_empty=False)
            except DjangoValidationError as exc:
                return False, "Enter a valid mobile number (e.g. 9876543210 or +919876543210)."

        raw_otp = raw_otp.strip()

        if not raw_otp or len(raw_otp) != 6:
            return False, "Invalid OTP format. Must be a 6-digit code."

        now = timezone.now()
        otp_record = (
            OTPRecord.objects.filter(target=target, purpose=purpose, is_used=False)
            .order_by("-created_at")
            .first()
        )

        if not otp_record or otp_record.is_expired:
            AuditService.log_event(
                action="OTP_FAILED",
                user=user,
                status="FAILURE",
                ip_address=ip_address,
                details={"target": target, "reason": "expired_or_not_found"},
            )
            return False, "Invalid or expired OTP code."

        if otp_record.attempts >= otp_record.max_attempts:
            otp_record.is_used = True
            otp_record.save(update_fields=["is_used"])
            AuditService.log_event(
                action="OTP_FAILED",
                user=user,
                status="FAILURE",
                ip_address=ip_address,
                details={"target": target, "reason": "max_attempts_exceeded"},
            )
            return False, "Maximum OTP attempts exceeded. Please request a new OTP."

        # Increment attempts counter
        otp_record.attempts += 1
        computed_hash = cls.hash_otp(raw_otp)

        # Constant-time hash comparison
        if secrets.compare_digest(computed_hash, otp_record.otp_hash):
            otp_record.is_used = True
            otp_record.save(update_fields=["attempts", "is_used"])

            # Verify associated user if applicable
            target_user = user or otp_record.user
            if not target_user and cls.is_mobile_number(target):
                from apps.users.models import User
                target_user = User.objects.filter(phone_number=target).first()

            if target_user:
                if cls.is_mobile_number(target):
                    target_user.is_phone_verified = True
                    target_user.save(update_fields=["is_phone_verified"])
                else:
                    target_user.is_email_verified = True
                    target_user.save(update_fields=["is_email_verified"])

            AuditService.log_event(
                action="OTP_VERIFIED",
                user=target_user,
                status="SUCCESS",
                ip_address=ip_address,
                details={"target": target, "purpose": purpose},
            )
            return True, "OTP verified successfully."
        else:
            otp_record.save(update_fields=["attempts"])
            remaining = max(0, otp_record.max_attempts - otp_record.attempts)
            AuditService.log_event(
                action="OTP_FAILED",
                user=user,
                status="FAILURE",
                ip_address=ip_address,
                details={"target": target, "attempts": otp_record.attempts},
            )
            return False, f"Invalid OTP code. {remaining} attempt(s) remaining."
