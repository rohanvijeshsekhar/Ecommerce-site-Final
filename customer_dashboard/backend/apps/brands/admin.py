from django.contrib import admin
from django.utils.html import format_html
from .models import Brand, BrandDocument, BrandPageBanner


class BrandDocumentInline(admin.TabularInline):
    model = BrandDocument
    extra = 0
    fields = ("title", "document_type", "file", "external_url", "is_public")


@admin.register(BrandPageBanner)
class BrandPageBannerAdmin(admin.ModelAdmin):
    list_display = ("title", "button_text", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("title", "subtitle")
    readonly_fields = ("banner_preview",)

    def banner_preview(self, obj):
        if obj.banner_image:
            return format_html('<img src="{}" style="max-height: 120px; border-radius: 8px;" />', obj.banner_image.url)
        return "No Banner Image"
    banner_preview.short_description = "Banner Preview"


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display  = ("logo_preview", "name", "country_of_origin", "display_order", "is_featured", "is_active", "created_at")
    list_filter   = ("is_active", "is_featured", "country_of_origin")
    search_fields = ("name", "slug", "short_description", "full_description", "support_email")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("logo_preview", "banner_preview", "created_at", "updated_at", "created_by", "updated_by")
    inlines = [BrandDocumentInline]
    ordering = ("display_order", "name")

    def logo_preview(self, obj):
        if obj.logo:
            return format_html('<img src="{}" style="height: 40px; width: 40px; object-fit: contain; border-radius: 6px;" />', obj.logo.url)
        return "—"
    logo_preview.short_description = "Logo"

    def banner_preview(self, obj):
        if obj.banner_image:
            return format_html('<img src="{}" style="max-height: 120px; border-radius: 8px;" />', obj.banner_image.url)
        return "No Banner"
    banner_preview.short_description = "Banner Preview"

    fieldsets = (
        ("Brand Identity", {
            "fields": (
                "name", "slug", "short_description", "full_description",
                "logo", "logo_preview", "banner_image", "banner_preview",
                "country_of_origin", "display_order", "is_featured", "is_active"
            ),
        }),
        ("Contact Details", {
            "fields": ("website_url", "support_email", "support_phone"),
        }),
        ("SEO Meta Tags", {
            "fields": ("seo_title", "seo_description"),
        }),
        ("Warranty Policy", {
            "fields": ("warranty_policy_text", "warranty_months_default", "is_warranty_transferable"),
        }),
        ("Service Policy", {
            "fields": ("service_policy_text", "service_turnaround_days"),
        }),
        ("Compliance & Docs", {
            "fields": ("certifications", "documentation_url"),
        }),
        ("Audit", {
            "fields": ("created_at", "updated_at", "created_by", "updated_by"),
            "classes": ("collapse",),
        }),
    )


@admin.register(BrandDocument)
class BrandDocumentAdmin(admin.ModelAdmin):
    list_display  = ("title", "brand", "document_type", "is_public", "created_at")
    list_filter   = ("document_type", "is_public")
    search_fields = ("title", "brand__name")
    raw_id_fields = ("brand",)
