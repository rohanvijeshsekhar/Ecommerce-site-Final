import React from 'react';
import { PaymentAnalyticsWidget } from '../PaymentAnalyticsWidget';
import { DollarSign, CreditCard, ShieldCheck, ArrowUpRight } from 'lucide-react';
import type { PaymentAnalyticsData } from '../../../services/reportsService';

interface FinanceTabProps {
  paymentData?: PaymentAnalyticsData;
}

export const FinanceTab: React.FC<FinanceTabProps> = ({ paymentData }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Financial Overview Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Online Payments — Purple Gradient */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 shadow-lg shadow-purple-500/20 border border-purple-500/30 group hover:shadow-purple-500/30 hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_70%)]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-purple-200 uppercase tracking-wider">Online Payments</div>
              <div className="p-2 bg-white/15 rounded-xl border border-white/20">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-1 group-hover:scale-105 transition-transform origin-left">
              {paymentData ? paymentData.online_payments : 0}
              <span className="text-lg font-semibold text-purple-200 ml-1">orders</span>
            </div>
            <div className="text-[11px] text-purple-200 mt-2 font-medium">Razorpay UPI, Cards &amp; NetBanking</div>
          </div>
        </div>

        {/* Cash On Delivery — Amber/Orange Gradient */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 shadow-lg shadow-amber-500/20 border border-amber-400/30 group hover:shadow-amber-500/30 hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_70%)]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-amber-100 uppercase tracking-wider">Cash On Delivery</div>
              <div className="p-2 bg-white/15 rounded-xl border border-white/20">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-1 group-hover:scale-105 transition-transform origin-left">
              {paymentData ? paymentData.cod_orders : 0}
              <span className="text-lg font-semibold text-amber-100 ml-1">orders</span>
            </div>
            <div className="text-[11px] text-amber-100 mt-2 font-medium">Pay on delivery option</div>
          </div>
        </div>

        {/* Gateway Success — Emerald/Teal Gradient */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-[#005F63] shadow-lg shadow-emerald-500/20 border border-emerald-400/30 group hover:shadow-emerald-500/30 hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_70%)]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Authorization Success</div>
              <div className="p-2 bg-white/15 rounded-xl border border-white/20">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-1 group-hover:scale-105 transition-transform origin-left">
              {paymentData ? paymentData.success_rate : 0}
              <span className="text-lg font-semibold text-emerald-100 ml-1">%</span>
            </div>
            <div className="text-[11px] text-emerald-100 mt-2 font-medium">Clean Razorpay signature rate</div>
          </div>
        </div>
      </section>

      {/* Payment Gateway Widget */}
      <section>
        <PaymentAnalyticsWidget data={paymentData} />
      </section>
    </div>
  );
};
