import React, { useState } from 'react';
import {
  Package, AlertTriangle, CheckCircle, XCircle,
  ToggleLeft, ToggleRight, Lock, RefreshCw
} from 'lucide-react';
import type { ProductInventory } from '../types/admin';

// ─── Stock Status Config ──────────────────────────────────────────────────────
const STOCK_STATUS_CONFIG = {
  in_stock: { label: 'In Stock', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: CheckCircle },
  low_stock: { label: 'Low Stock', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100', icon: AlertTriangle },
  out_of_stock: { label: 'Out of Stock', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100', icon: XCircle },
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────
interface InventoryTabProps {
  isEdit: boolean;
  inventory: ProductInventory | null | undefined;
  onSave: (data: Partial<ProductInventory>) => Promise<void>;
}

// ─── InventoryTab ─────────────────────────────────────────────────────────────
const InventoryTab: React.FC<InventoryTabProps> = ({ isEdit, inventory, onSave }) => {
  const [form, setForm] = useState({
    current_stock: inventory?.current_stock ?? 0,
    low_stock_threshold: inventory?.low_stock_threshold ?? 5,
    allow_backorders: inventory?.allow_backorders ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync when parent inventory changes
  React.useEffect(() => {
    if (inventory) {
      setForm({
        current_stock: inventory.current_stock,
        low_stock_threshold: inventory.low_stock_threshold,
        allow_backorders: inventory.allow_backorders,
      });
    }
  }, [inventory]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
    setSaved(false);
  };

  // ── Live status calculation ──────────────────────────────────────────────────
  const reservedStock = inventory?.reserved_stock ?? 0;
  const availableStock = Math.max(0, form.current_stock - reservedStock);
  const stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' =
    availableStock <= 0
      ? 'out_of_stock'
      : availableStock <= form.low_stock_threshold
      ? 'low_stock'
      : 'in_stock';

  const statusCfg = STOCK_STATUS_CONFIG[stockStatus];
  const StatusIcon = statusCfg.icon;

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (form.current_stock < 0) e.current_stock = 'Stock cannot be negative.';
    if (form.low_stock_threshold < 0) e.low_stock_threshold = 'Threshold cannot be negative.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        current_stock: form.current_stock,
        low_stock_threshold: form.low_stock_threshold,
        allow_backorders: form.allow_backorders,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 focus:border-[#005B63] transition-colors bg-white";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";

  if (!isEdit) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
        <div className="w-12 h-12 rounded-full bg-[#005B63]/10 flex items-center justify-center text-[#005B63] mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-extrabold text-slate-800">Inventory is locked</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
          Please save the product general details first. Once the product is created, you can manage stock levels here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Live Stock Status Banner ─────────────────────────────────────────── */}
      <div className={`${statusCfg.bg} border ${statusCfg.border} rounded-2xl p-5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${statusCfg.bg} border ${statusCfg.border} flex items-center justify-center`}>
              <StatusIcon className={`w-5 h-5 ${statusCfg.color}`} />
            </div>
            <div>
              <p className={`text-xs font-black uppercase tracking-widest ${statusCfg.color}`}>Stock Status</p>
              <p className={`text-lg font-black ${statusCfg.color}`}>{statusCfg.label}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Available</p>
            <p className={`text-3xl font-black ${statusCfg.color}`}>{availableStock}</p>
            <p className="text-[10px] text-slate-400 font-semibold">units</p>
          </div>
        </div>
      </div>

      {/* ── Stock Levels ────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
          <Package className="w-3.5 h-3.5" /> Stock Levels
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Current Stock */}
          <div>
            <label className={labelClass}>Current Stock *</label>
            <input
              type="number" min={0} step={1}
              value={form.current_stock}
              onChange={e => set('current_stock', Math.max(0, parseInt(e.target.value) || 0))}
              className={`${fieldClass} ${errors.current_stock ? 'border-rose-300 ring-2 ring-rose-100' : ''}`}
            />
            {errors.current_stock && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.current_stock}</p>}
          </div>

          {/* Reserved Stock (read-only) */}
          <div>
            <label className={labelClass}>
              Reserved Stock
              <span className="ml-1 normal-case text-slate-400 font-normal text-[10px]">(managed by orders)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={reservedStock}
                readOnly
                className="w-full px-3 py-2 text-sm border border-slate-100 rounded-xl bg-slate-50 text-slate-400 cursor-not-allowed"
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Updated automatically when orders are placed</p>
          </div>

          {/* Available Stock (computed, read-only) */}
          <div>
            <label className={labelClass}>
              Available Stock
              <span className="ml-1 normal-case text-slate-400 font-normal text-[10px]">(auto-calculated)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={availableStock}
                readOnly
                className="w-full px-3 py-2 text-sm border border-slate-100 rounded-xl bg-slate-50 text-slate-500 font-bold cursor-not-allowed"
              />
              <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Current − Reserved = {form.current_stock} − {reservedStock} = {availableStock}</p>
          </div>
        </div>
      </div>

      {/* ── Threshold & Backorders ───────────────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Inventory Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Low Stock Threshold</label>
            <input
              type="number" min={0} step={1}
              value={form.low_stock_threshold}
              onChange={e => set('low_stock_threshold', Math.max(0, parseInt(e.target.value) || 0))}
              className={`${fieldClass} ${errors.low_stock_threshold ? 'border-rose-300 ring-2 ring-rose-100' : ''}`}
            />
            {errors.low_stock_threshold && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.low_stock_threshold}</p>}
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">
              Stock badge shows "Low Stock" when available units ≤ {form.low_stock_threshold}
            </p>
          </div>

          <div>
            <label className={labelClass}>Allow Backorders</label>
            <div
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer select-none hover:border-[#005B63]/30 transition-colors"
              onClick={() => set('allow_backorders', !form.allow_backorders)}
            >
              {form.allow_backorders ? (
                <ToggleRight className="w-7 h-7 text-[#005B63]" />
              ) : (
                <ToggleLeft className="w-7 h-7 text-slate-300" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {form.allow_backorders ? 'Backorders Allowed' : 'Backorders Disabled'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {form.allow_backorders
                    ? 'Customers can purchase even when out of stock. Orders will be fulfilled when restocked.'
                    : 'Product will be unavailable to purchase when out of stock.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Save Button ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-[#005B63] hover:bg-[#004a51] text-white rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</>
          ) : (
            'Save Inventory'
          )}
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold animate-fade-in">
            <CheckCircle className="w-4 h-4" /> Inventory saved successfully.
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryTab;
