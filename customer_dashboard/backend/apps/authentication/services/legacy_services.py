"""
FAAZO – Core Authentication Services Layer
"""

import hashlib
import hmac
import logging
import secrets
from datetime import timedelta
from typing import Optional, Tuple

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.models import EmailVerificationToken, PasswordResetToken

logger = logging.getLogger("faazo.auth")
User = get_user_model()


# ============================================================
# TokenService — Cryptographically Secure One-Time Tokens
# ============================================================

class TokenService:
    TOKEN_BYTES = 32  # 32 bytes → 64 hex chars (256-bit entropy)

    @classmethod
    def _hash_token(cls, raw_token: str) -> str:
        """Return SHA-256 hex digest of raw token."""
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    @classmethod
    def generate_email_verification_token(cls, user) -> str:
        EmailVerificationToken.objects.filter(user=user, is_used=False).update(is_used=True)
        raw_token = secrets.token_hex(cls.TOKEN_BYTES)
        token_hash = cls._hash_token(raw_token)
        EmailVerificationToken.objects.create(user=user, token_hash=token_hash)
        logger.info("Generated email verification token for user %s", user.email)
        return raw_token

    @classmethod
    def validate_email_verification_token(cls, raw_token: str) -> Tuple[bool, Optional[object], str]:
        if not raw_token or len(raw_token) != 64:
            return False, None, "Invalid token format."

        token_hash = cls._hash_token(raw_token)

        try:
            token_obj = EmailVerificationToken.objects.select_related("user").get(token_hash=token_hash)
        except EmailVerificationToken.DoesNotExist:
            return False, None, "Invalid or expired token."

        if token_obj.is_used:
            return False, None, "This token has already been used."

        if token_obj.is_expired:
            return False, None, "Token has expired. Please request a new verification email."

        token_obj.is_used = True
        token_obj.save(update_fields=["is_used"])

        user = token_obj.user
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])

        logger.info("Email verified successfully for user %s", user.email)
        return True, user, "Email verified successfully."

    @classmethod
    def generate_password_reset_token(cls, user) -> Optional[str]:
        # Mandatory Requirement 2: Google-only accounts without password cannot request reset tokens
        if not user.has_usable_password() or getattr(user, "auth_provider", "") == "google":
            logger.info("Password reset request skipped for Google-only account %s", user.email)
            return None

        # Mandatory Requirement 4: Invalidate all prior unused reset tokens for this user
        PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

        raw_token = secrets.token_hex(cls.TOKEN_BYTES)
        token_hash = cls._hash_token(raw_token)
        PasswordResetToken.objects.create(user=user, token_hash=token_hash)
        logger.info("Generated password reset token for user %s", user.email)
        return raw_token

    @classmethod
    def validate_password_reset_token(cls, raw_token: str) -> Tuple[bool, Optional[object], str]:
        if not raw_token or len(raw_token) != 64:
            return False, None, "Invalid password reset link format."

        token_hash = cls._hash_token(raw_token)

        try:
            token_obj = PasswordResetToken.objects.select_related("user").get(token_hash=token_hash)
        except PasswordResetToken.DoesNotExist:
            return False, None, "Invalid or expired password reset link."

        # Mandatory Requirement 7: Constant-time comparison for security verification
        if not hmac.compare_digest(token_obj.token_hash, token_hash):
            return False, None, "Invalid or expired password reset link."

        if token_obj.is_used:
            return False, None, "This password reset link has already been used."

        if token_obj.is_expired:
            return False, None, "Password reset link has expired. Please request a new one."

        # Mandatory Requirement 4: Guarantee that ONLY the latest issued reset token is valid
        latest_token = PasswordResetToken.objects.filter(user=token_obj.user).order_by("-created_at").first()
        if latest_token and latest_token.id != token_obj.id:
            return False, None, "This password reset link has been superseded by a newer request."

        user = token_obj.user
        profile = getattr(user, "profile", None)
        if profile and (profile.is_blocked or profile.is_deleted):
            return False, None, "User account is suspended or deleted."

        if not user.is_active:
            return False, None, "User account is deactivated."

        return True, user, "Token is valid."

    @classmethod
    def consume_password_reset_token(cls, raw_token: str, new_password: str) -> Tuple[bool, str]:
        is_valid, user, error_message = cls.validate_password_reset_token(raw_token)
        if not is_valid or not user:
            return False, error_message

        # Mandatory Requirement 6: Reuse existing Django password policy validators
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as ve:
            return False, " ".join(ve.messages)

        token_hash = cls._hash_token(raw_token)
        token_obj = PasswordResetToken.objects.get(token_hash=token_hash)
        token_obj.is_used = True
        token_obj.used_at = timezone.now()
        token_obj.save(update_fields=["is_used", "used_at"])

        # Mandatory Requirement 4: Mark all remaining unused tokens for this user as used
        PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

        user.set_password(new_password)
        user.save(update_fields=["password"])

        # Mandatory Requirement 5: Comprehensive session revocation across all devices
        from apps.authentication.services.session_service import SessionService
        JWTService.blacklist_all_user_tokens(user)
        SessionService.revoke_all_sessions(user)

        logger.info("Password reset successfully for user %s. All sessions revoked.", user.email)
        return True, "Password reset successfully. Please log in with your new password."


# ============================================================
# JWTService — Token Pair Generation & Revocation
# ============================================================

from apps.authentication.services.jwt_service import JWTService
from apps.authentication.services.lockout_service import LockoutService

# ============================================================
# EmailService — Transactional Email Delivery
# ============================================================

class EmailService:
    @classmethod
    def send_verification_email(cls, user, raw_token: str) -> bool:
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        verify_url = f"{frontend_url}/verify-email?token={raw_token}"

        context = {
            "user": user,
            "full_name": getattr(user, "full_name", str(user)),
            "verify_url": verify_url,
            "expiry_hours": 24,
            "support_email": getattr(settings, "SUPPORT_EMAIL", "support@faazo.com"),
        }

        return cls._send_email(
            subject="Verify your FAAZO account",
            template_prefix="emails/verify_email",
            to_email=user.email,
            context=context,
        )

    @classmethod
    def send_welcome_verify(cls, user, raw_token: str) -> bool:
        cls.send_welcome_email(user)
        return cls.send_verification_email(user, raw_token)

    @classmethod
    def send_dealer_application_received(cls, user, company_name: str) -> bool:
        context = {
            "user": user,
            "full_name": getattr(user, "full_name", str(user)),
            "company_name": company_name,
            "support_email": getattr(settings, "SUPPORT_EMAIL", "support@faazo.com"),
        }
        return cls._send_email(
            subject="Dealer Application Received - FAAZO Marketplace",
            template_prefix="emails/dealer_received",
            to_email=user.email,
            context=context,
        )

    @classmethod
    def send_password_reset(cls, user, raw_token: str) -> bool:
        return cls.send_password_reset_email(user, raw_token)

    @classmethod
    def send_password_reset_email(cls, user, raw_token: str) -> bool:
        # Mandatory Requirement 1: Environment-driven FRONTEND_URL (no hardcoding)
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        reset_url = f"{frontend_url}/reset-password?token={raw_token}"

        context = {
            "user": user,
            "full_name": getattr(user, "full_name", str(user)),
            "reset_url": reset_url,
            "expiry_minutes": 30,
            "support_email": getattr(settings, "SUPPORT_EMAIL", "support@faazo.com"),
        }

        return cls._send_email(
            subject="Reset your FAAZO password",
            template_prefix="emails/password_reset",
            to_email=user.email,
            context=context,
        )

    @classmethod
    def send_password_reset_success(cls, user) -> bool:
        context = {
            "user": user,
            "full_name": getattr(user, "full_name", str(user)),
            "login_url": f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/login",
            "support_email": getattr(settings, "SUPPORT_EMAIL", "support@faazo.com"),
        }
        return cls._send_email(
            subject="Password Changed Successfully - FAAZO",
            template_prefix="emails/password_reset_success",
            to_email=user.email,
            context=context,
        )

    @classmethod
    def send_welcome_email(cls, user) -> bool:
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")

        context = {
            "user": user,
            "full_name": getattr(user, "full_name", str(user)),
            "login_url": f"{frontend_url}/login",
            "support_email": getattr(settings, "SUPPORT_EMAIL", "support@faazo.com"),
        }

        return cls._send_email(
            subject="Welcome to FAAZO Marketplace!",
            template_prefix="emails/welcome",
            to_email=user.email,
            context=context,
        )

    @classmethod
    def _send_email(cls, subject: str, template_prefix: str, to_email: str, context: dict) -> bool:
        try:
            from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "FAAZO <noreply@faazo.com>")

            try:
                html_content = render_to_string(f"{template_prefix}.html", context)
            except Exception:
                html_content = None

            try:
                text_content = render_to_string(f"{template_prefix}.txt", context)
            except Exception:
                text_content = f"Hello {context.get('full_name', '')},\n\nPlease visit FAAZO to complete your request."

            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=from_email,
                to=[to_email],
            )

            if html_content:
                msg.attach_alternative(html_content, "text/html")

            msg.send(fail_silently=False)
            logger.info("Sent email '%s' to %s", subject, to_email)
            return True

        except Exception as e:
            logger.error("Failed to send email '%s' to %s: %s", subject, to_email, str(e), exc_info=True)
            return False


# ============================================================
# AuthService — Account Lockout & Password Change
# ============================================================

class AuthService:
    @classmethod
    def change_password(cls, user, new_password_or_old: str, new_password_optional: Optional[str] = None) -> Tuple[bool, str]:
        if new_password_optional is not None:
            old_password = new_password_or_old
            new_password = new_password_optional
            if not user.check_password(old_password):
                return False, "Current password is incorrect."
            if old_password == new_password:
                return False, "New password must be different from current password."
        else:
            new_password = new_password_or_old

        user.set_password(new_password)
        user.save(update_fields=["password"])

        JWTService.blacklist_all_user_tokens(user)
        logger.info("Password changed for user %s. Outstanding tokens blacklisted.", user.email)
        return True, "Password changed successfully. Please log in again."

    @classmethod
    def is_account_locked(cls, email: str) -> Tuple[bool, int]:
        user = User.objects.filter(email=email).first()
        if not user:
            return False, 0
        is_locked, locked_until = LockoutService.check_lockout(user)
        if is_locked and locked_until:
            remaining = int((locked_until - timezone.now()).total_seconds())
            return True, max(0, remaining)
        return False, 0

    @classmethod
    def record_failed_login(cls, email: str) -> int:
        user = User.objects.filter(email=email).first()
        if not user:
            return 0
        return LockoutService.register_failed_attempt(user)

    @classmethod
    def clear_failed_attempts(cls, email: str) -> None:
        user = User.objects.filter(email=email).first()
        if user:
            LockoutService.reset_attempts(user)

