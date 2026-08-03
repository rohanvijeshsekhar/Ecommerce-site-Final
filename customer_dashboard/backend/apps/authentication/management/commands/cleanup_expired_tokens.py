"""
FAAZO – Automatic Cleanup of Expired Password Reset and Email Verification Tokens

Usage:
    python manage.py cleanup_expired_tokens
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.authentication.models import EmailVerificationToken, PasswordResetToken


class Command(BaseCommand):
    help = "Deletes expired and consumed password reset and email verification tokens."

    def handle(self, *args, **options):
        now = timezone.now()

        # Delete expired password reset tokens
        pwd_deleted, _ = PasswordResetToken.objects.filter(expires_at__lt=now).delete()
        
        # Delete expired email verification tokens
        email_deleted, _ = EmailVerificationToken.objects.filter(expires_at__lt=now).delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully cleaned up expired tokens: "
                f"{pwd_deleted} PasswordResetToken(s), {email_deleted} EmailVerificationToken(s)."
            )
        )
