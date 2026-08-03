"""
FAAZO – Background Logistics Synchronization Management Command

Performs periodic background synchronization for active shipments with Shiprocket API.
Recovers from missed webhooks, handles exponential retries, and reconciles event timestamps.

Usage:
  python manage.py sync_shiprocket_shipments
  python manage.py sync_shiprocket_shipments --limit 50
"""

import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.shipping.models import Shipment, ShipmentStatus, ShipmentEvent, ShippingAPILog
from apps.shipping.services import ShiprocketService

logger = logging.getLogger("faazo")


class Command(BaseCommand):
    help = "Periodically syncs active Shiprocket shipment statuses and appends tracking events."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=100,
            help="Maximum number of active shipments to sync in a single run.",
        )

    def handle(self, *args, **options):
        limit = options.get("limit", 100)
        self.stdout.write(self.style.NOTICE(f"Starting background Shiprocket shipment sync (limit={limit})..."))

        service = ShiprocketService()
        active_statuses = [
            ShipmentStatus.CREATED,
            ShipmentStatus.PICKUP_SCHEDULED,
            ShipmentStatus.PICKED_UP,
            ShipmentStatus.REACHED_HUB,
            ShipmentStatus.IN_TRANSIT,
            ShipmentStatus.OUT_FOR_DELIVERY,
            ShipmentStatus.FAILED_DELIVERY,
            ShipmentStatus.RTO_INITIATED,
            ShipmentStatus.RTO_IN_TRANSIT,
        ]

        active_shipments = Shipment.objects.filter(
            shipment_status__in=active_statuses,
            is_deleted=False,
        ).order_by("last_synced_at")[:limit]

        synced_count = 0
        error_count = 0

        for shipment in active_shipments:
            try:
                start_time = timezone.now()
                updated_shipment = service.sync_tracking(shipment)
                end_time = timezone.now()
                latency_ms = int((end_time - start_time).total_seconds() * 1000)

                synced_count += 1
                ShippingAPILog.objects.create(
                    shipment=shipment,
                    endpoint=f"/v1/external/courier/track/awb/{shipment.awb_number}",
                    request_method="GET",
                    request_payload={"action": "background_cron_sync", "shipment_number": shipment.shipment_number},
                    response_payload={"status": updated_shipment.shipment_status, "location": updated_shipment.current_location},
                    http_status=200,
                    latency_ms=latency_ms,
                )
                self.stdout.write(self.style.SUCCESS(f"Synced {shipment.shipment_number} (AWB: {shipment.awb_number}): {shipment.shipment_status}"))

            except Exception as err:
                error_count += 1
                logger.error("[BACKGROUND_SYNC_ERROR] Failed to sync shipment %s: %s", shipment.shipment_number, str(err))
                ShippingAPILog.objects.create(
                    shipment=shipment,
                    endpoint=f"/v1/external/courier/track/awb/{shipment.awb_number}",
                    request_method="GET",
                    request_payload={"action": "background_cron_sync"},
                    response_payload={},
                    http_status=500,
                    error_message=str(err),
                )

        self.stdout.write(self.style.SUCCESS(f"Finished Shiprocket sync. Successfully synced: {synced_count}, Errors: {error_count}"))
