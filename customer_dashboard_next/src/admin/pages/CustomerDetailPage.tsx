'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Mail, Phone, Calendar, Shield, MapPin, Tag,
  ShoppingBag, Trash2, UserX, UserCheck, X,
  ClipboardList, Info, CheckCircle, Heart
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { useBreadcrumbSync } from '../contexts/BreadcrumbContext';
import type { Customer } from '../types/admin';
import { adminCustomersService } from '../services/adminService';

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  useBreadcrumbSync([
    { label: 'Customers & dealers' },
    { label: 'Customers', path: '/admin/customers' },
    { label: 'Profile Details' },
  ]);

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'wishlist' | 'activity'>('overview');

  // Customer State
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit notes
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Edit tags
  const [tagInput, setTagInput] = useState('');
  const [savingTags, setSavingTags] = useState(false);



  // Confirm Actions
  const [blockTarget, setBlockTarget] = useState<boolean>(false);
  const [unblockTarget, setUnblockTarget] = useState<boolean>(false);
  const [deactivateTarget, setDeactivateTarget] = useState<boolean>(false);
  const [activateTarget, setActivateTarget] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCustomer = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminCustomersService.getOne(id);
      if (res.success && res.data) {
        setCustomer(res.data);
      } else {
        toast.error('Customer not found.');
        router.push('/admin/customers');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load customer profile.');
      router.push('/admin/customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const handleSaveNotes = async () => {
    if (!customer) return;
    setSavingNotes(true);
    try {
      const res = await adminCustomersService.update(customer.id, {
        profile: { admin_notes: notesInput }
      });
      if (res.success) {
        toast.success('Admin notes saved.');
        setIsEditingNotes(false);
        fetchCustomer();
      }
    } catch (err) {
      toast.error('Failed to save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (customer.tags.includes(trimmed)) return toast.info('Tag already exists.');

    setSavingTags(true);
    try {
      const nextTags = [...customer.tags, trimmed];
      const res = await adminCustomersService.update(customer.id, {
        profile: { tags: nextTags }
      });
      if (res.success) {
        toast.success('Tag added.');
        setTagInput('');
        fetchCustomer();
      }
    } catch (err) {
      toast.error('Failed to add tag.');
    } finally {
      setSavingTags(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!customer) return;
    setSavingTags(true);
    try {
      const nextTags = customer.tags.filter(t => t !== tagToRemove);
      const res = await adminCustomersService.update(customer.id, {
        profile: { tags: nextTags }
      });
      if (res.success) {
        toast.success('Tag removed.');
        fetchCustomer();
      }
    } catch (err) {
      toast.error('Failed to remove tag.');
    } finally {
      setSavingTags(false);
    }
  };



  const handleBlock = async () => {
    if (!customer) return;
    setActionLoading(true);
    try {
      const res = await adminCustomersService.block(customer.id);
      if (res.success) {
        toast.success('Customer account blocked.');
        setBlockTarget(false);
        fetchCustomer();
      }
    } catch (err) {
      toast.error('Failed to block customer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!customer) return;
    setActionLoading(true);
    try {
      const res = await adminCustomersService.unblock(customer.id);
      if (res.success) {
        toast.success('Customer account unblocked.');
        setUnblockTarget(false);
        fetchCustomer();
      }
    } catch (err) {
      toast.error('Failed to unblock customer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!customer) return;
    setActionLoading(true);
    try {
      const res = await adminCustomersService.deactivate(customer.id);
      if (res.success) {
        toast.success('Customer account deactivated.');
        setDeactivateTarget(false);
        fetchCustomer();
      }
    } catch (err) {
      toast.error('Failed to deactivate customer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!customer) return;
    setActionLoading(true);
    try {
      const res = await adminCustomersService.activate(customer.id);
      if (res.success) {
        toast.success('Customer account activated.');
        setActivateTarget(false);
        fetchCustomer();
      }
    } catch (err) {
      toast.error('Failed to activate customer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    setActionLoading(true);
    try {
      const res = await adminCustomersService.delete(customer.id);
      if (res.success) {
        toast.success('Customer account soft-deleted.');
        setDeleteTarget(false);
        router.push('/admin/customers');
      }
    } catch (err) {
      toast.error('Failed to delete customer.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-6 w-32 bg-slate-100 rounded animate-pulse" />
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-48 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2 h-96 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-96 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const initials = customer.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="p-6 space-y-6">
      {/* Back & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/customers')}
            className="p-2 rounded-lg border border-slate-150 hover:bg-slate-50 transition-colors text-slate-500 bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-800 leading-tight">
                {customer.full_name}
              </h1>
              {customer.is_blocked ? (
                <StatusBadge label="Blocked" variant="error" />
              ) : !customer.is_active ? (
                <StatusBadge label="Deactivated" variant="neutral" />
              ) : (
                <StatusBadge label="Active" variant="success" />
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-semibold">{customer.customer_id}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">


          {customer.is_blocked ? (
            <button
              onClick={() => setUnblockTarget(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-bold uppercase rounded-xl transition-colors bg-white cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Unblock Account
            </button>
          ) : (
            <button
              onClick={() => setBlockTarget(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-bold uppercase rounded-xl transition-colors bg-white cursor-pointer"
            >
              <UserX className="w-3.5 h-3.5 text-rose-500" /> Block Account
            </button>
          )}

          {customer.is_active ? (
            <button
              onClick={() => setDeactivateTarget(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-bold uppercase rounded-xl transition-colors bg-white cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-amber-500" /> Deactivate Login
            </button>
          ) : (
            <button
              onClick={() => setActivateTarget(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-bold uppercase rounded-xl transition-colors bg-white cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5 text-[#005F63]" /> Activate Login
            </button>
          )}

          <button
            onClick={() => setDeleteTarget(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold uppercase rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Soft Delete
          </button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-100 gap-6 select-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-bold transition-all relative border-b-2
            ${activeTab === 'overview'
              ? 'text-[#005B63] border-[#005B63]'
              : 'text-slate-400 border-transparent hover:text-slate-600'}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 text-sm font-bold transition-all relative border-b-2
            ${activeTab === 'orders'
              ? 'text-[#005B63] border-[#005B63]'
              : 'text-slate-400 border-transparent hover:text-slate-600'}`}
        >
          Order History
        </button>
        <button
          onClick={() => setActiveTab('wishlist')}
          className={`pb-3 text-sm font-bold transition-all relative border-b-2
            ${activeTab === 'wishlist'
              ? 'text-[#005B63] border-[#005B63]'
              : 'text-slate-400 border-transparent hover:text-slate-600'}`}
        >
          Wishlist & Cart
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`pb-3 text-sm font-bold transition-all relative border-b-2
            ${activeTab === 'activity'
              ? 'text-[#005B63] border-[#005B63]'
              : 'text-slate-400 border-transparent hover:text-slate-600'}`}
        >
          Activity & Audit Logs
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-[fadeIn_0.18s_ease]">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic & Clinic Grid */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-4">
                {customer.avatar_url ? (
                  <img src={customer.avatar_url} alt={customer.full_name} className="w-16 h-16 rounded-2xl object-cover border border-slate-100" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#005F63]/10 to-[#0B7C80]/5 text-[#005F63] flex items-center justify-center font-bold text-2xl border border-[#005F63]/15">
                    {initials}
                  </div>
                )}
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg leading-tight">{customer.full_name}</h3>
                  <p className="text-xs text-slate-450 mt-1 font-semibold">{customer.profession || 'Dentist Profile'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                  <p className="text-xs font-semibold text-slate-750 mt-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> {customer.email}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mobile Number</p>
                  <p className="text-xs font-semibold text-slate-750 mt-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {customer.phone_number || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clinic / Company Name</p>
                  <p className="text-xs font-semibold text-slate-750 mt-1">{customer.clinic_name || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">GST Identification</p>
                  <p className="text-xs font-semibold text-slate-750 mt-1 font-mono">{customer.gst_number || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registered Date</p>
                  <p className="text-xs font-semibold text-slate-750 mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(customer.date_joined).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Portal Login</p>
                  <p className="text-xs font-semibold text-slate-750 mt-1">
                    {customer.last_login
                      ? new Date(customer.last_login).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                      : 'Never logged in'}
                  </p>
                </div>
              </div>
            </div>

            {/* Addresses Box */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2 border-b border-slate-50 pb-2">
                <MapPin className="w-4 h-4 text-[#005B63]" /> Saved Addresses
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {customer.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`border rounded-xl p-4 space-y-2 relative
                      ${addr.is_default ? 'bg-[#005B63]/[0.02] border-[#005B63]/20' : 'border-slate-150 bg-white'}`}
                  >
                    {addr.is_default && (
                      <span className="absolute top-3 right-3 text-[9px] font-bold bg-[#005B63] text-white px-1.5 py-0.5 rounded uppercase">
                        Default
                      </span>
                    )}
                    <p className="text-[10px] font-bold text-[#005F63] uppercase tracking-wider">{addr.label}</p>
                    <p className="text-xs font-bold text-slate-800">{addr.full_name}</p>
                    <p className="text-xs text-slate-500 font-medium">{addr.mobile}</p>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {addr.line1}
                      {addr.line2 && <span className="block">{addr.line2}</span>}
                      <span className="block font-semibold text-slate-650">{addr.city}, {addr.state} – {addr.pincode}</span>
                    </p>
                  </div>
                ))}
                {customer.addresses.length === 0 && (
                  <div className="col-span-2 py-4 text-center text-slate-400 text-xs italic">
                    No addresses registered for this customer yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar controls (Tags, Notes, Dealer request) */}
          <div className="space-y-6">
            {/* Tags Box */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-[#005B63]" /> Customer Tags
              </h4>
              <form onSubmit={handleAddTag} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add custom tag..."
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#005B63]/30"
                />
                <button
                  type="submit"
                  disabled={savingTags}
                  className="px-3 bg-[#005B63] text-white text-xs font-bold uppercase rounded-lg hover:bg-[#004a50]"
                >
                  Add
                </button>
              </form>
              <div className="flex flex-wrap gap-1">
                {customer.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-bold text-slate-550 uppercase tracking-wide"
                  >
                    {t}
                    <button
                      type="button"
                      disabled={savingTags}
                      onClick={() => handleRemoveTag(t)}
                      className="text-slate-400 hover:text-rose-500 focus:outline-none"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {customer.tags.length === 0 && (
                  <p className="text-xs text-slate-450 italic">No tags associated.</p>
                )}
              </div>
            </div>

            {/* Dealer Application Request Status */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#005B63]" /> Dealer Request Status
              </h4>
              {customer.dealer_request_status ? (
                <div className="border border-slate-150 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-650">Application:</span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full
                      ${customer.dealer_request_status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' :
                        customer.dealer_request_status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-250' :
                        'bg-amber-50 text-amber-700 border border-amber-250'}`}>
                      {customer.dealer_request_status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                    Applicant requested pricing access tier catalog rights. Approved accounts are designated as wholesale dealers.
                  </p>
                </div>
              ) : (
                <div className="text-center p-4 border border-dashed border-slate-200 rounded-xl">
                  <p className="text-xs text-slate-400 italic">No dealer request submitted.</p>
                </div>
              )}
            </div>

            {/* Admin Notes */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                  Admin-Only Notes
                </h4>
                {!isEditingNotes && (
                  <button
                    onClick={() => setIsEditingNotes(true)}
                    className="text-xs text-[#005B63] hover:underline font-semibold"
                  >
                    Edit Notes
                  </button>
                )}
              </div>
              {isEditingNotes ? (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={notesInput}
                    onChange={e => setNotesInput(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#005B63]/30 resize-none"
                    placeholder="Clinic timings, shipping instructions..."
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => { setNotesInput(customer.admin_notes || ''); setIsEditingNotes(false); }}
                      className="px-2.5 py-1 text-slate-500 text-xs font-semibold rounded bg-slate-50 border border-slate-100 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="px-2.5 py-1 bg-[#005B63] hover:bg-[#004a50] text-white text-xs font-bold uppercase rounded"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl min-h-[80px]">
                  <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">
                    {customer.admin_notes || 'No internal notes recorded.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDER HISTORY */}
      {activeTab === 'orders' && (
        <div className="bg-white border border-slate-100 rounded-2xl p-10 shadow-sm animate-[fadeIn_0.18s_ease]">
          <EmptyState
            title="No Orders Found"
            description="The orders module is currently pending integration. Product purchases and transactional logs will appear here once the Orders module is completed."
            icon="ShoppingBag"
          />
        </div>
      )}

      {/* TAB 3: WISHLIST & CART */}
      {activeTab === 'wishlist' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-[fadeIn_0.18s_ease]">
          {/* Wishlist */}
          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2 border-b border-slate-50 pb-2">
              <Heart className="w-4 h-4 text-[#005B63]" /> Saved Wishlist
            </h3>
            <EmptyState
              title="No Wishlist Items"
              description="This customer hasn't saved any catalogue items to their wishlist."
              icon="Heart"
            />
          </div>

          {/* Cart */}
          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2 border-b border-slate-50 pb-2">
              <ShoppingBag className="w-4 h-4 text-[#005B63]" /> Active Cart Preview
            </h3>
            <div className="flex items-center gap-2 text-amber-600 border border-amber-100 bg-amber-50/50 p-3.5 rounded-xl text-xs font-semibold">
              <Info className="w-4 h-4 shrink-0" />
              <span>Cart module is currently deactivated in the backend. No active cart.</span>
            </div>
            <EmptyState
              title="No Active Cart"
              description="No products are currently in the customer's portal shopping cart."
              icon="ShoppingBag"
            />
          </div>
        </div>
      )}

      {/* TAB 4: ACTIVITY & AUDIT LOGS */}
      {activeTab === 'activity' && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6 animate-[fadeIn_0.18s_ease]">
          <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2 border-b border-slate-50 pb-2.5">
            <ClipboardList className="w-4 h-4 text-[#005B63]" /> Customer Account Audit Logs
          </h3>

          <div className="relative border-l border-slate-150 pl-6 ml-3 space-y-6 py-2">
            {customer.customer_audit_logs.map((log) => (
              <div key={log.id} className="relative">
                {/* Dot indicator */}
                <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#005B63] ring-4 ring-white" />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[10px] font-bold bg-[#005B63]/10 text-[#005B63] px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                      {log.action}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      {new Date(log.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-650 font-medium leading-relaxed">
                    {log.description}
                  </p>
                  {log.action_by_name && (
                    <span className="block text-[10px] text-slate-400 font-semibold">
                      Action by: {log.action_by_name} ({log.action_by_email})
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Account Created (default bottom timeline) */}
            <div className="relative">
              <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                    ACCOUNT_CREATED
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    {new Date(customer.date_joined).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Dentist profile created and registered in FAAZO directory.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Confirmation Overlays */}
      <ConfirmDialog
        isOpen={blockTarget}
        title="Block Customer Account"
        message={
          <span>
            Are you sure you want to block <strong>{customer.full_name}</strong>? They will be flagged as blocked and restricted from ordering.
          </span>
        }
        confirmLabel="Block Customer"
        variant="danger"
        loading={actionLoading}
        onClose={() => setBlockTarget(false)}
        onConfirm={handleBlock}
      />

      <ConfirmDialog
        isOpen={unblockTarget}
        title="Unblock Customer Account"
        message={
          <span>
            Are you sure you want to unblock <strong>{customer.full_name}</strong>? This will restore standard order access immediately.
          </span>
        }
        confirmLabel="Unblock"
        variant="default"
        loading={actionLoading}
        onClose={() => setUnblockTarget(false)}
        onConfirm={handleUnblock}
      />

      <ConfirmDialog
        isOpen={deactivateTarget}
        title="Deactivate Customer Account"
        message={
          <span>
            Are you sure you want to deactivate <strong>{customer.full_name}</strong>? They will be unable to log in to the portal.
          </span>
        }
        confirmLabel="Deactivate"
        variant="warning"
        loading={actionLoading}
        onClose={() => setDeactivateTarget(false)}
        onConfirm={handleDeactivate}
      />

      <ConfirmDialog
        isOpen={activateTarget}
        title="Activate Customer Account"
        message={
          <span>
            Are you sure you want to activate <strong>{customer.full_name}</strong>? This will restore portal login privileges.
          </span>
        }
        confirmLabel="Activate"
        variant="default"
        loading={actionLoading}
        onClose={() => setActivateTarget(false)}
        onConfirm={handleActivate}
      />

      <ConfirmDialog
        isOpen={deleteTarget}
        title="Delete Customer Account"
        message={
          <span>
            Are you sure you want to delete <strong>{customer.full_name}</strong>? This uses a secure soft-delete protection: their login will be suspended and catalog views archived, but database integrity is maintained.
          </span>
        }
        confirmLabel="Delete Account"
        variant="danger"
        loading={actionLoading}
        onClose={() => setDeleteTarget(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default CustomerDetailPage;
