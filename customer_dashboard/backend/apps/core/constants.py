"""
Constants used across the FAAZO application.
Centralized enums and error messages to avoid magic strings.
"""


class UserRole:
    """User role constants."""
    CUSTOMER = 'CUSTOMER'
    DEALER = 'DEALER'
    ADMIN = 'ADMIN'

    CHOICES = [
        (CUSTOMER, 'Customer'),
        (DEALER, 'Dealer'),
        (ADMIN, 'Admin'),
    ]

    ALL = [CUSTOMER, DEALER, ADMIN]
    ADMIN_ROLES = [ADMIN]


class UserStatus:
    """User account status constants."""
    PENDING = 'PENDING'
    ACTIVE = 'ACTIVE'
    SUSPENDED = 'SUSPENDED'
    DEACTIVATED = 'DEACTIVATED'

    CHOICES = [
        (PENDING, 'Pending'),
        (ACTIVE, 'Active'),
        (SUSPENDED, 'Suspended'),
        (DEACTIVATED, 'Deactivated'),
    ]


class DealerApprovalStatus:
    """Dealer approval workflow status constants."""
    PENDING = 'PENDING'
    APPROVED = 'APPROVED'
    REJECTED = 'REJECTED'

    CHOICES = [
        (PENDING, 'Pending'),
        (APPROVED, 'Approved'),
        (REJECTED, 'Rejected'),
    ]


class AuditAction:
    """Audit log action type constants."""
    REGISTER_CUSTOMER = 'REGISTER_CUSTOMER'
    REGISTER_DEALER = 'REGISTER_DEALER'
    LOGIN = 'LOGIN'
    LOGOUT = 'LOGOUT'
    LOGOUT_ALL = 'LOGOUT_ALL'
    OTP_SENT = 'OTP_SENT'
    OTP_VERIFIED = 'OTP_VERIFIED'
    OTP_FAILED = 'OTP_FAILED'
    OTP_EXPIRED = 'OTP_EXPIRED'
    PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED'
    PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED'
    PASSWORD_CHANGED = 'PASSWORD_CHANGED'
    TOKEN_REFRESHED = 'TOKEN_REFRESHED'
    TOKEN_BLACKLISTED = 'TOKEN_BLACKLISTED'
    DEALER_APPROVED = 'DEALER_APPROVED'
    DEALER_REJECTED = 'DEALER_REJECTED'
    ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED'
    ACCOUNT_REACTIVATED = 'ACCOUNT_REACTIVATED'
    PROFILE_UPDATED = 'PROFILE_UPDATED'
    DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED'
    DEVICE_NEW_LOGIN = 'DEVICE_NEW_LOGIN'

    CHOICES = [
        (REGISTER_CUSTOMER, 'Customer Registration'),
        (REGISTER_DEALER, 'Dealer Registration'),
        (LOGIN, 'Login'),
        (LOGOUT, 'Logout'),
        (LOGOUT_ALL, 'Logout All Devices'),
        (OTP_SENT, 'OTP Sent'),
        (OTP_VERIFIED, 'OTP Verified'),
        (OTP_FAILED, 'OTP Failed'),
        (OTP_EXPIRED, 'OTP Expired'),
        (PASSWORD_RESET_REQUESTED, 'Password Reset Requested'),
        (PASSWORD_RESET_COMPLETED, 'Password Reset Completed'),
        (PASSWORD_CHANGED, 'Password Changed'),
        (TOKEN_REFRESHED, 'Token Refreshed'),
        (TOKEN_BLACKLISTED, 'Token Blacklisted'),
        (DEALER_APPROVED, 'Dealer Approved'),
        (DEALER_REJECTED, 'Dealer Rejected'),
        (ACCOUNT_SUSPENDED, 'Account Suspended'),
        (ACCOUNT_REACTIVATED, 'Account Reactivated'),
        (PROFILE_UPDATED, 'Profile Updated'),
        (DOCUMENT_UPLOADED, 'Document Uploaded'),
        (DEVICE_NEW_LOGIN, 'New Device Login'),
    ]


class AuditStatus:
    """Audit log outcome status."""
    SUCCESS = 'SUCCESS'
    FAILURE = 'FAILURE'

    CHOICES = [
        (SUCCESS, 'Success'),
        (FAILURE, 'Failure'),
    ]


class OtpPurpose:
    """OTP purpose identifiers."""
    REGISTRATION = 'registration'
    PASSWORD_RESET = 'password_reset'

    CHOICES = [
        (REGISTRATION, 'Registration'),
        (PASSWORD_RESET, 'Password Reset'),
    ]

    ALL = [REGISTRATION, PASSWORD_RESET]


class ErrorMessages:
    """Standardized error messages for API responses."""
    INVALID_CREDENTIALS = 'Invalid email/phone or password.'
    ACCOUNT_NOT_VERIFIED = 'Account not verified. Please verify your phone number.'
    ACCOUNT_SUSPENDED = 'Your account has been suspended. Please contact support.'
    ACCOUNT_DEACTIVATED = 'Your account has been deactivated.'
    ACCOUNT_PENDING = 'Your account is pending activation.'
    DEALER_PENDING = 'Your dealer application is under review.'
    DEALER_REJECTED = 'Your dealer application has been rejected.'
    LOGIN_LOCKED = 'Too many failed attempts. Account locked for 15 minutes.'
    OTP_INVALID = 'Invalid OTP. Please try again.'
    OTP_EXPIRED = 'OTP has expired. Please request a new one.'
    OTP_MAX_ATTEMPTS = 'Maximum OTP attempts exceeded. Please request a new OTP.'
    OTP_RATE_LIMITED = 'Too many OTP requests. Please wait before requesting again.'
    OTP_COOLDOWN = 'Please wait before requesting another OTP.'
    EMAIL_EXISTS = 'An account with this email already exists.'
    PHONE_EXISTS = 'An account with this phone number already exists.'
    GSTIN_EXISTS = 'A dealer with this GSTIN already exists.'
    INVALID_GSTIN = 'Invalid GSTIN format.'
    PASSWORD_MISMATCH = 'Passwords do not match.'
    FILE_TOO_LARGE = 'File size exceeds the maximum limit of 10MB.'
    INVALID_FILE_TYPE = 'Invalid file type. Allowed: PDF, JPG, PNG.'
    TOKEN_INVALID = 'Invalid or expired token.'
    PERMISSION_DENIED = 'You do not have permission to perform this action.'
    USER_NOT_FOUND = 'User not found.'
    DEALER_NOT_FOUND = 'Dealer profile not found.'
    ALREADY_VERIFIED = 'Account is already verified.'
    ACCOUNT_ALREADY_ACTIVE = 'Account is already active.'
    SMS_DELIVERY_FAILED = 'Failed to send SMS. Please try again.'
