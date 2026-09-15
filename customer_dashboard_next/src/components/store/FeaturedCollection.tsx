'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';

export interface FeaturedCollectionData {
  id: string;
  title: string;
  description: string;
  image?: string | null;
  image_url?: string | null;
  mobile_image?: string | null;
  mobile_image_url?: string | null;
  banner_layout?: 'split' | 'background' | 'solid';
  content_width?: 'narrow' | 'medium' | 'wide' | 'full';
  horizontal_alignment?: 'left' | 'center' | 'right';
  vertical_alignment?: 'top' | 'center' | 'bottom';
  badge_text?: string;
  offer_text?: string;
  secondary_text?: string;
  cta_text?: string;
  cta_action_type?: string;
  cta_target_id?: string;
  cta_url?: string;
  cta_style?: 'filled' | 'outline' | 'ghost';
  cta_open_in_new_tab?: boolean;
  heading_size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  heading_weight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
  heading_color?: string;
  description_color?: string;
  badge_color?: string;
  badge_bg_color?: string;
  cta_bg_color?: string;
  cta_text_color?: string;
  cta_border_color?: string;
  bg_color?: string;
  image_position?: 'left' | 'right';
  image_fit?: 'cover' | 'contain';
  overlay_gradient?: 'none' | 'left' | 'right' | 'top' | 'bottom' | 'radial' | 'dark';
  overlay_opacity?: number;
  is_visible?: boolean;
  sort_order?: number;
  start_date?: string | null;
  end_date?: string | null;
  items?: any[];
}

interface FeaturedCollectionProps {
  initialCollections?: FeaturedCollectionData[];
}

const FeaturedCollection: React.FC<FeaturedCollectionProps> = ({ initialCollections }) => {
  const getVisibleList = (list?: FeaturedCollectionData[]) => {
    if (!Array.isArray(list)) return [];
    return list.filter((c) => c.is_visible !== false);
  };

  const [collections, setCollections] = useState<FeaturedCollectionData[]>(() => getVisibleList(initialCollections));
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [hasLoaded, setHasLoaded] = useState<boolean>(initialCollections !== undefined);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    api.get('homepage/featured-collections/')
      .then(res => {
        const data = res.data?.data ?? res.data?.results ?? res.data ?? [];
        const visible = getVisibleList(data);
        setCollections(visible);
        setHasLoaded(true);
      })
      .catch(() => {
        setHasLoaded(true);
      });
  }, []);

  // Carousel auto-play timer (cycles every 6s if more than 1 banner and not paused)
  useEffect(() => {
    if (collections.length <= 1 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % collections.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [collections.length, isPaused]);

  if (hasLoaded && collections.length === 0) {
    return null;
  }

  const activeCollection: FeaturedCollectionData = collections[activeIndex] || collections[0] || {
    id: 'default',
    title: 'Advanced Solutions for Every Practice',
    description: 'Engineered for precision. Designed for comfort. Built to elevate patient care.',
  };

  const goToPrev = () => {
    setActiveIndex(prev => (prev === 0 ? collections.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setActiveIndex(prev => (prev + 1) % collections.length);
  };

  // Helper resolvers for styles
  const layout = activeCollection.banner_layout || 'split';
  const imgPos = activeCollection.image_position || 'right';
  const imgFit = activeCollection.image_fit || 'contain';
  const hAlign = activeCollection.horizontal_alignment || 'left';
  const vAlign = activeCollection.vertical_alignment || 'center';
  const contentWidth = activeCollection.content_width || 'medium';

  const headingSizeClass = {
    sm: 'text-2xl sm:text-3xl lg:text-4xl',
    md: 'text-3xl sm:text-4xl lg:text-5xl',
    lg: 'text-4xl sm:text-5xl lg:text-6xl',
    xl: 'text-5xl sm:text-6xl lg:text-7xl',
    '2xl': 'text-6xl sm:text-7xl lg:text-8xl',
  }[activeCollection.heading_size || 'lg'];

  const headingWeightClass = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    black: 'font-black',
  }[activeCollection.heading_weight || 'black'];

  const contentWidthClass = {
    narrow: 'max-w-xl',
    medium: 'max-w-2xl',
    wide: 'max-w-4xl',
    full: 'max-w-full',
  }[contentWidth];

  const textAlignClass = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  }[hAlign];

  const verticalAlignClass = {
    top: 'justify-start pt-12 lg:pt-16',
    center: 'justify-center py-10 lg:py-16',
    bottom: 'justify-end pb-12 lg:pb-16',
  }[vAlign];

  const desktopImage = activeCollection.image_url || activeCollection.image || '/images/hero_equipment.png';
  const mobileImage = activeCollection.mobile_image_url || activeCollection.mobile_image || desktopImage;

  // Background gradient overlay for full-background mode
  const getOverlayStyle = () => {
    const opacity = (activeCollection.overlay_opacity ?? 40) / 100;
    const type = activeCollection.overlay_gradient || 'left';
    switch (type) {
      case 'left':
        return `linear-gradient(to right, rgba(0,0,0,${Math.min(0.95, opacity * 1.5)}) 0%, rgba(0,0,0,${opacity}) 55%, rgba(0,0,0,0.05) 100%)`;
      case 'right':
        return `linear-gradient(to left, rgba(0,0,0,${Math.min(0.95, opacity * 1.5)}) 0%, rgba(0,0,0,${opacity}) 55%, rgba(0,0,0,0.05) 100%)`;
      case 'top':
        return `linear-gradient(to bottom, rgba(0,0,0,${Math.min(0.95, opacity * 1.5)}) 0%, rgba(0,0,0,${opacity}) 55%, rgba(0,0,0,0.05) 100%)`;
      case 'bottom':
        return `linear-gradient(to top, rgba(0,0,0,${Math.min(0.95, opacity * 1.5)}) 0%, rgba(0,0,0,${opacity}) 55%, rgba(0,0,0,0.05) 100%)`;
      case 'dark':
        return `rgba(0,0,0,${opacity})`;
      case 'radial':
        return `radial-gradient(circle at center, rgba(0,0,0,${opacity * 0.4}) 0%, rgba(0,0,0,${Math.min(0.95, opacity * 1.4)}) 100%)`;
      case 'none':
      default:
        return 'transparent';
    }
  };

  // CTA button style builder
  const renderCtaButton = () => {
    const ctaText = activeCollection.cta_text || 'Explore Collection';
    const ctaUrl = activeCollection.cta_url || '/offers';
    const ctaStyle = activeCollection.cta_style || 'filled';
    const targetBlank = activeCollection.cta_open_in_new_tab;

    const customBg = activeCollection.cta_bg_color;
    const customText = activeCollection.cta_text_color;
    const customBorder = activeCollection.cta_border_color;

    let baseClasses = 'group inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-sm sm:text-base transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer select-none';

    let inlineStyle: React.CSSProperties = {};

    if (ctaStyle === 'filled') {
      baseClasses += ' shadow-lg hover:shadow-xl';
      inlineStyle = {
        backgroundColor: customBg || '#006670',
        color: customText || '#FFFFFF',
      };
    } else if (ctaStyle === 'outline') {
      baseClasses += ' border-2 backdrop-blur-sm hover:bg-white/10';
      inlineStyle = {
        borderColor: customBorder || '#006670',
        color: customText || customBorder || '#006670',
      };
    } else {
      // ghost
      baseClasses += ' hover:underline px-2 py-2';
      inlineStyle = {
        color: customText || '#006670',
      };
    }

    return (
      <Link
        href={ctaUrl}
        target={targetBlank ? '_blank' : undefined}
        rel={targetBlank ? 'noopener noreferrer' : undefined}
        className={baseClasses}
        style={inlineStyle}
      >
        <span>{ctaText}</span>
        {targetBlank ? (
          <ExternalLink className="w-4 h-4 transition-transform group-hover:scale-110" />
        ) : (
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" />
        )}
      </Link>
    );
  };

  return (
    <section
      id="featured-collection-banner"
      aria-label="Promotional Banner"
      className="w-full relative overflow-hidden select-none"
      style={{ backgroundColor: activeCollection.bg_color || '#E8F5F4' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ─────────────────────────────────────────────────────────────
          LAYOUT OPTION A: SPLIT IMAGE + CONTENT
      ───────────────────────────────────────────────────────────── */}
      {layout === 'split' && (
        <div className="w-full min-h-[460px] lg:min-h-[520px] grid grid-cols-1 lg:grid-cols-12 items-stretch relative">
          {/* Subtle Ambient Background Mesh */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply"
            style={{
              backgroundImage: 'radial-gradient(at 15% 15%, rgba(0, 102, 112, 0.12) 0px, transparent 60%), radial-gradient(at 85% 85%, rgba(13, 148, 136, 0.1) 0px, transparent 60%)',
            }}
          />

          {/* Content Column */}
          <div
            className={`w-full flex flex-col ${verticalAlignClass} ${textAlignClass} px-6 sm:px-12 lg:px-16 xl:px-20 z-10 lg:col-span-6 ${
              imgPos === 'left' ? 'order-1 lg:order-2' : 'order-1 lg:order-1'
            }`}
          >
            <div className={`w-full flex flex-col ${textAlignClass} ${contentWidthClass}`}>
              {/* Badge & Offer Pill row */}
              <div className="flex flex-wrap items-center gap-2.5 mb-4">
                {activeCollection.badge_text ? (
                  <div
                    className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black tracking-wider uppercase"
                    style={{
                      backgroundColor: activeCollection.badge_bg_color || 'rgba(0, 102, 112, 0.12)',
                      color: activeCollection.badge_color || '#006670',
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{activeCollection.badge_text}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#006670]/10 border border-[#006670]/20 text-[#006670] text-xs font-black tracking-wider uppercase">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>FEATURED COLLECTION</span>
                  </div>
                )}

                {activeCollection.offer_text && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-extrabold tracking-wide uppercase shadow-sm">
                    {activeCollection.offer_text}
                  </span>
                )}
              </div>

              {/* Main Headline */}
              <h2
                className={`${headingSizeClass} ${headingWeightClass} tracking-tight font-display mb-4 leading-[1.08] break-words`}
                style={{ color: activeCollection.heading_color || '#0F172A' }}
              >
                {activeCollection.title}
              </h2>

              {/* Description */}
              {activeCollection.description && (
                <p
                  className="text-base sm:text-lg mb-8 leading-relaxed font-normal opacity-90 max-w-xl"
                  style={{ color: activeCollection.description_color || '#334155' }}
                >
                  {activeCollection.description}
                </p>
              )}

              {/* Call to Action */}
              <div className="flex flex-col items-start gap-2">
                {renderCtaButton()}
                {activeCollection.secondary_text && (
                  <span className="text-xs text-slate-500 font-medium pl-1 mt-1">
                    {activeCollection.secondary_text}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Visual Column */}
          <div
            className={`w-full relative min-h-[340px] sm:min-h-[420px] lg:min-h-full flex items-center justify-center overflow-hidden lg:col-span-6 ${
              imgPos === 'left' ? 'order-2 lg:order-1' : 'order-2 lg:order-2'
            }`}
          >
            {imgFit === 'cover' ? (
              <picture className="w-full h-full absolute inset-0">
                <source media="(max-width: 768px)" srcSet={mobileImage} />
                <img
                  src={desktopImage}
                  alt={activeCollection.title}
                  className="w-full h-full object-cover object-center transform scale-100 hover:scale-105 transition-transform duration-700 ease-out"
                />
              </picture>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center p-8 sm:p-12 lg:p-14">
                {/* Soft backdrop radial glow */}
                <div className="absolute w-[80%] aspect-square rounded-full bg-white/60 blur-3xl -z-10 pointer-events-none" />
                <picture className="max-w-[560px] w-full flex items-center justify-center">
                  <source media="(max-width: 768px)" srcSet={mobileImage} />
                  <img
                    src={desktopImage}
                    alt={activeCollection.title}
                    className="w-full max-h-[440px] object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.12)] transform hover:scale-[1.02] transition-transform duration-500"
                  />
                </picture>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          LAYOUT OPTION B: FULL BACKGROUND IMAGE
      ───────────────────────────────────────────────────────────── */}
      {layout === 'background' && (
        <div className="w-full min-h-[460px] sm:min-h-[520px] lg:min-h-[580px] relative flex items-center">
          {/* Full bleed background picture */}
          <picture className="absolute inset-0 w-full h-full">
            <source media="(max-width: 768px)" srcSet={mobileImage} />
            <img
              src={desktopImage}
              alt={activeCollection.title}
              className="w-full h-full object-cover object-center"
            />
          </picture>

          {/* Configurable Overlay Gradient */}
          <div
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{ background: getOverlayStyle() }}
          />

          {/* Content Wrapper */}
          <div className="w-full relative z-10 px-6 sm:px-12 lg:px-20 py-12 lg:py-16">
            <div className={`w-full flex flex-col ${verticalAlignClass} ${textAlignClass}`}>
              <div className={`w-full flex flex-col ${textAlignClass} ${contentWidthClass}`}>
                {/* Badge & Offer Pill */}
                <div className="flex flex-wrap items-center gap-2.5 mb-4">
                  {activeCollection.badge_text ? (
                    <div
                      className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black tracking-wider uppercase backdrop-blur-md"
                      style={{
                        backgroundColor: activeCollection.badge_bg_color || 'rgba(255, 255, 255, 0.2)',
                        color: activeCollection.badge_color || '#FFFFFF',
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{activeCollection.badge_text}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 border border-white/30 backdrop-blur-md text-white text-xs font-black tracking-wider uppercase">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>FEATURED COLLECTION</span>
                    </div>
                  )}

                  {activeCollection.offer_text && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-extrabold tracking-wide uppercase shadow-md">
                      {activeCollection.offer_text}
                    </span>
                  )}
                </div>

                {/* Main Headline */}
                <h2
                  className={`${headingSizeClass} ${headingWeightClass} tracking-tight font-display mb-4 leading-[1.08] break-words drop-shadow-sm`}
                  style={{ color: activeCollection.heading_color || '#FFFFFF' }}
                >
                  {activeCollection.title}
                </h2>

                {/* Description */}
                {activeCollection.description && (
                  <p
                    className="text-base sm:text-lg mb-8 leading-relaxed font-normal opacity-95 max-w-xl drop-shadow-sm"
                    style={{ color: activeCollection.description_color || '#F1F5F9' }}
                  >
                    {activeCollection.description}
                  </p>
                )}

                {/* CTA */}
                <div className="flex flex-col items-start gap-2">
                  {renderCtaButton()}
                  {activeCollection.secondary_text && (
                    <span className="text-xs text-white/80 font-medium pl-1 mt-1 drop-shadow-sm">
                      {activeCollection.secondary_text}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          LAYOUT OPTION C: SOLID / GRADIENT MINIMAL
      ───────────────────────────────────────────────────────────── */}
      {layout === 'solid' && (
        <div className="w-full min-h-[420px] sm:min-h-[480px] relative flex items-center justify-center px-6 sm:px-12 lg:px-20 py-14 lg:py-20">
          <div className={`w-full flex flex-col ${verticalAlignClass} ${textAlignClass} ${contentWidthClass} z-10`}>
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2.5 mb-5">
              {activeCollection.badge_text && (
                <div
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase"
                  style={{
                    backgroundColor: activeCollection.badge_bg_color || 'rgba(0, 102, 112, 0.12)',
                    color: activeCollection.badge_color || '#006670',
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{activeCollection.badge_text}</span>
                </div>
              )}
              {activeCollection.offer_text && (
                <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-amber-500 text-white text-xs font-extrabold tracking-wide uppercase shadow-sm">
                  {activeCollection.offer_text}
                </span>
              )}
            </div>

            {/* Headline */}
            <h2
              className={`${headingSizeClass} ${headingWeightClass} tracking-tight font-display mb-4 leading-[1.08] break-words`}
              style={{ color: activeCollection.heading_color || '#0F172A' }}
            >
              {activeCollection.title}
            </h2>

            {/* Description */}
            {activeCollection.description && (
              <p
                className="text-base sm:text-lg mb-8 leading-relaxed font-normal opacity-90 max-w-2xl"
                style={{ color: activeCollection.description_color || '#334155' }}
              >
                {activeCollection.description}
              </p>
            )}

            {/* CTA */}
            <div className="flex flex-col items-start gap-2">
              {renderCtaButton()}
              {activeCollection.secondary_text && (
                <span className="text-xs text-slate-500 font-medium pl-1 mt-1">
                  {activeCollection.secondary_text}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MULTI-BANNER CAROUSEL CONTROLS (Only when > 1 banner)
      ───────────────────────────────────────────────────────────── */}
      {collections.length > 1 && (
        <>
          {/* Previous Slide Button */}
          <button
            type="button"
            onClick={goToPrev}
            aria-label="Previous Banner"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-md hover:shadow-lg flex items-center justify-center transition-all duration-200 z-20 backdrop-blur-sm group cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6 transition-transform group-hover:-translate-x-0.5" />
          </button>

          {/* Next Slide Button */}
          <button
            type="button"
            onClick={goToNext}
            aria-label="Next Banner"
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-md hover:shadow-lg flex items-center justify-center transition-all duration-200 z-20 backdrop-blur-sm group cursor-pointer"
          >
            <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Pagination Indicators / Dots */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 bg-black/20 hover:bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-full transition-colors">
            {collections.map((coll, idx) => (
              <button
                key={coll.id || idx}
                onClick={() => setActiveIndex(idx)}
                aria-label={`Go to slide ${idx + 1}: ${coll.title}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === activeIndex
                    ? 'w-7 h-2 bg-white shadow-sm'
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

export default FeaturedCollection;
