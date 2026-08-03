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
            notification_type=NotificationType.ORDER_SHIPPED,
            context={"order_number": "100255", "courier_name": "BlueDart", "awb_number": "BD12345"},
        )

        self.assertTrue(notif.deliveries.filter(channel=DeliveryChannel.SMS).exists())

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
