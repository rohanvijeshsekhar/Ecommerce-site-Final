'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserCheck, UserX,
  Download, Printer, Eye, Trash2,
  X, Info, SlidersHorizontal, MoreVertical
} from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { useBreadcrumbSync } from '../contexts/BreadcrumbContext';
import type { ColumnDef, Customer } from '../types/admin';
import { adminCustomersService } from '../services/adminService';
import StatCard from '../components/StatCard';


const CustomersPage: React.FC = () => {
  useBreadcrumbSync([
    { label: 'Customers & dealers' },
    { label: 'Customers', path: '/admin/customers' },
  ]);

  const router = useRouter();
  const toast = useToast();

  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<any>({
    total_customers: 0,
    active_customers: 0,
    blocked_customers: 0,
    new_customers_this_month: 0,
    total_revenue: 0,
    repeat_customers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked' | 'deactivated'>('all');
  const [cityFilter, setCityFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  // Dialog triggers
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const [blockTarget, setBlockTarget] = useState<Customer | null>(null);
  const [unblockTarget, setUnblockTarget] = useState<Customer | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Customer | null>(null);
  const [activateTarget, setActivateTarget] = useState<Customer | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // active menu state for Actions dropdown
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setActiveMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Load Data
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        page_size: pageSize,
      };

      if (search.trim()) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (cityFilter.trim()) params.city = cityFilter;
      if (tagFilter.trim()) params.tag = tagFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await adminCustomersService.getAll(params);
      if (res.success && res.data) {
        setCustomers(res.data);
        if (res.pagination) {
          setTotal(res.pagination.total);
        } else if ((res as any).meta) {
          setTotal(((res as any).meta).count || res.data.length);
        } else {
          setTotal(res.data.length);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load customers data.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, cityFilter, tagFilter, startDate, endDate, toast]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await adminCustomersService.getStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load customer stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    fetchStats();
  }, []);



  // Account Control Actions
  const handleBlockConfirm = async () => {
    if (!blockTarget) return;
    setActionLoading(true);
    try {
      const res = await adminCustomersService.block(blockTarget.id);
      if (res.success) {
        toast.success(`Blocked customer ${blockTarget.full_name}.`);
        setBlockTarget(null);
        fetchCustomers();
        fetchStats();
      }
    } catch (err) {
      toast.error('Failed to block customer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockConfirm = async () => {
    if (!unblockTarget) return;
    setActionLoading(true);
    try {
      const res = await adminCustomersService.unblock(unblockTarget.id);
      if (res.success) {
        toast.success(`Unblocked customer ${unblockTarget.full_name}.`);
        setUnblockTarget(null);
        fetchCustomers();
        fetchStats();
      }
    } catch (err) {
      toast.error('Failed to unblock customer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivateTarget) return;
    setActionLoading(true);
    try {
      const res = await adminCustomersService.deactivate(deactivateTarget.id);
      if (res.success) {
        toast.success(`Deactivated customer ${deactivateTarget.full_name}.`);
        setDeactivateTarget(null);
        fetchCustomers();
        fetchStats();
      }
    } catch (err) {
      toast.error('Failed to deactivate customer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateConfirm = async () => {
    if (!activateTarget) return;
    setActionLoading(true);
    try {
      const res = await adminCustomersService.activate(activateTarget.id);
      if (res.success) {
        toast.success(`Activated customer ${activateTarget.full_name}.`);
        setActivateTarget(null);
        fetchCustomers();
        fetchStats();
      }
    } catch (err) {
      toast.error('Failed to activate customer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminCustomersService.delete(deleteTarget.id);
      if (res.success) {
        toast.success(`Soft-deleted customer account ${deleteTarget.full_name}.`);
        setDeleteTarget(null);
        fetchCustomers();
        fetchStats();
      }
    } catch (err) {
      toast.error('Failed to delete customer.');
    } finally {
      setDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCityFilter('');
    setTagFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    toast.info('Filters reset.');
  };

  // Tabular Exports
  const handleExportCSV = () => {
    if (customers.length === 0) return toast.info('No data to export.');
    const headers = ['Customer ID', 'Full Name', 'Email', 'Phone', 'Profession', 'Clinic Name', 'GST Number', 'Date Joined', 'Status'];
    const rows = customers.map(c => [
      c.customer_id,
      c.full_name,
      c.email,
      c.phone_number || '—',
      c.profession || '—',
      c.clinic_name || '—',
      c.gst_number || '—',
      new Date(c.date_joined).toLocaleDateString(),
      c.is_blocked ? 'Blocked' : c.is_active ? 'Active' : 'Deactivated'
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `faazo_customers_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSV export downloaded successfully.');
  };

  const handleExportExcel = () => {
    if (customers.length === 0) return toast.info('No data to export.');
    const headers = ['Customer ID', 'Full Name', 'Email', 'Phone', 'Profession', 'Clinic Name', 'GST Number', 'Date Joined', 'Status'];
    const rows = customers.map(c => [
      c.customer_id,
      c.full_name,
      c.email,
      c.phone_number || '—',
      c.profession || '—',
      c.clinic_name || '—',
      c.gst_number || '—',
      new Date(c.date_joined).toLocaleDateString(),
      c.is_blocked ? 'Blocked' : c.is_active ? 'Active' : 'Deactivated'
    ]);
    const tabContent = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([tabContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `faazo_customers_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    toast.success('Excel export downloaded successfully.');
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // Columns definition
  const columns: ColumnDef<Customer>[] = [
    {
      key: 'full_name',
      header: 'Customer Name',
      sortable: true,
      render: (val, row) => (
        <div>
          <p className="font-bold text-slate-800 leading-tight">{String(val)}</p>
          <span className="text-[10px] text-slate-400 font-semibold">{row.customer_id}</span>
        </div>
      )
    },
    {
      key: 'email',
      header: 'Email / Phone',
      render: (_, row) => (
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-slate-600">{row.email}</p>
          {row.phone_number && <p className="text-[10px] text-slate-400 font-semibold">{row.phone_number}</p>}
        </div>
      )
    },
    {
      key: 'default_address',
      header: 'City / State',
      render: (_, row) => {
        const addr = row.default_address;
        return addr ? (
          <span className="text-xs text-slate-650 font-medium">{addr.city}, {addr.state}</span>
        ) : (
          <span className="text-xs text-slate-400 font-medium">No address</span>
        );
      }
    },
    {
      key: 'date_joined',
      header: 'Registered',
      sortable: true,
      render: (val) => (
        <span className="text-xs text-slate-600 font-medium">
          {new Date(String(val)).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      )
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (_, row) => {
        if (row.is_blocked) {
          return <StatusBadge label="Blocked" variant="error" />;
        }
        if (!row.is_active) {
          return <StatusBadge label="Deactivated" variant="neutral" />;
        }
        return <StatusBadge label="Active" variant="success" />;
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => {
        const isMenuOpen = activeMenuId === row.id;
        return (
          <div className="flex items-center justify-end gap-2 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => router.push(`/admin/customers/${row.id}`)}
              title="View CRM Profile"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-[#005B63]/30 hover:bg-[#005B63]/5 text-[#005B63] text-xs font-bold uppercase rounded-lg transition-colors bg-white cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setActiveMenuId(isMenuOpen ? null : row.id)}
                title="More Actions"
                className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-350 text-slate-500 hover:text-slate-750 bg-white hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-150 rounded-xl shadow-xl py-1.5 z-50 animate-[fadeInScale_0.15s_ease]">
                  {row.is_blocked ? (
                    <button
                      onClick={() => { setActiveMenuId(null); setUnblockTarget(row); }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50/50 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Unblock Account</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => { setActiveMenuId(null); setBlockTarget(row); }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50/50 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Block Account</span>
                    </button>
                  )}

                  {row.is_active ? (
                    <button
                      onClick={() => { setActiveMenuId(null); setDeactivateTarget(row); }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50/50 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Deactivate Login</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => { setActiveMenuId(null); setActivateTarget(row); }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-[#005B63] hover:bg-[#005B63]/5 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Activate Login</span>
                    </button>
                  )}

                  <hr className="border-slate-100 my-1" />

                  <button
                    onClick={() => { setActiveMenuId(null); setDeleteTarget(row); }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Soft Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      }
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeader
          title="Customer Accounts"
          subtitle="Manage registrations, clinic profiles, dealer applications, and audit timeline logs."
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              onClick={handleExportCSV}
              title="Export as CSV"
              className="p-2.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 border-r border-slate-100 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportExcel}
              title="Export as Excel"
              className="p-2.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 border-r border-slate-100 transition-colors font-bold text-[10px] px-3.5 flex items-center"
            >
              XLS
            </button>
            <button
              onClick={handlePrintPDF}
              title="Print PDF Layout"
              className="p-2.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-[fadeIn_0.3s_ease]">
        <StatCard
          stat={{
            id: 'total_cust',
            label: 'Total Customers',
            value: stats.total_customers,
            subValue: 'All registered dentists',
            variant: 'teal',
            icon: 'Users'
          }}
          loading={statsLoading}
        />
        <StatCard
          stat={{
            id: 'active_cust',
            label: 'Active Customers',
            value: stats.active_customers,
            subValue: 'Permitted to purchase',
            variant: 'green',
            icon: 'UserCheck'
          }}
          loading={statsLoading}
        />
        <StatCard
          stat={{
            id: 'blocked_cust',
            label: 'Blocked Customers',
            value: stats.blocked_customers,
            subValue: 'Restricted accounts',
            variant: 'red',
            icon: 'UserX'
          }}
          loading={statsLoading}
        />
        <StatCard
          stat={{
            id: 'new_cust',
            label: 'New This Month',
            value: stats.new_customers_this_month,
            subValue: 'Joined in last 30 days',
            variant: 'orange',
            icon: 'Calendar'
          }}
          loading={statsLoading}
        />
      </div>

      {/* Advanced Filters Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-bold text-sm border-b border-slate-50 pb-2.5">
          <SlidersHorizontal className="w-4 h-4 text-[#005B63]" />
          <span>Advanced Search & Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* Query search */}
          <div className="space-y-1.5 col-span-1 sm:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Search Query</label>
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, email, or mobile..."
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#005B63]/30 focus:border-[#005B63] outline-none"
            />
          </div>

          {/* Status filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Status</label>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#005B63]/30 focus:border-[#005B63] outline-none bg-white"
            >
              <option value="all">All Accounts</option>
              <option value="active">Active Only</option>
              <option value="blocked">Blocked Only</option>
              <option value="deactivated">Deactivated Only</option>
            </select>
          </div>

          {/* City filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter by City</label>
            <input
              type="text"
              value={cityFilter}
              onChange={e => { setCityFilter(e.target.value); setPage(1); }}
              placeholder="e.g. Mumbai"
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#005B63]/30 focus:border-[#005B63] outline-none"
            />
          </div>

          {/* Tag filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter by Tag</label>
            <input
              type="text"
              value={tagFilter}
              onChange={e => { setTagFilter(e.target.value); setPage(1); }}
              placeholder="e.g. VIP"
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#005B63]/30 focus:border-[#005B63] outline-none"
            />
          </div>

          {/* Date Joined Range */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Joined From</label>
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPage(1); }}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#005B63]/30 focus:border-[#005B63] outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Joined To</label>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPage(1); }}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#005B63]/30 focus:border-[#005B63] outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2 col-span-1 sm:col-span-2 md:col-span-1">
            <button
              onClick={handleResetFilters}
              className="w-full px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-bold uppercase rounded-xl transition-colors flex items-center justify-center gap-1.5 h-[38px] bg-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        </div>
      </div>

      {/* Info Card on Pending Modules */}
      <div className="flex items-start gap-3 bg-slate-50 border border-slate-200/65 rounded-2xl p-4.5">
        <Info className="w-5 h-5 text-slate-450 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-slate-700 leading-tight font-sans">Commerce Features Deferred</p>
          <p className="text-[11px] text-slate-450 mt-1.5 font-medium leading-relaxed font-sans">
            Revenue tracking, cart previews, and wishlist sync are currently deactivated in the backend. Customers data list displays active registrations, location attributes, and clinic files correctly. Detailed transaction tables will render empty indicators.
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="w-full max-w-full overflow-hidden">
        <DataTable
          columns={columns}
          data={customers}
          loading={loading}
          onRowClick={(row) => router.push(`/admin/customers/${row.id}`)}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          emptyState={
            <EmptyState
              title="No Customers Found"
              description="No customer accounts match your search or filter values. Clear active filters or create a new user profile."
              icon="Users"
            />
          }
        />
      </div>

      {/* Confirmation Overlays */}
      <ConfirmDialog
        isOpen={!!blockTarget}
        title="Block Customer Account"
        message={
          blockTarget ? (
            <span>
              Are you sure you want to block <strong>{blockTarget.full_name}</strong>? They will be flagged as blocked and restricted from ordering.
            </span>
          ) : ''
        }
        confirmLabel="Block Customer"
        variant="danger"
        loading={actionLoading}
        onClose={() => setBlockTarget(null)}
        onConfirm={handleBlockConfirm}
      />

      <ConfirmDialog
        isOpen={!!unblockTarget}
        title="Unblock Customer Account"
        message={
          unblockTarget ? (
            <span>
              Are you sure you want to unblock <strong>{unblockTarget.full_name}</strong>? This will restore standard order access immediately.
            </span>
          ) : ''
        }
        confirmLabel="Unblock"
        variant="default"
        loading={actionLoading}
        onClose={() => setUnblockTarget(null)}
        onConfirm={handleUnblockConfirm}
      />

      <ConfirmDialog
        isOpen={!!deactivateTarget}
        title="Deactivate Customer Account"
        message={
          deactivateTarget ? (
            <span>
              Are you sure you want to deactivate <strong>{deactivateTarget.full_name}</strong>? They will be unable to log in to the portal.
            </span>
          ) : ''
        }
        confirmLabel="Deactivate"
        variant="warning"
        loading={actionLoading}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivateConfirm}
      />

      <ConfirmDialog
        isOpen={!!activateTarget}
        title="Activate Customer Account"
        message={
          activateTarget ? (
            <span>
              Are you sure you want to activate <strong>{activateTarget.full_name}</strong>? This will restore portal login privileges.
            </span>
          ) : ''
        }
        confirmLabel="Activate"
        variant="default"
        loading={actionLoading}
        onClose={() => setActivateTarget(null)}
        onConfirm={handleActivateConfirm}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Customer Account"
        message={
          deleteTarget ? (
            <span>
              Are you sure you want to delete <strong>{deleteTarget.full_name}</strong>? This uses a secure soft-delete protection: their login will be suspended and catalog views archived, but database integrity is maintained.
            </span>
          ) : ''
        }
        confirmLabel="Delete Account"
        variant="danger"
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default CustomersPage;
