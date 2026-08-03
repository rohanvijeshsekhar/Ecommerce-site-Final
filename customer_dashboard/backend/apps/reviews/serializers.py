"""
FAAZO – Product Reviews Serializers
====================================
DRF Serializers for reviews, media attachments, and moderation requests.
"""

from rest_framework import serializers
from apps.reviews.models import ProductReview, ReviewMedia, ReviewStatus, MediaType
from apps.users.models import User


class ReviewMediaSerializer(serializers.ModelSerializer):
    url = serializers.FileField(source="file", read_only=True)
    thumbnail_url = serializers.ImageField(source="thumbnail", read_only=True)

    class Meta:
        model = ReviewMedia
        fields = [
            "id",
            "media_type",
            "url",
            "thumbnail_url",
            "display_order",
            "file_size",
            "mime_type",
            "created_at",
        ]
        read_only_fields = fields


class ProductReviewSerializer(serializers.ModelSerializer):
    """
    Public & Detail representation of a Product Review.
    Includes user name, verified badge, media items, and helpful votes.
    """
    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()
    media = ReviewMediaSerializer(many=True, read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    user_has_voted = serializers.SerializerMethodField()
    user_vote_type = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = [
            "id",
            "product_id",
            "product_name",
            "product_slug",
            "user_id",
            "user_name",
            "user_avatar",
            "order_id",
            "rating",
            "title",
            "comment",
            "pros",
            "cons",
            "would_recommend",
            "is_verified_purchase",
            "status",
            "rejection_reason",
            "helpful_count",
            "unhelpful_count",
            "media",
            "user_has_voted",
            "user_vote_type",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_user_name(self, obj) -> str:
        if not obj.user:
            return "Verified Customer"
        full = obj.user.get_full_name()
        if not full:
            return obj.user.email.split("@")[0].capitalize()
        return full

    def get_user_avatar(self, obj) -> str | None:
        if hasattr(obj.user, "profile") and obj.user.profile.avatar:
            return obj.user.profile.avatar.url
        return getattr(obj.user, "profile_picture", None)

    def get_user_has_voted(self, obj) -> bool:
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return False
        return obj.votes.filter(user=request.user).exists()

    def get_user_vote_type(self, obj) -> str | None:
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return None
        vote = obj.votes.filter(user=request.user).first()
        if not vote:
            return None
        return "helpful" if vote.is_helpful else "unhelpful"


class ReviewCreateUpdateSerializer(serializers.Serializer):
    """
    Input serializer for submitting or editing a review.
    """
    rating = serializers.IntegerField(min_value=1, max_value=5, error_messages={"min_value": "Rating must be between 1 and 5 stars.", "max_value": "Rating must be between 1 and 5 stars."})
    title = serializers.CharField(max_length=200, required=True, error_messages={"required": "Review title is required."})
    comment = serializers.CharField(required=True, error_messages={"required": "Review text is required."})
    pros = serializers.CharField(required=False, allow_blank=True, default="")
    cons = serializers.CharField(required=False, allow_blank=True, default="")
    would_recommend = serializers.BooleanField(default=True, required=False)


class AdminReviewModerationSerializer(serializers.Serializer):
    """
    Input serializer for admin moderation actions.
    """
    status = serializers.ChoiceField(choices=ReviewStatus.choices)
    rejection_reason = serializers.CharField(required=False, allow_blank=True, default="")
