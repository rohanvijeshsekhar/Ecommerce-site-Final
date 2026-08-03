from rest_framework import serializers
from apps.products.serializers import ProductListSerializer
from .models import BestSellerBanner, BestSellerProduct


class BestSellerBannerSerializer(serializers.ModelSerializer):
    banner_image_url = serializers.SerializerMethodField()

    class Meta:
        model = BestSellerBanner
        fields = [
            "id",
            "title",
            "subtitle",
            "banner_image",
            "banner_image_url",
            "button_text",
            "button_link",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_banner_image_url(self, obj):
        if obj.banner_image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.banner_image.url)
            return obj.banner_image.url
        return None


class BestSellerProductSerializer(serializers.ModelSerializer):
    """
    Storefront serializer — embeds full ProductListSerializer payload for product cards.
    """

    product = ProductListSerializer(read_only=True)

    class Meta:
        model = BestSellerProduct
        fields = [
            "id",
            "display_order",
            "is_active",
            "product",
            "created_at",
        ]


class BestSellerProductAdminSerializer(serializers.ModelSerializer):
    """
    Admin serializer — accepts product FK as write field, returns embedded product data for display.
    """

    product_detail = ProductListSerializer(source="product", read_only=True)
    product_name = serializers.SerializerMethodField()
    product_sku = serializers.SerializerMethodField()

    class Meta:
        model = BestSellerProduct
        fields = [
            "id",
            "product",
            "product_detail",
            "product_name",
            "product_sku",
            "display_order",
            "is_active",
            "created_at",
        ]

    def get_product_name(self, obj):
        return obj.product.name if obj.product else ""

    def get_product_sku(self, obj):
        return obj.product.sku if obj.product else ""
