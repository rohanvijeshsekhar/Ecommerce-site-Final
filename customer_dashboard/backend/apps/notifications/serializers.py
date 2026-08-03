from rest_framework import serializers
from apps.notifications.models import Notification, NotificationDelivery


class NotificationDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationDelivery
        fields = [
            "id",
            "channel",
            "status",
            "provider_response",
            "attempt_count",
            "sent_at",
            "error_message",
            "created_at",
        ]


class NotificationSerializer(serializers.ModelSerializer):
    deliveries = NotificationDeliverySerializer(many=True, read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "notification_type",
            "category",
            "priority",
            "action_url",
            "metadata",
            "is_read",
            "read_at",
            "expires_at",
            "is_expired",
            "deliveries",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_read", "read_at", "created_at", "updated_at"]
