'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  CheckCircle2,
  ShieldCheck,
  Truck,
  Award,
  Percent,
  ArrowRight,
  Clock,
  Tag,
  Sparkles,
  ShoppingBag,
  RotateCcw,
  Building2,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { api, getAbsoluteImageUrl } from '@/lib/api';
import { useStore } from '@/contexts/StoreContext';
import ListingToolbar, { SortOption } from './listing/ListingToolbar';
import ActiveFilterChips from './listing/ActiveFilterChips';
import ListingFilterSidebar, { FilterItemOption } from './listing/ListingFilterSidebar';
import ListingFilterDrawer from './listing/ListingFilterDrawer';

interface OfferItem {
  id: string;
  productId?: string;
  productSlug?: string;
  productSku?: string;
  stockQuantity?: number;
  title: string;
  badge: string;
  category: string;
  brand: string;
  offerType: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  savingsText: string;
  validityText: string;
  image: string;
  popularRank: number;
  isFeatured?: boolean;
}

interface OffersPageProps {
  initialPageContent?: {
    hero_badge?: string;
    hero_title?: string;
    hero_description?: string;
    hero_cta_text?: string;
    hero_trust_text?: string;
  } | null;
  initialOffersRaw?: any[];
  setCartItems?: React.Dispatch<React.SetStateAction<any[]>>;
  showToast?: (msg: string) => void;
}

const offerSortOptions: SortOption[] = [
  { value: 'rank', label: 'Featured / Best Offers' },
  { value: 'discount-desc', label: 'Discount: High to Low' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

function mapRawOffers(rawData: any[]): OfferItem[] {
  if (!Array.isArray(rawData)) return [];
  return rawData.map((item: any, idx: number) => {
    const orig = parseFloat(item.original_price || item.mrp || '0') || 0;
    const disc = parseFloat(item.discounted_price || item.offer_price || item.effective_price || '0') || 0;
    const diff = Math.max(0, orig - disc);
    const pct = orig > 0 ? Math.round((diff / orig) * 100) : 0;
    const savings = orig > disc ? `Save ₹${diff.toLocaleString('en-IN')} (${pct}% OFF)` : '';
    const validity = item.validity_text || (item.end_date
      ? `Valid until ${new Date(item.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : (item.offer_text || ''));

    return {
      id: String(item.id || `offer-${idx}`),
      productId: item.product || undefined,
      productSlug: item.product_slug || undefined,
      productSku: item.product_sku || undefined,
      stockQuantity: item.stock_quantity ?? undefined,
      title: item.heading || item.title || item.name || 'Special Offer',
      badge: item.badge || item.offer_text || 'Limited Time',
      category: item.category || '',
      brand: item.brand || '',
      offerType: item.badge || item.offer_type || 'Limited Time',
      description: item.description || item.subheading || '',
      originalPrice: orig,
      discountedPrice: disc,
      savingsText: item.savings_text || savings,
      validityText: validity,
      image: getAbsoluteImageUrl(item.image_url || item.banner_image || item.image) || '',
      popularRank: idx + 1,
      isFeatured: Boolean(item.is_featured),
    };
  });
}

export default function OffersPage({ initialPageContent, initialOffersRaw, setCartItems, showToast }: OffersPageProps) {
  const store = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [offersList, setOffersList] = useState<OfferItem[]>(() => {
    if (initialOffersRaw && initialOffersRaw.length > 0) {
      return mapRawOffers(initialOffersRaw);
    }
    return [];
  });
  const [loading, setLoading] = useState(!initialOffersRaw || initialOffersRaw.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // URL state
  const searchQuery = searchParams.get('q') || '';
  const selectedCategory = searchParams.get('category') || '';
  const brandParam = searchParams.get('brand') || '';
  const selectedBrands = useMemo(() => brandParam ? brandParam.split(',').filter(Boolean) : [], [brandParam]);
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';
  const inStockOnly = searchParams.get('in_stock') === 'true';
  const sortBy = searchParams.get('sort') || 'rank';

  const updateUrlParams = (updates: Record<string, string | null>) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === undefined) {
        p.delete(key);
      } else {
        p.set(key, value);
      }
    });
    const queryString = p.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
  };

  // Dynamic Special Offers Page Content (Hero CMS)
  const [pageContent, setPageContent] = useState<{
    hero_badge: string;
    hero_title: string;
    hero_description: string;
    hero_cta_text: string;
    hero_trust_text: string;
  }>({
    hero_badge: initialPageContent?.hero_badge || 'PROFESSIONAL CLINICAL SAVINGS',
    hero_title: initialPageContent?.hero_title || 'Special Offers',
    hero_description: initialPageContent?.hero_description !== undefined
      ? initialPageContent.hero_description
      : 'Discover exclusive deals, bundle offers and limited-time savings on premium certified dental equipment, imaging systems, and clinical consumables.',
    hero_cta_text: initialPageContent?.hero_cta_text || 'EXPLORE OFFERS',
    hero_trust_text: initialPageContent?.hero_trust_text || '✓ 100% Genuine Direct Import • Manufacturer Warranty',
  });

  const fetchPageContent = async () => {
    try {
      const res = await api.get('homepage/offers-page-content/');
      const data = res.data?.data ?? res.data;
      if (data && data.hero_title) {
        setPageContent({
          hero_badge: data.hero_badge || 'PROFESSIONAL CLINICAL SAVINGS',
          hero_title: data.hero_title || 'Special Offers',
          hero_description: data.hero_description !== undefined ? data.hero_description : '',
          hero_cta_text: data.hero_cta_text || 'EXPLORE OFFERS',
          hero_trust_text: data.hero_trust_text || '✓ 100% Genuine Direct Import • Manufacturer Warranty',
        });
      }
    } catch (err) {
      console.error('Failed to load offers page content:', err);
    }
  };

  const fetchOffers = async () => {
    try {
      const res = await api.get('homepage/offers/');
      const rawData = res.data?.data ?? res.data?.results ?? res.data ?? [];

      if (Array.isArray(rawData)) {
        setOffersList(mapRawOffers(rawData));
      } else {
        setOffersList([]);
      }
    } catch (err: any) {
      console.error('Failed to load offers from API:', err);
      setError('Failed to load promotional offers. Please check your connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageContent();
    fetchOffers();
  }, []);

  // Compute Dynamic Featured and Hero Deals
  const featuredOffer = useMemo(() => {
    return offersList.find(o => o.isFeatured) || (offersList.length > 0 ? offersList[0] : null);
  }, [offersList]);

  // Extract available categories & brands
  const { availableCategories, availableBrands } = useMemo(() => {
    const catMap = new Map<string, number>();
    const brandMap = new Map<string, number>();

    offersList.forEach((o) => {
      if (o.category) catMap.set(o.category, (catMap.get(o.category) || 0) + 1);
      if (o.brand) brandMap.set(o.brand, (brandMap.get(o.brand) || 0) + 1);
    });

    const categories: FilterItemOption[] = Array.from(catMap.entries()).map(([name, count]) => ({
      id: name,
      slug: name,
      name,
      count,
    }));

    const brands: FilterItemOption[] = Array.from(brandMap.entries()).map(([name, count]) => ({
      id: name,
      slug: name,
      name,
      count,
    }));

    return { availableCategories: categories, availableBrands: brands };
  }, [offersList]);

  // Filter and sort display offers
  const displayOffers = useMemo(() => {
    let list = [...offersList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o =>
        o.title.toLowerCase().includes(q) ||
        o.category.toLowerCase().includes(q) ||
        o.brand.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q)
      );
    }

    if (selectedCategory) {
      list = list.filter(o => o.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (selectedBrands.length > 0) {
      list = list.filter(o => selectedBrands.some(b => b.toLowerCase() === o.brand.toLowerCase()));
    }

    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) list = list.filter(o => o.discountedPrice >= min);
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) list = list.filter(o => o.discountedPrice <= max);
    }

    if (inStockOnly) {
      list = list.filter(o => (o.stockQuantity === undefined || o.stockQuantity > 0));
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'discount-desc') {
        const discA = a.originalPrice > 0 ? (a.originalPrice - a.discountedPrice) / a.originalPrice : 0;
        const discB = b.originalPrice > 0 ? (b.originalPrice - b.discountedPrice) / b.originalPrice : 0;
        return discB - discA;
      }
      if (sortBy === 'price-asc') return a.discountedPrice - b.discountedPrice;
      if (sortBy === 'price-desc') return b.discountedPrice - a.discountedPrice;
      // Default: Featured first, then rank
      if (a.isFeatured !== b.isFeatured) return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      return (a.popularRank || 1) - (b.popularRank || 1);
    });

    return list;
  }, [offersList, searchQuery, selectedCategory, selectedBrands, minPrice, maxPrice, inStockOnly, sortBy]);

  const activeFilterCount = (selectedCategory ? 1 : 0) +
    selectedBrands.length +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (searchQuery ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  const activeChips = useMemo(() => {
    const list: any[] = [];
    if (selectedCategory) {
      list.push({
        id: 'category',
        label: `Category: ${availableCategories.find(c => c.slug === selectedCategory)?.name || selectedCategory}`,
        type: 'category',
        onRemove: () => updateUrlParams({ category: null }),
      });
    }
    selectedBrands.forEach((bSlug) => {
      const bName = availableBrands.find(b => b.slug === bSlug)?.name || bSlug;
      list.push({
        id: `brand-${bSlug}`,
        label: `Brand: ${bName}`,
        type: 'brand',
        onRemove: () => handleToggleBrand(bSlug),
      });
    });
    if (minPrice || maxPrice) {
      list.push({
        id: 'price',
        label: `₹${minPrice || '0'} - ₹${maxPrice || '∞'}`,
        type: 'price',
        onRemove: () => updateUrlParams({ min_price: null, max_price: null }),
      });
    }
    if (inStockOnly) {
      list.push({
        id: 'stock',
        label: 'In Stock Only',
        type: 'stock',
        onRemove: () => updateUrlParams({ in_stock: null }),
      });
    }
    if (searchQuery) {
      list.push({
        id: 'search',
        label: `"${searchQuery}"`,
        type: 'other',
        onRemove: () => updateUrlParams({ q: null }),
      });
    }
    return list;
  }, [selectedCategory, availableCategories, selectedBrands, availableBrands, minPrice, maxPrice, inStockOnly, searchQuery]);

  const handleClearAll = () => {
    updateUrlParams({
      q: null,
      category: null,
      brand: null,
      min_price: null,
      max_price: null,
      in_stock: null,
    });
  };

  const handleToggleBrand = (brandSlug: string) => {
    let next: string[];
    if (selectedBrands.includes(brandSlug)) {
      next = selectedBrands.filter((b) => b !== brandSlug);
    } else {
      next = [...selectedBrands, brandSlug];
    }
    updateUrlParams({ brand: next.length > 0 ? next.join(',') : null });
  };

  const handleAddToCart = (offer: OfferItem) => {
    const item = {
      id: offer.productId || offer.id,
      name: offer.title,
      category: offer.category,
      price: offer.discountedPrice,
      qty: 1,
      image: offer.image,
      originalPrice: offer.originalPrice,
      sku: offer.productSku,
    };
    if (store?.addItemToCart) {
      store.addItemToCart(item);
    } else if (setCartItems) {
      setCartItems(prev => {
        const existing = prev.find(i => i.id === item.id);
        if (existing) {
          return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
        }
        return [...prev, item];
      });
    }
    if (showToast) {
      showToast(`Added "${offer.title}" to cart!`);
    } else if (store?.showToast) {
      store.showToast(`Added "${offer.title}" to cart!`);
    }
  };

  const handleBuyNow = (offer: OfferItem) => {
    const item = {
      id: offer.productId || offer.id,
      name: offer.title,
      category: offer.category,
      price: offer.discountedPrice,
      qty: 1,
      image: offer.image,
      originalPrice: offer.originalPrice,
      sku: offer.productSku,
    };
    if (store?.handleBuyNowDirect) {
      store.handleBuyNowDirect(item);
    } else {
      handleAddToCart(offer);
    }
  };

  // Clean dynamic text to ensure professional rendering
  const cleanHeroTitle = (pageContent.hero_title || 'Special Offers').replace(/Offerss/gi, 'Offers');
  const cleanHeroDesc = (pageContent.hero_description || '').replace(/\.hmm$/gi, '');
  const cleanHeroTrust = (pageContent.hero_trust_text || '✓ 100% Genuine Direct Import • Manufacturer Warranty').replace(/, yes$/gi, '');

  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen text-slate-800 font-sans text-left pt-[108px] lg:pt-[176px] pb-24 select-none">

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. HERO SECTION (Compact Height & Clean Responsive Layout) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="w-full bg-[#E2EAD9] bg-gradient-to-r from-[#D9E3D0] via-[#E5ECE0] to-[#DAE4D2] border-b border-[#6E8154]/20 py-4 sm:py-7 px-4 sm:px-6 lg:px-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-center relative z-10">

          {/* Text Content */}
          <div className="lg:col-span-7 space-y-2 sm:space-y-3 text-left">
            {pageContent.hero_badge && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#006670]/10 border border-[#006670]/20 text-[#006670] text-[10px] sm:text-[11px] font-black tracking-wider uppercase">
                <Sparkles className="w-3 h-3" />
                <span>{pageContent.hero_badge}</span>
              </div>
            )}

            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight font-display">
              {cleanHeroTitle}
            </h1>

            {cleanHeroDesc && (
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-xl">
                {cleanHeroDesc}
              </p>
            )}

            <div className="pt-0.5 flex flex-wrap items-center gap-2.5 sm:gap-3">
              <a
                href="#offers-catalog"
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-[#006670] hover:bg-[#004e56] text-white font-extrabold text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-300 shadow-sm hover:shadow hover:-translate-y-0.5 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>{pageContent.hero_cta_text || 'Explore Offers'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>

              {cleanHeroTrust && (
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-600">
                  {cleanHeroTrust}
                </span>
              )}
            </div>
          </div>

          {/* Hero Banner Visual Card (Desktop Only) */}
          <div className="hidden lg:flex lg:col-span-5 relative justify-end">
            {loading ? (
              <div className="w-full max-w-md bg-white rounded-2xl p-4 border border-slate-200/80 shadow-lg animate-pulse">
                <div className="w-full h-36 bg-slate-100 rounded-xl mb-3" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
            ) : featuredOffer ? (
              <div className="w-full max-w-md bg-white rounded-2xl p-4 border border-slate-200/80 shadow-lg relative overflow-hidden transition-all duration-300 hover:shadow-xl">
                <div className="w-full h-36 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden mb-3 relative border border-slate-100 shadow-inner">
                  {featuredOffer.image ? (
                    <img
                      src={getAbsoluteImageUrl(featuredOffer.image)}
                      alt={featuredOffer.title}
                      className="w-full h-full object-contain p-2 transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <Tag className="w-8 h-8 mb-1" />
                      <span className="text-[10px] font-bold">Featured Offer</span>
                    </div>
                  )}
                  <span className="absolute top-2.5 left-2.5 bg-[#006670] text-white text-[9.5px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm z-10">
                    {featuredOffer.badge || 'LIMITED TIME'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate leading-snug">{featuredOffer.title}</h4>
                      <p className="text-[10.5px] text-slate-500 font-medium truncate mt-0.5">
                        {featuredOffer.validityText || 'Valid while stock lasts • Limited Units'}
                      </p>
                    </div>
                    {featuredOffer.savingsText && (
                      <span className="text-[10px] font-extrabold text-[#006670] bg-[#E6F2F2] border border-[#006670]/20 px-2 py-0.5 rounded-full shrink-0">
                        {featuredOffer.savingsText}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-[#006670] font-display">
                        ₹{featuredOffer.discountedPrice.toLocaleString('en-IN')}
                      </span>
                      {featuredOffer.originalPrice > featuredOffer.discountedPrice && (
                        <span className="text-[11px] text-slate-400 line-through font-semibold">
                          ₹{featuredOffer.originalPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleAddToCart(featuredOffer)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#006670] hover:bg-[#004e56] text-white text-[11px] font-black uppercase tracking-wider transition-all shadow-xs hover:shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10" id="offers-catalog">

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 2. FEATURED OFFER SHOWCASE CARD */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {featuredOffer && (
          <section className="mb-6 sm:mb-10 w-full overflow-hidden">
            <div className="w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-3.5 sm:p-6 lg:p-8 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#006670]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-center">
                <div className="lg:col-span-5 relative w-full">
                  <div className="bg-slate-50 rounded-xl sm:rounded-2xl h-52 sm:h-64 lg:h-80 w-full relative overflow-hidden border border-slate-100 shadow-inner">
                    {featuredOffer.image ? (
                      <img
                        src={getAbsoluteImageUrl(featuredOffer.image)}
                        alt={featuredOffer.title}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Tag className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                  <span className="absolute -top-2 left-2.5 bg-[#006670] text-white text-[8.5px] sm:text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1 z-20 border-2 border-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
                    <span>{featuredOffer.badge || 'Limited time offer'}</span>
                  </span>
                </div>

                <div className="lg:col-span-7 space-y-2 sm:space-y-3.5 min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E6F2F2] text-[#006670] text-[9.5px] sm:text-xs font-extrabold uppercase tracking-wider">
                      {featuredOffer.category || 'Special Offer Package'}
                    </span>
                    {featuredOffer.validityText && (
                      <span className="flex items-center gap-1 text-[9.5px] sm:text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate max-w-[200px] sm:max-w-none">{featuredOffer.validityText}</span>
                      </span>
                    )}
                  </div>

                  <h2 className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight font-display leading-snug break-words">
                    {featuredOffer.title}
                  </h2>

                  {featuredOffer.description && (
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium line-clamp-2 sm:line-clamp-none break-all sm:break-words">
                      {featuredOffer.description}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 py-1">
                    <div className="bg-slate-50 border border-slate-100 rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 text-center sm:text-left min-w-0">
                      <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase block truncate">Brand</span>
                      <span className="text-[10px] sm:text-xs font-black text-[#006670] truncate block">
                        {featuredOffer.brand || 'FAAZO'}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 text-center sm:text-left min-w-0">
                      <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase block truncate">Warranty</span>
                      <span className="text-[10px] sm:text-xs font-extrabold text-slate-800 truncate block">Manufacturer</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 text-center sm:text-left min-w-0">
                      <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase block truncate">Verification</span>
                      <span className="text-[10px] sm:text-xs font-black text-[#006670] truncate block">100% Genuine</span>
                    </div>
                  </div>

                  <div className="pt-2 sm:pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                    <div
                      onClick={() => handleBuyNow(featuredOffer)}
                      className="cursor-pointer group/price flex items-baseline justify-between sm:block"
                      title="Click to Buy Now"
                    >
                      <div className="flex items-baseline gap-1.5 sm:gap-3 flex-wrap">
                        <span className="text-lg sm:text-2xl lg:text-3xl font-black text-[#006670] group-hover/price:text-[#004e56] font-display transition-colors">
                          ₹{featuredOffer.discountedPrice.toLocaleString('en-IN')}
                        </span>
                        {featuredOffer.originalPrice > featuredOffer.discountedPrice && (
                          <span className="text-[11px] sm:text-sm text-slate-400 line-through font-semibold">
                            ₹{featuredOffer.originalPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      {featuredOffer.savingsText && (
                        <span className="text-[9.5px] sm:text-xs font-bold text-[#006670] bg-[#E6F2F2] px-2 py-0.5 rounded-md inline-block mt-0.5 sm:mt-1">
                          {featuredOffer.savingsText}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
                      <button
                        onClick={() => handleAddToCart(featuredOffer)}
                        className="py-2.5 sm:px-5 sm:py-3 rounded-xl sm:rounded-full bg-slate-100 hover:bg-[#E6F2F2] text-slate-800 hover:text-[#006670] font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-200 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-[#006670]" />
                        <span>Add to Cart</span>
                      </button>

                      <button
                        onClick={() => handleBuyNow(featuredOffer)}
                        className="py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-full bg-[#006670] hover:bg-[#004e56] text-white font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                        <span>Buy Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 3. OFFERS CATALOG WITH UNIFIED FILTER SIDEBAR & TOOLBAR */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start mb-16">
          {/* Desktop Filter Sidebar */}
          <ListingFilterSidebar
            categories={availableCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => updateUrlParams({ category: cat })}
            brands={availableBrands}
            selectedBrands={selectedBrands}
            onToggleBrand={handleToggleBrand}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onPriceChange={(min, max) => updateUrlParams({ min_price: min, max_price: max })}
            hideRatingFilter={true}
            inStockOnly={inStockOnly}
            onToggleInStock={() => updateUrlParams({ in_stock: inStockOnly ? null : 'true' })}
            hasActiveFilters={hasActiveFilters}
            onClearAll={handleClearAll}
            className="lg:col-span-1"
          />

          {/* Main Offers Grid Area */}
          <div className="lg:col-span-3 space-y-5">
            {/* Unified Toolbar */}
            <ListingToolbar
              totalCount={displayOffers.length}
              itemName="offers"
              sortValue={sortBy}
              onSortChange={(val) => updateUrlParams({ sort: val })}
              sortOptions={offerSortOptions}
              onOpenMobileFilters={() => setMobileFilterOpen(true)}
              activeFiltersCount={activeFilterCount}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            {/* Active Chips */}
            <ActiveFilterChips
              chips={activeChips}
              onClearAll={handleClearAll}
            />

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs animate-pulse space-y-2.5">
                    <div className="w-full h-32 sm:h-44 bg-slate-100 rounded-lg" />
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-7 bg-slate-100 rounded-lg mt-2" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-white rounded-2xl border border-rose-200/80 p-8 text-center shadow-xs space-y-3 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Unable to Load Offers</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{error}</p>
                <button
                  onClick={fetchOffers}
                  className="px-4 py-2 rounded-full bg-[#006670] hover:bg-[#004e56] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            ) : displayOffers.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                  <Tag className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">No Offers Match Your Filter</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
                  Try clearing or relaxing your selected filters to see more active promotions.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearAll}
                    className="px-5 py-2.5 rounded-full bg-[#006670] hover:bg-[#004e56] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span>Clear All Filters</span>
                  </button>
                )}
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5' : 'space-y-4'}>
                {displayOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-2.5 sm:p-3.5 shadow-2xs hover:shadow-md hover:border-[#006670]/40 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div>
                      {/* Top Image Box */}
                      <div className="relative mb-2 sm:mb-2.5">
                        <div className="w-full h-36 sm:h-48 md:h-52 bg-slate-100 rounded-lg sm:rounded-xl relative overflow-hidden">
                          {offer.image ? (
                            <img
                              src={getAbsoluteImageUrl(offer.image)}
                              alt={offer.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100">
                              <Tag className="w-8 h-8 text-slate-300" />
                            </div>
                          )}

                          {offer.brand && (
                            <span className="absolute bottom-1.5 right-1.5 bg-white/95 backdrop-blur-xs text-slate-700 text-[8.5px] sm:text-[9.5px] font-extrabold px-1.5 py-0.5 rounded border border-slate-200/80 shadow-2xs z-10">
                              {offer.brand}
                            </span>
                          )}
                        </div>

                        {/* Badge Floating Above Image */}
                        <span className="absolute -top-1.5 left-2 bg-[#006670] text-white text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs border border-white z-20">
                          {offer.badge}
                        </span>
                      </div>

                      {/* Offer Info */}
                      <div className="space-y-0.5 sm:space-y-1 mb-2">
                        <span className="text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider text-[#006670] block truncate">
                          {offer.category}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug group-hover:text-[#006670] transition-colors line-clamp-2 h-7 sm:h-9">
                          {offer.title}
                        </h3>
                      </div>
                    </div>

                    {/* Pricing & CTA */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 sm:space-y-2">
                      <div>
                        <div className="flex items-baseline gap-1 sm:gap-1.5 flex-wrap">
                          <span className="text-sm sm:text-base font-black text-[#006670] font-display">
                            ₹{offer.discountedPrice.toLocaleString('en-IN')}
                          </span>
                          {offer.originalPrice > offer.discountedPrice && (
                            <span className="text-[10px] sm:text-xs text-slate-400 line-through font-semibold">
                              ₹{offer.originalPrice.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        {offer.savingsText && (
                          <span className="text-[8.5px] sm:text-[9.5px] font-bold text-[#006670] bg-[#E6F2F2] px-1.5 py-0.5 rounded inline-block mt-0.5">
                            {offer.savingsText}
                          </span>
                        )}
                      </div>

                      {offer.validityText && (
                        <div className="flex items-center text-[9px] sm:text-[10px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1 truncate">
                            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#006670] shrink-0" />
                            <span className="truncate">{offer.validityText}</span>
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          onClick={() => handleAddToCart(offer)}
                          className="py-1.5 sm:py-2 rounded-lg bg-slate-100 hover:bg-[#E6F2F2] text-slate-700 hover:text-[#006670] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <ShoppingBag className="w-3 h-3 text-[#006670]" />
                          <span>Add</span>
                        </button>

                        <button
                          onClick={() => handleBuyNow(offer)}
                          className="py-1.5 sm:py-2 rounded-lg bg-[#006670] hover:bg-[#004e56] text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all shadow-2xs hover:shadow flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Zap className="w-3 h-3 fill-amber-300 text-amber-300" />
                          <span>Buy</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 4. PROMOTIONAL INSET BANNER */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="mb-16 rounded-3xl bg-gradient-to-r from-[#004D52] via-[#005F63] to-[#003B3E] p-8 lg:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl space-y-4 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-extrabold uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5" />
              <span>Clinic Setup Package</span>
            </div>

            <h3 className="text-2xl lg:text-3xl font-black tracking-tight font-display">
              Complete Clinic Setup Offers
            </h3>

            <p className="text-xs lg:text-sm text-slate-200 font-medium leading-relaxed max-w-xl">
              Save more when purchasing complete clinical operatory solutions. Customized B2B quotes with flexible payment plans & dedicated installation support.
            </p>

            <div className="pt-2">
              <Link
                href="/solutions/restorative-dentistry"
                className="px-6 py-3 rounded-full bg-white hover:bg-slate-100 text-[#004D52] font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-lg inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Explore Solutions</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 5. WHY SHOP DURING OFFERS (TRUST CARDS) */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="mb-16">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight font-display">
              Why Shop During FAAZO Promotions
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Uncompromising certified quality with complete official warranty backing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-center shadow-sm space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#006670]/10 text-[#006670] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-extrabold text-slate-800">Genuine Products</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-normal">
                100% direct certified manufacturer supply
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-center shadow-sm space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#006670]/10 text-[#006670] flex items-center justify-center mx-auto">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-extrabold text-slate-800">Manufacturer Warranty</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-normal">
                Official brand warranty & local servicing
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-center shadow-sm space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#006670]/10 text-[#006670] flex items-center justify-center mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-extrabold text-slate-800">Secure Payments</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-normal">
                Encrypted bank-grade SSL processing
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-center shadow-sm space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#006670]/10 text-[#006670] flex items-center justify-center mx-auto">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-extrabold text-slate-800">Fast Shipping</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-normal">
                Insured priority dispatch across India
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-center shadow-sm space-y-2 col-span-1 sm:col-span-2 lg:col-span-1">
              <div className="w-10 h-10 rounded-xl bg-[#006670]/10 text-[#006670] flex items-center justify-center mx-auto">
                <Percent className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-extrabold text-slate-800">Bulk Purchase Benefits</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-normal">
                Custom GST invoicing & dealer tier discounts
              </p>
            </div>

          </div>
        </section>

      </div>

      {/* Mobile Filter Drawer */}
      <ListingFilterDrawer
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        categories={availableCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => updateUrlParams({ category: cat })}
        brands={availableBrands}
        selectedBrands={selectedBrands}
        onToggleBrand={handleToggleBrand}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onPriceChange={(min, max) => updateUrlParams({ min_price: min, max_price: max })}
        hideRatingFilter={true}
        inStockOnly={inStockOnly}
        onToggleInStock={() => updateUrlParams({ in_stock: inStockOnly ? null : 'true' })}
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
        totalCount={displayOffers.length}
      />
    </div>
  );
}
