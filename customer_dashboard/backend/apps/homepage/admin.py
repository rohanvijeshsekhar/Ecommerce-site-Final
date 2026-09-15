"""
FAAZO – Homepage CMS Django Admin

Registers all homepage models for Django's built-in admin as a backup
management interface alongside the custom React admin panel.
"""

from django.contrib import admin

from .models import (
    HeroSlide,
    HomepageCategory,
    HomepageBrand,
    BestSeller,
    FeaturedCollection,
    FeaturedCollectionItem,
    LimitedTimeOffer,
    ExploreSolution,
    Testimonial,
    RecommendedProduct,
    DailyOffer,
    DailyOfferProduct,
)


@admin.register(HeroSlide)
class HeroSlideAdmin(admin.ModelAdmin):
    list_display  = ["heading", "sort_order", "is_active", "created_at"]
    list_editable = ["sort_order", "is_active"]
    ordering      = ["sort_order"]


@admin.register(HomepageCategory)
class HomepageCategoryAdmin(admin.ModelAdmin):
    list_display  = ["display_title", "category", "icon_key", "sort_order", "is_visible"]
    list_editable = ["sort_order", "is_visible"]
    list_select_related = ["category"]
    ordering      = ["sort_order"]


@admin.register(HomepageBrand)
class HomepageBrandAdmin(admin.ModelAdmin):
    list_display  = ["brand", "sort_order", "is_visible"]
    list_editable = ["sort_order", "is_visible"]
    list_select_related = ["brand"]
    ordering      = ["sort_order"]


@admin.register(BestSeller)
class BestSellerAdmin(admin.ModelAdmin):
    list_display  = ["__str__", "product", "sort_order", "is_visible"]
    list_editable = ["sort_order", "is_visible"]
    list_select_related = ["product"]
    ordering      = ["sort_order"]


class FeaturedCollectionItemInline(admin.TabularInline):
    model = FeaturedCollectionItem
    extra = 1
    autocomplete_fields = ["product"]


@admin.register(FeaturedCollection)
class FeaturedCollectionAdmin(admin.ModelAdmin):
    list_display  = ["title", "sort_order", "is_visible"]
    list_editable = ["sort_order", "is_visible"]
    inlines       = [FeaturedCollectionItemInline]
    ordering      = ["sort_order"]


@admin.register(LimitedTimeOffer)
class LimitedTimeOfferAdmin(admin.ModelAdmin):
    list_display  = ["heading", "offer_text", "start_date", "end_date", "is_active", "sort_order"]
    list_editable = ["is_active", "sort_order"]
    ordering      = ["sort_order"]


@admin.register(ExploreSolution)
class ExploreSolutionAdmin(admin.ModelAdmin):
    list_display  = ["display_heading", "category", "sort_order", "is_visible"]
    list_editable = ["sort_order", "is_visible"]
    list_select_related = ["category"]
    ordering      = ["sort_order"]


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display  = ["customer_name", "clinic_name", "rating", "sort_order", "is_active"]
    list_editable = ["sort_order", "is_active"]
    ordering      = ["sort_order"]


@admin.register(RecommendedProduct)
class RecommendedProductAdmin(admin.ModelAdmin):
    list_display  = ["product", "sort_order", "is_visible"]
    list_editable = ["sort_order", "is_visible"]
    list_select_related = ["product"]
    ordering      = ["sort_order"]


class DailyOfferProductInline(admin.TabularInline):
    model = DailyOfferProduct
    extra = 1
    autocomplete_fields = ["product"]


@admin.register(DailyOffer)
class DailyOfferAdmin(admin.ModelAdmin):
    list_display = ["title", "badge_text", "status", "is_active", "countdown_enabled", "start_date", "end_date", "sort_order"]
    list_editable = ["status", "is_active", "sort_order"]
    inlines = [DailyOfferProductInline]
    ordering = ["sort_order"]

