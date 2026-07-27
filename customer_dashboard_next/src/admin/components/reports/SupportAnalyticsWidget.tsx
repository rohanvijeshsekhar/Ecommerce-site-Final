import React from 'react';
import { HelpCircle, Clock, CheckCircle2, AlertCircle, Smile } from 'lucide-react';
import type { SupportAnalyticsData } from '../../services/reportsService';

interface SupportAnalyticsWidgetProps {
  data?: SupportAnalyticsData;
}

export const SupportAnalyticsWidget: React.FC<SupportAnalyticsWidgetProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Support Desk Intelligence</h3>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-sky-500/10 text-sky-700 rounded-full border border-sky-500/20">
              Customer Desk
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Support tickets velocity, average resolution speed, and client satisfaction score.
          </p>
        </div>

        {/* CSAT Banner */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Customer Satisfaction (CSAT)</div>
            <div className="text-2xl font-black text-sky-800 mt-0.5">{data.customer_satisfaction_score}%</div>
          </div>
          <div className="p-3 bg-sky-500/10 rounded-xl border border-sky-500/20 text-sky-700">
            <Smile className="w-6 h-6" />
          </div>
        </div>

        {/* Tickets Breakdown Grid */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <div className="text-amber-800 font-bold text-xs flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Open
            </div>
            <div className="text-lg font-black text-amber-900 mt-1">{data.open_tickets}</div>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
            <div className="text-blue-700 font-bold text-xs flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" /> In Progress
            </div>
            <div className="text-lg font-black text-blue-800 mt-1">{data.in_progress_tickets}</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <div className="text-emerald-700 font-bold text-xs flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
            </div>
            <div className="text-lg font-black text-emerald-800 mt-1">{data.resolved_tickets}</div>
          </div>
        </div>

        {/* Avg Resolution Time */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-500">Average Resolution Time</span>
          <span className="font-bold text-sky-700">{data.avg_resolution_hours} hours / ticket</span>
        </div>
      </div>
    </div>
  );
};
