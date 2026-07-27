"""
FAAZO – Authentication Token Models

EmailVerificationToken
    One-time token for verifying a user's email address.
    Expires 24 hours after creation.

PasswordResetToken
    One-time token for password reset flows.
    Expires 1 hour after creation.

Security Strategy:
    - Raw tokens are NEVER stored — only SHA-256 hashes are persisted.
    - Raw token lives only in the email link.
    - On validation: hash the received raw token and look up by hash.
    - Tokens are single-use (is_used=True after first successful use).
    - Old unused tokens are invalidated when a new one is generated.
"""

import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


# ============================================================
# Token Expiry Defaults (called at row creation time)
# ============================================================

def _email_token_expiry():
    """24-hour window for email verification."""
    return timezone.now() + timedelta(hours=24)


def _reset_token_expiry():
    """1-hour window for password reset — tighter for security."""
    return timezone.now() + timedelta(hours=1)


# ============================================================
# Email Verification Token
# ============================================================

class EmailVerificationToken(models.Model):
    """
    Single-use token for email address verification.

    Lifecycle:
        1. Token created → raw token emailed to user
        2. User clicks link → raw token hashed → lookup by hash
        3. Validated → is_used=True, user.is_email_verified=True
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_verification_tokens",
        verbose_name="User",
    )
    token_hash = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        verbose_name="Token Hash (SHA-256)",
        help_text="SHA-256 hash of the raw token. Raw token is only in the email.",
    )
    expires_at = models.DateTimeField(
        default=_email_token_expiry,
        verbose_name="Expires At",
    )
    is_used = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Used",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")

    class Meta:
        db_table = "email_verification_tokens"
        verbose_name = "Email Verification Token"
        verbose_name_plural = "Email Verification Tokens"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_used"]),
        ]

    def __str__(self) -> str:
        return f"EmailVerToken({self.user.email}, used={self.is_used})"

    @property
    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    @property
    def is_valid(self) -> bool:
        """True only if the token has not been used and has not expired."""
        return not self.is_used and not self.is_expired


# ============================================================
# Password Reset Token
# ============================================================

class PasswordResetToken(models.Model):
    """
    Single-use token for the password reset flow.

    Lifecycle:
        1. Token created → raw token emailed as reset link
        2. User submits reset form with raw token
        3. Raw token hashed → lookup by hash → validate
        4. is_used=True, used_at=now(), password updated
        5. All outstanding JWT tokens for the user are blacklisted
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
        verbose_name="User",
    )
    token_hash = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        verbose_name="Token Hash (SHA-256)",
    )
    expires_at = models.DateTimeField(
        default=_reset_token_expiry,
        verbose_name="Expires At",
    )
    is_used = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Used",
    )
    used_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Used At",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")

    class Meta:
        db_table = "password_reset_tokens"
        verbose_name = "Password Reset Token"
        verbose_name_plural = "Password Reset Tokens"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_used"]),
        ]

    def __str__(self) -> str:
        return f"PwdResetToken({self.user.email}, used={self.is_used})"

    @property
    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    @property
    def is_valid(self) -> bool:
        return not self.is_used and not self.is_expired


# ============================================================
# OTP Record — Hashed OTP storage with rate limiting & replay prevention
# ============================================================

class OtpPurpose(models.TextChoices):
    REGISTRATION = "registration", "Registration"
    PASSWORD_RESET = "password_reset", "Password Reset"
    LOGIN = "login", "Login"


class OTPRecord(models.Model):
    """
    Production-ready hashed OTP storage.
    Supports Sangamam SMS OTP and Email OTP flows.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="otp_records",
        verbose_name="User",
    )
    target = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name="Target (Mobile / Email)",
        help_text="E.164 phone number or email address",
    )
    purpose = models.CharField(
        max_length=50,
        choices=OtpPurpose.choices,
        default=OtpPurpose.REGISTRATION,
        db_index=True,
        verbose_name="Purpose",
    )
    otp_hash = models.CharField(
        max_length=128,
        verbose_name="OTP Hash (SHA-256)",
        help_text="SHA-256 hash of the 6-digit OTP code.",
    )
    expires_at = models.DateTimeField(
        db_index=True,
        verbose_name="Expires At",
    )
    is_used = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Is Used",
    )
    attempts = models.PositiveIntegerField(
        default=0,
        verbose_name="Verification Attempts",
    )
    max_attempts = models.PositiveIntegerField(
        default=3,
        verbose_name="Max Allowed Attempts",
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="Request IP Address",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created At",
    )

    class Meta:
        db_table = "otp_records"
        verbose_name = "OTP Record"
        verbose_name_plural = "OTP Records"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["target", "purpose", "is_used"]),
            models.Index(fields=["expires_at", "is_used"]),
        ]

    def __str__(self) -> str:
        return f"OTP({self.target}, purpose={self.purpose}, used={self.is_used})"

    @property
    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    @property
    def is_valid(self) -> bool:
        return not self.is_used and not self.is_expired and self.attempts < self.max_attempts


# ============================================================
# Device Session — Multi-device active login tracking
# ============================================================

class DeviceSession(models.Model):
    """
    Tracks multi-device active user sessions and refresh token JTIs.
    Enables remote logout and session revocation.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="device_sessions",
        verbose_name="User",
    )
    session_key = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        verbose_name="Session Key / Token JTI",
    )
    device_name = models.CharField(
        max_length=255,
        default="Unknown Device",
        verbose_name="Device Name",
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="IP Address",
    )
    user_agent = models.TextField(
        blank=True,
        verbose_name="User Agent",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Is Active",
    )
    last_active_at = models.DateTimeField(
        auto_now=True,
        db_index=True,
        verbose_name="Last Active At",
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Expires At",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Created At",
    )

    class Meta:
        db_table = "device_sessions"
        verbose_name = "Device Session"
        verbose_name_plural = "Device Sessions"
        ordering = ["-last_active_at"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"Session({self.user.email}, device={self.device_name}, active={self.is_active})"


# ============================================================
# Audit Log — Immutable Security Trail
# ============================================================

class AuditLog(models.Model):
    """
    Immutable audit logging table for all authentication events.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="security_audit_logs",
        verbose_name="User",
    )
    action = models.CharField(
        max_length=100,
        db_index=True,
        verbose_name="Action",
    )
    status = models.CharField(
        max_length=20,
        default="SUCCESS",
        db_index=True,
        verbose_name="Status",
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="IP Address",
    )
    user_agent = models.TextField(
        blank=True,
        verbose_name="User Agent",
    )
    details = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Event Details",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created At",
    )

    class Meta:
        db_table = "audit_logs"
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["action", "status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        user_info = self.user.email if self.user else "Anonymous"
        return f"Audit({self.action}, status={self.status}, user={user_info})"

