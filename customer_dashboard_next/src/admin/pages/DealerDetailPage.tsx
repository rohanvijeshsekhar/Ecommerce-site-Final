'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Building2,
  Mail, MapPin, User, FileText, Activity, AlertCircle,
  Download, ExternalLink, Save, ChevronRight, Home,
  Award, Briefcase, Hash, ShieldCheck, Edit3,
  Check, Ban,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { adminDealersService } from '../services/adminService';
import type { DealerApplication } from '../types/admin';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (dt: string | null | undefined) =>
  dt ? new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDate = (dt: string | null | undefined) =>
  dt ? new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const fmtId = (id: string) => `DA-${id.slice(0, 8).toUpperCase()}`;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface ReadFieldProps {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  placeholder?: string;
}
const ReadField: React.FC<ReadFieldProps> = ({ label, value, mono, placeholder = '—' }) => (
  <div>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-sm font-semibold text-slate-800 ${mono ? 'font-mono' : ''} ${!value ? 'text-slate-400 italic' : ''}`}>
      {value || placeholder}
    </p>
  </div>
);

interface InfoCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accent?: string;
}
const InfoCard: React.FC<InfoCardProps> = ({ title, icon, children, accent = 'text-[#005F63] bg-[#005F63]/10' }) => (
  <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>{icon}</div>
      <h3 className="text-sm font-extrabold text-slate-800">{title}</h3>
    </div>
    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {children}
    </div>
  </div>
);

// Status badge
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pending Review', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',  icon: <Clock className="w-4 h-4 text-amber-600" /> },
  approved: { label: 'Approved',       color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
  rejected: { label: 'Rejected',       color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-200',   icon: <XCircle className="w-4 h-4 text-rose-600" /> },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tab definitions
// ─────────────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'documents' | 'activity';
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',   label: 'Overview',   icon: <User className="w-3.5 h-3.5" /> },
  { id: 'documents',  label: 'Documents',  icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'activity',   label: 'Activity',   icon: <Activity className="w-3.5 h-3.5" /> },
];

// ─────────────────────────────────────────────────────────────────────────────
// Overview Tab
// ─────────────────────────────────────────────────────────────────────────────

const OverviewTab: React.FC<{ app: DealerApplication; onNotesChange: (n: string) => void; notesLoading: boolean }> = ({
  app, onNotesChange, notesLoading,
}) => {
  const [notes, setNotes] = useState(app.admin_notes || '');
  const [dirty, setDirty] = useState(false);

  const handleSave = () => { onNotesChange(notes); setDirty(false); };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Left — 2/3 */}
      <div className="xl:col-span-2 flex flex-col gap-4">
        {/* Personal */}
        <InfoCard title="Personal Information" icon={<User className="w-4 h-4" />}>
          <ReadField label="Full Name" value={app.applicant_name} />
          <ReadField label="Email Address" value={app.applicant_email} />
          <ReadField label="Mobile Number" value={app.applicant_phone} />
          <ReadField label="Profession" value={app.profession} />
          <ReadField label="Registered Since" value={fmtDate(app.date_joined)} />
          <ReadField label="Last Login" value={fmt(app.last_login)} />
        </InfoCard>

        {/* Clinic */}
        <InfoCard title="Clinic / Business Information" icon={<Building2 className="w-4 h-4" />} accent="text-blue-700 bg-blue-50">
          <ReadField label="Clinic / Company Name" value={app.company_name} />
          <ReadField label="GST Number" value={app.gst_number} mono />
          <ReadField label="Clinic Phone" value={app.clinic_phone} />
          <ReadField label="Clinic Email" value={app.clinic_email} />
        </InfoCard>

        {/* Address */}
        <InfoCard title="Address" icon={<MapPin className="w-4 h-4" />} accent="text-purple-700 bg-purple-50">
          <ReadField label="Address Line 1" value={app.address_line1} />
          <ReadField label="City" value={app.city} />
          <ReadField label="State" value={app.state} />
          <ReadField label="Pincode" value={app.address_pincode} mono />
        </InfoCard>
      </div>

      {/* Right — 1/3 */}
      <div className="flex flex-col gap-4">
        {/* Status Card */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-slate-600" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800">Application Status</h3>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {/* Current status pill */}
            {(() => {
              const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG['pending'];
              return (
                <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border ${cfg.bg}`}>
                  {cfg.icon}
                  <div>
                    <p className={`text-sm font-extrabold ${cfg.color}`}>{cfg.label}</p>
                    {app.status === 'rejected' && app.rejection_reason && (
                      <p className="text-xs text-rose-600 mt-0.5">"{app.rejection_reason}"</p>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-100">
                <span className="text-xs text-slate-400 font-semibold">Applied</span>
                <span className="text-xs font-bold text-slate-700">{fmtDate(app.created_at)}</span>
              </div>
              {app.reviewed_at && (
                <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-100">
                  <span className="text-xs text-slate-400 font-semibold">Reviewed</span>
                  <span className="text-xs font-bold text-slate-700">{fmtDate(app.reviewed_at)}</span>
                </div>
              )}
              {app.reviewed_by_name && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs text-slate-400 font-semibold">Reviewed By</span>
                  <span className="text-xs font-bold text-slate-700">{app.reviewed_by_name}</span>
                </div>
              )}
            </div>

            {/* Dealer ID info */}
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Application ID</p>
              <p className="text-xs font-mono font-bold text-slate-700">{fmtId(app.id)}</p>
            </div>
          </div>
        </div>

        {/* Admin Notes */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-slate-800">Internal Notes</h3>
              <p className="text-[10px] text-slate-400 font-medium">Visible to admin only</p>
            </div>
          </div>
          <div className="p-4">
            <textarea
              rows={5}
              value={notes}
              onChange={e => { setNotes(e.target.value); setDirty(true); }}
              placeholder="Add private notes about this dealer application…"
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#005F63] focus:ring-2 focus:ring-[#005F63]/10 transition-all placeholder:text-slate-400 resize-none"
            />
            {dirty && (
              <button
                onClick={handleSave}
                disabled={notesLoading}
                className="mt-2.5 w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#005F63] rounded-xl hover:bg-[#004a4e] transition-colors disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                {notesLoading ? 'Saving…' : 'Save Notes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Documents Tab
// ─────────────────────────────────────────────────────────────────────────────

const DocumentsTab: React.FC<{ app: DealerApplication }> = ({ app }) => {
  // Normalize documents to a list of { id, name, url }
  const docList = app.documents && app.documents.length > 0
    ? app.documents.map(d => ({
        id: d.id,
        name: d.name,
        url: d.document_url
      }))
    : (app.document_url
        ? [{
            id: 'legacy',
            name: app.document_url.split('/').pop() ?? 'document',
            url: app.document_url
          }]
        : []
      );

  return (
    <div className="flex flex-col gap-4">
      {/* Security notice */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 font-medium">
          Documents are served via authenticated links. In production, they are signed and expire after 15 minutes. Never share raw URLs externally.
        </p>
      </div>

      {/* Documents card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        {/* Card header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${docList.length > 0 ? 'bg-[#005F63]/10' : 'bg-slate-100'}`}>
            <FileText className={`w-4.5 h-4.5 ${docList.length > 0 ? 'text-[#005F63]' : 'text-slate-400'}`} style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">Uploaded Verification Documents</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {docList.length > 0 ? `${docList.length} document(s) submitted by the dealer` : 'No documents submitted yet'}
            </p>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-6">
          {docList.length > 0 ? (
            docList.map((doc, index) => {
              const fileName = doc.name;
              const ext = fileName.split('.').pop()?.toLowerCase();
              const isPdf = ext === 'pdf';
              const isImage = ext && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);

              return (
                <div key={doc.id || index} className="flex flex-col gap-4 border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                  {/* File info row */}
                  <div className="flex items-center gap-4 p-4 bg-[#F0EEFC] rounded-xl border border-[#E4E1FA]">
                    {/* File type icon */}
                    <div className="w-12 h-14 rounded-lg bg-white border border-[#E4E1FA] shadow-sm flex flex-col items-center justify-center shrink-0 gap-0.5">
                      <FileText className="w-5 h-5 text-[#5850EC]" />
                      {ext && (
                        <span className="text-[8px] font-black uppercase text-[#5850EC] tracking-wider">{ext}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{fileName}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isPdf ? 'PDF Document' : isImage ? 'Image File' : 'Business Registration / GST Certificate'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          Uploaded
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <a
                        href={doc.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#5850EC] bg-[#5850EC]/5 border border-[#5850EC]/20 rounded-xl hover:bg-[#5850EC]/10 transition-colors whitespace-nowrap text-center justify-center"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View
                      </a>
                      <a
                        href={doc.url || '#'}
                        download={fileName}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-colors whitespace-nowrap text-center justify-center"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    </div>
                  </div>

                  {/* Inline preview for images */}
                  {isImage && doc.url && (
                    <div className="rounded-xl overflow-hidden border border-slate-100 max-h-96 flex items-center justify-center bg-slate-50">
                      <img
                        src={doc.url}
                        alt="Uploaded document"
                        className="max-h-96 max-w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-500">No Document Submitted</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  The dealer has not uploaded any supporting documents yet. Documents are collected during the application process.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// Activity Tab
// ─────────────────────────────────────────────────────────────────────────────

const ActivityTab: React.FC<{ app: DealerApplication }> = ({ app }) => {
  // Build timeline from available data
  const events: { label: string; time: string | null; desc: string; icon: React.ReactNode; color: string }[] = [
    {
      label: 'Application Submitted',
      time: app.created_at,
      desc: `${app.applicant_name} submitted a dealer application for ${app.company_name}.`,
      icon: <Briefcase className="w-3.5 h-3.5" />,
      color: 'bg-blue-500',
    },
  ];

  if (app.status === 'approved' && app.reviewed_at) {
    events.push({
      label: 'Application Approved',
      time: app.reviewed_at,
      desc: `Application approved by ${app.reviewed_by_name ?? app.reviewed_by_email ?? 'admin'}. Dealer portal access and dealer pricing enabled.`,
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      color: 'bg-emerald-500',
    });
  }

  if (app.status === 'rejected' && app.reviewed_at) {
    events.push({
      label: 'Application Rejected',
      time: app.reviewed_at,
      desc: `Application rejected by ${app.reviewed_by_name ?? app.reviewed_by_email ?? 'admin'}.${app.rejection_reason ? ` Reason: "${app.rejection_reason}"` : ''}`,
      icon: <XCircle className="w-3.5 h-3.5" />,
      color: 'bg-rose-500',
    });
  }

  if (app.admin_notes) {
    events.push({
      label: 'Internal Note Added',
      time: app.updated_at,
      desc: 'Admin added/updated internal notes on this application.',
      icon: <Edit3 className="w-3.5 h-3.5" />,
      color: 'bg-amber-500',
    });
  }

  // Sort descending
  events.sort((a, b) => {
    if (!a.time) return 1;
    if (!b.time) return -1;
    return new Date(b.time).getTime() - new Date(a.time).getTime();
  });

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-6">
      <h3 className="text-sm font-extrabold text-slate-800 mb-6">Application Timeline</h3>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-5 bottom-0 w-px bg-slate-100" />

        <div className="flex flex-col gap-6">
          {events.map((evt, i) => (
            <div key={i} className="flex items-start gap-4 pl-10 relative">
              {/* Dot */}
              <div className={`absolute left-0 w-8 h-8 rounded-full ${evt.color} flex items-center justify-center text-white shadow-md shrink-0`}>
                {evt.icon}
              </div>

              <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap mb-1.5">
                  <p className="text-sm font-extrabold text-slate-800">{evt.label}</p>
                  {evt.time && (
                    <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-lg shrink-0">
                      {fmt(evt.time)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{evt.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

const DealerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [app, setApp] = useState<DealerApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Action state
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminDealersService.getOne(id);
      if (res.success && res.data) setApp(res.data);
      else { toast.error('Dealer application not found.'); router.push('/admin/dealers'); }
    } catch {
      toast.error('Failed to load dealer application.');
      router.push('/admin/dealers');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // ── Actions ────────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!app) return;
    setActionLoading(true);
    try {
      const res = await adminDealersService.approve(app.id);
      if (res.success && res.data) {
        setApp(res.data);
        toast.success(`${app.applicant_name} approved. Dealer portal access enabled.`);
        setApproveOpen(false);
      }
    } catch { toast.error('Failed to approve application.'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!app || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await adminDealersService.reject(app.id, rejectReason.trim());
      if (res.success && res.data) {
        setApp(res.data);
        toast.success('Application rejected.');
        setRejectOpen(false);
        setRejectReason('');
      }
    } catch { toast.error('Failed to reject application.'); }
    finally { setActionLoading(false); }
  };

  const handleSaveNotes = async (notes: string) => {
    if (!app) return;
    setNotesLoading(true);
    try {
      const res = await adminDealersService.updateNotes(app.id, notes);
      if (res.success && res.data) {
        setApp(res.data);
        toast.success('Admin notes saved.');
      }
    } catch { toast.error('Failed to save notes.'); }
    finally { setNotesLoading(false); }
  };

  // ── Loading skeleton ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-5 animate-pulse p-1">
        <div className="h-8 bg-slate-100 rounded-xl w-48" />
        <div className="h-24 bg-slate-100 rounded-2xl" />
        <div className="h-10 bg-slate-100 rounded-xl w-80" />
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (!app) return null;

  const statusCfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG['pending'];

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 p-1 min-h-0">

      {/* ── Breadcrumb ────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 flex-wrap">
        <Link href="/admin" className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#005F63] transition-colors">
          <Home className="w-3 h-3" /><span>Admin</span>
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-300" />
        <Link href="/admin/dealers" className="text-xs text-slate-400 hover:text-[#005F63] transition-colors">Dealers</Link>
        <ChevronRight className="w-3 h-3 text-slate-300" />
        <span className="text-xs font-semibold text-slate-600">{app.applicant_name}</span>
      </nav>

      {/* ── Header Card ───────────────────────────────────────────── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Left: identity */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/dealers')}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 border border-slate-100 transition-all shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#005F63] to-[#007B80] flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
              {app.applicant_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg font-extrabold text-slate-800 leading-tight">{app.applicant_name}</h1>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${statusCfg.bg} ${statusCfg.color}`}>
                  {statusCfg.icon}
                  {statusCfg.label}
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{app.company_name}</p>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {app.applicant_email && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Mail className="w-3 h-3" />{app.applicant_email}
                  </span>
                )}
                {app.city && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <MapPin className="w-3 h-3" />{app.city}, {app.state}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                  <Hash className="w-3 h-3" />{fmtId(app.id)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {app.status !== 'approved' && (
              <button
                onClick={() => setApproveOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm"
              >
                <Check className="w-4 h-4" /> Approve
              </button>
            )}
            {app.status !== 'rejected' && (
              <button
                onClick={() => { setRejectOpen(true); setRejectReason(''); }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl transition-colors"
              >
                <Ban className="w-4 h-4" /> Reject
              </button>
            )}
            {app.status === 'approved' && (
              <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
                <Award className="w-4 h-4" /> Dealer Portal Active
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all
              ${activeTab === tab.id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ───────────────────────────────────────────── */}
      <div className="pb-8">
        {activeTab === 'overview' && (
          <OverviewTab app={app} onNotesChange={handleSaveNotes} notesLoading={notesLoading} />
        )}
        {activeTab === 'documents' && <DocumentsTab app={app} />}
        {activeTab === 'activity' && <ActivityTab app={app} />}
      </div>

      {/* ── Approve Dialog ────────────────────────────────────────── */}
      {approveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Approve Application</h3>
                <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone without rejecting.</p>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-5">
              <p className="text-xs font-bold text-emerald-700 mb-2">✓ What happens after approval:</p>
              <ul className="text-xs text-emerald-700 space-y-1">
                <li>• Dealer Portal access is enabled immediately</li>
                <li>• Dealer pricing tier is activated</li>
                <li>• Application status changes to Approved</li>
              </ul>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setApproveOpen(false)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleApprove} disabled={actionLoading}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50">
                {actionLoading ? 'Approving…' : 'Approve Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ──────────────────────────────────────────── */}
      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Reject Application</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action is logged in the activity timeline.</p>
              </div>
            </div>
            <label className="block mb-4">
              <span className="text-xs font-bold text-slate-700">Rejection Reason <span className="text-rose-500">*</span></span>
              <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Provide a clear reason…"
                className="mt-1.5 w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#005F63] focus:ring-2 focus:ring-[#005F63]/10 transition-all placeholder:text-slate-400 resize-none" />
            </label>
            <div className="flex gap-2.5">
              <button onClick={() => { setRejectOpen(false); setRejectReason(''); }}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button disabled={!rejectReason.trim() || actionLoading} onClick={handleReject}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {actionLoading ? 'Rejecting…' : 'Reject Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealerDetailPage;
