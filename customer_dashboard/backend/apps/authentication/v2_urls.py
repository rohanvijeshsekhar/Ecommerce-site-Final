"""
FAAZO – Enterprise Authentication API v2 URL Routing

All routes are prefixed with /api/v1/auth/v2/ (configured in config/urls.py).

Endpoints:
    POST   login/                  — Enterprise login with DeviceSession binding
    POST   logout/                 — Single-device logout
    POST   logout-all/             — Logout from all devices
    POST   refresh/                — Token rotation with reuse detection
    POST   otp/send/               — Send OTP via email or SMS
    POST   otp/verify/             — Verify OTP code
    POST   otp/resend/             — Resend OTP (60s cooldown enforced)
    GET    sessions/               — List all active sessions
    DELETE sessions/<id>/          — Revoke a specific session
    DELETE sessions/all/           — Revoke all active sessions
    GET    profile/                — Get current user profile
    PATCH  profile/                — Update user profile (full_name, phone_number)
"""

from django.urls import path

from apps.authentication.v2_views import (
    ForgotPasswordV2View,
    GoogleAuthV2View,
    LoginV2View,
    LogoutAllV2View,
    LogoutV2View,
    OTPResendView,
    OTPSendView,
    OTPVerifyView,
    ProfileV2View,
    ResetPasswordV2View,
    SessionListView,
    SessionRevokeAllView,
    SessionRevokeView,
    TokenRefreshV2View,
)

app_name = "authentication_v2"

urlpatterns = [
    # ── Authentication ───────────────────────────────────────────
    path("login/", LoginV2View.as_view(), name="v2-login"),
    path("google/", GoogleAuthV2View.as_view(), name="v2-google"),
    path("logout/", LogoutV2View.as_view(), name="v2-logout"),
    path("logout-all/", LogoutAllV2View.as_view(), name="v2-logout-all"),
    path("refresh/", TokenRefreshV2View.as_view(), name="v2-token-refresh"),

    # ── Password Reset ───────────────────────────────────────────
    path("password/forgot/", ForgotPasswordV2View.as_view(), name="v2-password-forgot"),
    path("password/reset/", ResetPasswordV2View.as_view(), name="v2-password-reset"),
    path("forgot-password/", ForgotPasswordV2View.as_view(), name="v2-forgot-password-alias"),
    path("reset-password/", ResetPasswordV2View.as_view(), name="v2-reset-password-alias"),

    # ── OTP ─────────────────────────────────────────────────────
    path("otp/send/", OTPSendView.as_view(), name="v2-otp-send"),
    path("otp/verify/", OTPVerifyView.as_view(), name="v2-otp-verify"),
    path("otp/resend/", OTPResendView.as_view(), name="v2-otp-resend"),

    # ── Sessions ─────────────────────────────────────────────────
    # Note: sessions/all/ must come BEFORE sessions/<id>/ to prevent
    # Django from trying to parse "all" as an integer ID.
    path("sessions/all/", SessionRevokeAllView.as_view(), name="v2-sessions-revoke-all"),
    path("sessions/", SessionListView.as_view(), name="v2-sessions-list"),
    path("sessions/<uuid:session_id>/", SessionRevokeView.as_view(), name="v2-session-revoke"),

    # ── Profile ──────────────────────────────────────────────────
    path("profile/", ProfileV2View.as_view(), name="v2-profile"),
]
