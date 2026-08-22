"""
Email OTP Provider implementation using EmailMultiAlternatives with HTML templates.
"""

import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from apps.authentication.providers.base import BaseOTPProvider

logger = logging.getLogger("faazo.auth")


class EmailOTPProvider(BaseOTPProvider):
    """
    Delivers OTP codes via Email.
    Supports branded HTML templates for password reset and plain-text fallback.
    """

    def send_otp(self, target: str, otp_code: str, purpose: str = "registration", user=None) -> bool:
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "FAAZO <noreply@faazo.com>")
        support_email = getattr(settings, "SUPPORT_EMAIL", "support@faazo.com")

        if purpose in ("password_reset", "OtpPurpose.PASSWORD_RESET"):
            subject = f"Your FAAZO Password Reset Code: {otp_code}"
            context = {
                "otp_code": otp_code,
                "email": target,
                "user": user,
                "full_name": getattr(user, "full_name", "") if user else "",
                "support_email": support_email,
            }

            try:
                html_content = render_to_string("emails/password_reset_otp.html", context)
            except Exception as e:
                logger.warning(f"[EmailOTPProvider] Could not render HTML template: {e}")
                html_content = None

            try:
                text_content = render_to_string("emails/password_reset_otp.txt", context)
            except Exception as e:
                logger.warning(f"[EmailOTPProvider] Could not render TXT template: {e}")
                text_content = (
                    f"Hello,\n\nYour FAAZO password reset verification code is: {otp_code}\n\n"
                    f"This code will expire in 5 minutes. Do not share this code with anyone."
                )
        else:
            subject = f"Your FAAZO Verification Code: {otp_code}"
            html_content = None
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
            if html_content:
                msg.attach_alternative(html_content, "text/html")

            msg.send(fail_silently=False)
            logger.info(f"[EmailOTPProvider] Dispatched OTP code to {target} (purpose={purpose})")
            return True
        except Exception as exc:
            logger.error(f"[EmailOTPProvider Error] Failed to send OTP to {target}: {exc}", exc_info=True)
            return False

