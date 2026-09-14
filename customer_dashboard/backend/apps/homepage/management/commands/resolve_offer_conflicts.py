"""
FAAZO - Step 1: Classify orphan offers and deactivate test data.
Usage: python manage.py resolve_offer_conflicts --dry-run
       python manage.py resolve_offer_conflicts --apply
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from apps.homepage.models import LimitedTimeOffer
from apps.products.models import Product


# The 4 hp laptop test offer IDs from the audit
HP_LAPTOP_OFFER_IDS = [
    "c6370b29-99ff-4278-8d21-4fb0d87c2982",
    "641eb432-3e99-4269-b82a-6841005cf604",
    "0c827a1b-af8e-4424-b197-4c396d07da53",
    "ad2a2130-82ff-4ac9-b31f-84ecee01e68a",
]

# Orphan offers from the audit
ORPHAN_OFFER_IDS = [
    "54edb4c4-4968-4f06-a58d-ecfbfa907b6c",  # Summar Sales
    "31dbd3bf-0986-4b43-ad77-8bd21249c8d6",  # Wonderful Offer Zone
    "07687bc9-2507-4cab-b894-6556c02ebe1a",  # Carestream CS 2200
    "97344a7a-de84-4e7a-8c23-6cfd922b9b33",  # 3M Filtek Z250
    "513dcfe9-8e65-4b1a-80d6-ae2638634775",  # NSK Pana-Max Plus
    "ce7772fc-a042-4fde-936b-5b8e4a77311a",  # Woodpecker LED.F
    "f760e134-7677-41f8-a66b-88686248c26c",  # TEST FAAZO OFFER
]

# Search terms to match orphan offers against real products
ORPHAN_SEARCH_TERMS = {
    "54edb4c4-4968-4f06-a58d-ecfbfa907b6c": ["summar", "sales"],
    "31dbd3bf-0986-4b43-ad77-8bd21249c8d6": ["wonderful", "offer", "zone"],
    "07687bc9-2507-4cab-b894-6556c02ebe1a": ["carestream", "cs 2200", "intraoral", "x-ray"],
    "97344a7a-de84-4e7a-8c23-6cfd922b9b33": ["3m filtek", "filtek", "z250", "restorative"],
    "513dcfe9-8e65-4b1a-80d6-ae2638634775": ["nsk pana", "pana-max", "pana max", "handpiece"],
    "ce7772fc-a042-4fde-936b-5b8e4a77311a": ["woodpecker", "curing light", "scaler"],
    "f760e134-7677-41f8-a66b-88686248c26c": ["test", "faazo"],
}


class Command(BaseCommand):
    help = "Classify orphan offers and deactivate hp laptop test data. Use --apply to execute."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually apply changes. Without this flag, runs in dry-run mode.",
        )

    def handle(self, *args, **kwargs):
        apply = kwargs["apply"]
        W = self.stdout.write
        mode = "APPLY MODE" if apply else "DRY-RUN MODE (no changes made)"

        W("=" * 70)
        W(f"FAAZO OFFER CONFLICT RESOLUTION — {mode}")
        W(f"Time: {timezone.now()}")
        W("=" * 70)

        # ── STEP 1: Deactivate hp laptop test offers ─────────────────────────
        W("\n--- STEP 1: Deactivate 4 hp laptop test offers ---")
        W("ProductPricing.offer_price will NOT be touched.")

        hp_offers = LimitedTimeOffer.objects.filter(id__in=HP_LAPTOP_OFFER_IDS)
        W(f"Found {hp_offers.count()} of 4 expected hp laptop offers.")

        for offer in hp_offers:
            W(f"\n  Offer: '{offer.heading}' (id={offer.id})")
            W(f"  Current is_active = {offer.is_active}")
            W(f"  disc_price = {offer.discounted_price}")
            if apply:
                offer.is_active = False
                offer.save(update_fields=["is_active", "updated_at"])
                W("  -> DEACTIVATED (is_active=False). ProductPricing NOT touched.")
            else:
                W("  -> WOULD deactivate (dry-run).")

        # ── STEP 2: Classify orphan offers ───────────────────────────────────
        W("\n\n--- STEP 2: Classify 7 orphan offers against real products ---")

        orphan_offers = LimitedTimeOffer.objects.filter(id__in=ORPHAN_OFFER_IDS)
        W(f"Found {orphan_offers.count()} of 7 expected orphan offers.\n")

        clearly_dummy = []
        possible_real_match = []
        no_match_found = []

        for offer in orphan_offers:
            W(f"  Offer: '{offer.heading}' (id={offer.id})")
            W(f"  orig_price={offer.original_price} | disc_price={offer.discounted_price}")
            W(f"  is_active={offer.is_active}")

            search_terms = ORPHAN_SEARCH_TERMS.get(str(offer.id), [offer.heading.lower().split()[0]])

            # Try to find matching products
            matches = []
            for term in search_terms:
                found = Product.objects.filter(
                    name__icontains=term, is_deleted=False
                )
                for p in found:
                    if p not in matches:
                        matches.append(p)

            if offer.heading.lower() in ["test faazo offer", "wonderful offer zone", "summar sales"]:
                W(f"  CLASSIFICATION: CLEARLY DUMMY/TEST DATA")
                clearly_dummy.append(offer)
                if matches:
                    W(f"  (No meaningful product match attempted for dummy data.)")
            elif matches:
                W(f"  CLASSIFICATION: POSSIBLE REAL OFFER — found {len(matches)} matching product(s):")
                for p in matches[:3]:
                    pricing = getattr(p, "pricing", None)
                    W(f"    -> Product: '{p.name}' (id={p.id}) | "
                      f"MRP={pricing.mrp if pricing else 'N/A'} | "
                      f"Status={p.status}")
                possible_real_match.append((offer, matches))
            else:
                W(f"  CLASSIFICATION: POSSIBLE REAL OFFER — but NO matching product found in DB.")
                W("  (Products like Carestream, 3M, NSK, Woodpecker may not be in the catalogue yet.)")
                no_match_found.append(offer)

            W("")

        # Mark dummy orphans as inactive
        W("\n--- STEP 2b: Marking clearly dummy orphan offers as inactive ---")
        for offer in clearly_dummy:
            W(f"  '{offer.heading}' (id={offer.id}) — current is_active={offer.is_active}")
            if apply:
                offer.is_active = False
                offer.save(update_fields=["is_active", "updated_at"])
                W("  -> DEACTIVATED.")
            else:
                W("  -> WOULD deactivate (dry-run).")

        # Real orphans with no DB match — leave active but flag for admin action
        W("\n--- STEP 2c: Orphans representing real-seeming offers (no product match) ---")
        W("These offers reference real dental brands but have no product in the DB.")
        W("Recommendation: Link them to a product when that product is added to catalogue.")
        W("Action: Leave as-is. They are display-only CMS banners until linked.")
        for offer, _ in possible_real_match:
            W(f"  '{offer.heading}' — has product match candidate(s) above. Manual linking recommended.")
        for offer in no_match_found:
            W(f"  '{offer.heading}' — NO product match in DB. Leave as display-only banner.")

        # ── SUMMARY ──────────────────────────────────────────────────────────
        W("\n" + "=" * 70)
        W("RESOLUTION SUMMARY")
        W("=" * 70)
        W(f"  hp laptop test offers deactivated : {hp_offers.count()} {'(applied)' if apply else '(dry-run)'}")
        W(f"  Clearly dummy orphans deactivated  : {len(clearly_dummy)} {'(applied)' if apply else '(dry-run)'}")
        W(f"  Orphans with product match         : {len(possible_real_match)} (left as display-only; manual link needed)")
        W(f"  Orphans with NO product match      : {len(no_match_found)} (left as display-only CMS banners)")
        W(f"  ProductPricing.offer_price touched  : NEVER (preserved)")
        W("")
        if apply:
            W("Changes applied. Run `python manage.py audit_offers` to verify final state.")
        else:
            W("DRY RUN complete. Re-run with --apply to execute changes.")
        W("=" * 70)
