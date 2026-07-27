import React from 'react';
import { UserPlus, RefreshCw, Award, ShoppingCart } from 'lucide-react';
import type { CustomerAnalyticsData } from '../../services/reportsService';

interface CustomerAnalyticsGridProps {
  data?: CustomerAnalyticsData;
}

export const CustomerAnalyticsGrid: React.FC<CustomerAnalyticsGridProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-teal-50/40 via-sky-50/30 to-purple-50/40 backdrop-blur-2xl border border-slate-200/80 rounded-3xl p-6 shadow-[0_10px_35px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.05)] transition-all duration-300">
      {/* Soft Glass Ambient Sheen Overlay */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-md pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-teal-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="pb-4 border-b border-slate-200/60">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Customer Analytics &amp; Lifetime Value</h3>
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-800 rounded-full border border-emerald-500/25 backdrop-blur-xs">
              Retention &amp; LTV
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            New buyer acquisition, returning client ratio, and customer lifetime value metrics.
          </p>
        </div>

        {/* Inner Grid Cards — Glassy Pastel Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {/* Card 1: Acquisition Split — Light Sky Glass */}
          <div className="p-5 rounded-2xl bg-sky-50/80 backdrop-blur-md border border-sky-200/70 shadow-xs hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-6">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-500">Acquisition</span>
              <div className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center shadow-md shadow-sky-500/30 shrink-0">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-3xl font-black text-sky-950">
              {data.new_customers}
              <span className="text-sm font-bold text-sky-600 ml-1.5">new buyers</span>
            </div>
            <div className="text-[11px] text-sky-600 mt-2 font-semibold">
              {data.returning_customers} returning customers in catalog
            </div>
          </div>

          {/* Card 2: Repeat Purchase Rate — Light Mint/Emerald Glass */}
          <div className="p-5 rounded-2xl bg-emerald-50/80 backdrop-blur-md border border-emerald-200/70 shadow-xs hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-6">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">Repeat Rate</span>
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30 shrink-0">
                <RefreshCw className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-950">
              {data.repeat_purchase_rate}%
            </div>
            <div className="text-[11px] text-emerald-600 mt-2 font-semibold">
              Customers with &gt; 1 completed order
            </div>
          </div>

          {/* Card 3: Customer Lifetime Value — Light Teal Glass */}
          <div className="p-5 rounded-2xl bg-teal-50/80 backdrop-blur-md border border-teal-200/70 shadow-xs hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-6">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-600">Lifetime Value</span>
              <div className="w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center shadow-md shadow-teal-500/30 shrink-0">
                <Award className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-black text-teal-950">
              ₹{data.customer_ltv.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-teal-600 mt-2 font-semibold">
              Average revenue per registered user
            </div>
          </div>

          {/* Card 4: Average Orders / Buyer — Light Purple Glass */}
          <div className="p-5 rounded-2xl bg-purple-50/80 backdrop-blur-md border border-purple-200/70 shadow-xs hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-6">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-500">Order Frequency</span>
              <div className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center shadow-md shadow-purple-500/30 shrink-0">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-3xl font-black text-purple-950">
              {data.avg_orders_per_customer}
              <span className="text-sm font-bold text-purple-500 ml-1.5">orders</span>
            </div>
            <div className="text-[11px] text-purple-500 mt-2 font-semibold">
              Order frequency ratio per client
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
