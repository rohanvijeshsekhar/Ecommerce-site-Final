import React from 'react';
import { Tag } from 'lucide-react';
import type { CategoryAnalyticsData } from '../../services/reportsService';

interface CategoryAnalyticsChartProps {
  data?: CategoryAnalyticsData;
}

export const CategoryAnalyticsChart: React.FC<CategoryAnalyticsChartProps> = ({ data }) => {
  if (!data || !data.categories || data.categories.length === 0) return null;

  // Premium Curated Color Palette (Vibrant Emerald Teal, Sky Blue, Warm Amber, Emerald, Indigo, Rose)
  const palette = ['#0D9488', '#0EA5E9', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'];

  // Compute SVG Donut Paths with Clean Slices
  let cumulativePercent = 0;

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  const slices = data.categories.map((cat, idx) => {
    const startPercent = cumulativePercent;
    cumulativePercent += cat.percentage / 100;
    const endPercent = cumulativePercent;

    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(endPercent);
    const largeArcFlag = cat.percentage / 100 > 0.5 ? 1 : 0;

    const pathData = [
      `M ${startX} ${startY}`,
      `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      `L 0 0`,
    ].join(' ');

    const color = cat.color && cat.color !== '#005F63' ? cat.color : palette[idx % palette.length];

    return { ...cat, color, pathData };
  });

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 shadow-[0_12px_35px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.05)] transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-sky-500/10 text-sky-700 border border-sky-500/20">
              <Tag className="w-4 h-4 stroke-[2.5]" />
            </span>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Category Revenue Distribution</h3>
            <span className="px-2.5 py-0.5 text-[10px] font-black bg-sky-500/15 text-sky-900 rounded-full border border-sky-500/30">
              Taxonomy Share
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Revenue and volume share breakdown across product categories.
          </p>
        </div>

        {/* Donut Chart & Legend Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center mt-6">
          {/* Donut Ring SVG */}
          <div className="relative flex items-center justify-center p-2">
            <svg viewBox="-1.25 -1.25 2.5 2.5" className="w-56 h-56 transform -rotate-90 filter drop-shadow-sm">
              {slices.map((slice, i) => (
                <path
                  key={i}
                  d={slice.pathData}
                  fill={slice.color}
                  className="transition-all duration-200 hover:opacity-90 hover:scale-105 transform origin-center cursor-pointer"
                />
              ))}
              {/* Spacious Inner Hole (r=0.74) preventing text overlap */}
              <circle cx="0" cy="0" r="0.74" fill="#FFFFFF" />
              <circle cx="0" cy="0" r="0.74" fill="none" stroke="#F1F5F9" strokeWidth="0.04" />
            </svg>

            {/* Centered Donut Label with Perfect Vertical Spacing */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                Total Sales
              </span>
              <span className="text-xl font-black text-slate-900 tracking-tight block">
                ₹{data.total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="space-y-3">
            {slices.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:bg-slate-100/80 transition-all duration-200 hover:shadow-xs group cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs transition-transform group-hover:scale-110"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 capitalize truncate group-hover:text-[#0D9488] transition-colors">
                      {cat.name}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                      {cat.orders} {cat.orders === 1 ? 'order' : 'orders'} placed
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <div className="text-xs font-black text-slate-900">
                    {cat.percentage.toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-slate-500 font-bold mt-0.5">
                    ₹{cat.revenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
