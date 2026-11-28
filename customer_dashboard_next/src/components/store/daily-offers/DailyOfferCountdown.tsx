'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getFontFamilyCss } from '@/lib/bannerFonts';

export type CountdownTemplate =
  | 'minimal_inline'
  | 'compact_cards'
  | 'elegant_text'
  | 'outlined'
  | 'dark_premium';

export interface DailyOfferCountdownProps {
  endDate?: string | null;
  startDate?: string | null;
  template?: CountdownTemplate;
  size?: 'compact' | 'regular' | 'large';
  fontFamily?: string;
  bgColor?: string;
  textColor?: string;
  expiredBehavior?: 'show_expired_badge' | 'hide_cta' | 'disable_cta';
  onExpire?: (isExpired: boolean) => void;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export const DailyOfferCountdown: React.FC<DailyOfferCountdownProps> = ({
  endDate,
  template = 'minimal_inline',
  size = 'regular',
  fontFamily = 'Inter',
  bgColor,
  textColor,
  expiredBehavior = 'show_expired_badge',
  onExpire,
  className = '',
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining | null>(null);

  const calculateTime = (targetIso?: string | null): TimeRemaining => {
    if (!targetIso) {
      // Default demo 3 days if not set
      return { days: 3, hours: 14, minutes: 28, seconds: 45, isExpired: false };
    }
    const target = new Date(targetIso).getTime();
    if (isNaN(target)) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isExpired: false };
  };

  useEffect(() => {
    const initial = calculateTime(endDate);
    setTimeLeft(initial);
    if (initial.isExpired && onExpire) {
      onExpire(true);
    }

    const timer = setInterval(() => {
      const current = calculateTime(endDate);
      setTimeLeft(current);
      if (current.isExpired) {
        clearInterval(timer);
        if (onExpire) onExpire(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  const padZero = (n: number) => n.toString().padStart(2, '0');
  const fontStyle = { fontFamily: getFontFamilyCss(fontFamily) };

  if (!timeLeft) {
    return (
      <div className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-black/10 animate-pulse ${className}`}>
        <Clock className="w-3.5 h-3.5 opacity-40 text-current" />
        <span className="text-xs font-mono font-bold opacity-60">00:00:00</span>
      </div>
    );
  }

  // Handle Expired State
  if (timeLeft.isExpired) {
    if (expiredBehavior === 'hide_cta' || expiredBehavior === 'disable_cta') {
      return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 select-none ${className}`}>
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-bold tracking-wider uppercase">Offer Concluded</span>
        </div>
      );
    }
    return (
      <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white border border-slate-800 shadow-sm select-none ${className}`}>
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
        <span className="text-xs uppercase tracking-widest font-extrabold text-rose-400">Offer Ended</span>
      </div>
    );
  }

  // Responsive size helpers
  const numSizeClass =
    size === 'compact'
      ? 'text-xs sm:text-sm font-bold'
      : size === 'large'
      ? 'text-lg sm:text-2xl font-black'
      : 'text-sm sm:text-base font-extrabold';

  const labelSizeClass =
    size === 'compact'
      ? 'text-[8px] sm:text-[9px]'
      : size === 'large'
      ? 'text-[10px] sm:text-xs'
      : 'text-[9px] sm:text-[10px]';

  // ── Template A: Minimal Inline ──
  if (template === 'minimal_inline') {
    return (
      <div
        className={`inline-flex items-center gap-1 sm:gap-2 px-2.5 py-1 rounded-full bg-slate-900/10 backdrop-blur-xs text-current font-medium select-none ${className}`}
        style={fontStyle}
      >
        <Clock className="w-3.5 h-3.5 opacity-70 shrink-0" />
        <div className="flex items-center gap-1 font-mono tracking-tight">
          {timeLeft.days > 0 && (
            <>
              <span className={numSizeClass}>{padZero(timeLeft.days)}</span>
              <span className={`${labelSizeClass} opacity-75 font-sans`}>d</span>
              <span className="opacity-40">:</span>
            </>
          )}
          <span className={numSizeClass}>{padZero(timeLeft.hours)}</span>
          <span className={`${labelSizeClass} opacity-75 font-sans`}>h</span>
          <span className="opacity-40">:</span>
          <span className={numSizeClass}>{padZero(timeLeft.minutes)}</span>
          <span className={`${labelSizeClass} opacity-75 font-sans`}>m</span>
          <span className="opacity-40">:</span>
          <span className={`${numSizeClass} text-current`}>{padZero(timeLeft.seconds)}</span>
          <span className={`${labelSizeClass} opacity-75 font-sans`}>s</span>
        </div>
      </div>
    );
  }

  // ── Template B: Compact Cards ──
  if (template === 'compact_cards') {
    const cardBg = bgColor || 'rgba(255, 255, 255, 0.9)';
    const cardText = textColor || '#0B1D26';
    const cardPadding = size === 'compact' ? 'px-1.5 py-1 min-w-[34px]' : size === 'large' ? 'px-3 py-2 min-w-[52px]' : 'px-2 py-1.5 min-w-[42px]';

    return (
      <div className={`inline-flex items-center gap-1.5 sm:gap-2 select-none ${className}`} style={fontStyle}>
        {timeLeft.days > 0 && (
          <>
            <div
              className={`flex flex-col items-center justify-center rounded-lg border border-slate-200/80 shadow-2xs ${cardPadding}`}
              style={{ backgroundColor: cardBg, color: cardText }}
            >
              <span className={`font-mono font-black leading-none ${numSizeClass}`}>{padZero(timeLeft.days)}</span>
              <span className={`uppercase font-bold tracking-wider opacity-60 mt-0.5 ${labelSizeClass}`}>Days</span>
            </div>
            <span className="font-bold opacity-40 -mt-1">:</span>
          </>
        )}
        <div
          className={`flex flex-col items-center justify-center rounded-lg border border-slate-200/80 shadow-2xs ${cardPadding}`}
          style={{ backgroundColor: cardBg, color: cardText }}
        >
          <span className={`font-mono font-black leading-none ${numSizeClass}`}>{padZero(timeLeft.hours)}</span>
          <span className={`uppercase font-bold tracking-wider opacity-60 mt-0.5 ${labelSizeClass}`}>Hours</span>
        </div>
        <span className="font-bold opacity-40 -mt-1">:</span>
        <div
          className={`flex flex-col items-center justify-center rounded-lg border border-slate-200/80 shadow-2xs ${cardPadding}`}
          style={{ backgroundColor: cardBg, color: cardText }}
        >
          <span className={`font-mono font-black leading-none ${numSizeClass}`}>{padZero(timeLeft.minutes)}</span>
          <span className={`uppercase font-bold tracking-wider opacity-60 mt-0.5 ${labelSizeClass}`}>Mins</span>
        </div>
        <span className="font-bold opacity-40 -mt-1">:</span>
        <div
          className={`flex flex-col items-center justify-center rounded-lg border border-slate-200/80 shadow-2xs ${cardPadding}`}
          style={{ backgroundColor: cardBg, color: cardText }}
        >
          <span className={`font-mono font-black leading-none ${numSizeClass}`}>{padZero(timeLeft.seconds)}</span>
          <span className={`uppercase font-bold tracking-wider opacity-60 mt-0.5 ${labelSizeClass}`}>Secs</span>
        </div>
      </div>
    );
  }

  // ── Template C: Elegant Text Countdown ──
  if (template === 'elegant_text') {
    return (
      <div className={`inline-flex items-center gap-2 sm:gap-3 text-current select-none ${className}`} style={fontStyle}>
        {timeLeft.days > 0 && (
          <div className="flex items-baseline gap-1">
            <span className={numSizeClass}>{padZero(timeLeft.days)}</span>
            <span className={`${labelSizeClass} uppercase font-medium opacity-70`}>Days</span>
            <span className="opacity-30 ml-1">:</span>
          </div>
        )}
        <div className="flex items-baseline gap-1">
          <span className={numSizeClass}>{padZero(timeLeft.hours)}</span>
          <span className={`${labelSizeClass} uppercase font-medium opacity-70`}>Hours</span>
          <span className="opacity-30 ml-1">:</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={numSizeClass}>{padZero(timeLeft.minutes)}</span>
          <span className={`${labelSizeClass} uppercase font-medium opacity-70`}>Minutes</span>
          <span className="opacity-30 ml-1">:</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={numSizeClass}>{padZero(timeLeft.seconds)}</span>
          <span className={`${labelSizeClass} uppercase font-medium opacity-70`}>Seconds</span>
        </div>
      </div>
    );
  }

  // ── Template D: Outlined Countdown ──
  if (template === 'outlined') {
    const borderColor = bgColor || '#005F63';
    const numColor = textColor || '#005F63';
    const cardPadding = size === 'compact' ? 'px-2 py-1 min-w-[34px]' : size === 'large' ? 'px-3.5 py-2 min-w-[52px]' : 'px-2.5 py-1.5 min-w-[42px]';

    return (
      <div className={`inline-flex items-center gap-1.5 sm:gap-2 select-none ${className}`} style={fontStyle}>
        {timeLeft.days > 0 && (
          <>
            <div
              className={`flex flex-col items-center justify-center rounded-lg border bg-white/70 backdrop-blur-xs ${cardPadding}`}
              style={{ borderColor, color: numColor }}
            >
              <span className={`font-mono font-black leading-none ${numSizeClass}`}>{padZero(timeLeft.days)}</span>
              <span className={`uppercase font-bold tracking-wider opacity-70 mt-0.5 ${labelSizeClass}`}>Days</span>
            </div>
            <span className="font-bold opacity-50" style={{ color: numColor }}>:</span>
          </>
        )}
        <div
          className={`flex flex-col items-center justify-center rounded-lg border bg-white/70 backdrop-blur-xs ${cardPadding}`}
          style={{ borderColor, color: numColor }}
        >
          <span className={`font-mono font-black leading-none ${numSizeClass}`}>{padZero(timeLeft.hours)}</span>
          <span className={`uppercase font-bold tracking-wider opacity-70 mt-0.5 ${labelSizeClass}`}>Hours</span>
        </div>
        <span className="font-bold opacity-50" style={{ color: numColor }}>:</span>
        <div
          className={`flex flex-col items-center justify-center rounded-lg border bg-white/70 backdrop-blur-xs ${cardPadding}`}
          style={{ borderColor, color: numColor }}
        >
          <span className={`font-mono font-black leading-none ${numSizeClass}`}>{padZero(timeLeft.minutes)}</span>
          <span className={`uppercase font-bold tracking-wider opacity-70 mt-0.5 ${labelSizeClass}`}>Mins</span>
        </div>
        <span className="font-bold opacity-50" style={{ color: numColor }}>:</span>
        <div
          className={`flex flex-col items-center justify-center rounded-lg border bg-white/70 backdrop-blur-xs ${cardPadding}`}
          style={{ borderColor, color: numColor }}
        >
          <span className={`font-mono font-black leading-none ${numSizeClass}`}>{padZero(timeLeft.seconds)}</span>
          <span className={`uppercase font-bold tracking-wider opacity-70 mt-0.5 ${labelSizeClass}`}>Secs</span>
        </div>
      </div>
    );
  }

  // ── Template E: Dark Premium Countdown ──
  const darkNavy = bgColor || '#0B1D26';
  const darkText = textColor || '#FFFFFF';
  const cardPadding = size === 'compact' ? 'px-2 py-1 min-w-[36px]' : size === 'large' ? 'px-3.5 py-2.5 min-w-[54px]' : 'px-2.5 py-1.5 min-w-[44px]';

  return (
    <div className={`inline-flex items-center gap-1.5 sm:gap-2 select-none ${className}`} style={fontStyle}>
      {timeLeft.days > 0 && (
        <>
          <div
            className={`flex flex-col items-center justify-center rounded-lg border border-teal-500/20 shadow-md ${cardPadding}`}
            style={{ backgroundColor: darkNavy, color: darkText }}
          >
            <span className={`font-mono font-black leading-none text-white ${numSizeClass}`}>{padZero(timeLeft.days)}</span>
            <span className={`uppercase font-bold tracking-wider text-teal-300/80 mt-0.5 ${labelSizeClass}`}>Days</span>
          </div>
          <span className="font-bold text-teal-400/60 -mt-1">:</span>
        </>
      )}
      <div
        className={`flex flex-col items-center justify-center rounded-lg border border-teal-500/20 shadow-md ${cardPadding}`}
        style={{ backgroundColor: darkNavy, color: darkText }}
      >
        <span className={`font-mono font-black leading-none text-white ${numSizeClass}`}>{padZero(timeLeft.hours)}</span>
        <span className={`uppercase font-bold tracking-wider text-teal-300/80 mt-0.5 ${labelSizeClass}`}>Hours</span>
      </div>
      <span className="font-bold text-teal-400/60 -mt-1">:</span>
      <div
        className={`flex flex-col items-center justify-center rounded-lg border border-teal-500/20 shadow-md ${cardPadding}`}
        style={{ backgroundColor: darkNavy, color: darkText }}
      >
        <span className={`font-mono font-black leading-none text-white ${numSizeClass}`}>{padZero(timeLeft.minutes)}</span>
        <span className={`uppercase font-bold tracking-wider text-teal-300/80 mt-0.5 ${labelSizeClass}`}>Mins</span>
      </div>
      <span className="font-bold text-teal-400/60 -mt-1">:</span>
      <div
        className={`flex flex-col items-center justify-center rounded-lg border border-teal-500/20 shadow-md ${cardPadding}`}
        style={{ backgroundColor: darkNavy, color: darkText }}
      >
        <span className={`font-mono font-black leading-none text-teal-300 ${numSizeClass}`}>{padZero(timeLeft.seconds)}</span>
        <span className={`uppercase font-bold tracking-wider text-teal-300/80 mt-0.5 ${labelSizeClass}`}>Secs</span>
      </div>
    </div>
  );
};

export default DailyOfferCountdown;
