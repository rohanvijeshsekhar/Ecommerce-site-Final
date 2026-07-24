from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.common.responses import success_response, error_response
from apps.common.permissions import IsAdmin, IsAdminOrDealer, IsCustomer
from apps.orders.models import Order, OrderStatus
from apps.warranty.models import (
    WarrantyRegistration,
    WarrantyClaim,
    WarrantyAttachment,
    ClaimTimeline,
    ClaimStatus,
    AttachmentType,
    ClaimPriority,
    WarrantyRegistrationStatus
)
from apps.warranty.serializers import (
    WarrantyRegistrationSerializer,
    WarrantyClaimSerializer,
    WarrantyAttachmentSerializer
)

# ============================================================
# Customer / Dealer Endpoints
# ============================================================

class WarrantyRegistrationListView(APIView):
    """
    List registrations for the authenticated user/dealer.
    Only returns FAAZO products.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()
        # Bulk update active registrations whose duration has elapsed to EXPIRED
        WarrantyRegistration.objects.filter(
            user=user,
            warranty_status=WarrantyRegistrationStatus.ACTIVE,
            warranty_end__lt=today
        ).update(warranty_status=WarrantyRegistrationStatus.EXPIRED)

        registrations = WarrantyRegistration.objects.filter(user=user).select_related(
            'product', 'order', 'order_item'
        )

        status_filter = request.query_params.get("status")
        if status_filter:
            registrations = registrations.filter(warranty_status=status_filter)

        search_query = request.query_params.get("search")
        if search_query:
            registrations = registrations.filter(
                Q(product__name__icontains=search_query) |
                Q(order__order_number__icontains=search_query) |
                Q(serial_number__icontains=search_query)
            ).distinct()

        serializer = WarrantyRegistrationSerializer(registrations, many=True, context={'request': request})
        return success_response(
            data=serializer.data,
            message="Warranty registrations retrieved successfully."
        )


class WarrantyRegistrationDetailView(APIView):
    """
    Retrieve registration details.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        today = timezone.now().date()
        # Bulk update active registrations whose duration has elapsed to EXPIRED
        WarrantyRegistration.objects.filter(
            user=request.user,
            warranty_status=WarrantyRegistrationStatus.ACTIVE,
            warranty_end__lt=today
        ).update(warranty_status=WarrantyRegistrationStatus.EXPIRED)

        try:
            registration = WarrantyRegistration.objects.select_related(
                'product', 'order', 'order_item'
            ).get(pk=pk, user=request.user)
        except WarrantyRegistration.DoesNotExist:
            return error_response("Warranty registration not found.", status_code=status.HTTP_404_NOT_FOUND)

        serializer = WarrantyRegistrationSerializer(registration, context={'request': request})
        return success_response(data=serializer.data)


class WarrantyRegistrationSubmitView(APIView):
    """
    Customer endpoint to submit manual warranty verification details.
    PATCH /api/v1/warranty/registrations/<pk>/register/
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request, pk):
        try:
            registration = WarrantyRegistration.objects.select_related('product').get(pk=pk, user=request.user)
        except WarrantyRegistration.DoesNotExist:
            return error_response("Warranty registration not found.", status_code=status.HTTP_404_NOT_FOUND)

        # Guard: check for duplicate registration
        if registration.warranty_status in [WarrantyRegistrationStatus.PENDING_VERIFICATION, WarrantyRegistrationStatus.ACTIVE]:
            return error_response(
                "Warranty registration has already been submitted.",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        valid_statuses = [
            WarrantyRegistrationStatus.PENDING_REGISTRATION,
            WarrantyRegistrationStatus.NEED_MORE_INFO
        ]
        if registration.warranty_status not in valid_statuses:
            return error_response(
                f"Registration cannot be submitted in status: {registration.warranty_status}.",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        invoice_file = request.FILES.get("invoice")
        if not invoice_file and not registration.invoice:
            return error_response("Invoice file is required for registration.", status_code=status.HTTP_400_BAD_REQUEST)

        serial_number = request.data.get("serial_number", "").strip()
        # If product requires serial number, enforce it
        if registration.product.serial_number_required and not serial_number and not registration.serial_number:
            return error_response(
                "Manufacturer serial number is required for this product.",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        notes = request.data.get("notes", "").strip()

        # Update registration details
        if invoice_file:
            registration.invoice = invoice_file
        if serial_number:
            registration.serial_number = serial_number
        if notes:
            registration.notes = notes

        # Shift status to pending_verification
        registration.warranty_status = WarrantyRegistrationStatus.PENDING_VERIFICATION
        try:
            registration.save()
        except Exception as e:
            return error_response(f"Validation failed: {str(e)}", status_code=status.HTTP_400_BAD_REQUEST)

        serializer = WarrantyRegistrationSerializer(registration, context={'request': request})
        return success_response(
            data=serializer.data,
            message="Warranty registration submitted for verification."
        )


class ImportedProductsListView(APIView):
    """
    Extract delivered order items that are imported products (non-FAAZO warranties)
    to show dynamic external website register options on the customer portal.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(user=request.user, status=OrderStatus.DELIVERED).prefetch_related('items__product__brand')
        imported_items = []
        
        for order in orders:
            for item in order.items.all():
                # GATING: Filter items serviced by imported brands (warranty_provider != 'faazo')
                if item.product.warranty_provider != 'faazo':
                    img_url = None
                    if item.product.primary_image and item.product.primary_image.image:
                        img_url = request.build_absolute_uri(item.product.primary_image.image.url)

                    imported_items.append({
                        "id": str(item.id),
                        "order_number": order.order_number,
                        "invoice_number": order.invoice_number,
                        "purchase_date": order.delivered_at.date() if order.delivered_at else order.created_at.date(),
                        "product_name": item.product.name,
                        "brand_name": item.product.brand.name if item.product.brand else "Imported Brand",
                        "sku": item.product.sku,
                        "warranty_months": item.product.effective_warranty_months,
                        "warranty_provider": item.product.warranty_provider,
                        "warranty_terms": item.product.warranty_terms,
                        "warranty_contact_details": item.product.warranty_contact_details,
                        "warranty_website_url": item.product.warranty_website_url,
                        "primary_image_url": img_url
                    })

        return success_response(data=imported_items, message="Imported items retrieved.")


class WarrantyClaimListView(APIView):
    """
    List and raise warranty claims. Supports file uploads.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        claims = WarrantyClaim.objects.filter(
            registration__user=request.user
        ).select_related(
            'registration', 'registration__product', 'registration__order'
        ).prefetch_related('attachments', 'timeline')

        serializer = WarrantyClaimSerializer(claims, many=True, context={'request': request})
        return success_response(data=serializer.data, message="Warranty claims retrieved.")

    def post(self, request):
        """Creates a claim with multi-part attachments."""
        registration_id = request.data.get("registration")
        description = request.data.get("description", "").strip()
        priority = request.data.get("priority", ClaimPriority.MEDIUM)

        if not registration_id:
            return error_response("registration field is required.", status_code=status.HTTP_400_BAD_REQUEST)
        if not description:
            return error_response("description field is required.", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            registration = WarrantyRegistration.objects.get(pk=registration_id, user=request.user)
        except WarrantyRegistration.DoesNotExist:
            return error_response("Warranty registration not found.", status_code=status.HTTP_404_NOT_FOUND)

        # Serializer enforces claim validation checks (Active registration, no duplication, ownership)
        serializer = WarrantyClaimSerializer(
            data={"registration": registration.id, "description": description, "priority": priority},
            context={'request': request}
        )
        if not serializer.is_valid():
            return error_response(message="Invalid data", details=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                claim = serializer.save()

                # Record Initial Timeline Event
                ClaimTimeline.objects.create(
                    claim=claim,
                    action="Claim Submitted",
                    performed_by=request.user,
                    notes=f"Claim initiated by {request.user.role} with priority: {priority}."
                )

                # Process attachments
                # Invoice attachment
                invoice_file = request.FILES.get("invoice")
                if invoice_file:
                    WarrantyAttachment.objects.create(
                        claim=claim,
                        file=invoice_file,
                        attachment_type=AttachmentType.INVOICE
                    )

                # Multiple image files
                images = request.FILES.getlist("images")
                for img in images:
                    WarrantyAttachment.objects.create(
                        claim=claim,
                        file=img,
                        attachment_type=AttachmentType.PRODUCT_IMAGE
                    )

                # Single optional video file
                video_file = request.FILES.get("video")
                if video_file:
                    WarrantyAttachment.objects.create(
                        claim=claim,
                        file=video_file,
                        attachment_type=AttachmentType.VIDEO
                    )

            # Reload to serialize nested fields
            reloaded_claim = WarrantyClaim.objects.prefetch_related('attachments', 'timeline').get(id=claim.id)
            return success_response(
                data=WarrantyClaimSerializer(reloaded_claim, context={'request': request}).data,
                message="Warranty claim raised successfully.",
                status_code=status.HTTP_201_CREATED
            )
        except Exception as e:
            return error_response(f"Failed to raise claim: {str(e)}", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WarrantyClaimDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            claim = WarrantyClaim.objects.select_related(
                'registration', 'registration__product', 'registration__order'
            ).prefetch_related('attachments', 'timeline').get(pk=pk, registration__user=request.user)
        except WarrantyClaim.DoesNotExist:
            return error_response("Warranty claim not found.", status_code=status.HTTP_404_NOT_FOUND)

        serializer = WarrantyClaimSerializer(claim, context={'request': request})
        return success_response(data=serializer.data)


# ============================================================
# Admin Endpoints
# ============================================================

class AdminWarrantyDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        total_registrations = WarrantyRegistration.objects.count()
        active_warranties = WarrantyRegistration.objects.filter(
            warranty_status=WarrantyRegistrationStatus.ACTIVE
        ).count()
        
        # Registrations categories
        regs_pending_verification = WarrantyRegistration.objects.filter(
            warranty_status=WarrantyRegistrationStatus.PENDING_VERIFICATION
        ).count()
        regs_approved = active_warranties
        regs_rejected = WarrantyRegistration.objects.filter(
            warranty_status=WarrantyRegistrationStatus.REJECTED
        ).count()

        # Claims categories
        claims = WarrantyClaim.objects.all()
        claims_submitted = claims.filter(status=ClaimStatus.SUBMITTED).count()
        claims_under_review = claims.filter(status=ClaimStatus.UNDER_REVIEW).count()
        claims_approved = claims.filter(status=ClaimStatus.APPROVED).count()
        claims_assigned = claims.filter(status=ClaimStatus.ASSIGNED).count()
        claims_repair_in_progress = claims.filter(status=ClaimStatus.REPAIR_IN_PROGRESS).count()
        claims_completed = claims.filter(status=ClaimStatus.COMPLETED).count()
        claims_closed = claims.filter(status=ClaimStatus.CLOSED).count()

        stats = {
            "total_registrations": total_registrations,
            "active_warranties": active_warranties,
            "regs_pending_verification": regs_pending_verification,
            "regs_approved": regs_approved,
            "regs_rejected": regs_rejected,
            "claims_submitted": claims_submitted,
            "claims_under_review": claims_under_review,
            "claims_approved": claims_approved,
            "claims_assigned": claims_assigned,
            "claims_repair_in_progress": claims_repair_in_progress,
            "claims_completed": claims_completed,
            "claims_closed": claims_closed
        }
        return success_response(data=stats, message="Warranty admin dashboard stats retrieved.")


class AdminWarrantyRegistrationListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        today = timezone.now().date()
        # Bulk update active registrations whose duration has elapsed to EXPIRED
        WarrantyRegistration.objects.filter(
            warranty_status=WarrantyRegistrationStatus.ACTIVE,
            warranty_end__lt=today
        ).update(warranty_status=WarrantyRegistrationStatus.EXPIRED)

        registrations = WarrantyRegistration.objects.select_related(
            'user', 'product', 'order'
        ).all()

        # Filters
        customer = request.query_params.get("customer")
        if customer:
            registrations = registrations.filter(
                Q(user__full_name__icontains=customer) | Q(user__email__icontains=customer)
            )

        role = request.query_params.get("role")
        if role:
            registrations = registrations.filter(user__role=role)

        product = request.query_params.get("product")
        if product:
            registrations = registrations.filter(
                Q(product__name__icontains=product) | Q(product__sku__icontains=product)
            )

        status_val = request.query_params.get("status")
        if status_val:
            registrations = registrations.filter(warranty_status=status_val)

        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        if start_date:
            registrations = registrations.filter(purchase_date__gte=start_date)
        if end_date:
            registrations = registrations.filter(purchase_date__lte=end_date)

        # Pagination
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 10))
        total = registrations.count()

        start = (page - 1) * page_size
        end = start + page_size
        reg_page = registrations[start:end]

        serializer = WarrantyRegistrationSerializer(reg_page, many=True, context={'request': request})
        pagination = {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size
        }
        return success_response(data=serializer.data, meta={"pagination": pagination})


class AdminWarrantyRegistrationActionView(APIView):
    """
    Administrative verification endpoint for manual registrations.
    POST /api/v1/warranty/admin/registrations/<pk>/action/
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            registration = WarrantyRegistration.objects.get(pk=pk)
        except WarrantyRegistration.DoesNotExist:
            return error_response("Warranty registration not found.", status_code=status.HTTP_404_NOT_FOUND)

        action = request.data.get("action", "").strip().lower()
        notes = request.data.get("notes", "").strip()

        if not action:
            return error_response("action is a required field.", status_code=status.HTTP_400_BAD_REQUEST)

        valid_actions = ["approve", "reject", "request_info"]
        if action not in valid_actions:
            return error_response(f"Invalid action: {action}.", status_code=status.HTTP_400_BAD_REQUEST)

        action_log = f"[{timezone.now().strftime('%Y-%m-%d %H:%M:%S')}] Admin Action: {action.upper()}."
        if notes:
            action_log += f" Notes: {notes}"

        with transaction.atomic():
            if action == "approve":
                registration.warranty_status = WarrantyRegistrationStatus.ACTIVE
            elif action == "reject":
                registration.warranty_status = WarrantyRegistrationStatus.REJECTED
            elif action == "request_info":
                registration.warranty_status = WarrantyRegistrationStatus.NEED_MORE_INFO

            if registration.admin_notes:
                registration.admin_notes = f"{registration.admin_notes}\n{action_log}"
            else:
                registration.admin_notes = action_log

            registration.save()

        serializer = WarrantyRegistrationSerializer(registration, context={'request': request})
        return success_response(
            data=serializer.data,
            message=f"Warranty registration review action '{action}' executed."
        )


class AdminWarrantyClaimListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        claims = WarrantyClaim.objects.select_related(
            'registration', 'registration__user', 'registration__product', 'registration__order'
        ).all()

        # Filters
        customer = request.query_params.get("customer")
        if customer:
            claims = claims.filter(
                Q(registration__user__full_name__icontains=customer) |
                Q(registration__user__email__icontains=customer)
            )

        role = request.query_params.get("role")
        if role:
            claims = claims.filter(registration__user__role=role)

        product = request.query_params.get("product")
        if product:
            claims = claims.filter(
                Q(registration__product__name__icontains=product) |
                Q(registration__product__sku__icontains=product)
            )

        status_val = request.query_params.get("status")
        if status_val:
            claims = claims.filter(status=status_val)

        priority = request.query_params.get("priority")
        if priority:
            claims = claims.filter(priority=priority)

        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        if start_date:
            claims = claims.filter(created_at__date__gte=start_date)
        if end_date:
            claims = claims.filter(created_at__date__lte=end_date)

        # Pagination
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 10))
        total = claims.count()

        start = (page - 1) * page_size
        end = start + page_size
        claim_page = claims[start:end]

        serializer = WarrantyClaimSerializer(claim_page, many=True, context={'request': request})
        pagination = {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size
        }
        return success_response(data=serializer.data, meta={"pagination": pagination})


class AdminWarrantyClaimDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, pk):
        try:
            claim = WarrantyClaim.objects.select_related(
                'registration', 'registration__user', 'registration__product', 'registration__order'
            ).prefetch_related('attachments', 'timeline').get(pk=pk)
        except WarrantyClaim.DoesNotExist:
            return error_response("Warranty claim not found.", status_code=status.HTTP_404_NOT_FOUND)

        serializer = WarrantyClaimSerializer(claim, context={'request': request})
        return success_response(data=serializer.data)


class AdminWarrantyClaimActionView(APIView):
    """
    Perform workflow transitions on a warranty claim:
    Approve, Reject, Need More Info, Assign Provider, Update Status, Close Claim.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            claim = WarrantyClaim.objects.select_related('registration', 'registration__user').get(pk=pk)
        except WarrantyClaim.DoesNotExist:
            return error_response("Warranty claim not found.", status_code=status.HTTP_404_NOT_FOUND)

        action = request.data.get("action", "").strip().lower()
        notes = request.data.get("notes", "").strip()
        resolution = request.data.get("resolution", "").strip()
        provider = request.data.get("provider", "").strip()
        new_status = request.data.get("status", "").strip().lower()

        if not action:
            return error_response("action is a required field.", status_code=status.HTTP_400_BAD_REQUEST)

        old_status = claim.status

        try:
            with transaction.atomic():
                if action == "approve":
                    claim.status = ClaimStatus.APPROVED
                    claim.save(update_fields=["status"])
                    ClaimTimeline.objects.create(
                        claim=claim,
                        action="Claim Approved",
                        performed_by=request.user,
                        notes=notes or "Claim was approved by the administrator."
                    )

                elif action == "reject":
                    claim.status = ClaimStatus.REJECTED
                    if resolution:
                        claim.resolution = resolution
                    claim.save(update_fields=["status", "resolution"])
                    ClaimTimeline.objects.create(
                        claim=claim,
                        action="Claim Rejected",
                        performed_by=request.user,
                        notes=notes or f"Claim was rejected. Resolution: {resolution or 'N/A'}"
                    )

                elif action == "request_info":
                    claim.status = ClaimStatus.NEED_MORE_INFO
                    claim.save(update_fields=["status"])
                    ClaimTimeline.objects.create(
                        claim=claim,
                        action="More Information Requested",
                        performed_by=request.user,
                        notes=notes or "Admin requested clarification or additional documentation."
                    )

                elif action == "assign":
                    if not provider:
                        return error_response("provider is required for assignment action.", status_code=status.HTTP_400_BAD_REQUEST)
                    claim.status = ClaimStatus.ASSIGNED
                    claim.assigned_provider = provider
                    claim.save(update_fields=["status", "assigned_provider"])
                    ClaimTimeline.objects.create(
                        claim=claim,
                        action=f"Provider Assigned: {provider}",
                        performed_by=request.user,
                        notes=notes or f"Servicing assigned to provider: {provider}."
                    )

                elif action == "update_status":
                    if not new_status:
                        return error_response("status field is required for update_status action.", status_code=status.HTTP_400_BAD_REQUEST)
                    if new_status not in ClaimStatus.values:
                        return error_response(f"Invalid status: {new_status}.", status_code=status.HTTP_400_BAD_REQUEST)
                    claim.status = new_status
                    claim.save(update_fields=["status"])
                    ClaimTimeline.objects.create(
                        claim=claim,
                        action=f"Status Updated to {claim.get_status_display()}",
                        performed_by=request.user,
                        notes=notes or f"Status shifted from {old_status} to {new_status}."
                    )

                elif action == "close":
                    claim.status = ClaimStatus.CLOSED
                    if resolution:
                        claim.resolution = resolution
                    claim.save(update_fields=["status", "resolution"])
                    ClaimTimeline.objects.create(
                        claim=claim,
                        action="Claim Closed",
                        performed_by=request.user,
                        notes=notes or f"Claim marked closed. Resolution: {resolution or 'Completed'}"
                    )
                else:
                    return error_response(f"Invalid action: {action}.", status_code=status.HTTP_400_BAD_REQUEST)

            reloaded_claim = WarrantyClaim.objects.prefetch_related('attachments', 'timeline').get(id=claim.id)
            return success_response(
                data=WarrantyClaimSerializer(reloaded_claim, context={'request': request}).data,
                message=f"Claim action '{action}' completed."
            )
        except Exception as e:
            return error_response(f"Action failed: {str(e)}", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
