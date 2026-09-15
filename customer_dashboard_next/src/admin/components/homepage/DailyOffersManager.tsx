'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame, Plus, Trash2, Edit, Copy, ChevronUp, ChevronDown, Check,
  Eye, Monitor, Smartphone, Sparkles, Clock, Calendar, ArrowRight,
  Palette, Layout, Type, ShoppingCart, Image as ImageIcon, Save,
  Search, X, ExternalLink, Zap, RefreshCw, AlertCircle
} from 'lucide-react';
import type { DailyOffer, DailyOfferProduct } from '../../types/admin';
import { homepageService, adminService } from '../../services/adminService';
import { useToast } from '../Toast';
import DailyOffersSection from '@/components/store/daily-offers/DailyOffersSection';

// ─────────────────────────────────────────────────────────────────────────────
// Theme Presets Definition
// ─────────────────────────────────────────────────────────────────────────────
interface ThemePreset {
  id: string;
  name: string;
  bg_color: string;
  bg_gradient: string;
  heading_color: string;
  description_color: string;
  badge_bg_color: string;
  badge_text_color: string;
  offer_color: string;
  cta_bg_color: string;
  cta_text_color: string;
  cta_border_color: string;
  countdown_bg_color: string;
  countdown_text_color: string;
  product_badge_color: string;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'red_hot',
    name: 'Red Hot Deal (Urgent)',
    bg_color: '#991B1B',
    bg_gradient: 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 50%, #991B1B 100%)',
    heading_color: '#FFFFFF',
    description_color: '#FEE2E2',
    badge_bg_color: '#FEF3C7',
    badge_text_color: '#B45309',
    offer_color: '#FDE047',
    cta_bg_color: '#FBBF24',
    cta_text_color: '#78350F',
    cta_border_color: '#F59E0B',
    countdown_bg_color: '#111827',
    countdown_text_color: '#FFFFFF',
    product_badge_color: '#DC2626',
  },
  {
    id: 'dark_premium',
    name: 'Dark Premium (Luxury)',
    bg_color: '#0F172A',
    bg_gradient: 'linear-gradient(135deg, #090D16 0%, #0F172A 60%, #1E293B 100%)',
    heading_color: '#FFFFFF',
    description_color: '#94A3B8',
    badge_bg_color: 'rgba(245, 158, 11, 0.2)',
    badge_text_color: '#FBBF24',
    offer_color: '#F59E0B',
    cta_bg_color: '#F59E0B',
    cta_text_color: '#090D16',
    cta_border_color: '#D97706',
    countdown_bg_color: '#1E293B',
    countdown_text_color: '#F8FAFC',
    product_badge_color: '#F59E0B',
  },
  {
    id: 'orange_sale',
    name: 'Orange Sale (Energetic)',
    bg_color: '#EA580C',
    bg_gradient: 'linear-gradient(135deg, #C2410C 0%, #EA580C 50%, #FB923C 100%)',
    heading_color: '#FFFFFF',
    description_color: '#FFEDD5',
    badge_bg_color: '#FEF08A',
    badge_text_color: '#854D0E',
    offer_color: '#FEF08A',
    cta_bg_color: '#FFFFFF',
    cta_text_color: '#C2410C',
    cta_border_color: '#FED7AA',
    countdown_bg_color: '#431407',
    countdown_text_color: '#FFFFFF',
    product_badge_color: '#EA580C',
  },
  {
    id: 'teal_premium',
    name: 'FAAZO Teal (Clinical Trust)',
    bg_color: '#005963',
    bg_gradient: 'linear-gradient(135deg, #003B42 0%, #005963 50%, #007D8A 100%)',
    heading_color: '#FFFFFF',
    description_color: '#CCECEE',
    badge_bg_color: '#E6FFFA',
    badge_text_color: '#005963',
    offer_color: '#2DD4BF',
    cta_bg_color: '#2DD4BF',
    cta_text_color: '#003B42',
    cta_border_color: '#14B8A6',
    countdown_bg_color: '#002B30',
    countdown_text_color: '#FFFFFF',
    product_badge_color: '#005963',
  },
  {
    id: 'minimal_light',
    name: 'Minimal Light (Crisp Clean)',
    bg_color: '#F8FAFC',
    bg_gradient: 'linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 50%, #E2E8F0 100%)',
    heading_color: '#0F172A',
    description_color: '#475569',
    badge_bg_color: '#FEE2E2',
    badge_text_color: '#DC2626',
    offer_color: '#DC2626',
    cta_bg_color: '#0F172A',
    cta_text_color: '#FFFFFF',
    cta_border_color: '#1E293B',
    countdown_bg_color: '#0F172A',
    countdown_text_color: '#FFFFFF',
    product_badge_color: '#DC2626',
  },
];

const DEFAULT_OFFER_FORM: Partial<DailyOffer> = {
  title: 'Big Savings Today',
  badge_text: '🔥 DAILY DEALS',
  subheading: 'Limited-time deals on selected products.',
  offer_text: 'UP TO 40% OFF',
  secondary_text: 'Special clinical pricing while stocks last',
  offer_type: 'percentage',
  theme: 'red_hot',
  bg_color: '#991B1B',
  bg_gradient: 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 50%, #991B1B 100%)',
  heading_color: '#FFFFFF',
  description_color: '#FEE2E2',
  badge_bg_color: '#FEF3C7',
  badge_text_color: '#B45309',
  offer_color: '#FDE047',
  cta_bg_color: '#FBBF24',
  cta_text_color: '#78350F',
  cta_border_color: '#F59E0B',
  countdown_bg_color: '#111827',
  countdown_text_color: '#FFFFFF',
  product_badge_color: '#DC2626',
  horizontal_alignment: 'center',
  vertical_alignment: 'center',
  content_width: 'large',
  countdown_enabled: true,
  start_date: new Date().toISOString().substring(0, 16),
  end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 16),
  cta_text: "Shop Today's Deals →",
  cta_action_type: 'url',
  cta_url: '/daily-offers',
  status: 'live',
  is_active: true,
  items: [],
};

type StudioTab = 'content' | 'layout' | 'styling' | 'products' | 'countdown' | 'cta' | 'media' | 'scheduling';

export const DailyOffersManager: React.FC = () => {
  const toast = useToast();
  const [offers, setOffers] = useState<DailyOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Studio mode
  const [showStudio, setShowStudio] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTab>('content');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [editOffer, setEditOffer] = useState<DailyOffer | null>(null);
  const [form, setForm] = useState<Partial<DailyOffer>>(DEFAULT_OFFER_FORM);

  // Catalog selectors
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // Image uploads
  const [desktopImageFile, setDesktopImageFile] = useState<File | null>(null);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [offersRes, prodRes, catRes, brandRes] = await Promise.all([
        homepageService.getDailyOffers(),
        adminService.getProducts({ limit: 100 }),
        adminService.getCategories(),
        adminService.getBrands(),
      ]);

      if (offersRes.success && offersRes.data) {
        setOffers(offersRes.data);
      }
      if (prodRes.success && prodRes.data) {
        setAllProducts(prodRes.data);
      }
      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
      if (brandRes.success && brandRes.data) {
        setBrands(brandRes.data);
      }
    } catch {
      toast.error('Failed to load daily offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateStudio = () => {
    setEditOffer(null);
    setForm({
      ...DEFAULT_OFFER_FORM,
      items: allProducts.slice(0, 4).map((p, idx) => ({
        id: `temp-${idx}`,
        product: p.id,
        product_id: p.id,
        product_name: p.name,
        product_slug: p.slug,
        product_sku: p.sku,
        product_image: p.primary_image || (p.images && p.images[0]?.image) || null,
        brand_name: p.brand_name || 'Brand',
        category_name: p.category_name,
        deal_price: p.pricing?.selling_price || 0,
        badge_override: 'HOT DEAL',
        sort_order: idx,
        pricing: p.pricing,
      })),
    });
    setDesktopImageFile(null);
    setMobileImageFile(null);
    setActiveTab('content');
    setShowStudio(true);
  };

  const openEditStudio = (offer: DailyOffer) => {
    setEditOffer(offer);
    setForm({
      ...offer,
      start_date: offer.start_date ? offer.start_date.substring(0, 16) : '',
      end_date: offer.end_date ? offer.end_date.substring(0, 16) : '',
      items: offer.items ? [...offer.items] : [],
    });
    setDesktopImageFile(null);
    setMobileImageFile(null);
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

  const handleDelete = async (offer: DailyOffer) => {
    if (!window.confirm(`Are you sure you want to delete "${offer.title}"?`)) return;
    try {
      const res = await homepageService.deleteDailyOffer(offer.id);
      if (res.success) {
        toast.success('Offer deleted successfully');
        loadData();
      }
    } catch {
      toast.error('Failed to delete offer');
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

  const handleApplyTheme = (themeId: string) => {
    const preset = THEME_PRESETS.find((t) => t.id === themeId);
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      theme: preset.id as any,
      bg_color: preset.bg_color,
      bg_gradient: preset.bg_gradient,
      heading_color: preset.heading_color,
      description_color: preset.description_color,
      badge_bg_color: preset.badge_bg_color,
      badge_text_color: preset.badge_text_color,
      offer_color: preset.offer_color,
      cta_bg_color: preset.cta_bg_color,
      cta_text_color: preset.cta_text_color,
      cta_border_color: preset.cta_border_color,
      countdown_bg_color: preset.countdown_bg_color,
      countdown_text_color: preset.countdown_text_color,
      product_badge_color: preset.product_badge_color,
    }));
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

  const handleSave = async (publishNow = false) => {
    setSaving(true);
    try {
      const fd = new FormData();
      const statusToSave = publishNow ? 'live' : form.status || 'draft';
      const isActiveToSave = publishNow ? true : form.is_active !== false;

      // Append text/config fields
      Object.entries(form).forEach(([key, val]) => {
        if (key === 'items' || key === 'desktop_image' || key === 'mobile_image' || key === 'desktop_image_url' || key === 'mobile_image_url') {
          return;
        }
        if (val !== undefined && val !== null) {
          fd.append(key, String(val));
        }
      });

      fd.set('status', statusToSave);
      fd.set('is_active', String(isActiveToSave));

      // Append items as JSON
      const itemsPayload = (form.items || []).map((it, idx) => ({
        product_id: it.product_id || it.product,
        deal_price: it.deal_price || null,
        badge_override: it.badge_override || '',
        sort_order: idx,
      }));
      fd.append('items_data', JSON.stringify(itemsPayload));

      // Append images if selected
      if (desktopImageFile) fd.append('desktop_image', desktopImageFile);
      if (mobileImageFile) fd.append('mobile_image', mobileImageFile);

      let res;
      if (editOffer) {
        res = await homepageService.updateDailyOffer(editOffer.id, fd);
      } else {
        res = await homepageService.createDailyOffer(fd);
      }

      if (res.success) {
        toast.success(publishNow ? 'Daily Offer Published Live!' : 'Daily Offer Draft Saved!');
        setShowStudio(false);
        loadData();
      } else {
        toast.error(res.message || 'Failed to save offer');
      }
    } catch {
      toast.error('Unexpected error saving daily offer');
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
                <span className="p-2 rounded-xl bg-red-50 text-red-600">
                  <Flame className="w-5 h-5 fill-current" />
                </span>
                <h2 className="text-xl font-bold text-slate-900">Daily Offers & Hot Deals</h2>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Configure promotional banners with live countdown timers and discounted deal products.
              </p>
            </div>
            <button
              onClick={openCreateStudio}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md transition-all active:scale-98 cursor-pointer"
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
                Create your first promotional deals section with urgent countdown timers and sale products.
              </p>
              <button
                onClick={openCreateStudio}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-sm"
              >
                <Plus className="w-4 h-4" />
                Create Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {offers.map((offer, idx) => (
                <div
                  key={offer.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="flex items-start gap-4">
                    {/* Theme Swatch */}
                    <div
                      className="w-14 h-14 rounded-xl shadow-inner shrink-0 flex items-center justify-center text-white font-bold text-lg border border-black/10"
                      style={{ background: offer.bg_gradient || offer.bg_color }}
                    >
                      <Flame className="w-6 h-6 fill-current" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-lg">{offer.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-700">
                          {offer.badge_text}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${offer.status === 'live' && offer.is_active
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${offer.is_active
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                    >
                      {offer.is_active ? 'Active' : 'Disabled'}
                    </button>

                    {/* Duplicate */}
                    <button
                      onClick={() => handleDuplicate(offer)}
                      title="Duplicate Section"
                      className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEditStudio(offer)}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Customize</span>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(offer)}
                      title="Delete Section"
                      className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
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
            VIEW 2: IMMERSIVE TWO-COLUMN STUDIO & LIVE PREVIEW
           ============================================================ */
        <div className="space-y-4">
          {/* Top Studio Action Bar */}
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl flex items-center justify-between flex-wrap gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowStudio(false)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors"
              >
                ← Back to List
              </button>
              <span className="h-4 w-px bg-white/20" />
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400 fill-current" />
                <span className="font-extrabold text-sm sm:text-base">
                  {editOffer ? `Editing: ${form.title}` : 'New Daily Offers Campaign'}
                </span>
              </div>
            </div>

            {/* Viewport device toggle & Save actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${previewDevice === 'desktop' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${previewDevice === 'mobile' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile (375px)</span>
                </button>
              </div>

              <button
                disabled={saving}
                onClick={() => handleSave(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-colors disabled:opacity-50"
              >
                Save Draft
              </button>

              <button
                disabled={saving}
                onClick={() => handleSave(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-lg shadow-red-900/30 transition-all active:scale-98 disabled:opacity-50"
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
                  { id: 'styling', label: 'Themes & Colors', icon: Palette },
                  { id: 'products', label: `Products (${form.items?.length || 0})`, icon: ShoppingCart },
                  { id: 'layout', label: 'Layout', icon: Layout },
                  { id: 'countdown', label: 'Countdown', icon: Clock },
                  { id: 'cta', label: 'CTA Action', icon: ArrowRight },
                  { id: 'media', label: 'Banner Image', icon: ImageIcon },
                  { id: 'scheduling', label: 'Status', icon: Calendar },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as StudioTab)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${isActive
                          ? 'bg-white text-red-600 shadow-2xs border border-slate-200/80'
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
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Badge / Label
                      </label>
                      <input
                        type="text"
                        value={form.badge_text || ''}
                        onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
                        placeholder="🔥 DAILY DEALS"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Section Heading
                      </label>
                      <input
                        type="text"
                        value={form.title || ''}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="Big Savings Today"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Subheading / Description
                      </label>
                      <textarea
                        rows={2}
                        value={form.subheading || ''}
                        onChange={(e) => setForm({ ...form, subheading: e.target.value })}
                        placeholder="Limited-time deals on selected clinical products."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Offer Text / Highlight
                        </label>
                        <input
                          type="text"
                          value={form.offer_text || ''}
                          onChange={(e) => setForm({ ...form, offer_text: e.target.value })}
                          placeholder="UP TO 40% OFF"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-red-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Offer Type
                        </label>
                        <select
                          value={form.offer_type || 'percentage'}
                          onChange={(e) => setForm({ ...form, offer_type: e.target.value as any })}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-red-500 focus:outline-none"
                        >
                          <option value="percentage">Percentage Discount</option>
                          <option value="flat">Flat Discount</option>
                          <option value="bogo">Buy One Get One</option>
                          <option value="limited">Limited Time Deal</option>
                          <option value="new_arrival">New Arrival Deal</option>
                          <option value="clearance">Clearance</option>
                          <option value="custom">Custom Promotion</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Secondary Microcopy / Guarantee
                      </label>
                      <input
                        type="text"
                        value={form.secondary_text || ''}
                        onChange={(e) => setForm({ ...form, secondary_text: e.target.value })}
                        placeholder="Special clinical pricing while stocks last • 100% Genuine"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 2. THEMES & STYLING TAB */}
                {activeTab === 'styling' && (
                  <div className="space-y-5">
                    {/* Preset Theme Buttons */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Predefined Visual Themes
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {THEME_PRESETS.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleApplyTheme(t.id)}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${form.theme === t.id
                                ? 'border-red-600 bg-red-50/60 ring-2 ring-red-500/20'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                              }`}
                          >
                            <span
                              className="w-5 h-5 rounded-md shrink-0 shadow-2xs border border-black/10"
                              style={{ background: t.bg_gradient || t.bg_color }}
                            />
                            <span className="text-xs font-bold text-slate-800 line-clamp-1">{t.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Detailed Color Pickers */}
                    <div className="pt-2 border-t border-slate-200 space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Granular Color Customization
                      </h4>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Background Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.bg_color || '#991B1B'}
                              onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                              className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                            />
                            <input
                              type="text"
                              value={form.bg_color || ''}
                              onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                              className="w-full px-2 py-1 text-xs font-mono border rounded"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Heading Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.heading_color || '#FFFFFF'}
                              onChange={(e) => setForm({ ...form, heading_color: e.target.value })}
                              className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                            />
                            <input
                              type="text"
                              value={form.heading_color || ''}
                              onChange={(e) => setForm({ ...form, heading_color: e.target.value })}
                              className="w-full px-2 py-1 text-xs font-mono border rounded"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Badge Background</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.badge_bg_color || '#FEF3C7'}
                              onChange={(e) => setForm({ ...form, badge_bg_color: e.target.value })}
                              className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                            />
                            <input
                              type="text"
                              value={form.badge_bg_color || ''}
                              onChange={(e) => setForm({ ...form, badge_bg_color: e.target.value })}
                              className="w-full px-2 py-1 text-xs font-mono border rounded"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Badge Text Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.badge_text_color || '#B45309'}
                              onChange={(e) => setForm({ ...form, badge_text_color: e.target.value })}
                              className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                            />
                            <input
                              type="text"
                              value={form.badge_text_color || ''}
                              onChange={(e) => setForm({ ...form, badge_text_color: e.target.value })}
                              className="w-full px-2 py-1 text-xs font-mono border rounded"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Offer Tag Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.offer_color || '#FDE047'}
                              onChange={(e) => setForm({ ...form, offer_color: e.target.value })}
                              className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                            />
                            <input
                              type="text"
                              value={form.offer_color || ''}
                              onChange={(e) => setForm({ ...form, offer_color: e.target.value })}
                              className="w-full px-2 py-1 text-xs font-mono border rounded"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">CTA Button Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.cta_bg_color || '#FBBF24'}
                              onChange={(e) => setForm({ ...form, cta_bg_color: e.target.value })}
                              className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                            />
                            <input
                              type="text"
                              value={form.cta_bg_color || ''}
                              onChange={(e) => setForm({ ...form, cta_bg_color: e.target.value })}
                              className="w-full px-2 py-1 text-xs font-mono border rounded"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Countdown Box Bg</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.countdown_bg_color || '#111827'}
                              onChange={(e) => setForm({ ...form, countdown_bg_color: e.target.value })}
                              className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                            />
                            <input
                              type="text"
                              value={form.countdown_bg_color || ''}
                              onChange={(e) => setForm({ ...form, countdown_bg_color: e.target.value })}
                              className="w-full px-2 py-1 text-xs font-mono border rounded"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Product Badge Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.product_badge_color || '#DC2626'}
                              onChange={(e) => setForm({ ...form, product_badge_color: e.target.value })}
                              className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                            />
                            <input
                              type="text"
                              value={form.product_badge_color || ''}
                              onChange={(e) => setForm({ ...form, product_badge_color: e.target.value })}
                              className="w-full px-2 py-1 text-xs font-mono border rounded"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Custom CSS Background Gradient
                        </label>
                        <input
                          type="text"
                          value={form.bg_gradient || ''}
                          onChange={(e) => setForm({ ...form, bg_gradient: e.target.value })}
                          placeholder="linear-gradient(135deg, #7F1D1D 0%, #DC2626 50%, #991B1B 100%)"
                          className="w-full px-3 py-1.5 text-xs font-mono border rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. PRODUCTS TAB */}
                {activeTab === 'products' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-teal-50/80 border border-teal-200/80 rounded-xl text-xs text-[#004D54]">
                      <span className="font-bold block mb-0.5">ℹ️ Dedicated Offer Landing Page:</span>
                      Products configured here will be displayed on this deal's dedicated landing page (<code className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-teal-200">/daily-offers/[id]</code>). The homepage presents a clean, high-impact promotional banner directing shoppers to this page.
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
                                  disabled={isAdded}
                                  onClick={() => handleAddProduct(p)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${isAdded ? 'bg-slate-100 text-slate-400' : 'bg-red-600 text-white hover:bg-red-700'
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
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveProduct(idx, 'up')}
                              className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === (form.items?.length || 1) - 1}
                              onClick={() => handleMoveProduct(idx, 'down')}
                              className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs text-slate-800 truncate">{it.product_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="number"
                                value={it.deal_price ?? ''}
                                onChange={(e) => handleUpdateProductDealPrice(idx, e.target.value)}
                                placeholder="Deal Price"
                                className="w-24 px-2 py-0.5 text-xs border rounded bg-white"
                              />
                              <input
                                type="text"
                                value={it.badge_override || ''}
                                onChange={(e) => handleUpdateProductBadge(idx, e.target.value)}
                                placeholder="Badge (HOT DEAL)"
                                className="w-24 px-2 py-0.5 text-xs border rounded bg-white"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(idx)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. LAYOUT TAB */}
                {activeTab === 'layout' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Horizontal Alignment
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {['left', 'center', 'right'].map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => setForm({ ...form, horizontal_alignment: align as any })}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-all ${form.horizontal_alignment === align
                                ? 'border-red-600 bg-red-50 text-red-700 ring-2 ring-red-500/20'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Vertical Alignment
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {['top', 'center', 'bottom'].map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => setForm({ ...form, vertical_alignment: align as any })}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-all ${form.vertical_alignment === align
                                ? 'border-red-600 bg-red-50 text-red-700 ring-2 ring-red-500/20'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Content Width
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {['small', 'medium', 'large', 'full'].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setForm({ ...form, content_width: w as any })}
                            className={`py-2 px-2 rounded-xl border text-xs font-bold capitalize transition-all ${form.content_width === w
                                ? 'border-red-600 bg-red-50 text-red-700 ring-2 ring-red-500/20'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. COUNTDOWN TAB */}
                {activeTab === 'countdown' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">Enable Countdown Timer</span>
                        <span className="text-[11px] text-slate-500">Displays real-time hours, mins, secs countdown</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={form.countdown_enabled !== false}
                        onChange={(e) => setForm({ ...form, countdown_enabled: e.target.checked })}
                        className="w-5 h-5 accent-red-600 rounded cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Start Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={form.start_date || ''}
                        onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        End Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={form.end_date || ''}
                        onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                      />
                    </div>
                  </div>
                )}

                {/* 6. CTA TAB */}
                {activeTab === 'cta' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        CTA Button Text
                      </label>
                      <input
                        type="text"
                        value={form.cta_text || ''}
                        onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                        placeholder="Shop Today's Deals →"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        CTA Destination Type
                      </label>
                      <select
                        value={form.cta_action_type || 'url'}
                        onChange={(e) => setForm({ ...form, cta_action_type: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                      >
                        <option value="url">Custom URL / Internal Page</option>
                        <option value="category">Product Category</option>
                        <option value="brand">Brand</option>
                        <option value="product">Specific Product</option>
                      </select>
                    </div>

                    {form.cta_action_type === 'url' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Destination URL
                        </label>
                        <input
                          type="text"
                          value={form.cta_url || ''}
                          onChange={(e) => setForm({ ...form, cta_url: e.target.value })}
                          placeholder="/offers or https://..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                        />
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

                    {form.cta_action_type === 'product' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Select Product
                        </label>
                        <select
                          value={form.cta_target_id || ''}
                          onChange={(e) => setForm({ ...form, cta_target_id: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                        >
                          <option value="">-- Choose Product --</option>
                          {allProducts.map((p) => (
                            <option key={p.id} value={p.slug}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* 7. MEDIA TAB */}
                {activeTab === 'media' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      Promotional banner images are completely optional. The section is engineered to look stunning with pure typography and color gradients.
                    </p>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Desktop Artwork
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setDesktopImageFile(e.target.files?.[0] || null)}
                        className="w-full text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Mobile Artwork
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setMobileImageFile(e.target.files?.[0] || null)}
                        className="w-full text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* 8. SCHEDULING & STATUS TAB */}
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
                        <option value="draft">Draft (Hidden)</option>
                        <option value="scheduled">Scheduled (Activates automatically)</option>
                        <option value="live">Live (Visible on Homepage)</option>
                        <option value="expired">Expired</option>
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
                        className="w-5 h-5 accent-red-600 rounded cursor-pointer"
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
                  <Eye className="w-3.5 h-3.5 text-red-500" />
                  Live Real-Time Preview
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {previewDevice === 'desktop' ? 'Desktop View (Full Canvas)' : 'Mobile View (375px Device Frame)'}
                </span>
              </div>

              {/* Viewport Frame Container */}
              <div
                className={`transition-all duration-300 overflow-x-hidden ${previewDevice === 'mobile'
                    ? 'w-[375px] rounded-[36px] border-[8px] border-slate-800 shadow-2xl bg-white overflow-hidden my-4'
                    : 'w-full rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden'
                  }`}
              >
                {/* Mobile Device Notch Header */}
                {previewDevice === 'mobile' && (
                  <div className="w-full bg-slate-800 h-6 flex items-center justify-center">
                    <div className="w-20 h-3 bg-slate-900 rounded-full" />
                  </div>
                )}

                {/* Render Customer-Facing Component with Live Form State */}
                <DailyOffersSection
                  previewOffer={livePreviewOffer}
                  isLivePreview={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyOffersManager;
