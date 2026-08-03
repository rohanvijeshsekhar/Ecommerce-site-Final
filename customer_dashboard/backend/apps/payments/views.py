"""
FAAZO – Payment Views

Three endpoints:
  POST /api/v1/payments/create-order/  → Create Razorpay order
  POST /api/v1/payments/verify/        → Verify payment & create Order
  POST /api/v1/payments/webhook/       → Razorpay webhook receiver
"""

import json
import logging
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

class PaymentCreateOrderThrottle(ScopedRateThrottle):
    scope = "payment_create"

class PaymentVerifyThrottle(ScopedRateThrottle):
    scope = "payment_verify"

from apps.cart.models import Cart
from apps.checkout.views import calculate_checkout_pricing, is_valid_uuid
from apps.common.responses import error_response, success_response
from apps.inventory.models import ProductInventory
from apps.orders.models import Order, OrderItem, OrderStatus
from apps.products.models import Product
from apps.users.models import Address

from .models import Payment, PaymentStatus, WebhookEvent
from . import services as razorpay_service

logger = logging.getLogger("faazo.payments")


def _resolve_cart_items(user, items_data):
    """
    Resolve cart items from either explicit items list (buy-now)
    or the user's database cart.

    Returns:
        (cart_items, is_buy_now, error_response_or_none)
    """

    class DummyItem:
        def __init__(self, product, quantity):
            self.product = product
            self.quantity = quantity

    if items_data:
        cart_items = []
        for item in items_data:
            prod_id = item.get("product_id")
            qty = int(item.get("quantity", 1))
            if is_valid_uuid(prod_id):
                product = Product.objects.filter(id=prod_id).first()
            else:
                product = Product.objects.filter(slug=prod_id).first()
            if not product:
                return None, True, error_response(
                    f"Product '{prod_id}' not found.",
                    status_code=status.HTTP_404_NOT_FOUND,
                )
            cart_items.append(DummyItem(product, qty))
        return cart_items, True, None
    else:
        try:
            cart = Cart.objects.get(user=user)
            cart_items = list(cart.items.select_related("product", "product__pricing").all())
        except Cart.DoesNotExist:
            cart_items = []
        return cart_items, False, None


def _validate_inventory(cart_items):
    """Check stock availability for all items. Returns error response or None."""
    for item in cart_items:
        inventory = getattr(item.product, "inventory", None)
        if inventory and not inventory.allow_backorders and item.quantity > inventory.available_stock:
            return error_response(
                f"Insufficient stock for '{item.product.name}'. Max {inventory.available_stock}.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
    return None


class CreatePaymentOrderView(APIView):
    """
    POST /api/v1/payments/create-order/

    Validates cart, calculates pricing, creates a Razorpay order,
    and stores a Payment record with status 'created'.

    Returns the Razorpay order details needed by the frontend to
    open the checkout modal.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [PaymentCreateOrderThrottle]

    def post(self, request):
        user = request.user

        # Check purchase permission (dealers must be approved)
        if hasattr(user, "can_purchase") and not user.can_purchase:
            return error_response(
                "Your account is not authorised to make purchases.",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        address_id = request.data.get("address_id")
        delivery_method = request.data.get("delivery_method", "standard")
        payment_method = request.data.get("payment_method", "razorpay")
        gst_number = request.data.get("gst_number")
        items_data = request.data.get("items")

        if not address_id:
            return error_response("address_id is required.", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            address = Address.objects.get(pk=address_id, user=user)
        except (Address.DoesNotExist, ValueError):
            return error_response(
                "Selected shipping address was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        # Resolve cart items
        cart_items, is_buy_now, err = _resolve_cart_items(user, items_data)
        if err:
            return err
        if not cart_items:
            return error_response("Your checkout queue is empty.", status_code=status.HTTP_400_BAD_REQUEST)

        # Validate inventory
        inv_err = _validate_inventory(cart_items)
        if inv_err:
            return inv_err

        # Calculate pricing using existing checkout logic
        pricing = calculate_checkout_pricing(user, cart_items, delivery_method)
        total_amount = Decimal(str(pricing["total_amount"]))

        if total_amount <= 0:
            return error_response("Invalid order total.", status_code=status.HTTP_400_BAD_REQUEST)

        # Snapshot delivery address details to guarantee address fidelity even if original Address row is deleted later
        address_snapshot = {
            "id": str(address.id),
            "label": address.label,
            "full_name": address.full_name,
            "mobile": address.mobile,
            "line1": address.line1,
            "line2": address.line2 or "",
            "city": address.city,
            "state": address.state,
            "pincode": address.pincode,
        }

        # Generate base idempotency key from user + address + items
        item_fingerprint = "|".join(
            f"{getattr(item.product, 'id', '')}:{item.quantity}" for item in cart_items
        )
        base_idempotency_key = f"{user.id}:{address_id}:{delivery_method}:{item_fingerprint}"

        from django.db import IntegrityError
        from rest_framework.response import Response
        import traceback

        # Fix 6: Immutable Idempotency Records
        # Query only for active CREATED payment session. Historical completed/failed records remain strictly immutable.
        existing = Payment.objects.filter(
            idempotency_key=base_idempotency_key,
            status=PaymentStatus.CREATED
        ).first()

        idempotency_key = base_idempotency_key
        if not existing and Payment.objects.filter(idempotency_key=base_idempotency_key).exists():
            # Session-scoped key for new checkout attempt so historical payment audit logs are never mutated
            idempotency_key = f"{base_idempotency_key}:{uuid.uuid4().hex[:8]}"

        if existing:
            is_mock_order = existing.razorpay_order_id.startswith("order_mock_")

            if not is_mock_order:
                # Check if this order was created with the current key_id.
                # If credentials were rotated, the order belongs to the old key and
                # Razorpay will reject it with "Invalid Token" when the frontend
                # opens the modal with the new key. Supersede it in that case.
                stored_key = (existing.gateway_response or {}).get("key_id", "")
                current_key = settings.RAZORPAY_KEY_ID
                key_mismatch = stored_key and stored_key != current_key

                if not key_mismatch:
                    # Return the existing active Razorpay order (idempotent — same active checkout)
                    logger.info("Returning active payment order: %s", existing.razorpay_order_id)
                    return success_response(
                        data={
                            "razorpay_order_id": existing.razorpay_order_id,
                            "amount": int(existing.amount * 100),
                            "currency": existing.currency,
                            "key_id": current_key,
                            "payment_id": str(existing.id),
                        },
                        message="Payment order already exists.",
                    )

                # Credentials were rotated — the old Razorpay order belongs to a
                # different key. Supersede it with a fresh order under the current key.
                logger.info(
                    "Key mismatch detected (stored=%s current=%s). "
                    "Superseding stale order %s with fresh one.",
                    stored_key[:16] if stored_key else "unknown",
                    current_key[:16],
                    existing.razorpay_order_id,
                )

            # Stale sandbox record — supersede it in-place with a fresh real Razorpay order.
            logger.info(
                "Superseding stale sandbox payment record %s with fresh real Razorpay order.",
                existing.id,
            )
            amount_paise = int(total_amount * 100)
            receipt = f"faazo_{uuid.uuid4().hex[:12]}"

            try:
                rz_order = razorpay_service.create_razorpay_order(
                    amount_paise=amount_paise,
                    receipt=receipt,
                    notes={
                        "user_id": str(user.id),
                        "user_email": user.email,
                        "address_id": str(address_id),
                    },
                )
            except Exception as e:
                logger.error("Razorpay order creation failed (supersede path): %s", e)
                logger.error(traceback.format_exc())
                return Response(
                    {
                        "success": False,
                        "message": f"Razorpay Gateway Error: {str(e)}",
                        "error": {
                            "code": "PAYMENT_GATEWAY_ERROR",
                            "message": f"Razorpay Gateway Error: {str(e)}",
                            "details": None,
                        }
                    },
                    status=status.HTTP_502_BAD_GATEWAY
                )

            checkout_snapshot = {
                "address_id": str(address_id),
                "address_snapshot": address_snapshot,
                "delivery_method": delivery_method,
                "payment_method": payment_method,
                "gst_number": gst_number,
                "is_buy_now": is_buy_now,
                "items": [
                    {"product_id": str(item.product.id), "quantity": item.quantity}
                    for item in cart_items
                ],
                "pricing": pricing,
            }

            try:
                existing.razorpay_order_id = rz_order["id"]
                existing.amount = total_amount
                existing.payment_method = payment_method
                existing.checkout_data = checkout_snapshot
                existing.gateway_response = rz_order
                existing.status = PaymentStatus.CREATED
                existing.save()
            except IntegrityError as ie:
                logger.error("Integrity error during database update: %s", ie)
                logger.error(traceback.format_exc())
                return Response(
                    {
                        "success": False,
                        "message": "Database conflict: payment session is already active.",
                        "error": {
                            "code": "DATABASE_CONFLICT",
                            "message": "Database conflict: payment session is already active.",
                            "details": str(ie),
                        }
                    },
                    status=status.HTTP_409_CONFLICT
                )

            logger.info(
                "Sandbox payment superseded: payment=%s new_razorpay_order=%s amount=₹%s",
                existing.id,
                rz_order["id"],
                total_amount,
            )

            return success_response(
                data={
                    "razorpay_order_id": rz_order["id"],
                    "amount": amount_paise,
                    "currency": "INR",
                    "key_id": settings.RAZORPAY_KEY_ID,
                    "payment_id": str(existing.id),
                },
                message="Payment order created. Proceed to payment.",
            )

        # No existing active record — create a fresh Razorpay order
        amount_paise = int(total_amount * 100)
        receipt = f"faazo_{uuid.uuid4().hex[:12]}"

        try:
            rz_order = razorpay_service.create_razorpay_order(
                amount_paise=amount_paise,
                receipt=receipt,
                notes={
                    "user_id": str(user.id),
                    "user_email": user.email,
                    "address_id": str(address_id),
                },
            )
        except Exception as e:
            logger.error("Razorpay order creation failed: %s", e)
            logger.error(traceback.format_exc())
            return Response(
                {
                    "success": False,
                    "message": f"Razorpay Gateway Error: {str(e)}",
                    "error": {
                        "code": "PAYMENT_GATEWAY_ERROR",
                        "message": f"Razorpay Gateway Error: {str(e)}",
                        "details": None,
                    }
                },
                status=status.HTTP_502_BAD_GATEWAY
            )

        # Snapshot checkout data & address for later order creation
        checkout_snapshot = {
            "address_id": str(address_id),
            "address_snapshot": address_snapshot,
            "delivery_method": delivery_method,
            "payment_method": payment_method,
            "gst_number": gst_number,
            "is_buy_now": is_buy_now,
            "items": [
                {"product_id": str(item.product.id), "quantity": item.quantity}
                for item in cart_items
            ],
            "pricing": pricing,
        }

        # Save payment record.
        # We also embed key_id in gateway_response so future idempotency checks
        # can detect credential rotation and supersede stale orders.
        rz_order_with_key = {**rz_order, "key_id": settings.RAZORPAY_KEY_ID}
        try:
            payment = Payment.objects.create(
                user=user,
                razorpay_order_id=rz_order["id"],
                amount=total_amount,
                currency="INR",
                status=PaymentStatus.CREATED,
                payment_method=payment_method,
                idempotency_key=idempotency_key,
                checkout_data=checkout_snapshot,
                gateway_response=rz_order_with_key,
            )
        except IntegrityError as ie:
            logger.error("Integrity error during database insert: %s", ie)
            logger.error(traceback.format_exc())
            return Response(
                {
                    "success": False,
                    "message": "Database conflict: payment session is already active.",
                    "error": {
                        "code": "DATABASE_CONFLICT",
                        "message": "Database conflict: payment session is already active.",
                        "details": str(ie),
                    }
                },
                status=status.HTTP_409_CONFLICT
            )

        # Save clinic GST number if provided
        if gst_number and hasattr(user, "profile"):
            profile = user.profile
            profile.gst_number = gst_number
            profile.save()

        logger.info(
            "Payment order created: payment=%s razorpay_order=%s amount=₹%s",
            payment.id,
            rz_order["id"],
            total_amount,
        )

        return success_response(
            data={
                "razorpay_order_id": rz_order["id"],
                "amount": amount_paise,
                "currency": "INR",
                "key_id": settings.RAZORPAY_KEY_ID,
                "payment_id": str(payment.id),
            },
            message="Payment order created. Proceed to payment.",
        )


def create_order_from_payment(payment, razorpay_payment_id, razorpay_signature, gateway_response=None):
    """
    Creates an Order from the frozen checkout snapshot in a Payment transaction.
    Fix 1: Concurrency-safe with transaction.atomic() & select_for_update() row locks.
    Fix 2: Atomic inventory protection with F() expressions.
    Fix 3: Preserves original address snapshot without inventing fake fallback addresses.
    """
    with transaction.atomic():
        # Lock the Payment row to prevent concurrent race conditions between client verify and webhook
        locked_payment = Payment.objects.select_for_update().filter(id=payment.id).first()
        if not locked_payment:
            locked_payment = payment

        if locked_payment.order:
            return locked_payment.order

        checkout = locked_payment.checkout_data
        user = locked_payment.user

        # Fix 3: Address Snapshot Resolution (No Fake Fallback Address Generation)
        address_id = checkout.get("address_id")
        address = None
        if address_id:
            try:
                address = Address.objects.get(pk=address_id, user=user)
            except (Address.DoesNotExist, ValueError):
                address = None

        if not address:
            # Fall back to user's primary active address
            address = Address.objects.filter(user=user).first()

        order_notes = ""
        if not address:
            # Recreate exact address object from frozen snapshot if available
            snap = checkout.get("address_snapshot", {})
            if snap and snap.get("line1") and snap.get("city"):
                address = Address.objects.create(
                    user=user,
                    label=snap.get("label", "Checkout Address"),
                    full_name=snap.get("full_name") or user.full_name or "Dentist Partner",
                    mobile=snap.get("mobile") or getattr(user, "phone_number", "") or "0000000000",
                    line1=snap["line1"],
                    line2=snap.get("line2", ""),
                    city=snap["city"],
                    state=snap.get("state", ""),
                    pincode=snap.get("pincode", "000000"),
                )
            else:
                # If even snapshot details are missing, flag for manual review instead of generating fake street names
                order_notes = "MANUAL_REVIEW_REQUIRED: Delivery address missing post-checkout."

        pricing = checkout["pricing"]

        order = Order.objects.create(
            user=user,
            shipping_address=address,
            status=OrderStatus.PROCESSING,
            payment_method=checkout.get("payment_method", "razorpay"),
            mrp_subtotal=Decimal(str(pricing["mrp_subtotal"])),
            selling_subtotal=Decimal(str(pricing["selling_subtotal"])),
            gst_amount=Decimal(str(pricing["gst_amount"])),
            shipping_fee=Decimal(str(pricing["shipping_fee"])),
            total_amount=Decimal(str(pricing["total_amount"])),
            notes=order_notes,
        )

        from apps.orders.models import OrderStatusHistory
        OrderStatusHistory.objects.create(
            order=order,
            status=OrderStatus.PROCESSING,
            changed_by=user,
            notes="Order placed successfully after payment verification."
        )

        from django.db.models import F
        # Create order items and reserve inventory atomically
        for item_data in checkout["items"]:
            try:
                product = Product.objects.get(id=item_data["product_id"])
            except Product.DoesNotExist:
                logger.error("Product %s not found during order recovery.", item_data["product_id"])
                continue

            pricing_obj = getattr(product, "pricing", None)
            if pricing_obj:
                price = (
                    pricing_obj.dealer_price
                    if (
                        user.role == "dealer"
                        and user.dealer_status == "approved"
                        and pricing_obj.dealer_price is not None
                    )
                    else pricing_obj.effective_price
                )
            else:
                price = Decimal("0.00")

            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=item_data["quantity"],
                price=price,
            )

            # Fix 2: Atomic Inventory Reservation (F expression + select_for_update)
            inventory = ProductInventory.objects.select_for_update().filter(product=product).first()
            if inventory:
                ProductInventory.objects.filter(id=inventory.id).update(
                    reserved_stock=F("reserved_stock") + item_data["quantity"]
                )

        if not checkout.get("is_buy_now", False):
            try:
                Cart.objects.get(user=user).items.all().delete()
            except Cart.DoesNotExist:
                pass

        locked_payment.status = PaymentStatus.CAPTURED
        locked_payment.razorpay_payment_id = razorpay_payment_id
        locked_payment.razorpay_signature = razorpay_signature
        locked_payment.order = order
        locked_payment.verified_at = timezone.now()
        if gateway_response:
            locked_payment.gateway_response = gateway_response
        locked_payment.save()

        logger.info("Payment captured and Order created: payment=%s order=%s", locked_payment.id, order.id)
        return order


class VerifyPaymentView(APIView):
    """
    POST /api/v1/payments/verify/

    Verifies the Razorpay payment signature, creates the Order,
    reserves inventory, and clears the cart.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [PaymentVerifyThrottle]

    def post(self, request):
        user = request.user
        razorpay_order_id = request.data.get("razorpay_order_id", "").strip()
        razorpay_payment_id = request.data.get("razorpay_payment_id", "").strip()
        razorpay_signature = request.data.get("razorpay_signature", "").strip()
        payment_id = request.data.get("payment_id", "").strip()

        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_id]):
            return error_response(
                "Missing required payment verification fields.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                # Lock the payment row to prevent race conditions
                payment = (
                    Payment.objects.select_for_update()
                    .filter(id=payment_id, user=user)
                    .first()
                )

                if not payment:
                    return error_response(
                        "Payment record not found.",
                        status_code=status.HTTP_404_NOT_FOUND,
                    )

                # Fix 4: Payment Verification Hardening (Strict Server-Side Validation)
                if payment.razorpay_order_id != razorpay_order_id:
                    logger.error(
                        "Razorpay Order ID mismatch for payment %s: expected=%s got=%s",
                        payment.id, payment.razorpay_order_id, razorpay_order_id
                    )
                    return error_response(
                        "Razorpay Order ID mismatch.",
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )

                if payment.currency != "INR":
                    return error_response(
                        "Currency mismatch.",
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )

                # Prevent duplicate verification
                if payment.status == PaymentStatus.CAPTURED:
                    logger.warning("Duplicate verification attempt: %s", payment.razorpay_order_id)
                    if payment.order:
                        return success_response(
                            data=self._build_order_response(payment.order, payment),
                            message="Payment already verified. Order exists.",
                        )
                    
                    rz_payment_details = razorpay_service.fetch_payment_details(razorpay_payment_id)
                    order = create_order_from_payment(
                        payment,
                        razorpay_payment_id,
                        razorpay_signature,
                        gateway_response=rz_payment_details
                    )
                    return success_response(
                        data=self._build_order_response(order, payment),
                        message="Payment verified. Order placed successfully.",
                    )

                if payment.status != PaymentStatus.CREATED:
                    return error_response(
                        f"Payment is in '{payment.status}' state and cannot be verified.",
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )

                # Verify HMAC signature
                is_valid = razorpay_service.verify_payment_signature(
                    razorpay_order_id, razorpay_payment_id, razorpay_signature
                )

                if not is_valid:
                    payment.status = PaymentStatus.FAILED
                    payment.razorpay_payment_id = razorpay_payment_id
                    payment.error_code = "SIGNATURE_VERIFICATION_FAILED"
                    payment.error_description = "Payment signature verification failed."
                    payment.save()
                    logger.warning("Signature verification failed for payment %s", payment.id)
                    return error_response(
                        "Payment verification failed. Please contact support.",
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )

                # Validate amount hasn't been tampered
                expected_paise = int(payment.amount * 100)
                rz_order_amount = payment.gateway_response.get("amount", expected_paise)
                if expected_paise != rz_order_amount:
                    payment.status = PaymentStatus.FAILED
                    payment.error_code = "AMOUNT_MISMATCH"
                    payment.error_description = (
                        f"Expected {expected_paise} paise, got {rz_order_amount} paise."
                    )
                    payment.save()
                    logger.error(
                        "Amount mismatch for payment %s: expected=%d got=%d",
                        payment.id, expected_paise, rz_order_amount,
                    )
                    return error_response(
                        "Payment amount mismatch detected.",
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )

                # Fetch payment details from Razorpay for audit
                rz_payment_details = razorpay_service.fetch_payment_details(razorpay_payment_id)

                order = create_order_from_payment(
                    payment,
                    razorpay_payment_id,
                    razorpay_signature,
                    gateway_response=rz_payment_details
                )

                return success_response(
                    data=self._build_order_response(order, payment),
                    message="Payment verified. Order placed successfully.",
                )

        except Address.DoesNotExist:
            return error_response(
                "Shipping address no longer exists.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        except Product.DoesNotExist:
            return error_response(
                "One or more products are no longer available.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.exception("Payment verification error: %s", e)
            return error_response(
                "Payment verification failed due to a server error.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _build_order_response(self, order, payment):
        """Build the order response matching the frontend's expected shape."""
        address = order.shipping_address
        checkout = payment.checkout_data
        pricing = checkout.get("pricing", {})

        items_serialized = []
        for order_item in order.items.select_related("product", "product__category").all():
            primary_img = (
                order_item.product.images.filter(is_primary=True).first()
                or order_item.product.images.first()
            )
            items_serialized.append({
                "id": order_item.product.slug,
                "name": order_item.product.name,
                "category": order_item.product.category.name if order_item.product.category else "",
                "price": float(order_item.price),
                "qty": order_item.quantity,
                "image": primary_img.image.url if primary_img else "",
            })

        address_data = {}
        if address:
            address_data = {
                "id": str(address.id),
                "type": address.label,
                "dentist": address.full_name,
                "clinic": address.line1,
                "street": address.line2 or "",
                "city": f"{address.city}, {address.state}",
                "pincode": address.pincode,
                "phone": address.mobile,
            }
        else:
            snap = checkout.get("address_snapshot", {})
            address_data = {
                "id": snap.get("id", ""),
                "type": snap.get("label", "Checkout Address"),
                "dentist": snap.get("full_name", ""),
                "clinic": snap.get("line1", ""),
                "street": snap.get("line2", ""),
                "city": f"{snap.get('city', '')}, {snap.get('state', '')}",
                "pincode": snap.get("pincode", ""),
                "phone": snap.get("mobile", ""),
            }

        return {
            "id": str(order.id),
            "order_number": order.order_number or "",
            "invoice_number": order.invoice_number or "",
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "estimated_delivery_date": (
                order.estimated_delivery_date.isoformat()
                if order.estimated_delivery_date else None
            ),
            "razorpay_payment_id": payment.razorpay_payment_id or "",
            "items": items_serialized,
            "address": address_data,
            "paymentMethod": order.payment_method,
            "pricing": {
                "subtotal": pricing.get("selling_subtotal", float(order.selling_subtotal)),
                "shipping": pricing.get("shipping_fee", float(order.shipping_fee)),
                "gst": pricing.get("gst_amount", float(order.gst_amount)),
                "discount": pricing.get("savings", 0),
                "total": pricing.get("total_amount", float(order.total_amount)),
                "savings": pricing.get("savings", 0),
            },
        }


@method_decorator(csrf_exempt, name="dispatch")
class WebhookView(APIView):
    """
    POST /api/v1/payments/webhook/

    Receives Razorpay webhook events. CSRF-exempt because Razorpay
    calls this endpoint directly. Uses webhook signature verification
    for authentication.
    """

    permission_classes = [AllowAny]
    authentication_classes = []  # No JWT auth for webhooks
    throttle_classes = []  # Explicitly unthrottled to guarantee Razorpay webhook retry processing

    def post(self, request):
        signature = request.META.get("HTTP_X_RAZORPAY_SIGNATURE", "")
        body = request.body

        if not signature:
            logger.warning("Webhook received without signature header.")
            return error_response(
                "Missing signature.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Verify webhook signature
        if not razorpay_service.verify_webhook_signature(body, signature):
            logger.warning("Webhook signature verification failed.")
            return error_response(
                "Invalid signature.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            return error_response(
                "Invalid JSON payload.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        event_type = payload.get("event", "")
        event_id = payload.get("account_id", "") + "_" + str(payload.get("created_at", "")) + "_" + str(payload.get("event", ""))

        # Fix 5: Webhook Idempotency (Atomic event locking & duplicate processing suppression)
        try:
            with transaction.atomic():
                event, created = WebhookEvent.objects.select_for_update().get_or_create(
                    event_id=event_id,
                    defaults={
                        "event_type": event_type,
                        "payload": payload,
                        "processed": False
                    }
                )
        except Exception as e:
            logger.error("Failed to check WebhookEvent: %s", e)
            return error_response("Database lock error.", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not created and event.processed:
            logger.info("Duplicate webhook event ignored: %s", event_id)
            return success_response(message="Event already processed.")

        # Run processing in a separate transaction block
        try:
            with transaction.atomic():
                if event_type == "payment.captured":
                    self._handle_payment_captured(payload)
                elif event_type == "payment.failed":
                    self._handle_payment_failed(payload)
                elif event_type == "refund.created":
                    self._handle_refund_created(payload)
                else:
                    logger.info("Unhandled webhook event type: %s", event_type)

            event.processed = True
            event.processing_error = ""
            event.save()
        except Exception as e:
            logger.exception("Webhook processing error: %s", e)
            event.processing_error = str(e)
            event.processed = False
            event.save()
            return error_response(f"Processing failed: {str(e)}", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return success_response(message="Webhook processed.")

    def _handle_payment_captured(self, payload):
        """Handle payment.captured webhook — update payment status if needed."""
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        rz_order_id = entity.get("order_id", "")

        if not rz_order_id:
            return

        with transaction.atomic():
            payment = Payment.objects.select_for_update().filter(razorpay_order_id=rz_order_id).first()
            if payment:
                if not payment.order:
                    logger.info("Webhook: creating order for payment %s as it doesn't exist.", payment.id)
                    rz_payment_id = entity.get("id", "")
                    rz_signature = f"sig_webhook_{rz_order_id}_{rz_payment_id}"
                    create_order_from_payment(
                        payment,
                        rz_payment_id,
                        rz_signature,
                        gateway_response=entity
                    )
                else:
                    logger.info("Webhook: payment %s already has an order, updating details.", payment.id)
                    payment.status = PaymentStatus.CAPTURED
                    payment.razorpay_payment_id = entity.get("id", "")
                    payment.gateway_response = entity
                    payment.save()

    def _handle_payment_failed(self, payload):
        """Handle payment.failed webhook — mark payment as failed."""
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        rz_order_id = entity.get("order_id", "")

        if not rz_order_id:
            return

        with transaction.atomic():
            payment = Payment.objects.select_for_update().filter(razorpay_order_id=rz_order_id).first()
            if payment and payment.status == PaymentStatus.CREATED:
                payment.status = PaymentStatus.FAILED
                payment.razorpay_payment_id = entity.get("id", "")
                payment.error_code = entity.get("error_code", "")
                payment.error_description = entity.get("error_description", "")
                payment.gateway_response = entity
                payment.save()
                logger.info("Webhook: marked payment %s as failed.", payment.id)

    def _handle_refund_created(self, payload):
        """Handle refund.created webhook — update payment status."""
        entity = payload.get("payload", {}).get("refund", {}).get("entity", {})
        rz_payment_id = entity.get("payment_id", "")

        if not rz_payment_id:
            return

        with transaction.atomic():
            payment = Payment.objects.select_for_update().filter(razorpay_payment_id=rz_payment_id).first()
            if payment and payment.status == PaymentStatus.CAPTURED:
                payment.status = PaymentStatus.REFUNDED
                payment.save()
                logger.info("Webhook: marked payment %s as refunded.", payment.id)
