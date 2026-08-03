from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.support.models import SupportTicket, SupportMessage, TicketTimeline, FAQCategory, FAQItem, FAQFeedback
from apps.orders.models import Order
from apps.products.models import Product

User = get_user_model()

class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name", "role"]

class OrderMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ["id", "order_number", "created_at"]

class ProductMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "sku", "slug"]

class SupportMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)
    sender_role = serializers.CharField(source="sender.role", read_only=True)
    attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = SupportMessage
        fields = ["id", "ticket", "sender", "sender_name", "sender_role", "message", "attachment", "attachment_url", "created_at"]
        read_only_fields = ["id", "sender", "created_at"]

    def get_attachment_url(self, obj):
        if obj.attachment:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.attachment.url)
            return obj.attachment.url
        return None

class TicketTimelineSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source="performed_by.full_name", read_only=True)
    performed_by_role = serializers.CharField(source="performed_by.role", read_only=True)

    class Meta:
        model = TicketTimeline
        fields = ["id", "ticket", "action", "performed_by", "performed_by_name", "performed_by_role", "notes", "created_at"]
        read_only_fields = ["id", "created_at"]

class SupportTicketSerializer(serializers.ModelSerializer):
    customer_detail = UserMinimalSerializer(source="user", read_only=True)
    assigned_admin_detail = UserMinimalSerializer(source="assigned_admin", read_only=True)
    order_detail = OrderMinimalSerializer(source="related_order", read_only=True)
    product_detail = ProductMinimalSerializer(source="related_product", read_only=True)
    messages = SupportMessageSerializer(many=True, read_only=True)
    timeline = TicketTimelineSerializer(many=True, read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            "id", "ticket_number", "user", "customer_detail", "subject",
            "category", "priority", "description", "status",
            "assigned_admin", "assigned_admin_detail",
            "related_order", "order_detail",
            "related_product", "product_detail",
            "messages", "timeline", "created_at", "updated_at", "resolved_at"
        ]
        read_only_fields = [
            "id", "ticket_number", "user", "customer_detail", "status",
            "assigned_admin", "assigned_admin_detail", "messages", "timeline",
            "created_at", "updated_at", "resolved_at"
        ]


class FAQItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)

    class Meta:
        model = FAQItem
        fields = [
            "id",
            "category",
            "category_name",
            "category_slug",
            "question",
            "slug",
            "answer",
            "action_button_label",
            "action_button_url",
            "action_button_type",
            "icon_name",
            "display_order",
            "is_featured",
            "helpful_count",
            "unhelpful_count",
            "created_at",
        ]
        read_only_fields = fields


class FAQCategorySerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()

    class Meta:
        model = FAQCategory
        fields = ["id", "name", "slug", "icon", "display_order", "items"]
        read_only_fields = fields

    def get_items(self, obj):
        active_items = obj.items.filter(is_active=True).order_by("display_order", "created_at")
        return FAQItemSerializer(active_items, many=True).data

