import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.homepage.models import DailyOffer, DailyOfferProduct
from apps.products.models import Product
from django.utils import timezone
from datetime import timedelta

def run():
    offer, created = DailyOffer.objects.get_or_create(
        title='Big Savings Today',
        defaults={
            'badge_text': '🔥 DAILY DEALS',
            'subheading': 'Limited-time deals on selected products.',
            'offer_text': 'UP TO 40% OFF',
            'secondary_text': 'Special clinical pricing while stocks last',
            'offer_type': 'percentage',
            'theme': 'red_hot',
            'bg_color': '#991B1B',
            'bg_gradient': 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 50%, #991B1B 100%)',
            'heading_color': '#FFFFFF',
            'description_color': '#FEE2E2',
            'badge_bg_color': '#FEF3C7',
            'badge_text_color': '#B45309',
            'offer_color': '#FDE047',
            'cta_bg_color': '#FBBF24',
            'cta_text_color': '#78350F',
            'cta_border_color': '#F59E0B',
            'countdown_bg_color': '#111827',
            'countdown_text_color': '#FFFFFF',
            'product_badge_color': '#DC2626',
            'horizontal_alignment': 'center',
            'vertical_alignment': 'center',
            'content_width': 'large',
            'countdown_enabled': True,
            'start_date': timezone.now(),
            'end_date': timezone.now() + timedelta(days=7, hours=8, minutes=24),
            'cta_text': "Shop Today's Deals →",
            'cta_action_type': 'url',
            'cta_url': '/daily-offers',
            'status': 'live',
            'is_active': True,
            'sort_order': 0,
        }
    )
    offer.cta_url = '/daily-offers'
    offer.cta_text = "Shop Today's Deals →"
    offer.save()
    print('DailyOffer id:', offer.id, 'created:', created)

    real_prods = list(Product.objects.filter(is_deleted=False, pricing__isnull=False)[:6])
    if not real_prods:
        real_prods = list(Product.objects.filter(is_deleted=False)[:6])

    offer.items.all().delete()
    for i, p in enumerate(real_prods):
        DailyOfferProduct.objects.create(
            daily_offer=offer,
            product=p,
            badge_override='HOT DEAL' if i % 2 == 0 else 'LIMITED DEAL',
            sort_order=i,
        )
    print(f'Successfully linked {len(real_prods)} real products to DailyOffer!')

if __name__ == '__main__':
    import os, django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()
    run()
