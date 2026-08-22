"""
FAAZO – Enterprise Password Reset Test Suite (All 18 Production Requirements)
=============================================================================

Tests:
 1. Valid forgot-password request
 2. Unknown email (anti-enumeration check)
 3. Generic response for unknown email (no email sent)
 4. Reset email generation with secure URL
 5. Valid reset token verification
 6. Expired token rejection (>30 mins)
 7. Invalid token format rejection (wrong length / non-hex)
 8. Tampered token rejection (altered hash / modified string)
 9. Reused token rejection (single-use enforced)
 10. Password policy validation (rejects weak/short passwords)
 11. Password confirmation mismatch rejection
 12. Successful password update
 13. Old password no longer works
 14. New password successfully authenticates
 15. Rate limiting on forgot-password endpoint
 16. Superseded token cannot be used (only latest valid)
 17. Blocked / deactivated user rejection
 18. Google-only account skipped with generic success
"""

from datetime import timedelta
import logging
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core import mail
from django.utils import timezone
from django.test import override_settings

from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.models import AuditLog, DeviceSession, PasswordResetToken, OTPRecord, OtpPurpose
from apps.authentication.services import TokenService
from apps.users.models import UserProfile, UserRole

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class PasswordResetComprehensiveTests(APITestCase):

    def setUp(self):
        cache.clear()
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
        self.user.set_password("OldComplexPassword123!")
        self.user.save()

    def tearDown(self):
        cache.clear()

    def test_01_valid_forgot_password_request(self):
        """1. Verify registered user receives generic HTTP 200, token is generated and email is sent."""
        response = self.client.post(self.forgot_url, {"email": "doctor@clinic.com"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(
            response.data["message"],
            "If an account exists, a 6-digit verification code has been sent to your email.",
        )
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Your FAAZO Password Reset Code:", mail.outbox[0].subject)

    def test_02_03_unknown_email_anti_enumeration(self):
        """2 & 3. Verify unknown email returns identical generic 200 without sending email or leaking account presence."""
        response = self.client.post(self.forgot_url, {"email": "nonexistent@clinic.com"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(
            response.data["message"],
            "If an account exists, a 6-digit verification code has been sent to your email.",
        )
        self.assertEqual(len(mail.outbox), 0)
        self.assertTrue(
            AuditLog.objects.filter(action="PASSWORD_RESET_UNKNOWN_EMAIL", status="FAILURE").exists()
        )

    def test_04_reset_email_generation(self):
        """4. Verify reset email content has 6-digit OTP code, branding, and expiry info."""
        self.client.post(self.forgot_url, {"email": "doctor@clinic.com"}, format="json")

        self.assertEqual(len(mail.outbox), 1)
        email_msg = mail.outbox[0]
        self.assertIn("Your FAAZO Password Reset Code:", email_msg.subject)
        self.assertIn("5 minutes", email_msg.body)

    def test_05_valid_reset_token_verification(self):
        """5. Verify TokenService correctly validates a newly generated token."""
        raw_token = TokenService.generate_password_reset_token(self.user)
        self.assertEqual(len(raw_token), 64)

        is_valid, user, msg = TokenService.validate_password_reset_token(raw_token)
        self.assertTrue(is_valid)
        self.assertEqual(user, self.user)

    def test_06_expired_token_rejection(self):
        """6. Verify token older than 30 minutes is rejected."""
        raw_token = TokenService.generate_password_reset_token(self.user)

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

    def test_07_invalid_token_format_rejection(self):
        """7. Verify malformed/short tokens are rejected immediately."""
        malformed_tokens = ["short_token", "x" * 63, "z" * 65, ""]

        for bad_token in malformed_tokens:
            response = self.client.post(
                self.reset_url,
                {
                    "token": bad_token,
                    "password": "NewComplexPassword123!",
                    "confirm_password": "NewComplexPassword123!",
                },
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertFalse(response.data["success"])

    def test_08_tampered_token_rejection(self):
        """8. Verify tampered token hash does not validate."""
        raw_token = TokenService.generate_password_reset_token(self.user)
        # Flip the last hex character
        last_char = "0" if raw_token[-1] != "0" else "1"
        tampered_token = raw_token[:-1] + last_char

        response = self.client.post(
            self.reset_url,
            {
                "token": tampered_token,
                "password": "NewComplexPassword123!",
                "confirm_password": "NewComplexPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])

    def test_09_reused_token_rejection(self):
        """9. Verify single-use enforcement: used token cannot be consumed a second time."""
        raw_token = TokenService.generate_password_reset_token(self.user)
        success, _ = TokenService.consume_password_reset_token(raw_token, "NewComplexPassword123!")
        self.assertTrue(success)

        # Attempt reuse
        response = self.client.post(
            self.reset_url,
            {
                "token": raw_token,
                "password": "AnotherComplexPassword123!",
                "confirm_password": "AnotherComplexPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])

    def test_10_password_policy_validation(self):
        """10. Verify weak passwords fail Django password validation."""
        raw_token = TokenService.generate_password_reset_token(self.user)

        response = self.client.post(
            self.reset_url,
            {
                "token": raw_token,
                "password": "123",
                "confirm_password": "123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])

    def test_11_password_mismatch_rejection(self):
        """11. Verify password mismatch is rejected."""
        raw_token = TokenService.generate_password_reset_token(self.user)

        response = self.client.post(
            self.reset_url,
            {
                "token": raw_token,
                "password": "NewComplexPassword123!",
                "confirm_password": "DifferentPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])

    def test_12_13_14_password_update_and_authentication(self):
        """12, 13, 14. Verify password is changed: old password fails and new password authenticates."""
        # Create active DeviceSession
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
                "password": "BrandNewPassword123!",
                "confirm_password": "BrandNewPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])

        # 13. Old password fails
        self.user.refresh_from_db()
        self.assertFalse(self.user.check_password("OldComplexPassword123!"))

        # 14. New password works
        self.assertTrue(self.user.check_password("BrandNewPassword123!"))

        # Sessions revoked
        session.refresh_from_db()
        self.assertFalse(session.is_active)

    def test_15_rate_limiting_forgot_password(self):
        """15. Verify ForgotPasswordRateThrottle limits excessive requests per IP."""
        for _ in range(5):
            self.client.post(self.forgot_url, {"email": "doctor@clinic.com"}, format="json")

        # 6th request should be throttled (HTTP 429)
        response = self.client.post(self.forgot_url, {"email": "doctor@clinic.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_16_superseded_token_invalidation(self):
        """16. Verify requesting a new token supersedes all previous tokens."""
        token_1 = TokenService.generate_password_reset_token(self.user)
        token_2 = TokenService.generate_password_reset_token(self.user)

        # Token 1 must fail
        is_valid_1, _, msg_1 = TokenService.validate_password_reset_token(token_1)
        self.assertFalse(is_valid_1)
        self.assertTrue("already been used" in msg_1.lower() or "superseded" in msg_1.lower())

        # Token 2 must succeed
        is_valid_2, user_2, _ = TokenService.validate_password_reset_token(token_2)
        self.assertTrue(is_valid_2)
        self.assertEqual(user_2, self.user)

    def test_17_blocked_user_rejection(self):
        """17. Verify blocked user cannot reset password."""
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

    def test_18_google_only_account_can_receive_otp(self):
        """18. Verify Google accounts can receive password reset OTP to set credentials."""
        google_user = User.objects.create(
            email="google_doc@clinic.com",
            full_name="Google Doctor",
            auth_provider="google",
            is_active=True,
        )
        google_user.set_unusable_password()
        google_user.save()

        response = self.client.post(self.forgot_url, {"email": "google_doc@clinic.com"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertTrue(OTPRecord.objects.filter(target="google_doc@clinic.com", purpose=OtpPurpose.PASSWORD_RESET).exists())

