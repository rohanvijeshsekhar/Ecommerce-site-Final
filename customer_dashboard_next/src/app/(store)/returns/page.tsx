'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RotateCcw, Package, ChevronRight, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { returnsService, ReturnRequestDetail } from '@/services/returnsService';

export default function CustomerReturnsPage() {
  const router = useRouter();
  const [returns, setReturns] = useState<ReturnRequestDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await returnsService.getCustomerReturns();
      if (res.success && res.data) {
        setReturns(res.data);
      } else {
        setError(res.message || 'Failed to fetch returns.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load return requests.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
      case 'under_review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'approved':
      case 'pickup_scheduled':
      case 'item_received':
      case 'qc_passed':
      case 'refund_processing':
      case 'replacement_processing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'refunded':
      case 'replacement_delivered':
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rejected':
      case 'cancelled':
      case 'qc_failed':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="w-full bg-[#f4f7f7] min-h-screen pt-[112px] lg:pt-[160px] pb-16 font-sans">
      <div className="max-w-4xl mx-auto px-4 md:px-6">

        {/* Page Header */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#006670] uppercase tracking-wider mb-1">
              <RotateCcw className="w-4 h-4" />
              <span>Customer Care</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Returns & Replacements</h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">Track return request progress, pickup status & refund records.</p>
          </div>
          <Link
            href="/profile"
            className="self-start md:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            Back to Orders
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm text-center">
            <div className="w-8 h-8 border-4 border-[#006670] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400 mt-4">Loading return history...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-700">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && returns.length === 0 && (
          <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Return Requests Found</h3>
            <p className="text-xs font-semibold text-slate-500 mt-1">You have not submitted any return or replacement requests yet.</p>
            <Link
              href="/profile"
              className="inline-block mt-4 px-5 py-2.5 bg-[#006670] hover:bg-[#004d55] text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              View Delivered Orders
            </Link>
          </div>
        )}

        {/* Return Requests List */}
        {!loading && !error && returns.length > 0 && (
          <div className="space-y-4">
            {returns.map((ret) => (
              <div
                key={ret.id}
                onClick={() => router.push(`/returns/${ret.id}`)}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-lg border ${getStatusBadge(ret.status)}`}>
                      {ret.status_display || ret.status}
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {ret.request_type === 'return_refund' ? 'Refund Request' : 'Replacement Request'}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-slate-800">
                    Return #{ret.id.substring(0, 8)}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs font-semibold text-slate-500">
                    <span>Order #{ret.order_number || ret.order.substring(0, 8)}</span>
                    <span>•</span>
                    <span className="capitalize">Reason: {ret.reason_display || ret.reason}</span>
                    <span>•</span>
                    <span>Requested: {new Date(ret.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  {ret.total_refund_amount > 0 && (
                    <div className="text-right">
                      <span className="block text-[10px] font-extrabold text-slate-400 uppercase">Refund Value</span>
                      <span className="text-sm font-black text-[#006670]">₹{Number(ret.total_refund_amount).toLocaleString()}</span>
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
