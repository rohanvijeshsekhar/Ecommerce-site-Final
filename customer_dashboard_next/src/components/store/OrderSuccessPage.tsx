'use client';

import React from 'react';
import {
  CheckCircle2,
  ArrowRight,
  Download,
  Home,
  Package,
  MapPin,
  CreditCard,
  Truck,
  ShieldCheck,
  Star,
  Banknote,
  Clock,
  ReceiptText,
  Copy,
  Check,
} from 'lucide-react';
import { ordersService } from '../../lib/services/ordersService';
import { useStore } from '../../contexts/StoreContext';
import { getAbsoluteImageUrl } from '../../lib/api';

interface MockCartItem {
  id: string;
  name: string;
  category: string;
  price: number;
  qty: number;
  image: string;
  originalPrice?: number;
}

interface Address {
  id: string;
  type: string;
  dentist: string;
  clinic: string;
  street: string;
  city: string;
  pincode: string;
  phone: string;
}

interface OrderSuccessPageProps {
  orderData: {
    id: string;
    items: MockCartItem[];
    address: Address;
    paymentMethod: string;
    pricing: {
      subtotal: number;
      shipping: number;
      gst: number;
      discount: number;
      cod_fee?: number;
      cod_collectable_amount?: number;
      total: number;
      savings: number;
    };
  } | null;
  setCurrentView: (
    view: 'home' | 'portfolio' | 'listing' | 'detail' | 'cart' | 'wishlist' | 'checkout' | 'order-success' | 'my-orders'
  ) => void;
  setActiveTrackingOrderId: (id: string | null) => void;
}

const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({
  orderData,
  setCurrentView,
  setActiveTrackingOrderId,
}) => {
  const store = useStore();
  const [mounted, setMounted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    // Small delay lets StoreContext finish its sessionStorage hydration useEffect
    const t = setTimeout(() => {
      setMounted(true);
    }, 80);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => clearTimeout(t);
  }, []);

  const activeOrder = orderData || (mounted ? store?.completedOrderData : null);
  const paymentMethodStr = (
    activeOrder?.paymentMethod || (activeOrder as any)?.payment_method || ''
  ).toLowerCase();
  const isCod = paymentMethodStr === 'cod' || paymentMethodStr.includes('cash on delivery');

  const orderId = activeOrder?.id || (activeOrder as any)?.order_number || null;
  const invoiceNumber = (activeOrder as any)?.invoice_number || null;

  const items: MockCartItem[] = activeOrder?.items || [];
  const address = activeOrder?.address || null;
  const pricing = activeOrder?.pricing || null;

  // Shorten UUID for display (first 8 chars + ...)
  const shortId = orderId
    ? orderId.includes('-')
      ? orderId.split('-')[0].toUpperCase()
      : orderId.slice(0, 8).toUpperCase()
    : null;

  const handleCopyId = () => {
    if (orderId) {
      navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTrackOrder = () => {
    if (orderId) setActiveTrackingOrderId(orderId);
    setCurrentView('my-orders');
    window.scrollTo(0, 0);
  };

  const handleDownloadInvoice = () => {
    const targetId =
      orderData?.id ||
      (orderData as any)?.order_number ||
      (orderData as any)?.invoice_number ||
      store?.completedOrderData?.id ||
      store?.completedOrderData?.order_number ||
      orderId;
    const invNum =
      (orderData as any)?.invoice_number ||
      store?.completedOrderData?.invoice_number;
    ordersService.downloadInvoice(targetId, invNum, store?.showToast);
  };

  // Show skeleton while waiting for sessionStorage hydration
  if (!mounted) {
    return (
      <div className="w-full bg-[#F4F7F8] min-h-screen pt-[108px] lg:pt-[138px] pb-20 font-sans">
        <div className="max-w-4xl mx-auto px-4 md:px-6 space-y-5 animate-pulse">
          <div className="bg-white rounded-2xl h-64 border border-slate-200/70" />
          <div className="bg-white rounded-2xl h-20 border border-slate-200/70" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 bg-white rounded-2xl h-64 border border-slate-200/70" />
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl h-32 border border-slate-200/70" />
              <div className="bg-white rounded-2xl h-24 border border-slate-200/70" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state (after hydration, still no order data)
  if (!activeOrder && mounted) {
    return (
      <div className="w-full bg-[#F4F7F8] min-h-screen pt-[112px] lg:pt-[144px] pb-16 font-sans flex items-center justify-center">
        <div className="text-center max-w-xs mx-auto px-6">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-base font-black text-slate-800 mb-2">No Order Found</h2>
          <p className="text-xs text-slate-400 font-sans mb-6 leading-relaxed">
            This page appears after completing a purchase.
          </p>
          <button
            onClick={() => setCurrentView('home')}
            className="px-6 py-2.5 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#F4F7F8] min-h-screen pt-[108px] lg:pt-[138px] pb-20 font-sans select-none text-left">
      <div className="max-w-4xl mx-auto px-4 md:px-6 space-y-5">

        {/* ─── Hero Success Card ─── */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-400 via-[#006670] to-emerald-400" />

          <div className="p-6 md:p-8 text-center">
            {/* Checkmark */}
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200/60 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 stroke-[2]" />
            </div>

            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3">
              <CheckCircle2 className="w-3 h-3" />
              {isCod ? 'Cash on Delivery Confirmed' : 'Payment Confirmed'}
            </span>

            {/* Headline */}
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Order Placed! 🎉
            </h1>
            <p className="text-sm text-slate-500 font-sans mt-2 leading-relaxed max-w-sm mx-auto">
              {isCod
                ? 'Your order is confirmed. Keep the payment ready for the courier.'
                : 'Your order is confirmed and will be dispatched shortly.'}
            </p>

            {/* Order ID + Delivery row */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-5">
              {shortId && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                  <ReceiptText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Order ID</p>
                    <p className="text-[12px] font-black text-slate-800 font-mono">{shortId}…</p>
                  </div>
                  <button
                    onClick={handleCopyId}
                    className="ml-1 text-slate-300 hover:text-[#006670] transition-colors cursor-pointer"
                    title="Copy full order ID"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 bg-[#e6f3f5] border border-[#006670]/20 rounded-xl px-4 py-2.5">
                <Clock className="w-3.5 h-3.5 text-[#006670] shrink-0" />
                <div className="text-left">
                  <p className="text-[9px] font-black uppercase text-[#006670]/60 tracking-wider">Est. Delivery</p>
                  <p className="text-[12px] font-black text-[#006670]">3–5 Working Days</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6">
              <button
                onClick={handleTrackOrder}
                className="px-6 py-2.5 bg-[#006670] hover:bg-[#004e56] text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                Track Order <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDownloadInvoice}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-[#006670] text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" /> Invoice
              </button>
              <button
                onClick={() => setCurrentView('home')}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2"
              >
                <Home className="w-3.5 h-3.5" /> Shop More
              </button>
            </div>
          </div>
        </div>

        {/* ─── Order Progress Strip ─── */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm px-5 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#006670]" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Shipment Status</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
              Order Placed
            </span>
          </div>

          {/* Step progress */}
          <div className="flex items-start gap-0">
            {[
              { label: 'Placed', done: true },
              { label: 'Processing', done: false },
              { label: 'Dispatched', done: false },
              { label: 'Out for Delivery', done: false },
              { label: 'Delivered', done: false },
            ].map((step, i, arr) => (
              <React.Fragment key={step.label}>
                <div className="flex flex-col items-center shrink-0" style={{ minWidth: 44 }}>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border-2 transition-all
                      ${step.done
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white border-slate-200 text-slate-300'
                      }`}
                  >
                    {step.done ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-[8.5px] font-bold mt-1.5 text-center leading-tight
                      ${step.done ? 'text-emerald-600' : 'text-slate-300'}`}
                    style={{ maxWidth: 44 }}
                  >
                    {step.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className={`flex-1 h-0.5 mt-3 mx-0.5 ${step.done ? 'bg-emerald-300' : 'bg-slate-100'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ─── Main Grid: Items | Address + Payment ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Items Card (3 cols) */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#006670]" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Items Ordered {items.length > 0 ? `(${items.length})` : ''}
              </h3>
            </div>

            {items.length === 0 ? (
              <div className="px-5 py-10 text-center text-slate-400 text-xs font-sans">
                Loading item details…
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-50">
                  {items.map((item) => (
                    <div key={item.id} className="px-5 py-4 flex gap-3.5 items-center">
                      <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl shrink-0 flex items-center justify-center p-1.5">
                        <img
                          src={getAbsoluteImageUrl(item.image)}
                          alt={item.name}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h4 className="text-[12px] font-bold text-slate-800 leading-snug line-clamp-2">{item.name}</h4>
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5">{item.category}</p>
                        <span className="inline-block text-[9.5px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md mt-1.5">
                          Qty: {item.qty}
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black text-slate-900">
                          ₹{(item.price * item.qty).toLocaleString('en-IN')}
                        </p>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <p className="text-[10px] text-slate-300 line-through font-sans mt-0.5">
                            ₹{item.originalPrice.toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price breakdown */}
                {pricing && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 space-y-2 text-xs font-sans text-slate-500">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-bold text-slate-700">₹{pricing.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    {pricing.discount > 0 && (
                      <div className="flex justify-between">
                        <span>Discount</span>
                        <span className="font-bold text-emerald-600">–₹{pricing.discount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Delivery</span>
                      <span className="font-bold text-emerald-600">
                        {pricing.shipping === 0 ? 'FREE' : `₹${pricing.shipping.toLocaleString('en-IN')}`}
                      </span>
                    </div>
                    {isCod && pricing.cod_fee && pricing.cod_fee > 0 && (
                      <div className="flex justify-between">
                        <span>COD Fee</span>
                        <span className="font-bold text-slate-700">+₹{pricing.cod_fee.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-slate-900 text-sm">
                      <span>{isCod ? 'Payable on Delivery' : 'Total Paid'}</span>
                      <span className="text-[#006670]">₹{pricing.total.toLocaleString('en-IN')}</span>
                    </div>
                    {pricing.savings > 0 && (
                      <div className="bg-emerald-50 border border-emerald-200/70 rounded-lg px-3 py-2 text-emerald-700 text-[10px] font-bold text-center">
                        🎉 You saved ₹{pricing.savings.toLocaleString('en-IN')} on this order
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right column (2 cols) */}
          <div className="lg:col-span-2 space-y-4">

            {/* Delivery Address */}
            {address && (
              <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                <div className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#006670]" />
                  <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Delivery To</h4>
                </div>
                <div className="px-4 py-4 space-y-1.5 text-[11px] font-sans">
                  {address.type && (
                    <span className="inline-block text-[9px] font-black uppercase bg-[#e6f3f5] text-[#006670] px-2.5 py-0.5 rounded-full tracking-wide mb-0.5">
                      {address.type}
                    </span>
                  )}
                  {address.clinic && <p className="font-bold text-slate-800 leading-snug">{address.clinic}</p>}
                  {address.dentist && <p className="text-slate-500">{address.dentist}</p>}
                  {address.street && <p className="text-slate-400 leading-relaxed">{address.street}</p>}
                  {(address.city || address.pincode) && (
                    <p className="text-slate-400">
                      {address.city}
                      {address.city && address.pincode ? ' – ' : ''}
                      {address.pincode}
                    </p>
                  )}
                  {address.phone && (
                    <p className="text-[#006670] font-bold mt-1.5">📱 {address.phone}</p>
                  )}
                </div>
              </div>
            )}

            {/* Payment Info */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
              <div className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-2">
                {isCod ? (
                  <Banknote className="w-3.5 h-3.5 text-[#006670]" />
                ) : (
                  <CreditCard className="w-3.5 h-3.5 text-[#006670]" />
                )}
                <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Payment</h4>
              </div>
              <div className="px-4 py-4">
                <div
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    isCod ? 'bg-blue-50 border border-blue-100' : 'bg-emerald-50 border border-emerald-100'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isCod ? 'bg-blue-100' : 'bg-emerald-100'
                    }`}
                  >
                    {isCod ? (
                      <Banknote className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-800">
                      {isCod ? 'Cash on Delivery' : activeOrder?.paymentMethod || 'Online Payment'}
                    </p>
                    <p className={`text-[9.5px] font-bold ${isCod ? 'text-blue-600' : 'text-emerald-600'}`}>
                      {isCod ? 'Pay at doorstep' : 'Payment captured'}
                    </p>
                  </div>
                </div>

                {pricing && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between font-sans text-xs font-black text-slate-900">
                    <span>{isCod ? 'Collect on Delivery' : 'Amount Paid'}</span>
                    <span className="text-[#006670]">₹{pricing.total.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Trust badges */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4 space-y-3">
              {[
                { icon: ShieldCheck, label: '100% Genuine Products', sub: 'Manufacturer sealed' },
                { icon: Truck, label: 'Insured Delivery', sub: 'Full transit coverage' },
                { icon: Star, label: 'Quality Guaranteed', sub: '30-day returns' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#e6f3f5] flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-[#006670]" />
                  </div>
                  <div>
                    <p className="text-[10.5px] font-black text-slate-800">{label}</p>
                    <p className="text-[9px] text-slate-400 font-sans">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Bottom CTA ─── */}
        <div className="text-center pt-2">
          <button
            onClick={() => setCurrentView('home')}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl border-2 border-[#006670] text-[#006670] hover:bg-[#006670] hover:text-white text-xs font-black uppercase tracking-widest transition-all duration-200 cursor-pointer group"
          >
            <Home className="w-3.5 h-3.5" />
            Continue Shopping
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default OrderSuccessPage;
