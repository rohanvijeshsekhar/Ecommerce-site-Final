"""
FAAZO – Customer Return REST API Views

Customer endpoints for:
- Checking return eligibility (GET /api/v1/returns/eligibility/)
- Submitting a return/replacement request with evidence files (POST /api/v1/returns/)
- Listing customer's return requests (GET /api/v1/returns/)
- Retrieving return details & status timeline (GET /api/v1/returns/<id>/)
- Cancelling pending return request (POST /api/v1/returns/<id>/cancel/)
"""

import logging
from django.db import transaction
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.common.responses import success_response, error_response
from apps.orders.models import Order, OrderItem
from apps.returns.models import (
    ReturnRequest,
    ReturnItem,
    ReturnEvidence,
    ReturnStatus,
)
from apps.returns.serializers import (
    ReturnRequestSerializer,
    CreateReturnRequestSerializer,
)
from apps.returns.services.eligibility import ReturnEligibilityService
from apps.returns.services.state_machine import ReturnStateMachineService
from apps.returns.services.refund_service import RefundService

logger = logging.getLogger("faazo.returns")


class CustomerReturnEligibilityView(APIView):
    """
    GET /api/v1/returns/eligibility/?order_id=<uuid>
    Returns eligibility evaluation for items in an order.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        order_id = request.query_params.get("order_id", "").strip()
        if not order_id:
            return error_response("order_id parameter is required.", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.prefetch_related("items__product").get(pk=order_id, user=request.user)
        except Order.DoesNotExist:
            return error_response("Order not found or access denied.", status_code=status.HTTP_404_NOT_FOUND)

        eligibility_data = ReturnEligibilityService.evaluate_order_eligibility(order)
        return success_response(data=eligibility_data, message="Eligibility evaluation complete.")


class CustomerReturnListCreateView(APIView):
    """
    GET  /api/v1/returns/      — List customer return requests.
    POST /api/v1/returns/      — Submit a new return/replacement request.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        returns_qs = (
            ReturnRequest.objects.filter(customer=request.user)
            .select_related("order", "replacement_order")
            .prefetch_related("items__order_item__product", "evidence", "events", "refund", "shipment")
            .order_by("-created_at")
        )
        serializer = ReturnRequestSerializer(returns_qs, many=True)
        return success_response(data=serializer.data, message="Return requests retrieved.")

    def post(self, request):
        serializer = CreateReturnRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("Invalid return request payload.", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        order_id = data["order_id"]

        # Validate order ownership
        try:
            order = Order.objects.get(pk=order_id, user=request.user)
        except Order.DoesNotExist:
            return error_response("Order not found or access denied.", status_code=status.HTTP_404_NOT_FOUND)

        items_input = data["items"]
        if not items_input:
            return error_response("At least one item must be selected for return.", status_code=status.HTTP_400_BAD_REQUEST)

        # Validate item eligibility & quantities
        with transaction.atomic():
            created_return_items = []
            total_calculated_refund = 0.0

            # 1. Create Master ReturnRequest
            return_request = ReturnRequest.objects.create(
                customer=request.user,
                order=order,
                request_type=data["request_type"],
                status=ReturnStatus.REQUESTED,
                reason=data["reason"],
                customer_notes=data.get("customer_notes", ""),
            )

            # 2. Process Line Items
            for item_data in items_input:
                try:
                    order_item = OrderItem.objects.get(pk=item_data["order_item_id"], order=order)
                except OrderItem.DoesNotExist:
                    return error_response(f"Order item {item_data['order_item_id']} does not belong to this order.", status_code=status.HTTP_400_BAD_REQUEST)

                eligibility = ReturnEligibilityService.evaluate_item_eligibility(order_item)
                if not eligibility["is_eligible"]:
                    return error_response(
                        f"Item '{order_item.product.name}' is ineligible: {eligibility['message']}",
                        status_code=status.HTTP_400_BAD_REQUEST
                    )

                req_qty = item_data["quantity"]
                if req_qty > eligibility["max_returnable_qty"]:
                    return error_response(
                        f"Requested quantity ({req_qty}) exceeds max returnable quantity ({eligibility['max_returnable_qty']}) for '{order_item.product.name}'.",
                        status_code=status.HTTP_400_BAD_REQUEST
                    )

                line_refund = float(order_item.price) * req_qty
                total_calculated_refund += line_refund

                ret_item = ReturnItem.objects.create(
                    return_request=return_request,
                    order_item=order_item,
                    requested_quantity=req_qty,
                    approved_quantity=req_qty,
                    unit_price=order_item.price,
                    refund_amount=line_refund,
                )
                created_return_items.append(ret_item)

            return_request.total_refund_amount = total_calculated_refund
            return_request.save(update_fields=["total_refund_amount"])

            # 3. Process Evidence Files (if uploaded in multipart request)
            files = request.FILES.getlist("evidence_files") or request.FILES.getlist("evidence")
            if files:
                if len(files) > 4:
                    return error_response("Maximum 4 evidence files allowed per return request.", status_code=status.HTTP_400_BAD_REQUEST)

                for f in files:
                    # Validate file size (max 5MB)
                    if f.size > 5 * 1024 * 1024:
                        return error_response(f"File '{f.name}' exceeds maximum 5MB size limit.", status_code=status.HTTP_400_BAD_REQUEST)

                    mime_type = f.content_type or "image/jpeg"
                    if not (mime_type.startswith("image/") or mime_type == "application/pdf"):
                        return error_response(f"File '{f.name}' has invalid format. Only images and PDFs are allowed.", status_code=status.HTTP_400_BAD_REQUEST)

                    ReturnEvidence.objects.create(
                        return_request=return_request,
                        file=f,
                        file_type=mime_type,
                        file_size=f.size,
                        uploaded_by=request.user,
                    )

            # Record initial state transition event
            ReturnStateMachineService.transition_to(
                return_request_id=str(return_request.id),
                target_status=ReturnStatus.UNDER_REVIEW,
                actor=request.user,
                notes="Return request submitted by customer and moved to Under Review.",
            )

        res_serializer = ReturnRequestSerializer(return_request)
        return success_response(
            data=res_serializer.data,
            message="Return request submitted successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class CustomerReturnDetailView(APIView):
    """
    GET /api/v1/returns/<uuid>/ — Retrieve own return request details.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            return_req = (
                ReturnRequest.objects.select_related("order", "replacement_order")
                .prefetch_related("items__order_item__product", "evidence", "events", "refund", "shipment")
                .get(pk=pk, customer=request.user)
            )
        except ReturnRequest.DoesNotExist:
            return error_response("Return request not found or access denied.", status_code=status.HTTP_404_NOT_FOUND)

        serializer = ReturnRequestSerializer(return_req)
        return success_response(data=serializer.data, message="Return request details retrieved.")


class CustomerReturnCancelView(APIView):
    """
    POST /api/v1/returns/<uuid>/cancel/ — Cancel pending return request.
    Allowed only in REQUESTED or UNDER_REVIEW statuses.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            return_req = ReturnRequest.objects.get(pk=pk, customer=request.user)
        except ReturnRequest.DoesNotExist:
            return error_response("Return request not found or access denied.", status_code=status.HTTP_404_NOT_FOUND)

        if return_req.status not in [ReturnStatus.REQUESTED, ReturnStatus.UNDER_REVIEW]:
            return error_response(
                f"Cannot cancel return request in status '{return_req.get_status_display()}'.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        updated_req = ReturnStateMachineService.transition_to(
            return_request_id=str(return_req.id),
            target_status=ReturnStatus.CANCELLED,
            actor=request.user,
            notes="Return request cancelled by customer.",
        )

        serializer = ReturnRequestSerializer(updated_req)
        return success_response(data=serializer.data, message="Return request cancelled successfully.")
