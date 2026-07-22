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
        {/* Verified Partners — Indigo Gradient */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 shadow-lg shadow-indigo-500/20 border border-indigo-500/30 group hover:shadow-indigo-500/30 hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_70%)]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider">B2B Dealer Partners</div>
              <div className="p-2 bg-white/15 rounded-xl border border-white/20">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-3xl font-black text-white group-hover:scale-105 transition-transform origin-left">
              {dealersData.length}
              <span className="text-lg font-semibold text-indigo-200 ml-1">partners</span>
            </div>
            <div className="text-[11px] text-indigo-200 mt-2 font-medium">Approved clinic equipment buyers</div>
          </div>
        </div>

        {/* B2B Revenue — Teal Gradient */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-teal-500 via-[#005F63] to-cyan-700 shadow-lg shadow-teal-500/20 border border-teal-400/30 group hover:shadow-teal-500/30 hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_70%)]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-teal-100 uppercase tracking-wider">Total B2B Sales</div>
              <div className="p-2 bg-white/15 rounded-xl border border-white/20">
                <Award className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left">
              ₹{totalDealerRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-teal-100 mt-2 font-medium">Gross B2B sales volume</div>
          </div>
        </div>

        {/* Purchase Orders — Sky Gradient */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 shadow-lg shadow-sky-500/20 border border-sky-400/30 group hover:shadow-sky-500/30 hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_70%)]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-sky-100 uppercase tracking-wider">Purchase Orders</div>
              <div className="p-2 bg-white/15 rounded-xl border border-white/20">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-3xl font-black text-white group-hover:scale-105 transition-transform origin-left">
              {totalDealerOrders}
              <span className="text-lg font-semibold text-sky-100 ml-1">orders</span>
            </div>
            <div className="text-[11px] text-sky-100 mt-2 font-medium">Completed equipment dispatches</div>
          </div>
        </div>
      </section>

      {/* Leaderboard Table */}
      <section>
        <DealerAnalyticsLeaderboard dealers={dealersData} />
      </section>
    </div>
  );
};
