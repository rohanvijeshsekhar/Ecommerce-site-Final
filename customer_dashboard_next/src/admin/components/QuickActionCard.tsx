'use client';

import React from 'react';
import Link from 'next/link';
import type { QuickAction } from '../types/admin';
import * as LucideIcons from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// QuickActionCard — Clickable tile for dashboard shortcuts
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as any)[name] as React.FC<{ className?: string }> | undefined;
  if (!Icon) return null;
  return <Icon className={className} />;
}

const COLOR_MAP: Record<QuickAction['color'], {
  bg: string; icon: string; hover: string;
}> = {
  teal:   { bg: 'bg-[#005B63]/8',  icon: 'text-[#005B63]',  hover: 'hover:bg-[#005B63]/15 hover:border-[#005B63]/30' },
  orange: { bg: 'bg-[#F58220]/8',  icon: 'text-[#F58220]',  hover: 'hover:bg-[#F58220]/15 hover:border-[#F58220]/30' },
  blue:   { bg: 'bg-blue-50',      icon: 'text-blue-600',   hover: 'hover:bg-blue-100 hover:border-blue-200' },
  purple: { bg: 'bg-purple-50',    icon: 'text-purple-600', hover: 'hover:bg-purple-100 hover:border-purple-200' },
  green:  { bg: 'bg-emerald-50',   icon: 'text-emerald-600', hover: 'hover:bg-emerald-100 hover:border-emerald-200' },
};

interface QuickActionCardProps {
  action: QuickAction;
  onClick?: () => void;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ action, onClick }) => {
  const c = COLOR_MAP[action.color];

  const inner = (
    <div
      className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-transparent
        bg-white shadow-sm cursor-pointer transition-all duration-200 select-none
        group ${c.hover} hover:shadow-md active:scale-[0.97]`}
    >
      <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center
        transition-transform duration-200 group-hover:scale-110`}>
        <DynamicIcon name={action.icon} className={`w-5 h-5 ${c.icon}`} />
      </div>
      <div className="text-center">
        <p className="text-xs font-bold text-slate-700 leading-tight">{action.label}</p>
        <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{action.description}</p>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {inner}
      </button>
    );
  }

  return <Link href={action.path}>{inner}</Link>;
};

// ─────────────────────────────────────────────────────────────────────────────
// AnalyticsCard — Chart placeholder
// ─────────────────────────────────────────────────────────────────────────────

interface AnalyticsCardProps {
  title: string;
  subtitle?: string;
  period?: string;
  onPeriodChange?: (p: string) => void;
  periodOptions?: string[];
  children?: React.ReactNode;
  badge?: string;
}

const PERIODS = ['Today', '7 Days', '30 Days', '3 Months', '1 Year'];

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  subtitle,
  period = '7 Days',
  onPeriodChange,
  periodOptions = PERIODS,
  children,
  badge,
}) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-700">{title}</h3>
          {badge && (
            <span className="text-[10px] font-semibold bg-[#005B63]/10 text-[#005B63] px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {onPeriodChange && (
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600
            focus:ring-2 focus:ring-[#005B63]/20 focus:border-[#005B63] outline-none bg-white"
        >
          {periodOptions.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      )}
    </div>
    {children ?? (
      <div className="h-48 flex flex-col items-center justify-center text-center rounded-xl bg-slate-50 border border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-slate-200/60 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-xs font-semibold text-slate-500">Analytics coming soon</p>
        <p className="text-[11px] text-slate-400 mt-1">Connect the backend API to view live data</p>
      </div>
    )}
  </div>
);

export default QuickActionCard;
