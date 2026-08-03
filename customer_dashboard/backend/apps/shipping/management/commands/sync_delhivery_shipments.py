"""
FAAZO – Background Logistics Synchronization Management Command (Backward Compatible Alias)

Delegates to sync_shiprocket_shipments. Command alias maintained to prevent broken cron scripts.
"""

from apps.shipping.management.commands.sync_shiprocket_shipments import Command as ShiprocketSyncCommand

class Command(ShiprocketSyncCommand):
    help = "Periodically syncs active Shiprocket shipment statuses (legacy command alias)."
