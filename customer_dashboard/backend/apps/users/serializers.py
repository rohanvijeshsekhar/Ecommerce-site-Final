"""
FAAZO – Users Serializers

Handles profile reads/updates and address CRUD.

Serializers:
    UserProfileSerializer     — GET/PATCH /api/v1/users/profile/
    AvatarSerializer          — POST (avatar upload)
    AddressSerializer         — Full CRUD for addresses
    AddressSetDefaultSerializer — Set default address
"""

from rest_framework import serializers

from apps.users.models import Address, UserProfile, User, CustomerAuditLog


# ──────────────────────────────────────────────────────────────
# User Profile
# ──────────────────────────────────────────────────────────────

class UserProfileSerializer(serializers.ModelSerializer):
    """
    Read/write profile serializer.
    full_name and phone_number are writable and saved to the related User.
    Avatar is handled by a separate AvatarView.
    """

    # Flattened user fields — writable for full_name and phone_number
    email = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.CharField(source="user.full_name", required=False)
    phone_number = serializers.CharField(
        source="user.phone_number", required=False, allow_null=True, allow_blank=True
    )
    role = serializers.CharField(source="user.role", read_only=True)
    is_email_verified = serializers.BooleanField(source="user.is_email_verified", read_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            # Read-only user core fields
            "email",
            "full_name",
            "phone_number",
            "role",
            "is_email_verified",
            # Avatar
            "avatar_url",
            # Commerce profile
            "profession",
            # Clinic / practice details
            "clinic_name",
            "gst_number",
            "clinic_phone",
            "clinic_email",
            # Timestamps
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "email", "role", "is_email_verified", "avatar_url",
            "created_at", "updated_at",
        ]

    def get_avatar_url(self, obj) -> str | None:
        return obj.avatar_url

    def update(self, instance, validated_data):
        # Extract nested user fields before saving profile
        user_data = validated_data.pop("user", {})
        user = instance.user

        if "full_name" in user_data:
            user.full_name = user_data["full_name"]
        if "phone_number" in user_data:
            user.phone_number = user_data["phone_number"] or None

        user.save(update_fields=[k for k in ("full_name", "phone_number") if k in user_data])

        # Update remaining profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance



class AvatarSerializer(serializers.Serializer):
    """Used for avatar file upload."""

    avatar = serializers.ImageField(
        error_messages={
            "required": "Please select an image file.",
            "invalid_image": "Upload a valid image file (JPEG, PNG, etc.).",
        }
    )


# ──────────────────────────────────────────────────────────────
# Address
# ──────────────────────────────────────────────────────────────

class AddressSerializer(serializers.ModelSerializer):
    """
    Full address serializer for CRUD operations.
    user is set automatically from request.user — never from input.
    Validates field lengths, Indian phone numbers, official states, and postal consistency.
    """

    class Meta:
        model = Address
        fields = [
            "id",
            "label",
            "full_name",
            "mobile",
            "line1",
            "line2",
            "city",
            "state",
            "pincode",
            "address_type",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_full_name(self, value: str) -> str:
        from apps.common.validators import validate_contact_name
        return validate_contact_name(value)

    def validate_mobile(self, value: str) -> str:
        from apps.common.validators import validate_phone_number
        return validate_phone_number(value)

    def validate_line1(self, value: str) -> str:
        from apps.common.validators import validate_address_line
        return validate_address_line(value, min_length=5)

    def validate_city(self, value: str) -> str:
        from apps.common.validators import validate_city_name
        return validate_city_name(value)

    def validate_state(self, value: str) -> str:
        from apps.common.postal_data import normalize_indian_state, is_valid_indian_state
        canonical = normalize_indian_state(value)
        if not canonical or not is_valid_indian_state(canonical):
            raise serializers.ValidationError(
                f"'{value}' is not a recognized Indian State or Union Territory. Please select a valid state."
            )
        return canonical

    def validate_pincode(self, value: str) -> str:
        from apps.common.validators import validate_pincode
        return validate_pincode(value)

    def validate(self, attrs):
        # Cross-validate state and pincode
        state = attrs.get("state") or (self.instance.state if self.instance else None)
        pincode = attrs.get("pincode") or (self.instance.pincode if self.instance else None)

        if state and pincode:
            from apps.common.postal_data import validate_pincode_state_match
            is_valid, err_msg = validate_pincode_state_match(pincode, state)
            if not is_valid:
                raise serializers.ValidationError({"pincode": err_msg})

        return attrs

    def create(self, validated_data):
        user = self.context["request"].user

        # If setting this as default, unset all other defaults first
        if validated_data.get("is_default", False):
            Address.objects.filter(user=user, is_default=True).update(is_default=False)

        return Address.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        user = self.context["request"].user

        if validated_data.get("is_default", False) and not instance.is_default:
            Address.objects.filter(user=user, is_default=True).update(is_default=False)

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


# ──────────────────────────────────────────────────────────────
# Admin Panel Customer Serializers
# ──────────────────────────────────────────────────────────────

class CustomerAuditLogSerializer(serializers.ModelSerializer):
    action_by_name = serializers.CharField(source="action_by.full_name", read_only=True)
    action_by_email = serializers.CharField(source="action_by.email", read_only=True)

    class Meta:
        model = CustomerAuditLog
        fields = [
            "id",
            "action",
            "action_by_name",
            "action_by_email",
            "description",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class CustomerAdminSerializer(serializers.ModelSerializer):
    """
    Serializer for admin-only CRUD and details retrieval of customers.
    """
    # Flattened Profile fields
    avatar_url = serializers.CharField(source="profile.avatar_url", read_only=True)
    profession = serializers.CharField(source="profile.profession", read_only=True)
    clinic_name = serializers.CharField(source="profile.clinic_name", read_only=True)
    gst_number = serializers.CharField(source="profile.gst_number", read_only=True)
    clinic_phone = serializers.CharField(source="profile.clinic_phone", read_only=True)
    clinic_email = serializers.EmailField(source="profile.clinic_email", read_only=True)
    is_blocked = serializers.BooleanField(source="profile.is_blocked", read_only=True)
    is_deleted = serializers.BooleanField(source="profile.is_deleted", read_only=True)
    admin_notes = serializers.CharField(source="profile.admin_notes", required=False, allow_blank=True)
    tags = serializers.JSONField(source="profile.tags", required=False)

    # Generated customer_id
    customer_id = serializers.SerializerMethodField()

    # Address related fields
    addresses = AddressSerializer(many=True, read_only=True)
    default_address = serializers.SerializerMethodField()

    # Dealer request status Integration
    dealer_request_status = serializers.SerializerMethodField()

    # Audit logs
    customer_audit_logs = CustomerAuditLogSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "customer_id",
            "email",
            "full_name",
            "phone_number",
            "is_active",
            "date_joined",
            "last_login",
            
            # Profile fields
            "avatar_url",
            "profession",
            "clinic_name",
            "gst_number",
            "clinic_phone",
            "clinic_email",
            "is_blocked",
            "is_deleted",
            "admin_notes",
            "tags",
            
            # Address and other integrations
            "addresses",
            "default_address",
            "dealer_request_status",
            "customer_audit_logs",
        ]
        read_only_fields = [
            "id",
            "customer_id",
            "email",
            "full_name",
            "phone_number",
            "is_active",
            "date_joined",
            "last_login",
            "is_deleted",
            "avatar_url",
            "addresses",
            "customer_audit_logs",
        ]

    def get_customer_id(self, obj) -> str:
        # Generates a clean customer ID like CUST-12AB34CD
        return f"CUST-{str(obj.pk)[:8].upper()}"

    def get_default_address(self, obj) -> dict | None:
        default_addr = obj.addresses.filter(is_default=True).first()
        if not default_addr:
            default_addr = obj.addresses.first()
        if default_addr:
            return AddressSerializer(default_addr).data
        return None

    def get_dealer_request_status(self, obj) -> str | None:
        if hasattr(obj, 'dealer_application'):
            return obj.dealer_application.status
        return None

    def update(self, instance, validated_data):
        # Extract nested profile fields
        profile_data = validated_data.pop("profile", {})
        
        # Update profile fields
        profile = instance.profile
        for attr, value in profile_data.items():
            if attr in ["admin_notes", "tags"]:
                setattr(profile, attr, value)
        profile.save()

        return instance
