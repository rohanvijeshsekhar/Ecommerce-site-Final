"""
Pluggable SMS OTP Providers: SangamamSMSProvider & MockSMSProvider.

M3 Fix: SangamamSMSProvider now raises ImproperlyConfigured at startup when
SANGAMAM_API_KEY is missing, instead of silently falling back to the mock
provider mid-request. This ensures configuration errors are caught immediately
rather than silently dropping SMS OTPs in production.
"""

import logging
import urllib.parse
import urllib.request
from typing import Optional
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from apps.authentication.providers.base import BaseOTPProvider

logger = logging.getLogger("faazo.auth")


class MockSMSProvider(BaseOTPProvider):
    """
    Development/Mock provider. Logs SMS OTP to console without making network calls.
    """

    def send_otp(self, target: str, otp_code: str, purpose: str = "registration") -> bool:
        logger.info(
            f"[MockSMSProvider] MOCK SMS dispatched to {target} | Code: {otp_code} | Purpose: {purpose}"
        )
        return True


class MSG91SMSProvider(BaseOTPProvider):
    """
    MSG91 SMS Gateway Integration (msg91.com).
    Dispatches SMS using MSG91 dedicated v5 OTP API & v2 fallback.
    """

    def __init__(self):
        self.authkey = getattr(settings, "MSG91_AUTHKEY", "") or getattr(settings, "SANGAMAM_API_KEY", "")
        self.sender_id = getattr(settings, "MSG91_SENDER_ID", "FAAZO")
        self.route = getattr(settings, "MSG91_ROUTE", "4")
        if not self.authkey:
            raise ImproperlyConfigured(
                "MSG91_AUTHKEY (or SANGAMAM_API_KEY) is not configured for SMS delivery."
            )

    def send_otp(self, target: str, otp_code: str, purpose: str = "registration") -> bool:
        message = (
            f"Your FAAZO verification code is {otp_code}. "
            "Valid for 10 minutes. Do not share with anyone."
        )
        
        # Format phone with Indian country code '91' if 10 digits
        raw_phone = target.lstrip("+").strip()
        if len(raw_phone) == 10 and raw_phone.isdigit():
            phone = "91" + raw_phone
        else:
            phone = raw_phone

        import urllib.error

        # Primary: MSG91 dedicated v5 OTP API (Instant delivery)
        try:
            template_id = getattr(settings, "MSG91_TEMPLATE_ID", "")
            if template_id:
                full_url = f"https://api.msg91.com/api/v5/otp?template_id={template_id}&authkey={self.authkey}&mobile={phone}&otp={otp_code}"
            else:
                full_url = f"https://api.msg91.com/api/v5/otp?authkey={self.authkey}&mobile={phone}&otp={otp_code}"
            
            req = urllib.request.Request(full_url, method="POST", headers={"Content-Type": "application/json"})

            with urllib.request.urlopen(req, timeout=10) as response:
                http_status = response.status
                res_body = response.read().decode("utf-8", errors="replace").strip()

                if http_status == 200:
                    logger.info(
                        f"[MSG91SMSProvider v5] OTP SMS dispatched successfully to {target} (phone={phone}). "
                        f"Response: {res_body}"
                    )
                    return True
        except Exception as exc:
            logger.warning(f"[MSG91SMSProvider v5] OTP API warning for {target}: {exc}. Trying v2 fallback...")

        # Fallback: MSG91 v2 GET API with country=91
        try:
            params = {
                "authkey": self.authkey,
                "mobiles": phone,
                "message": message,
                "sender": self.sender_id,
                "route": self.route,
                "country": "91",
            }
            query_string = urllib.parse.urlencode(params)
            full_url = f"https://api.msg91.com/api/v2/sendsms?{query_string}"
            req = urllib.request.Request(full_url, method="GET")

            with urllib.request.urlopen(req, timeout=10) as response:
                http_status = response.status
                res_body = response.read().decode("utf-8", errors="replace").strip()

                if http_status == 200 and res_body:
                    logger.info(
                        f"[MSG91SMSProvider v2] SMS dispatched successfully to {target}. "
                        f"Response ID: {res_body}"
                    )
                    return True
                else:
                    logger.error(
                        f"[MSG91SMSProvider Error] Gateway rejected SMS. "
                        f"HTTP Status: {http_status}, Gateway Response: {res_body[:200]}"
                    )
                    return False
        except Exception as exc:
            logger.error(f"[MSG91SMSProvider Error] Failed to send SMS to {target}: {exc}", exc_info=True)
            return False


class SangamamSMSProvider(BaseOTPProvider):
    """
    Sangamam Online SMS Gateway Integration — v1.0 Signed API.
    Uses MD5 signature-based authentication with DLT template.

    Required settings:
        SANGAMAM_ACCESS_TOKEN     → accessToken from Sangamam panel
        SANGAMAM_ACCESS_TOKEN_KEY → accessTokenKey from Sangamam panel
        SANGAMAM_TEMPLATE_ID      → DLT registered templateId
        SANGAMAM_SENDER_HEADER    → DLT registered smsHeader (e.g. FAZODT)
    """

    API_URL     = "https://fastsms.sangamamonline.in/api/sms/v1.0/send-sms"
    REQUEST_FOR = "send-sms"
    SALT        = "sms@rits-v1.0"

    def __init__(self):
        self.access_token      = getattr(settings, "SANGAMAM_ACCESS_TOKEN", "")
        self.access_token_key  = getattr(settings, "SANGAMAM_ACCESS_TOKEN_KEY", "")
        self.template_id       = getattr(settings, "SANGAMAM_TEMPLATE_ID", "")
        self.sender_header     = getattr(settings, "SANGAMAM_SENDER_HEADER", "FAZODT")
        if not self.access_token or not self.access_token_key:
            raise ImproperlyConfigured(
                "SANGAMAM_ACCESS_TOKEN and SANGAMAM_ACCESS_TOKEN_KEY must be configured."
            )

    def _generate_signature(self, expire: int) -> str:
        """Generate MD5 signature matching Sangamam's PHP reference implementation."""
        import hashlib
        time_key        = hashlib.md5((self.REQUEST_FOR + self.SALT + str(expire)).encode()).hexdigest()
        time_access_key = hashlib.md5((self.access_token + time_key).encode()).hexdigest()
        signature       = hashlib.md5((time_access_key + self.access_token_key).encode()).hexdigest()
        return signature

    def send_sms(self, target: str, message: str, template_id: Optional[str] = None) -> bool:
        """Send custom transactional SMS message via Sangamam v1.0 API."""
        import http.client
        import urllib.parse as up

        phone = target.lstrip("+").strip()
        tmpl_id = template_id or self.template_id

        expire = int(__import__("time").time()) + 60
        signature = self._generate_signature(expire)

        params = {
            "accessToken":    self.access_token,
            "expire":         str(expire),
            "authSignature":  signature,
            "route":          "transactional",
            "smsHeader":      self.sender_header,
            "messageContent": message,
            "recipients":     phone,
            "contentType":    "text",
            "templateId":     tmpl_id,
        }
        body = up.urlencode(params)

        try:
            conn = http.client.HTTPSConnection("fastsms.sangamamonline.in", timeout=15)
            conn.request("POST", "/api/sms/v1.0/send-sms", body, {
                "accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
            })
            response = conn.getresponse()
            http_status = response.status
            res_body = response.read().decode("utf-8", errors="replace").strip()
            conn.close()

            if http_status == 200:
                logger.info(
                    f"[SangamamSMSProvider] SMS dispatched to {target}. Response: {res_body}"
                )
                return True
            else:
                logger.error(
                    f"[SangamamSMSProvider Error] Failed to send SMS to {target}. "
                    f"HTTP: {http_status}, Response: {res_body}"
                )
                return False

        except Exception as exc:
            logger.error(
                f"[SangamamSMSProvider Error] Exception sending SMS to {target}: {exc}",
                exc_info=True,
            )
            return False

    def send_otp(self, target: str, otp_code: str, purpose: str = "registration") -> bool:
        phone = target.lstrip("+").strip()
        message = (
            f"Your OTP for www.fazo.in registration is: {otp_code}. "
            "Do not share this OTP with anyone. \n"
            "FAZODENT DENTAL SOLUTIONS"
        )
        return self.send_sms(target=phone, message=message, template_id=self.template_id)



def get_sms_provider() -> BaseOTPProvider:
    """
    Factory function returning the active SMS Provider based on settings.SMS_PROVIDER.
    Supported values: 'msg91' | 'sangamam' | 'mock'
    """
    provider_type = getattr(settings, "SMS_PROVIDER", "mock").lower()

    if provider_type in ["msg91", "sangamam"]:
        authkey = getattr(settings, "MSG91_AUTHKEY", "") or getattr(settings, "SANGAMAM_API_KEY", "")
        # Automatically use MSG91 provider when an MSG91 key (15 alphanumeric chars) is configured
        if provider_type == "msg91" or len(authkey) == 15:
            try:
                return MSG91SMSProvider()
            except Exception as e:
                logger.warning(f"Failed to initialize MSG91SMSProvider: {e}")
        if provider_type == "sangamam":
            return SangamamSMSProvider()

    # Warn loudly if mock is used in non-debug (production) environments
    if not getattr(settings, "DEBUG", False) and provider_type == "mock":
        logger.critical(
            "[SMSProvider] SMS_PROVIDER='mock' in a non-DEBUG environment. "
            "SMS OTPs will NOT be delivered to users."
        )
    return MockSMSProvider()
