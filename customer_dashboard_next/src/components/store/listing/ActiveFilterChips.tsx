'use client';

import React from 'react';
import { X, RotateCcw, Tag, ShieldCheck, Star, CheckCircle2, DollarSign } from 'lucide-react';

export interface ActiveChipItem {
  id: string;
  label: string;
  type?: 'category' | 'brand' | 'price' | 'rating' | 'stock' | 'discount' | 'other';
  onRemove: () => void;
}

export interface ActiveFilterChipsProps {
  chips: ActiveChipItem[];
  onClearAll: () => void;
  className?: string;
}

export default function ActiveFilterChips({
  chips,
  onClearAll,
  className = '',
}: ActiveFilterChipsProps) {
  if (!chips || chips.length === 0) return null;

  const renderIcon = (type?: string) => {
    switch (type) {
      case 'category':
        return <Tag className="w-3 h-3 text-[#006670] shrink-0" />;
      case 'brand':
        return <ShieldCheck className="w-3 h-3 text-[#006670] shrink-0" />;
      case 'price':
        return <DollarSign className="w-3 h-3 text-[#006670] shrink-0" />;
      case 'rating':
        return <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />;
      case 'stock':
        return <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap mb-4 select-none ${className}`}>
      <span className="font-extrabold text-slate-400 text-[11px] uppercase tracking-wider mr-1">
        Active Filters:
      </span>

      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-bold text-xs border border-slate-200/80 transition-colors shadow-2xs"
        >
          {renderIcon(chip.type)}
          <span className="truncate max-w-[200px]">{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="p-0.5 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors ml-0.5 cursor-pointer"
            title={`Remove ${chip.label}`}
            aria-label={`Remove ${chip.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-[11px] transition-colors cursor-pointer border border-rose-200/60 ml-auto sm:ml-2"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Clear All</span>
      </button>
    </div>
  );
}
