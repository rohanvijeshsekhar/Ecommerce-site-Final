from django.contrib import admin
from apps.wishlist.models import Wishlist, WishlistItem


class WishlistItemInline(admin.TabularInline):
    model = WishlistItem
    extra = 0
    readonly_fields = ["created_at"]


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ["user", "item_count", "updated_at"]
    search_fields = ["user__email", "user__full_name"]
    inlines = [WishlistItemInline]

    def item_count(self, obj):
        return obj.items.count()


@admin.register(WishlistItem)
class WishlistItemAdmin(admin.ModelAdmin):
    list_display = ["wishlist", "product", "created_at"]
    search_fields = ["wishlist__user__email", "product__name", "product__sku"]
