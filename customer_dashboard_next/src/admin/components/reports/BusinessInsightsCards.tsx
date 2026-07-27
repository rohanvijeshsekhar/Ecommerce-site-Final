import React from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react';
import type { BusinessInsightItem } from '../../services/reportsService';

interface BusinessInsightsCardsProps {
  insights?: BusinessInsightItem[];
}

export const BusinessInsightsCards: React.FC<BusinessInsightsCardsProps> = ({ insights = [] }) => {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-xs">
      {/* Header */}
      <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Automated Business Insights & Advisory</h3>
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-900 rounded-full border border-amber-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" /> Executive AI Summary
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Smart data recommendations generated dynamically from platform analytics.
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        {insights.map((item) => {
          const isPositive = item.type === 'positive';
          const isWarning = item.type === 'warning';

          const cardBg = isPositive
            ? 'from-emerald-500/10 via-teal-500/5 to-white border-emerald-500/20'
            : isWarning
            ? 'from-amber-500/10 via-orange-500/5 to-white border-amber-500/20'
            : 'from-sky-500/10 via-indigo-500/5 to-white border-sky-500/20';

          const Icon = isPositive ? TrendingUp : isWarning ? AlertTriangle : Lightbulb;
          const iconColor = isPositive ? 'text-emerald-700' : isWarning ? 'text-amber-800' : 'text-sky-700';

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl bg-gradient-to-br ${cardBg} border backdrop-blur-md shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-white/80 border border-slate-200 rounded-md text-slate-700">
                    {item.category}
                  </span>
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
                <div className="text-sm font-bold text-slate-900 mt-3 group-hover:text-[#005F63] transition-colors">
                  {item.title}
                </div>
                <div className="text-xs text-slate-600 font-normal mt-1 leading-relaxed">
                  {item.description}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-[#005F63] group-hover:translate-x-0.5 transition-transform cursor-pointer">
                <span>{item.action_label}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
