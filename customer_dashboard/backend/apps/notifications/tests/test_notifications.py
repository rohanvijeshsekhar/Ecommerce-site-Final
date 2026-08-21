"""
FAAZO – Enterprise Notification Center Automated Test Suite
"""

from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.notifications.models import (
    DeliveryChannel,
    DeliveryStatus,
    Notification,
    NotificationCategory,
    NotificationDelivery,
    NotificationPriority,
    NotificationType,
)
from apps.notifications.services import NotificationService
from apps.users.models import UserRole

User = get_user_model()


class NotificationCenterTests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create(
            email="user1@clinic.com",
            full_name="Dr. User One",
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        self.user2 = User.objects.create(
            email="user2@clinic.com",
            full_name="Dr. User Two",
            role=UserRole.CUSTOMER,
            is_active=True,
        )

        self.list_url = "/api/v1/notifications/"
        self.unread_count_url = "/api/v1/notifications/unread-count/"
        self.read_all_url = "/api/v1/notifications/read-all/"
        self.delete_all_url = "/api/v1/notifications/clear-all/"

    def test_notification_service_create_and_deliveries(self):
        """Verify notification creation generates channel-agnostic Notification & Delivery records."""
        notif = NotificationService.create(
            user=self.user1,
            notification_type=NotificationType.ORDER_PLACED,
            title="Order Placed",
            message="Your order #10001 has been placed.",
            context={"order_number": "10001", "total_amount": "5000"},
        )

        self.assertEqual(notif.user, self.user1)
        self.assertEqual(notif.notification_type, NotificationType.ORDER_PLACED)
        self.assertEqual(notif.category, NotificationCategory.ORDERS)
        self.assertFalse(notif.is_read)

        # Check In-App delivery record created
        deliveries = notif.deliveries.all()
        self.assertTrue(deliveries.filter(channel=DeliveryChannel.IN_APP, status=DeliveryStatus.DELIVERED).exists())

    def test_idempotency_protection(self):
        """Verify duplicate notification requests with matching idempotency key return the original notification."""
        key = "ORDER_CONFIRM_100254"

        notif1 = NotificationService.create(
            user=self.user1,
            notification_type=NotificationType.ORDER_CONFIRMED,
            idempotency_key=key,
            context={"order_number": "100254"},
        )

        notif2 = NotificationService.create(
            user=self.user1,
            notification_type=NotificationType.ORDER_CONFIRMED,
            idempotency_key=key,
            context={"order_number": "100254"},
        )

        self.assertEqual(notif1.id, notif2.id)
        self.assertEqual(Notification.objects.filter(idempotency_key=key).count(), 1)

    def test_sangamam_sms_routing_allowed_types(self):
        """Verify SMS delivery record is created for allowed transactional SMS notification types."""
        self.user1.phone_number = "9876543210"
        self.user1.save()

        notif = NotificationService.create(
            user=self.user1,
            notification_type=NotificationType.ORDER_PLACED,
            context={"order_number": "FAAZO-2026-99001", "total_amount": "1500.00"},
        )

        self.assertTrue(notif.deliveries.filter(channel=DeliveryChannel.SMS).exists())

    def test_sangamam_order_confirmed_sms_dispatch_and_no_secrets_logged(self):
        """Verify SangamamSMSProvider dispatches order confirmed SMS and records safe delivery metadata without secrets."""
        from unittest.mock import patch

        self.user1.phone_number = "9876543210"
        self.user1.save()

        with patch("apps.authentication.providers.SangamamSMSProvider.send_order_confirmed_sms") as mock_send:
            mock_send.return_value = {
                "success": True,
                "status": "accepted",
                "submission_id": "TEST_SUB_12345",
                "message_ids": [9901],
                "sender_id": "FAZODT",
                "template_id": "1777178496694995515",
                "entity_id": "1701178461438263453",
            }

            notif = NotificationService.create(
                user=self.user1,
                notification_type=NotificationType.ORDER_CONFIRMED,
                channels=[DeliveryChannel.SMS],
                context={"order_number": "FAAZO-2026-88123"},
            )

            mock_send.assert_called_once()
            call_kwargs = mock_send.call_args.kwargs
            self.assertEqual(call_kwargs.get("target"), "9876543210")
            self.assertEqual(call_kwargs.get("order_number"), "FAAZO-2026-88123")

            delivery = notif.deliveries.get(channel=DeliveryChannel.SMS)
            self.assertEqual(delivery.status, DeliveryStatus.DELIVERED)
            self.assertEqual(delivery.provider_response.get("submission_id"), "TEST_SUB_12345")
            self.assertEqual(delivery.provider_response.get("sender_id"), "FAZODT")
            self.assertEqual(delivery.provider_response.get("template_id"), "1777178496694995515")
    def test_sangamam_otp_dlt_template_and_substitution(self):
        """Verify OTP DLT template selection, {#num#} variable substitution, Entity ID and Template ID."""
        from unittest.mock import patch
        from apps.authentication.providers.sms_provider import SangamamSMSProvider, SangamamDLTRegistry

        provider = SangamamSMSProvider()
        spec = SangamamDLTRegistry.get_template("OTP")
        self.assertEqual(spec.template_id, "1777178496391306366")
        self.assertEqual(provider.entity_id, "1701178461438263453")

        with patch.object(provider, "send_sms_detailed") as mock_send_detailed:
            mock_send_detailed.return_value = {"success": True, "status": "accepted", "submission_id": "OTP_SUB_123"}
            res = provider.send_otp(target="9876543210", otp_code="482910")
            self.assertTrue(res)
            mock_send_detailed.assert_called_once()
            call_kwargs = mock_send_detailed.call_args.kwargs
            self.assertIn("482910", call_kwargs["message"])
            self.assertEqual(call_kwargs["template_id"], "1777178496391306366")

    def test_sangamam_refund_dlt_template_and_variable_ordering(self):
        """Verify Refund DLT template selection and 3-variable substitution in exact registered order."""
        from unittest.mock import patch
        from apps.authentication.providers.sms_provider import SangamamSMSProvider, SangamamDLTRegistry

        provider = SangamamSMSProvider()
        spec = SangamamDLTRegistry.get_template("REFUND_PROCESSED")
        self.assertEqual(spec.template_id, "1777178496731822406")

        with patch.object(provider, "send_sms_detailed") as mock_send_detailed:
            mock_send_detailed.return_value = {"success": True, "status": "accepted", "submission_id": "REFUND_SUB_456"}
            res = provider.send_refund_processed_sms(
                target="9876543210",
                customer_name="Rohan",
                order_number="FAZ-10025",
                refund_amount="₹1,180",
            )
            self.assertTrue(res["success"])
            mock_send_detailed.assert_called_once()
            call_kwargs = mock_send_detailed.call_args.kwargs
            expected_msg = (
                "Hi Rohan, your order FAZ-10025 refund ₹1,180 is processed to your card/bank account "
                "& will reflect in 7-10 business days. Thank you for your patience. FAZODENT"
            )
            self.assertEqual(call_kwargs["message"], expected_msg)
            self.assertEqual(call_kwargs["template_id"], "1777178496731822406")

    def test_sangamam_refund_missing_variable_handling(self):
        """Verify refund SMS is NOT dispatched when required variables are missing and returns failed status cleanly."""
        from unittest.mock import patch
        from apps.authentication.providers.sms_provider import SangamamSMSProvider

        provider = SangamamSMSProvider()
        with patch.object(provider, "send_sms_detailed") as mock_send_detailed:
            res = provider.send_refund_processed_sms(
                target="9876543210",
                customer_name="Rohan",
                order_number="",  # Missing variable!
                refund_amount="₹1,180",
            )
            self.assertFalse(res["success"])
            self.assertEqual(res["status"], "failed")
            self.assertIn("Missing required refund variables", res["error"])
            mock_send_detailed.assert_not_called()  # Never sends malformed SMS

    def test_notification_service_to_sms_channel_refund_flow(self):
        """Verify NotificationService -> SMSChannel -> SangamamProvider flow for REFUND_COMPLETED."""
        from unittest.mock import patch

        self.user1.phone_number = "9876543210"
        self.user1.save()

        with patch("apps.authentication.providers.SangamamSMSProvider.send_refund_processed_sms") as mock_refund:
            mock_refund.return_value = {
                "success": True,
                "status": "accepted",
                "submission_id": "NOTIF_REFUND_SUB_789",
                "sender_id": "FAZODT",
                "template_id": "1777178496731822406",
                "entity_id": "1701178461438263453",
            }

            notif = NotificationService.create(
                user=self.user1,
                notification_type=NotificationType.REFUND_COMPLETED,
                channels=[DeliveryChannel.SMS],
                context={
                    "customer_name": "Rohan",
                    "order_number": "FAZ-10025",
                    "refund_amount": "₹1,180",
                },
            )

            mock_refund.assert_called_once()
            call_kwargs = mock_refund.call_args.kwargs
            self.assertEqual(call_kwargs["customer_name"], "Rohan")
            self.assertEqual(call_kwargs["order_number"], "FAZ-10025")
            self.assertEqual(call_kwargs["refund_amount"], "₹1,180")

            delivery = notif.deliveries.get(channel=DeliveryChannel.SMS)
            self.assertEqual(delivery.status, DeliveryStatus.DELIVERED)
            self.assertEqual(delivery.provider_response.get("submission_id"), "NOTIF_REFUND_SUB_789")

    def test_sangamam_return_requested_dlt_template_and_substitution(self):
        """Verify Return Requested DLT template selection, Template ID 1777178496718140338, Entity ID 1701178461438263453, and 2-variable substitution."""
        from unittest.mock import patch
        from apps.authentication.providers.sms_provider import SangamamSMSProvider, SangamamDLTRegistry

        provider = SangamamSMSProvider()
        spec = SangamamDLTRegistry.get_template("RETURN_REQUESTED")
        self.assertEqual(spec.template_id, "1777178496718140338")
        self.assertEqual(provider.entity_id, "1701178461438263453")
        self.assertEqual(provider.sender_id, "FAZODT")

        with patch.object(provider, "send_sms_detailed") as mock_send_detailed:
            mock_send_detailed.return_value = {"success": True, "status": "accepted", "submission_id": "RETURN_SUB_999"}
            res = provider.send_return_requested_sms(
                target="9876543210",
                customer_name="Rohan",
                return_window="7 days",
            )
            self.assertTrue(res["success"])
            mock_send_detailed.assert_called_once()
            call_kwargs = mock_send_detailed.call_args.kwargs
            expected_msg = (
                "Hi Rohan, we're sorry you didn't like your order. Please return it within 7 days for a full refund. "
                "We'll process your refund once we receive your return. FAZODENT"
            )
            self.assertEqual(call_kwargs["message"], expected_msg)
            self.assertEqual(call_kwargs["template_id"], "1777178496718140338")
            self.assertEqual(call_kwargs["entity_id"], "1701178461438263453")

    def test_sangamam_return_requested_missing_variable_handling(self):
        """Verify return requested SMS is NOT dispatched when required variables are missing and returns failed status cleanly."""
        from unittest.mock import patch
        from apps.authentication.providers.sms_provider import SangamamSMSProvider

        provider = SangamamSMSProvider()
        with patch.object(provider, "send_sms_detailed") as mock_send_detailed:
            res = provider.send_return_requested_sms(
                target="9876543210",
                customer_name="",  # Missing customer_name!
                return_window="7 days",
            )
            self.assertFalse(res["success"])
            self.assertEqual(res["status"], "failed")
            self.assertIn("Missing required return variables", res["error"])
            mock_send_detailed.assert_not_called()  # Never sends malformed SMS

    def test_notification_service_to_sms_channel_return_requested_flow(self):
        """Verify NotificationService -> SMSChannel -> SangamamProvider flow for RETURN_REQUESTED."""
        from unittest.mock import patch

        self.user1.phone_number = "9876543210"
        self.user1.save()

        with patch("apps.authentication.providers.SangamamSMSProvider.send_return_requested_sms") as mock_return:
            mock_return.return_value = {
                "success": True,
                "status": "accepted",
                "submission_id": "NOTIF_RETURN_SUB_111",
                "sender_id": "FAZODT",
                "template_id": "1777178496718140338",
                "entity_id": "1701178461438263453",
            }

            notif = NotificationService.create(
                user=self.user1,
                notification_type=NotificationType.RETURN_REQUESTED,
                channels=[DeliveryChannel.SMS],
                context={
                    "customer_name": "Rohan",
                    "return_window": "7 days",
                },
            )

            mock_return.assert_called_once()
            call_kwargs = mock_return.call_args.kwargs
            self.assertEqual(call_kwargs["customer_name"], "Rohan")
            self.assertEqual(call_kwargs["return_window"], "7 days")

            delivery = notif.deliveries.get(channel=DeliveryChannel.SMS)
            self.assertEqual(delivery.status, DeliveryStatus.DELIVERED)
            self.assertEqual(delivery.provider_response.get("submission_id"), "NOTIF_RETURN_SUB_111")

    def test_sangamam_order_shipped_dlt_template_and_substitution(self):
        """Verify Order Shipped DLT template selection, Template ID 1777178496710209320, Entity ID 1701178461438263453, and 2-variable substitution."""
        from unittest.mock import patch
        from apps.authentication.providers.sms_provider import SangamamSMSProvider, SangamamDLTRegistry

        provider = SangamamSMSProvider()
        spec = SangamamDLTRegistry.get_template("ORDER_SHIPPED")
        self.assertEqual(spec.template_id, "1777178496710209320")
        self.assertEqual(provider.entity_id, "1701178461438263453")
        self.assertEqual(provider.sender_id, "FAZODT")

        with patch.object(provider, "send_sms_detailed") as mock_send_detailed:
            mock_send_detailed.return_value = {"success": True, "status": "accepted", "submission_id": "SHIPPED_SUB_555"}
            res = provider.send_order_shipped_sms(
                target="9876543210",
                customer_name="Rohan",
                order_number="FAAZO-2026-00125",
            )
            self.assertTrue(res["success"])
            mock_send_detailed.assert_called_once()
            call_kwargs = mock_send_detailed.call_args.kwargs
            expected_msg = (
                "Hi Rohan, Your order FAAZO-2026-00125 is on its way and will arrive in 2-3 business days. "
                "Visit www.fazo.in for updates. FAZODENT"
            )
            self.assertEqual(call_kwargs["message"], expected_msg)
            self.assertEqual(call_kwargs["template_id"], "1777178496710209320")
            self.assertEqual(call_kwargs["entity_id"], "1701178461438263453")

    def test_sangamam_order_shipped_missing_variable_handling(self):
        """Verify order shipped SMS is NOT dispatched when required variables are missing and returns failed status cleanly."""
        from unittest.mock import patch
        from apps.authentication.providers.sms_provider import SangamamSMSProvider

        provider = SangamamSMSProvider()
        with patch.object(provider, "send_sms_detailed") as mock_send_detailed:
            res = provider.send_order_shipped_sms(
                target="9876543210",
                customer_name="Rohan",
                order_number="",  # Missing order_number!
            )
            self.assertFalse(res["success"])
            self.assertEqual(res["status"], "failed")
            self.assertIn("Missing required shipping variables", res["error"])
            mock_send_detailed.assert_not_called()  # Never sends malformed SMS

    def test_notification_service_to_sms_channel_order_shipped_flow(self):
        """Verify NotificationService -> SMSChannel -> SangamamProvider flow for ORDER_SHIPPED."""
        from unittest.mock import patch

        self.user1.phone_number = "9876543210"
        self.user1.save()

        with patch("apps.authentication.providers.SangamamSMSProvider.send_order_shipped_sms") as mock_shipped:
            mock_shipped.return_value = {
                "success": True,
                "status": "accepted",
                "submission_id": "NOTIF_SHIPPED_SUB_222",
                "sender_id": "FAZODT",
                "template_id": "1777178496710209320",
                "entity_id": "1701178461438263453",
            }

            notif = NotificationService.create(
                user=self.user1,
                notification_type=NotificationType.ORDER_SHIPPED,
                channels=[DeliveryChannel.SMS],
                context={
                    "customer_name": "Rohan",
                    "order_number": "FAAZO-2026-00125",
                },
            )

            mock_shipped.assert_called_once()
            call_kwargs = mock_shipped.call_args.kwargs
            self.assertEqual(call_kwargs["customer_name"], "Rohan")
            self.assertEqual(call_kwargs["order_number"], "FAAZO-2026-00125")

            delivery = notif.deliveries.get(channel=DeliveryChannel.SMS)
            self.assertEqual(delivery.status, DeliveryStatus.DELIVERED)
            self.assertEqual(delivery.provider_response.get("submission_id"), "NOTIF_SHIPPED_SUB_222")

    def test_order_shipped_idempotency_protection(self):
        """Verify duplicate status events with identical idempotency key do not trigger duplicate notifications/SMS."""
        from unittest.mock import patch

        self.user1.phone_number = "9876543210"
        self.user1.save()

        with patch("apps.authentication.providers.SangamamSMSProvider.send_order_shipped_sms") as mock_shipped:
            mock_shipped.return_value = {"success": True, "status": "accepted", "submission_id": "SUB_IDEM_1"}

            # Event 1
            n1 = NotificationService.create(
                user=self.user1,
                notification_type=NotificationType.ORDER_SHIPPED,
                idempotency_key="order_shipped_test_id_101",
                channels=[DeliveryChannel.SMS],
                context={"customer_name": "Rohan", "order_number": "FAAZO-101"},
            )

            # Event 2 (Duplicate)
            n2 = NotificationService.create(
                user=self.user1,
                notification_type=NotificationType.ORDER_SHIPPED,
                idempotency_key="order_shipped_test_id_101",
                channels=[DeliveryChannel.SMS],
                context={"customer_name": "Rohan", "order_number": "FAAZO-101"},
            )

            self.assertEqual(n1.id, n2.id)  # Same notification object returned
            mock_shipped.assert_called_once()  # Dispatched exactly once

    def test_failed_sangamam_request_marks_delivery_failed(self):
        """Verify HTTP/gateway failures update NotificationDelivery to FAILED cleanly without crashing caller."""
        from unittest.mock import patch

        self.user1.phone_number = "9876543210"
        self.user1.save()

        with patch("apps.authentication.providers.SangamamSMSProvider.send_order_confirmed_sms") as mock_send:
            mock_send.return_value = {
                "success": False,
                "status": "rejected",
                "error": "Gateway Error 400: Invalid Parameter",
            }

            notif = NotificationService.create(
                user=self.user1,
                notification_type=NotificationType.ORDER_CONFIRMED,
                channels=[DeliveryChannel.SMS],
                context={"order_number": "FAAZO-FAIL-01"},
            )

            delivery = notif.deliveries.get(channel=DeliveryChannel.SMS)
            self.assertEqual(delivery.status, DeliveryStatus.FAILED)
            self.assertIn("Gateway Error", delivery.error_message)

    def test_unread_count_query_and_expiry_filter(self):
        """Verify get_unread_count returns accurate count and excludes expired notifications."""
        # Active unread
        NotificationService.create(user=self.user1, notification_type=NotificationType.ORDER_PLACED)
        NotificationService.create(user=self.user1, notification_type=NotificationType.PASSWORD_CHANGED)

        # Expired unread (should be excluded)
        NotificationService.create(
            user=self.user1,
            notification_type=NotificationType.FLASH_SALE,
            expires_at=timezone.now() - timedelta(minutes=10),
        )

        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.unread_count_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["unread_count"], 2)

    def test_mark_as_read_and_mark_all_read(self):
        """Verify single mark read and bulk mark-all-read operations."""
        notif1 = NotificationService.create(user=self.user1, notification_type=NotificationType.ORDER_PLACED)
        notif2 = NotificationService.create(user=self.user1, notification_type=NotificationType.ORDER_PACKED)

        self.client.force_authenticate(user=self.user1)

        # Mark single read
        res_single = self.client.patch(f"/api/v1/notifications/{notif1.id}/read/")
        self.assertEqual(res_single.status_code, status.HTTP_200_OK)
        notif1.refresh_from_db()
        self.assertTrue(notif1.is_read)

        # Bulk mark all read
        res_bulk = self.client.patch(self.read_all_url)
        self.assertEqual(res_bulk.status_code, status.HTTP_200_OK)
        notif2.refresh_from_db()
        self.assertTrue(notif2.is_read)

    def test_security_isolation(self):
        """Verify users cannot access or modify notifications belonging to another user."""
        notif_user1 = NotificationService.create(user=self.user1, notification_type=NotificationType.ORDER_PLACED)

        # Authenticate as user2
        self.client.force_authenticate(user=self.user2)

        # Attempt to access user1's notification
        res_read = self.client.patch(f"/api/v1/notifications/{notif_user1.id}/read/")
        self.assertEqual(res_read.status_code, status.HTTP_404_NOT_FOUND)

        # User2 list should be empty
        res_list = self.client.get(self.list_url)
        self.assertEqual(len(res_list.data["results"]), 0)

    def test_delete_and_clear_all_notifications(self):
        """Verify single notification delete and clear all operations."""
        notif1 = NotificationService.create(user=self.user1, notification_type=NotificationType.ORDER_PLACED)
        notif2 = NotificationService.create(user=self.user1, notification_type=NotificationType.ORDER_PACKED)

        self.client.force_authenticate(user=self.user1)

        # Delete single
        res_del = self.client.delete(f"/api/v1/notifications/{notif1.id}/")
        self.assertEqual(res_del.status_code, status.HTTP_200_OK)
        self.assertFalse(Notification.objects.filter(id=notif1.id).exists())

        # Clear all
        res_clear = self.client.delete(self.delete_all_url)
        self.assertEqual(res_clear.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(user=self.user1).count(), 0)
