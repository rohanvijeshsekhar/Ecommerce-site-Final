'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Sparkles,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Package,
  Layers,
  SlidersHorizontal,
  RefreshCw,
  Award,
  ExternalLink
} from 'lucide-react';
import { api, getAbsoluteImageUrl } from '@/lib/api';
import BrandLogos from '@/components/store/BrandLogos';

export interface BrandItem {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  logo_url?: string;
  banner_image?: string;
  banner_image_url?: string;
  short_description?: string;
  full_description?: string;
  country_of_origin?: string;
  warranty_months_default?: number;
  display_order?: number;
  is_featured?: boolean;
  is_active?: boolean;
  product_count?: number;
  created_at?: string;
}

export interface BrandBannerData {
  title: string;
  subtitle: string;
  banner_image_url?: string | null;
  button_text?: string;
  button_link?: string;
  is_active?: boolean;
}

export default function BrandsClient() {
  const router = useRouter();
  const [banner, setBanner] = useState<BrandBannerData | null>(null);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'featured' | 'az' | 'products'>('all');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Banner
      try {
        const bRes = await api.get('brands/banner/');
        if (bRes.data?.success && bRes.data?.data) {
          const b = bRes.data.data;
          setBanner({
            title: b.title || 'Our Trusted Brands',
            subtitle: b.subtitle || 'Explore premium dental brands trusted by clinics and professionals worldwide.',
            banner_image_url: getAbsoluteImageUrl(b.banner_image_url || b.banner_image),
            button_text: b.button_text || 'Explore Brands',
            button_link: b.button_link || '#brands-grid',
            is_active: b.is_active ?? true,
          });
        }
      } catch {
        // Fallback default banner
        setBanner({
          title: 'Our Trusted Brands',
          subtitle: 'Explore premium dental brands trusted by clinics and professionals worldwide.',
          button_text: 'Explore Brands',
          button_link: '#brands-grid',
          is_active: true,
        });
      }

      // 2. Fetch Brands
      const res = await api.get('brands/', { params: { page_size: 100 } });
      const rawData = res.data?.data ?? res.data?.results ?? res.data;
      if (Array.isArray(rawData)) {
        setBrands(rawData);
      } else {
        setBrands([]);
      }
    } catch (err: any) {
      console.error('Failed to load brands:', err);
      setError('Unable to load brands. Please check your network connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered & Sorted Brands
  const filteredBrands = useMemo(() => {
    let list = [...brands];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        b =>
          b.name.toLowerCase().includes(q) ||
          (b.short_description && b.short_description.toLowerCase().includes(q)) ||
          (b.country_of_origin && b.country_of_origin.toLowerCase().includes(q))
      );
    }

    // Default order by display_order, then name
    list.sort((a, b) => ((a.display_order ?? 0) - (b.display_order ?? 0)) || a.name.localeCompare(b.name));

    return list;
  }, [brands, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 pt-[100px] lg:pt-[160px]">
      
      {/* ── TOP HERO BANNER (Full width edge-to-edge) ── */}
      {banner && banner.is_active && (
        <div className="w-full relative overflow-hidden group h-[220px] sm:h-[300px] md:h-[360px] bg-slate-950 border-b border-slate-200/50 shadow-md">
          <img
            src={banner?.banner_image_url || '/images/brands_hero_bg.png'}
            alt={banner?.title || 'Our Trusted Brands'}
            loading="eager"
            className="w-full h-full object-cover opacity-90 brightness-[0.95]"
          />

          {/* Glassmorphism Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-transparent/40 backdrop-blur-[2px] flex items-center px-6 sm:px-12 lg:px-20">
            <div className="max-w-4xl w-full space-y-2 sm:space-y-3.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#006670] text-white text-[10px] sm:text-xs font-black tracking-widest uppercase rounded-full w-fit shadow-md">
                <Award className="w-3.5 h-3.5 text-amber-300" /> Authorized Partners & Manufacturers
              </span>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-md">
                {banner.title}
              </h1>
              <p className="text-slate-200 text-xs sm:text-base max-w-2xl line-clamp-2 font-medium leading-relaxed">
                {banner.subtitle}
              </p>
              {banner.button_text && (
                <a
                  href={banner.button_link || '#brands-grid'}
                  className="inline-flex items-center gap-2 mt-2 sm:mt-4 px-5 py-2.5 bg-[#006670] hover:bg-[#00525a] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 w-fit cursor-pointer"
                >
                  <span>{banner.button_text}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Trust Pillars Bar (Amazon/Flipkart style) ── */}
      <div className="bg-white border-b border-slate-200/80 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#006670]/10 flex items-center justify-center text-[#006670] shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">100% Genuine</p>
              <p className="text-[10.5px] text-slate-500 font-medium">Direct from manufacturers</p>
            </div>
          </div>
          <div className="flex items-center justify-center md:justify-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#006670]/10 flex items-center justify-center text-[#006670] shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Official Warranty</p>
              <p className="text-[10.5px] text-slate-500 font-medium">Full brand warranty support</p>
            </div>
          </div>
          <div className="flex items-center justify-center md:justify-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#006670]/10 flex items-center justify-center text-[#006670] shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Wide Portfolio</p>
              <p className="text-[10.5px] text-slate-500 font-medium">Clinical & surgical equipment</p>
            </div>
          </div>
          <div className="flex items-center justify-center md:justify-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#006670]/10 flex items-center justify-center text-[#006670] shrink-0">
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Special Clinical Deals</p>
              <p className="text-[10.5px] text-slate-500 font-medium">Exclusive verified pricing</p>
            </div>
          </div>
        </div>
      </div>

      <div id="brands-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* ── Breadcrumb & Results Count ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-[#006670] transition-colors font-medium">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-900">Brand Directory</span>
          </nav>
          <div className="text-xs font-semibold text-slate-500">
            Showing <span className="font-bold text-slate-900">{filteredBrands.length}</span> Verified Dental Brands
          </div>
        </div>

        {/* ── Search Bar Only ── */}
        <div className="mb-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search brands by name (e.g. 3M, Dentsply, Amaron)..."
              className="w-full pl-10 pr-16 py-2.5 bg-white border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006670]/25 focus:border-[#006670] shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-bold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── BRANDS GRID SECTION ── */}

        {/* Loading Skeletons */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs animate-pulse flex flex-col justify-between h-[280px]"
              >
                <div className="h-3 bg-slate-200 rounded w-1/3 mb-3" />
                <div className="w-full h-24 bg-slate-100 rounded-xl mb-3" />
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2 mb-4" />
                <div className="h-8 bg-slate-200 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-lg mx-auto shadow-sm my-8">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Failed to Load Brands</h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-6">{error}</p>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#006670] text-white text-xs font-bold rounded-xl hover:bg-[#005159] transition-colors shadow-md cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Retry Loading
            </button>
          </div>
        ) : filteredBrands.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm my-8">
            <div className="w-16 h-16 rounded-2xl bg-[#006670]/10 text-[#006670] flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">No Brands Found</h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-6">
              {searchQuery
                ? `No brands match your search "${searchQuery}". Try searching with a different brand name.`
                : 'Brands will appear here once added by the administrator.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-5 py-2.5 bg-[#006670] text-white text-xs font-bold rounded-xl hover:bg-[#005159] transition-all shadow-md cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          /* Standard Top E-Commerce Brand Cards Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4.5">
            {filteredBrands.map(brand => {
              const logoSrc = getAbsoluteImageUrl(brand.logo_url || brand.logo);
              const pCount = brand.product_count ?? 0;

              return (
                <Link
                  key={brand.id}
                  href={`/brands/${brand.slug}`}
                  className="group bg-white rounded-2xl border border-slate-200/80 hover:border-[#006670] hover:shadow-[0_8px_25px_rgba(0,102,112,0.10)] transition-all duration-300 flex flex-col justify-between p-3.5 sm:p-4 text-left relative overflow-hidden cursor-pointer"
                >
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between gap-1 mb-2.5">
                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 group-hover:text-[#006670] transition-colors">
                      <ShieldCheck className="w-3 h-3 text-[#006670]" />
                      <span>Official Store</span>
                    </span>

                    {brand.is_featured && (
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 text-[8.5px] font-black uppercase tracking-wider rounded border border-amber-200/70">
                        Featured
                      </span>
                    )}
                  </div>

                  {/* Clean Image Window Area */}
                  <div className="w-full h-28 sm:h-32 bg-[#fafcfc] rounded-xl border border-slate-100 group-hover:border-[#006670]/20 overflow-hidden flex items-center justify-center mb-3 transition-colors relative">
                    {logoSrc ? (
                      <img
                        src={logoSrc}
                        alt={brand.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                        <span className="text-xl font-black text-slate-400 group-hover:text-[#006670] transition-colors">
                          {brand.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Brand Information */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      {/* Brand Title */}
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-[#006670] transition-colors line-clamp-1 leading-tight mb-1">
                        {brand.name}
                      </h3>

                      {/* Origin & Category Tag */}
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {brand.country_of_origin ? (
                          <span>{brand.country_of_origin}</span>
                        ) : (
                          <span>Clinical Grade</span>
                        )}
                        <span>•</span>
                        <span className="text-emerald-600 font-extrabold">100% Genuine</span>
                      </div>

                      {/* Short Description */}
                      {brand.short_description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1.5 font-medium leading-snug">
                          {brand.short_description}
                        </p>
                      )}
                    </div>

                    {/* Bottom CTA & Product Count */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <Package className="w-3 h-3 text-[#006670]" />
                        <span>{pCount} {pCount === 1 ? 'Product' : 'Products'}</span>
                      </span>

                      <div className="inline-flex items-center gap-1 text-[10.5px] font-black text-[#006670] group-hover:translate-x-0.5 transition-transform">
                        <span>Explore</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Brand Logos Wall Marquee ── */}
        <div className="mt-16">
          <BrandLogos />
        </div>
      </div>
    </div>
  );
}
