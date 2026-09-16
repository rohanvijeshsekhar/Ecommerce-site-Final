'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import {
  Flame, Plus, Trash2, Edit, Copy, ChevronUp, ChevronDown, Check,
  Eye, Monitor, Smartphone, Sparkles, Clock, Calendar, ArrowRight,
  Layout, Type, ShoppingCart, Image as ImageIcon, Save,
  Search, X, ExternalLink, Zap, RefreshCw, AlertCircle, Upload, CheckCircle2,
  Sliders, Palette
} from 'lucide-react';
import type { DailyOffer, DailyOfferProduct } from '../../types/admin';
import { homepageService, adminService } from '../../services/adminService';
import { useToast } from '../Toast';
import ConfirmDialog from '../ConfirmDialog';
import DailyOffersSection from '@/components/store/daily-offers/DailyOffersSection';
import { BANNER_FONTS } from '@/lib/bannerFonts';

export const THEME_PRESETS = [
  {
    id: 'teal_premium',
    name: 'FAAZO Teal Premium',
    bg_color: '#004D54',
    bg_gradient: 'linear-gradient(135deg, #002B30 0%, #004D54 45%, #006670 100%)',
    heading_color: '#FFFFFF',
    description_color: '#CCECEE',
    badge_bg_color: '#E6FFFA',
    badge_text_color: '#004D54',
    offer_color: '#2DD4BF',
    cta_bg_color: '#2DD4BF',
    cta_text_color: '#002B30',
    countdown_bg_color: '#002B30',
    countdown_text_color: '#FFFFFF',
  },
  {
    id: 'emerald_clinic',
    name: 'Clinical Emerald',
    bg_color: '#064E3B',
    bg_gradient: 'linear-gradient(135deg, #022C22 0%, #065F46 50%, #047857 100%)',
    heading_color: '#FFFFFF',
    description_color: '#D1FAE5',
    badge_bg_color: '#ECFDF5',
    badge_text_color: '#065F46',
    offer_color: '#34D399',
    cta_bg_color: '#10B981',
    cta_text_color: '#022C22',
    countdown_bg_color: '#022C22',
    countdown_text_color: '#FFFFFF',
  },
  {
    id: 'navy_pro',
    name: 'Deep Navy Pro',
    bg_color: '#0F172A',
    bg_gradient: 'linear-gradient(135deg, #020617 0%, #0F172A 50%, #1E293B 100%)',
    heading_color: '#FFFFFF',
    description_color: '#CBD5E1',
    badge_bg_color: '#F1F5F9',
    badge_text_color: '#0F172A',
    offer_color: '#38BDF8',
    cta_bg_color: '#38BDF8',
    cta_text_color: '#0F172A',
    countdown_bg_color: '#020617',
    countdown_text_color: '#FFFFFF',
  },
  {
    id: 'amber_sunset',
    name: 'Amber Special',
    bg_color: '#78350F',
    bg_gradient: 'linear-gradient(135deg, #451A03 0%, #78350F 50%, #B45309 100%)',
    heading_color: '#FFFFFF',
    description_color: '#FEF3C7',
    badge_bg_color: '#FFFBEB',
    badge_text_color: '#78350F',
    offer_color: '#FDE047',
    cta_bg_color: '#F59E0B',
    cta_text_color: '#451A03',
    countdown_bg_color: '#451A03',
    countdown_text_color: '#FFFFFF',
  },
];

const DEFAULT_OFFER_FORM: Partial<DailyOffer> = {
  title: 'Big Savings Today',
  badge_text: '🔥 DAILY DEALS',
  subheading: 'Limited-time deals on selected clinical products.',
  offer_text: 'UP TO 40% OFF',
  secondary_text: 'Special clinical pricing while stocks last',
  font_family: 'Inter',
  offer_type: 'percentage',
  theme: 'teal_premium',
  bg_color: '#004D54',
  bg_gradient: 'linear-gradient(135deg, #002B30 0%, #004D54 45%, #006670 100%)',
  heading_color: '#FFFFFF',
  description_color: '#CCECEE',
  badge_bg_color: '#E6FFFA',
  badge_text_color: '#004D54',
  offer_color: '#2DD4BF',
  cta_bg_color: '#2DD4BF',
  cta_text_color: '#002B30',
  cta_border_color: '#14B8A6',
  countdown_bg_color: '#002B30',
  countdown_text_color: '#FFFFFF',
  product_badge_color: '#006670',
  horizontal_alignment: 'left',
  vertical_alignment: 'center',
  content_width: 'large',
  image_position: 'right', // 'right' | 'left' = Split Layout; 'center' = Full Background
  image_fit: 'cover',
  overlay_opacity: 60,
  desktop_image_url: '/images/featured_digital_equipment.jpg',
  mobile_image_url: '',
  countdown_enabled: true,
  countdown_position: 'left',
  start_date: new Date().toISOString().substring(0, 16),
  end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 16),
  cta_enabled: true,
  cta_position: 'left',
  cta_text: "Shop Today's Deals →",
  cta_action_type: 'url',
  cta_target_id: '',
  cta_url: '/daily-offers',
  status: 'live',
  is_active: true,
  items: [],
};

type StudioTab = 'content' | 'artwork' | 'countdown' | 'cta' | 'styling' | 'products' | 'scheduling';

export const DailyOffersManager: React.FC = () => {
  const toast = useToast();
  const [offers, setOffers] = useState<DailyOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DailyOffer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Studio Mode States
  const [showStudio, setShowStudio] = useState(false);
  const [editOffer, setEditOffer] = useState<DailyOffer | null>(null);
  const [activeTab, setActiveTab] = useState<StudioTab>('content');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Form State
  const [form, setForm] = useState<Partial<DailyOffer>>(DEFAULT_OFFER_FORM);
  const [desktopImageFile, setDesktopImageFile] = useState<File | null>(null);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);

  // Product Selection States
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [ctaProductSearchQuery, setCtaProductSearchQuery] = useState('');

  const desktopFileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [offersRes, prodsRes, catsRes, brandsRes] = await Promise.all([
        homepageService.getDailyOffers(),
        adminService.getProducts({ page_size: 100 }).catch(() => ({ data: [] })),
        adminService.getCategories().catch(() => ({ data: [] })),
        adminService.getBrands().catch(() => ({ data: [] })),
      ]);

      if (offersRes.success && offersRes.data) {
        setOffers(Array.isArray(offersRes.data) ? offersRes.data : []);
      }
      if (prodsRes && prodsRes.data) {
        const prodList = (prodsRes.data as any).results || prodsRes.data;
        setAllProducts(Array.isArray(prodList) ? prodList : []);
      }
      if (catsRes && catsRes.data) {
        const catList = (catsRes.data as any).results || catsRes.data;
        setCategories(Array.isArray(catList) ? catList : []);
      }
      if (brandsRes && brandsRes.data) {
        const brandList = (brandsRes.data as any).results || brandsRes.data;
        setBrands(Array.isArray(brandList) ? brandList : []);
      }
    } catch {
      toast.error('Failed to load daily offers configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateStudio = () => {
    setEditOffer(null);
    setForm(DEFAULT_OFFER_FORM);
    setDesktopImageFile(null);
    setMobileImageFile(null);
    setCtaProductSearchQuery('');
    setActiveTab('content');
    setShowStudio(true);
  };

  const openEditStudio = (offer: DailyOffer) => {
    setEditOffer(offer);
    setForm({
      ...offer,
      font_family: offer.font_family || 'Inter',
      countdown_enabled: offer.countdown_enabled !== false,
      countdown_position: offer.countdown_position || 'left',
      cta_enabled: offer.cta_enabled !== false,
      cta_position: offer.cta_position || 'left',
      horizontal_alignment: offer.horizontal_alignment || 'left',
      vertical_alignment: offer.vertical_alignment || 'center',
      content_width: offer.content_width || 'large',
      cta_bg_color: offer.cta_bg_color || '#2DD4BF',
      cta_text_color: offer.cta_text_color || '#002B30',
      cta_border_color: offer.cta_border_color || '#14B8A6',
      countdown_bg_color: offer.countdown_bg_color || '#002B30',
      countdown_text_color: offer.countdown_text_color || '#FFFFFF',
      start_date: offer.start_date ? offer.start_date.substring(0, 16) : '',
      end_date: offer.end_date ? offer.end_date.substring(0, 16) : '',
      desktop_image_url: offer.desktop_image_url || offer.desktop_image || '',
      mobile_image_url: offer.mobile_image_url || offer.mobile_image || '',
      items: offer.items ? [...offer.items] : [],
    });
    setDesktopImageFile(null);
    setMobileImageFile(null);
    setCtaProductSearchQuery('');
    setActiveTab('content');
    setShowStudio(true);
  };

  const handleDuplicate = async (offer: DailyOffer) => {
    try {
      const res = await homepageService.duplicateDailyOffer(offer.id);
      if (res.success) {
        toast.success('Offer duplicated successfully');
        loadData();
      }
    } catch {
      toast.error('Failed to duplicate offer');
    }
  };

  const handleDelete = (offer: DailyOffer) => {
    setDeleteTarget(offer);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await homepageService.deleteDailyOffer(deleteTarget.id);
      if (res.success) {
        toast.success('Daily offer deleted successfully');
        loadData();
      } else {
        toast.error(res.message || 'Failed to delete offer');
      }
    } catch {
      toast.error('Failed to delete offer');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleActive = async (offer: DailyOffer) => {
    try {
      const res = await homepageService.updateDailyOffer(offer.id, {
        is_active: !offer.is_active,
        status: !offer.is_active ? 'live' : 'disabled',
      });
      if (res.success) {
        toast.success(`Offer ${!offer.is_active ? 'activated' : 'disabled'}`);
        loadData();
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  // Product multi-selection
  const handleAddProduct = (prod: any) => {
    const currentItems = form.items || [];
    if (currentItems.some((i) => i.product === prod.id || i.product_id === prod.id)) {
      toast.warning('Product is already added');
      return;
    }

    const newItem: DailyOfferProduct = {
      id: `temp-${Date.now()}`,
      product: prod.id,
      product_id: prod.id,
      product_name: prod.name,
      product_slug: prod.slug,
      product_sku: prod.sku,
      product_image: prod.primary_image || (prod.images && prod.images[0]?.image) || null,
      brand_name: prod.brand_name || 'Brand',
      category_name: prod.category_name,
      deal_price: prod.pricing?.selling_price || 0,
      badge_override: 'HOT DEAL',
      sort_order: currentItems.length,
      pricing: prod.pricing,
      inventory: prod.inventory,
    };

    setForm({
      ...form,
      items: [...currentItems, newItem],
    });
    toast.success(`Added ${prod.name}`);
  };

  const handleRemoveProduct = (index: number) => {
    const newItems = [...(form.items || [])];
    newItems.splice(index, 1);
    setForm({ ...form, items: newItems });
  };

  const handleMoveProduct = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const items = [...(form.items || [])];
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const [moved] = items.splice(index, 1);
    items.splice(targetIdx, 0, moved);
    setForm({ ...form, items });
  };

  const handleUpdateProductDealPrice = (index: number, val: string) => {
    const items = [...(form.items || [])];
    items[index] = { ...items[index], deal_price: val ? parseFloat(val) : null };
    setForm({ ...form, items });
  };

  const handleUpdateProductBadge = (index: number, val: string) => {
    const items = [...(form.items || [])];
    items[index] = { ...items[index], badge_override: val };
    setForm({ ...form, items });
  };

  // Image Upload Handlers
  const handleDesktopImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDesktopImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setForm((prev) => ({ ...prev, desktop_image_url: previewUrl }));
    }
  };

  const handleMobileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMobileImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setForm((prev) => ({ ...prev, mobile_image_url: previewUrl }));
    }
  };

  const handleRemoveDesktopImage = () => {
    setDesktopImageFile(null);
    setForm((prev) => ({
      ...prev,
      desktop_image_url: '',
      desktop_image: '',
    }));
    if (desktopFileInputRef.current) {
      desktopFileInputRef.current.value = '';
    }
  };

  const handleRemoveMobileImage = () => {
    setMobileImageFile(null);
    setForm((prev) => ({
      ...prev,
      mobile_image_url: '',
      mobile_image: '',
    }));
    if (mobileFileInputRef.current) {
      mobileFileInputRef.current.value = '';
    }
  };

  // Save / Publish
  const handleSave = async (publishNow = false) => {
    setSaving(true);
    try {
      const fd = new FormData();
      const statusToSave = publishNow ? 'live' : form.status || 'draft';
      const isActiveToSave = publishNow ? true : form.is_active !== false;

      // Clean & append text fields
      Object.entries(form).forEach(([key, val]) => {
        if (
          key === 'items' ||
          key === 'desktop_image' ||
          key === 'mobile_image' ||
          key === 'desktop_image_url' ||
          key === 'mobile_image_url' ||
          key === 'start_date' ||
          key === 'end_date'
        ) {
          return;
        }
        if (val !== undefined && val !== null) {
          fd.append(key, String(val));
        }
      });

      fd.set('status', statusToSave);
      fd.set('is_active', String(isActiveToSave));

      // Sanitize dates
      if (form.start_date && form.start_date.trim()) {
        const d = new Date(form.start_date);
        fd.append('start_date', !isNaN(d.getTime()) ? d.toISOString() : '');
      } else {
        fd.append('start_date', '');
      }

      if (form.end_date && form.end_date.trim()) {
        const d = new Date(form.end_date);
        fd.append('end_date', !isNaN(d.getTime()) ? d.toISOString() : '');
      } else {
        fd.append('end_date', '');
      }

      // Append items as JSON
      const itemsPayload = (form.items || []).map((it, idx) => ({
        product_id: it.product_id || it.product,
        deal_price: it.deal_price || null,
        badge_override: it.badge_override || '',
        sort_order: idx,
      }));
      fd.append('items_data', JSON.stringify(itemsPayload));

      // Append images
      if (desktopImageFile) {
        fd.append('desktop_image', desktopImageFile);
      }
      if (mobileImageFile) {
        fd.append('mobile_image', mobileImageFile);
      }

      let res;
      if (editOffer) {
        res = await homepageService.updateDailyOffer(editOffer.id, fd);
      } else {
        res = await homepageService.createDailyOffer(fd);
      }

      if (res && res.success) {
        toast.success(publishNow ? 'Daily Offer Published Live!' : 'Daily Offer Draft Saved!');
        setShowStudio(false);
        loadData();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('daily-offers-updated'));
        }
      } else {
        toast.error(res?.message || 'Failed to save daily offer');
      }
    } catch (err: any) {
      let msg = 'Failed to save daily offer';
      if (err?.response?.data) {
        const d = err.response.data;
        if (typeof d === 'string') {
          msg = d;
        } else if (d.message && d.message !== 'An error occurred.') {
          msg = d.message;
        } else if (d.error?.message) {
          msg = d.error.message;
          if (Array.isArray(d.error.details) && d.error.details.length > 0) {
            const firstDetail = d.error.details[0];
            const issueText =
              firstDetail?.issue || firstDetail?.message || firstDetail?.field || JSON.stringify(firstDetail);
            msg = `${msg}: ${issueText}`;
          }
        } else if (d.detail) {
          msg = d.detail;
        } else if (d.message) {
          msg = d.message;
        } else if (typeof d === 'object') {
          const meaningfulKeys = Object.keys(d).filter((k) => k !== 'success' && k !== 'data');
          if (meaningfulKeys.length > 0) {
            const firstKey = meaningfulKeys[0];
            const val = d[firstKey];
            msg = `${firstKey}: ${Array.isArray(val) ? val[0] : typeof val === 'object' ? JSON.stringify(val) : val}`;
          }
        }
      }
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Filtered searchable products for modal/selector
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return allProducts.slice(0, 15);
    const q = productSearchQuery.toLowerCase();
    return allProducts
      .filter((p) => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
      .slice(0, 20);
  }, [allProducts, productSearchQuery]);

  // Filtered searchable products for CTA destination picker
  const ctaFilteredProducts = useMemo(() => {
    if (!ctaProductSearchQuery.trim()) return allProducts.slice(0, 10);
    const q = ctaProductSearchQuery.toLowerCase();
    return allProducts
      .filter((p) => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
      .slice(0, 15);
  }, [allProducts, ctaProductSearchQuery]);

  // Selected CTA Product info
  const selectedCtaProduct = useMemo(() => {
    if (!form.cta_target_id || form.cta_action_type !== 'product') return null;
    return (
      allProducts.find(
        (p) =>
          p.slug === form.cta_target_id ||
          p.id === form.cta_target_id ||
          p.sku === form.cta_target_id
      ) || null
    );
  }, [allProducts, form.cta_target_id, form.cta_action_type]);

  // Real-time preview object
  const livePreviewOffer: DailyOffer = useMemo(() => {
    return {
      ...(DEFAULT_OFFER_FORM as DailyOffer),
      ...form,
      id: editOffer?.id || 'preview-daily-offer',
      items: form.items || [],
    } as DailyOffer;
  }, [form, editOffer]);

  return (
    <div className="space-y-6">
      {/* ============================================================
          VIEW 1: LIST / MANAGEMENT TABLE
         ============================================================ */}
      {!showStudio ? (
        <div className="space-y-6">
          {/* Top Action Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-50 text-[#006670]">
                  <Flame className="w-5 h-5 fill-current" />
                </span>
                <h2 className="text-xl font-bold text-slate-900">Daily Offers & Deals Management</h2>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Configure promotional banners with live countdown timers, hero artwork, and deal products.
              </p>
            </div>
            <button
              onClick={openCreateStudio}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#006670] hover:bg-[#004d54] text-white font-bold text-sm shadow-md shadow-teal-900/10 transition-all active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Daily Offer</span>
            </button>
          </div>

          {/* Offers Table */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">Loading promotional offers...</p>
            </div>
          ) : offers.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <Flame className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Daily Offers Created Yet</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Create your first promotional deals section with high-impact hero artwork and discounted products.
              </p>
              <button
                onClick={openCreateStudio}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#006670] hover:bg-[#004d54] text-white font-bold text-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="flex items-start gap-4">
                    {/* Theme / Image Thumbnail */}
                    <div className="w-16 h-16 rounded-xl shadow-inner shrink-0 relative overflow-hidden border border-slate-200 bg-teal-900">
                      <Image
                        src={offer.desktop_image_url || offer.desktop_image || DEFAULT_OFFER_FORM.desktop_image_url!}
                        alt={offer.title || 'Daily Offer Banner'}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-lg">
                          {offer.title || 'Untitled Banner Deal'}
                        </span>
                        {offer.badge_text && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-700">
                            {offer.badge_text}
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                            offer.status === 'live' && offer.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : offer.status === 'scheduled'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {offer.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{offer.subheading}</p>

                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
                        <span>Products: <strong className="text-slate-700">{offer.items?.length || 0}</strong></span>
                        <span>Countdown: <strong className="text-slate-700">{offer.countdown_enabled ? 'Enabled' : 'Disabled'}</strong></span>
                        <span>Layout: <strong className="text-slate-700 capitalize">{offer.image_position === 'center' ? 'Background Image' : `Split (${offer.image_position || 'right'})`}</strong></span>
                        {offer.end_date && (
                          <span>Ends: <strong className="text-slate-700">{new Date(offer.end_date).toLocaleDateString()}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {/* Quick Active Toggle */}
                    <button
                      onClick={() => handleToggleActive(offer)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        offer.is_active
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {offer.is_active ? 'Active' : 'Inactive'}
                    </button>

                    <button
                      onClick={() => handleDuplicate(offer)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Duplicate Offer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => openEditStudio(offer)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-[#006670] text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Customize</span>
                    </button>

                    <button
                      onClick={() => setDeleteTarget(offer)}
                      className="p-2 rounded-xl border border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                      title="Delete Offer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ============================================================
            VIEW 2: FULL BUILDER STUDIO WITH WYSIWYG
           ============================================================ */
        <div className="space-y-4">
          {/* Top Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowStudio(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                ← Back to Offers
              </button>
              <div>
                <h3 className="text-sm font-black text-white">Daily Offers Builder Studio</h3>
                <span className="text-[11px] text-slate-400">
                  {editOffer ? `Editing: ${form.title || editOffer.title || 'Untitled Offer'}` : 'New Daily Offers Campaign'}
                </span>
              </div>
            </div>

            {/* Viewport device toggle & Save actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewDevice === 'desktop' ? 'bg-[#006670] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewDevice === 'mobile' ? 'bg-[#006670] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile (375px)</span>
                </button>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Save Draft
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#006670] hover:bg-[#00525a] text-white text-xs font-black shadow-lg shadow-teal-900/20 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>{saving ? 'Publishing...' : 'Publish Live'}</span>
              </button>
            </div>
          </div>

          {/* Studio Workspace: Split Columns */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Configuration Controls (Tabs) */}
            <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50/70 p-1.5 gap-1">
                {[
                  { id: 'content', label: 'Content', icon: Type },
                  { id: 'artwork', label: 'Banner Image', icon: ImageIcon },
                  { id: 'countdown', label: 'Countdown', icon: Clock },
                  { id: 'cta', label: 'CTA Button', icon: ArrowRight },
                  { id: 'styling', label: 'Styling / Layout', icon: Layout },
                  { id: 'products', label: `Products (${form.items?.length || 0})`, icon: ShoppingCart },
                  { id: 'scheduling', label: 'Status & Visibility', icon: Calendar },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id as StudioTab)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white text-[#006670] shadow-2xs border border-slate-200/80'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Body */}
              <div className="p-5 max-h-[750px] overflow-y-auto space-y-4">
                {/* 1. CONTENT TAB */}
                {activeTab === 'content' && (
                  <div className="space-y-4">
                    {/* Informative Guidance Banner */}
                    <div className="p-3 bg-teal-50 border border-teal-200/80 rounded-xl text-xs text-[#004D54] flex items-start gap-2.5">
                      <span className="text-base leading-none shrink-0">💡</span>
                      <div>
                        <strong className="block font-bold">Content fields are completely optional:</strong>
                        If your uploaded banner artwork already contains the headline, discount percentages, timeline, and promo details, leave these fields blank. The image will render cleanly without duplicate text overlays.
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Offer Main Heading
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium">Optional</span>
                      </div>
                      <input
                        type="text"
                        value={form.title || ''}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g. Big Savings Today (or leave blank if inside image)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-[#006670] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Hot Deal Badge
                          </label>
                          <span className="text-[11px] text-slate-400 font-medium">Optional</span>
                        </div>
                        <input
                          type="text"
                          value={form.badge_text || ''}
                          onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
                          placeholder="🔥 DAILY DEALS"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Offer Highlight Tag
                          </label>
                          <span className="text-[11px] text-slate-400 font-medium">Optional</span>
                        </div>
                        <input
                          type="text"
                          value={form.offer_text || ''}
                          onChange={(e) => setForm({ ...form, offer_text: e.target.value })}
                          placeholder="UP TO 40% OFF"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Subheading / Description
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium">Optional</span>
                      </div>
                      <textarea
                        rows={2}
                        value={form.subheading || ''}
                        onChange={(e) => setForm({ ...form, subheading: e.target.value })}
                        placeholder="Limited-time deals on selected clinical products."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold resize-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Secondary Urgency Tag
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium">Optional</span>
                      </div>
                      <input
                        type="text"
                        value={form.secondary_text || ''}
                        onChange={(e) => setForm({ ...form, secondary_text: e.target.value })}
                        placeholder="Special clinical pricing while stocks last"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                      />
                    </div>

                    {/* Typography / Font Style Selector */}
                    <div className="pt-3 border-t border-slate-200">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Banner Font Style / Family
                      </label>
                      <p className="text-[11px] text-slate-500 mb-2">
                        Select typography for all dynamic text layers on this banner:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {BANNER_FONTS.map((font) => (
                          <button
                            key={font.id}
                            type="button"
                            onClick={() => setForm({ ...form, font_family: font.id })}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              (form.font_family || 'Inter') === font.id
                                ? 'border-[#006670] bg-teal-50/70 ring-2 ring-teal-500/20 shadow-xs'
                                : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <span
                              className="text-xs font-black block text-slate-900 truncate"
                              style={{ fontFamily: font.family }}
                            >
                              {font.name}
                            </span>
                            <span
                              className="text-[11px] text-slate-500 block mt-0.5 truncate"
                              style={{ fontFamily: font.family }}
                            >
                              {font.preview}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. BANNER IMAGE & ARTWORK TAB */}
                {activeTab === 'artwork' && (
                  <div className="space-y-5">
                    {/* Layout Mode Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Banner Layout Presentation
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'right', label: 'Split (Image Right)' },
                          { id: 'left', label: 'Split (Image Left)' },
                          { id: 'center', label: 'Full Background' },
                        ].map((pos) => (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => setForm({ ...form, image_position: pos.id as any })}
                            className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              (form.image_position || 'right') === pos.id
                                ? 'border-[#006670] bg-teal-50 text-[#006670] ring-2 ring-teal-500/20'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Image File Uploadation Section */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Banner Artwork Image File (Desktop)
                        </label>
                        <input
                          type="file"
                          ref={desktopFileInputRef}
                          accept="image/*"
                          onChange={handleDesktopImageChange}
                          className="hidden"
                        />

                        {form.desktop_image_url ? (
                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                            <div className="w-16 h-16 rounded-xl bg-teal-950 shrink-0 relative overflow-hidden border border-slate-300">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={form.desktop_image_url}
                                alt="Banner Artwork"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-xs text-slate-800 block truncate">
                                {desktopImageFile ? desktopImageFile.name : 'Active Banner Image'}
                              </span>
                              <span className="text-[11px] text-emerald-600 font-medium block">
                                {desktopImageFile
                                  ? `${(desktopImageFile.size / 1024).toFixed(1)} KB • Ready to save`
                                  : 'Image configured'}
                              </span>
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => desktopFileInputRef.current?.click()}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 cursor-pointer"
                                >
                                  <Upload className="w-3 h-3 text-[#006670]" />
                                  Change Image
                                </button>
                                <button
                                  type="button"
                                  onClick={handleRemoveDesktopImage}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[11px] font-bold text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => desktopFileInputRef.current?.click()}
                            className="border-2 border-dashed border-teal-600/30 hover:border-[#006670] bg-teal-50/20 hover:bg-teal-50/40 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 group"
                          >
                            <div className="w-12 h-12 rounded-xl bg-teal-100/80 text-[#006670] flex items-center justify-center group-hover:scale-105 transition-transform">
                              <Upload className="w-6 h-6" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-800 block">
                                Click to upload Banner Image
                              </span>
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                Supports PNG, JPG, WEBP or SVG
                              </span>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-[#006670] text-white text-[10px] font-bold shadow-xs">
                              Select Image File
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Optional Mobile Image File */}
                      <div className="pt-3 border-t border-slate-200">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Mobile Artwork File (Optional)
                        </label>
                        <input
                          type="file"
                          ref={mobileFileInputRef}
                          accept="image/*"
                          onChange={handleMobileImageChange}
                          className="hidden"
                        />

                        {form.mobile_image_url ? (
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-teal-950 shrink-0 relative overflow-hidden border border-slate-300">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={form.mobile_image_url}
                                alt="Mobile Banner Artwork"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-xs text-slate-800 block truncate">
                                {mobileImageFile ? mobileImageFile.name : 'Mobile Banner Image'}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <button
                                  type="button"
                                  onClick={() => mobileFileInputRef.current?.click()}
                                  className="text-[11px] font-bold text-[#006670] hover:underline cursor-pointer"
                                >
                                  Change
                                </button>
                                <span className="text-slate-300">•</span>
                                <button
                                  type="button"
                                  onClick={handleRemoveMobileImage}
                                  className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => mobileFileInputRef.current?.click()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5 text-slate-500" />
                              <span>Upload Mobile Artwork</span>
                            </button>
                            <span className="text-[11px] text-slate-400">Used for smaller screens</span>
                          </div>
                        )}
                      </div>

                      {/* Image Fit */}
                      <div className="pt-3 border-t border-slate-200">
                        <span className="block text-[11px] font-semibold text-slate-600 mb-1">Image Fit</span>
                        <div className="grid grid-cols-2 gap-2">
                          {['cover', 'contain'].map((fit) => (
                            <button
                              key={fit}
                              type="button"
                              onClick={() => setForm({ ...form, image_fit: fit as any })}
                              className={`py-1.5 px-3 rounded-lg border text-xs font-bold capitalize cursor-pointer ${
                                (form.image_fit || 'cover') === fit
                                  ? 'border-[#006670] bg-teal-50 text-[#006670]'
                                  : 'border-slate-200 text-slate-600'
                              }`}
                            >
                              {fit}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Overlay Opacity (for background mode) */}
                      {form.image_position === 'center' && (
                        <div>
                          <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 mb-1">
                            <span>Overlay Darkening</span>
                            <span>{form.overlay_opacity ?? 60}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="90"
                            value={form.overlay_opacity ?? 60}
                            onChange={(e) => setForm({ ...form, overlay_opacity: parseInt(e.target.value) })}
                            className="w-full accent-[#006670]"
                          />
                          <span className="text-[10px] text-slate-400 block mt-1">
                            Tip: Set to 0% for pre-designed banners with no text overlay.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. COUNTDOWN TAB */}
                {activeTab === 'countdown' && (
                  <div className="space-y-4">
                    {/* Enable / Disable Toggle */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">Enable Countdown Timer</span>
                        <span className="text-[11px] text-slate-500">Displays real-time hours, mins, secs countdown</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={form.countdown_enabled !== false}
                        onChange={(e) => setForm({ ...form, countdown_enabled: e.target.checked })}
                        className="w-5 h-5 accent-[#006670] rounded cursor-pointer"
                      />
                    </div>

                    {form.countdown_enabled !== false && (
                      <>
                        {/* Countdown Alignment */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Countdown Alignment
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'left', label: 'Left' },
                              { id: 'center', label: 'Center' },
                              { id: 'right', label: 'Right' },
                            ].map((pos) => (
                              <button
                                key={pos.id}
                                type="button"
                                onClick={() => setForm({ ...form, countdown_position: pos.id as any })}
                                className={`py-1.5 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                  (form.countdown_position || 'left') === pos.id
                                    ? 'border-[#006670] bg-teal-50 text-[#006670] ring-2 ring-teal-500/20'
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                              Deals End Date & Time
                            </label>
                            <input
                              type="datetime-local"
                              value={form.end_date || ''}
                              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                            />
                            <span className="text-[10px] text-slate-400 block mt-1">Timer counts down to this moment</span>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                              Start Date & Time (Optional)
                            </label>
                            <input
                              type="datetime-local"
                              value={form.start_date || ''}
                              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                            />
                          </div>
                        </div>

                        {/* Countdown Styling */}
                        <div className="pt-3 border-t border-slate-200 space-y-3">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Countdown Colors
                          </label>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="block text-[11px] font-semibold text-slate-600 mb-1">Box Background</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={form.countdown_bg_color || '#002B30'}
                                  onChange={(e) => setForm({ ...form, countdown_bg_color: e.target.value })}
                                  className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={form.countdown_bg_color || '#002B30'}
                                  onChange={(e) => setForm({ ...form, countdown_bg_color: e.target.value })}
                                  className="flex-1 px-2 py-1 border rounded text-xs font-mono uppercase"
                                />
                              </div>
                            </div>

                            <div>
                              <span className="block text-[11px] font-semibold text-slate-600 mb-1">Number / Text Color</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={form.countdown_text_color || '#FFFFFF'}
                                  onChange={(e) => setForm({ ...form, countdown_text_color: e.target.value })}
                                  className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={form.countdown_text_color || '#FFFFFF'}
                                  onChange={(e) => setForm({ ...form, countdown_text_color: e.target.value })}
                                  className="flex-1 px-2 py-1 border rounded text-xs font-mono uppercase"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 4. CTA TAB */}
                {activeTab === 'cta' && (
                  <div className="space-y-4">
                    {/* Enable / Disable Toggle */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">Enable CTA Button</span>
                        <span className="text-[11px] text-slate-500">Displays clickable action button on the banner</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={form.cta_enabled !== false}
                        onChange={(e) => setForm({ ...form, cta_enabled: e.target.checked })}
                        className="w-5 h-5 accent-[#006670] rounded cursor-pointer"
                      />
                    </div>

                    {form.cta_enabled !== false && (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Button Text
                          </label>
                          <input
                            type="text"
                            value={form.cta_text || ''}
                            onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                            placeholder="Shop Today's Deals →"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                          />
                        </div>

                        {/* Button Alignment */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Button Alignment
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'left', label: 'Left' },
                              { id: 'center', label: 'Center' },
                              { id: 'right', label: 'Right' },
                            ].map((pos) => (
                              <button
                                key={pos.id}
                                type="button"
                                onClick={() => setForm({ ...form, cta_position: pos.id as any })}
                                className={`py-1.5 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                  (form.cta_position || 'left') === pos.id
                                    ? 'border-[#006670] bg-teal-50 text-[#006670] ring-2 ring-teal-500/20'
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Button Colors */}
                        <div className="pt-3 border-t border-slate-200 space-y-3">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Button Colors
                          </label>
                          <div className="grid grid-cols-3 gap-2.5">
                            <div>
                              <span className="block text-[11px] font-semibold text-slate-600 mb-1">Background</span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="color"
                                  value={form.cta_bg_color || '#2DD4BF'}
                                  onChange={(e) => setForm({ ...form, cta_bg_color: e.target.value })}
                                  className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={form.cta_bg_color || '#2DD4BF'}
                                  onChange={(e) => setForm({ ...form, cta_bg_color: e.target.value })}
                                  className="w-full px-1.5 py-1 border rounded text-[10px] font-mono uppercase"
                                />
                              </div>
                            </div>

                            <div>
                              <span className="block text-[11px] font-semibold text-slate-600 mb-1">Text Color</span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="color"
                                  value={form.cta_text_color || '#002B30'}
                                  onChange={(e) => setForm({ ...form, cta_text_color: e.target.value })}
                                  className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={form.cta_text_color || '#002B30'}
                                  onChange={(e) => setForm({ ...form, cta_text_color: e.target.value })}
                                  className="w-full px-1.5 py-1 border rounded text-[10px] font-mono uppercase"
                                />
                              </div>
                            </div>

                            <div>
                              <span className="block text-[11px] font-semibold text-slate-600 mb-1">Border Color</span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="color"
                                  value={form.cta_border_color || '#14B8A6'}
                                  onChange={(e) => setForm({ ...form, cta_border_color: e.target.value })}
                                  className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={form.cta_border_color || '#14B8A6'}
                                  onChange={(e) => setForm({ ...form, cta_border_color: e.target.value })}
                                  className="w-full px-1.5 py-1 border rounded text-[10px] font-mono uppercase"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* CTA Destination */}
                        <div className="pt-3 border-t border-slate-200 space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                              CTA Destination Action
                            </label>
                            <select
                              value={form.cta_action_type || 'url'}
                              onChange={(e) => {
                                const val = e.target.value as any;
                                setForm({
                                  ...form,
                                  cta_action_type: val,
                                  cta_target_id: '',
                                  cta_url: val === 'url' ? '/daily-offers' : form.cta_url,
                                });
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                            >
                              <option value="url">Website URL (Default: /daily-offers/[id])</option>
                              <option value="product">Specific Product (Search & Select)</option>
                              <option value="category">Product Category</option>
                              <option value="brand">Brand</option>
                            </select>
                          </div>

                          {/* Specific Product Search & Selector */}
                          {form.cta_action_type === 'product' && (
                            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Target Product
                              </label>

                              {selectedCtaProduct ? (
                                <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-teal-200 shadow-2xs">
                                  {selectedCtaProduct.primary_image && (
                                    <div className="w-10 h-10 rounded bg-slate-100 relative overflow-hidden shrink-0 border border-slate-200">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={selectedCtaProduct.primary_image}
                                        alt={selectedCtaProduct.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <span className="font-bold text-xs text-slate-900 block truncate">
                                      {selectedCtaProduct.name}
                                    </span>
                                    <span className="text-[10px] text-slate-500 block">
                                      SKU: {selectedCtaProduct.sku || 'N/A'} • ₹{selectedCtaProduct.pricing?.selling_price || 0}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setForm({ ...form, cta_target_id: '' })}
                                    className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                                    title="Change product"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                                    <input
                                      type="text"
                                      value={ctaProductSearchQuery}
                                      onChange={(e) => setCtaProductSearchQuery(e.target.value)}
                                      placeholder="Search product by name or SKU..."
                                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-[#006670] focus:outline-none"
                                    />
                                  </div>

                                  <div className="max-h-40 overflow-y-auto space-y-1 bg-white rounded-lg border border-slate-200 p-1.5">
                                    {ctaFilteredProducts.length === 0 ? (
                                      <p className="text-center text-slate-400 text-xs py-2">No products found</p>
                                    ) : (
                                      ctaFilteredProducts.map((p) => (
                                        <div
                                          key={p.id}
                                          className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded text-xs gap-2"
                                        >
                                          <span className="truncate font-semibold text-slate-800">{p.name}</span>
                                          <button
                                            type="button"
                                            onClick={() => setForm({ ...form, cta_target_id: p.slug || p.id })}
                                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#006670] text-white hover:bg-[#004d54] shrink-0 cursor-pointer"
                                          >
                                            Select
                                          </button>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {form.cta_action_type === 'category' && (
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Select Category
                              </label>
                              <select
                                value={form.cta_target_id || ''}
                                onChange={(e) => setForm({ ...form, cta_target_id: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                              >
                                <option value="">-- Choose Category --</option>
                                {categories.map((c) => (
                                  <option key={c.id} value={c.slug}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {form.cta_action_type === 'brand' && (
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Select Brand
                              </label>
                              <select
                                value={form.cta_target_id || ''}
                                onChange={(e) => setForm({ ...form, cta_target_id: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                              >
                                <option value="">-- Choose Brand --</option>
                                {brands.map((b) => (
                                  <option key={b.id} value={b.slug}>
                                    {b.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {form.cta_action_type === 'url' && (
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Destination URL
                              </label>
                              <input
                                type="text"
                                value={form.cta_url || ''}
                                onChange={(e) => setForm({ ...form, cta_url: e.target.value })}
                                placeholder="/daily-offers"
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 5. STYLING & LAYOUT TAB */}
                {activeTab === 'styling' && (
                  <div className="space-y-5">
                    {/* Positioning Controls */}
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Dynamic Content Positioning
                      </label>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-600 mb-1">Horizontal Alignment</span>
                          <div className="grid grid-cols-3 gap-1">
                            {['left', 'center', 'right'].map((h) => (
                              <button
                                key={h}
                                type="button"
                                onClick={() => setForm({ ...form, horizontal_alignment: h as any })}
                                className={`py-1.5 px-2 rounded-lg border text-xs font-bold capitalize cursor-pointer ${
                                  (form.horizontal_alignment || 'left') === h
                                    ? 'border-[#006670] bg-teal-50 text-[#006670]'
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {h}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="block text-[11px] font-semibold text-slate-600 mb-1">Vertical Placement</span>
                          <div className="grid grid-cols-3 gap-1">
                            {['top', 'center', 'bottom'].map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setForm({ ...form, vertical_alignment: v as any })}
                                className={`py-1.5 px-2 rounded-lg border text-xs font-bold capitalize cursor-pointer ${
                                  (form.vertical_alignment || 'center') === v
                                    ? 'border-[#006670] bg-teal-50 text-[#006670]'
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[11px] font-semibold text-slate-600 mb-1">Content Width</span>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { id: 'small', label: 'Small' },
                            { id: 'medium', label: 'Medium' },
                            { id: 'large', label: 'Large' },
                            { id: 'full', label: 'Full Width' },
                          ].map((w) => (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => setForm({ ...form, content_width: w.id as any })}
                              className={`py-1 px-2 rounded-lg border text-xs font-bold cursor-pointer ${
                                (form.content_width || 'large') === w.id
                                  ? 'border-[#006670] bg-teal-50 text-[#006670]'
                                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {w.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Theme Presets */}
                    <div className="pt-3 border-t border-slate-200 space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Color Theme Presets
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {THEME_PRESETS.map((th) => (
                          <button
                            key={th.id}
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                theme: th.id as any,
                                bg_color: th.bg_color,
                                bg_gradient: th.bg_gradient,
                                heading_color: th.heading_color,
                                description_color: th.description_color,
                                badge_bg_color: th.badge_bg_color,
                                badge_text_color: th.badge_text_color,
                                offer_color: th.offer_color,
                                cta_bg_color: th.cta_bg_color,
                                cta_text_color: th.cta_text_color,
                                countdown_bg_color: th.countdown_bg_color,
                                countdown_text_color: th.countdown_text_color,
                              })
                            }
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                              form.theme === th.id
                                ? 'border-[#006670] ring-2 ring-teal-500/20 shadow-xs'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span className="text-xs font-black block text-slate-900">{th.name}</span>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/10"
                                style={{ backgroundColor: th.bg_color }}
                              />
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/10"
                                style={{ backgroundColor: th.cta_bg_color }}
                              />
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/10"
                                style={{ backgroundColor: th.offer_color }}
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Detailed Palette Customization */}
                    <div className="pt-3 border-t border-slate-200 space-y-3">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Banner Custom Palette
                      </label>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-600 mb-1">Heading Text</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.heading_color || '#FFFFFF'}
                              onChange={(e) => setForm({ ...form, heading_color: e.target.value })}
                              className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={form.heading_color || '#FFFFFF'}
                              onChange={(e) => setForm({ ...form, heading_color: e.target.value })}
                              className="flex-1 px-1.5 py-1 border rounded text-[11px] font-mono uppercase"
                            />
                          </div>
                        </div>

                        <div>
                          <span className="block text-[11px] font-semibold text-slate-600 mb-1">Description Text</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.description_color || '#CCECEE'}
                              onChange={(e) => setForm({ ...form, description_color: e.target.value })}
                              className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={form.description_color || '#CCECEE'}
                              onChange={(e) => setForm({ ...form, description_color: e.target.value })}
                              className="flex-1 px-1.5 py-1 border rounded text-[11px] font-mono uppercase"
                            />
                          </div>
                        </div>

                        <div>
                          <span className="block text-[11px] font-semibold text-slate-600 mb-1">Offer Tag Color</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.offer_color || '#2DD4BF'}
                              onChange={(e) => setForm({ ...form, offer_color: e.target.value })}
                              className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={form.offer_color || '#2DD4BF'}
                              onChange={(e) => setForm({ ...form, offer_color: e.target.value })}
                              className="flex-1 px-1.5 py-1 border rounded text-[11px] font-mono uppercase"
                            />
                          </div>
                        </div>

                        <div>
                          <span className="block text-[11px] font-semibold text-slate-600 mb-1">Badge Background</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.badge_bg_color || '#E6FFFA'}
                              onChange={(e) => setForm({ ...form, badge_bg_color: e.target.value })}
                              className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={form.badge_bg_color || '#E6FFFA'}
                              onChange={(e) => setForm({ ...form, badge_bg_color: e.target.value })}
                              className="flex-1 px-1.5 py-1 border rounded text-[11px] font-mono uppercase"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. PRODUCTS TAB */}
                {activeTab === 'products' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-teal-50/80 border border-teal-200/80 rounded-xl text-xs text-[#004D54]">
                      <span className="font-bold block mb-0.5">ℹ️ Dedicated Offer Landing Page:</span>
                      Products added here are displayed on this deal's dedicated landing page (<code className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-teal-200">/daily-offers/[id]</code>). The homepage presents an uncluttered hero banner directing shoppers to this page.
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Selected Deal Products ({form.items?.length || 0})
                      </span>
                    </div>

                    {/* Search & Add Products */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        placeholder="Search products by title or SKU to add..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-[#006670] focus:outline-none"
                      />
                    </div>

                    {/* Search Suggestions Dropdown */}
                    {productSearchQuery && (
                      <div className="border border-slate-200 rounded-xl p-2 max-h-48 overflow-y-auto space-y-1 bg-slate-50">
                        {filteredProducts.length === 0 ? (
                          <div className="text-xs text-slate-400 p-2 text-center">No products found</div>
                        ) : (
                          filteredProducts.map((p) => {
                            const isAdded = form.items?.some((i) => i.product === p.id || i.product_id === p.id);
                            return (
                              <div
                                key={p.id}
                                className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-100 text-xs hover:bg-slate-50"
                              >
                                <span className="font-semibold text-slate-800 line-clamp-1">{p.name}</span>
                                <button
                                  type="button"
                                  disabled={isAdded}
                                  onClick={() => handleAddProduct(p)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                    isAdded ? 'bg-slate-100 text-slate-400' : 'bg-[#006670] text-white hover:bg-[#004d54]'
                                  }`}
                                >
                                  {isAdded ? 'Added' : '+ Add'}
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* Selected Products List */}
                    <div className="space-y-2">
                      {form.items?.map((it, idx) => (
                        <div
                          key={it.id || idx}
                          className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200"
                        >
                          <div className="flex flex-col gap-0.5 text-slate-400">
                            <button
                              type="button"
                              onClick={() => handleMoveProduct(idx, 'up')}
                              disabled={idx === 0}
                              className="hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveProduct(idx, 'down')}
                              disabled={idx === (form.items?.length || 1) - 1}
                              className="hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-xs text-slate-800 block truncate">
                              {it.product_name}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="text"
                                value={it.badge_override || ''}
                                onChange={(e) => handleUpdateProductBadge(idx, e.target.value)}
                                placeholder="Badge (HOT DEAL)"
                                className="w-24 px-1.5 py-0.5 text-[11px] border rounded"
                              />
                              <input
                                type="number"
                                value={it.deal_price ?? ''}
                                onChange={(e) => handleUpdateProductDealPrice(idx, e.target.value)}
                                placeholder="Deal Price ₹"
                                className="w-24 px-1.5 py-0.5 text-[11px] border rounded"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                            title="Remove Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. SCHEDULING & STATUS TAB */}
                {activeTab === 'scheduling' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Publication Status
                      </label>
                      <select
                        value={form.status || 'live'}
                        onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                      >
                        <option value="draft">Draft (Admin Preview Only)</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="live">Live on Storefront</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">Is Active / Visible</span>
                        <span className="text-[11px] text-slate-500">Master switch for displaying on customer site</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={form.is_active !== false}
                        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                        className="w-5 h-5 accent-[#006670] rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Live Real-Time WYSIWYG Preview */}
            <div className="xl:col-span-7 bg-slate-100 rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-3 px-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#006670]" />
                  Live Real-Time Preview
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {previewDevice === 'mobile' ? 'Mobile View (375px Canvas)' : 'Desktop View (Full Canvas)'}
                </span>
              </div>

              {/* Canvas Viewport */}
              <div
                className={`transition-all duration-300 overflow-hidden ${
                  previewDevice === 'mobile' ? 'w-[375px] shadow-2xl' : 'w-full'
                }`}
              >
                <DailyOffersSection
                  previewOffer={livePreviewOffer}
                  isLivePreview={true}
                  previewDevice={previewDevice}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standard FAAZO Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Daily Offer"
        message={
          <span>
            Are you sure you want to delete{' '}
            <strong className="text-slate-900 font-semibold">
              &ldquo;{deleteTarget?.title || 'Untitled Banner Deal'}&rdquo;
            </strong>
            ? This action cannot be undone and will permanently remove this campaign from the storefront.
          </span>
        }
        confirmLabel="Delete Offer"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
};

export default DailyOffersManager;
