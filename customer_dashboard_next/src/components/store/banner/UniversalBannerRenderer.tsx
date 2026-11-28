'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { UniversalBannerLayout, BannerElement, DeviceBreakpoint } from '@/admin/components/banner-editor/types';
import { resolveElementTransform } from '@/admin/components/banner-editor/types';
import { getFontFamilyCss } from '@/lib/bannerFonts';
import { getAbsoluteImageUrl } from '@/lib/api';
import { DailyOfferCountdown } from '../daily-offers/DailyOfferCountdown';

interface UniversalBannerRendererProps {
  layout: UniversalBannerLayout;
  aspectRatio?: string;
  className?: string;
  priority?: boolean;
}

export const UniversalBannerRenderer: React.FC<UniversalBannerRendererProps> = ({
  layout,
  aspectRatio,
  className = '',
  priority = false,
}) => {
  const [breakpoint, setBreakpoint] = useState<DeviceBreakpoint>('desktop');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateBp = () => {
      const w = window.innerWidth;
      if (w < 640) {
        setBreakpoint('mobile');
      } else if (w < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    updateBp();
    window.addEventListener('resize', updateBp);
    return () => window.removeEventListener('resize', updateBp);
  }, []);

  if (!layout || !layout.elements) return null;

  // Resolve responsive background image
  const bgImage =
    breakpoint === 'mobile' && layout.mobileBackgroundImageUrl
      ? layout.mobileBackgroundImageUrl
      : layout.backgroundImageUrl;

  const activeAspectRatio =
    aspectRatio ||
    (breakpoint === 'mobile'
      ? layout.aspectRatio?.mobile || '3/3.7'
      : breakpoint === 'tablet'
      ? layout.aspectRatio?.tablet || '2/1'
      : layout.aspectRatio?.desktop || '3/1');

  return (
    <div
      style={{
        aspectRatio: activeAspectRatio,
        backgroundColor: layout.backgroundColor || '#005F63',
      }}
      className={`relative w-full overflow-hidden select-none ${className}`}
    >
      {/* Background Image */}
      {bgImage && (
        <div
          className="absolute inset-0 w-full h-full z-0 select-none pointer-events-none"
          style={{
            backgroundImage: `url(${getAbsoluteImageUrl(bgImage)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Overlay Gradient */}
      {layout.overlayGradient && layout.overlayGradient !== 'none' && (
        <div
          className="absolute inset-0 pointer-events-none select-none z-1"
          style={{
            background:
              layout.overlayGradient === 'dark'
                ? 'linear-gradient(to right, rgba(0,0,0,0.7), transparent)'
                : layout.overlayGradient === 'light'
                ? 'linear-gradient(to right, rgba(255,255,255,0.85), transparent)'
                : layout.overlayGradient === 'fade-right'
                ? 'linear-gradient(to right, rgba(0,95,99,0.85) 40%, transparent 100%)'
                : 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
            opacity: layout.overlayOpacity ?? 0.25,
          }}
        />
      )}

      {/* Render Positioned Elements */}
      {layout.elements.map((el) => {
        const t = resolveElementTransform(el, breakpoint);
        if (!t.visible) return null;

        const fontCss = getFontFamilyCss(el.typography?.fontFamily);
        const textStyle: React.CSSProperties = {
          fontFamily: fontCss,
          fontSize: `${t.fontSize || el.typography?.fontSize || 16}px`,
          fontWeight:
            el.typography?.fontWeight === 'extrabold'
              ? 800
              : el.typography?.fontWeight === 'bold'
              ? 700
              : el.typography?.fontWeight === 'semibold'
              ? 600
              : el.typography?.fontWeight === 'black'
              ? 900
              : 400,
          color: el.typography?.textColor || '#0F172A',
          textAlign: t.textAlign || el.typography?.textAlign || 'left',
          lineHeight: el.typography?.lineHeight || 1.25,
          letterSpacing: el.typography?.letterSpacing || 'normal',
        };

        const renderContent = () => {
          // 1. Heading
          if (el.type === 'heading') {
            return (
              <h2 style={textStyle} className="tracking-tight wrap-break-word">
                {el.content}
              </h2>
            );
          }

          // 2. Subheading / Description / Custom Text
          if (
            el.type === 'subheading' ||
            el.type === 'description' ||
            el.type === 'promotional_text' ||
            el.type === 'custom_text'
          ) {
            return (
              <p style={textStyle} className="wrap-break-word">
                {el.content}
              </p>
            );
          }

          // 3. Badge or Discount
          if (el.type === 'badge' || el.type === 'discount') {
            return (
              <span
                style={{
                  ...textStyle,
                  backgroundColor:
                    el.appearance?.backgroundColor || (el.type === 'badge' ? '#E6F4F4' : '#F0FDFA'),
                  borderColor:
                    el.appearance?.borderColor || (el.type === 'badge' ? '#B2DFDB' : '#99F6E4'),
                  borderWidth: `${el.appearance?.borderWidth ?? 1}px`,
                  borderRadius: `${el.appearance?.borderRadius ?? 9999}px`,
                  padding: el.appearance?.padding || '4px 12px',
                  display: 'inline-block',
                }}
                className="shadow-2xs font-bold"
              >
                {el.content}
              </span>
            );
          }

          // 4. CTA Button
          if (el.type === 'cta') {
            const cta = el.cta || {};
            const template = cta.template || 'solid';
            let btnClass = 'inline-flex items-center gap-1.5 font-bold transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] ';

            let btnBg = cta.bgColor || '#005F63';
            let btnColor = cta.textColor || '#FFFFFF';
            let btnBorder = cta.borderColor || '#005F63';

            if (template === 'outline') {
              btnBg = 'transparent';
              btnColor = cta.textColor || '#005F63';
              btnBorder = cta.borderColor || '#005F63';
            } else if (template === 'text_link') {
              btnBg = 'transparent';
              btnColor = cta.textColor || '#005F63';
              btnBorder = 'transparent';
              btnClass = 'inline-flex items-center gap-1 font-bold underline hover:opacity-80 ';
            } else if (template === 'soft_filled') {
              btnBg = cta.bgColor || '#E6F4F4';
              btnColor = cta.textColor || '#005F63';
              btnBorder = 'transparent';
            } else if (template === 'dark_premium') {
              btnBg = cta.bgColor || '#0F172A';
              btnColor = '#FFFFFF';
              btnBorder = '#1E293B';
            }

            const paddingClass =
              cta.size === 'small'
                ? 'px-3.5 py-1.5 text-xs'
                : cta.size === 'large'
                ? 'px-6 py-3 text-base'
                : 'px-4.5 py-2.5 text-sm';

            const rad =
              cta.borderRadius === 'none'
                ? '0px'
                : cta.borderRadius === 'sm'
                ? '4px'
                : cta.borderRadius === 'lg'
                ? '12px'
                : cta.borderRadius === 'full'
                ? '9999px'
                : '8px';

            const buttonInner = (
              <span
                style={{
                  backgroundColor: btnBg,
                  color: btnColor,
                  borderColor: btnBorder,
                  borderWidth: template === 'outline' ? '1.5px' : '1px',
                  borderRadius: rad,
                  fontFamily: fontCss,
                }}
                className={`${btnClass} ${paddingClass}`}
              >
                <span>{cta.label || 'Shop Now'}</span>
                {cta.showArrow !== false && <ArrowRight className="w-3.5 h-3.5" />}
              </span>
            );

            if (cta.link) {
              const isExternal = cta.link.startsWith('http://') || cta.link.startsWith('https://');
              if (isExternal || cta.openNewTab) {
                return (
                  <a
                    href={cta.link}
                    target={cta.openNewTab ? '_blank' : undefined}
                    rel={cta.openNewTab ? 'noopener noreferrer' : undefined}
                  >
                    {buttonInner}
                  </a>
                );
              }
              return <Link href={cta.link}>{buttonInner}</Link>;
            }

            return buttonInner;
          }

          // 5. Countdown Timer
          if (el.type === 'countdown') {
            const cd = el.countdown || {};
            return (
              <DailyOfferCountdown
                endDate={cd.targetDate}
                template={cd.template || 'minimal_inline'}
                size={cd.size || 'regular'}
                fontFamily={cd.numberFont || 'Inter'}
                bgColor={cd.bgColor}
                textColor={cd.textColor}
                expiredBehavior={cd.expiredBehavior || 'show_expired_badge'}
              />
            );
          }

          // 6. Image
          if (el.type === 'custom_image' || el.type === 'product_image' || el.type === 'logo') {
            const img = el.imageUrl || el.content;
            if (!img) return null;
            return (
              <img
                src={getAbsoluteImageUrl(img)}
                alt={el.name}
                className="w-full h-full object-contain pointer-events-none select-none rounded-lg"
              />
            );
          }

          return null;
        };

        return (
          <div
            key={el.id}
            style={{
              position: 'absolute',
              left: `${t.x}%`,
              top: `${t.y}%`,
              width: t.width === 'auto' ? 'max-content' : `${t.width}%`,
              height: t.height === 'auto' ? 'auto' : `${t.height}%`,
              transform: `rotate(${t.rotation || 0}deg)`,
              zIndex: el.zIndex,
              opacity: el.appearance?.opacity ?? 1,
            }}
            className="transition-all duration-300"
          >
            {renderContent()}
          </div>
        );
      })}
    </div>
  );
};
