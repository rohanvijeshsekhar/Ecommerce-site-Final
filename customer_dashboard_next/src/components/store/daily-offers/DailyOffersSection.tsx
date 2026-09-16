'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, Flame, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DailyOffer } from '@/admin/types/admin';
import { api } from '@/lib/api';
import DailyOfferCountdown from './DailyOfferCountdown';
import { getFontFamilyCss } from '@/lib/bannerFonts';

interface DailyOffersSectionProps {
  initialOffers?: DailyOffer[];
  previewOffer?: DailyOffer; // Allows live real-time preview in Admin Studio
  isLivePreview?: boolean;
  previewDevice?: 'desktop' | 'mobile';
}

const DEFAULT_BANNER_IMAGE = '/images/featured_digital_equipment.jpg';

export const DailyOffersSection: React.FC<DailyOffersSectionProps> = ({
  initialOffers,
  previewOffer,
  isLivePreview = false,
  previewDevice,
}) => {
  const router = useRouter();
  const [offers, setOffers] = useState<DailyOffer[]>(() => initialOffers || []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const loadOffers = () => {
    api
      .get('homepage/daily-offers/')
      .then((res) => {
        if (res.data?.data && Array.isArray(res.data.data)) {
          setOffers(res.data.data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (previewOffer) {
      setOffers([previewOffer]);
      setActiveIndex(0);
      setActiveItemIndex(0);
      return;
    }

    if (initialOffers && initialOffers.length > 0) {
      setOffers(initialOffers);
      return;
    }

    loadOffers();
  }, [initialOffers, previewOffer]);

  useEffect(() => {
    const handleUpdated = () => {
      loadOffers();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('daily-offers-updated', handleUpdated);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('daily-offers-updated', handleUpdated);
      }
    };
  }, []);

  const totalOffers = offers.length;
  const currentIndex = Math.min(activeIndex, Math.max(0, totalOffers - 1));
  const activeOffer = previewOffer || offers[currentIndex] || offers[0];

  if (!activeOffer) {
    return null;
  }

  // Multi-item / Multi-offer carousel detection
  const isMultiOffer = totalOffers > 1;
  const hasItems = Boolean(activeOffer.items && activeOffer.items.length > 1);
  const isMultiItem = !isMultiOffer && hasItems;
  const canNavigate = isMultiOffer || isMultiItem;
  const slideItems = isMultiOffer ? offers : (activeOffer.items || []);
  const currentSlideIndex = isMultiOffer ? currentIndex : activeItemIndex;

  const goToPrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isMultiOffer) {
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalOffers - 1));
      setActiveItemIndex(0);
    } else if (isMultiItem && activeOffer.items) {
      setActiveItemIndex((prev) => (prev > 0 ? prev - 1 : activeOffer.items!.length - 1));
    }
  };

  const goToNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isMultiOffer) {
      setActiveIndex((prev) => (prev < totalOffers - 1 ? prev + 1 : 0));
      setActiveItemIndex(0);
    } else if (isMultiItem && activeOffer.items) {
      setActiveItemIndex((prev) => (prev < activeOffer.items!.length - 1 ? prev + 1 : 0));
    }
  };

  const handleSlideSelect = (idx: number) => {
    if (isMultiOffer) {
      setActiveIndex(idx);
      setActiveItemIndex(0);
    } else {
      setActiveItemIndex(idx);
    }
  };

  // Autoplay rotation (6s) when multiple slides exist and not hovered / in studio preview
  useEffect(() => {
    if (isLivePreview || !canNavigate || isHovered) return;
    const interval = setInterval(() => {
      if (isMultiOffer) {
        setActiveIndex((prev) => (prev < totalOffers - 1 ? prev + 1 : 0));
      } else if (isMultiItem && activeOffer.items) {
        setActiveItemIndex((prev) => (prev < activeOffer.items!.length - 1 ? prev + 1 : 0));
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [canNavigate, isMultiOffer, isMultiItem, totalOffers, activeOffer.items, isLivePreview, isHovered]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (diff > 50) {
      goToNext();
    } else if (diff < -50) {
      goToPrev();
    }
    setTouchStart(null);
  };

  // Theme & Color resolution (Default FAAZO Teal)
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

  // Image & Layout configuration
  const currentItem = activeOffer.items?.[activeItemIndex] || null;
  const bannerImage =
    currentItem?.product_image ||
    activeOffer.desktop_image_url ||
    activeOffer.desktop_image ||
    DEFAULT_BANNER_IMAGE;
  const mobileBannerImage =
    currentItem?.product_image ||
    activeOffer.mobile_image_url ||
    activeOffer.mobile_image;
  const imagePos = activeOffer.image_position || 'right'; // 'left' | 'right' | 'center'
  const isBackgroundMode = imagePos === 'center';
  const isImageLeft = imagePos === 'left';
  const imageFit = activeOffer.image_fit || 'cover';

  // Preview device mode
  const isMobilePreview = previewDevice === 'mobile';
  const effectivePreviewImage = isMobilePreview && mobileBannerImage ? mobileBannerImage : bannerImage;

  // Font resolution
  const bannerFontFamily = getFontFamilyCss(activeOffer.font_family);

  // Dynamic Content Presence Checks (all optional)
  const hasTitle = Boolean(activeOffer.title?.trim());
  const hasSubheading = Boolean(activeOffer.subheading?.trim());
  const hasBadge = Boolean(activeOffer.badge_text?.trim());
  const hasOfferText = Boolean(activeOffer.offer_text?.trim());
  const hasSecondaryText = Boolean(activeOffer.secondary_text?.trim());
  const hasAnyText = hasTitle || hasSubheading || hasBadge || hasOfferText || hasSecondaryText;

  const hasCountdown = Boolean(activeOffer.countdown_enabled !== false && activeOffer.end_date);
  const hasCta = Boolean(activeOffer.cta_enabled !== false && activeOffer.cta_text?.trim());
  const hasAnyDynamicOverlay = hasAnyText || hasCountdown || hasCta;

  // Alignment & Positioning
  const hAlign = activeOffer.horizontal_alignment || (isBackgroundMode ? 'center' : 'left');
  const textAlignClass =
    hAlign === 'left' ? 'text-left items-start' : hAlign === 'right' ? 'text-right items-end' : 'text-center items-center';

  const vAlign = activeOffer.vertical_alignment || 'center';
  const vAlignClass =
    vAlign === 'top' ? 'justify-start' : vAlign === 'bottom' ? 'justify-end' : 'justify-center';

  const cWidth = activeOffer.content_width || 'large';
  const widthClass =
    cWidth === 'small' ? 'max-w-xl' : cWidth === 'medium' ? 'max-w-3xl' : cWidth === 'full' ? 'max-w-full' : 'max-w-5xl';

  // Element Specific Alignments
  const countdownAlign = activeOffer.countdown_position || hAlign;
  const countdownAlignClass =
    countdownAlign === 'center' ? 'items-center text-center' : countdownAlign === 'right' ? 'items-end text-right' : 'items-start text-left';

  const ctaAlign = activeOffer.cta_position || hAlign;
  const ctaAlignClass =
    ctaAlign === 'center' ? 'self-center' : ctaAlign === 'right' ? 'self-end' : 'self-start';

  // Dedicated offer landing page destination
  const targetOfferId = activeOffer.id || 'current';
  const offerPageUrl = `/daily-offers/${targetOfferId}`;
  let ctaDestination = offerPageUrl;
  if (activeOffer.cta_action_type === 'product' && activeOffer.cta_target_id) {
    ctaDestination = `/products/${activeOffer.cta_target_id}`;
  } else if (activeOffer.cta_action_type === 'category' && activeOffer.cta_target_id) {
    ctaDestination = `/products/category/${activeOffer.cta_target_id}`;
  } else if (activeOffer.cta_action_type === 'brand' && activeOffer.cta_target_id) {
    ctaDestination = `/brands/${activeOffer.cta_target_id}`;
  } else if (activeOffer.cta_action_type === 'url' && activeOffer.cta_url && activeOffer.cta_url !== '/offers') {
    ctaDestination = activeOffer.cta_url.startsWith('/daily-offers') ? offerPageUrl : activeOffer.cta_url;
  }

  // Handle banner navigation click
  const handleNavigate = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (isLivePreview) return;
    router.push(ctaDestination);
  };

  // Overlay opacity: 0 if no dynamic overlay (clean image banner), or configured opacity if text exists
  const effectiveOverlayOpacity = hasAnyDynamicOverlay ? (activeOffer.overlay_opacity ?? 60) : 0;

  return (
    <section
      onClick={handleNavigate}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`w-full relative overflow-hidden my-8 sm:my-12 transition-all duration-500 select-none ${
        !hasAnyDynamicOverlay && isBackgroundMode
          ? isMobilePreview
            ? 'h-[220px]'
            : 'h-[280px] sm:h-[380px] md:h-[460px] lg:h-[520px]'
          : 'min-h-[320px]'
      } ${
        isLivePreview
          ? 'rounded-2xl border border-slate-200 cursor-default'
          : 'cursor-pointer group hover:shadow-[0_20px_50px_rgba(0,102,112,0.22)]'
      }`}
      style={{
        background: bgGradient || bgColor,
        fontFamily: bannerFontFamily,
      }}
      aria-label="Daily Offers & Hot Deals"
    >
      {/* ============================================================
          MODE 1: FULL BACKGROUND IMAGE LAYOUT (image_position === 'center')
         ============================================================ */}
      {isBackgroundMode && (
        <>
          <div className="absolute inset-0 z-0 pointer-events-none">
            {isLivePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={effectivePreviewImage}
                alt={activeOffer.title || 'Daily Offer Banner'}
                className={`w-full h-full object-${imageFit} object-center transform group-hover:scale-102 transition-transform duration-700`}
              />
            ) : (
              <picture className="absolute inset-0 w-full h-full">
                {mobileBannerImage && (
                  <source media="(max-width: 639px)" srcSet={mobileBannerImage} />
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerImage}
                  alt={activeOffer.title || 'Daily Offer Banner'}
                  className={`w-full h-full object-${imageFit} object-center transform group-hover:scale-102 transition-transform duration-700`}
                />
              </picture>
            )}

            {/* Gradient overlay only rendered if text/countdown/cta overlay is active */}
            {effectiveOverlayOpacity > 0 && (
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, rgba(0,43,48,${effectiveOverlayOpacity / 100}) 0%, rgba(0,77,84,${(effectiveOverlayOpacity * 0.85) / 100}) 100%)`,
                }}
              />
            )}
          </div>
        </>
      )}

      {/* Decorative Radial Glow (Only if dynamic text exists to prevent washing out clean images) */}
      {hasAnyDynamicOverlay && (
        <>
          <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[700px] h-[350px] bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 translate-x-1/2 w-[600px] h-[300px] bg-black/20 rounded-full blur-3xl pointer-events-none" />
        </>
      )}

      {/* ============================================================
          BANNER INNER CONTENT
         ============================================================ */}
      <div
        className={`relative z-10 max-w-[1440px] mx-auto ${
          isBackgroundMode && hasAnyDynamicOverlay
            ? isMobilePreview
              ? 'min-h-[220px] flex flex-col ' + vAlignClass
              : 'min-h-[340px] sm:min-h-[420px] md:min-h-[480px] flex flex-col ' + vAlignClass
            : ''
        } ${
          isMobilePreview ? 'px-4 py-8' : 'px-4 sm:px-6 lg:px-8 py-10 sm:py-14 md:py-16'
        } ${!hasAnyDynamicOverlay && isBackgroundMode ? 'pointer-events-none' : ''}`}
      >
        {isBackgroundMode ? (
          /* Background Mode: Centered / Configurable Content Stack */
          hasAnyDynamicOverlay ? (
            <div className={`w-full flex flex-col ${textAlignClass} ${vAlignClass} ${widthClass} ${hAlign === 'center' ? 'mx-auto' : hAlign === 'right' ? 'ml-auto' : 'mr-auto'}`}>
              {/* Badge & Offer Tag Row */}
              {(hasBadge || hasOfferText) && (
                <div
                  className={`flex items-center gap-2.5 flex-wrap mb-3.5 ${
                    hAlign === 'center' ? 'justify-center' : hAlign === 'right' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {hasBadge && (
                    <span
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black tracking-wide shadow-md uppercase"
                      style={{ backgroundColor: badgeBgColor, color: badgeTextColor }}
                    >
                      <Flame className="w-4 h-4 fill-current animate-bounce" />
                      {activeOffer.badge_text}
                    </span>
                  )}

                  {hasOfferText && (
                    <span
                      className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs sm:text-sm font-black tracking-wider bg-black/40 backdrop-blur-md border border-white/20 shadow-inner"
                      style={{ color: offerColor }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {activeOffer.offer_text}
                    </span>
                  )}
                </div>
              )}

              {/* Title */}
              {hasTitle && (
                <h2
                  className={`${
                    isMobilePreview ? 'text-2xl font-black' : 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black'
                  } tracking-tight leading-[1.12] mb-3.5 drop-shadow-md`}
                  style={{ color: headingColor }}
                >
                  {activeOffer.title}
                </h2>
              )}

              {/* Subtitle */}
              {hasSubheading && (
                <p
                  className="text-sm sm:text-base md:text-lg font-medium opacity-95 max-w-2xl mb-6 drop-shadow-sm"
                  style={{ color: descColor }}
                >
                  {activeOffer.subheading}
                </p>
              )}

              {/* Countdown & CTA */}
              {(hasCountdown || hasCta) && (
                <div
                  className={`flex items-center gap-5 sm:gap-7 flex-wrap pt-1 ${
                    hAlign === 'center' ? 'justify-center' : hAlign === 'right' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {hasCountdown && (
                    <div className={`flex flex-col ${countdownAlignClass} gap-1`}>
                      <span
                        className="text-[10px] sm:text-[11px] uppercase tracking-widest font-black opacity-80"
                        style={{ color: descColor }}
                      >
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

                  {hasCta && (
                    <div className={`${ctaAlignClass} mt-2 sm:mt-0`}>
                      <button
                        type="button"
                        onClick={handleNavigate}
                        className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-black text-sm sm:text-base tracking-wide shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-2xl active:translate-y-0 cursor-pointer"
                        style={{
                          backgroundColor: ctaBgColor,
                          color: ctaTextColor,
                          border: ctaBorderColor ? `2px solid ${ctaBorderColor}` : undefined,
                        }}
                      >
                        <span>{activeOffer.cta_text}</span>
                        <ArrowRight className="w-4 h-4 stroke-[3] group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {hasSecondaryText && (
                <span className="text-xs opacity-75 mt-3.5 font-medium" style={{ color: descColor }}>
                  {activeOffer.secondary_text}
                </span>
              )}
            </div>
          ) : null
        ) : (
          /* ============================================================
             MODE 2: SPLIT LAYOUT (Content + High-Impact Promotional Image)
             ============================================================ */
          <div
            className={`grid grid-cols-1 ${
              isMobilePreview || !hasAnyDynamicOverlay ? 'gap-6' : 'lg:grid-cols-12 gap-8 lg:gap-12'
            } items-center`}
          >
            {/* Content Column (Only rendered when dynamic text or CTA exists) */}
            {hasAnyDynamicOverlay && (
              <div
                className={`flex flex-col ${textAlignClass} ${
                  isMobilePreview ? 'w-full' : 'lg:col-span-7'
                } ${isImageLeft && !isMobilePreview ? 'lg:order-2' : 'lg:order-1'}`}
              >
                {/* Badges */}
                {(hasBadge || hasOfferText) && (
                  <div
                    className={`flex items-center gap-2.5 flex-wrap mb-3.5 ${
                      hAlign === 'center' ? 'justify-center' : hAlign === 'right' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {hasBadge && (
                      <span
                        className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black tracking-wide shadow-md uppercase"
                        style={{ backgroundColor: badgeBgColor, color: badgeTextColor }}
                      >
                        {activeOffer.badge_text?.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/gu, '').trim()}
                      </span>
                    )}

                    {hasOfferText && (
                      <span
                        className="inline-flex items-center px-3.5 py-1 rounded-full text-xs sm:text-sm font-black tracking-wider bg-black/30 backdrop-blur-md border border-white/20 shadow-inner"
                        style={{ color: offerColor }}
                      >
                        {activeOffer.offer_text?.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/gu, '').trim()}
                      </span>
                    )}
                  </div>
                )}

                {/* Title */}
                {hasTitle && (
                  <h2
                    className={`${
                      isMobilePreview ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl md:text-5xl'
                    } font-black tracking-tight leading-[1.12] mb-3.5`}
                    style={{ color: headingColor }}
                  >
                    {activeOffer.title}
                  </h2>
                )}

                {/* Subheading */}
                {hasSubheading && (
                  <p
                    className="text-sm sm:text-base md:text-lg font-medium opacity-95 max-w-xl mb-6"
                    style={{ color: descColor }}
                  >
                    {activeOffer.subheading}
                  </p>
                )}

                {/* Countdown & CTA */}
                {(hasCountdown || hasCta) && (
                  <div
                    className={`flex items-center gap-5 sm:gap-7 flex-wrap pt-1 ${
                      hAlign === 'center' ? 'justify-center' : hAlign === 'right' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {hasCountdown && (
                      <div className={`flex flex-col ${countdownAlignClass} gap-1`}>
                        <span
                          className="text-[10px] sm:text-[11px] uppercase tracking-widest font-black opacity-80"
                          style={{ color: descColor }}
                        >
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

                    {hasCta && (
                      <div className={`${ctaAlignClass} mt-2 sm:mt-0`}>
                        <button
                          type="button"
                          onClick={handleNavigate}
                          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-black text-sm sm:text-base tracking-wide shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-2xl active:translate-y-0 cursor-pointer"
                          style={{
                            backgroundColor: ctaBgColor,
                            color: ctaTextColor,
                            border: ctaBorderColor ? `2px solid ${ctaBorderColor}` : undefined,
                          }}
                        >
                          <span>{activeOffer.cta_text}</span>
                          <ArrowRight className="w-4 h-4 stroke-[3] group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {hasSecondaryText && (
                  <span className="text-xs opacity-75 mt-3.5 font-medium" style={{ color: descColor }}>
                    {activeOffer.secondary_text}
                  </span>
                )}
              </div>
            )}

            {/* Promotional Image Column */}
            <div
              className={`${
                !hasAnyDynamicOverlay
                  ? 'w-full h-[320px] sm:h-[420px] lg:h-[500px]'
                  : isMobilePreview
                  ? 'w-full h-[220px]'
                  : 'lg:col-span-5 h-[280px] sm:h-[340px] lg:h-[400px]'
              } relative w-full flex items-center justify-center ${
                isImageLeft && hasAnyDynamicOverlay && !isMobilePreview ? 'lg:order-1' : 'lg:order-2'
              }`}
            >
              <div
                className={`relative w-full h-full rounded-2xl overflow-hidden ${
                  !hasAnyDynamicOverlay
                    ? 'shadow-xl'
                    : 'shadow-2xl border border-white/15 bg-white/5 backdrop-blur-xs'
                } group-hover:scale-102 transition-transform duration-500`}
              >
                {isLivePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={effectivePreviewImage}
                    alt={activeOffer.title || 'Daily Offer Banner'}
                    className={`w-full h-full object-${imageFit} object-center ${
                      !hasAnyDynamicOverlay ? '' : 'p-2'
                    }`}
                  />
                ) : (
                  <picture className="w-full h-full flex items-center justify-center">
                    {mobileBannerImage && (
                      <source media="(max-width: 639px)" srcSet={mobileBannerImage} />
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bannerImage}
                      alt={activeOffer.title || 'Daily Offer Banner'}
                      className={`w-full h-full object-${imageFit} object-center ${
                        !hasAnyDynamicOverlay ? '' : 'p-2'
                      }`}
                    />
                  </picture>
                )}
                {/* Subtle sheen highlight only when overlay exists */}
                {hasAnyDynamicOverlay && (
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10 pointer-events-none" />
                )}

                {/* Inner side arrows on image card for multi-item offers */}
                {hasItems && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveItemIndex((prev) =>
                          prev > 0 ? prev - 1 : (activeOffer.items?.length || 1) - 1
                        );
                      }}
                      aria-label="Previous item image"
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-all duration-200 z-20 cursor-pointer shadow-md hover:scale-110 active:scale-95 border border-white/20"
                    >
                      <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveItemIndex((prev) =>
                          prev < (activeOffer.items?.length || 1) - 1 ? prev + 1 : 0
                        );
                      }}
                      aria-label="Next item image"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-all duration-200 z-20 cursor-pointer shadow-md hover:scale-110 active:scale-95 border border-white/20"
                    >
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SIDE ARROWS & CAROUSEL CONTROLS (Left and Right Slide Navigation)
      ───────────────────────────────────────────────────────────── */}
      {canNavigate && (
        <>
          {/* Previous Slide Arrow Button */}
          <button
            type="button"
            onClick={goToPrev}
            aria-label="Previous Slide"
            className="absolute left-2.5 sm:left-5 md:left-7 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full bg-white/90 hover:bg-white text-slate-800 hover:text-[#004D54] shadow-lg hover:shadow-2xl border border-white/60 flex items-center justify-center transition-all duration-200 z-30 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 group/arrow"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5] text-slate-700 group-hover/arrow:text-[#004D54] group-hover/arrow:-translate-x-0.5 transition-transform" />
          </button>

          {/* Next Slide Arrow Button */}
          <button
            type="button"
            onClick={goToNext}
            aria-label="Next Slide"
            className="absolute right-2.5 sm:right-5 md:right-7 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full bg-white/90 hover:bg-white text-slate-800 hover:text-[#004D54] shadow-lg hover:shadow-2xl border border-white/60 flex items-center justify-center transition-all duration-200 z-30 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 group/arrow"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5] text-slate-700 group-hover/arrow:text-[#004D54] group-hover/arrow:translate-x-0.5 transition-transform" />
          </button>

          {/* Pagination Indicators / Dots */}
          <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-30 bg-black/30 hover:bg-black/45 backdrop-blur-md px-3 py-1.5 rounded-full transition-all">
            {slideItems.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSlideSelect(idx);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === currentSlideIndex
                    ? 'w-6 sm:w-7 h-2 bg-white shadow-sm'
                    : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default DailyOffersSection;
