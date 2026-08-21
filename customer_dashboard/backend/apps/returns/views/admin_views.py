"""
FAAZO – Admin Return Management REST API Views

Admin endpoints for:
- Listing & filtering return requests (GET /api/v1/admin/returns/)
- Retrieving return details & evidence (GET /api/v1/admin/returns/<id>/)
- Approving return request (POST /api/v1/admin/returns/<id>/approve/)
- Rejecting return request (POST /api/v1/admin/returns/<id>/reject/)
- Scheduling return pickup (POST /api/v1/admin/returns/<id>/schedule-pickup/)
- Recording item receipt at warehouse (POST /api/v1/admin/returns/<id>/receive/)
- Processing QC inspection (POST /api/v1/admin/returns/<id>/qc/)
- Approving refund (POST /api/v1/admin/returns/<id>/approve-refund/)
- Approving replacement (POST /api/v1/admin/returns/<id>/approve-replacement/)
- Retrying failed/unknown refund (POST /api/v1/admin/refunds/<id>/retry/)
"""

import logging
from django.db import transaction
from rest_framework import status, permissions
from rest_framework.views import APIView

from apps.common.responses import success_response, error_response
from apps.returns.models import (
    ReturnRequest,
    ReturnStatus,
    Refund,
)
from apps.returns.serializers import ReturnRequestSerializer, RefundSerializer
from apps.returns.services.state_machine import ReturnStateMachineService
from apps.returns.services.refund_service import RefundService
from apps.returns.services.logistics import ReturnShippingService
from apps.returns.services.qc_service import QCService
from apps.returns.services.replacement_service import ReplacementService

logger = logging.getLogger("faazo.returns")


class IsAdminUserPermission(permissions.BasePermission):
    """Permission check ensuring user is an authenticated Admin."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (getattr(request.user, "is_staff", False) or getattr(request.user, "role", "") == "admin")
        )


class AdminReturnListFilterView(APIView):
    """
    GET /api/v1/admin/returns/
    List all return requests with multi-field filtering.
    """
    permission_classes = [IsAdminUserPermission]

    def get(self, request):
        qs = (
            ReturnRequest.objects.select_related("customer", "order", "replacement_order")
            .prefetch_related("items__order_item__product", "evidence", "events", "refund", "shipment")
            .order_by("-created_at")
        )

        status_param = request.query_params.get("status", "").strip()
        reason_param = request.query_params.get("reason", "").strip()
        request_type = request.query_params.get("request_type", "").strip()
        order_number = request.query_params.get("order_number", "").strip()
        customer_email = request.query_params.get("customer_email", "").strip()

        if status_param:
            qs = qs.filter(status=status_param)
        if reason_param:
            qs = qs.filter(reason=reason_param)
        if request_type:
            qs = qs.filter(request_type=request_type)
        if order_number:
            qs = qs.filter(order__order_number__icontains=order_number)
        if customer_email:
            qs = qs.filter(customer__email__icontains=customer_email)

        serializer = ReturnRequestSerializer(qs, many=True)
        return success_response(data=serializer.data, message="Return requests retrieved.")


class AdminReturnDetailView(APIView):
    """
    GET /api/v1/admin/returns/<uuid>/
    """
    permission_classes = [IsAdminUserPermission]

    def get(self, request, pk):
        try:
            return_req = (
                ReturnRequest.objects.select_related("customer", "order", "replacement_order")
                .prefetch_related("items__order_item__product", "evidence", "events", "refund", "shipment")
                .get(pk=pk)
            )
        except ReturnRequest.DoesNotExist:
            return error_response("Return request not found.", status_code=status.HTTP_404_NOT_FOUND)

        serializer = ReturnRequestSerializer(return_req)
        return success_response(data=serializer.data, message="Return request details retrieved.")


class AdminReturnApproveView(APIView):
    """
    POST /api/v1/admin/returns/<uuid>/approve/
    """
    permission_classes = [IsAdminUserPermission]

    def post(self, request, pk):
        notes = request.data.get("notes", "").strip()
        try:
            return_req = ReturnStateMachineService.transition_to(
                return_request_id=str(pk),
                target_status=ReturnStatus.APPROVED,
                actor=request.user,
                notes=notes or "Return request approved by admin.",
            )
        except Exception as exc:
            return error_response(str(exc), status_code=status.HTTP_400_BAD_REQUEST)

        serializer = ReturnRequestSerializer(return_req)
        return success_response(data=serializer.data, message="Return request approved.")


class AdminReturnRejectView(APIView):
    """
    POST /api/v1/admin/returns/<uuid>/reject/
    """
    permission_classes = [IsAdminUserPermission]

    def post(self, request, pk):
        rejection_reason = request.data.get("rejection_reason", "").strip()
        if not rejection_reason:
            return error_response("rejection_reason is required when declining a return.", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            return_req = ReturnStateMachineService.transition_to(
                return_request_id=str(pk),
                target_status=ReturnStatus.REJECTED,
                actor=request.user,
                rejection_reason=rejection_reason,
            )
        except Exception as exc:
            return error_response(str(exc), status_code=status.HTTP_400_BAD_REQUEST)

        serializer = ReturnRequestSerializer(return_req)
        return success_response(data=serializer.data, message="Return request rejected.")


class AdminReturnSchedulePickupView(APIView):
    """
    POST /api/v1/admin/returns/<uuid>/schedule-pickup/
    """
    permission_classes = [IsAdminUserPermission]

    def post(self, request, pk):
        try:
            res = ReturnShippingService.schedule_return_pickup(return_request_id=str(pk), actor=request.user)
        except Exception as exc:
            return error_response(str(exc), status_code=status.HTTP_400_BAD_REQUEST)

        return success_response(data=res, message="Return pickup scheduled successfully.")


class AdminReturnReceiveView(APIView):
    """
    POST /api/v1/admin/returns/<uuid>/receive/
    """
    permission_classes = [IsAdminUserPermission]

    def post(self, request, pk):
        notes = request.data.get("notes", "").strip()
        try:
            return_req = QCService.record_item_receipt(return_request_id=str(pk), actor=request.user, notes=notes)
        except Exception as exc:
            return error_response(str(exc), status_code=status.HTTP_400_BAD_REQUEST)

        serializer = ReturnRequestSerializer(return_req)
        return success_response(data=serializer.data, message="Item receipt recorded.")


class AdminReturnQCView(APIView):
    """
    POST /api/v1/admin/returns/<uuid>/qc/
    """
    permission_classes = [IsAdminUserPermission]

    def post(self, request, pk):
        qc_result = request.data.get("qc_result", "").strip()
        is_restockable = bool(request.data.get("is_restockable", True))
        notes = request.data.get("notes", "").strip()

        if not qc_result:
            return error_response("qc_result ('PASS' or 'FAIL') is required.", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            res = QCService.process_qc(
                return_request_id=str(pk),
                qc_result=qc_result,
                is_restockable=is_restockable,
                notes=notes,
                actor=request.user,
            )
        except Exception as exc:
            return error_response(str(exc), status_code=status.HTTP_400_BAD_REQUEST)

        return success_response(data=res, message="QC inspection processed successfully.")


class AdminReturnApproveRefundView(APIView):
    """
    POST /api/v1/admin/returns/<uuid>/approve-refund/
    """
    permission_classes = [IsAdminUserPermission]

    def post(self, request, pk):
        try:
            return_req = ReturnRequest.objects.get(pk=pk)

            # 1. Initiate Refund Record
            refund = RefundService.initiate_refund_record(return_request=return_req, actor=request.user)

            # 2. Dispatch Celery Async Refund Task after DB commit (Celery owns execution)
            from apps.returns.tasks import process_refund_async
            refund_id_str = str(refund.id)

            def dispatch_refund():
                from django.conf import settings
                if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
                    process_refund_async(refund_id=refund_id_str)
                else:
                    try:
                        process_refund_async.delay(refund_id=refund_id_str)
                    except Exception:
                        # Fallback to sync execution if broker is unreachable
                        process_refund_async(refund_id=refund_id_str)

            transaction.on_commit(dispatch_refund)

            response_data = {
                "refund_id": str(refund.id),
                "amount": str(refund.amount),
                "status": "dispatched",
                "message": "Refund approved and queued for processing."
            }

        except Exception as exc:
            return error_response(str(exc), status_code=status.HTTP_400_BAD_REQUEST)

        return success_response(data=response_data, message="Refund approved and dispatched for execution.")


class AdminReturnApproveReplacementView(APIView):
    """
    POST /api/v1/admin/returns/<uuid>/approve-replacement/
    """
    permission_classes = [IsAdminUserPermission]

    def post(self, request, pk):
        try:
            order = ReplacementService.create_replacement_order(return_request_id=str(pk), actor=request.user)
        except Exception as exc:
            return error_response(str(exc), status_code=status.HTTP_400_BAD_REQUEST)

        return success_response(
            data={"replacement_order_id": str(order.id), "replacement_order_number": order.order_number},
            message="Replacement order created successfully."
        )


class AdminRefundRetryView(APIView):
    """
    POST /api/v1/admin/refunds/<uuid>/retry/
    """
    permission_classes = [IsAdminUserPermission]

    def post(self, request, pk):
        try:
            refund = Refund.objects.get(pk=pk)
            exec_res = RefundService.execute_refund(refund_id=str(refund.id), actor=request.user)
        except Refund.DoesNotExist:
            return error_response("Refund record not found.", status_code=status.HTTP_404_NOT_FOUND)
        except Exception as exc:
            return error_response(str(exc), status_code=status.HTTP_400_BAD_REQUEST)

        return success_response(data=exec_res, message="Refund retry executed successfully.")
