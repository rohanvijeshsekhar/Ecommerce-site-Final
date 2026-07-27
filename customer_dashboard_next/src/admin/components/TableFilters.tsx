import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { FilterConfig, ActiveFilter } from '../types/admin';

// ─────────────────────────────────────────────────────────────────────────────
// TableFilters — Search + dropdown filters with active chips
// ─────────────────────────────────────────────────────────────────────────────

interface TableFiltersProps {
  filters: FilterConfig[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClearAll: () => void;
  searchPlaceholder?: string;
}

const TableFilters: React.FC<TableFiltersProps> = ({
  filters,
  values,
  onChange,
  onClearAll,
  searchPlaceholder = 'Search…',
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeFilters: ActiveFilter[] = Object.entries(values)
    .filter(([, v]) => v && v !== '')
    .map(([key, value]) => {
      const config = filters.find((f) => f.key === key);
      const option = config?.options?.find((o) => o.value === value);
      return {
        key,
        label: config?.label ?? key,
        value,
        displayValue: option?.label ?? value,
      };
    });

  const searchFilter = filters.find((f) => f.type === 'search');
  const otherFilters = filters.filter((f) => f.type !== 'search');

  return (
    <div className="space-y-2">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2" ref={dropdownRef}>
        {/* Search input */}
        {searchFilter && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={values[searchFilter.key] ?? ''}
              onChange={(e) => onChange(searchFilter.key, e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-xl
                focus:ring-2 focus:ring-[#005B63]/30 focus:border-[#005B63] outline-none
                bg-white text-slate-700 placeholder:text-slate-400 transition-all"
            />
            {values[searchFilter.key] && (
              <button
                onClick={() => onChange(searchFilter.key, '')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Divider */}
        {searchFilter && otherFilters.length > 0 && (
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
        )}

        {/* Dropdown filters */}
        {otherFilters.map((filter) => (
          <div key={filter.key} className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === filter.key ? null : filter.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-all
                ${values[filter.key]
                  ? 'bg-[#005B63]/10 border-[#005B63]/30 text-[#005B63] font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {filter.label}
              {values[filter.key] && (
                <span className="text-[10px] font-bold bg-[#005B63] text-white rounded-full px-1.5 py-0.5">
                  {filter.options?.find((o) => o.value === values[filter.key])?.label ?? values[filter.key]}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === filter.key ? 'rotate-180' : ''}`} />
            </button>

            {openDropdown === filter.key && filter.options && (
              <div className="absolute top-full mt-1.5 left-0 z-30 bg-white border border-slate-200
                rounded-xl shadow-lg min-w-[160px] overflow-hidden py-1">
                <button
                  onClick={() => { onChange(filter.key, ''); setOpenDropdown(null); }}
                  className="w-full text-left px-3.5 py-2 text-sm text-slate-400 hover:bg-slate-50 transition-colors"
                >
                  All {filter.label}
                </button>
                {filter.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => { onChange(filter.key, option.value); setOpenDropdown(null); }}
                    className={`w-full text-left px-3.5 py-2 text-sm transition-colors
                      ${values[filter.key] === option.value
                        ? 'text-[#005B63] font-semibold bg-[#005B63]/5'
                        : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Clear all */}
        {activeFilters.length > 0 && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600
              px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors ml-auto"
          >
            <X className="w-3.5 h-3.5" />
            Clear all
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeFilters.map((af) => (
            <span
              key={af.key}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-0.5 bg-[#005B63]/8
                border border-[#005B63]/20 rounded-full text-[11px] font-semibold text-[#005B63]"
            >
              <span className="text-[#005B63]/60">{af.label}:</span>
              {af.displayValue}
              <button
                onClick={() => onChange(af.key, '')}
                className="ml-0.5 p-0.5 rounded-full hover:bg-[#005B63]/20 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TableFilters;
