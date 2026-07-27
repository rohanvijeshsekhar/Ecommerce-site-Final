import React from 'react';
import { Package, AlertTriangle, CheckCircle2, XCircle, ArrowRightLeft } from 'lucide-react';
import type { InventoryIntelligenceData } from '../../services/reportsService';

interface InventoryIntelligenceWidgetProps {
  data?: InventoryIntelligenceData;
}

export const InventoryIntelligenceWidget: React.FC<InventoryIntelligenceWidgetProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Inventory Valuation & Health</h3>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-800 rounded-full border border-amber-500/20">
              Stock Valuation
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Total active stock asset value and warehouse operational metrics.
          </p>
        </div>

        {/* Total Asset Valuation Banner */}
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[#005F63]/10 via-teal-500/5 to-white border border-[#005F63]/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Warehouse Stock Asset Value</div>
            <div className="text-2xl font-black text-[#005F63] mt-0.5">
              ₹{data.total_inventory_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-emerald-700 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 inline-block">
              {data.health_score_percentage}% Healthy Stock Score
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{data.total_skus} Active Catalog SKUs</div>
          </div>
        </div>

        {/* Stock Breakdown Pills */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-700 font-bold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
            </div>
            <div className="text-xl font-black text-emerald-800 mt-1">{data.healthy_stock_count}</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-800 font-bold text-xs">
              <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
            </div>
            <div className="text-xl font-black text-amber-900 mt-1">{data.low_stock_count}</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
            <div className="flex items-center justify-center gap-1 text-rose-700 font-bold text-xs">
              <XCircle className="w-3.5 h-3.5" /> Out of Stock
            </div>
            <div className="text-xl font-black text-rose-800 mt-1">{data.out_of_stock_count}</div>
          </div>
        </div>

        {/* Recent Inventory Movements */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
            Recent Stock Movements
          </div>
          <div className="space-y-2">
            {data.recent_movements.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white border border-slate-200 text-slate-700">
                    {item.type}
                  </span>
                  <span className="font-semibold text-slate-900 truncate max-w-[180px]">{item.product}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#005F63]">{item.quantity}</span>
                  <span className="text-[10px] text-slate-400">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
