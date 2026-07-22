import React from 'react';
import { UserPlus, RefreshCw, Award, ShoppingCart } from 'lucide-react';
import type { CustomerAnalyticsData } from '../../services/reportsService';

interface CustomerAnalyticsGridProps {
  data?: CustomerAnalyticsData;
}

export const CustomerAnalyticsGrid: React.FC<CustomerAnalyticsGridProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-xs">
      {/* Header */}
      <div className="pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-900">Customer Analytics &amp; Lifetime Value</h3>
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 rounded-full border border-emerald-500/20">
            Retention &amp; LTV
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          New buyer acquisition, returning client ratio, and customer lifetime value metrics.
        </p>
      </div>

      {/* Grid Cards — Reference Style with Pastel Colors & Circle Icons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
        {/* Card 1: Acquisition Split — Light Sky */}
        <div className="p-5 rounded-2xl bg-sky-50 border border-sky-100 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-start justify-between mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-sky-500">Acquisition</span>
            <div className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center shadow-md shadow-sky-500/30 shrink-0">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-3xl font-black text-sky-900">
            {data.new_customers}
            <span className="text-sm font-semibold text-sky-500 ml-1.5">new buyers</span>
          </div>
          <div className="text-[11px] text-sky-500 mt-2 font-medium">
            {data.returning_customers} returning customers in catalog
          </div>
        </div>

        {/* Card 2: Repeat Purchase Rate — Light Mint/Emerald */}
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-start justify-between mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Repeat Rate</span>
            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30 shrink-0">
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-900">
            {data.repeat_purchase_rate}%
          </div>
          <div className="text-[11px] text-emerald-500 mt-2 font-medium">
            Customers with &gt; 1 completed order
          </div>
        </div>

        {/* Card 3: Customer Lifetime Value — Light Teal */}
        <div className="p-5 rounded-2xl bg-teal-50 border border-teal-100 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-start justify-between mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-teal-500">Lifetime Value</span>
            <div className="w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center shadow-md shadow-teal-500/30 shrink-0">
              <Award className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-900">
            ₹{data.customer_ltv.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-teal-500 mt-2 font-medium">
            Average revenue per registered user
          </div>
        </div>

        {/* Card 4: Average Orders / Buyer — Light Purple */}
        <div className="p-5 rounded-2xl bg-purple-50 border border-purple-100 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-start justify-between mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Order Frequency</span>
            <div className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center shadow-md shadow-purple-500/30 shrink-0">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-3xl font-black text-purple-900">
            {data.avg_orders_per_customer}
            <span className="text-sm font-semibold text-purple-400 ml-1.5">orders</span>
          </div>
          <div className="text-[11px] text-purple-400 mt-2 font-medium">
            Order frequency ratio per client
          </div>
        </div>
      </div>
    </div>
  );
};
