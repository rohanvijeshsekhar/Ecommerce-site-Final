"""
FAAZO – Homepage Featured Collection Image Management Tests
"""

import io
from PIL import Image
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from apps.users.models import User
from apps.homepage.models import FeaturedCollection


def create_test_image(format_name='PNG', size=(100, 100), color='teal'):
    """Generate a valid in-memory image for upload testing."""
    file_obj = io.BytesIO()
    image = Image.new('RGB', size, color=color)
    image.save(file_obj, format=format_name)
    file_obj.seek(0)
    ext = format_name.lower()
    if ext == 'jpeg':
        ext = 'jpg'
    return SimpleUploadedFile(
        f"test_collection_image.{ext}",
        file_obj.read(),
        content_type=f"image/{ext}"
    )


class FeaturedCollectionImageTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            email="admin_coll@faazo.com",
            password="AdminPassword123!",
            full_name="Admin Coll User",
            role="admin",
            is_staff=True,
            is_superuser=True,
        )
        self.customer_user = User.objects.create_user(
            email="cust_coll@faazo.com",
            password="CustPassword123!",
            full_name="Cust Coll User",
            role="customer",
        )

    def test_create_collection_without_image(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "title": "Clean Collection",
            "description": "No image yet",
            "is_visible": True,
        }
        response = self.client.post("/api/v1/homepage/featured-collections/", payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data["data"]["title"], "Clean Collection")
        self.assertIsNone(data["data"]["image_url"])

        # Check DB
        collection = FeaturedCollection.objects.get(title="Clean Collection")
        self.assertFalse(bool(collection.image))

    def test_create_collection_with_image(self):
        self.client.force_authenticate(user=self.admin_user)
        img_file = create_test_image('PNG', size=(200, 200))
        payload = {
            "title": "Summer Specials",
            "description": "Curated clinical dental tools",
            "is_visible": True,
            "image": img_file,
        }
        response = self.client.post(
            "/api/v1/homepage/featured-collections/",
            payload,
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertIsNotNone(data["data"]["image_url"])
        self.assertTrue(data["data"]["image_url"].startswith("http"))

        # Verify DB
        collection = FeaturedCollection.objects.get(title="Summer Specials")
        self.assertTrue(bool(collection.image))
        self.assertTrue(collection.image.name.endswith(".webp"))  # OptimizedImageField converts to webp

    def test_edit_collection_and_upload_image(self):
        self.client.force_authenticate(user=self.admin_user)
        coll = FeaturedCollection.objects.create(
            title="Existing Collection",
            description="Created without image",
            is_visible=True,
        )
        self.assertFalse(bool(coll.image))

        new_img = create_test_image('JPEG', size=(150, 150))
        response = self.client.patch(
            f"/api/v1/homepage/featured-collections/{coll.id}/",
            {"image": new_img},
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertIsNotNone(data["data"]["image_url"])

        coll.refresh_from_db()
        self.assertTrue(bool(coll.image))

    def test_replace_existing_image(self):
        self.client.force_authenticate(user=self.admin_user)
        first_img = create_test_image('PNG', size=(100, 100), color='red')
        coll = FeaturedCollection.objects.create(
            title="Replace Test",
            description="Testing image replace",
            image=first_img,
            is_visible=True,
        )
        old_image_name = coll.image.name

        second_img = create_test_image('PNG', size=(120, 120), color='blue')
        response = self.client.patch(
            f"/api/v1/homepage/featured-collections/{coll.id}/",
            {"image": second_img},
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        coll.refresh_from_db()
        self.assertTrue(bool(coll.image))
        self.assertNotEqual(coll.image.name, old_image_name)

    def test_explicit_image_clearing(self):
        self.client.force_authenticate(user=self.admin_user)
        img = create_test_image('PNG', size=(100, 100))
        coll = FeaturedCollection.objects.create(
            title="Clear Test",
            description="Testing image clear",
            image=img,
            is_visible=True,
        )
        self.assertTrue(bool(coll.image))

        # Send empty string for image in multipart form
        response = self.client.patch(
            f"/api/v1/homepage/featured-collections/{coll.id}/",
            {"image": ""},
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIsNone(data["data"]["image_url"])

        coll.refresh_from_db()
        self.assertFalse(bool(coll.image))

    def test_public_homepage_featured_collection_api_returns_image_url(self):
        img = create_test_image('PNG', size=(100, 100))
        coll = FeaturedCollection.objects.create(
            title="Public API Collection",
            description="Testing public GET",
            image=img,
            is_visible=True,
        )

        # Unauthenticated customer request
        response = self.client.get("/api/v1/homepage/featured-collections/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data.get("success"))
        found = next((c for c in data["data"] if c["id"] == str(coll.id)), None)
        self.assertIsNotNone(found)
        self.assertIsNotNone(found["image_url"])
        self.assertTrue(found["image_url"].startswith("http"))

    def test_invalid_image_rejected(self):
        self.client.force_authenticate(user=self.admin_user)
        bad_file = SimpleUploadedFile(
            "malicious.txt",
            b"This is a text file not an image",
            content_type="text/plain"
        )
        response = self.client.post(
            "/api/v1/homepage/featured-collections/",
            {"title": "Bad File Collection", "image": bad_file},
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_existing_collections_without_images_continue_functioning(self):
        coll1 = FeaturedCollection.objects.create(
            title="Legacy 1",
            description="Legacy description",
            is_visible=True
        )
        response = self.client.get(f"/api/v1/homepage/featured-collections/{coll1.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        res_json = response.json()
        item = res_json.get("data", res_json)
        self.assertIsNone(item.get("image_url"))
        self.assertEqual(item.get("title"), "Legacy 1")
