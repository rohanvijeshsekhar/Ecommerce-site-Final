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
  ChevronRight,
  Tag,
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

type CheckoutStep = 'address' | 'payment' | 'review';

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

  // --- CHECKOUT STEP PROGRESSION ---
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address');

  // Location Detection State (GPS + Google Maps Geocoder)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationDetectError, setLocationDetectError] = useState<string | null>(null);
  const [detectedLocationData, setDetectedLocationData] = useState<DetectedAddressResult | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Delete Address Modal State
  const [deletingAddress, setDeletingAddress] = useState<AddressItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Pincode debouncing timer
  const pincodeDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Promo / Coupons
  const [activeCoupon, setActiveCoupon] = useState<{ code: string; type: 'fixed' | 'percent'; value: number } | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isCouponDrawerOpen, setIsCouponDrawerOpen] = useState(false);

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

  // Selected Payment Method ('razorpay' | 'cod')
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');

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

    // Cash on Delivery (COD) order placement
    if (paymentMethod === 'cod') {
      setIsPlacing(true);
      try {
        const { cartService } = await import('../../lib/services/cart');
        const itemsPayload =
          cartItems && cartItems.length > 0
            ? cartItems.map((item) => ({ product_id: item.id, quantity: item.qty }))
            : undefined;

        const res = await cartService.placeOrder(
          selectedAddressId,
          'standard',
          'cod',
          gstInvoice ? gstNumber.trim().toUpperCase() : undefined,
          itemsPayload
        );

        if (res.success && res.data) {
          onPlaceOrderSuccess(res.data);
        } else {
          showToast?.(res.message || 'Failed to place COD order.');
        }
      } catch (err: any) {
        const errMsg =
          err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          'Failed to place Cash on Delivery order.';
        showToast?.(errMsg);
      } finally {
        setIsPlacing(false);
      }
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

  // Coupon Apply Handler
  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    const code = couponInput.trim().toUpperCase();
    if (code === 'WELCOME10' || code === 'FAAZO10' || code === 'DENTAL10') {
      setActiveCoupon({ code, type: 'percent', value: 10 });
      setCouponError(null);
      showToast?.(`Coupon '${code}' applied!`);
    } else if (code === 'SAVE500') {
      setActiveCoupon({ code, type: 'fixed', value: 500 });
      setCouponError(null);
      showToast?.(`Coupon '${code}' applied!`);
    } else {
      setCouponError('Invalid coupon code. Try WELCOME10 or SAVE500');
    }
  };

  const selectedServ = selectedAddressId ? serviceabilityMap[selectedAddressId]?.data : undefined;

  return (
    <div className="w-full bg-[#F2FBFB]/60 min-h-screen pt-[116px] sm:pt-[132px] lg:pt-[152px] pb-28 font-sans select-none text-left">
      <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8">
        
        {/* ========================================================================= */}
        {/* TOP BRAND & STEP PROGRESS HEADER (Screen 1, 2, 3 Reference Design)        */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs mb-5 p-4 sm:p-5">
          {/* Top Brand Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <button
              onClick={() => {
                if (currentStep === 'payment') {
                  setCurrentStep('address');
                } else if (currentStep === 'review') {
                  setCurrentStep('payment');
                } else {
                  if (onBackCheckout) onBackCheckout();
                  else setCurrentView('cart');
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#005F63] transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline font-semibold">
                {currentStep === 'address' ? (checkoutSource === 'buy-now' ? 'Back to Product' : 'Back to Cart') : 'Back'}
              </span>
              <span className="sm:hidden font-semibold">Back</span>
            </button>

            {/* Secure Badge */}
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
              <Lock className="w-3.5 h-3.5 text-[#005F63]" />
              <span className="hidden sm:inline">Secure Checkout</span>
            </div>
          </div>

          {/* Stepper Progress Bar (Address -> Payment -> Review) */}
          <div className="pt-3.5 flex items-center justify-center max-w-sm mx-auto">
            {/* Step 1: Address */}
            <button
              type="button"
              onClick={() => setCurrentStep('address')}
              className="flex items-center gap-1.5 group cursor-pointer"
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all ${
                  currentStep === 'address'
                    ? 'bg-[#005F63] text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {currentStep === 'payment' || currentStep === 'review' ? (
                  <Check className="w-3 h-3 stroke-[2.5]" />
                ) : (
                  '1'
                )}
              </div>
              <span
                className={`text-[11px] font-medium transition-colors ${
                  currentStep === 'address' ? 'text-[#005F63] font-semibold' : 'text-slate-600'
                }`}
              >
                Address
              </span>
            </button>

            {/* Line 1 */}
            <div
              className={`flex-1 h-px mx-2 sm:mx-3 transition-colors ${
                currentStep === 'payment' || currentStep === 'review' ? 'bg-[#005F63]' : 'bg-slate-200'
              }`}
            />

            {/* Step 2: Payment */}
            <button
              type="button"
              onClick={() => {
                if (selectedAddressId) setCurrentStep('payment');
                else showToast?.('Please select a delivery address first.');
              }}
              className="flex items-center gap-1.5 group cursor-pointer"
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all ${
                  currentStep === 'payment'
                    ? 'bg-[#005F63] text-white'
                    : currentStep === 'review'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {currentStep === 'review' ? (
                  <Check className="w-3 h-3 stroke-[2.5]" />
                ) : (
                  '2'
                )}
              </div>
              <span
                className={`text-[11px] font-medium transition-colors ${
                  currentStep === 'payment' ? 'text-[#005F63] font-semibold' : 'text-slate-500'
                }`}
              >
                Payment
              </span>
            </button>

            {/* Line 2 */}
            <div
              className={`flex-1 h-px mx-2 sm:mx-3 transition-colors ${
                currentStep === 'review' ? 'bg-[#005F63]' : 'bg-slate-200'
              }`}
            />

            {/* Step 3: Review */}
            <button
              type="button"
              onClick={() => {
                if (selectedAddressId) setCurrentStep('review');
                else showToast?.('Please select a delivery address first.');
              }}
              className="flex items-center gap-1.5 group cursor-pointer"
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all ${
                  currentStep === 'review'
                    ? 'bg-[#005F63] text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                3
              </div>
              <span
                className={`text-[11px] font-medium transition-colors ${
                  currentStep === 'review' ? 'text-[#005F63] font-semibold' : 'text-slate-400'
                }`}
              >
                Review
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN CHECKOUT CONTENT AREA (Mobile Vertical + Desktop 2-Column Responsive) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column / Mobile Primary Flow */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* ===================================================================== */}
            {/* STEP 1: DELIVERY ADDRESS (Screen 1 Reference Design)                  */}
            {/* ===================================================================== */}
            {currentStep === 'address' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Section Title Header */}
                <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs">
                  <div className="mb-4">
                    <h2 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">Delivery Address</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Where should we deliver your order?</p>
                  </div>

                  {/* Saved Addresses List */}
                  <div className="space-y-3">
                    {addrLoading ? (
                      <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#005F63]" />
                        <span className="text-xs font-medium">Loading saved addresses...</span>
                      </div>
                    ) : addresses.length === 0 ? (
                      <div className="py-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 p-5">
                        <MapPin className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-700">No saved addresses found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Add an address below to proceed with checkout</p>
                      </div>
                    ) : (
                      addresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        const serv = serviceabilityMap[addr.id]?.data;

                        return (
                          <div
                            key={addr.id}
                            onClick={() => {
                              setSelectedAddressId(addr.id);
                              if (addressValidationError) setAddressValidationError(null);
                            }}
                            className={`relative p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#005F63] bg-[#005F63]/[0.03] ring-1 ring-[#005F63]'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Custom Radio Button */}
                              <div className="mt-0.5 shrink-0">
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                    isSelected
                                      ? 'border-[#005F63] bg-[#005F63]'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                              </div>

                              {/* Address Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs sm:text-sm font-semibold text-slate-800 capitalize">
                                      {addr.label || 'Home'}
                                    </span>
                                    {addr.is_default && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#005F63]/10 text-[#005F63]">
                                        Default
                                      </span>
                                    )}
                                  </div>

                                  {/* Edit / Delete Actions */}
                                  <div className="flex items-center gap-2.5">
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenEditModal(addr, e)}
                                      className="text-xs font-medium text-[#005F63] hover:underline cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingAddress(addr);
                                        handleDeleteAddressConfirm();
                                      }}
                                      className="text-xs text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Recipient Name */}
                                <p className="text-xs font-semibold text-slate-700 mt-1">
                                  {addr.full_name || dentistName || user?.full_name || 'Customer'}
                                </p>

                                {/* Address Text */}
                                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                                  {addr.line1}
                                  {addr.line2 ? `, ${addr.line2}` : ''}, {addr.city},{' '}
                                  {addr.state} - <span className="font-semibold">{addr.pincode}</span>
                                </p>

                                {/* Phone */}
                                <p className="text-[11px] text-slate-500 mt-1">
                                  +91 {addr.mobile || phone}
                                </p>

                                {/* Serviceability Alert */}
                                {serv && !serv.is_serviceable && (
                                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-medium">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Pincode {addr.pincode} currently unserviceable</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {addressValidationError && (
                    <div className="mt-3.5 p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-2 text-xs font-semibold text-rose-600">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{addressValidationError}</span>
                    </div>
                  )}

                  {/* Action Cards: Current Location & Add Address */}
                  <div className="mt-4 space-y-2.5 pt-3 border-t border-slate-100">
                    {/* Use My Current Location Card (Screen 1 & 5) */}
                    <button
                      type="button"
                      onClick={() => {
                        handleUseCurrentLocation();
                        setIsLocationModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-teal-50/30 hover:border-[#005F63]/40 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#F2FBFB] text-[#005F63] flex items-center justify-center">
                          {isDetectingLocation ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <LocateFixed className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 group-hover:text-[#005F63] transition-colors">
                            Use my current location
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {locationDetectError || 'Detect my current address'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#005F63] group-hover:translate-x-0.5 transition-all" />
                    </button>

                    {/* Add New Address Card */}
                    <div className="mt-3.5 pt-3.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="w-full py-2.5 sm:py-3 rounded-xl border border-dashed border-slate-300 hover:border-[#005F63] bg-slate-50/50 hover:bg-[#F2FBFB]/40 text-slate-700 hover:text-[#005F63] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New Address</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile Continue CTA Button */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
                  <div className="hidden sm:block">
                    <span className="text-[11px] text-slate-400 block">Selected Address</span>
                    <span className="text-xs font-semibold text-slate-800">
                      {selectedAddress ? `${selectedAddress.label || 'Saved'} (${selectedAddress.pincode})` : 'None selected'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedAddressId) {
                        setAddressValidationError('Please select or add a delivery address to continue.');
                        showToast?.('Please select a delivery address.');
                        return;
                      }
                      if (selectedServ && !selectedServ.is_serviceable) {
                        setAddressValidationError('The selected address is not serviceable for delivery.');
                        return;
                      }
                      setAddressValidationError(null);
                      setCurrentStep('payment');
                    }}
                    className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#005F63] hover:bg-[#0B7C80] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* STEP 2: PAYMENT METHOD                                                */}
            {/* ===================================================================== */}
            {currentStep === 'payment' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs">
                  <div className="mb-4">
                    <h2 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">Payment Method</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Select how you would like to complete your order</p>
                  </div>

                  {/* Payment Options (Minimal & Classy) */}
                  <div className="space-y-2.5">
                    {/* Option 1: Pay Online */}
                    <div
                      onClick={() => setPaymentMethod('razorpay')}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                        paymentMethod === 'razorpay'
                          ? 'border-[#005F63] bg-[#005F63]/[0.03] ring-1 ring-[#005F63]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Radio */}
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                            paymentMethod === 'razorpay'
                              ? 'border-[#005F63] bg-[#005F63]'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {paymentMethod === 'razorpay' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>

                        {/* Text */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-semibold text-slate-900">Pay Online</span>
                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              Recommended
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Secure payment via Razorpay (UPI, Cards, Net Banking)
                          </p>
                        </div>
                      </div>

                      <CreditCard className={`w-4 h-4 shrink-0 transition-colors ${paymentMethod === 'razorpay' ? 'text-[#005F63]' : 'text-slate-400'}`} />
                    </div>

                    {/* Option 2: Cash on Delivery */}
                    <div
                      onClick={() => setPaymentMethod('cod')}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                        paymentMethod === 'cod'
                          ? 'border-[#005F63] bg-[#005F63]/[0.03] ring-1 ring-[#005F63]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Radio */}
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                            paymentMethod === 'cod'
                              ? 'border-[#005F63] bg-[#005F63]'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {paymentMethod === 'cod' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>

                        {/* Text */}
                        <div>
                          <span className="text-xs sm:text-sm font-semibold text-slate-900">Cash on Delivery</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Pay when you receive
                          </p>
                        </div>
                      </div>

                      <Banknote className={`w-4 h-4 shrink-0 transition-colors ${paymentMethod === 'cod' ? 'text-[#005F63]' : 'text-slate-400'}`} />
                    </div>
                  </div>

                  {/* Subtle Minimal Trust Line */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                    <span>100% Encrypted & Safe Payments with Razorpay</span>
                  </div>
                </div>

                {/* Bottom Review Order CTA */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('address')}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    ← Change Address
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep('review')}
                    className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#005F63] hover:bg-[#0B7C80] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                  >
                    <span>Review Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* STEP 3: REVIEW YOUR ORDER                                             */}
            {/* ===================================================================== */}
            {currentStep === 'review' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">Review Your Order</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Please check your details before placing the order</p>
                  </div>

                  {/* 1. Selected Delivery Address Summary Box */}
                  <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#005F63] flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Delivery Address</div>
                        {selectedAddress ? (
                          <>
                            <p className="text-xs font-semibold text-slate-800 mt-0.5">
                              {selectedAddress.full_name || dentistName || user?.full_name || 'Customer'}
                              <span className="font-normal text-slate-500"> ({selectedAddress.label || 'Home'})</span>
                            </p>
                            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                              {selectedAddress.line1}, {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">+91 {selectedAddress.mobile || phone}</p>
                          </>
                        ) : (
                          <p className="text-xs text-rose-500 font-semibold mt-1">No delivery address selected</p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentStep('address')}
                      className="text-xs font-semibold text-[#005F63] hover:underline cursor-pointer shrink-0"
                    >
                      Edit
                    </button>
                  </div>

                  {/* 2. Selected Payment Method Summary Box */}
                  <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#005F63] flex items-center justify-center shrink-0 mt-0.5">
                        {paymentMethod === 'cod' ? <Banknote className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Payment Method</div>
                        <p className="text-xs font-semibold text-slate-800 mt-0.5">
                          {paymentMethod === 'cod'
                            ? 'Cash on Delivery – Pay when you receive'
                            : 'Pay Online – Secure payment via Razorpay'}
                        </p>
                        <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                          {paymentMethod === 'cod' ? 'Pay upon delivery' : '100% Encrypted & Verified'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentStep('payment')}
                      className="text-xs font-semibold text-[#005F63] hover:underline cursor-pointer shrink-0"
                    >
                      Edit
                    </button>
                  </div>

                  {/* 3. Compact Order Summary (Product Cards) */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-900">Order Summary</h3>
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {cartItems.map((item) => {
                        const itemImg = getAbsoluteImageUrl(item.image);
                        return (
                          <div
                            key={item.id}
                            className="p-2.5 sm:p-3 rounded-xl border border-slate-100 bg-white flex items-center gap-3"
                          >
                            <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                              {itemImg ? (
                                <img src={itemImg} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <PackageCheck className="w-5 h-5 text-slate-300" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-medium text-slate-800 truncate">{item.name}</h4>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <span>Qty: <strong className="text-slate-600">{item.qty}</strong></span>
                                <span>•</span>
                                <span>{item.category || 'Dental Essential'}</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-semibold text-slate-900">
                                ₹{(item.price * item.qty).toLocaleString('en-IN')}
                              </span>
                              {item.qty > 1 && (
                                <span className="text-[10px] text-slate-400 block">
                                  ₹{item.price.toLocaleString('en-IN')} each
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. Apply Coupon Code Card */}
                  <div className="pt-2">
                    {activeCoupon ? (
                      <div className="p-3 rounded-xl bg-teal-50/80 border border-[#005F63]/20 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-[#005F63]" />
                          <div>
                            <span className="text-xs font-semibold text-[#005F63]">
                              Coupon &apos;{activeCoupon.code}&apos; Applied
                            </span>
                            <span className="text-[11px] text-emerald-700 block font-medium">
                              Saved ₹{couponDiscountVal.toLocaleString('en-IN')} on this order
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCoupon(null);
                            showToast?.('Coupon removed.');
                          }}
                          className="text-xs font-medium text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 pl-1.5 flex-1 min-w-0">
                          <Tag className="w-3.5 h-3.5 text-[#005F63] shrink-0" />
                          <input
                            type="text"
                            value={couponInput}
                            onChange={(e) => {
                              setCouponInput(e.target.value.toUpperCase());
                              if (couponError) setCouponError(null);
                            }}
                            placeholder="Enter Coupon Code"
                            className="text-xs font-medium uppercase bg-transparent focus:outline-none placeholder:text-slate-400 placeholder:normal-case placeholder:font-normal w-full"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={!couponInput.trim()}
                          className="px-3.5 py-1.5 rounded-lg bg-[#005F63] hover:bg-[#0B7C80] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-medium transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                    {couponError && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1 px-1">{couponError}</p>
                    )}
                  </div>

                  {/* 5. Price Details Breakdown */}
                  <div className="pt-3.5 border-t border-slate-100 space-y-2 text-xs">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Price Details</h3>
                    
                    <div className="flex justify-between text-slate-600">
                      <span>Item Total ({cartItems.length} items)</span>
                      <span className="font-medium text-slate-800">₹{subtotalVal.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>Delivery Charge</span>
                      {deliveryFeeVal === 0 ? (
                        <span className="font-semibold text-emerald-600">FREE</span>
                      ) : (
                        <span className="font-medium text-slate-800">₹{deliveryFeeVal.toLocaleString('en-IN')}</span>
                      )}
                    </div>

                    {couponDiscountVal > 0 && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Discount ({activeCoupon?.code})</span>
                        <span className="font-semibold">-₹{couponDiscountVal.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-200 flex items-baseline justify-between">
                      <div>
                        <span className="text-xs sm:text-sm font-semibold text-slate-900 block">Total Amount</span>
                        <span className="text-[10px] text-slate-400 font-normal">Inclusive of all taxes</span>
                      </div>
                      <span className="text-base sm:text-lg font-bold text-[#005F63]">
                        ₹{orderTotalVal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* 6. Savings Highlight Pill */}
                  {overallSavingsVal > 0 && (
                    <div className="py-2 px-3 rounded-lg bg-emerald-50/80 border border-emerald-100 text-[11px] font-medium text-emerald-800 flex items-center gap-1.5">
                      <span>🌱</span>
                      <span>You are saving ₹{overallSavingsVal.toLocaleString('en-IN')} on this order!</span>
                    </div>
                  )}
                </div>

                {/* Final Place Order CTA Button */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={isPlacing || (selectedServ && !selectedServ.is_serviceable)}
                    className="w-full py-3.5 rounded-xl bg-[#005F63] hover:bg-[#0B7C80] disabled:bg-slate-300 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isPlacing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing Order...</span>
                      </>
                    ) : (
                      <>
                        <span>Place Order</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400">
                    <Lock className="w-3.5 h-3.5 text-[#005F63]" />
                    <span>100% Verified & Secure Checkout</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ===================================================================== */}
          {/* RIGHT COLUMN (Desktop Sticky Summary Sidebar)                        */}
          {/* ===================================================================== */}
          <div className="hidden lg:block lg:col-span-4 space-y-4 sticky top-28">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-900">Order Summary</h3>
                <span className="text-[11px] font-medium text-slate-500">{cartItems.length} items</span>
              </div>

              {/* Items List Preview */}
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {cartItems.map((item) => {
                  const itemImg = getAbsoluteImageUrl(item.image);
                  return (
                    <div key={item.id} className="flex items-center gap-2.5 text-xs">
                      <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
                        {itemImg ? (
                          <img src={itemImg} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <PackageCheck className="w-4 h-4 text-slate-300 m-auto mt-2" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400">Qty: {item.qty}</p>
                      </div>
                      <span className="font-semibold text-slate-900 shrink-0">
                        ₹{(item.price * item.qty).toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Pricing Breakdown */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Item Total</span>
                  <span className="font-medium text-slate-800">₹{subtotalVal.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charge</span>
                  {deliveryFeeVal === 0 ? (
                    <span className="font-semibold text-emerald-600">FREE</span>
                  ) : (
                    <span className="font-medium text-slate-800">₹{deliveryFeeVal.toLocaleString('en-IN')}</span>
                  )}
                </div>

                {couponDiscountVal > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Coupon Discount</span>
                    <span className="font-semibold">-₹{couponDiscountVal.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="font-semibold text-slate-900">Total Amount</span>
                  <span className="text-base sm:text-lg font-bold text-[#005F63]">
                    ₹{orderTotalVal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {overallSavingsVal > 0 && (
                <div className="py-2 px-3 rounded-lg bg-emerald-50/80 border border-emerald-100 text-[11px] font-medium text-emerald-800 text-center">
                  🌱 You save ₹{overallSavingsVal.toLocaleString('en-IN')} on this order
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT ADDRESS SHEET (Screen 4 Reference Design)             */}
      {/* ========================================================================= */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 my-auto text-left animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-4 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Enter your delivery address</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveModalAddress} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Server error alert */}
              {modalServerError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold">
                  {modalServerError}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  value={modalForm.full_name}
                  onChange={(e) => {
                    setModalForm({ ...modalForm, full_name: e.target.value });
                    if (modalErrors.full_name) setModalErrors({ ...modalErrors, full_name: '' });
                  }}
                  placeholder="Enter your full name"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:border-[#005F63] focus:ring-1 focus:ring-[#005F63] focus:outline-none"
                />
                {modalErrors.full_name && (
                  <p className="text-[10px] text-rose-500 font-semibold mt-1">{modalErrors.full_name}</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number *</label>
                <div className="flex gap-2">
                  <span className="px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={modalForm.mobile}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setModalForm({ ...modalForm, mobile: val });
                      if (modalErrors.mobile) setModalErrors({ ...modalErrors, mobile: '' });
                    }}
                    placeholder="Enter your mobile number"
                    className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:border-[#005F63] focus:ring-1 focus:ring-[#005F63] focus:outline-none"
                  />
                </div>
                {modalErrors.mobile && (
                  <p className="text-[10px] text-rose-500 font-semibold mt-1">{modalErrors.mobile}</p>
                )}
              </div>

              {/* Pincode with Detect Location */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Pincode *</label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={modalForm.pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    placeholder="Enter pincode"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:border-[#005F63] focus:ring-1 focus:ring-[#005F63] focus:outline-none pr-32"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      handleUseCurrentLocation();
                      setIsLocationModalOpen(true);
                    }}
                    className="absolute right-2 top-1.5 px-2.5 py-1.5 rounded-lg bg-teal-50 text-[#005F63] text-[11px] font-bold flex items-center gap-1 hover:bg-teal-100 transition-colors cursor-pointer"
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                    <span>Detect Location</span>
                  </button>
                </div>
                {modalErrors.pincode && (
                  <p className="text-[10px] text-rose-500 font-semibold mt-1">{modalErrors.pincode}</p>
                )}
                {modalPincodeStatus.checking && (
                  <p className="text-[10px] text-slate-400 font-medium mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin text-[#005F63]" /> Checking courier serviceability...
                  </p>
                )}
                {modalPincodeStatus.result && (
                  <p className={`text-[10px] font-bold mt-1 ${modalPincodeStatus.result.is_serviceable ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {modalPincodeStatus.result.is_serviceable ? '✓ Pincode is serviceable for delivery' : '✗ Pincode is currently unserviceable'}
                  </p>
                )}
              </div>

              {/* House No, Building, Street */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">House No, Building, Street *</label>
                <input
                  type="text"
                  value={modalForm.street_address}
                  onChange={(e) => {
                    setModalForm({ ...modalForm, street_address: e.target.value });
                    if (modalErrors.street_address) setModalErrors({ ...modalErrors, street_address: '' });
                  }}
                  placeholder="Enter address"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:border-[#005F63] focus:ring-1 focus:ring-[#005F63] focus:outline-none"
                />
                {modalErrors.street_address && (
                  <p className="text-[10px] text-rose-500 font-semibold mt-1">{modalErrors.street_address}</p>
                )}
              </div>

              {/* Area / Locality */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Area / Locality / Landmark</label>
                <input
                  type="text"
                  value={modalForm.landmark}
                  onChange={(e) => setModalForm({ ...modalForm, landmark: e.target.value })}
                  placeholder="Enter locality / landmark"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:border-[#005F63] focus:ring-1 focus:ring-[#005F63] focus:outline-none"
                />
              </div>

              {/* City & State Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">City *</label>
                  <input
                    type="text"
                    value={modalForm.city}
                    onChange={(e) => {
                      setModalForm({ ...modalForm, city: e.target.value });
                      if (modalErrors.city) setModalErrors({ ...modalErrors, city: '' });
                    }}
                    placeholder="Enter city"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:border-[#005F63] focus:ring-1 focus:ring-[#005F63] focus:outline-none"
                  />
                  {modalErrors.city && (
                    <p className="text-[10px] text-rose-500 font-semibold mt-1">{modalErrors.city}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">State *</label>
                  <select
                    value={modalForm.state}
                    onChange={(e) => {
                      setModalForm({ ...modalForm, state: e.target.value });
                      if (modalErrors.state) setModalErrors({ ...modalErrors, state: '' });
                    }}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium bg-white focus:border-[#005F63] focus:ring-1 focus:ring-[#005F63] focus:outline-none"
                  >
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  {modalErrors.state && (
                    <p className="text-[10px] text-rose-500 font-semibold mt-1">{modalErrors.state}</p>
                  )}
                </div>
              </div>

              {/* Save as default address toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800">Save as default address</span>
                <button
                  type="button"
                  onClick={() => setModalForm({ ...modalForm, is_default: !modalForm.is_default })}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    modalForm.is_default ? 'bg-[#005F63]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform shadow-xs absolute top-0.5 ${
                      modalForm.is_default ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Save Address CTA Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="w-full py-3.5 rounded-xl bg-[#005F63] hover:bg-[#0B7C80] disabled:bg-slate-300 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
                >
                  {modalSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Address...</span>
                    </>
                  ) : (
                    <span>Save Address</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DETECT YOUR LOCATION RADAR MODAL (Screen 5 Reference Design)     */}
      {/* ========================================================================= */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 my-auto text-left animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 pb-3 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Detect Your Location</h3>
                <p className="text-xs text-slate-400 mt-0.5">Allow location access to get your current address</p>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Radar Animation Graphic */}
            <div className="p-6 flex flex-col items-center justify-center bg-gradient-to-b from-[#F2FBFB] to-white relative overflow-hidden">
              <div className="relative w-44 h-44 flex items-center justify-center my-4">
                {/* Outer pulsing ring */}
                <div className="absolute inset-0 rounded-full bg-[#005F63]/10 animate-ping opacity-75" />
                {/* Inner wave ring */}
                <div className="absolute inset-4 rounded-full bg-[#005F63]/15 animate-pulse" />
                {/* Inner circle */}
                <div className="absolute inset-10 rounded-full bg-[#005F63]/20" />
                
                {/* Center Map Pin Pinpoint */}
                <div className="relative z-10 w-12 h-12 rounded-full bg-[#005F63] text-white flex items-center justify-center shadow-lg">
                  {isDetectingLocation ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <MapPin className="w-6 h-6" />
                  )}
                </div>
              </div>

              {/* Status Note */}
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-[#005F63] text-xs font-bold">
                  <LocateFixed className="w-3.5 h-3.5" />
                  {isDetectingLocation ? 'Pinpointing coordinates...' : detectedLocationData ? 'Location Locked' : 'Ready to Detect'}
                </span>
              </div>
            </div>

            {/* Detected Address Details */}
            <div className="p-5 pt-0 space-y-4">
              {detectedLocationData ? (
                <div className="p-4 rounded-2xl border border-teal-200 bg-[#F2FBFB] space-y-2">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-[#005F63] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Detected Address</div>
                      <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                        {detectedLocationData.street_address}
                        {detectedLocationData.city ? `, ${detectedLocationData.city}` : ''}, {detectedLocationData.state} - <strong className="font-bold">{detectedLocationData.pincode}</strong>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsLocationModalOpen(false);
                      setIsAddressModalOpen(true);
                    }}
                    className="text-xs font-bold text-[#005F63] hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Address Manually</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-xs text-slate-600 font-medium">
                    {locationDetectError || 'Click below to detect your current GPS location'}
                  </p>
                </div>
              )}

              {/* Action Button */}
              {detectedLocationData ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsLocationModalOpen(false);
                    showToast?.('Current location applied to address form.');
                  }}
                  className="w-full py-3.5 rounded-xl bg-[#005F63] hover:bg-[#0B7C80] text-white text-sm font-bold transition-all shadow-md cursor-pointer"
                >
                  Use This Address
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isDetectingLocation}
                  className="w-full py-3.5 rounded-xl bg-[#005F63] hover:bg-[#0B7C80] disabled:bg-slate-300 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
                >
                  {isDetectingLocation ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Detecting...</span>
                    </>
                  ) : (
                    <span>Detect Location</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PAYMENT PROCESSING OVERLAY                                       */}
      {/* ========================================================================= */}
      {paymentProcessing.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-teal-50 text-[#005F63] flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                {paymentProcessing.stage === 'verifying' ? 'Verifying Payment...' : 'Securing Order...'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Please do not refresh the page or press back button.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: SANDBOX DEV SIMULATOR MODAL                                      */}
      {/* ========================================================================= */}
      {showSandboxModal && sandboxOrderData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Payment Sandbox</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSandboxModal(false);
                  sandboxOrderData.ondismiss();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1.5 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Order ID</span>
                <span className="font-mono font-bold text-slate-700">{sandboxOrderData.razorpay_order_id}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/60 pt-1.5">
                <span className="text-slate-500 font-bold">Total Amount</span>
                <span className="font-bold text-sm text-[#005F63]">
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
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer text-center"
              >
                Simulate Success
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSandboxModal(false);
                  sandboxOrderData.ondismiss();
                }}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase transition-all shadow-xs cursor-pointer text-center"
              >
                Simulate Failure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
