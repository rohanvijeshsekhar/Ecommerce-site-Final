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

        {/* Online Payments — Soft Lavender Pastel */}
        <div className="relative p-5 rounded-2xl bg-purple-50 border border-purple-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-purple-100 border border-purple-200 rounded-xl">
              <CreditCard className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Online</span>
          </div>
          <div className="text-3xl font-black text-purple-800 group-hover:text-purple-900 transition-colors">
            {paymentData ? paymentData.online_payments : 0}
            <span className="text-base font-semibold text-purple-400 ml-1.5">orders</span>
          </div>
          <div className="text-[11px] text-purple-500 mt-2 font-medium">Razorpay UPI, Cards &amp; NetBanking</div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-300 via-violet-300 to-purple-200 rounded-b-2xl opacity-60" />
        </div>

        {/* Cash On Delivery — Soft Peach Pastel */}
        <div className="relative p-5 rounded-2xl bg-orange-50 border border-orange-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-orange-100 border border-orange-200 rounded-xl">
              <DollarSign className="w-4 h-4 text-orange-500" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">COD</span>
          </div>
          <div className="text-3xl font-black text-orange-800 group-hover:text-orange-900 transition-colors">
            {paymentData ? paymentData.cod_orders : 0}
            <span className="text-base font-semibold text-orange-400 ml-1.5">orders</span>
          </div>
          <div className="text-[11px] text-orange-500 mt-2 font-medium">Pay on delivery option</div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-300 via-amber-300 to-orange-200 rounded-b-2xl opacity-60" />
        </div>

        {/* Gateway Success — Soft Mint Pastel */}
        <div className="relative p-5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-emerald-100 border border-emerald-200 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Success</span>
          </div>
          <div className="text-3xl font-black text-emerald-800 group-hover:text-emerald-900 transition-colors">
            {paymentData ? paymentData.success_rate : 0}
            <span className="text-base font-semibold text-emerald-400 ml-1.5">%</span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-2 font-medium">Clean Razorpay signature rate</div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-200 rounded-b-2xl opacity-60" />
        </div>

      </section>

      {/* Payment Gateway Widget */}
      <section>
        <PaymentAnalyticsWidget data={paymentData} />
      </section>
    </div>
  );
};
