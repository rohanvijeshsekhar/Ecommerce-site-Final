import uuid
from django.db import models
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import RetrieveAPIView, DestroyAPIView, UpdateAPIView
from apps.common.responses import success_response, error_response
from apps.products.models import Product
from .models import Cart, CartItem
from .serializers import CartSerializer, CartItemSerializer

def is_valid_uuid(val):
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False

class CartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart, context={"request": request})
        return success_response(data=serializer.data)

    def post(self, request):
        """
        Sync guest LocalStorage items with database cart.
        Body: list of items e.g., [{"product_id": "slug_or_id", "quantity": 1}]
        """
        cart, _ = Cart.objects.get_or_create(user=request.user)
        items_data = request.data
        if not isinstance(items_data, list):
            return error_response("Request body must be a list of items.", status_code=status.HTTP_400_BAD_REQUEST)

        errors = []
        synced_count = 0

        for item in items_data:
            prod_id = item.get("product_id")
            qty = item.get("quantity", 1)
            if not prod_id:
                continue

            try:
                # Find product by primary key or slug
                if is_valid_uuid(prod_id):
                    product = Product.objects.filter(id=prod_id).first()
                else:
                    product = Product.objects.filter(slug=prod_id).first()
                if not product:
                    errors.append(f"Product '{prod_id}' not found.")
                    continue

                cart_item, created = CartItem.objects.get_or_create(cart=cart, product=product)
                if not created:
                    cart_item.quantity += qty
                else:
                    cart_item.quantity = qty

                # Validate inventory via serializer
                serializer = CartItemSerializer(
                    cart_item,
                    data={"product_id": product.id, "quantity": cart_item.quantity},
                    partial=True,
                    context={"request": request}
                )
                if serializer.is_valid():
                    serializer.save()
                    synced_count += 1
                else:
                    errors.append({prod_id: serializer.errors})
            except Exception as e:
                errors.append(str(e))

        serializer = CartSerializer(cart, context={"request": request})
        return success_response(
            data=serializer.data,
            message=f"Synced {synced_count} items. Errors: {errors}" if errors else "Cart synced successfully."
        )

class CartAddView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        prod_id = request.data.get("product_id")
        qty = int(request.data.get("quantity", 1))

        if not prod_id:
            return error_response("product_id is required.", status_code=status.HTTP_400_BAD_REQUEST)

        if is_valid_uuid(prod_id):
            product = Product.objects.filter(id=prod_id).first()
        else:
            product = Product.objects.filter(slug=prod_id).first()
        if not product:
            return error_response("Product not found.", status_code=status.HTTP_404_NOT_FOUND)

        cart_item, created = CartItem.objects.get_or_create(cart=cart, product=product)
        if not created:
            cart_item.quantity += qty
        else:
            cart_item.quantity = qty

        serializer = CartItemSerializer(
            cart_item,
            data={"product_id": product.id, "quantity": cart_item.quantity},
            partial=True,
            context={"request": request}
        )
        if not serializer.is_valid():
            return error_response(serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        cart_serializer = CartSerializer(cart, context={"request": request})
        return success_response(data=cart_serializer.data, message="Product added to cart.")

class CartItemDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            cart_item = CartItem.objects.select_related('cart').get(pk=pk, cart__user=request.user)
        except CartItem.DoesNotExist:
            return error_response("Cart item not found.", status_code=status.HTTP_404_NOT_FOUND)

        qty = request.data.get("quantity")
        if qty is None:
            return error_response("quantity is required.", status_code=status.HTTP_400_BAD_REQUEST)

        serializer = CartItemSerializer(
            cart_item,
            data={"quantity": int(qty)},
            partial=True,
            context={"request": request}
        )
        if not serializer.is_valid():
            return error_response(serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        cart_serializer = CartSerializer(cart_item.cart, context={"request": request})
        return success_response(data=cart_serializer.data, message="Cart item updated.")

    def delete(self, request, pk):
        try:
            cart_item = CartItem.objects.select_related('cart').get(pk=pk, cart__user=request.user)
        except CartItem.DoesNotExist:
            return error_response("Cart item not found.", status_code=status.HTTP_404_NOT_FOUND)

        cart = cart_item.cart
        cart_item.delete()
        cart_serializer = CartSerializer(cart, context={"request": request})
        return success_response(data=cart_serializer.data, message="Cart item removed.")

class CartClearView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart.items.filter(is_saved_for_later=False).delete()
        serializer = CartSerializer(cart, context={"request": request})
        return success_response(data=serializer.data, message="Active cart cleared.")


class CartSaveForLaterView(APIView):
    """
    POST /api/v1/cart/items/<pk>/save-for-later/
    Move an active cart item to Save For Later.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            cart_item = CartItem.objects.select_related('cart').get(pk=pk, cart__user=request.user)
        except CartItem.DoesNotExist:
            return error_response("Cart item not found.", status_code=status.HTTP_404_NOT_FOUND)

        cart_item.is_saved_for_later = True
        cart_item.save(update_fields=["is_saved_for_later"])

        serializer = CartSerializer(cart_item.cart, context={"request": request})
        return success_response(data=serializer.data, message=f"Saved '{cart_item.product.name}' for later.")


class CartMoveToCartView(APIView):
    """
    POST /api/v1/cart/items/<pk>/move-to-cart/
    Move a saved-for-later item back to active cart.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            cart_item = CartItem.objects.select_related('cart').get(pk=pk, cart__user=request.user)
        except CartItem.DoesNotExist:
            return error_response("Cart item not found.", status_code=status.HTTP_404_NOT_FOUND)

        cart_item.is_saved_for_later = False
        cart_item.save(update_fields=["is_saved_for_later"])

        serializer = CartSerializer(cart_item.cart, context={"request": request})
        return success_response(data=serializer.data, message=f"Moved '{cart_item.product.name}' back to cart.")

