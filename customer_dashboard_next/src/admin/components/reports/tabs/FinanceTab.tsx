import React from 'react';
import { PaymentAnalyticsWidget } from '../PaymentAnalyticsWidget';
import { DollarSign, CreditCard, ShieldCheck } from 'lucide-react';
import type { PaymentAnalyticsData } from '../../../services/reportsService';

interface FinanceTabProps {
  paymentData?: PaymentAnalyticsData;
}

export const FinanceTab: React.FC<FinanceTabProps> = ({ paymentData }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Financial Overview Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Online Payments — Light Lavender */}
        <div className="p-5 rounded-2xl bg-purple-50 border border-purple-100 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-start justify-between mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Online</span>
            <div className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center shadow-md shadow-purple-500/30 shrink-0">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-3xl font-black text-purple-900">
            {paymentData ? paymentData.online_payments : 0}
            <span className="text-base font-semibold text-purple-500 ml-1.5">orders</span>
          </div>
          <div className="text-[11px] text-purple-400 mt-2 font-medium">Razorpay UPI, Cards &amp; NetBanking</div>
        </div>

        {/* Cash On Delivery — Light Peach */}
        <div className="p-5 rounded-2xl bg-orange-50 border border-orange-100 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-start justify-between mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">COD</span>
            <div className="w-9 h-9 rounded-full bg-orange-400 flex items-center justify-center shadow-md shadow-orange-400/30 shrink-0">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-3xl font-black text-orange-900">
            {paymentData ? paymentData.cod_orders : 0}
            <span className="text-base font-semibold text-orange-400 ml-1.5">orders</span>
          </div>
          <div className="text-[11px] text-orange-400 mt-2 font-medium">Pay on delivery option</div>
        </div>

        {/* Gateway Success — Light Mint */}
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-start justify-between mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Success</span>
            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30 shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-900">
            {paymentData ? paymentData.success_rate : 0}
            <span className="text-base font-semibold text-emerald-500 ml-1">%</span>
          </div>
          <div className="text-[11px] text-emerald-500 mt-2 font-medium">Clean Razorpay signature rate</div>
        </div>

      </section>

      {/* Payment Gateway Widget */}
      <section>
        <PaymentAnalyticsWidget data={paymentData} />
      </section>
    </div>
  );
};
