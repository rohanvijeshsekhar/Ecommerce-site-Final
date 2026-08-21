"""
FAAZO – Custom User Manager

Provides create_user() and create_superuser() for AbstractBaseUser.

Key design:
- Email is the unique identifier (USERNAME_FIELD = "email")
- full_name is the only REQUIRED_FIELD besides email/password
- Passwords are hashed via Django's set_password() (Argon2 configured)
- Phone number is optional at creation (future OTP phase)
"""

from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    """
    Custom manager for the FAAZO User model.

    Usage:
        User.objects.create_user(email="...", password="...", full_name="...")
        User.objects.create_superuser(email="...", password="...", full_name="...")
    """

    use_in_migrations = True

    def _create_user(self, email: str, password: str, full_name: str, **extra_fields):
        """
        Internal helper. Normalises email, hashes password, saves user.
        """
        if not email:
            raise ValueError("An email address is required.")
        if not full_name:
            raise ValueError("A full name is required.")

        email = self.normalize_email(email)
        if extra_fields.get("phone_number"):
            from apps.common.utils import normalize_phone_number
            extra_fields["phone_number"] = normalize_phone_number(extra_fields["phone_number"])

        user = self.model(email=email, full_name=full_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str, full_name: str, **extra_fields):
        """
        Create and save a standard (non-staff, non-superuser) user.
        Role defaults to 'customer' unless explicitly overridden.
        """
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("role", "customer")
        return self._create_user(email, password, full_name, **extra_fields)

    def create_superuser(self, email: str, password: str, full_name: str = "FAAZO Admin", **extra_fields):
        """
        Create and save a superuser (Django Admin access).
        Superusers always have role='admin'.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")
        extra_fields.setdefault("is_email_verified", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(email, password, full_name, **extra_fields)
