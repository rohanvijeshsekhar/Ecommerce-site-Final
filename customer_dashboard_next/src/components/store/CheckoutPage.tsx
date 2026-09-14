'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  Check,
  Truck,
  Percent,
  ArrowLeft,
  ArrowRight,
  Plus,
  AlertCircle,
  Edit3,
  Trash2,
  MapPin,
  Building2,
  User,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Sparkles,
  Lock,
  Tag,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usersService, type Address as UserAddress } from '../../lib/services/users';
import { shippingService, type CourierServiceabilityResult } from '../../lib/services/shipping';
import { getAbsoluteImageUrl } from '../../lib/api';
import { paymentService } from '../../lib/services/payment';
import { INDIAN_STATES, isPincodeMatchingState } from '@/lib/constants/indianStates';

interface MockCartItem {
  id: string;
  name: string;
  category: string;
  price: number;
  qty: number;
  image: string;
  originalPrice?: number;
}

interface AddressItem {
  id: string;
  label: string;
  full_name: string;
  mobile: string;
  line1: string; // Clinic / Practice Name
  line2: string; // Street / Building / Area
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  address_type?: 'shipping' | 'billing' | 'both';
}

interface CheckoutPageProps {
  cartItems: MockCartItem[];
  setCurrentView: (
    view: 'home' | 'portfolio' | 'listing' | 'detail' | 'cart' | 'wishlist' | 'checkout' | 'order-success' | 'my-orders'
  ) => void;
  checkoutSource?: 'cart' | 'buy-now';
  onBackCheckout?: () => void;
  showToast?: (message: string) => void;
  onPlaceOrderSuccess: (orderData: {
    id: string;
    items: MockCartItem[];
    address: any;
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

const ADDRESS_LABEL_OPTIONS = ['Primary Clinic', 'Branch Clinic', 'Office', 'Home', 'Other'];

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
  useEffect(() => {
    if (user && user.can_purchase === false) {
      showToast?.('Purchasing is disabled until your dealer application is approved.');
      setCurrentView('home');
    }
  }, [user, setCurrentView, showToast]);

  // --- 1. CONTACT & PRACTICE STATE ---
  const [dentistName, setDentistName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [clinicName, setClinicName] = useState('');

  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});

  // Pre-fill from auth context
  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setDentistName(user.full_name || '');
      if (user.phone_number) setPhone(user.phone_number);
    }
    if (profile) {
      setClinicName(profile.clinic_name || '');
      if (profile.clinic_phone && !phone) setPhone(profile.clinic_phone);
    }
  }, [user, profile]);

  // GST Invoice state
  const [gstInvoice, setGstInvoice] = useState(false);
  const [gstNumber, setGstNumber] = useState('');
  const [gstError, setGstError] = useState('');

  // --- 2. ADDRESS STATE ---
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [addrLoading, setAddrLoading] = useState(false);

  // Address card serviceability feedback map
  const [serviceabilityMap, setServiceabilityMap] = useState<
    Record<string, { loading: boolean; data?: CourierServiceabilityResult }>
  >({});

  // Address Modal State (Add & Edit)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressItem | null>(null);

  const [modalForm, setModalForm] = useState({
    label_type: 'Primary Clinic',
    custom_label: '',
    full_name: '',
    mobile: '',
    clinic_name: '', // line1
    street_address: '', // line2
    city: '',
    state: '',
    pincode: '',
    is_default: false,
  });

  const [modalErrors, setModalErrors] = useState<Record<string, string>>({});
  const [modalServerError, setModalServerError] = useState<string | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalPincodeStatus, setModalPincodeStatus] = useState<{
    checking: boolean;
    result?: CourierServiceabilityResult;
  }>({ checking: false });

  // Delete Address Modal State
  const [deletingAddress, setDeletingAddress] = useState<AddressItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Pincode debouncing timer
  const pincodeDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Promo / Coupons
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState<{ code: string; type: 'fixed' | 'percent'; value: number } | null>(
    null
  );
  const [couponError, setCouponError] = useState('');

  // Sandbox simulation overlay
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [sandboxOrderData, setSandboxOrderData] = useState<{
    razorpay_order_id: string;
    amount: number;
    currency: string;
    payment_id: string;
    handler: (response: any) => void;
    ondismiss: () => void;
  } | null>(null);

  // Order Placement Loading
  const [isPlacing, setIsPlacing] = useState(false);

  // Full-Screen Payment Processing Overlay State (Flipkart/Amazon/Ajio style)
  const [paymentProcessing, setPaymentProcessing] = useState<{
    isOpen: boolean;
    stage: 'verifying' | 'confirming' | 'success' | 'failed';
    errorMessage?: string;
  }>({
    isOpen: false,
    stage: 'verifying',
  });

  // Dynamic pricing overrides from backend preview
  const [previewPricing, setPreviewPricing] = useState<{
    mrp_subtotal: number;
    selling_subtotal: number;
    gst_amount: number;
    shipping_fee: number;
    total_amount: number;
    savings: number;
  } | null>(null);
  const [addressValidationError, setAddressValidationError] = useState<string | null>(null);

  // --- FETCH ADDRESSES ---
  const fetchAddresses = useCallback(async () => {
    setAddrLoading(true);
    try {
      const res = await usersService.getAddresses();
      if (res.success && res.data) {
        const mapped: AddressItem[] = res.data.map((addr: UserAddress) => ({
          id: addr.id,
          label: addr.label || 'Primary Clinic',
          full_name: addr.full_name,
          mobile: addr.mobile,
          line1: addr.line1,
          line2: addr.line2 || '',
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          is_default: addr.is_default,
          address_type: addr.address_type,
        }));
        setAddresses(mapped);

        if (mapped.length > 0) {
          setSelectedAddressId((currentId) => {
            if (currentId && mapped.some((a) => a.id === currentId)) {
              return currentId;
            }
            const defaultAddr = mapped.find((a) => a.is_default);
            return defaultAddr ? defaultAddr.id : mapped[0].id;
          });
        }
      }
    } catch (e) {
      console.error('Failed to load user addresses:', e);
    } finally {
      setAddrLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Check courier serviceability for the selected address
  useEffect(() => {
    if (!selectedAddressId) return;
    const selected = addresses.find((a) => a.id === selectedAddressId);
    if (!selected || !selected.pincode || selected.pincode.length !== 6) return;

    const pin = selected.pincode;
    if (serviceabilityMap[selected.id]?.data) return; // already loaded

    setServiceabilityMap((prev) => ({
      ...prev,
      [selected.id]: { loading: true },
    }));

    shippingService
      .checkServiceability(pin)
      .then((res) => {
        setServiceabilityMap((prev) => ({
          ...prev,
          [selected.id]: { loading: false, data: res },
        }));
      })
      .catch(() => {
        setServiceabilityMap((prev) => ({
          ...prev,
          [selected.id]: { loading: false },
        }));
      });
  }, [selectedAddressId, addresses]);

  // --- CALCULATION LOGIC ---
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);

  const deliveryFee = 0;

  const gstAmount = Math.round(subtotal - subtotal / 1.18);

  const totalOriginalPrice = cartItems.reduce((acc, item) => {
    const orig = item.originalPrice || Math.round(item.price * 1.2);
    return acc + orig * item.qty;
  }, 0);

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
  const orderTotal = subtotal + deliveryFee - couponDiscount;
  const overallSavings = overallDiscount;

  // Pricing values with backend preview fallback
  const subtotalVal = previewPricing ? previewPricing.selling_subtotal : subtotal;
  const gstAmountVal = previewPricing ? previewPricing.gst_amount : gstAmount;
  const deliveryFeeVal = previewPricing ? previewPricing.shipping_fee : deliveryFee;
  const totalOriginalPriceVal = previewPricing ? previewPricing.mrp_subtotal : totalOriginalPrice;
  const baseProductDiscountVal = previewPricing
    ? previewPricing.mrp_subtotal - previewPricing.selling_subtotal
    : baseProductDiscount;
  const orderTotalVal = previewPricing ? previewPricing.total_amount : orderTotal;
  const overallSavingsVal = previewPricing ? previewPricing.savings : overallSavings;
  const couponDiscountVal = couponDiscount;

  // --- BACKEND CHECKOUT PREVIEW ---
  useEffect(() => {
    if (!selectedAddressId || selectedAddressId.startsWith('addr-') || selectedAddressId.length < 10) {
      return;
    }
    if (cartItems.length === 0) {
      return;
    }
    const loadPreview = async () => {
      try {
        const { cartService } = await import('../../lib/services/cart');
        const itemsPayload =
          cartItems && cartItems.length > 0
            ? cartItems.map((item) => ({ product_id: item.id, quantity: item.qty }))
            : undefined;
        const res = await cartService.checkoutPreview(selectedAddressId, 'standard', itemsPayload);
        if (res.success && res.data) {
          setPreviewPricing(res.data);
          setAddressValidationError(null);
        }
      } catch (e: any) {
        const backendMsg =
          e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || 'Checkout preview failed.';
        if (!backendMsg.includes('checkout queue is empty')) {
          setAddressValidationError(backendMsg);
        }
      }
    };
    loadPreview();
  }, [selectedAddressId, cartItems, checkoutSource]);

  // --- ADDRESS MODAL HANDLERS ---
  const handleOpenAddModal = () => {
    setEditingAddress(null);
    setModalForm({
      label_type: 'Primary Clinic',
      custom_label: '',
      full_name: dentistName || user?.full_name || '',
      mobile: phone || user?.phone_number || '',
      clinic_name: clinicName || profile?.clinic_name || '',
      street_address: '',
      city: '',
      state: '',
      pincode: '',
      is_default: addresses.length === 0,
    });
    setModalErrors({});
    setModalPincodeStatus({ checking: false });
    setModalServerError(null);
    setIsAddressModalOpen(true);
  };

  const handleOpenEditModal = (addr: AddressItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAddress(addr);
    const isStandardLabel = ADDRESS_LABEL_OPTIONS.includes(addr.label);
    setModalForm({
      label_type: isStandardLabel ? addr.label : 'Other',
      custom_label: isStandardLabel ? '' : addr.label,
      full_name: addr.full_name,
      mobile: addr.mobile,
      clinic_name: addr.line1,
      street_address: addr.line2,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      is_default: addr.is_default,
    });
    setModalErrors({});
    setModalPincodeStatus({ checking: false });
    setModalServerError(null);
    setIsAddressModalOpen(true);

    // Check pincode serviceability for the existing address immediately
    if (addr.pincode && addr.pincode.length === 6) {
      shippingService.checkServiceability(addr.pincode).then((res) => {
        setModalPincodeStatus({ checking: false, result: res });
      });
    }
  };

  // Debounced Pincode check inside Add/Edit modal
  const handlePincodeChange = (val: string) => {
    const cleanPin = val.replace(/\D/g, '').slice(0, 6);
    setModalForm((prev) => ({ ...prev, pincode: cleanPin }));

    if (modalErrors.pincode) {
      setModalErrors((prev) => ({ ...prev, pincode: '' }));
    }

    if (pincodeDebounceRef.current) {
      clearTimeout(pincodeDebounceRef.current);
    }

    if (cleanPin.length === 6) {
      // Early state mismatch check
      if (modalForm.state && !isPincodeMatchingState(cleanPin, modalForm.state)) {
        setModalErrors((prev) => ({
          ...prev,
          pincode: `Pincode ${cleanPin} does not correspond to ${modalForm.state}.`,
        }));
      }

      setModalPincodeStatus({ checking: true });
      pincodeDebounceRef.current = setTimeout(async () => {
        const res = await shippingService.checkServiceability(cleanPin);
        setModalPincodeStatus({ checking: false, result: res });
      }, 400);
    } else {
      setModalPincodeStatus({ checking: false });
    }
  };

  const validateModalForm = () => {
    const errors: Record<string, string> = {};

    if (!modalForm.full_name || modalForm.full_name.trim().length < 3) {
      errors.full_name = 'Please enter contact person name (min 3 characters).';
    }

    const cleanMobile = modalForm.mobile.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      errors.mobile = 'Enter a valid 10-digit Indian mobile number (starting with 6-9).';
    }

    if (!modalForm.clinic_name || modalForm.clinic_name.trim().length < 5) {
      errors.clinic_name = 'Please enter clinic / practice / business name (min 5 characters).';
    }

    if (!modalForm.street_address || modalForm.street_address.trim().length < 5) {
      errors.street_address = 'Please enter complete street/building address (min 5 characters).';
    }

    if (!modalForm.city || modalForm.city.trim().length < 2) {
      errors.city = 'Please enter a valid city name.';
    }

    if (!modalForm.state || modalForm.state.trim().length < 2) {
      errors.state = 'Please select a State / Union Territory.';
    }

    if (!/^\d{6}$/.test(modalForm.pincode.trim())) {
      errors.pincode = 'Enter a valid 6-digit Indian PIN code.';
    } else if (modalForm.state && !isPincodeMatchingState(modalForm.pincode.trim(), modalForm.state)) {
      errors.pincode = `Pincode ${modalForm.pincode.trim()} does not match ${modalForm.state}.`;
    }

    if (modalForm.label_type === 'Other' && !modalForm.custom_label.trim()) {
      errors.custom_label = 'Please specify custom address label.';
    }

    setModalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveModalAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateModalForm()) return;

    setModalSaving(true);
    const resolvedLabel =
      modalForm.label_type === 'Other' ? modalForm.custom_label.trim() : modalForm.label_type;

    const payload = {
      label: resolvedLabel || 'Primary Clinic',
      full_name: modalForm.full_name.trim(),
      mobile: modalForm.mobile.replace(/\D/g, ''),
      line1: modalForm.clinic_name.trim(),
      line2: modalForm.street_address.trim(),
      city: modalForm.city.trim(),
      state: modalForm.state.trim(),
      pincode: modalForm.pincode.trim(),
      is_default: modalForm.is_default,
      address_type: 'both' as const,
    };

    try {
      if (editingAddress) {
        const res = await usersService.updateAddress(editingAddress.id, payload);
        if (res.success && res.data) {
          showToast?.('Practice address updated successfully.');
          setIsAddressModalOpen(false);
          setModalServerError(null);
          await fetchAddresses();
          setSelectedAddressId(res.data.id);
        } else {
          setModalServerError(res.message || 'Failed to update address.');
        }
      } else {
        const res = await usersService.createAddress(payload);
        if (res.success && res.data) {
          showToast?.('New practice address saved.');
          setIsAddressModalOpen(false);
          setModalServerError(null);
          await fetchAddresses();
          setSelectedAddressId(res.data.id);
        } else {
          setModalServerError(res.message || 'Failed to save address.');
        }
      }
    } catch (err: any) {
      const backendErrors = err?.response?.data?.errors;
      const errorMsg = backendErrors
        ? Object.values(backendErrors).flat().join(' ')
        : err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to save address.';
      setModalServerError(errorMsg);
    } finally {
      setModalSaving(false);
    }
  };

  const handleSetDefaultAddress = async (addrId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await usersService.setDefaultAddress(addrId);
      if (res.success) {
        showToast?.('Default delivery address updated.');
        await fetchAddresses();
      }
    } catch (err: any) {
      showToast?.('Failed to update default address.');
    }
  };

  const handleDeleteAddressConfirm = async () => {
    if (!deletingAddress) return;
    setDeleteLoading(true);
    try {
      const res = await usersService.deleteAddress(deletingAddress.id);
      if (res.success) {
        showToast?.('Address removed.');
        setDeletingAddress(null);
        await fetchAddresses();
      }
    } catch (err: any) {
      showToast?.('Failed to delete address.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // --- PROMO & PAYMENT HANDLERS ---
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

  const validateContactSection = () => {
    const errs: Record<string, string> = {};
    if (!dentistName || dentistName.trim().length < 3) {
      errs.dentistName = 'Dentist / Contact Name must be at least 3 characters.';
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid professional email address.';
    }
    const cleanPh = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPh)) {
      errs.phone = 'Please enter a valid 10-digit mobile number.';
    }
    if (!clinicName || clinicName.trim().length < 2) {
      errs.clinicName = 'Please enter your clinic / hospital name.';
    }
    if (gstInvoice) {
      const cleanGst = gstNumber.trim().toUpperCase();
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGst)) {
        errs.gstNumber = 'Please enter a valid 15-character GSTIN (e.g. 27AAAAA1111A1Z1).';
      }
    }
    setContactErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      showToast?.('Your Cart is empty!');
      return;
    }
    if (!validateContactSection()) {
      showToast?.('Please review and complete contact & practice information.');
      return;
    }
    if (!selectedAddressId) {
      showToast?.('Please select or add a clinic delivery address.');
      return;
    }
    if (addressValidationError) {
      showToast?.(`Cannot proceed: ${addressValidationError}`);
      return;
    }

    setIsPlacing(true);

    try {
      const scriptLoaded = await paymentService.loadScript();
      if (!scriptLoaded) {
        showToast?.('Failed to load payment SDK. Please check your network connection.');
        setIsPlacing(false);
        return;
      }

      const paymentMethodName = 'razorpay';

      const itemsPayload =
        cartItems && cartItems.length > 0
          ? cartItems.map((item) => ({ product_id: item.id, quantity: item.qty }))
          : undefined;

      const createRes = await paymentService.createPaymentOrder({
        address_id: selectedAddressId,
        delivery_method: 'standard',
        payment_method: paymentMethodName,
        gst_number: gstInvoice ? gstNumber.trim().toUpperCase() : undefined,
        items: itemsPayload,
      });

      if (!createRes.success || !createRes.data) {
        showToast?.(createRes.message || 'Failed to initialize payment with backend.');
        setIsPlacing(false);
        return;
      }

      const rzOrder = createRes.data;

      const options = {
        key: rzOrder.key_id,
        amount: rzOrder.amount,
        currency: rzOrder.currency,
        name: 'FAAZO Dental Solutions',
        description: 'Secure Dental Equipment Purchase',
        order_id: rzOrder.razorpay_order_id,
        handler: async (response: any) => {
          // Open the high-trust processing overlay immediately (Flipkart/Amazon style)
          setPaymentProcessing({
            isOpen: true,
            stage: 'verifying',
          });

          // Real-time animated progression while server confirms order
          const progressTimer = setTimeout(() => {
            setPaymentProcessing((prev) =>
              prev.isOpen && prev.stage === 'verifying' ? { ...prev, stage: 'confirming' } : prev
            );
          }, 300);

          try {
            const verifyRes = await paymentService.verifyPayment({
              razorpay_order_id: response?.razorpay_order_id || rzOrder.razorpay_order_id,
              razorpay_payment_id: response?.razorpay_payment_id || '',
              razorpay_signature: response?.razorpay_signature || '',
              payment_id: rzOrder.payment_id,
            });

            clearTimeout(progressTimer);

            if (verifyRes.success && verifyRes.data) {
              // Transition to Order Confirmed state
              setPaymentProcessing({
                isOpen: true,
                stage: 'success',
              });

              // Give customer 600ms to see the clear success confirmation animation before routing
              setTimeout(() => {
                onPlaceOrderSuccess(verifyRes.data as any);
              }, 600);
            } else {
              const errMsg = verifyRes.message || 'Payment signature verification failed.';
              setPaymentProcessing({
                isOpen: true,
                stage: 'failed',
                errorMessage: errMsg,
              });
              showToast?.(errMsg);
            }
          } catch (err: any) {
            clearTimeout(progressTimer);
            const errMsg =
              err?.response?.data?.error?.message ||
              err?.response?.data?.message ||
              'Payment verification failed.';
            setPaymentProcessing({
              isOpen: true,
              stage: 'failed',
              errorMessage: errMsg,
            });
            showToast?.(errMsg);
          } finally {
            setIsPlacing(false);
          }
        },
        prefill: {
          name: dentistName.trim(),
          email: email.trim(),
          contact: phone.replace(/\D/g, '').slice(-10),
        },
        notes: {
          payment_id: rzOrder.payment_id,
        },
        theme: {
          color: '#006670',
        },
        modal: {
          ondismiss: () => {
            setIsPlacing(false);
            setPaymentProcessing({ isOpen: false, stage: 'verifying' });
            showToast?.('Payment modal closed. Transaction cancelled.');
          },
        },
      };

      const isDev = process.env.NODE_ENV !== 'production';
      const isSandbox =
        isDev && (
          rzOrder.razorpay_order_id.startsWith('order_mock_') ||
          !rzOrder.key_id ||
          rzOrder.key_id.includes('REPLACE') ||
          rzOrder.key_id === ''
        );

      if (isSandbox) {
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

      if (!rzOrder.key_id && !isDev) {
        setIsPlacing(false);
        showToast?.('Payment gateway error: Razorpay key is not configured.');
        return;
      }

      try {
        const rzInstance = new (window as any).Razorpay(options);
        rzInstance.on('payment.failed', function (resp: any) {
          const failDesc =
            resp?.error?.description || resp?.error?.reason || 'Transaction cancelled or failed.';
          showToast?.(`Payment failed: ${failDesc}`);
          setIsPlacing(false);
          setPaymentProcessing({ isOpen: false, stage: 'verifying' });
        });
        rzInstance.open();
        setIsPlacing(false);
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

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const selectedServiceability = selectedAddressId ? serviceabilityMap[selectedAddressId] : undefined;

  return (
    <div className="w-full bg-[#F4F7F8] min-h-screen pt-[116px] lg:pt-[170px] pb-24 font-sans select-none text-left">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        
        {/* Top Header Bar: Breadcrumb + Security Assurance Badge (Amazon / Myntra Style) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onBackCheckout) onBackCheckout();
                else setCurrentView('cart');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#006670] hover:text-[#004e56] bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>{checkoutSource === 'buy-now' ? 'Back to Product' : 'Back to Cart'}</span>
            </button>

            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Secure Checkout</span>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-[11px] font-bold shadow-2xs self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% Safe & Secure Checkout • 256-Bit SSL</span>
          </div>
        </div>

        {/* Progress Stepper (Myntra / Flipkart Style) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-6 shadow-2xs">
          <div className="max-w-2xl mx-auto flex items-center justify-between relative">
            {/* Step 1 */}
            <div className="flex items-center gap-2.5 z-10">
              <div className="w-7 h-7 rounded-full bg-[#006670] text-white flex items-center justify-center text-xs font-black shadow-xs">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-wide">1. Contact Info</p>
                <p className="text-[10px] text-emerald-600 font-semibold">Verified</p>
              </div>
            </div>

            {/* Divider Line 1 */}
            <div className="flex-1 h-0.5 bg-[#006670]/30 mx-2 sm:mx-4" />

            {/* Step 2 */}
            <div className="flex items-center gap-2.5 z-10">
              <div className="w-7 h-7 rounded-full bg-[#006670] text-white flex items-center justify-center text-xs font-black shadow-xs">
                2
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-wide">2. Delivery Address</p>
                <p className="text-[10px] text-slate-500 font-medium">{selectedAddress ? selectedAddress.city : 'Select clinic'}</p>
              </div>
            </div>

            {/* Divider Line 2 */}
            <div className="flex-1 h-0.5 bg-[#006670]/30 mx-2 sm:mx-4" />

            {/* Step 3 */}
            <div className="flex items-center gap-2.5 z-10">
              <div className="w-7 h-7 rounded-full bg-[#006670] text-white flex items-center justify-center text-xs font-black shadow-xs">
                3
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-wide">3. Payment</p>
                <p className="text-[10px] text-slate-500 font-medium">Razorpay Secure</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (8 cols): Checkout Steps */}
          <div className="lg:col-span-8 space-y-6">

            {/* ============================================================ */}
            {/* STEP 1: CONTACT & PRACTICE INFORMATION                       */}
            {/* ============================================================ */}
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-left">
              <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-[#006670] text-white text-xs font-black flex items-center justify-center shadow-xs">
                    1
                  </span>
                  <div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                      Contact & Practice Information
                    </h2>
                    <p className="text-[11px] text-slate-400 font-sans">Used for order tracking, invoice & delivery dispatch notifications</p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                  <Check className="w-3 h-3 stroke-[3]" /> Logged In
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dentist Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#006670]" /> Dentist / Contact Name *
                  </label>
                  <input
                    type="text"
                    value={dentistName}
                    onChange={(e) => {
                      setDentistName(e.target.value);
                      if (contactErrors.dentistName) setContactErrors((prev) => ({ ...prev, dentistName: '' }));
                    }}
                    placeholder="Dr. Aditya Sharma"
                    className={`w-full border ${
                      contactErrors.dentistName ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400' : 'border-slate-200 bg-white hover:border-slate-300'
                    } px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006670]/20 focus:border-[#006670] transition-all`}
                  />
                  {contactErrors.dentistName && (
                    <span className="text-[10.5px] text-rose-500 font-semibold">{contactErrors.dentistName}</span>
                  )}
                </div>

                {/* Clinic Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#006670]" /> Clinic / Hospital Name *
                  </label>
                  <input
                    type="text"
                    value={clinicName}
                    onChange={(e) => {
                      setClinicName(e.target.value);
                      if (contactErrors.clinicName) setContactErrors((prev) => ({ ...prev, clinicName: '' }));
                    }}
                    placeholder="Aesthetic Dental Center"
                    className={`w-full border ${
                      contactErrors.clinicName ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400' : 'border-slate-200 bg-white hover:border-slate-300'
                    } px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006670]/20 focus:border-[#006670] transition-all`}
                  />
                  {contactErrors.clinicName && (
                    <span className="text-[10.5px] text-rose-500 font-semibold">{contactErrors.clinicName}</span>
                  )}
                </div>

                {/* Email Address */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#006670]" /> Professional Email Address *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (contactErrors.email) setContactErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    placeholder="dr.sharma@clinic.com"
                    className={`w-full border ${
                      contactErrors.email ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400' : 'border-slate-200 bg-white hover:border-slate-300'
                    } px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006670]/20 focus:border-[#006670] transition-all`}
                  />
                  {contactErrors.email && (
                    <span className="text-[10.5px] text-rose-500 font-semibold">{contactErrors.email}</span>
                  )}
                </div>

                {/* Mobile Phone */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#006670]" /> Active Mobile Number (Courier SMS) *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-extrabold text-slate-400 select-none">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, ''));
                        if (contactErrors.phone) setContactErrors((prev) => ({ ...prev, phone: '' }));
                      }}
                      placeholder="9876543210"
                      className={`w-full border ${
                        contactErrors.phone ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400' : 'border-slate-200 bg-white hover:border-slate-300'
                      } pl-12 pr-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006670]/20 focus:border-[#006670] transition-all`}
                    />
                  </div>
                  {contactErrors.phone && (
                    <span className="text-[10.5px] text-rose-500 font-semibold">{contactErrors.phone}</span>
                  )}
                </div>
              </div>

              {/* GST Tax Invoice Box (Flipkart/Amazon B2B Style) */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={gstInvoice}
                    onChange={(e) => setGstInvoice(e.target.checked)}
                    className="w-4.5 h-4.5 rounded-md accent-[#006670] cursor-pointer"
                  />
                  <div className="text-left">
                    <span className="text-xs font-black text-slate-800 group-hover:text-[#006670] transition-colors">
                      Claim GST Input Tax Credit (B2B Tax Invoice)
                    </span>
                    <span className="text-[11px] text-slate-500 block font-normal">
                      Receive GST-compliant tax invoice with your practice GSTIN for input tax credit claims.
                    </span>
                  </div>
                </label>

                {gstInvoice && (
                  <div className="mt-3.5 p-4 bg-[#F2FAF9] border border-[#006670]/20 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-1 duration-200">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-[#006670]">
                        GSTIN Registration Number *
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        value={gstNumber}
                        onChange={(e) => {
                          setGstNumber(e.target.value.toUpperCase());
                          if (contactErrors.gstNumber) setContactErrors((prev) => ({ ...prev, gstNumber: '' }));
                        }}
                        placeholder="27AAAAA1111A1Z1"
                        className={`border ${
                          contactErrors.gstNumber ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 bg-white'
                        } px-3.5 py-2 rounded-lg text-xs font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-[#006670]/20 focus:border-[#006670]`}
                      />
                      {contactErrors.gstNumber && (
                        <span className="text-[10px] text-rose-500 font-semibold">{contactErrors.gstNumber}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Registered Entity
                      </label>
                      <div className="px-3.5 py-2 rounded-lg border border-slate-200/80 bg-white text-xs font-bold text-slate-700 truncate">
                        {clinicName || 'Will match clinic / entity name'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ============================================================ */}
            {/* STEP 2: SHIPPING & PRACTICE ADDRESS                          */}
            {/* ============================================================ */}
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-left">
              <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-[#006670] text-white text-xs font-black flex items-center justify-center shadow-xs">
                    2
                  </span>
                  <div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                      Shipping & Practice Address
                    </h2>
                    <p className="text-[11px] text-slate-400 font-sans">Select where your dental supplies will be dispatched</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#006670]/10 hover:bg-[#006670] text-[#006670] hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Address</span>
                </button>
              </div>

              {/* Saved Address Cards Grid (Flipkart / Myntra Style) */}
              {addrLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-[#006670]" />
                  <span className="text-xs font-bold">Loading your saved addresses...</span>
                </div>
              ) : addresses.length === 0 ? (
                <div className="py-10 px-6 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
                  <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-black text-slate-800">No Saved Clinic Addresses</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Please add your clinic, hospital, or practice delivery address to proceed with secure checkout.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-[#006670] text-white text-xs font-black tracking-wider uppercase rounded-xl hover:bg-[#004e56] transition-colors cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Clinic Delivery Address
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr) => {
                    const isSelected = addr.id === selectedAddressId;
                    const srv = serviceabilityMap[addr.id];

                    return (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`relative rounded-2xl p-5 border transition-all duration-200 cursor-pointer flex flex-col justify-between text-left ${
                          isSelected
                            ? 'border-[#006670] bg-[#F2FAF9]/50 ring-2 ring-[#006670]/30 shadow-[0_4px_16px_rgba(0,102,112,0.08)]'
                            : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs'
                        }`}
                      >
                        <div>
                          {/* Card Header: Selection Radio & Address Tags */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5">
                              {/* Custom Radio Button */}
                              <div
                                className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  isSelected ? 'border-[#006670] bg-[#006670]' : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                {addr.label}
                              </span>
                              {addr.is_default && (
                                <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                  Default
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Recipient & Practice Name */}
                          <h4 className="text-sm font-black text-slate-900 leading-snug">{addr.full_name}</h4>
                          <p className="text-xs font-bold text-[#006670] mt-0.5">{addr.line1}</p>

                          {/* Address Details */}
                          <p className="text-xs text-slate-600 font-sans mt-2 leading-relaxed">
                            {addr.line2 ? `${addr.line2}, ` : ''}
                            {addr.city}, {addr.state} - <span className="font-black text-slate-900">{addr.pincode}</span>
                          </p>

                          {/* Phone */}
                          <p className="text-[11px] font-semibold text-slate-500 font-sans mt-2 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>Mobile: <strong className="text-slate-800 font-bold">+91 {addr.mobile}</strong></span>
                          </p>
                        </div>

                        {/* Bottom Status & Actions (Myntra / Flipkart Style) */}
                        <div className="mt-4 pt-3.5 border-t border-slate-200/60 flex flex-col gap-2.5">
                          {isSelected && (
                            <div className="flex items-center justify-between flex-wrap gap-1.5 text-[11px]">
                              <span className="inline-flex items-center gap-1 font-extrabold text-emerald-800 bg-emerald-100/70 border border-emerald-300/60 px-2.5 py-0.5 rounded-md">
                                <Check className="w-3.5 h-3.5 stroke-[3]" /> Delivering to this clinic
                              </span>

                              {srv?.loading ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-slate-500">
                                  <Loader2 className="w-3 h-3 animate-spin text-[#006670]" /> Checking courier...
                                </span>
                              ) : srv?.data?.is_serviceable ? (
                                <span className="inline-flex items-center gap-1 font-bold text-[#006670]">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Courier Serviceable
                                </span>
                              ) : srv?.data && !srv.data.is_serviceable ? (
                                <span className="inline-flex items-center gap-1 font-bold text-rose-600">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" /> Non-Serviceable Pincode
                                </span>
                              ) : null}
                            </div>
                          )}

                          {/* Action links */}
                          <div className="flex items-center justify-end gap-3 text-xs font-bold text-slate-500 pt-0.5">
                            {!addr.is_default && (
                              <button
                                type="button"
                                onClick={(e) => handleSetDefaultAddress(addr.id, e)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                              >
                                Set as Default
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditModal(addr, e)}
                              className="inline-flex items-center gap-1 text-[#006670] hover:text-[#004e56] cursor-pointer transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            {addresses.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingAddress(addr);
                                }}
                                className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Address Deliverability Warning Alert */}
              {addressValidationError && (
                <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800 animate-in fade-in duration-200">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-black text-xs uppercase tracking-wide text-rose-900">
                      Address Deliverability Notice
                    </p>
                    <p className="text-xs text-rose-700 mt-0.5">{addressValidationError}</p>
                    <button
                      type="button"
                      onClick={handleOpenAddModal}
                      className="mt-2.5 inline-flex items-center gap-1 text-xs font-black text-[#006670] hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Complete Practice Address
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ============================================================ */}
            {/* STEP 3: PAYMENT METHOD (Razorpay Standard Gateway Card)     */}
            {/* ============================================================ */}
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-left">
              <div className="flex items-center gap-3 pb-3.5 mb-5 border-b border-slate-100">
                <span className="w-7 h-7 rounded-xl bg-[#006670] text-white text-xs font-black flex items-center justify-center shadow-xs">
                  3
                </span>
                <div>
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                    Payment Method
                  </h2>
                  <p className="text-[11px] text-slate-400 font-sans">Choose your preferred payment method on the secure checkout modal</p>
                </div>
              </div>

              {/* Razorpay Gateway Card (Amazon / Flipkart Style) */}
              <div className="p-5 rounded-2xl border-2 border-[#006670] bg-gradient-to-r from-[#F2FAF9] to-white ring-2 ring-[#006670]/10 flex flex-col gap-4 text-left shadow-2xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#006670] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-slate-900">
                          Online Payment via Razorpay
                        </h4>
                        <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-2.5 py-0.5 border border-emerald-300 rounded-full">
                          Instant Confirmation
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-sans mt-1 leading-relaxed">
                        Pay securely using any UPI app (Google Pay, PhonePe, Paytm, BHIM, QR), Credit & Debit Cards, Net Banking, or Bank EMI options.
                      </p>
                    </div>
                  </div>

                  <div className="w-5 h-5 rounded-full border-2 border-[#006670] bg-[#006670] flex items-center justify-center shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                </div>

                {/* Accepted Payment Method Pills */}
                <div className="pt-3.5 border-t border-slate-200/70 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">
                    Accepted:
                  </span>
                  <span className="inline-flex items-center px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 shadow-2xs">
                    UPI (GPay / PhonePe / Paytm / QR)
                  </span>
                  <span className="inline-flex items-center px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 shadow-2xs">
                    Cards (Visa, MasterCard, RuPay)
                  </span>
                  <span className="inline-flex items-center px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 shadow-2xs">
                    Net Banking (50+ Banks)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT COLUMN (4 cols): Sticky Price Details & Place Order   */}
          {/* ============================================================ */}
          <div className="lg:col-span-4 lg:sticky lg:top-[140px] space-y-4 text-left">
            
            {/* Promo Code Card (Myntra Style) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-[#006670]" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Apply Coupons & Offers
                </h3>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="e.g. WELCOMEFAAZO"
                  className="flex-grow border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-slate-50/50 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006670]/20 focus:border-[#006670] transition-all"
                />
                <button
                  type="button"
                  onClick={() => handleApplyCoupon(couponCode)}
                  className="px-5 py-2.5 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
                >
                  Apply
                </button>
              </div>

              {couponError && <p className="text-rose-500 text-[10.5px] font-bold mt-2 ml-1">{couponError}</p>}
              {activeCoupon && (
                <p className="text-emerald-700 text-[11px] font-bold mt-2.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                  <span>Coupon <strong>{activeCoupon.code}</strong> applied! Saved ₹{couponDiscount.toLocaleString('en-IN')}</span>
                </p>
              )}
            </div>

            {/* Price Details Card (Iconic Flipkart / Amazon Style) */}
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  Price Details
                </h3>
                <span className="text-[11px] font-bold text-slate-400">
                  {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>

              {/* Items Preview */}
              <div className="space-y-3 mb-4 max-h-[180px] overflow-y-auto pr-1 border-b border-slate-100 pb-3.5">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3 items-center justify-between text-xs">
                    <div className="flex gap-2.5 items-center max-w-[70%]">
                      <img
                        src={getAbsoluteImageUrl(item.image)}
                        alt={item.name}
                        className="w-10 h-10 object-contain bg-slate-50 p-1 border border-slate-100 rounded-xl shrink-0"
                      />
                      <div className="truncate">
                        <p className="font-bold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400">Qty: {item.qty}</p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-800 shrink-0 font-sans text-xs">
                      ₹{(item.price * item.qty).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Cost Matrix (Flipkart Style) */}
              <div className="space-y-3 font-sans text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Total MRP / Gross Value</span>
                  <span className="font-bold text-slate-800">₹{totalOriginalPriceVal.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between">
                  <span>Discount on MRP</span>
                  <span className="font-bold text-emerald-600">-₹{baseProductDiscountVal.toLocaleString('en-IN')}</span>
                </div>

                {activeCoupon && (
                  <div className="flex justify-between">
                    <span>Coupon Savings ({activeCoupon.code})</span>
                    <span className="font-bold text-emerald-600">-₹{couponDiscountVal.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Estimated GST (18%)</span>
                  <span className="font-semibold text-slate-700">Included in Price</span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="text-emerald-600 font-black">
                    FREE
                  </span>
                </div>

                {/* Total Payable Row */}
                <div className="border-t-2 border-dashed border-slate-200 pt-3.5 mt-2 flex justify-between items-center text-sm font-black text-slate-900">
                  <span className="text-sm uppercase tracking-wide">Total Payable</span>
                  <span className="text-lg text-[#006670] font-sans font-black">
                    ₹{orderTotalVal.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Savings Callout Banner */}
                {overallSavingsVal > 0 && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold text-center">
                    🎉 You will save ₹{overallSavingsVal.toLocaleString('en-IN')} on this order
                  </div>
                )}
              </div>

              {/* Primary Order Placement CTA */}
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isPlacing}
                className="w-full py-4 mt-5 rounded-xl bg-[#006670] hover:bg-[#004e56] text-white text-xs tracking-wider font-black uppercase transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 group"
              >
                {isPlacing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authorizing Payment...</span>
                  </>
                ) : (
                  <>
                    <span>Place Secure Order</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>

            {/* Trust Assurances (Amazon / Myntra Style) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3.5">
              <div className="flex gap-3 items-center text-left">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-slate-800 uppercase">100% Genuine Clinical Supplies</h4>
                  <p className="text-[10px] text-slate-400 font-sans">Brand authentic warranty and direct manufacturer sealed</p>
                </div>
              </div>

              <div className="flex gap-3 items-center text-left">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-slate-800 uppercase">Bank-Grade 256-Bit Security</h4>
                  <p className="text-[10px] text-slate-400 font-sans">PCI-DSS Level 1 payment gateway protection</p>
                </div>
              </div>

              <div className="flex gap-3 items-center text-left">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4 text-[#006670]" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-slate-800 uppercase">Insured Medical Freight</h4>
                  <p className="text-[10px] text-slate-400 font-sans">Full transit insurance with live courier tracking & verification</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: ADD / EDIT PRACTICE ADDRESS                           */}
      {/* ============================================================ */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-7 max-w-xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  {editingAddress ? 'Edit Practice Address' : 'Add New Practice Address'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Enter complete clinic delivery location details for courier dispatch.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setIsAddressModalOpen(false); setModalServerError(null); }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModalAddress} className="space-y-4">
              {/* GROUP 1: Contact Person */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    value={modalForm.full_name}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Dr. Aditya Sharma"
                    className={`border ${
                      modalErrors.full_name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'
                    } px-3 py-2 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670]`}
                  />
                  {modalErrors.full_name && (
                    <span className="text-[10px] text-rose-500 font-semibold">{modalErrors.full_name}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Contact Mobile (10 Digits) *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-bold text-slate-400 select-none">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={modalForm.mobile}
                      onChange={(e) =>
                        setModalForm((prev) => ({ ...prev, mobile: e.target.value.replace(/\D/g, '') }))
                      }
                      placeholder="9876543210"
                      className={`w-full border ${
                        modalErrors.mobile ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'
                      } pl-10 pr-3 py-2 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670]`}
                    />
                  </div>
                  {modalErrors.mobile && (
                    <span className="text-[10px] text-rose-500 font-semibold">{modalErrors.mobile}</span>
                  )}
                </div>
              </div>

              {/* GROUP 2: Practice Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Address Label *
                  </label>
                  <select
                    value={modalForm.label_type}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, label_type: e.target.value }))}
                    className="border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#006670]"
                  >
                    {ADDRESS_LABEL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {modalForm.label_type === 'Other' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Custom Label Name *
                    </label>
                    <input
                      type="text"
                      value={modalForm.custom_label}
                      onChange={(e) => setModalForm((prev) => ({ ...prev, custom_label: e.target.value }))}
                      placeholder="e.g. Research Center"
                      className="border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#006670]"
                    />
                    {modalErrors.custom_label && (
                      <span className="text-[10px] text-rose-500 font-semibold">{modalErrors.custom_label}</span>
                    )}
                  </div>
                )}

                <div className={`flex flex-col gap-1 ${modalForm.label_type === 'Other' ? 'md:col-span-2' : ''}`}>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Clinic / Practice / Hospital Name *
                  </label>
                  <input
                    type="text"
                    value={modalForm.clinic_name}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, clinic_name: e.target.value }))}
                    placeholder="Aesthetic Dental Center"
                    className={`border ${
                      modalErrors.clinic_name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'
                    } px-3 py-2 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670]`}
                  />
                  {modalErrors.clinic_name && (
                    <span className="text-[10px] text-rose-500 font-semibold">{modalErrors.clinic_name}</span>
                  )}
                </div>
              </div>

              {/* GROUP 3: Street & Location */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Street Address / Building / Area / Suite *
                </label>
                <input
                  type="text"
                  value={modalForm.street_address}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, street_address: e.target.value }))}
                  placeholder="Flat 101, Medical Plaza, MG Road"
                  className={`border ${
                    modalErrors.street_address ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'
                  } px-3 py-2 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670]`}
                />
                {modalErrors.street_address && (
                  <span className="text-[10px] text-rose-500 font-semibold">{modalErrors.street_address}</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">City *</label>
                  <input
                    type="text"
                    value={modalForm.city}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="Mumbai"
                    className={`border ${
                      modalErrors.city ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'
                    } px-3 py-2 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670]`}
                  />
                  {modalErrors.city && (
                    <span className="text-[10px] text-rose-500 font-semibold">{modalErrors.city}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    State / UT *
                  </label>
                  <select
                    value={modalForm.state}
                    onChange={(e) => {
                      const st = e.target.value;
                      setModalForm((prev) => ({ ...prev, state: st }));
                      if (modalForm.pincode.length === 6 && !isPincodeMatchingState(modalForm.pincode, st)) {
                        setModalErrors((prev) => ({
                          ...prev,
                          pincode: `Pincode ${modalForm.pincode} does not correspond to ${st}.`,
                        }));
                      } else {
                        setModalErrors((prev) => ({ ...prev, pincode: '', state: '' }));
                      }
                    }}
                    className={`border ${
                      modalErrors.state ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'
                    } px-3 py-2 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670]`}
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  {modalErrors.state && (
                    <span className="text-[10px] text-rose-500 font-semibold">{modalErrors.state}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Pincode (6 Digits) *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={modalForm.pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    placeholder="400001"
                    className={`border ${
                      modalErrors.pincode ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'
                    } px-3 py-2 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670]`}
                  />
                  {modalErrors.pincode && (
                    <span className="text-[10px] text-rose-500 font-semibold">{modalErrors.pincode}</span>
                  )}
                </div>
              </div>

              {/* Live Serviceability Feedback */}
              {modalPincodeStatus.checking ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#006670]" />
                  <span>Checking live courier delivery availability with Shiprocket...</span>
                </div>
              ) : modalPincodeStatus.result ? (
                modalPincodeStatus.result.is_serviceable ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">
                      ✓ Delivery available for PIN code {modalPincodeStatus.result.destination_pincode}
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-semibold">
                      ✕ Courier delivery is currently unavailable for PIN code{' '}
                      {modalPincodeStatus.result.destination_pincode}.
                    </span>
                  </div>
                )
              ) : null}

              {/* Default Checkbox */}
              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={modalForm.is_default}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                    className="w-4 h-4 rounded accent-[#006670] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">Set as my default practice delivery address</span>
                </label>
              </div>

              {/* Server-side error banner — shown inside modal, above buttons */}
              {modalServerError && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                  <span className="shrink-0 mt-0.5">⚠</span>
                  <span>{modalServerError}</span>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setIsAddressModalOpen(false); setModalServerError(null); }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-6 py-2.5 rounded-xl bg-[#006670] hover:bg-[#004e56] text-white text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  {modalSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : editingAddress ? (
                    'Save Changes'
                  ) : (
                    'Save & Select Address'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DELETE ADDRESS CONFIRMATION                           */}
      {/* ============================================================ */}
      {deletingAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 text-left space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase">Remove Practice Address</h4>
                <p className="text-[11px] text-slate-400">Are you sure you want to remove this saved address?</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1 text-slate-700">
              <p className="font-bold text-slate-900">{deletingAddress.full_name}</p>
              <p className="text-slate-600 font-semibold">{deletingAddress.line1}</p>
              <p className="text-slate-500">
                {deletingAddress.city}, {deletingAddress.state} - {deletingAddress.pincode}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAddress(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteAddressConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2"
              >
                {deleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Remove Address
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* FULL-SCREEN PAYMENT PROCESSING OVERLAY (Flipkart/Amazon/Ajio)*/}
      {/* ============================================================ */}
      {paymentProcessing.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-7 md:p-9 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-6 animate-in zoom-in-95 duration-200">
            {/* Header Icon Animation */}
            <div className="flex justify-center">
              {paymentProcessing.stage === 'success' ? (
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center animate-in zoom-in duration-300 ring-8 ring-emerald-50/50">
                  <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                </div>
              ) : paymentProcessing.stage === 'failed' ? (
                <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center animate-in zoom-in duration-300 ring-8 ring-rose-50/50">
                  <XCircle className="w-10 h-10 stroke-[2.5]" />
                </div>
              ) : (
                <div className="relative w-16 h-16 rounded-full bg-[#006670]/10 text-[#006670] flex items-center justify-center ring-8 ring-[#006670]/5">
                  <Lock className="w-7 h-7 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-[#006670] animate-spin" />
                </div>
              )}
            </div>

            {/* Title & Status */}
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                {paymentProcessing.stage === 'success'
                  ? 'Payment Verified & Order Confirmed!'
                  : paymentProcessing.stage === 'failed'
                  ? 'Payment Verification Issue'
                  : 'Authorizing Secure Payment'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                {paymentProcessing.stage === 'success'
                  ? 'Generating official invoice & taking you to your order summary...'
                  : paymentProcessing.stage === 'failed'
                  ? paymentProcessing.errorMessage || 'Unable to confirm payment with bank. Please try again.'
                  : 'Please do not refresh, close this window, or press back.'}
              </p>
            </div>

            {/* Step Progress Indicators */}
            {paymentProcessing.stage !== 'failed' && (
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-4 text-left space-y-3 font-sans">
                {/* Step 1 */}
                <div className="flex items-center gap-3">
                  {paymentProcessing.stage === 'verifying' ? (
                    <Loader2 className="w-4 h-4 text-[#006670] animate-spin shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 text-emerald-600 font-black shrink-0 stroke-[3]" />
                  )}
                  <div className="text-xs">
                    <p
                      className={`font-extrabold ${
                        paymentProcessing.stage === 'verifying' ? 'text-[#006670]' : 'text-slate-800'
                      }`}
                    >
                      1. Bank Signature Verification
                    </p>
                    <p className="text-[10.5px] text-slate-400">Validating 256-bit payment authorization</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-3">
                  {paymentProcessing.stage === 'confirming' ? (
                    <Loader2 className="w-4 h-4 text-[#006670] animate-spin shrink-0" />
                  ) : paymentProcessing.stage === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-600 font-black shrink-0 stroke-[3]" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                  )}
                  <div className="text-xs">
                    <p
                      className={`font-extrabold ${
                        paymentProcessing.stage === 'confirming'
                          ? 'text-[#006670]'
                          : paymentProcessing.stage === 'success'
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      2. Clinical Order & Inventory Reservation
                    </p>
                    <p className="text-[10.5px] text-slate-400">Freezing delivery address & serial allocation</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-center gap-3">
                  {paymentProcessing.stage === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-600 font-black shrink-0 stroke-[3]" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                  )}
                  <div className="text-xs">
                    <p
                      className={`font-extrabold ${
                        paymentProcessing.stage === 'success' ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      3. Order Confirmed
                    </p>
                    <p className="text-[10.5px] text-slate-400">Generating receipt & dispatch schedule</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Actions */}
            {paymentProcessing.stage === 'failed' && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentProcessing({ isOpen: false, stage: 'verifying' })}
                  className="w-full py-3 px-4 rounded-xl bg-[#006670] hover:bg-[#004e56] text-white text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Return to Checkout
                </button>
              </div>
            )}

            {/* Trust Footer */}
            <div className="pt-1 flex items-center justify-center gap-2 text-[10.5px] font-bold text-slate-400">
              <Shield className="w-3.5 h-3.5 text-[#006670]" />
              <span>PCI-DSS Level 1 Certified Secure Checkout</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: RAZORPAY SANDBOX SIMULATION                           */}
      {/* ============================================================ */}
      {process.env.NODE_ENV !== 'production' && showSandboxModal && sandboxOrderData && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100/80 text-center space-y-6 animate-scale-in">
            <div className="flex justify-center">
              <div className="p-3.5 bg-emerald-50 rounded-2xl">
                <Shield className="w-8 h-8 text-[#006670]" />
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-slate-800 tracking-wide uppercase">FAAZO Payment Sandbox</h3>
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
                <span className="font-extrabold text-sm text-[#006670]">
                  ₹{(sandboxOrderData.amount / 100).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-amber-50/60 border border-amber-100 p-3 rounded-xl leading-relaxed text-left">
              <strong>Test Mode Simulation:</strong> To run signature verification without live keys, select "Simulate
              Success". This constructs a secure mock signature matching the backend expected format.
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

export default CheckoutPage;
