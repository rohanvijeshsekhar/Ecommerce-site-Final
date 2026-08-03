"""
Automated Verification Suite for Wishlist & Save For Later Modules
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.contrib.auth import get_user_model
from apps.products.models import Product
from apps.cart.models import Cart, CartItem
from apps.wishlist.models import Wishlist, WishlistItem

User = get_user_model()


def run_tests():
    print("=" * 70)
    print("STARTING WISHLIST & SAVE FOR LATER FORENSIC VERIFICATION")
    print("=" * 70)

    # 1. Create or retrieve test user & product
    user, _ = User.objects.get_or_create(
        email="test_wishlist_user@faazo.com",
        defaults={
            "full_name": "Wishlist Tester",
            "role": "customer",
        },
    )
    user.set_password("TestPass123!")
    user.save()
    print(f"[+] Test User: {user.email}")

    product = Product.objects.filter(is_deleted=False).first()
    assert product is not None, "Product must exist in DB."
    print(f"[+] Test Product: '{product.name}' (ID: {product.id})")

    # 2. Test Wishlist DB lifecycle
    wishlist, _ = Wishlist.objects.get_or_create(user=user)
    WishlistItem.objects.filter(wishlist=wishlist).delete()

    # Add to Wishlist
    item1, created = WishlistItem.objects.get_or_create(wishlist=wishlist, product=product)
    assert created, "First add to wishlist should create item."
    print(" [PASSED] Wishlist Item created in DB.")

    # Duplicate Add Attempt -> Prevent duplicates
    duplicate_created = False
    try:
        WishlistItem.objects.create(wishlist=wishlist, product=product)
        duplicate_created = True
    except Exception as e:
        print(" [PASSED] Duplicate Wishlist constraint enforced by DB unique index.")

    assert not duplicate_created, "Duplicate wishlist item must fail constraint."

    # Remove from Wishlist
    item1.delete()
    assert WishlistItem.objects.filter(wishlist=wishlist, product=product).count() == 0
    print(" [PASSED] Wishlist Item deletion verified.")

    # 3. Test Save For Later lifecycle in Cart
    cart, _ = Cart.objects.get_or_create(user=user)
    CartItem.objects.filter(cart=cart).delete()

    cart_item = CartItem.objects.create(
        cart=cart,
        product=product,
        quantity=2,
        is_saved_for_later=False,
    )
    assert cart_item.is_saved_for_later == False
    print(" [PASSED] Active Cart Item created.")

    # Move to Save For Later
    cart_item.is_saved_for_later = True
    cart_item.save()
    cart_item.refresh_from_db()
    assert cart_item.is_saved_for_later == True
    print(" [PASSED] Item moved to Save For Later (is_saved_for_later=True).")

    # Active items query excludes saved item
    active_count = cart.items.filter(is_saved_for_later=False).count()
    saved_count = cart.items.filter(is_saved_for_later=True).count()
    assert active_count == 0, "Active cart items count must be 0."
    assert saved_count == 1, "Saved items count must be 1."
    print(" [PASSED] Active Cart vs Saved For Later isolation verified.")

    # Move back to Active Cart
    cart_item.is_saved_for_later = False
    cart_item.save()
    cart_item.refresh_from_db()
    assert cart.items.filter(is_saved_for_later=False).count() == 1
    print(" [PASSED] Item moved back to Active Cart successfully.")

    print("=" * 70)
    print("ALL WISHLIST & SAVE FOR LATER TESTS PASSED 100%!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
