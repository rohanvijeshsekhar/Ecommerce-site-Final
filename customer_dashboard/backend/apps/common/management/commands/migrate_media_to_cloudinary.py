"""
FAAZO – Management Command: Migrate Public Media to Cloudinary CDN
==================================================================

Safely migrates all public catalog, CMS, and marketing images from local
VPS storage (MEDIA_ROOT) to Cloudinary CDN.

Features:
  - Scans all public Django models dynamically.
  - Strictly ignores private/confidential models (Dealer KYC, Returns evidence,
    Warranty invoices, Support attachments).
  - Matches the exact public_id format expected by MediaCloudinaryStorage so
    existing DB references resolve seamlessly to Cloudinary CDN URLs.
  - Supports --dry-run to inspect files without uploading.
  - Supports --app and --model filtering.
  - Idempotent and non-destructive: never deletes original files on local disk.
"""

import os
import sys
from typing import List, Tuple

from django.apps import apps
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import models

from apps.common.storage import PrivateFileField

# Excluded private apps that must NEVER be migrated to public Cloudinary
PRIVATE_APPS = {"dealer", "returns", "warranty", "support"}


class Command(BaseCommand):
    help = "Uploads existing public media files from local storage to Cloudinary CDN."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simulate the migration without uploading any files to Cloudinary.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-upload files even if they already exist on Cloudinary.",
        )
        parser.add_argument(
            "--app",
            type=str,
            help="Limit migration to a specific app label (e.g. 'homepage' or 'products').",
        )
        parser.add_argument(
            "--model",
            type=str,
            help="Limit migration to a specific model name (e.g. 'HeroSlide' or 'Product').",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        force = options["force"]
        app_filter = options.get("app")
        model_filter = options.get("model")

        self.stdout.write(self.style.MIGRATE_HEADING("=== FAAZO Cloudinary Media Migration ==="))
        if dry_run:
            self.stdout.write(self.style.WARNING("Running in DRY-RUN mode. No files will be uploaded.\n"))

        if not getattr(settings, "USE_CLOUDINARY", False):
            self.stderr.write(
                self.style.ERROR(
                    "Cloudinary credentials are not configured in settings. "
                    "Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set."
                )
            )
            return

        import cloudinary
        import cloudinary.uploader

        media_root = str(settings.MEDIA_ROOT)
        self.stdout.write(f"Source MEDIA_ROOT: {media_root}")
        self.stdout.write(f"Target Cloudinary Cloud: {settings.CLOUDINARY_STORAGE.get('CLOUD_NAME')}\n")

        total_scanned = 0
        total_migrated = 0
        total_skipped = 0
        total_missing = 0
        total_errors = 0

        # Scan models
        for model in apps.get_models():
            app_label = model._meta.app_label
            model_name = model.__name__

            if app_label in PRIVATE_APPS:
                continue

            if app_filter and app_label.lower() != app_filter.lower():
                continue

            if model_filter and model_name.lower() != model_filter.lower():
                continue

            # Identify public image and file fields
            target_fields: List[str] = []
            for field in model._meta.get_fields():
                if isinstance(field, (models.ImageField, models.FileField)):
                    if isinstance(field, PrivateFileField):
                        continue
                    target_fields.append(field.name)

            if not target_fields:
                continue

            self.stdout.write(self.style.HTTP_INFO(f"Scanning {app_label}.{model_name} (fields: {', '.join(target_fields)})"))

            for instance in model.objects.all():
                for field_name in target_fields:
                    field_val = getattr(instance, field_name)
                    if not field_val or not field_val.name:
                        continue

                    total_scanned += 1
                    raw_name = str(field_val.name).strip()

                    # Normalize public ID
                    # If already starts with media/, use as base; otherwise prefix with media/
                    clean_path = raw_name.lstrip("/").replace("\\", "/")
                    if clean_path.startswith("media/"):
                        rel_path = clean_path[6:]
                    else:
                        rel_path = clean_path

                    # Find physical file on disk
                    candidate_paths = [
                        os.path.join(media_root, rel_path.replace("/", os.sep)),
                        os.path.join(media_root, clean_path.replace("/", os.sep)),
                    ]

                    physical_file = None
                    for cp in candidate_paths:
                        if os.path.isfile(cp):
                            physical_file = cp
                            break

                    if not physical_file:
                        self.stdout.write(
                            self.style.WARNING(f"  [MISSING] {app_label}.{model_name} id={instance.pk} -> {rel_path}")
                        )
                        total_missing += 1
                        continue

                    # Determine target public_id without extension
                    stem, _ = os.path.splitext(rel_path)
                    target_public_id = f"media/{stem}"

                    if dry_run:
                        self.stdout.write(
                            f"  [DRY-RUN] Would upload {physical_file} -> public_id: {target_public_id}"
                        )
                        total_migrated += 1
                        continue

                    try:
                        self.stdout.write(f"  [UPLOADING] {rel_path} -> {target_public_id} ...", ending="")
                        self.stdout.flush()

                        res = cloudinary.uploader.upload(
                            physical_file,
                            public_id=target_public_id,
                            overwrite=force,
                            resource_type="image",
                            use_filename=False,
                            unique_filename=False,
                        )

                        secure_url = res.get("secure_url", "")
                        self.stdout.write(self.style.SUCCESS(f" OK ({res.get('bytes', 0)} bytes)"))
                        total_migrated += 1

                    except Exception as exc:
                        self.stdout.write(self.style.ERROR(f" FAILED: {exc}"))
                        total_errors += 1

        self.stdout.write("\n" + self.style.MIGRATE_HEADING("=== Migration Summary ==="))
        self.stdout.write(f"Total files scanned:  {total_scanned}")
        self.stdout.write(f"Successfully migrated: {total_migrated}")
        self.stdout.write(f"Missing from disk:     {total_missing}")
        self.stdout.write(f"Upload errors:         {total_errors}")

        if dry_run:
            self.stdout.write(self.style.NOTICE("\nDry run completed. Run without --dry-run to perform the live upload."))
        else:
            self.stdout.write(self.style.SUCCESS("\nLive migration completed successfully!"))
