from datetime import timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase, RequestFactory, override_settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from apps.authentication.models import AuditLog, DeviceSession
from apps.authentication.services import JWTService, SessionService
from apps.authentication.backends import FAAZOJWTAuthentication

User = get_user_model()


@override_settings(MAX_ACTIVE_SESSIONS=3)
class Phase4JWTManagementTestCase(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            email="jwt_test@faazo.com",
            password="StrongPassword123!",
            full_name="JWT Test User",
            phone_number="+919876540000",
        )
        self.auth_backend = FAAZOJWTAuthentication()

    def test_issue_token_pair_and_session_binding(self):
        tokens = JWTService.issue_token_pair_for_user(
            self.user,
            device_name="Chrome on Windows",
            ip_address="192.168.1.10",
            user_agent="Mozilla/5.0",
        )
        self.assertIn("access", tokens)
        self.assertIn("refresh", tokens)
        self.assertIn("session_key", tokens)

        session = DeviceSession.objects.filter(session_key=tokens["session_key"]).first()
        self.assertIsNotNone(session)
        self.assertTrue(session.is_active)
        self.assertEqual(session.device_name, "Chrome on Windows")

    def test_max_active_sessions_pruning(self):
        for i in range(4):
            JWTService.issue_token_pair_for_user(self.user, device_name=f"Device {i}")

        # Max active sessions is set to 3, so total active sessions should be 3
        active_count = DeviceSession.objects.filter(user=self.user, is_active=True).count()
        self.assertEqual(active_count, 3)

    def test_rotate_and_refresh_token_success(self):
        tokens1 = JWTService.issue_token_pair_for_user(self.user)
        refresh1 = tokens1["refresh"]

        success, new_tokens, msg = JWTService.rotate_and_refresh_token(refresh1)
        self.assertTrue(success)
        self.assertIn("access", new_tokens)
        self.assertIn("refresh", new_tokens)

    def test_token_reuse_detection_triggers_logout_all(self):
        tokens1 = JWTService.issue_token_pair_for_user(self.user, device_name="Device 1")
        refresh1 = tokens1["refresh"]

        # First refresh (legitimate)
        success, new_tokens, _ = JWTService.rotate_and_refresh_token(refresh1)
        self.assertTrue(success)

        # REUSE ATTEMPT: Using old refresh1 again!
        success_reuse, _, msg_reuse = JWTService.rotate_and_refresh_token(refresh1)
        self.assertFalse(success_reuse)
        self.assertIn("Security violation", msg_reuse)

        # Verify all sessions are revoked
        active_sessions = DeviceSession.objects.filter(user=self.user, is_active=True).count()
        self.assertEqual(active_sessions, 0)

        # Verify audit log recorded TOKEN_REUSE_DETECTED
        audit_exists = AuditLog.objects.filter(user=self.user, action="TOKEN_REUSE_DETECTED").exists()
        self.assertTrue(audit_exists)

    def test_logout_session(self):
        tokens = JWTService.issue_token_pair_for_user(self.user)
        refresh = tokens["refresh"]

        success, msg = JWTService.logout_session(refresh, user=self.user)
        self.assertTrue(success)

        session = DeviceSession.objects.filter(session_key=tokens["session_key"]).first()
        self.assertFalse(session.is_active)

    def test_logout_all_devices(self):
        JWTService.issue_token_pair_for_user(self.user, device_name="Dev 1")
        JWTService.issue_token_pair_for_user(self.user, device_name="Dev 2")

        success, msg = JWTService.logout_all_devices(self.user)
        self.assertTrue(success)

        active_count = DeviceSession.objects.filter(user=self.user, is_active=True).count()
        self.assertEqual(active_count, 0)

    def test_faazo_jwt_authentication_backend(self):
        tokens = JWTService.issue_token_pair_for_user(self.user)
        access_token_str = tokens["access"]
        validated_token = AccessToken(access_token_str)

        auth_user = self.auth_backend.get_user(validated_token)
        self.assertEqual(auth_user, self.user)

        # Revoke session
        SessionService.revoke_all_sessions(self.user)

        # Re-authenticate with revoked session token should fail or check session
        # Access token has jti matching refresh jti or user check
        session_key = tokens["session_key"]
        session = DeviceSession.objects.get(session_key=session_key)
        self.assertFalse(session.is_active)
