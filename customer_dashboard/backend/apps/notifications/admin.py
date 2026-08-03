from django.contrib import admin
from apps.notifications.models import Notification, NotificationDelivery


class NotificationDeliveryInline(admin.TabularInline):
    model = NotificationDelivery
    extra = 0
    readonly_fields = ["channel", "status", "attempt_count", "sent_at", "error_message", "created_at"]
    can_delete = False


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "notification_type", "category", "priority", "is_read", "created_at"]
    list_filter = ["category", "priority", "notification_type", "is_read", "created_at"]
    search_fields = ["user__email", "title", "message", "idempotency_key"]
    readonly_fields = ["id", "created_at", "updated_at"]
    inlines = [NotificationDeliveryInline]
    ordering = ["-created_at"]


@admin.register(NotificationDelivery)
class NotificationDeliveryAdmin(admin.ModelAdmin):
    list_display = ["id", "notification", "channel", "status", "attempt_count", "sent_at", "created_at"]
    list_filter = ["channel", "status", "created_at"]
    search_fields = ["notification__user__email", "notification__title", "error_message"]
    readonly_fields = ["id", "created_at", "updated_at"]
    ordering = ["-created_at"]
