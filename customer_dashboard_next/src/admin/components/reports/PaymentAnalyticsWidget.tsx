import React from 'react';
import { CreditCard, CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react';
import type { PaymentAnalyticsData } from '../../services/reportsService';

interface PaymentAnalyticsWidgetProps {
  data?: PaymentAnalyticsData;
}

export const PaymentAnalyticsWidget: React.FC<PaymentAnalyticsWidgetProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Payment Gateway Analytics</h3>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/10 text-purple-700 rounded-full border border-purple-500/20">
              Razorpay & COD
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gateway processing success rates, method distribution, and payment statuses.
          </p>
        </div>

        {/* Success Rate Banner */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Gateway Processing Success Rate</div>
            <div className="text-2xl font-black text-purple-800 mt-0.5">{data.success_rate}%</div>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-700">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Status Counters Grid */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <div className="text-emerald-700 font-bold text-xs flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Successful
            </div>
            <div className="text-lg font-black text-emerald-800 mt-1">{data.successful_payments}</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <div className="text-amber-800 font-bold text-xs flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Pending
            </div>
            <div className="text-lg font-black text-amber-900 mt-1">{data.pending_payments}</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
            <div className="text-rose-700 font-bold text-xs flex items-center justify-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Failed
            </div>
            <div className="text-lg font-black text-rose-800 mt-1">{data.failed_payments}</div>
          </div>
        </div>

        {/* Online vs COD Split */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
            <span className="text-slate-700">Online Payments: {data.online_payments}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-700">COD Orders: {data.cod_orders}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
