"""
FAAZO Backend – Production Settings
Uses PostgreSQL. Debug disabled. Strict CORS. Secure cookies. S3 Media.
"""

from .base import *  # noqa: F401, F403

# ============================================================
# Security Hardening
# ============================================================
DEBUG = False

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")  # noqa: F405

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = "DENY"


# ============================================================
# Production Database (PostgreSQL)
# ============================================================
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME"),  # noqa: F405
        "USER": env("DB_USER"),  # noqa: F405
        "PASSWORD": env("DB_PASSWORD"),  # noqa: F405
        "HOST": env("DB_HOST"),  # noqa: F405
        "PORT": env("DB_PORT", default="5432"),  # noqa: F405
        "OPTIONS": {
            "connect_timeout": 10,
        },
        "CONN_MAX_AGE": 60,  # Persistent connections
    }
}


# ============================================================
# CORS – Production Origins Only
# ============================================================
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS")  # noqa: F405
CORS_ALLOW_ALL_ORIGINS = False


# ============================================================
# Cookie Settings – HTTPS only in production
# ============================================================
SIMPLE_JWT = {
    **SIMPLE_JWT,  # noqa: F405
    "AUTH_COOKIE_SECURE": True,
    "AUTH_COOKIE_SAMESITE": "Strict",
}

# REFRESH_COOKIE is cookie-based v2 token management
REFRESH_COOKIE_SECURE = True
REFRESH_COOKIE_SAMESITE = "Strict"


# ============================================================
# Amazon S3 / Cloudflare R2 Media Storage
# ============================================================
DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
STATICFILES_STORAGE = "storages.backends.s3boto3.S3StaticStorage"

AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID")  # noqa: F405
AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY")  # noqa: F405
AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME")  # noqa: F405
AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="ap-south-1")  # noqa: F405
AWS_S3_CUSTOM_DOMAIN = env("AWS_S3_CUSTOM_DOMAIN", default="")  # noqa: F405
AWS_DEFAULT_ACL = None
AWS_S3_FILE_OVERWRITE = False
AWS_QUERYSTRING_AUTH = True  # Private files require signed URLs

MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/media/" if AWS_S3_CUSTOM_DOMAIN else "/media/"


# ============================================================
# Email – SMTP in Production
# ============================================================
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"


# ============================================================
# Logging
# ============================================================
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}
