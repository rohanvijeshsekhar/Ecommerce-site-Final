import datetime
from django.db import transaction
from django.utils import timezone
from apps.warranty.models import WarrantyRegistration, WarrantyProvider, WarrantyRegistrationStatus
from apps.orders.models import OrderStatus

def create_warranty_registrations(order):
    """
    Explicitly creates warranty registrations for all FAAZO products in a delivered order.
    Sets status to 'pending_registration'. Imported brands are skipped.
    """
    # Guard: only delivered orders can be registered
    if order.status != OrderStatus.DELIVERED:
        return
    
    with transaction.atomic():
        for item in order.items.all():
            product = item.product
            
            # GATING: Imported products must not use this workflow
            if product.warranty_provider != 'faazo':
                continue
            
            # Count registrations that have already been created for this OrderItem
            existing_count = WarrantyRegistration.objects.filter(order_item=item).count()
            needed_count = item.quantity - existing_count
            
            if needed_count <= 0:
                continue
            
            # Resolve effective warranty months from product overrides / brand defaults
            months = getattr(product, 'effective_warranty_months', 12) or 12

            # Resolve purchase date (when order was marked delivered or order creation time)
            purchase_date = order.delivered_at.date() if order.delivered_at else order.created_at.date()
            warranty_start = purchase_date
            
            # Calculate warranty_end date safely handling month boundaries (e.g. Feb 30th -> Feb 28th)
            year = warranty_start.year + (warranty_start.month - 1 + months) // 12
            month = (warranty_start.month - 1 + months) % 12 + 1
            day = min(warranty_start.day, [31,
                29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28,
                31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month-1])
            warranty_end = datetime.date(year, month, day)

            # Create one registration record per purchased unit (all pending_registration)
            for _ in range(needed_count):
                WarrantyRegistration.objects.create(
                    user=order.user,
                    order=order,
                    order_item=item,
                    product=product,
                    serial_number=None,  # Nullable initially
                    purchase_date=purchase_date,
                    warranty_start=warranty_start,
                    warranty_end=warranty_end,
                    warranty_provider=WarrantyProvider.FAAZO,
                    warranty_status=WarrantyRegistrationStatus.PENDING_REGISTRATION
                )
