import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { DashboardStat } from '../types/admin';

// ─────────────────────────────────────────────────────────────────────────────
// StatCard — KPI metric widget for the dashboard
// ─────────────────────────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<DashboardStat['variant'], {
  bg: string; icon: string; accent: string;
}> = {
  teal:   { bg: 'bg-[#E6F4FA]', icon: 'bg-[#0284C7] text-white', accent: 'text-slate-800' },
  orange: { bg: 'bg-[#F0EEFD]', icon: 'bg-[#6366F1] text-white', accent: 'text-slate-800' },
  red:    { bg: 'bg-rose-50',    icon: 'bg-rose-500 text-white',   accent: 'text-slate-800' },
  green:  { bg: 'bg-[#E6F7F0]', icon: 'bg-[#10B981] text-white', accent: 'text-slate-800' },
  blue:   { bg: 'bg-[#F9ECFC]', icon: 'bg-[#D946EF] text-white', accent: 'text-slate-800' },
  purple: { bg: 'bg-[#FAF0F5]', icon: 'bg-[#EC4899] text-white', accent: 'text-slate-800' },
};

// Dynamic lucide icon resolver
import * as LucideIcons from 'lucide-react';

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = (LucideIcons as any)[name] as React.FC<{ className?: string }> | undefined;
  if (!Icon) return null;
  return <Icon className={className} />;
}

interface StatCardProps {
  stat: DashboardStat;
  onClick?: () => void;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ stat, onClick, loading = false }) => {
  const style = VARIANT_STYLES[stat.variant];
  const hasTrend = stat.trend !== undefined && stat.trend !== null;
  const trendPositive = (stat.trend ?? 0) > 0;
  const trendZero = stat.trend === 0;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-slate-100 rounded" />
            <div className="w-10 h-10 bg-slate-100 rounded-xl" />
          </div>
          <div className="h-8 w-20 bg-slate-100 rounded" />
          <div className="h-3 w-32 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left rounded-2xl border border-transparent p-5
        shadow-sm hover:shadow-md hover:border-slate-200/50
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#005B63]/30
        ${style.bg}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {/* Top Row: label + icon */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-tight">
          {stat.label}
        </p>
        <div className={`w-9.5 h-9.5 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${style.icon}`}>
          <DynamicIcon name={stat.icon} className="w-4.5 h-4.5" />
        </div>
      </div>

      {/* Value */}
      <div className={`text-2xl font-extrabold ${style.accent} leading-none mb-1.5`}>
        {stat.value}
      </div>

      {/* Sub-value + trend */}
      <div className="flex items-center justify-between gap-2 mt-2">
        {stat.subValue && (
          <p className="text-[11px] text-slate-400 truncate">{stat.subValue}</p>
        )}
        {hasTrend && !trendZero && (
          <span className={`flex items-center gap-0.5 text-[11px] font-bold shrink-0
            ${trendPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
            {trendPositive
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />}
            {Math.abs(stat.trend ?? 0)}%
            {stat.trendLabel && <span className="font-normal text-slate-400 ml-0.5">{stat.trendLabel}</span>}
          </span>
        )}
        {hasTrend && trendZero && (
          <span className="flex items-center gap-0.5 text-[11px] font-bold text-slate-400 shrink-0">
            <Minus className="w-3 h-3" /> No change
          </span>
        )}
      </div>

      {/* Action label */}
      {stat.actionLabel && (
        <div className={`mt-3 pt-3 border-t border-slate-100 text-[11px] font-semibold ${style.accent}
          group-hover:underline transition-all`}>
          {stat.actionLabel} →
        </div>
      )}
    </button>
  );
};

export default StatCard;
