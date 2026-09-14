'use client';

import React, { useState } from 'react';
import {
  Filter,
  ChevronDown,
  Search,
  Check,
  Star,
  RotateCcw,
} from 'lucide-react';

export interface FilterItemOption {
  id: string | number;
  slug: string;
  name: string;
  count?: number;
}

export interface PricePreset {
  label: string;
  min: string;
  max: string;
}

export const defaultPricePresets: PricePreset[] = [
  { label: 'Under ₹1k', min: '', max: '1000' },
  { label: '₹1k - ₹5k', min: '1000', max: '5000' },
  { label: '₹5k - ₹15k', min: '5000', max: '15000' },
  { label: '₹15k - ₹50k', min: '15000', max: '50000' },
  { label: '₹50k - ₹100k', min: '50000', max: '100000' },
  { label: 'Above ₹100k', min: '100000', max: '' },
];

export interface ListingFilterSidebarProps {
  // Category filter
  categories?: FilterItemOption[];
  selectedCategory?: string;
  onSelectCategory?: (slug: string | null) => void;
  hideCategoryFilter?: boolean;

  // Brand filter (supports multi-select comma separated or array)
  brands?: FilterItemOption[];
  selectedBrands?: string[];
  onToggleBrand?: (slug: string) => void;
  hideBrandFilter?: boolean;

  // Price filter
  minPrice?: string;
  maxPrice?: string;
  onPriceChange?: (min: string | null, max: string | null) => void;
  pricePresets?: PricePreset[];
  hidePriceFilter?: boolean;

  // Rating filter
  minRating?: string;
  onRatingChange?: (rating: string | null) => void;
  hideRatingFilter?: boolean;

  // Availability filter
  inStockOnly?: boolean;
  onToggleInStock?: () => void;
  hideStockFilter?: boolean;

  // Clear all
  hasActiveFilters?: boolean;
  onClearAll: () => void;

  className?: string;
}

export default function ListingFilterSidebar({
  categories = [],
  selectedCategory = '',
  onSelectCategory,
  hideCategoryFilter = false,

  brands = [],
  selectedBrands = [],
  onToggleBrand,
  hideBrandFilter = false,

  minPrice = '',
  maxPrice = '',
  onPriceChange,
  pricePresets = defaultPricePresets,
  hidePriceFilter = false,

  minRating = '',
  onRatingChange,
  hideRatingFilter = false,

  inStockOnly = false,
  onToggleInStock,
  hideStockFilter = false,

  hasActiveFilters = false,
  onClearAll,
  className = '',
}: ListingFilterSidebarProps) {
  // Local search inputs for long lists
  const [categorySearch, setCategorySearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');

  // Local inputs for custom price
  const [inputMin, setInputMin] = useState(minPrice);
  const [inputMax, setInputMax] = useState(maxPrice);

  React.useEffect(() => {
    setInputMin(minPrice);
    setInputMax(maxPrice);
  }, [minPrice, maxPrice]);

  const filteredCategories = categories.filter((c) =>
    !categorySearch || c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredBrands = brands.filter((b) =>
    !brandSearch || b.name.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const handlePriceBlur = () => {
    if (onPriceChange) {
      onPriceChange(inputMin || null, inputMax || null);
    }
  };

  return (
    <aside
      className={`hidden lg:block space-y-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs h-fit sticky lg:top-[140px] select-none text-left ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#006670]" />
          <span>Filters</span>
        </h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-[11px] font-extrabold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-wider cursor-pointer inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* 1. Category Filter */}
      {!hideCategoryFilter && categories.length > 0 && onSelectCategory && (
        <div className="space-y-2.5 border-b border-slate-100 pb-5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
              Category
            </label>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => onSelectCategory(null)}
                className="text-[10.5px] font-bold text-[#006670] hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {categories.length > 7 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#006670] focus:bg-white transition-colors"
              />
            </div>
          )}

          <div className="max-h-48 overflow-y-auto space-y-0.5 scrollbar-thin pr-1">
            <button
              type="button"
              onClick={() => onSelectCategory(null)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-left ${
                !selectedCategory
                  ? 'bg-[#006670]/10 text-[#006670]'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>All Categories</span>
              {!selectedCategory && <Check className="w-3.5 h-3.5 text-[#006670]" />}
            </button>
            {filteredCategories.map((cat) => {
              const isSelected = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory(cat.slug)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-[#006670]/10 text-[#006670]'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate pr-2">{cat.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#006670] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Brand Filter (Multi-Select) */}
      {!hideBrandFilter && brands.length > 0 && onToggleBrand && (
        <div className="space-y-2.5 border-b border-slate-100 pb-5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
              Brands
            </label>
            {selectedBrands.length > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#006670]/10 text-[#006670]">
                {selectedBrands.length} selected
              </span>
            )}
          </div>

          {brands.length > 7 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search brands..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#006670] focus:bg-white transition-colors"
              />
            </div>
          )}

          <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin pr-1">
            {filteredBrands.map((b) => {
              const isChecked = selectedBrands.includes(b.slug);
              return (
                <label
                  key={b.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleBrand(b.slug)}
                      className="rounded text-[#006670] focus:ring-[#006670] w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="truncate">{b.name}</span>
                  </div>
                  {b.count !== undefined && (
                    <span className="text-[10px] text-slate-400 font-medium">({b.count})</span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Price Filter */}
      {!hidePriceFilter && onPriceChange && (
        <div className="space-y-3 border-b border-slate-100 pb-5">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
            Price Range (₹)
          </label>

          {/* Preset Chips */}
          <div className="grid grid-cols-2 gap-1.5">
            {pricePresets.map((preset) => {
              const isActive = minPrice === preset.min && maxPrice === preset.max;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setInputMin(preset.min);
                    setInputMax(preset.max);
                    onPriceChange(preset.min || null, preset.max || null);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-[#006670] text-white border-[#006670] shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Custom Min / Max Inputs */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                placeholder="Min"
                value={inputMin}
                onChange={(e) => setInputMin(e.target.value)}
                onBlur={handlePriceBlur}
                onKeyDown={(e) => e.key === 'Enter' && handlePriceBlur()}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670] focus:bg-white transition-colors"
              />
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                placeholder="Max"
                value={inputMax}
                onChange={(e) => setInputMax(e.target.value)}
                onBlur={handlePriceBlur}
                onKeyDown={(e) => e.key === 'Enter' && handlePriceBlur()}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670] focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Customer Rating Filter */}
      {!hideRatingFilter && onRatingChange && (
        <div className="space-y-2 border-b border-slate-100 pb-5">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
            Customer Rating
          </label>
          <div className="space-y-1">
            {[
              { label: '4★ & above', value: '4' },
              { label: '3★ & above', value: '3' },
            ].map((r) => {
              const isSelected = minRating === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => onRatingChange(isSelected ? null : r.value)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{r.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-700" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Availability (In-Stock Only) */}
      {!hideStockFilter && onToggleInStock && (
        <div>
          <label className="flex items-center justify-between cursor-pointer select-none">
            <span className="text-xs font-bold text-slate-700">In-Stock Only</span>
            <button
              type="button"
              onClick={onToggleInStock}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                inStockOnly ? 'bg-[#006670]' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  inStockOnly ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
        </div>
      )}
    </aside>
  );
}
