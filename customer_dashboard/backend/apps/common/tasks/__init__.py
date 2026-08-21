"""
FAAZO – Common Task Infrastructure

This package provides the base class and shared utilities for all
Celery tasks across the FAAZO platform.

Exports:
    FAAZOBaseTask   – Base task class with retry policy, logging, and
                      idempotency utilities.
"""

from .base import FAAZOBaseTask
# Import infrastructure test tasks so autodiscover_tasks() registers them.
# apps/common has a tasks/ subpackage instead of tasks.py, so we import
# explicitly rather than relying on Celery's filename-based discovery.
from . import tests as _infra_tests  # noqa: F401

__all__ = ["FAAZOBaseTask"]
