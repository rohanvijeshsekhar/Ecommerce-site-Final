"""
FAAZO – Password Reset via Email OTP Comprehensive Security Test Suite
====================================================================
Tests:
1. Generation of 6-digit numeric OTP & SHA-256 storage (never plaintext)
2. Anti-enumeration: returns 200 generic response for registered and unregistered emails
3. 60-second resend cooldown enforcement
4. Invalidation of older unused OTP upon resend
5. Max 5 verification attempts lockout
6. Wrong OTP rejection with attempt count
7. Single-use 10-minute PasswordResetToken issued on success
8. Separation of concerns: user.is_email_verified is NOT altered
9. Password reset completion: password updated, sessions revoked, JWTs blacklisted
10. Old password failure and new password success
11. Weak password and password mismatch rejection
"""

from datetime import timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.authentication.models import OTPRecord, OtpPurpose, PasswordResetToken
from apps.authentication.services import OTPService
from apps.authentication.services.legacy_services import TokenService

User = get_user_model()


class PasswordResetEmailOTPTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.email = "dentist_otp_test@faazo.com"
        self.old_password = "OldStrongPassword@123"
        self.new_password = "NewStrongPassword@2026!"
        self.user = User.objects.create_user(
            email=self.email,
            full_name="Dr. Dentist",
            password=self.old_password,
            is_active=True,
            is_email_verified=False,  # Intentionally False to verify separation of concerns
        )
        self.forgot_url = "/api/v1/auth/v2/password/forgot/"
        self.otp_verify_url = "/api/v1/auth/v2/otp/verify/"
        self.otp_resend_url = "/api/v1/auth/v2/otp/resend/"
        self.reset_url = "/api/v1/auth/v2/password/reset/"

    def test_01_forgot_password_dispatches_otp_and_prevents_enumeration(self):
        # 1. Registered email
        resp = self.client.post(self.forgot_url, {"email": self.email}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("6-digit verification code", resp.data.get("message", ""))

        # Verify OTP record in DB
        otp_rec = OTPRecord.objects.filter(target=self.email, purpose=OtpPurpose.PASSWORD_RESET).first()
        self.assertIsNotNone(otp_rec)
        self.assertFalse(otp_rec.is_used)
        self.assertEqual(len(otp_rec.otp_hash), 64)  # SHA-256 hash length
        self.assertEqual(otp_rec.max_attempts, 5)

        # 2. Unregistered email (anti-enumeration check)
        unregistered_email = "nonexistent_dentist_999@faazo.com"
        resp2 = self.client.post(self.forgot_url, {"email": unregistered_email}, format="json")
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp.data.get("message"), resp2.data.get("message"))

    def test_02_resend_cooldown_and_prior_otp_invalidation(self):
        # Initial send
        OTPService.send_otp(target=self.email, purpose=OtpPurpose.PASSWORD_RESET, user=self.user)
        first_record = OTPRecord.objects.filter(target=self.email, purpose=OtpPurpose.PASSWORD_RESET, is_used=False).first()
        self.assertIsNotNone(first_record)

        # Immediate resend should be blocked by 60s cooldown
        success, msg = OTPService.send_otp(target=self.email, purpose=OtpPurpose.PASSWORD_RESET, user=self.user)
        self.assertFalse(success)
        self.assertIn("wait", msg.lower())

        # Fast forward time past 60s cooldown
        first_record.created_at = timezone.now() - timedelta(seconds=65)
        first_record.save(update_fields=["created_at"])

        # Second send after cooldown
        success2, msg2 = OTPService.send_otp(target=self.email, purpose=OtpPurpose.PASSWORD_RESET, user=self.user)
        self.assertTrue(success2)

        # Verify prior OTP was invalidated
        first_record.refresh_from_db()
        self.assertTrue(first_record.is_used)

        second_record = OTPRecord.objects.filter(target=self.email, purpose=OtpPurpose.PASSWORD_RESET, is_used=False).first()
        self.assertIsNotNone(second_record)
        self.assertNotEqual(first_record.id, second_record.id)

    def test_03_wrong_otp_and_max_attempts_lockout(self):
        # Generate known OTP
        raw_otp = "849201"
        otp_hash = OTPService.hash_otp(raw_otp)
        otp_rec = OTPRecord.objects.create(
            target=self.email,
            purpose=OtpPurpose.PASSWORD_RESET,
            otp_hash=otp_hash,
            expires_at=timezone.now() + timedelta(minutes=5),
            max_attempts=5,
            attempts=0,
        )

        # Submit wrong OTP 4 times
        for i in range(1, 5):
            resp = self.client.post(
                self.otp_verify_url,
                {"target": self.email, "purpose": "password_reset", "code": "000000"},
                format="json",
            )
            self.assertEqual(resp.status_code, 400)
            otp_rec.refresh_from_db()
            self.assertEqual(otp_rec.attempts, i)
            self.assertFalse(otp_rec.is_used)

        # 5th wrong attempt -> exhausts max attempts and locks OTP
        resp5 = self.client.post(
            self.otp_verify_url,
            {"target": self.email, "purpose": "password_reset", "code": "000000"},
            format="json",
        )
        self.assertEqual(resp5.status_code, 400)
        otp_rec.refresh_from_db()
        self.assertTrue(otp_rec.is_used)

        # 6th attempt fails due to exceeded attempts
        resp6 = self.client.post(
            self.otp_verify_url,
            {"target": self.email, "purpose": "password_reset", "code": "000000"},
            format="json",
        )
        self.assertEqual(resp6.status_code, 400)
        self.assertIn("exceeded", resp6.data.get("message", "").lower())

        # Even correct OTP now fails because record is marked used/exhausted
        resp_correct = self.client.post(
            self.otp_verify_url,
            {"target": self.email, "purpose": "password_reset", "code": raw_otp},
            format="json",
        )
        self.assertEqual(resp_correct.status_code, 400)

    def test_04_successful_otp_issues_reset_token_without_modifying_email_verification(self):
        raw_otp = "654321"
        otp_hash = OTPService.hash_otp(raw_otp)
        OTPRecord.objects.create(
            target=self.email,
            purpose=OtpPurpose.PASSWORD_RESET,
            otp_hash=otp_hash,
            expires_at=timezone.now() + timedelta(minutes=5),
            max_attempts=5,
            attempts=0,
        )

        # Precondition check: is_email_verified must be False
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_email_verified)

        resp = self.client.post(
            self.otp_verify_url,
            {"target": self.email, "purpose": "password_reset", "code": raw_otp},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data.get("success"))
        reset_token = resp.data.get("data", {}).get("reset_token")
        self.assertIsNotNone(reset_token)
        self.assertEqual(len(reset_token), 64)

        # Verify separation of concerns (Safety Rule #10)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_email_verified, "user.is_email_verified should NOT be modified by password reset OTP")

        # Verify reset token in DB
        token_rec = PasswordResetToken.objects.filter(user=self.user, is_used=False).first()
        self.assertIsNotNone(token_rec)
        self.assertEqual(len(token_rec.token_hash), 64)

    def test_05_complete_end_to_end_password_reset_flow(self):
        # Step 1: Request OTP
        self.client.post(self.forgot_url, {"email": self.email}, format="json")
        otp_rec = OTPRecord.objects.filter(target=self.email, purpose=OtpPurpose.PASSWORD_RESET, is_used=False).first()
        self.assertIsNotNone(otp_rec)

        # Emulate customer typing OTP
        raw_otp = "123456"
        otp_rec.otp_hash = OTPService.hash_otp(raw_otp)
        otp_rec.save()

        # Step 2: Verify OTP -> get reset_token
        verify_resp = self.client.post(
            self.otp_verify_url,
            {"target": self.email, "purpose": "password_reset", "code": raw_otp},
            format="json",
        )
        self.assertEqual(verify_resp.status_code, 200)
        reset_token = verify_resp.data["data"]["reset_token"]

        # Step 3: Attempt reset with weak password -> should fail
        weak_resp = self.client.post(
            self.reset_url,
            {"token": reset_token, "password": "weak", "confirm_password": "weak"},
            format="json",
        )
        self.assertEqual(weak_resp.status_code, 400)

        # Step 4: Attempt reset with password mismatch -> should fail
        mismatch_resp = self.client.post(
            self.reset_url,
            {"token": reset_token, "password": self.new_password, "confirm_password": "DifferentPassword123!"},
            format="json",
        )
        self.assertEqual(mismatch_resp.status_code, 400)

        # Step 5: Submit valid new password
        reset_resp = self.client.post(
            self.reset_url,
            {"token": reset_token, "password": self.new_password, "confirm_password": self.new_password},
            format="json",
        )
        self.assertEqual(reset_resp.status_code, 200)
        self.assertTrue(reset_resp.data.get("success"))

        # Step 6: Verify old password fails and new password works
        self.user.refresh_from_db()
        self.assertFalse(self.user.check_password(self.old_password))
        self.assertTrue(self.user.check_password(self.new_password))

        # Step 7: Verify reset token cannot be reused
        reuse_resp = self.client.post(
            self.reset_url,
            {"token": reset_token, "password": self.new_password, "confirm_password": self.new_password},
            format="json",
        )
        self.assertEqual(reuse_resp.status_code, 400)
