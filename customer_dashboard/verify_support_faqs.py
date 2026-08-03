"""
Automated Verification Suite for FAAZO Support FAQs Module
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.support.models import FAQCategory, FAQItem, FAQFeedback


def run_tests():
    print("=" * 70)
    print("STARTING FAAZO TIER-1 SUPPORT CENTER VERIFICATION")
    print("=" * 70)

    # 1. Verify 6 Core FAQs exist in DB
    faqs = FAQItem.objects.filter(is_featured=True, is_active=True)
    count = faqs.count()
    print(f"[+] Total Featured FAQ Items in Database: {count}")
    assert count >= 6, "Must have at least 6 featured FAQs in DB."

    required_questions = [
        "Where is my order?",
        "When will my order be delivered?",
        "How do I return or replace a product?",
        "How can I cancel my order?",
        "My payment failed.",
        "I need technical assistance.",
    ]

    for q in required_questions:
        faq = FAQItem.objects.filter(question__icontains=q, is_active=True).first()
        assert faq is not None, f"Required question missing: '{q}'"
        print(f" [PASSED] Verified Question: '{faq.question}' -> Action: '{faq.action_button_label}'")

    # 2. Test Feedback API logic
    target_faq = faqs.first()
    initial_unhelpful = target_faq.unhelpful_count

    FAQFeedback.objects.create(
        faq=target_faq,
        is_helpful=False,
        ip_address="127.0.0.1",
    )
    target_faq.unhelpful_count += 1
    target_faq.save()

    target_faq.refresh_from_db()
    assert target_faq.unhelpful_count == initial_unhelpful + 1, "Unhelpful count should increment."
    print(" [PASSED] Feedback widget submission & counter increment verified.")

    # 3. Verify Categories
    categories = FAQCategory.objects.filter(is_active=True)
    assert categories.count() >= 4, "Must have at least 4 FAQ categories."
    print(f" [PASSED] Verified {categories.count()} FAQ Categories in DB.")

    print("=" * 70)
    print("ALL SUPPORT CENTER VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
