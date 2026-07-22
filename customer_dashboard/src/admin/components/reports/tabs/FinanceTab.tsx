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
        <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Online Payments Processing</div>
          <div className="text-2xl font-black text-purple-800 mt-1">
            {paymentData ? paymentData.online_payments : 0} orders
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Razorpay UPI, Cards & NetBanking</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Cash On Delivery (COD)</div>
          <div className="text-2xl font-black text-amber-800 mt-1">
            {paymentData ? paymentData.cod_orders : 0} orders
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Pay on delivery option</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Gateway Authorization Success</div>
          <div className="text-2xl font-black text-emerald-800 mt-1">
            {paymentData ? paymentData.success_rate : 0}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Clean Razorpay signature rate</div>
        </div>
      </section>

      {/* Payment Gateway Widget */}
      <section>
        <PaymentAnalyticsWidget data={paymentData} />
      </section>
    </div>
  );
};
