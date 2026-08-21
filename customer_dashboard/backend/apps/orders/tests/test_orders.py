from decimal import Decimal
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.inventory.models import ProductInventory
from apps.orders.models import Order, OrderItem, OrderStatus, OrderStatusHistory
from apps.products.models import Product
from apps.pricing.models import ProductPricing
from apps.users.models import Address
from apps.categories.models import Category
from apps.brands.models import Brand

User = get_user_model()

class OrderManagementTests(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Instruments", slug="instruments")
        self.brand = Brand.objects.create(name="NSK", slug="nsk")

        # Create standard customer
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="password123",
            full_name="Dr. Jane Doe",
            role="customer",
            is_active=True
        )

        # Create admin user
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="password123",
            full_name="Admin Director",
            role="admin",
            is_staff=True,
            is_superuser=True,
            is_active=True
        )

        # Address
        self.address = Address.objects.create(
            user=self.customer,
            label="Clinic Main",
            full_name="Dr. Jane Doe",
            mobile="9876543210",
            line1="12 Medical Center",
            city="Delhi",
            state="Delhi",
            pincode="110001",
            address_type="both"
        )

        # Product & Inventory
        self.product = Product.objects.create(
            name="Apex Locator",
            slug="apex-locator",
            category=self.category,
            brand=self.brand
        )
        self.pricing = ProductPricing.objects.create(
            product=self.product,
            mrp=Decimal("20000.00"),
            selling_price=Decimal("18000.00"),
            gst_percentage=Decimal("18.00")
        )
        self.inventory = ProductInventory.objects.create(
            product=self.product,
            current_stock=10,
            reserved_stock=2,
            allow_backorders=False
        )

        # Pre-create order
        self.order = Order.objects.create(
            user=self.customer,
            shipping_address=self.address,
            status=OrderStatus.PROCESSING,
            payment_method="razorpay",
            mrp_subtotal=Decimal("20000.00"),
            selling_subtotal=Decimal("18000.00"),
            gst_amount=Decimal("3240.00"),
            shipping_fee=Decimal("0.00"),
            total_amount=Decimal("21240.00")
        )
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2,
            price=Decimal("18000.00")
        )

    def test_customer_list_orders(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse('order-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0]['order_number'], self.order.order_number)

    def test_customer_retrieve_order_details(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse('order-detail', kwargs={'pk': str(self.order.id)})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['order_number'], self.order.order_number)
        self.assertEqual(response.data['data']['invoice_number'], self.order.invoice_number)

    def test_customer_cancel_order_success(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse('order-cancel', kwargs={'pk': str(self.order.id)})
        response = self.client.post(url, {"reason": "Ordered wrong size"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.CANCELLED)
        self.assertEqual(self.order.cancellation_reason, "Ordered wrong size")
        
        # Verify inventory release
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.reserved_stock, 0)
        
        # Verify status history logs
        self.assertEqual(OrderStatusHistory.objects.filter(order=self.order, status=OrderStatus.CANCELLED).count(), 1)

    def test_customer_cancel_shipped_fail(self):
        self.order.status = OrderStatus.SHIPPED
        self.order.save()

        self.client.force_authenticate(user=self.customer)
        url = reverse('order-cancel', kwargs={'pk': str(self.order.id)})
        response = self.client.post(url, {"reason": "Change of mind"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_list_and_stats(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-order-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('stats', response.data['meta'])
        self.assertEqual(response.data['meta']['stats']['total_orders'], 1)

    def test_admin_status_transition_rules(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-order-detail', kwargs={'pk': str(self.order.id)})
        
        # 1. Forward to Packed
        res1 = self.client.patch(url, {"status": OrderStatus.PACKED, "notes": "Calibrated & packed"}, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.PACKED)
        self.assertIsNotNone(self.order.packed_at)

        # 2. Reverse status fail (Cannot go back to processing)
        res2 = self.client.patch(url, {"status": OrderStatus.PROCESSING}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Forward to Shipped (should deduct current_stock and reserved_stock)
        res3 = self.client.patch(url, {
            "status": OrderStatus.SHIPPED,
            "tracking_number": "TRK12345",
            "shipping_carrier": "BlueDart"
        }, format='json')
        self.assertEqual(res3.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, OrderStatus.SHIPPED)
        self.assertEqual(self.order.tracking_number, "TRK12345")
        
        self.inventory.refresh_from_db()
        # Physical stock was 10, should be 8 now
        self.assertEqual(self.inventory.current_stock, 8)
        # Reserved stock was 2, should be 0 now
        self.assertEqual(self.inventory.reserved_stock, 0)
