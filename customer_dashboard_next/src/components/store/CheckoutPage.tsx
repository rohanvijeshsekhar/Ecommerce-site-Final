'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  Check,
  Truck,
  ArrowLeft,
  ArrowRight,
  Plus,
  AlertCircle,
  Edit3,
  Trash2,
  MapPin,
  LocateFixed,
  Building2,
  User,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Lock,
  Banknote,
  CreditCard,
  QrCode,
  Smartphone,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Sparkles,
  ReceiptText,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usersService, type Address as UserAddress } from '../../lib/services/users';
import { shippingService, type CourierServiceabilityResult } from '../../lib/services/shipping';
import { getAbsoluteImageUrl } from '../../lib/api';
import { paymentService } from '../../lib/services/payment';
import type { CheckoutPreview } from '../../lib/services/cart';
import { INDIAN_STATES, isPincodeMatchingState } from '@/lib/constants/indianStates';
import { detectCurrentLocationAddress, type DetectedAddressResult } from '../../lib/services/locationService';

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
  line1: string; // Clinic / Street
  line2: string; // Landmark / Area
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
  const [isEditingContact, setIsEditingContact] = useState(false);

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

  // Mobile Price Breakdown Bottom Sheet state
  const [showMobilePriceDetails, setShowMobilePriceDetails] = useState(false);

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
    full_name: '',
    mobile: '',
    street_address: '', // line1 (Required)
    landmark: '', // line2 (Optional)
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

  // Location Detection State (GPS + Google Maps Geocoder)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationDetectError, setLocationDetectError] = useState<string | null>(null);
  const [detectedLocationData, setDetectedLocationData] = useState<DetectedAddressResult | null>(null);

  // Delete Address Modal State
  const [deletingAddress, setDeletingAddress] = useState<AddressItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Pincode debouncing timer
  const pincodeDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Promo / Coupons
  const [activeCoupon] = useState<{ code: string; type: 'fixed' | 'percent'; value: number } | null>(null);

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

  // Payment method selection ('razorpay')
  const [paymentMethod] = useState<'razorpay'>('razorpay');

  // Dynamic pricing overrides from backend preview
  const [previewPricing, setPreviewPricing] = useState<CheckoutPreview | null>(null);
  const [addressValidationError, setAddressValidationError] = useState<string | null>(null);

  // --- FETCH ADDRESSES ---
  const fetchAddresses = useCallback(async () => {
    setAddrLoading(true);
    try {
      const res = await usersService.getAddresses();
      if (res.success && res.data) {
        const mapped: AddressItem[] = res.data.map((addr: UserAddress) => ({
          id: addr.id,
          label: addr.label || 'Delivery Address',
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
          const defaultAddr = mapped.find((a) => a.is_default) || mapped[0];
          setSelectedAddressId(defaultAddr.id);
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
  const deliveryFeeVal = previewPricing ? previewPricing.shipping_fee : deliveryFee;
  const totalOriginalPriceVal = previewPricing ? previewPricing.mrp_subtotal : totalOriginalPrice;
  const baseProductDiscountVal = previewPricing
    ? previewPricing.mrp_subtotal - previewPricing.selling_subtotal
    : baseProductDiscount;
  const orderTotalVal = previewPricing
    ? previewPricing.total_amount
    : orderTotal;
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
        const res = await cartService.checkoutPreview(selectedAddressId, 'standard', itemsPayload, paymentMethod);
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
  }, [selectedAddressId, cartItems, checkoutSource, paymentMethod]);

  // --- ADDRESS MODAL HANDLERS ---
  const handleUseCurrentLocation = async () => {
    if (isDetectingLocation) return;
    setIsDetectingLocation(true);
    setLocationDetectError(null);

    try {
      const detected = await detectCurrentLocationAddress();
      setDetectedLocationData(detected);

      // Populate or prefill address modal form, preserving contact details
      setEditingAddress(null);
      setModalForm((prev) => ({
        ...prev,
        full_name: prev.full_name || dentistName || user?.full_name || '',
        mobile: prev.mobile || phone || user?.phone_number || '',
        street_address: detected.street_address || prev.street_address || '',
        landmark: prev.landmark || clinicName || profile?.clinic_name || '',
        city: detected.city || prev.city || '',
        state: detected.state || prev.state || '',
        pincode: detected.pincode || prev.pincode || '',
        is_default: addresses.length === 0,
      }));

      setModalErrors({});
      setModalServerError(null);
      setIsAddressModalOpen(true);

      // Check Shiprocket courier serviceability immediately for the detected pincode
      if (detected.pincode && /^\d{6}$/.test(detected.pincode)) {
        setModalPincodeStatus({ checking: true });
        shippingService.checkServiceability(detected.pincode).then((res) => {
          setModalPincodeStatus({ checking: false, result: res });
        });
      } else {
        setModalPincodeStatus({ checking: false });
      }

      showToast?.('Current location detected successfully! Please verify details.');
    } catch (err: any) {
      const errMsg =
        err?.message || 'Unable to retrieve your current location. Please enter your address manually.';
      setLocationDetectError(errMsg);
      showToast?.(errMsg);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingAddress(null);
    setDetectedLocationData(null);
    setModalForm({
      full_name: dentistName || user?.full_name || '',
      mobile: phone || user?.phone_number || '',
      street_address: '',
      landmark: clinicName || profile?.clinic_name || '',
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
    setDetectedLocationData(null);
    setModalForm({
      full_name: addr.full_name,
      mobile: addr.mobile,
      street_address: addr.line1 || '',
      landmark: addr.line2 || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      is_default: addr.is_default,
    });
    setModalErrors({});
    setModalPincodeStatus({ checking: false });
    setModalServerError(null);
    setIsAddressModalOpen(true);

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
      errors.full_name = 'Please enter name (min 3 characters).';
    }

    const cleanMobile = modalForm.mobile.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      errors.mobile = 'Enter a valid 10-digit Indian mobile number.';
    }

    if (!modalForm.street_address || modalForm.street_address.trim().length < 5) {
      errors.street_address = 'Please enter complete address / clinic location.';
    }

    if (!modalForm.city || modalForm.city.trim().length < 2) {
      errors.city = 'Please enter city.';
    }

    if (!modalForm.state || modalForm.state.trim().length < 2) {
      errors.state = 'Please select a state.';
    }

    if (!/^\d{6}$/.test(modalForm.pincode.trim())) {
      errors.pincode = 'Enter a valid 6-digit Indian PIN code.';
    } else if (modalForm.state && !isPincodeMatchingState(modalForm.pincode.trim(), modalForm.state)) {
      errors.pincode = `Pincode ${modalForm.pincode.trim()} does not match ${modalForm.state}.`;
    }

    setModalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveModalAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateModalForm()) return;

    setModalSaving(true);
    const payload = {
      label: editingAddress?.label || 'Delivery Address',
      full_name: modalForm.full_name.trim(),
      mobile: modalForm.mobile.replace(/\D/g, ''),
      line1: modalForm.street_address.trim(),
      line2: modalForm.landmark ? modalForm.landmark.trim() : '',
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
          showToast?.('Delivery address updated successfully.');
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
          showToast?.('New delivery address saved.');
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
      } else {
        showToast?.(res.message || 'Failed to delete address.');
      }
    } catch (err: any) {
      showToast?.(err?.response?.data?.message || 'Failed to delete address.');
    } finally {
      setDeleteLoading(false);
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
      errs.clinicName = 'Please enter your clinic / practice name.';
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
      setIsEditingContact(true);
      showToast?.('Please complete your contact & practice information.');
      return;
    }
    if (!selectedAddressId) {
      showToast?.('Please select or add a delivery address.');
      return;
    }
    if (addressValidationError) {
      showToast?.(`Cannot proceed: ${addressValidationError}`);
      return;
    }

    // Online Payment via Razorpay
    setIsPlacing(true);

    try {
      const scriptLoaded = await paymentService.loadScript();
      if (!scriptLoaded) {
        showToast?.('Failed to load payment gateway SDK. Please check your network connection.');
        setIsPlacing(false);
        return;
      }

      const itemsPayload =
        cartItems && cartItems.length > 0
          ? cartItems.map((item) => ({ product_id: item.id, quantity: item.qty }))
          : undefined;

      const createRes = await paymentService.createPaymentOrder({
        address_id: selectedAddressId,
        delivery_method: 'standard',
        payment_method: 'razorpay',
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
        description: 'Secure Dental Equipment Checkout',
        order_id: rzOrder.razorpay_order_id,
        handler: async (response: any) => {
          setPaymentProcessing({
            isOpen: true,
            stage: 'verifying',
          });

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
              setPaymentProcessing({
                isOpen: true,
                stage: 'success',
              });

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
            showToast?.('Payment cancelled.');
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
    <div className="w-full bg-[#F1F3F6] min-h-screen pt-24 sm:pt-28 lg:pt-32 pb-24 font-sans select-none text-left">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6">
        
        {/* Top Minimalist Navigation & Stepper Header (Flipkart / Myntra / Amazon Style) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs mb-4 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => {
              if (onBackCheckout) onBackCheckout();
              else setCurrentView('cart');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#006670] transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline font-semibold">{checkoutSource === 'buy-now' ? 'Back to Product' : 'Back to Cart'}</span>
            <span className="sm:hidden font-semibold">Back</span>
          </button>

          {/* Clean Stepper */}
          <div className="flex items-center gap-2 sm:gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-black">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
              <span className="hidden md:inline font-bold">BAG</span>
            </div>

            <div className="w-6 sm:w-10 h-[2px] bg-emerald-600"></div>

            <div className="flex items-center gap-1.5 text-[#006670]">
              <span className="w-5 h-5 rounded-full bg-[#006670] text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                2
              </span>
              <span className="font-bold">ADDRESS</span>
            </div>

            <div className="w-6 sm:w-10 h-[2px] bg-slate-200"></div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                3
              </span>
              <span className="hidden md:inline font-semibold">PAYMENT</span>
            </div>
          </div>

          {/* Secure Reassurance */}
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">100% Secure Checkout</span>
          </div>
        </div>

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
          
          {/* Left Column (8 Cols): Flipkart/Amazon Style Accordion Steps */}
          <div className="lg:col-span-8 space-y-3.5 sm:space-y-4">

            {/* ============================================================ */}
            {/* STEP 1: LOGIN / ACCOUNT INFO (Flipkart Collapsible Style)    */}
            {/* ============================================================ */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Header / Collapsed Summary */}
              <div className="p-4 sm:p-5 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-[#006670] text-white text-xs font-black flex items-center justify-center">
                    1
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        LOGIN / ACCOUNT
                      </h3>
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    </div>
                    {!isEditingContact && (
                      <p className="text-xs font-bold text-slate-800 mt-0.5">
                        {dentistName || 'Registered User'} <span className="font-normal text-slate-500">({phone ? `+91 ${phone}` : email})</span>
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingContact(!isEditingContact)}
                  className="px-3 py-1.5 border border-slate-300 hover:border-[#006670] text-[#006670] rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-teal-50/50 transition-colors cursor-pointer"
                >
                  {isEditingContact ? 'Close' : 'Change'}
                </button>
              </div>

              {/* Editable Form (When expanded) */}
              {isEditingContact && (
                <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 animate-in slide-in-from-top-2 duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Dentist / Contact Name *
                      </label>
                      <input
                        type="text"
                        value={dentistName}
                        onChange={(e) => {
                          setDentistName(e.target.value);
                          if (contactErrors.dentistName) setContactErrors((prev) => ({ ...prev, dentistName: '' }));
                        }}
                        placeholder="Dr. Aditya Sharma"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-[#006670] focus:ring-1 focus:ring-[#006670] focus:outline-none"
                      />
                      {contactErrors.dentistName && (
                        <span className="text-[10px] text-rose-500 font-semibold">{contactErrors.dentistName}</span>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Clinic / Hospital Name *
                      </label>
                      <input
                        type="text"
                        value={clinicName}
                        onChange={(e) => {
                          setClinicName(e.target.value);
                          if (contactErrors.clinicName) setContactErrors((prev) => ({ ...prev, clinicName: '' }));
                        }}
                        placeholder="Aesthetic Dental Clinic"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-[#006670] focus:ring-1 focus:ring-[#006670] focus:outline-none"
                      />
                      {contactErrors.clinicName && (
                        <span className="text-[10px] text-rose-500 font-semibold">{contactErrors.clinicName}</span>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Email Address (For Invoices) *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (contactErrors.email) setContactErrors((prev) => ({ ...prev, email: '' }));
                        }}
                        placeholder="doctor@clinic.com"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-[#006670] focus:ring-1 focus:ring-[#006670] focus:outline-none"
                      />
                      {contactErrors.email && (
                        <span className="text-[10px] text-rose-500 font-semibold">{contactErrors.email}</span>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Mobile Number (Courier SMS) *
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs font-bold text-slate-400 select-none">+91</span>
                        <input
                          type="tel"
                          maxLength={10}
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value.replace(/\D/g, ''));
                            if (contactErrors.phone) setContactErrors((prev) => ({ ...prev, phone: '' }));
                          }}
                          placeholder="9876543210"
                          className="w-full border border-slate-200 rounded-lg pl-11 pr-3 py-2 text-xs font-medium focus:border-[#006670] focus:ring-1 focus:ring-[#006670] focus:outline-none"
                        />
                      </div>
                      {contactErrors.phone && (
                        <span className="text-[10px] text-rose-500 font-semibold">{contactErrors.phone}</span>
                      )}
                    </div>
                  </div>

                  {/* GST Tax Invoice Box */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={gstInvoice}
                        onChange={(e) => setGstInvoice(e.target.checked)}
                        className="w-4 h-4 rounded text-[#006670] accent-[#006670] cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Use GST Invoice (Claim Input Tax Credit)
                      </span>
                    </label>

                    {gstInvoice && (
                      <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg max-w-sm">
                        <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
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
                          className="w-full uppercase border border-slate-200 rounded-md px-3 py-1.5 text-xs font-bold bg-white focus:border-[#006670] focus:outline-none"
                        />
                        {contactErrors.gstNumber && (
                          <span className="text-[10px] text-rose-500 font-semibold">{contactErrors.gstNumber}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (validateContactSection()) {
                          setIsEditingContact(false);
                          showToast?.('Contact details saved.');
                        }
                      }}
                      className="px-5 py-2 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      Save & Continue
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ============================================================ */}
            {/* STEP 2: DELIVERY ADDRESS (Flipkart Style Selector)          */}
            {/* ============================================================ */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Step Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-[#006670] text-white text-xs font-black flex items-center justify-center">
                    2
                  </span>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      DELIVERY ADDRESS
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {addresses.length} saved address{addresses.length === 1 ? '' : 'es'} available
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-[#006670] hover:bg-[#004e56] text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-98 text-center"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Add Address</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isDetectingLocation}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#006670] border border-slate-200 hover:border-[#006670] rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-98 disabled:opacity-60 text-center"
                    title="Detect location via GPS"
                  >
                    {isDetectingLocation ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#006670] shrink-0" />
                    ) : (
                      <LocateFixed className="w-3.5 h-3.5 text-[#006670] shrink-0" />
                    )}
                    <span className="truncate">{isDetectingLocation ? 'Locating...' : 'Current Location'}</span>
                  </button>
                </div>
              </div>

              {/* Geolocation Detection Error Banner */}
              {locationDetectError && (
                <div className="m-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-amber-900 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{locationDetectError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocationDetectError(null)}
                    className="text-amber-500 hover:text-amber-800 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Saved Address Cards */}
              <div className="p-4 sm:p-5">
                {addrLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin text-[#006670]" />
                    <span className="text-xs font-medium">Loading saved addresses...</span>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="py-8 px-4 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                    <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-xs font-bold text-slate-700">No Saved Delivery Addresses</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Please add your clinic or practice address to proceed.
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#006670] text-white text-xs font-bold rounded-lg shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Address
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((addr) => {
                      const isSelected = addr.id === selectedAddressId;
                      const srv = serviceabilityMap[addr.id];

                      return (
                        <div
                          key={addr.id}
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={`rounded-xl p-4 border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#006670] bg-[#F2FAF9]/40 ring-1 ring-[#006670]/40 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              {/* Radio indicator */}
                              <div
                                className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected ? 'border-[#006670] bg-[#006670]' : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-900">{addr.full_name}</span>
                                  <span className="text-xs font-semibold text-slate-600">+91 {addr.mobile}</span>
                                  {addr.is_default && (
                                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                      DEFAULT
                                    </span>
                                  )}
                                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-teal-50 text-[#006670] border border-[#006670]/20">
                                    {addr.label || 'CLINIC'}
                                  </span>
                                </div>

                                <p className="text-xs text-slate-600 font-normal mt-1 leading-relaxed">
                                  {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} -{' '}
                                  <strong className="text-slate-800 font-semibold">{addr.pincode}</strong>
                                </p>

                                {/* Serviceability Info */}
                                {isSelected && (
                                  <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[11px]">
                                    {srv?.loading ? (
                                      <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                                        <Loader2 className="w-3 h-3 animate-spin text-[#006670]" /> Checking delivery availability...
                                      </span>
                                    ) : srv?.data?.is_serviceable ? (
                                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Free Courier Service Available
                                      </span>
                                    ) : srv?.data && !srv.data.is_serviceable ? (
                                      <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded">
                                        <XCircle className="w-3 h-3 text-rose-600" /> Courier not serviceable to this PIN
                                      </span>
                                    ) : null}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions on right */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleOpenEditModal(addr, e)}
                                className="text-xs font-bold text-[#006670] hover:underline cursor-pointer p-1"
                              >
                                EDIT
                              </button>
                              {addresses.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingAddress(addr);
                                  }}
                                  className="text-xs font-medium text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                                >
                                  REMOVE
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Selected Deliver Here Banner */}
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                              <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> Selected for delivery
                              </span>
                              {!addr.is_default && (
                                <button
                                  type="button"
                                  onClick={(e) => handleSetDefaultAddress(addr.id, e)}
                                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                                >
                                  Set as default address
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Validation Notice */}
                {addressValidationError && (
                  <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-900">Address Deliverability Notice</p>
                      <p className="text-rose-700 mt-0.5">{addressValidationError}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ============================================================ */}
            {/* STEP 3: ORDER SUMMARY (Flipkart / Amazon Product Items)     */}
            {/* ============================================================ */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-[#006670] text-white text-xs font-black flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      ORDER SUMMARY
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {cartItems.length} item{cartItems.length === 1 ? '' : 's'} in your order
                    </p>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-100">
                {cartItems.map((item) => {
                  const origPrice = item.originalPrice || Math.round(item.price * 1.25);
                  const discountPct = Math.round(((origPrice - item.price) / origPrice) * 100);

                  return (
                    <div key={item.id} className="p-4 sm:p-5 flex gap-3 sm:gap-4 items-start">
                      <img
                        src={getAbsoluteImageUrl(item.image)}
                        alt={item.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain bg-slate-50 border border-slate-100 rounded-lg p-1 shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                          {item.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Category: {item.category}</p>

                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-sm sm:text-base font-bold text-slate-900">
                            ₹{(item.price * item.qty).toLocaleString('en-IN')}
                          </span>
                          {origPrice > item.price && (
                            <>
                              <span className="text-xs text-slate-400 line-through">
                                ₹{(origPrice * item.qty).toLocaleString('en-IN')}
                              </span>
                              <span className="text-xs font-bold text-emerald-600">
                                {discountPct}% off
                              </span>
                            </>
                          )}
                          <span className="text-xs font-bold text-slate-500 ml-1">
                            (Qty: {item.qty})
                          </span>
                        </div>

                        {/* Delivery Promise Snippet */}
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          <Truck className="w-3.5 h-3.5 text-[#006670]" />
                          <span>Delivery in 2-4 business days | <strong className="text-emerald-700 font-bold">FREE Delivery</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order summary confirmation footer */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Order confirmation email will be sent to <strong className="text-slate-800 font-semibold">{email || 'your email'}</strong></span>
                </span>
              </div>
            </div>

            {/* ============================================================ */}
            {/* STEP 4: PAYMENT OPTIONS (Flipkart / Amazon / Myntra Style)  */}
            {/* ============================================================ */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-[#006670] text-white text-xs font-black flex items-center justify-center">
                    4
                  </span>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      PAYMENT OPTIONS
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Choose your preferred payment method
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                  <Lock className="w-3 h-3" />
                  <span>256-Bit SSL Encrypted</span>
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-3">
                {/* Online Payment (UPI / Cards / Net Banking / Wallets) */}
                <div
                  className="rounded-xl p-4 border border-[#006670] bg-[#F2FAF9]/40 ring-1 ring-[#006670]/40 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-4 h-4 rounded-full border border-[#006670] bg-[#006670] mt-1 flex items-center justify-center shrink-0 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            UPI / Credit & Debit Card / Net Banking (Razorpay)
                          </h4>
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            100% SECURE PAYMENT
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-1">
                          Google Pay, PhonePe, Paytm, BHIM, QR, Visa, Mastercard, RuPay & 50+ Net Banking options.
                        </p>

                        {/* Payment Mode Badges */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px] font-semibold text-slate-600">
                          <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs">
                            <Smartphone className="w-3.5 h-3.5 text-[#006670]" /> UPI Apps (Instant)
                          </span>
                          <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs">
                            <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Cards & EMI
                          </span>
                          <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs">
                            <Building2 className="w-3.5 h-3.5 text-slate-600" /> Net Banking
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={handlePlaceOrder}
                      disabled={isPlacing}
                      className="w-full sm:w-auto px-8 py-3 bg-[#006670] hover:bg-[#004e56] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isPlacing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Opening Gateway...</span>
                        </>
                      ) : (
                        <>
                          <span>PAY ₹{orderTotalVal.toLocaleString('en-IN')} & PLACE ORDER</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ============================================================ */}
          {/* RIGHT COLUMN (4 Cols): Iconic Flipkart / Myntra Price Summary*/}
          {/* ============================================================ */}
          <div className="lg:col-span-4 lg:sticky lg:top-[120px] space-y-3.5 text-left">
            
            {/* Price Details Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-3 mb-3.5">
                PRICE DETAILS
              </h3>

              <div className="space-y-3 text-xs text-slate-600 font-sans">
                <div className="flex justify-between">
                  <span>Price ({cartItems.length} item{cartItems.length === 1 ? '' : 's'})</span>
                  <span className="font-semibold text-slate-800">₹{totalOriginalPriceVal.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between">
                  <span>Discount</span>
                  <span className="font-bold text-emerald-600">-₹{baseProductDiscountVal.toLocaleString('en-IN')}</span>
                </div>

                {activeCoupon && (
                  <div className="flex justify-between">
                    <span>Coupon Discount</span>
                    <span className="font-bold text-emerald-600">-₹{couponDiscountVal.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="text-emerald-600 font-bold">
                    FREE
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>GST (18%)</span>
                  <span className="text-slate-600 font-medium">Included in Price</span>
                </div>

                {/* Total Row */}
                <div className="border-t border-dashed border-slate-200 pt-3 mt-2 flex justify-between items-center text-sm font-bold text-slate-900">
                  <span className="text-sm">Total Amount</span>
                  <span className="text-base text-[#006670] font-black">
                    ₹{orderTotalVal.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Savings Callout */}
                {overallSavingsVal > 0 && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold text-left border border-emerald-200/60 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>You will save ₹{overallSavingsVal.toLocaleString('en-IN')} on this order</span>
                  </div>
                )}
              </div>

              {/* Main Sticky Place Order CTA */}
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isPlacing}
                className="w-full py-3.5 mt-4 rounded-lg bg-[#006670] hover:bg-[#004e56] disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md hover:shadow cursor-pointer flex items-center justify-center gap-2"
              >
                {isPlacing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <span>Place Order & Pay</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Trust Assurances (Flipkart / Amazon style) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3 text-left">
              <div className="flex items-center gap-2.5 text-slate-600 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Safe and Secure Payments. Easy returns.</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 text-xs">
                <Truck className="w-4 h-4 text-[#006670] shrink-0" />
                <span>Fast Dispatched with Transit Insurance.</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 text-xs">
                <PackageCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>100% Authentic Brand Dental Supplies.</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MOBILE BOTTOM STICKY BAR (Flipkart/Meesho style)            */}
      {/* ============================================================ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/90 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3 pb-safe">
        <div className="text-left">
          <div className="flex items-center gap-1">
            <span className="text-base font-black text-[#006670] leading-tight">₹{orderTotalVal.toLocaleString('en-IN')}</span>
            {overallSavingsVal > 0 && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                Save ₹{overallSavingsVal.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowMobilePriceDetails(true)}
            className="text-[11px] font-bold text-[#006670] hover:underline flex items-center gap-0.5 mt-0.5 cursor-pointer"
          >
            <span>View Price Details</span>
            <ChevronUp className="w-3.5 h-3.5 text-[#006670]" />
          </button>
        </div>

        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={isPlacing}
          className="px-6 py-3 rounded-xl bg-[#006670] hover:bg-[#004e56] text-white text-xs font-black uppercase tracking-wider shadow-md active:scale-98 cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          {isPlacing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Placing Order...</span>
            </>
          ) : (
            <>
              <span>Proceed to Pay</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* ============================================================ */}
      {/* MOBILE PRICE DETAILS BOTTOM SHEET (Flipkart/Amazon style)    */}
      {/* ============================================================ */}
      {showMobilePriceDetails && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl p-5 w-full max-h-[85vh] overflow-y-auto shadow-2xl border-t border-slate-100 animate-in slide-in-from-bottom duration-200 text-left space-y-4">
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-2"></div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Price Details
                </h3>
                <p className="text-[11px] text-slate-400">
                  {cartItems.length} Item{cartItems.length === 1 ? '' : 's'} in Order
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowMobilePriceDetails(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Price Matrix */}
            <div className="space-y-2.5 text-xs text-slate-600 font-sans">
              <div className="flex justify-between">
                <span>Total MRP</span>
                <span className="font-semibold text-slate-800">₹{totalOriginalPriceVal.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between">
                <span>Discount on MRP</span>
                <span className="font-bold text-emerald-600">-₹{baseProductDiscountVal.toLocaleString('en-IN')}</span>
              </div>

              {activeCoupon && (
                <div className="flex justify-between">
                  <span>Coupon Savings</span>
                  <span className="font-bold text-emerald-600">-₹{couponDiscountVal.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span className="text-emerald-600 font-bold">FREE</span>
              </div>

              <div className="flex justify-between">
                <span>GST (18%)</span>
                <span className="text-slate-600 font-medium">Included in Price</span>
              </div>

              {/* Total Payable Row */}
              <div className="border-t border-dashed border-slate-200 pt-3 mt-1.5 flex justify-between items-center text-sm font-bold text-slate-900">
                <span>Total Payable</span>
                <span className="text-lg text-[#006670] font-black">
                  ₹{orderTotalVal.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Savings Banner */}
              {overallSavingsVal > 0 && (
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold text-center border border-emerald-200/60 flex items-center justify-center gap-1.5 mt-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>You will save ₹{overallSavingsVal.toLocaleString('en-IN')} on this order</span>
                </div>
              )}
            </div>

            {/* Action CTA inside sheet */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowMobilePriceDetails(false);
                  handlePlaceOrder();
                }}
                disabled={isPlacing}
                className="w-full py-3.5 rounded-xl bg-[#006670] hover:bg-[#004e56] text-white text-xs font-black uppercase tracking-wider shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPlacing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Placing Order...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Order (₹{orderTotalVal.toLocaleString('en-IN')})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADD / EDIT DELIVERY ADDRESS                           */}
      {/* ============================================================ */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingAddress ? 'Edit Delivery Address' : 'Add Delivery Address'}
                </h3>
                <p className="text-xs text-slate-500">
                  Enter complete delivery address for courier dispatch.
                </p>
              </div>

              <button
                type="button"
                onClick={() => { setIsAddressModalOpen(false); setModalServerError(null); }}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* GPS Location Auto-fill Notification */}
            {detectedLocationData && (
              <div className="mb-4 p-3 bg-teal-50/70 border border-teal-200/80 rounded-lg flex items-start gap-2 text-xs text-slate-700">
                <LocateFixed className="w-4 h-4 text-[#006670] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#006670]">GPS Location Auto-filled: </span>
                  <span>{detectedLocationData.formatted_address}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveModalAddress} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    value={modalForm.full_name}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Dr. Aditya Sharma"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-[#006670] focus:outline-none"
                  />
                  {modalErrors.full_name && (
                    <span className="text-[10px] text-rose-500 font-semibold">{modalErrors.full_name}</span>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    10-Digit Mobile *
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
                      className="w-full border border-slate-200 rounded-lg pl-11 pr-3 py-2 text-xs font-medium focus:border-[#006670] focus:outline-none"
                    />
                  </div>
                  {modalErrors.mobile && (
                    <span className="text-[10px] text-rose-500 font-semibold">{modalErrors.mobile}</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Street Address / Clinic Location *
                </label>
                <input
                  type="text"
                  value={modalForm.street_address}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, street_address: e.target.value }))}
                  placeholder="Flat / Room No., Building Name, Street"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-[#006670] focus:outline-none"
                />
                {modalErrors.street_address && (
                  <span className="text-[10px] text-rose-500 font-semibold">{modalErrors.street_address}</span>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Landmark / Clinic Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={modalForm.landmark}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, landmark: e.target.value }))}
                  placeholder="Near Metro Station or Opposite Hospital"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-[#006670] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">City *</label>
                  <input
                    type="text"
                    value={modalForm.city}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="Mumbai"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-[#006670] focus:outline-none"
                  />
                  {modalErrors.city && (
                    <span className="text-[10px] text-rose-500 font-semibold">{modalErrors.city}</span>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">State *</label>
                  <select
                    value={modalForm.state}
                    onChange={(e) => {
                      const st = e.target.value;
                      setModalForm((prev) => ({ ...prev, state: st }));
                      if (modalForm.pincode.length === 6 && !isPincodeMatchingState(modalForm.pincode, st)) {
                        setModalErrors((prev) => ({
                          ...prev,
                          pincode: `Pincode does not correspond to ${st}.`,
                        }));
                      } else {
                        setModalErrors((prev) => ({ ...prev, pincode: '', state: '' }));
                      }
                    }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-[#006670] focus:outline-none bg-white cursor-pointer"
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

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Pincode *</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={modalForm.pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    placeholder="400001"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-[#006670] focus:outline-none"
                  />
                  {modalErrors.pincode && (
                    <span className="text-[10px] text-rose-500 font-semibold">{modalErrors.pincode}</span>
                  )}
                </div>
              </div>

              {/* Serviceability check feedback */}
              {modalPincodeStatus.checking ? (
                <div className="p-2.5 bg-slate-50 rounded-lg flex items-center gap-2 text-xs text-slate-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#006670]" />
                  <span>Checking courier serviceability...</span>
                </div>
              ) : modalPincodeStatus.result ? (
                modalPincodeStatus.result.is_serviceable ? (
                  <div className="p-2.5 bg-emerald-50 rounded-lg flex items-center gap-2 text-xs text-emerald-800 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Courier service available for PIN code {modalPincodeStatus.result.destination_pincode}</span>
                  </div>
                ) : (
                  <div className="p-2.5 bg-rose-50 rounded-lg flex items-center gap-2 text-xs text-rose-800 font-medium">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Courier delivery unavailable for PIN code {modalPincodeStatus.result.destination_pincode}</span>
                  </div>
                )
              ) : null}

              {/* Default checkbox */}
              <div>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={modalForm.is_default}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                    className="w-4 h-4 rounded text-[#006670] accent-[#006670] cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    Set as default delivery address
                  </span>
                </label>
              </div>

              {modalServerError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                  {modalServerError}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setIsAddressModalOpen(false); setModalServerError(null); }}
                  className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-5 py-2 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-60"
                >
                  {modalSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save & Select</span>
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
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-100 text-left space-y-3">
            <div className="flex items-center gap-2.5 text-rose-600">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <h4 className="text-sm font-bold text-slate-900">Remove Address</h4>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to remove <strong className="text-slate-900">{deletingAddress.full_name}</strong>&#39;s address?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAddress(null)}
                className="px-3 py-1.5 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteAddressConfirm}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
              >
                {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Remove</span>
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
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-center">
              {paymentProcessing.stage === 'success' ? (
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center animate-in zoom-in ring-8 ring-emerald-50/50">
                  <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                </div>
              ) : paymentProcessing.stage === 'failed' ? (
                <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center animate-in zoom-in ring-8 ring-rose-50/50">
                  <XCircle className="w-8 h-8 stroke-[2.5]" />
                </div>
              ) : (
                <div className="relative w-14 h-14 rounded-full bg-[#006670]/10 text-[#006670] flex items-center justify-center ring-8 ring-[#006670]/5">
                  <Lock className="w-6 h-6 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-[#006670] animate-spin" />
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                {paymentProcessing.stage === 'success'
                  ? 'Order Confirmed!'
                  : paymentProcessing.stage === 'failed'
                  ? 'Payment Incomplete'
                  : 'Processing Your Order'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {paymentProcessing.stage === 'success'
                  ? 'Redirecting to your order confirmation...'
                  : paymentProcessing.stage === 'failed'
                  ? paymentProcessing.errorMessage || 'Unable to place order. Please try again.'
                  : 'Please do not refresh or press back.'}
              </p>
            </div>

            {paymentProcessing.stage !== 'failed' && (
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 text-left space-y-2.5 font-sans">
                <div className="flex items-center gap-2.5">
                  {paymentProcessing.stage === 'verifying' ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#006670] animate-spin shrink-0" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-emerald-600 font-bold shrink-0 stroke-[3]" />
                  )}
                  <span className="text-xs font-semibold text-slate-700">1. Payment Authorization</span>
                </div>

                <div className="flex items-center gap-2.5">
                  {paymentProcessing.stage === 'confirming' ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#006670] animate-spin shrink-0" />
                  ) : paymentProcessing.stage === 'success' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 font-bold shrink-0 stroke-[3]" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-slate-700">2. Inventory Allocation & Dispatch</span>
                </div>

                <div className="flex items-center gap-2.5">
                  {paymentProcessing.stage === 'success' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 font-bold shrink-0 stroke-[3]" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-slate-700">3. Order Confirmed</span>
                </div>
              </div>
            )}

            {paymentProcessing.stage === 'failed' && (
              <button
                type="button"
                onClick={() => setPaymentProcessing({ isOpen: false, stage: 'verifying' })}
                className="w-full py-2.5 rounded-lg bg-[#006670] text-white text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: RAZORPAY SANDBOX SIMULATION                           */}
      {/* ============================================================ */}
      {process.env.NODE_ENV !== 'production' && showSandboxModal && sandboxOrderData && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <Shield className="w-7 h-7 text-[#006670]" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase">Payment Simulation Mode</h3>
              <p className="text-xs text-slate-400 mt-0.5">Developer sandbox simulation for testing checkout</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-left text-xs space-y-1.5 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Order ID</span>
                <span className="font-mono font-bold text-slate-700">{sandboxOrderData.razorpay_order_id}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/60 pt-1.5">
                <span className="text-slate-500 font-bold">Total Amount</span>
                <span className="font-bold text-sm text-[#006670]">
                  ₹{(sandboxOrderData.amount / 100).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
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
                className="py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase transition-all shadow-xs cursor-pointer"
              >
                Simulate Success
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSandboxModal(false);
                  sandboxOrderData.ondismiss();
                }}
                className="py-2.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase transition-all shadow-xs cursor-pointer"
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
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
