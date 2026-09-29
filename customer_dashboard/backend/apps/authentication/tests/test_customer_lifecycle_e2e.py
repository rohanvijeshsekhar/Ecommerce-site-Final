"""
FAAZO - Customer Registration Lifecycle End-to-End Test Suite.

Exhaustively verifies the mandatory-phone and OTP enforcement for normal customers:
1. Signup WITHOUT phone number -> rejected, no account created.
2. Signup with phone but WITHOUT completing OTP -> no account, no tokens.
3. Signup with phone + WRONG OTP -> rejected, no account.
4. Signup with phone + EXPIRED OTP -> rejected, no account.
5. Signup with phone + CORRECT OTP -> account created, access+refresh tokens returned.
6. Direct API bypass attempts -> rejected, no account.
7. Regression checks: normal login, forgot password, password reset,
   Google auth (signup & login), dealer registration, and OTP resend.
"""

from datetime import timedelta
import hashlib
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.models import OTPRecord, OtpPurpose
from apps.authentication.services.otp_service import OTPService
from apps.users.models import UserRole

User = get_user_model()


def _crack_otp_hash(target_hash: str) -> str:
    """Helper to resolve 6-digit OTP code from SHA-256 hash in tests."""
    for i in range(100000, 1000000):
        code = str(i)
        if hashlib.sha256(code.encode("utf-8")).hexdigest() == target_hash:
            return code
    raise ValueError("OTP not found in 6-digit space")


class CustomerRegistrationLifecycleE2ETests(APITestCase):
    def setUp(self):
        cache.clear()
        self.phone = "6282293694"
        self.norm_phone = "+916282293694"
        self.valid_customer_data = {
            "full_name": "Rohan Kumar",
            "email": "rohan.customer@example.com",
            "phone_number": self.phone,
            "password": "SecurePassword123!",
            "confirm_password": "SecurePassword123!",
        }

    # ──────────────────────────────────────────────────────────────────────────
    # Test 1: Signup WITHOUT phone number
    # ──────────────────────────────────────────────────────────────────────────

    def test_1a_pre_register_without_phone_rejected(self):
        """Missing phone_number in pre-register is rejected with 400 and creates no account."""
        data = {**self.valid_customer_data}
        del data["phone_number"]

        res = self.client.post("/api/v1/auth/pre-register/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res.data.get("success"))
        self.assertIn("phone_number", res.data.get("errors", {}))
        self.assertFalse(User.objects.filter(email=self.valid_customer_data["email"]).exists())

    def test_1b_pre_register_blank_phone_rejected(self):
        """Blank phone_number in pre-register is rejected with 400 and creates no account."""
        data = {**self.valid_customer_data, "phone_number": "   "}

        res = self.client.post("/api/v1/auth/pre-register/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res.data.get("success"))
        self.assertIn("phone_number", res.data.get("errors", {}))
        self.assertFalse(User.objects.filter(email=self.valid_customer_data["email"]).exists())

    def test_1c_direct_register_without_phone_rejected(self):
        """Direct register call without phone_number is rejected and creates no account."""
        data = {**self.valid_customer_data}
        del data["phone_number"]

        res = self.client.post("/api/v1/auth/register/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email=self.valid_customer_data["email"]).exists())

    # ──────────────────────────────────────────────────────────────────────────
    # Test 2: Signup with valid phone number but WITHOUT completing OTP
    # ──────────────────────────────────────────────────────────────────────────

    def test_2a_pre_register_does_not_create_account_or_return_tokens(self):
        """Pre-register dispatches OTP but must NOT create an account or return tokens."""
        res = self.client.post("/api/v1/auth/pre-register/", self.valid_customer_data, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get("success"))
        self.assertTrue(res.data.get("data", {}).get("otp_required"))

        # Must NOT return access or refresh tokens
        self.assertNotIn("access", res.data.get("data", {}))
        self.assertNotIn("refresh", res.data.get("data", {}))

        # Must NOT create user account in database
        self.assertFalse(User.objects.filter(email=self.valid_customer_data["email"]).exists())
        self.assertFalse(User.objects.filter(phone_number=self.norm_phone).exists())

    def test_2b_incomplete_otp_attempt_rejected(self):
        """Attempting to complete registration without an OTP code must be rejected."""
        # Initiate pre-registration
        self.client.post("/api/v1/auth/pre-register/", self.valid_customer_data, format="json")

        # Call verify-and-register without OTP code
        res = self.client.post(
            "/api/v1/auth/verify-and-register/",
            {"phone_number": self.norm_phone, "otp_code": ""},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email=self.valid_customer_data["email"]).exists())

    # ──────────────────────────────────────────────────────────────────────────
    # Test 3: Signup with valid phone number + WRONG OTP
    # ──────────────────────────────────────────────────────────────────────────

    def test_3_signup_with_wrong_otp_rejected(self):
        """Submitting an incorrect OTP code fails and leaves the user unregistered."""
        # Initiate pre-registration
        pre_res = self.client.post("/api/v1/auth/pre-register/", self.valid_customer_data, format="json")
        self.assertEqual(pre_res.status_code, status.HTTP_200_OK)

        # Call verify-and-register with wrong code
        res = self.client.post(
            "/api/v1/auth/verify-and-register/",
            {"phone_number": self.norm_phone, "otp_code": "000000"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res.data.get("success"))
        self.assertNotIn("access", res.data.get("data", {}))
        self.assertFalse(User.objects.filter(email=self.valid_customer_data["email"]).exists())
        self.assertFalse(User.objects.filter(phone_number=self.norm_phone).exists())

    # ──────────────────────────────────────────────────────────────────────────
    # Test 4: Signup with valid phone number + EXPIRED OTP
    # ──────────────────────────────────────────────────────────────────────────

    def test_4_signup_with_expired_otp_rejected(self):
        """Submitting an expired OTP code is rejected and creates no account."""
        # Initiate pre-registration
        pre_res = self.client.post("/api/v1/auth/pre-register/", self.valid_customer_data, format="json")
        self.assertEqual(pre_res.status_code, status.HTTP_200_OK)

        # Retrieve the OTP record generated for this target
        otp_rec = (
            OTPRecord.objects.filter(target=self.norm_phone, purpose=OtpPurpose.REGISTRATION)
            .order_by("-created_at")
            .first()
        )
        self.assertIsNotNone(otp_rec)
        correct_code = _crack_otp_hash(otp_rec.otp_hash)

        # Artificially expire the OTP record
        otp_rec.expires_at = timezone.now() - timedelta(minutes=15)
        otp_rec.save(update_fields=["expires_at"])

        # Call verify-and-register with the code
        res = self.client.post(
            "/api/v1/auth/verify-and-register/",
            {"phone_number": self.norm_phone, "otp_code": correct_code},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res.data.get("success"))
        self.assertIn("expired", res.data.get("message", "").lower())
        self.assertFalse(User.objects.filter(email=self.valid_customer_data["email"]).exists())

    # ──────────────────────────────────────────────────────────────────────────
    # Test 5: Signup with valid phone number + CORRECT OTP (Happy Path)
    # ──────────────────────────────────────────────────────────────────────────

    def test_5_signup_with_correct_otp_creates_account_and_returns_tokens(self):
        """Full lifecycle: pre-register -> enter correct OTP -> account created + tokens."""
        # Step 1: Pre-register
        pre_res = self.client.post("/api/v1/auth/pre-register/", self.valid_customer_data, format="json")
        self.assertEqual(pre_res.status_code, status.HTTP_200_OK)
        self.assertTrue(pre_res.data.get("data", {}).get("otp_required"))
        self.assertEqual(pre_res.data.get("data", {}).get("phone"), self.norm_phone)
        self.assertFalse(User.objects.filter(email=self.valid_customer_data["email"]).exists())

        # Step 2: Retrieve real OTP code generated by OTPService
        otp_rec = (
            OTPRecord.objects.filter(target=self.norm_phone, purpose=OtpPurpose.REGISTRATION)
            .order_by("-created_at")
            .first()
        )
        self.assertIsNotNone(otp_rec)
        correct_code = _crack_otp_hash(otp_rec.otp_hash)

        # Step 3: Verify and register with bare phone number format (must normalize internally)
        verify_res = self.client.post(
            "/api/v1/auth/verify-and-register/",
            {"phone_number": self.phone, "otp_code": correct_code},
            format="json",
        )
        self.assertEqual(verify_res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(verify_res.data.get("success"))

        # Verify access and refresh tokens are returned
        data = verify_res.data.get("data", {})
        self.assertIn("access", data)
        self.assertIn("refresh", data)
        self.assertTrue(len(data["access"]) > 20)
        self.assertTrue(len(data["refresh"]) > 20)

        # Verify returned user object
        user_data = data.get("user", {})
        self.assertEqual(user_data.get("email"), self.valid_customer_data["email"])
        self.assertEqual(user_data.get("role"), "customer")

        # Verify database state
        user = User.objects.get(email=self.valid_customer_data["email"])
        self.assertTrue(user.is_active)
        self.assertTrue(user.is_phone_verified)
        self.assertEqual(user.phone_number, self.norm_phone)
        self.assertEqual(user.role, UserRole.CUSTOMER)

        # Verify pending cache session was purged
        self.assertIsNone(cache.get(f"pending_reg_{self.norm_phone}"))

    def test_5b_cache_miss_with_payload_fallback_succeeds(self):
        """When in-memory cache is wiped (e.g. multi-worker Gunicorn), payload fallback allows registration."""
        phone = "+919840112233"
        code = "654321"
        OTPRecord.objects.create(
            target=phone,
            purpose=OtpPurpose.REGISTRATION,
            otp_hash=OTPService.hash_otp(code),
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        # Ensure cache has NO pending registration (simulating multi-worker miss)
        cache.delete(f"pending_reg_{phone}")

        res = self.client.post(
            "/api/v1/auth/verify-and-register/",
            {
                "phone_number": phone,
                "otp_code": code,
                "full_name": "Fallback User",
                "email": "fallback.user@example.com",
                "password": "Password123!",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data.get("success"))
        self.assertTrue(User.objects.filter(email="fallback.user@example.com").exists())
        user = User.objects.get(email="fallback.user@example.com")
        self.assertTrue(user.is_phone_verified)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 6: Direct API Bypass Attempts
    # ──────────────────────────────────────────────────────────────────────────

    def test_6a_direct_register_endpoint_without_otp_blocked(self):
        """Direct call to /api/v1/auth/register/ without otp_code is strictly blocked."""
        res = self.client.post("/api/v1/auth/register/", self.valid_customer_data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Phone verification is mandatory", res.data.get("message", ""))
        self.assertFalse(User.objects.filter(email=self.valid_customer_data["email"]).exists())

    def test_6b_direct_register_endpoint_with_fabricated_otp_blocked(self):
        """Direct call to /api/v1/auth/register/ with fabricated otp_code is blocked."""
        data = {**self.valid_customer_data, "otp_code": "987654"}
        res = self.client.post("/api/v1/auth/register/", data, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email=self.valid_customer_data["email"]).exists())

    def test_6c_direct_verify_and_register_without_pre_registration_session_blocked(self):
        """Direct call to /api/v1/auth/verify-and-register/ without pre-register cache is blocked."""
        # Create OTP record directly in DB as if generated, but without pending registration cache
        OTPRecord.objects.create(
            target=self.norm_phone,
            purpose=OtpPurpose.REGISTRATION,
            otp_hash=OTPService.hash_otp("112233"),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        res = self.client.post(
            "/api/v1/auth/verify-and-register/",
            {"phone_number": self.norm_phone, "otp_code": "112233"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("session expired", res.data.get("message", "").lower())
        self.assertFalse(User.objects.filter(email=self.valid_customer_data["email"]).exists())

    def test_6d_direct_verify_and_register_wrong_purpose_otp_blocked(self):
        """An OTP generated for password_reset cannot be used to verify registration."""
        # Put pending registration data in cache
        cache.set(f"pending_reg_{self.norm_phone}", {
            "email": self.valid_customer_data["email"],
            "full_name": self.valid_customer_data["full_name"],
            "password": self.valid_customer_data["password"],
            "phone_number": self.norm_phone,
        }, timeout=900)

        # Create OTP record for PASSWORD_RESET purpose
        code = "778899"
        OTPRecord.objects.create(
            target=self.norm_phone,
            purpose=OtpPurpose.PASSWORD_RESET,
            otp_hash=OTPService.hash_otp(code),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        res = self.client.post(
            "/api/v1/auth/verify-and-register/",
            {"phone_number": self.norm_phone, "otp_code": code},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email=self.valid_customer_data["email"]).exists())

    # ──────────────────────────────────────────────────────────────────────────
    # Non-Breaking Regressions
    # ──────────────────────────────────────────────────────────────────────────

    def test_regression_normal_login(self):
        """Normal customer login remains fully functional."""
        user = User.objects.create_user(
            email="existing@example.com",
            full_name="Existing User",
            password="StrongPassword123!",
            phone_number="+919876500001",
            role=UserRole.CUSTOMER,
        )
        res = self.client.post("/api/v1/auth/login/", {
            "email": "existing@example.com",
            "password": "StrongPassword123!",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get("success"))
        self.assertIn("access", res.data.get("data", {}))
        self.assertIn("refresh", res.data.get("data", {}))

    def test_regression_forgot_password(self):
        """Forgot password flow initiates properly without error."""
        User.objects.create_user(
            email="forgot@example.com",
            full_name="Forgot User",
            password="StrongPassword123!",
            phone_number="+919876500002",
            role=UserRole.CUSTOMER,
        )
        res = self.client.post("/api/v1/auth/forgot-password/", {
            "email": "forgot@example.com",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get("success"))

    def test_regression_reset_password_invalid_token(self):
        """Password reset with invalid token rejects gracefully (400, not 500)."""
        res = self.client.post("/api/v1/auth/reset-password/", {
            "token": "invalid-token-123456",
            "password": "NewPassword123!",
            "confirm_password": "NewPassword123!",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("apps.authentication.v2_views.GoogleAuthService.verify_google_token")
    def test_regression_google_signup_and_login(self, mock_verify):
        """Google signup creates user with auth_provider=google, and subsequent login works."""
        mock_verify.return_value = {
            "sub": "google-uid-888999",
            "email": "google.user@example.com",
            "name": "Google User",
            "picture": "https://example.com/avatar.jpg",
        }

        # Signup
        res_signup = self.client.post(
            "/api/v1/auth/v2/google/",
            {"id_token": "dummy-token", "mode": "signup"},
            format="json",
        )
        self.assertEqual(res_signup.status_code, status.HTTP_200_OK)
        self.assertTrue(res_signup.data.get("success"))
        created_user = User.objects.get(email="google.user@example.com")
        self.assertEqual(created_user.auth_provider, "google")

        # Subsequent Login
        res_login = self.client.post(
            "/api/v1/auth/v2/google/",
            {"id_token": "dummy-token", "mode": "login"},
            format="json",
        )
        self.assertEqual(res_login.status_code, status.HTTP_200_OK)
        self.assertTrue(res_login.data.get("success"))

    def test_regression_dealer_registration_endpoint(self):
        """Dealer registration endpoint remains responsive and enforces its serializer."""
        # Calling dealer registration without documents must return 400 validation error
        res = self.client.post("/api/v1/auth/dealer/register/", {
            "business_name": "Smile Dental Supplies",
            "contact_person": "Dr. Smile",
            "email": "dealer@smiledental.com",
            "phone_number": "9876500003",
            "gst_number": "29ABCDE1234F1Z5",
            "pan_number": "ABCDE1234F",
            "password": "DealerPassword123!",
            "confirm_password": "DealerPassword123!",
        }, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        # Dealer requires file uploads (gst_certificate, drug_license, etc.)
        self.assertFalse(res.data.get("success"))

    def test_regression_otp_resend(self):
        """OTP resend endpoint functions and enforces cooldown."""
        # First send OTP
        send_ok, _ = OTPService.send_otp(self.norm_phone, OtpPurpose.REGISTRATION)
        self.assertTrue(send_ok)

        # Attempt immediate resend via v2/otp/resend/ -> must fail cooldown (429 or 400)
        res = self.client.post("/api/v1/auth/v2/otp/resend/", {
            "target": self.norm_phone,
            "purpose": "registration",
        }, format="json")
        self.assertIn(res.status_code, [status.HTTP_429_TOO_MANY_REQUESTS, status.HTTP_400_BAD_REQUEST])
        self.assertFalse(res.data.get("success"))
