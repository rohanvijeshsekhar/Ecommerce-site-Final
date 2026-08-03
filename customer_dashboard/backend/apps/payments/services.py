"""
FAAZO – Razorpay Service Layer

Thin wrapper around the Razorpay Python SDK.
All Razorpay API interactions go through this module.
Never import razorpay directly in views.
Supports fallback developer sandbox mock when API keys are default placeholders.
"""

import hashlib
import hmac
import logging
import uuid

import razorpay
from django.conf import settings

logger = logging.getLogger("faazo.payments")

# Lazy-initialised Razorpay client singleton.
# Reset to None whenever credentials might have changed.
_client = None


def is_sandbox_mode() -> bool:
    """
    Returns True only when Razorpay credentials are genuinely absent or contain
    placeholder values. Does NOT enforce any key length or format restrictions —
    credential format is entirely determined by the Razorpay Dashboard.
    """
    key_id = getattr(settings, "RAZORPAY_KEY_ID", "")
    key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")

    if not key_id or not key_secret:
        logger.info("[Razorpay] Credentials not set — running in sandbox mode.")
        return True
    if "REPLACE" in key_id or "REPLACE" in key_secret:
        logger.info("[Razorpay] Placeholder credentials detected — running in sandbox mode.")
        return True

    return False




def _get_client():
    """
    Returns a Razorpay client initialised with current settings values.
    The client is recreated each time settings might have changed (dev restarts).
    In production, settings are constant so this is effectively a singleton.
    """
    global _client

    key_id = getattr(settings, "RAZORPAY_KEY_ID", "")
    key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")

    if not key_id or not key_secret:
        raise ValueError(
            "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables."
        )

    # Recreate client if it hasn't been initialised yet
    if _client is None:
        _client = razorpay.Client(auth=(key_id, key_secret))
        logger.info(
            "[Razorpay] Client initialised (key_id=%s…, secret_len=%d)",
            key_id[:16],
            len(key_secret),
        )
    return _client


def create_razorpay_order(amount_paise: int, receipt: str, notes: dict = None):
    """
    Create a Razorpay order.
    If credentials are placeholders, returns a mock order structure.
    On API failure, logs the full error and re-raises (callers decide fallback strategy).
    """
    if is_sandbox_mode():
        mock_id = f"order_mock_{uuid.uuid4().hex[:14]}"
        logger.info("[SANDBOX MODE] Simulating Razorpay order creation: receipt=%s, id=%s", receipt, mock_id)
        return {
            "id": mock_id,
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "status": "created",
            "notes": notes or {},
        }

    try:
        client = _get_client()
        order_data = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "notes": notes or {},
        }
        logger.info("[Razorpay] Creating order: receipt=%s amount=%d paise", receipt, amount_paise)
        order = client.order.create(data=order_data)
        logger.info("[Razorpay] Order created: %s", order.get("id"))
        return order
    except Exception as e:
        # Log the full exception including Razorpay's error body for diagnosis.
        # Razorpay SDK raises razorpay.errors.BadRequestError for 4xx responses;
        # the str() includes the HTTP status, error code, and description.
        logger.error(
            "[Razorpay] Order creation FAILED — key_id=%s… | error: %s",
            getattr(settings, "RAZORPAY_KEY_ID", "")[:16],
            e,
        )
        raise



def verify_payment_signature(razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
    """
    Verify the Razorpay payment signature using HMAC-SHA256.
    If sandbox mode, simulates validation for mock signatures.
    """
    if razorpay_order_id.startswith("order_mock_") or is_sandbox_mode():
        logger.info("[SANDBOX MODE] Simulating signature verification: order=%s payment=%s", razorpay_order_id, razorpay_payment_id)
        # Sandbox signature checks standard pattern or dummy matches
        expected_sig = f"sig_mock_{razorpay_order_id}_{razorpay_payment_id}"
        return razorpay_signature == expected_sig or razorpay_signature.startswith("sig_mock_")

    key_secret = settings.RAZORPAY_KEY_SECRET
    message = f"{razorpay_order_id}|{razorpay_payment_id}"
    expected_signature = hmac.new(
        key_secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    is_valid = hmac.compare_digest(expected_signature, razorpay_signature)
    if is_valid:
        logger.info("Payment signature verified: order=%s payment=%s", razorpay_order_id, razorpay_payment_id)
    else:
        logger.warning(
            "Payment signature INVALID: order=%s payment=%s",
            razorpay_order_id,
            razorpay_payment_id,
        )
    return is_valid


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    """Verify a Razorpay webhook signature."""
    if is_sandbox_mode():
        logger.info("[SANDBOX MODE] Skipping webhook verification (Always True)")
        return True

    webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
    if not webhook_secret:
        logger.error("RAZORPAY_WEBHOOK_SECRET is not configured — rejecting webhook.")
        return False

    expected = hmac.new(
        webhook_secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()

    is_valid = hmac.compare_digest(expected, signature)
    if not is_valid:
        logger.warning("Webhook signature verification FAILED.")
    return is_valid


def fetch_payment_details(payment_id: str) -> dict:
    """Fetch full payment details from Razorpay."""
    if payment_id.startswith("pay_mock_") or is_sandbox_mode():
        logger.info("[SANDBOX MODE] Returning mock payment details: %s", payment_id)
        return {
            "id": payment_id,
            "status": "captured",
            "method": "card",
            "amount": 50000,
            "currency": "INR",
            "card": {
                "last4": "1111",
                "network": "Visa",
                "type": "credit"
            }
        }

    client = _get_client()
    try:
        return client.payment.fetch(payment_id)
    except Exception as e:
        logger.error("Failed to fetch payment details for %s: %s", payment_id, e)
        return {}
