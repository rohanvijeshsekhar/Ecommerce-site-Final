'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download,
  Eye,
  SlidersHorizontal,
  Search,
  Calendar,
  X,
  Package,
} from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { useBreadcrumbSync } from '../contexts/BreadcrumbContext';
import StatCard from '../components/StatCard';
import type { ColumnDef } from '../types/admin';
import { adminOrdersService } from '../services/adminService';
import type { OrderDetail } from '../../services/ordersService';

const OrdersPage: React.FC = () => {
  useBreadcrumbSync([
    { label: 'Operations' },
    { label: 'Orders', path: '/admin/orders' },
  ]);

  const router = useRouter();
  const toast = useToast();

  // State
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_orders: 0,
    pending_payment: 0,
    processing: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    total_sales: 0,
  });

  // Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Load Data
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        page_size: pageSize,
      };

      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await adminOrdersService.getOrders(params);
      if (res.success && res.data) {
        setOrders(res.data);
        
        // Extract stats and pagination from API meta envelope
        const meta = (res as any).meta || {};
        if (meta.stats) {
          setStats(meta.stats);
        }
        if (meta.pagination) {
          setTotal(meta.pagination.total);
        } else {
          setTotal(res.data.length);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load orders data.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, startDate, endDate, toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleExportCSV = async () => {
    try {
      toast.info('Preparing CSV export...');
      await adminOrdersService.downloadExportCSV();
      toast.success('CSV downloaded successfully.');
    } catch (err) {
      toast.error('Failed to export CSV.');
    }
  };

  // Maps order status string to admin status badge variants
  const getStatusVariant = (status: OrderDetail['status']) => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'shipped':
        return 'info';
      case 'packed':
        return 'purple';
      case 'processing':
        return 'warning';
      case 'pending_payment':
        return 'neutral';
      case 'cancelled':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const getStatusLabel = (status: OrderDetail['status']) => {
    switch (status) {
      case 'pending_payment':
        return 'Pending Payment';
      case 'processing':
        return 'Processing';
      case 'packed':
        return 'Packed';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const columns: ColumnDef<OrderDetail>[] = [
    {
      key: 'order_number',
      header: 'Order Details',
      sortable: true,
      render: (_, row) => (
        <div className="text-left font-sans">
          <p className="font-extrabold text-[#006670] text-xs hover:underline cursor-pointer" onClick={() => router.push(`/admin/orders/${row.id}`)}>
            {row.order_number || `ORD-${row.id.slice(0, 8).toUpperCase()}`}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            Invoice: {row.invoice_number || 'Pending'}
          </p>
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      sortable: true,
      render: (_, row) => (
        <div className="text-left">
          <p className="text-xs font-bold text-slate-700">
            {new Date(row.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            {new Date(row.created_at).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      ),
    },
    {
      key: 'customer_name',
      header: 'Customer',
      render: (_, row) => (
        <div className="text-left">
          <p className="text-xs font-extrabold text-slate-800 leading-snug">{row.customer_name}</p>
          <p className="text-[10px] text-slate-400 leading-normal">{row.customer_email}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Products Purchased',
      render: (_, row) => (
        <div className="text-left max-w-xs font-sans">
          <p className="text-xs font-bold text-slate-700 truncate">
            {row.items.map((i) => `${i.quantity} x ${i.product_name}`).join(', ')}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            {row.items.length} unique item(s)
          </p>
        </div>
      ),
    },
    {
      key: 'total_amount',
      header: 'Amount',
      sortable: true,
      render: (_, row) => (
        <div className="text-left">
          <p className="text-xs font-black text-slate-800">
            ₹{row.total_amount.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold text-[9px]">
            {row.payment_method}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (_, row) => (
        <StatusBadge
          label={getStatusLabel(row.status)}
          variant={getStatusVariant(row.status)}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <button
          onClick={() => router.push(`/admin/orders/${row.id}`)}
          className="p-1.5 hover:bg-slate-50 text-[#006670] hover:text-[#004e56] rounded-lg transition-colors cursor-pointer"
          title="View Order Details"
        >
          <Eye className="w-4.5 h-4.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 select-none text-left font-sans">
      <SectionHeader
        title="Customer Orders"
        subtitle="Monitor procurement logs, process shipments, and record payments."
        actions={
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-[#006670] text-xs font-black uppercase tracking-wider rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        }
      />

      {/* Stats Summary Widget */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          stat={{
            id: 'total_orders',
            label: "Total Orders",
            value: stats.total_orders,
            icon: "Package",
            variant: "teal",
            subValue: "All orders logged",
          }}
        />
        <StatCard
          stat={{
            id: 'pending_shipments',
            label: "Pending Shipments",
            value: stats.processing + stats.packed,
            icon: "Truck",
            variant: "orange",
            subValue: `${stats.processing} processing, ${stats.packed} packed`,
          }}
        />
        <StatCard
          stat={{
            id: 'delivered_orders',
            label: "Delivered Orders",
            value: stats.delivered,
            icon: "CheckCircle",
            variant: "green",
            subValue: "Fulfillments complete",
          }}
        />
        <StatCard
          stat={{
            id: 'gross_sales',
            label: "Gross Sales",
            value: `₹${stats.total_sales.toLocaleString('en-IN')}`,
            icon: "IndianRupee",
            variant: "teal",
            subValue: "Excludes cancellations",
          }}
        />
      </div>

      {/* Advanced Filter Tool */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-4.5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick Search */}
          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order #, Customer Name, Product..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#006670] bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-bold cursor-pointer transition-all
                ${showFilters 
                  ? 'border-[#006670] bg-[#e6f3f5]/20 text-[#006670]' 
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Advanced Filters
            </button>
            {(search || statusFilter !== 'all' || startDate || endDate) && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Filters Panel */}
        {showFilters && (
          <div className="pt-4.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4.5 animate-in slide-in-from-top-2 duration-200">
            {/* Status */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#006670]"
              >
                <option value="all">All Statuses</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="processing">Processing</option>
                <option value="packed">Packed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Date Range Start */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Start Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-slate-200 pl-3.5 pr-8 py-2 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#006670]"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Date Range End */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">End Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-slate-200 pl-3.5 pr-8 py-2 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#006670]"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Orders Table Container */}
      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        emptyState={
          <EmptyState
            title="No orders found"
            description="There are no orders matching your search or filters."
            icon={<Package className="w-8 h-8" />}
            action={
              (search || statusFilter !== 'all' || startDate || endDate) ? (
                <button
                  onClick={handleClearFilters}
                  className="mt-4 px-4 py-2 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold uppercase rounded-lg shadow cursor-pointer transition-colors"
                >
                  Clear Filters
                </button>
              ) : undefined
            }
          />
        }
      />
    </div>
  );
};

export default OrdersPage;
