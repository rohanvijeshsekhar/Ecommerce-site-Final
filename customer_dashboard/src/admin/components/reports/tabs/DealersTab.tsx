import React from 'react';
import { DealerAnalyticsLeaderboard } from '../DealerAnalyticsLeaderboard';
import { Building2, Award, ShieldCheck, CheckCircle2 } from 'lucide-react';
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

        {/* Verified Partners — Soft Iris Pastel */}
        <div className="relative p-5 rounded-2xl bg-indigo-50 border border-indigo-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-indigo-100 border border-indigo-200 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">B2B Partners</span>
          </div>
          <div className="text-3xl font-black text-indigo-800 group-hover:text-indigo-900 transition-colors">
            {dealersData.length}
            <span className="text-base font-semibold text-indigo-400 ml-1.5">partners</span>
          </div>
          <div className="text-[11px] text-indigo-500 mt-2 font-medium">Approved clinic equipment buyers</div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-300 via-violet-300 to-indigo-200 rounded-b-2xl opacity-60" />
        </div>

        {/* B2B Revenue — Soft Teal Pastel */}
        <div className="relative p-5 rounded-2xl bg-teal-50 border border-teal-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-teal-100 border border-teal-200 rounded-xl">
              <Award className="w-4 h-4 text-teal-600" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Revenue</span>
          </div>
          <div className="text-2xl font-black text-teal-800 group-hover:text-teal-900 transition-colors">
            ₹{totalDealerRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-teal-600 mt-2 font-medium">Gross B2B sales volume</div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-300 via-cyan-300 to-teal-200 rounded-b-2xl opacity-60" />
        </div>

        {/* Purchase Orders — Soft Sky Pastel */}
        <div className="relative p-5 rounded-2xl bg-sky-50 border border-sky-200 shadow-sm hover:shadow-md hover:border-sky-300 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-sky-100 border border-sky-200 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-sky-600" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Orders</span>
          </div>
          <div className="text-3xl font-black text-sky-800 group-hover:text-sky-900 transition-colors">
            {totalDealerOrders}
            <span className="text-base font-semibold text-sky-400 ml-1.5">orders</span>
          </div>
          <div className="text-[11px] text-sky-600 mt-2 font-medium">Completed equipment dispatches</div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-300 via-blue-300 to-sky-200 rounded-b-2xl opacity-60" />
        </div>

      </section>

      {/* Leaderboard Table */}
      <section>
        <DealerAnalyticsLeaderboard dealers={dealersData} />
      </section>
    </div>
  );
};
