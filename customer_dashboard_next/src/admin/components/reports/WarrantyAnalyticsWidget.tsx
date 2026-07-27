import React from 'react';
import { Shield, FileCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { WarrantyAnalyticsData } from '../../services/reportsService';

interface WarrantyAnalyticsWidgetProps {
  data?: WarrantyAnalyticsData;
}

export const WarrantyAnalyticsWidget: React.FC<WarrantyAnalyticsWidgetProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Warranty Registrations & Claims</h3>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-teal-500/10 text-teal-700 rounded-full border border-teal-500/20">
              Warranty Pipeline
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Equipment warranty registrations, submitted claim tickets, and approval status.
          </p>
        </div>

        {/* Total Registrations Card */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Active Equipment Warranty Registrations</div>
            <div className="text-2xl font-black text-[#005F63] mt-0.5">{data.total_registrations}</div>
          </div>
          <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20 text-[#005F63]">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        {/* Claim Status Grid */}
        <div className="grid grid-cols-4 gap-2.5 mt-4">
          <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/60 text-center">
            <div className="text-[10px] font-bold text-slate-500">Total Claims</div>
            <div className="text-base font-black text-slate-900 mt-1">{data.total_claims}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <div className="text-[10px] font-bold text-amber-800">Pending</div>
            <div className="text-base font-black text-amber-900 mt-1">{data.pending_claims}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <div className="text-[10px] font-bold text-emerald-700">Approved</div>
            <div className="text-base font-black text-emerald-800 mt-1">{data.approved_claims}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
            <div className="text-[10px] font-bold text-rose-700">Rejected</div>
            <div className="text-base font-black text-rose-800 mt-1">{data.rejected_claims}</div>
          </div>
        </div>

        {/* Claim Rate Percentage */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500 flex justify-between items-center">
          <span>Equipment Claim Ratio</span>
          <span className="font-bold text-[#005F63]">{data.claim_rate_percentage}% of registered units</span>
        </div>
      </div>
    </div>
  );
};
