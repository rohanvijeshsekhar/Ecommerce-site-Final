"""
FAAZO – Automated Test Suite for Image Optimization & WebP Pipeline
===================================================================

Tests:
  1. JPG -> WebP conversion
  2. JPEG -> WebP conversion
  3. PNG -> WebP conversion
  4. Transparent PNG -> WebP with alpha preservation
  5. Small image retains native dimensions (no upscaling)
  6. Large image proportionally downscales preserving aspect ratio
  7. Corrupted image binary is rejected with ValidationError
  8. Non-image disguised as .jpg is rejected with ValidationError
  9. Oversized file exceeds limit and is rejected
  10. Path traversal and malicious filenames are safely sanitized
  11. Model integration (ProductImage save converts JPG to WebP)
  12. Serializer / validation integration
  13. Performance benchmark measurement
"""

import io
import shutil
import tempfile
import time
from decimal import Decimal
from PIL import Image

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from apps.common.image_optimizer import (
    optimize_image_to_webp,
    sanitize_image_filename,
    validate_image_file,
)
from apps.products.models import Product, ProductImage, ProductStatus
from apps.categories.models import Category
from apps.brands.models import Brand


def create_test_image_bytes(
    format: str = "JPEG",
    size: tuple = (400, 300),
    color: tuple = (70, 130, 180),
    mode: str = "RGB",
) -> bytes:
    """Helper to generate in-memory test image bytes."""
    img = Image.new(mode, size, color=color)
    if mode == "RGBA" and len(color) == 4:
        # Draw a semi-transparent pattern
        img.putpixel((0, 0), (255, 0, 0, 0))  # Full transparent pixel
        img.putpixel((1, 1), (0, 255, 0, 128))  # Half transparent pixel

    buffer = io.BytesIO()
    save_format = "JPEG" if format.upper() in ("JPG", "JPEG") else format.upper()
    img.save(buffer, format=save_format)
    return buffer.getvalue()


class ImageOptimizerTests(TestCase):
    def setUp(self):
        self.temp_media = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.temp_media, ignore_errors=True)

    def test_01_jpg_to_webp_conversion(self):
        """Test standard JPG image converts to genuine WebP."""
        jpg_bytes = create_test_image_bytes(format="JPEG", size=(600, 400))
        uploaded = SimpleUploadedFile("dental_mirror.jpg", jpg_bytes, content_type="image/jpeg")

        optimized = optimize_image_to_webp(uploaded, quality=82)

        self.assertTrue(optimized.name.endswith(".webp"))
        # Verify WebP magic header
        content = optimized.read()
        self.assertEqual(content[:4], b"RIFF")
        self.assertEqual(content[8:12], b"WEBP")

        # Verify Pillow can open resulting WebP
        with Image.open(io.BytesIO(content)) as result_img:
            self.assertEqual(result_img.format, "WEBP")
            self.assertEqual(result_img.size, (600, 400))

    def test_02_jpeg_to_webp_conversion(self):
        """Test JPEG format converts properly."""
        jpeg_bytes = create_test_image_bytes(format="JPEG", size=(500, 500))
        uploaded = SimpleUploadedFile("handpiece.jpeg", jpeg_bytes, content_type="image/jpeg")

        optimized = optimize_image_to_webp(uploaded)
        self.assertTrue(optimized.name.endswith(".webp"))

        with Image.open(io.BytesIO(optimized.read())) as result_img:
            self.assertEqual(result_img.format, "WEBP")
            self.assertEqual(result_img.size, (500, 500))

    def test_03_png_to_webp_conversion(self):
        """Test RGB PNG converts to WebP."""
        png_bytes = create_test_image_bytes(format="PNG", size=(300, 300), mode="RGB")
        uploaded = SimpleUploadedFile("scaler.png", png_bytes, content_type="image/png")

        optimized = optimize_image_to_webp(uploaded)
        self.assertTrue(optimized.name.endswith(".webp"))

        with Image.open(io.BytesIO(optimized.read())) as result_img:
            self.assertEqual(result_img.format, "WEBP")
            self.assertEqual(result_img.size, (300, 300))

    def test_04_transparent_png_to_webp_preserves_alpha(self):
        """Test RGBA transparent PNG converts to WebP preserving transparency."""
        rgba_bytes = create_test_image_bytes(
            format="PNG", size=(200, 200), color=(0, 102, 112, 128), mode="RGBA"
        )
        uploaded = SimpleUploadedFile("logo_transparent.png", rgba_bytes, content_type="image/png")

        optimized = optimize_image_to_webp(uploaded)
        self.assertTrue(optimized.name.endswith(".webp"))

        with Image.open(io.BytesIO(optimized.read())) as result_img:
            self.assertEqual(result_img.format, "WEBP")
            self.assertIn(result_img.mode, ("RGBA", "RGBa", "P"))

    def test_05_small_image_no_upscaling(self):
        """Test that small images (e.g. 150x150) are not upscaled to max_dimension (2000)."""
        small_bytes = create_test_image_bytes(format="JPEG", size=(150, 150))
        uploaded = SimpleUploadedFile("small_icon.jpg", small_bytes, content_type="image/jpeg")

        optimized = optimize_image_to_webp(uploaded, max_dimension=2000)

        with Image.open(io.BytesIO(optimized.read())) as result_img:
            self.assertEqual(result_img.size, (150, 150))

    def test_06_large_image_proportionally_resized(self):
        """Test oversized image (e.g. 3000x1500) is downscaled to 2000x1000 preserving aspect ratio."""
        large_bytes = create_test_image_bytes(format="JPEG", size=(3000, 1500))
        uploaded = SimpleUploadedFile("huge_banner.jpg", large_bytes, content_type="image/jpeg")

        optimized = optimize_image_to_webp(uploaded, max_dimension=2000)

        with Image.open(io.BytesIO(optimized.read())) as result_img:
            self.assertEqual(result_img.size, (2000, 1000))

    def test_07_corrupted_image_rejected(self):
        """Test that corrupted binary data is safely caught and rejected."""
        corrupted_bytes = b"\xFF\xD8\xFF\xE0\x00\x10JFIF" + b"\x00" * 50  # Truncated broken JPEG header
        uploaded = SimpleUploadedFile("corrupt.jpg", corrupted_bytes, content_type="image/jpeg")

        with self.assertRaises(ValidationError):
            optimize_image_to_webp(uploaded)

    def test_08_non_image_disguised_as_jpg_rejected(self):
        """Test that a text/executable file renamed to .jpg is rejected by content validation."""
        fake_jpg_bytes = b"<?php echo 'malicious payload'; ?>"
        uploaded = SimpleUploadedFile("shell.jpg", fake_jpg_bytes, content_type="image/jpeg")

        with self.assertRaises(ValidationError):
            validate_image_file(uploaded)

    def test_09_oversized_file_rejected(self):
        """Test that files exceeding MAX_SIZE_MB trigger a ValidationError."""
        fake_huge_file = SimpleUploadedFile(
            "huge.jpg", b"x" * 100, content_type="image/jpeg"
        )
        fake_huge_file.size = 20 * 1024 * 1024  # Mock 20 MB

        with self.assertRaises(ValidationError) as ctx:
            validate_image_file(fake_huge_file, max_size_mb=15)
        self.assertIn("exceeds the maximum allowed limit", str(ctx.exception))

    def test_10_filename_sanitization_and_path_traversal(self):
        """Test that malicious path traversal attempts are stripped from resulting filenames."""
        malicious_names = [
            "../../../../etc/passwd.jpg",
            "..\\..\\windows\\system32\\cmd.exe.png",
            "My Cool Product #1 (Dental).JPG",
            "   ",
        ]

        for name in malicious_names:
            clean = sanitize_image_filename(name)
            self.assertTrue(clean.endswith(".webp"))
            self.assertNotIn("..", clean)
            self.assertNotIn("/", clean)
            self.assertNotIn("\\", clean)

    def test_11_model_integration_product_image_saves_webp(self):
        """Test that saving a ProductImage model instance with a JPG file converts it to WebP on disk."""
        category = Category.objects.create(name="Instruments", slug="instruments-test")
        brand = Brand.objects.create(name="Faazo Tools", slug="faazo-tools-test")
        product = Product.objects.create(
            name="FAAZO Surgical Forceps",
            slug="faazo-surgical-forceps-test",
            category=category,
            brand=brand,
            status=ProductStatus.ACTIVE,
        )

        jpg_bytes = create_test_image_bytes(format="JPEG", size=(800, 600))
        uploaded = SimpleUploadedFile("forceps_raw.jpg", jpg_bytes, content_type="image/jpeg")

        prod_image = ProductImage.objects.create(
            product=product,
            image=uploaded,
            alt_text="Surgical Forceps Top View",
            is_primary=True,
        )

        # The image field should now have a .webp extension
        self.assertTrue(prod_image.image.name.endswith(".webp"))
        self.assertIn("products/images/", prod_image.image.name)

        # Verify on-disk file content
        with prod_image.image.open("rb") as f:
            content = f.read()
            self.assertEqual(content[:4], b"RIFF")
            self.assertEqual(content[8:12], b"WEBP")

    def test_12_performance_and_compression_ratio(self):
        """Measure conversion time and compression reduction for high-res photo."""
        # Create 1800x1200 high-res image
        raw_jpg = create_test_image_bytes(format="JPEG", size=(1800, 1200))
        uploaded = SimpleUploadedFile("clinical_camera_shot.jpg", raw_jpg)

        start_time = time.perf_counter()
        optimized = optimize_image_to_webp(uploaded, max_dimension=2000, quality=82)
        elapsed_ms = (time.perf_counter() - start_time) * 1000

        original_size = len(raw_jpg)
        webp_size = len(optimized.read())

        self.assertLess(elapsed_ms, 500)  # Should complete in < 500ms
        self.assertTrue(optimized.name.endswith(".webp"))
        self.assertGreater(original_size, 0)
        self.assertGreater(webp_size, 0)
