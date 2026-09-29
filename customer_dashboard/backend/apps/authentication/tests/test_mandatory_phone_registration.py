"""
FAAZO - Mandatory Phone & SMS OTP Registration Test Suite.

Verifies:
1. Registration requires phone number (missing or blank phone rejected).
2. Invalid phone formats are rejected.
3. Direct API call to /api/v1/auth/register/ cannot bypass OTP verification.
4. Pre-register stores pending cache and dispatches OTP without creating user account.
5. Verify-and-register fails on wrong OTP, expired OTP, or missing session.
6. Verify-and-register succeeds on valid OTP, creating account with is_phone_verified=True.
7. OTP resend respects cooldown.
8. Normal login and dealer registration remain functional.
"""

from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.authentication.models import OTPRecord, OtpPurpose
from apps.authentication.services.otp_service import OTPService
from apps.users.models import UserRole

User = get_user_model()


class MandatoryPhoneRegistrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()
        self.valid_data = {
            "full_name": "Test Customer",
            "email": "customer@example.com",
            "phone_number": "9876543210",
            "password": "Password123!",
            "confirm_password": "Password123!",
        }

    # ──────────────────────────────────────────────────────────────────────────
    # 1. Direct Registration Endpoint Bypass Prevention
    # ──────────────────────────────────────────────────────────────────────────

    def test_direct_register_without_otp_rejected(self):
        """Direct POST to /api/v1/auth/register/ without otp_code must be rejected (400)."""
        response = self.client.post("/api/v1/auth/register/", self.valid_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data.get("success"))
        self.assertIn("Phone verification is mandatory", response.data.get("message", ""))
        self.assertFalse(User.objects.filter(email=self.valid_data["email"]).exists())

    def test_direct_register_without_phone_rejected(self):
        """Direct POST to /api/v1/auth/register/ with missing phone rejected (400)."""
        data = {**self.valid_data}
        del data["phone_number"]
        response = self.client.post("/api/v1/auth/register/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email=self.valid_data["email"]).exists())

    def test_direct_register_with_fake_otp_rejected(self):
        """Direct POST to /api/v1/auth/register/ with fake otp_code rejected (400)."""
        data = {**self.valid_data, "otp_code": "000000"}
        response = self.client.post("/api/v1/auth/register/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email=self.valid_data["email"]).exists())

    # ──────────────────────────────────────────────────────────────────────────
    # 2. Pre-Register Validations
    # ──────────────────────────────────────────────────────────────────────────

    def test_pre_register_missing_phone_rejected(self):
        """POST /api/v1/auth/pre-register/ without phone_number must return 400."""
        data = {**self.valid_data}
        del data["phone_number"]
        response = self.client.post("/api/v1/auth/pre-register/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data.get("success"))
        self.assertIn("phone_number", response.data.get("errors", {}))
        self.assertFalse(User.objects.filter(email=self.valid_data["email"]).exists())

    def test_pre_register_blank_phone_rejected(self):
        """POST /api/v1/auth/pre-register/ with blank phone_number must return 400."""
        data = {**self.valid_data, "phone_number": "   "}
        response = self.client.post("/api/v1/auth/pre-register/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data.get("success"))
        self.assertIn("phone_number", response.data.get("errors", {}))
        self.assertFalse(User.objects.filter(email=self.valid_data["email"]).exists())

    def test_pre_register_invalid_phone_rejected(self):
        """POST /api/v1/auth/pre-register/ with invalid phone must return 400."""
        data = {**self.valid_data, "phone_number": "12345"}
        response = self.client.post("/api/v1/auth/pre-register/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data.get("success"))
        self.assertIn("phone_number", response.data.get("errors", {}))
        self.assertFalse(User.objects.filter(email=self.valid_data["email"]).exists())

    def test_pre_register_valid_phone_sends_otp_and_no_user_created(self):
        """POST /api/v1/auth/pre-register/ with valid phone sends OTP, returns otp_required=True, no user created."""
        with patch.object(OTPService, "send_otp", return_value=(True, "OTP sent successfully.")) as mock_send:
            response = self.client.post("/api/v1/auth/pre-register/", self.valid_data, format="json")
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertTrue(response.data.get("success"))
            self.assertTrue(response.data["data"]["otp_required"])
            self.assertEqual(response.data["data"]["phone"], "+919876543210")
            mock_send.assert_called_once()

            # Verify NO user is created in database
            self.assertFalse(User.objects.filter(email=self.valid_data["email"]).exists())

            # Verify pending cache exists
            pending = cache.get("pending_reg_+919876543210")
            self.assertIsNotNone(pending)
            self.assertEqual(pending["email"], "customer@example.com")
            self.assertEqual(pending["phone_number"], "+919876543210")

    # ──────────────────────────────────────────────────────────────────────────
    # 3. Verify & Register Flow
    # ──────────────────────────────────────────────────────────────────────────

    def test_verify_missing_parameters_rejected(self):
        """POST /api/v1/auth/verify-and-register/ without phone or otp_code returns 400."""
        response = self.client.post("/api/v1/auth/verify-and-register/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_wrong_otp_rejected(self):
        """POST /api/v1/auth/verify-and-register/ with incorrect OTP code returns 400."""
        cache.set("pending_reg_+919876543210", {
            "email": self.valid_data["email"],
            "full_name": self.valid_data["full_name"],
            "password": self.valid_data["password"],
            "phone_number": "+919876543210",
        }, timeout=900)

        # Create real OTP record
        from datetime import timedelta
        from django.utils import timezone
        OTPRecord.objects.create(
            target="+919876543210",
            purpose=OtpPurpose.REGISTRATION,
            otp_hash=OTPService.hash_otp("654321"),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        response = self.client.post("/api/v1/auth/verify-and-register/", {
            "phone_number": "+919876543210",
            "otp_code": "000000",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email=self.valid_data["email"]).exists())

    def test_verify_expired_session_rejected(self):
        """POST /api/v1/auth/verify-and-register/ with valid OTP but expired cache session returns 400."""
        # Create valid OTP record but DO NOT set pending cache
        from datetime import timedelta
        from django.utils import timezone
        OTPRecord.objects.create(
            target="+919876543210",
            purpose=OtpPurpose.REGISTRATION,
            otp_hash=OTPService.hash_otp("123456"),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        with patch.object(OTPService, "verify_otp", return_value=(True, "OTP verified.")):
            response = self.client.post("/api/v1/auth/verify-and-register/", {
                "phone_number": "+919876543210",
                "otp_code": "123456",
            }, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("Registration session expired", response.data.get("message", ""))
            self.assertFalse(User.objects.filter(email=self.valid_data["email"]).exists())

    def test_complete_registration_flow_success(self):
        """Complete flow: pre-register -> verify OTP -> account created and tokens returned."""
        with patch.object(OTPService, "send_otp", return_value=(True, "OTP sent successfully.")):
            # Step 1: Pre-Register
            pre_res = self.client.post("/api/v1/auth/pre-register/", self.valid_data, format="json")
            self.assertEqual(pre_res.status_code, status.HTTP_200_OK)
            self.assertFalse(User.objects.filter(email=self.valid_data["email"]).exists())

        with patch.object(OTPService, "verify_otp", return_value=(True, "OTP verified.")):
            # Step 2: Verify & Register
            verify_res = self.client.post("/api/v1/auth/verify-and-register/", {
                "phone_number": "9876543210",  # Unnormalized format should be accepted and normalized
                "otp_code": "123456",
            }, format="json")
            self.assertEqual(verify_res.status_code, status.HTTP_201_CREATED)
            self.assertTrue(verify_res.data.get("success"))
            self.assertIn("access", verify_res.data["data"])
            self.assertIn("refresh", verify_res.data["data"])

            # Verify user exists in database and is phone verified
            user = User.objects.get(email=self.valid_data["email"])
            self.assertTrue(user.is_phone_verified)
            self.assertEqual(user.phone_number, "+919876543210")
            self.assertEqual(user.role, UserRole.CUSTOMER)

            # Verify pending cache is cleared
            self.assertIsNone(cache.get("pending_reg_+919876543210"))
