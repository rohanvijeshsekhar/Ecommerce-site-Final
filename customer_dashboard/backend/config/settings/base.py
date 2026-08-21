"""
FAAZO Backend – Base Settings
Shared configuration across all environments.
DO NOT add environment-specific values here.
"""

from datetime import timedelta
from pathlib import Path

import environ

# ============================================================
# Path Configuration
# ============================================================
# BASE_DIR resolves to: backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Initialise django-environ and read .env file
env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")


# ============================================================
# Security
# ============================================================
SECRET_KEY = env("SECRET_KEY")
# ── Dedicated JWT signing key (H3) ──────────────────────────────────────────
# Separate from Django's SECRET_KEY so they can be rotated independently.
# Falls back to SECRET_KEY for zero-config development environments.
JWT_SECRET_KEY = env("JWT_SECRET_KEY", default=SECRET_KEY)
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[])

# ── Reverse Proxy (M1) ───────────────────────────────────────────────────────
# Set to the number of trusted proxy hops in front of Django.
# e.g. TRUSTED_PROXY_COUNT=1 when behind a single nginx / load balancer.
# 0 = no reverse proxy (default for dev). Read X-Forwarded-For only up to this depth.
TRUSTED_PROXY_COUNT = env.int("TRUSTED_PROXY_COUNT", default=0)

# ── Refresh Cookie Settings (C1) ─────────────────────────────────────────────
# HttpOnly cookie is the secure transport mechanism for refresh tokens.
# Never change REFRESH_COOKIE_HTTPONLY — it must always be True.
REFRESH_COOKIE_NAME = "faazo_refresh"
REFRESH_COOKIE_PATH = "/"   # Root path ensures cookie is sent on refresh and API calls
REFRESH_COOKIE_HTTPONLY = True
REFRESH_COOKIE_SECURE = env.bool("COOKIE_SECURE", default=False)  # True in prod
REFRESH_COOKIE_SAMESITE = env("COOKIE_SAMESITE", default="Lax")    # Lax in dev/prod-same-domain
REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days in seconds (matches REFRESH_TOKEN_LIFETIME)


# ============================================================
# Application Definition
# ============================================================
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",  # OpenAPI documentation
]

LOCAL_APPS = [
    "apps.common",
    # ── Phase 3: Authentication & User Management ────────────
    "apps.users",           # Custom User model — must come before authentication
    "apps.authentication",  # JWT auth, email verification, password reset
    "apps.dealer",          # Dealer application & approval workflow
    # ── Phase 5B: Catalogue ──────────────────────────────────────────────────────────
    "apps.brands",
    "apps.categories",
    "apps.products",
    # ── Phase 5B: Homepage CMS ───────────────────────────────────────────────────────
    "apps.homepage",
    # ── Phase 6A: Pricing & Inventory ───────────────────────
    "apps.pricing",
    "apps.inventory",
    "apps.combos",
    "apps.solutions",
    # ── Phase 8+: Commerce ──────────────────────────────────
    "apps.cart",
    "apps.wishlist",
    "apps.checkout",
    "apps.orders",
    "apps.payments",
    # ── Phase 12+: Post-Purchase ────────────────────────────
    "apps.notifications",
    "apps.support",
    "apps.warranty",
    # ── Phase 13: Shipping & Fulfillment ─────────────────────
    "apps.shipping",
    # ── Best Sellers Module ──────────────────────────────────
    "apps.bestsellers",
    # ── Product Reviews & Ratings ────────────────────────────
    "apps.reviews",
    # ── Returns & Refunds ────────────────────────────────────
    "apps.returns",
    # ── Blog & Content Management CMS ────────────────────────
    "apps.blog",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS


# ============================================================
# Middleware
# ============================================================
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",  # Before CommonMiddleware
    "apps.common.middleware.RequestLoggingMiddleware",  # Request logging
    "apps.common.middleware.SecurityHeadersMiddleware",  # Extra security headers
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

CORS_ALLOW_CREDENTIALS = True


# ============================================================
# URL & WSGI
# ============================================================
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


# ============================================================
# Templates
# ============================================================
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# ============================================================
# Password Validation
# ============================================================
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Argon2 is the most secure hashing algorithm available in Django.
# Falls back to PBKDF2 for legacy compatibility.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
]


# ============================================================
# Internationalisation
# ============================================================
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True


# ============================================================
# Static & Media Files
# ============================================================
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


# ============================================================
# Custom User Model (Phase 3)
# ============================================================
# MUST be set before any migrations are created for apps that
# reference AUTH_USER_MODEL (authentication, dealer, etc.)
AUTH_USER_MODEL = "users.User"

# Authentication backends — email-based login (case-insensitive)
# The custom backend replaces Django's default ModelBackend.
AUTHENTICATION_BACKENDS = [
    "apps.authentication.backends.EmailAuthBackend",
]

# ── Phone Verification (Future-Ready) ────────────────────────
# Mobile OTP verification is NOT implemented in v1.0.
# These settings are reserved for the future SMS/OTP module.
# When implemented, set PHONE_VERIFICATION_ENABLED = True and
# configure the SMS gateway (e.g. Twilio, MSG91) here.
PHONE_VERIFICATION_ENABLED = False  # noqa: set to True in future OTP phase

# ── Account Lockout Settings ─────────────────────────────────
LOGIN_FAIL_MAX_ATTEMPTS = 5      # Lock after 5 consecutive failures
LOGIN_FAIL_LOCKOUT_MINUTES = 15  # Lock duration in minutes

# ============================================================
# Default Primary Key
# ============================================================
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# ============================================================
# Django REST Framework
# ============================================================
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.authentication.backends.FAAZOJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "10000/hour",
        "user": "50000/hour",
        "payment_create": "100/minute",
        "payment_verify": "100/minute",
        # ── Per-endpoint auth throttles (H2) ────────────────────────────────
        "auth_login": "10/minute",          # 10 login attempts per minute per IP
        "auth_register": "5/hour",          # 5 registrations per hour per IP
        "auth_otp_send": "3/minute",        # 3 OTP sends per minute per IP
        "auth_otp_verify": "10/minute",     # 10 OTP verify attempts per minute per IP
        "auth_token_refresh": "60/minute",  # 60 refresh requests per minute per user
        "auth_forgot_password": "5/hour",   # 5 forgot-password requests per hour per IP
    },
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.StandardResultsPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "apps.common.exceptions.custom_exception_handler",
    # OpenAPI schema generation
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}


# ============================================================
# JWT Configuration (djangorestframework-simplejwt)
# ============================================================
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": JWT_SECRET_KEY,              # ← H3: uses dedicated key
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    # Cookie references — used only when/if cookie-based access token is enabled.
    # Refresh tokens are managed by REFRESH_COOKIE_* settings above.
    "AUTH_COOKIE": "access_token",
    "AUTH_COOKIE_REFRESH": "refresh_token",
    "AUTH_COOKIE_SECURE": env.bool("COOKIE_SECURE", default=False),
    "AUTH_COOKIE_HTTP_ONLY": True,
    "AUTH_COOKIE_SAMESITE": "Lax",
}

# Maximum active concurrent device sessions per user
MAX_ACTIVE_SESSIONS = env.int("MAX_ACTIVE_SESSIONS", default=10)


# ============================================================
# CORS Configuration
# ============================================================
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])


# ============================================================
# Email Configuration (overridden per environment)
# ============================================================
EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@faazo.com")
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:5173")


# ============================================================
# OpenAPI / Swagger (drf-spectacular)
# ============================================================
SPECTACULAR_SETTINGS = {
    "TITLE": "FAAZO Dental Solutions API",
    "DESCRIPTION": (
        "Production REST API for FAAZO Dental Solutions.\n\n"
        "## Authentication\n"
        "This API uses JWT Bearer tokens. Include the access token in the "
        "`Authorization: Bearer <token>` header for protected endpoints.\n\n"
        "## Response Format\n"
        "All responses follow the standard FAAZO envelope:\n"
        "```json\n"
        '{ "success": true, "data": {}, "message": "...", "meta": null }\n'
        "```\n\n"
        "## Error Format\n"
        "```json\n"
        '{ "success": false, "data": null, "error": { "code": "...", '
        '"message": "...", "details": [] } }\n'
        "```"
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "CONTACT": {"name": "FAAZO Engineering", "email": "tech@faazo.com"},
    "LICENSE": {"name": "Proprietary"},
    # Servers shown in Swagger UI
    "SERVERS": [
        {"url": "http://localhost:8000", "description": "Development"},
        {"url": "https://api.faazo.com", "description": "Production"},
    ],
    # Group endpoints by app
    "TAGS": [
        {"name": "Health", "description": "Server health and status"},
        {"name": "Auth", "description": "Authentication – login, register, token refresh"},
        {"name": "Users", "description": "User profiles and account management"},
        {"name": "Dealer", "description": "Dealer application and approval"},
        {"name": "Products", "description": "Product catalog browsing"},
        {"name": "Categories", "description": "Product categories"},
        {"name": "Brands", "description": "Product brands"},
        {"name": "Cart", "description": "Shopping cart management"},
        {"name": "Checkout", "description": "Order checkout and coupon validation"},
        {"name": "Orders", "description": "Order history and management"},
        {"name": "Warranty", "description": "Warranty registration and claims"},
        {"name": "Support", "description": "Support tickets and service requests"},
        {"name": "Notifications", "description": "Notification center"},
    ],
    "COMPONENT_SPLIT_REQUEST": True,
    "SORT_OPERATIONS": False,
    "ENUM_GENERATE_CHOICE_DESCRIPTION": True,
}


# ============================================================
# Logging
# ============================================================
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)  # Create logs/ directory if it doesn't exist

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    # ── Formatters ──────────────────────────────────────────
    "formatters": {
        "verbose": {
            "format": "[{asctime}] [{levelname}] [{name}] {message}",
            "style": "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "simple": {
            "format": "[{levelname}] {message}",
            "style": "{",
        },
        "json": {
            # Simplified JSON-like format (use python-json-logger in future)
            "format": (
                '{{"time":"{asctime}","level":"{levelname}",'
                '"logger":"{name}","message":"{message}"}}'
            ),
            "style": "{",
            "datefmt": "%Y-%m-%dT%H:%M:%S",
        },
    },
    # ── Filters ──────────────────────────────────────────────
    "filters": {
        "require_debug_true": {
            "()": "django.utils.log.RequireDebugTrue",
        },
        "require_debug_false": {
            "()": "django.utils.log.RequireDebugFalse",
        },
    },
    # ── Handlers ─────────────────────────────────────────────
    "handlers": {
        # Console – always active in development
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        # app.log – general application logs (INFO+)
        "app_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(LOGS_DIR / "app.log"),
            "maxBytes": 10 * 1024 * 1024,  # 10 MB
            "backupCount": 5,
            "formatter": "verbose",
            "encoding": "utf-8",
        },
        # error.log – WARNING and above
        "error_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(LOGS_DIR / "error.log"),
            "maxBytes": 10 * 1024 * 1024,  # 10 MB
            "backupCount": 10,
            "formatter": "verbose",
            "level": "WARNING",
            "encoding": "utf-8",
        },
        # security.log – security-specific events
        "security_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(LOGS_DIR / "security.log"),
            "maxBytes": 10 * 1024 * 1024,  # 10 MB
            "backupCount": 10,
            "formatter": "verbose",
            "encoding": "utf-8",
        },
    },
    # ── Loggers ──────────────────────────────────────────────
    "loggers": {
        # Django framework logs
        "django": {
            "handlers": ["console", "app_file", "error_file"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["error_file", "console"],
            "level": "WARNING",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["security_file", "console"],
            "level": "WARNING",
            "propagate": False,
        },
        # FAAZO application namespaces
        "faazo": {
            "handlers": ["console", "app_file", "error_file"],
            "level": "DEBUG",
            "propagate": False,
        },
        "faazo.requests": {
            "handlers": ["console", "app_file"],
            "level": "INFO",
            "propagate": False,
        },
        "faazo.security": {
            "handlers": ["security_file", "console", "error_file"],
            "level": "INFO",
            "propagate": False,
        },
        "faazo.auth": {
            "handlers": ["security_file", "console", "app_file"],
            "level": "INFO",
            "propagate": False,
        },
        "faazo.common": {
            "handlers": ["console", "app_file"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
    # Root logger – catch-all for anything not matched above
    "root": {
        "handlers": ["console", "error_file"],
        "level": "WARNING",
    },
}


# ============================================================
# Application-Specific Settings
# ============================================================
APP_NAME = "FAAZO Dental Solutions"
APP_VERSION = "1.0.0"

# Google OAuth 2.0 Configuration
GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID", default="")


# ============================================================
# OTP Provider Settings
# ============================================================
# SMS_PROVIDER options: 'sangamam' | 'mock'
SMS_PROVIDER = env("SMS_PROVIDER", default="mock").lower()

# Sangamam Online SMS Transactional API credentials & Approved DLT Template IDs
SANGAMAM_API_BASE_URL       = env("SANGAMAM_API_BASE_URL", default="https://fastsms.sangamamonline.in/api/sms/v1.0/send-sms")
SANGAMAM_ACCESS_TOKEN       = env("SANGAMAM_ACCESS_TOKEN", default="")
SANGAMAM_ACCESS_TOKEN_KEY   = env("SANGAMAM_ACCESS_TOKEN_KEY", default="")
SANGAMAM_SENDER_ID          = env("SANGAMAM_SENDER_ID", default=env("SANGAMAM_SENDER_HEADER", default="FAZODT"))
SANGAMAM_ENTITY_ID          = env("SANGAMAM_ENTITY_ID", default="1701178461438263453")
SANGAMAM_OTP_TEMPLATE_ID    = env("SANGAMAM_OTP_TEMPLATE_ID", default="1777178496391306366")
SANGAMAM_ORDER_TEMPLATE_ID  = env("SANGAMAM_ORDER_TEMPLATE_ID", default="1777178496694995515")
SANGAMAM_REFUND_TEMPLATE_ID = env("SANGAMAM_REFUND_TEMPLATE_ID", default="1777178496731822406")
SANGAMAM_RETURN_TEMPLATE_ID = env("SANGAMAM_RETURN_TEMPLATE_ID", default="1777178496718140338")
SANGAMAM_SHIPPED_TEMPLATE_ID = env("SANGAMAM_SHIPPED_TEMPLATE_ID", default="1777178496710209320")
SANGAMAM_SENDER_HEADER     = SANGAMAM_SENDER_ID
SANGAMAM_TEMPLATE_ID       = SANGAMAM_ORDER_TEMPLATE_ID

# Legacy MSG91 (kept for reference)
MSG91_AUTHKEY    = env("MSG91_AUTHKEY", default="")
MSG91_SENDER_ID  = env("MSG91_SENDER_ID", default="FAAZO")
MSG91_ROUTE      = env("MSG91_ROUTE", default="4")
MSG91_TEMPLATE_ID = env("MSG91_TEMPLATE_ID", default="")

OTP_RESEND_COOLDOWN_SECONDS = env.int("OTP_RESEND_COOLDOWN_SECONDS", default=60)
OTP_MAX_PER_HOUR = env.int("OTP_MAX_PER_HOUR", default=5)
OTP_EXPIRATION_MINUTES = env.int("OTP_EXPIRATION_MINUTES", default=10)
OTP_MAX_ATTEMPTS = env.int("OTP_MAX_ATTEMPTS", default=3)


# ============================================================
# Razorpay Payment Gateway
# ============================================================
RAZORPAY_KEY_ID = env("RAZORPAY_KEY_ID", default="")
RAZORPAY_KEY_SECRET = env("RAZORPAY_KEY_SECRET", default="")
RAZORPAY_WEBHOOK_SECRET = env("RAZORPAY_WEBHOOK_SECRET", default="")


# ============================================================
# Shiprocket Shipping Integration & Provider Settings
# ============================================================
# SHIPPING_PROVIDER options: 'offline' | 'shiprocket'
SHIPPING_PROVIDER = env("SHIPPING_PROVIDER", default="offline").lower()
SHIPROCKET_BASE_URL = env("SHIPROCKET_BASE_URL", default="https://apiv2.shiprocket.in")
SHIPROCKET_EMAIL = env("SHIPROCKET_EMAIL", default="")
SHIPROCKET_PASSWORD = env("SHIPROCKET_PASSWORD", default="")
SHIPROCKET_PICKUP_LOCATION = env("SHIPROCKET_PICKUP_LOCATION", default="warehouse")
SHIPROCKET_PICKUP_PINCODE = env("SHIPROCKET_PICKUP_PINCODE", default="695101")
SHIPROCKET_WEBHOOK_SECRET = env("SHIPROCKET_WEBHOOK_SECRET", default="")
SHIPROCKET_TOKEN_CACHE_TTL = env.int("SHIPROCKET_TOKEN_CACHE_TTL", default=864000)

# Backward-compatible fallback aliases for existing view / check calls
DELHIVERY_BASE_URL_SANDBOX = SHIPROCKET_BASE_URL
DELHIVERY_BASE_URL_LIVE = SHIPROCKET_BASE_URL
DELHIVERY_API_TOKEN = ""
DELHIVERY_CLIENT_NAME = "FAAZO"
DELHIVERY_PICKUP_LOCATION = SHIPROCKET_PICKUP_LOCATION
DELHIVERY_SELLER_NAME = "FAAZO Dental Solutions Pvt. Ltd."
DELHIVERY_PHONE = "9876543210"
DELHIVERY_EMAIL = SHIPROCKET_EMAIL

# ── FAAZO Tax & Warehouse Configuration ──────────────────────────────────────
# FAAZO_WAREHOUSE_STATE: Registered seller/warehouse state for GST intra/inter-state tax determination.
# FAAZO_SELLER_GSTIN: Seller's 15-digit GST Identification Number for Tax Invoices.
FAAZO_WAREHOUSE_STATE = env.str("FAAZO_WAREHOUSE_STATE", default="Maharashtra").strip()
FAAZO_SELLER_GSTIN = env.str("FAAZO_SELLER_GSTIN", default="").strip()


# ============================================================
# Redis & Celery Task Queue Configuration
# ============================================================
REDIS_URL = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 300  # 5 minutes hard execution limit
CELERY_TASK_SOFT_TIME_LIMIT = 240  # 4 minutes soft execution limit
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

# Periodic Celery Beat schedule for Transactional Outbox sweeper
CELERY_BEAT_SCHEDULE = {
    "sweep-pending-outbox-events": {
        "task": "faazo.orders.sweep_pending_outbox_events",
        "schedule": 60.0,  # Runs every 60 seconds
    },
}


# ============================================================
# Server-Side Image Optimization (WebP Pipeline)
# ============================================================
IMAGE_OPTIMIZER_ENABLED = env.bool("IMAGE_OPTIMIZER_ENABLED", default=True)
IMAGE_OPTIMIZER_WEBP_QUALITY = env.int("IMAGE_OPTIMIZER_WEBP_QUALITY", default=82)
IMAGE_OPTIMIZER_MAX_DIMENSION = env.int("IMAGE_OPTIMIZER_MAX_DIMENSION", default=2000)
IMAGE_OPTIMIZER_MAX_SIZE_MB = env.int("IMAGE_OPTIMIZER_MAX_SIZE_MB", default=15)



