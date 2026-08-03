from django.contrib import admin
from apps.support.models import SupportTicket, SupportMessage, TicketTimeline, FAQCategory, FAQItem, FAQFeedback

class SupportMessageInline(admin.TabularInline):
    model = SupportMessage
    extra = 1

class TicketTimelineInline(admin.TabularInline):
    model = TicketTimeline
    extra = 0
    readonly_fields = ["action", "performed_by", "notes", "created_at"]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ["ticket_number", "user", "subject", "category", "priority", "status", "assigned_admin", "created_at"]
    list_filter = ["status", "priority", "category"]
    search_fields = ["ticket_number", "subject", "description", "user__email", "user__full_name"]
    readonly_fields = ["ticket_number", "created_at", "updated_at", "resolved_at"]
    inlines = [SupportMessageInline, TicketTimelineInline]


@admin.register(FAQCategory)
class FAQCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "icon", "display_order", "is_active"]
    list_editable = ["display_order", "is_active"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(FAQItem)
class FAQItemAdmin(admin.ModelAdmin):
    list_display = ["question", "category", "action_button_label", "is_featured", "display_order", "helpful_count", "unhelpful_count", "is_active"]
    list_filter = ["category", "is_featured", "is_active", "action_button_type"]
    list_editable = ["display_order", "is_featured", "is_active"]
    search_fields = ["question", "answer", "slug"]
    prepopulated_fields = {"slug": ("question",)}


@admin.register(FAQFeedback)
class FAQFeedbackAdmin(admin.ModelAdmin):
    list_display = ["faq", "is_helpful", "user", "ip_address", "created_at"]
    list_filter = ["is_helpful", "created_at"]
    readonly_fields = ["faq", "user", "is_helpful", "ip_address", "created_at"]

