# Config package
# Import the Celery application so it is initialized when Django starts.
# This ensures that @shared_task decorators across all apps work correctly.
from .celery import app as celery_app  # noqa: F401

__all__ = ("celery_app",)
