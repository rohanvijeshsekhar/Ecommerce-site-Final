"""
FAAZO - Read-only audit of LimitedTimeOffer vs ProductPricing.
Usage: python manage.py audit_offers
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.homepage.models import LimitedTimeOffer
from collections import defaultdict


class Command(BaseCommand):
    help = "Read-only audit of LimitedTimeOffer vs ProductPricing (no data modified)"

    def handle(self, *args, **kwargs):
        W = self.stdout.write
        W("=" * 70)
        W("FAAZO SPECIAL OFFERS - READ-ONLY DATA AUDIT")
        W("Audit Time: " + str(timezone.now()))
        W("=" * 70)

        all_offers = LimitedTimeOffer.objects.select_related(
            "product", "product__pricing", "product__brand", "product__category"
        ).order_by("is_active", "-created_at")

        today = timezone.localdate()
        total = all_offers.count()
        no_product = 0
        no_pricing = 0
        price_mismatch = 0
        orig_vs_mrp_mismatch = 0
        already_has_offer_price = 0
        multiple_active_products = defaultdict(list)
        conflicts = []

        W(f"\nTotal LimitedTimeOffer records: {total}\n")
        W("-" * 70)
        W("DETAILED OFFER AUDIT")
        W("-" * 70)

        for offer in all_offers:
            prod = offer.product
            pricing = getattr(prod, "pricing", None) if prod else None

            # Compute date-based activity
            is_date_active = True
            if offer.start_date and timezone.localtime(offer.start_date).date() > today:
                is_date_active = False
            if offer.end_date and timezone.localtime(offer.end_date).date() < today:
                is_date_active = False

            effectively_active = offer.is_active and is_date_active

            W(f"\n  Offer ID         : {offer.id}")
            W(f"  Heading          : {offer.heading}")
            W(f"  is_active        : {offer.is_active}")
            W(f"  Start Date       : {offer.start_date}")
            W(f"  End Date         : {offer.end_date}")
            W(f"  Date-Active?     : {is_date_active}")
            W(f"  Effectively Active: {effectively_active}")
            W(f"  Offer orig_price : {offer.original_price}")
            W(f"  Offer disc_price : {offer.discounted_price}")

            if not prod:
                no_product += 1
                W("  [ISSUE] ORPHAN OFFER - no linked product.")
                conflicts.append(f"ORPHAN: '{offer.heading}' id={offer.id} has no linked product.")
                continue

            W(f"  Product ID       : {prod.id}")
            W(f"  Product Name     : {prod.name}")
            W(f"  Product Status   : {prod.status}")
            W(f"  Product Deleted  : {prod.is_deleted}")

            if not pricing:
                no_pricing += 1
                W("  [ISSUE] Product has NO ProductPricing record.")
                conflicts.append(
                    f"NO PRICING: '{prod.name}' (id={prod.id}) linked from "
                    f"offer '{offer.heading}' has no ProductPricing record."
                )
                continue

            W(f"  Pricing MRP           : {pricing.mrp}")
            W(f"  Pricing selling_price : {pricing.selling_price}")
            W(f"  Pricing offer_price   : {pricing.offer_price if pricing.offer_price else 'None'}")
            W(f"  Pricing offer_start   : {pricing.offer_start_date}")
            W(f"  Pricing offer_end     : {pricing.offer_end_date}")
            W(f"  Pricing effective_price: {pricing.effective_price}")
            W(f"  Pricing is_offer_active: {pricing.is_offer_active}")

            # Check: offer disc price vs ProductPricing effective price
            if offer.discounted_price and offer.discounted_price != pricing.effective_price:
                price_mismatch += 1
                W(f"  [MISMATCH] Offer shows {offer.discounted_price}, "
                  f"ProductPricing.effective_price = {pricing.effective_price}")
                conflicts.append(
                    f"PRICE MISMATCH: '{offer.heading}' disc_price={offer.discounted_price} "
                    f"vs '{prod.name}' effective_price={pricing.effective_price}"
                )

            # Check: offer original_price vs ProductPricing.mrp
            if offer.original_price and offer.original_price != pricing.mrp:
                orig_vs_mrp_mismatch += 1
                W(f"  [ORIG vs MRP] Offer original_price={offer.original_price}, "
                  f"ProductPricing.mrp={pricing.mrp}")
                conflicts.append(
                    f"ORIG vs MRP: '{offer.heading}' original_price={offer.original_price} "
                    f"!= '{prod.name}' ProductPricing.mrp={pricing.mrp}"
                )

            # Check if ProductPricing already has an offer_price
            if pricing.offer_price is not None:
                already_has_offer_price += 1
                W(f"  [EXISTING OFFER PRICE] ProductPricing.offer_price={pricing.offer_price} "
                  f"(is_offer_active={pricing.is_offer_active})")
                conflicts.append(
                    f"EXISTING OFFER PRICE: '{prod.name}' already has "
                    f"ProductPricing.offer_price={pricing.offer_price}. "
                    f"Migration would overwrite it."
                )

            if effectively_active:
                multiple_active_products[str(prod.id)].append({
                    "offer_id": str(offer.id),
                    "heading": offer.heading,
                    "disc_price": str(offer.discounted_price),
                })

        W("\n" + "=" * 70)
        W("MULTIPLE ACTIVE OFFERS PER PRODUCT (CONFLICT CHECK)")
        W("=" * 70)
        multi_found = False
        for prod_id, offer_list in multiple_active_products.items():
            if len(offer_list) > 1:
                multi_found = True
                W(f"\n  [CONFLICT] Product {prod_id} has {len(offer_list)} simultaneously active offers:")
                for o in offer_list:
                    W(f"    - Offer {o['offer_id']}: '{o['heading']}' @ {o['disc_price']}")
                conflicts.append(
                    f"MULTIPLE ACTIVE OFFERS: Product {prod_id} has {len(offer_list)} active offers."
                )
        if not multi_found:
            W("  [OK] No product has multiple simultaneously active offers.")

        W("\n" + "=" * 70)
        W("SUMMARY")
        W("=" * 70)
        W(f"  Total offers            : {total}")
        W(f"  Orphan (no product)     : {no_product}")
        W(f"  No ProductPricing       : {no_pricing}")
        W(f"  Price mismatches        : {price_mismatch}")
        W(f"  Orig vs MRP mismatches  : {orig_vs_mrp_mismatch}")
        W(f"  Already has offer_price : {already_has_offer_price}")
        W(f"  Total conflicts found   : {len(conflicts)}")

        W("\n" + "=" * 70)
        W("ALL CONFLICTS (REVIEW BEFORE MIGRATION)")
        W("=" * 70)
        if conflicts:
            for i, c in enumerate(conflicts, 1):
                W(f"  {i}. {c}")
        else:
            W("  [OK] No conflicts found. Data is clean for migration.")

        W("\n" + "=" * 70)
        W("MIGRATION SAFETY NOTES")
        W("=" * 70)
        if no_product > 0:
            W(f"  SKIP {no_product} orphan offer(s) - no product to link.")
        if no_pricing > 0:
            W(f"  SKIP {no_pricing} offer(s) whose product has no ProductPricing.")
        if already_has_offer_price > 0:
            W(f"  REVIEW {already_has_offer_price} product(s) that already have offer_price in ProductPricing.")
            W("    Manual decision required: prefer existing or incoming offer price?")
        if multi_found:
            W("  RESOLVE multiple-active-offer conflicts before migration.")
        if not conflicts:
            W("  Safe to proceed with migration.")

        W("\n" + "=" * 70)
        W("END OF AUDIT - NO DATA WAS MODIFIED")
        W("=" * 70 + "\n")
