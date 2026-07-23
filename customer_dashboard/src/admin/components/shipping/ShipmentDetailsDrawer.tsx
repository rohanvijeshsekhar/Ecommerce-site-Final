/**
 * FAAZO – Enterprise Shipment Details Side Drawer
 *
 * Dual State Machine Drawer:
 *   Section 1 — Warehouse Workflow (packing_status): always visible, controlled by FAAZO
 *   Section 2 — Courier Workflow (shipment_status): locked until packing=ready_for_pickup
 */

import React, { useState } from 'react';
import {
  X, Package, Truck, User, MapPin, Calendar, Clock,
  Printer, FileText, RefreshCw, Ban, CheckCircle2,
  AlertCircle, Building2, Weight,
} from 'lucide-react';
import {
  SHIPMENT_STATUS_LABELS,
  PACKING_STATUS_LABELS,
  adminShippingService,
} from '../../../services/shippingService';
import type { Shipment, PackingStatus } from '../../../services/shippingService';

interface ShipmentDetailsDrawerProps {
  shipment: Shipment | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const ShipmentDetailsDrawer: React.FC<ShipmentDetailsDrawerProps> = ({
  shipment, isOpen, onClose, onRefresh,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen || !shipment) return null;

  const courierSubmitted = shipment.courier_submitted ?? (shipment.shipment_status !== 'not_created');
  const packingComplete  = shipment.packing_status === 'ready_for_pickup';
  const canCreateCourier = packingComplete && !courierSubmitted;

  const PACKING_ORDER: PackingStatus[] = ['pending', 'packing', 'packed', 'qc_passed', 'ready_for_pickup'];
  const PACKING_NEXT_LABEL: Record<PackingStatus, string> = {
    pending:          'Start Packing',
    packing:          'Mark Packed',
    packed:           'Mark QC Passed',
    qc_passed:        'Mark Ready for Pickup',
    ready_for_pickup: 'Packing Complete ✓',
  };

  const getCourierStatusColor = (st: string) => {
    switch (st) {
      case 'delivered':                                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'out_for_delivery': case 'in_transit':
      case 'reached_hub':      case 'picked_up':      return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'pickup_scheduled': case 'created':        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'cancelled':        case 'failed_delivery':
      case 'rto_initiated':    case 'rto_delivered':  return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'not_created':                             return 'bg-slate-50 text-slate-500 border-slate-200';
      default:                                        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getPackingColor = (st: string) => {
    switch (st) {
      case 'ready_for_pickup': return 'bg-green-50 text-green-700 border-green-200';
      case 'qc_passed':        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'packed':           return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'packing':          return 'bg-amber-50 text-amber-700 border-amber-200';
      default:                 return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  const doAction = async (key: string, fn: () => Promise<any>, successMsg: string) => {
    setLoadingAction(key);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await fn();
      if (res.success) { setActionSuccess(successMsg); onRefresh(); }
      else setActionError(res.message || 'Action failed.');
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'An error occurred.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAdvancePacking = () =>
    doAction('packing', () => adminShippingService.updatePackingStatus(shipment.id),
      'Packing status advanced.');

  const handleCreateCourier = () =>
    doAction('create_courier', () => adminShippingService.createCourierShipment(shipment.id),
      `Courier shipment created!`);

  const handleSyncTracking = () =>
    doAction('sync', () => adminShippingService.syncTracking(shipment.id),
      'Tracking synced successfully.');

  const handleSchedulePickup = () =>
    doAction('pickup', () => adminShippingService.schedulePickup(shipment.id),
      'Pickup scheduled successfully.');

  const handleGenerateLabel = async () => {
    setLoadingAction('label'); setActionSuccess(null); setActionError(null);
    try {
      const res = await adminShippingService.generateLabel(shipment.id);
      if (res.success && res.data.label_url) {
        window.open(res.data.label_url, '_blank');
        setActionSuccess('Shipping label generated!');
      } else setActionError('Shipping label unavailable.');
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Error generating label.');
    } finally { setLoadingAction(null); }
  };

  const handleGenerateManifest = async () => {
    setLoadingAction('manifest'); setActionSuccess(null); setActionError(null);
    try {
      const res = await adminShippingService.generateManifest(shipment.id);
      if (res.success && res.data.manifest_url) {
        window.open(res.data.manifest_url, '_blank');
        setActionSuccess('Manifest document generated!');
      } else setActionError('Manifest unavailable.');
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Error generating manifest.');
    } finally { setLoadingAction(null); }
  };

  const handleCancelShipment = () => {
    if (!window.confirm('Are you sure you want to cancel this shipment with Delhivery?')) return;
    doAction('cancel', () => adminShippingService.cancelShipment(shipment.id, 'Cancelled by admin.'),
      'Shipment cancelled.');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-100">

          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="p-6 bg-gradient-to-r from-[#0d3b3f] via-[#004d40] to-[#0a4347] backdrop-blur-2xl border-b border-teal-800/60 text-emerald-50 shadow-md flex items-start justify-between relative overflow-hidden">
            <div className="space-y-1 z-10">
              {/* Dual-badge header: packing + courier status */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-900/70 text-emerald-200 border border-emerald-600/50 shadow-xs">
                  {shipment.shipment_number || 'FAAZO SHIPMENT'}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-xs ${getPackingColor(shipment.packing_status)}`}>
                  📦 {PACKING_STATUS_LABELS[shipment.packing_status] || shipment.packing_status}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-xs ${getCourierStatusColor(shipment.shipment_status)}`}>
                  🚚 {SHIPMENT_STATUS_LABELS[shipment.shipment_status] || shipment.shipment_status}
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2 pt-1.5">
                <Truck className="w-5 h-5 text-emerald-400" />
                {courierSubmitted ? `AWB: ${shipment.awb_number}` : 'Courier Shipment Not Yet Created'}
              </h2>
              <p className="text-xs text-teal-200/90 font-medium">
                Order: <span className="font-mono text-emerald-300 font-bold">{shipment.order_number}</span> • {shipment.courier_name || 'Delhivery'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="z-10 p-2 text-teal-300 hover:text-white rounded-xl hover:bg-white/10 transition-all border border-transparent hover:border-teal-700/40 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Needs Review Banner ──────────────────────────────────────── */}
          {shipment.needs_review && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span>
                <strong>Admin Review Required:</strong> This record has an AWB but packing was not marked complete.
                Verify the warehouse status before taking courier actions.
              </span>
            </div>
          )}

          {/* ── Notifications ────────────────────────────────────────────── */}
          {actionSuccess && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}
          {actionError && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* ── Scrollable Body ──────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">

            {/* ══════════════════════════════════════════════════════════════
                Section 1 — WAREHOUSE WORKFLOW
                Always visible. Controlled exclusively by FAAZO.
                ══════════════════════════════════════════════════════════════ */}
            <div className="px-6 py-4 bg-amber-50/70 border-b border-amber-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-3 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Warehouse Workflow
              </p>
              {/* Progress stepper */}
              <div className="flex items-center gap-1 flex-wrap mb-3">
                {PACKING_ORDER.map((step, i) => {
                  const currentIdx = PACKING_ORDER.indexOf(shipment.packing_status as PackingStatus);
                  const isDone    = PACKING_ORDER.indexOf(step) < currentIdx;
                  const isCurrent = step === shipment.packing_status;
                  return (
                    <React.Fragment key={step}>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                        isCurrent ? 'bg-amber-400 text-white border-amber-400 shadow-xs'
                          : isDone ? 'bg-green-100 text-green-700 border-green-300'
                          : 'bg-white text-slate-400 border-slate-200'
                      }`}>
                        {isDone ? '✓ ' : ''}{PACKING_STATUS_LABELS[step]}
                      </span>
                      {i < PACKING_ORDER.length - 1 && (
                        <span className={`text-xs ${isDone ? 'text-green-400' : 'text-amber-200'}`}>→</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Advance packing button */}
              {shipment.packing_status !== 'ready_for_pickup' && (
                <button
                  onClick={handleAdvancePacking}
                  disabled={!!loadingAction}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg font-bold text-xs hover:bg-amber-600 shadow-xs transition disabled:opacity-50"
                >
                  <Package className={`w-3.5 h-3.5 ${loadingAction === 'packing' ? 'animate-bounce' : ''}`} />
                  {PACKING_NEXT_LABEL[shipment.packing_status as PackingStatus]}
                </button>
              )}
              {shipment.packing_status === 'ready_for_pickup' && (
                <p className="text-xs text-green-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Package is ready for courier pickup.
                </p>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                Section 2 — COURIER WORKFLOW
                Locked until packing_status == ready_for_pickup.
                ══════════════════════════════════════════════════════════════ */}
            <div className={`px-6 py-4 border-b ${courierSubmitted ? 'bg-indigo-50/40 border-indigo-100' : 'bg-slate-50/50 border-slate-100'}`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700 mb-3 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Courier Workflow (Delhivery)
              </p>

              {/* LOCKED — packing not complete */}
              {!courierSubmitted && !packingComplete && (
                <div className="flex items-center gap-3 text-xs text-slate-500 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <p className="font-semibold text-slate-700">Courier actions locked</p>
                    <p className="text-slate-500 mt-0.5">
                      Delhivery shipment creation is blocked until the packing workflow reaches{' '}
                      <strong className="text-amber-700">Ready for Pickup</strong>.
                      Advance the warehouse workflow above.
                    </p>
                  </div>
                </div>
              )}

              {/* READY — show Create Courier Shipment CTA */}
              {canCreateCourier && (
                <div className="space-y-2">
                  <p className="text-xs text-green-700 font-medium">
                    ✅ Packing complete. You can now create the Delhivery courier shipment.
                  </p>
                  <button
                    onClick={handleCreateCourier}
                    disabled={!!loadingAction}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#006670] text-white rounded-xl font-bold text-sm hover:bg-[#004d40] shadow-md transition disabled:opacity-50 animate-in fade-in duration-300"
                  >
                    <Truck className={`w-4 h-4 ${loadingAction === 'create_courier' ? 'animate-spin' : ''}`} />
                    Create Courier Shipment with Delhivery
                  </button>
                </div>
              )}

              {/* ACTIVE — courier submitted, show all actions */}
              {courierSubmitted && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleSyncTracking}
                    disabled={!!loadingAction}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium text-xs hover:bg-slate-50 shadow-xs transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${loadingAction === 'sync' ? 'animate-spin' : ''}`} />
                    Sync Status
                  </button>
                  <button
                    onClick={handleGenerateLabel}
                    disabled={!!loadingAction}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium text-xs hover:bg-slate-50 shadow-xs transition disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    Shipping Label
                  </button>
                  <button
                    onClick={handleGenerateManifest}
                    disabled={!!loadingAction}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium text-xs hover:bg-slate-50 shadow-xs transition disabled:opacity-50"
                  >
                    <Printer className="w-3.5 h-3.5 text-purple-600" />
                    Manifest Doc
                  </button>
                  {shipment.pickup_status === 'pending' && (
                    <button
                      onClick={handleSchedulePickup}
                      disabled={!!loadingAction}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-medium text-xs hover:bg-indigo-700 shadow-xs transition disabled:opacity-50"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Schedule Pickup
                    </button>
                  )}
                  {shipment.is_cancellable && (
                    <button
                      onClick={handleCancelShipment}
                      disabled={!!loadingAction}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-medium text-xs hover:bg-rose-100 transition disabled:opacity-50 ml-auto"
                    >
                      <Ban className="w-3.5 h-3.5 text-rose-600" />
                      Cancel Shipment
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Detail Cards ─────────────────────────────────────────────── */}
            <div className="p-6 space-y-5">

              {/* Customer & Delivery Address */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-600" /> Customer & Delivery Address
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Customer Name</p>
                    <p className="font-semibold text-slate-800">{shipment.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Contact Phone</p>
                    <p className="font-medium text-slate-800">{shipment.customer_phone || 'N/A'}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Delivery Address
                    </p>
                    {shipment.shipping_address ? (
                      <p className="text-xs text-slate-700 leading-relaxed font-medium mt-1">
                        {shipment.shipping_address.line1}
                        {shipment.shipping_address.line2 ? `, ${shipment.shipping_address.line2}` : ''}<br />
                        {shipment.shipping_address.city}, {shipment.shipping_address.state} — {shipment.shipping_address.pincode}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic mt-1">Address sourced from Order relation.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Package Metrics */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Weight className="w-4 h-4 text-indigo-600" /> Package Metrics & Fulfilment Center
                </h3>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block font-medium">Dead Weight</span>
                    <span className="text-slate-800 font-bold text-sm mt-0.5 block">{shipment.weight} kg</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block font-medium">Dimensions</span>
                    <span className="text-slate-800 font-bold text-sm mt-0.5 block">{shipment.length}×{shipment.width}×{shipment.height} cm</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block font-medium">Volumetric Wt.</span>
                    <span className="text-slate-800 font-bold text-sm mt-0.5 block">{shipment.volumetric_weight} kg</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block font-medium">COD Collection</span>
                    <span className="text-slate-800 font-bold text-sm mt-0.5 block">₹{shipment.cod_amount}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block font-medium">Delivery Mode</span>
                    <span className="text-slate-800 font-bold text-sm mt-0.5 block">{shipment.delivery_type}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block font-medium">Courier Status</span>
                    <span className="text-indigo-700 font-bold text-sm mt-0.5 block">
                      {SHIPMENT_STATUS_LABELS[shipment.shipment_status] || shipment.shipment_status}
                    </span>
                  </div>
                </div>
                <div className="pt-2 text-xs text-slate-500 border-t border-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {shipment.warehouse || 'FAAZO Central Warehouse'}
                  </span>
                  <span>Dispatch: {shipment.dispatch_location || 'Hub 1'}</span>
                </div>
              </div>

              {/* Order Items */}
              {shipment.items && shipment.items.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-indigo-600" /> Order Product Manifest ({shipment.items.length})
                  </h3>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
                    {shipment.items.map((item) => (
                      <div key={item.id} className="p-3 flex items-center justify-between bg-slate-50/50">
                        <div>
                          <p className="font-semibold text-slate-800">{item.product_name}</p>
                          {item.sku && <p className="text-[11px] font-mono text-slate-400">SKU: {item.sku}</p>}
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-slate-700">Qty: {item.quantity}</span>
                          <p className="font-bold text-indigo-900 mt-0.5">₹{item.total_price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tracking Timeline */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" /> Audit Tracking Ledger ({shipment.tracking_events.length})
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">Immutable Append-Only</span>
                </div>
                {shipment.tracking_events.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-3 text-center">No events recorded yet.</p>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {shipment.tracking_events.map((evt, idx) => (
                      <div key={evt.id || idx} className="relative text-xs">
                        <div className={`absolute -left-6 top-0.5 w-3 h-3 rounded-full border-2 bg-white ${
                          idx === 0 ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                        }`} />
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-slate-800">{evt.event_label}</p>
                            {evt.description && <p className="text-slate-600 mt-0.5 leading-relaxed">{evt.description}</p>}
                            {evt.location && <p className="text-[11px] text-slate-400 mt-0.5">📍 {evt.location}</p>}
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <span className="text-[11px] font-mono text-slate-400 block">
                              {new Date(evt.event_timestamp).toLocaleString()}
                            </span>
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-slate-100 text-slate-600">
                              {evt.event_source}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── Footer ──────────────────────────────────────────────────── */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Last Synced:{' '}
              {shipment.last_synced_at
                ? new Date(shipment.last_synced_at).toLocaleTimeString()
                : 'Never'}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition shadow-xs"
            >
              Close Drawer
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
