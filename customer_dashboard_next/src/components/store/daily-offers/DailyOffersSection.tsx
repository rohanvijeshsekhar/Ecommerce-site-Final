'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronLeft, ChevronRight, Flame, Sparkles } from 'lucide-react';
import type { DailyOffer } from '@/admin/types/admin';
import { api } from '@/lib/api';
import DailyOfferCountdown from './DailyOfferCountdown';
import DailyOfferCard from './DailyOfferCard';

interface DailyOffersSectionProps {
  initialOffers?: DailyOffer[];
  previewOffer?: DailyOffer; // Allows live real-time preview in Admin Studio
  isLivePreview?: boolean;
}

export const DailyOffersSection: React.FC<DailyOffersSectionProps> = ({
  initialOffers,
  previewOffer,
  isLivePreview = false,
}) => {
  const [offers, setOffers] = useState<DailyOffer[]>(() => initialOffers || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (previewOffer) {
      setOffers([previewOffer]);
      return;
    }

    if (initialOffers && initialOffers.length > 0) {
      setOffers(initialOffers);
      return;
    }

    // Client-side fetch fallback
    api
      .get('homepage/daily-offers/')
      .then((res) => {
        if (res.data?.data && Array.isArray(res.data.data)) {
          setOffers(res.data.data);
        }
      })
      .catch(() => {});
  }, [initialOffers, previewOffer]);

  const activeOffer = previewOffer || offers[currentIndex] || offers[0];

  if (!activeOffer) {
    return null;
  }

  // Theme & Color resolution
  const bgColor = activeOffer.bg_color || '#991B1B';
  const bgGradient = activeOffer.bg_gradient || 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 50%, #991B1B 100%)';
  const headingColor = activeOffer.heading_color || '#FFFFFF';
  const descColor = activeOffer.description_color || '#FEE2E2';
  const badgeBgColor = activeOffer.badge_bg_color || '#FEF3C7';
  const badgeTextColor = activeOffer.badge_text_color || '#B45309';
  const offerColor = activeOffer.offer_color || '#FDE047';
  const ctaBgColor = activeOffer.cta_bg_color || '#FBBF24';
  const ctaTextColor = activeOffer.cta_text_color || '#78350F';
  const ctaBorderColor = activeOffer.cta_border_color || '#F59E0B';
  const countdownBgColor = activeOffer.countdown_bg_color || '#111827';
  const countdownTextColor = activeOffer.countdown_text_color || '#FFFFFF';
  const productBadgeColor = activeOffer.product_badge_color || '#DC2626';

  // Alignment
  const hAlign = activeOffer.horizontal_alignment || 'center';
  const textAlignClass =
    hAlign === 'left' ? 'text-left items-start' : hAlign === 'right' ? 'text-right items-end' : 'text-center items-center';

  const contentWidthClass =
    activeOffer.content_width === 'small'
      ? 'max-w-2xl'
      : activeOffer.content_width === 'medium'
      ? 'max-w-4xl'
      : activeOffer.content_width === 'full'
      ? 'max-w-full'
      : 'max-w-6xl';

  // CTA link target
  let ctaDestination = activeOffer.cta_url || '/offers';
  if (activeOffer.cta_action_type === 'product' && activeOffer.cta_target_id) {
    ctaDestination = `/products/${activeOffer.cta_target_id}`;
  } else if (activeOffer.cta_action_type === 'category' && activeOffer.cta_target_id) {
    ctaDestination = `/products/category/${activeOffer.cta_target_id}`;
  } else if (activeOffer.cta_action_type === 'brand' && activeOffer.cta_target_id) {
    ctaDestination = `/brands/${activeOffer.cta_target_id}`;
  }

  // Scroll handlers for deal cards
  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const items = activeOffer.items || [];

  return (
    <section
      className={`w-full relative overflow-hidden my-8 sm:my-12 transition-colors duration-500 ${
        isLivePreview ? 'rounded-2xl border border-slate-200' : ''
      }`}
      style={{
        background: bgGradient || bgColor,
      }}
      aria-label="Daily Offers & Hot Deals"
    >
      {/* Optional Background Images & Overlays */}
      {activeOffer.desktop_image_url && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20 hidden md:block">
          <Image
            src={activeOffer.desktop_image_url}
            alt={activeOffer.title}
            fill
            className={`object-${activeOffer.image_fit || 'cover'} object-${activeOffer.image_position || 'center'}`}
          />
        </div>
      )}
      {activeOffer.mobile_image_url && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20 block md:hidden">
          <Image
            src={activeOffer.mobile_image_url}
            alt={activeOffer.title}
            fill
            className={`object-${activeOffer.image_fit || 'cover'} object-${activeOffer.image_position || 'center'}`}
          />
        </div>
      )}

      {/* Decorative Radial Lighting */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[600px] h-[300px] bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-x-1/2 w-[500px] h-[250px] bg-black/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* ============================================================
            1. TOP PROMOTIONAL BANNER / HEADER AREA
           ============================================================ */}
        <div className={`mx-auto flex flex-col ${textAlignClass} ${contentWidthClass} mb-10`}>
          {/* Badge & Offer Tag Row */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start mb-3">
            {activeOffer.badge_text && (
              <span
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black tracking-wide shadow-md uppercase"
                style={{ backgroundColor: badgeBgColor, color: badgeTextColor }}
              >
                <Flame className="w-4 h-4 fill-current animate-bounce" />
                {activeOffer.badge_text}
              </span>
            )}

            {activeOffer.offer_text && (
              <span
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-black tracking-wider bg-black/30 backdrop-blur-md border border-white/20 shadow-inner"
                style={{ color: offerColor }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {activeOffer.offer_text}
              </span>
            )}
          </div>

          {/* Big Promotional Heading */}
          <h2
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-3"
            style={{ color: headingColor }}
          >
            {activeOffer.title}
          </h2>

          {/* Subheading */}
          {activeOffer.subheading && (
            <p
              className="text-sm sm:text-base md:text-lg font-medium opacity-95 max-w-2xl mb-6"
              style={{ color: descColor }}
            >
              {activeOffer.subheading}
            </p>
          )}

          {/* Countdown & CTA Row */}
          <div className={`flex items-center gap-4 sm:gap-6 flex-wrap justify-center sm:justify-start pt-1`}>
            {/* Countdown Timer */}
            {activeOffer.countdown_enabled && (
              <div className="flex flex-col items-center sm:items-start gap-1">
                <span className="text-[10px] sm:text-[11px] uppercase tracking-widest font-black opacity-80" style={{ color: descColor }}>
                  Deals End In:
                </span>
                <DailyOfferCountdown
                  endDate={activeOffer.end_date}
                  startDate={activeOffer.start_date}
                  bgColor={countdownBgColor}
                  textColor={countdownTextColor}
                />
              </div>
            )}

            {/* CTA Button */}
            {activeOffer.cta_text && (
              <div className="self-end mt-2 sm:mt-0">
                <Link
                  href={ctaDestination}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm sm:text-base tracking-wide shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  style={{
                    backgroundColor: ctaBgColor,
                    color: ctaTextColor,
                    border: ctaBorderColor ? `2px solid ${ctaBorderColor}` : undefined,
                  }}
                >
                  <span>{activeOffer.cta_text}</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </Link>
              </div>
            )}
          </div>

          {activeOffer.secondary_text && (
            <span className="text-xs opacity-75 mt-3 font-medium" style={{ color: descColor }}>
              {activeOffer.secondary_text}
            </span>
          )}
        </div>

        {/* ============================================================
            2. HORIZONTAL DEAL PRODUCTS LAYOUT
           ============================================================ */}
        {items.length > 0 && (
          <div className="relative mt-6">
            {/* Carousel Navigation Arrows */}
            {items.length > 4 && (
              <div className="hidden sm:flex items-center gap-2 absolute -top-12 right-0 z-20">
                <button
                  onClick={() => handleScroll('left')}
                  className="p-2 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow-md border border-slate-200/60 transition-transform active:scale-95 cursor-pointer"
                  aria-label="Scroll deals left"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleScroll('right')}
                  className="p-2 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow-md border border-slate-200/60 transition-transform active:scale-95 cursor-pointer"
                  aria-label="Scroll deals right"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Scrollable Track */}
            <div
              ref={scrollContainerRef}
              className="flex items-stretch gap-4 sm:gap-6 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x snap-mandatory"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {items.map((item) => (
                <div
                  key={item.id || item.product}
                  className="w-[260px] sm:w-[280px] md:w-[300px] lg:w-[310px] shrink-0 snap-start flex flex-col"
                >
                  <DailyOfferCard
                    item={item}
                    productBadgeColor={productBadgeColor}
                    className="h-full"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section Indicators if multiple promotional sections */}
        {offers.length > 1 && !isLivePreview && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {offers.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentIndex === idx ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to daily offer ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default DailyOffersSection;
