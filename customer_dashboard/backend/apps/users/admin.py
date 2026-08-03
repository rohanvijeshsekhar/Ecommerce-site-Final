"""
FAAZO – Users Admin Registration

Registers User, UserProfile, and Address in Django Admin.

Features:
- UserAdmin extends UserChangeForm / UserCreationForm for correct password handling
- UserProfileInline embedded in User detail view
- Role filter, email search, verification status column
- Address admin with user filter
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django.utils.html import format_html

from apps.users.models import Address, User, UserProfile


# ============================================================
# Inline — UserProfile inside User admin
# ============================================================

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name = "Profile"
    verbose_name_plural = "Profile"
    fields = ("avatar", "clinic_name", "dental_license", "bio")
    extra = 0


# ============================================================
# Custom UserCreationForm — adds full_name to the creation wizard
# ============================================================

class FAAZOUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("email", "full_name", "role")


class FAAZOUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        fields = "__all__"


# ============================================================
# UserAdmin
# ============================================================

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = FAAZOUserChangeForm
    add_form = FAAZOUserCreationForm

    list_display = (
        "email",
        "full_name",
        "role_badge",
        "auth_provider",
        "is_email_verified",
        "is_phone_verified",
        "is_active",
        "date_joined",
    )
    list_filter = ("role", "auth_provider", "is_active", "is_email_verified", "is_staff", "date_joined")
    search_fields = ("email", "full_name", "phone_number", "google_sub")
    ordering = ("-date_joined",)
    readonly_fields = ("id", "date_joined", "last_login", "created_at", "updated_at")

    fieldsets = (
        (
            "Account Credentials",
            {
                "fields": ("id", "email", "password"),
            },
        ),
        (
            "Personal Information",
            {
                "fields": ("full_name", "phone_number", "profile_picture"),
            },
        ),
        (
            "Authentication Provider & OAuth",
            {
                "fields": ("auth_provider", "google_sub"),
                "description": "Details regarding single sign-on or credential provider.",
            },
        ),
        (
            "Role & Verification",
            {
                "fields": ("role", "is_email_verified", "is_phone_verified"),
                "description": (
                    "Phone verification (is_phone_verified) is collected here but "
                    "OTP logic is not implemented in v1.0."
                ),
            },
        ),
        (
            "Permissions",
            {
                "fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions"),
                "classes": ("collapse",),
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("date_joined", "last_login", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    add_fieldsets = (
        (
            "Create New User",
            {
                "classes": ("wide",),
                "fields": ("email", "full_name", "role", "password1", "password2"),
            },
        ),
    )

    inlines = [UserProfileInline]

    @admin.display(description="Role", ordering="role")
    def role_badge(self, obj: User) -> str:
        colours = {
            "customer": "#005B63",
            "dealer": "#B45309",
            "admin": "#7C3AED",
        }
        colour = colours.get(obj.role, "#6B7280")
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600">{}</span>',
            colour,
            obj.get_role_display(),
        )


# ============================================================
# UserProfileAdmin (standalone)
# ============================================================

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "clinic_name", "has_avatar")
    search_fields = ("user__email", "user__full_name", "clinic_name")
    raw_id_fields = ("user",)
    readonly_fields = ("created_at", "updated_at")

    @admin.display(description="Avatar", boolean=True)
    def has_avatar(self, obj: UserProfile) -> bool:
        return bool(obj.avatar)


# ============================================================
# AddressAdmin
# ============================================================

@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ("user", "label", "city", "state", "pincode", "address_type", "is_default")
    list_filter = ("address_type", "is_default", "state")
    search_fields = ("user__email", "user__full_name", "city", "pincode")
    raw_id_fields = ("user",)
    readonly_fields = ("id", "created_at", "updated_at")
