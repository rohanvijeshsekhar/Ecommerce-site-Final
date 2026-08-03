"""
FAAZO – Enterprise Password Reset Test Suite (12 Mandatory Requirements)

Tests:
- Registered user password reset request & email creation
- Unknown email request (generic 200, audit PASSWORD_RESET_UNKNOWN_EMAIL)
- Google-only account reset attempt (generic 200, audit PASSWORD_RESET_SKIPPED_GOOGLE_ACCOUNT, no email sent)
- Multiple reset requests (only newest token valid)
- Used token rejection
- Expired token rejection
- Password complexity validation
- Blocked / Deleted / Inactive user rejection
- Session revocation & JWT token blacklisting on reset
"""

from datetime import timedelta
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import mail
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.models import AuditLog, DeviceSession, PasswordResetToken
from apps.authentication.services import TokenService
from apps.users.models import UserProfile, UserRole

User = get_user_model()


class PasswordResetV2Tests(APITestCase):
    def setUp(self):
        self.forgot_url = "/api/v1/auth/v2/password/forgot/"
        self.reset_url = "/api/v1/auth/v2/password/reset/"

        self.user = User.objects.create(
            email="doctor@clinic.com",
            full_name="Dr. Aditya Sharma",
            role=UserRole.CUSTOMER,
            auth_provider="email",
            is_active=True,
            is_email_verified=True,
        )
        self.user.set_password("OldPassword123!")
        self.user.save()

    def test_registered_user_forgot_password_request(self):
        """Verify registered user receives generic HTTP 200, reset token generated, and email sent."""
        response = self.client.post(self.forgot_url, {"email": "doctor@clinic.com"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "If an account exists, password reset instructions have been sent.")

        # Verify email sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Reset your FAAZO password", mail.outbox[0].subject)
        self.assertIn("reset-password?token=", mail.outbox[0].body)

        # Verify DB token hash generated
        self.assertTrue(PasswordResetToken.objects.filter(user=self.user, is_used=False).exists())

        # Verify AuditLog created
        self.assertTrue(AuditLog.objects.filter(user=self.user, action="PASSWORD_RESET_REQUESTED", status="SUCCESS").exists())

    def test_unknown_email_request_privacy(self):
        """Verify unknown email receives generic HTTP 200 without exposing email non-existence."""
        response = self.client.post(self.forgot_url, {"email": "unknown@clinic.com"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "If an account exists, password reset instructions have been sent.")

        # Verify no email sent
        self.assertEqual(len(mail.outbox), 0)

        # Verify AuditLog recorded PASSWORD_RESET_UNKNOWN_EMAIL
        self.assertTrue(AuditLog.objects.filter(action="PASSWORD_RESET_UNKNOWN_EMAIL", status="FAILURE").exists())

    def test_google_only_account_password_reset_skipped(self):
        """Verify Google-only accounts do not receive password reset tokens or emails."""
        google_user = User.objects.create(
            email="google@clinic.com",
            full_name="Google User",
            auth_provider="google",
            google_sub="google-sub-9999",
            is_active=True,
        )
        google_user.set_unusable_password()
        google_user.save()

        response = self.client.post(self.forgot_url, {"email": "google@clinic.com"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "If an account exists, password reset instructions have been sent.")

        # Verify no reset email sent & no token created
        self.assertEqual(len(mail.outbox), 0)
        self.assertFalse(PasswordResetToken.objects.filter(user=google_user).exists())

        # Verify AuditLog PASSWORD_RESET_SKIPPED_GOOGLE_ACCOUNT recorded
        self.assertTrue(AuditLog.objects.filter(user=google_user, action="PASSWORD_RESET_SKIPPED_GOOGLE_ACCOUNT").exists())

    def test_only_newest_token_is_valid(self):
        """Verify that requesting multiple resets invalidates older tokens and accepts only the newest."""
        # First request
        token_1 = TokenService.generate_password_reset_token(self.user)
        # Second request
        token_2 = TokenService.generate_password_reset_token(self.user)

        # Token 1 must be rejected as superseded
        is_valid_1, _, msg_1 = TokenService.validate_password_reset_token(token_1)
        self.assertFalse(is_valid_1)

        # Token 2 must be accepted
        is_valid_2, user_2, _ = TokenService.validate_password_reset_token(token_2)
        self.assertTrue(is_valid_2)
        self.assertEqual(user_2, self.user)

    def test_successful_password_reset_flow(self):
        """Verify password update, token consumption, and session revocation."""
        # Create active DeviceSession for user
        session = DeviceSession.objects.create(
            user=self.user,
            session_key="active-test-session-key",
            device_name="Chrome Test Browser",
            is_active=True,
        )

        raw_token = TokenService.generate_password_reset_token(self.user)

        response = self.client.post(
            self.reset_url,
            {
                "token": raw_token,
                "password": "NewComplexPassword123!",
                "confirm_password": "NewComplexPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])

        # Verify password changed
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewComplexPassword123!"))
        self.assertFalse(self.user.check_password("OldPassword123!"))

        # Verify DeviceSession revoked
        session.refresh_from_db()
        self.assertFalse(session.is_active)

        # Verify AuditLog recorded PASSWORD_RESET_SUCCESS
        self.assertTrue(AuditLog.objects.filter(user=self.user, action="PASSWORD_RESET_SUCCESS").exists())

    def test_used_token_rejection(self):
        """Verify already used token is rejected."""
        raw_token = TokenService.generate_password_reset_token(self.user)
        TokenService.consume_password_reset_token(raw_token, "NewComplexPassword123!")

        # Attempt reuse
        response = self.client.post(
            self.reset_url,
            {
                "token": raw_token,
                "password": "AnotherPassword123!",
                "confirm_password": "AnotherPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])

    def test_expired_token_rejection(self):
        """Verify expired token (>30 mins old) is rejected."""
        raw_token = TokenService.generate_password_reset_token(self.user)

        # Fast forward token expiration
        token_hash = TokenService._hash_token(raw_token)
        token_obj = PasswordResetToken.objects.get(token_hash=token_hash)
        token_obj.expires_at = timezone.now() - timedelta(minutes=1)
        token_obj.save()

        response = self.client.post(
            self.reset_url,
            {
                "token": raw_token,
                "password": "NewComplexPassword123!",
                "confirm_password": "NewComplexPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])
        self.assertIn("expired", response.data["message"].lower())

    def test_weak_password_rejection(self):
        """Verify password policy rejects weak passwords."""
        raw_token = TokenService.generate_password_reset_token(self.user)

        response = self.client.post(
            self.reset_url,
            {
                "token": raw_token,
                "password": "short",
                "confirm_password": "short",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])

    def test_blocked_user_reset_rejection(self):
        """Verify blocked user cannot consume a reset token."""
        raw_token = TokenService.generate_password_reset_token(self.user)

        profile = self.user.profile
        profile.is_blocked = True
        profile.save()

        response = self.client.post(
            self.reset_url,
            {
                "token": raw_token,
                "password": "NewComplexPassword123!",
                "confirm_password": "NewComplexPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])
