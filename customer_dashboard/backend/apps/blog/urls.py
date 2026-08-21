from django.urls import path
from apps.blog.views import (
    PublicBlogListView,
    PublicBlogCategoryListView,
    PublicBlogTagListView,
    PublicBlogDetailView,
    AdminBlogListView,
    AdminBlogDetailView,
    AdminBlogPublishActionView,
    AdminBlogDraftActionView,
    AdminBlogArchiveActionView,
    AdminBlogCategoryViewSet,
)

urlpatterns = [
    # Admin API (must precede dynamic slug matching)
    path("admin/", AdminBlogListView.as_view(), name="admin-blog-list-create"),
    path("admin/categories/", AdminBlogCategoryViewSet.as_view(), name="admin-blog-category-list-create"),
    path("admin/<uuid:pk>/", AdminBlogDetailView.as_view(), name="admin-blog-detail-update-delete"),
    path("admin/<uuid:pk>/publish/", AdminBlogPublishActionView.as_view(), name="admin-blog-publish"),
    path("admin/<uuid:pk>/draft/", AdminBlogDraftActionView.as_view(), name="admin-blog-draft"),
    path("admin/<uuid:pk>/archive/", AdminBlogArchiveActionView.as_view(), name="admin-blog-archive"),
    # Public API
    path("", PublicBlogListView.as_view(), name="public-blog-list"),
    path("categories/", PublicBlogCategoryListView.as_view(), name="public-blog-category-list"),
    path("tags/", PublicBlogTagListView.as_view(), name="public-blog-tag-list"),
    path("<slug:slug>/", PublicBlogDetailView.as_view(), name="public-blog-detail"),
]
