'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, getAbsoluteImageUrl } from '../../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BrandItem {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BrandLogos: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check scroll position to toggle navigation arrow visibility
  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = Math.max(280, Math.floor(el.clientWidth * 0.75));
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    setMounted(true);
    let isMounted = true;

    async function fetchBrands() {
      try {
        // 1. Fetch curated homepage showcase brands
        const hpRes = await api.get('homepage/brands/').catch(() => null);
        const hpRaw: unknown[] =
          hpRes?.data?.data ?? hpRes?.data?.results ?? hpRes?.data ?? [];

        const hpBrands: BrandItem[] = Array.isArray(hpRaw)
          ? hpRaw
              .filter((b: any) => b.is_visible !== false)
              .map((b: any) => ({
                id: String(b.id || b.brand || b.brand_slug || b.brand_name),
                name: String(b.brand_name || b.name || '').trim(),
                slug: String(b.brand_slug || b.slug || '').trim(),
                logo_url: b.logo_url || null,
              }))
              .filter((b: BrandItem) => b.name && b.slug)
          : [];

        // 2. Fetch active catalog brands from existing database to ensure a complete set
        const catalogRes = await api
          .get('brands/', { params: { page_size: 24 } })
          .catch(() => null);
        const catalogRaw: unknown[] =
          catalogRes?.data?.data ?? catalogRes?.data?.results ?? catalogRes?.data ?? [];

        const catalogBrands: BrandItem[] = Array.isArray(catalogRaw)
          ? catalogRaw
              .filter((b: any) => b.is_active !== false)
              .map((b: any) => ({
                id: String(b.id || b.slug),
                name: String(b.name || '').trim(),
                slug: String(b.slug || '').trim(),
                logo_url: b.logo_url || b.logo || null,
              }))
              .filter((b: BrandItem) => b.name && b.slug)
          : [];

        // Merge: showcase brands first, followed by active catalog brands (deduped by slug)
        const seenSlugs = new Set<string>();
        const merged: BrandItem[] = [];

        for (const brand of [...hpBrands, ...catalogBrands]) {
          const key = brand.slug.toLowerCase();
          if (!seenSlugs.has(key)) {
            seenSlugs.add(key);
            merged.push(brand);
          }
        }

        if (isMounted) {
          setBrands(merged);
        }
      } catch {
        // Silently swallow – section will hide if no brands available
      }
    }

    fetchBrands();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update scroll arrow states when brands change or window resizes
  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [brands, checkScroll]);

  // If unmounted or no real brands exist in database, render nothing
  if (!mounted || brands.length === 0) {
    return null;
  }

  const isGrid = brands.length <= 6;

  return (
    <section className="w-full bg-slate-50/60 py-10 md:py-14 border-y border-slate-200/60 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Section Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-6 md:mb-8">
          <div>
            <span className="text-[11px] font-extrabold tracking-[0.2em] text-[#005F63] uppercase block font-sans mb-1">
              SHOP BY BRAND
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
              Shop Leading Dental Brands
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl font-normal">
              Explore authentic dental equipment, instruments, and clinical supplies from top global manufacturers.
            </p>
          </div>

          <Link
            href="/brands"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#005F63] hover:text-[#00474a] transition-colors group shrink-0"
          >
            <span>View All Brands</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* ── Brand Tiles Display ────────────────────────────────────── */}
        {isGrid ? (
          /* Compact Logo Grid (When 6 or fewer brands available) */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brands/${brand.slug}`}
                className="group relative flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200/80 hover:border-[#005F63]/35 hover:shadow-md transition-all duration-200 text-center h-[116px] sm:h-[126px]"
              >
                {/* Brand Logo / Wordmark */}
                <div className="h-11 w-full flex items-center justify-center relative">
                  {brand.logo_url ? (
                    <img
                      src={getAbsoluteImageUrl(brand.logo_url)}
                      alt={brand.name}
                      loading="lazy"
                      className="max-h-9 max-w-[85%] object-contain filter grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-200 group-hover:scale-105"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                        const fallback = e.currentTarget.parentElement?.querySelector('.brand-text-fallback');
                        if (fallback) (fallback as HTMLElement).style.display = 'block';
                      }}
                    />
                  ) : null}
                  <span
                    className={`brand-text-fallback font-extrabold text-sm sm:text-base text-slate-800 tracking-tight font-display transition-colors group-hover:text-[#005F63] px-2 truncate ${
                      brand.logo_url ? 'hidden' : 'block'
                    }`}
                  >
                    {brand.name}
                  </span>
                </div>

                {/* Brand Name */}
                <span className="text-[11px] font-semibold text-slate-600 truncate max-w-full group-hover:text-[#005F63] transition-colors mt-2">
                  {brand.name}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          /* Clean Horizontal Carousel (When more than 6 brands available) */
          <div className="relative group/carousel">
            {/* Scroll Button Left */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => handleScroll('left')}
                aria-label="Previous brands"
                className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-slate-200/90 shadow-md items-center justify-center text-slate-600 hover:text-[#005F63] hover:border-[#005F63]/35 transition-all duration-150 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Scrollable Track */}
            <div
              ref={scrollContainerRef}
              onScroll={checkScroll}
              className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-none py-1 scroll-smooth snap-x snap-mandatory"
            >
              {brands.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/brands/${brand.slug}`}
                  className="flex-shrink-0 w-[148px] sm:w-[168px] md:w-[184px] snap-start group relative flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200/80 hover:border-[#005F63]/35 hover:shadow-md transition-all duration-200 text-center h-[116px] sm:h-[126px]"
                >
                  {/* Brand Logo / Wordmark */}
                  <div className="h-11 w-full flex items-center justify-center relative">
                    {brand.logo_url ? (
                      <img
                        src={getAbsoluteImageUrl(brand.logo_url)}
                        alt={brand.name}
                        loading="lazy"
                        className="max-h-9 max-w-[85%] object-contain filter grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-200 group-hover:scale-105"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                          const fallback = e.currentTarget.parentElement?.querySelector('.brand-text-fallback');
                          if (fallback) (fallback as HTMLElement).style.display = 'block';
                        }}
                      />
                    ) : null}
                    <span
                      className={`brand-text-fallback font-extrabold text-sm sm:text-base text-slate-800 tracking-tight font-display transition-colors group-hover:text-[#005F63] px-2 truncate ${
                        brand.logo_url ? 'hidden' : 'block'
                      }`}
                    >
                      {brand.name}
                    </span>
                  </div>

                  {/* Brand Name */}
                  <span className="text-[11px] font-semibold text-slate-600 truncate max-w-full group-hover:text-[#005F63] transition-colors mt-2">
                    {brand.name}
                  </span>
                </Link>
              ))}
            </div>

            {/* Scroll Button Right */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => handleScroll('right')}
                aria-label="Next brands"
                className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-slate-200/90 shadow-md items-center justify-center text-slate-600 hover:text-[#005F63] hover:border-[#005F63]/35 transition-all duration-150 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

      </div>
    </section>
  );
};

export default BrandLogos;
