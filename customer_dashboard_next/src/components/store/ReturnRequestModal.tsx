'use client';

import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  RefreshCw,
  Upload,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Info,
} from 'lucide-react';
import { returnsService } from '@/services/returnsService';
import type { ReturnEligibilityItem } from '@/services/returnsService';

interface ReturnRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  eligibleItem: ReturnEligibilityItem;
  defaultType?: 'return_refund' | 'return_replacement';
  onSuccess: (returnReq: any) => void;
  showToast?: (msg: string) => void;
}

const REASONS = [
  { value: 'defective', label: 'Defective / Not Functioning Properly' },
  { value: 'damaged_in_transit', label: 'Damaged in Transit / Broken Seal' },
  { value: 'wrong_item', label: 'Wrong Item or Variant Received' },
  { value: 'missing_parts', label: 'Missing Accessories / Parts' },
  { value: 'quality_not_as_expected', label: 'Quality / Specs Not as Described' },
  { value: 'ordered_by_mistake', label: 'Ordered by Mistake (Unopened)' },
  { value: 'other', label: 'Other Operational Reason' },
];

export const ReturnRequestModal: React.FC<ReturnRequestModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  eligibleItem,
  defaultType = 'return_refund',
  onSuccess,
  showToast,
}) => {
  const [requestType, setRequestType] = useState<'return_refund' | 'return_replacement'>(defaultType);
  const [reason, setReason] = useState<string>('defective');
  const [quantity, setQuantity] = useState<number>(1);
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const maxQty = Math.max(1, eligibleItem.max_returnable_qty || 1);
  const refundEstimate = eligibleItem.price * quantity;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (selectedFiles.length + filesArray.length > 4) {
        setErrorMsg('You can upload a maximum of 4 evidence photos/documents.');
        return;
      }
      setSelectedFiles((prev) => [...prev, ...filesArray].slice(0, 4));
      setErrorMsg(null);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (quantity < 1 || quantity > maxQty) {
      setErrorMsg(`Quantity must be between 1 and ${maxQty}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Build FormData for file uploads + payload
      const formData = new FormData();
      formData.append('order_id', orderId);
      formData.append('request_type', requestType);
      formData.append('reason', reason);
      formData.append('customer_notes', customerNotes);
      formData.append(
        'items',
        JSON.stringify([
          {
            order_item_id: eligibleItem.order_item_id,
            quantity: quantity,
          },
        ])
      );

      selectedFiles.forEach((file) => {
        formData.append('evidence_files', file);
      });

      const res = await returnsService.createReturnRequest(formData);
      if (res.success && res.data) {
        showToast?.(
          requestType === 'return_refund'
            ? 'Return & refund request submitted for approval.'
            : 'Replacement request submitted for approval.'
        );
        onSuccess(res.data);
        onClose();
      } else {
        setErrorMsg(res.message || 'Failed to submit request.');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        'Server error: could not submit request.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                requestType === 'return_refund'
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              {requestType === 'return_refund' ? (
                <RotateCcw className="w-5 h-5" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-tight">
                {requestType === 'return_refund'
                  ? 'Request Return & Refund'
                  : 'Request Free Replacement'}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-mono">
                Order #{orderNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-4 text-xs font-sans">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="text-[11px] font-medium leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Product Summary Card */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                Selected Item
              </span>
              <p className="font-bold text-slate-800 text-xs truncate">
                {eligibleItem.product_name}
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                Paid: ₹{eligibleItem.price.toLocaleString('en-IN')} / unit
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 block">
                Delivered
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Max Qty: {maxQty}
              </span>
            </div>
          </div>

          {/* Request Type Toggle */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
              Select Resolution Type
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRequestType('return_refund')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                  requestType === 'return_refund'
                    ? 'border-rose-500 bg-rose-50/50 text-rose-900 shadow-xs ring-1 ring-rose-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Return & Refund</span>
                  {requestType === 'return_refund' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Razorpay refund to source account after inspection.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRequestType('return_replacement')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                  requestType === 'return_replacement'
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 shadow-xs ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Free Replacement</span>
                  {requestType === 'return_replacement' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Brand new unit dispatched via Shiprocket at ₹0.
                </p>
              </button>
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                Return Quantity
              </label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-bold text-slate-800 text-xs focus:ring-1 focus:ring-[#006670] outline-none"
              >
                {Array.from({ length: maxQty }, (_, i) => i + 1).map((q) => (
                  <option key={q} value={q}>
                    {q} {q === 1 ? 'unit' : 'units'}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                {requestType === 'return_refund' ? 'Estimated Refund' : 'Replacement Cost'}
              </span>
              <p className="text-sm font-black text-slate-800 font-sans mt-0.5">
                {requestType === 'return_refund'
                  ? `₹${refundEstimate.toLocaleString('en-IN')}`
                  : '₹0 (Free Dispatch)'}
              </p>
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
              Reason for Return / Replacement *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-bold text-slate-800 text-xs focus:ring-1 focus:ring-[#006670] outline-none"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
              Detailed Description / Issue Details
            </label>
            <textarea
              rows={2}
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Describe the issue, defect, or missing component..."
              className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-xs font-medium text-slate-800 focus:ring-1 focus:ring-[#006670] outline-none"
            />
          </div>

          {/* Evidence Photos Upload */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
              Upload Photos / Evidence (Optional, max 4)
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-3.5 text-center bg-slate-50/50 cursor-pointer relative transition-colors">
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                disabled={selectedFiles.length >= 4}
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-[11px] font-bold text-slate-600">
                Click or drag files to upload
              </p>
              <p className="text-[9.5px] text-slate-400">
                Clear photo of product, barcode/serial, and invoice (JPG, PNG, PDF up to 5MB each)
              </p>
            </div>

            {/* Selected File Previews */}
            {selectedFiles.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-[#006670] shrink-0" />
                      <span className="truncate text-slate-700 font-medium text-[11px]">
                        {file.name}
                      </span>
                      <span className="text-[9.5px] text-slate-400 font-mono shrink-0">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Doorstep Verification & Logistics Notice */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-start gap-2.5 text-amber-800">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[10px] leading-relaxed">
              <span className="font-extrabold uppercase tracking-wide block text-amber-900">
                Doorstep Verification Policy
              </span>
              <p className="mt-0.5">
                During courier pickup, the delivery partner will inspect the product condition,
                serial number, and accessories. Once verified, the reverse shipment will be initiated,
                and your {requestType === 'return_refund' ? 'refund' : 'replacement'} will be processed.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase hover:bg-slate-50 transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`py-2.5 rounded-xl text-white font-extrabold text-xs uppercase tracking-wide transition-all cursor-pointer text-center shadow-xs ${
                requestType === 'return_refund'
                  ? 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300'
                  : 'bg-[#006670] hover:bg-[#00555e] disabled:bg-slate-300'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
