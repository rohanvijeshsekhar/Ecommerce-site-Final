import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, Package, RefreshCw, Search, Filter, Eye,
  Clock, CheckCircle2, AlertTriangle,
  Calendar, ChevronRight, RotateCcw,
  CheckSquare
} from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { useBreadcrumbSync } from '../contexts/BreadcrumbContext';
import type { ColumnDef } from '../types/admin';
import {
  adminShippingService,
  SHIPMENT_STATUS_LABELS,
  PACKING_STATUS_LABELS,
} from '../../services/shippingService';
import type { ShipmentListItem, ShipmentStatus, Shipment, FulfillmentStats } from '../../services/shippingService';
import { ShipmentDetailsDrawer } from '../components/shipping/ShipmentDetailsDrawer';

// ── Helpers ────────────────────────────────────────────────────────────────────

const getShipmentVariant = (status: ShipmentStatus): 'success' | 'info' | 'warning' | 'error' | 'purple' | 'neutral' => {
  switch (status) {
    case 'delivered':        return 'success';
    case 'out_for_delivery': return 'info';
    case 'in_transit':       return 'info';
    case 'picked_up':        return 'purple';
    case 'pickup_scheduled': return 'warning';
    case 'created':          return 'warning';
    case 'failed_delivery':  return 'error';
    case 'cancelled':        return 'error';
    case 'rto_initiated':    return 'error';
    default:                 return 'neutral';
  }
};

const ALL_STATUSES: ShipmentStatus[] = [
  'created', 'pickup_scheduled', 'picked_up', 'reached_hub',
  'in_transit', 'out_for_delivery', 'delivered',
  'failed_delivery', 'rto_initiated', 'cancelled',
];

// ── Component ──────────────────────────────────────────────────────────────────

const FulfillmentPage: React.FC = () => {
  useBreadcrumbSync([
    { label: 'Operations' },
    { label: 'Fulfillment', path: '/admin/fulfillment' },
  ]);

  const toast = useToast();

  const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
  const [stats, setStats] = useState<FulfillmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Selected Shipment for Side Drawer
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [packingFilter, setPackingFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, page_size: pageSize };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (packingFilter !== 'all') params.packing_status = packingFilter;
      if (paymentFilter !== 'all') params.payment_type = paymentFilter;
      if (orderTypeFilter !== 'all') params.order_type = orderTypeFilter;
      if (stateFilter.trim()) params.state = stateFilter.trim();
      if (cityFilter.trim()) params.city = cityFilter.trim();
      if (pickupDate) params.pickup_date = pickupDate;
      if (deliveryDate) params.delivery_date = deliveryDate;

      const [shipmentsRes, statsRes] = await Promise.all([
        adminShippingService.listShipments(params),
        adminShippingService.getStats(),
      ]);

      if (shipmentsRes.success && shipmentsRes.data) {
        setShipments(shipmentsRes.data);
        setTotal((shipmentsRes as any).meta?.pagination?.total || 0);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load shipments.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, packingFilter, paymentFilter, orderTypeFilter, stateFilter, cityFilter, pickupDate, deliveryDate, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOpenDrawer = async (shipmentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await adminShippingService.getShipment(shipmentId);
      if (res.success && res.data) {
        setSelectedShipment(res.data);
        setIsDrawerOpen(true);
      } else {
        toast.error('Failed to load shipment details.');
      }
    } catch {
      toast.error('Error fetching shipment detail.');
    }
  };

  const handleSyncTracking = async (shipmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSyncing(shipmentId);
    try {
      const res = await adminShippingService.syncTracking(shipmentId);
      if (res.success) {
        toast.success(res.message || 'Tracking synced.');
        fetchData();
        if (selectedShipment && selectedShipment.id === shipmentId) {
          handleOpenDrawer(shipmentId);
        }
      } else {
        toast.error(res.message || 'Sync failed.');
      }
    } catch {
      toast.error('Failed to sync tracking.');
    } finally {
      setSyncing(null);
    }
  };

  const handleBulkAction = async (action: 'sync' | 'pickup' | 'cancel') => {
    if (selectedIds.length === 0) return;
    if (action === 'cancel' && !window.confirm(`Are you sure you want to cancel ${selectedIds.length} shipment(s)?`)) return;

    setBulkActionLoading(true);
    try {
      const res = await adminShippingService.bulkAction(action, selectedIds);
      if (res.success) {
        toast.success(res.message);
        setSelectedIds([]);
        fetchData();
      } else {
        toast.error(res.message || 'Bulk action failed.');
      }
    } catch {
      toast.error('Failed to execute bulk action.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // ── Table columns ────────────────────────────────────────
  const columns: ColumnDef<ShipmentListItem>[] = [
    {
      key: 'awb_number',
      header: 'AWB / Shipment',
      render: (_: unknown, row: ShipmentListItem) => (
        <div>
          <p className="text-xs font-black text-slate-800 font-mono">{row.awb_number || 'Pending AWB'}</p>
          <p className="text-[10px] font-bold text-indigo-600 font-mono mt-0.5">{row.shipment_number || row.order_number}</p>
        </div>
      ),
    },
    {
      key: 'customer_name',
      header: 'Order & Customer',
      render: (_: unknown, row: ShipmentListItem) => (
        <div>
          <p className="text-xs font-bold text-slate-800">{row.customer_name}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Order: {row.order_number}</p>
        </div>
      ),
    },
    {
      key: 'courier_name',
      header: 'Courier',
      render: (_: unknown, row: ShipmentListItem) => (
        <div className="flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5 text-[#006670]" />
          <span className="text-xs font-bold text-slate-700">{row.courier_name}</span>
        </div>
      ),
    },
    {
      key: 'shipment_status',
      header: 'Shipment Status',
      render: (_: unknown, row: ShipmentListItem) => (
        <StatusBadge
          label={SHIPMENT_STATUS_LABELS[row.shipment_status] || row.shipment_status}
          variant={getShipmentVariant(row.shipment_status)}
        />
      ),
    },
    {
      key: 'packing_status',
      header: 'Packing Status',
      render: (_: unknown, row: ShipmentListItem) => (
        <span className="text-[11px] font-semibold text-slate-600 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
          {PACKING_STATUS_LABELS[row.packing_status] || row.packing_status}
        </span>
      ),
    },
    {
      key: 'current_location',
      header: 'Location / State',
      render: (_: unknown, row: ShipmentListItem) => (
        <div className="flex flex-col text-xs text-slate-500">
          <span className="font-medium text-slate-700 truncate max-w-[130px]">{row.current_location || 'Warehouse Hub'}</span>
          {row.state && <span className="text-[10px] text-slate-400">{row.city ? `${row.city}, ` : ''}{row.state}</span>}
        </div>
      ),
    },
    {
      key: 'estimated_delivery_date',
      header: 'EDD',
      render: (_: unknown, row: ShipmentListItem) => (
        <div className="flex items-center gap-1 text-xs">
          <Calendar className="w-3 h-3 text-slate-400" />
          <span className="text-slate-600 font-medium">
            {row.estimated_delivery_date
              ? new Date(row.estimated_delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              : '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: unknown, row: ShipmentListItem) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => handleSyncTracking(row.id, e)}
            disabled={syncing === row.id}
            title="Sync tracking"
            className="p-1.5 rounded-lg border border-slate-200 hover:border-[#006670] hover:text-[#006670] text-slate-500 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing === row.id ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={(e) => handleOpenDrawer(row.id, e)}
            title="View shipment details"
            className="p-1.5 rounded-lg border border-slate-200 hover:border-[#006670] hover:text-[#006670] text-slate-500 transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // ── Stats Cards ───────────────────────────────────────────────────────────────
  // ── Stats Cards ───────────────────────────────────────────────────────────────
  const statCards = stats
    ? [
        {
          label: 'Total Shipments',
          value: stats.total_shipments,
          icon: <Truck className="w-4 h-4" />,
          cardStyle: 'bg-gradient-to-br from-[#f8fafc]/95 via-[#f1f5f9]/70 to-[#e2e8f0]/60 border-slate-200/90 shadow-xs shadow-slate-100/50',
          textColor: 'text-slate-800',
          labelColor: 'text-slate-500',
          iconStyle: 'bg-white/90 border border-slate-200/80 text-slate-700',
        },
        {
          label: 'Pending Packing',
          value: stats.pending_packing,
          icon: <Package className="w-4 h-4" />,
          cardStyle: 'bg-gradient-to-br from-[#fffbeb]/95 via-[#fef3c7]/70 to-[#fde68a]/50 border-amber-200/90 shadow-xs shadow-amber-100/50',
          textColor: 'text-amber-900',
          labelColor: 'text-amber-700/80',
          iconStyle: 'bg-white/90 border border-amber-200/80 text-amber-600',
        },
        {
          label: 'Pickup Pending',
          value: stats.pickup_scheduled + stats.created,
          icon: <Clock className="w-4 h-4" />,
          cardStyle: 'bg-gradient-to-br from-[#eff6ff]/95 via-[#dbeafe]/70 to-[#bfdbfe]/50 border-blue-200/90 shadow-xs shadow-blue-100/50',
          textColor: 'text-blue-900',
          labelColor: 'text-blue-700/80',
          iconStyle: 'bg-white/90 border border-blue-200/80 text-blue-600',
        },
        {
          label: 'In Transit',
          value: stats.in_transit + stats.picked_up + stats.reached_hub,
          icon: <ChevronRight className="w-4 h-4" />,
          cardStyle: 'bg-gradient-to-br from-[#faf5ff]/95 via-[#f3e8ff]/70 to-[#e9d5ff]/50 border-purple-200/90 shadow-xs shadow-purple-100/50',
          textColor: 'text-purple-900',
          labelColor: 'text-purple-700/80',
          iconStyle: 'bg-white/90 border border-purple-200/80 text-purple-600',
        },
        {
          label: 'Out for Delivery',
          value: stats.out_for_delivery,
          icon: <Truck className="w-4 h-4" />,
          cardStyle: 'bg-gradient-to-br from-[#f0fdfa]/95 via-[#ccfbf1]/70 to-[#99f6e4]/50 border-teal-200/90 shadow-xs shadow-teal-100/50',
          textColor: 'text-teal-900',
          labelColor: 'text-teal-700/80',
          iconStyle: 'bg-white/90 border border-teal-200/80 text-teal-600',
        },
        {
          label: 'Delivered',
          value: stats.delivered,
          icon: <CheckCircle2 className="w-4 h-4" />,
          cardStyle: 'bg-gradient-to-br from-[#ecfdf5]/95 via-[#d1fae5]/70 to-[#a7f3d0]/50 border-emerald-200/90 shadow-xs shadow-emerald-100/50',
          textColor: 'text-emerald-900',
          labelColor: 'text-emerald-700/80',
          iconStyle: 'bg-white/90 border border-emerald-200/80 text-emerald-600',
        },
        {
          label: 'Failed Delivery',
          value: stats.failed_delivery,
          icon: <AlertTriangle className="w-4 h-4" />,
          cardStyle: 'bg-gradient-to-br from-[#fff7ed]/95 via-[#ffedd5]/70 to-[#fed7aa]/50 border-orange-200/90 shadow-xs shadow-orange-100/50',
          textColor: 'text-orange-900',
          labelColor: 'text-orange-700/80',
          iconStyle: 'bg-white/90 border border-orange-200/80 text-orange-600',
        },
        {
          label: 'RTO / Cancelled',
          value: stats.rto_initiated + stats.cancelled,
          icon: <RotateCcw className="w-4 h-4" />,
          cardStyle: 'bg-gradient-to-br from-[#fff1f2]/95 via-[#ffe4e6]/70 to-[#fecdd3]/50 border-rose-200/90 shadow-xs shadow-rose-100/50',
          textColor: 'text-rose-900',
          labelColor: 'text-rose-700/80',
          iconStyle: 'bg-white/90 border border-rose-200/80 text-rose-600',
        },
      ]
    : [];

  return (
    <div className="space-y-6 select-none text-left font-sans animate-in fade-in duration-200">
      <SectionHeader
        title="Fulfillment"
        subtitle="Manage Delhivery shipments, tracking sync, and delivery lifecycle"
        actions={
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold text-slate-600 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-2xl border p-3.5 backdrop-blur-xl flex flex-col gap-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${card.cardStyle}`}
            >
              <div className={`w-7 h-7 rounded-lg ${card.iconStyle} flex items-center justify-center`}>
                {card.icon}
              </div>
              <div>
                <p className={`text-xl font-black ${card.textColor}`}>{card.value}</p>
                <p className={`text-[10px] font-extrabold uppercase tracking-wider leading-tight mt-0.5 ${card.labelColor}`}>
                  {card.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-900 text-white px-5 py-3 rounded-2xl flex items-center justify-between shadow-md text-xs animate-in slide-in-from-top-2">
          <span className="font-bold flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-indigo-400" />
            {selectedIds.length} shipment(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('sync')}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition"
            >
              Bulk Sync
            </button>
            <button
              onClick={() => handleBulkAction('pickup')}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition"
            >
              Bulk Request Pickup
            </button>
            <button
              onClick={() => handleBulkAction('cancel')}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg transition"
            >
              Bulk Cancel
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-2 py-1.5 text-slate-400 hover:text-white transition ml-2"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by AWB, shipment number, order, customer, phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:border-[#006670] transition-colors"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] bg-white cursor-pointer"
          >
            <option value="all">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{SHIPMENT_STATUS_LABELS[s]}</option>
            ))}
          </select>

          {/* More Filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border rounded-xl transition-all cursor-pointer ${showFilters ? 'bg-[#006670] text-white border-[#006670]' : 'text-slate-600 border-slate-200 hover:border-slate-300 bg-white'}`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Packing Status</label>
              <select
                value={packingFilter}
                onChange={(e) => { setPackingFilter(e.target.value); setPage(1); }}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#006670] bg-white"
              >
                <option value="all">All Packing</option>
                <option value="pending">Pending</option>
                <option value="packing">Packing</option>
                <option value="packed">Packed</option>
                <option value="qc_passed">QC Passed</option>
                <option value="ready_for_pickup">Ready for Pickup</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Payment Type</label>
              <select
                value={paymentFilter}
                onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#006670] bg-white"
              >
                <option value="all">All Payment Types</option>
                <option value="prepaid">Prepaid</option>
                <option value="cod">COD</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Order Type</label>
              <select
                value={orderTypeFilter}
                onChange={(e) => { setOrderTypeFilter(e.target.value); setPage(1); }}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#006670] bg-white"
              >
                <option value="all">All Account Types</option>
                <option value="customer">Retail Customer</option>
                <option value="dealer">Enterprise Dealer</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">State Filter</label>
              <input
                type="text"
                placeholder="e.g. Maharashtra"
                value={stateFilter}
                onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#006670]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Pickup Date</label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => { setPickupDate(e.target.value); setPage(1); }}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#006670]"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setPickupDate(''); setDeliveryDate(''); setSearch(''); setStatusFilter('all');
                  setPackingFilter('all'); setPaymentFilter('all'); setOrderTypeFilter('all');
                  setStateFilter(''); setCityFilter(''); setPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs font-bold text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Shipments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-8 h-8 border-4 border-[#006670] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-400">Loading production shipments...</p>
          </div>
        ) : shipments.length === 0 ? (
          <EmptyState
            icon={<Truck className="w-8 h-8 text-slate-300" />}
            title="No shipments match query"
            description="No database shipment records found matching your active filters."
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={shipments}
              onRowClick={(row) => handleOpenDrawer(row.id)}
            />
            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-4 text-slate-500 font-medium">
                <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="border border-slate-200 rounded px-1.5 py-0.5 text-xs font-bold bg-white text-slate-700"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-40 hover:border-slate-300 transition-all cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={page * pageSize >= total}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-40 hover:border-slate-300 transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Side Drawer Component */}
      <ShipmentDetailsDrawer
        shipment={selectedShipment}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onRefresh={fetchData}
      />
    </div>
  );
};

export default FulfillmentPage;

