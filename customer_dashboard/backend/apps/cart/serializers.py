from decimal import Decimal
from rest_framework import serializers
from apps.products.models import Product
from apps.pricing.models import ProductPricing
from apps.inventory.models import ProductInventory
from apps.inventory.services import get_product_stock_info
from .models import Cart, CartItem

class ProductCartSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Product
        fields = ["id", "name", "slug", "image_url", "category_name", "sku", "status", "is_deleted"]

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
    is_in_stock = serializers.SerializerMethodField()
    has_sufficient_stock = serializers.SerializerMethodField()
    validation_error = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id", "product", "product_id", "quantity", "is_saved_for_later", "price",
            "original_price", "discount_percentage", "total_price", "stock_available",
            "is_in_stock", "has_sufficient_stock", "validation_error"
        ]

    def _get_stock_info(self, obj):
        return get_product_stock_info(obj.product)

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
        info = self._get_stock_info(obj)
        return info["available_stock"]

    def get_is_in_stock(self, obj):
        info = self._get_stock_info(obj)
        return info["is_available"]

    def get_has_sufficient_stock(self, obj):
        info = self._get_stock_info(obj)
        if not info["is_available"]:
            return False
        if info["allow_backorders"]:
            return True
        return obj.quantity <= info["available_stock"]

    def get_validation_error(self, obj):
        prod = obj.product
        if getattr(prod, "is_deleted", False) or getattr(prod, "status", "") != "published":
            return f"'{prod.name}' is no longer available."

        info = self._get_stock_info(obj)
        if not info["allow_backorders"]:
            if info["available_stock"] <= 0:
                return f"'{prod.name}' is currently out of stock."
            if obj.quantity > info["available_stock"]:
                return f"Only {info['available_stock']} unit(s) of '{prod.name}' available. Please reduce quantity."
        return None

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

        if getattr(product, "is_deleted", False) or getattr(product, "status", "") != "published":
            raise serializers.ValidationError({"product_id": f"'{product.name}' is no longer available."})

        stock_info = get_product_stock_info(product)
        if not stock_info["allow_backorders"]:
            if stock_info["available_stock"] <= 0:
                raise serializers.ValidationError(
                    {"quantity": f"'{product.name}' is currently out of stock."}
                )
            if quantity > stock_info["available_stock"]:
                raise serializers.ValidationError(
                    {"quantity": f"Insufficient stock available. Only {stock_info['available_stock']} unit(s) left for '{product.name}'."}
                )

        return data


class CartSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    saved_items = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    saved_count = serializers.SerializerMethodField()
    is_checkout_allowed = serializers.SerializerMethodField()
    stock_warnings = serializers.SerializerMethodField()

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
            "is_checkout_allowed", "stock_warnings",
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

    def get_is_checkout_allowed(self, obj):
        active_items = self._get_active_items(obj)
        if not active_items.exists():
            return False
        for item in active_items:
            prod = item.product
            if getattr(prod, "is_deleted", False) or getattr(prod, "status", "") != "published":
                return False
            stock_info = get_product_stock_info(prod)
            if not stock_info["allow_backorders"] and (stock_info["available_stock"] <= 0 or item.quantity > stock_info["available_stock"]):
                return False
        return True

    def get_stock_warnings(self, obj):
        warnings = []
        for item in self._get_active_items(obj):
            prod = item.product
            if getattr(prod, "is_deleted", False) or getattr(prod, "status", "") != "published":
                warnings.append({
                    "product_id": str(prod.id),
                    "product_name": prod.name,
                    "message": f"'{prod.name}' is no longer available.",
                    "stock_available": 0,
                    "requested_quantity": item.quantity,
                })
                continue

            stock_info = get_product_stock_info(prod)
            if not stock_info["allow_backorders"]:
                if stock_info["available_stock"] <= 0:
                    warnings.append({
                        "product_id": str(prod.id),
                        "product_name": prod.name,
                        "message": f"'{prod.name}' is currently out of stock.",
                        "stock_available": 0,
                        "requested_quantity": item.quantity,
                    })
                elif item.quantity > stock_info["available_stock"]:
                    warnings.append({
                        "product_id": str(prod.id),
                        "product_name": prod.name,
                        "message": f"Only {stock_info['available_stock']} unit(s) of '{prod.name}' available (requested: {item.quantity}).",
                        "stock_available": stock_info["available_stock"],
                        "requested_quantity": item.quantity,
                    })
        return warnings

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

