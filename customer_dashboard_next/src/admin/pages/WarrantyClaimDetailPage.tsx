'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, RefreshCw, Paperclip, Shield,
  User, AlertCircle, FileText, ChevronDown, CheckCircle
} from 'lucide-react';
import { warrantyService } from '../../services/warranty';
import type { WarrantyClaim } from '../../services/warranty';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { useBreadcrumbSync } from '../contexts/BreadcrumbContext';

const WarrantyClaimDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [claim, setClaim] = useState<WarrantyClaim | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states for Admin Action Panel
  const [actionNotes, setActionNotes] = useState('');
  const [actionResolution, setActionResolution] = useState('');
  const [actionProvider, setActionProvider] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useBreadcrumbSync([
    { label: 'Operations' },
    { label: 'Warranties', path: '/admin/warranty' },
    { label: `Claim #${claim?.claim_number || ''}` },
  ]);

  const fetchClaimDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await warrantyService.getAdminClaimDetail(id);
      if (res.success && res.data) {
        setClaim(res.data);
        setActionProvider(res.data.assigned_provider || '');
        setActionStatus(res.data.status);
      } else {
        toast.error(res.message || 'Failed to load claim detail.');
      }
    } catch (err) {
      console.error('Failed to load claim detail:', err);
      toast.error('Failed to load claim details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaimDetail();
  }, [id]);

  const handleAction = async (action: 'approve' | 'reject' | 'request_info' | 'assign' | 'update_status' | 'close') => {
    if (!id) return;
    setSubmittingAction(true);

    try {
      const payload: any = {
        notes: actionNotes.trim(),
      };

      if (action === 'reject' || action === 'close') {
        if (!actionResolution.trim()) {
          toast.warning('Resolution notes are required for this action.');
          setSubmittingAction(false);
          return;
        }
        payload.resolution = actionResolution.trim();
      }

      if (action === 'assign') {
        if (!actionProvider.trim()) {
          toast.warning('Provider name is required for assignment.');
          setSubmittingAction(false);
          return;
        }
        payload.provider = actionProvider.trim();
      }

      if (action === 'update_status') {
        if (!actionStatus) {
          toast.warning('Status selection is required.');
          setSubmittingAction(false);
          return;
        }
        payload.status = actionStatus;
      }

      const res = await warrantyService.performClaimAction(id, action, payload);
      if (res.success && res.data) {
        setClaim(res.data);
        setActionNotes('');
        setActionResolution('');
        setActionProvider(res.data.assigned_provider || '');
        setActionStatus(res.data.status);
        toast.success(`Claim action '${action}' completed successfully.`);
      } else {
        toast.error(res.message || 'Failed to perform action.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to execute claim action.';
      toast.error(msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading && !claim) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-3 font-sans">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#005B63]" />
        <p className="text-xs font-bold uppercase tracking-wider">Loading claim details...</p>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="p-12 text-center text-slate-400 italic font-sans space-y-4">
        <p>Warranty claim not found.</p>
        <button onClick={() => router.push('/admin/warranty')} className="text-xs font-bold text-[#005B63] underline">Back to Warranty Center</button>
      </div>
    );
  }

  const getStatusBadge = (statusVal: string) => {
    switch (statusVal) {
      case 'submitted':
        return <StatusBadge variant="info" label="Submitted" />;
      case 'under_review':
        return <StatusBadge variant="warning" label="Under Review" />;
      case 'need_more_info':
        return <StatusBadge variant="purple" label="Need Info" />;
      case 'approved':
        return <StatusBadge variant="success" label="Approved" />;
      case 'assigned':
        return <StatusBadge variant="info" label="Assigned" />;
      case 'repair_in_progress':
        return <StatusBadge variant="warning" label="In Repair" />;
      case 'completed':
        return <StatusBadge variant="success" label="Completed" />;
      case 'closed':
        return <StatusBadge variant="neutral" label="Closed" />;
      case 'rejected':
        return <StatusBadge variant="error" label="Rejected" />;
      default:
        return <StatusBadge variant="neutral" label={statusVal} />;
    }
  };

  const getPriorityBadge = (priorityVal: string) => {
    switch (priorityVal) {
      case 'critical':
        return <StatusBadge variant="error" label="Critical" />;
      case 'high':
        return <StatusBadge variant="warning" label="High" />;
      case 'medium':
        return <StatusBadge variant="info" label="Medium" />;
      default:
        return <StatusBadge variant="neutral" label="Low" />;
    }
  };

  return (
    <div className="space-y-6 text-left font-sans select-none">
      {/* Back Button & Header */}
      <div className="space-y-4">
        <button
          onClick={() => router.push('/admin/warranty')}
          className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-0"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Warranty Center
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <SectionHeader
            title="Review Trouble Claim"
            subtitle={`Claim Number: ${claim.claim_number}`}
          />
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {getPriorityBadge(claim.priority)}
            {getStatusBadge(claim.status)}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (Details, Attachments, Timeline) (Col span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-6">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#005B63] pb-3 border-b border-slate-50">Trouble Details & Statement</h3>

            {/* Profile boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Customer */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <User className="w-4 h-4" />
                  <span className="text-[9px] font-extrabold uppercase tracking-widest">Filer Profile</span>
                </div>
                <p className="font-bold text-slate-800">{claim.registration_detail?.user?.full_name}</p>
                <p className="text-slate-400 font-mono text-[10px]">{claim.registration_detail?.user?.email}</p>
                <p className="text-[#005B63] font-bold capitalize text-[10px]">{claim.registration_detail?.user?.role} Account</p>
              </div>

              {/* Equipment & S/N */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Shield className="w-4 h-4" />
                  <span className="text-[9px] font-extrabold uppercase tracking-widest">Registered Asset</span>
                </div>
                <p className="font-bold text-slate-800 truncate max-w-[180px]">{claim.registration_detail?.product?.name}</p>
                <p className="text-slate-400 text-[10px] font-mono">S/N: {claim.registration_detail?.serial_number || 'N/A'}</p>
                <p className="text-slate-400 text-[10px]">Warranty Ref: #{claim.registration_detail?.id?.substring(0, 8).toUpperCase()}</p>
              </div>
            </div>

            {/* Fault summary details */}
            <div className="space-y-4 pt-2">
              <div className="text-xs space-y-1">
                <span className="block text-[8px] font-extrabold uppercase text-slate-400">Detailed Trouble Description</span>
                <div className="p-4 bg-slate-50/40 border border-slate-50 rounded-2xl italic leading-relaxed text-slate-700 font-sans">
                  "{claim.description}"
                </div>
              </div>

              {claim.resolution && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-[9px] font-extrabold uppercase tracking-widest">Administrative Resolution Plan</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-sans italic">"{claim.resolution}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Attachments Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#005B63] pb-3 border-b border-slate-50">Support Attachments Log</h3>
            {claim.attachments && claim.attachments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {claim.attachments.map(att => (
                  <div key={att.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between items-start space-y-3">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-[10px] font-bold text-slate-700 capitalize">{att.attachment_type.replace('_', ' ')}</span>
                    </div>
                    {/* Media Previews */}
                    {['product_image', 'invoice'].includes(att.attachment_type) && (
                      <div className="w-full h-24 bg-white border border-slate-100 rounded-lg overflow-hidden flex items-center justify-center p-1">
                        {att.file.toLowerCase().endsWith('.pdf') ? (
                          <FileText className="w-8 h-8 text-slate-300" />
                        ) : (
                          <img src={att.file} alt="Preview" className="w-full h-full object-contain" />
                        )}
                      </div>
                    )}
                    <a
                      href={att.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-black uppercase text-[#005B63] hover:underline"
                    >
                      View Full File
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 border border-dashed border-slate-200 text-center text-xs font-semibold text-slate-400 rounded-2xl">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No verification attachments uploaded with this claim.
              </div>
            )}
          </div>

          {/* Timeline / Audit History */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#005B63] pb-3 border-b border-slate-50">Claim Audit Trail Timeline</h3>

            {claim.timeline && claim.timeline.length > 0 ? (
              <div className="relative border-l border-slate-100 pl-5 ml-2.5 space-y-5 py-1">
                {claim.timeline.map((evt, idx) => (
                  <div key={evt.id || idx} className="relative">
                    <div className="absolute -left-[25.5px] top-1 w-2.5 h-2.5 rounded-full bg-[#005B63] border-2 border-white shadow-xs" />
                    <div className="space-y-0.5 text-xs text-left">
                      <div className="flex items-baseline gap-2">
                        <span className="font-extrabold text-slate-800">{evt.action}</span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {new Date(evt.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[9px] text-[#005B63] font-bold">Performed by {evt.performed_by_name || 'System'}</p>
                      {evt.notes && <p className="text-[10px] text-slate-500 font-sans mt-0.5 leading-relaxed">{evt.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-slate-400">No events logged in the audit trail ledger.</p>
            )}
          </div>
        </div>

        {/* Right Column (Control Panel) */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-5">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#005B63] pb-3 border-b border-slate-50">Operational Control Panel</h3>

            <div className="space-y-4">
              {/* Action Notes */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Action Audit Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={actionNotes}
                  onChange={e => setActionNotes(e.target.value)}
                  placeholder="Notes logged inside audit timeline for this action..."
                  className="w-full border border-slate-200 rounded-2xl p-3 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#005B63] font-sans resize-none"
                />
              </div>

              {/* Resolution Plan (For rejecting/closing) */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Resolution Plan Notes (Required for Reject/Close)</label>
                <textarea
                  rows={2}
                  value={actionResolution}
                  onChange={e => setActionResolution(e.target.value)}
                  placeholder="Resolution plan details..."
                  className="w-full border border-slate-200 rounded-2xl p-3 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#005B63] font-sans resize-none"
                />
              </div>

              {/* Approve / Reject buttons */}
              {claim.status === 'submitted' && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    disabled={submittingAction}
                    onClick={() => handleAction('approve')}
                    className="py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                  >
                    Approve Claim
                  </button>
                  <button
                    disabled={submittingAction}
                    onClick={() => handleAction('reject')}
                    className="py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                  >
                    Reject Claim
                  </button>
                </div>
              )}

              {/* Assign Service Provider */}
              {claim.status === 'approved' && (
                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Assign Service Provider</label>
                    <input
                      type="text"
                      placeholder="Provider company name..."
                      value={actionProvider}
                      onChange={e => setActionProvider(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-[#005B63]"
                    />
                  </div>
                  <button
                    disabled={submittingAction}
                    onClick={() => handleAction('assign')}
                    className="w-full py-2 bg-[#005B63] hover:bg-[#004a51] disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                  >
                    Assign Provider
                  </button>
                </div>
              )}

              {/* Update Service Status */}
              {(claim.status === 'assigned' || claim.status === 'repair_in_progress' || claim.status === 'completed') && (
                <div className="space-y-3 pt-2 border-t border-slate-50">
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Update Workshop Status</label>
                    <div className="relative">
                      <select
                        value={actionStatus}
                        onChange={e => setActionStatus(e.target.value)}
                        className="w-full appearance-none pl-3 pr-8 py-1.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#005B63] text-xs"
                      >
                        <option value="assigned">Assigned</option>
                        <option value="repair_in_progress">Repair In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <button
                    disabled={submittingAction}
                    onClick={() => handleAction('update_status')}
                    className="w-full py-2 bg-[#005B63] hover:bg-[#004a51] disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                  >
                    Update Workshop Status
                  </button>
                </div>
              )}

              {/* Close Claim */}
              {claim.status === 'completed' && (
                <button
                  disabled={submittingAction}
                  onClick={() => handleAction('close')}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                >
                  Close & Archive Claim
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarrantyClaimDetailPage;
