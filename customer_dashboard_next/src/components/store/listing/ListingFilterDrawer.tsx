'use client';

import React, { useState } from 'react';
import {
  Filter,
  X,
  Search,
  Check,
  Star,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import type { FilterItemOption, PricePreset } from './ListingFilterSidebar';
import { defaultPricePresets } from './ListingFilterSidebar';

export interface ListingFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  totalCount?: number;

  // Category
  categories?: FilterItemOption[];
  selectedCategory?: string;
  onSelectCategory?: (slug: string | null) => void;
  hideCategoryFilter?: boolean;

  // Brand
  brands?: FilterItemOption[];
  selectedBrands?: string[];
  onToggleBrand?: (slug: string) => void;
  hideBrandFilter?: boolean;

  // Price
  minPrice?: string;
  maxPrice?: string;
  onPriceChange?: (min: string | null, max: string | null) => void;
  pricePresets?: PricePreset[];
  hidePriceFilter?: boolean;

  // Rating
  minRating?: string;
  onRatingChange?: (rating: string | null) => void;
  hideRatingFilter?: boolean;

  // Stock
  inStockOnly?: boolean;
  onToggleInStock?: () => void;
  hideStockFilter?: boolean;

  // Reset
  hasActiveFilters?: boolean;
  onClearAll: () => void;
}

export default function ListingFilterDrawer({
  isOpen,
  onClose,
  totalCount = 0,

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
}: ListingFilterDrawerProps) {
  const [categorySearch, setCategorySearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');

  const [inputMin, setInputMin] = useState(minPrice);
  const [inputMax, setInputMax] = useState(maxPrice);

  React.useEffect(() => {
    setInputMin(minPrice);
    setInputMax(maxPrice);
  }, [minPrice, maxPrice]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) =>
    !categorySearch || c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredBrands = brands.filter((b) =>
    !brandSearch || b.name.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const handleApplyPrice = () => {
    if (onPriceChange) {
      onPriceChange(inputMin || null, inputMax || null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 lg:hidden flex justify-end animate-in fade-in duration-200 select-none">
      {/* Clickable Backdrop on Left */}
      <div
        onClick={onClose}
        className="flex-1 h-full cursor-pointer"
        title="Close Filters"
      />

      {/* Slide-out Sheet */}
      <div className="w-[85vw] sm:w-[75vw] max-w-md bg-white h-full pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] px-5 sm:px-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300 border-l border-slate-100 text-left overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#006670]" />
            <span>Filters</span>
          </h3>
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs font-extrabold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-wider cursor-pointer"
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Filter Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 scrollbar-thin pr-1">
          
          {/* 1. Category */}
          {!hideCategoryFilter && categories.length > 0 && onSelectCategory && (
            <div className="space-y-2.5">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                Category
              </label>

              {categories.length > 6 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#006670]"
                  />
                </div>
              )}

              <div className="max-h-44 overflow-y-auto space-y-0.5 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => onSelectCategory(null)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer text-left ${
                    !selectedCategory
                      ? 'bg-[#006670]/10 text-[#006670]'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>All Categories</span>
                  {!selectedCategory && <Check className="w-3.5 h-3.5 text-[#006670]" />}
                </button>
                {filteredCategories.map((c) => {
                  const isSelected = selectedCategory === c.slug;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectCategory(c.slug)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-[#006670]/10 text-[#006670]'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate pr-2">{c.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#006670] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Brand */}
          {!hideBrandFilter && brands.length > 0 && onToggleBrand && (
            <div className="space-y-2.5 border-t border-slate-100 pt-5">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                Brands
              </label>

              {brands.length > 6 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search brands..."
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#006670]"
                  />
                </div>
              )}

              <div className="max-h-44 overflow-y-auto space-y-1 scrollbar-thin">
                {filteredBrands.map((b) => {
                  const isChecked = selectedBrands.includes(b.slug);
                  return (
                    <label
                      key={b.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleBrand(b.slug)}
                          className="rounded text-[#006670] focus:ring-[#006670] w-4 h-4 cursor-pointer"
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

          {/* 3. Price */}
          {!hidePriceFilter && onPriceChange && (
            <div className="space-y-3 border-t border-slate-100 pt-5">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                Price Range (₹)
              </label>

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
                      className={`px-2.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-[#006670] text-white border-[#006670]'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    placeholder="Min"
                    value={inputMin}
                    onChange={(e) => setInputMin(e.target.value)}
                    onBlur={handleApplyPrice}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-2 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670]"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={inputMax}
                    onChange={(e) => setInputMax(e.target.value)}
                    onBlur={handleApplyPrice}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-2 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. Rating */}
          {!hideRatingFilter && onRatingChange && (
            <div className="space-y-2 border-t border-slate-100 pt-5">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
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
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer text-left ${
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

          {/* 5. In Stock */}
          {!hideStockFilter && onToggleInStock && (
            <div className="border-t border-slate-100 pt-5">
              <label className="flex items-center justify-between cursor-pointer select-none">
                <span className="text-xs font-bold text-slate-800">In-Stock Only</span>
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
        </div>

        {/* Sticky Drawer Footer */}
        <div className="pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-[#006670] hover:bg-[#004e56] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Apply Filters ({totalCount.toLocaleString('en-IN')})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
