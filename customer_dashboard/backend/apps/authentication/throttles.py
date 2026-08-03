"""
FAAZO - Phase 8 Authentication Rate Limit Throttle Classes (H2)

Per-endpoint scoped throttles. Each class maps to a scope key defined in
REST_FRAMEWORK.DEFAULT_THROTTLE_RATES in base.py.
"""

from django.conf import settings
from rest_framework.throttling import AnonRateThrottle


class BaseAuthThrottle(AnonRateThrottle):
    def allow_request(self, request, view):
        # Bypass rate limiting entirely during tests to prevent 429 failures.
        if getattr(settings, "TESTING", False):
            return True
        return super().allow_request(request, view)


class LoginRateThrottle(BaseAuthThrottle):
    """10 login attempts per minute per IP."""
    scope = "auth_login"


class RegisterRateThrottle(BaseAuthThrottle):
    """5 registrations per hour per IP."""
    scope = "auth_register"


class OTPSendRateThrottle(BaseAuthThrottle):
    """3 OTP send requests per minute per IP."""
    scope = "auth_otp_send"


class OTPVerifyRateThrottle(BaseAuthThrottle):
    """10 OTP verify attempts per minute per IP."""
    scope = "auth_otp_verify"


class TokenRefreshRateThrottle(BaseAuthThrottle):
    """60 token refresh requests per minute per IP."""
    scope = "auth_token_refresh"


class ForgotPasswordRateThrottle(BaseAuthThrottle):
    """5 forgot-password requests per hour per IP."""
    scope = "auth_forgot_password"
    rate = "5/hour"


class ResetPasswordRateThrottle(BaseAuthThrottle):
    """10 password reset attempts per hour per IP."""
    scope = "auth_reset_password"
    rate = "10/hour"
