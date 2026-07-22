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
          {/* Highlight 1: Highest Selling Product */}
          <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-800 border border-amber-500/20 rounded-xl shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Highest Selling Product
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 truncate max-w-[200px]">
                {topProduct ? topProduct.name : 'Dental Equipment'}
              </div>
              <div className="text-xs font-black text-[#005F63] mt-0.5">
                ₹{topProduct ? topProduct.revenue.toLocaleString('en-IN') : '0.00'} ({topProduct ? topProduct.units_sold : 0} units)
              </div>
            </div>
          </div>

          {/* Highlight 2: Highest Revenue Category */}
          <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-sky-500/10 text-sky-700 border border-sky-500/20 rounded-xl shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Highest Revenue Category
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {topCategory ? topCategory.name : 'Equipment'}
              </div>
              <div className="text-xs font-black text-sky-800 mt-0.5">
                {topCategory ? `${topCategory.percentage}% total volume` : '0%'} (₹{topCategory ? topCategory.revenue.toLocaleString('en-IN') : '0'})
              </div>
            </div>
          </div>

          {/* Highlight 3: Top Dealer Partner */}
          <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 rounded-xl shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Top Dealer Partner
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 truncate max-w-[200px]">
                {topDealer ? topDealer.company : 'Clinic Partner'}
              </div>
              <div className="text-xs font-black text-indigo-900 mt-0.5">
                ₹{topDealer ? topDealer.revenue.toLocaleString('en-IN') : '0.00'} ({topDealer ? topDealer.orders : 0} orders)
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
