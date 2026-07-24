import datetime
from decimal import Decimal
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from apps.products.models import Product, ProductWarrantyProvider
from apps.brands.models import Brand
from apps.categories.models import Category
from apps.orders.models import Order, OrderItem, OrderStatus
from apps.users.models import Address
from apps.warranty.models import (
    WarrantyRegistration,
    WarrantyRegistrationStatus,
    WarrantyClaim,
    ClaimStatus,
    ClaimPriority
)

User = get_user_model()

class WarrantyModuleTests(APITestCase):

    def setUp(self):
        # Create user accounts
        self.customer = User.objects.create_user(
            email="doctor@example.com",
            password="password123",
            full_name="Dr. Jane Doe",
            role="customer"
        )
        self.admin = User.objects.create_superuser(
            email="admin@faazo.com",
            password="password123",
            full_name="Admin Chief",
            role="admin"
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

        # Create base structures
        self.brand = Brand.objects.create(name="FAAZO Labs", slug="faazo-labs", warranty_months_default=12)
        self.imported_brand = Brand.objects.create(name="Imported Brand", slug="imported-brand", warranty_months_default=24)
        self.category = Category.objects.create(name="Handpieces", slug="handpieces")

        # Create Products
        self.faazo_product = Product.objects.create(
            name="FAAZO Turbine X",
            slug="faazo-turbine-x",
            sku="FZ-TURB-X",
            brand=self.brand,
            category=self.category,
            warranty_provider=ProductWarrantyProvider.FAAZO,
            warranty_months=12,
            serial_number_required=True
        )

        self.imported_product = Product.objects.create(
            name="Imported Scaler Y",
            slug="imported-scaler-y",
            sku="IMP-SCAL-Y",
            brand=self.imported_brand,
            category=self.category,
            warranty_provider=ProductWarrantyProvider.MANUFACTURER,
            warranty_months=24,
            serial_number_required=False,
            warranty_website_url="https://manufacturer-wty.com/register"
        )

        # Create Order
        self.order = Order.objects.create(
            user=self.customer,
            shipping_address=self.address,
            order_number="ORD-2026-0001",
            status=OrderStatus.PROCESSING,
            payment_method="razorpay",
            mrp_subtotal=Decimal("5000.00"),
            selling_subtotal=Decimal("5000.00"),
            gst_amount=Decimal("900.00"),
            shipping_fee=Decimal("0.00"),
            total_amount=Decimal("5900.00")
        )
        self.item_faazo = OrderItem.objects.create(
            order=self.order,
            product=self.faazo_product,
            quantity=1,
            price=Decimal("3000.00")
        )
        self.item_imported = OrderItem.objects.create(
            order=self.order,
            product=self.imported_product,
            quantity=1,
            price=Decimal("2000.00")
        )

    def test_warranty_automatic_creation_on_delivery(self):
        """Test that only FAAZO products create pending_registration records on order delivery."""
        # Check initial registrations count
        self.assertEqual(WarrantyRegistration.objects.count(), 0)

        # Update order status to DELIVERED
        self.order.status = OrderStatus.DELIVERED
        self.order.save()

        from apps.warranty.services import create_warranty_registrations
        create_warranty_registrations(self.order)

        # Verify only FAAZO product generated a registration
        self.assertEqual(WarrantyRegistration.objects.count(), 1)
        reg = WarrantyRegistration.objects.first()
        self.assertEqual(reg.product, self.faazo_product)
        self.assertEqual(reg.warranty_status, WarrantyRegistrationStatus.PENDING_REGISTRATION)
        self.assertIsNone(reg.serial_number)

    def test_customer_manual_registration_submission(self):
        """Test manual registration submission flow for FAAZO products."""
        # Deliver order to create registration record
        self.order.status = OrderStatus.DELIVERED
        self.order.save()
        from apps.warranty.services import create_warranty_registrations
        create_warranty_registrations(self.order)
        reg = WarrantyRegistration.objects.first()

        self.client.force_authenticate(user=self.customer)
        url = reverse("warranty-registration-submit", kwargs={"pk": reg.id})

        # Submit without invoice -> should fail
        response = self.client.patch(url, {"serial_number": "SN-FZ-123"}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invoice file is required", response.data["error"]["message"])

        # Submit without serial number (required for this product) -> should fail
        invoice = SimpleUploadedFile("invoice.pdf", b"pdf content", content_type="application/pdf")
        response = self.client.patch(url, {"invoice": invoice}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("serial number is required", response.data["error"]["message"])

        # Submit valid details
        invoice.seek(0)
        response = self.client.patch(
            url,
            {"invoice": invoice, "serial_number": "SN-FZ-123", "notes": "Registered clinics handpiece"},
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify status shifted to pending_verification
        reg.refresh_from_db()
        self.assertEqual(reg.warranty_status, WarrantyRegistrationStatus.PENDING_VERIFICATION)
        self.assertEqual(reg.serial_number, "SN-FZ-123")
        self.assertEqual(reg.notes, "Registered clinics handpiece")

    def test_imported_products_gated_and_listed(self):
        """Test that imported products are listed via endpoints but do not generate registrations."""
        self.order.status = OrderStatus.DELIVERED
        self.order.save()
        from apps.warranty.services import create_warranty_registrations
        create_warranty_registrations(self.order)

        self.client.force_authenticate(user=self.customer)
        url = reverse("warranty-imported-products-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify response contains the imported product
        data = response.data["data"]
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["sku"], "IMP-SCAL-Y")
        self.assertEqual(data[0]["warranty_website_url"], "https://manufacturer-wty.com/register")

    def test_admin_registration_review_flow(self):
        """Test that admins can approve, reject, or request information on registrations."""
        self.order.status = OrderStatus.DELIVERED
        self.order.save()
        from apps.warranty.services import create_warranty_registrations
        create_warranty_registrations(self.order)
        reg = WarrantyRegistration.objects.first()

        self.client.force_authenticate(user=self.admin)
        url = reverse("warranty-admin-registration-action", kwargs={"pk": reg.id})

        # Request more info
        response = self.client.post(url, {"action": "request_info", "notes": "Invoice blurry"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reg.refresh_from_db()
        self.assertEqual(reg.warranty_status, WarrantyRegistrationStatus.NEED_MORE_INFO)
        self.assertIn("Invoice blurry", reg.admin_notes)

        # Approve registration
        # Since approving transitions status to ACTIVE, we must have invoice and serial_number!
        reg.invoice = SimpleUploadedFile("invoice.pdf", b"pdf content", content_type="application/pdf")
        reg.serial_number = "SN-FZ-123"
        reg.save()
        
        response = self.client.post(url, {"action": "approve", "notes": "Approved and activated"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reg.refresh_from_db()
        self.assertEqual(reg.warranty_status, WarrantyRegistrationStatus.ACTIVE)

    def test_claim_submission_gating_rules(self):
        """Test that claims cannot be raised until the registration status is Active."""
        self.order.status = OrderStatus.DELIVERED
        self.order.save()
        from apps.warranty.services import create_warranty_registrations
        create_warranty_registrations(self.order)
        reg = WarrantyRegistration.objects.first()

        self.client.force_authenticate(user=self.customer)
        url = reverse("warranty-claim-list")

        # Try to raise claim when status is pending_registration -> should fail
        response = self.client.post(url, {"registration": reg.id, "description": "Device failing to rotate"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Warranty must be approved before raising a claim", str(response.data["error"]["details"]))

        # Change status to Active
        reg.invoice = SimpleUploadedFile("invoice.pdf", b"pdf content", content_type="application/pdf")
        reg.serial_number = "SN-FZ-123"
        reg.warranty_status = WarrantyRegistrationStatus.ACTIVE
        reg.save()

        # Try again -> should succeed
        response = self.client.post(url, {"registration": reg.id, "description": "Device failing to rotate"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(WarrantyClaim.objects.count(), 1)

    def test_duplicate_registration_prevention(self):
        """Test that user cannot register a warranty twice if already active or pending verification."""
        self.order.status = OrderStatus.DELIVERED
        self.order.save()
        from apps.warranty.services import create_warranty_registrations
        create_warranty_registrations(self.order)
        reg = WarrantyRegistration.objects.first()

        self.client.force_authenticate(user=self.customer)
        url = reverse("warranty-registration-submit", kwargs={"pk": reg.id})

        # Submit first time -> transitions to pending_verification
        invoice = SimpleUploadedFile("invoice.pdf", b"pdf content", content_type="application/pdf")
        response = self.client.patch(url, {"invoice": invoice, "serial_number": "SN-X1"}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Try submitting a second time -> should fail with specific duplicate error
        invoice.seek(0)
        response = self.client.patch(url, {"invoice": invoice, "serial_number": "SN-X2"}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["message"], "Warranty registration has already been submitted.")

    def test_duplicate_claim_prevention(self):
        """Test that user cannot file multiple active claims for the same registration."""
        self.order.status = OrderStatus.DELIVERED
        self.order.save()
        from apps.warranty.services import create_warranty_registrations
        create_warranty_registrations(self.order)
        reg = WarrantyRegistration.objects.first()
        
        reg.invoice = SimpleUploadedFile("invoice.pdf", b"pdf content", content_type="application/pdf")
        reg.serial_number = "SN-FZ-123"
        reg.warranty_status = WarrantyRegistrationStatus.ACTIVE
        reg.save()

        self.client.force_authenticate(user=self.customer)
        url = reverse("warranty-claim-list")

        # Raise first claim
        response = self.client.post(url, {"registration": reg.id, "description": "Broken turbine"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        first_claim = WarrantyClaim.objects.first()

        # Try to raise second claim while first is active -> should fail
        response = self.client.post(url, {"registration": reg.id, "description": "Broken turbine again"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("An active warranty claim already exists.", str(response.data["error"]["details"]))

        # Now reject/close the first claim
        first_claim.status = ClaimStatus.CLOSED
        first_claim.save()

        # Try raising second claim again -> should succeed
        response = self.client.post(url, {"registration": reg.id, "description": "Broken turbine again"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(WarrantyClaim.objects.count(), 2)

    def test_permission_isolation(self):
        """Test that Customer A cannot view or claim for Customer B's warranty registrations."""
        self.order.status = OrderStatus.DELIVERED
        self.order.save()
        from apps.warranty.services import create_warranty_registrations
        create_warranty_registrations(self.order)
        reg = WarrantyRegistration.objects.first()

        # Create another customer
        other_customer = User.objects.create_user(
            email="other_doc@example.com",
            password="password123",
            full_name="Dr. Other",
            role="customer"
        )

        self.client.force_authenticate(user=other_customer)
        
        # Try to view reg details of Jane Doe
        url_detail = reverse("warranty-registration-detail", kwargs={"pk": reg.id})
        response = self.client.get(url_detail)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Try to raise claim for Jane Doe's registration
        url_claim = reverse("warranty-claim-list")
        response = self.client.post(url_claim, {"registration": reg.id, "description": "Attempted hijack"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_file_size_and_type_validation(self):
        """Test backend validation constraints for files (size and extensions)."""
        self.order.status = OrderStatus.DELIVERED
        self.order.save()
        from apps.warranty.services import create_warranty_registrations
        create_warranty_registrations(self.order)
        reg = WarrantyRegistration.objects.first()

        self.client.force_authenticate(user=self.customer)
        url = reverse("warranty-registration-submit", kwargs={"pk": reg.id})

        # Unsupported extension (e.g. .exe) -> should fail
        bad_file = SimpleUploadedFile("malicious.exe", b"binary content", content_type="application/octet-stream")
        response = self.client.patch(url, {"invoice": bad_file, "serial_number": "SN-X1"}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Unsupported invoice file extension", str(response.data["error"]["message"]))

        # Exceeding 5MB limit for invoice -> should fail
        large_file = SimpleUploadedFile("huge.pdf", b"a" * (6 * 1024 * 1024), content_type="application/pdf")
        response = self.client.patch(url, {"invoice": large_file, "serial_number": "SN-X1"}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invoice file size exceeds 5MB limit", str(response.data["error"]["message"]))

    def test_warranty_expiry_gating(self):
        """Test that claims are blocked if the warranty has expired (by date)."""
        self.order.status = OrderStatus.DELIVERED
        self.order.save()
        from apps.warranty.services import create_warranty_registrations
        create_warranty_registrations(self.order)
        reg = WarrantyRegistration.objects.first()
        
        # Set warranty end date in the past
        reg.invoice = SimpleUploadedFile("invoice.pdf", b"pdf content", content_type="application/pdf")
        reg.serial_number = "SN-FZ-123"
        reg.warranty_end = datetime.date.today() - datetime.timedelta(days=1)
        reg.warranty_status = WarrantyRegistrationStatus.ACTIVE
        reg.save()

        # Accessing list triggers bulk auto-expiry update
        self.client.force_authenticate(user=self.customer)
        url_list = reverse("warranty-registration-list")
        self.client.get(url_list)

        reg.refresh_from_db()
        self.assertEqual(reg.warranty_status, WarrantyRegistrationStatus.EXPIRED)

        # Attempt to raise claim against expired warranty -> should fail
        url_claim = reverse("warranty-claim-list")
        response = self.client.post(url_claim, {"registration": reg.id, "description": "Fails to boot"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Warranty has expired", str(response.data["error"]["details"]))

    def test_admin_timeline_creation(self):
        """Test that admin review action logs audit events inside timeline / notes."""
        self.order.status = OrderStatus.DELIVERED
        self.order.save()
        from apps.warranty.services import create_warranty_registrations
        create_warranty_registrations(self.order)
        reg = WarrantyRegistration.objects.first()
        
        reg.invoice = SimpleUploadedFile("invoice.pdf", b"pdf content", content_type="application/pdf")
        reg.serial_number = "SN-FZ-123"
        reg.save()

        # Review action on registration
        self.client.force_authenticate(user=self.admin)
        url = reverse("warranty-admin-registration-action", kwargs={"pk": reg.id})
        response = self.client.post(url, {"action": "approve", "notes": "Approved standard coverage"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        reg.refresh_from_db()
        self.assertIn("Admin Action: APPROVE", reg.admin_notes)
        self.assertIn("Approved standard coverage", reg.admin_notes)
