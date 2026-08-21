from decimal import Decimal
from rest_framework import serializers
from apps.products.models import Product
from apps.pricing.models import ProductPricing
from apps.inventory.models import ProductInventory
from .models import Cart, CartItem

class ProductCartSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Product
        fields = ["id", "name", "slug", "image_url", "category_name", "sku"]

    def get_image_url(self, obj):
        primary = obj.images.filter(is_primary=True).first()
        if primary:
            return primary.image.url
        first = obj.images.first()
        if first:
            return first.image.url
        return None

class CartItemSerializer(serializers.ModelSerializer):
    product = ProductCartSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source="product", write_only=True
    )
    price = serializers.SerializerMethodField()
    original_price = serializers.SerializerMethodField()
    discount_percentage = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()
    stock_available = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id", "product", "product_id", "quantity", "is_saved_for_later", "price",
            "original_price", "discount_percentage", "total_price", "stock_available"
        ]

    def get_price(self, obj):
        user = self.context['request'].user
        pricing = getattr(obj.product, 'pricing', None)
        if not pricing:
            return 0.0
        # Check B2B dealer pricing
        if user.is_authenticated and user.role == 'dealer' and user.dealer_status == 'approved':
            if pricing.dealer_price is not None:
                return float(pricing.dealer_price)
        return float(pricing.effective_price)

    def get_original_price(self, obj):
        pricing = getattr(obj.product, 'pricing', None)
        if not pricing:
            return 0.0
        return float(pricing.mrp)

    def get_discount_percentage(self, obj):
        price = self.get_price(obj)
        mrp = self.get_original_price(obj)
        if not mrp or price >= mrp:
            return 0.0
        return round(((mrp - price) / mrp) * 100, 1)

    def get_total_price(self, obj):
        return round(self.get_price(obj) * obj.quantity, 2)

    def get_stock_available(self, obj):
        inventory = getattr(obj.product, 'inventory', None)
        if not inventory:
            return 0
        return inventory.available_stock

    def validate(self, data):
        product = data.get("product")
        if product is None and self.instance:
            product = self.instance.product

        quantity = data.get("quantity")
        if quantity is None:
            if self.instance:
                quantity = self.instance.quantity
            else:
                quantity = 1

        if not product:
            raise serializers.ValidationError({"product_id": "Product details not found."})

        inventory = getattr(product, 'inventory', None)
        if not inventory:
            raise serializers.ValidationError({"quantity": "Inventory details not found for this product."})

        if not inventory.allow_backorders and quantity > inventory.available_stock:
            raise serializers.ValidationError(
                {"quantity": f"Insufficient stock available. Only {inventory.available_stock} units left."}
            )

        return data


class CartSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    saved_items = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    saved_count = serializers.SerializerMethodField()

    mrp_subtotal = serializers.SerializerMethodField()
    selling_subtotal = serializers.SerializerMethodField()
    taxable_subtotal = serializers.SerializerMethodField()
    savings = serializers.SerializerMethodField()
    shipping = serializers.SerializerMethodField()
    gst_amount = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            "id", "items", "saved_items", "item_count", "saved_count",
            "mrp_subtotal", "selling_subtotal", "taxable_subtotal",
            "savings", "shipping", "gst_amount", "total_amount"
        ]

    def _get_active_items(self, obj):
        return obj.items.filter(is_saved_for_later=False)

    def _get_saved_items(self, obj):
        return obj.items.filter(is_saved_for_later=True)

    def get_items(self, obj):
        active = self._get_active_items(obj)
        return CartItemSerializer(active, many=True, context=self.context).data

    def get_saved_items(self, obj):
        saved = self._get_saved_items(obj)
        return CartItemSerializer(saved, many=True, context=self.context).data

    def get_item_count(self, obj):
        return sum(item.quantity for item in self._get_active_items(obj))

    def get_saved_count(self, obj):
        return self._get_saved_items(obj).count()

    def _calculate_tax_summary(self, obj):
        from apps.common.tax_engine import calculate_order_tax_summary, get_warehouse_state
        user = self.context['request'].user
        line_items = []
        for item in self._get_active_items(obj):
            pricing = getattr(item.product, 'pricing', None)
            if pricing:
                price = (
                    pricing.dealer_price
                    if (user.is_authenticated and user.role == 'dealer' and user.dealer_status == 'approved' and pricing.dealer_price is not None)
                    else pricing.effective_price
                )
                line_items.append({
                    "inclusive_price": price,
                    "gst_rate": pricing.gst_percentage,
                    "quantity": item.quantity
                })
        return calculate_order_tax_summary(
            line_items=line_items,
            shipping_fee=Decimal("0.00"),
            is_intra_state=True
        )

    def get_mrp_subtotal(self, obj):
        total = Decimal("0.00")
        for item in self._get_active_items(obj):
            pricing = getattr(item.product, 'pricing', None)
            if pricing:
                total += pricing.mrp * item.quantity
        return float(round(total, 2))

    def get_selling_subtotal(self, obj):
        summary = self._calculate_tax_summary(obj)
        return float(summary["selling_subtotal"])

    def get_taxable_subtotal(self, obj):
        summary = self._calculate_tax_summary(obj)
        return float(summary["taxable_subtotal"])

    def get_savings(self, obj):
        return float(round(Decimal(str(self.get_mrp_subtotal(obj))) - Decimal(str(self.get_selling_subtotal(obj))), 2))

    def get_shipping(self, obj):
        return 0.0

    def get_gst_amount(self, obj):
        summary = self._calculate_tax_summary(obj)
        return float(summary["total_gst"])

    def get_total_amount(self, obj):
        summary = self._calculate_tax_summary(obj)
        return float(summary["total_amount"])

