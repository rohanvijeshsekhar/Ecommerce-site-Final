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
      <div className="w-full bg-[#F4F7F8] min-h-screen pt-[118px] sm:pt-[132px] lg:pt-[152px] pb-20 font-sans">
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
      <div className="w-full bg-[#F4F7F8] min-h-screen pt-[118px] sm:pt-[132px] lg:pt-[152px] pb-16 font-sans flex items-center justify-center">
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
    <div className="w-full bg-[#F8FAFB] min-h-screen pt-[118px] sm:pt-[132px] lg:pt-[152px] pb-16 font-sans text-left">
      <div className="max-w-3xl mx-auto px-3.5 sm:px-6 space-y-3.5 sm:space-y-4">

        {/* ─── Hero Success Card ─── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-5 sm:p-7 text-center">
            {/* Checkmark Icon */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-medium px-2.5 py-0.5 rounded-full mb-2">
              <CheckCircle2 className="w-3 h-3" />
              <span>{isCod ? 'Cash on Delivery Confirmed' : 'Payment Confirmed'}</span>
            </div>

            {/* Headline */}
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Order Placed Successfully!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              {isCod
                ? 'Your order is confirmed. Keep the cash ready at the time of delivery.'
                : 'Your order is confirmed and will be dispatched shortly.'}
            </p>

            {/* Order Meta Cards */}
            <div className="grid grid-cols-2 gap-2.5 max-w-md mx-auto mt-4 text-left">
              {shortId && (
                <div className="flex items-center justify-between bg-slate-50/90 border border-slate-200/70 rounded-xl p-2.5">
                  <div className="min-w-0 pr-1">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Order ID</p>
                    <p className="text-xs font-semibold text-slate-800 font-mono truncate">{shortId}</p>
                  </div>
                  <button
                    onClick={handleCopyId}
                    className="p-1 text-slate-400 hover:text-[#006670] transition-colors cursor-pointer shrink-0"
                    title="Copy order ID"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 bg-[#e6f3f5]/70 border border-[#006670]/15 rounded-xl p-2.5">
                <Clock className="w-4 h-4 text-[#006670] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-[#006670]/70 uppercase tracking-wider">Est. Delivery</p>
                  <p className="text-xs font-semibold text-[#006670] truncate">3–5 Days</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-4 max-w-md mx-auto">
              <button
                onClick={handleTrackOrder}
                className="w-full sm:flex-1 h-10 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.99]"
              >
                <span>Track Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDownloadInvoice}
                className="w-full sm:w-auto h-10 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.99]"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Invoice</span>
              </button>
              <button
                onClick={() => setCurrentView('home')}
                className="w-full sm:w-auto h-10 px-4 bg-transparent hover:bg-slate-100/70 text-slate-600 text-xs font-medium rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5 text-slate-400" />
                <span>Shop More</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── Shipment Stepper ─── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#006670]" />
              <span className="text-xs font-bold text-slate-800">Shipment Status</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Order Placed
            </span>
          </div>

          {/* Stepper Progress */}
          <div className="flex items-start justify-between">
            {[
              { label: 'Placed', done: true },
              { label: 'Processing', done: false },
              { label: 'Dispatched', done: false },
              { label: 'Out for Delivery', done: false },
              { label: 'Delivered', done: false },
            ].map((step, i, arr) => (
              <React.Fragment key={step.label}>
                <div className="flex flex-col items-center shrink-0 w-12 text-center">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[8.5px] font-bold transition-colors ${
                      step.done
                        ? 'bg-[#006670] text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {step.done ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-[9px] font-medium mt-1 leading-tight ${
                      step.done ? 'text-slate-800 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className={`flex-1 h-0.5 mt-2.5 mx-1 ${step.done ? 'bg-[#006670]' : 'bg-slate-100'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ─── Main Grid: Items | Address & Payment ─── */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 sm:gap-4">

          {/* Items Card (3 cols) */}
          <div className="md:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-[#006670]" />
              <h3 className="text-xs font-bold text-slate-800">
                Items Ordered {items.length > 0 ? `(${items.length})` : ''}
              </h3>
            </div>

            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400 text-xs">
                Loading item details…
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <div key={item.id} className="p-3.5 sm:p-4 flex gap-3 items-center">
                      <div className="w-13 h-13 sm:w-14 sm:h-14 bg-slate-50 border border-slate-100 rounded-xl shrink-0 flex items-center justify-center p-1.5 overflow-hidden">
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
                        <h4 className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">{item.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.category}</p>
                        <span className="inline-block text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.2 rounded mt-1">
                          Qty: {item.qty}
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs sm:text-sm font-bold text-slate-900">
                          ₹{(item.price * item.qty).toLocaleString('en-IN')}
                        </p>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <p className="text-[10px] text-slate-400 line-through mt-0.5">
                            ₹{item.originalPrice.toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                {pricing && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Item Total</span>
                      <span className="font-semibold text-slate-800">₹{pricing.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    {pricing.discount > 0 && (
                      <div className="flex justify-between">
                        <span>Discount</span>
                        <span className="font-semibold text-emerald-600">–₹{pricing.discount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Delivery</span>
                      <span className="font-semibold text-emerald-600">
                        {pricing.shipping === 0 ? 'FREE' : `₹${pricing.shipping.toLocaleString('en-IN')}`}
                      </span>
                    </div>
                    {isCod && pricing.cod_fee && pricing.cod_fee > 0 && (
                      <div className="flex justify-between">
                        <span>COD Charge</span>
                        <span className="font-semibold text-slate-800">+₹{pricing.cod_fee.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-xs sm:text-sm">
                      <span>{isCod ? 'Payable on Delivery' : 'Total Amount'}</span>
                      <span className="text-[#006670] font-black">₹{pricing.total.toLocaleString('en-IN')}</span>
                    </div>
                    {pricing.savings > 0 && (
                      <div className="bg-emerald-50 text-emerald-700 rounded-lg p-2 text-[11px] font-semibold text-center mt-1">
                        🎉 You saved ₹{pricing.savings.toLocaleString('en-IN')} on this order
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column (2 cols) */}
          <div className="md:col-span-2 space-y-3.5 sm:space-y-4">

            {/* Delivery Address */}
            {address && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4">
                <div className="flex items-center gap-1.5 pb-2.5 border-b border-slate-100 mb-2.5">
                  <MapPin className="w-3.5 h-3.5 text-[#006670]" />
                  <h4 className="text-xs font-bold text-slate-800">Delivery Address</h4>
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  {address.type && (
                    <span className="inline-block text-[9px] font-semibold uppercase bg-[#e6f3f5] text-[#006670] px-2 py-0.5 rounded-full mb-1">
                      {address.type}
                    </span>
                  )}
                  {address.dentist && <p className="font-bold text-slate-800">{address.dentist}</p>}
                  {address.clinic && <p className="text-slate-600">{address.clinic}</p>}
                  {address.street && <p className="text-slate-500 leading-relaxed">{address.street}</p>}
                  {(address.city || address.pincode) && (
                    <p className="text-slate-500">
                      {address.city}
                      {address.city && address.pincode ? ' – ' : ''}
                      {address.pincode}
                    </p>
                  )}
                  {address.phone && (
                    <p className="text-[#006670] font-medium pt-1">📞 {address.phone}</p>
                  )}
                </div>
              </div>
            )}

            {/* Payment Method Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4">
              <div className="flex items-center gap-1.5 pb-2.5 border-b border-slate-100 mb-2.5">
                {isCod ? (
                  <Banknote className="w-3.5 h-3.5 text-[#006670]" />
                ) : (
                  <CreditCard className="w-3.5 h-3.5 text-[#006670]" />
                )}
                <h4 className="text-xs font-bold text-slate-800">Payment Details</h4>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isCod ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {isCod ? <Banknote className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    {isCod ? 'Cash on Delivery' : activeOrder?.paymentMethod || 'Online Payment'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {isCod ? 'Pay when you receive' : 'Payment successful & verified'}
                  </p>
                </div>
              </div>
            </div>

            {/* Trust Assurance */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 space-y-2.5">
              {[
                { icon: ShieldCheck, label: '100% Genuine Products', sub: 'Verified & authentic' },
                { icon: Truck, label: 'Safe & Insured Delivery', sub: 'Transit guarantee' },
                { icon: Star, label: 'Quality Assured', sub: 'Direct from brand' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-[#e6f3f5] flex items-center justify-center shrink-0">
                    <Icon className="w-3 h-3 text-[#006670]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-800 leading-tight">{label}</p>
                    <p className="text-[9.5px] text-slate-400 leading-tight">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ─── Bottom Navigation ─── */}
        <div className="text-center pt-2">
          <button
            onClick={() => setCurrentView('home')}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-[#006670] hover:text-[#004e56] transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Back to Home</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default OrderSuccessPage;
