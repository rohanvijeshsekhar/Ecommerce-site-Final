"""
FAAZO Backend – Production Settings
Uses PostgreSQL. Debug disabled. Strict CORS. Secure cookies. Persistent Local VPS Media.
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

# Reverse Proxy Security & Host Resolution (Faazo Live Nginx)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True


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
# Persistent Local VPS Disk Storage
# Inherits MEDIA_URL and MEDIA_ROOT (env-configurable) from base.py
# ============================================================
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.ManifestStaticFilesStorage",
    },
}


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


# ============================================================
# Celery – Production Overrides
# ============================================================
# REDIS_URL must be set in production environment variables.
# Eager mode is explicitly disabled — tasks MUST run through
# the real Redis → Worker pipeline in production.
# There is no fallback. Missing Redis = visible failure.
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_EAGER_PROPAGATES = False
