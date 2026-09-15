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
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  FileText,
  User,
  MapPin,
  Calendar,
  Check,
  X,
  Layers,
} from 'lucide-react';
import { useBreadcrumbSync } from '@/admin/contexts/BreadcrumbContext';
import {
  returnsService,
  ReturnRequestDetail,
  ReturnCounts,
} from '@/services/returnsService';

export default function AdminReturnsPage() {
  useBreadcrumbSync([
    { label: 'Operations', path: '/admin/orders' },
    { label: 'Returns / Replacement', path: '/admin/returns' },
  ]);

  const [returns, setReturns] = useState<ReturnRequestDetail[]>([]);
  const [counts, setCounts] = useState<ReturnCounts>({
    all: 0,
    return_requests: 0,
    replacement_requests: 0,
    pending_review: 0,
    approved: 0,
    pickup_scheduled: 0,
    picked_up: 0,
    in_transit: 0,
    delivered: 0,
    verification: 0,
    refund_pending: 0,
    completed: 0,
    rejected: 0,
    exceptions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequestDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // Forms
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'PASS' | 'FAIL'>('PASS');
  const [verifierName, setVerifierName] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [failureReason, setFailureReason] = useState('');

  useEffect(() => {
    fetchAdminReturns();
  }, [statusFilter]);

  const fetchAdminReturns = async () => {
    setLoading(true);
    try {
      const res = await returnsService.getAdminReturns({
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      if (res.success && res.data) {
        if ('results' in res.data) {
          setReturns(res.data.results);
          if (res.data.counts) {
            setCounts(res.data.counts);
          }
        } else if (Array.isArray(res.data)) {
          setReturns(res.data);
        }
      }
    } catch (err) {
      console.error('Failed to load admin returns:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAdminReturns();
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

  const executeAction = async (actionFn: () => Promise<any>, successMsg: string) => {
    setActionLoading(true);
    setActionMessage('');
    try {
      const res = await actionFn();
      if (res.success) {
        setActionMessage(successMsg);
        if (selectedReturn) {
          handleSelectReturn(selectedReturn.id);
        }
        fetchAdminReturns();
      } else {
        setActionMessage(res.message || 'Action failed.');
      }
    } catch (err: any) {
      setActionMessage(err?.response?.data?.message || err?.message || 'Error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (['completed', 'refunded', 'delivered', 'verification_passed'].includes(s)) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (['approved', 'pickup_scheduled', 'picked_up', 'return_in_transit', 'replacement_approved'].includes(s)) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (['requested', 'under_review', 'verification_pending', 'refund_pending', 'qc_pending'].includes(s)) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (['rejected', 'cancelled', 'pickup_failed', 'verification_failed', 'return_lost'].includes(s)) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const formatStatus = (status: string) => {
    return (status || '').replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto font-sans text-slate-800">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#006670] uppercase tracking-wider mb-1">
            <RotateCcw className="w-4 h-4" />
            <span>Operations & Logistics</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Returns & Replacements</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Shiprocket Reverse Logistics, Doorstep Verification, Refunds & Replacement Orders.
          </p>
        </div>

        <button
          onClick={fetchAdminReturns}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Live</span>
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <div
          onClick={() => setStatusFilter('')}
          className={`p-3 rounded-2xl border transition cursor-pointer ${statusFilter === '' ? 'bg-[#006670]/10 border-[#006670]' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">All</span>
          <p className="text-lg font-black text-slate-900 mt-0.5">{counts.all}</p>
        </div>

        <div
          onClick={() => setStatusFilter('pending_review')}
          className={`p-3 rounded-2xl border transition cursor-pointer ${statusFilter === 'pending_review' ? 'bg-amber-100/50 border-amber-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Pending Review</span>
          <p className="text-lg font-black text-amber-700 mt-0.5">{counts.pending_review}</p>
        </div>

        <div
          onClick={() => setStatusFilter('pickup_scheduled')}
          className={`p-3 rounded-2xl border transition cursor-pointer ${statusFilter === 'pickup_scheduled' ? 'bg-blue-100/50 border-blue-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Pickup Scheduled</span>
          <p className="text-lg font-black text-blue-700 mt-0.5">{counts.pickup_scheduled}</p>
        </div>

        <div
          onClick={() => setStatusFilter('in_transit')}
          className={`p-3 rounded-2xl border transition cursor-pointer ${statusFilter === 'in_transit' ? 'bg-indigo-100/50 border-indigo-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">In Transit</span>
          <p className="text-lg font-black text-indigo-700 mt-0.5">{counts.in_transit}</p>
        </div>

        <div
          onClick={() => setStatusFilter('verification')}
          className={`p-3 rounded-2xl border transition cursor-pointer ${statusFilter === 'verification' ? 'bg-purple-100/50 border-purple-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Verification</span>
          <p className="text-lg font-black text-purple-700 mt-0.5">{counts.verification}</p>
        </div>

        <div
          onClick={() => setStatusFilter('refund_pending')}
          className={`p-3 rounded-2xl border transition cursor-pointer ${statusFilter === 'refund_pending' ? 'bg-teal-100/50 border-teal-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Refund Pending</span>
          <p className="text-lg font-black text-teal-700 mt-0.5">{counts.refund_pending}</p>
        </div>
      </div>

      {/* Search & Filter Tabs */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Order #, Customer, AWB, Return ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#006670]"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${statusFilter === '' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('requested')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${statusFilter === 'requested' ? 'bg-[#006670] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Requested
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${statusFilter === 'approved' ? 'bg-[#006670] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter('pickup_scheduled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${statusFilter === 'pickup_scheduled' ? 'bg-[#006670] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Pickup Scheduled
          </button>
          <button
            onClick={() => setStatusFilter('return_in_transit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${statusFilter === 'return_in_transit' ? 'bg-[#006670] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            In Transit
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${statusFilter === 'completed' ? 'bg-[#006670] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="p-3.5 pl-5">Return ID</th>
                <th className="p-3.5">Order #</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Product & Qty</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">FAAZO Status</th>
                <th className="p-3.5">Shiprocket AWB</th>
                <th className="p-3.5">Verification</th>
                <th className="p-3.5 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#006670]" />
                    <span>Loading returns and reverse shipments...</span>
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No return or replacement requests found.
                  </td>
                </tr>
              ) : (
                returns.map((ret) => {
                  const firstItem = ret.items[0];
                  return (
                    <tr
                      key={ret.id}
                      className="hover:bg-slate-50/70 transition cursor-pointer"
                      onClick={() => handleSelectReturn(ret.id)}
                    >
                      <td className="p-3.5 pl-5 font-mono font-bold text-[#006670]">
                        {ret.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="p-3.5 font-mono text-slate-800">
                        {ret.order_number || 'Order'}
                      </td>
                      <td className="p-3.5">
                        <p className="text-slate-800 font-bold truncate max-w-[120px]">{ret.customer_name || 'Customer'}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{ret.customer_email}</p>
                      </td>
                      <td className="p-3.5">
                        <p className="truncate max-w-[150px]">{firstItem ? firstItem.product_name : 'Item'}</p>
                        <p className="text-[10px] text-slate-400">
                          Qty: {firstItem?.requested_quantity || 1} • ₹{ret.total_refund_amount}
                        </p>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${ret.request_type === 'return_refund' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                          {ret.request_type === 'return_refund' ? 'Return' : 'Replacement'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getStatusBadge(ret.status)}`}>
                          {formatStatus(ret.status)}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[11px]">
                        {ret.shipment?.awb_number ? (
                          <div>
                            <span className="font-bold text-slate-800">{ret.shipment.awb_number}</span>
                            <span className="block text-[9px] text-slate-400">{ret.shipment.courier_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not Assigned</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {ret.verification ? (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${ret.verification.status === 'passed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                            {ret.verification.status}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Pending</span>
                        )}
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectReturn(ret.id);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-[#006670] hover:text-white text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Manage</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL / DRAWER */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-left font-sans">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#006670]">
                  <span>RETURN REQUEST DETAILS</span>
                  <span>•</span>
                  <span>{selectedReturn.request_type === 'return_refund' ? 'REFUND WORKFLOW' : 'REPLACEMENT WORKFLOW'}</span>
                </div>
                <h2 className="text-lg font-black text-slate-900 mt-0.5">
                  Return #{selectedReturn.id.slice(0, 8).toUpperCase()}
                </h2>
              </div>
              <button
                onClick={() => {
                  setSelectedReturn(null);
                  setActionMessage('');
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {actionMessage && (
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
                  {actionMessage}
                </div>
              )}

              {/* Status Header Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Current FAAZO Status</span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getStatusBadge(selectedReturn.status)}`}>
                    {formatStatus(selectedReturn.status)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Shiprocket Courier</span>
                  <span className="font-bold text-slate-800 mt-1 block">
                    {selectedReturn.shipment?.courier_name || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Reverse AWB</span>
                  <span className="font-mono font-bold text-slate-800 mt-1 block">
                    {selectedReturn.shipment?.awb_number || 'Pending'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Refund Amount</span>
                  <span className="font-black text-[#006670] mt-1 block text-sm">
                    ₹{selectedReturn.total_refund_amount}
                  </span>
                </div>
              </div>

              {/* Items & Customer Description */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Returned Product Items</h3>
                <div className="divide-y divide-slate-100">
                  {selectedReturn.items.map((it) => (
                    <div key={it.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800">{it.product_name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Unit Price: ₹{it.unit_price} • Requested Qty: {it.requested_quantity}
                        </p>
                      </div>
                      <span className="font-extrabold text-slate-900 font-sans">
                        ₹{(it.requested_quantity * it.unit_price).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>

                {selectedReturn.customer_notes && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Customer Notes</span>
                    <p className="text-slate-700 font-medium mt-1">{selectedReturn.customer_notes}</p>
                  </div>
                )}
              </div>

              {/* Reverse Logistics / Shiprocket Panel */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#006670]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Shiprocket Reverse Shipment</h3>
                  </div>
                  {selectedReturn.shipment?.awb_number && (
                    <button
                      onClick={() => executeAction(() => returnsService.syncTracking(selectedReturn.id), 'Tracking synced successfully.')}
                      disabled={actionLoading}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                      <span>Sync Tracking</span>
                    </button>
                  )}
                </div>

                {selectedReturn.shipment ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Shiprocket Order ID</span>
                      <span className="font-mono font-bold text-slate-700">{selectedReturn.shipment.shiprocket_order_id || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Location</span>
                      <span className="font-semibold text-slate-700">{selectedReturn.shipment.current_location || 'Customer City'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Pickup Date</span>
                      <span className="font-semibold text-slate-700">
                        {selectedReturn.shipment.pickup_scheduled_date ? new Date(selectedReturn.shipment.pickup_scheduled_date).toLocaleDateString() : 'Scheduled'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Tracking Link</span>
                      {selectedReturn.shipment.tracking_url ? (
                        <a href={selectedReturn.shipment.tracking_url} target="_blank" rel="noreferrer" className="text-[#006670] font-bold inline-flex items-center gap-1 hover:underline">
                          <span>Track Courier</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">Unavailable</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-xs">Reverse shipment has not yet been dispatched to Shiprocket.</p>
                )}

                {/* Scan History Accordion */}
                {selectedReturn.shipment?.tracking_events && selectedReturn.shipment.tracking_events.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Logistics Scan History</span>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
                      {selectedReturn.shipment.tracking_events.map((ev) => (
                        <div key={ev.id} className="flex items-start gap-2 text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-800">{ev.event_label}</p>
                            <p className="text-slate-500 text-[10px]">{ev.location} • {new Date(ev.event_timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Doorstep Verification Gate Panel */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Doorstep / Warehouse Verification</h3>
                  </div>
                  {!selectedReturn.verification && (
                    <button
                      onClick={() => setShowVerificationDialog(true)}
                      className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Record Verification
                    </button>
                  )}
                </div>

                {selectedReturn.verification ? (
                  <div className="bg-purple-50/50 border border-purple-100 p-3.5 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${selectedReturn.verification.status === 'passed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        Verification {selectedReturn.verification.status}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        {selectedReturn.verification.verified_at ? new Date(selectedReturn.verification.verified_at).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="text-slate-700"><strong>Verifier:</strong> {selectedReturn.verification.verifier_name}</p>
                    {selectedReturn.verification.failure_reason && (
                      <p className="text-rose-700"><strong>Failure Reason:</strong> {selectedReturn.verification.failure_reason}</p>
                    )}
                    {selectedReturn.verification.notes && (
                      <p className="text-slate-600"><strong>Notes:</strong> {selectedReturn.verification.notes}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-xs">
                    No physical verification recorded yet. Verification is required before issuing refund or replacement.
                  </p>
                )}
              </div>

            </div>

            {/* Context-Aware Action Bar */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-end gap-2.5">
              
              {/* Approve & Reject (initial state) */}
              {['requested', 'under_review'].includes(selectedReturn.status) && (
                <>
                  <button
                    onClick={() => setShowRejectDialog(true)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Reject Request
                  </button>
                  <button
                    onClick={() => executeAction(() => returnsService.adminApprove(selectedReturn.id), 'Return approved successfully.')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    Approve Return
                  </button>
                </>
              )}

              {/* Create Reverse Shipment (when approved) */}
              {['approved', 'pickup_pending'].includes(selectedReturn.status) && (
                <button
                  onClick={() => executeAction(() => returnsService.createReverseShipment(selectedReturn.id), 'Shiprocket reverse shipment created.')}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#006670] hover:bg-[#004f57] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Truck className="w-4 h-4" />
                  <span>Dispatch to Shiprocket (Generate Reverse AWB)</span>
                </button>
              )}

              {/* Refund Button (when verification passed and return_refund) */}
              {['verification_passed', 'qc_passed', 'refund_pending'].includes(selectedReturn.status) && selectedReturn.request_type === 'return_refund' && (
                <button
                  onClick={() => executeAction(() => returnsService.adminApproveRefund(selectedReturn.id), 'Razorpay refund dispatched.')}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Execute Razorpay Refund (₹{selectedReturn.total_refund_amount})</span>
                </button>
              )}

              {/* Replacement Order Button (when verification passed and return_replacement) */}
              {['verification_passed', 'qc_passed', 'replacement_approved'].includes(selectedReturn.status) && selectedReturn.request_type === 'return_replacement' && (
                <button
                  onClick={() => executeAction(() => returnsService.adminApproveReplacement(selectedReturn.id), 'Replacement order created.')}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Package className="w-4 h-4" />
                  <span>Create Replacement Order (Forward Flow)</span>
                </button>
              )}

              <button
                onClick={() => setSelectedReturn(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* REJECTION REASON DIALOG */}
      {showRejectDialog && selectedReturn && (
        <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 text-left font-sans space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase">Reject Return Request</h3>
            <p className="text-xs text-slate-600">Please provide a valid rejection reason. This will be audited and communicated to the customer.</p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Return window expired, policy non-compliance, seal broken..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRejectDialog(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  executeAction(() => returnsService.adminReject(selectedReturn.id, rejectionReason), 'Return rejected.');
                }}
                disabled={!rejectionReason.trim() || actionLoading}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD VERIFICATION DIALOG */}
      {showVerificationDialog && selectedReturn && (
        <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 text-left font-sans space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase">Record Doorstep / Hub Verification</h3>
            <p className="text-xs text-slate-600">Record the inspection outcome before unlocking financial refund or replacement fulfillment.</p>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Outcome</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVerificationStatus('PASS')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border ${verificationStatus === 'PASS' ? 'bg-emerald-50 text-emerald-700 border-emerald-500' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                  >
                    PASS (Verified)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerificationStatus('FAIL')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border ${verificationStatus === 'FAIL' ? 'bg-rose-50 text-rose-700 border-rose-500' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                  >
                    FAIL (Rejected)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Verifier Name / Courier</label>
                <input
                  type="text"
                  value={verifierName}
                  onChange={(e) => setVerifierName(e.target.value)}
                  placeholder="e.g. Blue Dart Executive / Hub Inspector"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              {verificationStatus === 'FAIL' && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Reason for Failure</label>
                  <input
                    type="text"
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    placeholder="e.g. Missing accessories, physical misuse..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-rose-700"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Inspection notes..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowVerificationDialog(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowVerificationDialog(false);
                  executeAction(
                    () => returnsService.submitVerification(selectedReturn.id, {
                      status: verificationStatus,
                      verifier_name: verifierName,
                      failure_reason: failureReason,
                      notes: verificationNotes,
                      is_restockable: verificationStatus === 'PASS',
                    }),
                    'Verification recorded successfully.'
                  );
                }}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold"
              >
                Submit Verification
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
