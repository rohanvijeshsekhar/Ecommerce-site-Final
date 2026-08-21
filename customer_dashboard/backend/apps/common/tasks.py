"""
FAAZO – Common App Task Discovery Entry Point

Celery's autodiscover_tasks() looks for 'tasks.py' in each app directory.
Since FAAZO's common tasks are organized in a tasks/ subpackage, this file
serves as the discovery entry point that imports the subpackage contents.

This file imports all task modules so they register with the Celery app.
"""

# Infrastructure verification tasks
from apps.common.tasks.tests import (  # noqa: F401
    celery_ping,
    ping_with_retry,
    ping_fail,
)
