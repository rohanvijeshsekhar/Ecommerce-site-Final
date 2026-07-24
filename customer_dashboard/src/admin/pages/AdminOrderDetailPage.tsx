/**
 * FAAZO Admin – Order Detail Page (Enterprise E-Commerce UX)
 *
 * Designed to match Amazon Seller Central, Flipkart Seller Hub, Myntra Partner,
 * Shopify Admin, and Delhivery Dashboard.
 *
 * Features:
 *   - Sticky Header with quick actions (Print, Copy ID, Contact, Timeline)
 *   - Horizontal Order Progress Tracker (Placed → Processing → Packed → Shipment Created → Picked Up → In Transit → Delivered)
 *   - 70 / 30 Responsive Split Layout
 *   - Left: Items Ordered (Amazon Seller style), Customer Profile & Address, Payment Summary, Order Audit Timeline
 *   - Right: Shipment & Fulfillment Card (Delhivery Dashboard), Warehouse Quick Workflow Controls, Admin Notes (Toggle Edit), Warranty Overview
 *   - Read-only by default with clean inline edit toggles
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Package, Phone, User, Truck, Clock,
  AlertTriangle, RefreshCw, CheckCircle2, XCircle,
  Calendar, Navigation, ExternalLink, ChevronRight,
  AlertCircle, Ruler, CreditCard, CheckCheck, X, Info,
  Printer, Download, Copy, Mail, ShieldCheck, Eye, Edit3,
  Building2, Sparkles, Layers, Shield, FileText, Share2, Check
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useBreadcrumbSync } from '../contexts/BreadcrumbContext';
import StatusBadge from '../components/StatusBadge';
import { adminOrdersService } from '../services/adminService';
import type { OrderDetail } from '../../services/ordersService';
import {
  adminShippingService,
  SHIPMENT_STATUS_LABELS,
  PICKUP_STATUS_LABELS,
} from '../../services/shippingService';
import type { Shipment, ShipmentStatus } from '../../services/shippingService';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers & Constants
// ─────────────────────────────────────────────────────────────────────────────

const getOrderStatusVariant = (s: OrderDetail['status']) => {
  switch (s) {
    case 'delivered':       return 'success';
    case 'shipped':         return 'info';
    case 'packed':          return 'purple';
    case 'processing':      return 'warning';
    case 'pending_payment': return 'neutral';
    case 'cancelled':       return 'error';
    default:                return 'neutral';
  }
};

const getOrderStatusLabel = (s: string): string => {
  const map: Record<string, string> = {
    pending_payment: 'Pending Payment',
    processing:      'Processing',
    packed:          'Packed',
    shipped:         'Shipped',
    delivered:       'Delivered',
    cancelled:       'Cancelled',
  };
  return map[s] || s;
};

const getShipmentVariant = (s: ShipmentStatus): 'success' | 'info' | 'warning' | 'error' | 'purple' | 'neutral' => {
  switch (s) {
    case 'delivered':        return 'success';
    case 'out_for_delivery': return 'info';
    case 'in_transit':       return 'info';
    case 'reached_hub':      return 'purple';
    case 'picked_up':        return 'purple';
    case 'pickup_scheduled': return 'warning';
    case 'created':          return 'warning';
    case 'failed_delivery':  return 'error';
    case 'cancelled':        return 'error';
    default:                 return 'neutral';
  }
};

const NEXT_STATUSES: Partial<Record<string, string[]>> = {
  pending_payment: ['pending_payment', 'processing', 'cancelled'],
  processing:      ['processing', 'packed', 'cancelled'],
  packed:          ['packed', 'cancelled'],
  shipped:         ['shipped', 'delivered'],
  delivered:       [],
  cancelled:       [],
};

// Order Progress Steps
const PROGRESS_STEPS = [
  { id: 'placed', label: 'Order Placed' },
  { id: 'processing', label: 'Processing' },
  { id: 'packed', label: 'Packed' },
  { id: 'shipment_created', label: 'Shipment Created' },
  { id: 'picked_up', label: 'Picked Up' },
  { id: 'in_transit', label: 'In Transit' },
  { id: 'delivered', label: 'Delivered' },
];

const getProgressStepIndex = (orderStatus: string, shipmentStatus?: string): number => {
  if (orderStatus === 'cancelled') return -1;
  if (orderStatus === 'delivered' || shipmentStatus === 'delivered') return 6;
  if (shipmentStatus === 'in_transit' || shipmentStatus === 'out_for_delivery' || shipmentStatus === 'reached_hub') return 5;
  if (shipmentStatus === 'picked_up') return 4;
  if (shipmentStatus === 'created' || shipmentStatus === 'pickup_scheduled' || orderStatus === 'shipped') return 3;
  if (orderStatus === 'packed') return 2;
  if (orderStatus === 'processing') return 1;
  return 0; // pending_payment or newly placed
};

// ─────────────────────────────────────────────────────────────────────────────
// Shipment Panel — Delhivery Fulfillment Dashboard Component
// ─────────────────────────────────────────────────────────────────────────────

interface ShipmentPanelProps {
  order: OrderDetail;
  shipment: Shipment | null;
  loading: boolean;
  onShipmentCreated: (s: Shipment) => void;
  onShipmentUpdated: (s: Shipment) => void;
}

type PanelView = 'form' | 'review' | 'done';

const ShipmentPanel: React.FC<ShipmentPanelProps> = ({
  order, shipment, loading, onShipmentCreated, onShipmentUpdated,
}) => {
  const toast = useToast();

  const [weight, setWeight]     = useState('0.5');
  const [length, setLength]     = useState('15');
  const [breadth, setBreadth]   = useState('15');
  const [height, setHeight]     = useState('10');
  const [paymentMode, setPaymentMode] = useState<'Prepaid' | 'COD'>('Prepaid');
  const [pickupDate, setPickupDate]   = useState('');
  const [view, setView]         = useState<PanelView>('form');

  const [creating, setCreating]                 = useState(false);
  const [syncing, setSyncing]                   = useState(false);
  const [cancelling, setCancelling]             = useState(false);
  const [schedulingPickup, setSchedulingPickup] = useState(false);
  const [copiedAWB, setCopiedAWB]               = useState(false);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const addr = order.shipping_address_detail;
  const canCreate = ['packed', 'processing'].includes(order.status) && (!shipment || shipment.shipment_status === 'not_created' || !shipment.awb_number);

  const handleCopyAWB = (awb: string) => {
    navigator.clipboard.writeText(awb);
    setCopiedAWB(true);
    toast.success('AWB Number copied to clipboard!');
    setTimeout(() => setCopiedAWB(false), 2000);
  };

  const handleCreate = async () => {
    setCreating(true);
    setValidationErrors([]);
    try {
      let res;
      if (shipment && shipment.id) {
        res = await adminShippingService.createCourierShipment(shipment.id, {
          weight:       parseFloat(weight),
          length:       parseFloat(length),
          breadth:      parseFloat(breadth),
          height:       parseFloat(height),
          payment_mode: paymentMode,
          pickup_date:  pickupDate || undefined,
        });
      } else {
        res = await adminShippingService.createShipment({
          order_id:     order.id,
          weight:       parseFloat(weight),
          length:       parseFloat(length),
          breadth:      parseFloat(breadth),
          height:       parseFloat(height),
          payment_mode: paymentMode,
          pickup_date:  pickupDate || undefined,
        });
      }

      if (res.success && res.data) {
        toast.success(`Shipment created! AWB: ${res.data.awb_number}`);
        onShipmentCreated(res.data);
        setView('done');
      } else {
        const errs = res.error?.details;
        if (Array.isArray(errs) && errs.length > 0) {
          setValidationErrors(errs);
          setView('review');
        } else {
          toast.error(res.error?.message || res.message || 'Failed to create shipment.');
          setView('form');
        }
      }
    } catch (err: any) {
      const errs = err?.response?.data?.error?.details;
      if (Array.isArray(errs) && errs.length > 0) {
        setValidationErrors(errs);
        setView('review');
      } else {
        toast.error(err?.response?.data?.error?.message || 'Failed to create shipment.');
        setView('form');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleSync = async () => {
    if (!shipment) return;
    setSyncing(true);
    try {
      const res = await adminShippingService.syncTracking(shipment.id);
      if (res.success && res.data) {
        toast.success(res.message || 'Tracking synced with Delhivery.');
        onShipmentUpdated(res.data);
      } else {
        toast.error(res.message || 'Sync failed.');
      }
    } catch {
      toast.error('Failed to sync tracking.');
    } finally {
      setSyncing(false);
    }
  };

  const handleCancel = async () => {
    if (!shipment) return;
    if (!window.confirm('Are you sure you want to cancel this shipment with Delhivery?')) return;
    setCancelling(true);
    try {
      const res = await adminShippingService.cancelShipment(shipment.id);
      if (res.success && res.data) {
        toast.success('Shipment cancelled.');
        onShipmentUpdated(res.data);
      } else {
        toast.error(res.message || 'Cancellation failed.');
      }
    } catch {
      toast.error('Failed to cancel shipment.');
    } finally {
      setCancelling(false);
    }
  };

  const handleSchedulePickup = async () => {
    if (!shipment) return;
    setSchedulingPickup(true);
    try {
      const res = await adminShippingService.schedulePickup(shipment.id, pickupDate || undefined);
      if (res.success && res.data) {
        toast.success('Pickup scheduled.');
        onShipmentUpdated(res.data);
      } else {
        toast.error(res.message || 'Failed to schedule pickup.');
      }
    } catch {
      toast.error('Failed to schedule pickup.');
    } finally {
      setSchedulingPickup(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-slate-100 rounded-xl" />
          <div className="h-3 bg-slate-100 rounded w-32" />
        </div>
        <div className="space-y-2">
          <div className="h-2 bg-slate-50 rounded w-full" />
          <div className="h-2 bg-slate-50 rounded w-3/4" />
        </div>
      </div>
    );
  }

  // ── STATE B: Shipment Active ──────────────────────────────
  if (shipment) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm text-left overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#006670]/10 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4 text-[#006670]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#006670]">Delhivery Express</span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                  {shipment.provider || 'offline'}
                </span>
              </div>
              <p className="text-xs font-black text-slate-800 leading-none mt-0.5">AWB: {shipment.awb_number || '—'}</p>
            </div>
          </div>
          <StatusBadge
            label={SHIPMENT_STATUS_LABELS[shipment.shipment_status] || shipment.shipment_status}
            variant={getShipmentVariant(shipment.shipment_status)}
          />
        </div>

        <div className="p-4 space-y-4 text-xs">
          {/* Key Identifiers Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">AWB Number</p>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono font-black text-slate-800 text-xs">{shipment.awb_number || '—'}</span>
                <button
                  onClick={() => handleCopyAWB(shipment.awb_number)}
                  className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                  title="Copy AWB"
                >
                  {copiedAWB ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Pickup Status</p>
              <p className="font-bold text-slate-800 mt-1 capitalize">
                {PICKUP_STATUS_LABELS[shipment.pickup_status] || shipment.pickup_status}
              </p>
            </div>

            {shipment.estimated_delivery_date && (
              <div className="bg-[#006670]/5 rounded-xl p-2.5 border border-[#006670]/10 col-span-2 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#006670] flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" /> Estimated Delivery
                  </p>
                  <p className="font-black text-slate-900 mt-0.5">
                    {new Date(shipment.estimated_delivery_date).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric', weekday: 'short'
                    })}
                  </p>
                </div>
                {shipment.current_location && (
                  <div className="text-right max-w-[150px]">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Current Hub</p>
                    <p className="font-bold text-slate-700 truncate">{shipment.current_location}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 py-2 px-3 text-[10px] font-extrabold uppercase bg-[#006670] text-white hover:bg-[#004e56] rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Tracking'}
            </button>

            <a
              href={`https://www.delhivery.com/track/package/${shipment.awb_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-3 text-[10px] font-extrabold uppercase border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              Track API
            </a>

            {shipment.pickup_status === 'pending' && shipment.is_cancellable && (
              <button
                onClick={handleSchedulePickup}
                disabled={schedulingPickup}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-[10px] font-extrabold uppercase border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer mt-1"
              >
                <Calendar className="w-3 h-3 text-[#006670]" />
                {schedulingPickup ? 'Scheduling...' : 'Schedule Warehouse Pickup'}
              </button>
            )}

            {shipment.is_cancellable && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-[10px] font-extrabold uppercase text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-xl transition-all cursor-pointer"
              >
                <XCircle className="w-3 h-3" />
                {cancelling ? 'Cancelling...' : 'Cancel Delhivery Shipment'}
              </button>
            )}
          </div>

          {/* Embedded Logistics Timeline */}
          {shipment.tracking_events && shipment.tracking_events.length > 0 && (
            <div className="border-t border-slate-100 pt-3.5 mt-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                <Truck className="w-3 h-3" /> Scan History ({shipment.tracking_events.length})
              </p>
              <div className="relative pl-4 space-y-3 before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-0.5 before:bg-slate-100">
                {[...shipment.tracking_events]
                  .sort((a, b) => new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime())
                  .map((evt, idx) => (
                    <div key={evt.id} className="relative text-[11px]">
                      <span className={`absolute -left-[15px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                        evt.is_delivered
                          ? 'bg-emerald-500 border-emerald-500'
                          : idx === 0
                          ? 'bg-[#006670] border-[#006670]'
                          : 'bg-white border-slate-300'
                      }`} />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{evt.event_label}</span>
                        <span className="text-[9px] text-slate-400 font-medium">
                          {new Date(evt.event_timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {evt.location && (
                        <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-slate-400" /> {evt.location}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── STATE A: No Shipment — Warehouse Creation Form ────────
  if (!canCreate) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 text-left">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-3">
          <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center">
            <Truck className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fulfillment</p>
        </div>
        <div className="text-center py-5">
          <Package className="w-8 h-8 mx-auto text-slate-200 mb-2" />
          <p className="text-xs font-extrabold text-slate-700">
            {order.status === 'delivered' || order.status === 'shipped'
              ? 'Shipment Created'
              : 'Awaiting Warehouse Packing'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {order.status === 'processing'
              ? 'Pack order first. Click "Mark as Packed" to enable Delhivery creation.'
              : 'Shipment can be created once order is in Packed status.'}
          </p>
        </div>
      </div>
    );
  }

  // Form View
  if (view === 'form') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm text-left overflow-hidden">
        <div className="bg-gradient-to-r from-[#006670] to-[#008a97] px-4 py-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-80">Warehouse</p>
              <p className="text-xs font-black leading-none mt-0.5">Ready for Dispatch</p>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-white/20 text-[9px] font-black uppercase rounded-full">Packed ✓</span>
        </div>

        <div className="p-4 space-y-4 text-xs">
          {/* Address Preview */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" /> Ship To
            </p>
            <p className="font-bold text-slate-800">{addr?.full_name || order.customer_name}</p>
            <p className="text-[11px] text-slate-600 leading-tight">
              {addr?.line1}, {addr?.city}, {addr?.state} – {addr?.pincode}
            </p>
          </div>

          {/* Package Details Form */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">Weight (kg)</label>
                <input
                  type="number" step="0.1" min="0.1" max="50"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full border border-slate-200 px-2.5 py-1.5 rounded-xl font-bold text-slate-800 bg-white focus:outline-none focus:border-[#006670]"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as 'Prepaid' | 'COD')}
                  className="w-full border border-slate-200 px-2.5 py-1.5 rounded-xl font-bold text-slate-800 bg-white focus:outline-none focus:border-[#006670] cursor-pointer"
                >
                  <option value="Prepaid">Prepaid</option>
                  <option value="COD">Cash on Delivery</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1 flex items-center gap-1">
                <Ruler className="w-2.5 h-2.5" /> Dimensions (L × B × H cm)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  ['L', length, setLength],
                  ['B', breadth, setBreadth],
                  ['H', height, setHeight],
                ].map(([lbl, val, setter]) => (
                  <input
                    key={lbl as string}
                    type="number" step="1" min="1" max="150"
                    value={val as string}
                    onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                    placeholder={lbl as string}
                    className="w-full border border-slate-200 p-1.5 rounded-xl font-bold text-slate-800 text-center bg-white focus:outline-none focus:border-[#006670]"
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { setValidationErrors([]); setView('review'); }}
            className="w-full py-2.5 bg-[#006670] hover:bg-[#004e56] text-white rounded-xl text-xs font-extrabold uppercase tracking-wide cursor-pointer transition-colors shadow-sm flex items-center justify-center gap-1.5"
          >
            Review & Create Shipment <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Review View
  if (view === 'review') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm text-left overflow-hidden">
        <div className="bg-slate-800 px-4 py-3 flex items-center justify-between text-white">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Step 2 of 2</p>
            <p className="text-xs font-black">Confirm Delhivery Shipment</p>
          </div>
          <button onClick={() => setView('form')} className="p-1 hover:text-white text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs">
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
              <p className="text-[10px] font-black uppercase text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Validation Errors
              </p>
              {validationErrors.map((err, i) => (
                <p key={i} className="text-[11px] text-red-700 font-medium">• {err}</p>
              ))}
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between"><span className="text-slate-400">Customer</span><span className="font-bold text-slate-800">{addr?.full_name || order.customer_name}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Courier</span><span className="font-bold text-[#006670]">Delhivery Surface</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Weight</span><span className="font-bold text-slate-800">{weight} kg ({length}x{breadth}x{height} cm)</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Payment</span><span className="font-bold text-slate-800">{paymentMode}</span></div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setView('form')}
              className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 py-2 bg-[#006670] hover:bg-[#004e56] text-white rounded-xl font-extrabold uppercase flex items-center justify-center gap-1.5"
            >
              {creating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {creating ? 'Creating...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Order Detail Page Component
// ─────────────────────────────────────────────────────────────────────────────

const AdminOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [order, setOrder]             = useState<OrderDetail | null>(null);
  const [loading, setLoading]         = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [shipment, setShipment]       = useState<Shipment | null>(null);
  const [loadingShipment, setLoadingShipment] = useState(true);

  // Notes state & Edit toggle
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [adminNotes, setAdminNotes]         = useState('');
  const [savingNotes, setSavingNotes]       = useState(false);

  // Status Modal / Target
  const [targetStatus, setTargetStatus] = useState('');
  const [estDelivery, setEstDelivery]   = useState('');

  useBreadcrumbSync([
    { label: 'Operations' },
    { label: 'Orders', path: '/admin/orders' },
    { label: order ? order.order_number : 'Order' },
  ]);

  // Fetch Order
  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminOrdersService.getOrderDetail(id);
      if (res.success && res.data) {
        setOrder(res.data);
        setTargetStatus(res.data.status);
        setEstDelivery(res.data.estimated_delivery_date || '');
        setAdminNotes(res.data.notes || '');
      } else {
        toast.error('Order not found.');
        navigate('/admin/orders');
      }
    } catch {
      toast.error('Failed to load order detail.');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  // Fetch Shipment
  const fetchShipment = useCallback(async () => {
    if (!id) return;
    setLoadingShipment(true);
    try {
      const res = await adminShippingService.getShipmentByOrderId(id);
      setShipment(res.data ?? null);
    } catch {
      setShipment(null);
    } finally {
      setLoadingShipment(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);
  useEffect(() => { if (order) fetchShipment(); }, [order, fetchShipment]);

  // Actions
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleQuickStatusTransition = async (newStatus: string) => {
    if (!order || !id) return;
    setUpdatingStatus(true);
    try {
      const res = await adminOrdersService.updateOrderStatus(id, {
        status: newStatus as any,
        notes: `Quick transition to ${getOrderStatusLabel(newStatus)}`,
      });
      if (res.success && res.data) {
        toast.success(`Order status updated to ${getOrderStatusLabel(newStatus)}`);
        setOrder(res.data);
        setTargetStatus(newStatus);
      } else {
        toast.error(res.message || 'Failed to update status.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!order || !id) return;
    setSavingNotes(true);
    try {
      const res = await adminOrdersService.updateOrderStatus(id, {
        status: order.status,
        notes: adminNotes.trim(),
      });
      if (res.success && res.data) {
        toast.success('Admin notes updated.');
        setOrder(res.data);
        setIsEditingNotes(false);
      } else {
        toast.error(res.message || 'Failed to save notes.');
      }
    } catch {
      toast.error('Failed to save admin notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-9 h-9 border-4 border-[#006670] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black tracking-widest text-slate-400 uppercase">Loading Order Workspace…</p>
      </div>
    );
  }

  if (!order) return null;

  const currentStepIdx = getProgressStepIndex(order.status, shipment?.shipment_status);
  const addr = order.shipping_address_detail;

  return (
    <div className="space-y-5 select-none text-left font-sans animate-in fade-in duration-200">

      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/orders')}
            className="p-2 border border-slate-200 hover:border-slate-300 rounded-xl bg-white hover:bg-slate-50 transition-all cursor-pointer text-slate-600"
            title="Back to Orders"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-black text-slate-900 font-mono tracking-tight">
                {order.order_number}
              </h2>
              <StatusBadge
                label={getOrderStatusLabel(order.status)}
                variant={getOrderStatusVariant(order.status)}
              />
              <StatusBadge
                label={order.payment_status === 'captured' ? 'Paid' : order.payment_status.toUpperCase()}
                variant={order.payment_status === 'captured' ? 'success' : 'neutral'}
                showDot={false}
              />
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                {order.payment_method}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Placed on {new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · Customer: <strong className="text-slate-700">{order.customer_name}</strong>
            </p>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleCopy(order.order_number, 'Order Number')}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            Copy ID
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            Print Invoice
          </button>
          <a
            href={`mailto:${order.customer_email}`}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            Contact
          </a>
          <button
            onClick={() => {
              const el = document.getElementById('order-timeline');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#006670]/10 text-[#006670] hover:bg-[#006670]/20 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            Timeline
          </button>
        </div>
      </div>

      {/* ── ORDER PROGRESS TRACKER (Horizontal Flow) ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 text-left overflow-x-auto">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#006670]" /> Order Lifecycle Progress
        </p>

        {order.status === 'cancelled' ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-3 text-rose-700 text-xs font-bold">
            <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>This order has been CANCELLED. Reason: {order.cancellation_reason || 'Admin / Customer Cancellation'}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between min-w-[700px] relative">
            {/* Connecting line */}
            <div className="absolute left-6 right-6 top-3.5 h-0.5 bg-slate-100 -z-0" />

            {PROGRESS_STEPS.map((step, idx) => {
              const isCompleted = idx < currentStepIdx;
              const isCurrent   = idx === currentStepIdx;

              return (
                <div key={step.id} className="flex flex-col items-center relative z-10 text-center px-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : isCurrent
                      ? 'bg-[#006670] text-white ring-4 ring-[#006670]/20 animate-pulse'
                      : 'bg-white border-2 border-slate-200 text-slate-400'
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                  </div>
                  <span className={`text-[11px] font-bold mt-2 leading-tight ${
                    isCurrent ? 'text-[#006670] font-black' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MAIN LAYOUT (70 / 30 SPLIT) ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ── LEFT COLUMN (70% = 8 cols) ────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-5">

          {/* CARD 1: Items Ordered (Amazon Seller Central Style) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-[#006670]" />
                Items Ordered ({order.items.length})
              </h3>
              <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                Stock: FAAZO Central Warehouse (Mumbai)
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="flex items-start gap-3.5">
                    {item.image_url ? (
                      <img
                        src={`http://localhost:8000${item.image_url}`}
                        alt={item.product_name}
                        className="w-14 h-14 object-contain bg-slate-50 border border-slate-100 p-1.5 rounded-xl shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-slate-300" />
                      </div>
                    )}
                    <div>
                      <p className="font-extrabold text-slate-900 text-sm">{item.product_name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          SKU: FAAZO-{item.product_slug.toUpperCase().slice(0, 10)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">HSN: 90184900</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> 1 Year FAAZO Warranty
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Unit Price: ₹{item.price.toLocaleString('en-IN')} (Incl. GST)
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Quantity & Total</p>
                    <p className="font-black text-slate-900 text-sm mt-0.5">
                      {item.quantity} × ₹{item.price.toLocaleString('en-IN')}
                    </p>
                    <p className="font-extrabold text-[#006670] mt-0.5">
                      ₹{(item.quantity * item.price).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Summary */}
            <div className="border-t border-slate-100 pt-4 mt-3 space-y-2 text-xs text-slate-600 font-sans">
              <div className="flex justify-between">
                <span>Subtotal (Selling Price)</span>
                <span className="font-bold text-slate-800">₹{order.selling_subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (Included in selling price)</span>
                <span className="font-bold text-slate-800">₹{order.gst_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping Fee</span>
                <span className="font-bold text-emerald-600">
                  {order.shipping_fee === 0 ? 'FREE Express Delivery' : `₹${order.shipping_fee.toLocaleString('en-IN')}`}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between font-black text-slate-900 text-sm">
                <span>Grand Total</span>
                <span className="text-[#006670] font-mono text-base">₹{order.total_amount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* CARD 2: Customer Profile & Delivery Address */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 text-left space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-[#006670]" />
              Customer & Delivery Context
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Customer Profile Card */}
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#006670] to-[#008a97] text-white font-black flex items-center justify-center text-sm shadow-sm">
                    {order.customer_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 text-sm">{order.customer_name}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{order.customer_email}</p>
                  </div>
                </div>
                <div className="border-t border-slate-200/60 pt-2 text-[11px] space-y-1 text-slate-600">
                  <p><strong className="text-slate-700">Phone:</strong> {addr?.mobile || 'Not specified'}</p>
                  <p><strong className="text-slate-700">Account Type:</strong> Verified Dental Practitioner / Clinic</p>
                </div>
                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {addr?.mobile && (
                    <a
                      href={`tel:${addr.mobile}`}
                      className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                    >
                      <Phone className="w-3 h-3 text-[#006670]" /> Call
                    </a>
                  )}
                  <a
                    href={`mailto:${order.customer_email}`}
                    className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <Mail className="w-3 h-3 text-[#006670]" /> Email
                  </a>
                </div>
              </div>

              {/* Delivery Address Card */}
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#006670]" /> Shipping Address
                  </p>
                  <button
                    onClick={() => handleCopy(`${addr?.line1}, ${addr?.city}, ${addr?.state} - ${addr?.pincode}`, 'Address')}
                    className="text-[10px] font-bold text-[#006670] hover:underline cursor-pointer"
                  >
                    Copy Address
                  </button>
                </div>
                <p className="font-bold text-slate-800">{addr?.full_name}</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {addr?.line1}{addr?.line2 ? `, ${addr.line2}` : ''}<br />
                  {addr?.city}, {addr?.state} – <strong>{addr?.pincode}</strong>
                </p>
                {/* Google Maps link */}
                {addr?.pincode && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${addr.line1}, ${addr.city}, ${addr.pincode}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[#006670] hover:underline pt-1"
                  >
                    <ExternalLink className="w-3 h-3" /> View on Google Maps
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* CARD 3: Payment Breakdown & Verification */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 text-left space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#006670]" />
              Payment & Verification Summary
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="text-[9px] font-black uppercase text-slate-400">Payment Method</p>
                <p className="font-black text-slate-800 mt-0.5 uppercase">{order.payment_method}</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="text-[9px] font-black uppercase text-slate-400">Payment Status</p>
                <p className="font-bold text-emerald-700 mt-0.5 capitalize">
                  {order.payment_status === 'captured' ? 'Paid (Captured)' : order.payment_status}
                </p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="text-[9px] font-black uppercase text-slate-400">Razorpay Ref ID</p>
                <p className="font-mono font-bold text-slate-700 mt-0.5 truncate">{order.razorpay_payment_id || 'N/A (Prepaid)'}</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="text-[9px] font-black uppercase text-slate-400">Refund Status</p>
                <p className="font-bold text-slate-600 mt-0.5">No Refunds Issued</p>
              </div>
            </div>
          </div>

          {/* CARD 4: Order Audit & Transition Timeline */}
          <div id="order-timeline" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 text-left space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#006670]" />
              Order Transition Log & Audit History
            </h3>

            {order.status_history.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No history logs found.</p>
            ) : (
              <div className="relative pl-5 space-y-4 before:absolute before:left-[7px] before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-slate-100">
                {order.status_history.map((log) => (
                  <div key={log.id} className="relative text-xs">
                    <span className="absolute -left-[17px] top-1 w-3 h-3 rounded-full bg-white border-2 border-[#006670]" />
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 uppercase tracking-wide text-xs">
                        {getOrderStatusLabel(log.status)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Action Logged By: <strong className="text-slate-700">{log.changed_by_name || 'System Operator'}</strong>
                    </p>
                    {log.notes && (
                      <p className="text-[11px] text-slate-600 mt-1 bg-slate-50 border border-slate-100 rounded-lg p-2 leading-relaxed">
                        {log.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── RIGHT COLUMN (30% = 4 cols) ───────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-5">

          {/* RIGHT CARD 1: Shipment & Fulfillment Card (Delhivery Dashboard) */}
          <ShipmentPanel
            order={order}
            shipment={shipment}
            loading={loadingShipment}
            onShipmentCreated={(s) => {
              setShipment(s);
              fetchOrder();
            }}
            onShipmentUpdated={(s) => setShipment(s)}
          />

          {/* RIGHT CARD 2: Warehouse Workflow Quick Controls */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 text-left space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
              Warehouse Workflow Controls
            </h3>

            {order.status === 'processing' && (
              <button
                onClick={() => handleQuickStatusTransition('packed')}
                disabled={updatingStatus}
                className="w-full py-2.5 bg-[#006670] hover:bg-[#004e56] text-white rounded-xl text-xs font-extrabold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {updatingStatus ? 'Updating...' : 'Mark Order as Packed'}
              </button>
            )}

            {order.status === 'packed' && !shipment && (
              <div className="p-3 bg-[#006670]/5 border border-[#006670]/20 rounded-xl text-xs text-slate-700 space-y-1">
                <p className="font-extrabold text-[#006670]">Next Step: Create Shipment</p>
                <p className="text-[11px] text-slate-500">Fill out package weight & dimensions in the card above to generate Delhivery AWB.</p>
              </div>
            )}

            {order.status === 'shipped' && (
              <button
                onClick={() => handleQuickStatusTransition('delivered')}
                disabled={updatingStatus}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4" />
                {updatingStatus ? 'Updating...' : 'Mark as Delivered'}
              </button>
            )}

            {['delivered', 'cancelled'].includes(order.status) && (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 text-center font-bold">
                Order is in final state ({getOrderStatusLabel(order.status)}). No further workflow actions available.
              </div>
            )}
          </div>

          {/* RIGHT CARD 3: Admin & Internal Notes (Toggle Edit) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#006670]" />
                Admin Notes
              </h3>
              <button
                onClick={() => setIsEditingNotes(!isEditingNotes)}
                className="text-[10px] font-bold text-[#006670] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" /> {isEditingNotes ? 'Cancel' : 'Edit Note'}
              </button>
            </div>

            {isEditingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder="Enter internal admin note or warehouse instructions..."
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#006670]"
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="w-full py-2 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-extrabold uppercase rounded-xl transition-colors cursor-pointer"
                >
                  {savingNotes ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs text-slate-700 font-sans leading-relaxed">
                {order.notes ? order.notes : <span className="text-slate-400 italic">No admin notes added for this order. Click "Edit Note" to add internal remarks.</span>}
              </div>
            )}
          </div>

          {/* RIGHT CARD 4: Warranty Registration Overview */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#006670]" />
                Warranty Status
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                Active
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Policy</span><span className="font-bold text-slate-800">1 Year FAAZO Coverage</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Registration</span><span className="font-bold text-slate-800">Auto-Linked to Order</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Status</span><span className="font-bold text-emerald-600">Active upon Delivery</span></div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default AdminOrderDetailPage;
