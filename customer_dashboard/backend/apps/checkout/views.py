import uuid
from decimal import Decimal
from django.db import models
from django.db import transaction
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from apps.common.permissions import IsApprovedDealer
from apps.common.responses import success_response, error_response
from apps.products.models import Product
from apps.users.models import Address
from apps.cart.models import Cart
from apps.orders.models import Order, OrderItem, OrderStatus
from apps.inventory.models import ProductInventory

def is_valid_uuid(val):
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False

# Helper pricing calculator
def calculate_checkout_pricing(user, cart_items, delivery_method, address=None):
    from apps.common.tax_engine import calculate_order_tax_summary, determine_is_intra_state, get_warehouse_state

    mrp_subtotal = Decimal("0.00")
    line_items = []

    for item in cart_items:
        pricing = getattr(item.product, 'pricing', None)
        if pricing:
            mrp_subtotal += pricing.mrp * item.quantity
            price = pricing.dealer_price if (user.role == 'dealer' and user.dealer_status == 'approved' and pricing.dealer_price is not None) else pricing.effective_price
            gst_rate = pricing.gst_percentage
            hsn_code = getattr(pricing, 'hsn_code', '') or ''
            line_items.append({
                "inclusive_price": price,
                "gst_rate": gst_rate,
                "hsn_code": hsn_code,
                "quantity": item.quantity,
                "product": item.product
            })

    delivery_fee = {
        'standard': Decimal("0.00"),
        'express': Decimal("1500.00"),
        'install': Decimal("3500.00"),
    }.get(delivery_method, Decimal("0.00"))

    warehouse_state = get_warehouse_state()
    delivery_state = address.state if address else warehouse_state
    is_intra = determine_is_intra_state(warehouse_state, delivery_state)

    summary = calculate_order_tax_summary(
        line_items=line_items,
        shipping_fee=delivery_fee,
        is_intra_state=is_intra
    )

    savings = mrp_subtotal - summary["selling_subtotal"]

    return {
        "mrp_subtotal": float(summary["selling_subtotal"] + savings),
        "selling_subtotal": float(summary["selling_subtotal"]),
        "taxable_subtotal": float(summary["taxable_subtotal"]),
        "gst_amount": float(summary["total_gst"]),
        "shipping_fee": float(summary["shipping_fee"]),
        "total_amount": float(summary["total_amount"]),
        "savings": float(savings if savings > Decimal("0.00") else Decimal("0.00")),
        "is_intra_state": is_intra,
        "line_breakdowns": summary["line_breakdowns"],
    }

def _validate_address_and_serviceability(address, weight_kg=1.0):
    """
    Validates deliverability of the given address:
      1. Minimum field lengths (name, mobile, line1, city, state, pincode)
      2. Pincode and state consistency
      3. Authoritative Shiprocket serviceability check
    Returns error_response or None if valid.
    """
    if not address or not address.full_name or len(address.full_name.strip()) < 3:
        return error_response(
            "Shipping address is missing recipient name (min 3 characters).",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_ADDRESS_NAME",
        )

    from apps.common.validators import PHONE_REGEX
    clean_mobile = str(address.mobile).strip().replace(" ", "").replace("-", "")
    if not PHONE_REGEX.match(clean_mobile):
        return error_response(
            "Shipping address has an invalid mobile number (10 digits, starting with 6-9).",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_ADDRESS_PHONE",
        )

    if not address.line1 or len(address.line1.strip()) < 5:
        return error_response(
            "Shipping address line 1 is too short (min 5 characters required for delivery).",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_ADDRESS_LINE1",
        )

    if not address.city or len(address.city.strip()) < 2:
        return error_response(
            "Shipping address city is missing or invalid.",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_ADDRESS_CITY",
        )

    if not address.state or len(address.state.strip()) < 2:
        return error_response(
            "Shipping address state is missing or invalid.",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_ADDRESS_STATE",
        )

    from apps.common.postal_data import validate_pincode_state_match
    is_valid_pin, pin_err = validate_pincode_state_match(address.pincode, address.state)
    if not is_valid_pin:
        return error_response(
            pin_err,
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_PINCODE_STATE_MISMATCH",
        )

    from apps.shipping.pincode_service import PincodeServiceabilityEngine
    srv = PincodeServiceabilityEngine.check(destination_pincode=address.pincode, weight_kg=weight_kg)
    if not srv.get("is_serviceable", False):
        return error_response(
            srv.get("message", "Delivery is currently unavailable for this pincode."),
            status_code=status.HTTP_400_BAD_REQUEST,
            code="PINCODE_NOT_SERVICEABLE",
            details=srv,
        )

    return None


class CheckoutPreviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        address_id = request.data.get("address_id")
        delivery_method = request.data.get("delivery_method", "standard")

        if not address_id:
            return error_response("address_id is required.", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            address = Address.objects.get(pk=address_id, user=request.user)
        except (Address.DoesNotExist, ValueError):
            return error_response("Selected shipping address was not found.", status_code=status.HTTP_404_NOT_FOUND)

        # Pre-flight address completeness & Shiprocket serviceability gate
        addr_err = _validate_address_and_serviceability(address)
        if addr_err:
            return addr_err

        items_data = request.data.get("items")
        if items_data:
            cart_items = []
            for item in items_data:
                prod_id = item.get("product_id")
                qty = int(item.get("quantity", 1))
                if is_valid_uuid(prod_id):
                    product = Product.objects.filter(id=prod_id).first()
                else:
                    product = Product.objects.filter(slug=prod_id).first()
                if not product or product.is_deleted or product.status in ["archived", "discontinued"]:
                    return error_response(
                        f"Product '{prod_id}' is unavailable.",
                        status_code=status.HTTP_404_NOT_FOUND,
                        code="PRODUCT_UNAVAILABLE"
                    )
                
                class DummyItem:
                    def __init__(self, product, quantity):
                        self.product = product
                        self.quantity = quantity
                cart_items.append(DummyItem(product, qty))
        else:
            try:
                cart = Cart.objects.get(user=request.user)
                cart_items = list(cart.items.filter(is_saved_for_later=False).select_related('product', 'product__pricing', 'product__inventory').all())
            except Cart.DoesNotExist:
                cart_items = []

        if not cart_items:
            return error_response("Your checkout queue is empty.", status_code=status.HTTP_400_BAD_REQUEST)

        # Authoritative live inventory check
        from apps.inventory.services import validate_items_inventory
        is_valid, inv_err, _ = validate_items_inventory(cart_items, lock=False)
        if not is_valid and inv_err:
            return error_response(
                inv_err["message"],
                status_code=status.HTTP_400_BAD_REQUEST,
                code=inv_err.get("code", "INSUFFICIENT_STOCK"),
                details=inv_err.get("details")
            )

        pricing = calculate_checkout_pricing(request.user, cart_items, delivery_method, address)
        return success_response(data=pricing, message="Checkout pricing preview calculated.")

class CheckoutPlaceView(APIView):
    permission_classes = [IsAuthenticated, IsApprovedDealer]

    def post(self, request):
        address_id = request.data.get("address_id")
        delivery_method = request.data.get("delivery_method", "standard")
        payment_method = request.data.get("payment_method", "upi")
        gst_number = request.data.get("gst_number")

        if not address_id:
            return error_response("address_id is required.", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            address = Address.objects.get(pk=address_id, user=request.user)
        except (Address.DoesNotExist, ValueError):
            return error_response("Selected shipping address was not found.", status_code=status.HTTP_404_NOT_FOUND)

        # Pre-flight address completeness & Shiprocket serviceability gate
        addr_err = _validate_address_and_serviceability(address)
        if addr_err:
            return addr_err

        # Save clinic GST number if provided during checkout
        if gst_number and hasattr(request.user, 'profile'):
            profile = request.user.profile
            profile.gst_number = gst_number
            profile.save()

        items_data = request.data.get("items")
        is_buy_now = False
        if items_data:
            is_buy_now = True
            cart_items = []
            for item in items_data:
                prod_id = item.get("product_id")
                qty = int(item.get("quantity", 1))
                if is_valid_uuid(prod_id):
                    product = Product.objects.filter(id=prod_id).first()
                else:
                    product = Product.objects.filter(slug=prod_id).first()
                if not product or product.is_deleted or product.status in ["archived", "discontinued"]:
                    return error_response(
                        f"Product '{prod_id}' is unavailable.",
                        status_code=status.HTTP_404_NOT_FOUND,
                        code="PRODUCT_UNAVAILABLE"
                    )
                
                class DummyItem:
                    def __init__(self, product, quantity):
                        self.product = product
                        self.quantity = quantity
                cart_items.append(DummyItem(product, qty))
        else:
            try:
                cart = Cart.objects.get(user=request.user)
                cart_items = list(cart.items.filter(is_saved_for_later=False).select_related('product', 'product__pricing', 'product__inventory').all())
            except Cart.DoesNotExist:
                cart_items = []

        if not cart_items:
            return error_response("Your checkout queue is empty.", status_code=status.HTTP_400_BAD_REQUEST)

        pricing = calculate_checkout_pricing(request.user, cart_items, delivery_method, address)

        # Atomically lock inventory rows, validate stock, place order, and reserve stock
        from apps.inventory.services import validate_items_inventory, reserve_items_stock
        from django.db import OperationalError
        import time

        max_retries = 5
        for attempt in range(max_retries):
            try:
                with transaction.atomic():
                    # Step 1: Lock inventory rows in deterministic order and re-verify live stock
                    is_valid, inv_err, inventory_map = validate_items_inventory(cart_items, lock=True)
                    if not is_valid and inv_err:
                        return error_response(
                            inv_err["message"],
                            status_code=status.HTTP_400_BAD_REQUEST,
                            code=inv_err.get("code", "INSUFFICIENT_STOCK"),
                            details=inv_err.get("details")
                        )

                    # Step 2: Create Order
                    order = Order.objects.create(
                        user=request.user,
                        shipping_address=address,
                        shipping_full_name=address.full_name,
                        shipping_mobile=address.mobile,
                        shipping_line1=address.line1,
                        shipping_line2=address.line2 or "",
                        shipping_city=address.city,
                        shipping_state=address.state,
                        shipping_pincode=address.pincode,
                        shipping_country="India",
                        shipping_address_snapshot={
                            "full_name": address.full_name,
                            "mobile": address.mobile,
                            "line1": address.line1,
                            "line2": address.line2 or "",
                            "city": address.city,
                            "state": address.state,
                            "pincode": address.pincode,
                            "country": "India",
                            "label": address.label,
                        },
                        status=OrderStatus.PROCESSING,
                        payment_method=payment_method,
                        mrp_subtotal=Decimal(str(pricing["mrp_subtotal"])),
                        selling_subtotal=Decimal(str(pricing["selling_subtotal"])),
                        taxable_subtotal=Decimal(str(pricing["taxable_subtotal"])),
                        gst_amount=Decimal(str(pricing["gst_amount"])),
                        shipping_fee=Decimal(str(pricing["shipping_fee"])),
                        total_amount=Decimal(str(pricing["total_amount"]))
                    )

                    # Step 3: Record Status History
                    from apps.orders.models import OrderStatusHistory
                    OrderStatusHistory.objects.create(
                        order=order,
                        status=OrderStatus.PROCESSING,
                        changed_by=request.user,
                        notes=f"Order placed via {payment_method}."
                    )

                    # Step 4: Create Order Items
                    line_breakdowns = pricing["line_breakdowns"]
                    for idx, item in enumerate(cart_items):
                        pricing_obj = getattr(item.product, 'pricing', None)
                        breakdown = line_breakdowns[idx]
                        hsn = getattr(pricing_obj, 'hsn_code', '') or ''

                        OrderItem.objects.create(
                            order=order,
                            product=item.product,
                            quantity=item.quantity,
                            price=breakdown["unit_price_inclusive"],
                            gst_rate=breakdown["gst_rate"],
                            hsn_code=hsn,
                            taxable_value_per_unit=breakdown["taxable_value_per_unit"],
                            taxable_subtotal=breakdown["taxable_subtotal"],
                            cgst_amount=breakdown["cgst_amount"],
                            sgst_amount=breakdown["sgst_amount"],
                            igst_amount=breakdown["igst_amount"],
                            total_gst_amount=breakdown["total_gst_amount"],
                            is_intra_state=breakdown["is_intra_state"],
                        )

                    # Step 5: Atomically Reserve Inventory Stock
                    reserve_items_stock(cart_items, inventory_map)

                    # Step 6: Clear cart if not buy_now
                    if not is_buy_now:
                        Cart.objects.get(user=request.user).items.filter(is_saved_for_later=False).delete()

                    # Step 7: Dispatch post-order-success notification after DB commit
                    from apps.orders.tasks import dispatch_order_success_notification
                    order_id_str = str(order.id)
                    transaction.on_commit(
                        lambda: dispatch_order_success_notification(order_id_str)
                    )

                    # Build response matching frontend orderData expectations
                    items_serialized = []
                    for order_item in order.items.all():
                        primary_img = order_item.product.images.filter(is_primary=True).first() or order_item.product.images.first()
                        items_serialized.append({
                            "id": order_item.product.slug,
                            "name": order_item.product.name,
                            "category": order_item.product.category.name if order_item.product.category else "",
                            "price": float(order_item.price),
                            "qty": order_item.quantity,
                            "image": primary_img.image.url if primary_img else ""
                        })

                    response_data = {
                        "id": str(order.id),
                        "items": items_serialized,
                        "address": {
                            "id": str(address.id),
                            "type": address.label,
                            "dentist": address.full_name,
                            "clinic": address.line1,
                            "street": address.line2,
                            "city": f"{address.city}, {address.state}",
                            "pincode": address.pincode,
                            "phone": address.mobile
                        },
                        "paymentMethod": order.payment_method,
                        "pricing": {
                            "subtotal": pricing["selling_subtotal"],
                            "shipping": pricing["shipping_fee"],
                            "gst": pricing["gst_amount"],
                            "discount": pricing["savings"],
                            "total": pricing["total_amount"],
                            "savings": pricing["savings"]
                        }
                    }

                    return success_response(data=response_data, message="Order placed successfully.")
            except OperationalError as oe:
                if "locked" in str(oe).lower() and attempt < max_retries - 1:
                    time.sleep(0.05 * (attempt + 1))
                    continue
                return error_response(f"Order placement failed due to lock contention: {str(oe)}", status_code=status.HTTP_409_CONFLICT)
            except Exception as e:
                return error_response(f"Order placement failed: {str(e)}", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
