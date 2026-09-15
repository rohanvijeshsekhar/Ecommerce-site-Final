import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, Edit2, ChevronDown, ChevronUp, Eye, EyeOff, X, Save,
  Package, Layers, Copy, Smartphone, Monitor, ArrowRight, Sparkles,
  ExternalLink, MoveUp, MoveDown, Check, Search, Calendar,
  Palette, Layout, Type, MousePointerClick, Image as ImageIcon
} from 'lucide-react';
import { homepageService, adminService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';
import type { FeaturedCollection, FeaturedCollectionItem } from '../../types/admin';
import LoadingOverlay from '../LoadingOverlay';
import ConfirmDialog from '../ConfirmDialog';
import EmptyState from '../EmptyState';
import ImageUploader from '../ImageUploader';

interface BannerFormState {
  title: string;
  description: string;
  is_visible: boolean;
  image: File | string | null;
  mobile_image: File | string | null;
  banner_layout: 'split' | 'background' | 'solid';
  content_width: 'narrow' | 'medium' | 'wide' | 'full';
  horizontal_alignment: 'left' | 'center' | 'right';
  vertical_alignment: 'top' | 'center' | 'bottom';
  badge_text: string;
  offer_text: string;
  secondary_text: string;
  cta_text: string;
  cta_action_type: 'product' | 'category' | 'brand' | 'url';
  cta_target_id: string;
  cta_url: string;
  cta_style: 'filled' | 'outline' | 'ghost';
  cta_open_in_new_tab: boolean;
  heading_size: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  heading_weight: 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
  heading_color: string;
  description_color: string;
  badge_color: string;
  badge_bg_color: string;
  cta_bg_color: string;
  cta_text_color: string;
  cta_border_color: string;
  bg_color: string;
  image_position: 'left' | 'right';
  image_fit: 'cover' | 'contain';
  overlay_gradient: 'none' | 'left' | 'right' | 'top' | 'bottom' | 'radial' | 'dark';
  overlay_opacity: number;
  start_date: string;
  end_date: string;
}

const DEFAULT_FORM: BannerFormState = {
  title: 'Advanced Solutions for Every Practice',
  description: 'Engineered for precision. Designed for comfort. Built to elevate patient care.',
  is_visible: true,
  image: null,
  mobile_image: null,
  banner_layout: 'split',
  content_width: 'medium',
  horizontal_alignment: 'left',
  vertical_alignment: 'center',
  badge_text: 'FEATURED COLLECTION',
  offer_text: '',
  secondary_text: '',
  cta_text: 'Explore Collection',
  cta_action_type: 'url',
  cta_target_id: '',
  cta_url: '/offers',
  cta_style: 'filled',
  cta_open_in_new_tab: false,
  heading_size: 'lg',
  heading_weight: 'black',
  heading_color: '#0F172A',
  description_color: '#334155',
  badge_color: '#006670',
  badge_bg_color: 'rgba(0, 102, 112, 0.12)',
  cta_bg_color: '#006670',
  cta_text_color: '#FFFFFF',
  cta_border_color: '#006670',
  bg_color: '#E8F5F4',
  image_position: 'right',
  image_fit: 'contain',
  overlay_gradient: 'left',
  overlay_opacity: 40,
  start_date: '',
  end_date: '',
};

const PRESET_BG_COLORS = [
  { name: 'Mint Clean', hex: '#E8F5F4' },
  { name: 'Soft Emerald', hex: '#F0FDF4' },
  { name: 'Warm Cream', hex: '#FFFBEB' },
  { name: 'Slate Ice', hex: '#F1F5F9' },
  { name: 'Pure White', hex: '#FFFFFF' },
  { name: 'Royal Teal', hex: '#003B46' },
  { name: 'Midnight Navy', hex: '#0F172A' },
  { name: 'Dark Obsidian', hex: '#18181B' },
];

const FeaturedCollectionsManager: React.FC = () => {
  const { showToast } = useAdmin();
  const [collections, setCollections] = useState<FeaturedCollection[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; sku: string; slug?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showStudio, setShowStudio] = useState(false);
  const [editColl, setEditColl] = useState<FeaturedCollection | null>(null);
  const [deleteColl, setDeleteColl] = useState<FeaturedCollection | null>(null);
  const [deleteItem, setDeleteItem] = useState<FeaturedCollectionItem | null>(null);
  const [addingProductTo, setAddingProductTo] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState('');

  // Studio tabs & device preview state
  const [activeTab, setActiveTab] = useState<'content' | 'layout' | 'media' | 'typography' | 'cta' | 'schedule'>('content');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [productSearch, setProductSearch] = useState('');

  // Form State
  const [form, setForm] = useState<BannerFormState>(DEFAULT_FORM);

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        homepageService.getFeaturedCollections(),
        adminService.getProducts({ page_size: 200, status: 'active' }),
      ]);
      if (cRes.success && cRes.data) setCollections(cRes.data);
      if (pRes.success && pRes.data) {
        const prodData = (pRes.data as any).results || pRes.data;
        setProducts(Array.isArray(prodData) ? prodData : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreateBanner = () => {
    setEditColl(null);
    setForm(DEFAULT_FORM);
    setActiveTab('content');
    setPreviewDevice('desktop');
    setShowStudio(true);
  };

const normalizeWidth = (w?: string): 'narrow' | 'medium' | 'wide' | 'full' => {
  if (w === 'small') return 'narrow';
  if (w === 'large') return 'wide';
  if (w === 'narrow' || w === 'wide' || w === 'full') return w;
  return 'medium';
};

const normalizeHeadingSize = (s?: string): 'sm' | 'md' | 'lg' | 'xl' | '2xl' => {
  if (s === 'medium') return 'md';
  if (s === 'large') return 'lg';
  if (s === 'xlarge') return 'xl';
  if (s === 'jumbo') return '2xl';
  if (s === 'sm' || s === 'md' || s === 'lg' || s === 'xl' || s === '2xl') return s;
  return 'lg';
};

const normalizeHeadingWeight = (w?: string): 'normal' | 'medium' | 'semibold' | 'bold' | 'black' => {
  if (w === 'extrabold') return 'black';
  if (w === 'normal' || w === 'medium' || w === 'semibold' || w === 'bold' || w === 'black') return w;
  return 'black';
};

const normalizeImagePosition = (p?: string): 'left' | 'right' => {
  return p === 'left' ? 'left' : 'right';
};

const normalizeOverlayGradient = (g?: string): 'none' | 'left' | 'right' | 'top' | 'bottom' | 'radial' | 'dark' => {
  if (g === 'teal' || g === 'light') return 'left';
  if (g === 'none' || g === 'left' || g === 'right' || g === 'top' || g === 'bottom' || g === 'radial' || g === 'dark') return g;
  return 'left';
};

  const openEditBanner = (c: FeaturedCollection) => {
    setEditColl(c);
    setForm({
      title: c.title || '',
      description: c.description || '',
      is_visible: c.is_visible !== false,
      image: c.image_url || c.image || null,
      mobile_image: c.mobile_image_url || c.mobile_image || null,
      banner_layout: c.banner_layout || 'split',
      content_width: normalizeWidth(c.content_width),
      horizontal_alignment: c.horizontal_alignment || 'left',
      vertical_alignment: c.vertical_alignment || 'center',
      badge_text: c.badge_text || '',
      offer_text: c.offer_text || '',
      secondary_text: c.secondary_text || '',
      cta_text: c.cta_text || 'Explore Collection',
      cta_action_type: c.cta_action_type || 'url',
      cta_target_id: c.cta_target_id || '',
      cta_url: c.cta_url || '/offers',
      cta_style: c.cta_style || 'filled',
      cta_open_in_new_tab: Boolean(c.cta_open_in_new_tab),
      heading_size: normalizeHeadingSize(c.heading_size),
      heading_weight: normalizeHeadingWeight(c.heading_weight),
      heading_color: c.heading_color || '#0F172A',
      description_color: c.description_color || '#334155',
      badge_color: c.badge_color || '#006670',
      badge_bg_color: c.badge_bg_color || 'rgba(0, 102, 112, 0.12)',
      cta_bg_color: c.cta_bg_color || '#006670',
      cta_text_color: c.cta_text_color || '#FFFFFF',
      cta_border_color: c.cta_border_color || '#006670',
      bg_color: c.bg_color || '#E8F5F4',
      image_position: normalizeImagePosition(c.image_position),
      image_fit: c.image_fit || 'contain',
      overlay_gradient: normalizeOverlayGradient(c.overlay_gradient),
      overlay_opacity: c.overlay_opacity ?? 40,
      start_date: c.start_date ? c.start_date.substring(0, 16) : '',
      end_date: c.end_date ? c.end_date.substring(0, 16) : '',
    });
    setActiveTab('content');
    setPreviewDevice('desktop');
    setShowStudio(true);
  };

  const handleDuplicate = async (c: FeaturedCollection) => {
    try {
      const res = await homepageService.duplicateFeaturedCollection(c.id);
      if (res.success) {
        showToast({ variant: 'success', title: 'Banner duplicated successfully' });
        load();
      }
    } catch {
      showToast({ variant: 'error', title: 'Failed to duplicate banner' });
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= collections.length) return;

    const newOrder = [...collections];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIdx, 0, moved);

    // Optimistic UI update
    setCollections(newOrder);

    try {
      const payload = newOrder.map((item, idx) => ({ id: item.id, sort_order: idx }));
      await homepageService.reorderFeaturedCollections(payload);
      showToast({ variant: 'success', title: 'Banner reordered' });
    } catch {
      showToast({ variant: 'error', title: 'Failed to update order' });
      load();
    }
  };

  const saveBanner = async () => {
    if (!form.title.trim()) {
      showToast({ variant: 'error', title: 'Headline / Title is required' });
      setActiveTab('content');
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('description', form.description);
      fd.append('is_visible', String(form.is_visible));
      fd.append('banner_layout', form.banner_layout);
      fd.append('content_width', form.content_width);
      fd.append('horizontal_alignment', form.horizontal_alignment);
      fd.append('vertical_alignment', form.vertical_alignment);
      fd.append('badge_text', form.badge_text);
      fd.append('offer_text', form.offer_text);
      fd.append('secondary_text', form.secondary_text);
      fd.append('cta_text', form.cta_text);
      fd.append('cta_action_type', form.cta_action_type);
      fd.append('cta_target_id', form.cta_target_id);
      fd.append('cta_url', form.cta_url);
      fd.append('cta_style', form.cta_style);
      fd.append('cta_open_in_new_tab', String(form.cta_open_in_new_tab));
      fd.append('heading_size', form.heading_size);
      fd.append('heading_weight', form.heading_weight);
      fd.append('heading_color', form.heading_color);
      fd.append('description_color', form.description_color);
      fd.append('badge_color', form.badge_color);
      fd.append('badge_bg_color', form.badge_bg_color);
      fd.append('cta_bg_color', form.cta_bg_color);
      fd.append('cta_text_color', form.cta_text_color);
      fd.append('cta_border_color', form.cta_border_color);
      fd.append('bg_color', form.bg_color);
      fd.append('image_position', form.image_position);
      fd.append('image_fit', form.image_fit);
      fd.append('overlay_gradient', form.overlay_gradient);
      fd.append('overlay_opacity', String(form.overlay_opacity));

      if (form.start_date) {
        fd.append('start_date', new Date(form.start_date).toISOString());
      } else {
        fd.append('start_date', '');
      }

      if (form.end_date) {
        fd.append('end_date', new Date(form.end_date).toISOString());
      } else {
        fd.append('end_date', '');
      }

      // Desktop image
      if (form.image instanceof File) {
        fd.append('image', form.image);
      } else if (form.image === null && editColl?.image) {
        fd.append('image', '');
      }

      // Mobile image
      if (form.mobile_image instanceof File) {
        fd.append('mobile_image', form.mobile_image);
      } else if (form.mobile_image === null && editColl?.mobile_image) {
        fd.append('mobile_image', '');
      }

      const res = editColl
        ? await homepageService.updateFeaturedCollection(editColl.id, fd)
        : await homepageService.createFeaturedCollection(fd);

      if (res.success) {
        showToast({
          variant: 'success',
          title: editColl ? 'Promotional banner updated' : 'Promotional banner created',
        });
        setShowStudio(false);
        load();
      } else {
        showToast({ variant: 'error', title: res.message || 'Save failed' });
      }
    } catch {
      showToast({ variant: 'error', title: 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteColl = async () => {
    if (!deleteColl) return;
    await homepageService.deleteFeaturedCollection(deleteColl.id);
    showToast({ variant: 'success', title: 'Banner deleted' });
    setDeleteColl(null);
    load();
  };

  const addItem = async (collectionId: string) => {
    if (!selectedProduct) return;
    await homepageService.createCollectionItem({
      collection: collectionId,
      product: selectedProduct,
      sort_order: 0,
    });
    showToast({ variant: 'success', title: 'Product added' });
    setAddingProductTo(null);
    setSelectedProduct('');
    load();
  };

  const removeItem = async () => {
    if (!deleteItem) return;
    await homepageService.deleteCollectionItem(deleteItem.id);
    showToast({ variant: 'success', title: 'Product removed' });
    setDeleteItem(null);
    load();
  };

  const toggleVisible = async (c: FeaturedCollection) => {
    await homepageService.updateFeaturedCollection(c.id, { ...c, is_visible: !c.is_visible });
    load();
  };

  // Filter products for CTA selection
  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 15);
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 20);
  }, [products, productSearch]);

  const handleSelectCtaProduct = (product: { id: string; name: string; slug?: string }) => {
    const slug = product.slug || product.id;
    setForm(f => ({
      ...f,
      cta_action_type: 'product',
      cta_target_id: product.id,
      cta_url: `/products/${slug}`,
    }));
    setProductSearch('');
  };

  // Preview helper values
  const desktopImgUrl = form.image instanceof File ? URL.createObjectURL(form.image) : form.image;
  const mobileImgUrl = form.mobile_image instanceof File ? URL.createObjectURL(form.mobile_image) : form.mobile_image || desktopImgUrl;

  const previewHeadingClass = {
    sm: 'text-xl sm:text-2xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl',
    xl: 'text-4xl sm:text-5xl',
    '2xl': 'text-5xl sm:text-6xl',
  }[form.heading_size];

  const previewWeightClass = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    black: 'font-black',
  }[form.heading_weight];

  const getOverlayStyle = () => {
    const opacity = form.overlay_opacity / 100;
    switch (form.overlay_gradient) {
      case 'left':
        return `linear-gradient(to right, rgba(0,0,0,${Math.min(0.95, opacity * 1.5)}) 0%, rgba(0,0,0,${opacity}) 55%, rgba(0,0,0,0.05) 100%)`;
      case 'right':
        return `linear-gradient(to left, rgba(0,0,0,${Math.min(0.95, opacity * 1.5)}) 0%, rgba(0,0,0,${opacity}) 55%, rgba(0,0,0,0.05) 100%)`;
      case 'top':
        return `linear-gradient(to bottom, rgba(0,0,0,${Math.min(0.95, opacity * 1.5)}) 0%, rgba(0,0,0,${opacity}) 55%, rgba(0,0,0,0.05) 100%)`;
      case 'bottom':
        return `linear-gradient(to top, rgba(0,0,0,${Math.min(0.95, opacity * 1.5)}) 0%, rgba(0,0,0,${opacity}) 55%, rgba(0,0,0,0.05) 100%)`;
      case 'dark':
        return `rgba(0,0,0,${opacity})`;
      case 'radial':
        return `radial-gradient(circle at center, rgba(0,0,0,${opacity * 0.4}) 0%, rgba(0,0,0,${Math.min(0.95, opacity * 1.4)}) 100%)`;
      case 'none':
      default:
        return 'transparent';
    }
  };

  if (loading) return <LoadingOverlay message="Loading Promotional Banners…" />;

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#006670]" />
            Promotional & Featured Banners
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Edge-to-edge high-impact promotional banners for the storefront homepage. Supports multi-banner carousels, custom typography, CTA destinations, and scheduling.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {collections.length} {collections.length === 1 ? 'Banner' : 'Banners'}
          </span>
          <button
            onClick={openCreateBanner}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#006670] hover:bg-[#004e56] text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Banner
          </button>
        </div>
      </div>

      {/* Banner Cards List */}
      {collections.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-12 h-12 text-slate-300" />}
          title="No promotional banners configured"
          description="Build your first full-width edge-to-edge promotional banner to engage store visitors with hero offers."
          action={
            <button
              onClick={openCreateBanner}
              className="mt-4 px-5 py-2.5 bg-[#006670] text-white rounded-xl text-sm font-semibold hover:bg-[#004e56] shadow-sm cursor-pointer"
            >
              Launch Banner Builder
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {collections.map((coll, index) => (
            <div
              key={coll.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-all"
            >
              <div
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                onClick={() => setExpanded(expanded === coll.id ? null : coll.id)}
              >
                {/* Left Thumbnail & Info */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Reorder Buttons */}
                  <div className="flex flex-col gap-1 items-center flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      disabled={index === 0}
                      onClick={() => handleMoveOrder(index, 'up')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100 rounded cursor-pointer"
                      title="Move up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={index === collections.length - 1}
                      onClick={() => handleMoveOrder(index, 'down')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100 rounded cursor-pointer"
                      title="Move down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Thumbnail */}
                  <div
                    className="w-20 h-14 rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 relative flex items-center justify-center"
                    style={{ backgroundColor: coll.bg_color || '#E8F5F4' }}
                  >
                    {coll.image_url || coll.image ? (
                      <img
                        src={coll.image_url || coll.image || ''}
                        className={`w-full h-full ${coll.image_fit === 'cover' ? 'object-cover' : 'object-contain p-1'}`}
                        alt={coll.title}
                      />
                    ) : (
                      <Layers className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-bold text-slate-800 text-sm truncate">{coll.title}</p>
                      {coll.is_visible ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Storefront
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          Hidden
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase tracking-wider">
                        {coll.banner_layout || 'split'}
                      </span>
                      {coll.offer_text && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {coll.offer_text}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>CTA: <strong className="text-slate-700">{coll.cta_text || 'Explore'}</strong> &rarr; {coll.cta_url || '/offers'}</span>
                      {coll.start_date && (
                        <span className="text-indigo-600 font-medium">
                          From: {new Date(coll.start_date).toLocaleDateString()}
                        </span>
                      )}
                      {coll.end_date && (
                        <span className="text-rose-600 font-medium">
                          Until: {new Date(coll.end_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => toggleVisible(coll)}
                    title={coll.is_visible ? 'Deactivate banner' : 'Activate banner'}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      coll.is_visible
                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                        : 'text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {coll.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => handleDuplicate(coll)}
                    title="Duplicate Banner"
                    className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => openEditBanner(coll)}
                    title="Open Banner Studio"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Customize
                  </button>

                  <button
                    onClick={() => setDeleteColl(coll)}
                    title="Delete Banner"
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setExpanded(expanded === coll.id ? null : coll.id)}
                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
                  >
                    {expanded === coll.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Nested Product Items (Optional Curated Products) */}
              {expanded === coll.id && (
                <div className="p-5 bg-slate-50/50 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Associated Curated Products ({coll.items?.length || 0})
                    </h4>
                    <span className="text-[11px] text-slate-400">Products linked to this collection collection</span>
                  </div>

                  {!coll.items || coll.items.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center bg-white rounded-xl border border-dashed border-slate-200">
                      No specific products attached yet. You can attach products below or rely on the CTA URL.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {coll.items.map(item => (
                        <div key={item.id} className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200/80 group">
                          <div className="w-9 h-9 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {item.product_image ? (
                              <img src={item.product_image} className="w-full h-full object-cover" alt={item.product_name} />
                            ) : (
                              <Package className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <span className="flex-1 text-xs font-medium text-slate-700 truncate">{item.product_name}</span>
                          <button
                            onClick={() => setDeleteItem(item)}
                            className="p-1 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-50 rounded transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Product Row */}
                  {addingProductTo === coll.id ? (
                    <div className="flex items-center gap-2 pt-2">
                      <select
                        value={selectedProduct}
                        onChange={e => setSelectedProduct(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#006670]/30"
                      >
                        <option value="">— Select product to link —</option>
                        {products.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => addItem(coll.id)}
                        className="px-4 py-2 bg-[#006670] text-white text-xs font-semibold rounded-xl hover:bg-[#004e56] cursor-pointer"
                      >
                        Add Product
                      </button>
                      <button
                        onClick={() => {
                          setAddingProductTo(null);
                          setSelectedProduct('');
                        }}
                        className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAddingProductTo(coll.id);
                        setSelectedProduct('');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-[#006670] font-semibold hover:underline pt-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Product to Collection
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          FULL-SCREEN BANNER BUILDER STUDIO MODAL
      ───────────────────────────────────────────────────────────── */}
      {showStudio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-6 overflow-hidden">
          <div className="bg-white w-full max-w-[1500px] h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Studio Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#006670] text-white flex items-center justify-center shadow-sm">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editColl ? 'Promotional Banner Studio — Edit' : 'Promotional Banner Studio — New Banner'}
                  </h3>
                  <p className="text-xs text-slate-500">Live WYSIWYG configuration with instant desktop & mobile preview.</p>
                </div>
              </div>

              {/* Device Viewport Switcher & Actions */}
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      previewDevice === 'desktop'
                        ? 'bg-[#006670] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      previewDevice === 'mobile'
                        ? 'bg-[#006670] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Mobile
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowStudio(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Studio Body: Left Configurator Panel | Right Live Canvas */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left Configurator Column */}
              <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col border-r border-slate-200 bg-white flex-shrink-0 overflow-hidden">
                {/* Navigation Tabs */}
                <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-slate-50/50 overflow-x-auto flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('content')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'content' ? 'bg-white text-[#006670] shadow-xs border border-slate-200' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Type className="w-3.5 h-3.5" />
                    Content
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('layout')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'layout' ? 'bg-white text-[#006670] shadow-xs border border-slate-200' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Layout className="w-3.5 h-3.5" />
                    Layout
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('media')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'media' ? 'bg-white text-[#006670] shadow-xs border border-slate-200' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Media
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('typography')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'typography' ? 'bg-white text-[#006670] shadow-xs border border-slate-200' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    Styling
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('cta')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'cta' ? 'bg-white text-[#006670] shadow-xs border border-slate-200' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <MousePointerClick className="w-3.5 h-3.5" />
                    CTA
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('schedule')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'schedule' ? 'bg-white text-[#006670] shadow-xs border border-slate-200' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Schedule
                  </button>
                </div>

                {/* Tab Content Panels (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* ────────────────────────────────────────────────
                      TAB 1: CONTENT
                  ──────────────────────────────────────────────── */}
                  {activeTab === 'content' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Headline / Title *
                        </label>
                        <input
                          type="text"
                          value={form.title}
                          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="e.g. Advanced Solutions for Every Practice"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Badge / Category Pill Text
                        </label>
                        <input
                          type="text"
                          value={form.badge_text}
                          onChange={e => setForm(f => ({ ...f, badge_text: e.target.value }))}
                          placeholder="e.g. FEATURED COLLECTION or EXCLUSIVE LAUNCH"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Offer Highlight Tag (Optional)
                        </label>
                        <input
                          type="text"
                          value={form.offer_text}
                          onChange={e => setForm(f => ({ ...f, offer_text: e.target.value }))}
                          placeholder="e.g. FLAT 40% OFF or LIMITED PERIOD"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Description Copy
                        </label>
                        <textarea
                          rows={3}
                          value={form.description}
                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="Highlight the key benefit, materials, technology, or promotion..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30 resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Secondary Micro-copy / Terms (Optional)
                        </label>
                        <input
                          type="text"
                          value={form.secondary_text}
                          onChange={e => setForm(f => ({ ...f, secondary_text: e.target.value }))}
                          placeholder="e.g. *Valid till stock lasts. Free clinical demonstration included."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30"
                        />
                      </div>
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────
                      TAB 2: LAYOUT & ALIGNMENT
                  ──────────────────────────────────────────────── */}
                  {activeTab === 'layout' && (
                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                          Banner Layout Style
                        </label>
                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { id: 'split', label: 'Split (Image + Content)', desc: '50/50 Side-by-side' },
                            { id: 'background', label: 'Full Background', desc: 'Edge-to-edge overlay' },
                            { id: 'solid', label: 'Solid / Minimal', desc: 'Editorial typography' },
                          ].map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setForm(f => ({ ...f, banner_layout: item.id as any }))}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                form.banner_layout === item.id
                                  ? 'border-[#006670] bg-[#006670]/5 ring-1 ring-[#006670]'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <p className="font-bold text-xs text-slate-800">{item.label}</p>
                              <p className="text-[10px] text-slate-500 mt-1">{item.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {form.banner_layout === 'split' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-2">
                            Image Side
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setForm(f => ({ ...f, image_position: 'left' }))}
                              className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center cursor-pointer ${
                                form.image_position === 'left'
                                  ? 'border-[#006670] bg-[#006670]/5 text-[#006670]'
                                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              Image on Left
                            </button>
                            <button
                              type="button"
                              onClick={() => setForm(f => ({ ...f, image_position: 'right' }))}
                              className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center cursor-pointer ${
                                form.image_position === 'right'
                                  ? 'border-[#006670] bg-[#006670]/5 text-[#006670]'
                                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              Image on Right
                            </button>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                          Horizontal Text Alignment
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {['left', 'center', 'right'].map(align => (
                            <button
                              key={align}
                              type="button"
                              onClick={() => setForm(f => ({ ...f, horizontal_alignment: align as any }))}
                              className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize text-center cursor-pointer ${
                                form.horizontal_alignment === align
                                  ? 'border-[#006670] bg-[#006670]/5 text-[#006670]'
                                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {align}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                          Vertical Alignment
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {['top', 'center', 'bottom'].map(vAlign => (
                            <button
                              key={vAlign}
                              type="button"
                              onClick={() => setForm(f => ({ ...f, vertical_alignment: vAlign as any }))}
                              className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize text-center cursor-pointer ${
                                form.vertical_alignment === vAlign
                                  ? 'border-[#006670] bg-[#006670]/5 text-[#006670]'
                                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {vAlign}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                          Content Width
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { id: 'narrow', label: 'Narrow' },
                            { id: 'medium', label: 'Medium' },
                            { id: 'wide', label: 'Wide' },
                            { id: 'full', label: 'Full' },
                          ].map(w => (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => setForm(f => ({ ...f, content_width: w.id as any }))}
                              className={`py-2 px-2 rounded-xl border text-xs font-semibold text-center cursor-pointer ${
                                form.content_width === w.id
                                  ? 'border-[#006670] bg-[#006670]/5 text-[#006670]'
                                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {w.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────
                      TAB 3: MEDIA & ART DIRECTION
                  ──────────────────────────────────────────────── */}
                  {activeTab === 'media' && (
                    <div className="space-y-5">
                      {/* Desktop Image */}
                      <div>
                        <ImageUploader
                          label="Desktop Main Image"
                          aspectRatio={form.banner_layout === 'background' ? 16 / 7 : 4 / 3}
                          currentUrl={desktopImgUrl}
                          onUpload={file => setForm(f => ({ ...f, image: file }))}
                          onRemove={() => setForm(f => ({ ...f, image: null }))}
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Recommended ~1920x800 for full background, or ~1000x800 for split.
                        </p>
                      </div>

                      {/* Mobile Image */}
                      <div>
                        <ImageUploader
                          label="Mobile Art Direction Image (Optional)"
                          aspectRatio={1}
                          currentUrl={form.mobile_image instanceof File ? URL.createObjectURL(form.mobile_image) : form.mobile_image}
                          onUpload={file => setForm(f => ({ ...f, mobile_image: file }))}
                          onRemove={() => setForm(f => ({ ...f, mobile_image: null }))}
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Optional portrait/square asset loaded strictly on mobile devices.
                        </p>
                      </div>

                      {/* Image Fit */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                          Image Fit Mode
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, image_fit: 'contain' }))}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-center cursor-pointer ${
                              form.image_fit === 'contain'
                                ? 'border-[#006670] bg-[#006670]/5 text-[#006670]'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            Contain (Float / Equipment)
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, image_fit: 'cover' }))}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-center cursor-pointer ${
                              form.image_fit === 'cover'
                                ? 'border-[#006670] bg-[#006670]/5 text-[#006670]'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            Cover (Edge Bleed)
                          </button>
                        </div>
                      </div>

                      {/* Background Color Presets */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                          Banner Background Color
                        </label>
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          {PRESET_BG_COLORS.map(c => (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => setForm(f => ({ ...f, bg_color: c.hex }))}
                              className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                                form.bg_color === c.hex
                                  ? 'border-[#006670] ring-1 ring-[#006670]'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <span
                                className="w-4 h-4 rounded-full border border-black/10 flex-shrink-0"
                                style={{ backgroundColor: c.hex }}
                              />
                              <span className="truncate text-[10px] text-slate-700">{c.name}</span>
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={form.bg_color.startsWith('#') ? form.bg_color : '#E8F5F4'}
                            onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))}
                            className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={form.bg_color}
                            onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))}
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* Overlay Gradient (for background image) */}
                      {form.banner_layout === 'background' && (
                        <div className="space-y-3 pt-2 border-t border-slate-200">
                          <label className="block text-xs font-bold text-slate-700">
                            Contrast Overlay Gradient
                          </label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {['left', 'right', 'top', 'bottom', 'radial', 'dark', 'none'].map(grad => (
                              <button
                                key={grad}
                                type="button"
                                onClick={() => setForm(f => ({ ...f, overlay_gradient: grad as any }))}
                                className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold capitalize text-center cursor-pointer ${
                                  form.overlay_gradient === grad
                                    ? 'border-[#006670] bg-[#006670]/5 text-[#006670]'
                                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {grad}
                              </button>
                            ))}
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                              <span>Overlay Opacity</span>
                              <span>{form.overlay_opacity}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={form.overlay_opacity}
                              onChange={e => setForm(f => ({ ...f, overlay_opacity: Number(e.target.value) }))}
                              className="w-full accent-[#006670] cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────
                      TAB 4: TYPOGRAPHY & COLORS
                  ──────────────────────────────────────────────── */}
                  {activeTab === 'typography' && (
                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                          Heading Size
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                          {['sm', 'md', 'lg', 'xl', '2xl'].map(size => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setForm(f => ({ ...f, heading_size: size as any }))}
                              className={`py-2 rounded-xl border text-xs font-semibold uppercase text-center cursor-pointer ${
                                form.heading_size === size
                                  ? 'border-[#006670] bg-[#006670]/5 text-[#006670]'
                                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                          Heading Weight
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                          {['normal', 'medium', 'semibold', 'bold', 'black'].map(weight => (
                            <button
                              key={weight}
                              type="button"
                              onClick={() => setForm(f => ({ ...f, heading_weight: weight as any }))}
                              className={`py-2 rounded-xl border text-xs font-semibold capitalize text-center cursor-pointer ${
                                form.heading_weight === weight
                                  ? 'border-[#006670] bg-[#006670]/5 text-[#006670]'
                                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {weight}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Heading Color
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.heading_color.startsWith('#') ? form.heading_color : '#0F172A'}
                              onChange={e => setForm(f => ({ ...f, heading_color: e.target.value }))}
                              className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={form.heading_color}
                              onChange={e => setForm(f => ({ ...f, heading_color: e.target.value }))}
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Description Color
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.description_color.startsWith('#') ? form.description_color : '#334155'}
                              onChange={e => setForm(f => ({ ...f, description_color: e.target.value }))}
                              className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={form.description_color}
                              onChange={e => setForm(f => ({ ...f, description_color: e.target.value }))}
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Badge Text Color
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.badge_color.startsWith('#') ? form.badge_color : '#006670'}
                              onChange={e => setForm(f => ({ ...f, badge_color: e.target.value }))}
                              className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={form.badge_color}
                              onChange={e => setForm(f => ({ ...f, badge_color: e.target.value }))}
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Badge Bg Color
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={form.badge_bg_color}
                              onChange={e => setForm(f => ({ ...f, badge_bg_color: e.target.value }))}
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────
                      TAB 5: CTA BUTTON & DESTINATION
                  ──────────────────────────────────────────────── */}
                  {activeTab === 'cta' && (
                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Button Text
                        </label>
                        <input
                          type="text"
                          value={form.cta_text}
                          onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))}
                          placeholder="e.g. Explore Collection"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                          Destination Action Type
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { id: 'product', label: 'Product' },
                            { id: 'category', label: 'Category' },
                            { id: 'brand', label: 'Brand' },
                            { id: 'url', label: 'Custom URL' },
                          ].map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setForm(f => ({ ...f, cta_action_type: t.id as any }))}
                              className={`py-2 rounded-xl border text-xs font-semibold text-center cursor-pointer ${
                                form.cta_action_type === t.id
                                  ? 'border-[#006670] bg-[#006670]/5 text-[#006670]'
                                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Interactive Product Search */}
                      {form.cta_action_type === 'product' && (
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                          <label className="block text-xs font-bold text-slate-700">
                            Search & Select Destination Product
                          </label>
                          <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={productSearch}
                              onChange={e => setProductSearch(e.target.value)}
                              placeholder="Search products by name or SKU..."
                              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#006670]/30"
                            />
                          </div>

                          <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                            {filteredProducts.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectCtaProduct(p)}
                                className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                                  form.cta_target_id === p.id ? 'bg-[#006670] text-white' : 'bg-white hover:bg-slate-100 text-slate-700'
                                }`}
                              >
                                <span className="font-medium truncate">{p.name}</span>
                                <span className={`text-[10px] ml-2 font-mono ${form.cta_target_id === p.id ? 'text-white/80' : 'text-slate-400'}`}>
                                  {p.sku}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Destination URL
                        </label>
                        <input
                          type="text"
                          value={form.cta_url}
                          onChange={e => setForm(f => ({ ...f, cta_url: e.target.value }))}
                          placeholder="/offers or /products/dental-chair-x1"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#006670]/30"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                          Button Style
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'filled', label: 'Filled Solid' },
                            { id: 'outline', label: 'Outline' },
                            { id: 'ghost', label: 'Ghost / Link' },
                          ].map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setForm(f => ({ ...f, cta_style: s.id as any }))}
                              className={`py-2 rounded-xl border text-xs font-semibold text-center cursor-pointer ${
                                form.cta_style === s.id
                                  ? 'border-[#006670] bg-[#006670]/5 text-[#006670]'
                                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Button Background
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.cta_bg_color.startsWith('#') ? form.cta_bg_color : '#006670'}
                              onChange={e => setForm(f => ({ ...f, cta_bg_color: e.target.value }))}
                              className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={form.cta_bg_color}
                              onChange={e => setForm(f => ({ ...f, cta_bg_color: e.target.value }))}
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Button Text Color
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={form.cta_text_color.startsWith('#') ? form.cta_text_color : '#FFFFFF'}
                              onChange={e => setForm(f => ({ ...f, cta_text_color: e.target.value }))}
                              className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={form.cta_text_color}
                              onChange={e => setForm(f => ({ ...f, cta_text_color: e.target.value }))}
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <label className="flex items-center gap-3 cursor-pointer pt-2">
                        <input
                          type="checkbox"
                          checked={form.cta_open_in_new_tab}
                          onChange={e => setForm(f => ({ ...f, cta_open_in_new_tab: e.target.checked }))}
                          className="w-4 h-4 rounded text-[#006670] accent-[#006670] cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-700">
                          Open link in a new browser tab (target="_blank")
                        </span>
                      </label>
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────
                      TAB 6: VISIBILITY & SCHEDULE
                  ──────────────────────────────────────────────── */}
                  {activeTab === 'schedule' && (
                    <div className="space-y-5">
                      <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/60 transition-colors">
                        <div
                          onClick={() => setForm(f => ({ ...f, is_visible: !f.is_visible }))}
                          className={`relative w-11 h-6 rounded-full transition-colors mt-0.5 flex-shrink-0 cursor-pointer ${
                            form.is_visible ? 'bg-[#006670]' : 'bg-slate-300'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              form.is_visible ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-800 block">
                            Active on Homepage
                          </span>
                          <span className="text-xs text-slate-500 block mt-0.5">
                            When enabled and schedule permits, this banner will render edge-to-edge on the customer-facing storefront.
                          </span>
                        </div>
                      </label>

                      <div className="space-y-4 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Scheduled Start Date & Time (Optional)
                          </label>
                          <input
                            type="datetime-local"
                            value={form.start_date}
                            onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#006670]/30"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">
                            Banner will automatically become visible starting on this date.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Scheduled End Date & Time (Optional)
                          </label>
                          <input
                            type="datetime-local"
                            value={form.end_date}
                            onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#006670]/30"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">
                            Banner will automatically hide once this time expires.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Left Panel Footer / Save Buttons */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowStudio(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveBanner}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save & Publish'}
                  </button>
                </div>
              </div>

              {/* ────────────────────────────────────────────────
                  RIGHT COLUMN: LIVE REAL-TIME WYSIWYG PREVIEW
              ──────────────────────────────────────────────── */}
              <div className="flex-1 bg-slate-100 flex flex-col overflow-hidden relative">
                {/* Preview Controls Bar */}
                <div className="px-6 py-2.5 bg-slate-200/80 border-b border-slate-300 flex items-center justify-between text-xs text-slate-600 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold uppercase tracking-wider text-[11px]">Real-Time Storefront Canvas</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {previewDevice === 'desktop' ? 'Viewport: 100% Full Width (Desktop)' : 'Viewport: 375px (Mobile Phone)'}
                  </span>
                </div>

                {/* Canvas Container */}
                <div className="flex-1 overflow-y-auto flex items-center justify-center p-4 sm:p-8">
                  <div
                    className={`transition-all duration-300 bg-white shadow-xl overflow-hidden rounded-xl border border-slate-300 ${
                      previewDevice === 'desktop' ? 'w-full max-w-full' : 'w-[375px] max-w-[375px] rounded-3xl border-4 border-slate-800'
                    }`}
                  >
                    {/* Simulated Full-Width Promotional Banner */}
                    <div
                      className="w-full relative overflow-hidden select-none"
                      style={{ backgroundColor: form.bg_color || '#E8F5F4' }}
                    >
                      {/* SPLIT LAYOUT PREVIEW */}
                      {form.banner_layout === 'split' && (
                        <div
                          className={`w-full ${
                            previewDevice === 'desktop'
                              ? 'grid grid-cols-12 min-h-[440px] items-stretch'
                              : 'flex flex-col min-h-[460px] p-6'
                          }`}
                        >
                          {/* Content Column */}
                          <div
                            className={`flex flex-col ${
                              previewDevice === 'desktop'
                                ? `col-span-6 px-10 py-12 ${
                                    form.image_position === 'left' ? 'order-2' : 'order-1'
                                  } ${
                                    form.horizontal_alignment === 'center'
                                      ? 'text-center items-center'
                                      : form.horizontal_alignment === 'right'
                                      ? 'text-right items-end'
                                      : 'text-left items-start'
                                  } ${
                                    form.vertical_alignment === 'top'
                                      ? 'justify-start'
                                      : form.vertical_alignment === 'bottom'
                                      ? 'justify-end'
                                      : 'justify-center'
                                  }`
                                : 'order-1 items-start text-left mb-6'
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              {form.badge_text && (
                                <div
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase"
                                  style={{
                                    backgroundColor: form.badge_bg_color || 'rgba(0, 102, 112, 0.12)',
                                    color: form.badge_color || '#006670',
                                  }}
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>{form.badge_text}</span>
                                </div>
                              )}
                              {form.offer_text && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-xs font-extrabold uppercase shadow-xs">
                                  {form.offer_text}
                                </span>
                              )}
                            </div>

                            <h2
                              className={`${previewHeadingClass} ${previewWeightClass} tracking-tight font-display mb-3 leading-tight break-words`}
                              style={{ color: form.heading_color || '#0F172A' }}
                            >
                              {form.title}
                            </h2>

                            {form.description && (
                              <p
                                className="text-sm mb-6 leading-relaxed opacity-90 max-w-lg"
                                style={{ color: form.description_color || '#334155' }}
                              >
                                {form.description}
                              </p>
                            )}

                            <div className="flex flex-col items-start gap-1.5">
                              <div
                                className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-bold shadow-md cursor-pointer ${
                                  form.cta_style === 'outline' ? 'border-2' : ''
                                }`}
                                style={{
                                  backgroundColor: form.cta_style === 'filled' ? form.cta_bg_color || '#006670' : 'transparent',
                                  color: form.cta_style === 'filled' ? form.cta_text_color || '#FFFFFF' : form.cta_bg_color || '#006670',
                                  borderColor: form.cta_border_color || '#006670',
                                }}
                              >
                                <span>{form.cta_text || 'Explore Collection'}</span>
                                <ArrowRight className="w-4 h-4" />
                              </div>
                              {form.secondary_text && (
                                <span className="text-[11px] text-slate-500 font-medium pl-1 mt-1">
                                  {form.secondary_text}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Image Column */}
                          <div
                            className={`relative flex items-center justify-center overflow-hidden ${
                              previewDevice === 'desktop'
                                ? `col-span-6 min-h-[360px] ${form.image_position === 'left' ? 'order-1' : 'order-2'}`
                                : 'order-2 min-h-[220px] w-full'
                            }`}
                          >
                            {desktopImgUrl ? (
                              <img
                                src={previewDevice === 'mobile' ? mobileImgUrl || desktopImgUrl : desktopImgUrl}
                                alt="Preview"
                                className={`w-full h-full max-h-[380px] ${
                                  form.image_fit === 'cover' ? 'object-cover' : 'object-contain p-6 drop-shadow-lg'
                                }`}
                              />
                            ) : (
                              <div className="w-48 h-48 rounded-2xl bg-white/40 border border-slate-200/60 flex flex-col items-center justify-center text-slate-400">
                                <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                                <span className="text-xs font-semibold">Upload Image</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* BACKGROUND IMAGE LAYOUT PREVIEW */}
                      {form.banner_layout === 'background' && (
                        <div className="w-full min-h-[460px] relative flex items-center">
                          {desktopImgUrl ? (
                            <img
                              src={previewDevice === 'mobile' ? mobileImgUrl || desktopImgUrl : desktopImgUrl}
                              alt="Preview"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-slate-800" />
                          )}

                          {/* Overlay */}
                          <div className="absolute inset-0" style={{ background: getOverlayStyle() }} />

                          {/* Content */}
                          <div className="w-full relative z-10 px-8 py-12">
                            <div className="max-w-xl">
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                {form.badge_text && (
                                  <div
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase backdrop-blur-sm"
                                    style={{
                                      backgroundColor: form.badge_bg_color || 'rgba(255,255,255,0.2)',
                                      color: form.badge_color || '#FFFFFF',
                                    }}
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    <span>{form.badge_text}</span>
                                  </div>
                                )}
                                {form.offer_text && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-xs font-extrabold uppercase shadow-sm">
                                    {form.offer_text}
                                  </span>
                                )}
                              </div>

                              <h2
                                className={`${previewHeadingClass} ${previewWeightClass} tracking-tight font-display mb-3 leading-tight break-words drop-shadow-sm`}
                                style={{ color: form.heading_color || '#FFFFFF' }}
                              >
                                {form.title}
                              </h2>

                              {form.description && (
                                <p
                                  className="text-sm mb-6 leading-relaxed opacity-95 max-w-md drop-shadow-sm"
                                  style={{ color: form.description_color || '#F1F5F9' }}
                                >
                                  {form.description}
                                </p>
                              )}

                              <div className="flex flex-col items-start gap-1.5">
                                <div
                                  className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-bold shadow-md cursor-pointer ${
                                    form.cta_style === 'outline' ? 'border-2' : ''
                                  }`}
                                  style={{
                                    backgroundColor: form.cta_style === 'filled' ? form.cta_bg_color || '#006670' : 'transparent',
                                    color: form.cta_style === 'filled' ? form.cta_text_color || '#FFFFFF' : form.cta_bg_color || '#006670',
                                    borderColor: form.cta_border_color || '#006670',
                                  }}
                                >
                                  <span>{form.cta_text || 'Explore Collection'}</span>
                                  <ArrowRight className="w-4 h-4" />
                                </div>
                                {form.secondary_text && (
                                  <span className="text-[11px] text-white/80 font-medium pl-1 mt-1 drop-shadow-sm">
                                    {form.secondary_text}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SOLID / MINIMAL LAYOUT PREVIEW */}
                      {form.banner_layout === 'solid' && (
                        <div className="w-full min-h-[380px] flex items-center justify-center p-8 sm:p-12 text-center">
                          <div className="max-w-xl flex flex-col items-center">
                            <div className="flex items-center gap-2 mb-3">
                              {form.badge_text && (
                                <div
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase"
                                  style={{
                                    backgroundColor: form.badge_bg_color || 'rgba(0, 102, 112, 0.12)',
                                    color: form.badge_color || '#006670',
                                  }}
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>{form.badge_text}</span>
                                </div>
                              )}
                              {form.offer_text && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-xs font-extrabold uppercase shadow-sm">
                                  {form.offer_text}
                                </span>
                              )}
                            </div>

                            <h2
                              className={`${previewHeadingClass} ${previewWeightClass} tracking-tight font-display mb-3 leading-tight break-words`}
                              style={{ color: form.heading_color || '#0F172A' }}
                            >
                              {form.title}
                            </h2>

                            {form.description && (
                              <p
                                className="text-sm mb-6 leading-relaxed opacity-90 max-w-md"
                                style={{ color: form.description_color || '#334155' }}
                              >
                                {form.description}
                              </p>
                            )}

                            <div
                              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-bold shadow-md cursor-pointer"
                              style={{
                                backgroundColor: form.cta_bg_color || '#006670',
                                color: form.cta_text_color || '#FFFFFF',
                              }}
                            >
                              <span>{form.cta_text || 'Explore Collection'}</span>
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={!!deleteColl}
        title="Delete Promotional Banner"
        message={`Delete "${deleteColl?.title}"? Any linked items will also be unlinked.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteColl}
        onClose={() => setDeleteColl(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteItem}
        title="Remove Product"
        message={`Remove "${deleteItem?.product_name}" from this collection?`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={removeItem}
        onClose={() => setDeleteItem(null)}
      />
    </div>
  );
};

export default FeaturedCollectionsManager;
