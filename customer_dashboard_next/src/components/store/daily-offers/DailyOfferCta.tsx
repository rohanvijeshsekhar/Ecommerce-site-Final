'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getFontFamilyCss } from '@/lib/bannerFonts';

export type CtaTemplate = 'solid' | 'outline' | 'text_link' | 'soft_filled' | 'dark_premium';
export type CtaSize = 'small' | 'medium' | 'large';
export type CtaBorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';

export interface DailyOfferCtaProps {
  label?: string;
  href?: string;
  template?: CtaTemplate;
  size?: CtaSize;
  borderRadius?: CtaBorderRadius;
  showArrow?: boolean;
  openInNewTab?: boolean;
  disabled?: boolean;
  fontFamily?: string;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const DailyOfferCta: React.FC<DailyOfferCtaProps> = ({
  label = "Shop Today's Deals",
  href = '/offers',
  template = 'solid',
  size = 'medium',
  borderRadius = 'md',
  showArrow = true,
  openInNewTab = false,
  disabled = false,
  fontFamily = 'Inter',
  fontWeight = 'bold',
  bgColor,
  textColor,
  borderColor,
  className = '',
  onClick,
}) => {
  const cleanLabel = label.replace(/[→⚡🔥✨]/g, '').trim() || "Shop Today's Deals";

  // Size styles
  const sizeClasses = {
    small: 'text-xs px-3 py-1.5 gap-1.5',
    medium: 'text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 gap-2',
    large: 'text-sm sm:text-base px-6 sm:px-7 py-3 sm:py-3.5 gap-2.5',
  }[size] || 'text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 gap-2';

  const iconSizes = {
    small: 'w-3 h-3',
    medium: 'w-3.5 h-3.5 sm:w-4 sm:h-4',
    large: 'w-4 h-4 sm:w-5 sm:h-5',
  }[size] || 'w-3.5 h-3.5';

  // Border radius styles
  const radiusClass = {
    none: 'rounded-none',
    sm: 'rounded-md',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    full: 'rounded-full',
  }[borderRadius] || 'rounded-xl';

  // Font weight classes
  const weightClass = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    extrabold: 'font-extrabold',
  }[fontWeight] || 'font-bold';

  const fontStyle: React.CSSProperties = {
    fontFamily: getFontFamilyCss(fontFamily),
  };

  // Base layout styles
  const baseClass = `inline-flex items-center justify-center tracking-tight transition-all duration-200 select-none ${weightClass} ${radiusClass} ${className}`;

  if (disabled) {
    return (
      <span
        className={`${baseClass} ${sizeClasses} bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/50 shadow-none`}
        style={fontStyle}
      >
        <span>{cleanLabel}</span>
      </span>
    );
  }

  // Template-specific style classes & custom inline colors
  let templateClass = '';
  const inlineStyles: React.CSSProperties = { ...fontStyle };

  switch (template) {
    case 'outline':
      templateClass = 'bg-white hover:bg-[#005F63]/5 text-[#005F63] border border-[#005F63] shadow-2xs hover:shadow-xs';
      if (borderColor) inlineStyles.borderColor = borderColor;
      if (textColor) inlineStyles.color = textColor;
      if (bgColor) inlineStyles.backgroundColor = bgColor;
      break;

    case 'text_link':
      templateClass = 'bg-transparent text-[#005F63] hover:text-[#00474a] p-0 shadow-none border-0 group/cta underline-offset-4 hover:underline';
      if (textColor) inlineStyles.color = textColor;
      break;

    case 'soft_filled':
      templateClass = 'bg-[#E6F4F6] hover:bg-[#d6eff2] text-[#005F63] border border-[#005F63]/15 shadow-2xs hover:shadow-xs';
      if (bgColor) inlineStyles.backgroundColor = bgColor;
      if (textColor) inlineStyles.color = textColor;
      if (borderColor) inlineStyles.borderColor = borderColor;
      break;

    case 'dark_premium':
      templateClass = 'bg-[#0B1D26] hover:bg-[#132733] text-white border border-slate-700/60 shadow-sm hover:shadow-md';
      if (bgColor) inlineStyles.backgroundColor = bgColor;
      if (textColor) inlineStyles.color = textColor;
      break;

    case 'solid':
    default:
      templateClass = 'bg-[#005F63] hover:bg-[#004d50] text-white border border-[#005F63]/30 shadow-sm hover:shadow-md hover:-translate-y-0.5';
      if (bgColor) inlineStyles.backgroundColor = bgColor;
      if (textColor) inlineStyles.color = textColor;
      if (borderColor) inlineStyles.borderColor = borderColor;
      break;
  }

  const content = (
    <>
      <span className="truncate">{cleanLabel}</span>
      {showArrow && (
        <ArrowRight
          className={`${iconSizes} transition-transform duration-200 group-hover:translate-x-1 shrink-0`}
        />
      )}
    </>
  );

  const fullClasses = `${baseClass} ${template === 'text_link' ? 'gap-1.5' : sizeClasses} ${templateClass} group cursor-pointer`;

  const isExternal = href.startsWith('http://') || href.startsWith('https://');

  if (isExternal || openInNewTab) {
    return (
      <a
        href={href}
        target={openInNewTab ? '_blank' : '_self'}
        rel={openInNewTab ? 'noopener noreferrer' : undefined}
        className={fullClasses}
        style={inlineStyles}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={fullClasses} style={inlineStyles} onClick={onClick}>
      {content}
    </Link>
  );
};

export default DailyOfferCta;
