from django.contrib import admin
from .models import OutboxEvent


@admin.register(OutboxEvent)
class OutboxEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "aggregate_id", "status", "attempt_count", "next_retry_at", "created_at", "processed_at")
    list_filter = ("status", "event_type", "aggregate_type")
    search_fields = ("aggregate_id", "idempotency_key", "last_error")
    readonly_fields = ("created_at", "updated_at", "processed_at")
