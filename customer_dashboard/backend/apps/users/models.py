"""
FAAZO – User, UserProfile, and Address Models

Design decisions:
- AbstractBaseUser: email as login identifier, no username field.
- role as CharField choices (not FK): 3 fixed roles, future roles added as choices.
- phone_number + is_phone_verified: fields present now, OTP logic deferred to v2.
- UserProfile: one-to-one, auto-created via signal on User creation.
- Address: FK to User, supports multiple addresses with one default.
"""

import uuid

from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.common.image_optimizer import OptimizedImageField
from apps.users.managers import UserManager



# ============================================================
# Role Choices — extend here for future roles (no schema change)
# ============================================================

class UserRole(models.TextChoices):
    CUSTOMER = "customer", "Customer / Dentist"
    DEALER = "dealer", "Dealer"
    ADMIN = "admin", "Administrator"


# ============================================================
# Auth Provider Choices
# ============================================================

class AuthProvider(models.TextChoices):
    EMAIL = "email", "Email & Password"
    GOOGLE = "google", "Google OAuth"


# ============================================================
# Address Type Choices
# ============================================================

class AddressType(models.TextChoices):
    SHIPPING = "shipping", "Shipping"
    BILLING = "billing", "Billing"
    BOTH = "both", "Shipping & Billing"


# ============================================================
# User — Custom AbstractBaseUser
# ============================================================

class User(AbstractBaseUser, PermissionsMixin):
    """
    FAAZO production User model.

    Login identifier: email (case-insensitive, normalised)
    Role system: CharField choices — customer / dealer / admin
    Phone: stored now, OTP verification deferred to v2.0
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True,
        verbose_name="ID",
    )
    email = models.EmailField(
        unique=True,
        db_index=True,
        verbose_name="Email Address",
    )
    full_name = models.CharField(
        max_length=150,
        verbose_name="Full Name",
    )
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.CUSTOMER,
        db_index=True,
        verbose_name="Role",
    )
    auth_provider = models.CharField(
        max_length=20,
        choices=AuthProvider.choices,
        default=AuthProvider.EMAIL,
        db_index=True,
        verbose_name="Authentication Provider",
    )
    google_sub = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Google Subject ID",
        help_text="Unique Subject ID assigned by Google OAuth 2.0.",
    )
    profile_picture = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        verbose_name="Profile Picture URL",
        help_text="URL to user's Google avatar or uploaded profile image.",
    )

    # ── Phone (future-ready for OTP verification) ──────────────
    phone_number = models.CharField(
        max_length=15,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Mobile Number",
        help_text=(
            "E.164 format recommended (e.g. +919876543210). "
            "Unique per user. OTP verification will be added in v2.0."
        ),
    )
    is_phone_verified = models.BooleanField(
        default=False,
        verbose_name="Phone Verified",
        help_text=(
            "Set to True when mobile OTP is successfully verified. "
            "OTP logic is NOT implemented in v1.0 — field reserved for v2.0."
        ),
    )

    # ── Email Verification ──────────────────────────────────────
    is_email_verified = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Email Verified",
    )

    # ── Security & Account Locking ──────────────────────────────
    failed_login_attempts = models.PositiveIntegerField(
        default=0,
        verbose_name="Failed Login Attempts",
        help_text="Consecutive failed login attempts.",
    )
    locked_until = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Locked Until",
        help_text="Account locked until this timestamp.",
    )
    last_login_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Last Login At",
        help_text="Timestamp of last successful login.",
    )
    terms_accepted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Terms Accepted At",
        help_text="Timestamp when terms & conditions were accepted.",
    )

    # ── Account Status ──────────────────────────────────────────
    is_active = models.BooleanField(
        default=True,
        verbose_name="Active",
        help_text="Uncheck to deactivate account without deleting.",
    )
    is_staff = models.BooleanField(
        default=False,
        verbose_name="Staff Status",
        help_text="Grants Django Admin access.",
    )

    # ── Timestamps ─────────────────────────────────────────────
    date_joined = models.DateTimeField(
        default=timezone.now,
        verbose_name="Date Joined",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]  # Prompted by createsuperuser

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-date_joined"]
        indexes = [
            models.Index(fields=["email", "is_active"]),
            models.Index(fields=["role", "is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.phone_number:
            from apps.common.utils import normalize_phone_number
            self.phone_number = normalize_phone_number(self.phone_number)

    def save(self, *args, **kwargs):
        if self.phone_number:
            from apps.common.utils import normalize_phone_number
            self.phone_number = normalize_phone_number(self.phone_number)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.full_name} <{self.email}>"

    def get_full_name(self) -> str:
        return self.full_name.strip()

    def get_short_name(self) -> str:
        return self.full_name.split()[0] if self.full_name else self.email

    @property
    def is_customer(self) -> bool:
        return self.role == UserRole.CUSTOMER

    @property
    def is_dealer(self) -> bool:
        return self.role == UserRole.DEALER

    @property
    def is_admin_user(self) -> bool:
        return self.role == UserRole.ADMIN or self.is_superuser

    @property
    def is_locked(self) -> bool:
        """Check if account is currently locked out."""
        if self.locked_until:
            return timezone.now().timestamp() < self.locked_until.timestamp()
        return False

    @property
    def phone(self) -> str | None:
        """Alias for phone_number to ensure multi-module compatibility."""
        return self.phone_number

    @phone.setter
    def phone(self, value: str | None) -> None:
        self.phone_number = value

    @property
    def email_verified(self) -> bool:
        """Alias for is_email_verified."""
        return self.is_email_verified

    @email_verified.setter
    def email_verified(self, value: bool) -> None:
        self.is_email_verified = value

    @property
    def phone_verified(self) -> bool:
        """Alias for is_phone_verified."""
        return self.is_phone_verified

    @phone_verified.setter
    def phone_verified(self, value: bool) -> None:
        self.is_phone_verified = value

    @property
    def dealer_status(self) -> str | None:
        """
        Return the dealer application status string, or None for non-dealers.

        Security guarantee:
        - Non-dealer users always return None.
        - Dealer-role users with NO DealerApplication record return "pending".
          They are NEVER treated as approved without an explicit DB record.
        - Only a dealer whose DealerApplication.status is APPROVED will receive
          "approved" here, which is the only status that unlocks dealer pricing.
        """
        if self.role != UserRole.DEALER:
            return None
        try:
            return self.dealer_application.status
        except Exception:
            # Dealer role but no application — safe fallback is "pending", never "approved"
            return "pending"

    @property
    def is_approved_dealer(self) -> bool:
        """Convenience boolean: True only when dealer application is APPROVED."""
        return self.dealer_status == "approved"



# ============================================================
# UserProfile — Extended info, one-to-one with User
# ============================================================

class UserProfile(models.Model):
    """
    Stores optional extended user information.
    Auto-created via post_save signal when a User is created.

    Kept deliberately minimal in v1.0.
    Phase 4 will add clinic details, addresses, and settings.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.OneToOneField(
        "users.User",
        on_delete=models.CASCADE,
        related_name="profile",
        verbose_name="User",
    )
    avatar = OptimizedImageField(
        upload_to="avatars/",
        null=True,
        blank=True,
        verbose_name="Avatar",
    )

    # ── Core Commerce Profile ───────────────────────────────────
    profession = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Profession",
        help_text="e.g. Dentist, Periodontist, Oral Surgeon",
    )

    # ── Clinic / Practice Details ────────────────────────────────
    clinic_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Clinic / Organisation Name",
    )
    gst_number = models.CharField(
        max_length=15,
        blank=True,
        verbose_name="GST Number",
        help_text="15-character GST Identification Number",
    )
    clinic_phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Clinic Phone Number",
    )
    clinic_email = models.EmailField(
        blank=True,
        verbose_name="Clinic Email",
    )

    # ── Admin Panel Fields ──────────────────────────────────────
    is_blocked = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Blocked",
    )
    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Is Deleted",
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Deleted At",
    )
    admin_notes = models.TextField(
        blank=True,
        verbose_name="Admin Notes",
    )
    tags = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Tags",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_profiles"
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

    def __str__(self) -> str:
        return f"Profile of {self.user.full_name}"

    @property
    def avatar_url(self) -> str | None:
        """Return avatar URL or None if no avatar is set."""
        if self.avatar:
            return self.avatar.url
        return None


# ============================================================
# Address — Multiple addresses per user
# ============================================================

class Address(models.Model):
    """
    Supports multiple delivery / billing addresses per user.

    Constraints:
    - Only one address per user can have is_default=True.
    - Enforced at the service/serializer level (not DB-level).
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="addresses",
        verbose_name="User",
    )
    label = models.CharField(
        max_length=50,
        default="Primary Clinic",
        verbose_name="Address Label",
        help_text="e.g. Primary Clinic, Branch, Home",
    )
    full_name = models.CharField(
        max_length=150,
        verbose_name="Contact Full Name",
    )
    mobile = models.CharField(
        max_length=15,
        verbose_name="Contact Mobile",
    )
    line1 = models.CharField(
        max_length=255,
        verbose_name="Address Line 1",
    )
    line2 = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Address Line 2",
    )
    city = models.CharField(
        max_length=100,
        verbose_name="City",
    )
    state = models.CharField(
        max_length=100,
        verbose_name="State",
    )
    pincode = models.CharField(
        max_length=6,
        verbose_name="Pincode",
    )
    address_type = models.CharField(
        max_length=10,
        choices=AddressType.choices,
        default=AddressType.BOTH,
        verbose_name="Address Type",
    )
    is_default = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Default Address",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "addresses"
        verbose_name = "Address"
        verbose_name_plural = "Addresses"
        ordering = ["-is_default", "-created_at"]
        indexes = [
            models.Index(fields=["user", "is_default"]),
        ]

    def __str__(self) -> str:
        return f"{self.label} – {self.city}, {self.state} ({self.user.email})"


# ============================================================
# CustomerAuditLog — Chronological log of admin actions
# ============================================================

class CustomerAuditLog(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    customer = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="customer_audit_logs",
        verbose_name="Customer",
    )
    action = models.CharField(
        max_length=100,
        verbose_name="Action",
    )
    action_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_admin_actions",
        verbose_name="Action By",
    )
    description = models.TextField(
        verbose_name="Description",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created At",
    )

    class Meta:
        db_table = "customer_audit_logs"
        ordering = ["-created_at"]
        verbose_name = "Customer Audit Log"
        verbose_name_plural = "Customer Audit Logs"

    def __str__(self) -> str:
        return f"{self.customer.email} – {self.action} at {self.created_at}"
