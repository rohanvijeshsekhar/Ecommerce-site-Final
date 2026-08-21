"""
FAAZO – Centralized Server-Side Image Optimization & WebP Pipeline
===================================================================

Provides automated, robust image processing and WebP conversion for all
uploads across the FAAZO e-commerce platform (Admin, REST API, seed commands).

Features:
  1. Content/MIME binary validation (never trusts filename extension alone).
  2. Protection against decompression bombs (Image.MAX_IMAGE_PIXELS safety cap).
  3. Aspect-ratio-preserving proportional downscaling for oversized images (LANCZOS).
  4. Preservation of native dimensions for smaller images (no upscaling).
  5. Alpha channel transparency preservation (RGBA -> WebP).
  6. Color space normalization (CMYK, Palette, Grayscale -> RGB/RGBA).
  7. Deterministic, collision-resistant, path-traversal-safe filename generation.
  8. Seamless compatibility with Django FileSystemStorage, S3, and Cloudflare R2.
  9. Custom OptimizedImageField for transparent model-level auto-optimization.
"""

import io
import os
import re
import uuid
import logging
from typing import Optional, Tuple, Union

from PIL import Image, ImageOps, UnidentifiedImageError
# Protect against decompression bomb DOS attacks
Image.MAX_IMAGE_PIXELS = 50_000_000

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile, File
from django.core.files.uploadedfile import UploadedFile
from django.db import models

logger = logging.getLogger("faazo.image_optimizer")

# Supported input image formats
SUPPORTED_INPUT_FORMATS = {"JPEG", "JPG", "PNG", "WEBP", "GIF", "BMP", "TIFF"}


def get_optimizer_setting(name: str, default: Union[int, bool]) -> Union[int, bool]:
    """Retrieve an image optimizer setting from Django settings or fallback to default."""
    return getattr(settings, name, default)


def sanitize_image_filename(original_name: Optional[str], extension: str = ".webp") -> str:
    """
    Generate a sanitized, directory-traversal-safe filename with .webp extension.
    Example:
      "../../My Product Photo (1).jpg" -> "my_product_photo_1_a1b2c3d4.webp"
    """
    if not extension.startswith("."):
        extension = f".{extension}"

    if not original_name:
        return f"img_{uuid.uuid4().hex[:12]}{extension}"

    # Extract base name and strip path traversal characters
    clean_base = os.path.basename(original_name)
    stem, _ = os.path.splitext(clean_base)

    # Sanitize stem: lowercase, replace spaces/punctuation with underscores
    stem_clean = re.sub(r"[^\w\-]", "_", stem.strip().lower())
    stem_clean = re.sub(r"_+", "_", stem_clean).strip("_")

    if not stem_clean:
        stem_clean = "image"

    # Limit stem length to 60 characters to avoid overly long DB column values
    stem_clean = stem_clean[:60]

    # Append a short unique entropy suffix to prevent cache-busting collisions
    entropy = uuid.uuid4().hex[:8]
    return f"{stem_clean}_{entropy}{extension}"


def validate_image_file(
    file_obj,
    max_size_mb: Optional[int] = None,
) -> Tuple[str, Tuple[int, int]]:
    """
    Validates that a file is a genuine, uncorrupted, supported image.
    
    Returns:
        (image_format, (width, height))
    
    Raises:
        ValidationError: If file is too large, corrupted, or unsupported.
    """
    if max_size_mb is None:
        max_size_mb = int(get_optimizer_setting("IMAGE_OPTIMIZER_MAX_SIZE_MB", 15))

    # 1. File size check
    if hasattr(file_obj, "size"):
        max_bytes = max_size_mb * 1024 * 1024
        if file_obj.size > max_bytes:
            raise ValidationError(
                f"Image file size ({file_obj.size / (1024*1024):.1f}MB) exceeds "
                f"the maximum allowed limit of {max_size_mb}MB."
            )

    # 2. Inspect actual image content using Pillow
    try:
        # Seek to start if possible
        if hasattr(file_obj, "seek"):
            file_obj.seek(0)

        # Read binary data
        raw_bytes = file_obj.read() if hasattr(file_obj, "read") else file_obj
        if hasattr(file_obj, "seek"):
            file_obj.seek(0)

        if not raw_bytes or len(raw_bytes) == 0:
            raise ValidationError("Uploaded file is empty.")

        byte_stream = io.BytesIO(raw_bytes)
        with Image.open(byte_stream) as img:
            img_format = (img.format or "").upper()
            if img_format not in SUPPORTED_INPUT_FORMATS:
                raise ValidationError(
                    f"Unsupported image format '{img_format}'. "
                    f"Supported formats: {', '.join(sorted(SUPPORTED_INPUT_FORMATS))}."
                )

            dimensions = img.size
            # Verify stream integrity
            img.verify()

        return img_format, dimensions

    except UnidentifiedImageError:
        raise ValidationError(
            "Uploaded file is not a recognized or valid image format."
        )
    except Image.DecompressionBombError:
        raise ValidationError(
            "Image dimensions are excessively large and pose a security risk."
        )
    except Exception as exc:
        if isinstance(exc, ValidationError):
            raise
        logger.warning("Image validation error: %s", exc)
        raise ValidationError(f"Invalid or corrupted image: {str(exc)}")


def optimize_image_to_webp(
    file_obj,
    max_dimension: Optional[int] = None,
    quality: Optional[int] = None,
    target_filename: Optional[str] = None,
) -> ContentFile:
    """
    Decodes an image file, normalizes color channels, resizes proportionally
    if it exceeds max_dimension, and encodes to WebP format.

    Args:
        file_obj: UploadedFile, File, FieldFile, or bytes.
        max_dimension: Maximum allowed width or height in pixels (default 2000).
        quality: WebP compression quality 1-100 (default 82).
        target_filename: Optional original filename for naming the result.

    Returns:
        ContentFile: Django ContentFile containing the optimized .webp binary.
    """
    if max_dimension is None:
        max_dimension = int(get_optimizer_setting("IMAGE_OPTIMIZER_MAX_DIMENSION", 2000))
    if quality is None:
        quality = int(get_optimizer_setting("IMAGE_OPTIMIZER_WEBP_QUALITY", 82))

    # Read binary bytes
    if hasattr(file_obj, "seek"):
        file_obj.seek(0)
    raw_bytes = file_obj.read() if hasattr(file_obj, "read") else file_obj
    if hasattr(file_obj, "seek"):
        file_obj.seek(0)

    # Validate image first
    validate_image_file(raw_bytes)

    # Derive filename
    orig_name = getattr(file_obj, "name", None) or target_filename or "image.jpg"
    safe_webp_name = sanitize_image_filename(orig_name, extension=".webp")

    # Process with Pillow
    byte_stream = io.BytesIO(raw_bytes)
    with Image.open(byte_stream) as img:
        # Respect EXIF orientation tags if present (e.g. photos from mobile cameras)
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        # Color Space & Channel Normalization
        has_alpha = False
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            img = img.convert("RGBA")
            has_alpha = True
        elif img.mode == "CMYK":
            # Convert CMYK to RGB
            img = img.convert("RGB")
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # Proportional Resizing (Preserving Aspect Ratio, No Upscaling)
        orig_w, orig_h = img.size
        if max(orig_w, orig_h) > max_dimension and max_dimension > 0:
            if orig_w >= orig_h:
                new_w = max_dimension
                new_h = max(1, int(round(orig_h * (max_dimension / orig_w))))
            else:
                new_h = max_dimension
                new_w = max(1, int(round(orig_w * (max_dimension / orig_h))))

            logger.info(
                "Downscaling image '%s' from %dx%d to %dx%d (max_dim=%d)",
                orig_name, orig_w, orig_h, new_w, new_h, max_dimension
            )
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        else:
            logger.debug("Image '%s' (%dx%d) within max dimension %d. Keeping original size.", orig_name, orig_w, orig_h, max_dimension)

        # Encode to WebP
        output_buffer = io.BytesIO()
        save_kwargs = {
            "format": "WEBP",
            "quality": quality,
            "method": 6,  # Highest quality compression effort
        }
        if has_alpha:
            save_kwargs["lossless"] = False  # Lossy WebP with alpha transparency channel

        img.save(output_buffer, **save_kwargs)
        webp_bytes = output_buffer.getvalue()

    original_size = len(raw_bytes)
    webp_size = len(webp_bytes)
    reduction = ((original_size - webp_size) / original_size * 100) if original_size > 0 else 0
    logger.info(
        "Optimized image '%s' -> '%s' (Original: %.1f KB, WebP: %.1f KB, Change: %.1f%%)",
        orig_name, safe_webp_name, original_size / 1024, webp_size / 1024, -reduction
    )

    content_file = ContentFile(webp_bytes, name=safe_webp_name)
    content_file.content_type = "image/webp"
    return content_file


class OptimizedImageField(models.ImageField):
    """
    A drop-in Django Model ImageField that automatically optimizes uploaded
    images (JPEG, PNG, etc.) to high-efficiency WebP format before saving.

    Transparently hooks into pre_save() — works seamlessly with Django Admin,
    DRF ModelSerializers, direct ORM saves, and file storage backends (Local/S3/R2).
    """

    def __init__(
        self,
        *args,
        max_dimension: Optional[int] = None,
        webp_quality: Optional[int] = None,
        **kwargs
    ):
        self.max_dimension = max_dimension
        self.webp_quality = webp_quality
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        # Return standard Django ImageField path so Django migrations recognize this as
        # identical schema type (VARCHAR) without generating unnecessary migration files.
        return name, "django.db.models.ImageField", args, kwargs


    def pre_save(self, model_instance, add):
        """
        Intercepts file save. If a new UploadedFile or unoptimized File is attached,
        processes it into WebP before persisting to storage.
        """
        file = getattr(model_instance, self.attname)
        enabled = get_optimizer_setting("IMAGE_OPTIMIZER_ENABLED", True)

        if file and enabled and bool(file):
            # Check if this is a newly uploaded/uncommitted file
            is_uncommitted = not getattr(file, "_committed", True)
            is_new_upload = is_uncommitted or isinstance(file, UploadedFile) or getattr(file, "_unoptimized", False)
            already_optimized = getattr(file, "_is_webp_optimized", False)

            if is_new_upload and not already_optimized:
                try:
                    logger.info("Optimizing ImageField upload '%s' for model %s", file.name, model_instance.__class__.__name__)
                    underlying_file = getattr(file, "file", file)
                    optimized_file = optimize_image_to_webp(
                        underlying_file,
                        max_dimension=self.max_dimension,
                        quality=self.webp_quality,
                        target_filename=file.name,
                    )
                    optimized_file._is_webp_optimized = True

                    # Generate target storage filename using field's upload_to
                    target_name = self.generate_filename(model_instance, optimized_file.name)
                    # Persist WebP binary to storage
                    saved_path = self.storage.save(target_name, optimized_file)

                    # Update FieldFile references
                    file.name = saved_path
                    file.file = optimized_file
                    file._file = optimized_file
                    file._committed = True
                    file._is_webp_optimized = True
                    setattr(model_instance, self.attname, file)
                    return file


                except Exception as exc:
                    logger.error("Failed to auto-optimize image field '%s': %s", self.name, exc, exc_info=True)
                    if isinstance(exc, ValidationError):
                        raise
                    pass

        return super().pre_save(model_instance, add)

