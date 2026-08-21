"""
FAAZO – Sangamam Transactional SMS Test Management Command

Usage:
  python manage.py test_sangamam_sms <phone_number> [--type=order|otp|refund] [--order=FAAZO-001] [--code=123456] [--name=Rohan] [--amount="₹1,180"]

Examples:
  python manage.py test_sangamam_sms 919876543210 --type=otp --code=482910
  python manage.py test_sangamam_sms 919876543210 --type=refund --name=Rohan --order=FAZ-10025 --amount="₹1,180"
  python manage.py test_sangamam_sms 919876543210 --type=order --order=FAAZO-2026-00125
"""

import sys
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.authentication.providers.sms_provider import SangamamSMSProvider, SangamamDLTRegistry


class Command(BaseCommand):
    help = "Test Sangamam Online SMS Transactional Gateway integration with approved DLT templates (OTP, Order, Refund)."

    def add_arguments(self, parser):
        parser.add_argument(
            "phone",
            type=str,
            help="Recipient phone number (e.g. 919876543210 or 10-digit mobile number)",
        )
        parser.add_argument(
            "legacy_order_number",
            type=str,
            nargs="?",
            default=None,
            help="Legacy positional order number for backward compatibility",
        )
        parser.add_argument(
            "--type",
            type=str,
            choices=["order", "otp", "refund", "return", "shipped"],
            default="order",
            help="SMS Template type: 'order' | 'otp' | 'refund' | 'return' | 'shipped' (default: 'order')",
        )
        parser.add_argument(
            "--order",
            type=str,
            default=None,
            help="Order number for 'order' or 'refund' template (default: FAAZO-TEST-001)",
        )
        parser.add_argument(
            "--code",
            type=str,
            default="482910",
            help="OTP code for 'otp' template (default: 482910)",
        )
        parser.add_argument(
            "--name",
            type=str,
            default="Rohan",
            help="Customer name for 'refund' or 'return' template (default: Rohan)",
        )
        parser.add_argument(
            "--amount",
            type=str,
            default="₹1,180",
            help="Refund amount for 'refund' template (default: ₹1,180)",
        )
        parser.add_argument(
            "--window",
            type=str,
            default="7 days",
            help="Return window for 'return' template (default: 7 days)",
        )

    def _safe_write(self, msg: str, style_func=None):
        try:
            text = style_func(msg) if style_func else msg
            self.stdout.write(text)
        except UnicodeEncodeError:
            safe_text = msg.encode("ascii", errors="replace").decode("ascii")
            if style_func:
                safe_text = style_func(safe_text)
            self.stdout.write(safe_text)

    def handle(self, *args, **options):
        phone_input = options["phone"]
        sms_type = options["type"].lower()

        order_number = options["order"] or options["legacy_order_number"] or "FAAZO-TEST-001"
        otp_code = options["code"]
        customer_name = options["name"]
        refund_amount = options["amount"]

        self._safe_write("[1/5] Checking Sangamam configuration...")

        try:
            provider = SangamamSMSProvider()
        except Exception as err:
            self._safe_write(f"[FAILED] Configuration error: {err}", self.style.ERROR)
            sys.exit(1)

        self._safe_write("OK", self.style.SUCCESS)

        normalized_phone = SangamamSMSProvider.normalize_phone_number(phone_input)

        if sms_type == "otp":
            spec = SangamamDLTRegistry.get_template("OTP")
            template_id = spec.template_id
            rendered_msg = spec.text_template.format(otp_code=otp_code)
            self._safe_write("[2/5] Template Type: OTP Verification")
            self._safe_write(f"[3/5] Sender ID: {provider.sender_id}")
            self._safe_write(f"      Entity ID: {provider.entity_id}")
            self._safe_write(f"      Template ID: {template_id}")
            self._safe_write(f"      Recipient: {normalized_phone}")
            self._safe_write(f"      OTP Code: {otp_code}")
            self._safe_write(f"      Rendered SMS: \"{rendered_msg}\"")
            self._safe_write("\n[4/5] Sending OTP SMS via Sangamam Gateway...")
            success = provider.send_otp(target=normalized_phone, otp_code=otp_code)
            res = {"success": success, "status": "accepted" if success else "failed"}

        elif sms_type == "refund":
            spec = SangamamDLTRegistry.get_template("REFUND_PROCESSED")
            template_id = spec.template_id
            rendered_msg = spec.text_template.format(
                customer_name=customer_name,
                order_number=order_number,
                refund_amount=refund_amount,
            )
            self._safe_write("[2/5] Template Type: Refund Processed")
            self._safe_write(f"[3/5] Sender ID: {provider.sender_id}")
            self._safe_write(f"      Entity ID: {provider.entity_id}")
            self._safe_write(f"      Template ID: {template_id}")
            self._safe_write(f"      Recipient: {normalized_phone}")
            self._safe_write(f"      Customer Name (Var 1): {customer_name}")
            self._safe_write(f"      Order Number (Var 2): {order_number}")
            self._safe_write(f"      Refund Amount (Var 3): {refund_amount}")
            self._safe_write(f"      Rendered SMS: \"{rendered_msg}\"")
            self._safe_write("\n[4/5] Sending Refund Processed SMS via Sangamam Gateway...")
            res = provider.send_refund_processed_sms(
                target=normalized_phone,
                customer_name=customer_name,
                order_number=order_number,
                refund_amount=refund_amount,
            )

        elif sms_type == "return":
            spec = SangamamDLTRegistry.get_template("RETURN_REQUESTED")
            template_id = spec.template_id
            return_window = options["window"]
            rendered_msg = spec.text_template.format(
                customer_name=customer_name,
                return_window=return_window,
            )
            self._safe_write("[2/5] Template Type: Please return (RETURN_REQUESTED)")
            self._safe_write(f"[3/5] Sender ID: {provider.sender_id}")
            self._safe_write(f"      Entity ID: {provider.entity_id}")
            self._safe_write(f"      Template ID: {template_id}")
            self._safe_write(f"      Recipient: {normalized_phone}")
            self._safe_write(f"      Customer Name (Var 1): {customer_name}")
            self._safe_write(f"      Return Window (Var 2): {return_window}")
            self._safe_write(f"      Rendered SMS: \"{rendered_msg}\"")
            self._safe_write("\n[4/5] Sending Return Requested SMS via Sangamam Gateway...")
            res = provider.send_return_requested_sms(
                target=normalized_phone,
                customer_name=customer_name,
                return_window=return_window,
            )

        elif sms_type == "shipped":
            spec = SangamamDLTRegistry.get_template("ORDER_SHIPPED")
            template_id = spec.template_id
            rendered_msg = spec.text_template.format(
                customer_name=customer_name,
                order_number=order_number,
            )
            self._safe_write("[2/5] Template Type: Order on its way (ORDER_SHIPPED)")
            self._safe_write(f"[3/5] Sender ID: {provider.sender_id}")
            self._safe_write(f"      Entity ID: {provider.entity_id}")
            self._safe_write(f"      Template ID: {template_id}")
            self._safe_write(f"      Recipient: {normalized_phone}")
            self._safe_write(f"      Customer Name (Var 1): {customer_name}")
            self._safe_write(f"      Order Number (Var 2): {order_number}")
            self._safe_write(f"      Rendered SMS: \"{rendered_msg}\"")
            self._safe_write("\n[4/5] Sending Order Shipped SMS via Sangamam Gateway...")
            res = provider.send_order_shipped_sms(
                target=normalized_phone,
                customer_name=customer_name,
                order_number=order_number,
            )

        else:
            spec = SangamamDLTRegistry.get_template("ORDER_CONFIRMED")
            template_id = spec.template_id
            rendered_msg = spec.text_template.format(order_number=order_number)
            self._safe_write("[2/5] Template Type: Order Confirmed")
            self._safe_write(f"[3/5] Sender ID: {provider.sender_id}")
            self._safe_write(f"      Entity ID: {provider.entity_id}")
            self._safe_write(f"      Template ID: {template_id}")
            self._safe_write(f"      Recipient: {normalized_phone}")
            self._safe_write(f"      Order Number: {order_number}")
            self._safe_write(f"      Rendered SMS: \"{rendered_msg}\"")
            self._safe_write("\n[4/5] Sending Order Confirmed SMS via Sangamam Gateway...")
            res = provider.send_order_confirmed_sms(
                target=normalized_phone,
                order_number=order_number,
            )

        if res.get("success"):
            sub_id = res.get("submission_id", "N/A")
            msg_ids = res.get("message_ids", [])
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n[5/5] SMS accepted successfully. "
                    f"Submission ID: {sub_id} | Message IDs: {msg_ids}"
                )
            )
        else:
            err_details = res.get("error", "Unknown provider error")
            http_status = res.get("http_status", "N/A")
            self.stderr.write(
                self.style.ERROR(
                    f"\n[5/5] SMS dispatch failed. HTTP Status: {http_status} | Error: {err_details}"
                )
            )
            sys.exit(1)
