'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, Flame, Sparkles } from 'lucide-react';
import type { DailyOffer } from '@/admin/types/admin';
import { api } from '@/lib/api';
import DailyOfferCountdown from './DailyOfferCountdown';

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
  const router = useRouter();
  const [offers, setOffers] = useState<DailyOffer[]>(() => initialOffers || []);

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

  const activeOffer = previewOffer || offers[0];

  if (!activeOffer) {
    return null;
  }

  // Theme & Color resolution (FAAZO Teal Clinical Brand Palette)
  const bgColor = activeOffer.bg_color || '#004D54';
  const bgGradient = activeOffer.bg_gradient || 'linear-gradient(135deg, #002B30 0%, #004D54 45%, #006670 100%)';
  const headingColor = activeOffer.heading_color || '#FFFFFF';
  const descColor = activeOffer.description_color || '#CCECEE';
  const badgeBgColor = activeOffer.badge_bg_color || '#E6FFFA';
  const badgeTextColor = activeOffer.badge_text_color || '#004D54';
  const offerColor = activeOffer.offer_color || '#2DD4BF';
  const ctaBgColor = activeOffer.cta_bg_color || '#2DD4BF';
  const ctaTextColor = activeOffer.cta_text_color || '#002B30';
  const ctaBorderColor = activeOffer.cta_border_color || '#14B8A6';
  const countdownBgColor = activeOffer.countdown_bg_color || '#002B30';
  const countdownTextColor = activeOffer.countdown_text_color || '#FFFFFF';

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

  // Dedicated offer landing page URL
  const offerPageUrl = `/daily-offers/${activeOffer.id}`;
  let ctaDestination = offerPageUrl;
  if (activeOffer.cta_action_type === 'product' && activeOffer.cta_target_id) {
    ctaDestination = `/products/${activeOffer.cta_target_id}`;
  } else if (activeOffer.cta_action_type === 'category' && activeOffer.cta_target_id) {
    ctaDestination = `/products/category/${activeOffer.cta_target_id}`;
  } else if (activeOffer.cta_action_type === 'brand' && activeOffer.cta_target_id) {
    ctaDestination = `/brands/${activeOffer.cta_target_id}`;
  } else if (activeOffer.cta_action_type === 'url' && activeOffer.cta_url && activeOffer.cta_url !== '/offers') {
    ctaDestination = activeOffer.cta_url;
  }

  // Handle entire banner click on storefront
  const handleBannerClick = (e: React.MouseEvent) => {
    if (isLivePreview) return;
    // Don't navigate if clicked on an anchor or button inside
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) return;
    router.push(ctaDestination);
  };

  return (
    <section
      onClick={handleBannerClick}
      className={`w-full relative overflow-hidden my-8 sm:my-12 transition-all duration-500 ${
        isLivePreview
          ? 'rounded-2xl border border-slate-200 cursor-default'
          : 'cursor-pointer group hover:shadow-[0_20px_50px_rgba(0,102,112,0.25)]'
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
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[700px] h-[350px] bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-x-1/2 w-[600px] h-[300px] bg-black/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
        <div className={`mx-auto flex flex-col ${textAlignClass} ${contentWidthClass}`}>
          {/* Badge & Offer Tag Row */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start mb-3.5">
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
                className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs sm:text-sm font-black tracking-wider bg-black/30 backdrop-blur-md border border-white/20 shadow-inner"
                style={{ color: offerColor }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {activeOffer.offer_text}
              </span>
            )}
          </div>

          {/* Big Promotional Heading */}
          <h2
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] mb-3.5"
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
          <div className="flex items-center gap-5 sm:gap-7 flex-wrap justify-center sm:justify-start pt-1">
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
                {isLivePreview ? (
                  <div
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-black text-sm sm:text-base tracking-wide shadow-xl cursor-pointer"
                    style={{
                      backgroundColor: ctaBgColor,
                      color: ctaTextColor,
                      border: ctaBorderColor ? `2px solid ${ctaBorderColor}` : undefined,
                    }}
                  >
                    <span>{activeOffer.cta_text}</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </div>
                ) : (
                  <Link
                    href={ctaDestination}
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-black text-sm sm:text-base tracking-wide shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-2xl active:translate-y-0 cursor-pointer"
                    style={{
                      backgroundColor: ctaBgColor,
                      color: ctaTextColor,
                      border: ctaBorderColor ? `2px solid ${ctaBorderColor}` : undefined,
                    }}
                  >
                    <span>{activeOffer.cta_text}</span>
                    <ArrowRight className="w-4 h-4 stroke-[3] group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
              </div>
            )}
          </div>

          {activeOffer.secondary_text && (
            <span className="text-xs opacity-75 mt-3.5 font-medium" style={{ color: descColor }}>
              {activeOffer.secondary_text}
            </span>
          )}
        </div>
      </div>
    </section>
  );
};

export default DailyOffersSection;
