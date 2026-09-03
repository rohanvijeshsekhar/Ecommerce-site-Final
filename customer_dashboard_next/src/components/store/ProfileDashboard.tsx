'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  User, Building2, MapPin, Package, Heart, Shield, HeadphonesIcon,
  Lock, LogOut, Camera, Pencil, Trash2, Plus,
  Check, X, ShoppingCart, FileText, Phone, Mail,
  AlertCircle, CheckCircle, RefreshCw, ShoppingBag,
  Ticket, Gift, ChevronDown, Upload, Eye, EyeOff,
  LayoutDashboard, CreditCard, Smartphone,
  Layers, Globe, ChevronRight, Handshake
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usersService } from '../../lib/services/users';
import { authService } from '../../lib/services/auth';
import type { Address } from '../../lib/services/users';
import type { CartItem } from '../../types/pendingAction';
import OrderDetailPage from './OrderDetailPage';
import { getStatusLabel } from '@/lib/utils';
import { ordersService } from '../../lib/services/ordersService';
import { INDIAN_STATES } from '@/lib/constants/indianStates';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DashboardSection =
  | 'dashboard' | 'profile' | 'clinic' | 'addresses'
  | 'orders' | 'wishlist' | 'warranty' | 'support'
  | 'security' | 'dealer-status';

interface Order {
  id: string;
  date: string;
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  items: CartItem[];
  paymentMethod: string;
  total: number;
}

interface ProfileDashboardProps {
  activeSection: DashboardSection;
  setActiveSection: (s: DashboardSection) => void;
  orders: Order[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  wishlistItems: CartItem[];
  setWishlistItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setCurrentView: (view: any) => void;
  onProductClick: (id: string) => void;
  showToast: (message: string) => void;
}

interface WarrantyAsset {
  id: string;
  productName: string;
  serialNumber: string;
  registrationDate: string;
  expiryDate: string;
  status: 'active' | 'expired';
  orderId: string;
  image: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  orderId: string;
  productName: string;
  category: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved';
  date: string;
  messages: { sender: 'user' | 'agent'; text: string; date: string }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEAL = '#005B63';
const ORANGE = '#F58220';

const getOrderStatusInfo = (status: string | undefined | null) => {
  const normalized = (status || 'processing').toLowerCase().trim();
  const configMap: Record<string, { label: string; color: string }> = {
    pending:    { label: 'Pending',    color: 'text-amber-700 bg-amber-50 border-amber-200' },
    processing: { label: 'Processing', color: 'text-amber-700 bg-amber-50 border-amber-200' },
    confirmed:  { label: 'Confirmed',  color: 'text-blue-700 bg-blue-50 border-blue-200' },
    shipped:    { label: 'Shipped',    color: 'text-blue-700 bg-blue-50 border-blue-200' },
    delivered:  { label: 'Delivered',  color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    cancelled:  { label: 'Cancelled',  color: 'text-rose-700 bg-rose-50 border-rose-200' },
    failed:     { label: 'Failed',     color: 'text-rose-700 bg-rose-50 border-rose-200' },
    returned:   { label: 'Returned',   color: 'text-slate-700 bg-slate-50 border-slate-200' },
  };

  return configMap[normalized] || {
    label: (status || 'Processing').toString().toUpperCase(),
    color: 'text-amber-700 bg-amber-50 border-amber-200'
  };
};

const statusConfig = new Proxy(
  {
    pending:    { label: 'Pending',    color: 'text-amber-700 bg-amber-50 border-amber-200' },
    processing: { label: 'Processing', color: 'text-amber-700 bg-amber-50 border-amber-200' },
    confirmed:  { label: 'Confirmed',  color: 'text-blue-700 bg-blue-50 border-blue-200' },
    shipped:    { label: 'Shipped',    color: 'text-blue-700 bg-blue-50 border-blue-200' },
    delivered:  { label: 'Delivered',  color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    cancelled:  { label: 'Cancelled',  color: 'text-rose-700 bg-rose-50 border-rose-200' },
    failed:     { label: 'Failed',     color: 'text-rose-700 bg-rose-50 border-rose-200' },
    returned:   { label: 'Returned',   color: 'text-slate-700 bg-slate-50 border-slate-200' },
  },
  {
    get(target, prop: string) {
      return getOrderStatusInfo(prop);
    }
  }
);

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-6">
    <h2 className="text-xl font-black text-slate-800 tracking-tight font-display">{title}</h2>
    {subtitle && <p className="text-xs text-slate-400 mt-1 font-sans">{subtitle}</p>}
  </div>
);

const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />
);

const DashboardStatCard: React.FC<{
  label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string; onClick?: () => void;
}> = ({ label, value, icon, color, sub, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-5 flex flex-col justify-between hover:shadow-[0_8px_30px_rgba(0,91,99,0.06)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} group-hover:scale-105 transition-transform duration-300`}>
        {icon}
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#005B63] group-hover:translate-x-0.5 transition-all" />
    </div>
    <div>
      <p className="text-2xl font-black text-slate-800 font-display">{value}</p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-300 mt-1 font-medium">{sub}</p>}
    </div>
  </div>
);

const QuickActionCard: React.FC<{
  label: string; icon: React.ReactNode; onClick: () => void; color?: string;
}> = ({ label, icon, onClick, color = '#005B63' }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-2.5 p-5 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] hover:border-[#005B63]/25 transition-all duration-300 group cursor-pointer"
  >
    <span style={{ color }} className="group-hover:scale-110 group-hover:-translate-y-0.5 transition-transform duration-300">{icon}</span>
    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{label}</span>
  </button>
);

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; action?: React.ReactNode }> = ({ icon, title, subtitle, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
    <div className="w-16 h-16 rounded-full bg-[#E6F2F2] flex items-center justify-center text-[#005B63] mb-4">
      {icon}
    </div>
    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{title}</h3>
    <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">{subtitle}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

const Toast: React.FC<{ message: string | null }> = ({ message }) => {
  if (!message) return null;
  const isWarning = message.toLowerCase().includes('disabled') || 
                    message.toLowerCase().includes('pending') || 
                    message.toLowerCase().includes('rejected');
  return (
    <div className={`fixed bottom-24 md:bottom-8 left-1/2 z-[200] text-white text-xs font-semibold uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-xl flex items-center gap-2.5 animate-toast-in border ${
      isWarning 
        ? 'bg-amber-950 border-amber-500/30' 
        : 'bg-[#005B63] border-[#005B63]/30'
    }`}>
      {isWarning ? (
        <AlertCircle className="w-4 h-4 text-amber-400 stroke-[2] shrink-0" />
      ) : (
        <CheckCircle className="w-4 h-4 text-emerald-300 stroke-[2] shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const ProfileDashboard: React.FC<ProfileDashboardProps> = ({
  activeSection,
  setActiveSection,
  orders,
  setCartItems,
  wishlistItems,
  setWishlistItems,
  setCurrentView,
  onProductClick,
  showToast,
}) => {
  const { user, profile, logout, refreshUser, resendVerification, logoutAll, activeSessions, verifyOTP, resendOTP } = useAuth();

  // ── Local state ──
  const [localToast, setLocalToast] = useState<string | null>(null);
  const [dealerApp, setDealerApp] = useState<any | null>(null);
  const [dealerAppLoading, setDealerAppLoading] = useState(false);

  // Phone OTP verification states
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
  const [phoneOtpError, setPhoneOtpError] = useState<string | null>(null);
  const [phoneOtpSuccess, setPhoneOtpSuccess] = useState<string | null>(null);
  const [phoneOtpCooldown, setPhoneOtpCooldown] = useState(0);

  useEffect(() => {
    if (phoneOtpCooldown <= 0) return;
    const timer = setInterval(() => {
      setPhoneOtpCooldown(p => p - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phoneOtpCooldown]);

  const handleSendPhoneOtp = async () => {
    const phone = user?.phone_number || profileForm.phone_number;
    if (!phone) {
      setPhoneOtpError("Please link and save a phone number in your profile first.");
      return;
    }
    setPhoneOtpLoading(true);
    setPhoneOtpError(null);
    setPhoneOtpSuccess(null);
    try {
      const res = await authService.otpSend({
        target: phone,
        purpose: 'registration',
      });
      if (res.success) {
        setPhoneOtpSent(true);
        setPhoneOtpCooldown(60);
        setPhoneOtpSuccess("OTP code sent to your phone successfully.");
      } else {
        setPhoneOtpError(res.message || "Failed to send OTP.");
      }
    } catch (e: any) {
      setPhoneOtpError(e.response?.data?.message || e.message || "An error occurred.");
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    const phone = user?.phone_number || profileForm.phone_number;
    if (!phone || !phoneOtpCode) return;
    if (phoneOtpCode.length !== 6) {
      setPhoneOtpError("Please enter a valid 6-digit code.");
      return;
    }
    setPhoneOtpLoading(true);
    setPhoneOtpError(null);
    setPhoneOtpSuccess(null);
    try {
      await verifyOTP({
        target: phone,
        purpose: 'registration',
        code: phoneOtpCode,
      });
      setPhoneOtpSuccess("Phone number verified successfully!");
      setPhoneOtpSent(false);
      setPhoneOtpCode('');
      await refreshUser();
    } catch (e: any) {
      setPhoneOtpError(e.response?.data?.message || e.message || "Verification failed. Please try again.");
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  const handleResendPhoneOtp = async () => {
    if (phoneOtpCooldown > 0) return;
    const phone = user?.phone_number || profileForm.phone_number;
    if (!phone) return;
    setPhoneOtpLoading(true);
    setPhoneOtpError(null);
    setPhoneOtpSuccess(null);
    try {
      await resendOTP({
        target: phone,
        purpose: 'registration',
      });
      setPhoneOtpCooldown(60);
      setPhoneOtpSuccess("OTP resent successfully.");
    } catch (e: any) {
      setPhoneOtpError(e.response?.data?.message || e.message || "Failed to resend OTP.");
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'dealer-status' && user?.role === 'dealer') {
      const fetchDealerApp = async () => {
        setDealerAppLoading(true);
        try {
          const { dealerService } = await import('../../lib/services/dealer');
          const res = await dealerService.getStatus();
          if (res.success && res.data) {
            setDealerApp(res.data);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setDealerAppLoading(false);
        }
      };
      fetchDealerApp();
    }
  }, [activeSection, user]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [_isLoadingProfile, _setIsLoadingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  // Profile form state (Simplified for B2B)
  const [profileForm, setProfileForm] = useState({
    full_name: '', phone_number: '', profession: '',
  });
  const [profileFormDirty, setProfileFormDirty] = useState(false);

  // Clinic form state
  const [clinicForm, setClinicForm] = useState({
    clinic_name: '', gst_number: '', clinic_phone: '', clinic_email: '',
  });
  const [clinicFormDirty, setClinicFormDirty] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState<Partial<Address>>({
    label: 'Primary Clinic', full_name: '', mobile: '',
    line1: '', line2: '', city: '', state: '', pincode: '',
    address_type: 'both', is_default: false,
  });
  const [addressSaving, setAddressSaving] = useState(false);

  // Security
  const [securityForm, setSecurityForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [emailResent, setEmailResent] = useState(false);

  // Avatar
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Orders search/filter
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned'>('all');

  // Support wizard state (Order-driven support)
  const [supportOrderId, setSupportOrderId] = useState<string>('');
  const [supportProductId, setSupportProductId] = useState<string>('');
  const [supportCategory, setSupportCategory] = useState<string>('Order Issue');
  const [supportDescription, setSupportDescription] = useState<string>('');
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([
    {
      id: 'TKT-8291A',
      subject: 'Equipment Demonstration Request',
      orderId: 'FA-90231',
      productName: 'NSK FX205 Dental Handpiece',
      category: 'Setup & Demo Request',
      description: 'Requesting clinical demo at our dental facility.',
      status: 'resolved',
      date: '2026-06-15',
      messages: [
        { sender: 'user', text: 'Hi, I received my NSK handpiece yesterday and would like to request a clinical demonstration.', date: '2026-06-15 10:00' },
        { sender: 'agent', text: 'Dear Doctor, our field clinical expert will contact you within 24 hours to schedule the demo.', date: '2026-06-15 11:30' }
      ]
    }
  ]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  // Warranty assets state
  const [registeredWarranties, setRegisteredWarranties] = useState<WarrantyAsset[]>([
    {
      id: 'WR-8820',
      productName: 'NSK FX205 Dental Handpiece',
      serialNumber: 'NSK-FX205-992A',
      registrationDate: '2026-05-12',
      expiryDate: '2027-05-12',
      status: 'active',
      orderId: 'FA-90231',
      image: '/images/faazo-logo.png'
    }
  ]);
  const [warrantyOrderId, setWarrantyOrderId] = useState<string>('');
  const [warrantyProductId, setWarrantyProductId] = useState<string>('');
  const [warrantySerial, setWarrantySerial] = useState<string>('');
  const [warrantyDate, setWarrantyDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showWarrantyForm, setShowWarrantyForm] = useState(false);

  // Active Device Sessions — live from enterprise API
  const [liveDeviceSessions, setLiveDeviceSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const fetchSessions = async () => {
    if (!user) return;
    setSessionsLoading(true);
    try {
      const sessions = await activeSessions();
      setLiveDeviceSessions(sessions);
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'security' && user) {
      fetchSessions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, user]);

  // Order Details / History loading state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const ordersPageSize = 10;

  const fetchUserOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const { ordersService } = await import('../../lib/services/ordersService');
      const params: any = {
        page: ordersPage,
        page_size: ordersPageSize,
      };
      if (orderSearch.trim()) params.search = orderSearch.trim();
      if (orderFilter !== 'all') params.status = orderFilter;

      const res = await ordersService.getOrders(params);
      if (res.success && res.data) {
        setUserOrders(res.data);
        const meta = (res as any).meta || {};
        if (meta.pagination) {
          setOrdersTotal(meta.pagination.total);
        } else {
          setOrdersTotal(res.data.length);
        }
      }
    } catch (e) {
      console.error('Failed to load user orders:', e);
    } finally {
      setOrdersLoading(false);
    }
  }, [ordersPage, orderSearch, orderFilter]);

  useEffect(() => {
    if (activeSection === 'orders') {
      fetchUserOrders();
    }
  }, [activeSection, fetchUserOrders]);

  // ── Init: populate forms from context ──
  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || user?.full_name || '',
        phone_number: profile.phone_number || user?.phone_number || '',
        profession: profile.profession || '',
      });
      setClinicForm({
        clinic_name: profile.clinic_name || '',
        gst_number: profile.gst_number || '',
        clinic_phone: profile.clinic_phone || '',
        clinic_email: profile.clinic_email || '',
      });
    }
  }, [profile, user]);

  // ── Load addresses on mount ──
  useEffect(() => {
    const loadAddresses = async () => {
      setAddressLoading(true);
      try {
        const res = await usersService.getAddresses();
        if (res.success && res.data) setAddresses(res.data);
      } catch { /* silent */ }
      finally { setAddressLoading(false); }
    };
    loadAddresses();
  }, []);

  // ── Helpers ──
  const fireToast = (msg: string) => {
    setLocalToast(msg);
    showToast(msg);
    setTimeout(() => setLocalToast(null), 3000);
  };

  const avatarInitials = (name: string) =>
    name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');

  // ── Profile save ──
  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      await usersService.updateProfile(profileForm as any);
      await refreshUser();
      fireToast('Profile updated successfully!');
      setProfileFormDirty(false);
    } catch { fireToast('Failed to save profile.'); }
    finally { setProfileSaving(false); }
  };

  // ── Clinic save ──
  const saveClinic = async () => {
    setProfileSaving(true);
    try {
      await usersService.updateProfile(clinicForm);
      await refreshUser();
      fireToast('Clinic information saved!');
      setClinicFormDirty(false);
    } catch { fireToast('Failed to save clinic data.'); }
    finally { setProfileSaving(false); }
  };

  // ── Avatar upload ──
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      await usersService.uploadAvatar(file);
      await refreshUser();
      fireToast('Profile photo updated!');
    } catch { fireToast('Avatar upload failed.'); }
    finally { setAvatarUploading(false); }
  };

  const handleDeleteAvatar = async () => {
    setAvatarUploading(true);
    try {
      await usersService.deleteAvatar();
      await refreshUser();
      fireToast('Profile photo removed.');
    } catch { fireToast('Failed to remove photo.'); }
    finally { setAvatarUploading(false); }
  };

  // ── Address CRUD ──
  const resetAddressForm = () => {
    setAddressForm({ label: 'Primary Clinic', full_name: '', mobile: '', line1: '', line2: '', city: '', state: '', pincode: '', address_type: 'both', is_default: false });
    setEditingAddress(null);
    setShowAddressForm(false);
  };

  const handleSaveAddress = async () => {
    if (!addressForm.full_name || addressForm.full_name.trim().length < 3) {
      fireToast('Recipient name must be at least 3 characters.');
      return;
    }
    const cleanMobile = (addressForm.mobile || '').replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      fireToast('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!addressForm.line1 || addressForm.line1.trim().length < 5) {
      fireToast('Street address line 1 must be at least 5 characters.');
      return;
    }
    if (!addressForm.city || addressForm.city.trim().length < 2) {
      fireToast('Please enter a valid city name.');
      return;
    }
    if (!addressForm.state || addressForm.state.trim().length < 2) {
      fireToast('Please select a valid State.');
      return;
    }
    const pin = (addressForm.pincode || '').trim();
    if (!/^\d{6}$/.test(pin)) {
      fireToast('Pincode must be exactly 6 digits.');
      return;
    }

    setAddressSaving(true);
    try {
      if (editingAddress) {
        const res = await usersService.updateAddress(editingAddress.id, addressForm as any);
        if (res.success && res.data) {
          setAddresses(prev => prev.map(a => a.id === editingAddress.id ? res.data! : a));
          fireToast('Address updated successfully!');
          resetAddressForm();
        } else {
          const errs = (res as any)?.errors;
          const msg = errs ? Object.values(errs).flat().join(' ') : (res as any)?.message || 'Failed to update address.';
          fireToast(msg);
        }
      } else {
        const res = await usersService.createAddress(addressForm as any);
        if (res.success && res.data) {
          setAddresses(prev => [...prev, res.data!]);
          fireToast('Address added successfully!');
          resetAddressForm();
        } else {
          const errs = (res as any)?.errors;
          const msg = errs ? Object.values(errs).flat().join(' ') : (res as any)?.message || 'Failed to create address.';
          fireToast(msg);
        }
      }
    } catch (err: any) {
      const backendErrors = err?.response?.data?.errors;
      const errorMsg = backendErrors
        ? Object.values(backendErrors).flat().join(' ')
        : err?.response?.data?.message || 'Failed to save address.';
      fireToast(errorMsg);
    }
    finally { setAddressSaving(false); }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await usersService.deleteAddress(id);
      setAddresses(prev => prev.filter(a => a.id !== id));
      fireToast('Address removed.');
    } catch { fireToast('Failed to delete address.'); }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await usersService.setDefaultAddress(id);
      if (res.success) {
        setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })));
        fireToast('Default address updated!');
      }
    } catch { fireToast('Failed to set default.'); }
  };

  const startEditAddress = (addr: Address) => {
    setEditingAddress(addr);
    setAddressForm({ ...addr });
    setShowAddressForm(true);
  };

  // ── Security ──
  const savePassword = async () => {
    if (securityForm.new_password !== securityForm.confirm_password) {
      fireToast('Passwords do not match.'); return;
    }
    setSecuritySaving(true);
    try {
      const { authService } = await import('../../lib/services/auth');
      const res = await authService.changePassword({
        current_password: securityForm.old_password,
        new_password: securityForm.new_password,
        confirm_password: securityForm.confirm_password,
      });
      if (res.success) {
        fireToast('Password changed successfully! Please log in again.');
        setSecurityForm({ old_password: '', new_password: '', confirm_password: '' });
        // Force logout — new password invalidated all tokens
        setTimeout(() => logout(), 1500);
      } else {
        fireToast(res.message || 'Failed to change password.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to change password.';
      fireToast(msg);
    }
    setSecuritySaving(false);
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const { authService } = await import('../../lib/services/auth');
      await authService.revokeSession(sessionId);
      fireToast('Session revoked.');
      fetchSessions();
    } catch {
      fireToast('Failed to revoke session.');
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await logoutAll();
      fireToast('Logged out of all devices.');
    } catch {
      fireToast('Failed to logout from all devices.');
    }
  };

  const handleResendVerification = async () => {
    try {
      await resendVerification();
      setEmailResent(true);
      fireToast('Verification email sent!');
    } catch { fireToast('Failed to send verification email.'); }
  };

  // ── Reorder ──
  const handleReorder = (order: Order) => {
    setCartItems(prev => {
      const updated = [...prev];
      order.items.forEach(newItem => {
        const idx = updated.findIndex(c => c.id === newItem.id);
        if (idx > -1) updated[idx] = { ...updated[idx], qty: updated[idx].qty + newItem.qty };
        else updated.push({ ...newItem });
      });
      return updated;
    });
    fireToast('Items added to Cart!');
    setCurrentView('cart');
  };

  // ── Warranty Submit ──
  const handleWarrantyRegister = () => {
    if (!warrantyProductId || !warrantySerial) {
      fireToast('Please complete all fields.');
      return;
    }
    const order = orders.find(o => o.id === warrantyOrderId);
    const item = order?.items.find(i => i.id === warrantyProductId);
    if (!item) return;

    const newWarranty: WarrantyAsset = {
      id: `WR-${Math.floor(Math.random() * 9000) + 1000}`,
      productName: item.name,
      serialNumber: warrantySerial,
      registrationDate: warrantyDate,
      expiryDate: new Date(new Date(warrantyDate).setFullYear(new Date(warrantyDate).getFullYear() + 1)).toISOString().split('T')[0],
      status: 'active',
      orderId: warrantyOrderId,
      image: item.image
    };

    setRegisteredWarranties(prev => [newWarranty, ...prev]);
    setShowWarrantyForm(false);
    setWarrantySerial('');
    fireToast('Product warranty registered!');
  };

  // ── Support ticket submit ──
  const handleSupportSubmit = () => {
    if (!supportDescription) {
      fireToast('Please enter a description.');
      return;
    }

    const order = orders.find(o => o.id === supportOrderId);
    const product = order?.items.find(p => p.id === supportProductId);

    const newTicket: SupportTicket = {
      id: `TKT-${Math.floor(Math.random() * 9000) + 1000}A`,
      subject: `${supportCategory} - ${product?.name || 'General Inquiry'}`,
      orderId: supportOrderId || 'N/A',
      productName: product?.name || 'N/A',
      category: supportCategory,
      description: supportDescription,
      status: 'open',
      date: new Date().toISOString().split('T')[0],
      messages: [
        { sender: 'user', text: supportDescription, date: new Date().toLocaleString() }
      ]
    };

    setSupportTickets(prev => [newTicket, ...prev]);
    setIsCreatingTicket(false);
    setSupportDescription('');
    fireToast('Support ticket submitted successfully!');
  };

  // ── Grouped navigation hierarchy ──
  const navItems: { id: DashboardSection; label: string; icon: React.ReactNode; group: 'procurement' | 'settings' }[] = [
    { id: 'dashboard',    label: 'Dashboard',          icon: <LayoutDashboard className="w-4 h-4" />, group: 'procurement' },
    { id: 'orders',       label: 'My Orders',          icon: <Package className="w-4 h-4" />,         group: 'procurement' },
    { id: 'wishlist',     label: 'Wishlist',           icon: <Heart className="w-4 h-4" />,           group: 'procurement' },
    { id: 'addresses',    label: 'Addresses',          icon: <MapPin className="w-4 h-4" />,          group: 'procurement' },
    { id: 'warranty',     label: 'Warranty',           icon: <Shield className="w-4 h-4" />,          group: 'procurement' },
    { id: 'support',      label: 'Support',            icon: <HeadphonesIcon className="w-4 h-4" />,  group: 'procurement' },

    { id: 'profile',      label: 'My Profile',         icon: <User className="w-4 h-4" />,            group: 'settings' },
    ...(user?.role === 'dealer' ? [
      { id: 'dealer-status' as DashboardSection, label: 'Dealer Status', icon: <Handshake className="w-4 h-4" />, group: 'settings' as const }
    ] : []),
    { id: 'clinic',       label: 'Clinic Information', icon: <Building2 className="w-4 h-4" />,       group: 'settings' },
    { id: 'security',     label: 'Security',           icon: <Lock className="w-4 h-4" />,            group: 'settings' },
  ];

  const displayName = profile?.full_name || user?.full_name || 'Doctor';
  const displayInitials = avatarInitials(displayName);

  // ─── SECTIONS ─────────────────────────────────────────────────────────────

  // Dashboard Home (Commerce-Focused)
  const renderDashboard = () => {
    const pendingCount = orders.filter(o => o.status === 'processing' || o.status === 'shipped').length;

    return (
      <div className="space-y-8">
        <SectionHeader title={`Clinical Account Overview`} subtitle={`Welcome back, ${displayName.split(' ')[0]}. Manage your procurement dashboard.`} />

        {/* Business Procurement Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5">
          <DashboardStatCard label="Total Orders" value={orders.length} icon={<Package className="w-5 h-5 text-[#005B63]" />} color="bg-[#E6F2F2]" onClick={() => setActiveSection('orders')} />
          <DashboardStatCard label="Pending Delivery" value={pendingCount} icon={<RefreshCw className="w-5 h-5 text-amber-500" />} color="bg-amber-50" onClick={() => setActiveSection('orders')} />
          <DashboardStatCard label="Wishlist Items" value={wishlistItems.length} icon={<Heart className="w-5 h-5 text-rose-500" />} color="bg-rose-50" onClick={() => setActiveSection('wishlist')} />
          <DashboardStatCard label="Active Warranties" value={registeredWarranties.length} icon={<Shield className="w-5 h-5 text-emerald-600" />} color="bg-emerald-50" onClick={() => setActiveSection('warranty')} />
          <DashboardStatCard label="Open Support Tickets" value={supportTickets.filter(t => t.status === 'open' || t.status === 'in-progress').length} icon={<HeadphonesIcon className="w-5 h-5 text-indigo-500" />} color="bg-indigo-50" onClick={() => setActiveSection('support')} />
        </div>

        {/* Quick Actions (B2B E-commerce Journey) */}
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <QuickActionCard label="Continue Shopping" icon={<ShoppingBag className="w-5 h-5" />} onClick={() => { setCurrentView('portfolio'); }} />
            <QuickActionCard label="Track Orders" icon={<Package className="w-5 h-5" />} onClick={() => setActiveSection('orders')} />
            <QuickActionCard label="Register Warranty" icon={<Shield className="w-5 h-5" />} onClick={() => setActiveSection('warranty')} color={ORANGE} />
            <QuickActionCard label="Contact Support" icon={<HeadphonesIcon className="w-5 h-5" />} onClick={() => { setIsCreatingTicket(true); setActiveSection('support'); }} color="#6366f1" />
            <QuickActionCard label="Manage Addresses" icon={<MapPin className="w-5 h-5" />} onClick={() => setActiveSection('addresses')} color="#10b981" />
            <QuickActionCard label="View Wishlist" icon={<Heart className="w-5 h-5" />} onClick={() => setActiveSection('wishlist')} color="#f43f5e" />
          </div>
        </div>

        {/* Recent Order Preview */}
        {orders.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Recent Procurement Order</h3>
              <button onClick={() => setActiveSection('orders')} className="text-xs font-black cursor-pointer hover:underline" style={{ color: TEAL }}>View all orders →</button>
            </div>
            {orders.slice(0, 1).map(order => (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] hover:border-[#005B63]/25 transition-all duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Order Reference</span>
                    <p className="text-sm font-black text-slate-800">#{order.id}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{order.date} · {order.items.length} item(s) · {order.paymentMethod}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${statusConfig[order.status].color}`}>
                      {statusConfig[order.status].label}
                    </span>
                    <span className="text-sm font-black text-slate-900">₹{order.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="py-4 space-y-3">
                  {order.items.slice(0, 2).map(item => (
                    <div key={item.id} className="flex items-center gap-3.5">
                      <img src={item.image} alt={item.name} className="w-12 h-12 object-contain bg-slate-50 border border-slate-100 p-1 rounded-lg shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400">Qty: {item.qty} · ₹{item.price.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <p className="text-[10px] text-slate-400 font-bold italic">+ {order.items.length - 2} more item(s)</p>
                  )}
                </div>

                {/* Delivery Progress Timeline */}
                <div className="py-3 bg-slate-50/50 rounded-xl px-4 mb-4 flex items-center justify-between gap-4">
                  <div className="w-full">
                    <div className="flex items-center justify-between text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                      <span className={order.status !== 'cancelled' ? 'text-[#005B63]' : ''}>Confirmed</span>
                      <span className={['shipped', 'delivered'].includes(order.status) ? 'text-[#005B63]' : ''}>Shipped</span>
                      <span className={order.status === 'delivered' ? 'text-[#005B63]' : ''}>Delivered</span>
                    </div>
                    <div className="h-1 bg-slate-200 rounded-full relative">
                      <div 
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ 
                          background: TEAL,
                          width: order.status === 'delivered' ? '100%' : order.status === 'shipped' ? '50%' : '15%' 
                        }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Quick actions for order */}
                <div className="flex flex-wrap gap-3 pt-1">
                  <button onClick={() => handleReorder(order)} className="flex items-center gap-1.5 text-xs font-black text-[#005B63] hover:underline uppercase tracking-wide cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5" /> Reorder Items
                  </button>
                  <button onClick={() => ordersService.downloadInvoice(order.id, (order as any).invoice_number, fireToast)} className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-slate-700 uppercase tracking-wide cursor-pointer ml-auto">
                    <FileText className="w-3.5 h-3.5" /> Invoice
                  </button>
                  <button 
                    onClick={() => { setSupportOrderId(order.id); setIsCreatingTicket(true); setActiveSection('support'); }}
                    className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-slate-700 uppercase tracking-wide cursor-pointer"
                  >
                    <HeadphonesIcon className="w-3.5 h-3.5" /> Need Help
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ShoppingBag className="w-8 h-8" />}
            title="Start Professional Procurement"
            subtitle="Explore FAAZO's extensive portfolio of dental tools and clinical machinery."
            action={
              <button onClick={() => setCurrentView('portfolio')} className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white cursor-pointer hover:bg-[#004b52] transition-colors" style={{ background: TEAL }}>
                Browse Catalog
              </button>
            }
          />
        )}
      </div>
    );
  };

  // My Profile
  const renderProfile = () => {
    return (
      <div className="space-y-6">
        <SectionHeader title="My Profile" subtitle="Verify your practitioner registration details." />

        {/* Profile Identity Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="w-20 h-20 rounded-full object-cover border-4 border-[#E6F2F2] shadow-sm" />
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-inner" style={{ background: `linear-gradient(135deg, ${TEAL}, #00a3b0)` }}>
                {displayInitials}
              </div>
            )}
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-md cursor-pointer hover:bg-[#E6F2F2] transition-colors"
              style={{ color: TEAL }}
            >
              {avatarUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="text-center sm:text-left flex-1">
            <h3 className="text-base font-black text-slate-800">{displayName}</h3>
            <p className="text-xs text-[#005B63] font-bold uppercase tracking-wider mt-0.5">{user?.role === 'dealer' ? 'Verified FAAZO Dealer' : 'Dental Practitioner'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
            <div className="flex justify-center sm:justify-start gap-3 mt-3">
              <button onClick={() => avatarInputRef.current?.click()} className="text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg border border-[#005B63] text-[#005B63] hover:bg-[#E6F2F2] transition-colors cursor-pointer flex items-center gap-1.5">
                <Upload className="w-3 h-3" /> Change Photo
              </button>
              {profile?.avatar_url && (
                <button onClick={handleDeleteAvatar} className="text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer">
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Simple Details Form */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Full Name</label>
              <input
                type="text"
                value={profileForm.full_name}
                onChange={e => { setProfileForm(f => ({ ...f, full_name: e.target.value })); setProfileFormDirty(true); }}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63] focus:ring-2 focus:ring-[#005B63]/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Mobile Number</label>
              <input
                type="tel"
                value={profileForm.phone_number}
                onChange={e => { setProfileForm(f => ({ ...f, phone_number: e.target.value })); setProfileFormDirty(true); }}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63] focus:ring-2 focus:ring-[#005B63]/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-4 py-2.5 border border-slate-100 rounded-xl text-xs font-semibold text-slate-400 bg-slate-50 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Profession</label>
              <div className="relative">
                <select
                  value={profileForm.profession}
                  onChange={e => { setProfileForm(f => ({ ...f, profession: e.target.value })); setProfileFormDirty(true); }}
                  className="w-full appearance-none px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63] focus:ring-2 focus:ring-[#005B63]/10 transition-all"
                >
                  <option value="">— Select Profession —</option>
                  <option value="Dentist">General Dentist</option>
                  <option value="Endodontist">Endodontist</option>
                  <option value="Orthodontist">Orthodontist</option>
                  <option value="Oral Surgeon">Oral Surgeon</option>
                  <option value="Prosthodontist">Prosthodontist</option>
                  <option value="Periodontist">Periodontist</option>
                  <option value="Other">Other Practitioner</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-50">
            <button
              onClick={saveProfile}
              disabled={profileSaving || !profileFormDirty}
              className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all cursor-pointer disabled:opacity-40"
              style={{ background: profileFormDirty ? TEAL : '#94a3b8' }}
            >
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
            <button
              onClick={() => { setProfileForm({ full_name: profile?.full_name || user?.full_name || '', phone_number: profile?.phone_number || user?.phone_number || '', profession: profile?.profession || '' }); setProfileFormDirty(false); }}
              className="px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Clinic Information
  const renderClinic = () => {
    return (
      <div className="space-y-6">
        <SectionHeader title="Clinic Information" subtitle="Used for GST tax invoices and warranty processing. Delivery addresses are managed in Address Book." />
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Clinic / Practice Name</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Building2 className="w-4 h-4" /></span>
                <input
                  type="text"
                  placeholder="e.g. Smile Dental Clinic"
                  value={clinicForm.clinic_name}
                  onChange={e => { setClinicForm(f => ({ ...f, clinic_name: e.target.value })); setClinicFormDirty(true); }}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63] transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1.5">
                GST Number
                <span className="text-[9px] font-bold text-slate-300 normal-case tracking-normal">(Optional)</span>
                {clinicForm.gst_number && <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase"><Check className="w-2.5 h-2.5" /> Saved</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><FileText className="w-4 h-4" /></span>
                <input
                  type="text"
                  placeholder="22AAAAA0000A1Z5"
                  value={clinicForm.gst_number}
                  onChange={e => { setClinicForm(f => ({ ...f, gst_number: e.target.value.toUpperCase() })); setClinicFormDirty(true); }}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63] transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Clinic Phone</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Phone className="w-4 h-4" /></span>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={clinicForm.clinic_phone}
                  onChange={e => { setClinicForm(f => ({ ...f, clinic_phone: e.target.value })); setClinicFormDirty(true); }}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63] transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Clinic Email</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Mail className="w-4 h-4" /></span>
                <input
                  type="email"
                  placeholder="clinic@example.com"
                  value={clinicForm.clinic_email}
                  onChange={e => { setClinicForm(f => ({ ...f, clinic_email: e.target.value })); setClinicFormDirty(true); }}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Informational note */}
          <div className="flex items-start gap-2.5 p-3.5 bg-[#E6F2F2]/50 border border-[#005B63]/10 rounded-xl">
            <MapPin className="w-4 h-4 text-[#005B63] mt-0.5 shrink-0" />
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              Delivery and billing addresses are managed in the <button onClick={() => setActiveSection('addresses')} className="font-black text-[#005B63] hover:underline cursor-pointer">Address Book</button>. Add your clinic, branch, or home address there.
            </p>
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-50">
            <button onClick={saveClinic} disabled={profileSaving || !clinicFormDirty}
              className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all cursor-pointer disabled:opacity-40"
              style={{ background: clinicFormDirty ? TEAL : '#94a3b8' }}>
              {profileSaving ? 'Saving...' : 'Save Clinic Info'}
            </button>
            <button onClick={() => { setClinicFormDirty(false); setClinicForm({ clinic_name: profile?.clinic_name || '', gst_number: profile?.gst_number || '', clinic_phone: profile?.clinic_phone || '', clinic_email: profile?.clinic_email || '' }); }} className="px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Address Book (Flipkart-style Cards & Spacing)
  const renderAddresses = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Address Book" subtitle="Manage your clinical shipping addresses." />
        {!showAddressForm && (
          <button
            onClick={() => { resetAddressForm(); setShowAddressForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-[#004b52] cursor-pointer"
            style={{ background: TEAL }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Address
          </button>
        )}
      </div>

      {/* Address Form */}
      {showAddressForm && (
        <div className="bg-white rounded-2xl border border-[#005B63]/30 shadow-md p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{editingAddress ? 'Edit Address' : 'Add New Shipping Location'}</h3>
            <button onClick={resetAddressForm} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              { key: 'label', label: 'Address Label (e.g. Clinic, Lab, Head Office)', placeholder: 'e.g. Primary Clinic' },
              { key: 'full_name', label: 'Dentist / Contact Name', placeholder: 'Dr. Jane Smith' },
              { key: 'mobile', label: '10-Digit Mobile Number', placeholder: '9876543210' },
              { key: 'line1', label: 'Street Address, Clinic Suite (Min 5 chars)', placeholder: 'Flat 101, Main Road, Medical Complex' },
              { key: 'line2', label: 'Area, Landmark (Optional)', placeholder: 'Opp. Central Metro Station' },
              { key: 'city', label: 'City', placeholder: 'Mumbai' },
              { key: 'state', label: 'State / Union Territory', placeholder: 'Select State' },
              { key: 'pincode', label: '6-Digit Pincode', placeholder: '400001' },
            ] as const).map(f => (
              <div key={f.key} className={f.key === 'line1' || f.key === 'line2' ? 'md:col-span-2' : ''}>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">{f.label}</label>
                {f.key === 'state' ? (
                  <div className="relative">
                    <select
                      value={addressForm.state || ''}
                      onChange={e => setAddressForm(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full appearance-none px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63] focus:ring-2 focus:ring-[#005B63]/10 transition-all"
                    >
                      <option value="">— Select State / UT —</option>
                      {INDIAN_STATES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                ) : (
                  <input
                    type={f.key === 'mobile' || f.key === 'pincode' ? 'tel' : 'text'}
                    maxLength={f.key === 'pincode' ? 6 : f.key === 'mobile' ? 10 : 255}
                    placeholder={f.placeholder}
                    value={(addressForm as any)[f.key] || ''}
                    onChange={e => {
                      const val = (f.key === 'pincode' || f.key === 'mobile')
                        ? e.target.value.replace(/\D/g, '')
                        : e.target.value;
                      setAddressForm(prev => ({ ...prev, [f.key]: val }));
                    }}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63] focus:ring-2 focus:ring-[#005B63]/10 transition-all"
                  />
                )}
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Address Type</label>
              <div className="relative">
                <select
                  value={addressForm.address_type || 'both'}
                  onChange={e => setAddressForm(prev => ({ ...prev, address_type: e.target.value as any }))}
                  className="w-full appearance-none px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63] transition-all"
                >
                  <option value="both">Shipping &amp; Billing Location</option>
                  <option value="shipping">Shipping Only</option>
                  <option value="billing">Billing Only</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 md:mt-0">
              <input
                type="checkbox" id="is_default"
                checked={!!addressForm.is_default}
                onChange={e => setAddressForm(prev => ({ ...prev, is_default: e.target.checked }))}
                className="w-4 h-4 rounded text-[#005B63] focus:ring-[#005B63] accent-[#005B63]"
              />
              <label htmlFor="is_default" className="text-xs font-bold text-slate-600 cursor-pointer select-none">Set as primary default address</label>
            </div>
          </div>
          <div className="flex gap-3 pt-3 border-t border-slate-50">
            <button onClick={handleSaveAddress} disabled={addressSaving}
              className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all cursor-pointer"
              style={{ background: TEAL }}>
              {addressSaving ? 'Saving...' : editingAddress ? 'Update Location' : 'Save Address'}
            </button>
            <button onClick={resetAddressForm} className="px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Addresses List */}
      {addressLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <SkeletonBlock key={i} className="h-32" />)}
        </div>
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={<MapPin className="w-8 h-8" />}
          title="No Delivery Locations"
          subtitle="Add your clinical practices to streamline professional checkout."
          action={
            <button onClick={() => setShowAddressForm(true)} className="px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white cursor-pointer hover:bg-[#004b52]" style={{ background: TEAL }}>
              Add Practice Location
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {addresses.map(addr => (
            <div 
              key={addr.id} 
              className={`bg-white rounded-2xl border flex flex-col justify-between overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 ${
                addr.is_default ? 'border-[#005B63] ring-1 ring-[#005B63]/10' : 'border-slate-100'
              }`}
            >
              {/* Header card info */}
              <div className="p-5">
                <div className="flex items-center justify-between gap-3 mb-3.5">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[#E6F2F2] text-[#005B63] border border-[#005B63]/10 font-sans">
                    {addr.label || 'Clinic'}
                  </span>
                  {addr.is_default && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#005B63] text-white font-sans">
                      Primary Default
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-black text-slate-800">{addr.full_name}</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                <p className="text-xs text-slate-500">{addr.city}, {addr.state} – {addr.pincode}</p>
                <p className="text-xs font-semibold text-slate-700 mt-2 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {addr.mobile}</p>
              </div>

              {/* Action buttons footer (Flipkart-style) */}
              <div className="border-t border-slate-100 bg-slate-50/50 grid grid-cols-3 divide-x divide-slate-100">
                <button onClick={() => startEditAddress(addr)} className="py-2.5 text-center text-[10px] font-extrabold uppercase tracking-wider text-[#005B63] hover:bg-[#E6F2F2]/40 transition-colors cursor-pointer flex items-center justify-center gap-1">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                {!addr.is_default ? (
                  <button onClick={() => handleSetDefault(addr.id)} className="py-2.5 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-[#E6F2F2]/40 transition-colors cursor-pointer flex items-center justify-center gap-1">
                    <Check className="w-3 h-3" /> Set Default
                  </button>
                ) : (
                  <div className="py-2.5 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-300 select-none flex items-center justify-center gap-1">
                    <Check className="w-3 h-3 text-[#005B63]" /> Defaulted
                  </div>
                )}
                <button onClick={() => handleDeleteAddress(addr.id)} className="py-2.5 text-center text-[10px] font-extrabold uppercase tracking-wider text-rose-500 hover:bg-rose-50/60 transition-colors cursor-pointer flex items-center justify-center gap-1">
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // My Orders
  const renderOrders = () => {
    if (selectedOrderId) {
      return (
        <OrderDetailPage
          orderId={selectedOrderId}
          onBack={() => {
            setSelectedOrderId(null);
            fetchUserOrders();
          }}
          onProductClick={(slug) => {
            onProductClick(slug);
          }}
          showToast={showToast}
        />
      );
    }

    const handleReorder = (orderToReorder: any) => {
      setCartItems(prev => {
        const updated = [...prev];
        orderToReorder.items.forEach((newItem: any) => {
          const existIdx = updated.findIndex(c => c.id === newItem.product_slug);
          if (existIdx > -1) {
            updated[existIdx].qty += newItem.quantity;
          } else {
            updated.push({
              id: newItem.product_slug,
              name: newItem.product_name,
              price: Number(newItem.price),
              qty: newItem.quantity,
              image: newItem.image_url || '',
              category: ''
            });
          }
        });
        return updated;
      });
      showToast('Items added to Cart');
      setCurrentView('cart');
    };

    return (
      <div className="space-y-6 text-left">
        <SectionHeader title="My Orders" subtitle="Manage, track, and download invoices for clinical products." />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <input 
              type="text" 
              placeholder="Search by Order ID or Product Name..." 
              value={orderSearch}
              onChange={e => {
                setOrderSearch(e.target.value);
                setOrdersPage(1);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  fetchUserOrders();
                }
              }}
              className="w-full pl-4 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.01)]" 
            />
          </div>
          <div className="relative flex gap-2">
            <button
              onClick={() => fetchUserOrders()}
              className="px-4 py-2.5 bg-[#005B63] text-white rounded-xl text-xs font-bold hover:bg-[#004b52] cursor-pointer"
            >
              Search
            </button>
            <div className="relative">
              <select 
                value={orderFilter} 
                onChange={e => {
                  setOrderFilter(e.target.value as any);
                  setOrdersPage(1);
                }}
                className="appearance-none px-4 pr-10 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-[#005B63] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
              >
                <option value="all">Filter: All Statuses</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="processing">Processing</option>
                <option value="packed">Packed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {ordersLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <SkeletonBlock key={i} className="h-32" />)}
          </div>
        ) : userOrders.length === 0 ? (
          <EmptyState 
            icon={<Package className="w-8 h-8" />} 
            title="No Procurement Records Found"
            subtitle={ordersTotal === 0 ? "You have not placed any orders yet." : "No orders match your criteria."}
            action={ordersTotal === 0 ? <button onClick={() => setCurrentView('portfolio')} className="px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white cursor-pointer hover:bg-[#004b52] transition-colors" style={{ background: TEAL }}>Explore Catalog</button> : undefined}
          />
        ) : (
          <div className="space-y-5">
            {userOrders.map(order => (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-300">
                <div className="p-4 border-b border-slate-50 bg-slate-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Order Reference</span>
                    <p className="text-xs font-black text-slate-800 hover:text-[#005B63] cursor-pointer hover:underline" onClick={() => setSelectedOrderId(order.id)}>
                      {order.order_number || `#${order.id}`}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(order.created_at).toLocaleDateString('en-IN')} · {order.payment_method}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                      order.status === 'delivered' ? 'text-emerald-700 bg-emerald-50 border-emerald-25' :
                      order.status === 'cancelled' ? 'text-rose-700 bg-rose-50 border-rose-25' :
                      order.status === 'processing' ? 'text-amber-700 bg-amber-50 border-amber-25' :
                      'text-slate-700 bg-slate-50 border-slate-200'
                    }`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <span className="text-sm font-black text-slate-800">₹{order.total_amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-50">
                  {order.items.map((item: any) => {
                    const isWarrantyEligible = item.product_name.toLowerCase().includes('handpiece') || item.product_name.toLowerCase().includes('scaler') || item.product_name.toLowerCase().includes('light') || item.product_name.toLowerCase().includes('motor');
                    return (
                      <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                        <div className="flex items-center gap-4">
                          {item.image_url ? (
                            <img src={`http://localhost:8000${item.image_url}`} alt={item.product_name} className="w-14 h-14 object-contain bg-slate-50 border border-slate-100 rounded-xl p-1.5 shrink-0" />
                          ) : (
                            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0 text-slate-400">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-black text-slate-800 hover:text-[#005B63] transition-colors cursor-pointer" onClick={() => onProductClick(item.product_slug)}>{item.product_name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Qty: {item.quantity} · Unit Price: ₹{item.price.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button onClick={() => setSelectedOrderId(order.id)} className="text-[10px] font-extrabold uppercase tracking-wider border border-slate-200 hover:border-[#005B63] hover:text-[#005B63] transition-colors px-3 py-1.5 rounded-lg text-slate-500 cursor-pointer">
                            Track / View
                          </button>
                          {isWarrantyEligible && (
                            <button 
                              onClick={() => {
                                setWarrantyOrderId(order.id);
                                setWarrantyProductId(item.id);
                                setShowWarrantyForm(true);
                                setActiveSection('warranty');
                              }}
                              className="text-[10px] font-extrabold uppercase tracking-wider bg-[#E6F2F2] text-[#005B63] border border-[#005B63]/10 hover:bg-[#005B63] hover:text-white transition-colors px-3 py-1.5 rounded-lg cursor-pointer"
                            >
                              Register Warranty
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="px-4 py-3 flex flex-wrap gap-4 bg-slate-50/20 border-t border-slate-50">
                  <button onClick={() => handleReorder(order)} className="flex items-center gap-1.5 text-[10px] font-black text-[#005B63] hover:underline uppercase tracking-wide cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5" /> Reorder
                  </button>
                  <button onClick={() => setSelectedOrderId(order.id)} className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 hover:text-slate-700 uppercase tracking-wide cursor-pointer ml-auto">
                    <FileText className="w-3.5 h-3.5" /> Tax Invoice
                  </button>
                  <button 
                    onClick={() => { setSupportOrderId(order.id); setIsCreatingTicket(true); setActiveSection('support'); }}
                    className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 hover:text-slate-700 uppercase tracking-wide cursor-pointer"
                  >
                    <HeadphonesIcon className="w-3.5 h-3.5" /> Need Help
                  </button>
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {ordersTotal > ordersPageSize && (
              <div className="flex justify-between items-center pt-4 font-sans text-xs">
                <button
                  disabled={ordersPage === 1}
                  onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                  className="px-3.5 py-2 border border-slate-200 rounded-lg disabled:opacity-40 hover:border-slate-350 bg-white"
                >
                  Previous
                </button>
                <span className="text-slate-400 font-bold">
                  Page {ordersPage} of {Math.ceil(ordersTotal / ordersPageSize)}
                </span>
                <button
                  disabled={ordersPage >= Math.ceil(ordersTotal / ordersPageSize)}
                  onClick={() => setOrdersPage(p => p + 1)}
                  className="px-3.5 py-2 border border-slate-200 rounded-lg disabled:opacity-40 hover:border-slate-350 bg-white"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Wishlist
  const renderWishlist = () => {
    const handleRemove = (id: string) => setWishlistItems(prev => prev.filter(i => i.id !== id));
    const handleAddToCart = (item: CartItem) => {
      setCartItems(prev => {
        if (prev.some(c => c.id === item.id)) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
        return [...prev, { ...item, qty: 1 }];
      });
      setWishlistItems(prev => prev.filter(w => w.id !== item.id));
      fireToast('Moved to Cart!');
    };

    return (
      <div className="space-y-6">
        <SectionHeader title={`Wishlist (${wishlistItems.length})`} subtitle="Dental items saved for quick purchase ordering." />
        {wishlistItems.length === 0 ? (
          <EmptyState icon={<Heart className="w-8 h-8 text-rose-400" />} title="Your Wishlist is Empty"
            subtitle="Save dental supplies or equipment by tapping the heart icon on any product."
            action={<button onClick={() => setCurrentView('portfolio')} className="px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white cursor-pointer hover:bg-[#004b52]" style={{ background: TEAL }}>Browse Products</button>}
          />
        ) : (
          <div className="space-y-4">
            {wishlistItems.map(item => {
              const originalPrice = item.originalPrice || Math.round(item.price * 1.25);
              const disc = Math.round(((originalPrice - item.price) / originalPrice) * 100);
              return (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] p-4 flex flex-col sm:flex-row gap-4 items-center hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] transition-all duration-300">
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-contain bg-slate-50 rounded-xl border border-slate-100 p-1.5 shrink-0 cursor-pointer" onClick={() => onProductClick(item.id)} />
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <p className="text-xs font-black text-slate-800 truncate cursor-pointer hover:text-[#005B63] transition-colors" onClick={() => onProductClick(item.id)}>{item.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.category || 'Clinical Supplies'}</p>
                    <div className="flex items-baseline justify-center sm:justify-start gap-2 mt-1">
                      <span className="text-sm font-black text-slate-900">₹{item.price.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-slate-300 line-through">₹{originalPrice.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] font-bold text-emerald-600">({disc}% OFF)</span>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:flex-col shrink-0 w-full sm:w-auto justify-center">
                    <button onClick={() => handleAddToCart(item)} className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-white cursor-pointer" style={{ background: TEAL }}>
                      <ShoppingCart className="w-3.5 h-3.5" /> Order
                    </button>
                    <button onClick={() => handleRemove(item.id)} className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-rose-500 border border-rose-100 hover:bg-rose-50 transition-colors cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" /> Drop
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Warranty (Order-Driven, Register from Purchased List)
  const renderWarranty = () => {
    // Generate options of warranty-eligible items from orders
    const eligibleProducts = orders.flatMap(o => 
      o.items.map(item => ({
        orderId: o.id,
        orderDate: o.date,
        item: item
      }))
    );

    return (
      <div className="space-y-6">
        <SectionHeader title="Warranty Book" subtitle="View clinical asset status. Warranties are registered directly from orders." />

        {/* Register CTA / Selector Form */}
        {showWarrantyForm ? (
          <div className="bg-white rounded-2xl border border-[#005B63]/30 shadow-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Register Equipment Warranty</h3>
              <button onClick={() => setShowWarrantyForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            {eligibleProducts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No warranty-eligible equipment purchases found in your order history.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Select Purchased Product</label>
                  <div className="relative">
                    <select
                      value={`${warrantyOrderId}|${warrantyProductId}`}
                      onChange={e => {
                        const [oid, pid] = e.target.value.split('|');
                        setWarrantyOrderId(oid);
                        setWarrantyProductId(pid);
                      }}
                      className="w-full appearance-none px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63]"
                    >
                      <option value="">— Select Product —</option>
                      {eligibleProducts.map((p, idx) => (
                        <option key={idx} value={`${p.orderId}|${p.item.id}`}>
                          Order #{p.orderId} ({p.orderDate}) — {p.item.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Manufacturer Serial Number</label>
                    <input
                      type="text"
                      placeholder="e.g. NSK-FX205-XXXXX"
                      value={warrantySerial}
                      onChange={e => setWarrantySerial(e.target.value.toUpperCase())}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#005B63]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Installation Date</label>
                    <input
                      type="date"
                      value={warrantyDate}
                      onChange={e => setWarrantyDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#005B63]"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button onClick={handleWarrantyRegister} className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white cursor-pointer" style={{ background: TEAL }}>
                    Confirm Activation
                  </button>
                  <button onClick={() => setShowWarrantyForm(false)} className="px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-200 text-slate-500 cursor-pointer">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#E6F2F2]/40 rounded-2xl border border-[#005B63]/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-black text-[#005B63] uppercase tracking-wider">New Device Warranty Registration</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-lg leading-relaxed">Purchased clinic handpieces, scalers, or imaging systems require active manufacturer serial numbers to lock warranty timelines.</p>
            </div>
            <button onClick={() => setShowWarrantyForm(true)} className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shrink-0 hover:bg-[#004b52] cursor-pointer" style={{ background: TEAL }}>
              Add Warranty
            </button>
          </div>
        )}

        {/* Registered Warranties List */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] overflow-hidden">
          <div className="p-4 border-b border-slate-50">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Active Clinical Assets ({registeredWarranties.length})</h3>
          </div>
          {registeredWarranties.length === 0 ? (
            <EmptyState icon={<Shield className="w-8 h-8 text-slate-300" />} title="No Registered Equipment" subtitle="Products under warranty list will display here." />
          ) : (
            <div className="divide-y divide-slate-50">
              {registeredWarranties.map(item => (
                <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img src={item.image} alt={item.productName} className="w-12 h-12 object-contain bg-slate-50 border border-slate-100 rounded-lg p-1" />
                    <div>
                      <h4 className="text-xs font-black text-slate-800">{item.productName}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">S/N: {item.serialNumber} · Order ID: #{item.orderId}</p>
                      <p className="text-[10px] text-slate-400">Registered on: {item.registrationDate}</p>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
                      Active Coverage
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">Expires: {item.expiryDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Support (Transactional Flow wizard)
  const renderSupport = () => {
    const selectedOrderData = orders.find(o => o.id === supportOrderId);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <SectionHeader title="Support Tickets" subtitle="Report issues linked to specific orders, items, or deliveries." />
          {!isCreatingTicket && (
            <button
              onClick={() => { setSupportOrderId(''); setSupportProductId(''); setIsCreatingTicket(true); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-[#004b52]"
              style={{ background: TEAL }}
            >
              <Plus className="w-3.5 h-3.5" /> File Ticket
            </button>
          )}
        </div>

        {/* Wizard Form */}
        {isCreatingTicket ? (
          <div className="bg-white rounded-2xl border border-[#005B63]/30 shadow-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Raise Procurement Support Ticket</h3>
              <button onClick={() => setIsCreatingTicket(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              {/* Step 1: Select Order */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">1. Select Reference Order</label>
                <div className="relative">
                  <select
                    value={supportOrderId}
                    onChange={e => { setSupportOrderId(e.target.value); setSupportProductId(''); }}
                    className="w-full appearance-none px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63]"
                  >
                    <option value="">— General / Account Inquiry —</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>Order #{o.id} ({o.date}) — ₹{o.total.toLocaleString()}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Step 2: Select Product (only if order selected) */}
              {supportOrderId && selectedOrderData && (
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">2. Select Reference Product</label>
                  <div className="relative">
                    <select
                      value={supportProductId}
                      onChange={e => setSupportProductId(e.target.value)}
                      className="w-full appearance-none px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63]"
                    >
                      <option value="">— Entire Order Inquiry —</option>
                      {selectedOrderData.items.map(item => (
                        <option key={item.id} value={item.id}>{item.name} (Qty: {item.qty})</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Step 3: Category */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">3. Issue Category</label>
                <div className="relative">
                  <select
                    value={supportCategory}
                    onChange={e => setSupportCategory(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63]"
                  >
                    <option value="Damaged Item">Damaged Item Received</option>
                    <option value="Wrong Item">Wrong Item Delivered</option>
                    <option value="Delay in Delivery">Delivery Delay Query</option>
                    <option value="Setup & Demo Request">Equipment Setup &amp; Demonstration Request</option>
                    <option value="Warranty Claim">Warranty Claim Inquiry</option>
                    <option value="Payment Issue">Payment &amp; Refund issue</option>
                    <option value="Other">Other Query</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Step 4: Describe */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">4. Describe the Issue</label>
                <textarea
                  rows={4}
                  placeholder="Explain details of the query so our clinical helpdesk team can investigate immediately..."
                  value={supportDescription}
                  onChange={e => setSupportDescription(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63] resize-none"
                />
              </div>

              {/* Step 5: Upload image placeholder */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">5. Attachment Photos (Optional)</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-[#005B63] rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-semibold">Click to upload photos of damaged / incorrect items</p>
                  <p className="text-[10px] text-slate-300 mt-0.5">PNG, JPG up to 5MB</p>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button onClick={handleSupportSubmit} className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white cursor-pointer" style={{ background: TEAL }}>
                  Submit Ticket
                </button>
                <button onClick={() => setIsCreatingTicket(false)} className="px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-200 text-slate-500 cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : selectedTicket ? (
          /* Ticket details dialogue modal */
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Ticket Reference</span>
                <h3 className="text-sm font-black text-slate-800">{selectedTicket.id}</h3>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-[10px] font-bold border border-slate-200 px-3 py-1 rounded-lg text-slate-500 hover:bg-slate-50">Back to List</button>
            </div>
            <div>
              <p className="text-xs text-slate-400">Subject: <span className="font-semibold text-slate-700">{selectedTicket.subject}</span></p>
              <p className="text-xs text-slate-400 mt-0.5">Category: <span className="font-semibold text-slate-700">{selectedTicket.category}</span></p>
              <p className="text-xs text-slate-400">Linked Order: <span className="font-semibold text-slate-700">#{selectedTicket.orderId}</span></p>
            </div>
            
            {/* Conversation Log */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3 max-h-60 overflow-y-auto">
              {selectedTicket.messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-xl max-w-xs text-xs font-semibold ${m.sender === 'user' ? 'bg-[#005B63] text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'}`}>
                    <p>{m.text}</p>
                  </div>
                  <span className="text-[8px] text-slate-400 mt-1">{m.date}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Tickets List */
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] overflow-hidden">
            <div className="p-4 border-b border-slate-50">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Ticket History</h3>
            </div>
            {supportTickets.length === 0 ? (
              <EmptyState icon={<Ticket className="w-8 h-8" />} title="No Tickets Filed" subtitle="Your support queries history will be tracked here." />
            ) : (
              <div className="divide-y divide-slate-50">
                {supportTickets.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => setSelectedTicket(t)}
                    className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/40 cursor-pointer transition-colors"
                  >
                    <div>
                      <h4 className="text-xs font-black text-slate-800">{t.subject}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Reference ID: {t.id} · Filed: {t.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                        t.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {t.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Security (Verification statuses, devices session control)
  const renderSecurity = () => (
    <div className="space-y-6">
      <SectionHeader title="Security Controls" subtitle="Manage practitioner credentials and active sessions." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Email verification card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] p-5 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user?.is_email_verified ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
              {user?.is_email_verified ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">Email Verification</h4>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{user?.email}</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${user?.is_email_verified ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'} font-sans`}>
              {user?.is_email_verified ? 'Verified' : 'Pending Verification'}
            </span>
            {!user?.is_email_verified && (
              <button onClick={handleResendVerification} disabled={emailResent} className="text-[10px] font-black uppercase tracking-widest text-[#005B63] hover:underline cursor-pointer font-sans">
                {emailResent ? 'Sent ✓' : 'Send Verification'}
              </button>
            )}
          </div>
        </div>

        {/* Phone Verification */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] p-5 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user?.is_phone_verified ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">OTP Phone Authentication</h4>
              <p className="text-[11px] text-slate-400">{user?.phone_number || profileForm.phone_number || 'Not Linked'}</p>
            </div>
          </div>

          {phoneOtpSent ? (
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Enter 6-Digit OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={phoneOtpCode}
                  onChange={e => setPhoneOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-850 bg-white focus:outline-none focus:border-[#005B63] tracking-widest"
                />
              </div>

              {phoneOtpError && <p className="text-[10px] text-rose-500 font-semibold">{phoneOtpError}</p>}
              {phoneOtpSuccess && <p className="text-[10px] text-emerald-600 font-semibold">{phoneOtpSuccess}</p>}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResendPhoneOtp}
                  disabled={phoneOtpCooldown > 0 || phoneOtpLoading}
                  className={`text-[9px] font-black uppercase tracking-widest ${phoneOtpCooldown > 0 ? 'text-slate-300' : 'text-[#005B63] hover:underline'} cursor-pointer bg-transparent border-none`}
                >
                  {phoneOtpCooldown > 0 ? `Resend in ${phoneOtpCooldown}s` : 'Resend OTP'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setPhoneOtpSent(false); setPhoneOtpCode(''); setPhoneOtpError(null); setPhoneOtpSuccess(null); }}
                    className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyPhoneOtp}
                    disabled={phoneOtpLoading || phoneOtpCode.length !== 6}
                    className="px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white cursor-pointer"
                    style={{ background: TEAL }}
                  >
                    {phoneOtpLoading ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${user?.is_phone_verified ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'} font-sans`}>
                {user?.is_phone_verified ? 'Verified' : 'Pending Verification'}
              </span>
              {!user?.is_phone_verified && (user?.phone_number || profileForm.phone_number) && (
                <button
                  type="button"
                  onClick={handleSendPhoneOtp}
                  disabled={phoneOtpLoading}
                  className="text-[10px] font-black uppercase tracking-widest text-[#005B63] hover:underline cursor-pointer font-sans bg-transparent border-none"
                >
                  {phoneOtpLoading ? 'Sending...' : 'Verify Phone'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Change Password Form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] p-6 space-y-4">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Change Password</h3>
        {([
          { key: 'old_password', label: 'Current Password', show: showOld, setShow: setShowOld },
          { key: 'new_password', label: 'New Password', show: showNew, setShow: setShowNew },
          { key: 'confirm_password', label: 'Confirm New Password', show: showNew, setShow: setShowNew },
        ] as const).map(f => (
          <div key={f.key}>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">{f.label}</label>
            <div className="relative">
              <input
                type={f.show ? 'text' : 'password'}
                value={(securityForm as any)[f.key]}
                onChange={e => setSecurityForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-4 pr-11 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63] transition-all"
              />
              <button type="button" onClick={() => f.setShow(!f.show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
        <button onClick={savePassword} disabled={securitySaving} className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white cursor-pointer disabled:opacity-40" style={{ background: TEAL }}>
          {securitySaving ? 'Updating...' : 'Change Password'}
        </button>
      </div>

      {/* Device Sessions — Live Enterprise API */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Active Practitioner Sessions</h3>
          <button
            onClick={handleRevokeAllSessions}
            className="text-[9px] font-black text-rose-500 uppercase tracking-wider hover:underline cursor-pointer"
          >
            Logout All Devices
          </button>
        </div>

        {sessionsLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#005B63] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : liveDeviceSessions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs text-slate-400 font-medium">No active sessions found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {liveDeviceSessions.map((session) => {
              const isMobile = /mobile|android|iphone|ipad/i.test(session.user_agent || '');
              const lastActive = session.last_active_at
                ? new Date(session.last_active_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : '—';

              return (
                <div key={session.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {isMobile
                      ? <Smartphone className="w-5 h-5 text-slate-400 shrink-0" />
                      : <Globe className="w-5 h-5 text-slate-400 shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate max-w-[240px]">
                        {session.device_name || 'Unknown Device'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {session.ip_address ?? 'IP unknown'} · Last active: {lastActive}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border bg-emerald-50 text-emerald-600 border-emerald-100 font-sans">
                      Active
                    </span>
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="text-[9px] font-black text-rose-500 uppercase tracking-wider hover:underline cursor-pointer"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ─── Future-Ready Placeholders ───────────────────────────────────────────────
  const renderFuturePlaceholders = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8 border-t border-slate-100 pt-8">
      {/* Offers & Rewards Card */}
      <div className="bg-slate-50/50 rounded-2xl p-5 border border-dashed border-slate-200 flex items-start gap-4 hover:border-[#005B63]/25 transition-all group opacity-85">
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-[#E6F2F2] group-hover:text-[#005B63] transition-colors shrink-0">
          <Gift className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 font-sans">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">Offers &amp; Practice Rewards</h4>
            <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-wider font-extrabold">Soon</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Earn practitioner reward coins on equipment acquisitions and redeem diagnostic kit discount vouchers.</p>
        </div>
      </div>

      {/* Saved Corporate Payment Methods */}
      <div className="bg-slate-50/50 rounded-2xl p-5 border border-dashed border-slate-200 flex items-start gap-4 hover:border-[#005B63]/25 transition-all group opacity-85">
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-[#E6F2F2] group-hover:text-[#005B63] transition-colors shrink-0">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 font-sans">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">Corporate Payment Cards</h4>
            <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-wider font-extrabold">Soon</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Securely link clinic credits, corporate cards, or dental network accounts to accelerate checkouts.</p>
        </div>
      </div>

      {/* Dealer Business Credit */}
      <div className="bg-slate-50/50 rounded-2xl p-5 border border-dashed border-slate-200 flex items-start gap-4 hover:border-[#005B63]/25 transition-all group opacity-85">
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-[#E6F2F2] group-hover:text-[#005B63] transition-colors shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 font-sans">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">Dealer Bulk Credit Line</h4>
            <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-wider font-extrabold">Soon</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Unlock net-30 business billing terms, custom shipping corridors, and wholesale dental order catalogs.</p>
        </div>
      </div>

      {/* Advanced Alerts Settings */}
      <div className="bg-slate-50/50 rounded-2xl p-5 border border-dashed border-slate-200 flex items-start gap-4 hover:border-[#005B63]/25 transition-all group opacity-85">
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-[#E6F2F2] group-hover:text-[#005B63] transition-colors shrink-0">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 font-sans">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">WhatsApp &amp; SMS Dispatch Details</h4>
            <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-wider font-extrabold">Soon</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Direct instant messaging opt-ins for shipment dispatch tracking codes and warranty service alarms.</p>
        </div>
      </div>
    </div>
  );

  // ─── Render section ──────────────────────────────────────────────────────────
  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':    return renderDashboard();
      case 'profile':      return renderProfile();
      case 'clinic':       return renderClinic();
      case 'addresses':    return renderAddresses();
      case 'orders':       return renderOrders();
      case 'wishlist':     return renderWishlist();
      case 'warranty':     return renderWarranty();
      case 'support':      return renderSupport();
      case 'security':     return renderSecurity();
      case 'dealer-status': return renderDealerStatus();
      default:             return renderDashboard();
    }
  };

  // ─── Dealer Application Status Section ───
  const renderDealerStatus = () => {
    if (dealerAppLoading) {
      return (
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-slate-100 rounded-xl w-48" />
          <div className="h-32 bg-slate-100 rounded-2xl" />
          <div className="h-48 bg-slate-100 rounded-2xl" />
        </div>
      );
    }

    const status = dealerApp?.status ?? user?.dealer_status ?? 'pending';
    const statusLabels = {
      pending: { color: 'text-amber-700 bg-amber-50 border-amber-200', label: 'Pending Review', desc: 'Your application is under manual verification.' },
      approved: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: 'Approved & Active', desc: 'All dealer pricing and procurement features are active.' },
      rejected: { color: 'text-rose-700 bg-rose-50 border-rose-200', label: 'Rejected', desc: 'Please review the rejection reason and contact support.' },
    };
    const currentStatus = statusLabels[status as keyof typeof statusLabels] || statusLabels.pending;

    return (
      <div className="space-y-6">
        <SectionHeader title="Dealer Application Status" subtitle="View and track your B2B dealer registration status." />

        {/* Status card */}
        <div className={`p-5 rounded-2xl border ${currentStatus.color} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">Application Lifecycle Status</span>
            <h3 className="text-sm font-black uppercase tracking-wider">{currentStatus.label}</h3>
            <p className="text-xs opacity-90">{currentStatus.desc}</p>
          </div>
          <button
            onClick={() => { setCurrentView('dealer-portal'); window.scrollTo(0, 0); }}
            className="px-5 py-2.5 bg-white text-xs font-black uppercase tracking-widest rounded-xl shadow-xs border border-current hover:bg-slate-50 transition-colors shrink-0"
          >
            Open Dealer Portal
          </button>
        </div>

        {status === 'rejected' && dealerApp?.rejection_reason && (
          <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl space-y-2">
            <h4 className="text-xs font-black text-rose-800 uppercase tracking-wider">Rejection Reason</h4>
            <p className="text-xs text-rose-700 font-semibold">"{dealerApp.rejection_reason}"</p>
            <p className="text-[10px] text-slate-400 font-medium">Please verify your documents, tax credentials, and practice registration licenses and re-submit or get in touch with our dealer management desk.</p>
          </div>
        )}

        {/* Company & application detail */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] p-5 space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#005B63] pb-3 border-b border-slate-100">B2B Business Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Company Name</span>
              <p className="text-xs font-bold text-slate-800 mt-1">{dealerApp?.company_name || 'Not provided'}</p>
            </div>
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">GST Number</span>
              <p className="text-xs font-bold text-slate-800 mt-1">{profile?.gst_number || 'Not Linked'}</p>
            </div>
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Application Date</span>
              <p className="text-xs font-bold text-slate-800 mt-1">
                {dealerApp?.created_at ? new Date(dealerApp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </p>
            </div>
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Review Date</span>
              <p className="text-xs font-bold text-slate-800 mt-1">
                {dealerApp?.reviewed_at ? new Date(dealerApp.reviewed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending Review'}
              </p>
            </div>
          </div>
        </div>

        {/* Documents status */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] p-5 space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#005B63] pb-3 border-b border-slate-100">Uploaded Verification Documents</h3>
          {dealerApp?.documents && dealerApp.documents.length > 0 ? (
            <div className="space-y-3">
              {dealerApp.documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-700 truncate max-w-xs">{doc.name}</p>
                      <p className="text-[10px] text-slate-400">Verification Document</p>
                    </div>
                  </div>
                  {doc.document_url && (
                    <a
                      href={doc.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-black uppercase tracking-wider text-[#005B63] hover:underline"
                    >
                      View File
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : dealerApp?.document_url ? (
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-700">GST / Practice Registration Document</p>
                  <p className="text-[10px] text-slate-400">Uploaded at registration</p>
                </div>
              </div>
              <a
                href={dealerApp.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-black uppercase tracking-wider text-[#005B63] hover:underline"
              >
                View File
              </a>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No verification documents found. Please contact support.</p>
          )}
        </div>
      </div>
    );
  };

  // ─── Sidebar (Restructured Hierarchy) ────────────────────────────────────────
  const renderSidebar = (closeMobile?: () => void) => {
    const procurementItems = navItems.filter(n => n.group === 'procurement');
    const settingsItems = navItems.filter(n => n.group === 'settings');

    return (
      <div className="space-y-5 font-sans">
        {/* Profile Card Summary */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.01)] p-4 flex items-center gap-3">
          <div className="relative shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="w-11 h-11 rounded-full object-cover border border-slate-100" />
            ) : (
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-xs font-black" style={{ background: `linear-gradient(135deg, ${TEAL}, #00a3b0)` }}>
                {displayInitials}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-800 truncate">{displayName}</p>
            {profile?.clinic_name ? (
              <p className="text-[10px] text-slate-400 truncate max-w-[140px] font-bold">{profile.clinic_name}</p>
            ) : (
              <p className="text-[10px] text-[#005B63] font-bold">Clinical Account</p>
            )}
          </div>
        </div>

        {/* Navigation Blocks */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.01)] overflow-hidden py-3">
          {/* Block 1: Procurement */}
          <div className="mb-2">
            <span className="block px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 font-sans">My Procurement</span>
            <div className="space-y-0.5 mt-1">
              {procurementItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveSection(item.id); if (closeMobile) closeMobile(); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer text-left ${
                    activeSection === item.id
                      ? 'bg-[#E6F2F2]/60 text-[#005B63] border-l-4 border-[#005B63] pl-3'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-[#005B63]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Block 2: Account Settings */}
          <div>
            <span className="block px-4 py-1.5 mt-3 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 border-t border-slate-50 pt-3 font-sans">Account Settings</span>
            <div className="space-y-0.5 mt-1">
              {settingsItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveSection(item.id); if (closeMobile) closeMobile(); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer text-left ${
                    activeSection === item.id
                      ? 'bg-[#E6F2F2]/60 text-[#005B63] border-l-4 border-[#005B63] pl-3'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-[#005B63]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    {item.label}
                  </span>
                </button>
              ))}

              {/* Logout */}
              <button
                onClick={async () => { await logout(); setCurrentView('home'); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer border-t border-slate-50 mt-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Main layout ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full bg-[#f7fafa] min-h-screen pt-[62px] lg:pt-[180px] pb-24 font-sans select-none text-left">
      <Toast message={localToast} />

      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-[62px] left-0 right-0 z-30 bg-white border-b border-slate-100 px-4 py-2.5 flex items-center justify-between shadow-sm">
        <span className="text-xs font-black uppercase tracking-widest text-[#005B63]">
          {navItems.find(n => n.id === activeSection)?.label || 'Dashboard'}
        </span>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="flex items-center gap-1.5 text-xs font-bold border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 cursor-pointer hover:bg-slate-50 transition-all"
        >
          <User className="w-3.5 h-3.5" /> Options
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[90] flex">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative w-72 max-w-[85vw] bg-[#f7fafa] h-full overflow-y-auto p-4 shadow-2xl">
            <button onClick={() => setIsSidebarOpen(false)} className="mb-4 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button>
            {renderSidebar(() => setIsSidebarOpen(false))}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-14 lg:mt-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:col-span-3 sticky top-[140px]">
            {renderSidebar()}
          </div>

          {/* Main content pane */}
          <div className="lg:col-span-9">
            <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.015)]">
              {renderSection()}
              
              {/* Show future placeholders on the dashboard only */}
              {activeSection === 'dashboard' && renderFuturePlaceholders()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDashboard;
