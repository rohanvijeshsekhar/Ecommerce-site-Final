"""
FAAZO – Authentication URL Routing

All routes prefixed with /api/v1/auth/ (configured in config/urls.py).

Endpoints:
    POST   register/                — Customer registration
    POST   dealer/register/         — Dealer registration (multipart)
    POST   login/                   — Login → JWT token pair
    POST   logout/                  — Blacklist refresh token
    POST   token/refresh/           — Rotate refresh token
    GET    me/                      — Current authenticated user
    GET    verify-email/            — Verify email via token
    POST   resend-verification/     — Resend verification email
    POST   forgot-password/         — Request password reset email
    POST   reset-password/          — Set new password via token
    POST   change-password/         — Change password (authenticated)
"""

from django.urls import path

from apps.authentication.views import (
    ChangePasswordView,
    DealerRegisterView,
    ForgotPasswordView,
    LoginView,
    LogoutView,
    MeView,
    PreRegisterView,
    RegisterView,
    ResendVerificationView,
    ResetPasswordView,
    TokenRefreshView,
    VerifyAndRegisterView,
    VerifyEmailView,
)

app_name = "authentication"

urlpatterns = [
    # ── Registration ────────────────────────────────────────────
    path("register/", RegisterView.as_view(), name="register"),
    path("pre-register/", PreRegisterView.as_view(), name="pre-register"),
    path("verify-and-register/", VerifyAndRegisterView.as_view(), name="verify-and-register"),
    path("dealer/register/", DealerRegisterView.as_view(), name="dealer-register"),

    # ── Login / Logout ──────────────────────────────────────────
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),

    # ── Token Refresh ───────────────────────────────────────────
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),

    # ── Current User ────────────────────────────────────────────
    path("me/", MeView.as_view(), name="me"),

    # ── Email Verification ───────────────────────────────────────
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification/", ResendVerificationView.as_view(), name="resend-verification"),

    # ── Password Reset ───────────────────────────────────────────
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
]
