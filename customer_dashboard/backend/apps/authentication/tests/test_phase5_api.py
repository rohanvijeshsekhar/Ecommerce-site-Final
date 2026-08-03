"""
Phase 5 Tests — Enterprise Authentication API v2
Covers: Login, Logout, LogoutAll, Refresh, OTP endpoints, Sessions, Profile.
"""

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse

from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from apps.authentication.models import DeviceSession, OTPRecord, OtpPurpose
from apps.authentication.services import JWTService, OTPService

User = get_user_model()


@override_settings(
    TESTING=True,
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": (
            "apps.authentication.backends.FAAZOJWTAuthentication",
        ),
        "DEFAULT_THROTTLE_CLASSES": [],
        "DEFAULT_THROTTLE_RATES": {},
    }
)
class Phase5AuthAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="v2test@faazo.com",
            password="StrongPassword123!",
            full_name="V2 Test User",
            phone_number="+919876501234",
        )

    # ── Helpers ────────────────────────────────────────────────

    def _login(self):
        """Helper: perform v2 login and return response data."""
        url = reverse("authentication_v2:v2-login")
        resp = self.client.post(url, {
            "email": "v2test@faazo.com",
            "password": "StrongPassword123!",
        }, format="json")
        return resp

    def _authenticate(self):
        """Helper: log in and attach JWT access token to client."""
        resp = self._login()
        access = resp.data["data"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        refresh = self.client.cookies.get("faazo_refresh").value if "faazo_refresh" in self.client.cookies else None
        return {
            "access": access,
            "refresh": refresh,
            "session_key": resp.data["data"]["session_key"],
        }

    # ── Login ──────────────────────────────────────────────────

    def test_v2_login_success(self):
        resp = self._login()
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["success"])
        self.assertIn("access", resp.data["data"])
        self.assertIn("faazo_refresh", self.client.cookies)
        self.assertIn("session_key", resp.data["data"])

    def test_v2_login_creates_device_session(self):
        resp = self._login()
        session_key = resp.data["data"]["session_key"]
        session = DeviceSession.objects.filter(session_key=session_key).first()
        self.assertIsNotNone(session)
        self.assertTrue(session.is_active)

    def test_v2_login_invalid_credentials(self):
        url = reverse("authentication_v2:v2-login")
        resp = self.client.post(url, {
            "email": "v2test@faazo.com",
            "password": "WrongPassword!",
        }, format="json")
        self.assertEqual(resp.status_code, 401)
        self.assertFalse(resp.data["success"])

    def test_v2_login_nonexistent_user(self):
        url = reverse("authentication_v2:v2-login")
        resp = self.client.post(url, {
            "email": "nobody@faazo.com",
            "password": "SomePassword123!",
        }, format="json")
        self.assertEqual(resp.status_code, 401)

    # ── Logout ─────────────────────────────────────────────────

    def test_v2_logout_success(self):
        tokens = self._authenticate()
        url = reverse("authentication_v2:v2-logout")
        # Cookie is already in self.client.cookies, no JSON payload needed.
        resp = self.client.post(url, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["success"])

        # Check that the cookie is deleted/expired
        cookie = self.client.cookies.get("faazo_refresh")
        self.assertTrue(cookie is None or cookie.value == "" or cookie["max-age"] == 0)

        session = DeviceSession.objects.filter(session_key=tokens["session_key"]).first()
        self.assertFalse(session.is_active)

    def test_v2_logout_unauthenticated(self):
        url = reverse("authentication_v2:v2-logout")
        # Ensure no cookie
        self.client.cookies.clear()
        resp = self.client.post(url, format="json")
        self.assertEqual(resp.status_code, 401)

    # ── Logout All ─────────────────────────────────────────────

    def test_v2_logout_all_success(self):
        tokens = self._authenticate()
        url = reverse("authentication_v2:v2-logout-all")
        resp = self.client.post(url, format="json")
        self.assertEqual(resp.status_code, 200)

        # Check cookie cleared
        cookie = self.client.cookies.get("faazo_refresh")
        self.assertTrue(cookie is None or cookie.value == "" or cookie["max-age"] == 0)

        active_sessions = DeviceSession.objects.filter(user=self.user, is_active=True).count()
        self.assertEqual(active_sessions, 0)

    # ── Token Refresh ──────────────────────────────────────────

    def test_v2_refresh_success(self):
        tokens = self._authenticate()
        url = reverse("authentication_v2:v2-token-refresh")
        # Cookie is sent automatically
        resp = self.client.post(url, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("access", resp.data["data"])
        self.assertIn("faazo_refresh", self.client.cookies)

    def test_v2_refresh_reuse_detection(self):
        tokens = self._authenticate()
        url = reverse("authentication_v2:v2-token-refresh")

        cookie1 = self.client.cookies.get("faazo_refresh").value

        # First rotation — succeeds
        resp1 = self.client.post(url, format="json")
        self.assertEqual(resp1.status_code, 200)

        # REUSE: set old rotated cookie back in self.client.cookies
        self.client.cookies["faazo_refresh"] = cookie1

        resp2 = self.client.post(url, format="json")
        self.assertEqual(resp2.status_code, 403)
        self.assertIn("Security violation", resp2.data["message"])

        # All sessions should now be revoked
        active_count = DeviceSession.objects.filter(user=self.user, is_active=True).count()
        self.assertEqual(active_count, 0)

    # ── OTP Send ───────────────────────────────────────────────

    @override_settings(SMS_PROVIDER="mock", OTP_RESEND_COOLDOWN_SECONDS=60)
    def test_otp_send_success(self):
        url = reverse("authentication_v2:v2-otp-send")
        resp = self.client.post(url, {
            "target": "+919876501111",
            "purpose": "registration",
        }, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["success"])

        record = OTPRecord.objects.filter(target="+919876501111").first()
        self.assertIsNotNone(record)
        self.assertFalse(record.is_used)

    @override_settings(SMS_PROVIDER="mock", OTP_RESEND_COOLDOWN_SECONDS=60)
    def test_otp_send_cooldown_enforced(self):
        url = reverse("authentication_v2:v2-otp-send")
        self.client.post(url, {"target": "+919876501112", "purpose": "registration"}, format="json")

        # Immediate resend should be blocked
        resp2 = self.client.post(url, {"target": "+919876501112", "purpose": "registration"}, format="json")
        self.assertEqual(resp2.status_code, 429)

    # ── OTP Verify ─────────────────────────────────────────────

    @override_settings(SMS_PROVIDER="mock", OTP_RESEND_COOLDOWN_SECONDS=60, OTP_MAX_ATTEMPTS=3)
    def test_otp_verify_success(self):
        send_url = reverse("authentication_v2:v2-otp-send")
        verify_url = reverse("authentication_v2:v2-otp-verify")

        self.client.post(send_url, {"target": "+919876501113", "purpose": "registration"}, format="json")

        # Override OTP hash to a known code for testing
        record = OTPRecord.objects.filter(target="+919876501113").first()
        from apps.authentication.services.otp_service import OTPService as OTP
        record.otp_hash = OTP.hash_otp("123456")
        record.save()

        resp = self.client.post(verify_url, {
            "target": "+919876501113",
            "purpose": "registration",
            "code": "123456",
        }, format="json")
        self.assertEqual(resp.status_code, 200)

    # ── OTP Resend ─────────────────────────────────────────────

    @override_settings(SMS_PROVIDER="mock", OTP_RESEND_COOLDOWN_SECONDS=60)
    def test_otp_resend_after_cooldown(self):
        from datetime import timedelta
        from django.utils import timezone

        send_url = reverse("authentication_v2:v2-otp-send")
        resend_url = reverse("authentication_v2:v2-otp-resend")

        self.client.post(send_url, {"target": "+919876501114", "purpose": "registration"}, format="json")

        # Backdate the OTP record by 120 seconds to simulate cooldown expiry
        OTPRecord.objects.filter(target="+919876501114").update(
            created_at=timezone.now() - timedelta(seconds=120)
        )

        resp = self.client.post(resend_url, {"target": "+919876501114", "purpose": "registration"}, format="json")
        self.assertEqual(resp.status_code, 200)

    # ── Sessions ───────────────────────────────────────────────

    def test_sessions_list(self):
        self._authenticate()
        url = reverse("authentication_v2:v2-sessions-list")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.data["data"], list)
        self.assertGreater(len(resp.data["data"]), 0)

    def test_sessions_revoke_by_id(self):
        tokens = self._authenticate()
        session = DeviceSession.objects.get(session_key=tokens["session_key"])

        url = reverse("authentication_v2:v2-session-revoke", kwargs={"session_id": session.id})
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, 200)

        session.refresh_from_db()
        self.assertFalse(session.is_active)

    def test_sessions_revoke_all(self):
        tokens = self._authenticate()
        url = reverse("authentication_v2:v2-sessions-revoke-all")
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, 200)
        active = DeviceSession.objects.filter(user=self.user, is_active=True).count()
        self.assertEqual(active, 0)

    # ── Profile ────────────────────────────────────────────────

    def test_profile_get(self):
        self._authenticate()
        url = reverse("authentication_v2:v2-profile")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["data"]["email"], "v2test@faazo.com")

    def test_profile_patch(self):
        self._authenticate()
        url = reverse("authentication_v2:v2-profile")
        resp = self.client.patch(url, {"full_name": "Updated V2 User"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.full_name, "Updated V2 User")
