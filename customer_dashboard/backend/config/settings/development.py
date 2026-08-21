"""
FAAZO Backend – Development Settings
Uses SQLite. Debug mode enabled. Relaxed CORS for local frontend.
"""

from .base import *  # noqa: F401, F403

# ============================================================
# Development Overrides
# ============================================================
DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]


# ============================================================
# Development Database (SQLite)
# ============================================================
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
    }
}


# ============================================================
# CORS – Allow Vite React Dev Server & Next.js Dev Server
# ============================================================
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


# ============================================================
# Email – Configurable via environment (defaults to console for dev)
# ============================================================
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")

# Celery in Development – Execute tasks in-process immediately
CELERY_TASK_ALWAYS_EAGER = env.bool("CELERY_TASK_ALWAYS_EAGER", default=True)
CELERY_TASK_EAGER_PROPAGATES = True


# ============================================================
# Debug Toolbar (Development only)
# ============================================================
INSTALLED_APPS += ["debug_toolbar"]  # noqa: F405
MIDDLEWARE += ["debug_toolbar.middleware.DebugToolbarMiddleware"]  # noqa: F405
INTERNAL_IPS = ["127.0.0.1"]


# ============================================================
# Simplified Static Files for Dev
# ============================================================
STATICFILES_DIRS = []


# ============================================================
# Cookie Settings – No HTTPS required in dev
# ============================================================
SIMPLE_JWT = {
    **SIMPLE_JWT,  # noqa: F405
    "AUTH_COOKIE_SECURE": False,
}

# ============================================================
# Lockout overrides – Lenient during development
# ============================================================
LOGIN_FAIL_MAX_ATTEMPTS = 999999
LOGIN_FAIL_LOCKOUT_MINUTES = 1


# ============================================================
# Celery – Development Overrides
# ============================================================
# The standard dev workflow uses real Redis + a Celery worker.
# Run: celery -A config worker -l INFO
#
# CELERY_TASK_ALWAYS_EAGER stays False here.
# To enable eager mode as a temporary fallback, add to .env:
#   CELERY_TASK_ALWAYS_EAGER=True
#
# If eager mode IS enabled in dev, propagate exceptions immediately
# so task bugs surface rather than being swallowed.
CELERY_TASK_EAGER_PROPAGATES = True

# Store task results in development so result.get() works in shell.
CELERY_TASK_STORE_EAGER_RESULT = True
