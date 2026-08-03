"""
Email OTP Provider implementation using EmailService.
"""

import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from apps.authentication.providers.base import BaseOTPProvider

logger = logging.getLogger("faazo.auth")


class EmailOTPProvider(BaseOTPProvider):
    """
    Delivers OTP codes via Email.
    """

    def send_otp(self, target: str, otp_code: str, purpose: str = "registration") -> bool:
        subject = f"Your FAAZO Verification Code: {otp_code}"
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "FAAZO <noreply@faazo.com>")

        text_content = (
            f"Hello,\n\nYour FAAZO verification code for {purpose} is: {otp_code}\n\n"
            f"This code will expire in 10 minutes. Do not share this code with anyone."
        )

        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=from_email,
                to=[target],
            )
            msg.send(fail_silently=False)
            logger.info(f"[EmailOTPProvider] Dispatched OTP code to {target} (purpose={purpose})")
            return True
        except Exception as exc:
            logger.error(f"[EmailOTPProvider Error] Failed to send OTP to {target}: {exc}", exc_info=True)
            return False
