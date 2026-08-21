"""
FAAZO – Celery Application

This module creates and configures the Celery application instance.
It is imported by config/__init__.py so that `celery` is always
auto-discovered when Django starts.

Usage:
    celery -A config worker -l INFO
    celery -A config worker -l INFO -Q notifications,shipping

Security:
    All Celery configuration is read from Django settings which in turn
    read from environment variables. No credentials are hardcoded here.
"""

import os
from celery import Celery

# Ensure the Django settings module is set before Celery reads Django config.
# Default to development; production deployments set DJANGO_SETTINGS_MODULE
# explicitly in the process environment.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("faazo")

# Pull all CELERY_* keys from Django settings.
# This means all Celery configuration lives in settings/base.py and can be
# overridden per-environment (development.py, production.py) without
# touching this file.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks.
# We use an explicit include list to guarantee discovery regardless of whether
# an app uses tasks.py or a tasks/ subpackage. This is more reliable than
# relying solely on Celery's filename-based autodiscover in INSTALLED_APPS.
app.autodiscover_tasks([
    "apps.common",           # apps/common/tasks.py  → faazo.infra.*
    "apps.notifications",    # apps/notifications/tasks.py → faazo.notifications.*
    "apps.orders",           # apps/orders/tasks.py  → faazo.orders.*
    "apps.shipping",         # apps/shipping/tasks.py → faazo.shipping.*
    "apps.returns",          # apps/returns/tasks.py → faazo.returns.*
])


@app.task(bind=True, name="faazo.debug.report")
def debug_task(self):
    """
    Built-in diagnostic task.
    Run with: from config.celery import debug_task; debug_task.delay()
    """
    return f"Request: {self.request!r}"
