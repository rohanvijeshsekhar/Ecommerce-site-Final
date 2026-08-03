from django.contrib import admin
from django.utils.html import format_html
from .models import BestSellerBanner, BestSellerProduct


@admin.register(BestSellerBanner)
class BestSellerBannerAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "banner_preview",
        "is_active",
        "button_text",
        "button_link",
        "updated_at",
    ]
    list_filter = ["is_active", "updated_at"]
    search_fields = ["title", "subtitle", "button_text"]
    list_editable = ["is_active"]
    readonly_fields = ["banner_preview_large", "created_at", "updated_at"]

    fieldsets = (
        (
            "Banner Content",
            {
                "fields": (
                    "title",
                    "subtitle",
                    "banner_image",
                    "banner_preview_large",
                    "is_active",
                )
            },
        ),
        (
            "Call to Action Button",
            {
                "fields": (
                    "button_text",
                    "button_link",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def banner_preview(self, obj):
        if obj.banner_image:
            return format_html(
                '<img src="{}" style="max-height: 40px; border-radius: 4px;" />',
                obj.banner_image.url,
            )
        return format_html('<span style="color: #999;">No image</span>')

    banner_preview.short_description = "Image Preview"

    def banner_preview_large(self, obj):
        if obj.banner_image:
            return format_html(
                '<img src="{}" style="max-width: 100%; max-height: 200px; border-radius: 8px;" />',
                obj.banner_image.url,
            )
        return format_html('<span style="color: #999;">No image uploaded yet</span>')

    banner_preview_large.short_description = "Banner Image Preview"


@admin.register(BestSellerProduct)
class BestSellerProductAdmin(admin.ModelAdmin):
    list_display = [
        "display_order",
        "product_name",
        "product_image_preview",
        "brand_name",
        "category_name",
        "is_active",
        "created_at",
    ]
    list_display_links = ["product_name"]
    list_filter = ["is_active", "product__brand", "product__category"]
    search_fields = [
        "product__name",
        "product__sku",
        "product__brand__name",
        "product__category__name",
    ]
    list_editable = ["display_order", "is_active"]
    autocomplete_fields = ["product"]
    actions = ["activate_products", "deactivate_products"]

    def product_name(self, obj):
        return obj.product.name

    product_name.short_description = "Product Name"

    def brand_name(self, obj):
        return obj.product.brand.name if obj.product.brand else "-"

    brand_name.short_description = "Brand"

    def category_name(self, obj):
        return obj.product.category.name if obj.product.category else "-"

    category_name.short_description = "Category"

    def product_image_preview(self, obj):
        img = obj.product.primary_image
        if img and img.image:
            return format_html(
                '<img src="{}" style="max-height: 40px; border-radius: 4px;" />',
                img.image.url,
            )
        return format_html('<span style="color: #999;">No image</span>')

    product_image_preview.short_description = "Image"

    @admin.action(description="Bulk Activate Selected Best Seller Products")
    def activate_products(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f"{count} best seller products activated successfully.")

    @admin.action(description="Bulk Deactivate Selected Best Seller Products")
    def deactivate_products(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f"{count} best seller products deactivated successfully.")
