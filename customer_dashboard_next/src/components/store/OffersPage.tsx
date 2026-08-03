'use client';

import React, { useState, useMemo } from 'react';
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
  Building2
} from 'lucide-react';

interface OfferItem {
  id: string;
  title: string;
  badge: 'Limited Time' | 'Bundle Offer' | 'Exclusive' | 'Best Value' | 'Buy More Save More';
  category: 'Handpieces' | 'Equipment' | 'Imaging' | 'Materials' | 'Endodontics';
  brand: string;
  offerType: 'Limited Time' | 'Bundle Offer' | 'Exclusive' | 'Best Value' | 'Buy More Save More';
  description: string;
  originalPrice: number;
  discountedPrice: number;
  savingsText: string;
  validityText: string;
  image: string;
  popularRank: number;
}

const MOCK_OFFERS: OfferItem[] = [
  {
    id: 'special-offer-1',
    title: 'Woodpecker LED.F Curing Light & Scaler Combo',
    badge: 'Bundle Offer',
    category: 'Equipment',
    brand: 'Woodpecker',
    offerType: 'Bundle Offer',
    description: 'High-intensity LED curing light paired with digital piezoelectric scaler for clinical operatory precision.',
    originalPrice: 18500,
    discountedPrice: 13800,
    savingsText: 'Save ₹4,700 (25% OFF)',
    validityText: 'Valid till end of month • 6 Units Left',
    image: '/images/combo_implants.png',
    popularRank: 1
  },
  {
    id: 'special-offer-2',
    title: 'NSK Pana-Max Plus High-Speed Handpiece (Pack of 3)',
    badge: 'Best Value',
    category: 'Handpieces',
    brand: 'NSK',
    offerType: 'Buy More Save More',
    description: 'Clean-head system with push-button chuck and micro-precision ceramic bearings for durability.',
    originalPrice: 24000,
    discountedPrice: 17900,
    savingsText: 'Save ₹6,100 (25% OFF)',
    validityText: 'Official NSK Warranty Included',
    image: '/images/handpiece_pro.png',
    popularRank: 2
  },
  {
    id: 'special-offer-3',
    title: '3M Filtek Z250 Universal Restorative Kit',
    badge: 'Exclusive',
    category: 'Materials',
    brand: '3M',
    offerType: 'Exclusive',
    description: 'Microhybrid composite resin syringes with Scotchbond universal adhesive primer kit.',
    originalPrice: 12800,
    discountedPrice: 9950,
    savingsText: 'Save ₹2,850 (22% OFF)',
    validityText: 'Certified 3M India Direct Stock',
    image: '/images/category_materials.png',
    popularRank: 3
  },
  {
    id: 'special-offer-4',
    title: 'Carestream CS 2200 Intraoral X-Ray Generator System',
    badge: 'Limited Time',
    category: 'Imaging',
    brand: 'Carestream',
    offerType: 'Limited Time',
    description: 'High-frequency 70kV generator with focal spot 0.4mm for ultra-sharp digital radiograph diagnostics.',
    originalPrice: 165000,
    discountedPrice: 138000,
    savingsText: 'Save ₹27,000 (16% OFF)',
    validityText: 'Includes Free On-Site Installation',
    image: '/images/category_imaging.png',
    popularRank: 4
  },
  {
    id: 'special-offer-5',
    title: 'Dentsply Sirona WaveOne Gold Endodontic Kit',
    badge: 'Bundle Offer',
    category: 'Endodontics',
    brand: 'Dentsply Sirona',
    offerType: 'Bundle Offer',
    description: 'Reciprocating NiTi files + paper points + obturator core package for root canal procedures.',
    originalPrice: 15400,
    discountedPrice: 11900,
    savingsText: 'Save ₹3,500 (23% OFF)',
    validityText: 'Limited Clinical Allocation',
    image: '/images/combo_restorative.png',
    popularRank: 5
  },
  {
    id: 'special-offer-6',
    title: 'Planmeca Emerald S Intraoral Scanner Package',
    badge: 'Exclusive',
    category: 'Imaging',
    brand: 'Planmeca',
    offerType: 'Exclusive',
    description: 'Ultra-fast 3D digital impression scanning system with laptop workstation and Romexis software.',
    originalPrice: 1450000,
    discountedPrice: 1290000,
    savingsText: 'Save ₹1,60,000 (11% OFF)',
    validityText: 'Includes 2-Year Comprehensive Warranty',
    image: '/images/hero_chair.png',
    popularRank: 6
  }
];

interface OffersPageProps {
  setCartItems?: React.Dispatch<React.SetStateAction<any[]>>;
  showToast?: (msg: string) => void;
}

export default function OffersPage({ setCartItems, showToast }: OffersPageProps) {
  const [offersList] = useState<OfferItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('faazo_admin_special_offers');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.filter((o: any) => o.isActive !== false).map((o: any, idx: number) => ({
              ...o,
              popularRank: idx + 1
            }));
          }
        } catch (e) { console.error(e); }
      }
    }
    return MOCK_OFFERS;
  });

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
    if (setCartItems) {
      setCartItems(prev => {
        const existing = prev.find(i => i.id === offer.id);
        if (existing) {
          return prev.map(i => i.id === offer.id ? { ...i, qty: i.qty + 1 } : i);
        }
        return [...prev, {
          id: offer.id,
          name: offer.title,
          category: offer.category,
          price: offer.discountedPrice,
          qty: 1,
          image: offer.image,
          originalPrice: offer.originalPrice
        }];
      });
    }
    if (showToast) {
      showToast(`Added "${offer.title}" to cart!`);
    }
  };

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSelectedOfferType('All');
    setSelectedBrand('All');
    setSortBy('popular');
  };

  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen text-slate-800 font-sans text-left pt-[100px] lg:pt-[135px] pb-24 select-none">
      
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. HERO SECTION (Light Olive Green Background Only) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="w-full bg-[#E2EAD9] bg-gradient-to-r from-[#D9E3D0] via-[#E5ECE0] to-[#DAE4D2] border-b border-[#6E8154]/20 py-12 lg:py-16 px-6 lg:px-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Text Content */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#006670]/10 border border-[#006670]/20 text-[#006670] text-xs font-black tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Professional Clinical Savings</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight font-display">
              Special Offers
            </h1>

            <p className="text-sm lg:text-base text-slate-600 font-medium leading-relaxed max-w-2xl">
              Discover exclusive deals, bundle offers and limited-time savings on premium certified dental equipment, imaging systems, and clinical consumables.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <a
                href="#offers-catalog"
                className="px-6 py-3.5 rounded-full bg-[#006670] hover:bg-[#004e56] text-white font-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Explore Offers</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <span className="text-xs font-bold text-slate-500">
                ✓ 100% Genuine Direct Import • Manufacturer Warranty
              </span>
            </div>
          </div>

          {/* Hero Banner Visual Card with Small Box Image */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#006670]/5 rounded-full blur-2xl pointer-events-none" />
              
              {/* Small Box Image Area */}
              <div className="w-full h-56 bg-white rounded-2xl flex items-center justify-center overflow-hidden mb-4 relative p-2 border border-slate-100 shadow-inner">
                <Image 
                  src="/images/hero_chair_banner.png" 
                  alt="Special Offers Operatory Setup" 
                  fill
                  sizes="400px"
                  className="object-contain p-1 transform hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 bg-[#006670] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm z-10">
                  Exclusive B2B Deal
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-800">Operatory Package</h4>
                  <p className="text-xs text-slate-500 font-medium">Save up to ₹70,000 on setups</p>
                </div>
                <span className="text-xs font-extrabold text-[#006670] bg-[#006670]/10 px-3 py-1.5 rounded-full">
                  Up to 25% OFF
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-12" id="offers-catalog">
        
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 2. FEATURED OFFER SHOWCASE CARD */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="mb-16">
          <div className="w-full bg-white rounded-[32px] border border-slate-200/80 p-6 lg:p-10 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#006670]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Product Image */}
              <div className="lg:col-span-5 bg-slate-50 rounded-2xl p-6 flex items-center justify-center h-72 lg:h-80 relative overflow-hidden">
                <Image 
                  src="/images/dental_chair_banner.png" 
                  alt="Featured Operatory Package" 
                  fill
                  sizes="400px"
                  className="object-contain p-4 transform hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-4 left-4 bg-emerald-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  Featured B2B Promotion
                </span>
              </div>

              {/* Offer Details */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-[#006670]/10 text-[#006670] text-xs font-bold uppercase tracking-wider">
                    Complete Clinic Setup
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Limited Clinical Allocation</span>
                  </span>
                </div>

                <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-display">
                  Complete Operatory Ergonomic Package
                </h2>

                <p className="text-xs lg:text-sm text-slate-600 leading-relaxed font-medium">
                  Equip your new or upgraded dental clinic with our flagship motorized chair, LED operating light, doctor stool, and built-in scaler package. Complete with certified installation & 3-year warranty.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Motorized Chair</span>
                    <span className="text-xs font-extrabold text-slate-800">Programmable 3-Memory</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Warranty</span>
                    <span className="text-xs font-extrabold text-slate-800">3-Year Comprehensive</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Installation</span>
                    <span className="text-xs font-extrabold text-emerald-600">Free On-Site Setup</span>
                  </div>
                </div>

                {/* Price & CTA */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl lg:text-3xl font-black text-[#006670] font-display">
                        ₹3,15,000
                      </span>
                      <span className="text-sm text-slate-400 line-through font-semibold">
                        ₹3,85,000
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block mt-1">
                      Save ₹70,000 (18% OFF)
                    </span>
                  </div>

                  <Link
                    href="/solutions/restorative-dentistry"
                    className="px-6 py-3.5 rounded-full bg-slate-900 hover:bg-[#006670] text-white font-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-lg inline-flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <span>View Featured Package</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 3. FILTER & SORT BAR */}
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

          {/* Filter Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Category Filter */}
            <div>
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] cursor-pointer"
              >
                <option value="All">All Categories</option>
                <option value="Handpieces">Handpieces</option>
                <option value="Equipment">Equipment</option>
                <option value="Imaging">Imaging Systems</option>
                <option value="Materials">Dental Materials</option>
                <option value="Endodontics">Endodontics</option>
              </select>
            </div>

            {/* Offer Type Filter */}
            <div>
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                Offer Type
              </label>
              <select
                value={selectedOfferType}
                onChange={(e) => setSelectedOfferType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] cursor-pointer"
              >
                <option value="All">All Offer Types</option>
                <option value="Limited Time">Limited Time Deals</option>
                <option value="Bundle Offer">Bundle Offers</option>
                <option value="Exclusive">Exclusive Promotions</option>
                <option value="Best Value">Best Value Deals</option>
                <option value="Buy More Save More">Buy More Save More</option>
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                Brand
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] cursor-pointer"
              >
                <option value="All">All Brands</option>
                <option value="3M">3M ESPE</option>
                <option value="Dentsply Sirona">Dentsply Sirona</option>
                <option value="NSK">NSK Japan</option>
                <option value="Woodpecker">Woodpecker</option>
                <option value="Carestream">Carestream Dental</option>
                <option value="Planmeca">Planmeca</option>
              </select>
            </div>

          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 4. OFFERS GRID */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {filteredOffers.length > 0 ? (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {filteredOffers.map((offer) => (
              <div 
                key={offer.id}
                className="bg-white rounded-[28px] border border-slate-200/80 p-6 shadow-sm hover:shadow-xl hover:border-[#006670]/40 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  {/* Top Image Box */}
                  <div className="w-full h-52 bg-slate-50 rounded-2xl flex items-center justify-center p-4 relative overflow-hidden mb-5">
                    <Image 
                      src={offer.image} 
                      alt={offer.title}
                      fill
                      sizes="350px"
                      className="object-contain p-2 transform group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Premium Badge */}
                    <span className="absolute top-3 left-3 bg-[#006670] text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm z-10">
                      {offer.badge}
                    </span>

                    <span className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200 z-10">
                      {offer.brand}
                    </span>
                  </div>

                  {/* Offer Info */}
                  <div className="space-y-2 mb-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      {offer.category}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 leading-snug group-hover:text-[#006670] transition-colors">
                      {offer.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
                      {offer.description}
                    </p>
                  </div>
                </div>

                {/* Pricing & CTA */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-[#006670] font-display">
                          ₹{offer.discountedPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-slate-400 line-through font-semibold">
                          ₹{offer.originalPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <span className="text-[10.5px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                        {offer.savingsText}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#006670]" />
                      <span>{offer.validityText}</span>
                    </span>
                  </div>

                  <button
                    onClick={() => handleAddToCart(offer)}
                    className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-[#006670] text-white text-xs font-extrabold uppercase tracking-wider transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Claim Offer</span>
                  </button>
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
