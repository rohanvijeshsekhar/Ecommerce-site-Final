"""
FAAZO – Product Search & Filter Engine
=======================================

Provides FilterSet for product discovery:
- `q`: Case-insensitive text search across product name, SKU, brand, category (including full taxonomy path & descendants), description, and tags
- `brand`: Slug, name, or UUID filtering
- `category`: Slug, name, or UUID filtering (including child category descendants)
- `min_price`: Minimum selling price filter (GST-inclusive selling price)
- `max_price`: Maximum selling price filter (GST-inclusive selling price)
- `in_stock`: Availability filter (in_stock=true / in_stock=false)
- `is_featured`: Featured products filter

Note on Pricing:
Price filters operate on `pricing__selling_price` at the database level.
Dynamic offer prices (offer_price with active date ranges) are calculated at runtime
and are not filtered at DB level without schema changes.
"""

from decimal import Decimal
import django_filters
from django.db.models import Q, F

from .models import Product
from apps.categories.models import Category


class ProductFilterSet(django_filters.FilterSet):
    q = django_filters.CharFilter(method="filter_q", label="Search query")
    brand = django_filters.CharFilter(method="filter_brand", label="Brand (slug, name, or ID)")
    category = django_filters.CharFilter(method="filter_category", label="Category (slug, name, or ID)")
    min_price = django_filters.NumberFilter(field_name="pricing__selling_price", lookup_expr="gte", label="Min Price")
    max_price = django_filters.NumberFilter(field_name="pricing__selling_price", lookup_expr="lte", label="Max Price")
    in_stock = django_filters.BooleanFilter(method="filter_in_stock", label="In Stock Only")
    is_featured = django_filters.BooleanFilter(field_name="is_featured", label="Featured")

    class Meta:
        model = Product
        fields = ["q", "brand", "category", "min_price", "max_price", "in_stock", "is_featured"]

    def filter_q(self, queryset, name, value):
        if not value or not value.strip():
            return queryset
        q_str = value.strip()
        words = [w for w in q_str.split() if len(w) > 1]

        # Collect category IDs whose full path or name matches the search query or query words
        cat_ids = set()
        q_lower = q_str.lower()
        q_stemmed = q_lower[:-1] if q_lower.endswith("s") and len(q_lower) > 3 else q_lower

        for cat in Category.objects.all():
            full_cat_str = cat.full_path.lower()

            matches_full = q_lower in full_cat_str or q_stemmed in full_cat_str
            matches_all_words = False
            if words:
                matches_all_words = all(
                    (
                        w.lower() in full_cat_str
                        or (
                            w.lower()[:-1] in full_cat_str
                            if w.lower().endswith("s") and len(w) > 3
                            else False
                        )
                    )
                    for w in words
                )

            if matches_full or matches_all_words:
                for desc in cat.get_descendants(include_self=True):
                    cat_ids.add(desc.id)

        # Build product filter condition
        q_obj = (
            Q(category_id__in=cat_ids)
            | Q(name__icontains=q_str)
            | Q(sku__icontains=q_str)
            | Q(short_description__icontains=q_str)
            | Q(long_description__icontains=q_str)
            | Q(brand__name__icontains=q_str)
            | Q(tags__icontains=q_str)
        )

        # Handle simple trailing 's' singular/plural stemming
        if (q_str.endswith("s") or q_str.endswith("S")) and len(q_str) > 3:
            sq = q_str[:-1]
            q_obj |= (
                Q(name__icontains=sq)
                | Q(sku__icontains=sq)
                | Q(short_description__icontains=sq)
                | Q(long_description__icontains=sq)
                | Q(brand__name__icontains=sq)
                | Q(tags__icontains=sq)
            )

        # For multi-word queries, also match when words appear across fields
        if len(words) > 1:
            multi_word_q = Q()
            for word in words:
                word_stemmed = word[:-1] if (word.endswith("s") or word.endswith("S")) and len(word) > 3 else word
                multi_word_q &= (
                    Q(category_id__in=cat_ids)
                    | Q(name__icontains=word)
                    | Q(name__icontains=word_stemmed)
                    | Q(sku__icontains=word)
                    | Q(short_description__icontains=word)
                    | Q(short_description__icontains=word_stemmed)
                    | Q(brand__name__icontains=word)
                    | Q(tags__icontains=word)
                )
            q_obj |= multi_word_q

        return queryset.filter(q_obj).distinct()

    def filter_brand(self, queryset, name, value):
        if not value or not value.strip():
            return queryset
        val = value.strip()
        return queryset.filter(
            Q(brand__slug__iexact=val)
            | Q(brand__name__iexact=val)
            | Q(brand__id__iexact=val if len(val) == 36 else "00000000-0000-0000-0000-000000000000")
        )

    def filter_category(self, queryset, name, value):
        if not value or not value.strip():
            return queryset
        val = value.strip()

        categories = Category.objects.filter(
            Q(slug__iexact=val)
            | Q(name__iexact=val)
            | Q(id__iexact=val if len(val) == 36 else "00000000-0000-0000-0000-000000000000")
        )

        if not categories.exists():
            return queryset.none()

        cat_ids = set()
        for cat in categories:
            for desc in cat.get_descendants(include_self=True):
                cat_ids.add(desc.id)

        return queryset.filter(category_id__in=cat_ids)

    def filter_in_stock(self, queryset, name, value):
        if value is True:
            return queryset.filter(
                Q(inventory__allow_backorders=True)
                | Q(inventory__current_stock__gt=F("inventory__reserved_stock"))
                | Q(inventory__isnull=True)
            )
        elif value is False:
            return queryset.filter(
                inventory__allow_backorders=False,
                inventory__current_stock__lte=F("inventory__reserved_stock"),
            )
        return queryset
