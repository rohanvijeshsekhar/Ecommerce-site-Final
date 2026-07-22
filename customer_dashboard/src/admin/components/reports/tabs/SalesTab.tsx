import React from 'react';
import { RevenueAnalyticsChart } from '../RevenueAnalyticsChart';
import { ProductIntelligenceTable } from '../ProductIntelligenceTable';
import { ReportsEmptyState } from '../ReportsEmptyState';
import { Calendar } from 'lucide-react';
import type { RevenueAnalyticsData, ProductIntelligenceItem, SalesChannelBreakdown, WeeklySalesHeatmapItem } from '../../../services/reportsService';

interface SalesTabProps {
  revenueData?: RevenueAnalyticsData;
  productsData?: ProductIntelligenceItem[];
  salesChannel?: SalesChannelBreakdown;
  weeklyHeatmap?: WeeklySalesHeatmapItem[];
}

export const SalesTab: React.FC<SalesTabProps> = ({
  revenueData,
  productsData,
  salesChannel,
  weeklyHeatmap = [],
}) => {
  const hasSalesData = revenueData && revenueData.total_orders > 0;

  if (!hasSalesData) {
    return (
      <ReportsEmptyState
        title="No Sales Records Found"
        description="No completed paid orders were recorded in the database for the selected period."
      />
    );
  }

  const custShare = salesChannel?.customer_share ?? 0;
  const dealerShare = salesChannel?.dealer_share ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Sales Trend Chart */}
      <section>
        <RevenueAnalyticsChart data={revenueData} />
      </section>

      {/* 2-Column Sales Grid: Channel Breakdown & Weekly Heatmap */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Channel Breakdown */}
        <div className="p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sales Channel Breakdown</h3>
              <p className="text-xs text-slate-500 mt-0.5">B2B Dealer Network vs Direct Customer Sales</p>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#005F63]/10 text-[#005F63] rounded-full border border-[#005F63]/20">
              Live DB Aggregation
            </span>
          </div>

          <div className="space-y-4 mt-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-800">Direct Customer Purchases</span>
                <span className="text-[#005F63]">{custShare}% of Total Revenue</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-[#005F63] rounded-full" style={{ width: `${custShare}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-800">Approved B2B Dealer Orders</span>
                <span className="text-sky-700">{dealerShare}% of Total Revenue</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-sky-600 rounded-full" style={{ width: `${dealerShare}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600">Total Paid Sales Revenue:</span>
            <span className="font-bold text-[#005F63]">₹{salesChannel?.total_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 }) ?? '0.00'}</span>
          </div>
        </div>

        {/* Weekly Sales Heatmap */}
        <div className="p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Weekly Sales Heatmap</h3>
                <p className="text-xs text-slate-500 mt-0.5">Order volume by day of the week from DB timestamps</p>
              </div>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>

            <div className="grid grid-cols-7 gap-2 mt-4 text-center">
              {weeklyHeatmap.map((item) => {
                const style =
                  item.level === 'High'
                    ? 'bg-[#005F63] text-white font-black shadow-xs'
                    : item.level === 'Med'
                    ? 'bg-teal-500/40 text-teal-900 font-bold'
                    : item.level === 'Low'
                    ? 'bg-teal-500/15 text-teal-800 font-semibold'
                    : 'bg-slate-100 text-slate-400';

                return (
                  <div key={item.day} className="space-y-1">
                    <div className="text-[10px] font-semibold text-slate-400">{item.day}</div>
                    <div className={`p-2.5 rounded-xl text-xs ${style}`}>
                      {item.count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Period Orders Count:</span>
            <span className="font-bold text-slate-900">{revenueData.total_orders} orders</span>
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
