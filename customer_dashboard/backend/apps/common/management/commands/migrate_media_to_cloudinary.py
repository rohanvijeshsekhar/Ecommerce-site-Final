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
            "--media-root",
            type=str,
            help="Explicit filesystem path to the source media directory (e.g. /var/lib/faazo/media).",
        )
        parser.add_argument(
            "--sync-disk",
            action="store_true",
            help="Upload all existing physical files in /var/lib/faazo/media and link them to homepage records.",
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

        media_roots_to_try = []
        if options.get("media_root"):
            media_roots_to_try.append(options["media_root"])
        if os.path.isdir("/var/lib/faazo/media"):
            media_roots_to_try.append("/var/lib/faazo/media")
        media_roots_to_try.append(str(settings.MEDIA_ROOT))
        # Deduplicate while preserving order
        seen_roots = set()
        media_roots = []
        for r in media_roots_to_try:
            norm = os.path.normpath(r)
            if norm not in seen_roots and os.path.isdir(norm):
                seen_roots.add(norm)
                media_roots.append(norm)

        self.stdout.write(f"Source media directories: {', '.join(media_roots)}")
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

                    # Find physical file on disk across all known media root locations
                    physical_file = None
                    common_exts = ["", ".webp", ".jpg", ".jpeg", ".png", ".svg", ".gif"]
                    
                    for root in media_roots:
                        for sub_path in [rel_path, clean_path]:
                            base_cand = os.path.join(root, sub_path.replace("/", os.sep))
                            for ext in common_exts:
                                test_cand = base_cand + ext if ext else base_cand
                                if os.path.isfile(test_cand):
                                    physical_file = test_cand
                                    break
                            if physical_file:
                                break
                        if physical_file:
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

        if options.get("sync_disk"):
            self.stdout.write(self.style.HTTP_INFO("\n--- Scanning physical disk media to rescue broken homepage references ---"))
            for root in media_roots:
                homepage_dir = os.path.join(root, "homepage")
                if not os.path.isdir(homepage_dir):
                    continue

                for dirpath, _, filenames in os.walk(homepage_dir):
                    for fn in filenames:
                        if not any(fn.lower().endswith(ext) for ext in [".webp", ".jpg", ".png", ".jpeg"]):
                            continue
                        full_p = os.path.join(dirpath, fn)
                        rel_from_root = os.path.relpath(full_p, root).replace("\\", "/")
                        stem, _ = os.path.splitext(rel_from_root)
                        target_pub = f"media/{stem}"

                        self.stdout.write(f"  [DISK UPLOAD] {rel_from_root} -> {target_pub} ...", ending="")
                        try:
                            res = cloudinary.uploader.upload(
                                full_p,
                                public_id=target_pub,
                                overwrite=True,
                                resource_type="image",
                            )
                            self.stdout.write(self.style.SUCCESS(f" OK"))

                            if "hero/desktop" in rel_from_root:
                                try:
                                    from apps.homepage.models import HeroSlide
                                    slide = HeroSlide.objects.filter(is_active=True).first()
                                    if slide:
                                        slide.desktop_image = rel_from_root
                                        slide.save(update_fields=["desktop_image"])
                                        self.stdout.write(self.style.SUCCESS(f"    -> Linked desktop banner to HeroSlide id={slide.pk}"))
                                except Exception as e:
                                    self.stdout.write(self.style.WARNING(f"    -> Hero desktop link failed: {e}"))

                            elif "hero/mobile" in rel_from_root:
                                try:
                                    from apps.homepage.models import HeroSlide
                                    slide = HeroSlide.objects.filter(is_active=True).first()
                                    if slide:
                                        slide.mobile_image = rel_from_root
                                        slide.save(update_fields=["mobile_image"])
                                        self.stdout.write(self.style.SUCCESS(f"    -> Linked mobile banner to HeroSlide id={slide.pk}"))
                                except Exception as e:
                                    self.stdout.write(self.style.WARNING(f"    -> Hero mobile link failed: {e}"))

                            elif "categories" in rel_from_root:
                                try:
                                    from apps.homepage.models import HomepageCategory
                                    hcat = HomepageCategory.objects.first()
                                    if hcat:
                                        hcat.card_image = rel_from_root
                                        hcat.save(update_fields=["card_image"])
                                        self.stdout.write(self.style.SUCCESS(f"    -> Linked category card to HomepageCategory id={hcat.pk}"))
                                except Exception as e:
                                    self.stdout.write(self.style.WARNING(f"    -> Category link failed: {e}"))

                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f" FAILED: {e}"))

        self.stdout.write("\n" + self.style.MIGRATE_HEADING("=== Migration Summary ==="))
        self.stdout.write(f"Total files scanned:  {total_scanned}")
        self.stdout.write(f"Successfully migrated: {total_migrated}")
        self.stdout.write(f"Missing from disk:     {total_missing}")
        self.stdout.write(f"Upload errors:         {total_errors}")

        if dry_run:
            self.stdout.write(self.style.NOTICE("\nDry run completed. Run without --dry-run to perform the live upload."))
        else:
            self.stdout.write(self.style.SUCCESS("\nLive migration completed successfully!"))
