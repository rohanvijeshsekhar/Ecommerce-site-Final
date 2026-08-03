'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Calendar,
  FileText,
  MapPin,
  Phone,
  Truck,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  Clock,
  Printer,
  X,
  CreditCard,
  Building,
  Package,
  Star,
  MessageSquarePlus,
} from 'lucide-react';
import { ordersService } from '../../lib/services/ordersService';
import type { OrderDetail } from '../../lib/services/ordersService';
import { ReviewModal } from './ReviewModal';

interface OrderDetailPageProps {
  orderId: string;
  onBack: () => void;
  onProductClick: (slug: string) => void;
  showToast?: (msg: string) => void;
}

const OrderDetailPage: React.FC<OrderDetailPageProps> = ({
  orderId,
  onBack,
  onProductClick,
  showToast,
}) => {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeReviewProduct, setActiveReviewProduct] = useState<{ id: string; name: string } | null>(null);

  const fetchOrderDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ordersService.getOrderDetail(orderId);
      if (res.success && res.data) {
        setOrder(res.data);
      } else {
        showToast?.('Order details not found.');
        onBack();
      }
    } catch (err) {
      console.error(err);
      showToast?.('Failed to load order records.');
    } finally {
      setLoading(false);
    }
  }, [orderId, onBack, showToast]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      showToast?.('Please specify a cancellation reason.');
      return;
    }
    setCancelling(true);
    try {
      const res = await ordersService.cancelOrder(orderId, cancelReason.trim());
      if (res.success && res.data) {
        showToast?.('Order cancelled successfully.');
        setOrder(res.data);
        setShowCancelModal(false);
        setCancelReason('');
      } else {
        showToast?.(res.message || 'Failed to cancel order.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Fulfillment block: cannot cancel order.';
      showToast?.(msg);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-[#f4f7f7] min-h-screen pt-[112px] lg:pt-[160px] pb-16 flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-[#006670] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400">Loading order records...</p>
      </div>
    );
  }

  if (!order) return null;

  const isCancellable = ['pending_payment', 'processing', 'packed'].includes(order.status);

  // Status mapping
  const getStatusLabel = (status: OrderDetail['status']) => {
    switch (status) {
      case 'pending_payment': return 'Pending Payment';
      case 'processing': return 'Processing';
      case 'packed': return 'Packed';
      case 'shipped': return 'Shipped';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  // Build the status history array
  const steps = [
    { label: 'Placed', key: 'pending_payment', desc: 'Order logged' },
    { label: 'Processing', key: 'processing', desc: 'Calibrating unit' },
    { label: 'Packed', key: 'packed', desc: 'Calibrated & ready' },
    { label: 'Shipped', key: 'shipped', desc: 'In transit' },
    { label: 'Delivered', key: 'delivered', desc: 'Installed' }
  ];

  const getStepActive = (stepKey: string) => {
    if (order.status === 'cancelled') return false;
    const hierarchy = ['pending_payment', 'processing', 'packed', 'shipped', 'delivered'];
    const currentIdx = hierarchy.indexOf(order.status);
    const stepIdx = hierarchy.indexOf(stepKey);
    return stepIdx <= currentIdx;
  };

  return (
    <div className="w-full bg-[#f4f7f7] min-h-screen pt-[112px] lg:pt-[160px] pb-16 font-sans select-none text-left animate-in fade-in duration-300">
      <div className="max-w-4xl mx-auto px-4 md:px-6">

        {/* Back and Page Actions */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-[#006670] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
            Back to Orders
          </button>

          <div className="flex gap-2.5">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#e6f3f5] border border-[#006670]/10 hover:border-[#006670]/25 text-[#006670] rounded-xl text-xs font-extrabold uppercase tracking-wide cursor-pointer transition-all"
            >
              <Printer className="w-4.5 h-4.5" />
              Download Invoice
            </button>
            {isCancellable && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100/70 border border-rose-200/55 hover:border-rose-200 text-rose-600 rounded-xl text-xs font-extrabold uppercase tracking-wide cursor-pointer transition-all"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {/* Order Info Card Header */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-5 space-y-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black tracking-widest text-[#006670] uppercase">FAAZO LOGISTICS ID</span>
              <h2 className="text-xl font-black text-slate-800 tracking-tight mt-0.5 uppercase">
                {order.order_number}
              </h2>
            </div>
            <div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full border block w-fit
                ${order.status === 'delivered' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                  order.status === 'cancelled' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                    order.status === 'processing' ? 'bg-amber-50 border-amber-100 text-amber-500' :
                      'bg-slate-100 border-slate-200 text-slate-500'}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-100 pt-4 text-xs font-sans">
            <div>
              <span className="text-slate-400 block font-bold">Placed on</span>
              <span className="font-bold text-slate-700 mt-1 block">
                {new Date(order.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric'
                })}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold">Estimated Delivery</span>
              <span className="font-extrabold text-[#006670] mt-1 block">
                {order.estimated_delivery_date ? new Date(order.estimated_delivery_date).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric'
                }) : 'Calculated after dispatch'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold">Gross Total</span>
              <span className="font-extrabold text-slate-700 mt-1 block">₹{order.total_amount.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold">Mode of Payment</span>
              <span className="font-bold text-slate-700 uppercase mt-1 block">{order.payment_method}</span>
            </div>
          </div>
        </div>

        {/* Timelines block */}
        {order.status !== 'cancelled' ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-5 mb-6 text-center">
            <span className="text-[10px] font-black tracking-widest text-[#006670] uppercase block mb-6 text-left">Fulfillment Milestones</span>
            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-4 max-w-2xl mx-auto py-2">
              <div className="hidden md:block absolute left-4 right-4 h-0.5 bg-slate-150 top-1/2 -translate-y-1/2 z-0" />
              {steps.map((step, idx) => {
                const isActive = getStepActive(step.key);
                return (
                  <div key={step.key} className="flex md:flex-col items-center gap-3 md:gap-2.5 relative z-10 text-left md:text-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-black text-xs transition-colors
                      ${isActive
                        ? 'bg-[#006670] border-[#006670] text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-400'}`}>
                      {isActive ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                    </div>
                    <div>
                      <span className={`text-[10.5px] font-extrabold uppercase tracking-wide block
                        ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                        {step.label}
                      </span>
                      <span className="text-[9px] text-slate-400 font-sans block mt-0.5">{step.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-5 mb-6 flex gap-3 text-left">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <h4 className="font-extrabold text-rose-800 uppercase tracking-wide">Fulfillment Cancelled</h4>
              <p className="text-rose-700 mt-1">This procurement order was cancelled. Reserved inventory holds have been safely restored.</p>
              {order.cancellation_reason && (
                <p className="text-[11px] text-rose-500 mt-2 bg-white/70 border border-rose-100 p-2.5 rounded-lg leading-relaxed">
                  <strong>Cancellation Reason:</strong> {order.cancellation_reason}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Shipping details (if shipped) */}
        {order.tracking_number && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-5 mb-6 flex gap-4 text-left">
            <div className="p-3 bg-[#e6f3f5] rounded-xl text-[#006670]">
              <Truck className="w-6 h-6" />
            </div>
            <div className="text-xs space-y-1">
              <h4 className="font-black text-slate-800 uppercase tracking-wider">Shipment Dispatch Details</h4>
              <p className="text-slate-600 font-medium font-sans">
                Shipped via <strong className="text-slate-800">{order.shipping_carrier || 'Logistics Partner'}</strong>
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                Tracking Number: <strong className="text-slate-700">{order.tracking_number}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Detailed Grid: Products List & Breakdown Summary */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* List of items */}
          <div className="md:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4">
              Items Purchased
            </h3>
            <div className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <div key={item.id} className="py-3.5 flex items-center justify-between gap-4 text-xs font-bold">
                  <div className="flex items-center gap-3">
                    {item.image_url ? (
                      <img
                        src={`http://localhost:8000${item.image_url}`}
                        alt={item.product_name}
                        className="w-11 h-11 object-contain bg-slate-50 border border-slate-100 p-1 rounded-xl shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0 text-slate-400">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <p className="text-slate-800 hover:text-[#006670] cursor-pointer" onClick={() => onProductClick(item.product_slug)}>
                        {item.product_name}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Qty: {item.quantity} • ₹{item.price.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-700 shrink-0 font-sans">
                      ₹{(item.quantity * item.price).toLocaleString('en-IN')}
                    </span>
                    {['delivered', 'DELIVERED'].includes(order.status) && (
                      <button
                        onClick={() => setActiveReviewProduct({ id: (item as any).product_id || (item as any).product || item.id, name: item.product_name })}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-200 transition-colors shadow-2xs"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 stroke-none" />
                        <span>Write Review</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing detail matrix and location details */}
          <div className="md:col-span-4 space-y-6">
            {/* Price Calculations */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-left font-sans text-xs">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4">
                Cost Breakdown
              </h3>
              <div className="space-y-2.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Gross Value</span>
                  <span className="font-semibold text-slate-800">₹{order.selling_subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Amount (IGST)</span>
                  <span className="font-semibold text-slate-800">₹{order.gst_amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="font-semibold text-slate-800">
                    {order.shipping_fee === 0 ? 'FREE' : `₹${order.shipping_fee.toLocaleString('en-IN')}`}
                  </span>
                </div>
                <div className="border-t border-slate-100 pt-3.5 flex justify-between text-sm font-black text-slate-900">
                  <span>Total Cost Paid</span>
                  <span className="text-[#006670] font-sans text-base">₹{order.total_amount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Delivery address */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-left text-xs">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Delivery Address
              </h3>
              <div className="space-y-1.5">
                <p className="font-extrabold text-slate-800">{order.shipping_address_detail?.full_name}</p>
                <p className="text-slate-500 font-sans leading-relaxed">
                  {order.shipping_address_detail?.line1}
                  {order.shipping_address_detail?.line2 && `, ${order.shipping_address_detail.line2}`}
                </p>
                <p className="text-slate-500 font-sans">
                  {order.shipping_address_detail?.city}, {order.shipping_address_detail?.state} - {order.shipping_address_detail?.pincode}
                </p>
                <p className="text-slate-400 font-sans pt-1">
                  Phone: {order.shipping_address_detail?.mobile}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Cancellation Prompt Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100/80 text-left space-y-5 animate-scale-in">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Cancel Order Request
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Are you sure you want to cancel this order? This will release reserved inventory and reject payment details.
            </p>
            <form onSubmit={handleCancelOrder} className="space-y-4">
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation (required)..."
                className="w-full border border-slate-200 p-3.5 rounded-xl text-xs font-bold text-slate-800 bg-white"
              />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="py-3 rounded-xl border border-slate-200 text-slate-500 text-xs font-extrabold uppercase hover:bg-slate-50 transition-colors cursor-pointer text-center"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-xs font-extrabold uppercase transition-colors cursor-pointer text-center"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Professionally styled HTML Invoice Print Modal (Option A) */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Header controls */}
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 print:hidden">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4.5 h-4.5" />
                FAAZO Official Procurement Invoice
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#006670] hover:bg-[#004e56] text-white rounded-lg text-xs font-extrabold uppercase transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-1.5 border border-slate-200 hover:border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Invoice print sheet */}
            <div className="flex-grow p-8 overflow-y-auto bg-white print:p-0" id="print-invoice-sheet">
              {/* Styling specifically for printing layout */}
              <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #print-invoice-sheet, #print-invoice-sheet * {
                    visibility: visible;
                  }
                  #print-invoice-sheet {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    padding: 0;
                    margin: 0;
                  }
                  .print\\:hidden {
                    display: none !important;
                  }
                }
              `}} />

              {/* Invoice Layout */}
              <div className="space-y-6 text-xs text-slate-800 text-left">
                {/* Logo and billing header */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <img src="/images/Artboard 1@4x (1).png" alt="FAAZO Logo" className="h-10 w-auto object-contain" />
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-1">ENGINEERING CLINICAL EXCELLENCE</p>
                  </div>
                  <div className="text-right">
                    <h1 className="text-lg font-black text-slate-900 tracking-tight">TAX INVOICE</h1>
                    <p className="text-slate-500 font-mono mt-0.5">Invoice #: {order.invoice_number}</p>
                    <p className="text-slate-500 font-mono mt-0.5">Order #: {order.order_number}</p>
                    <p className="text-slate-500 font-mono mt-0.5">Date: {new Date(order.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>

                <hr className="border-slate-200" />

                {/* Sender/Receiver grid info */}
                <div className="grid grid-cols-2 gap-8 text-[11px] leading-relaxed">
                  <div>
                    <h4 className="font-extrabold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      Sold By
                    </h4>
                    <p className="font-extrabold text-slate-900">FAAZO Dental Solutions Pvt. Ltd.</p>
                    <p className="text-slate-600">102 Dental Hub Tech Park, Bandra Kurla Complex</p>
                    <p className="text-slate-600">Mumbai, Maharashtra - 400051</p>
                    <p className="text-slate-500">GSTIN: 27AAFCD1024D1ZS</p>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Shipped To
                    </h4>
                    <p className="font-extrabold text-slate-900">{order.shipping_address_detail?.full_name}</p>
                    {order.notes && <p className="font-bold text-slate-800">{order.notes}</p>}
                    <p className="text-slate-600">
                      {order.shipping_address_detail?.line1}
                      {order.shipping_address_detail?.line2 && `, ${order.shipping_address_detail.line2}`}
                    </p>
                    <p className="text-slate-600">
                      {order.shipping_address_detail?.city}, {order.shipping_address_detail?.state} - {order.shipping_address_detail?.pincode}
                    </p>
                    <p className="text-slate-500">Mobile: {order.shipping_address_detail?.mobile}</p>
                  </div>
                </div>

                {/* Items detailed table */}
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-800 font-extrabold uppercase text-slate-400 text-[10px]">
                      <th className="py-2.5">Product Description</th>
                      <th className="py-2.5 text-right">Unit Price</th>
                      <th className="py-2.5 text-center w-16">Qty</th>
                      <th className="py-2.5 text-right w-24">Total (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items.map((item, idx) => (
                      <tr key={idx} className="font-sans font-medium text-slate-700">
                        <td className="py-3 font-bold text-slate-800">{item.product_name}</td>
                        <td className="py-3 text-right">₹{item.price.toLocaleString('en-IN')}</td>
                        <td className="py-3 text-center">{item.quantity}</td>
                        <td className="py-3 text-right font-bold text-slate-900">₹{(item.quantity * item.price).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pricing Summary */}
                <div className="flex justify-end pt-4">
                  <div className="w-72 space-y-2 text-slate-600 font-sans text-xs">
                    <div className="flex justify-between">
                      <span>Total Net Price</span>
                      <span className="font-bold text-slate-800">₹{order.selling_subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST Tax (18% IGST)</span>
                      <span className="font-bold text-slate-800">₹{order.gst_amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping Fees</span>
                      <span className="font-bold text-slate-800">{order.shipping_fee === 0 ? 'FREE' : `₹${order.shipping_fee.toLocaleString('en-IN')}`}</span>
                    </div>
                    <div className="border-t-2 border-slate-800 pt-2 flex justify-between font-display text-sm font-black text-slate-900">
                      <span>Total Cost Paid</span>
                      <span className="text-[#006670]">₹{order.total_amount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-200" />

                {/* Footer notes */}
                <div className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  <p><strong>Declaration:</strong> This is a computer generated invoice and does not require physical signatures. Transit coverage for complete system calibration is certified ISO 13485.</p>
                  <p className="mt-1">For support requests, contact us at operations@faazo.com or call 1800-FAAZO-DENTAL.</p>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal Dialog */}
      {activeReviewProduct && (
        <ReviewModal
          isOpen={!!activeReviewProduct}
          onClose={() => setActiveReviewProduct(null)}
          productId={activeReviewProduct.id}
          productName={activeReviewProduct.name}
          orderId={order?.id}
          onSuccess={() => {
            showToast?.('Review submitted successfully!');
            setActiveReviewProduct(null);
          }}
        />
      )}
    </div>
  );
};

export default OrderDetailPage;
