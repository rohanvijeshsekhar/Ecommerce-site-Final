"""
FAAZO – Notification Signal & Event Dispatcher
Emits events upon notification creation to allow real-time subscribers (WebSockets, SSE, Push, Audit) to publish asynchronously.
"""

from django.dispatch import Signal

# Signal fired whenever a new Notification is created
# Providing args: notification, context, deliveries
notification_created = Signal()
