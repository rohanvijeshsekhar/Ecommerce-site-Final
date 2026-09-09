'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Package, ArrowRight, Search, ShieldCheck } from 'lucide-react';
import { getAbsoluteImageUrl } from '@/lib/api';

interface SolutionItem {
  id: string | number;
  title: string;
  slug: string;
  short_description?: string;
  banner?: string;
  thumbnail?: string;
  product_count?: number;
  is_active?: boolean;
}

interface SolutionsClientProps {
  initialSolutions: SolutionItem[];
}

export default function SolutionsClient({ initialSolutions }: SolutionsClientProps) {
  const [search, setSearch] = useState('');

  const filtered = initialSolutions.filter((sol) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      sol.title.toLowerCase().includes(q) ||
      (sol.short_description && sol.short_description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Banner */}
      <div className="bg-[#002B2E] text-white pt-[124px] lg:pt-[196px] pb-16 px-6 lg:px-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Clinical Workflows & Packages</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 font-display">
            Explore Clinical Solutions
          </h1>
          <p className="text-slate-300 max-w-2xl text-base lg:text-lg leading-relaxed mb-8">
            Complete, end-to-end procedural workflows designed by dental specialists. Find everything you need for restorative, endodontic, surgical, and implant procedures.
          </p>

          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search solutions (e.g. Endodontic, Restorative)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white/20 transition-all text-sm backdrop-blur-sm"
            />
          </div>
        </div>
      </div>

      {/* Solutions Grid */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Available Procedures</h2>
            <p className="text-sm text-slate-500 mt-0.5">Showing {filtered.length} specialized workflows</p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No solutions match your search</h3>
            <p className="text-sm text-slate-400 mb-4">Try checking for different procedure keywords</p>
            <button
              onClick={() => setSearch('')}
              className="px-4 py-2 rounded-lg bg-[#005F63] text-white text-sm font-semibold hover:bg-[#00474a] transition-all"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {filtered.map((sol) => (
              <Link
                key={sol.id}
                href={`/solutions/${sol.slug}`}
                className="group relative rounded-2xl overflow-hidden bg-white border border-[#E2E8F0] shadow-sm hover:shadow-[0_16px_36px_rgba(0,95,99,0.14)] hover:-translate-y-2 transition-all duration-300 cursor-pointer flex flex-col justify-between h-[360px]"
              >
                {/* Background Banner Image with Dark Gradient Overlay */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <img
                    src={getAbsoluteImageUrl(sol.banner || sol.thumbnail || '/images/hero1_ecommerce.png')}
                    alt={sol.title}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 brightness-[0.85] group-hover:brightness-[0.95]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/50 to-slate-900/10" />
                </div>

                {/* Top Badge: Product Count */}
                <div className="relative z-10 p-4 flex justify-between items-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[11px] font-bold text-[#005F63] border border-white/40 shadow-xs">
                    <Package className="w-3.5 h-3.5" />
                    {sol.product_count ?? 0} Products Included
                  </span>
                </div>

                {/* Bottom Content Area */}
                <div className="relative z-10 p-5 flex flex-col justify-end text-left">
                  <h3 className="text-xl font-extrabold text-white tracking-tight font-display mb-1.5 leading-snug">
                    {sol.title}
                  </h3>
                  <p className="text-xs text-slate-200/90 font-medium line-clamp-2 leading-relaxed mb-4">
                    {sol.short_description}
                  </p>

                  <div className="inline-flex items-center justify-between w-full pt-3 border-t border-white/20 text-xs font-bold text-white group-hover:text-teal-200 transition-colors">
                    <span className="flex items-center gap-1">
                      Explore Solution
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                    <span className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm group-hover:bg-[#005F63] flex items-center justify-center transition-colors">
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
