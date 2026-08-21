"""
Pluggable SMS OTP Providers: SangamamSMSProvider & MockSMSProvider.

M3 Fix: SangamamSMSProvider now raises ImproperlyConfigured at startup when
SANGAMAM_API_KEY is missing, instead of silently falling back to the mock
provider mid-request. This ensures configuration errors are caught immediately
rather than silently dropping SMS OTPs in production.
"""

import hashlib
import json
import logging
import re
import time
import urllib.parse
import urllib.request
from typing import Optional, Dict, Any
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


class DLTTemplateSpec:
    def __init__(self, name: str, template_id: str, text_template: str, required_vars: list):
        self.name = name
        self.template_id = template_id
        self.text_template = text_template
        self.required_vars = required_vars


class SangamamDLTRegistry:
    """
    Centralized Registry for approved Sangamam DLT templates.
    Enforces DLT compliance, exact variable ordering, and missing variable validation.
    """
    ENTITY_ID = "1701178461438263453"
    SENDER_ID = "FAZODT"

    @classmethod
    def get_template(cls, key: str) -> Optional[DLTTemplateSpec]:
        templates = {
            "OTP": DLTTemplateSpec(
                name="OTP Verification",
                template_id=getattr(settings, "SANGAMAM_OTP_TEMPLATE_ID", "1777178496391306366") or "1777178496391306366",
                text_template="Your OTP for www.fazo.in registration is: {otp_code}. Do not share this OTP with anyone. FAZODENT DENTAL SOLUTIONS",
                required_vars=["otp_code"],
            ),
            "ORDER_CONFIRMED": DLTTemplateSpec(
                name="Order Confirmed",
                template_id=getattr(settings, "SANGAMAM_ORDER_TEMPLATE_ID", "1777178496694995515") or "1777178496694995515",
                text_template="Hi, Thanks for shopping at FAZODENT. Your order {order_number} is being processed and will be on its way soon. Visit www.fazo.in for updates. FAZODENT",
                required_vars=["order_number"],
            ),
            "REFUND_PROCESSED": DLTTemplateSpec(
                name="Refund Processed",
                template_id=getattr(settings, "SANGAMAM_REFUND_TEMPLATE_ID", "1777178496731822406") or "1777178496731822406",
                text_template="Hi {customer_name}, your order {order_number} refund {refund_amount} is processed to your card/bank account & will reflect in 7-10 business days. Thank you for your patience. FAZODENT",
                required_vars=["customer_name", "order_number", "refund_amount"],
            ),
            "RETURN_REQUESTED": DLTTemplateSpec(
                name="Please return",
                template_id=getattr(settings, "SANGAMAM_RETURN_TEMPLATE_ID", "1777178496718140338") or "1777178496718140338",
                text_template="Hi {customer_name}, we're sorry you didn't like your order. Please return it within {return_window} for a full refund. We'll process your refund once we receive your return. FAZODENT",
                required_vars=["customer_name", "return_window"],
            ),
            "ORDER_SHIPPED": DLTTemplateSpec(
                name="Order on its way",
                template_id=getattr(settings, "SANGAMAM_SHIPPED_TEMPLATE_ID", "1777178496710209320") or "1777178496710209320",
                text_template="Hi {customer_name}, Your order {order_number} is on its way and will arrive in 2-3 business days. Visit www.fazo.in for updates. FAZODENT",
                required_vars=["customer_name", "order_number"],
            ),
        }
        return templates.get(key)


class SangamamSMSProvider(BaseOTPProvider):
    """
    Sangamam Online SMS Gateway Integration — v1.0 Signed API.
    Uses DLT registered Entity ID & Template ID with MD5 signature authentication.

    Approved Templates:
      1. OTP: Template ID 1777178496391306366
      2. ORDER_CONFIRMED: Template ID 1777178496694995515
      3. REFUND_PROCESSED: Template ID 1777178496731822406
    """

    DEFAULT_API_URL     = "https://fastsms.sangamamonline.in/api/sms/v1.0/send-sms"
    REQUEST_FOR         = "send-sms"
    SALT                = "sms@rits-v1.0"
    DEFAULT_SENDER_ID   = "FAZODT"
    DEFAULT_ENTITY_ID   = "1701178461438263453"

    def __init__(self):
        self.api_url           = getattr(settings, "SANGAMAM_API_BASE_URL", self.DEFAULT_API_URL) or self.DEFAULT_API_URL
        self.access_token      = getattr(settings, "SANGAMAM_ACCESS_TOKEN", "")
        self.access_token_key  = getattr(settings, "SANGAMAM_ACCESS_TOKEN_KEY", "")
        self.sender_id         = getattr(settings, "SANGAMAM_SENDER_ID", self.DEFAULT_SENDER_ID) or self.DEFAULT_SENDER_ID
        self.entity_id         = getattr(settings, "SANGAMAM_ENTITY_ID", self.DEFAULT_ENTITY_ID) or self.DEFAULT_ENTITY_ID
        self.otp_template_id   = getattr(settings, "SANGAMAM_OTP_TEMPLATE_ID", "1777178496391306366") or "1777178496391306366"
        self.order_template_id = getattr(settings, "SANGAMAM_ORDER_TEMPLATE_ID", "1777178496694995515") or "1777178496694995515"
        self.refund_template_id = getattr(settings, "SANGAMAM_REFUND_TEMPLATE_ID", "1777178496731822406") or "1777178496731822406"
        self.return_template_id = getattr(settings, "SANGAMAM_RETURN_TEMPLATE_ID", "1777178496718140338") or "1777178496718140338"
        self.shipped_template_id = getattr(settings, "SANGAMAM_SHIPPED_TEMPLATE_ID", "1777178496710209320") or "1777178496710209320"

        if not self.access_token or not self.access_token_key:
            raise ImproperlyConfigured(
                "SANGAMAM_ACCESS_TOKEN and SANGAMAM_ACCESS_TOKEN_KEY must be configured in environment."
            )

    @staticmethod
    def normalize_phone_number(target: str) -> str:
        """
        Normalize Indian mobile numbers.
        Strips whitespace, symbols, leading '+' or '0'.
        Converts 10-digit number to 91XXXXXXXXXX or keeps valid international format.
        """
        if not target:
            return ""
        clean = re.sub(r"[^\d]", "", str(target)).lstrip("0")
        if len(clean) == 10:
            return f"91{clean}"
        return clean

    def _generate_signature(self, expire: int) -> str:
        """Generate MD5 signature matching Sangamam v1.0 reference implementation."""
        time_key        = hashlib.md5((self.REQUEST_FOR + self.SALT + str(expire)).encode("utf-8")).hexdigest()
        time_access_key = hashlib.md5((self.access_token + time_key).encode("utf-8")).hexdigest()
        signature       = hashlib.md5((time_access_key + self.access_token_key).encode("utf-8")).hexdigest()
        return signature

    def send_order_confirmed_sms(
        self,
        target: str,
        order_number: str,
        template_id: Optional[str] = None,
        entity_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send approved ORDER_CONFIRMED transactional SMS via Sangamam.
        Replaces {#alp#} in the approved DLT template with order_number.
        """
        spec = SangamamDLTRegistry.get_template("ORDER_CONFIRMED")
        if not order_number or not str(order_number).strip():
            logger.warning("[SangamamSMSProvider] Missing required variable 'order_number' for ORDER_CONFIRMED SMS.")
            return {
                "success": False,
                "status": "failed",
                "error": "Missing required variable 'order_number'",
            }

        message = spec.text_template.format(order_number=str(order_number).strip())
        tmpl_id = template_id or spec.template_id
        ent_id = entity_id or self.entity_id
        return self.send_sms_detailed(
            target=target,
            message=message,
            template_id=tmpl_id,
            entity_id=ent_id,
        )

    def send_refund_processed_sms(
        self,
        target: str,
        customer_name: str,
        order_number: str,
        refund_amount: str,
        template_id: Optional[str] = None,
        entity_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send approved REFUND_PROCESSED transactional SMS via Sangamam.
        Variables in exact registered order:
          1. customer_name
          2. order_number
          3. refund_amount
        """
        spec = SangamamDLTRegistry.get_template("REFUND_PROCESSED")
        c_name = str(customer_name or "").strip()
        o_num = str(order_number or "").strip()
        r_amt = str(refund_amount or "").strip()

        if not c_name or not o_num or not r_amt:
            missing = [var for var, val in [("customer_name", c_name), ("order_number", o_num), ("refund_amount", r_amt)] if not val]
            logger.warning("[SangamamSMSProvider] Missing required variables %s for REFUND_PROCESSED SMS.", missing)
            return {
                "success": False,
                "status": "failed",
                "error": f"Missing required refund variables: {', '.join(missing)}",
            }

        message = spec.text_template.format(
            customer_name=c_name,
            order_number=o_num,
            refund_amount=r_amt,
        )
        tmpl_id = template_id or spec.template_id
        ent_id = entity_id or self.entity_id
        return self.send_sms_detailed(
            target=target,
            message=message,
            template_id=tmpl_id,
            entity_id=ent_id,
        )

    def send_return_requested_sms(
        self,
        target: str,
        customer_name: str,
        return_window: str = "7 days",
        template_id: Optional[str] = None,
        entity_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send approved RETURN_REQUESTED transactional SMS via Sangamam ("Please return").
        Variables in exact registered order:
          1. customer_name ({#alp#})
          2. return_window ({#num#})
        """
        spec = SangamamDLTRegistry.get_template("RETURN_REQUESTED")
        c_name = str(customer_name or "").strip()
        r_window = str(return_window or "").strip()

        if not c_name or not r_window:
            missing = [var for var, val in [("customer_name", c_name), ("return_window", r_window)] if not val]
            logger.warning("[SangamamSMSProvider] Missing required variables %s for RETURN_REQUESTED SMS.", missing)
            return {
                "success": False,
                "status": "failed",
                "error": f"Missing required return variables: {', '.join(missing)}",
            }

        message = spec.text_template.format(
            customer_name=c_name,
            return_window=r_window,
        )
        tmpl_id = template_id or spec.template_id
        ent_id = entity_id or self.entity_id
        return self.send_sms_detailed(
            target=target,
            message=message,
            template_id=tmpl_id,
            entity_id=ent_id,
        )

    def send_order_shipped_sms(
        self,
        target: str,
        customer_name: str,
        order_number: str,
        template_id: Optional[str] = None,
        entity_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send approved ORDER_SHIPPED transactional SMS via Sangamam ("Order on its way").
        Variables in exact registered order:
          1. customer_name ({#alp#})
          2. order_number ({#alp#})
        """
        spec = SangamamDLTRegistry.get_template("ORDER_SHIPPED")
        c_name = str(customer_name or "").strip()
        o_num = str(order_number or "").strip()

        if not c_name or not o_num:
            missing = [var for var, val in [("customer_name", c_name), ("order_number", o_num)] if not val]
            logger.warning("[SangamamSMSProvider] Missing required variables %s for ORDER_SHIPPED SMS.", missing)
            return {
                "success": False,
                "status": "failed",
                "error": f"Missing required shipping variables: {', '.join(missing)}",
            }

        message = spec.text_template.format(
            customer_name=c_name,
            order_number=o_num,
        )
        tmpl_id = template_id or spec.template_id
        ent_id = entity_id or self.entity_id
        return self.send_sms_detailed(
            target=target,
            message=message,
            template_id=tmpl_id,
            entity_id=ent_id,
        )

    def send_sms_detailed(
        self,
        target: str,
        message: str,
        template_id: Optional[str] = None,
        entity_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send transactional SMS via Sangamam Online SMS Gateway and return detailed result dictionary.
        Does NOT log API secrets or access keys.
        """
        phone = self.normalize_phone_number(target)
        if not phone or len(phone) < 10:
            logger.warning("[SangamamSMSProvider] Invalid target phone number: %s", target)
            return {
                "success": False,
                "status": "failed",
                "error": "Invalid target phone number",
                "phone": target,
            }

        tmpl_id = template_id or self.order_template_id
        ent_id = entity_id or self.entity_id
        expire = int(time.time()) + 60
        signature = self._generate_signature(expire)

        payload = {
            "accessToken":    self.access_token,
            "expire":         str(expire),
            "authSignature":  signature,
            "route":          "transactional",
            "smsHeader":      self.sender_id,
            "entityId":       ent_id,
            "templateId":     tmpl_id,
            "messageContent": message,
            "recipients":     phone,
            "contentType":    "text",
        }

        data_bytes = urllib.parse.urlencode(payload).encode("utf-8")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        }

        req = urllib.request.Request(self.api_url, data=data_bytes, headers=headers)

        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                http_status = response.status
                raw_body = response.read().decode("utf-8", errors="replace").strip()

                try:
                    res_json = json.loads(raw_body)
                except Exception:
                    res_json = {"raw": raw_body}

                if http_status == 200 and isinstance(res_json, dict) and res_json.get("status") == "success":
                    res_data = res_json.get("data", {})
                    submission_id = res_data.get("submissionId") or res_json.get("submissionId", "")
                    message_ids = res_data.get("messageIds") or []
                    logger.info(
                        "[SangamamSMSProvider] SMS accepted for %s. SubmissionId=%s TemplateId=%s SenderId=%s",
                        phone, submission_id, tmpl_id, self.sender_id,
                    )
                    return {
                        "success": True,
                        "status": "accepted",
                        "submission_id": submission_id,
                        "message_ids": message_ids,
                        "provider": "sangamam",
                        "sender_id": self.sender_id,
                        "template_id": tmpl_id,
                        "entity_id": ent_id,
                        "http_status": http_status,
                        "raw_response": res_json,
                    }
                else:
                    err_msg = res_json.get("message") if isinstance(res_json, dict) else raw_body
                    logger.error(
                        "[SangamamSMSProvider Error] SMS rejected for %s. HTTP: %s, Message: %s",
                        phone, http_status, err_msg,
                    )
                    return {
                        "success": False,
                        "status": "rejected",
                        "error": err_msg or f"HTTP {http_status}",
                        "http_status": http_status,
                        "provider": "sangamam",
                        "raw_response": res_json if isinstance(res_json, dict) else {"raw": raw_body},
                    }

        except urllib.error.HTTPError as http_err:
            try:
                err_body = http_err.read().decode("utf-8", errors="replace")
                err_json = json.loads(err_body)
                err_msg = err_json.get("message") or err_body
            except Exception:
                err_json = {}
                err_msg = str(http_err)

            logger.error(
                "[SangamamSMSProvider HTTPError] Sangamam SMS HTTP %s for %s: %s",
                http_err.code, phone, err_msg,
            )
            return {
                "success": False,
                "status": "http_error",
                "http_status": http_err.code,
                "error": err_msg,
                "provider": "sangamam",
                "raw_response": err_json,
            }

        except Exception as exc:
            logger.error(
                "[SangamamSMSProvider Exception] Network or gateway exception for %s: %s",
                phone, exc, exc_info=True,
            )
            return {
                "success": False,
                "status": "exception",
                "error": str(exc),
                "provider": "sangamam",
            }

    def send_sms(self, target: str, message: str, template_id: Optional[str] = None) -> bool:
        """Backward-compatible send_sms returning boolean."""
        res = self.send_sms_detailed(target=target, message=message, template_id=template_id)
        return res.get("success", False)

    def send_otp(self, target: str, otp_code: str, purpose: str = "registration") -> bool:
        """
        Send approved OTP SMS using Sangamam DLT Template 1777178496391306366 ({#num#} -> otp_code).
        Synchronous & transaction-safe.
        """
        phone = self.normalize_phone_number(target)
        if not otp_code or not str(otp_code).strip():
            logger.warning("[SangamamSMSProvider] Cannot send OTP: missing otp_code.")
            return False

        spec = SangamamDLTRegistry.get_template("OTP")
        message = spec.text_template.format(otp_code=str(otp_code).strip())
        res = self.send_sms_detailed(target=phone, message=message, template_id=spec.template_id)
        return res.get("success", False)



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
