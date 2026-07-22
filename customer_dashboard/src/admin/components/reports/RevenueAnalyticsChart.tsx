import React, { useState } from 'react';
import { Sparkles, BarChart2, TrendingUp } from 'lucide-react';
import type { RevenueAnalyticsData } from '../../services/reportsService';

interface RevenueAnalyticsChartProps {
  data?: RevenueAnalyticsData;
}

export const RevenueAnalyticsChart: React.FC<RevenueAnalyticsChartProps> = ({ data }) => {
  const [chartMode, setChartMode] = useState<'revenue' | 'orders' | 'aov'>('revenue');
  const [viewType, setViewType] = useState<'area' | 'bar'>('area');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || !data.labels || data.labels.length === 0) return null;

  const currentSeries =
    chartMode === 'revenue'
      ? data.revenue_series
      : chartMode === 'orders'
      ? data.orders_series
      : data.aov_series;

  const maxValue = Math.max(...currentSeries, 1);
  const chartHeight = 220;
  const chartWidth = 780;

  // Build SVG Points
  const points = currentSeries.map((val, idx) => {
    const x = (idx / (currentSeries.length - 1 || 1)) * chartWidth;
    const y = chartHeight - (val / maxValue) * (chartHeight - 50) - 20;
    return { x, y, val };
  });

  // Calculate Smooth Monotone Bézier Path (Rounded Natural Peaks)
  const getMonotonePath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const dx = next.x - curr.x;
      const cp1X = curr.x + dx * 0.4;
      const cp1Y = curr.y;
      const cp2X = curr.x + dx * 0.6;
      const cp2Y = next.y;
      path += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const curvePath = getMonotonePath(points);
  const areaPath = `${curvePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  // Find active node (hovered or highest peak)
  const activeIdx =
    hoveredIdx !== null
      ? hoveredIdx
      : points.reduce((maxI, p, i, arr) => (p.val > arr[maxI].val ? i : maxI), 0);
  const activePoint = points[activeIdx];

  // Smart Tooltip Vertical Positioning:
  // If active point is near top peak (y < 75), place tooltip BELOW node to prevent top cutoff!
  const isNearTop = activePoint ? activePoint.y < 75 : false;

  // Clamp horizontal left position between 12% and 88%
  const rawPercent = activePoint ? (activePoint.x / chartWidth) * 100 : 50;
  const tooltipLeftPercent = Math.max(12, Math.min(88, rawPercent));

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 shadow-[0_12px_35px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.05)] transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-teal-500/10 text-[#005F63] border border-[#005F63]/20">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Revenue & Velocity Trend</h3>
            <span className="px-2.5 py-0.5 text-[10px] font-black bg-emerald-500/10 text-emerald-800 rounded-full border border-emerald-500/20">
              Live DB Series
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Time-series analysis across sales volume, gross revenue, and transaction average.
          </p>
        </div>

        {/* Controls Row: View Type (Curve vs Bar) + Mode Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Type Toggle (Area vs Bar) */}
          <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-xs">
            <button
              onClick={() => setViewType('area')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                viewType === 'area'
                  ? 'bg-white text-[#005F63] shadow-md border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Area</span>
            </button>
            <button
              onClick={() => setViewType('bar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                viewType === 'bar'
                  ? 'bg-white text-[#005F63] shadow-md border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Bars</span>
            </button>
          </div>

          {/* Mode Selector */}
          <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-xs">
            <button
              onClick={() => setChartMode('revenue')}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                chartMode === 'revenue'
                  ? 'bg-white text-[#005F63] shadow-md border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Revenue (₹)
            </button>
            <button
              onClick={() => setChartMode('orders')}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                chartMode === 'orders'
                  ? 'bg-white text-emerald-700 shadow-md border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Orders Count
            </button>
            <button
              onClick={() => setChartMode('aov')}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                chartMode === 'aov'
                  ? 'bg-white text-purple-700 shadow-md border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              AOV (₹)
            </button>
          </div>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
        <div className="p-4 bg-gradient-to-b from-teal-500/5 to-slate-50/50 rounded-2xl border border-slate-200/60">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Gross Period Revenue</div>
          <div className="text-xl font-black text-[#005F63] mt-0.5">₹{data.total_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="p-4 bg-gradient-to-b from-emerald-500/5 to-slate-50/50 rounded-2xl border border-slate-200/60">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Paid Orders</div>
          <div className="text-xl font-black text-emerald-800 mt-0.5">{data.total_orders.toLocaleString()} orders</div>
        </div>
        <div className="p-4 bg-gradient-to-b from-purple-500/5 to-slate-50/50 rounded-2xl border border-slate-200/60">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Average Order Value</div>
          <div className="text-xl font-black text-purple-800 mt-0.5">₹{data.avg_order_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      {/* SVG Interactive Chart Canvas */}
      <div className="relative mt-2 pt-8 pb-4 px-2 overflow-x-auto">
        <div className="min-w-[720px] relative">
          {/* Smart Floating 3D Light Tooltip Badge (Flips BELOW point when near top to guarantee ZERO clipping!) */}
          {activePoint && (
            <div
              className={`absolute bg-white/95 backdrop-blur-xl border border-slate-200/90 text-slate-900 rounded-2xl px-4 py-2 shadow-[0_10px_25px_rgba(0,0,0,0.12)] pointer-events-none transform -translate-x-1/2 font-black z-30 transition-all duration-150 ${
                isNearTop ? 'translate-y-0' : '-translate-y-full'
              }`}
              style={{
                left: `${tooltipLeftPercent}%`,
                top: isNearTop ? `${activePoint.y + 14}px` : `${activePoint.y - 14}px`,
              }}
            >
              {isNearTop && (
                <div className="w-2.5 h-2.5 bg-white border-l border-t border-slate-200/90 rotate-45 mx-auto -mt-3.5 mb-1" />
              )}
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-center">
                {data.labels[activeIdx]}
              </div>
              <div className="text-xs font-black text-[#005F63] text-center mt-0.5 whitespace-nowrap">
                {chartMode === 'orders'
                  ? `${activePoint.val} orders`
                  : `₹${activePoint.val.toLocaleString('en-IN')}`}
              </div>
              {!isNearTop && (
                <div className="w-2.5 h-2.5 bg-white border-r border-b border-slate-200/90 rotate-45 mx-auto -mb-3.5 mt-1" />
              )}
            </div>
          )}

          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-64 overflow-visible">
            <defs>
              <linearGradient id="softAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#005F63" stopOpacity="0.25" />
                <stop offset="60%" stopColor="#10B981" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#005F63" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="lineStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#005F63" />
                <stop offset="50%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#0EA5E9" />
              </linearGradient>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#005F63" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <g key={i}>
                <line
                  x1="0"
                  y1={chartHeight * (1 - ratio)}
                  x2={chartWidth}
                  y2={chartHeight * (1 - ratio)}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              </g>
            ))}

            {/* Vertical Guide Line on Hover */}
            {activePoint && (
              <line
                x1={activePoint.x}
                y1="0"
                x2={activePoint.x}
                y2={chartHeight}
                stroke="#005F63"
                strokeOpacity="0.3"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />
            )}

            {/* Area View Mode */}
            {viewType === 'area' && (
              <>
                <path d={areaPath} fill="url(#softAreaGradient)" />
                <path d={curvePath} fill="none" stroke="url(#lineStrokeGradient)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                {points.map((p, idx) => {
                  const isActive = idx === activeIdx;
                  const isNonZero = p.val > 0;
                  if (!isNonZero && !isActive) return null;

                  return (
                    <g key={idx} onMouseEnter={() => setHoveredIdx(idx)} onMouseLeave={() => setHoveredIdx(null)}>
                      {isActive && (
                        <circle cx={p.x} cy={p.y} r="10" className="fill-[#005F63]/25 animate-ping" />
                      )}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isActive ? "6" : "4"}
                        className="fill-white stroke-[#005F63] stroke-[3.5px] transition-all duration-150 cursor-pointer shadow-md"
                      />
                    </g>
                  );
                })}
              </>
            )}

            {/* Bar View Mode (Liquid Pill Columns) */}
            {viewType === 'bar' && (
              <g>
                {points.map((p, idx) => {
                  const isActive = idx === activeIdx;
                  const barWidth = Math.max(8, Math.min(22, (chartWidth / points.length) * 0.6));
                  const barHeight = chartHeight - p.y;
                  const xPos = p.x - barWidth / 2;

                  return (
                    <rect
                      key={idx}
                      x={xPos}
                      y={p.y}
                      width={barWidth}
                      height={barHeight}
                      rx={barWidth / 2}
                      fill={isActive ? '#005F63' : 'url(#barGradient)'}
                      opacity={isActive ? 1 : 0.75}
                      className="transition-all duration-200 cursor-pointer hover:opacity-100"
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  );
                })}
              </g>
            )}

            {/* Transparent hover hitboxes for seamless cursor tracking across all date points */}
            {points.map((p, idx) => (
              <rect
                key={`hit-${idx}`}
                x={p.x - chartWidth / (points.length * 2)}
                y="0"
                width={chartWidth / points.length}
                height={chartHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            ))}
          </svg>

          {/* X Axis Date Labels */}
          <div className="flex justify-between items-center mt-3 px-1 text-[11px] font-extrabold text-slate-400">
            {data.labels.filter((_, i) => i % Math.ceil(data.labels.length / 8) === 0).map((lbl, idx) => (
              <span key={idx}>{lbl}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
