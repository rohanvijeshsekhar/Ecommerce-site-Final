import React from 'react';
import { ExecutiveKpiCards } from '../ExecutiveKpiCards';
import { RevenueAnalyticsChart } from '../RevenueAnalyticsChart';
import { BusinessInsightsCards } from '../BusinessInsightsCards';
import { Package, Tag, Building2 } from 'lucide-react';
import type { FullReportsOverviewPayload } from '../../../services/reportsService';

interface OverviewTabProps {
  data: FullReportsOverviewPayload;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ data }) => {
  const topProduct = data.products_intelligence?.[0];
  const topCategory = data.category_analytics?.categories?.[0];
  const topDealer = data.dealer_analytics?.[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Section 1: Executive KPI Cards (Max 6 cards) */}
      <section>
        <ExecutiveKpiCards data={data.kpis} />
      </section>

      {/* Section 2: Large Revenue Chart */}
      <section>
        <RevenueAnalyticsChart data={data.revenue_analytics} />
      </section>

      {/* Section 3: Business Highlights (3 Cards Only) */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Highlight 1: Highest Selling Product — Amber */}
          <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 shadow-lg shadow-amber-500/20 border border-amber-400/30 group hover:shadow-amber-500/30 hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_70%)]" />
            <div className="relative z-10 flex items-start gap-3">
              <div className="p-2.5 bg-white/15 border border-white/20 rounded-xl shrink-0">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-amber-100 uppercase tracking-wider">
                  Highest Selling Product
                </div>
                <div className="text-sm font-black text-white mt-1 truncate max-w-[200px]">
                  {topProduct ? topProduct.name : 'Dental Equipment'}
                </div>
                <div className="text-xs font-bold text-amber-100 mt-1">
                  ₹{topProduct ? topProduct.revenue.toLocaleString('en-IN') : '0.00'} · {topProduct ? topProduct.units_sold : 0} units
                </div>
              </div>
            </div>
          </div>

          {/* Highlight 2: Highest Revenue Category — Sky */}
          <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 shadow-lg shadow-sky-500/20 border border-sky-400/30 group hover:shadow-sky-500/30 hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_70%)]" />
            <div className="relative z-10 flex items-start gap-3">
              <div className="p-2.5 bg-white/15 border border-white/20 rounded-xl shrink-0">
                <Tag className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-sky-100 uppercase tracking-wider">
                  Highest Revenue Category
                </div>
                <div className="text-sm font-black text-white mt-1">
                  {topCategory ? topCategory.name : 'Equipment'}
                </div>
                <div className="text-xs font-bold text-sky-100 mt-1">
                  {topCategory ? `${topCategory.percentage}% total` : '0%'} · ₹{topCategory ? topCategory.revenue.toLocaleString('en-IN') : '0'}
                </div>
              </div>
            </div>
          </div>

          {/* Highlight 3: Top Dealer Partner — Indigo */}
          <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 shadow-lg shadow-indigo-500/20 border border-indigo-500/30 group hover:shadow-indigo-500/30 hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_70%)]" />
            <div className="relative z-10 flex items-start gap-3">
              <div className="p-2.5 bg-white/15 border border-white/20 rounded-xl shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">
                  Top Dealer Partner
                </div>
                <div className="text-sm font-black text-white mt-1 truncate max-w-[200px]">
                  {topDealer ? topDealer.company : 'Clinic Partner'}
                </div>
                <div className="text-xs font-bold text-indigo-200 mt-1">
                  ₹{topDealer ? topDealer.revenue.toLocaleString('en-IN') : '0.00'} · {topDealer ? topDealer.orders : 0} orders
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Business Insights (3-5 Recommendations) */}
      <section>
        <BusinessInsightsCards insights={data.business_insights} />
      </section>
    </div>
  );
};
