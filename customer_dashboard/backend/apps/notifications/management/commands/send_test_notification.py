"""
FAAZO – Management Command to Trigger Test Notifications for Testing UI and Channels

Usage:
    python manage.py send_test_notification --email user@example.com --type ORDER_CONFIRMED
    python manage.py send_test_notification --email user@example.com --type PASSWORD_CHANGED
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.notifications.models import NotificationType, DeliveryChannel
from apps.notifications.services import NotificationService

User = get_user_model()


class Command(BaseCommand):
    help = "Triggers a test notification for a user via NotificationService."

    def add_arguments(self, parser):
        parser.add_argument("--email", type=str, help="Email of the recipient user.")
        parser.add_argument(
            "--type",
            type=str,
            default="ORDER_CONFIRMED",
            help="Notification type (e.g. ORDER_PLACED, ORDER_CONFIRMED, ORDER_SHIPPED, PASSWORD_CHANGED, FLASH_SALE).",
        )
        parser.add_argument(
            "--channels",
            nargs="+",
            default=None,
            help="Delivery channels (e.g. IN_APP EMAIL SMS). Defaults to default channels for the notification type.",
        )

    def handle(self, *args, **options):
        email = options.get("email")
        notif_type = options.get("type", "ORDER_CONFIRMED").upper()
        channels = options.get("channels")

        if not email:
            user = User.objects.first()
            if not user:
                self.stdout.write(self.style.ERROR("No users found in database. Create a user first."))
                return
        else:
            user = User.objects.filter(email=email).first()
            if not user:
                self.stdout.write(self.style.ERROR(f"User with email '{email}' not found."))
                return

        notif = NotificationService.create(
            user=user,
            notification_type=notif_type,
            channels=channels,
            context={
                "first_name": user.full_name or "Doctor",
                "order_number": "100889",
                "total_amount": "4,999",
                "courier_name": "BlueDart",
                "awb_number": "BD987654321IN",
                "delivery_otp": "4829",
                "email": user.email,
                "reason": "Security verification",
                "discount_text": "20%",
                "coupon_code": "FAAZO20",
            },
            action_url="/notifications",
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully sent '{notif_type}' notification to {user.email}! "
                f"Notification ID: {notif.id}. Channels: {[d.channel for d in notif.deliveries.all()]}"
            )
        )
