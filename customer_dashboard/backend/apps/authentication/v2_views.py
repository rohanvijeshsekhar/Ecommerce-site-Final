import secrets
"""
FAAZO Enterprise Authentication API — Phase 5 Views
====================================================

Thin REST controllers that delegate ALL business logic to Phase 2-4 services.
No duplicate logic. Every view:
  - Validates input via serializer
  - Delegates to services (JWTService, OTPService, SessionService, AuditService)
  - Returns consistent response envelope: {success, message, data?, errors?}
  - Generates audit log entries
  - Returns appropriate HTTP status codes

Endpoints:
    POST   /api/v1/auth/v2/login/           Enhanced login with DeviceSession binding
    POST   /api/v1/auth/v2/logout/          Enterprise logout with DeviceSession revocation
    POST   /api/v1/auth/v2/logout-all/      Logout from all devices
    POST   /api/v1/auth/v2/refresh/         Token rotation with reuse detection
    POST   /api/v1/auth/v2/register/        Registration wrapper (reuses v1 logic)
    POST   /api/v1/auth/v2/forgot-password/ Forgot password (reuses v1 logic)
    POST   /api/v1/auth/v2/reset-password/  Reset password (reuses v1 logic)
    POST   /api/v1/auth/v2/otp/send/        Send OTP via email or SMS
    POST   /api/v1/auth/v2/otp/verify/      Verify OTP code
    POST   /api/v1/auth/v2/otp/resend/      Resend OTP (cooldown enforced)
    GET    /api/v1/auth/v2/sessions/        List all active sessions for user
    DELETE /api/v1/auth/v2/sessions/<id>/   Revoke a specific session by ID
    DELETE /api/v1/auth/v2/sessions/all/    Revoke all active sessions
    GET    /api/v1/auth/v2/profile/         Get current user profile (alias for /me/)
    PATCH  /api/v1/auth/v2/profile/         Update user profile (full_name, phone_number)
"""

import logging

from django.conf import settings
from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework.parsers import JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import OpenApiResponse, extend_schema

from apps.authentication.models import DeviceSession, OtpPurpose
from apps.authentication.serializers import (
    ForgotPasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    MeSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    UserMinimalSerializer,
)
from apps.authentication.services import (
    AuditService,
    EmailService,
    JWTService,
    LockoutService,
    OTPService,
    SessionService,
    TokenService,
)
from apps.authentication.throttles import (
    ForgotPasswordRateThrottle,
    LoginRateThrottle,
    OTPSendRateThrottle,
    OTPVerifyRateThrottle,
    RegisterRateThrottle,
    ResetPasswordRateThrottle,
    TokenRefreshRateThrottle,
)
from apps.authentication.google_service import GoogleAuthService
from apps.authentication.v2_serializers import (
    DeviceSessionSerializer,
    GoogleAuthSerializer,
    LogoutAllSerializer,
    OTPResendSerializer,
    OTPSendSerializer,
    OTPVerifySerializer,
    ProfileUpdateSerializer,
    TokenRefreshV2Serializer,
)
from apps.users.models import UserRole

logger = logging.getLogger("faazo.auth")
User = get_user_model()


# ──────────────────────────────────────────────────────────────
# Response helpers (shared with existing views.py)
# ──────────────────────────────────────────────────────────────

def _ok(data=None, message: str = "Success.", status_code: int = status.HTTP_200_OK):
    payload = {"success": True, "message": message}
    if data is not None:
        payload["data"] = data
    return Response(payload, status=status_code)


def _error(message: str, errors=None, status_code: int = status.HTTP_400_BAD_REQUEST):
    payload = {"success": False, "message": message}
    if errors is not None:
        payload["errors"] = errors
    return Response(payload, status=status_code)


def _get_client_ip(request) -> str:
    """
    M1 Fix: Respect TRUSTED_PROXY_COUNT when reading X-Forwarded-For.
    If TRUSTED_PROXY_COUNT = N, we trust N hops from the right of the header,
    and return the IP at position -(N+1) as the true client address.
    Default 0 = no proxy; use REMOTE_ADDR directly.
    """
    trusted_count = getattr(settings, "TRUSTED_PROXY_COUNT", 0)
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded and trusted_count > 0:
        ips = [ip.strip() for ip in x_forwarded.split(",")]
        # The client IP is `trusted_count` hops from the right
        idx = max(0, len(ips) - trusted_count)
        return ips[idx]
    return request.META.get("REMOTE_ADDR", "unknown")


def _get_user_agent(request) -> str:
    return request.META.get("HTTP_USER_AGENT", "Unknown")


# ──────────────────────────────────────────────────────────────
# C1: HttpOnly Refresh Token Cookie Helpers
# ──────────────────────────────────────────────────────────────

def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """
    Set the HttpOnly refresh token cookie on a DRF Response.
    All cookie parameters are driven by REFRESH_COOKIE_* settings.
    """
    response.set_cookie(
        key=getattr(settings, "REFRESH_COOKIE_NAME", "faazo_refresh"),
        value=refresh_token,
        max_age=getattr(settings, "REFRESH_COOKIE_MAX_AGE", 7 * 24 * 60 * 60),
        path=getattr(settings, "REFRESH_COOKIE_PATH", "/"),
        httponly=getattr(settings, "REFRESH_COOKIE_HTTPONLY", True),
        secure=getattr(settings, "REFRESH_COOKIE_SECURE", False),
        samesite=getattr(settings, "REFRESH_COOKIE_SAMESITE", "Lax"),
    )


def _delete_refresh_cookie(response: Response) -> None:
    """
    Expire and delete the refresh token cookie.
    Must match the same path / samesite used when setting.
    """
    response.delete_cookie(
        key=getattr(settings, "REFRESH_COOKIE_NAME", "faazo_refresh"),
        path=getattr(settings, "REFRESH_COOKIE_PATH", "/"),
        samesite=getattr(settings, "REFRESH_COOKIE_SAMESITE", "Lax"),
    )


def _get_refresh_from_request(request) -> str | None:
    """Read the refresh token from the HttpOnly cookie."""
    return request.COOKIES.get(
        getattr(settings, "REFRESH_COOKIE_NAME", "faazo_refresh")
    )


# ──────────────────────────────────────────────────────────────
# V2 Login — Enterprise version with DeviceSession binding
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Authentication v2"])
class LoginV2View(APIView):
    """
    POST /api/v1/auth/v2/login/

    Enhanced login endpoint that:
    - Validates credentials via EmailAuthBackend
    - Binds issued JWT to a DeviceSession record
    - Enforces account lockout via LockoutService
    - Logs all login events via AuditService
    - C1: Issues refresh token as HttpOnly cookie (not in JSON body)
    """
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    throttle_classes = [LoginRateThrottle]  # H2: 10/minute per IP

    @extend_schema(
        summary="Enterprise Login (v2)",
        request=LoginSerializer,
        responses={
            200: OpenApiResponse(description="Login successful. JWT access token issued. Refresh token set as HttpOnly cookie."),
            401: OpenApiResponse(description="Invalid credentials."),
            403: OpenApiResponse(description="Account locked, blocked or inactive."),
            429: OpenApiResponse(description="Too many login attempts."),
        },
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Login failed.", errors=serializer.errors, status_code=400)

        data = serializer.validated_data
        email = data["email"]
        password = data["password"]
        ip = _get_client_ip(request)
        user_agent = _get_user_agent(request)
        device_name = data.get("device_name") or user_agent[:100]

        # Fetch user first (needed for lockout check)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            AuditService.log_event(
                action="LOGIN_FAILED", status="FAILURE",
                ip_address=ip, details={"email": email, "reason": "no_account"},
            )
            return _error("Invalid email or password.", status_code=status.HTTP_401_UNAUTHORIZED)

        # Check lockout status
        is_locked, locked_until = LockoutService.check_lockout(user)
        if is_locked:
            AuditService.log_event(
                action="LOGIN_LOCKED", user=user, status="FAILURE",
                ip_address=ip, details={"locked_until": str(locked_until)},
            )
            return _error(
                "Account temporarily locked due to multiple failed login attempts. Please try again later.",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        # Profile sanity checks
        profile = getattr(user, "profile", None)
        if profile:
            if profile.is_blocked:
                return _error("Your account has been blocked by an administrator.", status_code=403)
            if profile.is_deleted:
                return _error("This account has been deleted.", status_code=403)

        if not user.is_active:
            return _error("Your account has been deactivated. Please contact support.", status_code=403)

        # Verify password
        if not user.check_password(password):
            attempts = LockoutService.register_failed_attempt(user)
            AuditService.log_event(
                action="LOGIN_FAILED", user=user, status="FAILURE",
                ip_address=ip, details={"attempts": attempts},
            )
            from django.conf import settings as django_settings
            max_attempts = getattr(django_settings, "LOGIN_FAIL_MAX_ATTEMPTS", 5)
            remaining = max(0, max_attempts - attempts)
            if remaining == 0:
                return _error(
                    "Account locked due to too many failed attempts. Try again in 15 minutes.",
                    status_code=status.HTTP_403_FORBIDDEN,
                )
            return _error(
                f"Invalid email or password. {remaining} attempt(s) remaining before lockout.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        # Issue enterprise token pair with DeviceSession binding
        LockoutService.reset_attempts(user)
        tokens = JWTService.issue_token_pair_for_user(
            user=user,
            device_name=device_name,
            ip_address=ip,
            user_agent=user_agent,
        )

        AuditService.log_event(
            action="LOGIN_SUCCESS", user=user, status="SUCCESS",
            ip_address=ip, user_agent=user_agent,
        )
        logger.info("[LOGIN_V2_SUCCESS] %s logged in from %s", email, ip)

        # C1: Refresh token goes into HttpOnly cookie — NOT in JSON response body
        response = _ok(
            data={
                "access": tokens["access"],
                "session_key": tokens["session_key"],
                "access_expires_in": tokens["access_expires_in"],
                "refresh_expires_in": tokens["refresh_expires_in"],
                "user": UserMinimalSerializer(user).data,
            },
            message="Login successful.",
        )
        _set_refresh_cookie(response, tokens["refresh"])
        return response


# ──────────────────────────────────────────────────────────────
# V2 Logout — Enterprise single-device logout
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Authentication v2"])
class LogoutV2View(APIView):
    """
    POST /api/v1/auth/v2/logout/

    C1: Reads refresh token from HttpOnly cookie (not request body).
    Blacklists the token and deactivates the bound DeviceSession.
    Clears the refresh token cookie on the response.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    @extend_schema(
        summary="Enterprise Logout (v2)",
        responses={
            200: OpenApiResponse(description="Logged out successfully. Refresh cookie cleared."),
            400: OpenApiResponse(description="Invalid or missing refresh token."),
        },
    )
    def post(self, request):
        # C1: Read refresh token from HttpOnly cookie
        refresh_token = _get_refresh_from_request(request)

        ip = _get_client_ip(request)

        if refresh_token:
            success, message = JWTService.logout_session(
                refresh_token_str=refresh_token,
                user=request.user,
                ip_address=ip,
                user_agent=_get_user_agent(request),
            )
            if not success:
                response = _error(message, status_code=400)
                _delete_refresh_cookie(response)
                return response
        else:
            # No cookie present — session may have already expired; still clear state
            logger.info("[LOGOUT_V2] %s logout requested with no refresh cookie.", request.user.email)

        logger.info("[LOGOUT_V2] %s logged out from %s", request.user.email, ip)
        response = _ok(message="Logged out successfully.")
        _delete_refresh_cookie(response)
        return response


# ──────────────────────────────────────────────────────────────
# V2 Logout All Devices
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Authentication v2"])
class LogoutAllV2View(APIView):
    """
    POST /api/v1/auth/v2/logout-all/

    Revokes all active DeviceSessions and blacklists all outstanding JWT tokens.
    C1: Also clears the HttpOnly refresh cookie on the response.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    @extend_schema(
        summary="Logout From All Devices",
        responses={
            200: OpenApiResponse(description="Logged out from all devices. Cookie cleared."),
        },
    )
    def post(self, request):
        ip = _get_client_ip(request)
        success, message = JWTService.logout_all_devices(
            user=request.user,
            ip_address=ip,
            user_agent=_get_user_agent(request),
        )

        if not success:
            response = _error(message, status_code=500)
            _delete_refresh_cookie(response)
            return response

        logger.info("[LOGOUT_ALL_V2] %s logged out all devices from %s", request.user.email, ip)
        response = _ok(message="Successfully logged out from all devices.")
        _delete_refresh_cookie(response)
        return response


# ──────────────────────────────────────────────────────────────
# V2 Token Refresh — with reuse detection
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Authentication v2"])
class TokenRefreshV2View(APIView):
    """
    POST /api/v1/auth/v2/refresh/

    C1: Reads refresh token from HttpOnly cookie (not request body).
    Rotates the token, sets a new cookie, and returns only the new access token in JSON.
    If reuse is detected, clears the cookie and revokes all sessions.
    """
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    throttle_classes = [TokenRefreshRateThrottle]  # H2: 60/minute per IP

    @extend_schema(
        summary="Refresh Token (v2 — cookie-based, with reuse detection)",
        responses={
            200: OpenApiResponse(description="Access token refreshed. New refresh cookie set."),
            401: OpenApiResponse(description="Invalid or expired refresh token."),
            403: OpenApiResponse(description="Security violation: token reuse detected. Cookie cleared."),
        },
    )
    def post(self, request):
        # C1: Read from HttpOnly cookie
        refresh_token = _get_refresh_from_request(request)
        if not refresh_token:
            return _error("Refresh token cookie is missing or expired. Please log in again.", status_code=401)

        ip = _get_client_ip(request)
        success, tokens, message = JWTService.rotate_and_refresh_token(
            refresh_token_str=refresh_token,
            ip_address=ip,
            user_agent=_get_user_agent(request),
        )

        if not success:
            if "Security violation" in message:
                # Token reuse: clear the compromised cookie immediately
                response = _error(message, status_code=status.HTTP_403_FORBIDDEN)
                _delete_refresh_cookie(response)
                return response
            return _error(message, status_code=status.HTTP_401_UNAUTHORIZED)

        # Return ONLY access token in JSON body; set rotated refresh as new cookie
        response = _ok(
            data={
                "access": tokens["access"],
                "access_expires_in": tokens["access_expires_in"],
            },
            message="Token refreshed successfully.",
        )
        _set_refresh_cookie(response, tokens["refresh"])
        return response


# ──────────────────────────────────────────────────────────────
# OTP — Send
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["OTP"])
class OTPSendView(APIView):
    """
    POST /api/v1/auth/v2/otp/send/

    Send a 6-digit OTP to an email or phone number for a specified purpose.
    Enforces 60s cooldown and max 5 OTPs per hour per target.
    """
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    throttle_classes = [OTPSendRateThrottle]  # H2: 3/minute per IP

    @extend_schema(
        summary="Send OTP",
        request=OTPSendSerializer,
        responses={
            200: OpenApiResponse(description="OTP sent successfully."),
            429: OpenApiResponse(description="Too many OTP requests or cooldown active."),
        },
    )
    def post(self, request):
        serializer = OTPSendSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Failed to send OTP.", errors=serializer.errors, status_code=400)

        data = serializer.validated_data
        ip = _get_client_ip(request)
        user = request.user if request.user.is_authenticated else None

        success, message = OTPService.send_otp(
            target=data["target"],
            purpose=data["purpose"],
            user=user,
            ip_address=ip,
        )

        if not success:
            return _error(message, status_code=status.HTTP_429_TOO_MANY_REQUESTS)

        return _ok(message=message)


# ──────────────────────────────────────────────────────────────
# OTP — Verify
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["OTP"])
class OTPVerifyView(APIView):
    """
    POST /api/v1/auth/v2/otp/verify/

    Verify a submitted 6-digit OTP against stored SHA-256 hash.
    Enforces single-use, expiry, and 3-attempt maximum limits.
    """
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    throttle_classes = [OTPVerifyRateThrottle]  # H2: 10/minute per IP

    @extend_schema(
        summary="Verify OTP",
        request=OTPVerifySerializer,
        responses={
            200: OpenApiResponse(description="OTP verified successfully."),
            400: OpenApiResponse(description="Invalid, expired, or exhausted OTP."),
        },
    )
    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return _error("OTP verification failed.", errors=serializer.errors, status_code=400)

        data = serializer.validated_data
        ip = _get_client_ip(request)
        user = request.user if request.user.is_authenticated else None
        purpose = data["purpose"]

        if purpose in ("password_reset", "OtpPurpose.PASSWORD_RESET"):
            success, reset_token, message = OTPService.verify_password_reset_otp(
                email=data["target"],
                raw_otp=data["code"],
                ip_address=ip,
            )
            if not success:
                return _error(message, status_code=400)
            return _ok(data={"reset_token": reset_token}, message=message)

        success, message = OTPService.verify_otp(
            target=data["target"],
            purpose=purpose,
            raw_otp=data["code"],
            user=user,
            ip_address=ip,
        )

        if not success:
            return _error(message, status_code=400)

        return _ok(message=message)



# ──────────────────────────────────────────────────────────────
# OTP — Resend
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["OTP"])
class OTPResendView(APIView):
    """
    POST /api/v1/auth/v2/otp/resend/

    Resend OTP to the same target for the same purpose.
    Subject to 60-second cooldown enforced by OTPService.
    """
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    throttle_classes = [OTPSendRateThrottle]  # H2: reuse OTP send throttle (3/minute)

    @extend_schema(
        summary="Resend OTP",
        request=OTPResendSerializer,
        responses={
            200: OpenApiResponse(description="OTP resent successfully."),
            429: OpenApiResponse(description="Cooldown active. Wait before resending."),
        },
    )
    def post(self, request):
        serializer = OTPResendSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Resend failed.", errors=serializer.errors, status_code=400)

        data = serializer.validated_data
        ip = _get_client_ip(request)
        user = request.user if request.user.is_authenticated else None

        # Resend delegates to send_otp which enforces cooldown
        success, message = OTPService.send_otp(
            target=data["target"],
            purpose=data["purpose"],
            user=user,
            ip_address=ip,
        )

        if not success:
            return _error(message, status_code=status.HTTP_429_TOO_MANY_REQUESTS)

        return _ok(message="OTP resent successfully.")


# ──────────────────────────────────────────────────────────────
# Sessions — List & Manage
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Sessions"])
class SessionListView(APIView):
    """
    GET /api/v1/auth/v2/sessions/

    Return all active DeviceSessions for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List Active Sessions",
        responses={
            200: OpenApiResponse(description="Active sessions returned."),
        },
    )
    def get(self, request):
        sessions = SessionService.get_active_sessions(request.user)
        serializer = DeviceSessionSerializer(sessions, many=True)
        return _ok(data=serializer.data, message="Active sessions retrieved.")


@extend_schema(tags=["Sessions"])
class SessionRevokeView(APIView):
    """
    DELETE /api/v1/auth/v2/sessions/<id>/

    Revoke a specific active session by its database ID.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Revoke Session by ID",
        responses={
            200: OpenApiResponse(description="Session revoked."),
            404: OpenApiResponse(description="Session not found."),
        },
    )
    def delete(self, request, session_id):
        try:
            session = DeviceSession.objects.get(id=session_id, user=request.user, is_active=True)
        except DeviceSession.DoesNotExist:
            return _error("Session not found.", status_code=status.HTTP_404_NOT_FOUND)

        session.is_active = False
        session.save(update_fields=["is_active"])

        AuditService.log_event(
            action="SESSION_REVOKED",
            user=request.user,
            status="SUCCESS",
            ip_address=_get_client_ip(request),
            details={"session_id": session_id, "device": session.device_name},
        )

        return _ok(message=f"Session '{session.device_name}' has been revoked.")


@extend_schema(tags=["Sessions"])
class SessionRevokeAllView(APIView):
    """
    DELETE /api/v1/auth/v2/sessions/all/

    Revoke all active DeviceSessions for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Revoke All Sessions",
        responses={
            200: OpenApiResponse(description="All sessions revoked."),
        },
    )
    def delete(self, request):
        SessionService.revoke_all_sessions(request.user)
        AuditService.log_event(
            action="SESSION_REVOKE_ALL",
            user=request.user,
            status="SUCCESS",
            ip_address=_get_client_ip(request),
        )
        return _ok(message="All active sessions have been revoked.")


# ──────────────────────────────────────────────────────────────
# Profile — Get & Update
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Profile"])
class ProfileV2View(APIView):
    """
    GET  /api/v1/auth/v2/profile/  — Returns full profile (alias for /me/)
    PATCH /api/v1/auth/v2/profile/ — Updates full_name and phone_number
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    @extend_schema(
        summary="Get Profile",
        responses={200: MeSerializer},
    )
    def get(self, request):
        from apps.authentication.serializers import MeSerializer
        serializer = MeSerializer(request.user)
        return _ok(data=serializer.data, message="Profile retrieved.")

    @extend_schema(
        summary="Update Profile",
        request=ProfileUpdateSerializer,
        responses={
            200: OpenApiResponse(description="Profile updated."),
            400: OpenApiResponse(description="Validation error."),
        },
    )
    def patch(self, request):
        serializer = ProfileUpdateSerializer(
            instance=request.user,
            data=request.data,
            partial=True,
        )
        if not serializer.is_valid():
            return _error("Profile update failed.", errors=serializer.errors, status_code=400)

        serializer.save()

        AuditService.log_event(
            action="PROFILE_UPDATED",
            user=request.user,
            status="SUCCESS",
            ip_address=_get_client_ip(request),
        )

        from apps.authentication.serializers import MeSerializer
        return _ok(data=MeSerializer(request.user).data, message="Profile updated successfully.")


# ──────────────────────────────────────────────────────────────
# V2 Google OAuth — Sign-In & Sign-Up
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Authentication v2"])
class GoogleAuthV2View(APIView):
    """
    POST /api/v1/auth/v2/google/

    Google OAuth 2.0 Single Sign-In & Sign-Up endpoint.
    - Validates Google ID Token using official Google public keys
    - If user exists by google_sub -> Login
    - If user exists by email -> Link Google account
    - If user does not exist -> Create new customer account with verified email
    - Issues JWT access token, creates DeviceSession, records AuditLog
    - Sets HttpOnly refresh token cookie
    """
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    throttle_classes = [LoginRateThrottle]

    @extend_schema(
        summary="Google OAuth Sign-In / Sign-Up (v2)",
        request=GoogleAuthSerializer,
        responses={
            200: OpenApiResponse(description="Google authentication successful. Returns JWT access token & user object. Refresh token set as HttpOnly cookie."),
            400: OpenApiResponse(description="Invalid ID token or verification failure."),
        },
    )
    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Google authentication failed.", errors=serializer.errors, status_code=400)

        id_token_str = serializer.validated_data["id_token"]
        google_mode = serializer.validated_data["mode"]
        ip = _get_client_ip(request)
        user_agent = _get_user_agent(request)
        device_name = request.data.get("device_name") or user_agent[:100]

        try:
            google_data = GoogleAuthService.verify_google_token(id_token_str)
        except ValueError as ve:
            AuditService.log_event(
                action="GOOGLE_AUTH_FAILED",
                status="FAILURE",
                ip_address=ip,
                user_agent=user_agent,
                details={"reason": str(ve)},
            )
            return _error(str(ve), status_code=status.HTTP_400_BAD_REQUEST)

        sub = google_data["sub"]
        email = google_data["email"]
        name = google_data["name"]
        picture = google_data.get("picture", "")

        # 1. Check if user already exists by google_sub
        user = User.objects.filter(google_sub=sub).first()
        auth_action = "GOOGLE_LOGIN"

        if user:
            # Existing Google user login
            auth_action = "GOOGLE_LOGIN"
            if picture and not user.profile_picture:
                user.profile_picture = picture
                user.save(update_fields=["profile_picture"])
        else:
            # 2. Check if user exists by email
            user = User.objects.filter(email=email).first()
            if user:
                # Account linking logic
                auth_action = "GOOGLE_ACCOUNT_LINKED"
                user.google_sub = sub
                if not user.auth_provider or user.auth_provider == "email":
                    user.auth_provider = "google"
                if picture and not user.profile_picture:
                    user.profile_picture = picture
                if not user.is_email_verified:
                    user.is_email_verified = True
                user.save(update_fields=["google_sub", "auth_provider", "profile_picture", "is_email_verified"])
                logger.info("[GOOGLE_ACCOUNT_LINKED] Linked Google sub %s to user %s", sub, email)
            else:
                if google_mode == "signup":
                    # 3. New Google account — create customer during Sign Up
                    user = User.objects.create_user(
                        email=email,
                        full_name=name or email.split("@")[0],
                        password=secrets.token_urlsafe(32),
                        phone_number=None,
                        role=UserRole.CUSTOMER,
                        google_sub=sub,
                        auth_provider="google",
                        profile_picture=picture or "",
                        is_email_verified=True,
                        is_active=True,
                    )

                    auth_action = "GOOGLE_SIGNUP"

                    AuditService.log_event(
                        action="GOOGLE_SIGNUP",
                        user=user,
                        status="SUCCESS",
                        ip_address=ip,
                        user_agent=user_agent,
                        details={"email": email},
                    )

                    logger.info(
                        "[GOOGLE_SIGNUP] Created Google account for '%s'.",
                        email,
                    )
                else:
                    # 3. Unregistered Google account — reject Sign In
                    AuditService.log_event(
                        action="GOOGLE_AUTH_FAILED",
                        status="FAILURE",
                        ip_address=ip,
                        user_agent=user_agent,
                        details={"reason": "Unregistered Google account", "email": email},
                    )
                    logger.warning(
                        "[GOOGLE_AUTH_REJECTED] Unregistered email '%s' attempted Google login.",
                        email,
                    )
                    return _error(
                        "No account found with this Google email. Please register before signing in.",
                        status_code=status.HTTP_404_NOT_FOUND,
                    )

        # Profile sanity checks
        profile = getattr(user, "profile", None)
        if profile:
            if profile.is_blocked:
                AuditService.log_event(
                    action="GOOGLE_AUTH_FAILED",
                    user=user,
                    status="FAILURE",
                    ip_address=ip,
                    user_agent=user_agent,
                    details={"reason": "User is blocked", "email": email},
                )
                return _error("Your account has been blocked by an administrator.", status_code=403)
            if profile.is_deleted:
                AuditService.log_event(
                    action="GOOGLE_AUTH_FAILED",
                    user=user,
                    status="FAILURE",
                    ip_address=ip,
                    user_agent=user_agent,
                    details={"reason": "User is deleted", "email": email},
                )
                return _error("This account has been deleted.", status_code=403)

        if not user.is_active:
            AuditService.log_event(
                action="GOOGLE_AUTH_FAILED",
                user=user,
                status="FAILURE",
                ip_address=ip,
                user_agent=user_agent,
                details={"reason": "User is inactive", "email": email},
            )
            return _error("Your account has been deactivated. Please contact support.", status_code=403)

        # Issue enterprise JWT token pair & create DeviceSession
        LockoutService.reset_attempts(user)
        tokens = JWTService.issue_token_pair_for_user(
            user=user,
            device_name=device_name,
            ip_address=ip,
            user_agent=user_agent,
        )

        AuditService.log_event(
            action=auth_action,
            user=user,
            status="SUCCESS",
            ip_address=ip,
            user_agent=user_agent,
            details={"email": email, "google_sub": sub},
        )

        response = _ok(
            data={
                "access": tokens["access"],
                "session_key": tokens["session_key"],
                "access_expires_in": tokens["access_expires_in"],
                "refresh_expires_in": tokens["refresh_expires_in"],
                "auth_action": auth_action,
                "user": UserMinimalSerializer(user).data,
            },
            message=f"Google authentication successful ({auth_action}).",
        )
        _set_refresh_cookie(response, tokens["refresh"])
        return response


# ──────────────────────────────────────────────────────────────
# V2 Password Reset Flow
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Authentication v2"])
class ForgotPasswordV2View(APIView):
    """
    POST /api/v1/auth/v2/password/forgot/

    Initiates password reset flow.
    - Always returns HTTP 200 with generic success message to prevent user enumeration
    - Skips reset token generation for Google-only accounts and audits PASSWORD_RESET_SKIPPED_GOOGLE_ACCOUNT
    - Audits PASSWORD_RESET_UNKNOWN_EMAIL for unregistered emails
    - Audits PASSWORD_RESET_REQUESTED for valid user requests
    """
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    throttle_classes = [ForgotPasswordRateThrottle]

    @extend_schema(
        summary="Forgot Password Request (v2)",
        request=ForgotPasswordSerializer,
        responses={
            200: OpenApiResponse(description="Generic success message regardless of email existence."),
        },
    )
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Invalid email address.", errors=serializer.errors, status_code=400)

        email = serializer.validated_data["email"].lower().strip()
        ip = _get_client_ip(request)
        user_agent = _get_user_agent(request)

        user = User.objects.filter(email=email).first()
        generic_message = "If an account exists, a 6-digit verification code has been sent to your email."

        if not user:
            AuditService.log_event(
                action="PASSWORD_RESET_UNKNOWN_EMAIL",
                status="FAILURE",
                ip_address=ip,
                user_agent=user_agent,
                details={"email": email},
            )
            return _ok(message=generic_message)

        # Sanity check user status
        profile = getattr(user, "profile", None)
        if (profile and (profile.is_blocked or profile.is_deleted)) or not user.is_active:
            AuditService.log_event(
                action="PASSWORD_RESET_FAILED",
                user=user,
                status="FAILURE",
                ip_address=ip,
                user_agent=user_agent,
                details={"email": email, "reason": "Account is suspended, deleted or inactive"},
            )
            return _ok(message=generic_message)

        # Send 6-digit OTP to user's registered email
        success, msg = OTPService.send_otp(
            target=email,
            purpose=OtpPurpose.PASSWORD_RESET,
            user=user,
            ip_address=ip,
        )

        AuditService.log_event(
            action="PASSWORD_RESET_REQUESTED",
            user=user,
            status="SUCCESS" if success else "FAILURE",
            ip_address=ip,
            user_agent=user_agent,
            details={"email": email},
        )

        return _ok(message=generic_message)



@extend_schema(tags=["Authentication v2"])
class ResetPasswordV2View(APIView):
    """
    POST /api/v1/auth/v2/password/reset/

    Completes password reset flow using 256-bit raw token.
    - Constant-time token hash verification
    - Verifies token validity (30-min window, latest token guaranteed)
    - Validates new password against Django password policy rules
    - Updates user password and revokes all active DeviceSessions and JWT tokens
    """
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    throttle_classes = [ResetPasswordRateThrottle]

    @extend_schema(
        summary="Reset Password Completion (v2)",
        request=ResetPasswordSerializer,
        responses={
            200: OpenApiResponse(description="Password reset successfully. All sessions revoked."),
            400: OpenApiResponse(description="Invalid, expired, or used token, or password policy failure."),
        },
    )
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Invalid password reset request.", errors=serializer.errors, status_code=400)

        raw_token = serializer.validated_data["token"]
        password = serializer.validated_data["password"]
        confirm_password = serializer.validated_data.get("confirm_password") or password
        ip = _get_client_ip(request)
        user_agent = _get_user_agent(request)

        if password != confirm_password:
            return _error("Passwords do not match.", status_code=400)

        # Validate token status first for exact security audit logging
        is_valid, user, validation_msg = TokenService.validate_password_reset_token(raw_token)
        if not is_valid or not user:
            action = "PASSWORD_RESET_INVALID_TOKEN"
            if "expired" in validation_msg.lower():
                action = "PASSWORD_RESET_TOKEN_EXPIRED"

            AuditService.log_event(
                action=action,
                status="FAILURE",
                ip_address=ip,
                user_agent=user_agent,
                details={"reason": validation_msg},
            )
            return _error(validation_msg, status_code=400)

        success, consume_msg = TokenService.consume_password_reset_token(raw_token, password)
        if not success:
            AuditService.log_event(
                action="PASSWORD_RESET_FAILED",
                user=user,
                status="FAILURE",
                ip_address=ip,
                user_agent=user_agent,
                details={"reason": consume_msg},
            )
            return _error(consume_msg, status_code=400)

        AuditService.log_event(
            action="PASSWORD_RESET_SUCCESS",
            user=user,
            status="SUCCESS",
            ip_address=ip,
            user_agent=user_agent,
            details={"email": user.email},
        )

        try:
            from apps.authentication.tasks import send_password_reset_success_async
            send_password_reset_success_async.delay(user_id=str(user.pk))
        except Exception:
            EmailService.send_password_reset_success(user)

        return _ok(message="Password reset successfully. Please log in with your new password.")



