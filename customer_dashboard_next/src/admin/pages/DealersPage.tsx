'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  SlidersHorizontal, X, Eye, Check, Ban,
  Download, ChevronLeft, ChevronRight, MoreVertical,
  Calendar, Building2, AlertCircle, Printer, Search,
  Handshake
} from 'lucide-react';
import { useBreadcrumbSync } from '../contexts/BreadcrumbContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { adminDealersService } from '../services/adminService';
import type { DealerApplication, DealerStats } from '../types/admin';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; variant: 'warning' | 'success' | 'error' | 'neutral' }> = {
  pending:  { label: 'Pending Review', variant: 'warning' },
  approved: { label: 'Approved',       variant: 'success' },
  rejected: { label: 'Rejected',       variant: 'error'   },
};

const fmt = (dt: string | null) =>
  dt ? new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const fmtId = (id: string) => `DA-${id.slice(0, 8).toUpperCase()}`;

// StatCard is imported from '../components/StatCard'

// ─────────────────────────────────────────────────────────────────────────────
// Row actions menu
// ─────────────────────────────────────────────────────────────────────────────

interface RowMenuProps {
  app: DealerApplication;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
}

const RowMenu: React.FC<RowMenuProps> = ({ app, onView, onApprove, onReject }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center gap-1.5">
      <button
        onClick={onView}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-[#005F63] bg-[#005F63]/5 hover:bg-[#005F63]/10 rounded-lg border border-[#005F63]/20 hover:border-[#005F63]/40 transition-all"
      >
        <Eye className="w-3.5 h-3.5" /> View
      </button>
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-100 rounded-[14px] shadow-[0_12px_40px_rgba(0,0,0,0.1)] z-30 overflow-hidden py-1">
          {app.status !== 'approved' && (
            <button
              onClick={() => { setOpen(false); onApprove(); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              <Check className="w-3.5 h-3.5" /> Approve
            </button>
          )}
          {app.status !== 'rejected' && (
            <button
              onClick={() => { setOpen(false); onReject(); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Ban className="w-3.5 h-3.5" /> Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const DealersPage: React.FC = () => {
  useBreadcrumbSync([
    { label: 'Customers & dealers' },
    { label: 'Dealers', path: '/admin/dealers' },
  ]);

  const router = useRouter();
  const toast = useToast();

  // Data
  const [applications, setApplications] = useState<DealerApplication[]>([]);
  const [stats, setStats] = useState<DealerStats>({ total: 0, pending: 0, approved: 0, rejected: 0, approval_rate: 0 });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);

  // Action dialogs
  const [approveTarget, setApproveTarget] = useState<DealerApplication | null>(null);
  const [rejectTarget, setRejectTarget] = useState<DealerApplication | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await adminDealersService.getStats();
      if (res.success && res.data) setStats(res.data);
    } catch { /* silent */ }
    finally { setStatsLoading(false); }
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, page_size: pageSize };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await adminDealersService.getAll(params);
      if (res.success && res.data) {
        setApplications(res.data);
        setTotal((res as any).pagination?.total ?? res.data.length);
      }
    } catch {
      toast.error('Failed to load dealer applications.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, startDate, endDate]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  // Debounced search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (v: string) => {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); }, 400);
  };

  const clearFilters = () => {
    setSearch(''); setStartDate(''); setEndDate(''); setStatusFilter('all'); setPage(1);
  };
  const hasFilters = search || startDate || endDate || statusFilter !== 'all';

  // ── Actions ───────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!approveTarget) return;
    setActionLoading(true);
    try {
      const res = await adminDealersService.approve(approveTarget.id);
      if (res.success) {
        toast.success(`${approveTarget.applicant_name} approved as dealer.`);
        setApproveTarget(null);
        fetchApplications();
        fetchStats();
      }
    } catch { toast.error('Failed to approve application.'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await adminDealersService.reject(rejectTarget.id, rejectReason.trim());
      if (res.success) {
        toast.success(`Application rejected.`);
        setRejectTarget(null);
        setRejectReason('');
        fetchApplications();
        fetchStats();
      }
    } catch { toast.error('Failed to reject application.'); }
    finally { setActionLoading(false); }
  };

  // ── CSV Export ────────────────────────────────────────────────
  const exportCSV = () => {
    const header = ['Dealer ID', 'Applicant Name', 'Clinic', 'City', 'Email', 'Phone', 'Applied Date', 'Status'];
    const rows = applications.map(a => [
      fmtId(a.id), a.applicant_name, a.company_name, a.city,
      a.applicant_email, a.applicant_phone || '', fmt(a.created_at), a.status
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'dealer-applications.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    if (applications.length === 0) return toast.info('No data to export.');
    const header = ['Dealer ID', 'Applicant Name', 'Clinic', 'City', 'Email', 'Phone', 'Applied Date', 'Status'];
    const rows = applications.map(a => [
      fmtId(a.id), a.applicant_name, a.company_name, a.city,
      a.applicant_email, a.applicant_phone || '', fmt(a.created_at), a.status
    ]);
    const tabContent = [header.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([tabContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `faazo_dealers_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    toast.success('Excel export downloaded successfully.');
  };

  const printPDF = () => {
    window.print();
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeader
          title="Dealer Applications"
          subtitle="Review, approve, and manage B2B dealer registrations and credential verifications."
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              onClick={exportCSV}
              title="Export as CSV"
              className="p-2.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 border-r border-slate-100 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={exportExcel}
              title="Export as Excel"
              className="p-2.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 border-r border-slate-100 transition-colors font-bold text-[10px] px-3.5 flex items-center cursor-pointer"
            >
              XLS
            </button>
            <button
              onClick={printPDF}
              title="Print PDF Layout"
              className="p-2.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-[fadeIn_0.3s_ease]">
        <StatCard
          stat={{
            id: 'total_apps',
            label: 'Total Applications',
            value: statsLoading ? '—' : stats.total,
            subValue: 'All dealer requests',
            variant: 'teal',
            icon: 'Handshake'
          }}
          loading={statsLoading}
          onClick={() => { setStatusFilter('all'); setPage(1); }}
        />
        <StatCard
          stat={{
            id: 'pending_apps',
            label: 'Pending Review',
            value: statsLoading ? '—' : stats.pending,
            subValue: 'Awaiting decision',
            variant: 'orange',
            icon: 'Clock'
          }}
          loading={statsLoading}
          onClick={() => { setStatusFilter('pending'); setPage(1); }}
        />
        <StatCard
          stat={{
            id: 'approved_apps',
            label: 'Approved',
            value: statsLoading ? '—' : stats.approved,
            subValue: 'Active B2B dealers',
            variant: 'green',
            icon: 'CheckCircle'
          }}
          loading={statsLoading}
          onClick={() => { setStatusFilter('approved'); setPage(1); }}
        />
        <StatCard
          stat={{
            id: 'rejected_apps',
            label: 'Rejected',
            value: statsLoading ? '—' : stats.rejected,
            subValue: 'Declined applications',
            variant: 'red',
            icon: 'XCircle'
          }}
          loading={statsLoading}
          onClick={() => { setStatusFilter('rejected'); setPage(1); }}
        />
        <StatCard
          stat={{
            id: 'approval_rate',
            label: 'Approval Rate',
            value: statsLoading ? '—' : `${stats.approval_rate}%`,
            subValue: 'Of all applications',
            variant: 'blue',
            icon: 'TrendingUp'
          }}
          loading={statsLoading}
        />
      </div>

      {/* ── Search & Filters ──────────────────────────────────────── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by name, clinic, GST, email, phone, city…"
              className="w-full pl-9 pr-4 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#005F63] focus:ring-2 focus:ring-[#005F63]/10 transition-all placeholder:text-slate-400"
            />
            {search && (
              <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status quick tabs */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg capitalize transition-all
                  ${statusFilter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all
              ${showFilters ? 'bg-[#005F63] text-white border-[#005F63]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters {hasFilters && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />}
          </button>

          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-rose-600 font-semibold hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Extended filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Applied From</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#005F63] bg-slate-50" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Applied To</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#005F63] bg-slate-50" />
              {(startDate || endDate) && (
                <button onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-[10px] text-rose-600 font-bold text-left hover:underline">Clear dates</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50">
          <p className="text-xs font-bold text-slate-500">
            {loading ? 'Loading…' : `${total} application${total !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50">
                <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dealer ID</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Applicant</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Clinic</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">City</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden xl:table-cell">Applied</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-3 bg-slate-100 rounded-full w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16">
                    <EmptyState
                      icon={<Handshake className="w-10 h-10 text-slate-300" />}
                      title="No Applications Found"
                      description="No dealer applications match your current search or filters."
                    />
                  </td>
                </tr>
              ) : (
                applications.map(app => {
                  const cfg = STATUS_CONFIG[app.status] ?? { label: app.status, variant: 'neutral' as const };
                  return (
                    <tr
                      key={app.id}
                      onClick={() => router.push(`/admin/dealers/${app.id}`)}
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4">
                        <span className="text-[11px] font-mono font-bold text-slate-400">{fmtId(app.id)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-800 group-hover:text-[#005F63] transition-colors leading-tight">{app.applicant_name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{app.applicant_email}</p>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <p className="text-sm font-semibold text-slate-700">{app.company_name || '—'}</p>
                        {app.gst_number && <p className="text-[10px] text-slate-400 font-mono">{app.gst_number}</p>}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          {app.city && <Building2 className="w-3.5 h-3.5 text-slate-400" />}
                          <span className="text-sm text-slate-600">{app.city || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden xl:table-cell">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs text-slate-600">{fmt(app.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <StatusBadge label={cfg.label} variant={cfg.variant} />
                      </td>
                      <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <RowMenu
                          app={app}
                          onView={() => router.push(`/admin/dealers/${app.id}`)}
                          onApprove={() => setApproveTarget(app)}
                          onReject={() => { setRejectTarget(app); setRejectReason(''); }}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-50 bg-slate-50/30">
            <p className="text-xs text-slate-500 font-medium">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 text-xs font-bold rounded-lg transition-all
                      ${p === page ? 'bg-[#005F63] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                    {p}
                  </button>
                );
              })}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Approve Modal ─────────────────────────────────────────── */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Approve Application</h3>
                <p className="text-xs text-slate-400 mt-0.5">Enables Dealer Portal access and Dealer Pricing.</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 mb-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Applicant</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{approveTarget.applicant_name}</p>
              <p className="text-xs text-slate-400">{approveTarget.company_name}</p>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => setApproveTarget(null)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >Cancel</button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >{actionLoading ? 'Approving…' : 'Approve'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ─────────────────────────────────────────── */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Reject Application</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action will be logged and the applicant notified.</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Applicant</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{rejectTarget.applicant_name}</p>
              <p className="text-xs text-slate-400">{rejectTarget.company_name}</p>
            </div>

            <label className="block mb-2">
              <span className="text-xs font-bold text-slate-700">Rejection Reason <span className="text-rose-500">*</span></span>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Provide a clear reason for rejection…"
                className="mt-1.5 w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#005F63] focus:ring-2 focus:ring-[#005F63]/10 transition-all placeholder:text-slate-400 resize-none"
              />
            </label>
            <p className="text-[10px] text-slate-400 mb-5">The reason is stored internally in the activity log.</p>

            <div className="flex gap-2.5">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!rejectReason.trim() || actionLoading}
                onClick={handleReject}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Rejecting…' : 'Reject Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealersPage;
