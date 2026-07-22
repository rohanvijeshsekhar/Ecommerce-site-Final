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
        <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Verified B2B Dealer Partners</div>
          <div className="text-2xl font-black text-indigo-900 mt-1">{dealersData.length} active partners</div>
          <div className="text-[10px] text-slate-400 mt-1">Approved clinic equipment buyers</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Total B2B Network Sales</div>
          <div className="text-2xl font-black text-[#005F63] mt-1">₹{totalDealerRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div className="text-[10px] text-slate-400 mt-1">Gross B2B sales volume</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Total B2B Purchase Orders</div>
          <div className="text-2xl font-black text-sky-800 mt-1">{totalDealerOrders} orders</div>
          <div className="text-[10px] text-slate-400 mt-1">Completed equipment dispatches</div>
        </div>
      </section>

      {/* Leaderboard Table */}
      <section>
        <DealerAnalyticsLeaderboard dealers={dealersData} />
      </section>
    </div>
  );
};
