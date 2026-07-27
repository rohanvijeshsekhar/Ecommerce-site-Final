'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  HeadphonesIcon, RefreshCw, Search, ChevronDown, ChevronRight, SlidersHorizontal, X
} from 'lucide-react';
import { supportService } from '../../services/support';
import type { SupportTicket } from '../../services/support';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import { useToast } from '../components/Toast';
import { useBreadcrumbSync } from '../contexts/BreadcrumbContext';

const SupportPage: React.FC = () => {
  useBreadcrumbSync([
    { label: 'Operations' },
    { label: 'Support Desk', path: '/admin/support' },
  ]);

  const router = useRouter();
  const toast = useToast();

  // List & Stats state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Search/Filters State
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        page_size: pageSize,
      };

      if (search.trim()) params.search = search.trim();
      if (filterCategory) params.category = filterCategory;
      if (filterPriority) params.priority = filterPriority;
      if (filterStatus) params.status = filterStatus;
      if (filterRole) params.role = filterRole;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await supportService.getTickets(params);
      if (res.success && res.data) {
        setTickets(res.data);
        const meta = (res as any).meta || {};
        if (meta.pagination) {
          setTotalPages(meta.pagination.total_pages);
        }
        if (meta.stats) {
          setStats(meta.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load support tickets:', err);
      toast.error('Failed to load support tickets.');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCategory, filterPriority, filterStatus, filterRole, startDate, endDate]);

  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, filterPriority, filterStatus, filterRole, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResetFilters = () => {
    setSearch('');
    setFilterCategory('');
    setFilterPriority('');
    setFilterStatus('');
    setFilterRole('');
    setStartDate('');
    setEndDate('');
    toast.info('Filters reset.');
  };

  const categoryLabels: Record<string, string> = {
    product_enquiry: 'Product Enquiry',
    technical_assistance: 'Technical Assistance',
    installation_help: 'Installation Help',
    order_issue: 'Order Issue',
    delivery_issue: 'Delivery Issue',
    billing_issue: 'Billing Issue',
    dealer_support: 'Dealer Support',
    general_complaint: 'General Complaint',
    general_feedback: 'General Feedback',
    other: 'Other Support Requests',
  };

  const getStatusBadge = (statusVal: string) => {
    switch (statusVal) {
      case 'open':
        return <StatusBadge variant="info" label="Open" />;
      case 'in_progress':
        return <StatusBadge variant="warning" label="In Progress" />;
      case 'waiting_customer':
        return <StatusBadge variant="purple" label="Waiting on User" />;
      case 'resolved':
        return <StatusBadge variant="success" label="Resolved" />;
      case 'closed':
        return <StatusBadge variant="neutral" label="Closed" />;
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

  const hasFilters = filterCategory || filterPriority || filterRole || startDate || endDate;

  return (
    <div className="space-y-8 text-left font-sans select-none">
      {/* Header */}
      <SectionHeader
        title="FAAZO Support Desk"
        subtitle="Manage customer queries, product enquiries, and order business escalations."
        actions={
          <button
            onClick={() => { fetchData(); toast.success('Queue refreshed.'); }}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all cursor-pointer bg-white"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Tickets
          </button>
        }
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          stat={{
            id: 'open',
            label: 'Open',
            value: stats?.open ?? 0,
            variant: 'blue',
            icon: 'AlertCircle'
          }}
        />
        <StatCard
          stat={{
            id: 'in_progress',
            label: 'In Progress',
            value: stats?.in_progress ?? 0,
            variant: 'orange',
            icon: 'Clock'
          }}
        />
        <StatCard
          stat={{
            id: 'waiting_customer',
            label: 'Waiting User',
            value: stats?.waiting_customer ?? 0,
            variant: 'purple',
            icon: 'HelpCircle'
          }}
        />
        <StatCard
          stat={{
            id: 'resolved',
            label: 'Resolved',
            value: stats?.resolved ?? 0,
            variant: 'green',
            icon: 'CheckCircle'
          }}
        />
        <StatCard
          stat={{
            id: 'closed',
            label: 'Closed',
            value: stats?.closed ?? 0,
            variant: 'teal',
            icon: 'X'
          }}
        />
        <StatCard
          stat={{
            id: 'high_priority',
            label: 'High Priority',
            value: stats?.high_priority ?? 0,
            variant: 'red',
            icon: 'AlertTriangle'
          }}
        />
      </div>

      {/* Filters Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Keywords */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by ticket #, user name, subject..."
              className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#005B63] focus:ring-2 focus:ring-[#005B63]/10 transition-all placeholder:text-slate-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick status filter pills */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {[
              { id: '', label: 'All' },
              { id: 'open', label: 'Open' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'waiting_customer', label: 'Waiting User' },
              { id: 'resolved', label: 'Resolved' },
              { id: 'closed', label: 'Closed' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-4 py-2 text-xs font-bold rounded-lg capitalize transition-all ${
                  filterStatus === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
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
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

        {/* Expandable Advanced Filters Tray */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 pt-3 border-t border-slate-100 animate-fade-in">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
              <div className="relative">
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-1.5 text-xs border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-[#005B63]"
                >
                  <option value="">All Categories</option>
                  {Object.entries(categoryLabels).map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Priority</label>
              <div className="relative">
                <select
                  value={filterPriority}
                  onChange={e => setFilterPriority(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-1.5 text-xs border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-[#005B63]"
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">User Role</label>
              <div className="relative">
                <select
                  value={filterRole}
                  onChange={e => setFilterRole(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-1.5 text-xs border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-[#005B63]"
                >
                  <option value="">All Roles</option>
                  <option value="customer">Customers Only</option>
                  <option value="dealer">Dealers Only</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-1 text-xs border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-[#005B63]"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
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

      {/* Tickets List */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs font-semibold text-slate-400">Loading Support queue...</div>
        ) : tickets.length === 0 ? (
          <EmptyState
            title="No support tickets found"
            description="There are no tickets matching the filter criteria."
            icon={<HeadphonesIcon className="w-8 h-8 text-slate-300" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="p-4 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Ticket Number</th>
                  <th className="p-4 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">User (Role)</th>
                  <th className="p-4 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Subject</th>
                  <th className="p-4 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Category</th>
                  <th className="p-4 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Priority</th>
                  <th className="p-4 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Status</th>
                  <th className="p-4 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Assigned Admin</th>
                  <th className="p-4 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Created Date</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/admin/support/${t.id}`)}
                    className="hover:bg-slate-50/40 cursor-pointer transition-colors"
                  >
                    <td className="p-4 text-xs font-bold text-slate-800 font-mono">{t.ticket_number}</td>
                    <td className="p-4 text-xs">
                      <p className="font-bold text-slate-700">{t.customer_detail.full_name}</p>
                      <span className="inline-block text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider mt-0.5 bg-slate-100 text-slate-600">
                        {t.customer_detail.role}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-semibold text-slate-700 max-w-[200px] truncate">{t.subject}</td>
                    <td className="p-4 text-xs font-medium text-slate-500">{categoryLabels[t.category] || t.category}</td>
                    <td className="p-4 text-xs">{getPriorityBadge(t.priority)}</td>
                    <td className="p-4 text-xs">{getStatusBadge(t.status)}</td>
                    <td className="p-4 text-xs font-semibold text-slate-600">
                      {t.assigned_admin_detail ? t.assigned_admin_detail.full_name : <span className="text-slate-400 font-medium italic">— Unassigned —</span>}
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-500">
                      {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-slate-50 bg-white">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer bg-white"
            >
              Previous
            </button>
            <span className="text-xs font-medium text-slate-400">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer bg-white"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportPage;
