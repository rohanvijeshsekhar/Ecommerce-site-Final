import React from 'react';
import { DealerAnalyticsLeaderboard } from '../DealerAnalyticsLeaderboard';
import { Award, ShieldCheck, CheckCircle2 } from 'lucide-react';
import type { DealerAnalyticsItem } from '../../../services/reportsService';

interface DealersTabProps {
  dealersData?: DealerAnalyticsItem[];
}

export const DealersTab: React.FC<DealersTabProps> = ({ dealersData = [] }) => {
  const totalDealerRevenue = dealersData.reduce((acc, d) => acc + d.revenue, 0);
  const totalDealerOrders = dealersData.reduce((acc, d) => acc + d.orders, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Dealer B2B Summary Banner */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Verified Partners — Light Blue-Gray */}
        <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-start justify-between mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">B2B Partners</span>
            <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/30 shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-3xl font-black text-indigo-900">
            {dealersData.length}
            <span className="text-base font-semibold text-indigo-400 ml-1.5">partners</span>
          </div>
          <div className="text-[11px] text-indigo-400 mt-2 font-medium">Approved clinic equipment buyers</div>
        </div>

        {/* B2B Revenue — Light Mint */}
        <div className="p-5 rounded-2xl bg-teal-50 border border-teal-100 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-start justify-between mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-teal-500">Revenue</span>
            <div className="w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center shadow-md shadow-teal-500/30 shrink-0">
              <Award className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-900">
            ₹{totalDealerRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-teal-500 mt-2 font-medium">Gross B2B sales volume</div>
        </div>

        {/* Purchase Orders — Light Lavender */}
        <div className="p-5 rounded-2xl bg-purple-50 border border-purple-100 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-start justify-between mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Orders</span>
            <div className="w-9 h-9 rounded-full bg-fuchsia-500 flex items-center justify-center shadow-md shadow-fuchsia-500/30 shrink-0">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-3xl font-black text-purple-900">
            {totalDealerOrders}
            <span className="text-base font-semibold text-purple-400 ml-1.5">orders</span>
          </div>
          <div className="text-[11px] text-purple-400 mt-2 font-medium">Completed equipment dispatches</div>
        </div>

      </section>

      {/* Leaderboard Table */}
      <section>
        <DealerAnalyticsLeaderboard dealers={dealersData} />
      </section>
    </div>
  );
};
