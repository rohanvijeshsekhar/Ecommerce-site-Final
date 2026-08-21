'use client';

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Truck,
  ShieldAlert,
  DollarSign,
  Package,
  Clock,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { returnsService, ReturnRequestDetail } from '@/services/returnsService';

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequestDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequestDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // QC Form State
  const [qcResult, setQcResult] = useState<'PASS' | 'FAIL'>('PASS');
  const [isRestockable, setIsRestockable] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchAdminReturns();
  }, [statusFilter]);

  const fetchAdminReturns = async () => {
    setLoading(true);
    try {
      const res = await returnsService.getAdminReturns({ status: statusFilter || undefined });
      if (res.success && res.data) {
        setReturns(res.data);
      }
    } catch (err) {
      console.error('Failed to load admin returns:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReturn = async (id: string) => {
    try {
      const res = await returnsService.getAdminReturnDetail(id);
      if (res.success && res.data) {
        setSelectedReturn(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const executeAction = async (actionFn: () => Promise<any>) => {
    setActionLoading(true);
    setActionMessage('');
    try {
      const res = await actionFn();
      if (res.success && res.data) {
        setSelectedReturn(res.data);
        setActionMessage('Operation completed successfully.');
        fetchAdminReturns();
      } else {
        setActionMessage(res.message || 'Operation failed.');
      }
    } catch (err: any) {
      setActionMessage(err?.response?.data?.message || 'Action error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans text-slate-800">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#006670] uppercase tracking-wider mb-1">
            <RotateCcw className="w-4 h-4" />
            <span>Admin Operations</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Returns, Refunds & QC Management</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Review requests, schedule pickups, inspect warehouse QC, execute refunds & replacements.</p>
        </div>

        <button
          onClick={fetchAdminReturns}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh List
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
        >
          <option value="">All Statuses</option>
          <option value="requested">Requested</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="pickup_scheduled">Pickup Scheduled</option>
          <option value="item_received">Item Received</option>
          <option value="qc_passed">QC Passed</option>
          <option value="qc_failed">QC Failed</option>
          <option value="refund_pending">Refund Pending</option>
          <option value="refunded">Refunded</option>
          <option value="replacement_processing">Replacement Processing</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Returns Table (8 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Return Requests ({returns.length})</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">Loading returns...</div>
          ) : returns.length === 0 ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">No return requests found.</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
              {returns.map((ret) => (
                <div
                  key={ret.id}
                  onClick={() => handleSelectReturn(ret.id)}
                  className={`p-4 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between text-xs ${
                    selectedReturn?.id === ret.id ? 'bg-[#006670]/5 border-l-4 border-[#006670]' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-extrabold text-slate-900">Return #{ret.id.substring(0, 8)}</span>
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-slate-100 text-slate-700">
                        {ret.status_display || ret.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Customer: {ret.customer_name || ret.customer_email || 'Dr. Customer'} • Reason: {ret.reason}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-[#006670] block">₹{Number(ret.total_refund_amount).toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400">{new Date(ret.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Return Details & Actions (5 Cols) */}
        <div className="lg:col-span-5">
          {selectedReturn ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Return Details</h3>
                  <span className="text-[11px] font-bold text-slate-400">ID: {selectedReturn.id}</span>
                </div>
                <span className="px-2.5 py-1 text-xs font-black uppercase rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedReturn.status}
                </span>
              </div>

              {actionMessage && (
                <div className="p-3 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold border border-slate-200">
                  {actionMessage}
                </div>
              )}

              {/* Action Buttons based on status */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Available Admin Actions</h4>

                {selectedReturn.status === 'requested' && (
                  <div className="flex gap-2">
                    <button
                      disabled={actionLoading}
                      onClick={() => executeAction(() => returnsService.adminApprove(selectedReturn.id, adminNotes))}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                    >
                      Approve Request
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => executeAction(() => returnsService.adminReject(selectedReturn.id, rejectionReason || 'Policy non-compliant', adminNotes))}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition"
                    >
                      Reject Request
                    </button>
                  </div>
                )}

                {selectedReturn.status === 'approved' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => executeAction(() => returnsService.adminSchedulePickup(selectedReturn.id))}
                    className="w-full py-2 bg-[#006670] hover:bg-[#004d55] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                  >
                    <Truck className="w-4 h-4" />
                    Schedule Shiprocket Return Pickup
                  </button>
                )}

                {selectedReturn.status === 'pickup_scheduled' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => executeAction(() => returnsService.adminReceiveItem(selectedReturn.id))}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                  >
                    <Package className="w-4 h-4" />
                    Mark Warehouse Item Received
                  </button>
                )}

                {['item_received', 'qc_pending'].includes(selectedReturn.status) && (
                  <div className="space-y-3 border-t border-slate-200 pt-3">
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="qc"
                          checked={qcResult === 'PASS'}
                          onChange={() => setQcResult('PASS')}
                        />
                        QC PASS
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="qc"
                          checked={qcResult === 'FAIL'}
                          onChange={() => setQcResult('FAIL')}
                        />
                        QC FAIL
                      </label>
                    </div>

                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRestockable}
                        onChange={(e) => setIsRestockable(e.target.checked)}
                      />
                      Restock into Available Inventory
                    </label>

                    <button
                      disabled={actionLoading}
                      onClick={() => executeAction(() => returnsService.adminSubmitQC(selectedReturn.id, { qc_result: qcResult, is_restockable: isRestockable }))}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition"
                    >
                      Submit Warehouse QC Result
                    </button>
                  </div>
                )}

                {selectedReturn.status === 'qc_passed' && selectedReturn.request_type === 'return_refund' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => executeAction(() => returnsService.adminApproveRefund(selectedReturn.id))}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    Execute Razorpay Refund
                  </button>
                )}

                {selectedReturn.status === 'qc_passed' && selectedReturn.request_type === 'return_replacement' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => executeAction(() => returnsService.adminApproveReplacement(selectedReturn.id))}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                  >
                    <Package className="w-4 h-4" />
                    Generate Replacement Order
                  </button>
                )}
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Claimed Line Items</h4>
                <div className="divide-y divide-slate-100 text-xs">
                  {selectedReturn.items.map((item) => (
                    <div key={item.id} className="py-2 flex justify-between">
                      <div>
                        <span className="font-bold text-slate-800">{item.product_name || 'Product'}</span>
                        <span className="block text-[10px] text-slate-400">Qty: {item.requested_quantity}</span>
                      </div>
                      <span className="font-bold text-[#006670]">₹{Number(item.unit_price * item.requested_quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-xs font-bold text-slate-400">
              Select a return request from the list to view audit records & perform admin actions.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
