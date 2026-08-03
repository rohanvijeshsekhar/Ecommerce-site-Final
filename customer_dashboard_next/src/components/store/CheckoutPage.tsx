'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Check, CreditCard, Landmark, Truck, Calendar, Percent, ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usersService } from '../../lib/services/users';
import { getAbsoluteImageUrl } from '../../lib/api';
import { paymentService } from '../../lib/services/payment';


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

interface CheckoutPageProps {
  cartItems: MockCartItem[];
  setCurrentView: (view: 'home' | 'portfolio' | 'listing' | 'detail' | 'cart' | 'wishlist' | 'checkout' | 'order-success' | 'my-orders') => void;
  checkoutSource?: 'cart' | 'buy-now';
  onBackCheckout?: () => void;
  showToast?: (message: string) => void;
  onPlaceOrderSuccess: (orderData: {
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
  }) => void;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({
  cartItems,
  setCurrentView,
  checkoutSource,
  onBackCheckout,
  showToast,
  onPlaceOrderSuccess,
}) => {
  const { user, profile } = useAuth();

  // Defense-in-depth: redirect unapproved dealers away from checkout.
  // The backend is the single source of truth (can_purchase), and this
  // is a UX safeguard only — the backend will reject the order API call.
  useEffect(() => {
    if (user && user.can_purchase === false) {
      showToast?.('Purchasing is disabled until your dealer application is approved.');
      setCurrentView('home');
    }
  }, [user]);

  // --- STATE ---
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [dentistName, setDentistName] = useState('');

  // Pre-fill from real auth profile when available
  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setDentistName(user.full_name || '');
    }
    if (profile) {
      setClinicName(profile.clinic_name || '');
    }
    if (user?.phone_number) {
      setPhone(user.phone_number);
    }
  }, [user, profile]);
  
  // GST state
  const [gstInvoice, setGstInvoice] = useState(false);
  const [gstNumber, setGstNumber] = useState('27AAAAA1111A1Z1');

  // Sandbox Modal State
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [sandboxOrderData, setSandboxOrderData] = useState<{
    razorpay_order_id: string;
    amount: number;
    currency: string;
    payment_id: string;
    handler: (response: any) => void;
    ondismiss: () => void;
  } | null>(null);
  
  // Addresses
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [addrLoading, setAddrLoading] = useState(false);

  const fetchAddresses = async () => {
    setAddrLoading(true);
    try {
      const res = await usersService.getAddresses();
      if (res.success && res.data) {
        const mapped = res.data.map(addr => ({
          id: addr.id,
          type: addr.label,
          dentist: addr.full_name,
          clinic: addr.line1,
          street: addr.line2 || '',
          city: `${addr.city}, ${addr.state}`,
          pincode: addr.pincode,
          phone: addr.mobile
        }));
        setAddresses(mapped);
        if (mapped.length > 0) {
          const defaultAddr = res.data.find(a => a.is_default);
          setSelectedAddressId(defaultAddr ? defaultAddr.id : mapped[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load user addresses:', e);
    } finally {
      setAddrLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);
  
  // Address Modal
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [newAddrType, setNewAddrType] = useState('Branch Clinic');
  const [newAddrFullName, setNewAddrFullName] = useState('');
  const [newAddrClinic, setNewAddrClinic] = useState('');
  const [newAddrStreet, setNewAddrStreet] = useState('');
  const [newAddrCity, setNewAddrCity] = useState('');
  const [newAddrState, setNewAddrState] = useState('');
  const [newAddrPincode, setNewAddrPincode] = useState('');
  const [newAddrPhone, setNewAddrPhone] = useState('');

  // Delivery Method
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express' | 'install'>('standard');
  
  // Payment Method
  const [paymentTab, setPaymentTab] = useState<'upi' | 'card' | 'netbank' | 'finance'>('upi');
  const [upiId, setUpiId] = useState('adityasharma@okaxis');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [financeOption, setFinanceOption] = useState('3m_nocost');

  // Coupons
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState<{ code: string; type: 'fixed' | 'percent'; value: number } | null>(null);
  const [couponError, setCouponError] = useState('');

  // Placement progress
  const [isPlacing, setIsPlacing] = useState(false);

  // --- CALCULATION LOGIC ---
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  
  // Delivery Fee mapping
  const deliveryFee = {
    standard: 0,
    express: 1500,
    install: 3500,
  }[deliveryMethod];

  // GST 18% calculation
  const gstAmount = Math.round(subtotal * 0.18);

  // Original list price savings (pre-discount)
  const totalOriginalPrice = cartItems.reduce((acc, item) => {
    const orig = item.originalPrice || Math.round(item.price * 1.2);
    return acc + orig * item.qty;
  }, 0);

  // Coupon reduction
  let couponDiscount = 0;
  if (activeCoupon) {
    if (activeCoupon.type === 'fixed') {
      couponDiscount = activeCoupon.value;
    } else {
      couponDiscount = Math.round(subtotal * (activeCoupon.value / 100));
    }
  }

  const baseProductDiscount = totalOriginalPrice - subtotal;
  const overallDiscount = baseProductDiscount + couponDiscount;

  const orderTotal = subtotal + gstAmount + deliveryFee - couponDiscount;
  const overallSavings = overallDiscount;

  // --- CALCULATION OVERRIDES VIA BACKEND PREVIEW ---
  const [previewPricing, setPreviewPricing] = useState<{
    mrp_subtotal: number;
    selling_subtotal: number;
    gst_amount: number;
    shipping_fee: number;
    total_amount: number;
    savings: number;
  } | null>(null);

  useEffect(() => {
    // Guard: no address selected yet
    if (!selectedAddressId || selectedAddressId.startsWith('addr-') || selectedAddressId.length < 10) {
      return;
    }
    // Guard: buy-now flow must have items in cartItems before firing the preview request
    if (checkoutSource === 'buy-now' && cartItems.length === 0) {
      return;
    }
    const loadPreview = async () => {
      try {
        const { cartService } = await import('../../lib/services/cart');
        const itemsPayload = checkoutSource === 'buy-now'
          ? cartItems.map(item => ({ product_id: item.id, quantity: item.qty }))
          : undefined;
        const res = await cartService.checkoutPreview(selectedAddressId, deliveryMethod, itemsPayload);
        if (res.success && res.data) {
          setPreviewPricing(res.data);
        }
      } catch (e: any) {
        const backendMsg = e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || 'Checkout preview failed.';
        console.error('Checkout preview error:', backendMsg, e);
      }
    };
    loadPreview();
  }, [selectedAddressId, deliveryMethod, cartItems, checkoutSource]);

  const subtotalVal = previewPricing ? previewPricing.selling_subtotal : subtotal;
  const gstAmountVal = previewPricing ? previewPricing.gst_amount : gstAmount;
  const deliveryFeeVal = previewPricing ? previewPricing.shipping_fee : deliveryFee;
  const totalOriginalPriceVal = previewPricing ? previewPricing.mrp_subtotal : totalOriginalPrice;
  const baseProductDiscountVal = previewPricing ? (previewPricing.mrp_subtotal - previewPricing.selling_subtotal) : baseProductDiscount;
  const orderTotalVal = previewPricing ? previewPricing.total_amount : orderTotal;
  const overallSavingsVal = previewPricing ? previewPricing.savings : overallSavings;
  const couponDiscountVal = couponDiscount;

  // --- HANDLERS ---
  const handleAddNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrFullName || !newAddrClinic || !newAddrStreet || !newAddrCity || !newAddrState || !newAddrPincode || !newAddrPhone) {
      showToast?.('Please fill out all address details.');
      return;
    }
    // Client-side pincode validation: must be exactly 6 digits
    if (!/^\d{6}$/.test(newAddrPincode.trim())) {
      showToast?.('Pincode must be exactly 6 digits.');
      return;
    }
    try {
      const res = await usersService.createAddress({
        label: newAddrType,
        full_name: newAddrFullName,
        mobile: newAddrPhone,
        line1: newAddrClinic,
        line2: newAddrStreet,
        city: newAddrCity.trim(),
        state: newAddrState.trim(),
        pincode: newAddrPincode.trim(),
        address_type: 'both',
        is_default: addresses.length === 0  // make default if it's the first address
      });

      if (res.success && res.data) {
        showToast?.('Address added successfully!');
        setIsAddAddressOpen(false);
        fetchAddresses();
        // Auto-select the newly added address
        setSelectedAddressId(res.data.id);
        // Reset form
        setNewAddrFullName('');
        setNewAddrClinic('');
        setNewAddrStreet('');
        setNewAddrCity('');
        setNewAddrState('');
        setNewAddrPincode('');
        setNewAddrPhone('');
      } else {
        // Show actual backend validation error if available
        const errorMsg = (res as any)?.errors
          ? Object.values((res as any).errors).flat().join(' ')
          : (res as any)?.message || 'Failed to add new address.';
        showToast?.(errorMsg);
      }
    } catch (err: any) {
      const backendErrors = err?.response?.data?.errors;
      const errorMsg = backendErrors
        ? Object.values(backendErrors).flat().join(' ')
        : err?.response?.data?.message || 'Failed to add new address.';
      showToast?.(errorMsg);
    }
  };

  const handleApplyCoupon = (code: string) => {
    setCouponError('');
    const upperCode = code.trim().toUpperCase();
    if (upperCode === 'WELCOMEFAAZO') {
      setActiveCoupon({ code: 'WELCOMEFAAZO', type: 'fixed', value: 1000 });
      setCouponCode('WELCOMEFAAZO');
    } else if (upperCode === 'CLINICOFF') {
      setActiveCoupon({ code: 'CLINICOFF', type: 'percent', value: 10 });
      setCouponCode('CLINICOFF');
    } else {
      setCouponError('Invalid Coupon Code. Try WELCOMEFAAZO or CLINICOFF');
    }
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      showToast?.('Your Cart is empty!');
      return;
    }
    // Validation
    if (!email || !phone || !clinicName || !dentistName) {
      showToast?.('Please fill in contact information');
      return;
    }
    if (!selectedAddressId) {
      showToast?.('Please select or add a delivery address before placing your order.');
      return;
    }
    if (gstInvoice && !gstNumber) {
      showToast?.('Please enter your clinic GST registration number');
      return;
    }

    setIsPlacing(true);

    try {
      // 1. Load Razorpay script
      const scriptLoaded = await paymentService.loadScript();
      if (!scriptLoaded) {
        showToast?.('Failed to load Razorpay payment SDK. Please check your internet connection.');
        setIsPlacing(false);
        return;
      }

      // 2. Map frontend payment selection to pass to backend
      const paymentMethodName = {
        upi: `UPI - ${upiId}`,
        card: `Credit Card ending in ${cardNumber.slice(-4) || '4321'}`,
        netbank: `Netbanking - ${selectedBank}`,
        finance: `Financing - FAAZO Capital EMI (${financeOption})`,
      }[paymentTab];

      const itemsPayload = checkoutSource === 'buy-now' 
        ? cartItems.map(item => ({ product_id: item.id, quantity: item.qty })) 
        : undefined;

      // 3. Create Razorpay order on backend
      const createRes = await paymentService.createPaymentOrder({
        address_id: selectedAddressId,
        delivery_method: deliveryMethod,
        payment_method: paymentMethodName,
        gst_number: gstInvoice ? gstNumber : undefined,
        items: itemsPayload
      });

      if (!createRes.success || !createRes.data) {
        showToast?.(createRes.message || 'Failed to initialize payment with backend.');
        setIsPlacing(false);
        return;
      }

      const rzOrder = createRes.data;

      // 4. Configure Razorpay overlay options
      const options = {
        key: rzOrder.key_id,
        amount: rzOrder.amount,
        currency: rzOrder.currency,
        name: 'FAAZO Dental Solutions',
        description: 'Secure Dental Equipment Purchase',
        order_id: rzOrder.razorpay_order_id,
        handler: async (response: any) => {
          setIsPlacing(true);
          showToast?.('Verifying payment signature with bank...');
          try {
            const verifyRes = await paymentService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              payment_id: rzOrder.payment_id,
            });

            if (verifyRes.success && verifyRes.data) {
              showToast?.('Payment verified successfully!');
              onPlaceOrderSuccess(verifyRes.data as any);
            } else {
              showToast?.(verifyRes.message || 'Payment signature verification failed.');
            }
          } catch (err: any) {
            showToast?.(err.response?.data?.error?.message || 'Payment verification failed.');
          } finally {
            setIsPlacing(false);
          }
        },
        prefill: {
          name: dentistName,
          email: email,
          contact: phone,
        },
        notes: {
          payment_id: rzOrder.payment_id
        },
        theme: {
          color: '#006670',
        },
        modal: {
          ondismiss: () => {
            setIsPlacing(false);
            showToast?.('Payment modal closed. Transaction cancelled.');
          }
        }
      };

      // 5. Detect sandbox mode.
      // We trust the backend to decide whether credentials are valid.
      // The only client-side signals are:
      //   a) The backend returned a mock order ID (always prefixed 'order_mock_')
      //   b) No key_id was returned, or it contains the literal placeholder 'REPLACE'
      // We do NOT validate key format or length — credentials are accepted exactly
      // as issued by the Razorpay Dashboard.
      const isSandbox =
        rzOrder.razorpay_order_id.startsWith('order_mock_') ||
        !rzOrder.key_id ||
        rzOrder.key_id.includes('REPLACE') ||
        rzOrder.key_id === '';



      if (isSandbox) {
        // Store sandbox data and show the internal simulation modal
        setSandboxOrderData({
          razorpay_order_id: rzOrder.razorpay_order_id,
          amount: rzOrder.amount,
          currency: rzOrder.currency,
          payment_id: rzOrder.payment_id,
          handler: options.handler,
          ondismiss: options.modal.ondismiss,
        });
        setShowSandboxModal(true);
        setIsPlacing(false);
        return;
      }


      // 6. Open real Razorpay payment modal (live credentials)
      try {
        const rzInstance = new (window as any).Razorpay(options);
        
        // Handle payment failure event inside Razorpay modal
        rzInstance.on('payment.failed', function (resp: any) {
          const rawError = resp?.error;
          const hasErrorObj = rawError && typeof rawError === 'object' && Object.keys(rawError).length > 0;
          const errObj = hasErrorObj
            ? rawError
            : (resp && typeof resp === 'object' && Object.keys(resp).length > 0 ? resp : (rawError || resp || {}));

          const failDesc =
            errObj?.description ||
            errObj?.reason ||
            errObj?.code ||
            resp?.error?.description ||
            resp?.error?.reason ||
            resp?.description ||
            resp?.reason ||
            (typeof resp === 'string' ? resp : null) ||
            'Transaction cancelled or failed.';

          console.warn('Razorpay Payment Failed Callback:', {
            resp,
            error: errObj,
            description: failDesc
          });

          showToast?.(`Payment failed: ${failDesc}`);
          setIsPlacing(false);
        });

        rzInstance.open();
      } catch (sdkErr) {
        console.warn('Razorpay SDK initialization failed.', sdkErr);
        showToast?.('Failed to open Razorpay payment gateway.');
        setIsPlacing(false);
      }

    } catch (err: any) {
      showToast?.(err.response?.data?.error?.message || 'Failed to initialize payment gateway.');
      setIsPlacing(false);
    }
  };

  return (
    <div className="w-full bg-[#f4f7f7] min-h-screen pt-[112px] lg:pt-[160px] pb-16 font-sans select-none text-left">
      <div className="max-w-6xl mx-auto px-4 md:px-6">

        {/* 1. Breadcrumbs */}
        <nav className="flex items-center gap-2.5 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <button onClick={() => setCurrentView('home')} className="hover:text-[#006670] transition-colors cursor-pointer">Home</button>
          <span>&gt;</span>
          <button 
            onClick={() => { if (onBackCheckout) { onBackCheckout(); } else { setCurrentView('cart'); } }} 
            className="hover:text-[#006670] transition-colors cursor-pointer"
          >
            {checkoutSource === 'buy-now' ? 'Product Details' : 'Cart'}
          </button>
          <span>&gt;</span>
          <span className="text-slate-800 font-bold">Checkout</span>
        </nav>

        {/* Top Back Action Button */}
        <button 
          onClick={() => { if (onBackCheckout) { onBackCheckout(); } else { setCurrentView('cart'); } }} 
          className="flex items-center gap-1 text-[#006670] hover:text-[#004e56] font-bold text-xs uppercase tracking-wider mb-5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {checkoutSource === 'buy-now' ? 'Back to Product Details' : 'Back to cart'}
        </button>

        {/* Main Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* 65% Left Column: Forms */}
          <div className="lg:col-span-8 space-y-6">

            {/* SECTION 1: Contact Information */}
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
                1. Contact & Practice Info
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Dentist Full Name</label>
                  <input 
                    type="text" 
                    value={dentistName} 
                    onChange={(e) => setDentistName(e.target.value)}
                    className="border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#006670]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Clinic / Hospital Name</label>
                  <input 
                    type="text" 
                    value={clinicName} 
                    onChange={(e) => setClinicName(e.target.value)}
                    className="border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#006670]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Professional Email Address</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#006670]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Active Mobile Number</label>
                  <input 
                    type="text" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    className="border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#006670]"
                  />
                </div>
              </div>

              {/* GST Toggle and Input */}
              <div className="mt-5 pt-4 border-t border-slate-100/50">
                <label className="inline-flex items-center gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={gstInvoice} 
                    onChange={(e) => setGstInvoice(e.target.checked)}
                    className="w-4 h-4 accent-[#006670] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">Request GST Business Invoice (Claim Input Tax Credits)</span>
                </label>

                {gstInvoice && (
                  <div className="mt-4 p-4 bg-[#e6f3f5]/20 border border-[#e6f3f5] rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-1 duration-200">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">GSTIN Registration Number</label>
                      <input 
                        type="text" 
                        value={gstNumber} 
                        onChange={(e) => setGstNumber(e.target.value)}
                        placeholder="e.g. 27AAAAA1111A1Z1"
                        className="border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#006670]"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Registered Business entity Name</label>
                      <input 
                        type="text" 
                        value={clinicName} 
                        disabled
                        className="border border-slate-200/50 px-3 py-2 rounded-lg text-xs font-bold text-slate-400 bg-slate-50"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: Delivery Address Selection */}
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  2. Shipping Details
                </h2>
                <button
                  onClick={() => setIsAddAddressOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#006670] hover:text-[#004e56] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Address
                </button>
              </div>

              {/* Address Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addrLoading ? (
                  <div className="col-span-2 text-center py-8 text-slate-400 text-xs font-bold">Loading addresses...</div>
                ) : addresses.length === 0 ? (
                  <div className="col-span-2 py-6 border-2 border-dashed border-slate-200 rounded-xl text-center">
                    <p className="text-xs font-bold text-slate-500">No delivery address found.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Please add an address to continue checkout.</p>
                    <button
                      type="button"
                      onClick={() => setIsAddAddressOpen(true)}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#006670] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[#004e56] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Your First Address
                    </button>
                  </div>
                ) : null}
                {addresses.map((addr) => {
                  const isSelected = addr.id === selectedAddressId;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between text-left relative hover:shadow-[0_4px_15px_rgba(0, 43, 46,0.04)]
                        ${isSelected 
                          ? 'border-[#006670] bg-[#e6f3f5]/10 shadow-[0_2px_15px_rgba(0, 43, 46,0.03)]' 
                          : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      {/* Selection Glow dot */}
                      {isSelected && (
                        <span className="absolute top-3.5 right-3.5 bg-[#006670] text-white p-0.5 rounded-full">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                      <div>
                        <span className={`text-[9px] font-extrabold tracking-widest px-2.5 py-0.5 rounded-full uppercase block w-fit mb-2.5 font-sans
                          ${isSelected ? 'bg-[#006670] text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {addr.type}
                        </span>
                        <h4 className="text-xs font-extrabold text-slate-800 mb-1">{addr.clinic}</h4>
                        <p className="text-[11px] text-slate-500 font-sans leading-relaxed">{addr.street}</p>
                        <p className="text-[11px] text-slate-500 font-sans leading-relaxed">{addr.city} - {addr.pincode}</p>
                      </div>
                      <div className="mt-4 pt-2.5 border-t border-slate-100/50 text-[10.5px] font-bold text-slate-600">
                        Phone: {addr.phone}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Address Modal Modal Frame */}
              {isAddAddressOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                        Add New Clinic Address
                      </h3>
                      <button 
                        onClick={() => setIsAddAddressOpen(false)}
                        className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <form onSubmit={handleAddNewAddress} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">Address Label</label>
                          <select 
                            value={newAddrType}
                            onChange={(e) => setNewAddrType(e.target.value)}
                            className="border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 bg-white"
                          >
                            <option value="Primary Clinic">Primary Clinic</option>
                            <option value="Branch Clinic">Branch Clinic</option>
                            <option value="Research Lab">Research Lab</option>
                            <option value="Warehouse">Warehouse</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">Contact Person Name</label>
                          <input 
                            type="text" 
                            required
                            value={newAddrFullName}
                            onChange={(e) => setNewAddrFullName(e.target.value)}
                            className="border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 bg-white"
                            placeholder="Dr. Aditya Kumar"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">Clinic Name</label>
                        <input 
                          type="text" 
                          required
                          value={newAddrClinic}
                          onChange={(e) => setNewAddrClinic(e.target.value)}
                          className="border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 bg-white"
                          placeholder="Aesthetic Dental Center"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">Street details & building</label>
                        <input 
                          type="text" 
                          required
                          value={newAddrStreet}
                          onChange={(e) => setNewAddrStreet(e.target.value)}
                          className="border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 bg-white"
                          placeholder="e.g. 102 Medical Arcade"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3.5">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">City</label>
                          <input 
                            type="text" 
                            required
                            value={newAddrCity}
                            onChange={(e) => setNewAddrCity(e.target.value)}
                            className="border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 bg-white"
                            placeholder="Mumbai"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">State</label>
                          <input 
                            type="text" 
                            required
                            value={newAddrState}
                            onChange={(e) => setNewAddrState(e.target.value)}
                            className="border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 bg-white"
                            placeholder="Maharashtra"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">Pincode</label>
                          <input 
                            type="text" 
                            required
                            inputMode="numeric"
                            maxLength={6}
                            value={newAddrPincode}
                            onChange={(e) => setNewAddrPincode(e.target.value.replace(/\D/g, ''))}
                            className="border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 bg-white"
                            placeholder="400050"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">Contact phone at Delivery Point</label>
                        <input 
                          type="text" 
                          required
                          inputMode="numeric"
                          value={newAddrPhone}
                          onChange={(e) => setNewAddrPhone(e.target.value)}
                          className="border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 bg-white"
                          placeholder="9876543210"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 mt-2 rounded-xl bg-[#006670] hover:bg-[#004e56] text-white text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Save & Select Address
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: Delivery Method */}
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
                3. Delivery & Installation Mode
              </h2>

              <div className="space-y-3">
                {/* Option 1: Standard */}
                <label 
                  onClick={() => setDeliveryMethod('standard')}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 text-left
                    ${deliveryMethod === 'standard' 
                      ? 'border-[#006670] bg-[#e6f3f5]/10' 
                      : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-[#006670] mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                        Standard Shipping
                        <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 border border-emerald-100 rounded-full">Free</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">Estimated delivery within 3-5 business days.</p>
                    </div>
                  </div>
                  <input 
                    type="radio" 
                    name="delivery" 
                    checked={deliveryMethod === 'standard'} 
                    readOnly 
                    className="accent-[#006670] w-4.5 h-4.5"
                  />
                </label>

                {/* Option 2: Express */}
                <label 
                  onClick={() => setDeliveryMethod('express')}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 text-left
                    ${deliveryMethod === 'express' 
                      ? 'border-[#006670] bg-[#e6f3f5]/10' 
                      : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-[#006670] mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                        Express Medical Shipping
                        <span className="text-[9.5px] font-bold text-slate-500 font-sans">+₹1,500</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">Expedited logistics. Estimated delivery in 24-48 hours.</p>
                    </div>
                  </div>
                  <input 
                    type="radio" 
                    name="delivery" 
                    checked={deliveryMethod === 'express'} 
                    readOnly
                    className="accent-[#006670] w-4.5 h-4.5"
                  />
                </label>

                {/* Option 3: Installation */}
                <label 
                  onClick={() => setDeliveryMethod('install')}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 text-left
                    ${deliveryMethod === 'install' 
                      ? 'border-[#006670] bg-[#e6f3f5]/10' 
                      : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-[#006670] mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                        Scheduled Delivery & Calibration Setup
                        <span className="text-[9.5px] font-bold text-slate-500 font-sans">+₹3,500</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">Shipment + full installation by certified FAAZO engineers.</p>
                    </div>
                  </div>
                  <input 
                    type="radio" 
                    name="delivery" 
                    checked={deliveryMethod === 'install'} 
                    readOnly
                    className="accent-[#006670] w-4.5 h-4.5"
                  />
                </label>
              </div>
            </div>

            {/* SECTION 4: Payment Panel */}
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
                4. Select Payment Option
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 border border-slate-100 rounded-xl overflow-hidden mb-5">
                <button
                  onClick={() => setPaymentTab('upi')}
                  className={`py-3 text-xs font-extrabold uppercase border-b md:border-b-0 md:border-r border-slate-100 transition-colors cursor-pointer
                    ${paymentTab === 'upi' ? 'bg-[#006670] text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100/50'}`}
                >
                  UPI Pay
                </button>
                <button
                  onClick={() => setPaymentTab('card')}
                  className={`py-3 text-xs font-extrabold uppercase border-b md:border-b-0 md:border-r border-slate-100 transition-colors cursor-pointer
                    ${paymentTab === 'card' ? 'bg-[#006670] text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100/50'}`}
                >
                  Cards (Debit/Credit)
                </button>
                <button
                  onClick={() => setPaymentTab('netbank')}
                  className={`py-3 text-xs font-extrabold uppercase border-b md:border-b-0 md:border-r border-slate-100 transition-colors cursor-pointer
                    ${paymentTab === 'netbank' ? 'bg-[#006670] text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100/50'}`}
                >
                  Net Banking
                </button>
                <button
                  onClick={() => setPaymentTab('finance')}
                  className={`py-3 text-xs font-extrabold uppercase transition-colors cursor-pointer
                    ${paymentTab === 'finance' ? 'bg-[#006670] text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100/50'}`}
                >
                  Financing (EMI)
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4 bg-slate-50/50 border border-slate-200/40 rounded-xl min-h-[160px] flex items-center justify-center">
                
                {paymentTab === 'upi' && (
                  <div className="w-full max-w-sm space-y-3.5 py-2">
                    <div className="flex justify-center mb-3">
                      {/* Placeholder mock QR code */}
                      <div className="border border-slate-200 p-2 bg-white rounded-lg">
                        <img 
                          src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi://pay?pa=faazo@okaxis&pn=FAAZO%20Retail" 
                          alt="UPI Mock QR Code" 
                          className="w-24 h-24"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 text-center">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Scan QR Code or enter your Virtual Payment Address (VPA)</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 bg-white text-center focus:outline-none focus:border-[#006670]"
                      />
                    </div>
                  </div>
                )}

                {paymentTab === 'card' && (
                  <div className="w-full space-y-3.5 py-1 text-left">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500">Cardholder Name</label>
                      <input 
                        type="text" 
                        value={cardName} 
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Dr. Aditya Sharma" 
                        className="border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#006670]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500">Card Number</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          maxLength={19}
                          value={cardNumber} 
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4321 5678 9012 3456" 
                          className="w-full border border-slate-200 pl-10 pr-3 py-2 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#006670]"
                        />
                        <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500">Expiry MM/YY</label>
                        <input 
                          type="text" 
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="12/28" 
                          className="border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#006670]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500">CVV</label>
                        <input 
                          type="password" 
                          maxLength={3}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="***" 
                          className="border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#006670]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentTab === 'netbank' && (
                  <div className="w-full space-y-4 py-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block text-center">Select Popular Bank</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                      {['HDFC Bank', 'SBI', 'ICICI Bank', 'Axis Bank'].map((bank) => {
                        const isSel = selectedBank === bank;
                        return (
                          <button
                            key={bank}
                            type="button"
                            onClick={() => setSelectedBank(bank)}
                            className={`p-2.5 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200
                              ${isSel 
                                ? 'border-[#006670] bg-[#e6f3f5]/20 text-[#006670]' 
                                : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'}`}
                          >
                            <Landmark className="w-3.5 h-3.5 text-[#006670]" />
                            {bank}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {paymentTab === 'finance' && (
                  <div className="w-full text-left space-y-4 py-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">FAAZO Capital Professional Equipment Financing</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label 
                        onClick={() => setFinanceOption('3m_nocost')}
                        className={`p-3 rounded-xl border flex items-start justify-between cursor-pointer transition-all duration-200
                          ${financeOption === '3m_nocost' 
                            ? 'border-[#006670] bg-[#e6f3f5]/10' 
                            : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">3 Months No Cost EMI</h4>
                          <p className="text-[10.5px] text-slate-400 font-sans mt-0.5">₹{Math.round(orderTotalVal/3).toLocaleString('en-IN')}/mo • 0% Interest</p>
                        </div>
                        <input type="radio" checked={financeOption === '3m_nocost'} readOnly className="accent-[#006670]" />
                      </label>
                      
                      <label 
                        onClick={() => setFinanceOption('6m_interest')}
                        className={`p-3 rounded-xl border flex items-start justify-between cursor-pointer transition-all duration-200
                          ${financeOption === '6m_interest' 
                            ? 'border-[#006670] bg-[#e6f3f5]/10' 
                            : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">6 Months Low Cost EMI</h4>
                          <p className="text-[10.5px] text-slate-400 font-sans mt-0.5">₹{Math.round((orderTotalVal * 1.05)/6).toLocaleString('en-IN')}/mo • 10% p.a.</p>
                        </div>
                        <input type="radio" checked={financeOption === '6m_interest'} readOnly className="accent-[#006670]" />
                      </label>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* SECTION 5: Coupon Codes */}
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
                5. Apply Promo / Coupons
              </h2>

              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={couponCode} 
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter Promo Code (e.g. WELCOMEFAAZO)"
                  className="flex-grow border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#006670]"
                />
                <button
                  type="button"
                  onClick={() => handleApplyCoupon(couponCode)}
                  className="px-6 py-2.5 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm shrink-0"
                >
                  Apply
                </button>
              </div>

              {couponError && <p className="text-rose-500 text-[10.5px] font-bold mt-1.5 ml-1">{couponError}</p>}
              {activeCoupon && (
                <p className="text-emerald-600 text-[10.5px] font-bold mt-1.5 ml-1">
                  Coupon applied successfully! Saved ₹{couponDiscount.toLocaleString('en-IN')}
                </p>
              )}

              {/* Suggested offers list */}
              <div className="mt-5 space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Suggested Offers</span>
                
                <div 
                  onClick={() => handleApplyCoupon('WELCOMEFAAZO')}
                  className="p-3 border border-dashed border-slate-200 hover:border-[#006670]/60 rounded-xl cursor-pointer bg-slate-50/50 flex justify-between items-center transition-colors group"
                >
                  <div className="text-left font-sans">
                    <span className="inline-flex items-center gap-1.5 bg-[#e6f3f5] border border-[#006670]/15 text-[#006670] text-[9.5px] font-black tracking-widest px-2 py-0.5 rounded uppercase">
                      <Percent className="w-3 h-3" /> WELCOMEFAAZO
                    </span>
                    <p className="text-[10.5px] text-slate-500 font-sans mt-1.5">Get flat ₹1,000 off on your first FAAZO medical orders.</p>
                  </div>
                  <ChevronRightBtn />
                </div>

                <div 
                  onClick={() => handleApplyCoupon('CLINICOFF')}
                  className="p-3 border border-dashed border-slate-200 hover:border-[#006670]/60 rounded-xl cursor-pointer bg-slate-50/50 flex justify-between items-center transition-colors group"
                >
                  <div className="text-left font-sans">
                    <span className="inline-flex items-center gap-1.5 bg-[#e6f3f5] border border-[#006670]/15 text-[#006670] text-[9.5px] font-black tracking-widest px-2 py-0.5 rounded uppercase">
                      <Percent className="w-3 h-3" /> CLINICOFF
                    </span>
                    <p className="text-[10.5px] text-slate-500 font-sans mt-1.5">Save 10% on clinical equipment products.</p>
                  </div>
                  <ChevronRightBtn />
                </div>
              </div>
            </div>

          </div>

          {/* 35% Right Column: Sticky Summary & Badges */}
          <div className="lg:col-span-4 lg:sticky lg:top-[92px] space-y-4">
            
            {/* Price Details Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4 text-left">
                Procurement Cost Summary
              </h3>

              {/* Items Preview */}
              <div className="space-y-3 mb-4.5 border-b border-slate-100 pb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3 items-center justify-between text-xs">
                    <div className="flex gap-2.5 items-center max-w-[75%]">
                      <img src={getAbsoluteImageUrl(item.image)} alt={item.name} className="w-9 h-9 object-contain bg-slate-50 p-1 border border-slate-100 rounded shrink-0" />
                      <span className="font-bold text-slate-800 truncate">{item.name}</span>
                    </div>
                    <span className="font-semibold text-slate-500 shrink-0 font-sans">
                      {item.qty} × ₹{item.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              {/* cost Matrix */}
              <div className="space-y-3 font-sans text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Gross Value</span>
                  <span className="font-semibold text-slate-800">₹{totalOriginalPriceVal.toLocaleString('en-IN')}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>FAAZO Base Discount</span>
                  <span className="font-bold text-emerald-600">-₹{baseProductDiscountVal.toLocaleString('en-IN')}</span>
                </div>

                {activeCoupon && (
                  <div className="flex justify-between">
                    <span>Promo Applied ({activeCoupon.code})</span>
                    <span className="font-bold text-emerald-600">-₹{couponDiscountVal.toLocaleString('en-IN')}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span>Medical IGST tax</span>
                  <span className="font-semibold text-slate-800">₹{gstAmountVal.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between">
                  <span>Shipping & Installation</span>
                  <span className="text-slate-800 font-semibold">
                    {deliveryFeeVal === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `₹${deliveryFeeVal.toLocaleString('en-IN')}`}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-3.5 mt-2 flex justify-between text-sm font-black text-slate-900 border-b border-slate-100 pb-3.5">
                  <span>Procurement cost</span>
                  <span className="text-[#006670] font-display">₹{orderTotalVal.toLocaleString('en-IN')}</span>
                </div>

                <div className="pt-1.5 font-bold text-emerald-600 text-xs text-center">
                  Total Practice Savings: ₹{overallSavingsVal.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Checkout Button with Loading Spinner State */}
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isPlacing}
                className="w-full py-4 mt-6 rounded-xl bg-[#006670] hover:bg-[#004e56] text-white text-xs tracking-wider font-extrabold uppercase transition-all shadow-md hover:shadow-premium cursor-pointer flex items-center justify-center gap-2"
              >
                {isPlacing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Authorizing Payment...
                  </>
                ) : (
                  <>
                    Place Secure Order
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Medical Trust Badges */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
              <div className="flex gap-3 items-start text-left">
                <Shield className="w-5 h-5 text-[#006670] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[11px] font-black text-slate-800 uppercase">Secure Payment Portal</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed font-sans">Full transit coverage and encrypted transactions. ISO 13485 logistics certifications.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start text-left">
                <Shield className="w-5 h-5 text-[#006670] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[11px] font-black text-slate-800 uppercase">Manufacturer Warranty</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed font-sans">Official factory warrantee tracking with complete component replacement coverages.</p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* 5. FAAZO Secure Payment Sandbox Modal */}
      {showSandboxModal && sandboxOrderData && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100/80 text-center space-y-6 animate-scale-in">
            <div className="flex justify-center">
              <div className="p-3.5 bg-emerald-50 rounded-2xl">
                <Shield className="w-8 h-8 text-[#006670]" />
              </div>
            </div>
            
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-wide uppercase">
                FAAZO Payment Sandbox
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Developer simulation of Razorpay secure overlay
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl text-left text-xs space-y-2 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Order ID</span>
                <span className="font-mono font-bold text-slate-700">{sandboxOrderData.razorpay_order_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Payment ID</span>
                <span className="font-mono font-bold text-slate-700">{sandboxOrderData.payment_id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Currency</span>
                <span className="font-bold text-slate-700">{sandboxOrderData.currency}</span>
              </div>
              <div className="border-t border-slate-200/60 my-2 pt-2 flex justify-between">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Total Amount</span>
                <span className="font-extrabold text-sm text-[#006670]">₹{(sandboxOrderData.amount / 100).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-amber-50/60 border border-amber-100 p-3 rounded-xl leading-relaxed text-left">
              <strong>Test Mode Simulation:</strong> To run signature verification without live keys, select "Simulate Success". This constructs a secure mock signature matching the backend expected format.
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSandboxModal(false);
                  const mockPayId = `pay_mock_${Math.random().toString(36).substring(2, 10)}`;
                  sandboxOrderData.handler({
                    razorpay_order_id: sandboxOrderData.razorpay_order_id,
                    razorpay_payment_id: mockPayId,
                    razorpay_signature: `sig_mock_${sandboxOrderData.razorpay_order_id}_${mockPayId}`,
                  });
                }}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold uppercase transition-all shadow-sm cursor-pointer"
              >
                Simulate Success
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSandboxModal(false);
                  sandboxOrderData.ondismiss();
                }}
                className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold uppercase transition-all shadow-sm cursor-pointer"
              >
                Simulate Failure
              </button>
            </div>
            
            <button
              type="button"
              onClick={() => {
                setShowSandboxModal(false);
                sandboxOrderData.ondismiss();
              }}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 block mx-auto cursor-pointer"
            >
              Cancel Payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component chevron arrow
const ChevronRightBtn = () => (
  <span className="text-slate-400 group-hover:text-[#006670] group-hover:translate-x-1.5 transition-transform duration-200">
    <Check className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity mr-2 inline" />
    <ArrowRight className="w-4 h-4 inline" />
  </span>
);

export default CheckoutPage;
