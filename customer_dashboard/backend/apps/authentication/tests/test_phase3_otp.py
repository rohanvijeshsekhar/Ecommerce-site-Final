from datetime import timedelta
import time
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.authentication.models import OTPRecord, OtpPurpose
from apps.authentication.providers import MockSMSProvider, SangamamSMSProvider, get_sms_provider
from apps.authentication.services import OTPService

User = get_user_model()


@override_settings(
    SMS_PROVIDER="mock",
    OTP_RESEND_COOLDOWN_SECONDS=60,
    OTP_MAX_PER_HOUR=5,
    OTP_EXPIRATION_MINUTES=10,
    OTP_MAX_ATTEMPTS=3,
)
class Phase3OTPInfrastructureTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="otp_test@faazo.com",
            password="StrongPassword123!",
            full_name="OTP Test User",
            phone_number="+919876543210",
        )

    def test_provider_factory(self):
        provider = get_sms_provider()
        self.assertIsInstance(provider, MockSMSProvider)

        with override_settings(SMS_PROVIDER="sangamam", SANGAMAM_API_KEY="test_key"):
            sangamam_provider = get_sms_provider()
            self.assertIsInstance(sangamam_provider, SangamamSMSProvider)

    def test_otp_generation_and_hashing(self):
        otp = OTPService.generate_otp()
        self.assertEqual(len(otp), 6)
        self.assertTrue(otp.isdigit())

        otp_hash = OTPService.hash_otp(otp)
        self.assertEqual(len(otp_hash), 64)

    def test_send_and_verify_otp_flow(self):
        success, msg = OTPService.send_otp(target="+919876543210", purpose=OtpPurpose.REGISTRATION)
        self.assertTrue(success)

        otp_record = OTPRecord.objects.filter(target="+919876543210").first()
        self.assertIsNotNone(otp_record)
        self.assertFalse(otp_record.is_used)

        # Retrieve raw OTP code generated in mock logger or compute matching hash in test
        # We simulate raw OTP verify using a mock code or directly verifying hash
        raw_code = "123456"
        otp_record.otp_hash = OTPService.hash_otp(raw_code)
        otp_record.save()

        # Invalid code attempt 1
        valid, err_msg = OTPService.verify_otp(
            target="+919876543210", purpose=OtpPurpose.REGISTRATION, raw_otp="000000"
        )
        self.assertFalse(valid)
        self.assertIn("2 attempt(s) remaining", err_msg)

        # Valid code attempt 2
        valid, success_msg = OTPService.verify_otp(
            target="+919876543210", purpose=OtpPurpose.REGISTRATION, raw_otp=raw_code
        )
        self.assertTrue(valid)

        # Check phone verified on user
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_phone_verified)

    def test_cooldown_enforcement(self):
        # First send succeeds
        success1, _ = OTPService.send_otp(target="+919876543211", purpose=OtpPurpose.REGISTRATION)
        self.assertTrue(success1)

        # Immediate resend fails due to cooldown
        success2, msg2 = OTPService.send_otp(target="+919876543211", purpose=OtpPurpose.REGISTRATION)
        self.assertFalse(success2)
        self.assertIn("Please wait", msg2)

    def test_max_attempts_exceeded(self):
        OTPService.send_otp(target="+919876543212", purpose=OtpPurpose.REGISTRATION)
        otp_record = OTPRecord.objects.get(target="+919876543212")

        # 3 wrong attempts
        for _ in range(3):
            OTPService.verify_otp(target="+919876543212", purpose=OtpPurpose.REGISTRATION, raw_otp="999999")

        # 4th attempt should return max attempts exceeded
        valid, msg = OTPService.verify_otp(target="+919876543212", purpose=OtpPurpose.REGISTRATION, raw_otp="999999")
        self.assertFalse(valid)
        self.assertIn("Maximum OTP attempts exceeded", msg)
