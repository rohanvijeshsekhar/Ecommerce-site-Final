from rest_framework import serializers
from apps.blog.models import BlogCategory, Tag, BlogPost, PostStatus
from apps.blog.sanitizer import sanitize_blog_html


class BlogCategorySerializer(serializers.ModelSerializer):
    post_count = serializers.SerializerMethodField()

    class Meta:
        model = BlogCategory
        fields = ["id", "name", "slug", "description", "is_active", "post_count", "created_at", "updated_at"]

    def get_post_count(self, obj) -> int:
        return obj.posts.filter(status=PostStatus.PUBLISHED).count()


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name", "slug", "created_at"]


class BlogPostPublicSerializer(serializers.ModelSerializer):
    category = BlogCategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    author_name = serializers.CharField(source="author_display_name", read_only=True)
    featured_image_display = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            "id",
            "title",
            "slug",
            "excerpt",
            "content",
            "featured_image",
            "featured_image_url",
            "featured_image_display",
            "author_name",
            "category",
            "tags",
            "status",
            "is_featured",
            "published_at",
            "meta_title",
            "meta_description",
            "meta_keywords",
            "canonical_url",
            "created_at",
            "updated_at",
        ]

    def get_featured_image_display(self, obj) -> str:
        if obj.featured_image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.featured_image.url)
            return obj.featured_image.url
        return obj.featured_image_url or ""


class BlogPostAdminSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True)
    category = BlogCategorySerializer(read_only=True)
    category_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    tags = TagSerializer(many=True, read_only=True)
    tag_names = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        write_only=True,
        help_text="List of tag names to assign/create",
    )
    author_name = serializers.CharField(source="author_display_name", read_only=True)
    author = serializers.PrimaryKeyRelatedField(read_only=True)
    featured_image_display = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            "id",
            "title",
            "slug",
            "excerpt",
            "content",
            "featured_image",
            "featured_image_url",
            "featured_image_display",
            "author",
            "author_name",
            "author_name_override",
            "category",
            "category_id",
            "tags",
            "tag_names",
            "status",
            "is_featured",
            "published_at",
            "meta_title",
            "meta_description",
            "meta_keywords",
            "canonical_url",
            "created_at",
            "updated_at",
        ]

    def get_featured_image_display(self, obj) -> str:
        if obj.featured_image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.featured_image.url)
            return obj.featured_image.url
        return obj.featured_image_url or ""

    def validate_content(self, value: str) -> str:
        """Sanitize submitted HTML content before storing"""
        return sanitize_blog_html(value)

    def create(self, validated_data):
        category_id = validated_data.pop("category_id", None)
        tag_names = validated_data.pop("tag_names", None)

        if category_id:
            try:
                validated_data["category"] = BlogCategory.objects.get(pk=category_id)
            except BlogCategory.DoesNotExist:
                pass

        post = super().create(validated_data)

        if tag_names is not None:
            tags_list = []
            for tag_name in tag_names:
                tname = tag_name.strip()
                if tname:
                    tag_obj, _ = Tag.objects.get_or_create(name=tname)
                    tags_list.append(tag_obj)
            post.tags.set(tags_list)

        return post

    def update(self, instance, validated_data):
        category_id = validated_data.pop("category_id", None)
        tag_names = validated_data.pop("tag_names", None)

        if category_id is not None:
            if category_id:
                try:
                    validated_data["category"] = BlogCategory.objects.get(pk=category_id)
                except BlogCategory.DoesNotExist:
                    validated_data["category"] = None
            else:
                validated_data["category"] = None

        post = super().update(instance, validated_data)

        if tag_names is not None:
            tags_list = []
            for tag_name in tag_names:
                tname = tag_name.strip()
                if tname:
                    tag_obj, _ = Tag.objects.get_or_create(name=tname)
                    tags_list.append(tag_obj)
            post.tags.set(tags_list)

        return post
