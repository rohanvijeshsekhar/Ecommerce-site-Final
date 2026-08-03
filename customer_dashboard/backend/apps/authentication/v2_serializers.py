"""
Phase 5 Serializers — Enterprise Authentication API
Adds new serializers for OTP flows, Session management, Profile updates,
Logout All, and enhanced token refresh. Existing serializers are untouched.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


# ──────────────────────────────────────────────────────────────
# OTP Serializers
# ──────────────────────────────────────────────────────────────

class OTPSendSerializer(serializers.Serializer):
    """Send OTP to email or phone number for a given purpose."""
    target = serializers.CharField(
        help_text="Email address or phone number (E.164 format) to send OTP to."
    )
    purpose = serializers.ChoiceField(
        choices=["registration", "password_reset", "login"],
        default="registration",
    )

    def validate_target(self, value: str) -> str:
        return value.strip()


class OTPVerifySerializer(serializers.Serializer):
    """Verify a 6-digit OTP submitted for a given target and purpose."""
    target = serializers.CharField()
    purpose = serializers.ChoiceField(
        choices=["registration", "password_reset", "login"],
        default="registration",
    )
    code = serializers.CharField(
        min_length=6, max_length=6,
        error_messages={
            "min_length": "OTP must be exactly 6 digits.",
            "max_length": "OTP must be exactly 6 digits.",
        }
    )

    def validate_target(self, value: str) -> str:
        return value.strip()

    def validate_code(self, value: str) -> str:
        if not value.isdigit():
            raise serializers.ValidationError("OTP must contain only digits.")
        return value


class OTPResendSerializer(serializers.Serializer):
    """Resend OTP to the same target for the same purpose."""
    target = serializers.CharField()
    purpose = serializers.ChoiceField(
        choices=["registration", "password_reset", "login"],
        default="registration",
    )

    def validate_target(self, value: str) -> str:
        return value.strip()


# ──────────────────────────────────────────────────────────────
# Session Serializers
# ──────────────────────────────────────────────────────────────

class DeviceSessionSerializer(serializers.Serializer):
    """Read-only representation of a DeviceSession for the sessions list."""
    id = serializers.IntegerField(read_only=True)
    session_key = serializers.CharField(read_only=True)
    device_name = serializers.CharField(read_only=True)
    ip_address = serializers.CharField(read_only=True)
    user_agent = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    last_active_at = serializers.DateTimeField(read_only=True)
    expires_at = serializers.DateTimeField(read_only=True)


# ──────────────────────────────────────────────────────────────
# Token Refresh Serializer (enterprise wrapper)
# ──────────────────────────────────────────────────────────────

class TokenRefreshV2Serializer(serializers.Serializer):
    """Enterprise token refresh — supports reuse detection via JWTService."""
    refresh = serializers.CharField(
        error_messages={"required": "Refresh token is required."}
    )


# ──────────────────────────────────────────────────────────────
# Logout All Devices Serializer
# ──────────────────────────────────────────────────────────────

class LogoutAllSerializer(serializers.Serializer):
    """Confirm logout-all-devices request. No required fields."""
    pass


# ──────────────────────────────────────────────────────────────
# Profile Update Serializer
# ──────────────────────────────────────────────────────────────

class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Partial update for user profile — full_name and phone_number only."""

    class Meta:
        model = User
        fields = ["full_name", "phone_number"]

    def validate_phone_number(self, value: str) -> str:
        if not value:
            return value
        value = value.strip()
        qs = User.objects.filter(phone_number=value).exclude(pk=self.instance.pk if self.instance else None)
        if qs.exists():
            raise serializers.ValidationError("This phone number is already registered to another account.")
        return value


# ──────────────────────────────────────────────────────────────
# Google OAuth Serializer
# ──────────────────────────────────────────────────────────────

class GoogleAuthSerializer(serializers.Serializer):
    """Payload containing Google ID Token for Google Sign-In / Sign-Up."""
    id_token = serializers.CharField(
        error_messages={"required": "id_token is required.", "blank": "id_token cannot be blank."}
    )

    def validate_id_token(self, value: str) -> str:
        return value.strip()

