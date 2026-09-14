from django.contrib import admin
from .models import ClinicalSolution, ClinicalSolutionProduct


class ClinicalSolutionProductInline(admin.TabularInline):
    model = ClinicalSolutionProduct
    extra = 1
    fields = ["product", "display_order", "is_featured"]


@admin.register(ClinicalSolution)
class ClinicalSolutionAdmin(admin.ModelAdmin):
    list_display = ["title", "slug", "display_order", "is_active", "show_on_homepage", "created_at"]
    list_filter = ["is_active", "show_on_homepage", "created_at"]
    search_fields = ["title", "short_description", "description"]
    prepopulated_fields = {"slug": ("title",)}
    inlines = [ClinicalSolutionProductInline]
