"""
FAAZO – Users Views

Profile management and address CRUD for authenticated users.

Views:
    UserProfileView    GET/PATCH  /api/v1/users/profile/
    AvatarView         POST/DEL   /api/v1/users/profile/avatar/
    AddressViewSet     CRUD       /api/v1/users/addresses/
                       POST       /api/v1/users/addresses/{id}/set-default/
"""

import logging
from django.db.models import Q
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSet

from drf_spectacular.utils import OpenApiResponse, extend_schema

from apps.common.permissions import IsAdmin
from apps.common.viewsets import BaseModelViewSet
from apps.users.models import Address, User, CustomerAuditLog
from apps.users.serializers import (
    AddressSerializer,
    AvatarSerializer,
    UserProfileSerializer,
    CustomerAdminSerializer,
)

logger = logging.getLogger("faazo.users")


# ──────────────────────────────────────────────────────────────
# Response helpers
# ──────────────────────────────────────────────────────────────

def _ok(data=None, message: str = "Success.", status_code: int = status.HTTP_200_OK):
    payload = {"success": True, "message": message}
    if data is not None:
        payload["data"] = data
    return Response(payload, status=status_code)


def _error(message: str, errors=None, status_code: int = status.HTTP_400_BAD_REQUEST):
    payload = {"success": False, "message": message}
    if errors is not None:
        payload["errors"] = errors
    return Response(payload, status=status_code)


# ──────────────────────────────────────────────────────────────
# User Profile
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["User Profile"])
class UserProfileView(APIView):
    """
    GET  /api/v1/users/profile/  — Retrieve own profile.
    PATCH /api/v1/users/profile/ — Update profile (partial).
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    @extend_schema(
        summary="Get Profile",
        responses={200: UserProfileSerializer},
    )
    def get(self, request):
        profile = request.user.profile
        serializer = UserProfileSerializer(profile)
        return _ok(data=serializer.data, message="Profile retrieved.")

    @extend_schema(
        summary="Update Profile",
        request=UserProfileSerializer,
        responses={
            200: UserProfileSerializer,
            400: OpenApiResponse(description="Validation error."),
        },
    )
    def patch(self, request):
        profile = request.user.profile
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)

        if not serializer.is_valid():
            return _error("Profile update failed.", errors=serializer.errors, status_code=400)

        serializer.save()
        logger.info("Profile updated for %s.", request.user.email)
        return _ok(data=serializer.data, message="Profile updated successfully.")


# ──────────────────────────────────────────────────────────────
# Avatar
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["User Profile"])
class AvatarView(APIView):
    """
    POST   /api/v1/users/profile/avatar/ — Upload or replace avatar.
    DELETE /api/v1/users/profile/avatar/ — Remove avatar.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        summary="Upload Avatar",
        request=AvatarSerializer,
        responses={
            200: OpenApiResponse(description="Avatar uploaded."),
            400: OpenApiResponse(description="Invalid image."),
        },
    )
    def post(self, request):
        serializer = AvatarSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Avatar upload failed.", errors=serializer.errors, status_code=400)

        profile = request.user.profile

        # Delete old avatar file if it exists
        if profile.avatar:
            profile.avatar.delete(save=False)

        profile.avatar = serializer.validated_data["avatar"]
        profile.save(update_fields=["avatar", "updated_at"])

        logger.info("Avatar updated for %s.", request.user.email)
        return _ok(
            data={"avatar_url": profile.avatar_url},
            message="Avatar updated successfully.",
        )

    @extend_schema(
        summary="Remove Avatar",
        responses={200: OpenApiResponse(description="Avatar removed.")},
    )
    def delete(self, request):
        profile = request.user.profile

        if not profile.avatar:
            return _error("No avatar to remove.", status_code=400)

        profile.avatar.delete(save=False)
        profile.avatar = None
        profile.save(update_fields=["avatar", "updated_at"])

        logger.info("Avatar removed for %s.", request.user.email)
        return _ok(message="Avatar removed successfully.")


# ──────────────────────────────────────────────────────────────
# Address ViewSet
# ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Addresses"])
class AddressViewSet(ViewSet):
    """
    CRUD for user addresses.

    list         GET    /api/v1/users/addresses/
    create       POST   /api/v1/users/addresses/
    retrieve     GET    /api/v1/users/addresses/{id}/
    partial_update PATCH /api/v1/users/addresses/{id}/
    destroy      DELETE /api/v1/users/addresses/{id}/
    set_default  POST   /api/v1/users/addresses/{id}/set-default/
    """

    permission_classes = [IsAuthenticated]

    def _get_address_or_404(self, pk, user):
        try:
            return Address.objects.get(pk=pk, user=user, is_deleted=False)
        except Address.DoesNotExist:
            return None

    @extend_schema(summary="List Addresses", responses={200: AddressSerializer(many=True)})
    def list(self, request):
        addresses = Address.objects.filter(user=request.user, is_deleted=False)
        serializer = AddressSerializer(addresses, many=True)
        return _ok(data=serializer.data, message=f"{len(addresses)} address(es) found.")

    @extend_schema(
        summary="Create Address",
        request=AddressSerializer,
        responses={201: AddressSerializer, 400: OpenApiResponse(description="Validation error.")},
    )
    def create(self, request):
        serializer = AddressSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return _error("Address creation failed.", errors=serializer.errors, status_code=400)
        address = serializer.save()
        logger.info("Address created for %s.", request.user.email)
        return _ok(data=AddressSerializer(address).data, message="Address created.", status_code=201)

    @extend_schema(summary="Get Address", responses={200: AddressSerializer})
    def retrieve(self, request, pk=None):
        address = self._get_address_or_404(pk, request.user)
        if not address:
            return _error("Address not found.", status_code=404)
        return _ok(data=AddressSerializer(address).data)

    @extend_schema(
        summary="Update Address (Partial)",
        request=AddressSerializer,
        responses={200: AddressSerializer},
    )
    def partial_update(self, request, pk=None):
        address = self._get_address_or_404(pk, request.user)
        if not address:
            return _error("Address not found.", status_code=404)

        serializer = AddressSerializer(
            address, data=request.data, partial=True, context={"request": request}
        )
        if not serializer.is_valid():
            return _error("Address update failed.", errors=serializer.errors, status_code=400)

        updated = serializer.save()
        logger.info("Address %s updated for %s.", pk, request.user.email)
        return _ok(data=AddressSerializer(updated).data, message="Address updated.")

    @extend_schema(summary="Delete Address", responses={200: OpenApiResponse(description="Deleted.")})
    def destroy(self, request, pk=None):
        address = self._get_address_or_404(pk, request.user)
        if not address:
            return _error("Address not found.", status_code=404)

        was_default = address.is_default

        # Soft delete: preserves historical order records & foreign key integrity
        address.is_deleted = True
        address.is_default = False
        address.save(update_fields=["is_deleted", "is_default"])

        # If this was the default, promote the most recent active address
        if was_default:
            remaining = (
                Address.objects.filter(user=request.user, is_deleted=False)
                .order_by("-created_at")
                .first()
            )
            if remaining:
                remaining.is_default = True
                remaining.save(update_fields=["is_default"])

        logger.info("Address %s deleted for %s.", pk, request.user.email)
        return _ok(message="Address deleted.")

    @extend_schema(
        summary="Set Default Address",
        responses={200: OpenApiResponse(description="Default address updated.")},
    )
    def set_default(self, request, pk=None):
        address = self._get_address_or_404(pk, request.user)
        if not address:
            return _error("Address not found.", status_code=404)

        if address.is_default:
            return _ok(message="This address is already your default.")

        # Unset all others
        Address.objects.filter(user=request.user, is_default=True).update(is_default=False)
        address.is_default = True
        address.save(update_fields=["is_default"])

        logger.info("Default address set to %s for %s.", pk, request.user.email)
        return _ok(data=AddressSerializer(address).data, message="Default address updated.")


# ──────────────────────────────────────────────────────────────
# Admin Panel Customer ViewSet
# ──────────────────────────────────────────────────────────────

class CustomerAdminViewSet(BaseModelViewSet):
    """
    ViewSet for Admin Panel Customer Management.
    Provides listing, filtering, detail retrieval, soft delete, and account controls.
    """
    serializer_class = CustomerAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def create(self, request, *args, **kwargs):
        from rest_framework.exceptions import MethodNotAllowed
        raise MethodNotAllowed("POST")

    def get_queryset(self):
        queryset = User.objects.filter(
            role="customer",
            profile__is_deleted=False
        ).select_related("profile").prefetch_related(
            "addresses",
            "customer_audit_logs",
            "customer_audit_logs__action_by",
            "dealer_application",
        )

        # Search filter
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone_number__icontains=search)
            )

        # Status filter
        status_param = self.request.query_params.get("status")
        if status_param == "blocked":
            queryset = queryset.filter(profile__is_blocked=True)
        elif status_param == "deactivated":
            queryset = queryset.filter(is_active=False)
        elif status_param == "active":
            queryset = queryset.filter(is_active=True, profile__is_blocked=False)

        # Registration date range filter
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            queryset = queryset.filter(date_joined__gte=start_date)
        if end_date:
            queryset = queryset.filter(date_joined__lte=end_date)

        # City filter (using addresses)
        city = self.request.query_params.get("city")
        if city:
            queryset = queryset.filter(addresses__city__icontains=city).distinct()

        # Tags filter
        tag = self.request.query_params.get("tag")
        if tag:
            # Querying inside the JSONField list of tags
            queryset = queryset.filter(profile__tags__contains=tag)

        return queryset

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            "success": True,
            "data": serializer.data,
            "message": "Customer retrieved successfully."
        })

    def perform_update(self, serializer):
        # Fetch original notes/tags to identify what changed
        old_instance = self.get_object()
        old_notes = old_instance.profile.admin_notes
        old_tags = old_instance.profile.tags

        customer = serializer.save()

        new_notes = customer.profile.admin_notes
        new_tags = customer.profile.tags

        actions = []
        if old_notes != new_notes:
            actions.append("NOTES_UPDATED")
        if old_tags != new_tags:
            actions.append("TAGS_UPDATED")
        if not actions:
            actions.append("EDITED")

        for act_type in actions:
            CustomerAuditLog.objects.create(
                customer=customer,
                action=act_type,
                action_by=self.request.user,
                description=f"Customer details ({act_type.lower().replace('_', ' ')}) updated by admin ({self.request.user.email})."
            )

    def destroy(self, request, *args, **kwargs):
        customer = self.get_object()
        profile = customer.profile
        profile.is_deleted = True
        profile.deleted_at = timezone.now()
        profile.save(update_fields=["is_deleted", "deleted_at"])

        customer.is_active = False
        customer.save(update_fields=["is_active"])

        CustomerAuditLog.objects.create(
            customer=customer,
            action="SOFT_DELETED",
            action_by=request.user,
            description=f"Account soft-deleted by admin ({request.user.email})."
        )
        return Response({"success": True, "message": "Customer soft-deleted successfully."})

    @action(detail=True, methods=["post"])
    def block(self, request, pk=None):
        customer = self.get_object()
        profile = customer.profile
        profile.is_blocked = True
        profile.save(update_fields=["is_blocked"])

        CustomerAuditLog.objects.create(
            customer=customer,
            action="BLOCKED",
            action_by=request.user,
            description=f"Account blocked by admin ({request.user.email})."
        )
        return Response({"success": True, "message": "Customer blocked successfully."})

    @action(detail=True, methods=["post"])
    def unblock(self, request, pk=None):
        customer = self.get_object()
        profile = customer.profile
        profile.is_blocked = False
        profile.save(update_fields=["is_blocked"])

        CustomerAuditLog.objects.create(
            customer=customer,
            action="UNBLOCKED",
            action_by=request.user,
            description=f"Account unblocked by admin ({request.user.email})."
        )
        return Response({"success": True, "message": "Customer unblocked successfully."})

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        customer = self.get_object()
        customer.is_active = False
        customer.save(update_fields=["is_active"])

        CustomerAuditLog.objects.create(
            customer=customer,
            action="DEACTIVATED",
            action_by=request.user,
            description=f"Account deactivated by admin ({request.user.email})."
        )
        return Response({"success": True, "message": "Customer deactivated successfully."})

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        customer = self.get_object()
        customer.is_active = True
        customer.save(update_fields=["is_active"])

        CustomerAuditLog.objects.create(
            customer=customer,
            action="ACTIVATED",
            action_by=request.user,
            description=f"Account activated by admin ({request.user.email})."
        )
        return Response({"success": True, "message": "Customer activated successfully."})

    @action(detail=False, methods=["get"])
    def stats(self, request):
        from django.utils import timezone
        from datetime import timedelta

        total_customers = User.objects.filter(role="customer", profile__is_deleted=False).count()
        active_customers = User.objects.filter(role="customer", is_active=True, profile__is_blocked=False, profile__is_deleted=False).count()
        blocked_customers = User.objects.filter(role="customer", profile__is_blocked=True, profile__is_deleted=False).count()

        # Joined in last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)
        new_customers = User.objects.filter(role="customer", date_joined__gte=thirty_days_ago, profile__is_deleted=False).count()

        return Response({
            "success": True,
            "data": {
                "total_customers": total_customers,
                "active_customers": active_customers,
                "blocked_customers": blocked_customers,
                "new_customers_this_month": new_customers,
                "total_revenue": 0,
                "repeat_customers": 0
            }
        })

