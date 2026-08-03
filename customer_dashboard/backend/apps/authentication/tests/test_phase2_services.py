from datetime import timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase, RequestFactory, override_settings
from django.utils import timezone

from apps.authentication.models import AuditLog, DeviceSession
from apps.authentication.services import AuditService, LockoutService, SessionService
from apps.authentication.backends import EmailAuthBackend

User = get_user_model()


@override_settings(LOGIN_FAIL_MAX_ATTEMPTS=5, LOGIN_FAIL_LOCKOUT_MINUTES=15)
class Phase2AuthenticationServicesTestCase(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            email="service_test@faazo.com",
            password="StrongPassword123!",
            full_name="Service Test User",
            phone_number="+919123456789",
        )
        self.backend = EmailAuthBackend()

    def test_audit_service_logging(self):
        log_entry = AuditService.log_event(
            action="TEST_ACTION",
            user=self.user,
            status="SUCCESS",
            ip_address="192.168.1.1",
            details={"key": "value"},
        )
        self.assertIsNotNone(log_entry)
        self.assertEqual(AuditLog.objects.count(), 1)
        self.assertEqual(log_entry.action, "TEST_ACTION")

    def test_lockout_service_counter_and_reset(self):
        # Register 4 failed attempts
        for _ in range(4):
            LockoutService.register_failed_attempt(self.user)

        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 4)
        self.assertFalse(self.user.is_locked)

        # 5th attempt triggers lockout
        LockoutService.register_failed_attempt(self.user)
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 5)
        self.assertTrue(self.user.is_locked)

        # Successful reset
        LockoutService.reset_attempts(self.user)
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 0)
        self.assertFalse(self.user.is_locked)

    def test_session_service_lifecycle(self):
        session = SessionService.create_session(
            user=self.user,
            session_key="jti_session_1",
            device_name="Chrome on Windows",
            ip_address="127.0.0.1",
        )
        self.assertTrue(session.is_active)
        self.assertEqual(DeviceSession.objects.filter(user=self.user, is_active=True).count(), 1)

        # Create second session
        SessionService.create_session(
            user=self.user,
            session_key="jti_session_2",
            device_name="Safari on iPhone",
            ip_address="127.0.0.1",
        )
        self.assertEqual(DeviceSession.objects.filter(user=self.user, is_active=True).count(), 2)

        # Revoke all except second session
        SessionService.revoke_all_sessions(self.user, exclude_session_key="jti_session_2")
        active_sessions = SessionService.get_active_sessions(self.user)
        self.assertEqual(active_sessions.count(), 1)
        self.assertEqual(active_sessions.first().session_key, "jti_session_2")

    def test_email_auth_backend(self):
        request = self.factory.post("/api/v1/auth/login/")
        
        # Wrong password
        auth_user = self.backend.authenticate(request, email="service_test@faazo.com", password="WrongPassword")
        self.assertIsNone(auth_user)

        # Correct password
        auth_user = self.backend.authenticate(request, email="service_test@faazo.com", password="StrongPassword123!")
        self.assertIsNotNone(auth_user)
        self.assertEqual(auth_user.email, "service_test@faazo.com")
