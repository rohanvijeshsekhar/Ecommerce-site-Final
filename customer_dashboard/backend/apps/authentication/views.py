"""
FAAZO – Authentication Views

Views are thin controllers only:
    - Validate input (via serializers)
    - Delegate business logic (to services)
    - Return standardised API responses

All business logic is in apps/authentication/services.py.
Rate limiting is applied at the view level via django-ratelimit.

Views in this module:
    RegisterView             POST /api/v1/auth/register/
    DealerRegisterView       POST /api/v1/auth/dealer/register/
    LoginView                POST /api/v1/auth/login/
    LogoutView               POST /api/v1/auth/logout/
    TokenRefreshView         POST /api/v1/auth/token/refresh/
    MeView                   GET  /api/v1/auth/me/
    VerifyEmailView          GET  /api/v1/auth/verify-email/
    ResendVerificationView   POST /api/v1/auth/resend-verification/
    ForgotPasswordView       POST /api/v1/auth/forgot-password/
    ResetPasswordView        POST /api/v1/auth/reset-password/
    ChangePasswordView       POST /api/v1/auth/change-password/
"""

import logging

from django.conf import settings
from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView as BaseTokenRefreshView

from drf_spectacular.utils import OpenApiResponse, extend_schema

from apps.authentication.serializers import (
    ChangePasswordSerializer,
    DealerRegisterSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    MeSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    UserMinimalSerializer,
)
from apps.authentication.services import AuthService, EmailService, JWTService, TokenService
from apps.authentication.throttles import (
    ForgotPasswordRateThrottle,
    LoginRateThrottle,
    RegisterRateThrottle,
)
from apps.dealer.models import DealerApplication, DealerApplicationDocument
from apps.users.models import UserRole

logger = logging.getLogger("faazo.auth")
User = get_user_model()


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Set the HttpOnly refresh token cookie on a DRF Response."""
    response.set_cookie(
        key=getattr(settings, "REFRESH_COOKIE_NAME", "faazo_refresh"),
        value=refresh_token,
        max_age=getattr(settings, "REFRESH_COOKIE_MAX_AGE", 7 * 24 * 60 * 60),
        path=getattr(settings, "REFRESH_COOKIE_PATH", "/"),
        httponly=getattr(settings, "REFRESH_COOKIE_HTTPONLY", True),
        secure=getattr(settings, "REFRESH_COOKIE_SECURE", False),
        samesite=getattr(settings, "REFRESH_COOKIE_SAMESITE", "Lax"),
    )



# ──────────────────────────────────────────────────────────────
# Response helpers
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
    """
    from django.conf import settings as _settings
    trusted_count = getattr(_settings, "TRUSTED_PROXY_COUNT", 0)
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded and trusted_count > 0:
        ips = [ip.strip() for ip in x_forwarded.split(",")]
        idx = max(0, len(ips) - trusted_count)
        return ips[idx]
    return request.META.get("REMOTE_ADDR", "unknown")


# ──────────────────────────────────────────────────────────────
# Customer Registration
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Authentication"])
class RegisterView(APIView):
    """
    POST /api/v1/auth/register/

    Register a new customer account.
    Sends a welcome + email verification email on success.
    Returns JWT tokens immediately — email verification is needed only for ordering.
    """

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    throttle_classes = [RegisterRateThrottle]  # H2: 5/hour per IP

    @extend_schema(
        summary="Customer Registration",
        request=RegisterSerializer,
        responses={
            201: OpenApiResponse(description="Account created. Verification email sent."),
            400: OpenApiResponse(description="Validation error."),
        },
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Registration failed.", errors=serializer.errors, status_code=400)

        data = serializer.validated_data
        phone = data.get("phone_number") or None

        user = User.objects.create_user(
            email=data["email"],
            full_name=data["full_name"],
            password=data["password"],
            phone_number=phone,
            role=UserRole.CUSTOMER,
        )

        # Generate tokens — user can browse immediately
        tokens = JWTService.generate_tokens_for_user(user)

        # Send welcome + verify email
        raw_token = TokenService.generate_email_verification_token(user)
        EmailService.send_welcome_verify(user, raw_token)

        logger.info(
            "[REGISTER] Customer %s registered from IP %s.",
            user.email,
            _get_client_ip(request),
        )

        return _ok(
            data={
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "user": UserMinimalSerializer(user).data,
            },
            message="Account created successfully. Please check your email to verify your address.",
            status_code=status.HTTP_201_CREATED,
        )


# ──────────────────────────────────────────────────────────────
# OTP-First Registration — Pre-Register (send OTP, no account yet)
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Authentication"])
class PreRegisterView(APIView):
    """
    POST /api/v1/auth/pre-register/

    Step 1 of OTP-first registration.
    Validates registration data and sends OTP to the phone number.
    No account is created at this stage.
    Stores pending registration data in cache for 15 minutes.
    """

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        from django.core.cache import cache
        from apps.authentication.services import OTPService

        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Registration failed.", errors=serializer.errors, status_code=400)

        data = serializer.validated_data
        phone = data.get("phone_number") or None

        if not phone:
            # No phone number — create account immediately (no OTP needed)
            user = User.objects.create_user(
                email=data["email"],
                full_name=data["full_name"],
                password=data["password"],
                role=UserRole.CUSTOMER,
            )
            tokens = JWTService.generate_tokens_for_user(user)
            raw_token = TokenService.generate_email_verification_token(user)
            EmailService.send_welcome_verify(user, raw_token)
            logger.info("[PRE-REGISTER] No phone — account created directly for %s.", user.email)
            return _ok(
                data={
                    "otp_required": False,
                    "access": tokens["access"],
                    "refresh": tokens["refresh"],
                    "user": UserMinimalSerializer(user).data,
                },
                message="Account created successfully.",
                status_code=status.HTTP_201_CREATED,
            )

        # Check email uniqueness before sending OTP
        if User.objects.filter(email=data["email"]).exists():
            return _error("Registration failed.", errors={"email": ["A user with this email already exists."]}, status_code=400)

        # Check phone uniqueness
        if User.objects.filter(phone_number=phone).exists():
            return _error("Registration failed.", errors={"phone_number": ["This phone number is already registered."]}, status_code=400)

        # Store pending registration data in cache (15 min TTL)
        cache_key = f"pending_reg_{phone}"
        cache.set(cache_key, {
            "email": data["email"],
            "full_name": data["full_name"],
            "password": data["password"],
            "phone_number": phone,
        }, timeout=900)  # 15 minutes

        # Send OTP
        success, msg = OTPService.send_otp(phone, "registration", ip_address=_get_client_ip(request))
        if not success:
            cache.delete(cache_key)
            return _error(f"Failed to send OTP: {msg}", status_code=500)

        logger.info("[PRE-REGISTER] OTP sent to %s for email %s.", phone, data["email"])
        return _ok(
            data={"otp_required": True, "phone": phone},
            message=f"OTP sent to {phone}. Please verify to complete registration.",
            status_code=status.HTTP_200_OK,
        )


# ──────────────────────────────────────────────────────────────
# OTP-First Registration — Verify & Create Account
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Authentication"])
class VerifyAndRegisterView(APIView):
    """
    POST /api/v1/auth/verify-and-register/

    Step 2 of OTP-first registration.
    Verifies the OTP and creates the user account only on success.
    Body: { phone_number, otp_code }
    """

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        from django.core.cache import cache
        from apps.authentication.services import OTPService
        from apps.common.utils import normalize_phone_number
        from django.core.exceptions import ValidationError as DjangoValidationError

        phone = request.data.get("phone_number", "").strip()
        otp_code = request.data.get("otp_code", "").strip()

        if not phone or not otp_code:
            return _error("phone_number and otp_code are required.", status_code=400)

        try:
            norm_phone = normalize_phone_number(phone, allow_empty=False)
        except DjangoValidationError:
            norm_phone = phone

        # Verify the OTP
        verified, msg = OTPService.verify_otp(
            target=norm_phone,
            purpose="registration",
            raw_otp=otp_code,
            ip_address=_get_client_ip(request),
        )
        if not verified:
            return _error(msg, status_code=400)

        # Retrieve pending registration data
        cache_key = f"pending_reg_{norm_phone}"
        pending = cache.get(cache_key)
        if not pending and phone != norm_phone:
            # Fallback check for unnormalized cache key if any
            pending = cache.get(f"pending_reg_{phone}")

        if pending:
            # Final uniqueness check (race condition guard)
            if User.objects.filter(email=pending["email"]).exists():
                cache.delete(cache_key)
                user = User.objects.filter(email=pending["email"]).first()
                if user:
                    user.is_phone_verified = True
                    user.save(update_fields=["is_phone_verified"])
                    tokens = JWTService.generate_tokens_for_user(user)
                    return _ok(
                        data={
                            "access": tokens["access"],
                            "refresh": tokens["refresh"],
                            "user": UserMinimalSerializer(user).data,
                        },
                        message="Phone verified successfully! Welcome to FAAZO.",
                        status_code=status.HTTP_200_OK,
                    )
                return _error("An account with this email already exists.", status_code=400)

            if User.objects.filter(phone_number=norm_phone).exists():
                cache.delete(cache_key)
                return _error("This phone number is already registered to another account.", status_code=400)

            # Create the user account
            user = User.objects.create_user(
                email=pending["email"],
                full_name=pending["full_name"],
                password=pending["password"],
                phone_number=norm_phone,
                role=UserRole.CUSTOMER,
            )

            # Mark phone as verified
            user.is_phone_verified = True
            user.save(update_fields=["is_phone_verified"])

            # Clear cache entry
            cache.delete(cache_key)
            if phone != norm_phone:
                cache.delete(f"pending_reg_{phone}")

            # Generate tokens and send welcome email
            tokens = JWTService.generate_tokens_for_user(user)
            try:
                raw_token = TokenService.generate_email_verification_token(user)
                EmailService.send_welcome_verify(user, raw_token)
            except Exception:
                pass  # Don't fail registration if email fails

            logger.info("[VERIFY-AND-REGISTER] Account created for %s (phone=%s).", user.email, norm_phone)
            return _ok(
                data={
                    "access": tokens["access"],
                    "refresh": tokens["refresh"],
                    "user": UserMinimalSerializer(user).data,
                },
                message="Phone verified! Your account has been created successfully.",
                status_code=status.HTTP_201_CREATED,
            )

        # If not in cache, check if user already exists in DB (e.g. Dealer registration or re-verification flow)
        user = User.objects.filter(phone_number=norm_phone).first()
        if not user and phone != norm_phone:
            user = User.objects.filter(phone_number=phone).first()

        if user:
            user.is_phone_verified = True
            user.save(update_fields=["is_phone_verified"])
            tokens = JWTService.generate_tokens_for_user(user)
            logger.info("[VERIFY-AND-REGISTER] Phone verified for existing user %s (phone=%s).", user.email, norm_phone)
            return _ok(
                data={
                    "access": tokens["access"],
                    "refresh": tokens["refresh"],
                    "user": UserMinimalSerializer(user).data,
                },
                message="Phone verified successfully! Welcome to FAAZO.",
                status_code=status.HTTP_200_OK,
            )

        return _error(
            "Registration session expired. Please start registration again.",
            status_code=400,
        )


# ──────────────────────────────────────────────────────────────
# Dealer Registration
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Authentication"])
class DealerRegisterView(APIView):
    """
    POST /api/v1/auth/dealer/register/

    Register a new dealer account with document upload.
    Creates a DealerApplication with status=pending.
    Admin must approve before dealer pricing activates.
    """

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        summary="Dealer Registration",
        request=DealerRegisterSerializer,
        responses={
            201: OpenApiResponse(description="Dealer application submitted."),
            400: OpenApiResponse(description="Validation error."),
        },
    )
    def post(self, request):
        serializer = DealerRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Dealer registration failed.", errors=serializer.errors, status_code=400)

        data = serializer.validated_data
        phone = data.get("phone_number") or None

        user = User.objects.create_user(
            email=data["email"],
            full_name=data["full_name"],
            password=data["password"],
            phone_number=phone,
            role=UserRole.DEALER,
        )

        app = DealerApplication.objects.create(
            user=user,
            company_name=data["company_name"],
        )

        for doc_file in data.get("documents", []):
            DealerApplicationDocument.objects.create(
                application=app,
                document=doc_file,
            )

        # Generate tokens
        tokens = JWTService.generate_tokens_for_user(user)

        # Verification email
        raw_token = TokenService.generate_email_verification_token(user)
        EmailService.send_dealer_application_received(user, data["company_name"])
        # Also send a verification email
        EmailService.send_welcome_verify(user, raw_token)

        logger.info(
            "[DEALER_REGISTER] Dealer %s (%s) registered from IP %s.",
            user.email,
            data["company_name"],
            _get_client_ip(request),
        )

        return _ok(
            data={
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "user": UserMinimalSerializer(user).data,
            },
            message=(
                "Dealer application submitted successfully. "
                "Your application is under review (2–3 business days). "
                "Please verify your email address."
            ),
            status_code=status.HTTP_201_CREATED,
        )


# ──────────────────────────────────────────────────────────────
# Login
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Authentication"])
class LoginView(APIView):
    """
    POST /api/v1/auth/login/

    Authenticate with email + password.
    Returns JWT access + refresh token pair.
    Enforces account lockout after 5 consecutive failures.
    """

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    throttle_classes = [LoginRateThrottle]  # H2: 10/minute per IP

    @extend_schema(
        summary="Login",
        request=LoginSerializer,
        responses={
            200: OpenApiResponse(description="Login successful. Returns JWT token pair."),
            400: OpenApiResponse(description="Invalid credentials."),
            403: OpenApiResponse(description="Account locked or inactive."),
            429: OpenApiResponse(description="Too many requests."),
        },
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Login failed.", errors=serializer.errors, status_code=400)

        data = serializer.validated_data
        email = data["email"]
        password = data["password"]
        remember_me = data.get("remember_me", False)
        ip = _get_client_ip(request)

        # Check account lockout
        is_locked, seconds_remaining = AuthService.is_account_locked(email)
        if is_locked:
            logger.warning("[ACCOUNT_LOCKED] Login blocked for %s from IP %s.", email, ip)
            minutes = max(1, seconds_remaining // 60)
            return _error(
                f"Account temporarily locked due to multiple failed login attempts. "
                f"Please try again in {minutes} minute(s).",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Authenticate
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            AuthService.record_failed_login(email)
            logger.warning("[LOGIN_FAILED] No account found for %s from IP %s.", email, ip)
            return _error(
                "Invalid email or password.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(password):
            attempts = AuthService.record_failed_login(email)
            max_attempts = 5
            remaining = max(0, max_attempts - attempts)
            logger.warning(
                "[LOGIN_FAILED] Wrong password for %s from IP %s. Attempts: %d.",
                email, ip, attempts,
            )
            if remaining == 0:
                return _error(
                    "Account locked due to too many failed attempts. Try again in 15 minutes.",
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            return _error(
                f"Invalid email or password. {remaining} attempt(s) remaining before lockout.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            logger.warning("[LOGIN_FAILED] Inactive account login attempt: %s.", email)
            return _error(
                "Your account has been deactivated. Please contact support.",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        # Check if account is blocked or deleted
        profile = getattr(user, "profile", None)
        if profile:
            if profile.is_blocked:
                logger.warning("[LOGIN_FAILED] Blocked account login attempt: %s.", email)
                return _error(
                    "Your account has been blocked by an administrator.",
                    status_code=status.HTTP_403_FORBIDDEN,
                )
            if profile.is_deleted:
                logger.warning("[LOGIN_FAILED] Deleted account login attempt: %s.", email)
                return _error(
                    "This account has been deleted.",
                    status_code=status.HTTP_403_FORBIDDEN,
                )

        # Successful login
        AuthService.clear_failed_attempts(email)
        tokens = JWTService.generate_tokens_for_user(user, remember_me=remember_me)

        logger.info("[LOGIN_SUCCESS] %s logged in from IP %s (remember_me=%s).", email, ip, remember_me)

        response = _ok(
            data={
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "user": UserMinimalSerializer(user).data,
            },
            message="Login successful.",
        )
        _set_refresh_cookie(response, tokens["refresh"])
        return response


# ──────────────────────────────────────────────────────────────
# Logout
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Authentication"])
class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/

    Blacklist the provided refresh token.
    Frontend must clear stored access token from memory.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    @extend_schema(
        summary="Logout",
        request=LogoutSerializer,
        responses={
            200: OpenApiResponse(description="Logged out successfully."),
            400: OpenApiResponse(description="Invalid or expired refresh token."),
        },
    )
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Logout failed.", errors=serializer.errors, status_code=400)

        success, message = JWTService.blacklist_refresh_token(
            serializer.validated_data["refresh"]
        )

        if not success:
            return _error(message, status_code=400)

        logger.info("[LOGOUT] User %s logged out.", request.user.email)
        return _ok(message="Logged out successfully.")


# ──────────────────────────────────────────────────────────────
# Token Refresh
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Authentication"])
class TokenRefreshView(BaseTokenRefreshView):
    """
    POST /api/v1/auth/token/refresh/

    Rotate refresh token — returns new access + refresh token pair.
    Old refresh token is automatically blacklisted (BLACKLIST_AFTER_ROTATION=True).
    """
    pass


# ──────────────────────────────────────────────────────────────
# Me
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Authentication"])
class MeView(APIView):
    """
    GET /api/v1/auth/me/

    Return the current authenticated user's full profile.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get Current User",
        responses={
            200: MeSerializer,
            401: OpenApiResponse(description="Not authenticated."),
        },
    )
    def get(self, request):
        serializer = MeSerializer(request.user)
        return _ok(data=serializer.data, message="User profile retrieved.")


# ──────────────────────────────────────────────────────────────
# Email Verification
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Email Verification"])
class VerifyEmailView(APIView):
    """
    GET /api/v1/auth/verify-email/?token=<raw_token>

    Verify email address using the token from the verification email.
    Token is single-use and expires after 24 hours.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Verify Email Address",
        responses={
            200: OpenApiResponse(description="Email verified successfully."),
            400: OpenApiResponse(description="Invalid, expired, or already-used token."),
        },
    )
    def get(self, request):
        token = request.query_params.get("token", "").strip()

        if not token or len(token) != 64:
            return _error(
                "Invalid verification link.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        success, message, user = TokenService.verify_email_token(token)

        if not success:
            return _error(message, status_code=400)

        logger.info("[EMAIL_VERIFIED] Email verified for %s.", user.email)
        return _ok(
            data=UserMinimalSerializer(user).data,
            message=message,
        )


@extend_schema(tags=["Email Verification"])
class ResendVerificationView(APIView):
    """
    POST /api/v1/auth/resend-verification/

    Re-send the email verification link.
    Can only be used by an authenticated user whose email is not yet verified.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    @extend_schema(
        summary="Resend Email Verification",
        responses={
            200: OpenApiResponse(description="Verification email sent."),
            400: OpenApiResponse(description="Email already verified."),
        },
    )
    def post(self, request):
        user = request.user

        if user.is_email_verified:
            return _error(
                "Your email address is already verified.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        raw_token = TokenService.generate_email_verification_token(user)
        EmailService.send_verification_email(user, raw_token)

        logger.info("[RESEND_VERIFICATION] New verification email sent to %s.", user.email)
        return _ok(message="Verification email sent. Please check your inbox.")


# ──────────────────────────────────────────────────────────────
# Password Reset
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Password Reset"])
class ForgotPasswordView(APIView):
    """
    POST /api/v1/auth/forgot-password/

    Request a password reset email.
    ALWAYS returns 200 OK — prevents user enumeration attacks.
    """

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    throttle_classes = [ForgotPasswordRateThrottle]  # H2: 5/hour per IP

    @extend_schema(
        summary="Forgot Password",
        request=ForgotPasswordSerializer,
        responses={
            200: OpenApiResponse(
                description="If an account exists with this email, a reset link has been sent."
            ),
        },
    )
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Request failed.", errors=serializer.errors, status_code=400)

        email = serializer.validated_data["email"]

        # Silently skip if user doesn't exist (anti-enumeration)
        try:
            user = User.objects.get(email=email, is_active=True)
            raw_token = TokenService.generate_password_reset_token(user)
            EmailService.send_password_reset(user, raw_token)
            logger.info("[PASSWORD_RESET_REQUEST] Reset email sent to %s.", email)
        except User.DoesNotExist:
            logger.info(
                "[PASSWORD_RESET_REQUEST] Email %s not found — silently ignored.", email
            )

        # Always return the same response
        return _ok(
            message=(
                "If an account exists with this email address, "
                "a password reset link has been sent."
            )
        )


@extend_schema(tags=["Password Reset"])
class ResetPasswordView(APIView):
    """
    POST /api/v1/auth/reset-password/

    Set a new password using the token from the reset email.
    All outstanding JWT tokens for the user are blacklisted (forces re-login everywhere).
    """

    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    @extend_schema(
        summary="Reset Password",
        request=ResetPasswordSerializer,
        responses={
            200: OpenApiResponse(description="Password reset successfully."),
            400: OpenApiResponse(description="Invalid/expired token or weak password."),
        },
    )
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Password reset failed.", errors=serializer.errors, status_code=400)

        data = serializer.validated_data
        raw_token = data["token"]

        # Validate token (does not consume it yet)
        is_valid, message, token_obj = TokenService.validate_password_reset_token(raw_token)
        if not is_valid:
            return _error(message, status_code=400)

        user = token_obj.user

        # Set new password + blacklist all sessions
        AuthService.change_password(user, data["password"])

        # Consume the token
        TokenService.consume_password_reset_token(token_obj)

        # Send confirmation email
        EmailService.send_password_reset_success(user)

        logger.info(
            "[PASSWORD_RESET_COMPLETE] Password reset successful for %s.", user.email
        )

        return _ok(
            message=(
                "Your password has been reset successfully. "
                "Please log in with your new password."
            )
        )


# ──────────────────────────────────────────────────────────────
# Change Password (authenticated)
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Password Reset"])
class ChangePasswordView(APIView):
    """
    POST /api/v1/auth/change-password/

    Change password while logged in.
    Requires current password confirmation.
    Forces re-login on all devices.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    @extend_schema(
        summary="Change Password",
        request=ChangePasswordSerializer,
        responses={
            200: OpenApiResponse(description="Password changed. All sessions logged out."),
            400: OpenApiResponse(description="Incorrect current password or weak new password."),
        },
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Password change failed.", errors=serializer.errors, status_code=400)

        data = serializer.validated_data
        user = request.user

        # Verify current password
        if not user.check_password(data["current_password"]):
            return _error(
                "Current password is incorrect.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent setting the same password
        if user.check_password(data["new_password"]):
            return _error(
                "New password must be different from your current password.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Change password + invalidate all sessions
        AuthService.change_password(user, data["new_password"])
        EmailService.send_password_reset_success(user)

        logger.info(
            "[PASSWORD_CHANGED] Password changed for %s. All sessions invalidated.",
            user.email,
        )

        return _ok(
            message=(
                "Password changed successfully. "
                "You have been logged out of all devices. Please log in again."
            )
        )
