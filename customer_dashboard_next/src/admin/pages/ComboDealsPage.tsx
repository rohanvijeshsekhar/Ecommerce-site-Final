import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, Eye, ArrowLeft,
  Star, Sparkles, ChevronRight, Image, Copy, Calendar,
  ShoppingBag, X
} from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';
import StatCard from '../components/StatCard';
import { useToast } from '../components/Toast';
import { useBreadcrumbSync } from '../contexts/BreadcrumbContext';
import type { ColumnDef, ComboDeal, Product } from '../types/admin';
import { adminService as adminServiceRaw } from '../services/adminService';
const adminService = adminServiceRaw as any;
import ImageUploader from '../components/ImageUploader';
import AdminModal from '../components/AdminModal';

const emptyForm = {
  title: '',
  slug: '',
  short_description: '',
  full_description: '',
  combo_price: '0.00',
  dealer_price: '',
  offer_price: '',
  offer_start_date: '',
  offer_end_date: '',
  is_featured: false,
  status: 'active' as ComboDeal['status'],
  inventory: 0,
  meta_title: '',
  meta_description: '',
  meta_keywords: '',
};

const STATUS_VARIANT: Record<ComboDeal['status'], 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  draft: 'warning',
  archived: 'neutral',
};

const ComboDealsPage: React.FC = () => {
  useBreadcrumbSync([
    { label: 'Catalogue', path: '/admin/combos' },
    { label: 'Combo Deals' },
  ]);

  const toast = useToast();

  const [combos, setCombos] = useState<ComboDeal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // View state
  const [isEditing, setIsEditing] = useState(false);
  const [editCombo, setEditCombo] = useState<ComboDeal | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [activeStep, setActiveStep] = useState(1);

  // Nested form state
  const [selectedProducts, setSelectedProducts] = useState<{ product: Product; quantity: number }[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  // Gallery images states
  const [galleryImages, setGalleryImages] = useState<{ id: string; image: string; alt_text: string }[]>([]);

  // Duplicate / delete states
  const [deleteTarget, setDeleteTarget] = useState<ComboDeal | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Preview state
  const [previewCombo, setPreviewCombo] = useState<ComboDeal | null>(null);

  // Search product within selection step
  const [productSearch, setProductSearch] = useState('');

  // Banner Settings state
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    badge_text: 'SUPER SAVER BUNDLES',
    title: 'Premium Combo Deals',
    description: 'Equip your clinical workflows with carefully curated packages of leading tools. Save big vs buying individual components.',
  });
  const [bannerSettingsFile, setBannerSettingsFile] = useState<File | null>(null);
  const [bannerSettingsUrl, setBannerSettingsUrl] = useState<string | null>(null);
  const [savingBanner, setSavingBanner] = useState(false);

  const fetchCombos = async () => {
    setLoading(true);
    try {
      const res = await adminService.getComboDeals();
      if (res.success && res.data) {
        setCombos(res.data);
      }
    } catch (e: any) {
      toast.error('Error', e.message || 'Failed to fetch combos');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await adminService.getProducts({ page_size: 100 });
      if (res.success && res.data) {
        setProducts(res.data);
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const fetchBannerSettings = async () => {
    try {
      const res = await adminService.getComboBannerSettings();
      if (res.success && res.data) {
        setBannerForm({
          badge_text: res.data.badge_text || 'SUPER SAVER BUNDLES',
          title: res.data.title || 'Premium Combo Deals',
          description: res.data.description || 'Equip your clinical workflows with carefully curated packages of leading tools. Save big vs buying individual components.',
        });
        setBannerSettingsUrl(res.data.banner_image);
      }
    } catch (e: any) {
      console.error('Failed to fetch combo banner settings:', e);
    }
  };

  const handleSaveBannerSettings = async () => {
    setSavingBanner(true);
    try {
      const data = new FormData();
      data.append('badge_text', bannerForm.badge_text);
      data.append('title', bannerForm.title);
      data.append('description', bannerForm.description);
      if (bannerSettingsFile) {
        data.append('banner_image', bannerSettingsFile);
      } else if (bannerSettingsUrl === null) {
        data.append('banner_image', '');
      }

      const res = await adminService.updateComboBannerSettings(data);
      if (res.success) {
        toast.success('Updated', 'Combo deals banner settings updated successfully.');
        setIsBannerModalOpen(false);
        setBannerSettingsFile(null);
        if (res.data) {
          setBannerSettingsUrl(res.data.banner_image);
        }
      }
    } catch (e: any) {
      toast.error('Update Failed', e.message || 'Failed to update banner settings');
    } finally {
      setSavingBanner(false);
    }
  };

  useEffect(() => {
    fetchCombos();
    fetchProducts();
    fetchBannerSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toggle Toggles ──
  const handleToggleActive = async (combo: ComboDeal) => {
    const nextStatus: ComboDeal['status'] = combo.status === 'active' ? 'draft' : 'active';
    try {
      const res = await adminService.updateComboDeal(combo.slug, { status: nextStatus });
      if (res.success && res.data) {
        setCombos(prev => prev.map(c => c.id === combo.id ? { ...c, status: nextStatus } : c));
        toast.success('Status Updated', `Combo status set to ${nextStatus}.`);
      }
    } catch (e: any) {
      toast.error('Failed', e.message || 'Failed to update status');
    }
  };

  const handleToggleFeatured = async (combo: ComboDeal) => {
    const nextFeatured = !combo.is_featured;
    try {
      const res = await adminService.updateComboDeal(combo.slug, { is_featured: nextFeatured });
      if (res.success && res.data) {
        setCombos(prev => prev.map(c => c.id === combo.id ? { ...c, is_featured: nextFeatured } : c));
        toast.success('Featured Updated', `Combo featured status set to ${nextFeatured ? 'Yes' : 'No'}.`);
      }
    } catch (e: any) {
      toast.error('Failed', e.message || 'Failed to update featured flag');
    }
  };

  // ── Duplicate / Delete ──
  const handleDuplicate = async (combo: ComboDeal) => {
    try {
      const res = await adminService.duplicateComboDeal(combo.slug);
      if (res.success && res.data) {
        setCombos(prev => [res.data!, ...prev]);
        toast.success('Duplicated', 'Combo deal duplicated successfully as draft.');
      }
    } catch (e: any) {
      toast.error('Duplicate Failed', e.message || 'Failed to duplicate combo');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminService.deleteComboDeal(deleteTarget.slug);
      if (res.success) {
        setCombos(prev => prev.filter(c => c.id !== deleteTarget.id));
        toast.success('Deleted', 'Combo deal deleted successfully.');
        setDeleteTarget(null);
      }
    } catch (e: any) {
      toast.error('Delete Failed', e.message || 'Failed to delete combo');
    } finally {
      setDeleting(false);
    }
  };

  // ── Form wizard logic ──
  const openCreate = () => {
    setForm(emptyForm);
    setEditCombo(null);
    setSelectedProducts([]);
    setThumbnailFile(null);
    setThumbnailUrl(null);
    setBannerFile(null);
    setBannerUrl(null);
    setGalleryImages([]);
    setActiveStep(1);
    setIsEditing(true);
  };

  const openEdit = (combo: ComboDeal) => {
    setForm({
      title: combo.title,
      slug: combo.slug,
      short_description: combo.short_description || '',
      full_description: combo.full_description || '',
      combo_price: combo.combo_price,
      dealer_price: combo.dealer_price || '',
      offer_price: combo.offer_price || '',
      offer_start_date: combo.offer_start_date || '',
      offer_end_date: combo.offer_end_date || '',
      is_featured: combo.is_featured,
      status: combo.status,
      inventory: combo.inventory || 0,
      meta_title: combo.meta_title || '',
      meta_description: combo.meta_description || '',
      meta_keywords: combo.meta_keywords || '',
    });
    setEditCombo(combo);
    setSelectedProducts(
      combo.combo_products.map(cp => ({
        product: cp.product,
        quantity: cp.quantity,
      }))
    );
    setThumbnailFile(null);
    setThumbnailUrl(combo.thumbnail);
    setBannerFile(null);
    setBannerUrl(combo.banner);
    setGalleryImages(combo.images.map(img => ({
      id: img.id,
      image: img.image,
      alt_text: img.alt_text || '',
    })));
    setActiveStep(1);
    setIsEditing(true);
  };

  // Auto calculate total original price
  const calculateOriginalPrice = () => {
    return selectedProducts.reduce((acc, item) => {
      const price = item.product.pricing ? parseFloat(item.product.pricing.selling_price) : 0;
      return acc + price * item.quantity;
    }, 0);
  };

  const originalPriceSum = calculateOriginalPrice();

  const handleAddProductSelection = (product: Product) => {
    if (selectedProducts.some(p => p.product.id === product.id)) {
      toast.warning('Already Selected', 'Product is already added in the combo.');
      return;
    }
    setSelectedProducts(prev => [...prev, { product, quantity: 1 }]);
    setProductSearch('');
  };

  const handleUpdateProductQuantity = (productId: string, val: number) => {
    setSelectedProducts(prev =>
      prev.map(p =>
        p.product.id === productId ? { ...p, quantity: Math.max(1, p.quantity + val) } : p
      )
    );
  };

  const handleRemoveProductSelection = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.product.id !== productId));
  };

  // Steps handling
  const handleNextStep = () => {
    if (activeStep === 1 && !form.title.trim()) {
      toast.error('Validation Error', 'Please enter a combo title.');
      return;
    }
    if (activeStep === 2 && selectedProducts.length === 0) {
      toast.error('Validation Error', 'Please select at least one product.');
      return;
    }
    if (activeStep === 3) {
      if (parseFloat(form.combo_price) <= 0) {
        toast.error('Validation Error', 'Please enter a valid combo price greater than 0.');
        return;
      }
    }
    setActiveStep(prev => Math.min(prev + 1, 7));
  };

  const handleBackStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 1));
  };

  const handleSaveCombo = async () => {
    setSaving(true);
    try {
      const payload: any = {
        title: form.title,
        short_description: form.short_description,
        full_description: form.full_description,
        combo_price: form.combo_price,
        dealer_price: form.dealer_price || null,
        offer_price: form.offer_price || null,
        offer_start_date: form.offer_start_date || null,
        offer_end_date: form.offer_end_date || null,
        is_featured: form.is_featured,
        status: form.status,
        inventory: form.inventory,
        meta_title: form.meta_title,
        meta_description: form.meta_description,
        meta_keywords: form.meta_keywords,
        products: selectedProducts.map(sp => ({
          product: sp.product.id,
          quantity: sp.quantity,
        })),
      };

      let savedCombo: ComboDeal;

      if (editCombo) {
        const res = await adminService.updateComboDeal(editCombo.slug, payload);
        if (!res.success || !res.data) throw new Error(res.message || 'Update failed');
        savedCombo = res.data;
      } else {
        const res = await adminService.createComboDeal(payload);
        if (!res.success || !res.data) throw new Error(res.message || 'Create failed');
        savedCombo = res.data;
      }

      // ── Upload thumbnail / banner separately via FormData ────────────────────
      // This is a separate step — if it fails we still mark the combo as saved.
      if (thumbnailFile || bannerFile) {
        try {
          const fileForm = new FormData();
          if (thumbnailFile) fileForm.append('thumbnail', thumbnailFile);
          if (bannerFile) fileForm.append('banner', bannerFile);

          const fileRes = await adminService.updateComboDeal(savedCombo.slug, fileForm);
          if (fileRes.success && fileRes.data) {
            savedCombo = fileRes.data;
            // Clear file blobs — they are now persisted on the server
            setThumbnailFile(null);
            setBannerFile(null);
          }
        } catch (imgErr: any) {
          // Image upload failed — combo data is still saved, warn the user
          toast.warning(
            'Images not uploaded',
            'Combo saved but thumbnail/banner upload failed. Try editing the combo to re-upload images.'
          );
        }
      }

      toast.success(editCombo ? 'Combo Updated' : 'Combo Created', 'Your combo deal details have been saved.');
      fetchCombos();
      setIsEditing(false);
    } catch (e: any) {
      toast.error('Failed to save', e.message || 'Save operations failed.');
    } finally {
      setSaving(false);
    }
  };


  const handleUploadGalleryImage = async (file: File) => {
    if (!editCombo) {
      toast.warning('Save First', 'Please save the combo basic info first before adding slideshow images.');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('alt_text', editCombo.title);
      const res = await adminService.uploadComboImage(editCombo.slug, fd);
      if (res.success && res.data) {
        setGalleryImages(prev => [...prev, {
          id: res.data!.id,
          image: res.data!.image,
          alt_text: res.data!.alt_text,
        }]);
        toast.success('Image Uploaded', 'Gallery slide added.');
      }
    } catch (e: any) {
      toast.error('Upload failed', e.message || 'Gallery image upload failed');
    }
  };

  const handleDeleteGalleryImage = async (imageId: string) => {
    if (!editCombo) return;
    try {
      const res = await adminService.deleteComboImage(editCombo.slug, imageId);
      if (res.success) {
        setGalleryImages(prev => prev.filter(img => img.id !== imageId));
        toast.success('Image Deleted', 'Gallery slide removed.');
      }
    } catch (e: any) {
      toast.error('Delete failed', e.message || 'Failed to delete gallery image.');
    }
  };

  // Columns definition
  const columns: ColumnDef<ComboDeal>[] = [
    {
      key: 'title',
      header: 'Combo Deal',
      sortable: true,
      render: (_, c) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center p-1 shrink-0 overflow-hidden">
            {c.thumbnail ? (
              <img src={c.thumbnail} alt={c.title} className="max-h-full max-w-full object-cover" />
            ) : (
              <Sparkles className="w-5 h-5 text-slate-300" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-slate-800 text-sm truncate">{c.title}</p>
              {c.is_featured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
            </div>
            <p className="text-xs text-slate-400 font-medium truncate">{c.combo_products.length} products included</p>
          </div>
        </div>
      ),
    },
    {
      key: 'pricing',
      header: 'Pricing (INR)',
      render: (_, c) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-slate-400 line-through">₹{parseFloat(c.original_price).toLocaleString('en-IN')}</span>
            <span className="text-sm font-bold text-teal-600">₹{parseFloat(c.effective_price).toLocaleString('en-IN')}</span>
          </div>
          {c.discount_percentage && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-wide bg-rose-50 text-rose-600">
              SAVE {c.discount_percentage}% (₹{parseFloat(c.you_save || '0').toLocaleString('en-IN')})
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'inventory',
      header: 'Stock Status',
      render: (_, c) => (
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-700">{c.inventory} Units</p>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${c.inventory > 5 ? 'bg-emerald-50 text-emerald-700' : c.inventory > 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
            {c.inventory > 5 ? 'In Stock' : c.inventory > 0 ? 'Low Stock' : 'Out of Stock'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, c) => (
        <button onClick={() => handleToggleActive(c)} className="cursor-pointer">
          <StatusBadge label={c.status} variant={STATUS_VARIANT[c.status]} />
        </button>
      ),
    },
    {
      key: 'is_featured',
      header: 'Featured',
      render: (_, c) => (
        <button
          onClick={() => handleToggleFeatured(c)}
          className={`p-1.5 rounded-xl border transition-all cursor-pointer ${c.is_featured ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'}`}
          title="Toggle Featured status"
        >
          <Star className={`w-4 h-4 ${c.is_featured ? 'fill-amber-500' : ''}`} />
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '120px',
      render: (_, c) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPreviewCombo(c)}
            className="p-2 text-slate-400 hover:text-[#005B63] hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            title="Preview Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEdit(c)}
            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            title="Edit Combo"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDuplicate(c)}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            title="Duplicate / Clone"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(c)}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            title="Delete Combo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Filtering
  const filtered = combos.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || (c.short_description && c.short_description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full space-y-6">
      {isEditing ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden text-left">
          {/* Header */}
          <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {editCombo ? `Edit Combo Deal: ${editCombo.title}` : 'Create Combo Deal'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Fill out steps below to deploy a production bundle.</p>
              </div>
            </div>
            {/* Step Indicators */}
            <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
              {[1, 2, 3, 4, 5, 6, 7].map(step => (
                <div
                  key={step}
                  className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${activeStep === step ? 'bg-[#005B63] border-[#005B63] text-white' : activeStep > step ? 'bg-teal-50 border-teal-200 text-[#005B63]' : 'bg-white border-slate-200 text-slate-400'}`}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* Step Contents */}
          <div className="p-8 min-h-[400px]">
            {/* Step 1 – General Details */}
            {activeStep === 1 && (
              <div className="space-y-5 max-w-2xl">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Combo Title <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Premium Dental Clinic Starter Combo"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Short Description</label>
                  <textarea
                    value={form.short_description}
                    onChange={e => setForm(prev => ({ ...prev, short_description: e.target.value }))}
                    placeholder="A brief overview shown on listing cards..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Status</label>
                    <select
                      value={form.status}
                      onChange={e => setForm(prev => ({ ...prev, status: e.target.value as ComboDeal['status'] }))}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-6 pl-4">
                    <input
                      type="checkbox"
                      id="is_featured"
                      checked={form.is_featured}
                      onChange={e => setForm(prev => ({ ...prev, is_featured: e.target.checked }))}
                      className="rounded border-slate-300 text-[#005B63] focus:ring-[#005B63] w-5 h-5 cursor-pointer"
                    />
                    <label htmlFor="is_featured" className="text-sm font-semibold text-slate-700 cursor-pointer">
                      Featured (Display on homepage)
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 – Select Existing Products */}
            {activeStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  {/* Left Column: Search & Available Products (2 Cols) */}
                  <div className="lg:col-span-2 space-y-4 border-r border-slate-100 pr-6">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">1. Search & Add Products</h3>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search products by name/SKU..."
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white"
                      />
                    </div>
                    {/* List */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {products
                        .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))
                        .map(product => (
                          <div
                            key={product.id}
                            onClick={() => handleAddProductSelection(product)}
                            className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-all"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{product.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{product.sku}</p>
                            </div>
                            <Plus className="w-4 h-4 text-[#005B63] shrink-0" />
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Right Column: Included Products & Quantities (3 Cols) */}
                  <div className="lg:col-span-3 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">2. Selected Combo Items</h3>
                    {selectedProducts.length === 0 ? (
                      <EmptyState preset="no-results" title="No products selected" description="Select products from the left panel to include in this combo deal." />
                    ) : (
                      <div className="space-y-3">
                        {selectedProducts.map(item => (
                          <div key={item.product.id} className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50/50">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{item.product.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">₹{parseFloat(item.product.pricing?.selling_price || '0').toLocaleString('en-IN')} each</p>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              {/* Quantity controls */}
                              <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateProductQuantity(item.product.id, -1)}
                                  className="px-3 py-1 bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold transition-all cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-4 py-1 text-sm font-bold font-mono text-slate-800">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateProductQuantity(item.product.id, 1)}
                                  className="px-3 py-1 bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold transition-all cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveProductSelection(item.product.id)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 – Pricing */}
            {activeStep === 3 && (
              <div className="space-y-6 max-w-2xl">
                <div className="p-5 bg-teal-50/50 border border-teal-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5 text-[#005B63]" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Total Product Original Price</h4>
                      <p className="text-xs text-slate-400">Derived from the sum of included products' current pricing.</p>
                    </div>
                  </div>
                  <span className="text-lg font-black text-[#005B63] font-mono">
                    ₹{originalPriceSum.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Combo Standard Price (INR) <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.combo_price}
                      onChange={e => setForm(prev => ({ ...prev, combo_price: e.target.value }))}
                      placeholder="0.00"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dealer Price (INR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.dealer_price}
                      onChange={e => setForm(prev => ({ ...prev, dealer_price: e.target.value }))}
                      placeholder="Optional"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Campaign / Offer Pricing Rules
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Offer Discount Price (INR)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.offer_price}
                        onChange={e => setForm(prev => ({ ...prev, offer_price: e.target.value }))}
                        placeholder="e.g. Campaign price"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Offer Start Date</label>
                      <input
                        type="date"
                        value={form.offer_start_date}
                        onChange={e => setForm(prev => ({ ...prev, offer_start_date: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Offer End Date</label>
                      <input
                        type="date"
                        value={form.offer_end_date}
                        onChange={e => setForm(prev => ({ ...prev, offer_end_date: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4 – Inventory */}
            {activeStep === 4 && (
              <div className="space-y-5 max-w-xl">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Combo Pack Inventory Stock Levels</label>
                  <input
                    type="number"
                    value={form.inventory}
                    onChange={e => setForm(prev => ({ ...prev, inventory: Number(e.target.value) }))}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">This represents the number of pre-assembled combo deal packs available for checkout.</p>
                </div>
              </div>
            )}

            {/* Step 5 – Images */}
            {activeStep === 5 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Thumbnail */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Thumbnail Image (1:1 Aspect Ratio)</label>
                    <ImageUploader
                      currentUrl={thumbnailUrl}
                      onUpload={(file) => {
                        setThumbnailFile(file);
                        setThumbnailUrl(URL.createObjectURL(file));
                      }}
                      onRemove={() => {
                        setThumbnailFile(null);
                        setThumbnailUrl(null);
                      }}
                      label="Upload Combo Thumbnail"
                      aspectRatio={1}
                    />
                  </div>

                  {/* Banner */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Banner Image (16:9 Aspect Ratio)</label>
                    <ImageUploader
                      currentUrl={bannerUrl}
                      onUpload={(file) => {
                        setBannerFile(file);
                        setBannerUrl(URL.createObjectURL(file));
                      }}
                      onRemove={() => {
                        setBannerFile(null);
                        setBannerUrl(null);
                      }}
                      label="Upload Campaign Banner"
                      aspectRatio={16 / 9}
                    />
                  </div>
                </div>

                {/* Gallery List */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Gallery Slideshow Images</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Slides will display in details slideshow views. {!editCombo && <span className="text-rose-500 font-bold">Please save the combo deal first to enable uploading gallery slides.</span>}</p>
                  </div>
                  {editCombo && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {galleryImages.map(img => (
                        <div key={img.id} className="relative aspect-square rounded-2xl border border-slate-200 bg-white p-2 group overflow-hidden">
                          <img src={img.image} alt={img.alt_text} className="w-full h-full object-cover rounded-xl" />
                          <button
                            onClick={() => handleDeleteGalleryImage(img.id)}
                            className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg shadow opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {/* Image adder uploader */}
                      <div className="aspect-square">
                        <ImageUploader
                          onUpload={handleUploadGalleryImage}
                          label="Add Slide"
                          aspectRatio={1}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 6 – Description */}
            {activeStep === 6 && (
              <div className="space-y-5 max-w-3xl">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Detailed/Full Description (Markdown / HTML)</label>
                  <textarea
                    value={form.full_description}
                    onChange={e => setForm(prev => ({ ...prev, full_description: e.target.value }))}
                    placeholder="Write clinical benefits, features list, specifications..."
                    rows={10}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white resize-y font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {/* Step 7 – SEO */}
            {activeStep === 7 && (
              <div className="space-y-5 max-w-2xl">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Meta Title</label>
                  <input
                    type="text"
                    value={form.meta_title}
                    onChange={e => setForm(prev => ({ ...prev, meta_title: e.target.value }))}
                    placeholder="FAAZO Premium Dental Combo - Super Saver Deal"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Meta Description</label>
                  <textarea
                    value={form.meta_description}
                    onChange={e => setForm(prev => ({ ...prev, meta_description: e.target.value }))}
                    placeholder="Short summary optimized for Google search indexes..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Meta Keywords</label>
                  <input
                    type="text"
                    value={form.meta_keywords}
                    onChange={e => setForm(prev => ({ ...prev, meta_keywords: e.target.value }))}
                    placeholder="dental combo, dentist startup bundle, discount dental equipment"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
            <button
              onClick={handleBackStep}
              disabled={activeStep === 1}
              className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer ${activeStep === 1 ? 'text-slate-300 bg-slate-100 cursor-not-allowed' : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'}`}
            >
              Back
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              {activeStep < 7 ? (
                <button
                  onClick={handleNextStep}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-[#005B63] hover:bg-[#004e54] rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
                >
                  Next Step <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSaveCombo}
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-[#005B63] hover:bg-[#004e54] rounded-xl shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Deploy Combo Deal'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Section Header */}
          <SectionHeader
            title="Combo Deals Manager"
            subtitle="Administer multi-item bundled packages and bulk discounts."
            actions={
              <div className="flex gap-2">
                <button
                  onClick={() => setIsBannerModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-[#005B63] bg-white border border-[#005B63] hover:bg-[#f3fafb] rounded-xl shadow-sm cursor-pointer transition-all"
                >
                  <Image className="w-4 h-4" /> Banner Settings
                </button>
                <button
                  onClick={openCreate}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white bg-[#005B63] hover:bg-[#004a50] rounded-xl shadow cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" /> Create Combo Deal
                </button>
              </div>
            }
          />

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard stat={{ id: 'total', label: "Total Combos", value: combos.length, icon: "Sparkles", variant: "teal" }} />
            <StatCard stat={{ id: 'active', label: "Active Combos", value: combos.filter(c => c.status === 'active').length, icon: "Check", variant: "blue" }} />
            <StatCard stat={{ id: 'featured', label: "Featured Combos", value: combos.filter(c => c.is_featured).length, icon: "Star", variant: "orange" }} />
            <StatCard stat={{ id: 'outofstock', label: "Out of Stock", value: combos.filter(c => c.inventory === 0).length, icon: "AlertTriangle", variant: "red" }} />
          </div>

          {/* List Toolbar Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search combo packages..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white w-full md:w-40"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <SkeletonLoader type="table" rows={4} />
          ) : filtered.length === 0 ? (
            <EmptyState
              preset="no-results"
              title="No combos found"
              description={search ? `No results match "${search}"` : 'Get started by creating your first bundle combo pack.'}
              action={
                <button
                  onClick={openCreate}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#005B63] hover:bg-[#004e54] rounded-xl transition-all cursor-pointer"
                >
                  Create Combo Deal
                </button>
              }
            />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <DataTable columns={columns} data={filtered} />
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Combo Deal?"
          message={`Are you sure you want to permanently delete the "${deleteTarget.title}" combo deal? This action cannot be undone.`}
          confirmLabel="Delete Combo"
          variant="danger"
          loading={deleting}
        />
      )}

      {/* Preview Modal */}
      {previewCombo && (
        <AdminModal
          isOpen={!!previewCombo}
          onClose={() => setPreviewCombo(null)}
          title="Combo Deal Preview"
          size="lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 text-left">
            <div>
              {previewCombo.banner ? (
                <img src={previewCombo.banner} alt={previewCombo.title} className="w-full aspect-video object-cover rounded-2xl border border-slate-200" />
              ) : (
                <div className="w-full aspect-video bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center">
                  <Image className="w-10 h-10 text-slate-300" />
                </div>
              )}
              <h3 className="text-lg font-bold text-slate-800 mt-4">{previewCombo.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{previewCombo.short_description}</p>
              
              <div className="flex gap-4 items-center mt-4">
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Combo Price</span>
                  <span className="text-xl font-black text-teal-600">₹{parseFloat(previewCombo.effective_price).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Savings</span>
                  <span className="text-sm font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg inline-block">
                    SAVE {previewCombo.discount_percentage}% (₹{parseFloat(previewCombo.you_save || '0').toLocaleString('en-IN')})
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Included Products</h4>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {previewCombo.combo_products.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-2 rounded-xl border border-slate-100 text-xs">
                    <span className="font-bold text-slate-700 truncate max-w-[200px]">{item.product.name}</span>
                    <span className="font-mono text-slate-400 font-bold">Qty: {item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Stock level:</span>
                  <span className="font-bold text-slate-700">{previewCombo.inventory} Units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">SEO Title:</span>
                  <span className="font-bold text-slate-700 truncate max-w-[220px]">{previewCombo.meta_title || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Status:</span>
                  <span className="capitalize font-bold text-slate-700">{previewCombo.status}</span>
                </div>
              </div>
            </div>
          </div>
        </AdminModal>
      )}
      {isBannerModalOpen && (
        <AdminModal
          isOpen={isBannerModalOpen}
          onClose={() => setIsBannerModalOpen(false)}
          title="Edit Combo Deals Page Banner"
          size="md"
        >
          <div className="space-y-4 p-5 text-left">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Badge Text</label>
              <input
                type="text"
                value={bannerForm.badge_text}
                onChange={e => setBannerForm(prev => ({ ...prev, badge_text: e.target.value }))}
                placeholder="SUPER SAVER BUNDLES"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Banner Title</label>
              <input
                type="text"
                value={bannerForm.title}
                onChange={e => setBannerForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Premium Combo Deals"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white text-sm font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Description</label>
              <textarea
                value={bannerForm.description}
                onChange={e => setBannerForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Equip your clinical workflows..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white text-sm resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Banner Background Image (Landscape)</label>
              <ImageUploader
                currentUrl={bannerSettingsUrl}
                onUpload={(file) => {
                  setBannerSettingsFile(file);
                  setBannerSettingsUrl(URL.createObjectURL(file));
                }}
                onRemove={() => {
                  setBannerSettingsFile(null);
                  setBannerSettingsUrl(null);
                }}
                label="Upload Banner Background"
                aspectRatio={21 / 9}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsBannerModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBannerSettings}
                disabled={savingBanner}
                className="px-5 py-2 text-xs font-bold text-white bg-[#005B63] hover:bg-[#004e54] rounded-xl shadow transition-all cursor-pointer disabled:opacity-50"
              >
                {savingBanner ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
};

export default ComboDealsPage;
