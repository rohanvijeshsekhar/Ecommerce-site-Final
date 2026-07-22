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

      {/* Section 3: Business Highlights — Reference Card Style */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Highlight 1: Highest Selling Product — Light Amber */}
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Top Product</span>
              <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center shadow-md shadow-amber-400/30 shrink-0">
                <Package className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-sm font-black text-amber-900 truncate max-w-[200px]">
              {topProduct ? topProduct.name : 'Dental Equipment'}
            </div>
            <div className="text-xs font-bold text-amber-600 mt-1.5">
              ₹{topProduct ? topProduct.revenue.toLocaleString('en-IN') : '0.00'}
              <span className="text-amber-400 font-normal ml-1">· {topProduct ? topProduct.units_sold : 0} units</span>
            </div>
          </div>

          {/* Highlight 2: Highest Revenue Category — Light Sky */}
          <div className="p-5 rounded-2xl bg-sky-50 border border-sky-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">Top Category</span>
              <div className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center shadow-md shadow-sky-500/30 shrink-0">
                <Tag className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-sm font-black text-sky-900">
              {topCategory ? topCategory.name : 'Equipment'}
            </div>
            <div className="text-xs font-bold text-sky-600 mt-1.5">
              {topCategory ? `${topCategory.percentage}% of volume` : '0%'}
              <span className="text-sky-400 font-normal ml-1">· ₹{topCategory ? topCategory.revenue.toLocaleString('en-IN') : '0'}</span>
            </div>
          </div>

          {/* Highlight 3: Top Dealer Partner — Light Purple */}
          <div className="p-5 rounded-2xl bg-purple-50 border border-purple-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Top Dealer</span>
              <div className="w-9 h-9 rounded-full bg-fuchsia-500 flex items-center justify-center shadow-md shadow-fuchsia-500/30 shrink-0">
                <Building2 className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-sm font-black text-purple-900 truncate max-w-[200px]">
              {topDealer ? topDealer.company : 'Clinic Partner'}
            </div>
            <div className="text-xs font-bold text-purple-600 mt-1.5">
              ₹{topDealer ? topDealer.revenue.toLocaleString('en-IN') : '0.00'}
              <span className="text-purple-400 font-normal ml-1">· {topDealer ? topDealer.orders : 0} orders</span>
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
