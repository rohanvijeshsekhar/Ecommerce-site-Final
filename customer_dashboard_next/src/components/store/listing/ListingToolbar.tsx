'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Filter,
  ChevronDown,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Check,
  Sparkles,
} from 'lucide-react';

export interface SortOption {
  label: string;
  value: string;
}

export interface ListingToolbarProps {
  totalCount: number;
  itemName?: string;
  isLoading?: boolean;
  onOpenMobileFilters?: () => void;
  activeFiltersCount?: number;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  sortValue: string;
  sortOptions: SortOption[];
  onSortChange: (value: string) => void;
  showViewToggle?: boolean;
  extraControls?: React.ReactNode;
}

export const defaultProductSortOptions: SortOption[] = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Popularity', value: 'popular' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Newest Arrivals', value: 'newest' },
  { label: 'Customer Rating', value: 'rating' },
];

export const curatedSortOptions: SortOption[] = [
  { label: 'Curated Order (Default)', value: 'default' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Newest Arrivals', value: 'newest' },
  { label: 'Customer Rating', value: 'rating' },
];

export default function ListingToolbar({
  totalCount,
  itemName = 'products',
  isLoading = false,
  onOpenMobileFilters,
  activeFiltersCount = 0,
  viewMode = 'grid',
  onViewModeChange,
  sortValue,
  sortOptions,
  onSortChange,
  showViewToggle = true,
  extraControls,
}: ListingToolbarProps) {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeSortLabel =
    sortOptions.find((opt) => opt.value === sortValue)?.label ||
    sortOptions[0]?.label ||
    'Sort';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
      
      {/* Left: Result Count & Optional Extra Info */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {!isLoading ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#006670]/10 text-[#006670] font-black text-xs rounded-full border border-[#006670]/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {totalCount.toLocaleString('en-IN')}{' '}
                {totalCount === 1 ? itemName.replace(/s$/, '') : itemName}
              </span>
            </span>
          ) : (
            <div className="h-6 w-24 bg-slate-100 rounded-full animate-pulse" />
          )}
        </div>
        {extraControls}
      </div>

      {/* Right: Controls (Mobile Filter Trigger, View Mode, Sort Dropdown) */}
      <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end">
        
        {/* Mobile Filter Button */}
        {onOpenMobileFilters && (
          <button
            type="button"
            onClick={onOpenMobileFilters}
            className="lg:hidden flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-xs hover:border-[#006670] transition-colors cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-[#006670]" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-[#006670] text-white text-[10px] font-black rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
        )}

        {/* View Toggle (Grid / List) */}
        {showViewToggle && onViewModeChange && (
          <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-[#006670] shadow-xs font-bold'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-[#006670] shadow-xs font-bold'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Sort Dropdown */}
        <div className="relative" ref={sortDropdownRef}>
          <button
            type="button"
            onClick={() => setIsSortOpen(!isSortOpen)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-xs hover:border-[#006670] transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#006670]" />
            <span className="truncate max-w-[140px] sm:max-w-none">
              Sort:{' '}
              <strong className="text-slate-900 font-extrabold">{activeSortLabel}</strong>
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform text-slate-400 ${
                isSortOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isSortOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl border border-slate-200/80 shadow-xl py-2 z-40 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3.5 py-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Sort Options
              </div>
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onSortChange(opt.value);
                    setIsSortOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer text-left ${
                    sortValue === opt.value
                      ? 'bg-[#006670]/10 text-[#006670]'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {sortValue === opt.value && (
                    <Check className="w-3.5 h-3.5 text-[#006670] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
