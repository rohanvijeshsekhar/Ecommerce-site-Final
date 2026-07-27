import React from 'react';
import { Building2, Award, TrendingUp, MapPin } from 'lucide-react';
import type { DealerAnalyticsItem } from '../../services/reportsService';

interface DealerAnalyticsLeaderboardProps {
  dealers?: DealerAnalyticsItem[];
}

export const DealerAnalyticsLeaderboard: React.FC<DealerAnalyticsLeaderboardProps> = ({ dealers = [] }) => {
  if (!dealers || dealers.length === 0) return null;

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Dealer & B2B Partner Analytics</h3>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 rounded-full border border-indigo-500/20">
              B2B Leaderboard
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Top dental clinic partners and verified equipment dealers by order volume.
          </p>
        </div>

        {/* Leaderboard List */}
        <div className="space-y-3 mt-4">
          {dealers.map((dealer) => {
            const badgeBg =
              dealer.rank === 1
                ? 'bg-amber-400 text-amber-950 font-extrabold'
                : dealer.rank === 2
                ? 'bg-slate-200 text-slate-800 font-bold'
                : dealer.rank === 3
                ? 'bg-amber-700/20 text-amber-900 font-bold'
                : 'bg-slate-100 text-slate-600 font-semibold';

            return (
              <div
                key={dealer.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/60 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs shrink-0 ${badgeBg}`}>
                    #{dealer.rank}
                  </span>
                  <div>
                    <div className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-[#005F63] transition-colors">
                      {dealer.company}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{dealer.name}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        {dealer.location}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs sm:text-sm font-black text-[#005F63]">
                    ₹{dealer.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                    {dealer.orders} B2B orders placed
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
