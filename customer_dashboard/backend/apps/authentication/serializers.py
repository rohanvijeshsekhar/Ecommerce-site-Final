"""
FAAZO – Authentication Serializers

All input validation lives here. Business logic lives in services.py.
Views receive validated data from serializers and pass it to services.

Serializers in this module:
    RegisterSerializer          — Customer registration
    DealerRegisterSerializer    — Dealer registration (+ file upload)
    LoginSerializer             — Email + password → JWT tokens
    TokenRefreshSerializer      — Refresh token rotation
    LogoutSerializer            — Refresh token blacklist
    MeSerializer                — Current authenticated user (read-only)
    VerifyEmailSerializer       — Verify email address with raw token
    ResendVerificationSerializer — Request new verification link
    ForgotPasswordSerializer    — Request password reset email
    ResetPasswordSerializer     — Submit new password with reset token
    ChangePasswordSerializer    — Change password while logged in
"""

import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import serializers

User = get_user_model()


# ──────────────────────────────────────────────────────────────
# Password Strength Validator
# ──────────────────────────────────────────────────────────────

def _validate_password_strength(password: str) -> None:
    """
    FAAZO custom password strength policy:
        - Minimum 8 characters
        - At least 1 uppercase letter
        - At least 1 lowercase letter
        - At least 1 digit
        - At least 1 special character

    Also runs Django's built-in validators (CommonPasswordValidator etc.)
    """
    errors = []

    if len(password) < 8:
        errors.append("Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter.")
    if not re.search(r"\d", password):
        errors.append("Password must contain at least one digit.")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\;'/`~]", password):
        errors.append("Password must contain at least one special character.")

    if errors:
        raise serializers.ValidationError(errors)

    # Run Django's built-in validators
    try:
        validate_password(password)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(list(exc.messages)) from exc


# ──────────────────────────────────────────────────────────────
# User Mini Serializer (nested in login/me responses)
# ──────────────────────────────────────────────────────────────

class UserMinimalSerializer(serializers.ModelSerializer):
    """
    Minimal user representation included in auth responses.
    Never expose password, tokens, or sensitive fields here.

    Includes `dealer_status` and `can_purchase` for dealer accounts.
    `can_purchase` is the backend single-source-of-truth for whether
    the dealer is allowed to add to cart, checkout, and place orders.
    The frontend must use this flag for all purchase gating decisions.
    """

    dealer_status = serializers.SerializerMethodField()
    can_purchase = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "role",
            "auth_provider",
            "google_sub",
            "profile_picture",
            "is_email_verified",
            "is_phone_verified",
            "date_joined",
            "dealer_status",
            "can_purchase",
        ]
        read_only_fields = fields

    def _get_dealer_application(self, obj):
        """Shared helper to resolve the dealer application once."""
        if obj.role != "dealer":
            return None
        try:
            return obj.dealer_application
        except Exception:
            return None

    def get_dealer_status(self, obj) -> str | None:
        app = self._get_dealer_application(obj)
        if app is not None:
            return app.status
        # Dealer role but no application record — treat as pending
        return "pending" if obj.role == "dealer" else None

    def get_can_purchase(self, obj) -> bool:
        """Backend-authoritative purchase permission flag."""
        if obj.role != "dealer":
            # Non-dealers (customers) can always purchase
            return True
        app = self._get_dealer_application(obj)
        if app is not None:
            from apps.dealer.models import DealerStatus
            return app.status == DealerStatus.APPROVED
        # Dealer with no application — cannot purchase
        return False


# ──────────────────────────────────────────────────────────────
# Registration
# ──────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.Serializer):
    """
    Customer registration.

    Validates:
    - Password strength (custom FAAZO policy + Django validators)
    - Password confirmation match
    - Email uniqueness
    - Phone number uniqueness (if provided)
    """

    full_name = serializers.CharField(
        max_length=150,
        error_messages={"required": "Full name is required."},
    )
    email = serializers.EmailField(
        error_messages={"required": "Email address is required."},
    )
    phone_number = serializers.CharField(
        max_length=15,
        required=False,
        allow_blank=True,
        help_text="E.164 format recommended. Optional.",
    )
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
        error_messages={"required": "Password is required."},
    )
    confirm_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
        error_messages={"required": "Please confirm your password."},
    )

    def validate_email(self, value: str) -> str:
        email = value.strip().lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_phone_number(self, value: str) -> str:
        if not value:
            return value
        value = value.strip()
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError(
                "An account with this mobile number already exists."
            )
        return value

    def validate_password(self, value: str) -> str:
        _validate_password_strength(value)
        return value

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("confirm_password"):
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return attrs


class DealerRegisterSerializer(serializers.Serializer):
    """
    Dealer registration — extends customer registration with company info
    and a document upload (GST cert, trade license, etc.)
    """

    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=15, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    confirm_password = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )
    company_name = serializers.CharField(
        max_length=200,
        error_messages={"required": "Company / clinic name is required."},
    )
    documents = serializers.ListField(
        child=serializers.FileField(),
        help_text="GST certificate, trade license, or business registration document.",
        error_messages={"required": "At least one registration document is required."},
    )

    def to_internal_value(self, data):
        # request.data is typically a QueryDict under MultiPartParser.
        # We convert it to a flat dict, keeping 'documents' as a list of files.
        if hasattr(data, "getlist"):
            flat_data = {}
            for key in data.keys():
                if key == "documents":
                    flat_data["documents"] = data.getlist("documents")
                else:
                    flat_data[key] = data.get(key)
            data = flat_data
        return super().to_internal_value(data)

    def validate_email(self, value: str) -> str:
        email = value.strip().lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_phone_number(self, value: str) -> str:
        if not value:
            return value
        value = value.strip()
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError(
                "An account with this mobile number already exists."
            )
        return value

    def validate_password(self, value: str) -> str:
        _validate_password_strength(value)
        return value

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("confirm_password"):
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return attrs


# ──────────────────────────────────────────────────────────────
# Login
# ──────────────────────────────────────────────────────────────

class LoginSerializer(serializers.Serializer):
    """
    Login with email + password.
    remember_me extends refresh token lifetime to 14 days.
    """

    email = serializers.EmailField(
        error_messages={"required": "Email address is required."},
    )
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
        error_messages={"required": "Password is required."},
    )
    remember_me = serializers.BooleanField(
        default=False,
        required=False,
        help_text="If true, refresh token lifetime is extended to 14 days.",
    )

    def validate_email(self, value: str) -> str:
        return value.strip().lower()


# ──────────────────────────────────────────────────────────────
# Token Flows
# ──────────────────────────────────────────────────────────────

class LogoutSerializer(serializers.Serializer):
    """Accepts a refresh token and blacklists it."""

    refresh = serializers.CharField(
        error_messages={"required": "Refresh token is required."},
    )


# ──────────────────────────────────────────────────────────────
# Me
# ──────────────────────────────────────────────────────────────

class MeSerializer(serializers.ModelSerializer):
    """
    Full current-user response including profile data.
    Read-only — profile updates are handled by apps.users serializers.

    Includes `dealer_status` and `can_purchase` for dealer accounts.
    `can_purchase` is the backend single-source-of-truth.
    """

    avatar_url = serializers.SerializerMethodField()
    clinic_name = serializers.SerializerMethodField()
    dealer_status = serializers.SerializerMethodField()
    can_purchase = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "phone_number",
            "role",
            "is_email_verified",
            "is_phone_verified",
            "avatar_url",
            "clinic_name",
            "date_joined",
            "created_at",
            "dealer_status",
            "can_purchase",
        ]
        read_only_fields = fields

    def _get_dealer_application(self, obj):
        if obj.role != "dealer":
            return None
        try:
            return obj.dealer_application
        except Exception:
            return None

    def get_dealer_status(self, obj) -> str | None:
        app = self._get_dealer_application(obj)
        if app is not None:
            return app.status
        return "pending" if obj.role == "dealer" else None

    def get_can_purchase(self, obj) -> bool:
        """Backend-authoritative purchase permission flag."""
        if obj.role != "dealer":
            return True
        app = self._get_dealer_application(obj)
        if app is not None:
            from apps.dealer.models import DealerStatus
            return app.status == DealerStatus.APPROVED
        return False

    def get_avatar_url(self, obj) -> str | None:
        try:
            return obj.profile.avatar_url
        except Exception:
            return None

    def get_clinic_name(self, obj) -> str:
        try:
            return obj.profile.clinic_name
        except Exception:
            return ""


# ──────────────────────────────────────────────────────────────
# Email Verification
# ──────────────────────────────────────────────────────────────

class VerifyEmailSerializer(serializers.Serializer):
    """Raw email verification token submitted via query param or body."""

    token = serializers.CharField(
        min_length=64,
        max_length=64,
        error_messages={"required": "Verification token is required."},
    )


class ResendVerificationSerializer(serializers.Serializer):
    """
    Resend email verification link.
    Requires the user to be authenticated (enforced at view level).
    No input fields needed — uses the request.user.
    """
    pass


# ──────────────────────────────────────────────────────────────
# Password Reset
# ──────────────────────────────────────────────────────────────

class ForgotPasswordSerializer(serializers.Serializer):
    """
    Request a password reset email.
    Always returns 200 OK to prevent user enumeration attacks.
    """

    email = serializers.EmailField(
        error_messages={"required": "Email address is required."},
    )

    def validate_email(self, value: str) -> str:
        return value.strip().lower()


class ResetPasswordSerializer(serializers.Serializer):
    """Submit a new password using the reset token from the email."""

    token = serializers.CharField(
        min_length=64,
        max_length=64,
        error_messages={"required": "Reset token is required."},
    )
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
        error_messages={"required": "New password is required."},
    )
    confirm_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
        error_messages={"required": "Please confirm your new password."},
    )

    def validate_password(self, value: str) -> str:
        _validate_password_strength(value)
        return value

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("confirm_password"):
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    """
    Change password while logged in.
    Requires current password for confirmation.
    Forces re-login on all devices after success.
    """

    current_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
        error_messages={"required": "Current password is required."},
    )
    new_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
        error_messages={"required": "New password is required."},
    )
    confirm_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
        error_messages={"required": "Please confirm your new password."},
    )

    def validate_new_password(self, value: str) -> str:
        _validate_password_strength(value)
        return value

    def validate(self, attrs):
        if attrs.get("new_password") != attrs.get("confirm_password"):
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return attrs
