from django.urls import path
from apps.support.views import (
    SupportTicketListView,
    SupportTicketDetailView,
    SupportTicketMessageCreateView,
    AdminSupportTicketActionView,
    SupportAdminUserListView,
    FAQListView,
    FAQFeedbackView,
)

urlpatterns = [
    path("faqs/", FAQListView.as_view(), name="faq-list"),
    path("faqs/<uuid:pk>/feedback/", FAQFeedbackView.as_view(), name="faq-feedback"),
    path("tickets/", SupportTicketListView.as_view(), name="support-ticket-list"),
    path("tickets/<uuid:pk>/", SupportTicketDetailView.as_view(), name="support-ticket-detail"),
    path("tickets/<uuid:pk>/reply/", SupportTicketMessageCreateView.as_view(), name="support-ticket-reply"),
    path("admin/tickets/<uuid:pk>/action/", AdminSupportTicketActionView.as_view(), name="support-ticket-admin-action"),
    path("admin/users/", SupportAdminUserListView.as_view(), name="support-admin-users-list"),
]
