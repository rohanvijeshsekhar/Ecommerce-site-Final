"""
FAAZO – Enterprise Shipping Serializers
"""

from rest_framework import serializers
from .models import Shipment, ShipmentTrackingEvent
from apps.orders.serializers import OrderItemSerializer


class ShipmentTrackingEventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True, default="")

    class Meta:
        model = ShipmentTrackingEvent
        fields = [
            "id",
            "event_code",
            "event_label",
            "status_mapped",
            "event_timestamp",
            "location",
            "description",
            "event_source",
            "is_delivered",
            "created_by_name",
            "created_at",
        ]


class ShipmentSerializer(serializers.ModelSerializer):
    tracking_events = ShipmentTrackingEventSerializer(many=True, read_only=True)
    order_id = serializers.UUIDField(source="order.id", read_only=True)
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    order_status = serializers.CharField(source="order.status", read_only=True)
    payment_status = serializers.CharField(source="order.payment_status", read_only=True)
    payment_method = serializers.CharField(source="order.payment_method", read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.CharField(source="order.user.email", read_only=True)
    customer_phone = serializers.SerializerMethodField()
    shipping_address = serializers.SerializerMethodField()
    items = OrderItemSerializer(source="order.items", many=True, read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True, default="")
    is_cancellable = serializers.BooleanField(read_only=True)
    is_delivered = serializers.BooleanField(read_only=True)
    courier_submitted = serializers.BooleanField(read_only=True)
    needs_review = serializers.BooleanField(read_only=True)

    class Meta:
        model = Shipment
        fields = [
            "id",
            "shipment_number",
            "order_id",
            "order_number",
            "order_status",
            "payment_status",
            "payment_method",
            "customer_name",
            "customer_email",
            "customer_phone",
            "shipping_address",
            "items",
            "created_by_name",
            "provider",
            "courier_name",
            "delhivery_shipment_id",
            "external_shipment_id",
            "awb_number",
            "tracking_number",
            "pickup_request_id",
            "courier_reference",
            "tracking_url",
            "label_url",
            "manifest_url",
            "packing_status",
            "warehouse",
            "dispatch_location",
            "weight",
            "length",
            "width",
            "height",
            "volumetric_weight",
            "shipping_cost",
            "cod_amount",
            "delivery_type",
            "shipment_status",
            "packing_status",
            "pickup_status",
            "current_location",
            "current_hub",
            "pickup_scheduled_date",
            "pickup_date",
            "estimated_delivery_date",
            "delivered_at",
            "last_synced_at",
            "is_cancellable",
            "is_delivered",
            "courier_submitted",
            "needs_review",
            "tracking_events",
            "created_at",
            "updated_at",
        ]

    def get_customer_name(self, obj):
        if obj.order and obj.order.shipping_address and obj.order.shipping_address.full_name:
            return obj.order.shipping_address.full_name
        if obj.order and obj.order.user:
            return obj.order.user.full_name or obj.order.user.email
        return "Customer"

    def get_customer_phone(self, obj):
        if obj.order and obj.order.shipping_address and obj.order.shipping_address.mobile:
            return obj.order.shipping_address.mobile
        if obj.order and obj.order.user and hasattr(obj.order.user, 'mobile'):
            return getattr(obj.order.user, 'mobile', '')
        return ""

    def get_shipping_address(self, obj):
        addr = obj.order.shipping_address if obj.order else None
        if not addr:
            return None
        return {
            "full_name": addr.full_name,
            "mobile": addr.mobile,
            "line1": addr.line1,
            "line2": addr.line2,
            "city": addr.city,
            "state": addr.state,
            "pincode": addr.pincode,
            "address_type": getattr(addr, "address_type", "Home"),
        }


class ShipmentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views — no nested events."""
    order_id = serializers.UUIDField(source="order.id", read_only=True)
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    state = serializers.CharField(source="order.shipping_address.state", read_only=True, default="")
    city = serializers.CharField(source="order.shipping_address.city", read_only=True, default="")
    is_cancellable = serializers.BooleanField(read_only=True)
    courier_submitted = serializers.BooleanField(read_only=True)
    needs_review = serializers.BooleanField(read_only=True)

    class Meta:
        model = Shipment
        fields = [
            "id",
            "shipment_number",
            "order_id",
            "order_number",
            "customer_name",
            "customer_phone",
            "state",
            "city",
            "courier_name",
            "awb_number",
            "shipment_status",
            "packing_status",
            "pickup_status",
            "current_location",
            "current_hub",
            "estimated_delivery_date",
            "pickup_scheduled_date",
            "last_synced_at",
            "is_cancellable",
            "courier_submitted",
            "needs_review",
            "created_at",
        ]

    def get_customer_name(self, obj):
        if obj.order and obj.order.shipping_address and obj.order.shipping_address.full_name:
            return obj.order.shipping_address.full_name
        if obj.order and obj.order.user:
            return obj.order.user.full_name or obj.order.user.email
        return "Customer"

    def get_customer_phone(self, obj):
        if obj.order and obj.order.shipping_address and obj.order.shipping_address.mobile:
            return obj.order.shipping_address.mobile
        return ""

