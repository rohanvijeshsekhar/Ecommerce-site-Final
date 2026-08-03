"""
Automated Forensic Verification Suite for Product Sharing System
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.contrib.auth import get_user_model
from apps.products.models import Product, ProductShareLog, SharePlatform

User = get_user_model()


def run_tests():
    print("=" * 70)
    print("STARTING PRODUCT SHARING SYSTEM FORENSIC VERIFICATION")
    print("=" * 70)

    # 1. Retrieve test user & product
    user, _ = User.objects.get_or_create(
        email="test_share_user@faazo.com",
        defaults={"full_name": "Share Tester", "role": "customer"},
    )

    product = Product.objects.filter(is_deleted=False).first()
    assert product is not None, "Test Product must exist in DB."
    print(f"[+] Test Product: '{product.name}' (ID: {product.id})")

    # Clean existing test logs
    ProductShareLog.objects.filter(product=product).delete()

    # 2. Verify Share Logging across channels
    platforms_to_test = [
        SharePlatform.WHATSAPP,
        SharePlatform.TELEGRAM,
        SharePlatform.FACEBOOK,
        SharePlatform.TWITTER,
        SharePlatform.LINKEDIN,
        SharePlatform.EMAIL,
        SharePlatform.COPY_LINK,
        SharePlatform.NATIVE_SHARE,
    ]

    for p in platforms_to_test:
        log = ProductShareLog.objects.create(
            product=product,
            user=user,
            platform=p,
            ip_address="127.0.0.1",
        )
        assert log.id is not None
        assert log.platform == p
        print(f" [PASSED] Recorded share event for platform: '{p}'")

    total_logs = ProductShareLog.objects.filter(product=product).count()
    assert total_logs == len(platforms_to_test)
    print(f" [PASSED] Analytics query verified. Total logged events: {total_logs}")

    print("=" * 70)
    print("ALL PRODUCT SHARING TESTS PASSED 100%!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
