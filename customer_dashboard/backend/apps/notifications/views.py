from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse

from apps.common.responses import success_response, error_response
from apps.notifications.serializers import NotificationSerializer
from apps.notifications.services.notification_service import NotificationService


class StandardNotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class NotificationListView(APIView):
    """
    GET /api/v1/notifications/
    Retrieves paginated notifications feed for authenticated user.
    Supports filtering by category, is_read status, and priority.
    """
    permission_classes = [IsAuthenticated]
    pagination_class = StandardNotificationPagination

    @extend_schema(
        summary="List User Notifications",
        parameters=[
            OpenApiParameter(name="category", description="Filter by category (AUTHENTICATION, ORDERS, etc.)", required=False, type=str),
            OpenApiParameter(name="is_read", description="Filter by read status (true/false)", required=False, type=bool),
            OpenApiParameter(name="priority", description="Filter by priority (LOW, NORMAL, HIGH, URGENT)", required=False, type=str),
            OpenApiParameter(name="page", description="Page number", required=False, type=int),
            OpenApiParameter(name="page_size", description="Page size (default 20, max 100)", required=False, type=int),
        ],
        responses={200: NotificationSerializer(many=True)},
    )
    def get(self, request):
        category = request.query_params.get("category")
        is_read_param = request.query_params.get("is_read")
        priority = request.query_params.get("priority")

        is_read = None
        if is_read_param is not None:
            is_read = is_read_param.lower() in ["true", "1"]

        queryset = NotificationService.get_notifications(
            user=request.user,
            category=category,
            is_read=is_read,
            priority=priority,
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = NotificationSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)


class NotificationUnreadCountView(APIView):
    """
    GET /api/v1/notifications/unread-count/
    Returns current count of unread, non-expired notifications for authenticated user.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get Unread Notification Count",
        responses={200: OpenApiResponse(description="Count of unread notifications.")},
    )
    def get(self, request):
        count = NotificationService.get_unread_count(request.user)
        return success_response(
            data={"unread_count": count},
            message="Unread notification count retrieved.",
        )


class NotificationMarkReadView(APIView):
    """
    PATCH /api/v1/notifications/{id}/read/
    Marks a single notification as read for authenticated user.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Mark Single Notification as Read",
        responses={200: NotificationSerializer, 404: OpenApiResponse(description="Not Found")},
    )
    def patch(self, request, pk):
        success, notification, msg = NotificationService.mark_as_read(pk, request.user)
        if not success:
            return error_response(msg, status_code=status.HTTP_404_NOT_FOUND)

        serializer = NotificationSerializer(notification)
        return success_response(data=serializer.data, message=msg)

    # Legacy POST support
    def post(self, request, pk):
        return self.patch(request, pk)


class NotificationMarkAllReadView(APIView):
    """
    PATCH /api/v1/notifications/read-all/
    Bulk marks all unread notifications as read for authenticated user.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Mark All Notifications as Read",
        responses={200: OpenApiResponse(description="Bulk count of marked notifications.")},
    )
    def patch(self, request):
        count = NotificationService.mark_all_as_read(request.user)
        return success_response(
            data={"marked_count": count},
            message=f"{count} notification(s) marked as read.",
        )

    # Legacy POST support
    def post(self, request):
        return self.patch(request)


class NotificationDeleteView(APIView):
    """
    DELETE /api/v1/notifications/{id}/
    Deletes a single notification for authenticated user.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Delete Single Notification",
        responses={200: OpenApiResponse(description="Notification deleted."), 404: OpenApiResponse(description="Not Found")},
    )
    def delete(self, request, pk):
        success, msg = NotificationService.delete_notification(pk, request.user)
        if not success:
            return error_response(msg, status_code=status.HTTP_404_NOT_FOUND)

        return success_response(message=msg)


class NotificationDeleteAllView(APIView):
    """
    DELETE /api/v1/notifications/
    Deletes all notifications for authenticated user.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Delete All User Notifications",
        responses={200: OpenApiResponse(description="Bulk deleted count.")},
    )
    def delete(self, request):
        count = NotificationService.delete_all_notifications(request.user)
        return success_response(
            data={"deleted_count": count},
            message=f"{count} notification(s) deleted.",
        )
