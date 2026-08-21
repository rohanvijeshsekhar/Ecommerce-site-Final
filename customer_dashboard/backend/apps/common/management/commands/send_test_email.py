"""
FAAZO – Direct SMTP Delivery Management Command

Usage:
    python manage.py send_test_email --to recipient@example.com

Tests direct Gmail SMTP email dispatch from Django without using Celery.
Exits with code 0 on success, 1 on failure.

SECURITY:
- NEVER logs, prints, or exposes EMAIL_HOST_PASSWORD.
"""

import sys
import logging
from django.core.management.base import BaseCommand
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings

logger = logging.getLogger("faazo.tasks")


class Command(BaseCommand):
    help = "Tests direct Django SMTP email dispatch to a specified recipient."

    def add_arguments(self, parser):
        parser.add_argument(
            "--to",
            type=str,
            default="fazodental@gmail.com",
            help="Recipient email address (default: fazodental@gmail.com)",
        )

    def handle(self, *args, **options):
        recipient = options.get("to", "fazodental@gmail.com")

        self.stdout.write(self.style.NOTICE("=" * 60))
        self.stdout.write(self.style.NOTICE("FAAZO Direct SMTP Delivery Test"))
        self.stdout.write(self.style.NOTICE("=" * 60))

        backend = getattr(settings, "EMAIL_BACKEND", "")
        host = getattr(settings, "EMAIL_HOST", "")
        port = getattr(settings, "EMAIL_PORT", 587)
        use_tls = getattr(settings, "EMAIL_USE_TLS", True)
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "fazodental@gmail.com")
        has_pwd = bool(getattr(settings, "EMAIL_HOST_PASSWORD", ""))

        self.stdout.write(f"Backend:   {backend}")
        self.stdout.write(f"Host:      {host}:{port}")
        self.stdout.write(f"Sender:    {from_email}")
        self.stdout.write(f"Recipient: {recipient}")
        self.stdout.write(f"Password configured: {'Yes' if has_pwd else 'No'}")
        self.stdout.write("-" * 60)

        subject = "FAAZO Direct SMTP Delivery Verification"
        text_body = (
            "Hello,\n\n"
            "This is a direct SMTP test email from FAAZO Dental Solutions.\n"
            "If you are receiving this message, direct Gmail SMTP delivery is functioning correctly.\n\n"
            "Best regards,\n"
            "FAAZO Development Team"
        )
        html_body = """
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #0052cc;">FAAZO Direct SMTP Delivery Verification</h2>
          <p>Hello,</p>
          <p>This is a direct SMTP test email from <strong>FAAZO Dental Solutions</strong>.</p>
          <p>If you are receiving this message, direct Gmail SMTP delivery is functioning correctly.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #777;">FAAZO Dental Solutions Pvt. Ltd.</p>
        </body>
        </html>
        """

        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=from_email,
                to=[recipient],
            )
            msg.attach_alternative(html_body, "text/html")
            sent_count = msg.send(fail_silently=False)

            if sent_count > 0:
                self.stdout.write(self.style.SUCCESS(
                    f"\n[OK] Direct SMTP test email sent successfully to {recipient}!"
                ))
            else:
                self.stdout.write(self.style.ERROR(
                    f"\n[FAIL] send() returned 0 sent messages for {recipient}."
                ))
                sys.exit(1)

        except Exception as exc:
            self.stdout.write(self.style.ERROR(
                f"\n[FAIL] Direct SMTP dispatch failed: {type(exc).__name__}: {exc}"
            ))
            logger.error("Direct SMTP dispatch failed for %s: %s", recipient, exc, exc_info=True)
            sys.exit(1)
