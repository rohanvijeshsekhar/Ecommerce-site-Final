from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import StandardResultsPagination
from apps.common.permissions import IsAdmin
from apps.blog.models import BlogCategory, Tag, BlogPost, PostStatus
from apps.blog.serializers import (
    BlogCategorySerializer,
    TagSerializer,
    BlogPostPublicSerializer,
    BlogPostAdminSerializer,
)


class PublicBlogListView(APIView):
    permission_classes = [AllowAny]
    pagination_class = StandardResultsPagination

    def get(self, request):
        now = timezone.now()
        qs = BlogPost.objects.filter(status=PostStatus.PUBLISHED, published_at__lte=now)

        # Category filter
        category_slug = request.query_params.get("category", "").strip()
        if category_slug:
            qs = qs.filter(category__slug=category_slug)

        # Tag filter
        tag_slug = request.query_params.get("tag", "").strip()
        if tag_slug:
            qs = qs.filter(tags__slug=tag_slug)

        # Featured filter
        is_featured = request.query_params.get("is_featured")
        if is_featured == "true":
            qs = qs.filter(is_featured=True)
        elif is_featured == "false":
            qs = qs.filter(is_featured=False)

        # Search query
        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(excerpt__icontains=q)
                | Q(content__icontains=q)
                | Q(tags__name__icontains=q)
                | Q(category__name__icontains=q)
            ).distinct()

        qs = qs.select_related("category", "author").prefetch_related("tags").order_by("-published_at", "-created_at")

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)
        serializer = BlogPostPublicSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class PublicBlogCategoryListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        categories = BlogCategory.objects.filter(is_active=True).order_by("name")
        serializer = BlogCategorySerializer(categories, many=True, context={"request": request})
        return Response({"success": True, "data": serializer.data})


class PublicBlogTagListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        tags = Tag.objects.all().order_by("name")
        serializer = TagSerializer(tags, many=True, context={"request": request})
        return Response({"success": True, "data": serializer.data})


class PublicBlogDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        now = timezone.now()
        post = (
            BlogPost.objects.filter(slug=slug, status=PostStatus.PUBLISHED, published_at__lte=now)
            .select_related("category", "author")
            .prefetch_related("tags")
            .first()
        )

        if not post:
            return Response(
                {"success": False, "message": "Blog article not found or not published."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = BlogPostPublicSerializer(post, context={"request": request})

        # Fetch up to 3 related published posts
        related_qs = (
            BlogPost.objects.filter(status=PostStatus.PUBLISHED, published_at__lte=now)
            .exclude(id=post.id)
            .select_related("category", "author")
            .prefetch_related("tags")
        )
        if post.category:
            same_cat = list(related_qs.filter(category=post.category).order_by("-published_at")[:3])
            if len(same_cat) < 3:
                already_ids = [p.id for p in same_cat] + [post.id]
                extra = list(related_qs.exclude(id__in=already_ids).order_by("-published_at")[: 3 - len(same_cat)])
                related_posts = same_cat + extra
            else:
                related_posts = same_cat
        else:
            related_posts = list(related_qs.order_by("-published_at")[:3])

        related_serializer = BlogPostPublicSerializer(related_posts, many=True, context={"request": request})

        return Response(
            {
                "success": True,
                "data": serializer.data,
                "related": related_serializer.data,
            }
        )


# ── Admin Views (Strictly Protected by IsAdmin) ───────────────


class AdminBlogListView(APIView):
    permission_classes = [IsAdmin]
    pagination_class = StandardResultsPagination

    def get(self, request):
        qs = BlogPost.objects.all().select_related("category", "author").prefetch_related("tags")

        status_param = request.query_params.get("status", "").strip().upper()
        if status_param in PostStatus.values:
            qs = qs.filter(status=status_param)

        category_param = request.query_params.get("category", "").strip()
        if category_param:
            qs = qs.filter(Q(category__slug=category_param) | Q(category__id=category_param))

        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(excerpt__icontains=q)
                | Q(content__icontains=q)
                | Q(tags__name__icontains=q)
                | Q(category__name__icontains=q)
            ).distinct()

        qs = qs.order_by("-updated_at", "-created_at")

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)
        serializer = BlogPostAdminSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = BlogPostAdminSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            kwargs = {}
            if request.user and request.user.is_authenticated:
                kwargs["author"] = request.user
            post = serializer.save(**kwargs)
            return Response(
                {
                    "success": True,
                    "message": "Blog post created successfully.",
                    "data": BlogPostAdminSerializer(post, context={"request": request}).data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class AdminBlogDetailView(APIView):
    permission_classes = [IsAdmin]

    def get_object(self, pk):
        try:
            return BlogPost.objects.select_related("category", "author").prefetch_related("tags").get(pk=pk)
        except (BlogPost.DoesNotExist, ValueError):
            return None

    def get(self, request, pk):
        post = self.get_object(pk)
        if not post:
            return Response({"success": False, "message": "Blog post not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = BlogPostAdminSerializer(post, context={"request": request})
        return Response({"success": True, "data": serializer.data})

    def patch(self, request, pk):
        post = self.get_object(pk)
        if not post:
            return Response({"success": False, "message": "Blog post not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = BlogPostAdminSerializer(post, data=request.data, partial=True, context={"request": request})
        if serializer.is_valid():
            updated = serializer.save()
            return Response(
                {
                    "success": True,
                    "message": "Blog post updated successfully.",
                    "data": BlogPostAdminSerializer(updated, context={"request": request}).data,
                }
            )
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        post = self.get_object(pk)
        if not post:
            return Response({"success": False, "message": "Blog post not found."}, status=status.HTTP_404_NOT_FOUND)
        post.delete()
        return Response({"success": True, "message": "Blog post deleted successfully."})


class AdminBlogPublishActionView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            post = BlogPost.objects.get(pk=pk)
        except (BlogPost.DoesNotExist, ValueError):
            return Response({"success": False, "message": "Blog post not found."}, status=status.HTTP_404_NOT_FOUND)

        post.status = PostStatus.PUBLISHED
        if not post.published_at:
            post.published_at = timezone.now()
        post.save()

        return Response(
            {
                "success": True,
                "message": "Blog post published successfully.",
                "data": BlogPostAdminSerializer(post, context={"request": request}).data,
            }
        )


class AdminBlogDraftActionView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            post = BlogPost.objects.get(pk=pk)
        except (BlogPost.DoesNotExist, ValueError):
            return Response({"success": False, "message": "Blog post not found."}, status=status.HTTP_404_NOT_FOUND)

        post.status = PostStatus.DRAFT
        post.save()

        return Response(
            {
                "success": True,
                "message": "Blog post moved to draft successfully.",
                "data": BlogPostAdminSerializer(post, context={"request": request}).data,
            }
        )


class AdminBlogArchiveActionView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            post = BlogPost.objects.get(pk=pk)
        except (BlogPost.DoesNotExist, ValueError):
            return Response({"success": False, "message": "Blog post not found."}, status=status.HTTP_404_NOT_FOUND)

        post.status = PostStatus.ARCHIVED
        post.save()

        return Response(
            {
                "success": True,
                "message": "Blog post archived successfully.",
                "data": BlogPostAdminSerializer(post, context={"request": request}).data,
            }
        )


class AdminBlogCategoryViewSet(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        categories = BlogCategory.objects.all().order_by("name")
        serializer = BlogCategorySerializer(categories, many=True, context={"request": request})
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        serializer = BlogCategorySerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            cat = serializer.save()
            return Response(
                {
                    "success": True,
                    "message": "Blog category created successfully.",
                    "data": BlogCategorySerializer(cat, context={"request": request}).data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
