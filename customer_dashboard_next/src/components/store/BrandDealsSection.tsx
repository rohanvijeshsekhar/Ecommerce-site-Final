'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { api, getAbsoluteImageUrl } from '@/lib/api';

export interface StoreBrandDealProduct {
  id: string;
  product: string;
  product_name: string;
  product_slug: string;
  product_sku: string;
  product_image_url: string | null;
  product_mrp: number;
  product_selling_price: number;
  deal_price: number;
  discount_percentage: number;
}

export interface StoreBrandDeal {
  id: string;
  brand: string;
  brand_name: string;
  brand_slug: string;
  brand_logo_url: string | null;
  name: string;
  slug: string;
  title: string;
  subtitle: string;
  badge_text?: string;
  promotional_tag?: string;
  offer_text?: string;
  cta_text: string;
  discount_percentage: number | null;
  banner_desktop: string | null;
  banner_mobile: string | null;
  desktop_image_url?: string | null;
  mobile_image_url?: string | null;
  desktop_image?: string | null;
  mobile_image?: string | null;
  bg_color: string;
  text_color: string;
  accent_color: string;
  show_on_homepage: boolean;
  is_active: boolean;
  deal_products?: StoreBrandDealProduct[];
}

interface BrandDealsSectionProps {
  initialBrandDeals?: StoreBrandDeal[];
}

export default function BrandDealsSection({ initialBrandDeals = [] }: BrandDealsSectionProps) {
  const [deals, setDeals] = useState<StoreBrandDeal[]>(initialBrandDeals);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDeals = async () => {
      try {
        const res = await api.get('homepage/brand-deals/');
        const data = res.data;
        const list = Array.isArray(data) ? data : data.data || [];
        if (isMounted && list.length > 0) {
          setDeals(list);
        }
      } catch {
        // Fallback to initialBrandDeals
      }
    };

    fetchDeals();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (initialBrandDeals && initialBrandDeals.length > 0) {
      setDeals(initialBrandDeals);
    }
  }, [initialBrandDeals]);

  // Filter only active & show_on_homepage
  const activeDeals = deals.filter((d) => d.is_active && (d.show_on_homepage !== false));

  // Auto-play carousel if multiple deals
  useEffect(() => {
    if (activeDeals.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeDeals.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeDeals.length, isPaused]);

  // Auto-hide completely if no eligible campaigns
  if (activeDeals.length === 0) {
    return null;
  }

  const currentDeal = activeDeals[currentIndex] || activeDeals[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? activeDeals.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeDeals.length);
  };

  return (
    <section
      className="w-full bg-slate-50/50"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="w-full">
        {/* Campaign Banner — full width, no heading */}
        <div
          className="relative overflow-hidden shadow-lg transition-all duration-500 group"
          style={{
            backgroundColor: currentDeal.bg_color || '#005F63',
            color: currentDeal.text_color || '#FFFFFF',
          }}
        >
          {/* Background / Artwork Image (Desktop) */}
          {(currentDeal.banner_desktop || currentDeal.desktop_image_url || currentDeal.desktop_image) && (
            <div className="hidden md:block absolute inset-0 z-0 pointer-events-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getAbsoluteImageUrl(currentDeal.banner_desktop || currentDeal.desktop_image_url || currentDeal.desktop_image)}
                alt={currentDeal.title || currentDeal.name}
                className="w-full h-full object-cover object-right opacity-60 transition-transform duration-700 group-hover:scale-102"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, ${currentDeal.bg_color || '#005F63'} 48%, ${(currentDeal.bg_color || '#005F63')}D9 65%, transparent 100%)`,
                }}
              />
            </div>
          )}

          {/* Background / Artwork Image (Mobile) */}
          {(currentDeal.banner_mobile || currentDeal.mobile_image_url || currentDeal.mobile_image || currentDeal.banner_desktop || currentDeal.desktop_image_url || currentDeal.desktop_image) && (
            <div className="block md:hidden absolute inset-0 z-0 pointer-events-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getAbsoluteImageUrl(currentDeal.banner_mobile || currentDeal.mobile_image_url || currentDeal.mobile_image || currentDeal.banner_desktop || currentDeal.desktop_image_url || currentDeal.desktop_image)}
                alt={currentDeal.title || currentDeal.name}
                className="w-full h-full object-cover opacity-40"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to top, ${currentDeal.bg_color || '#005F63'} 70%, transparent 100%)`,
                }}
              />
            </div>
          )}

          {/* Content Layout */}
          <div className="relative z-10 px-4 sm:px-10 md:px-16 py-8 sm:py-10 md:py-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-10">
            <div className="max-w-3xl space-y-4">
              {/* Brand Logo & Badges */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                {currentDeal.brand_logo_url && (
                  <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-sm flex items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getAbsoluteImageUrl(currentDeal.brand_logo_url)}
                      alt={currentDeal.brand_name}
                      className="h-5 sm:h-7 object-contain"
                    />
                  </div>
                )}

                <span
                  className="px-3.5 py-1 text-[11px] sm:text-xs font-black uppercase tracking-widest rounded-full bg-white/20 backdrop-blur-md border border-white/20"
                  style={{ color: currentDeal.accent_color || '#BFE8E8' }}
                >
                  {currentDeal.badge_text || currentDeal.promotional_tag || 'EXCLUSIVE BRAND OFFER'}
                </span>

                <span className="text-xs font-semibold opacity-90">
                  • Official Brand Deal
                </span>
              </div>

              {/* Title */}
              <h3 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                {currentDeal.title || currentDeal.name}
              </h3>

              {/* Subtitle / Description */}
              {currentDeal.subtitle && (
                <p className="text-sm sm:text-base md:text-lg opacity-90 leading-relaxed font-medium line-clamp-2 max-w-2xl">
                  {currentDeal.subtitle}
                </p>
              )}

              {/* Action Button & Warranty Badge */}
              <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6">
                <Link
                  href={`/brand-deals/${currentDeal.slug}`}
                  className="inline-flex items-center gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-sm sm:text-base font-black shadow-lg hover:shadow-xl hover:scale-102 active:scale-98 transition-all duration-200 cursor-pointer"
                >
                  <span>{currentDeal.cta_text || 'Shop the Offer →'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <div className="flex items-center gap-2 text-xs sm:text-sm opacity-95 font-semibold">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: currentDeal.accent_color || '#BFE8E8' }} />
                  <span>100% Genuine Manufacturer Clinical Warranty</span>
                </div>
              </div>
            </div>

            {/* Right Arrow Action Card for Quick Click */}
            <div className="hidden lg:flex items-center">
              <Link
                href={`/brand-deals/${currentDeal.slug}`}
                className="w-14 h-14 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all shadow-md cursor-pointer"
                title="View All Campaign Products"
              >
                <ArrowRight className="w-7 h-7" />
              </Link>
            </div>
          </div>

          {/* Carousel Progress Dots */}
          {activeDeals.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
              {activeDeals.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    currentIndex === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Prev / Next arrow overlays — shown only when multiple deals */}
          {activeDeals.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                aria-label="Previous Brand Deal"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md border border-white/25 flex items-center justify-center text-white transition shadow-md cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                aria-label="Next Brand Deal"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md border border-white/25 flex items-center justify-center text-white transition shadow-md cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
