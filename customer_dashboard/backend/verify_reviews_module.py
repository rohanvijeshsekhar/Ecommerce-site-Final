"""
Automated Verification Suite for FAAZO Verified Reviews & Ratings Module
"""

import os
import sys
import uuid
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from decimal import Decimal
from django.contrib.auth import get_user_model
from apps.products.models import Product
from apps.orders.models import Order, OrderItem, OrderStatus
from apps.reviews.models import ProductReview, ReviewMedia, ReviewStatus, MediaType
from apps.reviews.services import ReviewService
from apps.notifications.models import Notification

User = get_user_model()


def run_tests():
    print("=" * 70)
    print("STARTING FAAZO PRODUCT REVIEWS MODULE VERIFICATION")
    print("=" * 70)

    # 1. Setup Test User & Product
    user_email = f"test_reviewer_{uuid.uuid4().hex[:6]}@faazo.com"
    user = User.objects.create_user(
        email=user_email,
        password="TestPassword123!",
        role="customer",
        full_name="Dr. Automated Tester",
    )
    print(f"[+] Created test user: {user.email}")

    product = Product.objects.filter(is_deleted=False).first()
    if not product:
        print("[!] No active product found. Creating test product.")
        from apps.brands.models import Brand
        from apps.categories.models import Category

        brand, _ = Brand.objects.get_or_create(name="TestBrand", slug="testbrand")
        category, _ = Category.objects.get_or_create(name="TestCat", slug="testcat")
        product = Product.objects.create(
            name=f"Test Handpiece {uuid.uuid4().hex[:4]}",
            slug=f"test-handpiece-{uuid.uuid4().hex[:4]}",
            sku=f"SKU-{uuid.uuid4().hex[:6]}",
            brand=brand,
            category=category,
        )
    print(f"[+] Using test product: {product.name} (ID: {product.id})")

    # 2. Check eligibility for unverified customer
    eligibility_1 = ReviewService.check_eligibility(user, str(product.id))
    assert not eligibility_1["can_review"], "Unverified customer should NOT be eligible to review."
    print(" [PASSED] Unverified customer review attempt blocked.")

    # 3. Create DELIVERED order for customer
    from apps.users.models import Address
    address = Address.objects.create(
        user=user,
        address_type="shipping",
        full_name="Dr. Automated Tester",
        mobile="9876543210",
        line1="123 Dental Clinic St",
        city="Kochi",
        state="Kerala",
        pincode="682001",
    )

    order = Order.objects.create(
        user=user,
        shipping_address=address,
        status=OrderStatus.DELIVERED,
        mrp_subtotal=Decimal("15000.00"),
        selling_subtotal=Decimal("15000.00"),
        gst_amount=Decimal("0.00"),
        total_amount=Decimal("15000.00"),
        order_number=f"ORD-REV-{uuid.uuid4().hex[:6].upper()}",
    )
    OrderItem.objects.create(
        order=order,
        product=product,
        quantity=1,
        price=Decimal("15000.00"),
    )
    print(f"[+] Created delivered order {order.order_number} containing product.")

    # 4. Check eligibility for verified customer
    eligibility_2 = ReviewService.check_eligibility(user, str(product.id))
    assert eligibility_2["can_review"], "Verified customer with delivered order SHOULD be eligible."
    print(" [PASSED] Verified customer eligibility check passed.")

    # 5. Create Review
    review_data = {
        "rating": 5,
        "title": "Outstanding Precision & Low Vibration!",
        "comment": "Used this in clinical practice for 2 weeks. Extremely quiet operation and ceramic bearings perform great.",
        "pros": "Quiet, Autoclavable, High torque",
        "cons": "None so far",
        "would_recommend": True,
    }
    review = ReviewService.create_review(user, str(product.id), review_data)
    assert review.status == ReviewStatus.PENDING, "New review should be in PENDING status."
    assert review.rating == 5
    print(" [PASSED] Review creation successful in PENDING status.")

    # 6. Check duplicate review prevention
    eligibility_3 = ReviewService.check_eligibility(user, str(product.id))
    assert eligibility_3["can_review"] and eligibility_3.get("is_edit"), "Subsequent check should return edit mode."
    print(" [PASSED] Single review rule enforced (triggers Edit mode).")

    # 7. Admin Moderation (Approve)
    admin_user = User.objects.filter(is_staff=True).first() or user
    ReviewService.moderate_review(review, ReviewStatus.APPROVED, admin_user=admin_user)
    
    # Reload product & review
    product.refresh_from_db()
    review.refresh_from_db()

    assert review.status == ReviewStatus.APPROVED, "Review status should be APPROVED."
    assert product.total_reviews >= 1, "Product total_reviews count should update."
    assert float(product.average_rating) > 0, "Product average_rating should update."
    print(f" [PASSED] Admin moderation approved. Product Avg Rating: {product.average_rating}, Total Reviews: {product.total_reviews}")

    # 8. Verify Notification Dispatch
    notif = Notification.objects.filter(user=user, metadata__review_id=str(review.id)).first()
    assert notif is not None, "Notification should be dispatched for review approval."
    print(f" [PASSED] Approval notification dispatched: '{notif.title}'")

    print("=" * 70)
    print("ALL VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
