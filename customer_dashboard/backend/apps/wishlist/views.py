import uuid
from django.db import transaction, models
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from apps.common.responses import success_response, error_response
from apps.products.models import Product
from apps.cart.models import Cart, CartItem
from apps.wishlist.models import Wishlist, WishlistItem
from apps.wishlist.serializers import WishlistSerializer, WishlistItemSerializer


def is_valid_uuid(val):
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def get_or_create_wishlist(user):
    wishlist, _ = Wishlist.objects.get_or_create(user=user)
    return wishlist


class WishlistDetailView(APIView):
    """
    GET /api/v1/wishlist/
    Fetch user's current wishlist with items and full product details.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wishlist = get_or_create_wishlist(request.user)
        serializer = WishlistSerializer(wishlist, context={"request": request})
        return success_response(data=serializer.data, message="Wishlist retrieved successfully.")


class WishlistToggleView(APIView):
    """
    POST /api/v1/wishlist/toggle/
    Body: { "product_id": "<uuid_or_slug>" }
    Idempotent toggle product in wishlist. Returns { "is_wishlisted": boolean, "wishlist": data }.
    Safely supports both Product UUID and slug identifiers.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        product_id = request.data.get("product_id")
        if not product_id:
            return error_response(message="Product ID is required.", status_code=status.HTTP_400_BAD_REQUEST)

        if is_valid_uuid(product_id):
            product = Product.objects.filter(id=product_id, is_deleted=False).first()
        else:
            product = Product.objects.filter(slug=product_id, is_deleted=False).first()

        if not product:
            return error_response(message="Product not found.", status_code=status.HTTP_404_NOT_FOUND)

        wishlist = get_or_create_wishlist(request.user)

        with transaction.atomic():
            item, created = WishlistItem.objects.get_or_create(
                wishlist=wishlist,
                product=product,
            )

            if not created:
                # Item was already in wishlist, remove it
                item.delete()
                is_wishlisted = False
                msg = f"Removed '{product.name}' from your wishlist."
            else:
                is_wishlisted = True
                msg = f"Added '{product.name}' to your wishlist."

        serializer = WishlistSerializer(wishlist, context={"request": request})
        return success_response(
            data={"is_wishlisted": is_wishlisted, "wishlist": serializer.data},
            message=msg,
        )


class WishlistItemDetailView(APIView):
    """
    DELETE /api/v1/wishlist/items/<product_id>/
    Remove product from wishlist by UUID or slug.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, product_id):
        wishlist = get_or_create_wishlist(request.user)
        if is_valid_uuid(product_id):
            item = WishlistItem.objects.filter(wishlist=wishlist, product__id=product_id).first()
        else:
            item = WishlistItem.objects.filter(wishlist=wishlist, product__slug=product_id).first()

        if item:
            item.delete()

        serializer = WishlistSerializer(wishlist, context={"request": request})
        return success_response(data=serializer.data, message="Item removed from wishlist.")


class WishlistMoveToCartView(APIView):
    """
    POST /api/v1/wishlist/items/<product_id>/move-to-cart/
    Atomically moves product from wishlist to active cart by UUID or slug.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, product_id):
        if is_valid_uuid(product_id):
            product = Product.objects.filter(id=product_id, is_deleted=False).first()
        else:
            product = Product.objects.filter(slug=product_id, is_deleted=False).first()

        if not product:
            return error_response(message="Product not found.", status_code=status.HTTP_404_NOT_FOUND)

        wishlist = get_or_create_wishlist(request.user)
        cart, _ = Cart.objects.get_or_create(user=request.user)

        with transaction.atomic():
            # Remove from wishlist if present
            WishlistItem.objects.filter(wishlist=wishlist, product=product).delete()

            # Add or update in active cart
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                product=product,
                defaults={"quantity": 1, "is_saved_for_later": False},
            )
            if not created:
                cart_item.is_saved_for_later = False
                cart_item.quantity += 1
                cart_item.save(update_fields=["is_saved_for_later", "quantity"])

        wishlist_serializer = WishlistSerializer(wishlist, context={"request": request})
        return success_response(
            data={"wishlist": wishlist_serializer.data},
            message=f"Moved '{product.name}' to cart.",
        )


class WishlistSyncGuestView(APIView):
    """
    POST /api/v1/wishlist/sync/
    Body: { "product_ids": ["uuid1", "slug2"] }
    Merges guest local storage wishlist product IDs (UUID or slug) to database wishlist upon user login.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        product_ids = request.data.get("product_ids", [])
        if not isinstance(product_ids, list):
            return error_response(message="product_ids must be a list.", status_code=status.HTTP_400_BAD_REQUEST)

        wishlist = get_or_create_wishlist(request.user)
        uuid_ids = [pid for pid in product_ids if is_valid_uuid(pid)]
        slug_ids = [pid for pid in product_ids if not is_valid_uuid(pid)]

        valid_products = Product.objects.filter(
            models.Q(id__in=uuid_ids) | models.Q(slug__in=slug_ids),
            is_deleted=False
        )

        with transaction.atomic():
            for product in valid_products:
                WishlistItem.objects.get_or_create(wishlist=wishlist, product=product)

        serializer = WishlistSerializer(wishlist, context={"request": request})
        return success_response(data=serializer.data, message="Guest wishlist synced successfully.")
