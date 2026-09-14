'use client';

import React, { useState } from 'react';
import {
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Package,
  CreditCard,
  MapPin,
  XCircle,
} from 'lucide-react';
import type { ReturnRequestDetail } from '@/services/returnsService';

interface ReturnTrackingTimelineProps {
  returnRequest: ReturnRequestDetail;
  onRefresh?: () => void;
}

interface MilestoneStep {
  id: string;
  title: string;
  desc: string;
  status: 'completed' | 'current' | 'upcoming' | 'failed';
  date?: string | null;
}

export const ReturnTrackingTimeline: React.FC<ReturnTrackingTimelineProps> = ({
  returnRequest,
  onRefresh,
}) => {
  const [showScanHistory, setShowScanHistory] = useState(false);

  const isReplacement = returnRequest.request_type === 'return_replacement';
  const status = returnRequest.status;
  const shipment = returnRequest.shipment;
  const verification = returnRequest.verification;
  const refund = returnRequest.refund;

  // Build the 6-7 milestone steps
  const getMilestones = (): MilestoneStep[] => {
    const isUnderReview = status === 'under_review' || status === 'requested';
    const isRejected = status === 'rejected';
    const isCancelled = status === 'cancelled';
    const isApproved = [
      'approved',
      'reverse_shipment_created',
      'pickup_scheduled',
      'pickup_attempted',
      'picked_up',
      'return_in_transit',
      'return_delivered',
      'verification_pending',
      'verification_passed',
      'verification_failed',
      'pickup_failed',
      'refund_initiated',
      'refund_completed',
      'replacement_approved',
      'new_shipment_created',
      'new_shipment_in_transit',
      'completed',
    ].includes(status);

    const isPickupScheduled = [
      'pickup_scheduled',
      'pickup_attempted',
      'picked_up',
      'return_in_transit',
      'return_delivered',
      'verification_pending',
      'verification_passed',
      'refund_initiated',
      'refund_completed',
      'replacement_approved',
      'new_shipment_created',
      'new_shipment_in_transit',
      'completed',
    ].includes(status);

    const isPickedUp = [
      'picked_up',
      'return_in_transit',
      'return_delivered',
      'verification_pending',
      'verification_passed',
      'refund_initiated',
      'refund_completed',
      'replacement_approved',
      'new_shipment_created',
      'new_shipment_in_transit',
      'completed',
    ].includes(status);

    const isInTransit = [
      'return_in_transit',
      'return_delivered',
      'verification_pending',
      'verification_passed',
      'refund_initiated',
      'refund_completed',
      'replacement_approved',
      'new_shipment_created',
      'new_shipment_in_transit',
      'completed',
    ].includes(status);

    const isDelivered = [
      'return_delivered',
      'verification_pending',
      'verification_passed',
      'refund_initiated',
      'refund_completed',
      'replacement_approved',
      'new_shipment_created',
      'new_shipment_in_transit',
      'completed',
    ].includes(status);

    const isFinalResolved = [
      'refund_completed',
      'completed',
      'new_shipment_in_transit',
    ].includes(status) || (refund && refund.status === 'success');

    const steps: MilestoneStep[] = [
      {
        id: 'requested',
        title: isReplacement ? 'Replacement Requested' : 'Return Requested',
        desc: 'Request submitted and under review by FAAZO operations.',
        status: isCancelled ? 'failed' : 'completed',
        date: returnRequest.created_at,
      },
      {
        id: 'approved',
        title: isRejected ? 'Request Declined' : 'Request Approved',
        desc: isRejected
          ? returnRequest.rejection_reason || 'Return conditions not satisfied.'
          : 'Approved by FAAZO. Reverse courier being dispatched.',
        status: isRejected
          ? 'failed'
          : isApproved
          ? 'completed'
          : isUnderReview
          ? 'current'
          : 'upcoming',
      },
      {
        id: 'pickup_scheduled',
        title: 'Reverse Pickup Scheduled',
        desc: shipment?.awb_number
          ? `Assigned to ${shipment.courier_name || 'Carrier'} (AWB: ${shipment.awb_number}).`
          : 'Carrier being assigned by Shiprocket logistics engine.',
        status:
          status === 'pickup_failed'
            ? 'failed'
            : isPickupScheduled
            ? 'completed'
            : status === 'approved' || status === 'reverse_shipment_created'
            ? 'current'
            : 'upcoming',
      },
      {
        id: 'doorstep_inspection',
        title: 'Doorstep Inspection & Pickup',
        desc:
          verification?.status === 'failed'
            ? `Inspection Failed: ${verification.failure_reason || 'Product mismatch or seal broken'}`
            : isPickedUp
            ? 'Package inspected and handed over to courier partner.'
            : 'Delivery executive will inspect product condition before accepting.',
        status:
          verification?.status === 'failed'
            ? 'failed'
            : isPickedUp
            ? 'completed'
            : status === 'pickup_scheduled' || status === 'pickup_attempted'
            ? 'current'
            : 'upcoming',
      },
      {
        id: 'in_transit',
        title: 'Return In Transit',
        desc:
          shipment?.current_location
            ? `Last scan at ${shipment.current_location}`
            : 'Package travelling back to FAAZO Central Fulfillment Center.',
        status: isDelivered
          ? 'completed'
          : isInTransit
          ? 'current'
          : 'upcoming',
      },
      {
        id: 'final_step',
        title: isReplacement ? 'Free Replacement Shipped' : 'Refund Processed',
        desc: isReplacement
          ? returnRequest.replacement_order_number
            ? `Replacement Order #${returnRequest.replacement_order_number} dispatched.`
            : 'Replacement unit will be dispatched upon return verification.'
          : refund?.status === 'success'
          ? `₹${returnRequest.total_refund_amount} refunded via Razorpay (ARN: ${refund.razorpay_refund_id || 'Instant'}).`
          : `₹${returnRequest.total_refund_amount} will be refunded to original payment method.`,
        status: isFinalResolved ? 'completed' : isDelivered ? 'current' : 'upcoming',
      },
    ];

    return steps;
  };

  const milestones = getMilestones();

  const getStepIcon = (s: MilestoneStep['status']) => {
    switch (s) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />;
      case 'current':
        return (
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-[#006670] flex items-center justify-center bg-teal-50">
            <div className="w-2 h-2 rounded-full bg-[#006670] animate-pulse" />
          </div>
        );
      case 'failed':
        return <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />;
      default:
        return <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-slate-300 bg-white" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-4 sm:p-5 mb-4 sm:mb-6 text-left">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl ${
              isReplacement ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {isReplacement ? <RefreshCw className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-800">
                {isReplacement ? 'Replacement Request' : 'Return & Refund Request'}
              </span>
              <span
                className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                  status.includes('delivered') || status.includes('completed')
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : status.includes('failed') || status.includes('rejected')
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-teal-50 border-teal-200 text-teal-800'
                }`}
              >
                {returnRequest.status_display || status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-sans mt-0.5">
              Reason: {returnRequest.reason_display || returnRequest.reason.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        {/* Amount / Replacement Link */}
        <div className="text-right">
          {isReplacement ? (
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 block">Fulfillment</span>
              {returnRequest.replacement_order_number ? (
                <span className="text-xs font-black text-indigo-700 font-mono">
                  New Order #{returnRequest.replacement_order_number}
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-600">Free Replacement</span>
              )}
            </div>
          ) : (
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 block">Refund Amount</span>
              <span className="text-xs sm:text-sm font-black text-slate-900 font-sans">
                ₹{returnRequest.total_refund_amount?.toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Exception Alert Banner (if failed / rejected) */}
      {status === 'rejected' && (
        <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-[11px] font-extrabold uppercase">Return Request Rejected</strong>
            <p className="mt-0.5 text-[11px]">
              {returnRequest.rejection_reason || 'The return request does not meet the product return criteria.'}
            </p>
          </div>
        </div>
      )}

      {status === 'pickup_failed' && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-[11px] font-extrabold uppercase">Pickup Attempt Unsuccessful</strong>
            <p className="mt-0.5 text-[11px]">
              The courier executive was unable to collect the item. Our team is rescheduling the pickup attempt.
            </p>
          </div>
        </div>
      )}

      {/* Shiprocket Reverse Shipment Card */}
      {shipment && shipment.awb_number && (
        <div className="mt-4 p-3 sm:p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#006670]/10 text-[#006670] rounded-xl shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                Reverse Logistics Partner
              </span>
              <p className="font-bold text-slate-800 text-xs truncate">
                {shipment.courier_name || 'Shiprocket Reverse Express'}
              </p>
              <p className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                Reverse AWB: <strong className="text-slate-800">{shipment.awb_number}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {shipment.tracking_url && (
              <a
                href={shipment.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[10px] font-bold text-slate-700 hover:text-[#006670] transition-colors"
              >
                <span>Live Carrier Tracker</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {shipment.tracking_events && shipment.tracking_events.length > 0 && (
              <button
                type="button"
                onClick={() => setShowScanHistory(!showScanHistory)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span>{showScanHistory ? 'Hide Scans' : `Scans (${shipment.tracking_events.length})`}</span>
                {showScanHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expanded Scan History Accordion */}
      {showScanHistory && shipment?.tracking_events && shipment.tracking_events.length > 0 && (
        <div className="mt-2.5 p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-left animate-in fade-in duration-200">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-1.5">
            Shiprocket Reverse Courier Checkpoints
          </span>
          <div className="space-y-2 divide-y divide-slate-50">
            {shipment.tracking_events.map((scan, idx) => (
              <div key={idx} className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-[10.5px]">
                <div>
                  <p className="font-bold text-slate-800">{scan.description || scan.event_label}</p>
                  {scan.location && (
                    <p className="text-[9.5px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-300" />
                      {scan.location}
                    </p>
                  )}
                </div>
                <span className="text-[9px] font-mono text-slate-400 shrink-0">
                  {new Date(scan.event_timestamp).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6-Milestone Stepper */}
      <div className="mt-5 space-y-4 font-sans">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
          Tracking Progress
        </span>

        <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {milestones.map((step, idx) => (
            <div key={step.id} className="relative group">
              {/* Step indicator node */}
              <div className="absolute -left-6 top-0.5 flex items-center justify-center bg-white">
                {getStepIcon(step.status)}
              </div>

              {/* Step Content */}
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h5
                    className={`text-xs font-bold uppercase tracking-tight ${
                      step.status === 'completed'
                        ? 'text-slate-800'
                        : step.status === 'current'
                        ? 'text-[#006670] font-black'
                        : step.status === 'failed'
                        ? 'text-rose-600 font-black'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </h5>
                  {step.date && (
                    <span className="text-[9.5px] text-slate-400 font-mono">
                      {new Date(step.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  )}
                </div>
                <p
                  className={`text-[11px] mt-0.5 leading-relaxed ${
                    step.status === 'current'
                      ? 'text-slate-700 font-medium'
                      : step.status === 'failed'
                      ? 'text-rose-600'
                      : 'text-slate-400'
                  }`}
                >
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
