import React from 'react';
import { RevenueAnalyticsChart } from '../RevenueAnalyticsChart';
import { ProductIntelligenceTable } from '../ProductIntelligenceTable';
import { TrendingUp, Calendar, ArrowUpRight, ShieldCheck } from 'lucide-react';
import type { RevenueAnalyticsData, ProductIntelligenceItem } from '../../../services/reportsService';

interface SalesTabProps {
  revenueData?: RevenueAnalyticsData;
  productsData?: ProductIntelligenceItem[];
}

export const SalesTab: React.FC<SalesTabProps> = ({ revenueData, productsData }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Sales Trend Chart */}
      <section>
        <RevenueAnalyticsChart data={revenueData} />
      </section>

      {/* 2-Column Sales Grid: Channel Comparison & Heatmap */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Channel Comparison */}
        <div className="p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sales Channel Breakdown</h3>
              <p className="text-xs text-slate-500 mt-0.5">B2B Dealer Network vs Direct Customer Sales</p>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#005F63]/10 text-[#005F63] rounded-full border border-[#005F63]/20">
              Channel Volume
            </span>
          </div>

          <div className="space-y-4 mt-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-800">Direct Customer Purchases</span>
                <span className="text-[#005F63]">62% of Total Sales</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-[#005F63] rounded-full" style={{ width: '62%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-800">Approved B2B Dealer Orders</span>
                <span className="text-sky-700">38% of Total Sales</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-sky-600 rounded-full" style={{ width: '38%' }} />
              </div>
            </div>
          </div>

          <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600">Peak Order Day:</span>
            <span className="font-bold text-slate-900">Wednesday (2:00 PM – 5:00 PM)</span>
          </div>
        </div>

        {/* Sales Heatmap & Velocity */}
        <div className="p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Weekly Sales Velocity Heatmap</h3>
                <p className="text-xs text-slate-500 mt-0.5">Order placement intensity by day of the week</p>
              </div>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>

            <div className="grid grid-cols-7 gap-2 mt-4 text-center">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                const intensities = [
                  'bg-teal-500/20 text-teal-800',
                  'bg-teal-500/40 text-teal-900 font-bold',
                  'bg-[#005F63] text-white font-extrabold shadow-xs',
                  'bg-teal-500/60 text-white font-bold',
                  'bg-teal-500/30 text-teal-800',
                  'bg-slate-100 text-slate-500',
                  'bg-slate-100 text-slate-400',
                ];

                return (
                  <div key={day} className="space-y-1">
                    <div className="text-[10px] font-semibold text-slate-400">{day}</div>
                    <div className={`p-2.5 rounded-xl text-xs ${intensities[i]}`}>
                      {i === 2 ? 'High' : i < 5 ? 'Med' : 'Low'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Average Daily Orders:</span>
            <span className="font-bold text-slate-900">24 orders / day</span>
          </div>
        </div>
      </section>

      {/* Top Sellers Table */}
      <section>
        <ProductIntelligenceTable products={productsData} />
      </section>
    </div>
  );
};
