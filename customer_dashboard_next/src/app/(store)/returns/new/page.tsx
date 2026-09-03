'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Package, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';
import { returnsService, ReturnEligibilityResponse } from '@/services/returnsService';

function CreateReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id') || '';

  const [eligibility, setEligibility] = useState<ReturnEligibilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [requestType, setRequestType] = useState<'return_refund' | 'return_replacement'>('return_refund');
  const [reason, setReason] = useState('damaged');
  const [customerNotes, setCustomerNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ [itemId: string]: number }>({});

  useEffect(() => {
    if (orderId) {
      checkEligibility();
    } else {
      setLoading(false);
      setError('No Order ID provided.');
    }
  }, [orderId]);

  const checkEligibility = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await returnsService.checkEligibility(orderId);
      if (res.success && res.data) {
        setEligibility(res.data);
        // Pre-select first eligible item quantity
        const initialSelections: { [itemId: string]: number } = {};
        res.data.items.forEach((item) => {
          if (item.is_eligible && item.max_returnable_qty > 0) {
            initialSelections[item.order_item_id] = 1;
          }
        });
        setSelectedItems(initialSelections);
      } else {
        setError(res.message || 'Order eligibility check failed.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Order is not eligible for return.');
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (itemId: string, qty: number, maxQty: number) => {
    if (qty <= 0) {
      const updated = { ...selectedItems };
      delete updated[itemId];
      setSelectedItems(updated);
    } else if (qty <= maxQty) {
      setSelectedItems({ ...selectedItems, [itemId]: qty });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const itemsPayload = Object.entries(selectedItems)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => ({ order_item_id: itemId, quantity: qty }));

    if (itemsPayload.length === 0) {
      setError('Please select at least one eligible item to return.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await returnsService.createReturnRequest({
        order_id: orderId,
        request_type: requestType,
        reason,
        customer_notes: customerNotes,
        items: itemsPayload,
      });

      if (res.success && res.data) {
        router.push(`/returns/${res.data.id}`);
      } else {
        setError(res.message || 'Failed to submit return request.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Server rejected return request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-[#f4f7f7] min-h-screen pt-[112px] lg:pt-[180px] pb-16 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#006670] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 mt-4">Evaluating return policy eligibility...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#f4f7f7] min-h-screen pt-[112px] lg:pt-[180px] pb-16 font-sans">
      <div className="max-w-3xl mx-auto px-4 md:px-6">

        {/* Back Link */}
        <Link
          href={orderId ? `/orders/${orderId}` : '/profile'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-[#006670] transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Order
        </Link>

        {/* Form Container */}
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-[#006670] uppercase tracking-wider mb-1">
            <RotateCcw className="w-4 h-4" />
            <span>Return Request Portal</span>
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Request Return or Replacement</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Select eligible items and reason under FAAZO 7-day policy.</p>

          {error && (
            <div className="mt-4 bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {eligibility && !eligibility.is_order_eligible && (
            <div className="mt-6 bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-2xl text-center">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold">Order Not Eligible for Return</h3>
              <p className="text-xs mt-1">The 7-day return window may have expired or the order is not yet delivered.</p>
            </div>
          )}

          {eligibility && eligibility.is_order_eligible && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-6">

              {/* Request Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Request Resolution Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRequestType('return_refund')}
                    className={`p-4 rounded-xl border text-left font-bold text-xs transition cursor-pointer ${
                      requestType === 'return_refund'
                        ? 'border-[#006670] bg-[#006670]/5 text-[#006670]'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Return & Refund
                    <span className="block text-[11px] font-normal text-slate-500 mt-0.5">Refund to original payment source</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRequestType('return_replacement')}
                    className={`p-4 rounded-xl border text-left font-bold text-xs transition cursor-pointer ${
                      requestType === 'return_replacement'
                        ? 'border-[#006670] bg-[#006670]/5 text-[#006670]'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Replacement Order
                    <span className="block text-[11px] font-normal text-slate-500 mt-0.5">Ship fresh product unit</span>
                  </button>
                </div>
              </div>

              {/* Return Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Reason for Return
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670]"
                >
                  <option value="damaged">Item Damaged in Transit</option>
                  <option value="defective">Defective / Manufacturing Fault</option>
                  <option value="wrong_item">Incorrect Item Shipped</option>
                  <option value="missing_parts">Missing Components or Accessories</option>
                  <option value="expired">Expired / Short Expiry Product</option>
                  <option value="not_as_described">Not as Described on Site</option>
                </select>
              </div>

              {/* Items Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Order Items to Return
                </label>
                <div className="space-y-3">
                  {eligibility.items.map((item) => (
                    <div
                      key={item.order_item_id}
                      className={`p-4 rounded-xl border flex items-center justify-between text-xs transition ${
                        item.is_eligible ? 'border-slate-200 bg-slate-50' : 'border-slate-100 bg-slate-100 opacity-60'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-800">{item.product_name}</p>
                        <p className="text-[11px] text-slate-500">SKU: {item.product_sku} • Price: ₹{Number(item.price).toLocaleString()}</p>
                        {!item.is_eligible && (
                          <span className="inline-block mt-1 text-[10px] font-extrabold text-rose-600 uppercase">
                            {item.reason}
                          </span>
                        )}
                      </div>

                      {item.is_eligible && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500">Qty:</span>
                          <input
                            type="number"
                            min="0"
                            max={item.max_returnable_qty}
                            value={selectedItems[item.order_item_id] || 0}
                            onChange={(e) => handleQtyChange(item.order_item_id, parseInt(e.target.value) || 0, item.max_returnable_qty)}
                            className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-center text-xs"
                          />
                          <span className="text-[10px] text-slate-400 font-semibold">/ max {item.max_returnable_qty}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Additional Notes / Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Describe damage, defect, or missing accessories in detail..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#006670]"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#006670] hover:bg-[#004d55] text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Submitting Return Request...' : 'Submit Return Request'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

export default function CreateReturnPage() {
  return (
    <Suspense fallback={
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#006670] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CreateReturnContent />
    </Suspense>
  );
}
