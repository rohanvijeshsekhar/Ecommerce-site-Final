'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Circle,
  Package,
  Truck,
  MapPin,
  Clock,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../../lib/api';

interface MilestoneStep {
  id: string;
  label: string;
  description: string;
  is_completed: boolean;
  is_current: boolean;
}

interface TrackingEvent {
  id: string;
  event_label: string;
  status_mapped: string;
  event_timestamp: string;
  location: string;
  description: string;
  is_delivered: boolean;
}

interface ShipmentInfo {
  id: string;
  shipment_number: string;
  courier_name: string;
  awb_number: string;
  tracking_number: string;
  tracking_url: string;
  shipment_status: string;
  pickup_status: string;
  current_location: string;
  estimated_delivery_date: string | null;
  delivered_at: string | null;
  last_synced_at: string | null;
  tracking_events: TrackingEvent[];
}

interface TrackingData {
  shipment: ShipmentInfo | null;
  milestone_progress: MilestoneStep[];
  current_milestone_id: string;
  current_status_description: string;
}

interface OrderTrackingTimelineProps {
  orderId: string;
  orderStatus: string;
}

const getMilestoneIcon = (milestoneId: string, isCompleted: boolean, isCurrent: boolean) => {
  const cls = `w-4 h-4 ${isCompleted ? 'text-white' : isCurrent ? 'text-[#006670]' : 'text-slate-300'}`;
  if (milestoneId === 'ORDER_PLACED') return <Package className={cls} />;
  if (milestoneId === 'DELIVERED') return <CheckCircle2 className={cls} />;
  if (['IN_TRANSIT', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(milestoneId)) return <Truck className={cls} />;
  return <Circle className={cls} />;
};

function estimateMilestones(orderStatus: string): MilestoneStep[] {
  const statuses = ['pending_payment', 'processing', 'packed', 'shipped', 'delivered'];
  const currentIdx = statuses.indexOf(orderStatus);
  const ids = ['ORDER_PLACED', 'PROCESSING', 'PACKED', 'IN_TRANSIT', 'DELIVERED'];
  const labels = ['Order Placed', 'Processing', 'Packed', 'Shipped', 'Delivered'];
  const descs = [
    'Your order has been received.',
    'Being prepared by our warehouse team.',
    'Packed and ready for courier.',
    'In transit with the courier.',
    'Successfully delivered.',
  ];
  return ids.map((id, i) => ({
    id, label: labels[i], description: descs[i],
    is_completed: i <= currentIdx, is_current: i === currentIdx,
  }));
}

const OrderTrackingTimeline: React.FC<OrderTrackingTimelineProps> = ({ orderId, orderStatus }) => {
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEvents, setShowEvents] = useState(false);

  const fetchTracking = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get(`/orders/${orderId}/shipment/`);
      if (res.data?.success && res.data?.data) setTracking(res.data.data);
    } catch (err) {
      console.warn('Tracking fetch failed:', err);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => { fetchTracking(); }, [fetchTracking]);

  if (orderStatus === 'cancelled') return null;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-5 mb-4 sm:mb-6 animate-pulse">
        <div className="h-3 bg-slate-100 rounded w-40 mb-6" />
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-100" />
              <div className="h-2 bg-slate-100 rounded w-14" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const milestones: MilestoneStep[] = tracking?.milestone_progress ?? estimateMilestones(orderStatus);
  const currentDesc = tracking?.current_status_description ?? '';
  const shipment = tracking?.shipment ?? null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] mb-4 sm:mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-slate-100">
        <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-[#006670] uppercase">
          Shiprocket Shipment Milestones
        </span>
        <button
          onClick={() => fetchTracking(true)}
          disabled={refreshing}
          className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-[#006670] transition-colors cursor-pointer disabled:opacity-50"
          title="Sync latest status from Shiprocket"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{refreshing ? 'Syncing...' : 'Sync'}</span>
        </button>
      </div>

      {/* Current status banner */}
      {currentDesc && (
        <div className="px-4 sm:px-5 py-2.5 bg-[#e8f5f6] border-b border-[#006670]/10">
          <p className="text-[11px] sm:text-xs text-[#006670] font-semibold leading-snug">{currentDesc}</p>
        </div>
      )}

      {/* Timeline steps */}
      <div className="px-4 sm:px-5 pt-5 pb-4">
        <div className="relative">
          <div className="md:hidden absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-100 z-0" />
          <div className="hidden md:block absolute left-4 right-4 h-0.5 bg-slate-100 top-4 z-0" />
          <div className="flex flex-col md:flex-row md:justify-between gap-4 md:gap-0">
            {milestones.map((step) => {
              const isCompleted = step.is_completed;
              const isCurrent = step.is_current;
              return (
                <div key={step.id} className="flex md:flex-col items-start md:items-center gap-3 md:gap-2 relative z-10 md:flex-1">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300
                    ${isCompleted
                      ? 'bg-[#006670] border-[#006670] shadow-[0_0_0_3px_rgba(0,102,112,0.12)]'
                      : isCurrent
                        ? 'bg-white border-[#006670] shadow-[0_0_0_3px_rgba(0,102,112,0.12)]'
                        : 'bg-white border-slate-200'}
                  `}>
                    {isCompleted
                      ? <CheckCircle2 className="w-4 h-4 text-white" />
                      : getMilestoneIcon(step.id, isCompleted, isCurrent)
                    }
                  </div>
                  <div className="md:text-center min-w-0 md:max-w-[80px]">
                    <span className={`text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wide block leading-tight
                      ${isCompleted || isCurrent ? 'text-slate-800' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                    {isCurrent && (
                      <span className="mt-0.5 inline-flex items-center gap-0.5 text-[8.5px] text-[#006670] font-bold uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#006670] animate-pulse inline-block" />
                        Live
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Courier info block */}
      {shipment && (
        <div className="mx-4 sm:mx-5 mb-4 sm:mb-5 rounded-xl bg-slate-50 border border-slate-200/60 p-3.5 sm:p-4 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#e8f5f6] rounded-lg">
                <Truck className="w-3.5 h-3.5 text-[#006670]" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Courier Partner</span>
                <span className="text-xs font-extrabold text-slate-800">{shipment.courier_name || 'Shiprocket Carrier'}</span>
              </div>
            </div>
            {shipment.tracking_url && (
              <a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-bold text-[#006670] hover:text-[#00555e] transition-colors">
                Track on Shiprocket <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-200/70">
            {shipment.awb_number && (
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">AWB No.</span>
                <span className="text-[10.5px] font-mono font-bold text-slate-700 truncate block">{shipment.awb_number}</span>
              </div>
            )}
            {shipment.current_location && (
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Location</span>
                <span className="text-[10.5px] font-bold text-slate-700 truncate block">{shipment.current_location}</span>
              </div>
            )}
            {shipment.estimated_delivery_date && (
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Est. Delivery</span>
                <span className="text-[10.5px] font-extrabold text-[#006670] block">
                  {new Date(shipment.estimated_delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>
          {shipment.last_synced_at && (
            <p className="text-[9px] text-slate-400 font-sans pt-0.5">
              Last synced: {new Date(shipment.last_synced_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}

      {/* Scanned Events accordion */}
      {shipment && shipment.tracking_events.length > 0 && (
        <div className="border-t border-slate-100">
          <button onClick={() => setShowEvents(v => !v)}
            className="w-full flex items-center justify-between px-4 sm:px-5 py-3 text-[10.5px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50/60 transition-colors cursor-pointer">
            <span className="uppercase tracking-widest text-[9px] font-black">
              Courier Scan History ({shipment.tracking_events.length})
            </span>
            {showEvents ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showEvents && (
            <div className="px-4 sm:px-5 pb-4 space-y-2.5">
              {[...shipment.tracking_events].reverse().map((evt) => (
                <div key={evt.id} className={`flex gap-3 text-[11px] p-2.5 rounded-xl border ${
                  evt.is_delivered ? 'bg-emerald-50/60 border-emerald-100' : 'bg-slate-50/60 border-slate-100'}`}>
                  <div className={`w-1.5 shrink-0 rounded-full mt-0.5 self-stretch ${evt.is_delivered ? 'bg-emerald-400' : 'bg-[#006670]'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-800 text-[11px]">{evt.event_label}</span>
                      <span className="text-[9.5px] text-slate-400 font-sans shrink-0">
                        {new Date(evt.event_timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {evt.description && <p className="text-[10px] text-slate-500 font-sans mt-0.5 leading-relaxed">{evt.description}</p>}
                    {evt.location && (
                      <p className="text-[9.5px] text-slate-400 font-sans mt-0.5 flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5 shrink-0" /> {evt.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderTrackingTimeline;
