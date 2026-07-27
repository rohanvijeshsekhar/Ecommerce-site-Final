import React from 'react';
import { Activity, Clock, ShoppingBag, Shield, HelpCircle, Building2 } from 'lucide-react';
import type { ReportActivityItem } from '../../services/reportsService';

interface RecentActivitiesTimelineProps {
  activities?: ReportActivityItem[];
}

export const RecentActivitiesTimeline: React.FC<RecentActivitiesTimelineProps> = ({ activities = [] }) => {
  if (!activities || activities.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'Order':
        return ShoppingBag;
      case 'Dealer':
        return Building2;
      case 'Warranty':
        return Shield;
      case 'Support':
        return HelpCircle;
      default:
        return Activity;
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-xs">
      {/* Header */}
      <div className="pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-900">Recent Enterprise Activities Timeline</h3>
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
            Real-Time Feed
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Unified system events across orders, partner registrations, warranty claims, and support tickets.
        </p>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 space-y-4 mt-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {activities.map((act) => {
          const Icon = getIcon(act.type);

          return (
            <div key={act.id} className="relative group">
              {/* Dot Icon */}
              <div className="absolute -left-6 top-0.5 p-1 rounded-full bg-white border border-slate-300 group-hover:border-[#005F63] transition-colors">
                <Icon className="w-3 h-3 text-[#005F63]" />
              </div>

              {/* Card Content */}
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/60 transition-colors flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>{act.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${act.badge_color}`}>
                      {act.type}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">{act.description}</div>
                </div>

                <div className="text-right shrink-0 text-[10px] font-medium text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
