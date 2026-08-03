from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.exceptions import ValidationError

from apps.common.responses import success_response, error_response
from apps.common.permissions import IsAdmin
from apps.support.models import (
    SupportTicket, SupportMessage, TicketTimeline,
    TicketStatus, TicketPriority, TicketCategory,
    FAQCategory, FAQItem, FAQFeedback
)
from apps.support.serializers import (
    SupportTicketSerializer, SupportMessageSerializer, TicketTimelineSerializer,
    FAQCategorySerializer, FAQItemSerializer
)
from apps.notifications.models import Notification

def get_user_role_name(user):
    if not user:
        return ""
    role = getattr(user, "role", None)
    return getattr(role, "name", None) or str(role)

def is_user_admin(user):
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_superuser", False):
        return True
    role = getattr(user, "role", None)
    if role is None:
        return False
    role_name = getattr(role, "name", None) or str(role)
    return role_name.lower() == "admin"

class SupportTicketListView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        user = request.user
        
        if is_user_admin(user):
            tickets = SupportTicket.objects.all().select_related('user', 'assigned_admin', 'related_order', 'related_product')
        else:
            tickets = SupportTicket.objects.filter(user=user).select_related('user', 'assigned_admin', 'related_order', 'related_product')

        stats_counts = {
            "open": tickets.filter(status=TicketStatus.OPEN).count(),
            "in_progress": tickets.filter(status=TicketStatus.IN_PROGRESS).count(),
            "waiting_customer": tickets.filter(status=TicketStatus.WAITING_CUSTOMER).count(),
            "resolved": tickets.filter(status=TicketStatus.RESOLVED).count(),
            "closed": tickets.filter(status=TicketStatus.CLOSED).count(),
            "high_priority": tickets.filter(priority__in=[TicketPriority.HIGH, TicketPriority.CRITICAL]).count(),
        }

        customer_id = request.query_params.get("customer")
        if customer_id and is_user_admin(user):
            tickets = tickets.filter(user_id=customer_id)

        role = request.query_params.get("role")
        if role and is_user_admin(user):
            tickets = tickets.filter(user__role=role)

        category = request.query_params.get("category")
        if category:
            tickets = tickets.filter(category=category)

        priority = request.query_params.get("priority")
        if priority:
            tickets = tickets.filter(priority=priority)

        status_val = request.query_params.get("status")
        if status_val:
            tickets = tickets.filter(status=status_val)

        assigned_admin_id = request.query_params.get("assigned_admin")
        if assigned_admin_id and is_user_admin(user):
            tickets = tickets.filter(assigned_admin_id=assigned_admin_id)

        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        if start_date:
            tickets = tickets.filter(created_at__date__gte=start_date)
        if end_date:
            tickets = tickets.filter(created_at__date__lte=end_date)

        search = request.query_params.get("search", "").strip()
        if search:
            tickets = tickets.filter(
                Q(ticket_number__icontains=search) |
                Q(subject__icontains=search) |
                Q(description__icontains=search) |
                Q(user__full_name__icontains=search) |
                Q(user__email__icontains=search) |
                Q(related_order__order_number__icontains=search) |
                Q(related_product__name__icontains=search)
            ).distinct()

        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 10))
        total = tickets.count()

        start = (page - 1) * page_size
        end = start + page_size
        ticket_page = tickets[start:end]

        serializer = SupportTicketSerializer(ticket_page, many=True, context={'request': request})
        pagination = {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size
        }
        return success_response(data=serializer.data, meta={"pagination": pagination, "stats": stats_counts}, message="Support tickets retrieved.")

    def post(self, request):
        user = request.user
        subject = request.data.get("subject", "").strip()
        category = request.data.get("category", "").strip()
        priority = request.data.get("priority", TicketPriority.MEDIUM).strip()
        description = request.data.get("description", "").strip()
        related_order_id = request.data.get("related_order")
        related_product_id = request.data.get("related_product")

        if not subject:
            return error_response("subject is a required field.", status_code=status.HTTP_400_BAD_REQUEST)
        if not category:
            return error_response("category is a required field.", status_code=status.HTTP_400_BAD_REQUEST)
        if not description:
            return error_response("description is a required field.", status_code=status.HTTP_400_BAD_REQUEST)

        if category not in TicketCategory.values:
            return error_response(f"Invalid category: {category}.", status_code=status.HTTP_400_BAD_REQUEST)
        if priority not in TicketPriority.values:
            return error_response(f"Invalid priority: {priority}.", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                ticket = SupportTicket.objects.create(
                    user=user,
                    subject=subject,
                    category=category,
                    priority=priority,
                    description=description,
                    related_order_id=related_order_id or None,
                    related_product_id=related_product_id or None,
                    status=TicketStatus.OPEN
                )

                TicketTimeline.objects.create(
                    ticket=ticket,
                    action="Ticket Created",
                    performed_by=user,
                    notes=f"Ticket raised with priority: {priority}."
                )

                message = SupportMessage(
                    ticket=ticket,
                    sender=user,
                    message=description,
                    attachment=request.FILES.get("attachment")
                )
                message.full_clean()
                message.save()

                Notification.objects.create(
                    user=user,
                    title="Support Ticket Created",
                    message=f"Your support ticket {ticket.ticket_number} has been created successfully. We will review it shortly."
                )
        except ValidationError as e:
            return error_response(message=e.message_dict if hasattr(e, "message_dict") else str(e), status_code=status.HTTP_400_BAD_REQUEST)

        serializer = SupportTicketSerializer(ticket, context={'request': request})
        return success_response(
            data=serializer.data,
            message="Support ticket raised successfully.",
            status_code=status.HTTP_201_CREATED
        )

class SupportTicketDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        user = request.user
        try:
            if is_user_admin(user):
                ticket = SupportTicket.objects.prefetch_related('messages', 'timeline').get(pk=pk)
            else:
                ticket = SupportTicket.objects.prefetch_related('messages', 'timeline').get(pk=pk, user=user)
        except SupportTicket.DoesNotExist:
            return error_response("Support ticket not found.", status_code=status.HTTP_404_NOT_FOUND)

        serializer = SupportTicketSerializer(ticket, context={'request': request})
        return success_response(data=serializer.data)

class SupportTicketMessageCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, pk):
        user = request.user
        message_text = request.data.get("message", "").strip()
        attachment_file = request.FILES.get("attachment")

        if not message_text and not attachment_file:
            return error_response("message or attachment is required.", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            if is_user_admin(user):
                ticket = SupportTicket.objects.get(pk=pk)
            else:
                ticket = SupportTicket.objects.get(pk=pk, user=user)
        except SupportTicket.DoesNotExist:
            return error_response("Support ticket not found.", status_code=status.HTTP_404_NOT_FOUND)

        try:
            with transaction.atomic():
                message = SupportMessage(
                    ticket=ticket,
                    sender=user,
                    message=message_text,
                    attachment=attachment_file
                )
                message.full_clean()
                message.save()

                ticket.save(update_fields=["updated_at"])

                if is_user_admin(user):
                    ticket.status = TicketStatus.WAITING_CUSTOMER
                    ticket.save(update_fields=["status"])

                    TicketTimeline.objects.create(
                        ticket=ticket,
                        action="Admin Replied",
                        performed_by=user,
                        notes=f"Admin replied to conversation."
                    )

                    Notification.objects.create(
                        user=ticket.user,
                        title="Support Helpdesk Reply",
                        message=f"FAAZO Helpdesk has replied to your ticket {ticket.ticket_number}."
                    )
                else:
                    if ticket.status == TicketStatus.WAITING_CUSTOMER:
                        ticket.status = TicketStatus.IN_PROGRESS
                        ticket.save(update_fields=["status"])

                    TicketTimeline.objects.create(
                        ticket=ticket,
                        action="Customer Replied",
                        performed_by=user,
                        notes=f"Customer sent reply message."
                    )
        except ValidationError as e:
            return error_response(message=e.message_dict if hasattr(e, "message_dict") else str(e), status_code=status.HTTP_400_BAD_REQUEST)

        serializer = SupportMessageSerializer(message, context={'request': request})
        return success_response(
            data=serializer.data,
            message="Reply submitted successfully.",
            status_code=status.HTTP_201_CREATED
        )

class AdminSupportTicketActionView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        user = request.user
        try:
            ticket = SupportTicket.objects.get(pk=pk)
        except SupportTicket.DoesNotExist:
            return error_response("Support ticket not found.", status_code=status.HTTP_404_NOT_FOUND)

        action = request.data.get("action", "").strip().lower()
        notes = request.data.get("notes", "").strip()

        if not action:
            return error_response("action is a required field.", status_code=status.HTTP_400_BAD_REQUEST)

        valid_actions = ["assign", "change_priority", "change_status", "resolve", "close"]
        if action not in valid_actions:
            return error_response(f"Invalid action: {action}.", status_code=status.HTTP_400_BAD_REQUEST)

        old_status = ticket.status

        with transaction.atomic():
            if action == "assign":
                assigned_admin_id = request.data.get("assigned_admin")
                if not assigned_admin_id:
                    return error_response("assigned_admin is required.", status_code=status.HTTP_400_BAD_REQUEST)
                ticket.assigned_admin_id = assigned_admin_id
                ticket.status = TicketStatus.IN_PROGRESS
                ticket.save(update_fields=["assigned_admin", "status"])

                TicketTimeline.objects.create(
                    ticket=ticket,
                    action=f"Ticket Assigned",
                    performed_by=user,
                    notes=notes or f"Ticket assigned to admin ID: {assigned_admin_id}."
                )

            elif action == "change_priority":
                priority = request.data.get("priority", "").strip()
                if not priority or priority not in TicketPriority.values:
                    return error_response(f"Invalid priority value.", status_code=status.HTTP_400_BAD_REQUEST)
                old_priority = ticket.priority
                ticket.priority = priority
                ticket.save(update_fields=["priority"])

                TicketTimeline.objects.create(
                    ticket=ticket,
                    action="Priority Changed",
                    performed_by=user,
                    notes=notes or f"Priority changed from {old_priority} to {priority}."
                )

            elif action == "change_status":
                new_status = request.data.get("status", "").strip().lower()
                if not new_status or new_status not in TicketStatus.values:
                    return error_response(f"Invalid status value.", status_code=status.HTTP_400_BAD_REQUEST)
                ticket.status = new_status
                ticket.save(update_fields=["status"])

                TicketTimeline.objects.create(
                    ticket=ticket,
                    action="Status Updated",
                    performed_by=user,
                    notes=notes or f"Status shifted from {old_status} to {new_status}."
                )

                Notification.objects.create(
                    user=ticket.user,
                    title="Support Ticket Update",
                    message=f"Your support ticket {ticket.ticket_number} status was changed to: {new_status}."
                )

            elif action == "resolve":
                ticket.status = TicketStatus.RESOLVED
                ticket.save()

                TicketTimeline.objects.create(
                    ticket=ticket,
                    action="Ticket Resolved",
                    performed_by=user,
                    notes=notes or f"Ticket marked resolved by admin."
                )

                Notification.objects.create(
                    user=ticket.user,
                    title="Support Ticket Resolved",
                    message=f"Your support ticket {ticket.ticket_number} has been resolved. Let us know if you need more help."
                )

            elif action == "close":
                ticket.status = TicketStatus.CLOSED
                ticket.save()

                TicketTimeline.objects.create(
                    ticket=ticket,
                    action="Ticket Closed",
                    performed_by=user,
                    notes=notes or f"Ticket marked closed by admin."
                )

                Notification.objects.create(
                    user=ticket.user,
                    title="Support Ticket Closed",
                    message=f"Your support ticket {ticket.ticket_number} has been closed."
                )

        serializer = SupportTicketSerializer(ticket, context={'request': request})
        return success_response(data=serializer.data, message=f"Action '{action}' executed successfully.")

class SupportAdminUserListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from django.contrib.auth import get_user_model
        from apps.support.serializers import UserMinimalSerializer
        admins = get_user_model().objects.filter(Q(role="admin") | Q(is_superuser=True))
        serializer = UserMinimalSerializer(admins, many=True)
        return success_response(data=serializer.data, message="Admins retrieved.")


class FAQListView(APIView):
    """
    Public Endpoint: List active FAQ categories and items.
    Query parameters:
      - search: string (Filter by question, answer, or category name)
      - category: string (Filter by category slug)
      - featured: true/false
    """
    permission_classes = [AllowAny]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        category_slug = request.query_params.get("category", "").strip()
        featured = request.query_params.get("featured")

        if search:
            faqs = FAQItem.objects.filter(
                Q(question__icontains=search) |
                Q(answer__icontains=search) |
                Q(category__name__icontains=search),
                is_active=True,
            ).select_related("category").order_by("display_order", "created_at")

            serializer = FAQItemSerializer(faqs, many=True)
            return success_response(
                data={"search_mode": True, "items": serializer.data},
                message=f"Found {faqs.count()} matching FAQs.",
            )

        categories = FAQCategory.objects.filter(is_active=True).prefetch_related("items").order_by("display_order", "name")
        if category_slug:
            categories = categories.filter(slug=category_slug)

        category_serializer = FAQCategorySerializer(categories, many=True)

        # Featured FAQs
        featured_faqs = FAQItem.objects.filter(is_featured=True, is_active=True).select_related("category").order_by("display_order")[:6]
        featured_serializer = FAQItemSerializer(featured_faqs, many=True)

        return success_response(
            data={
                "featured_faqs": featured_serializer.data,
                "categories": category_serializer.data,
            },
            message="FAQ topics retrieved.",
        )


class FAQFeedbackView(APIView):
    """
    Public Endpoint: Submit feedback for an FAQ item ("Did this answer your question?").
    """
    permission_classes = [AllowAny]

    def post(self, request, pk):
        try:
            faq = FAQItem.objects.get(id=pk, is_active=True)
        except FAQItem.DoesNotExist:
            return error_response(message="FAQ item not found.", status_code=status.HTTP_404_NOT_FOUND)

        is_helpful = request.data.get("is_helpful", True)
        if isinstance(is_helpful, str):
            is_helpful = is_helpful.lower() == "true"

        user = request.user if request.user.is_authenticated else None
        ip_address = request.META.get("REMOTE_ADDR")

        FAQFeedback.objects.create(
            faq=faq,
            user=user,
            is_helpful=bool(is_helpful),
            ip_address=ip_address,
        )

        if is_helpful:
            faq.helpful_count += 1
            faq.save(update_fields=["helpful_count"])
        else:
            faq.unhelpful_count += 1
            faq.save(update_fields=["unhelpful_count"])

        return success_response(
            data={
                "helpful_count": faq.helpful_count,
                "unhelpful_count": faq.unhelpful_count,
            },
            message="Thank you for your feedback!",
        )

