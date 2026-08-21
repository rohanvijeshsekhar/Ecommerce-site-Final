"""
FAAZO — Read-Only Phone Number Normalization & Collision Audit Command.

Usage:
    python manage.py audit_phone_numbers

Reports:
    - All existing phone numbers in the database
    - Canonical E.164 normalized representation
    - Collision groups (where multiple accounts normalize to the same number)
    - Phone verification status and dealer application status

IMPORTANT:
    This command is 100% READ-ONLY. No rows are updated, deleted, or merged.
"""

from collections import defaultdict
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from apps.common.utils import normalize_phone_number
from django.core.exceptions import ValidationError as DjangoValidationError

User = get_user_model()


class Command(BaseCommand):
    help = "Read-only audit of existing phone numbers, E.164 canonicalization, and collisions."

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("================================================================================"))
        self.stdout.write(self.style.MIGRATE_HEADING("                 FAAZO — PHONE NUMBER AUDIT & COLLISION REPORT                  "))
        self.stdout.write(self.style.MIGRATE_HEADING("================================================================================"))

        users = User.objects.all().order_by("created_at")
        total_users = users.count()
        users_with_phone = users.exclude(phone_number__isnull=True).exclude(phone_number__exact="")

        self.stdout.write(f"Total Users in Database: {total_users}")
        self.stdout.write(f"Users with Phone Number: {users_with_phone.count()}")
        self.stdout.write("")

        normalized_map = defaultdict(list)
        invalid_phones = []

        self.stdout.write(f"{'User ID':<34} | {'Email':<30} | {'Raw Phone':<15} | {'Normalized (E.164)':<18} | {'Role':<8} | {'Ph.Ver':<6} | {'Dealer Status'}")
        self.stdout.write("-" * 140)

        for u in users_with_phone:
            raw_phone = u.phone_number
            dealer_app = getattr(u, "dealer_application", None)
            dealer_status = dealer_app.status if dealer_app else ("none" if u.role != "dealer" else "pending")

            try:
                norm_phone = normalize_phone_number(raw_phone, allow_empty=False)
            except DjangoValidationError as exc:
                norm_phone = "INVALID"
                invalid_phones.append((u, raw_phone, str(exc)))

            normalized_map[norm_phone].append({
                "user": u,
                "raw_phone": raw_phone,
                "dealer_status": dealer_status,
            })

            ph_ver_str = "Yes" if u.is_phone_verified else "No"
            self.stdout.write(
                f"{str(u.id):<34} | {u.email:<30} | {raw_phone:<15} | {norm_phone:<18} | {u.role:<8} | {ph_ver_str:<6} | {dealer_status}"
            )

        self.stdout.write("-" * 140)
        self.stdout.write("")

        # ── Check for Collisions ──────────────────────────────────────────────
        collisions = {phone: group for phone, group in normalized_map.items() if len(group) > 1 and phone != "INVALID"}

        self.stdout.write(self.style.MIGRATE_HEADING("================================================================================"))
        self.stdout.write(self.style.MIGRATE_HEADING("                              COLLISION ANALYSIS                                "))
        self.stdout.write(self.style.MIGRATE_HEADING("================================================================================"))

        if collisions:
            self.stdout.write(self.style.ERROR(f"WARNING: Found {len(collisions)} collision group(s)!"))
            for canonical_phone, members in collisions.items():
                self.stdout.write(self.style.WARNING(f"\n[COLLISION GROUP] Canonical Phone: {canonical_phone} ({len(members)} accounts)"))
                for idx, m in enumerate(members, 1):
                    usr = m["user"]
                    self.stdout.write(
                        f"   Account #{idx}: ID={usr.id} | Email={usr.email} | RawPhone='{m['raw_phone']}' | Role={usr.role} | Verified={usr.is_phone_verified} | DealerApp={m['dealer_status']}"
                    )
        else:
            self.stdout.write(self.style.SUCCESS("No normalized phone collisions found in the database."))

        if invalid_phones:
            self.stdout.write(self.style.ERROR(f"\nInvalid Phone Numbers Found ({len(invalid_phones)}):"))
            for usr, raw, err in invalid_phones:
                self.stdout.write(f"   User: {usr.email} (ID: {usr.id}) | Raw Phone: '{raw}' | Error: {err}")

        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("================================================================================"))
        self.stdout.write("Audit complete. Database state unchanged.")
        self.stdout.write(self.style.MIGRATE_HEADING("================================================================================"))
