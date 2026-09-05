"""
FAAZO – Inventory Serializers (Phase 6A)
"""

from rest_framework import serializers
from .models import ProductInventory


class ProductInventorySerializer(serializers.ModelSerializer):
    """
    Full inventory serializer for admin read/write.
    Computed fields (available_stock, stock_status) are read-only.
    reserved_stock is read-only (managed by the Orders module).
    """

    available_stock = serializers.IntegerField(read_only=True)
    stock_status    = serializers.CharField(read_only=True)
    is_purchasable  = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProductInventory
        fields = [
            "id",
            "current_stock",
            "reserved_stock",
            "available_stock",
            "low_stock_threshold",
            "allow_backorders",
            # Computed
            "stock_status",
            "is_purchasable",
            # Timestamps
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "reserved_stock",
            "available_stock",
            "stock_status",
            "is_purchasable",
            "created_at",
            "updated_at",
        ]

    def validate_current_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock cannot be negative.")
        return value

    def validate_low_stock_threshold(self, value):
        if value < 0:
            raise serializers.ValidationError("Threshold cannot be negative.")
        return value

    def validate(self, attrs):
        # Determine effective values during partial updates
        current_stock = attrs.get("current_stock", getattr(self.instance, "current_stock", 0))
        reserved_stock = getattr(self.instance, "reserved_stock", 0)
        allow_backorders = attrs.get("allow_backorders", getattr(self.instance, "allow_backorders", False))

        if not allow_backorders and current_stock < reserved_stock:
            raise serializers.ValidationError({
                "current_stock": (
                    f"Current stock ({current_stock}) cannot be less than reserved stock ({reserved_stock}) "
                    f"allocated to pending orders. Please enable 'Allow Backorders' or fulfill pending orders first."
                )
            })
        return attrs


class ProductInventoryPublicSerializer(serializers.ModelSerializer):
    """
    Customer-safe inventory serializer.
    Only exposes stock_status and is_purchasable — no internal quantities.
    """

    available_stock = serializers.IntegerField(read_only=True)
    stock_status    = serializers.CharField(read_only=True)
    is_purchasable  = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProductInventory
        fields = ["stock_status", "is_purchasable", "allow_backorders"]
        read_only_fields = fields


class ProductInventoryInlineSerializer(serializers.ModelSerializer):
    """
    Minimal inline serializer for product listing cards.
    """

    stock_status = serializers.CharField(read_only=True)

    class Meta:
        model = ProductInventory
        fields = ["stock_status", "current_stock", "available_stock"]
        read_only_fields = fields

    available_stock = serializers.IntegerField(read_only=True)
