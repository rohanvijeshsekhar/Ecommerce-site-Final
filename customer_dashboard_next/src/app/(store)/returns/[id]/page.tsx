'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RotateCcw,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileText,
  DollarSign,
  ChevronRight,
} from 'lucide-react';
import { returnsService, ReturnRequestDetail } from '@/services/returnsService';

export default function CustomerReturnDetailPage() {
  const router = useRouter();
  const params = useParams();
  const returnId = params?.id as string;

  const [returnReq, setReturnReq] = useState<ReturnRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchDetail = useCallback(async () => {
    if (!returnId) return;
    setLoading(true);
    setError('');
    try {
      const res = await returnsService.getCustomerReturnDetail(returnId);
      if (res.success && res.data) {
        setReturnReq(res.data);
      } else {
        setError(res.message || 'Return request not found.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load return details.');
    } finally {
      setLoading(false);
    }
  }, [returnId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this return request?')) return;
    setCancelling(true);
    setMessage('');
    try {
      const res = await returnsService.cancelReturnRequest(returnId);
      if (res.success && res.data) {
        setReturnReq(res.data);
        setMessage('Return request cancelled successfully.');
      } else {
        setError(res.message || 'Failed to cancel return request.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Cancellation blocked.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-[#f4f7f7] min-h-screen pt-[112px] lg:pt-[180px] pb-16 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#006670] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 mt-4">Loading return details...</p>
      </div>
    );
  }

  if (error || !returnReq) {
    return (
      <div className="w-full bg-[#f4f7f7] min-h-screen pt-[112px] lg:pt-[180px] pb-16 font-sans">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
            <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-800">{error || 'Return Record Not Found'}</h2>
            <Link
              href="/returns"
              className="inline-block mt-4 px-4 py-2 bg-[#006670] text-white text-xs font-bold rounded-xl"
            >
              Back to Returns
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCancellable = ['requested', 'under_review'].includes(returnReq.status);

  return (
    <div className="w-full bg-[#f4f7f7] min-h-screen pt-[112px] lg:pt-[180px] pb-16 font-sans">
      <div className="max-w-4xl mx-auto px-4 md:px-6">

        {/* Back navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/returns"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-[#006670] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Returns
          </Link>

          {isCancellable && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Return Request'}
            </button>
          )}
        </div>

        {message && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl mb-6 text-xs font-bold">
            {message}
          </div>
        )}

        {/* Main Status Header Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Return Reference #{returnReq.id.substring(0, 8)}
              </span>
              <h1 className="text-xl font-black text-slate-800 capitalize">
                {returnReq.request_type === 'return_refund' ? 'Return & Refund' : 'Return & Replacement'}
              </h1>
            </div>

            <div className="text-right">
              <span className="px-3 py-1.5 text-xs font-extrabold uppercase rounded-xl border bg-slate-50 text-slate-700 border-slate-200">
                {returnReq.status_display || returnReq.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs font-semibold text-slate-600">
            <div>
              <span className="block text-[10px] font-extrabold text-slate-400 uppercase">Reason</span>
              <span className="font-bold text-slate-800 capitalize">{returnReq.reason_display || returnReq.reason}</span>
            </div>
            <div>
              <span className="block text-[10px] font-extrabold text-slate-400 uppercase">Original Order</span>
              <Link href={`/orders/${returnReq.order}`} className="font-bold text-[#006670] hover:underline">
                #{returnReq.order_number || returnReq.order.substring(0, 8)}
              </Link>
            </div>
            <div>
              <span className="block text-[10px] font-extrabold text-slate-400 uppercase">Date Submitted</span>
              <span className="font-bold text-slate-800">{new Date(returnReq.created_at).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="block text-[10px] font-extrabold text-slate-400 uppercase">Total Refund</span>
              <span className="font-extrabold text-[#006670]">₹{Number(returnReq.total_refund_amount).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Pickup Logistics Card */}
        {returnReq.shipment && (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Truck className="w-4 h-4 text-[#006670]" />
              Return Logistics & Pickup
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold text-slate-600">
              <div>
                <span className="block text-[10px] font-extrabold text-slate-400 uppercase">Courier</span>
                <span className="font-bold text-slate-800">{returnReq.shipment.courier_name}</span>
              </div>
              <div>
                <span className="block text-[10px] font-extrabold text-slate-400 uppercase">AWB / Tracking Number</span>
                <span className="font-bold text-slate-800">{returnReq.shipment.awb_number || 'Pending Assignment'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-extrabold text-slate-400 uppercase">Pickup Status</span>
                <span className="font-bold text-slate-800 capitalize">{returnReq.shipment.pickup_status}</span>
              </div>
            </div>
          </div>
        )}

        {/* Returned Items Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-[#006670]" />
            Returned Items
          </h3>

          <div className="divide-y divide-slate-100">
            {returnReq.items.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between text-xs font-semibold text-slate-700">
                <div>
                  <p className="font-bold text-slate-800">{item.product_name || 'Returned Product'}</p>
                  <p className="text-[11px] text-slate-400">SKU: {item.product_sku || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">{item.requested_quantity} Unit(s)</p>
                  <p className="text-[#006670] font-extrabold">₹{Number(item.unit_price * item.requested_quantity).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Timeline Card */}
        {returnReq.events && returnReq.events.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-[#006670]" />
              Return Progress Timeline
            </h3>

            <div className="space-y-4">
              {returnReq.events.map((evt) => (
                <div key={evt.id} className="flex gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-[#006670] mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 capitalize">{evt.to_status.replace('_', ' ')}</span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {new Date(evt.created_at).toLocaleString()}
                      </span>
                    </div>
                    {evt.notes && <p className="text-slate-500 mt-0.5">{evt.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
