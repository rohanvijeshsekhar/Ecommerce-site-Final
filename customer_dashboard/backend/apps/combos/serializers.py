from rest_framework import serializers
from .models import ComboDeal, ComboDealProduct, ComboDealImage, ComboDealBannerSetting
from apps.products.serializers import ProductListSerializer


def build_absolute_image_url(request, field):
    """Return an absolute URL for an ImageField value, or None if empty."""
    if not field:
        return None
    try:
        url = field.url
    except (ValueError, AttributeError):
        return None
    if request:
        return request.build_absolute_uri(url)
    return url


class ComboDealImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = ComboDealImage
        fields = ["id", "image", "alt_text", "sort_order"]
        read_only_fields = ["id"]

    def get_image(self, obj):
        return build_absolute_image_url(self.context.get("request"), obj.image)


class ComboDealProductReadSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)

    class Meta:
        model = ComboDealProduct
        fields = ["id", "product", "quantity"]
        read_only_fields = ["id"]


class ComboDealProductWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComboDealProduct
        fields = ["product", "quantity"]


class ComboDealReadSerializer(serializers.ModelSerializer):
    images = ComboDealImageSerializer(many=True, read_only=True)
    combo_products = ComboDealProductReadSerializer(many=True, read_only=True)
    discount_percentage = serializers.FloatField(read_only=True)
    you_save = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    effective_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    is_offer_active = serializers.BooleanField(read_only=True)
    thumbnail = serializers.SerializerMethodField()
    banner = serializers.SerializerMethodField()

    class Meta:
        model = ComboDeal
        fields = [
            "id", "title", "slug", "short_description", "full_description",
            "thumbnail", "banner", "original_price", "combo_price", "dealer_price",
            "offer_price", "offer_start_date", "offer_end_date",
            "is_featured", "status", "inventory",
            "meta_title", "meta_description", "meta_keywords",
            "images", "combo_products", "discount_percentage", "you_save",
            "effective_price", "is_offer_active", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]

    def get_thumbnail(self, obj):
        return build_absolute_image_url(self.context.get("request"), obj.thumbnail)

    def get_banner(self, obj):
        return build_absolute_image_url(self.context.get("request"), obj.banner)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Expose dealer_price only to admins or approved dealers.
        # Pending/rejected dealers and customers receive retail pricing only.
        request = self.context.get("request")
        user = request.user if request else None

        is_privileged = False
        if user and user.is_authenticated:
            role = getattr(user, "role", None)
            if role == "admin":
                is_privileged = True
            elif role == "dealer":
                # Only approved dealers may see the wholesale price
                dealer_status = getattr(user, "dealer_status", None)
                is_privileged = dealer_status == "approved"

        if not is_privileged:
            representation.pop("dealer_price", None)

        return representation


class ComboDealWriteSerializer(serializers.ModelSerializer):
    products = ComboDealProductWriteSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = ComboDeal
        fields = [
            "title", "short_description", "full_description",
            "thumbnail", "banner", "combo_price", "dealer_price",
            "offer_price", "offer_start_date", "offer_end_date",
            "is_featured", "status", "inventory",
            "meta_title", "meta_description", "meta_keywords",
            "products"
        ]

    def validate_combo_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Combo price cannot be negative.")
        return value

    def validate_dealer_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Dealer price cannot be negative.")
        return value

    def validate_offer_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Offer price cannot be negative.")
        return value

    def create(self, validated_data):
        products_data = validated_data.pop("products", [])
        combo_deal = ComboDeal.objects.create(**validated_data)
        for p_data in products_data:
            ComboDealProduct.objects.create(combo_deal=combo_deal, **p_data)
        combo_deal.calculate_original_price()
        return combo_deal

    def update(self, instance, validated_data):
        products_data = validated_data.pop("products", None)
        instance = super().update(instance, validated_data)
        if products_data is not None:
            # Delete old relations via queryset to avoid per-instance signals
            instance.combo_products.all().delete()
            # Create new relations
            for p_data in products_data:
                ComboDealProduct.objects.create(combo_deal=instance, **p_data)
        instance.calculate_original_price()
        return instance


class ComboDealBannerSettingSerializer(serializers.ModelSerializer):
    """
    Writable serializer for the combo deals page banner settings.

    banner_image is declared as an ImageField so that multipart uploads
    are accepted on PATCH/PUT.  On read (to_representation) we convert the
    relative storage path to a full absolute URL so the frontend can use it
    directly in an <img> tag.
    """

    # Writable ImageField — required=False so a PATCH without an image works fine.
    banner_image = serializers.ImageField(required=False, allow_null=True, allow_empty_file=False)

    class Meta:
        model = ComboDealBannerSetting
        fields = ["badge_text", "title", "description", "banner_image"]

    def to_representation(self, instance):
        """Return absolute URL for banner_image instead of a raw path."""
        rep = super().to_representation(instance)
        rep["banner_image"] = build_absolute_image_url(
            self.context.get("request"), instance.banner_image
        )
        return rep

