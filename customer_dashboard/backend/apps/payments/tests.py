from decimal import Decimal
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.cart.models import Cart, CartItem
from apps.inventory.models import ProductInventory
from apps.orders.models import Order, OrderItem
from apps.payments.models import Payment, PaymentStatus
from apps.products.models import Product
from apps.pricing.models import ProductPricing
from apps.users.models import Address
from apps.categories.models import Category
from apps.brands.models import Brand

User = get_user_model()

class PaymentModuleTests(APITestCase):
    def setUp(self):
        # Create standard test category & brand
        self.category = Category.objects.create(name="Instruments", slug="instruments")
        self.brand = Brand.objects.create(name="NSK", slug="nsk")

        # Create user
        self.user = User.objects.create_user(
            email="doctor@example.com",
            password="testpassword123",
            full_name="Dr. Test User",
            role="customer",
            is_active=True
        )
        self.client.force_authenticate(user=self.user)

        # Create address
        self.address = Address.objects.create(
            user=self.user,
            label="Home",
            full_name="Dr. Test User",
            mobile="9876543210",
            line1="123 Clinic Row",
            city="Mumbai",
            state="Maharashtra",
            pincode="400001",
            address_type="both"
        )

        # Create product with pricing and inventory
        self.product = Product.objects.create(
            name="Curing Light",
            slug="woodpecker-curing-light",
            category=self.category,
            brand=self.brand
        )
        self.pricing = ProductPricing.objects.create(
            product=self.product,
            mrp=Decimal("15000.00"),
            selling_price=Decimal("12000.00"),
            gst_percentage=Decimal("18.00")
        )
        self.inventory = ProductInventory.objects.create(
            product=self.product,
            current_stock=10,
            reserved_stock=0,
            allow_backorders=False
        )

        # Create cart and add product
        self.cart = Cart.objects.create(user=self.user)
        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=2
        )

    def test_create_payment_order_success(self):
        url = reverse('payment-create-order')
        data = {
            "address_id": str(self.address.id),
            "delivery_method": "standard",
            "payment_method": "razorpay"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('razorpay_order_id', response.data['data'])
        self.assertIn('payment_id', response.data['data'])

        # Verify payment record is created in db
        payment = Payment.objects.get(id=response.data['data']['payment_id'])
        self.assertEqual(payment.status, PaymentStatus.CREATED)
        self.assertEqual(payment.amount, Decimal("24000.00")) # GST inclusive customer total = 24000.00

    def test_verify_payment_signature_and_creation(self):
        # First, create payment order
        url_create = reverse('payment-create-order')
        data_create = {
            "address_id": str(self.address.id),
            "delivery_method": "standard",
            "payment_method": "razorpay"
        }
        res_create = self.client.post(url_create, data_create, format='json')
        payment_id = res_create.data['data']['payment_id']
        rz_order_id = res_create.data['data']['razorpay_order_id']

        # Now, verify signature
        import hmac
        import hashlib
        from django.conf import settings
        
        message = f"{rz_order_id}|pay_mock_12345"
        key_secret = settings.RAZORPAY_KEY_SECRET
        if key_secret and "REPLACE" not in key_secret:
            rz_signature = hmac.new(
                key_secret.encode("utf-8"),
                message.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
        else:
            rz_signature = f"sig_mock_{rz_order_id}_pay_mock_12345"

        url_verify = reverse('payment-verify')
        data_verify = {
            "razorpay_order_id": rz_order_id,
            "razorpay_payment_id": "pay_mock_12345",
            "razorpay_signature": rz_signature,
            "payment_id": payment_id
        }
        response = self.client.post(url_verify, data_verify, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])

        # Verify database assertions:
        # 1. Order is created
        order_id = response.data['data']['id']
        order = Order.objects.get(id=order_id)
        self.assertEqual(order.user, self.user)
        self.assertEqual(order.total_amount, Decimal("24000.00"))

        # 2. Cart is cleared
        self.assertEqual(CartItem.objects.filter(cart=self.cart).count(), 0)

        # 3. Inventory reserved stock is updated
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.reserved_stock, 2)

        # 4. Payment status is CAPTURED
        payment = Payment.objects.get(id=payment_id)
        self.assertEqual(payment.status, PaymentStatus.CAPTURED)
        self.assertEqual(payment.order, order)

    def test_verify_payment_duplicate_prevention(self):
        # Create payment order
        url_create = reverse('payment-create-order')
        data_create = {
            "address_id": str(self.address.id),
            "delivery_method": "standard",
            "payment_method": "razorpay"
        }
        res_create = self.client.post(url_create, data_create, format='json')
        payment_id = res_create.data['data']['payment_id']
        rz_order_id = res_create.data['data']['razorpay_order_id']

        # Verify payment signature first time
        import hmac
        import hashlib
        from django.conf import settings
        
        message = f"{rz_order_id}|pay_mock_12345"
        key_secret = settings.RAZORPAY_KEY_SECRET
        if key_secret and "REPLACE" not in key_secret:
            rz_signature = hmac.new(
                key_secret.encode("utf-8"),
                message.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
        else:
            rz_signature = f"sig_mock_{rz_order_id}_pay_mock_12345"

        url_verify = reverse('payment-verify')
        data_verify = {
            "razorpay_order_id": rz_order_id,
            "razorpay_payment_id": "pay_mock_12345",
            "razorpay_signature": rz_signature,
            "payment_id": payment_id
        }
        res1 = self.client.post(url_verify, data_verify, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Verify payment signature second time (simulate duplicate click/network retry)
        res2 = self.client.post(url_verify, data_verify, format='json')
        # Return success or ignore to avoid duplicating order
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        # Verify no duplicate orders created (total orders for user is 1)
        self.assertEqual(Order.objects.filter(user=self.user).count(), 1)

    def test_webhook_payment_captured_success(self):
        # Create payment order
        url_create = reverse('payment-create-order')
        data_create = {
            "address_id": str(self.address.id),
            "delivery_method": "standard",
            "payment_method": "razorpay"
        }
        res_create = self.client.post(url_create, data_create, format='json')
        payment_id = res_create.data['data']['payment_id']
        rz_order_id = res_create.data['data']['razorpay_order_id']

        # Call Webhook
        url_webhook = reverse('payment-webhook')
        payload = {
            "event": "payment.captured",
            "account_id": "acc_12345",
            "created_at": 1784365700,
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_mock_webhook123",
                        "order_id": rz_order_id,
                        "amount": 2832000,
                        "currency": "INR",
                        "status": "captured",
                        "method": "card"
                    }
                }
            }
        }
        
        # Calculate signature if in real mode, else use mock pattern
        import json
        import hmac
        import hashlib
        from django.conf import settings
        
        body_bytes = json.dumps(payload).encode('utf-8')
        webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
        if webhook_secret and "REPLACE" not in webhook_secret:
            sig = hmac.new(
                webhook_secret.encode("utf-8"),
                body_bytes,
                hashlib.sha256
            ).hexdigest()
        else:
            sig = "mock_webhook_sig"

        # Make request with raw JSON body to ensure exact body matching
        self.client.credentials(HTTP_X_RAZORPAY_SIGNATURE=sig)
        response = self.client.post(
            url_webhook, 
            data=json.dumps(payload), 
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check order is created by webhook asynchronously
        payment = Payment.objects.get(id=payment_id)
        self.assertEqual(payment.status, PaymentStatus.CAPTURED)
        self.assertIsNotNone(payment.order)
        self.assertEqual(payment.order.total_amount, Decimal("24000.00"))

    def test_verify_payment_signature_failure_rollback(self):
        # Create payment order
        url_create = reverse('payment-create-order')
        data_create = {
            "address_id": str(self.address.id),
            "delivery_method": "standard",
            "payment_method": "razorpay"
        }
        res_create = self.client.post(url_create, data_create, format='json')
        payment_id = res_create.data['data']['payment_id']
        rz_order_id = res_create.data['data']['razorpay_order_id']

        # Call verify with invalid signature
        url_verify = reverse('payment-verify')
        data_verify = {
            "razorpay_order_id": rz_order_id,
            "razorpay_payment_id": "pay_mock_12345",
            "razorpay_signature": "invalid_signature_hash_here",
            "payment_id": payment_id
        }
        response = self.client.post(url_verify, data_verify, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Database assertions to verify full transaction rollback:
        # 1. Payment status is failed
        payment = Payment.objects.get(id=payment_id)
        self.assertEqual(payment.status, PaymentStatus.FAILED)
        self.assertIsNone(payment.order)

        # 2. Cart is NOT cleared (rolled back)
        self.assertEqual(CartItem.objects.filter(cart=self.cart).count(), 1)

        # 3. Inventory reserved stock is NOT updated (rolled back)
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.reserved_stock, 0)

        # 4. No order exists
        self.assertEqual(Order.objects.filter(user=self.user).count(), 0)

    def test_verify_payment_amount_mismatch(self):
        # Create payment order
        url_create = reverse('payment-create-order')
        data_create = {
            "address_id": str(self.address.id),
            "delivery_method": "standard",
            "payment_method": "razorpay"
        }
        res_create = self.client.post(url_create, data_create, format='json')
        payment_id = res_create.data['data']['payment_id']
        rz_order_id = res_create.data['data']['razorpay_order_id']

        # Force edit gateway response amount inside database to simulate tampering
        payment = Payment.objects.get(id=payment_id)
        payment.gateway_response["amount"] = 9999999 # tampered amount
        payment.save()

        # Generate valid signature for order/payment
        import hmac
        import hashlib
        from django.conf import settings
        message = f"{rz_order_id}|pay_mock_12345"
        key_secret = settings.RAZORPAY_KEY_SECRET
        if key_secret and "REPLACE" not in key_secret:
            rz_signature = hmac.new(
                key_secret.encode("utf-8"),
                message.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
        else:
            rz_signature = f"sig_mock_{rz_order_id}_pay_mock_12345"

        url_verify = reverse('payment-verify')
        data_verify = {
            "razorpay_order_id": rz_order_id,
            "razorpay_payment_id": "pay_mock_12345",
            "razorpay_signature": rz_signature,
            "payment_id": payment_id
        }
        response = self.client.post(url_verify, data_verify, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Assert payment marked failed with AMOUNT_MISMATCH
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.FAILED)
        self.assertEqual(payment.error_code, "AMOUNT_MISMATCH")
        self.assertIsNone(payment.order)

    def test_webhook_duplicate_event_prevention(self):
        # Create payment order
        url_create = reverse('payment-create-order')
        data_create = {
            "address_id": str(self.address.id),
            "delivery_method": "standard",
            "payment_method": "razorpay"
        }
        res_create = self.client.post(url_create, data_create, format='json')
        rz_order_id = res_create.data['data']['razorpay_order_id']

        # Payload
        url_webhook = reverse('payment-webhook')
        payload = {
            "event": "payment.captured",
            "account_id": "acc_12345",
            "created_at": 1784365700,
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_mock_webhook_dup",
                        "order_id": rz_order_id,
                        "amount": 2832000,
                        "currency": "INR",
                        "status": "captured",
                        "method": "card"
                    }
                }
            }
        }

        # Calculate signature if in real mode
        import json
        import hmac
        import hashlib
        from django.conf import settings
        
        body_bytes = json.dumps(payload).encode('utf-8')
        webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
        if webhook_secret and "REPLACE" not in webhook_secret:
            sig = hmac.new(
                webhook_secret.encode("utf-8"),
                body_bytes,
                hashlib.sha256
            ).hexdigest()
        else:
            sig = "mock_webhook_sig"

        # Make request 1
        self.client.credentials(HTTP_X_RAZORPAY_SIGNATURE=sig)
        res1 = self.client.post(
            url_webhook, 
            data=json.dumps(payload), 
            content_type='application/json'
        )
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Make duplicate request 2
        res2 = self.client.post(
            url_webhook, 
            data=json.dumps(payload), 
            content_type='application/json'
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['message'], "Event already processed.")

    def test_payment_order_unserviceable_pincode_blocked(self):
        from unittest.mock import patch
        from django.test import override_settings
        with override_settings(SHIPPING_PROVIDER="shiprocket"):
            with patch("apps.shipping.pincode_service.PincodeServiceabilityEngine.check") as mock_check:
                mock_check.return_value = {
                    "is_serviceable": False,
                    "destination_pincode": "400001",
                    "message": "Delivery is currently unavailable for PIN code 400001.",
                    "available_couriers": [],
                }
                url = reverse("payment-create-order")
                payload = {
                    "address_id": str(self.address.id),
                    "items": [{"product_id": str(self.product.id), "quantity": 1}],
                }
                res = self.client.post(url, payload, format="json")
                self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(res.data["error"]["code"], "PINCODE_NOT_SERVICEABLE")

    def test_payment_verification_populates_immutable_order_snapshot(self):
        from django.test import override_settings
        from django.conf import settings
        import hmac
        import hashlib
        with override_settings(SHIPPING_PROVIDER="offline"):
            url_create = reverse("payment-create-order")
            payload_create = {
                "address_id": str(self.address.id),
                "items": [{"product_id": str(self.product.id), "quantity": 1}],
            }
            res_create = self.client.post(url_create, payload_create, format="json")
            self.assertEqual(res_create.status_code, status.HTTP_200_OK)
            razorpay_order_id = res_create.data["data"]["razorpay_order_id"]
            payment_id = res_create.data["data"]["payment_id"]

            key_secret = settings.RAZORPAY_KEY_SECRET
            if key_secret and "REPLACE" not in key_secret:
                rz_signature = hmac.new(
                    key_secret.encode("utf-8"),
                    f"{razorpay_order_id}|pay_mock_12345".encode("utf-8"),
                    hashlib.sha256
                ).hexdigest()
            else:
                rz_signature = f"sig_mock_{razorpay_order_id}_pay_mock_12345"

            url_verify = reverse("payment-verify")
            payload_verify = {
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": "pay_mock_12345",
                "razorpay_signature": rz_signature,
                "payment_id": payment_id,
            }
            res_verify = self.client.post(url_verify, payload_verify, format="json")
            self.assertEqual(res_verify.status_code, status.HTTP_200_OK)

            order_id = res_verify.data["data"]["id"]
            order = Order.objects.get(id=order_id)
            self.assertEqual(order.shipping_full_name, "Dr. Test User")
            self.assertEqual(order.shipping_line1, "123 Clinic Row")
            self.assertEqual(order.shipping_city, "Mumbai")
            self.assertEqual(order.shipping_state, "Maharashtra")
            self.assertEqual(order.shipping_pincode, "400001")
            self.assertEqual(order.shipping_country, "India")
