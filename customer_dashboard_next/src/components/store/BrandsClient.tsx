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

    // Tab filter & sort
    if (activeTab === 'featured') {
      list = list.filter(b => b.is_featured);
    } else if (activeTab === 'az') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (activeTab === 'products') {
      list.sort((a, b) => (b.product_count || 0) - (a.product_count || 0));
    } else {
      // 'all' — order by display_order, then name
      list.sort((a, b) => ((a.display_order ?? 0) - (b.display_order ?? 0)) || a.name.localeCompare(b.name));
    }

    return list;
  }, [brands, searchQuery, activeTab]);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 pt-[100px] lg:pt-[160px]">
      
      {/* ── TOP HERO BANNER (Full width edge-to-edge) ── */}
      {banner && banner.is_active && (
        <div className="w-full relative overflow-hidden group h-[220px] sm:h-[320px] md:h-[400px] bg-slate-900 border-b border-slate-200/50 shadow-md">
          {banner.banner_image_url ? (
            <img
              src={banner.banner_image_url}
              alt={banner.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-85"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#00383D] via-[#005B63] to-[#004248]" />
          )}

          {/* Glassmorphism Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-transparent/40 backdrop-blur-[2px] flex items-center px-6 sm:px-12 lg:px-20">
            <div className="max-w-4xl w-full space-y-2.5 sm:space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#006670] text-white text-[10px] sm:text-xs font-black tracking-widest uppercase rounded-full w-fit shadow-md">
                <Award className="w-3.5 h-3.5 text-amber-300" /> Authorized Partners
              </span>
              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
                {banner.title}
              </h1>
              <p className="text-slate-200 text-xs sm:text-base md:text-lg max-w-2xl line-clamp-2 font-medium leading-relaxed">
                {banner.subtitle}
              </p>
              {banner.button_text && (
                <a
                  href={banner.button_link || '#brands-grid'}
                  className="inline-flex items-center gap-2 mt-3 sm:mt-5 px-5 py-2.5 sm:px-6 sm:py-3 bg-[#006670] hover:bg-[#00525a] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-[#006670]/30 transition-all hover:scale-105 active:scale-95 w-fit"
                >
                  <span>{banner.button_text}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div id="brands-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* ── Breadcrumb ── */}
        <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-[#006670] transition-colors font-medium">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-900">Brands</span>
        </nav>

        {/* ── Search & Filter Controls ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          
          {/* Live Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search brands by name or description..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006670]/30 focus:border-[#006670] shadow-xs transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sorting / Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-[#006670] text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Brands
            </button>
            <button
              onClick={() => setActiveTab('featured')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'featured'
                  ? 'bg-[#006670] text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Featured
            </button>
            <button
              onClick={() => setActiveTab('az')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'az'
                  ? 'bg-[#006670] text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              A – Z
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'products'
                  ? 'bg-[#006670] text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Most Products
            </button>
          </div>
        </div>

        {/* ── BRANDS GRID SECTION ── */}

        {/* Loading Skeletons */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm animate-pulse flex flex-col justify-between h-[230px]"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-slate-200 rounded-xl" />
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-5/6" />
                </div>
                <div className="h-9 bg-slate-200 rounded-xl w-full mt-4" />
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
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#006670] text-white text-xs font-bold rounded-xl hover:bg-[#005159] transition-colors shadow-md"
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
            <h3 className="text-lg font-black text-slate-900 mb-2">No Brands Available</h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-6">
              {searchQuery
                ? `No brands match your search "${searchQuery}". Try searching with a different term.`
                : 'Brands will appear here once added by the administrator.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-5 py-2.5 bg-[#006670] text-white text-xs font-bold rounded-xl hover:bg-[#005159] transition-all shadow-md"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          /* Responsive 4 / 3 / 2 Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredBrands.map(brand => {
              const logoSrc = getAbsoluteImageUrl(brand.logo_url || brand.logo);
              const pCount = brand.product_count ?? 0;

              return (
                <div
                  key={brand.id}
                  onClick={() => router.push(`/brands/${brand.slug}`)}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-xl hover:border-[#006670]/40 transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between group cursor-pointer h-full relative overflow-hidden"
                >
                  {/* Featured Badge */}
                  {brand.is_featured && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider rounded-md border border-amber-200/60">
                      Featured
                    </span>
                  )}

                  {/* Top Content: Logo, Name, Country & Description */}
                  <div>
                    {/* Logo Centered */}
                    <div className="w-full h-20 bg-slate-50 rounded-xl p-3 flex items-center justify-center mb-4 border border-slate-100 group-hover:bg-[#006670]/5 transition-colors">
                      {logoSrc ? (
                        <img
                          src={logoSrc}
                          alt={brand.name}
                          loading="lazy"
                          className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <span className="text-xl font-black text-slate-400 group-hover:text-[#006670]">
                          {brand.name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Brand Name */}
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-[#006670] transition-colors text-center line-clamp-1">
                      {brand.name}
                    </h3>

                    {/* Country tag */}
                    {brand.country_of_origin && (
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mt-0.5">
                        {brand.country_of_origin}
                      </p>
                    )}

                    {/* Short Description */}
                    {brand.short_description && (
                      <p className="text-xs text-slate-500 text-center line-clamp-2 mt-2 font-medium">
                        {brand.short_description}
                      </p>
                    )}
                  </div>

                  {/* Bottom Footer: Product Count & CTA */}
                  <div className="mt-5 pt-3 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                      <span className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-[#006670]" /> Products
                      </span>
                      <span className="px-2 py-0.5 bg-[#006670]/10 text-[#006670] font-bold text-[11px] rounded-full">
                        {pCount} {pCount === 1 ? 'Item' : 'Items'}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/brands/${brand.slug}`);
                      }}
                      className="w-full py-2.5 bg-slate-900 group-hover:bg-[#006670] text-white text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>View Products</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
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
