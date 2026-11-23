"""
FAAZO – Centralized Storage Engines & Private File Protection
=============================================================

Provides clean separation between:
1. Public media (Cloudinary CDN): Catalog images, marketing banners, avatars, reviews.
2. Private confidential documents (Local VPS disk / FileSystemStorage):
   - Dealer KYC (GST, drug licenses, PAN, business registrations)
   - Warranty tax invoices (customer PII)
   - Customer return defect evidence
   - Support ticket attachments
"""

from django.core.files.storage import storages, FileSystemStorage
from django.db import models


def get_private_storage():
    """Returns the dedicated private local storage for sensitive customer/dealer files."""
    try:
        return storages["private"]
    except Exception:
        return FileSystemStorage()


class PrivateFileField(models.FileField):
    """
    A drop-in Django Model FileField that always persists to private local VPS
    storage (FileSystemStorage), strictly preventing sensitive documents from ever
    being uploaded to public Cloudinary CDN.

    Deconstructs as a standard django.db.models.FileField so existing schema
    and migrations remain 100% compatible without generating noisy migration files.
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("storage", get_private_storage)
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        # Pop storage to keep migration files clean and standard
        kwargs.pop("storage", None)
        return name, "django.db.models.FileField", args, kwargs
