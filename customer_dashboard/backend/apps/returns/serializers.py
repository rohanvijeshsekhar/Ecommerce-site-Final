"""
FAAZO – Return Module Serializers

DRF Serializers for Customer and Admin Return REST APIs.
- Strict input validation for evidence uploads and item quantities.
- Server-side read-only attributes for calculated refund amounts.
"""

from rest_framework import serializers
from apps.returns.models import (
    ReturnRequest,
    ReturnItem,
    ReturnEvidence,
    ReturnEvent,
    Refund,
    ReturnShipment,
    ReturnRequestType,
    ReturnReason,
    EvidenceType,
)


class ReturnEvidenceSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.full_name", read_only=True)

    class Meta:
        model = ReturnEvidence
        fields = [
            "id",
            "file",
            "file_type",
            "file_size",
            "evidence_type",
            "uploaded_by",
            "uploaded_by_name",
            "created_at",
        ]
        read_only_fields = ["id", "file_type", "file_size", "uploaded_by", "created_at"]


class ReturnItemSerializer(serializers.ModelSerializer):
    product_id = serializers.CharField(source="order_item.product.id", read_only=True)
    product_name = serializers.CharField(source="order_item.product.name", read_only=True)
    product_slug = serializers.CharField(source="order_item.product.slug", read_only=True)

    class Meta:
        model = ReturnItem
        fields = [
            "id",
            "order_item",
            "product_id",
            "product_name",
            "product_slug",
            "requested_quantity",
            "approved_quantity",
            "unit_price",
            "refund_amount",
        ]
        read_only_fields = ["id", "approved_quantity", "unit_price", "refund_amount"]


class ReturnEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", default="System", read_only=True)

    class Meta:
        model = ReturnEvent
        fields = [
            "id",
            "from_status",
            "to_status",
            "actor",
            "actor_name",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = [
            "id",
            "amount",
            "status",
            "razorpay_refund_id",
            "attempts",
            "failure_reason",
            "created_at",
        ]
        read_only_fields = ["id", "amount", "status", "razorpay_refund_id", "attempts", "failure_reason", "created_at"]


class ReturnShipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReturnShipment
        fields = [
            "id",
            "courier_name",
            "awb_number",
            "pickup_status",
            "pickup_scheduled_date",
            "tracking_url",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ReturnRequestSerializer(serializers.ModelSerializer):
    customer_email = serializers.EmailField(source="customer.email", read_only=True)
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    items = ReturnItemSerializer(many=True, read_only=True)
    evidence = ReturnEvidenceSerializer(many=True, read_only=True)
    events = ReturnEventSerializer(many=True, read_only=True)
    refund = RefundSerializer(read_only=True)
    shipment = ReturnShipmentSerializer(read_only=True)
    replacement_order_number = serializers.CharField(source="replacement_order.order_number", read_only=True)

    class Meta:
        model = ReturnRequest
        fields = [
            "id",
            "customer",
            "customer_email",
            "customer_name",
            "order",
            "order_number",
            "request_type",
            "status",
            "reason",
            "customer_notes",
            "admin_notes",
            "rejection_reason",
            "total_refund_amount",
            "replacement_order",
            "replacement_order_number",
            "is_inventory_restored",
            "items",
            "evidence",
            "events",
            "refund",
            "shipment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "customer",
            "status",
            "admin_notes",
            "rejection_reason",
            "total_refund_amount",
            "replacement_order",
            "is_inventory_restored",
            "created_at",
            "updated_at",
        ]


class CreateReturnItemInputSerializer(serializers.Serializer):
    order_item_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)


class CreateReturnRequestSerializer(serializers.Serializer):
    order_id = serializers.UUIDField()
    request_type = serializers.ChoiceField(choices=ReturnRequestType.choices, default=ReturnRequestType.RETURN_REFUND)
    reason = serializers.ChoiceField(choices=ReturnReason.choices)
    customer_notes = serializers.CharField(required=False, allow_blank=True, default="")
    items = CreateReturnItemInputSerializer(many=True)
