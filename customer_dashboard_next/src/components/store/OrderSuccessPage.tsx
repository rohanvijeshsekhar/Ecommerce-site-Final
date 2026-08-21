'use client';

import React from 'react';
import { CheckCircle2, ArrowRight, Download, Home, Phone, Shield, Star } from 'lucide-react';
import { ordersService } from '../../lib/services/ordersService';
import { useStore } from '../../contexts/StoreContext';

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
      total: number;
      savings: number;
    };
  } | null;
  setCurrentView: (view: 'home' | 'portfolio' | 'listing' | 'detail' | 'cart' | 'wishlist' | 'checkout' | 'order-success' | 'my-orders') => void;
  setActiveTrackingOrderId: (id: string | null) => void;
}

const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({
  orderData,
  setCurrentView,
  setActiveTrackingOrderId,
}) => {
  const store = useStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const activeOrder = orderData || (mounted ? store?.completedOrderData : null);
  // Order ID from actual order or fallback
  const orderId = activeOrder?.id || activeOrder?.order_number || 'FZ-2026-8945';
  const deliveryEstimation = 'Wednesday, Jun 24';

  const defaultItems = [
    {
      id: 'nsk-handpiece',
      name: 'NSK Pana-Max High Speed Handpiece',
      category: 'Clinical Equipment',
      price: 18999,
      qty: 1,
      image: '/images/bestseller_handpiece.png',
      originalPrice: 22499
    }
  ];

  const items: MockCartItem[] = activeOrder?.items || defaultItems;
  const address = activeOrder?.address || {
    type: 'Primary Clinic',
    dentist: 'Dr. Aditya Sharma',
    clinic: 'Aesthetic Dental Care Center',
    street: '102 Medical Arcade, Linking Road, Bandra West',
    city: 'Mumbai, Maharashtra',
    pincode: '400050',
    phone: '9876543210',
  };

  const pricing = activeOrder?.pricing || {
    subtotal: 18999,
    shipping: 0,
    gst: 3419,
    discount: 0,
    total: 22418,
    savings: 3500
  };

  const handleTrackOrder = () => {
    setActiveTrackingOrderId(orderId);
    setCurrentView('my-orders');
    window.scrollTo(0, 0);
  };

  return (
    <div className="w-full bg-[#f4f7f7] min-h-screen pt-[112px] lg:pt-[160px] pb-16 font-sans select-none text-left animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto px-4 md:px-6">

        {/* Success Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_15px_35px_rgba(0,0,0,0.02)] p-6 md:p-10 text-center relative overflow-hidden mb-6">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#006670] to-emerald-500" />

          {/* Success Checkmark Circle */}
          <div className="w-20 h-20 rounded-full bg-[#e6f3f5] flex items-center justify-center text-[#006670] mx-auto mb-6 shadow-sm border border-emerald-100/50 animate-bounce">
            <CheckCircle2 className="w-10 h-10 stroke-[1.8]" />
          </div>

          <span className="text-[10px] font-black tracking-widest text-[#006670] uppercase bg-[#e6f3f5] px-3.5 py-1 rounded-full">
            Payment Securely Authorized
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight mt-3">
            Procurement Confirmed!
          </h1>
          <p className="text-slate-400 text-xs mt-1.5 font-medium font-sans">
            Your clinical equipment orders have been safely logged into FAAZO's distribution system.
          </p>

          {/* Order Meta Details Box */}
          <div className="grid grid-cols-2 max-w-sm mx-auto gap-4 bg-slate-50 border border-slate-100 p-4.5 rounded-2xl mt-6 text-left">
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Order Reference</span>
              <span suppressHydrationWarning className="text-xs font-black text-slate-800 block mt-0.5">{orderId}</span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Est. Delivery</span>
              <span suppressHydrationWarning className="text-xs font-black text-[#006670] block mt-0.5">{deliveryEstimation}</span>
            </div>
          </div>

          {/* CTA Buttons Row */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 mt-8">
            <button
              onClick={handleTrackOrder}
              className="px-6 py-3 rounded-xl bg-[#006670] hover:bg-[#004e56] text-white text-xs tracking-wider font-extrabold uppercase transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              Track Order
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const targetId =
                  orderData?.id ||
                  (orderData as any)?.order_number ||
                  (orderData as any)?.invoice_number ||
                  store?.completedOrderData?.id ||
                  store?.completedOrderData?.order_number ||
                  store?.completedOrderData?.invoice_number ||
                  orderId;

                const invNum = (orderData as any)?.invoice_number || store?.completedOrderData?.invoice_number;
                ordersService.downloadInvoice(targetId, invNum, store?.showToast);
              }}
              className="px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-[#006670] border border-slate-200 text-xs tracking-wider font-extrabold uppercase transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Download Invoice
            </button>
            <button
              onClick={() => setCurrentView('home')}
              className="px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs tracking-wider font-extrabold uppercase transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Home className="w-4 h-4" />
              Continue Shopping
            </button>
          </div>
        </div>

        {/* Order Details Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-8">
          
          {/* Products Summary Card (8 Columns) */}
          <div className="md:col-span-8 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
              Ordered Products ({items.length})
            </h3>
            
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.id} className="py-4 flex gap-4 items-center first:pt-0 last:pb-0">
                  <div className="w-16 h-16 bg-slate-50 p-1.5 border border-slate-100 rounded-lg shrink-0 flex items-center justify-center">
                    <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="flex-grow text-xs space-y-0.5">
                    <h4 className="font-bold text-slate-800 leading-snug">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 font-sans">Category: {item.category}</p>
                    <p className="text-[10.5px] text-slate-600 font-sans font-bold">Qty: {item.qty}</p>
                  </div>
                  <span className="text-xs font-black text-[#006670] font-display">
                    ₹{item.price.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery & Payment details (4 Columns) */}
          <div className="md:col-span-4 space-y-4">
            
            {/* Delivery address */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pb-1 border-b border-slate-50">
                Delivery Location
              </h4>
              <span className="text-[9px] font-extrabold bg-[#e6f3f5] text-[#006670] px-2 py-0.5 rounded-full uppercase mb-2 inline-block">
                {address.type}
              </span>
              <h5 className="text-[11px] font-extrabold text-slate-800 leading-tight mb-1">{address.clinic}</h5>
              <p className="text-[10px] text-slate-400 font-sans leading-normal">{address.street}</p>
              <p className="text-[10px] text-slate-400 font-sans leading-normal">{address.city} - {address.pincode}</p>
            </div>

            {/* Payment Summary */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pb-1 border-b border-slate-50">
                Payment Info
              </h4>
              <div className="space-y-2 font-sans text-[10.5px] text-slate-500">
                <div className="flex justify-between">
                  <span>Method</span>
                  <span className="font-bold text-slate-800 text-right max-w-[65%] truncate" title={orderData?.paymentMethod}>
                    {orderData?.paymentMethod || 'UPI Payment'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-50 pt-2 font-bold text-slate-800 text-xs">
                  <span>Amount Paid</span>
                  <span className="text-[#006670] font-display">₹{pricing.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Dual Actions CTA Banner Cards (Warranty + Support) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 mb-10">
          
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-[#006670] shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase">Register Clinic Warranties</h4>
              <p className="text-[10.5px] text-slate-400 mt-1 font-sans leading-relaxed">
                Connect your dental chair, CBCT unit, or motor series numbers to unlock official support, software updates and repair coverages.
              </p>
              <button 
                onClick={() => { alert('Register Warranty Portal\nEnter device serial codes.'); }}
                className="mt-3 text-xs font-extrabold text-[#006670] hover:text-[#004e56] flex items-center gap-1 cursor-pointer"
              >
                Register Hardware <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-[#006670] shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase">Emergency Service Assistance</h4>
              <p className="text-[10.5px] text-slate-400 mt-1 font-sans leading-relaxed">
                Require instant installation coordinates or device guidelines support? Connect 24/7 directly with FAAZO's Medtech helpline desk.
              </p>
              <a 
                href="tel:18003004545"
                className="mt-3 text-xs font-extrabold text-[#006670] hover:text-[#004e56] flex items-center gap-1 cursor-pointer"
              >
                Call Support: 1800 300 4545 <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

        </div>

        {/* Clinical Accessories Recommendations */}
        <div className="border-t border-slate-200/50 pt-8 text-center">
          <span className="text-[10px] font-black tracking-widest text-[#006670] uppercase">Complete Your Setup</span>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight mt-1 mb-6">
            Dentists also purchased for their practice
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recommendations.map((rec) => (
              <div 
                key={rec.id} 
                className="bg-white p-3.5 rounded-xl border border-slate-200/70 text-left flex flex-col justify-between hover:shadow-sm transition-shadow group cursor-pointer"
                onClick={() => { alert(`Redirecting to ${rec.name} details`); }}
              >
                <div className="w-full h-24 bg-slate-50 border border-slate-100 rounded-lg p-2 flex items-center justify-center">
                  <img src={rec.image} alt={rec.name} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="mt-3 space-y-1">
                  <h4 className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-[#006670] transition-colors">{rec.name}</h4>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    <Star className="w-2.5 h-2.5 fill-amber-500 stroke-none" />
                    <span className="text-[9px] font-bold text-slate-600 mt-0.5">{rec.rating}</span>
                  </div>
                  <span className="text-xs font-black text-[#006670] font-display block pt-1">₹{rec.price.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

const recommendations = [
  {
    id: 'rec-1',
    name: 'NSK Lubricating Spray (Pack of 3)',
    price: 3899,
    rating: 4.8,
    image: '/images/bestseller_handpiece.png', // Fallback to handpiece placeholder for image consistency
  },
  {
    id: 'rec-2',
    name: 'Woodpecker Scaler Detachable Tips Set',
    price: 2499,
    rating: 4.7,
    image: '/images/bestseller_scaler.png',
  },
  {
    id: 'rec-3',
    name: 'Broadband Curing Light Replacement Lens',
    price: 1899,
    rating: 4.6,
    image: '/images/bestseller_curing.png',
  },
  {
    id: 'rec-4',
    name: 'Dental Turbine O-Ring Maintenance Kit',
    price: 999,
    rating: 4.9,
    image: '/images/bestseller_handpiece.png',
  }
];

export default OrderSuccessPage;
