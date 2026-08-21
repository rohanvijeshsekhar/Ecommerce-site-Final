"""
FAAZO – User & Address Module Tests
Tests:
  - AddressSerializer field validations
  - Pincode and state match cross-validation
  - Invalid postal codes and phone numbers rejection
"""

from django.test import TestCase
from rest_framework.test import APIRequestFactory
from apps.users.models import User, Address
from apps.users.serializers import AddressSerializer


class AddressValidationTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="dr.dentist@faazo.com",
            password="StrongPassword123!",
            full_name="Dr. Dentist",
            role="customer",
        )
        self.factory = APIRequestFactory()

    def test_valid_address_creation(self):
        data = {
            "label": "Primary Clinic",
            "full_name": "Dr. Dentist Clinic",
            "mobile": "9876543210",
            "line1": "Flat 101, Medical Plaza, MG Road",
            "line2": "Near Central Hospital",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
            "address_type": "both",
        }
        request = self.factory.post("/api/v1/users/addresses/")
        request.user = self.user

        serializer = AddressSerializer(data=data, context={"request": request})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        address = serializer.save()
        self.assertEqual(address.state, "Maharashtra")
        self.assertEqual(address.pincode, "400001")

    def test_short_address_line1_rejected(self):
        data = {
            "label": "Clinic",
            "full_name": "Dr. Dentist",
            "mobile": "9876543210",
            "line1": "mm",  # Too short (< 5 chars)
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
        }
        request = self.factory.post("/api/v1/users/addresses/")
        request.user = self.user

        serializer = AddressSerializer(data=data, context={"request": request})
        self.assertFalse(serializer.is_valid())
        self.assertIn("line1", serializer.errors)

    def test_invalid_state_name_rejected(self):
        data = {
            "label": "Clinic",
            "full_name": "Dr. Dentist",
            "mobile": "9876543210",
            "line1": "Flat 101, Medical Plaza",
            "city": "Mumbai",
            "state": "UnknownFakeState",
            "pincode": "400001",
        }
        request = self.factory.post("/api/v1/users/addresses/")
        request.user = self.user

        serializer = AddressSerializer(data=data, context={"request": request})
        self.assertFalse(serializer.is_valid())
        self.assertIn("state", serializer.errors)

    def test_pincode_state_mismatch_rejected(self):
        # Pincode 695101 belongs to Kerala, but user selected Maharashtra
        data = {
            "label": "Clinic",
            "full_name": "Dr. Dentist",
            "mobile": "9876543210",
            "line1": "Flat 101, Medical Plaza",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "695101",
        }
        request = self.factory.post("/api/v1/users/addresses/")
        request.user = self.user

        serializer = AddressSerializer(data=data, context={"request": request})
        self.assertFalse(serializer.is_valid())
        self.assertIn("pincode", serializer.errors)

    def test_invalid_phone_rejected(self):
        data = {
            "label": "Clinic",
            "full_name": "Dr. Dentist",
            "mobile": "12345",  # Invalid phone
            "line1": "Flat 101, Medical Plaza",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
        }
        request = self.factory.post("/api/v1/users/addresses/")
        request.user = self.user

        serializer = AddressSerializer(data=data, context={"request": request})
        self.assertFalse(serializer.is_valid())
        self.assertIn("mobile", serializer.errors)
