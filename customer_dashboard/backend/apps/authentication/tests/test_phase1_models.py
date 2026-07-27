from datetime import timedelta
import hashlib
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.authentication.models import OTPRecord, DeviceSession, AuditLog, OtpPurpose

User = get_user_model()


class Phase1AuthenticationModelsTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="testuser@faazo.com",
            password="SecurePassword123!",
            full_name="Dr. Test User",
            phone_number="+919876543210",
        )

    def test_user_security_fields(self):
        self.assertEqual(self.user.failed_login_attempts, 0)
        self.assertIsNone(self.user.locked_until)
        self.assertFalse(self.user.is_locked)

        # Simulate lock
        self.user.locked_until = timezone.now() + timedelta(minutes=15)
        self.assertTrue(self.user.is_locked)

        # Property getters
        self.assertEqual(self.user.phone, "+919876543210")
        self.assertFalse(self.user.email_verified)
        self.assertFalse(self.user.phone_verified)

    def test_otp_record_model(self):
        raw_otp = "123456"
        otp_hash = hashlib.sha256(raw_otp.encode("utf-8")).hexdigest()

        otp_record = OTPRecord.objects.create(
            user=self.user,
            target="+919876543210",
            purpose=OtpPurpose.REGISTRATION,
            otp_hash=otp_hash,
            expires_at=timezone.now() + timedelta(minutes=10),
            ip_address="127.0.0.1",
        )

        self.assertTrue(otp_record.is_valid)
        self.assertFalse(otp_record.is_expired)
        self.assertEqual(otp_record.attempts, 0)

    def test_device_session_model(self):
        session = DeviceSession.objects.create(
            user=self.user,
            session_key="jti_sample_token_12345",
            device_name="Chrome on Windows",
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0",
        )

        self.assertTrue(session.is_active)
        self.assertEqual(session.device_name, "Chrome on Windows")

    def test_audit_log_model(self):
        log = AuditLog.objects.create(
            user=self.user,
            action="LOGIN_SUCCESS",
            status="SUCCESS",
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0",
            details={"method": "password"},
        )

        self.assertEqual(log.action, "LOGIN_SUCCESS")
        self.assertEqual(log.status, "SUCCESS")
        self.assertEqual(log.user.email, "testuser@faazo.com")
