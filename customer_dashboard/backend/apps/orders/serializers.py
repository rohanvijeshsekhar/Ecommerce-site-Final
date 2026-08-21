from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.users.serializers import AddressSerializer
from .models import Order, OrderItem, OrderStatusHistory

User = get_user_model()

class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.full_name", read_only=True)
    changed_by_email = serializers.CharField(source="changed_by.email", read_only=True)

    class Meta:
        model = OrderStatusHistory
        fields = ["id", "status", "changed_by_name", "changed_by_email", "notes", "created_at"]


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id", "product_name", "product_slug", "image_url", "quantity", "price",
            "gst_rate", "hsn_code", "taxable_value_per_unit", "taxable_subtotal",
            "cgst_amount", "sgst_amount", "igst_amount", "total_gst_amount", "is_intra_state"
        ]

    def get_image_url(self, obj):
        primary = obj.product.images.filter(is_primary=True).first()
        if primary:
            return primary.image.url
        first = obj.product.images.first()
        if first:
            return first.image.url
        return None


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    shipping_address_detail = AddressSerializer(source="shipping_address", read_only=True)
    shipping_address_label = serializers.CharField(source="shipping_address.label", read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    
    # Payment details
    razorpay_payment_id = serializers.SerializerMethodField()
    razorpay_order_id = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    
    # Customer details (for admin view)
    customer_email = serializers.CharField(source="user.email", read_only=True)
    customer_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "invoice_number", "shipping_address_label", 
            "shipping_address_detail", "status", "payment_method",
            "mrp_subtotal", "selling_subtotal", "taxable_subtotal", "gst_amount", "shipping_fee",
            "total_amount", "items", "created_at", "updated_at",
            "status_history", "razorpay_payment_id", "razorpay_order_id",
            "payment_status", "customer_email", "customer_name",
            "estimated_delivery_date", "tracking_number", "shipping_carrier",
            "notes", "cancellation_reason", "cancelled_at",
            "packed_at", "shipped_at", "delivered_at"
        ]

    def get_razorpay_payment_id(self, obj) -> str:
        if hasattr(obj, 'payment') and obj.payment:
            return obj.payment.razorpay_payment_id
        return ""

    def get_razorpay_order_id(self, obj) -> str:
        if hasattr(obj, 'payment') and obj.payment:
            return obj.payment.razorpay_order_id
        return ""

    def get_payment_status(self, obj) -> str:
        if hasattr(obj, 'payment') and obj.payment:
            return obj.payment.status
        return "pending"
