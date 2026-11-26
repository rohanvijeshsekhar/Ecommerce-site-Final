"""
FAAZO – Category Serializers

Includes a recursive nested serializer for the /tree/ endpoint
used by storefront menus and admin category tree.
"""

from rest_framework import serializers
from .models import Category


class CategoryListSerializer(serializers.ModelSerializer):
    """Flat list item — used in dropdowns and admin tables."""

    depth       = serializers.IntegerField(read_only=True)
    full_path   = serializers.CharField(read_only=True)
    parent_name = serializers.SerializerMethodField()
    is_leaf     = serializers.BooleanField(read_only=True)

    class Meta:
        model = Category
        fields = [
            "id", "name", "slug", "parent", "parent_name",
            "depth", "full_path", "sort_order", "is_active",
            "is_leaf", "active_product_count", "image", "description", "created_at",
        ]
        read_only_fields = ["id", "slug", "created_at"]

    def get_parent_name(self, obj):
        return obj.parent.name if obj.parent else None


class CategoryTreeSerializer(serializers.ModelSerializer):
    """
    Recursive serializer for the /tree/ endpoint.
    Returns the full nested tree in a single response.
    """

    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id", "name", "slug", "image",
            "sort_order", "is_active", "children",
            "active_product_count",
        ]

    def get_children(self, obj):
        active_children = obj.children.filter(is_active=True).order_by("sort_order", "name")
        return CategoryTreeSerializer(active_children, many=True, context=self.context).data


class CategoryDetailSerializer(serializers.ModelSerializer):
    """Full detail with ancestors and immediate children."""

    ancestors = serializers.SerializerMethodField()
    children  = serializers.SerializerMethodField()
    depth     = serializers.IntegerField(read_only=True)
    full_path = serializers.CharField(read_only=True)

    class Meta:
        model = Category
        fields = [
            "id", "name", "slug", "description", "image",
            "parent", "ancestors", "children",
            "depth", "full_path",
            "sort_order", "is_active",
            "active_product_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]

    def get_ancestors(self, obj):
        return [{"id": str(a.id), "name": a.name, "slug": a.slug} for a in obj.ancestors]

    def get_children(self, obj):
        return [
            {"id": str(c.id), "name": c.name, "slug": c.slug, "is_active": c.is_active}
            for c in obj.children.all().order_by("sort_order", "name")
        ]


class CategoryWriteSerializer(serializers.ModelSerializer):
    """Serializer for create / update including re-parenting."""

    parent = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Category
        fields = ["id", "slug", "name", "parent", "description", "image", "sort_order", "is_active"]
        read_only_fields = ["id", "slug"]

    def to_internal_value(self, data):
        # Gracefully handle multipart FormData strings
        if hasattr(data, 'copy'):
            data = data.copy()
        elif isinstance(data, dict):
            data = dict(data)
        
        # Empty string parent means root category (parent=None)
        if 'parent' in data and data['parent'] in ('', 'null', 'undefined', None):
            data['parent'] = None

        # Empty string image means no file uploaded or clear
        if 'image' in data and data['image'] in ('', 'null', 'undefined'):
            data.pop('image', None)

        return super().to_internal_value(data)

    def validate_parent(self, value):
        """Prevent circular references — a category cannot be its own ancestor."""
        if value is None:
            return value
        if self.instance and value.pk == self.instance.pk:
            raise serializers.ValidationError("A category cannot be its own parent.")
        # Walk up the new parent's ancestry to detect cycles
        node = value
        while node.parent_id is not None:
            if self.instance and node.parent_id == self.instance.pk:
                raise serializers.ValidationError(
                    "Setting this parent would create a circular hierarchy."
                )
            node = node.parent
        return value

    def validate(self, attrs):
        # Allow partial updates where name or parent might not be present in attrs
        name = attrs.get("name", self.instance.name if self.instance else None)
        parent = attrs.get("parent", self.instance.parent if self.instance else None)

        if name:
            qs = Category.objects.filter(name__iexact=name, parent=parent)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                parent_name = parent.name if parent else "root"
                raise serializers.ValidationError(
                    {"name": f"A category with the name '{name}' already exists under the parent '{parent_name}'."}
                )
        return attrs

