from django.urls import path
from apps.notifications.views import (
    NotificationListView,
    NotificationUnreadCountView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    NotificationDeleteView,
    NotificationDeleteAllView,
)

app_name = "notifications"

urlpatterns = [
    # ── Notification Feed & Operations ───────────────────────────
    path("", NotificationListView.as_view(), name="notification-list"),
    path("unread-count/", NotificationUnreadCountView.as_view(), name="notification-unread-count"),
    path("read-all/", NotificationMarkAllReadView.as_view(), name="notification-mark-all-read"),
    path("<uuid:pk>/read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
    path("<uuid:pk>/", NotificationDeleteView.as_view(), name="notification-delete"),
    path("clear-all/", NotificationDeleteAllView.as_view(), name="notification-delete-all"),
]
