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

      {/* Section 3: Business Highlights — Pastel Cards */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Highlight 1: Highest Selling Product — Soft Amber Pastel */}
          <div className="relative p-5 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-300 group">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-amber-100 border border-amber-200 rounded-xl shrink-0">
                <Package className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">
                Highest Selling Product
              </div>
            </div>
            <div className="text-sm font-black text-amber-900 truncate max-w-[220px]">
              {topProduct ? topProduct.name : 'Dental Equipment'}
            </div>
            <div className="text-xs font-bold text-amber-600 mt-1.5">
              ₹{topProduct ? topProduct.revenue.toLocaleString('en-IN') : '0.00'}
              <span className="text-amber-400 font-normal ml-1">· {topProduct ? topProduct.units_sold : 0} units</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-200 rounded-b-2xl opacity-70" />
          </div>

          {/* Highlight 2: Highest Revenue Category — Soft Sky Pastel */}
          <div className="relative p-5 rounded-2xl bg-sky-50 border border-sky-200 shadow-sm hover:shadow-md hover:border-sky-300 transition-all duration-300 group">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-sky-100 border border-sky-200 rounded-xl shrink-0">
                <Tag className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-[11px] font-bold text-sky-500 uppercase tracking-wider">
                Highest Revenue Category
              </div>
            </div>
            <div className="text-sm font-black text-sky-900">
              {topCategory ? topCategory.name : 'Equipment'}
            </div>
            <div className="text-xs font-bold text-sky-600 mt-1.5">
              {topCategory ? `${topCategory.percentage}% of volume` : '0%'}
              <span className="text-sky-400 font-normal ml-1">· ₹{topCategory ? topCategory.revenue.toLocaleString('en-IN') : '0'}</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-300 via-blue-300 to-sky-200 rounded-b-2xl opacity-70" />
          </div>

          {/* Highlight 3: Top Dealer Partner — Soft Indigo Pastel */}
          <div className="relative p-5 rounded-2xl bg-indigo-50 border border-indigo-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-300 group">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-indigo-100 border border-indigo-200 rounded-xl shrink-0">
                <Building2 className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                Top Dealer Partner
              </div>
            </div>
            <div className="text-sm font-black text-indigo-900 truncate max-w-[220px]">
              {topDealer ? topDealer.company : 'Clinic Partner'}
            </div>
            <div className="text-xs font-bold text-indigo-600 mt-1.5">
              ₹{topDealer ? topDealer.revenue.toLocaleString('en-IN') : '0.00'}
              <span className="text-indigo-400 font-normal ml-1">· {topDealer ? topDealer.orders : 0} orders</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-300 via-purple-300 to-indigo-200 rounded-b-2xl opacity-70" />
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
