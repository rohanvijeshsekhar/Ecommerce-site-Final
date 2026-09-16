"""
FAAZO – Base ViewSet Classes

All FAAZO API ViewSets should inherit from one of these base classes.
They wire up pagination, filtering, search, ordering, and permission hooks
so that individual app viewsets remain focused on business logic only.

Classes
-------
BaseModelViewSet
    Full CRUD ViewSet. Inherits ModelViewSet.
    Use for: Products, Orders, Cart, etc.

BaseReadOnlyViewSet
    List + Retrieve only. No create/update/delete.
    Use for: Public category/brand browsing.

BaseCreateViewSet
    Create only (no retrieve/update/delete).
    Use for: Notifications, Audit log entries.
"""

import logging

from django_filters.rest_framework import DjangoFilterBackend

from rest_framework import filters, mixins, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.pagination import StandardResultsPagination
from apps.common.responses import error_response, success_response

logger = logging.getLogger(__name__)


# ============================================================
# Base ViewSet Mixin
# ============================================================


class FAAZOViewSetMixin:
    """
    Shared configuration mixin injected into every FAAZO ViewSet.

    Provides:
    - Standard pagination class.
    - Search, ordering, and filter backends.
    - Consistent success/error response helpers.
    - Structured logging on errors.
    """

    pagination_class = StandardResultsPagination
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    permission_classes = [IsAuthenticated]

    # Subclasses override these
    filterset_fields: list = []
    search_fields: list = []
    ordering_fields: list = ["created_at"]
    ordering = ["-created_at"]

    def success(self, data=None, message="Success", status_code=status.HTTP_200_OK, meta=None):
        """Shortcut to return a standard FAAZO success response."""
        return success_response(data=data, message=message, status_code=status_code, meta=meta)

    def error(
        self, message="Error", code="ERROR", details=None, status_code=status.HTTP_400_BAD_REQUEST
    ):
        """Shortcut to return a standard FAAZO error response."""
        return error_response(message=message, code=code, details=details, status_code=status_code)

    def get_serializer_context(self):
        """Inject request into serializer context for user access."""
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


# ============================================================
# Full CRUD ViewSet
# ============================================================


class BaseModelViewSet(FAAZOViewSetMixin, viewsets.ModelViewSet):
    """
    Full CRUD ViewSet with FAAZO conventions.

    Overrides:
    - create() → returns 201 with standard envelope.
    - destroy() → supports soft delete if model has is_deleted.

    Usage:
        class ProductViewSet(BaseModelViewSet):
            queryset = Product.objects.all()
            serializer_class = ProductSerializer
            search_fields = ['name', 'sku']
            filterset_fields = ['category', 'brand', 'status']
    """

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                "success": True,
                "data": serializer.data,
                "message": "Created successfully.",
                "meta": None,
            },
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def perform_create(self, serializer):
        return serializer.save()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, "_prefetched_objects_cache", None):
            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the prefetch cache on the instance.
            instance._prefetched_objects_cache = {}

        return Response(
            {
                "success": True,
                "data": serializer.data,
                "message": "Updated successfully.",
                "meta": None,
            },
            status=status.HTTP_200_OK,
        )


    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Prefer soft delete if the model supports it
        if hasattr(instance, "is_deleted"):
            instance.delete(deleted_by=request.user)
        else:
            self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "data": None,
                "message": "Deleted successfully.",
                "meta": None,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# Read-Only ViewSet
# ============================================================


class BaseReadOnlyViewSet(FAAZOViewSetMixin, viewsets.ReadOnlyModelViewSet):
    """
    List + Retrieve only. No write operations.

    Usage:
        class CategoryViewSet(BaseReadOnlyViewSet):
            queryset = Category.objects.filter(is_active=True)
            serializer_class = CategorySerializer
            search_fields = ['name']
    """

    pass


# ============================================================
# Create-Only ViewSet
# ============================================================


class BaseCreateViewSet(
    FAAZOViewSetMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """
    Create-only ViewSet. No list/retrieve/update/delete.

    Usage:
        class SupportTicketViewSet(BaseCreateViewSet):
            queryset = SupportTicket.objects.all()
            serializer_class = CreateSupportTicketSerializer
    """

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "success": True,
                "data": serializer.data,
                "message": "Submitted successfully.",
                "meta": None,
            },
            status=status.HTTP_201_CREATED,
        )
