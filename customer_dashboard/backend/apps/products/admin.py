from django.contrib import admin
from .models import Product, ProductImage, ProductAttribute, ProductDocument, ProductShareLog

# ... existing code ...

@admin.register(ProductShareLog)
class ProductShareLogAdmin(admin.ModelAdmin):
    list_display = ("product", "platform", "user", "ip_address", "created_at")
    list_filter = ("platform", "created_at")
    search_fields = ("product__name", "user__email", "ip_address")
    readonly_fields = ("product", "user", "platform", "ip_address", "created_at")



class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    fields = ("image", "alt_text", "sort_order", "is_primary")


class ProductAttributeInline(admin.TabularInline):
    model = ProductAttribute
    extra = 0
    fields = ("name", "value", "unit", "sort_order")


class ProductDocumentInline(admin.TabularInline):
    model = ProductDocument
    extra = 0
    fields = ("title", "document_type", "file", "external_url", "is_public")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display  = ("name", "sku", "brand", "category", "status", "is_featured", "created_at")
    list_filter   = ("status", "is_featured", "brand", "category")
    search_fields = ("name", "sku", "slug")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by", "effective_warranty_months_display")
    raw_id_fields = ("brand", "category")
    inlines = [ProductImageInline, ProductAttributeInline, ProductDocumentInline]

    fieldsets = (
        ("Identity", {
            "fields": ("name", "slug", "sku", "brand", "category"),
        }),
        ("Content", {
            "fields": ("short_description", "long_description", "tags"),
        }),
        ("Status", {
            "fields": ("status", "is_featured", "launched_at"),
        }),
        ("Physical", {
            "fields": ("weight_kg", "dimensions_cm"),
        }),
        ("Warranty", {
            "fields": ("warranty_months_override", "effective_warranty_months_display"),
            "description": "Leave override blank to use the brand default.",
        }),
        ("Audit", {
            "fields": ("created_at", "updated_at", "created_by", "updated_by"),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Effective Warranty (months)")
    def effective_warranty_months_display(self, obj):
        source = "product override" if obj.warranty_months_override else "brand default"
        return f"{obj.effective_warranty_months} months ({source})"
