import React, { useState } from 'react';
import {
  IndianRupee, Tag, Percent, Calendar, TrendingDown,
  CheckCircle, AlertCircle, Lock
} from 'lucide-react';
import type { ProductPricing } from '../types/admin';

// ─── GST Slabs ────────────────────────────────────────────────────────────────
const GST_SLABS = ['0', '5', '12', '18', '28'];

// ─── Currency Helper ──────────────────────────────────────────────────────────
const fmt = (v: string | number | null | undefined) => {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface PricingTabProps {
  isEdit: boolean;
  pricing: ProductPricing | null | undefined;
  onSave: (data: Partial<ProductPricing>) => Promise<void>;
}

// ─── PricingTab ───────────────────────────────────────────────────────────────
const PricingTab: React.FC<PricingTabProps> = ({ isEdit, pricing, onSave }) => {
  const [form, setForm] = useState<Partial<ProductPricing>>(() => ({
    mrp: pricing?.mrp ?? '',
    selling_price: pricing?.selling_price ?? '',
    offer_price: pricing?.offer_price ?? '',
    dealer_price: pricing?.dealer_price ?? '',
    gst_percentage: pricing?.gst_percentage ?? '18',
    offer_start_date: pricing?.offer_start_date ?? '',
    offer_end_date: pricing?.offer_end_date ?? '',
  }));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync when parent pricing changes (after load)
  React.useEffect(() => {
    if (pricing) {
      setForm({
        mrp: pricing.mrp ?? '',
        selling_price: pricing.selling_price ?? '',
        offer_price: pricing.offer_price ?? '',
        dealer_price: pricing.dealer_price ?? '',
        gst_percentage: pricing.gst_percentage ?? '18',
        offer_start_date: pricing.offer_start_date ?? '',
        offer_end_date: pricing.offer_end_date ?? '',
      });
    }
  }, [pricing]);

  const set = (k: keyof typeof form, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
    setSaved(false);
  };

  // ── Live preview calculations ────────────────────────────────────────────────
  const mrpNum         = parseFloat(form.mrp as string) || 0;
  const sellNum        = parseFloat(form.selling_price as string) || 0;
  const offerNum       = parseFloat(form.offer_price as string) || 0;
  const dealerNum      = parseFloat(form.dealer_price as string) || 0;

  const today = new Date().toISOString().split('T')[0];
  const offerStart = form.offer_start_date || '';
  const offerEnd   = form.offer_end_date || '';
  const offerActive = offerNum > 0
    && (!offerStart || today >= offerStart)
    && (!offerEnd   || today <= offerEnd);

  const effectivePrice = offerActive && offerNum > 0 ? offerNum : sellNum;
  const discountPct = mrpNum > 0 && effectivePrice < mrpNum
    ? ((mrpNum - effectivePrice) / mrpNum * 100).toFixed(1)
    : null;
  const youSave = mrpNum > 0 && effectivePrice < mrpNum
    ? mrpNum - effectivePrice
    : null;

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!mrpNum || mrpNum <= 0) e.mrp = 'MRP must be greater than 0.';
    if (!sellNum || sellNum <= 0) e.selling_price = 'Selling price must be greater than 0.';
    if (sellNum > mrpNum && mrpNum > 0) e.selling_price = 'Selling price cannot exceed MRP.';
    if (offerNum > 0 && offerNum > sellNum) e.offer_price = 'Offer price cannot exceed selling price.';
    if (dealerNum > 0 && dealerNum > sellNum) e.dealer_price = 'Dealer price cannot exceed selling price.';
    if (offerStart && offerEnd && offerStart > offerEnd) e.offer_end_date = 'End date must be after start date.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: Partial<ProductPricing> = {
        mrp: form.mrp,
        selling_price: form.selling_price,
        offer_price: (form.offer_price as string)?.trim() || null,
        dealer_price: (form.dealer_price as string)?.trim() || null,
        gst_percentage: form.gst_percentage,
        offer_start_date: (form.offer_start_date as string)?.trim() || null,
        offer_end_date: (form.offer_end_date as string)?.trim() || null,
      };
      await onSave(payload);
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
        <h3 className="text-sm font-extrabold text-slate-800">Pricing is locked</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
          Please save the product general details first. Once the product is created, you can configure pricing here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Live Price Preview ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#005B63]/5 to-[#F58220]/5 border border-[#005B63]/10 rounded-2xl p-5">
        <h3 className="text-xs font-black uppercase tracking-widest text-[#005B63] mb-3 flex items-center gap-2">
          <TrendingDown className="w-4 h-4" /> Live Price Preview
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">MRP</p>
            <p className="text-lg font-black text-slate-700">{mrpNum > 0 ? fmt(mrpNum) : '—'}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Effective Price</p>
            <p className="text-lg font-black text-[#005B63]">{effectivePrice > 0 ? fmt(effectivePrice) : '—'}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Discount</p>
            <p className="text-lg font-black text-emerald-600">{discountPct ? `${discountPct}% OFF` : '—'}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">You Save</p>
            <p className="text-lg font-black text-[#F58220]">{youSave ? fmt(youSave) : '—'}</p>
          </div>
        </div>
        {offerActive && offerNum > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-emerald-700">Offer is currently active</span>
          </div>
        )}
      </div>

      {/* ── Core Prices ──────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
          <IndianRupee className="w-3.5 h-3.5" /> Core Prices
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>MRP — Maximum Retail Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₹</span>
              <input
                type="number" min={0} step={0.01}
                value={form.mrp as string}
                onChange={e => set('mrp', e.target.value)}
                className={`${fieldClass} pl-7 ${errors.mrp ? 'border-rose-300 ring-2 ring-rose-100' : ''}`}
                placeholder="0.00"
              />
            </div>
            {errors.mrp && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.mrp}</p>}
          </div>
          <div>
            <label className={labelClass}>Selling Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₹</span>
              <input
                type="number" min={0} step={0.01}
                value={form.selling_price as string}
                onChange={e => set('selling_price', e.target.value)}
                className={`${fieldClass} pl-7 ${errors.selling_price ? 'border-rose-300 ring-2 ring-rose-100' : ''}`}
                placeholder="0.00"
              />
            </div>
            {errors.selling_price && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.selling_price}</p>}
          </div>
        </div>
      </div>

      {/* ── Optional Prices ───────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
          <Tag className="w-3.5 h-3.5" /> Optional Prices
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Offer Price <span className="normal-case text-slate-400 font-normal">(optional)</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₹</span>
              <input
                type="number" min={0} step={0.01}
                value={form.offer_price as string}
                onChange={e => set('offer_price', e.target.value)}
                className={`${fieldClass} pl-7 ${errors.offer_price ? 'border-rose-300 ring-2 ring-rose-100' : ''}`}
                placeholder="Leave blank for no offer"
              />
            </div>
            {errors.offer_price && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.offer_price}</p>}
          </div>
          <div>
            <label className={labelClass}>Dealer Price <span className="normal-case text-slate-400 font-normal">(dealers only)</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₹</span>
              <input
                type="number" min={0} step={0.01}
                value={form.dealer_price as string}
                onChange={e => set('dealer_price', e.target.value)}
                className={`${fieldClass} pl-7 ${errors.dealer_price ? 'border-rose-300 ring-2 ring-rose-100' : ''}`}
                placeholder="Leave blank to hide"
              />
            </div>
            {errors.dealer_price && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.dealer_price}</p>}
          </div>
          <div>
            <label className={labelClass}>GST Percentage</label>
            <div className="relative">
              <select
                value={form.gst_percentage as string}
                onChange={e => set('gst_percentage', e.target.value)}
                className={fieldClass}
              >
                {GST_SLABS.map(s => (
                  <option key={s} value={s}>{s}%</option>
                ))}
              </select>
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Offer Window ─────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" /> Offer Window <span className="normal-case text-slate-400 font-normal tracking-normal text-[10px]">(leave blank = always active if offer price is set)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Offer Start Date</label>
            <input
              type="date"
              value={form.offer_start_date as string}
              onChange={e => set('offer_start_date', e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Offer End Date</label>
            <input
              type="date"
              value={form.offer_end_date as string}
              onChange={e => set('offer_end_date', e.target.value)}
              className={`${fieldClass} ${errors.offer_end_date ? 'border-rose-300 ring-2 ring-rose-100' : ''}`}
            />
            {errors.offer_end_date && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.offer_end_date}</p>}
          </div>
        </div>
        {form.offer_price && !offerActive && (
          <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-amber-700">
              Offer price is set but the offer is not currently active based on the dates.
            </span>
          </div>
        )}
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
            'Save Pricing'
          )}
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold animate-fade-in">
            <CheckCircle className="w-4 h-4" /> Pricing saved successfully.
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingTab;
