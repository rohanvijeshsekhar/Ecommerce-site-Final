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
        <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50/90 via-fuchsia-50/40 to-indigo-50/70 border border-purple-100/80 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-purple-100/70">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sales Channel Breakdown</h3>
              <p className="text-xs text-slate-500 mt-0.5">B2B Dealer Network vs Direct Customer Sales</p>
            </div>
          </div>

          <div className="space-y-4 mt-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-800">Direct Customer Purchases</span>
                <span className="text-indigo-600 font-bold">{custShare}% of Total Revenue</span>
              </div>
              <div className="w-full h-3 rounded-full bg-indigo-100/60 overflow-hidden p-0.5 border border-indigo-100/50">
                <div className="h-full bg-indigo-400 rounded-full transition-all duration-500" style={{ width: `${custShare}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-800">Approved B2B Dealer Orders</span>
                <span className="text-pink-600 font-bold">{dealerShare}% of Total Revenue</span>
              </div>
              <div className="w-full h-3 rounded-full bg-pink-100/60 overflow-hidden p-0.5 border border-pink-100/50">
                <div className="h-full bg-pink-400 rounded-full transition-all duration-500" style={{ width: `${dealerShare}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-5 p-3.5 rounded-xl bg-white/90 backdrop-blur-sm border border-purple-100/80 shadow-xs flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600">Total Paid Sales Revenue:</span>
            <span className="font-bold text-purple-900 text-sm">₹{salesChannel?.total_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 }) ?? '0.00'}</span>
          </div>
        </div>

        {/* Weekly Sales Heatmap */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50/90 via-fuchsia-50/40 to-indigo-50/70 border border-purple-100/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-purple-100/70">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Weekly Sales Heatmap</h3>
                <p className="text-xs text-slate-500 mt-0.5">Order volume by day of the week from DB timestamps</p>
              </div>
              <div className="p-2 rounded-xl bg-purple-100/80 border border-purple-200/60 text-purple-600">
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mt-4 text-center">
              {weeklyHeatmap.map((item) => {
                const style =
                  item.level === 'High'
                    ? 'bg-purple-500 text-white font-bold shadow-xs'
                    : item.level === 'Med'
                    ? 'bg-purple-200/80 text-purple-900 font-bold border border-purple-200/50'
                    : item.level === 'Low'
                    ? 'bg-purple-100/70 text-purple-800 font-medium border border-purple-200/40'
                    : 'bg-white/80 text-slate-400 border border-purple-100/40';

                return (
                  <div key={item.day} className="space-y-1">
                    <div className="text-[10px] font-semibold text-slate-500">{item.day}</div>
                    <div className={`p-2.5 rounded-xl text-xs ${style}`}>
                      {item.count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-100/80 text-xs text-slate-600 flex justify-between">
            <span>Period Orders Count:</span>
            <span className="font-bold text-purple-950">{revenueData.total_orders} orders</span>
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
