'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, RefreshCw, Paperclip, Shield,
  User, Package, AlertCircle, FileText, CheckCircle
} from 'lucide-react';
import { warrantyService } from '../../services/warranty';
import type { WarrantyRegistration } from '../../services/warranty';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { useBreadcrumbSync } from '../contexts/BreadcrumbContext';

const WarrantyRegistrationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [registration, setRegistration] = useState<WarrantyRegistration | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states for Admin Action Panel
  const [actionNotes, setActionNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useBreadcrumbSync([
    { label: 'Operations' },
    { label: 'Warranties', path: '/admin/warranty' },
    { label: `Registration #${id?.substring(0, 8).toUpperCase() || ''}` },
  ]);

  const fetchRegistrationDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await warrantyService.getAdminRegistrations({ id });
      const item = res.data?.find(r => r.id === id);
      if (item) {
        setRegistration(item);
        setActionNotes(item.admin_notes || '');
      } else {
        toast.error('Warranty registration not found.');
      }
    } catch (err) {
      console.error('Failed to load registration detail:', err);
      toast.error('Failed to load registration details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrationDetail();
  }, [id]);

  const handleAction = async (action: 'approve' | 'reject' | 'request_info') => {
    if (!id) return;
    setSubmittingAction(true);

    try {
      const res = await warrantyService.performRegistrationAction(id, action, actionNotes.trim());
      if (res.success && res.data) {
        setRegistration(res.data);
        toast.success(`Registration successfully ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'requested info'}.`);
        setActionNotes('');
        setTimeout(() => router.push('/admin/warranty'), 1000);
      } else {
        toast.error(res.message || 'Action failed.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to execute registration review action.';
      toast.error(msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading && !registration) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-3 font-sans">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#005B63]" />
        <p className="text-xs font-bold uppercase tracking-wider">Loading registration record...</p>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="p-12 text-center text-slate-400 italic font-sans space-y-4">
        <p>Warranty registration not found.</p>
        <button onClick={() => router.push('/admin/warranty')} className="text-xs font-bold text-[#005B63] underline">Back to Warranty Center</button>
      </div>
    );
  }

  const getStatusBadge = (statusVal: string) => {
    switch (statusVal) {
      case 'pending_registration':
        return <StatusBadge variant="neutral" label="Pending Registration" />;
      case 'pending_verification':
        return <StatusBadge variant="warning" label="Awaiting Verification" />;
      case 'need_more_info':
        return <StatusBadge variant="purple" label="Need Info" />;
      case 'active':
        return <StatusBadge variant="success" label="Active" />;
      case 'rejected':
        return <StatusBadge variant="error" label="Rejected" />;
      default:
        return <StatusBadge variant="neutral" label={statusVal} />;
    }
  };

  return (
    <div className="space-y-6 text-left font-sans select-none">
      {/* Back button & Header */}
      <div className="space-y-4">
        <button
          onClick={() => router.push('/admin/warranty')}
          className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-0"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Warranty Center
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <SectionHeader
            title="Verify Registration"
            subtitle={`Registry Ref ID: ${registration.id}`}
          />
          <div className="self-start md:self-auto">
            {getStatusBadge(registration.warranty_status)}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Details & Attachments (Col span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-6">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#005B63] pb-3 border-b border-slate-50">Equipment Purchase Profile</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Customer */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <User className="w-4 h-4" />
                  <span className="text-[9px] font-extrabold uppercase tracking-widest">Customer Details</span>
                </div>
                <p className="font-bold text-slate-800">{registration.user?.full_name}</p>
                <p className="text-slate-400 font-mono text-[10px]">{registration.user?.email}</p>
                <p className="text-[#005B63] font-bold capitalize text-[10px]">{registration.user?.role} Account</p>
              </div>

              {/* Order Reference */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Package className="w-4 h-4" />
                  <span className="text-[9px] font-extrabold uppercase tracking-widest">Order Details</span>
                </div>
                <p className="font-bold text-slate-800">Order #{registration.order?.order_number || 'N/A'}</p>
                <p className="text-slate-400 text-[10px]">Invoice Ref: {registration.order?.invoice_number || 'N/A'}</p>
                <p className="text-slate-400 text-[10px]">Delivered on {registration.purchase_date}</p>
              </div>
            </div>

            {/* Product summary */}
            <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Shield className="w-4 h-4" />
                <span className="text-[9px] font-extrabold uppercase tracking-widest">FAAZO Product Allocation</span>
              </div>
              <p className="font-black text-slate-800 text-sm">{registration.product?.name}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-1.5">
                <div>
                  <span className="block text-[8px] font-extrabold uppercase text-slate-400">Serial Code Provided</span>
                  <span className="font-mono font-black text-slate-700 bg-white border border-slate-100 px-1.5 py-0.5 rounded">
                    {registration.serial_number || 'Not Provided'}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] font-extrabold uppercase text-slate-400">Serial No. Required</span>
                  <span className="font-bold text-slate-700 capitalize">
                    {registration.product?.serial_number_required ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] font-extrabold uppercase text-slate-400">Coverage Start/End</span>
                  <span className="font-bold text-slate-700">
                    {registration.warranty_start} to {registration.warranty_end}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {registration.notes && (
              <div className="space-y-2 text-xs">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Customer Notes</h4>
                <div className="p-4 bg-slate-50/40 border border-slate-50 rounded-2xl italic leading-relaxed text-slate-700 font-sans">
                  "{registration.notes}"
                </div>
              </div>
            )}
          </div>

          {/* Invoice File Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#005B63] pb-3 border-b border-slate-50">Uploaded Invoice Proof</h3>

            {registration.invoice_url ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 border border-slate-100 rounded-2xl bg-slate-50">
                  <div className="w-10 h-10 rounded-xl bg-[#005B63]/10 text-[#005B63] flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold text-slate-700 truncate">{registration.invoice_url.split('/').pop()}</p>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">Customer Verification Document</p>
                  </div>
                  <a
                    href={registration.invoice_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-[10px] font-extrabold uppercase tracking-widest text-slate-600 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer bg-white"
                  >
                    <Paperclip className="w-3.5 h-3.5" /> View File
                  </a>
                </div>

                {/* Embed PDF/Image if possible */}
                {/\.(jpg|jpeg|png)$/i.test(registration.invoice_url) ? (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50 max-h-[400px] flex items-center justify-center p-4">
                    <img src={registration.invoice_url} alt="Invoice Proof" className="max-h-[350px] rounded-lg object-contain shadow-xs" />
                  </div>
                ) : registration.invoice_url.toLowerCase().endsWith('.pdf') ? (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden h-[400px]">
                    <iframe src={registration.invoice_url} title="Invoice PDF" className="w-full h-full border-none" />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="p-8 border border-dashed border-slate-200 text-center text-xs font-semibold text-slate-400 rounded-2xl">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No invoice file has been uploaded for this registration.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Admin Actions Ledger */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#005B63] pb-3 border-b border-slate-50">Review Actions</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">Internal Admin Review Notes</label>
                <textarea
                  rows={4}
                  value={actionNotes}
                  onChange={e => setActionNotes(e.target.value)}
                  placeholder="Provide comments about approval, rejection, or specify missing details for requesting info..."
                  className="w-full border border-slate-200 rounded-2xl p-4 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#005B63] font-sans resize-none"
                />
              </div>

              {registration.warranty_status === 'pending_verification' || registration.warranty_status === 'need_more_info' ? (
                <div className="space-y-2 pt-2">
                  <button
                    disabled={submittingAction}
                    onClick={() => handleAction('approve')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve Registration
                  </button>

                  <button
                    disabled={submittingAction}
                    onClick={() => handleAction('request_info')}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <AlertCircle className="w-4 h-4" /> Request Info (Send Notification)
                  </button>

                  <button
                    disabled={submittingAction}
                    onClick={() => handleAction('reject')}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <AlertCircle className="w-4 h-4" /> Reject Registration
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-500 font-semibold">
                  This registration has already been verified and locked.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarrantyRegistrationDetailPage;
