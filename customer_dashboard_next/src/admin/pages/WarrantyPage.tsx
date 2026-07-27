'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wrench, RefreshCw, Search,
  ChevronDown, Eye, Package, SlidersHorizontal, X
} from 'lucide-react';
import { warrantyService } from '../../services/warranty';
import type { WarrantyRegistration, WarrantyClaim, AdminWarrantyStats } from '../../services/warranty';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import { useToast } from '../components/Toast';
import { useBreadcrumbSync } from '../contexts/BreadcrumbContext';

const WarrantyPage: React.FC = () => {
  useBreadcrumbSync([
    { label: 'Operations' },
    { label: 'Warranties', path: '/admin/warranty' },
  ]);

  const router = useRouter();
  const toast = useToast();

  // Stats State
  const [stats, setStats] = useState<AdminWarrantyStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Tab State: 'claims' | 'registrations'
  const [activeTab, setActiveTab] = useState<'claims' | 'registrations'>('registrations');

  // Sub-filter States
  const [regSubFilter, setRegSubFilter] = useState<'pending_verification' | 'active' | 'rejected'>('pending_verification');
  const [claimSubFilter, setClaimSubFilter] = useState<string>('submitted');

  // List States
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [regs, setRegs] = useState<WarrantyRegistration[]>([]);
  const [loading, setLoading] = useState(false);

  // Search/Filters State
  const [searchCustomer, setSearchCustomer] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await warrantyService.getAdminDashboard();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        page_size: pageSize,
      };

      if (searchCustomer.trim()) params.customer = searchCustomer.trim();
      if (filterRole) params.role = filterRole;
      if (searchProduct.trim()) params.product = searchProduct.trim();
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      if (activeTab === 'claims') {
        params.status = claimSubFilter;
        const res = await warrantyService.getAdminClaims(params);
        if (res.success && res.data) {
          setClaims(res.data);
          const meta = (res as any).meta || {};
          if (meta.pagination) {
            setTotalPages(meta.pagination.total_pages);
          }
        }
      } else {
        params.status = regSubFilter;
        const res = await warrantyService.getAdminRegistrations(params);
        if (res.success && res.data) {
          setRegs(res.data);
          const meta = (res as any).meta || {};
          if (meta.pagination) {
            setTotalPages(meta.pagination.total_pages);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load list data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, regSubFilter, claimSubFilter, page, searchCustomer, filterRole, searchProduct, startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab, regSubFilter, claimSubFilter, searchCustomer, filterRole, searchProduct, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResetFilters = () => {
    setSearchCustomer('');
    setFilterRole('');
    setSearchProduct('');
    setStartDate('');
    setEndDate('');
    toast.info('Filters reset.');
  };

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

  const getRegistrationStatusBadge = (statusVal: string) => {
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

  const hasFilters = filterRole || searchProduct || startDate || endDate;

  return (
    <div className="space-y-8 text-left font-sans select-none">
      {/* Page Header */}
      <SectionHeader
        title="Warranty Operations"
        subtitle="Verify manual customer registration submissions and resolve equipment trouble tickets."
        actions={
          <button
            onClick={() => { fetchStats(); fetchData(); toast.success('Sync complete.'); }}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all cursor-pointer bg-white"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Dashboard
          </button>
        }
      />

      {/* Analytics Summary */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => <div key={n} className="h-24 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            stat={{
              id: 'regs_pending_verification',
              label: 'Verification Backlog',
              value: stats.regs_pending_verification,
              variant: 'orange',
              icon: 'AlertCircle',
              subValue: `${stats.regs_approved} Total Approved Assets`
            }}
          />
          <StatCard
            stat={{
              id: 'claims_submitted',
              label: 'Claims Submitted',
              value: stats.claims_submitted,
              variant: 'teal',
              icon: 'Wrench',
              subValue: `${stats.claims_under_review} Under Review`
            }}
          />
          <StatCard
            stat={{
              id: 'claims_repair_in_progress',
              label: 'In Workshop',
              value: stats.claims_repair_in_progress,
              variant: 'purple',
              icon: 'RefreshCw',
              subValue: `${stats.claims_assigned} Provider Assigned`
            }}
          />
          <StatCard
            stat={{
              id: 'claims_completed',
              label: 'Resolved Claims',
              value: stats.claims_completed,
              variant: 'green',
              icon: 'CheckCircle',
              subValue: `${stats.claims_closed} Claims Closed`
            }}
          />
        </div>
      ) : null}

      {/* Main Tabs */}
      <div className="flex border-b border-slate-100">
        <button
          onClick={() => setActiveTab('registrations')}
          className={`px-5 py-3.5 text-xs font-black uppercase tracking-widest border-b-2 cursor-pointer transition-all ${
            activeTab === 'registrations'
              ? 'border-[#005B63] text-[#005B63]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Warranty Registrations
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-5 py-3.5 text-xs font-black uppercase tracking-widest border-b-2 cursor-pointer transition-all ${
            activeTab === 'claims'
              ? 'border-[#005B63] text-[#005B63]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Warranty Claims
        </button>
      </div>

      {/* Primary Search & Quick Filters Pill Container */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Primary Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input
              value={searchCustomer}
              onChange={e => setSearchCustomer(e.target.value)}
              placeholder="Search by customer name, email..."
              className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#005B63] focus:ring-2 focus:ring-[#005B63]/10 transition-all placeholder:text-slate-400"
            />
            {searchCustomer && (
              <button onClick={() => setSearchCustomer('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sub-status quick filter pills */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {activeTab === 'registrations' ? (
              <>
                <button
                  onClick={() => setRegSubFilter('pending_verification')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg capitalize transition-all ${
                    regSubFilter === 'pending_verification' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Pending ({stats?.regs_pending_verification || 0})
                </button>
                <button
                  onClick={() => setRegSubFilter('active')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg capitalize transition-all ${
                    regSubFilter === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Approved ({stats?.regs_approved || 0})
                </button>
                <button
                  onClick={() => setRegSubFilter('rejected')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg capitalize transition-all ${
                    regSubFilter === 'rejected' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Rejected ({stats?.regs_rejected || 0})
                </button>
              </>
            ) : (
              <>
                {[
                  { id: 'submitted', label: 'Submitted' },
                  { id: 'under_review', label: 'Under Review' },
                  { id: 'approved', label: 'Approved' },
                  { id: 'assigned', label: 'Assigned' },
                  { id: 'repair_in_progress', label: 'In Repair' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'closed', label: 'Closed' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setClaimSubFilter(tab.id)}
                    className={`px-3 py-2 text-xs font-bold rounded-lg capitalize transition-all ${
                      claimSubFilter === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Sliders toggle for advanced filters */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-all cursor-pointer bg-white ${
              showFilters ? 'bg-[#005B63] text-white border-[#005B63]' : 'text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters {hasFilters && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />}
          </button>

          {hasFilters && (
            <button onClick={handleResetFilters} className="text-xs text-rose-600 font-semibold hover:underline flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Expandable Advanced Filters Tray */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-100 animate-fade-in">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">User Account Role</label>
              <div className="relative">
                <select
                  value={filterRole}
                  onChange={e => setFilterRole(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-1.5 text-xs border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-[#005B63]"
                >
                  <option value="">All Account Roles</option>
                  <option value="customer">Customer (Practitioner)</option>
                  <option value="dealer">Authorized Dealer</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Product Allocation</label>
              <input
                type="text"
                value={searchProduct}
                onChange={e => setSearchProduct(e.target.value)}
                placeholder="Search by equipment name..."
                className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-[#005B63]"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Purchase From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-1 text-xs border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-[#005B63]"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Purchase To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-1 text-xs border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-[#005B63]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main List Container */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#005B63]" />
            <p className="text-xs font-bold uppercase tracking-wider">Synchronizing registry ledger...</p>
          </div>
        ) : activeTab === 'registrations' ? (
          regs.length === 0 ? (
            <EmptyState
              title="No registrations found"
              description="There are no warranty registrations matching the status filter."
              icon={<Package className="w-8 h-8 text-slate-300" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    <th className="p-4">Reg Ref</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Product Details</th>
                    <th className="p-4">Serial Number</th>
                    <th className="p-4">Purchase Date</th>
                    <th className="p-4">Expiry Date</th>
                    <th className="p-4">Verification Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {regs.map(reg => (
                    <tr key={reg.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-500">#{reg.id.substring(0, 8).toUpperCase()}</td>
                      <td className="p-4">
                        <p className="font-bold text-slate-700">{reg.user?.full_name}</p>
                        <span className="text-[10px] text-slate-400 capitalize">{reg.user?.role}</span>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-700 truncate max-w-[180px]">{reg.product?.name}</p>
                        <span className="text-[10px] text-slate-400 block">SKU: {reg.product?.sku}</span>
                      </td>
                      <td className="p-4 font-mono font-black text-slate-700">
                        {reg.serial_number || <span className="text-slate-300 italic font-normal">Not Provided</span>}
                      </td>
                      <td className="p-4 text-slate-600 font-medium">{reg.purchase_date}</td>
                      <td className="p-4 text-slate-600 font-medium">{reg.warranty_end}</td>
                      <td className="p-4">{getRegistrationStatusBadge(reg.warranty_status)}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => router.push(`/admin/warranty/registrations/${reg.id}`)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-700 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          claims.length === 0 ? (
            <EmptyState
              title="No warranty claims found"
              description="There are no active warranty claims matching the status filter."
              icon={<Wrench className="w-8 h-8 text-slate-300" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    <th className="p-4">Claim Ref</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Equipment Details</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Assigned Provider</th>
                    <th className="p-4">Date Filed</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {claims.map(claim => (
                    <tr key={claim.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4 font-black text-slate-800 font-mono">{claim.claim_number}</td>
                      <td className="p-4">
                        <p className="font-bold text-slate-700">{claim.registration_detail?.user?.full_name}</p>
                        <span className="text-[10px] text-slate-400 capitalize">{claim.registration_detail?.user?.role}</span>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-700 truncate max-w-[180px]">{claim.registration_detail?.product?.name}</p>
                        <span className="text-[10px] text-slate-400 block font-mono">S/N: {claim.registration_detail?.serial_number || 'N/A'}</span>
                      </td>
                      <td className="p-4">{getPriorityBadge(claim.priority)}</td>
                      <td className="p-4">{getStatusBadge(claim.status)}</td>
                      <td className="p-4 text-slate-600 font-bold">{claim.assigned_provider || '—'}</td>
                      <td className="p-4 text-slate-400 font-medium">
                        {new Date(claim.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => router.push(`/admin/warranty/claims/${claim.id}`)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-700 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-50 flex items-center justify-between text-xs font-semibold text-slate-500 bg-white">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 cursor-pointer bg-white transition-all"
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 cursor-pointer bg-white transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarrantyPage;
