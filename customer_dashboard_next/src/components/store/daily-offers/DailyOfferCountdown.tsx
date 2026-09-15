'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface DailyOfferCountdownProps {
  endDate?: string | null;
  startDate?: string | null;
  bgColor?: string;
  textColor?: string;
  className?: string;
  compact?: boolean;
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
  startDate,
  bgColor = '#111827',
  textColor = '#FFFFFF',
  className = '',
  compact = false,
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining | null>(null);

  useEffect(() => {
    if (!endDate) {
      // Default demo countdown: 7 days from when page loads if not set
      const defaultTarget = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000);
      calculateTime(defaultTarget.toISOString());
    } else {
      calculateTime(endDate);
    }

    const timer = setInterval(() => {
      if (endDate) {
        calculateTime(endDate);
      } else {
        // demo 7 days
        const defaultTarget = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000);
        calculateTime(defaultTarget.toISOString());
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  const calculateTime = (targetIso: string) => {
    const target = new Date(targetIso).getTime();
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      setTimeLeft({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true,
      });
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setTimeLeft({
      days,
      hours,
      minutes,
      seconds,
      isExpired: false,
    });
  };

  const padZero = (n: number) => n.toString().padStart(2, '0');

  if (!timeLeft) {
    return (
      <div className={`inline-flex items-center gap-2 py-2 px-3 rounded-lg bg-black/20 animate-pulse ${className}`}>
        <Clock className="w-4 h-4 opacity-50" />
        <span className="text-xs font-mono">00 : 00 : 00</span>
      </div>
    );
  }

  if (timeLeft.isExpired) {
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-red-500/30 text-white shadow-lg ${className}`}>
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
        <span className="text-xs uppercase tracking-widest font-bold text-red-400">Offer Ended</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 sm:gap-2 select-none ${className}`}>
      {/* Optional Days if > 0 */}
      {timeLeft.days > 0 && (
        <>
          <div
            className={`flex flex-col items-center justify-center rounded-xl shadow-md border border-white/15 backdrop-blur-md ${
              compact ? 'w-11 h-11' : 'w-13 h-14 sm:w-16 sm:h-16'
            }`}
            style={{ backgroundColor: bgColor, color: textColor }}
          >
            <span className={`font-mono font-black leading-none ${compact ? 'text-sm' : 'text-base sm:text-2xl'}`}>
              {padZero(timeLeft.days)}
            </span>
            <span className={`uppercase font-bold tracking-wider opacity-70 ${compact ? 'text-[8px] mt-0.5' : 'text-[9px] sm:text-[10px] mt-1'}`}>
              Days
            </span>
          </div>
          <span className="font-mono font-bold text-base sm:text-xl opacity-60 self-center -mt-2">:</span>
        </>
      )}

      {/* Hours */}
      <div
        className={`flex flex-col items-center justify-center rounded-xl shadow-md border border-white/15 backdrop-blur-md transition-transform hover:scale-105 ${
          compact ? 'w-11 h-11' : 'w-13 h-14 sm:w-16 sm:h-16'
        }`}
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <span className={`font-mono font-black leading-none ${compact ? 'text-sm' : 'text-base sm:text-2xl'}`}>
          {padZero(timeLeft.hours)}
        </span>
        <span className={`uppercase font-bold tracking-wider opacity-70 ${compact ? 'text-[8px] mt-0.5' : 'text-[9px] sm:text-[10px] mt-1'}`}>
          Hours
        </span>
      </div>

      <span className="font-mono font-bold text-base sm:text-xl opacity-60 self-center -mt-2">:</span>

      {/* Minutes */}
      <div
        className={`flex flex-col items-center justify-center rounded-xl shadow-md border border-white/15 backdrop-blur-md transition-transform hover:scale-105 ${
          compact ? 'w-11 h-11' : 'w-13 h-14 sm:w-16 sm:h-16'
        }`}
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <span className={`font-mono font-black leading-none ${compact ? 'text-sm' : 'text-base sm:text-2xl'}`}>
          {padZero(timeLeft.minutes)}
        </span>
        <span className={`uppercase font-bold tracking-wider opacity-70 ${compact ? 'text-[8px] mt-0.5' : 'text-[9px] sm:text-[10px] mt-1'}`}>
          Mins
        </span>
      </div>

      <span className="font-mono font-bold text-base sm:text-xl opacity-60 self-center -mt-2">:</span>

      {/* Seconds */}
      <div
        className={`flex flex-col items-center justify-center rounded-xl shadow-md border border-white/15 backdrop-blur-md transition-transform hover:scale-105 ${
          compact ? 'w-11 h-11' : 'w-13 h-14 sm:w-16 sm:h-16'
        }`}
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <span className={`font-mono font-black leading-none animate-pulse ${compact ? 'text-sm' : 'text-base sm:text-2xl'}`}>
          {padZero(timeLeft.seconds)}
        </span>
        <span className={`uppercase font-bold tracking-wider opacity-70 ${compact ? 'text-[8px] mt-0.5' : 'text-[9px] sm:text-[10px] mt-1'}`}>
          Secs
        </span>
      </div>
    </div>
  );
};

export default DailyOfferCountdown;
