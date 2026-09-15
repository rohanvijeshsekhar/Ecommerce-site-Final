'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Flame, Sparkles, ChevronRight, ShoppingBag, ShieldCheck, Truck, Clock, RefreshCw, ArrowDown } from 'lucide-react';
import type { DailyOffer } from '@/admin/types/admin';
import { api } from '@/lib/api';
import DailyOfferCountdown from '@/components/store/daily-offers/DailyOfferCountdown';
import DailyOfferCard from '@/components/store/daily-offers/DailyOfferCard';

interface DailyOfferClientProps {
  initialOffer?: DailyOffer | null;
  offerId: string;
}

const DEFAULT_BANNER_IMAGE = '/images/featured_digital_equipment.jpg';

export default function DailyOfferClient({ initialOffer, offerId }: DailyOfferClientProps) {
  const [offer, setOffer] = useState<DailyOffer | null>(initialOffer || null);
  const [loading, setLoading] = useState<boolean>(!initialOffer);

  useEffect(() => {
    if (!initialOffer) {
      api
        .get(`homepage/daily-offers/${offerId}/`)
        .then((res) => {
          if (res.data?.data) {
            setOffer(res.data.data);
          } else if (res.data && res.data.id) {
            setOffer(res.data);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [initialOffer, offerId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20">
        <RefreshCw className="w-10 h-10 text-[#006670] animate-spin mb-4" />
        <p className="text-slate-600 font-semibold text-sm">Loading today's exclusive deals...</p>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Offer Not Found or Expired</h2>
        <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
          This promotional event has concluded or is no longer active. Explore our active catalog for more deals.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#006670] hover:bg-[#004D54] text-white font-bold text-sm transition-colors shadow-md"
        >
          Return to Homepage
        </Link>
      </div>
    );
  }

  // Theme & Color resolution
  const bgColor = offer.bg_color || '#004D54';
  const bgGradient = offer.bg_gradient || 'linear-gradient(135deg, #002B30 0%, #004D54 45%, #006670 100%)';
  const headingColor = offer.heading_color || '#FFFFFF';
  const descColor = offer.description_color || '#CCECEE';
  const badgeBgColor = offer.badge_bg_color || '#E6FFFA';
  const badgeTextColor = offer.badge_text_color || '#004D54';
  const offerColor = offer.offer_color || '#2DD4BF';
  const ctaBgColor = offer.cta_bg_color || '#2DD4BF';
  const ctaTextColor = offer.cta_text_color || '#002B30';
  const countdownBgColor = offer.countdown_bg_color || '#002B30';
  const countdownTextColor = offer.countdown_text_color || '#FFFFFF';
  const productBadgeColor = offer.product_badge_color || '#006670';

  const bannerImage = offer.desktop_image_url || offer.desktop_image || DEFAULT_BANNER_IMAGE;
  const items = offer.items || [];

  const handleScrollToDeals = () => {
    const el = document.getElementById('deal-products');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ============================================================
          1. BREADCRUMBS
         ============================================================ */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link href="/" className="hover:text-[#006670] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link href="/daily-offers" className="hover:text-[#006670] transition-colors">
              Daily Offers
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 truncate max-w-[200px] sm:max-w-xs">{offer.title}</span>
          </nav>
        </div>
      </div>

      {/* ============================================================
          2. PROMOTIONAL HERO BANNER (WITH IMAGE)
         ============================================================ */}
      <section
        className="w-full relative overflow-hidden transition-colors duration-500 shadow-md"
        style={{ background: bgGradient || bgColor }}
      >
        {/* Radial Ambient Glow */}
        <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[700px] h-[350px] bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 translate-x-1/2 w-[600px] h-[300px] bg-black/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7">
              {/* Badges Row */}
              <div className="flex items-center gap-2.5 flex-wrap mb-4">
                {offer.badge_text && (
                  <span
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black tracking-wide shadow-md uppercase"
                    style={{ backgroundColor: badgeBgColor, color: badgeTextColor }}
                  >
                    <Flame className="w-4 h-4 fill-current animate-bounce" />
                    {offer.badge_text}
                  </span>
                )}

                {offer.offer_text && (
                  <span
                    className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs sm:text-sm font-black tracking-wider bg-black/30 backdrop-blur-md border border-white/20 shadow-inner"
                    style={{ color: offerColor }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {offer.offer_text}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] mb-3"
                style={{ color: headingColor }}
              >
                {offer.title}
              </h1>

              {/* Subtitle */}
              {offer.subheading && (
                <p
                  className="text-sm sm:text-base md:text-lg font-medium opacity-95 max-w-2xl mb-6"
                  style={{ color: descColor }}
                >
                  {offer.subheading}
                </p>
              )}

              {/* Countdown & Scroll Action Button */}
              <div className="flex items-center gap-5 sm:gap-7 flex-wrap pt-2">
                {offer.countdown_enabled && (
                  <div className="flex flex-col items-start gap-1.5">
                    <span className="text-[11px] uppercase tracking-widest font-black opacity-80" style={{ color: descColor }}>
                      Deals Expire In:
                    </span>
                    <DailyOfferCountdown
                      endDate={offer.end_date}
                      startDate={offer.start_date}
                      bgColor={countdownBgColor}
                      textColor={countdownTextColor}
                    />
                  </div>
                )}

                <div className="self-end">
                  <button
                    type="button"
                    onClick={handleScrollToDeals}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-black text-sm sm:text-base tracking-wide shadow-xl cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-2xl active:translate-y-0"
                    style={{
                      backgroundColor: ctaBgColor,
                      color: ctaTextColor,
                    }}
                  >
                    <span>Explore All {items.length} Deals ↓</span>
                    <ArrowDown className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Featured Image Showcase */}
            <div className="lg:col-span-5 relative w-full h-[240px] sm:h-[300px] lg:h-[350px]">
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-white/5 backdrop-blur-xs">
                <Image
                  src={bannerImage}
                  alt={offer.title}
                  fill
                  priority
                  className="object-cover object-center p-1"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          3. TRUST STRIP
         ============================================================ */}
      <div className="bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center sm:text-left">
            <div className="flex items-center gap-2.5 justify-center sm:justify-start">
              <ShieldCheck className="w-5 h-5 text-[#006670] shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">100% Certified Equipment</span>
                <span className="text-[10px] text-slate-400">Direct OEM clinical warranty</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 justify-center sm:justify-start">
              <Truck className="w-5 h-5 text-[#006670] shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Express Delivery</span>
                <span className="text-[10px] text-slate-400">Priority pan-India dispatch</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 justify-center sm:justify-start">
              <Clock className="w-5 h-5 text-[#006670] shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Limited-Time Pricing</span>
                <span className="text-[10px] text-slate-400">Exclusive institutional rates</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 justify-center sm:justify-start">
              <ShoppingBag className="w-5 h-5 text-[#006670] shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">{items.length} Products on Deal</span>
                <span className="text-[10px] text-slate-400">Curated clinical selection</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          4. DEAL PRODUCTS GRID
         ============================================================ */}
      <main id="deal-products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 scroll-mt-24">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Featured Deal Products
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Lock in discounted pricing on verified clinical instruments and consumables before the timer expires.
            </p>
          </div>
          <span className="text-xs font-bold text-[#006670] bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
            {items.length} {items.length === 1 ? 'Product' : 'Products'} Available
          </span>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center my-8">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Deal Products Added Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-5">
              Check back soon as new clinical products are discounted and added to this offer daily.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#006670] text-white font-bold text-xs"
            >
              Browse Full Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item, idx) => (
              <DailyOfferCard
                key={item.id || item.product_id || idx}
                item={item}
                productBadgeColor={productBadgeColor}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
