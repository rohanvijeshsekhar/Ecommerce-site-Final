from rest_framework import serializers
from .models import ClinicalSolution, ClinicalSolutionProduct
from apps.products.models import Product


class ClinicalSolutionProductSerializer(serializers.ModelSerializer):
    product_id = serializers.ReadOnlyField(source="product.id")
    product_name = serializers.ReadOnlyField(source="product.name")
    product_sku = serializers.ReadOnlyField(source="product.sku")
    product_price = serializers.ReadOnlyField(source="product.price")
    product_image = serializers.SerializerMethodField(method_name="get_product_image")
    product_brand = serializers.ReadOnlyField(source="product.brand.name", default="")
    product_category = serializers.ReadOnlyField(source="product.category.name", default="")
    product_rating = serializers.ReadOnlyField(source="product.rating", default=4.8)

    class Meta:
        model = ClinicalSolutionProduct
        fields = [
            "id",
            "product_id",
            "product_name",
            "product_sku",
            "product_price",
            "product_image",
            "product_brand",
            "product_category",
            "product_rating",
            "display_order",
            "is_featured",
            "created_at",
        ]

    def get_product_image(self, obj):
        if obj.product:
            if hasattr(obj.product, 'primary_image_url') and obj.product.primary_image_url:
                return obj.product.primary_image_url
            if hasattr(obj.product, 'images') and obj.product.images.exists():
                return obj.product.images.first().image.url
        return "/images/bestseller_handpiece.png"


class ClinicalSolutionListSerializer(serializers.ModelSerializer):
    banner = serializers.SerializerMethodField(method_name="get_banner")
    thumbnail = serializers.SerializerMethodField(method_name="get_thumbnail")
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ClinicalSolution
        fields = [
            "id",
            "title",
            "slug",
            "short_description",
            "banner",
            "thumbnail",
            "display_order",
            "is_active",
            "show_on_homepage",
            "product_count",
            "created_at",
            "updated_at",
        ]

    def get_banner(self, obj):
        if obj.banner_image:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.banner_image.url) if request else obj.banner_image.url
        return obj.banner_image_url or "/images/hero1_ecommerce.png"

    def get_thumbnail(self, obj):
        if obj.thumbnail_image:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.thumbnail_image.url) if request else obj.thumbnail_image.url
        return obj.thumbnail_image_url or "/images/category_equipment.png"


class ClinicalSolutionDetailSerializer(serializers.ModelSerializer):
    banner = serializers.SerializerMethodField(method_name="get_banner")
    thumbnail = serializers.SerializerMethodField(method_name="get_thumbnail")
    products = ClinicalSolutionProductSerializer(source="solution_products", many=True, read_only=True)
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ClinicalSolution
        fields = [
            "id",
            "title",
            "slug",
            "short_description",
            "description",
            "banner",
            "thumbnail",
            "display_order",
            "is_active",
            "show_on_homepage",
            "seo_title",
            "seo_description",
            "seo_keywords",
            "product_count",
            "products",
            "created_at",
            "updated_at",
        ]

    def get_banner(self, obj):
        if obj.banner_image:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.banner_image.url) if request else obj.banner_image.url
        return obj.banner_image_url or "/images/hero1_ecommerce.png"

    def get_thumbnail(self, obj):
        if obj.thumbnail_image:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.thumbnail_image.url) if request else obj.thumbnail_image.url
        return obj.thumbnail_image_url or "/images/category_equipment.png"


class ClinicalSolutionCreateUpdateSerializer(serializers.ModelSerializer):
    product_ids = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False,
        default=list
    )
    featured_product_ids = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False,
        default=list
    )

    class Meta:
        model = ClinicalSolution
        fields = [
            "id",
            "title",
            "slug",
            "short_description",
            "description",
            "banner_image",
            "banner_image_url",
            "thumbnail_image",
            "thumbnail_image_url",
            "display_order",
            "is_active",
            "show_on_homepage",
            "seo_title",
            "seo_description",
            "seo_keywords",
            "product_ids",
            "featured_product_ids",
        ]
        extra_kwargs = {
            "slug": {"required": False, "allow_blank": True}
        }

    def create(self, validated_data):
        product_ids = validated_data.pop("product_ids", [])
        featured_product_ids = set(str(pid) for pid in validated_data.pop("featured_product_ids", []))
        
        solution = ClinicalSolution.objects.create(**validated_data)
        
        self._sync_products(solution, product_ids, featured_product_ids)
        return solution

    def update(self, instance, validated_data):
        has_products = "product_ids" in validated_data
        product_ids = validated_data.pop("product_ids", [])
        featured_product_ids = set(str(pid) for pid in validated_data.pop("featured_product_ids", []))

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if has_products:
            self._sync_products(instance, product_ids, featured_product_ids)

        return instance

    def _sync_products(self, solution, product_ids, featured_product_ids):
        solution.solution_products.all().delete()
        
        mappings = []
        for idx, pid in enumerate(product_ids):
            try:
                prod = Product.objects.filter(id=pid).first() or Product.objects.filter(sku=pid).first()
                if prod:
                    is_feat = str(prod.id) in featured_product_ids or str(pid) in featured_product_ids
                    mappings.append(
                        ClinicalSolutionProduct(
                            clinical_solution=solution,
                            product=prod,
                            display_order=idx + 1,
                            is_featured=is_feat
                        )
                    )
            except Exception:
                continue
                
        if mappings:
            ClinicalSolutionProduct.objects.bulk_create(mappings)
