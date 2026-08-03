"""
Seed Script for FAAZO Tier-1 Customer Support FAQs
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.support.models import FAQCategory, FAQItem, ActionButtonType


def seed():
    print("Seeding FAAZO Tier-1 FAQ Categories and Items...")

    # Categories
    cat_orders, _ = FAQCategory.objects.get_or_create(
        slug="orders-delivery",
        defaults={
            "name": "Orders & Delivery",
            "icon": "Package",
            "display_order": 1,
            "is_active": True,
        },
    )

    cat_returns, _ = FAQCategory.objects.get_or_create(
        slug="returns-refunds",
        defaults={
            "name": "Returns & Replacements",
            "icon": "RotateCcw",
            "display_order": 2,
            "is_active": True,
        },
    )

    cat_payments, _ = FAQCategory.objects.get_or_create(
        slug="payments-billing",
        defaults={
            "name": "Payments & Billing",
            "icon": "CreditCard",
            "display_order": 3,
            "is_active": True,
        },
    )

    cat_tech, _ = FAQCategory.objects.get_or_create(
        slug="technical-assistance",
        defaults={
            "name": "Technical Assistance",
            "icon": "Wrench",
            "display_order": 4,
            "is_active": True,
        },
    )

    # 6 Core FAQ Items
    faqs = [
        {
            "category": cat_orders,
            "question": "Where is my order?",
            "slug": "where-is-my-order",
            "icon_name": "PackageSearch",
            "action_button_label": "Track Order",
            "action_button_url": "/orders",
            "action_button_type": ActionButtonType.TRACK_ORDER,
            "display_order": 1,
            "is_featured": True,
            "answer": """### Real-Time Order Tracking Instructions

You can track your order status in real time:

1. **Log in** to your FAAZO account.
2. Go to **My Orders** (`/orders`).
3. Click **View Order Details** on your latest order to view real-time courier tracking details (BlueDart, Delhivery, or SpeedPost).
4. If your shipment has dispatched, a live tracking link with airway bill number (AWB) will be displayed.

*Need immediate delivery assistance? Click the button below to view your orders.*""",
        },
        {
            "category": cat_orders,
            "question": "When will my order be delivered?",
            "slug": "when-will-my-order-be-delivered",
            "icon_name": "Truck",
            "action_button_label": "View Orders",
            "action_button_url": "/orders",
            "action_button_type": ActionButtonType.VIEW_ORDERS,
            "display_order": 2,
            "is_featured": True,
            "answer": """### Estimated Delivery Timelines

- **Metro & Tier-1 Cities**: 2 – 3 Business Days.
- **Tier-2 & Tier-3 Regional Clinics**: 3 – 5 Business Days.
- **Heavy Clinical Equipment (Autoclaves / Chairs)**: 4 – 7 Business Days with scheduled installation.

Once shipped, you will receive SMS and email updates at every milestone (Packed, Shipped, Out for Delivery).""",
        },
        {
            "category": cat_returns,
            "question": "How do I return or replace a product?",
            "slug": "how-do-i-return-or-replace-a-product",
            "icon_name": "RotateCcw",
            "action_button_label": "Request Return",
            "action_button_url": "/orders",
            "action_button_type": ActionButtonType.REQUEST_RETURN,
            "display_order": 3,
            "is_featured": True,
            "answer": """### 7-Day Replacement & Return Guarantee

FAAZO provides a **7-Day Risk-Free Return Guarantee** for all clinical supplies and equipment:

1. Go to **My Orders** $\rightarrow$ Open the delivered order.
2. Click **Return / Replace Item** next to the delivered product.
3. Select reason (Transit damage, Defect, Incorrect specification) and attach clear photos/videos.
4. Our courier partner will pick up the item within 48 hours.

*Note: Items must be unused in original manufacturer packaging with warranty cards.*""",
        },
        {
            "category": cat_orders,
            "question": "How can I cancel my order?",
            "slug": "how-can-i-cancel-my-order",
            "icon_name": "XCircle",
            "action_button_label": "View Orders",
            "action_button_url": "/orders",
            "action_button_type": ActionButtonType.VIEW_ORDERS,
            "display_order": 4,
            "is_featured": True,
            "answer": """### Instant Cancellation Policy

- **Before Dispatch**: You can cancel your order instantly from your account. Go to **My Orders** $\rightarrow$ Click **Cancel Order**.
- **After Dispatch**: If the order has already left our warehouse, you can reject delivery when the courier arrives or contact support for intercept.

*Prepaid order refunds are credited back to your original payment method within 3–5 business days.*""",
        },
        {
            "category": cat_payments,
            "question": "My payment failed.",
            "slug": "my-payment-failed",
            "icon_name": "AlertTriangle",
            "action_button_label": "Retry Payment",
            "action_button_url": "/orders",
            "action_button_type": ActionButtonType.RETRY_PAYMENT,
            "display_order": 5,
            "is_featured": True,
            "answer": """### Payment Failure & Refund Assistance

If your payment failed during checkout:

1. **Debited Amount**: Any money deducted from your bank/UPI will be automatically refunded by Razorpay/your bank within 3–5 business days.
2. **Pending Order**: Your order is saved under **My Orders** as `Pending Payment`.
3. **Retry Payment**: Click **Retry Payment** to pay via UPI, Credit Card, NetBanking, or EMI without re-adding items to your cart.

*If money was debited but status shows unpaid, click Retry Payment or contact support.*""",
        },
        {
            "category": cat_tech,
            "question": "I need technical assistance.",
            "slug": "i-need-technical-assistance",
            "icon_name": "Wrench",
            "action_button_label": "View Orders",
            "action_button_url": "/orders",
            "action_button_type": ActionButtonType.CUSTOM_LINK,
            "display_order": 6,
            "is_featured": True,
            "answer": """### 24/7 Clinical & Equipment Technical Support

FAAZO certified biomedical engineers are available for:

- Handpiece lubrication, chuck maintenance, and noise troubleshooting.
- Dental chair hydraulic / electrical calibration.
- Autoclave sterilization cycle validation and error codes.
- Digital sensor & intraoral camera driver setup.

*Click "No, I still need help" below to immediately connect with a technical engineer via WhatsApp or phone.*""",
        },
    ]

    for data in faqs:
        FAQItem.objects.update_or_create(
            slug=data["slug"],
            defaults=data,
        )
        print(f" [+] Seeded FAQ: '{data['question']}'")

    print("Seeding completed successfully!")


if __name__ == "__main__":
    seed()
