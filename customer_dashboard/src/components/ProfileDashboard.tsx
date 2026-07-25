import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  User, Building2, MapPin, Package, Heart, Shield, HeadphonesIcon,
  Lock, LogOut, Camera, Pencil, Trash2, Plus,
  Check, X, ShoppingCart, FileText, Phone, Mail,
  AlertCircle, CheckCircle, RefreshCw, ShoppingBag,
  Ticket, Gift, ChevronDown, Upload, Eye, EyeOff,
  LayoutDashboard, CreditCard, Smartphone,
  Layers, Globe, ChevronRight, Handshake,
  Paperclip, Wrench, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usersService } from '../services/users';
import type { Address } from '../services/users';
import { warrantyService } from '../services/warranty';
import type { WarrantyRegistration, WarrantyClaim, ImportedProduct } from '../services/warranty';
import type { CartItem } from '../types/pendingAction';
import OrderDetailPage from './OrderDetailPage';

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
  setCurrentView: (view: 'home' | 'portfolio' | 'listing' | 'detail' | 'cart' | 'wishlist' | 'checkout' | 'order-success' | 'my-orders' | 'profile') => void;
  onProductClick: (id: string) => void;
  showToast: (message: string) => void;
  /** When set, automatically opens this order's detail view on mount */
  initialOrderId?: string | null;
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
    <div className={`fixed bottom-24 md:bottom-8 left-1/2 z-[200] text-white text-xs font-semibold uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-xl flex items-center gap-2.5 animate-toast-in border ${isWarning
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
  initialOrderId,
}) => {
  const { user, profile, logout, refreshUser, resendVerification } = useAuth();

  // ── Local state ──
  const [localToast, setLocalToast] = useState<string | null>(null);
  const [dealerApp, setDealerApp] = useState<any | null>(null);
  const [dealerAppLoading, setDealerAppLoading] = useState(false);

  useEffect(() => {
    if (activeSection === 'dealer-status' && user?.role === 'dealer') {
      const fetchDealerApp = async () => {
        setDealerAppLoading(true);
        try {
          const { dealerService } = await import('../services/dealer');
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
  const [supportCategory, setSupportCategory] = useState<string>('product_enquiry');
  const [supportSubject, setSupportSubject] = useState<string>('');
  const [supportPriority, setSupportPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [supportDescription, setSupportDescription] = useState<string>('');
  const [supportAttachment, setSupportAttachment] = useState<File | null>(null);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [submittingSupportTicket, setSubmittingSupportTicket] = useState(false);
  const [supportReplyText, setSupportReplyText] = useState('');
  const [supportReplyAttachment, setSupportReplyAttachment] = useState<File | null>(null);
  const [submittingSupportReply, setSubmittingSupportReply] = useState(false);

  // Warranty assets state
  const [registrations, setRegistrations] = useState<WarrantyRegistration[]>([]);
  const [importedProducts, setImportedProducts] = useState<ImportedProduct[]>([]);
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const fetchSupportTickets = useCallback(async () => {
    setSupportLoading(true);
    try {
      const { supportService } = await import('../services/support');
      const res = await supportService.getTickets();
      if (res.success && res.data) {
        setSupportTickets(res.data);
      }
    } catch (e) {
      console.error('[ProfileDashboard] Failed to fetch support tickets:', e);
    } finally {
      setSupportLoading(false);
    }
  }, []);

  const refreshSingleTicket = async (ticketId: string) => {
    try {
      const { supportService } = await import('../services/support');
      const res = await supportService.getTicket(ticketId);
      if (res.success && res.data) {
        setSelectedTicket(res.data);
        setSupportTickets(prev => prev.map(t => t.id === ticketId ? res.data : t));
      }
    } catch (e) {
      console.error('[ProfileDashboard] Failed to refresh ticket:', e);
    }
  };

  useEffect(() => {
    if (activeSection === 'support') {
      fetchSupportTickets();
    }
  }, [activeSection]);

  const [warrantiesLoading, setWarrantiesLoading] = useState(false);
  const [warrantySubTab, setWarrantySubTab] = useState<'active' | 'expired' | 'claims'>('active');

  // Claims creation form states
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimRegId, setClaimRegId] = useState('');
  const [claimDescription, setClaimDescription] = useState('');
  const [claimPriority, setClaimPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [claimInvoice, setClaimInvoice] = useState<File | null>(null);
  const [claimImages, setClaimImages] = useState<File[]>([]);
  const [claimVideo, setClaimVideo] = useState<File | null>(null);
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null);

  // Manual registration form states
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerRegId, setRegisterRegId] = useState('');
  const [registerSerial, setRegisterSerial] = useState('');
  const [registerInvoice, setRegisterInvoice] = useState<File | null>(null);
  const [registerNotes, setRegisterNotes] = useState('');
  const [submittingRegister, setSubmittingRegister] = useState(false);

  const fetchWarranties = useCallback(async () => {
    setWarrantiesLoading(true);
    try {
      const [regsRes, impRes, claimsRes] = await Promise.all([
        warrantyService.getRegistrations(),
        warrantyService.getImportedProducts(),
        warrantyService.getClaims()
      ]);
      if (regsRes.success && regsRes.data) setRegistrations(regsRes.data);
      if (impRes.success && impRes.data) setImportedProducts(impRes.data);
      if (claimsRes.success && claimsRes.data) setClaims(claimsRes.data);
    } catch { /* silent */ }
    finally { setWarrantiesLoading(false); }
  }, []);

  useEffect(() => {
    fetchWarranties();
  }, [fetchWarranties]);

  // Active Device log mock
  const [deviceSessions] = useState([
    { device: 'Chrome on Windows 11', location: 'Mumbai, India', status: 'active', time: 'Active Now' },
    { device: 'Safari on iPhone 15 Pro', location: 'Pune, India', status: 'logged-out', time: 'Last active: 2 hours ago' }
  ]);

  // Order Details / History loading state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const ordersPageSize = 10;

  // Auto-open order from success page navigation
  useEffect(() => {
    if (initialOrderId) {
      setSelectedOrderId(initialOrderId);
      setActiveSection('orders');
    }
  }, [initialOrderId, setActiveSection]);


  const fetchUserOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const { ordersService } = await import('../services/ordersService');
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
    setAddressSaving(true);
    try {
      if (editingAddress) {
        const res = await usersService.updateAddress(editingAddress.id, addressForm as any);
        if (res.success && res.data) {
          setAddresses(prev => prev.map(a => a.id === editingAddress.id ? res.data! : a));
          fireToast('Address updated!');
        }
      } else {
        const res = await usersService.createAddress(addressForm as any);
        if (res.success && res.data) {
          setAddresses(prev => [...prev, res.data!]);
          fireToast('Address added!');
        }
      }
      resetAddressForm();
    } catch { fireToast('Failed to save address.'); }
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
      fireToast('Password changed successfully!');
      setSecurityForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch { fireToast('Failed to change password.'); }
    finally { setSecuritySaving(false); }
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



  // ── Support ticket submit ──
  const handleSupportSubmit = async () => {
    if (!supportSubject.trim()) {
      fireToast('Please enter a subject.');
      return;
    }
    if (!supportDescription.trim()) {
      fireToast('Please enter a description.');
      return;
    }

    setSubmittingSupportTicket(true);
    try {
      const { supportService } = await import('../services/support');
      const formData = new FormData();
      formData.append('subject', supportSubject.trim());
      formData.append('category', supportCategory);
      formData.append('priority', supportPriority);
      formData.append('description', supportDescription.trim());
      if (supportOrderId) {
        formData.append('related_order', supportOrderId);
      }
      if (supportProductId) {
        formData.append('related_product', supportProductId);
      }
      if (supportAttachment) {
        formData.append('attachment', supportAttachment);
      }

      const res = await supportService.createTicket(formData);
      if (res.success && res.data) {
        setSupportTickets(prev => [res.data, ...prev]);
        setIsCreatingTicket(false);
        setSupportSubject('');
        setSupportDescription('');
        setSupportOrderId('');
        setSupportProductId('');
        setSupportAttachment(null);
        fireToast('Support ticket raised successfully!');
      } else {
        fireToast(res.message || 'Failed to submit ticket.');
      }
    } catch (e: any) {
      console.error(e);
      fireToast(e.response?.data?.error?.message || 'Failed to submit ticket.');
    } finally {
      setSubmittingSupportTicket(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'processing': return 'Processing';
      case 'shipped': return 'Shipped';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  // ── Grouped navigation hierarchy ──
  const navItems: { id: DashboardSection; label: string; icon: React.ReactNode; group: 'procurement' | 'settings' }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, group: 'procurement' },
    { id: 'orders', label: 'My Orders', icon: <Package className="w-4 h-4" />, group: 'procurement' },
    { id: 'wishlist', label: 'Wishlist', icon: <Heart className="w-4 h-4" />, group: 'procurement' },
    { id: 'addresses', label: 'Addresses', icon: <MapPin className="w-4 h-4" />, group: 'procurement' },
    { id: 'warranty', label: 'Warranty', icon: <Shield className="w-4 h-4" />, group: 'procurement' },
    { id: 'support', label: 'Support', icon: <HeadphonesIcon className="w-4 h-4" />, group: 'procurement' },

    { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" />, group: 'settings' },
    ...(user?.role === 'dealer' ? [
      { id: 'dealer-status' as DashboardSection, label: 'Dealer Status', icon: <Handshake className="w-4 h-4" />, group: 'settings' as const }
    ] : []),
    { id: 'clinic', label: 'Clinic Information', icon: <Building2 className="w-4 h-4" />, group: 'settings' },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" />, group: 'settings' },
  ];

  const displayName = user?.full_name || profile?.full_name || 'Doctor';
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
          <DashboardStatCard label="Active Warranties" value={registrations.filter(r => r.warranty_status === 'active').length} icon={<Shield className="w-5 h-5 text-emerald-600" />} color="bg-emerald-50" onClick={() => setActiveSection('warranty')} />
          <DashboardStatCard label="Open Support Tickets" value={supportTickets.filter(t => t.status === 'open' || t.status === 'in-progress').length} icon={<HeadphonesIcon className="w-5 h-5 text-indigo-500" />} color="bg-indigo-50" onClick={() => setActiveSection('support')} />
        </div>

        {/* Quick Actions (B2B E-commerce Journey) */}
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <QuickActionCard label="Continue Shopping" icon={<ShoppingBag className="w-5 h-5" />} onClick={() => { setCurrentView('portfolio'); }} />
            <QuickActionCard label="Track Orders" icon={<Package className="w-5 h-5" />} onClick={() => setActiveSection('orders')} />
            <QuickActionCard label="Warranty Book" icon={<Shield className="w-5 h-5" />} onClick={() => setActiveSection('warranty')} color={ORANGE} />
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
                  <button onClick={() => fireToast('Downloading invoice...')} className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-slate-700 uppercase tracking-wide cursor-pointer ml-auto">
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
              { key: 'mobile', label: '10-Digit Mobile Number', placeholder: '+91 98765 43210' },
              { key: 'line1', label: 'Street Address, Clinic Suite', placeholder: 'Flat 101, Main Road' },
              { key: 'line2', label: 'Area, Landmark (Optional)', placeholder: 'Opp. Central Metro Station' },
              { key: 'city', label: 'City', placeholder: 'Mumbai' },
              { key: 'state', label: 'State', placeholder: 'Maharashtra' },
              { key: 'pincode', label: 'Pincode', placeholder: '400001' },
            ] as const).map(f => (
              <div key={f.key} className={f.key === 'line1' || f.key === 'line2' ? 'md:col-span-2' : ''}>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">{f.label}</label>
                <input
                  type="text" placeholder={f.placeholder}
                  value={(addressForm as any)[f.key] || ''}
                  onChange={e => setAddressForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63] focus:ring-2 focus:ring-[#005B63]/10 transition-all"
                />
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
              className={`bg-white rounded-2xl border flex flex-col justify-between overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 ${addr.is_default ? 'border-[#005B63] ring-1 ring-[#005B63]/10' : 'border-slate-100'
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
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${order.status === 'delivered' ? 'text-emerald-700 bg-emerald-50 border-emerald-25' :
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
                                setWarrantySubTab('expired');
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

  // ── Warranty Service API Integration Handlers ──
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerRegId) {
      fireToast('Please select a product.');
      return;
    }
    if (!registerInvoice) {
      fireToast('Purchase invoice document is required.');
      return;
    }

    setSubmittingRegister(true);
    try {
      const formData = new FormData();
      formData.append('invoice', registerInvoice);
      if (registerSerial) {
        formData.append('serial_number', registerSerial.trim());
      }
      if (registerNotes) {
        formData.append('notes', registerNotes.trim());
      }

      const res = await warrantyService.submitRegistration(registerRegId, formData);
      if (res.success) {
        fireToast('Warranty registration details submitted successfully. Awaiting verification.');
        setShowRegisterForm(false);
        setRegisterRegId('');
        setRegisterSerial('');
        setRegisterInvoice(null);
        setRegisterNotes('');
        fetchWarranties();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to submit registration. Verify files.';
      fireToast(msg);
    } finally {
      setSubmittingRegister(false);
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimRegId) {
      fireToast('Please select an active product.');
      return;
    }
    if (!claimDescription.trim()) {
      fireToast('Please describe the problem.');
      return;
    }

    setSubmittingClaim(true);
    try {
      const formData = new FormData();
      formData.append('registration', claimRegId);
      formData.append('description', claimDescription.trim());
      formData.append('priority', claimPriority);

      if (claimInvoice) {
        formData.append('invoice', claimInvoice);
      }
      claimImages.forEach(img => {
        formData.append('images', img);
      });
      if (claimVideo) {
        formData.append('video', claimVideo);
      }

      const res = await warrantyService.createClaim(formData);
      if (res.success) {
        fireToast('Warranty claim raised successfully.');
        setShowClaimForm(false);
        setClaimRegId('');
        setClaimDescription('');
        setClaimPriority('medium');
        setClaimInvoice(null);
        setClaimImages([]);
        setClaimVideo(null);
        fetchWarranties();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to submit claim. Verify file sizes.';
      fireToast(msg);
    } finally {
      setSubmittingClaim(false);
    }
  };

  const renderWarranty = () => {
    const activeRegs = registrations.filter(r => r.warranty_status === 'active');
    const pendingRegs = registrations.filter(r => 
      ['pending_registration', 'pending_verification', 'need_more_info', 'rejected'].includes(r.warranty_status)
    );

    const getRegistrationStatusBadge = (statusVal: string) => {
      switch (statusVal) {
        case 'pending_registration':
          return <span className="px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200">Pending Registration</span>;
        case 'pending_verification':
          return <span className="px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200">Awaiting Verification</span>;
        case 'need_more_info':
          return <span className="px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200">Need Info</span>;
        case 'rejected':
          return <span className="px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200">Rejected</span>;
        default:
          return <span className="px-2.5 py-0.5 rounded text-[9px] font-bold text-slate-500 bg-slate-50">{statusVal}</span>;
      }
    };

    const getStatusColor = (statusVal: string) => {
      switch (statusVal) {
        case 'submitted': return 'text-blue-700 bg-blue-50 border-blue-200';
        case 'under_review': return 'text-amber-700 bg-amber-50 border-amber-200';
        case 'need_more_info': return 'text-purple-700 bg-purple-50 border-purple-200';
        case 'approved': return 'text-indigo-700 bg-indigo-50 border-indigo-200';
        case 'assigned': return 'text-sky-700 bg-sky-50 border-sky-200';
        case 'repair_in_progress': return 'text-amber-800 bg-amber-100 border-amber-300';
        case 'completed': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
        case 'closed': return 'text-slate-700 bg-slate-100 border-slate-300';
        case 'rejected': return 'text-rose-700 bg-rose-50 border-rose-200';
        default: return 'text-slate-700 bg-slate-50 border-slate-200';
      }
    };

    const getPriorityColor = (priorityVal: string) => {
      switch (priorityVal) {
        case 'critical': return 'bg-rose-500 text-white';
        case 'high': return 'bg-orange-500 text-white';
        case 'medium': return 'bg-amber-500 text-white';
        default: return 'bg-slate-400 text-white';
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <SectionHeader title="Warranty Book" subtitle="Activate coverage and file mechanical claims on your clinical instruments." />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (activeRegs.length > 0) {
                  setClaimRegId(activeRegs[0].id);
                }
                setShowClaimForm(true);
              }}
              disabled={activeRegs.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#004b52] cursor-pointer shrink-0"
              style={{ background: TEAL }}
            >
              <Plus className="w-3.5 h-3.5" /> Raise Claim
            </button>
          </div>
        </div>

        {/* Sub-tabs Nav */}
        <div className="flex border-b border-slate-100 font-sans">
          <button
            onClick={() => setWarrantySubTab('active')}
            className={`px-4 py-3 text-[11px] font-black uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
              warrantySubTab === 'active'
                ? 'border-[#005B63] text-[#005B63]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Active Coverage ({activeRegs.length})
          </button>
          <button
            onClick={() => setWarrantySubTab('expired')}
            className={`px-4 py-3 text-[11px] font-black uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
              warrantySubTab === 'expired'
                ? 'border-[#005B63] text-[#005B63]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Pending Registrations ({pendingRegs.length})
          </button>
          <button
            onClick={() => setWarrantySubTab('claims')}
            className={`px-4 py-3 text-[11px] font-black uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
              warrantySubTab === 'claims'
                ? 'border-[#005B63] text-[#005B63]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Claims ({claims.length})
          </button>
        </div>

        {/* Main tabs content */}
        {warrantiesLoading ? (
          <div className="space-y-4">
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
          </div>
        ) : (
          <>
            {/* Active warranties tab */}
            {warrantySubTab === 'active' && (
              <div className="space-y-6">
                {/* Active FAAZO warranties */}
                {activeRegs.length === 0 ? (
                  <EmptyState icon={<Shield className="w-8 h-8 text-slate-300" />} title="No Active Coverage" subtitle="Warranties display here once registrations are verified and approved by admin." />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {activeRegs.map(reg => {
                      const totalDays = Math.max(1, Math.round((new Date(reg.warranty_end).getTime() - new Date(reg.warranty_start).getTime()) / (1000 * 60 * 60 * 24)));
                      const elapsed = Math.max(0, Math.round((Date.now() - new Date(reg.warranty_start).getTime()) / (1000 * 60 * 60 * 24)));
                      const pct = Math.max(0, Math.min(100, 100 - (elapsed / totalDays) * 100));

                      return (
                        <div key={reg.id} className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-5 space-y-4 hover:shadow-[0_8px_30px_rgba(0,91,99,0.05)] transition-all duration-300 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex gap-4 items-start">
                              <img
                                src={reg.product?.primary_image_url || '/images/Artboard 1@4x (1).png'}
                                alt={reg.product?.name}
                                className="w-12 h-12 object-contain bg-slate-50 border border-slate-100 p-1.5 rounded-lg shrink-0"
                              />
                              <div className="min-w-0">
                                <span className="text-[9px] font-black uppercase text-[#005B63] tracking-widest">{reg.product?.brand_name}</span>
                                <h4 className="text-xs font-black text-slate-800 leading-snug truncate">{reg.product?.name}</h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">S/N: {reg.serial_number || 'N/A'}</p>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[9px] font-extrabold uppercase tracking-widest">
                                <span className="text-slate-400">Coverage Duration</span>
                                <span className="text-[#005B63]">{reg.days_remaining} Days Left ({pct.toFixed(0)}%)</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full relative">
                                <div
                                  className="h-full rounded-full transition-all duration-1000"
                                  style={{
                                    background: pct < 15 ? ORANGE : TEAL,
                                    width: `${pct}%`
                                  }}
                                />
                              </div>
                            </div>

                            {/* Dates metadata */}
                            <div className="grid grid-cols-2 gap-3 py-1 text-[10px] border-t border-slate-50 mt-2 pt-2">
                              <div>
                                <span className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Delivered Date</span>
                                <span className="font-bold text-slate-600">{reg.purchase_date}</span>
                              </div>
                              <div>
                                <span className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Expiry Date</span>
                                <span className="font-bold text-slate-600">{reg.warranty_end}</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 mt-2">
                            <button
                              onClick={() => {
                                setClaimRegId(reg.id);
                                setShowClaimForm(true);
                              }}
                              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 border border-[#005B63] bg-[#E6F2F2]/20 hover:bg-[#E6F2F2]/40 rounded-xl text-[10px] font-black uppercase tracking-wider text-[#005B63] transition-colors"
                            >
                              <Wrench className="w-3.5 h-3.5" /> Raise Trouble Claim
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Gated Imported Brand Products section */}
                {importedProducts.length > 0 && (
                  <div className="pt-6 border-t border-slate-100 space-y-4 text-left">
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Imported Brands Warranty Directory</h3>
                    <p className="text-[11px] text-slate-400 max-w-2xl leading-relaxed">
                      For imported products (e.g. non-FAAZO manufactured brands), servicing operations and warranty registrations are handled directly on the manufacturers' portal using the official channels listed below.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {importedProducts.map(item => (
                        <div key={item.id} className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5 space-y-4 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex gap-4 items-start">
                              <img
                                src={item.primary_image_url || '/images/Artboard 1@4x (1).png'}
                                alt={item.product_name}
                                className="w-12 h-12 object-contain bg-white border border-slate-100 p-1.5 rounded-lg shrink-0"
                              />
                              <div className="min-w-0">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{item.brand_name}</span>
                                <h4 className="text-xs font-black text-slate-700 leading-snug truncate">{item.product_name}</h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">Order Ref: #{item.order_number}</p>
                              </div>
                            </div>

                            {/* Manufacturer info */}
                            <div className="space-y-2 pt-2 border-t border-slate-100 text-[10px]">
                              <div>
                                <span className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Coverage Duration</span>
                                <span className="font-bold text-slate-600">{item.warranty_months} Months</span>
                              </div>
                              {item.warranty_terms && (
                                <div>
                                  <span className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Warranty Policy Summary</span>
                                  <p className="text-slate-500 font-medium leading-relaxed">{item.warranty_terms}</p>
                                </div>
                              )}
                              {item.warranty_contact_details && (
                                <div>
                                  <span className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Support Contact Details</span>
                                  <p className="text-slate-500 font-medium whitespace-pre-line">{item.warranty_contact_details}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {item.warranty_website_url && (
                            <div className="pt-3">
                              <a
                                href={item.warranty_website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-1 px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 transition-colors"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" /> Register on Brand Website
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pending FAAZO warranty registrations tab */}
            {warrantySubTab === 'expired' && (
              pendingRegs.length === 0 ? (
                <EmptyState icon={<Shield className="w-8 h-8 text-slate-300" />} title="All Clear" subtitle="No pending registrations. All purchased FAAZO assets are active or fully completed." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {pendingRegs.map(reg => (
                    <div key={reg.id} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.015)]">
                      <div className="space-y-3">
                        <div className="flex gap-4 items-start justify-between">
                          <div className="flex gap-4 items-start min-w-0">
                            <img
                              src={reg.product?.primary_image_url || '/images/Artboard 1@4x (1).png'}
                              alt={reg.product?.name}
                              className="w-12 h-12 object-contain bg-slate-50 border border-slate-100 p-1.5 rounded-lg shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="text-[9px] font-black uppercase text-[#005B63] tracking-widest">{reg.product?.brand_name}</span>
                              <h4 className="text-xs font-black text-slate-800 leading-snug truncate">{reg.product?.name}</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">Purchased: {reg.purchase_date}</p>
                            </div>
                          </div>
                          {getRegistrationStatusBadge(reg.warranty_status)}
                        </div>

                        {/* Admin feedback notes for need_info / rejected */}
                        {reg.admin_notes && (
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px]">
                            <span className="block font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">Admin Review Notes</span>
                            <p className="text-slate-600 font-bold italic">"{reg.admin_notes}"</p>
                          </div>
                        )}
                      </div>

                      {/* Action button */}
                      {['pending_registration', 'need_more_info'].includes(reg.warranty_status) ? (
                        <button
                          onClick={() => {
                            setRegisterRegId(reg.id);
                            setRegisterSerial(reg.serial_number || '');
                            setShowRegisterForm(true);
                          }}
                          className="w-full py-2 bg-[#005B63] hover:bg-[#004b52] text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" /> Submit Warranty Registration
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full py-2 bg-slate-50 border border-slate-100 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider rounded-xl cursor-not-allowed"
                        >
                          Awaiting Review
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Claims tracking tab */}
            {warrantySubTab === 'claims' && (
              claims.length === 0 ? (
                <EmptyState icon={<Wrench className="w-8 h-8 text-slate-300" />} title="No Claims" subtitle="Raise claims under the Active Coverage tab." />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden font-sans">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                          <th className="p-4">Claim Ref</th>
                          <th className="p-4">Equipment</th>
                          <th className="p-4">Priority</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Date Raised</th>
                          <th className="p-4 text-right">Timeline</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {claims.map(claim => (
                          <tr key={claim.id} className="text-xs hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 font-black text-slate-800">{claim.claim_number}</td>
                            <td className="p-4">
                              <div className="font-bold text-slate-700 truncate max-w-[200px]">
                                {claim.registration_detail?.product?.name}
                              </div>
                              <span className="text-[10px] text-slate-400">S/N: {claim.registration_detail?.serial_number || 'N/A'}</span>
                            </td>
                            <td className="p-4">
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${getPriorityColor(claim.priority)}`}>
                                {claim.priority}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded border ${getStatusColor(claim.status)}`}>
                                {claim.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-4 text-slate-500 font-medium">
                              {new Date(claim.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => setSelectedClaim(claim)}
                                className="text-[10px] font-black uppercase tracking-widest text-[#005B63] hover:underline cursor-pointer"
                              >
                                View Timeline
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}
          </>
        )}

        {/* Manual Warranty Registration Form Modal */}
        {showRegisterForm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[150] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-100 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-in text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#005B63]" /> Verify Equipment Warranty
                </h3>
                <button onClick={() => setShowRegisterForm(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs font-sans">
                {/* Serial number */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">
                    Manufacturer Serial Number {registrations.find(r => r.id === registerRegId)?.product?.serial_number_required ? '(Required)' : '(Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SN-FZ-9921-X"
                    value={registerSerial}
                    onChange={e => setRegisterSerial(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#005B63]"
                  />
                </div>

                {/* Invoice file */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Purchase Invoice Document (Required, PDF/Img)</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setRegisterInvoice(e.target.files?.[0] || null)}
                    className="w-full text-slate-500 font-bold file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-100 file:text-slate-700 file:cursor-pointer hover:file:bg-slate-200"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Notes (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Add any specific installation details or notes..."
                    value={registerNotes}
                    onChange={e => setRegisterNotes(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#005B63] resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={submittingRegister}
                    className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white cursor-pointer hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5"
                    style={{ background: TEAL }}
                  >
                    {submittingRegister && <RefreshCw className="w-3 h-3 animate-spin" />}
                    Submit Registration
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRegisterForm(false)}
                    className="px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-200 text-slate-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Claim Submission Form Modal */}
        {showClaimForm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[150] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-100 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-in text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-[#005B63]" /> File Equipment Trouble Claim
                </h3>
                <button onClick={() => setShowClaimForm(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleClaimSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Select Active Equipment</label>
                  <div className="relative">
                    <select
                      value={claimRegId}
                      onChange={e => setClaimRegId(e.target.value)}
                      className="w-full appearance-none px-4 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63]"
                    >
                      <option value="">— Select Active Product —</option>
                      {activeRegs.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.product?.brand_name} {r.product?.name} (S/N: {r.serial_number || 'No S/N'})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Problem Description</label>
                  <textarea
                    rows={4}
                    placeholder="Describe the clinical/mechanical issues with the device..."
                    value={claimDescription}
                    onChange={e => setClaimDescription(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#005B63] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Clinical Priority</label>
                  <div className="flex gap-4">
                    {['low', 'medium', 'high', 'critical'].map(p => (
                      <label key={p} className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 capitalize">
                        <input
                          type="radio"
                          name="priority"
                          value={p}
                          checked={claimPriority === p}
                          onChange={() => setClaimPriority(p as any)}
                          className="w-3.5 h-3.5 text-[#005B63] border-slate-300 focus:ring-[#005B63]"
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Uploads grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-50 pt-4 mt-2">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Purchase Invoice (PDF/Img)</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => setClaimInvoice(e.target.files?.[0] || null)}
                      className="w-full text-slate-500 font-bold file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-100 file:text-slate-700 file:cursor-pointer hover:file:bg-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Trouble Video (Max 20MB)</label>
                    <input
                      type="file"
                      accept=".mp4,.avi,.mov"
                      onChange={e => setClaimVideo(e.target.files?.[0] || null)}
                      className="w-full text-slate-500 font-bold file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-100 file:text-slate-700 file:cursor-pointer hover:file:bg-slate-200"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Device Photos (Multiple)</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        setClaimImages(files);
                      }}
                      className="w-full text-slate-500 font-bold file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-100 file:text-slate-700 file:cursor-pointer hover:file:bg-slate-200"
                    />
                    {claimImages.length > 0 && (
                      <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ Selected {claimImages.length} images</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={submittingClaim}
                    className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white cursor-pointer hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5"
                    style={{ background: TEAL }}
                  >
                    {submittingClaim && <RefreshCw className="w-3 h-3 animate-spin" />}
                    Submit Claim
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClaimForm(false)}
                    className="px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-200 text-slate-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Claim Trace Detail Overlay */}
        {selectedClaim && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[150] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-100 max-w-xl w-full p-6 shadow-2xl space-y-4 animate-scale-in text-left max-h-[85vh] overflow-y-auto font-sans">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                    Claim {selectedClaim.claim_number}
                  </h3>
                  <span className="text-[10px] text-slate-400">Filed: {new Date(selectedClaim.created_at).toLocaleDateString()}</span>
                </div>
                <button onClick={() => setSelectedClaim(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Meta details */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                  <div>
                    <span className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Status</span>
                    <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border mt-0.5 ${getStatusColor(selectedClaim.status)}`}>
                      {selectedClaim.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Priority</span>
                    <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded mt-0.5 ${getPriorityColor(selectedClaim.priority)}`}>
                      {selectedClaim.priority}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Assigned Provider</span>
                    <span className="font-bold text-slate-700 block mt-0.5">{selectedClaim.assigned_provider || 'Not Assigned'}</span>
                  </div>
                </div>

                {/* Equipment details */}
                <div>
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">Clinical Asset</h4>
                  <p className="font-bold text-slate-800">{selectedClaim.registration_detail?.product?.name}</p>
                  <p className="text-[10px] text-slate-400">S/N: {selectedClaim.registration_detail?.serial_number || 'N/A'} · Provider: {selectedClaim.registration_detail?.warranty_provider}</p>
                </div>

                {/* Problem description */}
                <div>
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">Issue Description</h4>
                  <p className="text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-50 font-sans italic">
                    "{selectedClaim.description}"
                  </p>
                </div>

                {/* Resolution */}
                {selectedClaim.resolution && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-1">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">Resolution Details</h4>
                    <p className="text-xs font-bold text-emerald-700 leading-relaxed">
                      {selectedClaim.resolution}
                    </p>
                  </div>
                )}

                {/* Attachments */}
                {selectedClaim.attachments && selectedClaim.attachments.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Claim Support Attachments</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedClaim.attachments.map(att => (
                        <div key={att.id} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl shrink-0">
                          <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-700 truncate capitalize">{att.attachment_type.replace('_', ' ')}</p>
                            <a
                              href={att.file}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] font-black uppercase text-[#005B63] hover:underline block"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visual history timeline */}
                <div>
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">Claim Operations Timeline</h4>
                  <div className="relative border-l border-slate-100 pl-4 ml-2 space-y-4">
                    {selectedClaim.timeline && selectedClaim.timeline.map((evt, idx) => (
                      <div key={evt.id || idx} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full border border-white bg-[#005B63]" />
                        <div className="space-y-0.5">
                          <div className="flex items-baseline gap-2">
                            <span className="font-black text-slate-800 text-[11px]">{evt.action}</span>
                            <span className="text-[9px] text-slate-400 font-medium">
                              {new Date(evt.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {evt.performed_by_name && (
                            <p className="text-[9px] text-[#005B63] font-bold">
                              By {evt.performed_by_name} ({evt.performed_by_role})
                            </p>
                          )}
                          {evt.notes && (
                            <p className="text-[10px] text-slate-500 leading-relaxed font-sans">{evt.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Support (Transactional Flow wizard)
  // Support (Transactional Flow wizard)
  const renderSupport = () => {
    const selectedOrderData = orders.find(o => o.id === supportOrderId);

    const categoryLabels: Record<string, string> = {
      product_enquiry: 'Product Enquiry',
      technical_assistance: 'Technical Assistance',
      installation_help: 'Installation Help',
      order_issue: 'Order Issue',
      delivery_issue: 'Delivery Issue',
      billing_issue: 'Billing Issue',
      dealer_support: 'Dealer Support',
      general_complaint: 'General Complaint',
      general_feedback: 'General Feedback',
      other: 'Other Support Requests',
    };

    const ticketStatusLabels: Record<string, { label: string; color: string }> = {
      open: { label: 'Open', color: 'text-blue-700 bg-blue-50 border-blue-200' },
      in_progress: { label: 'In Progress', color: 'text-amber-700 bg-amber-50 border-amber-200' },
      waiting_customer: { label: 'Waiting for Customer', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
      resolved: { label: 'Resolved', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
      closed: { label: 'Closed', color: 'text-slate-700 bg-slate-50 border-slate-200' },
    };

    const ticketPriorityLabels: Record<string, { label: string; color: string }> = {
      low: { label: 'Low', color: 'bg-slate-100 text-slate-600 border border-slate-200' },
      medium: { label: 'Medium', color: 'bg-blue-50 text-blue-700 border border-blue-100' },
      high: { label: 'High', color: 'bg-orange-50 text-orange-700 border border-orange-100' },
      critical: { label: 'Critical', color: 'bg-rose-50 text-rose-700 border border-rose-100 font-bold' },
    };

    const handleReplySubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTicket) return;
      if (!supportReplyText.trim() && !supportReplyAttachment) {
        fireToast('Please write a reply or attach a file.');
        return;
      }
      setSubmittingSupportReply(true);
      try {
        const { supportService } = await import('../services/support');
        const formData = new FormData();
        if (supportReplyText.trim()) {
          formData.append('message', supportReplyText.trim());
        }
        if (supportReplyAttachment) {
          formData.append('attachment', supportReplyAttachment);
        }
        const res = await supportService.replyTicket(selectedTicket.id, formData);
        if (res.success && res.data) {
          setSupportReplyText('');
          setSupportReplyAttachment(null);
          fireToast('Reply sent!');
          await refreshSingleTicket(selectedTicket.id);
        } else {
          fireToast(res.message || 'Failed to send reply.');
        }
      } catch (e: any) {
        console.error(e);
        fireToast(e.response?.data?.error?.message || 'Failed to send reply.');
      } finally {
        setSubmittingSupportReply(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <SectionHeader title="Support Helpdesk" subtitle="Raise support requests or communicate with our helpdesk team." />
        </div>

        {/* Tabs header */}
        {!selectedTicket && (
          <div className="flex border-b border-slate-100 mb-6">
            <button
              onClick={() => { setIsCreatingTicket(false); }}
              className={`pb-3 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                !isCreatingTicket
                  ? 'border-[#005B63] text-[#005B63]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              My Support Tickets
            </button>
            <button
              onClick={() => { setIsCreatingTicket(true); }}
              className={`pb-3 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                isCreatingTicket
                  ? 'border-[#005B63] text-[#005B63]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Create Ticket
            </button>
          </div>
        )}

        {/* Wizard Form */}
        {isCreatingTicket ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Raise Support Request</h3>
              <button onClick={() => setIsCreatingTicket(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              {/* Subject */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Subject</label>
                <input
                  type="text"
                  placeholder="Summarize your issue..."
                  value={supportSubject}
                  onChange={e => setSupportSubject(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Category</label>
                  <div className="relative">
                    <select
                      value={supportCategory}
                      onChange={e => setSupportCategory(e.target.value)}
                      className="w-full appearance-none px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63]"
                    >
                      {Object.entries(categoryLabels).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Priority</label>
                  <div className="relative">
                    <select
                      value={supportPriority}
                      onChange={e => setSupportPriority(e.target.value as any)}
                      className="w-full appearance-none px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63]"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Select Order */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Select Reference Order (Optional)</label>
                  <div className="relative">
                    <select
                      value={supportOrderId}
                      onChange={e => { setSupportOrderId(e.target.value); setSupportProductId(''); }}
                      className="w-full appearance-none px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63]"
                    >
                      <option value="">— No Order Related —</option>
                      {orders.map(o => (
                        <option key={o.id} value={o.id}>Order #{o.id} ({o.date}) — ₹{o.total.toLocaleString()}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Select Product */}
                {supportOrderId && selectedOrderData && (
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Select Reference Product (Optional)</label>
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
              </div>

              {/* Describe */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Describe the Issue</label>
                <textarea
                  rows={4}
                  placeholder="Explain details of your query so our helpdesk team can investigate immediately..."
                  value={supportDescription}
                  onChange={e => setSupportDescription(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63] resize-none"
                />
              </div>

              {/* Upload image file */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Attachment (Optional)</label>
                <div className="relative border-2 border-dashed border-slate-200 hover:border-[#005B63] rounded-xl p-5 text-center transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={e => {
                      const file = e.target.files?.[0] || null;
                      setSupportAttachment(file);
                    }}
                  />
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-semibold">
                    {supportAttachment ? supportAttachment.name : 'Click or drag to upload files'}
                  </p>
                  <p className="text-[10px] text-slate-300 mt-0.5">PDF, PNG, JPG, ZIP, MP4, TXT up to 20MB</p>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={handleSupportSubmit}
                  disabled={submittingSupportTicket}
                  className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white cursor-pointer transition-all hover:bg-[#004b52] disabled:opacity-50"
                  style={{ background: TEAL }}
                >
                  {submittingSupportTicket ? 'Submitting...' : 'Submit Ticket'}
                </button>
                <button onClick={() => setIsCreatingTicket(false)} className="px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-200 text-slate-500 cursor-pointer hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : selectedTicket ? (
          /* Ticket details conversation thread */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 space-y-6 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Ticket Reference</span>
                    <h3 className="text-sm font-black text-slate-800">{selectedTicket.ticket_number}</h3>
                  </div>
                  <button onClick={() => setSelectedTicket(null)} className="text-[10px] font-bold border border-slate-200 px-3 py-1 rounded-lg text-slate-500 hover:bg-slate-50 cursor-pointer">Back to List</button>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">{selectedTicket.subject}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-sans">{selectedTicket.description}</p>
                </div>

                {/* Conversation Thread Log */}
                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-4 max-h-[300px] overflow-y-auto">
                  {selectedTicket.messages && selectedTicket.messages.map((m: any, i: number) => {
                    const isUserSender = m.sender_role.toLowerCase() !== 'admin';
                    return (
                      <div key={m.id || i} className={`flex flex-col ${isUserSender ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">{m.sender_name}</span>
                          <span className="text-[8px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-extrabold uppercase">{m.sender_role}</span>
                        </div>
                        <div className={`p-3 rounded-xl max-w-xs text-xs font-semibold ${isUserSender ? 'bg-[#005B63] text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'}`}>
                          <p className="whitespace-pre-line">{m.message}</p>
                          {m.attachment && (
                            <div className="mt-2 pt-2 border-t border-current/20">
                              <a
                                href={m.attachment_url || m.attachment}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold underline hover:opacity-85"
                              >
                                <Paperclip className="w-3.5 h-3.5" /> View Attachment
                              </a>
                            </div>
                          )}
                        </div>
                        <span className="text-[8px] text-slate-400 mt-1">
                          {new Date(m.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reply Box Form */}
              {selectedTicket.status !== 'closed' && (
                <form onSubmit={handleReplySubmit} className="pt-4 border-t border-slate-100 space-y-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Write Response</label>
                    <textarea
                      rows={3}
                      placeholder="Type your message to helpdesk..."
                      value={supportReplyText}
                      onChange={e => setSupportReplyText(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63] resize-none"
                    />
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="relative">
                      <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={e => {
                          const file = e.target.files?.[0] || null;
                          setSupportReplyAttachment(file);
                        }}
                      />
                      <button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-50 cursor-pointer">
                        <Paperclip className="w-3.5 h-3.5" />
                        {supportReplyAttachment ? supportReplyAttachment.name : 'Attach File'}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingSupportReply}
                      className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white cursor-pointer transition-all hover:bg-[#004b52] disabled:opacity-50 shrink-0"
                      style={{ background: TEAL }}
                    >
                      {submittingSupportReply ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Ticket Info Card */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-xs">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">Ticket Details</h3>

                <div className="space-y-3">
                  <div>
                    <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Status</span>
                    <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border mt-1 ${
                      ticketStatusLabels[selectedTicket.status]?.color || 'bg-slate-50 text-slate-600'
                    }`}>
                      {ticketStatusLabels[selectedTicket.status]?.label || selectedTicket.status}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Priority</span>
                    <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full mt-1 ${
                      ticketPriorityLabels[selectedTicket.priority]?.color || 'bg-slate-50 text-slate-600'
                    }`}>
                      {selectedTicket.priority}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Category</span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{categoryLabels[selectedTicket.category] || selectedTicket.category}</p>
                  </div>

                  {selectedTicket.order_detail && (
                    <div>
                      <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Linked Order</span>
                      <p className="text-xs font-bold text-[#005B63] mt-0.5">Order #{selectedTicket.order_detail.order_number}</p>
                    </div>
                  )}

                  {selectedTicket.product_detail && (
                    <div>
                      <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Linked Product</span>
                      <p className="text-xs font-bold text-[#005B63] mt-0.5">{selectedTicket.product_detail.name}</p>
                    </div>
                  )}

                  <div>
                    <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Created Date</span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {new Date(selectedTicket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status timeline */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-xs">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">Status History</h3>
                {selectedTicket.timeline && selectedTicket.timeline.length > 0 ? (
                  <div className="relative border-l border-slate-100 pl-4 ml-2 space-y-4">
                    {selectedTicket.timeline.map((evt: any, idx: number) => (
                      <div key={evt.id || idx} className="relative">
                        <div className="absolute -left-[21.5px] top-1 w-2 h-2 rounded-full bg-[#005B63]" />
                        <div className="space-y-0.5">
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-slate-800 text-[10px]">{evt.action}</span>
                            <span className="text-[8px] text-slate-400 font-medium">
                              {new Date(evt.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {evt.performed_by_name && (
                            <p className="text-[8px] text-[#005B63] font-bold">
                              By {evt.performed_by_name} ({evt.performed_by_role})
                            </p>
                          )}
                          {evt.notes && (
                            <p className="text-[9px] text-slate-400 leading-relaxed font-sans">{evt.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400">No events logged.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Tickets List */
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] overflow-hidden">
            <div className="p-4 border-b border-slate-50">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Ticket History</h3>
            </div>
            {supportLoading ? (
              <div className="p-10 text-center text-xs font-semibold text-slate-400">Loading tickets...</div>
            ) : supportTickets.length === 0 ? (
              <EmptyState icon={<Ticket className="w-8 h-8" />} title="No Tickets Filed" subtitle="Your support queries history will be tracked here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100">
                      <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Ticket Number</th>
                      <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Subject</th>
                      <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Category</th>
                      <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Priority</th>
                      <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Created Date</th>
                      <th className="p-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Last Updated</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supportTickets.map(t => (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className="hover:bg-slate-50/40 cursor-pointer transition-colors"
                      >
                        <td className="p-4 text-xs font-bold text-slate-800 font-mono">{t.ticket_number}</td>
                        <td className="p-4 text-xs font-semibold text-slate-800">{t.subject}</td>
                        <td className="p-4 text-xs font-medium text-slate-600">{categoryLabels[t.category] || t.category}</td>
                        <td className="p-4 text-xs">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            ticketPriorityLabels[t.priority]?.color || 'bg-slate-50 text-slate-600'
                          }`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-4 text-xs">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                            ticketStatusLabels[t.status]?.color || 'bg-slate-50 text-slate-600'
                          }`}>
                            {ticketStatusLabels[t.status]?.label || t.status}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-semibold text-slate-500">
                          {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-4 text-xs font-semibold text-slate-500">
                          {new Date(t.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-4 text-right">
                          <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 text-slate-400">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">OTP Phone Authentication</h4>
              <p className="text-[11px] text-slate-400">{profileForm.phone_number || 'Not Linked'}</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-100 font-sans">
              Inactive
            </span>
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest font-sans">Coming Soon</span>
          </div>
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

      {/* Device Sessions */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Active Practitioner Sessions</h3>
          <button onClick={() => fireToast('Logged out of other devices.')} className="text-[9px] font-black text-rose-500 uppercase tracking-wider hover:underline">Revoke All Other Sessions</button>
        </div>
        <div className="divide-y divide-slate-100">
          {deviceSessions.map((session, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {session.device.includes('iPhone') ? <Smartphone className="w-5 h-5 text-slate-400" /> : <Globe className="w-5 h-5 text-slate-400" />}
                <div>
                  <p className="text-xs font-bold text-slate-800">{session.device}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{session.location} · {session.time}</p>
                </div>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${session.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'} font-sans`}>
                {session.status === 'active' ? 'Current' : 'Signed out'}
              </span>
            </div>
          ))}
        </div>
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
      case 'dashboard': return renderDashboard();
      case 'profile': return renderProfile();
      case 'clinic': return renderClinic();
      case 'addresses': return renderAddresses();
      case 'orders': return renderOrders();
      case 'wishlist': return renderWishlist();
      case 'warranty': return renderWarranty();
      case 'support': return renderSupport();
      case 'security': return renderSecurity();
      case 'dealer-status': return renderDealerStatus();
      default: return renderDashboard();
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
            onClick={() => { setCurrentView('dealer-portal' as any); window.scrollTo(0, 0); }}
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
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer text-left ${activeSection === item.id
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
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer text-left ${activeSection === item.id
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
    <div className="w-full bg-[#f7fafa] min-h-screen pt-[62px] lg:pt-[162px] pb-24 font-sans select-none text-left">
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
          <div className="hidden lg:block lg:col-span-3 sticky top-[168px]">
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
