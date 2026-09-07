'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Truck, 
  Award, 
  Percent, 
  ArrowRight, 
  Filter, 
  Clock, 
  Tag, 
  Sparkles,
  ShoppingBag,
  RotateCcw,
  Building2,
  AlertTriangle,
  Zap,
  ExternalLink
} from 'lucide-react';
import { api, getAbsoluteImageUrl } from '@/lib/api';
import { useStore } from '@/contexts/StoreContext';

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
  const [offersList, setOffersList] = useState<OfferItem[]>(() => {
    if (initialOffersRaw && initialOffersRaw.length > 0) {
      return mapRawOffers(initialOffersRaw);
    }
    return [];
  });
  const [loading, setLoading] = useState(!initialOffersRaw || initialOffersRaw.length === 0);
  const [error, setError] = useState<string | null>(null);

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
      // Fetch directly from Django REST Framework API endpoint
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

  const heroOffer = useMemo(() => {
    if (offersList.length === 0) return null;
    return offersList.find(o => o.id !== featuredOffer?.id) || featuredOffer;
  }, [offersList, featuredOffer]);

  // Compute Dynamic Filters List
  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(offersList.map(o => o.category).filter(Boolean)));
    return ['All', ...cats];
  }, [offersList]);

  const availableOfferTypes = useMemo(() => {
    const types = Array.from(new Set(offersList.map(o => o.offerType).filter(Boolean)));
    return ['All', ...types];
  }, [offersList]);

  const availableBrands = useMemo(() => {
    const brands = Array.from(new Set(offersList.map(o => o.brand).filter(Boolean)));
    return ['All', ...brands];
  }, [offersList]);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedOfferType, setSelectedOfferType] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'highest-savings' | 'popular'>('popular');

  // Filtered & Sorted Offers list
  const filteredOffers = useMemo(() => {
    return offersList.filter(item => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (selectedOfferType !== 'All' && item.offerType !== selectedOfferType) return false;
      if (selectedBrand !== 'All' && item.brand !== selectedBrand) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'highest-savings') {
        const savingsA = a.originalPrice - a.discountedPrice;
        const savingsB = b.originalPrice - b.discountedPrice;
        return savingsB - savingsA;
      }
      if (sortBy === 'newest') {
        return a.id.localeCompare(b.id);
      }
      return (a.popularRank || 1) - (b.popularRank || 1);
    });
  }, [offersList, selectedCategory, selectedOfferType, selectedBrand, sortBy]);

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

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSelectedOfferType('All');
    setSelectedBrand('All');
    setSortBy('popular');
  };

  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen text-slate-800 font-sans text-left pt-[116px] lg:pt-[180px] pb-24 select-none">
      
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. HERO SECTION (Compact Height & Dynamic Hero Content) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="w-full bg-[#E2EAD9] bg-gradient-to-r from-[#D9E3D0] via-[#E5ECE0] to-[#DAE4D2] border-b border-[#6E8154]/20 py-6 lg:py-8 px-6 lg:px-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
          
          {/* Text Content (Dynamic from Page Content CMS) */}
          <div className="lg:col-span-7 space-y-3">
            {pageContent.hero_badge && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#006670]/10 border border-[#006670]/20 text-[#006670] text-[11px] font-black tracking-wider uppercase">
                <Sparkles className="w-3 h-3" />
                <span>{pageContent.hero_badge}</span>
              </div>
            )}

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight font-display">
              {pageContent.hero_title || 'Special Offers'}
            </h1>

            {pageContent.hero_description && (
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-xl">
                {pageContent.hero_description}
              </p>
            )}

            <div className="pt-1 flex flex-wrap items-center gap-3">
              <a
                href="#offers-catalog"
                className="px-5 py-2.5 rounded-full bg-[#006670] hover:bg-[#004e56] text-white font-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-sm hover:shadow hover:-translate-y-0.5 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>{pageContent.hero_cta_text || 'Explore Offers'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>

              {pageContent.hero_trust_text && (
                <span className="text-[11px] font-bold text-slate-600">
                  {pageContent.hero_trust_text}
                </span>
              )}
            </div>
          </div>

          {/* Hero Banner Visual Card (Compact Dynamic Featured Offer) */}
          <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
            {loading ? (
              <div className="w-full max-w-md bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200/80 shadow-lg animate-pulse">
                <div className="w-full h-36 sm:h-40 bg-slate-100 rounded-xl mb-3" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                    <div className="h-4 bg-slate-100 rounded w-1/4" />
                  </div>
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                    <div className="h-6 bg-slate-100 rounded w-1/3" />
                    <div className="h-7 bg-slate-100 rounded-lg w-1/3" />
                  </div>
                </div>
              </div>
            ) : featuredOffer ? (
              <div className="w-full max-w-md bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200/80 shadow-lg relative overflow-hidden transition-all duration-300 hover:shadow-xl">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#006670]/5 rounded-full blur-xl pointer-events-none" />
                
                {/* Dynamic Image Area */}
                <div className="w-full h-36 sm:h-40 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden mb-3 relative border border-slate-100 shadow-inner">
                  {featuredOffer.image ? (
                    <img 
                      src={getAbsoluteImageUrl(featuredOffer.image)} 
                      alt={featuredOffer.title} 
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLElement).classList.remove('object-cover');
                        (e.target as HTMLElement).classList.add('object-contain', 'p-3');
                      }}
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
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full shrink-0">
                        {featuredOffer.savingsText}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg sm:text-xl font-black text-[#006670] font-display">
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
            ) : (
              <div className="w-full max-w-md bg-white/70 border border-dashed border-slate-300 rounded-2xl p-6 text-center flex flex-col items-center justify-center space-y-1.5">
                <Sparkles className="w-6 h-6 text-[#006670]/40" />
                <h4 className="text-xs font-bold text-slate-700">Clinical Special Offers</h4>
                <p className="text-[11px] text-slate-500">Explore our promotional deals and discounts below</p>
              </div>
            )}
          </div>

        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-12" id="offers-catalog">
        
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 2. FEATURED OFFER SHOWCASE CARD (100% Dynamic from Backend) */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {featuredOffer && (
          <section className="mb-16">
            <div className="w-full bg-white rounded-[32px] border border-slate-200/80 p-6 lg:p-10 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#006670]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Product Image */}
                <div className="lg:col-span-5 relative">
                  <div className="bg-slate-50 rounded-2xl p-6 flex items-center justify-center h-72 lg:h-80 relative overflow-hidden">
                    <Image 
                      src={featuredOffer.image || '/images/featured_digital_equipment.jpg'} 
                      alt={featuredOffer.title} 
                      fill
                      sizes="400px"
                      className="object-contain p-4"
                    />
                  </div>
                  <span className="absolute -top-3.5 left-4 bg-emerald-600 text-white text-[10.5px] font-extrabold px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1.5 animate-pulse z-20 border-2 border-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
                    <span>{featuredOffer.badge || 'Limited time offer'}</span>
                  </span>
                </div>

                {/* Offer Details */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-[#006670]/10 text-[#006670] text-xs font-bold uppercase tracking-wider">
                      {featuredOffer.category || 'Special Offer Package'}
                    </span>
                    {featuredOffer.validityText && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{featuredOffer.validityText}</span>
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-display">
                    {featuredOffer.title}
                  </h2>

                  {featuredOffer.description && (
                    <p className="text-xs lg:text-sm text-slate-600 leading-relaxed font-medium">
                      {featuredOffer.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Brand</span>
                      <span className="text-xs font-extrabold text-[#006670]">
                        {featuredOffer.brand || 'FAAZO Certified'}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Warranty</span>
                      <span className="text-xs font-extrabold text-slate-800">Manufacturer Direct</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Verification</span>
                      <span className="text-xs font-extrabold text-emerald-600">100% Genuine</span>
                    </div>
                  </div>

                  {/* Price & CTA */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
                    <div 
                      onClick={() => handleBuyNow(featuredOffer)}
                      className="cursor-pointer group/price"
                      title="Click to Buy Now"
                    >
                      <div className="flex items-baseline gap-3">
                        <span className="text-2xl lg:text-3xl font-black text-[#006670] group-hover/price:text-[#004e56] font-display transition-colors">
                          ₹{featuredOffer.discountedPrice.toLocaleString('en-IN')}
                        </span>
                        {featuredOffer.originalPrice > featuredOffer.discountedPrice && (
                          <span className="text-sm text-slate-400 line-through font-semibold">
                            ₹{featuredOffer.originalPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      {featuredOffer.savingsText && (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block mt-1 group-hover/price:bg-emerald-100 transition-colors">
                          {featuredOffer.savingsText}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => handleAddToCart(featuredOffer)}
                        className="px-5 py-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-sm hover:shadow inline-flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4 text-[#006670]" />
                        <span>Add to Cart</span>
                      </button>

                      <button
                        onClick={() => handleBuyNow(featuredOffer)}
                        className="px-6 py-3.5 rounded-full bg-[#006670] hover:bg-[#004e56] text-white font-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-lg inline-flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
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
        {/* 3. DYNAMIC FILTER & SORT BAR */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="mb-10 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm">
              <Filter className="w-4 h-4 text-[#006670]" />
              <span>Filter Special Offers</span>
              <span className="text-xs font-bold text-slate-400 ml-1">
                ({filteredOffers.length} {filteredOffers.length === 1 ? 'Offer' : 'Offers'} Found)
              </span>
            </div>

            {/* Sort options */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] cursor-pointer"
              >
                <option value="popular">Popular Offers</option>
                <option value="highest-savings">Highest Savings</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>

          {/* Dynamic Filter Selects */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Dynamic Category Filter */}
            <div>
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] cursor-pointer"
              >
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'All' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Offer Type Filter */}
            <div>
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                Offer Type
              </label>
              <select
                value={selectedOfferType}
                onChange={(e) => setSelectedOfferType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] cursor-pointer"
              >
                {availableOfferTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'All' ? 'All Offer Types' : type}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Brand Filter */}
            <div>
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                Brand
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] cursor-pointer"
              >
                {availableBrands.map(b => (
                  <option key={b} value={b}>
                    {b === 'All' ? 'All Brands' : b}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 4. OFFERS GRID */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {loading ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-14">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs animate-pulse space-y-3">
                <div className="w-full h-48 bg-slate-100 rounded-xl" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-8 bg-slate-100 rounded-xl mt-3" />
              </div>
            ))}
          </section>
        ) : error ? (
          <section className="bg-white rounded-3xl border border-rose-200/80 p-12 text-center my-12 shadow-sm space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Unable to Load Offers</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">{error}</p>
            <button
              onClick={fetchOffers}
              className="px-5 py-2.5 rounded-full bg-[#006670] hover:bg-[#004e56] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </section>
        ) : filteredOffers.length > 0 ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-14">
            {filteredOffers.map((offer) => (
              <div 
                key={offer.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:shadow-lg hover:border-[#006670]/40 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  {/* Top Image Box (2/3 of Card Container) */}
                  <div className="relative mb-3">
                    <div className="w-full h-64 sm:h-72 bg-slate-50 rounded-xl flex items-center justify-center relative overflow-hidden">
                      {offer.image ? (
                        <img 
                          src={getAbsoluteImageUrl(offer.image)} 
                          alt={offer.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLElement).classList.remove('object-cover');
                            (e.target as HTMLElement).classList.add('object-contain', 'p-3');
                          }}
                        />
                      ) : (
                        <Tag className="w-10 h-10 text-slate-300" />
                      )}

                      {offer.brand && (
                        <span className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-md text-slate-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-slate-200/80 shadow-xs z-10">
                          {offer.brand}
                        </span>
                      )}
                    </div>

                    {/* Premium Badge Floating Above Image */}
                    <span className="absolute -top-2.5 left-3 bg-emerald-600 text-white text-[9.5px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border border-white z-20 animate-pulse">
                      {offer.badge}
                    </span>
                  </div>

                  {/* Offer Info (1/3 of Card Container) */}
                  <div className="space-y-1 mb-2">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">
                      {offer.category}
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug group-hover:text-[#006670] transition-colors line-clamp-1">
                      {offer.title}
                    </h3>
                  </div>
                </div>

                {/* Pricing & CTA */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black text-[#006670] font-display">
                          ₹{offer.discountedPrice.toLocaleString('en-IN')}
                        </span>
                        {offer.originalPrice > offer.discountedPrice && (
                          <span className="text-[11px] text-slate-400 line-through font-semibold">
                            ₹{offer.originalPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      {offer.savingsText && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                          {offer.savingsText}
                        </span>
                      )}
                    </div>
                  </div>

                  {offer.validityText && (
                    <div className="flex items-center text-[10px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1 truncate">
                        <Clock className="w-3 h-3 text-[#006670] shrink-0" />
                        <span className="truncate">{offer.validityText}</span>
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleAddToCart(offer)}
                      className="py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-[#006670]" />
                      <span>Add</span>
                    </button>

                    <button
                      onClick={() => handleBuyNow(offer)}
                      className="py-2 rounded-xl bg-[#006670] hover:bg-[#004e56] text-white text-[11px] font-extrabold uppercase tracking-wider transition-all shadow-xs hover:shadow flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                      <span>Buy Now</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        ) : (
          /* ───────────────────────────────────────────────────────────────── */
          /* 5. EMPTY STATE */
          /* ───────────────────────────────────────────────────────────────── */
          <section className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center my-12 shadow-sm space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Tag className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">No Active Offers Found</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              No promotions currently match your selected filters. Please adjust your filters or reset to view all available clinical offers.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-5 py-2.5 rounded-full bg-[#006670] hover:bg-[#004e56] text-white text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </section>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 6. PROMOTIONAL INSET BANNER */}
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
        {/* 7. WHY SHOP DURING OFFERS (TRUST CARDS) */}
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
    </div>
  );
}
