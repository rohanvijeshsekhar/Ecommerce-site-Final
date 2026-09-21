'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, Edit2, Copy, GripVertical, Eye, EyeOff, X, Save,
  Award, Search, Calendar, CheckCircle2, AlertCircle, Clock,
  ExternalLink, Sparkles, Image as ImageIcon, ChevronRight,
  ArrowRight, ShieldCheck, Tag, Percent, RefreshCw, Palette,
  Monitor, Smartphone
} from 'lucide-react';
import { brandDealsService, adminService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';
import { useToast } from '../Toast';
import type { BrandDeal, BrandDealProduct } from '../../types/admin';
import { getAbsoluteImageUrl } from '@/lib/api';
import LoadingOverlay from '../LoadingOverlay';
import ConfirmDialog from '../ConfirmDialog';
import EmptyState from '../EmptyState';
import ImageUploader from '../ImageUploader';

interface BrandOption {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  brand_name?: string;
  image_url?: string | null;
  pricing?: {
    mrp: number;
    selling_price: number;
  };
  mrp?: number;
  selling_price?: number;
}

interface DealProductDraft {
  id?: string;
  product: string;
  product_name: string;
  product_slug: string;
  product_sku: string;
  product_image_url: string | null;
  product_mrp: number;
  product_selling_price: number;
  deal_price: number;
  discount_percentage: number;
  is_active: boolean;
  sort_order: number;
}

const BLANK_FORM = {
  brand: '',
  name: '',
  slug: '',
  title: '',
  subtitle: '',
  promotional_tag: 'EXCLUSIVE BRAND OFFER',
  offer_text: 'UP TO 40% OFF',
  cta_text: 'Shop the Offer →',
  description: '',
  bg_color: '#005F63',
  text_color: '#FFFFFF',
  accent_color: '#BFE8E8',
  start_datetime: '',
  end_datetime: '',
  status: 'active' as const,
  is_active: true,
  show_on_homepage: true,
  is_all_brand_products: false,
  desktop_image: null as File | string | null,
  mobile_image: null as File | string | null,
};

const BrandDealsManager: React.FC = () => {
  const toast = useToast();
  const showToast = React.useCallback(
    (t: { variant: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string }) => {
      toast.show(t);
    },
    [toast]
  );
  const [deals, setDeals] = useState<BrandDeal[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal / Wizard state
  const [showModal, setShowModal] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [previewTab, setPreviewTab] = useState<'banner' | 'landing'>('banner');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [editDeal, setEditDeal] = useState<BrandDeal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BrandDeal | null>(null);

  // Form state
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [draftProducts, setDraftProducts] = useState<DealProductDraft[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Load all campaigns, brands, products
  const loadData = async () => {
    setLoading(true);
    try {
      const [dealsRes, brandsRes, prodsRes] = await Promise.all([
        brandDealsService.getAll({ all: true }),
        adminService.getBrandsDropdown().catch(() => ({ data: [] })),
        adminService.getProductsDropdown().catch(() => ({ data: [] })),
      ]);

      if (dealsRes.data) {
        const dList = Array.isArray(dealsRes.data) ? dealsRes.data : (dealsRes.data as any).results || [];
        setDeals(dList);
      }
      if (brandsRes.data) {
        const bList = Array.isArray(brandsRes.data) ? brandsRes.data : (brandsRes.data as any).results || [];
        setBrands(bList);
      }
      if (prodsRes.data) {
        const pList = Array.isArray(prodsRes.data) ? prodsRes.data : (prodsRes.data as any).results || [];
        setAllProducts(pList);
      }
    } catch (err: any) {
      showToast({ variant: 'error', title: 'Error loading Brand Deals', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered campaigns for table view
  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && d.is_active && d.status === 'active') ||
        (statusFilter === 'draft' && d.status === 'draft') ||
        (statusFilter === 'scheduled' && d.status === 'scheduled') ||
        (statusFilter === 'expired' && d.status === 'expired') ||
        (statusFilter === 'inactive' && !d.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [deals, searchQuery, statusFilter]);

  // Available products for current selected brand
  const brandProducts = useMemo(() => {
    if (!form.brand) return allProducts;
    return allProducts.filter((p) => String(p.brand) === String(form.brand));
  }, [allProducts, form.brand]);

  // Unselected products matching search
  const availableToAdd = useMemo(() => {
    const selectedIds = new Set(draftProducts.map((dp) => String(dp.product)));
    return brandProducts.filter((p) => {
      if (selectedIds.has(String(p.id))) return false;
      if (!productSearch) return true;
      const q = productSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
    });
  }, [brandProducts, draftProducts, productSearch]);

  // Helper to resolve preview URL for File or existing string image
  const getPreviewSrc = (img: File | string | null | undefined): string | null => {
    if (!img) return null;
    if (img instanceof File) {
      try {
        return URL.createObjectURL(img);
      } catch {
        return null;
      }
    }
    if (typeof img === 'string' && img.trim()) {
      return getAbsoluteImageUrl(img);
    }
    return null;
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditDeal(null);
    setForm({ ...BLANK_FORM });
    setDraftProducts([]);
    setActiveStep(1);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (deal: BrandDeal) => {
    setEditDeal(deal);
    const brandId =
      typeof deal.brand === 'object' && deal.brand !== null
        ? (deal.brand as any).id
        : String(deal.brand || (deal as any).brand_id || '');

    setForm({
      brand: brandId,
      name: deal.name || '',
      slug: deal.slug || '',
      title: deal.title || '',
      subtitle: deal.subtitle || '',
      promotional_tag: deal.badge_text || deal.promotional_tag || 'EXCLUSIVE BRAND OFFER',
      offer_text: deal.offer_text || (deal.discount_percentage ? `UP TO ${deal.discount_percentage}% OFF` : 'UP TO 40% OFF'),
      cta_text: deal.cta_text || 'Shop the Offer →',
      description: deal.subtitle || deal.description || '',
      bg_color: deal.bg_color || '#005F63',
      text_color: deal.text_color || '#FFFFFF',
      accent_color: deal.accent_color || '#BFE8E8',
      start_datetime: deal.start_datetime ? deal.start_datetime.slice(0, 16) : '',
      end_datetime: deal.end_datetime ? deal.end_datetime.slice(0, 16) : '',
      status: deal.status as any || 'active',
      is_active: deal.is_active !== false,
      show_on_homepage: deal.show_on_homepage !== false,
      is_all_brand_products: deal.is_all_brand_products || false,
      desktop_image: deal.banner_desktop || deal.desktop_image_url || null,
      mobile_image: deal.banner_mobile || deal.mobile_image_url || null,
    });

    if (deal.deal_products && deal.deal_products.length > 0) {
      setDraftProducts(
        deal.deal_products.map((dp, idx) => ({
          id: dp.id,
          product: typeof dp.product === 'object' && dp.product !== null ? (dp.product as any).id : String(dp.product || (dp as any).product_id || ''),
          product_name: dp.product_name || '',
          product_slug: dp.product_slug || '',
          product_sku: dp.product_sku || '',
          product_image_url: dp.product_image_url || null,
          product_mrp: Number(dp.product_mrp) || 0,
          product_selling_price: Number(dp.product_selling_price) || 0,
          deal_price: Number(dp.deal_price) || 0,
          discount_percentage: Number(dp.discount_percentage) || 0,
          is_active: dp.is_active !== false,
          sort_order: dp.sort_order ?? idx,
        }))
      );
    } else {
      setDraftProducts([]);
    }

    setActiveStep(1);
    setShowModal(true);
  };

  // Brand selection helper
  const handleBrandChange = (brandId: string) => {
    const selectedBrand = brands.find((b) => String(b.id) === String(brandId));
    const brandName = selectedBrand ? selectedBrand.name : '';
    const autoSlug = brandName
      ? `${brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-special-deal`
      : '';

    setForm((prev) => ({
      ...prev,
      brand: brandId,
      name: prev.name || (brandName ? `${brandName} Promotional Campaign` : ''),
      slug: prev.slug || autoSlug,
      title: prev.title || (brandName ? `${brandName} Mega Savings Fest` : ''),
    }));
  };

  // Add Product to draft
  const handleAddProduct = (prod: ProductOption) => {
    const mrp = Number(prod.pricing?.mrp || prod.mrp || 0);
    const selling = Number(prod.pricing?.selling_price || prod.selling_price || mrp);
    const defaultDealPrice = mrp > 0 ? Math.round(mrp * 0.8) : (selling > 0 ? selling : 0);
    const discount = mrp > 0 && defaultDealPrice > 0 ? Math.round(((mrp - defaultDealPrice) / mrp) * 100) : 0;

    setDraftProducts((prev) => [
      ...prev,
      {
        product: prod.id,
        product_name: prod.name,
        product_slug: prod.slug,
        product_sku: prod.sku,
        product_image_url: prod.image_url || null,
        product_mrp: mrp,
        product_selling_price: selling,
        deal_price: defaultDealPrice,
        discount_percentage: discount,
        is_active: true,
        sort_order: prev.length,
      },
    ]);
  };

  // Synchronized Pricing: Update deal price -> recalculates discount %
  const handleUpdateProductPrice = (index: number, priceStr: string) => {
    const num = priceStr === '' ? 0 : parseFloat(priceStr);
    setDraftProducts((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };
      const parsedPrice = isNaN(num) ? 0 : Math.max(0, num);
      target.deal_price = parsedPrice;
      const mrp = target.product_mrp || target.product_selling_price || 0;
      if (mrp > 0 && parsedPrice > 0 && parsedPrice <= mrp) {
        target.discount_percentage = Math.round(((mrp - parsedPrice) / mrp) * 100);
      } else if (parsedPrice > mrp) {
        target.discount_percentage = 0;
      } else {
        target.discount_percentage = 0;
      }
      copy[index] = target;
      return copy;
    });
  };

  // Synchronized Pricing: Update discount % -> recalculates deal price
  const handleUpdateDiscountPercentage = (index: number, discountStr: string) => {
    const num = discountStr === '' ? 0 : parseFloat(discountStr);
    setDraftProducts((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };
      const disc = isNaN(num) ? 0 : Math.max(0, Math.min(100, num));
      target.discount_percentage = disc;
      const mrp = target.product_mrp || target.product_selling_price || 0;
      if (mrp > 0) {
        target.deal_price = Math.round(mrp * (1 - disc / 100));
      }
      copy[index] = target;
      return copy;
    });
  };

  // Remove draft product
  const handleRemoveProduct = (index: number) => {
    setDraftProducts((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick toggle active
  const handleToggleActive = async (deal: BrandDeal) => {
    try {
      const updated = await brandDealsService.update(deal.id, { is_active: !deal.is_active });
      if (updated.data) {
        const updatedDeal = updated.data;
        setDeals((prev) => prev.map((d) => (d.id === deal.id ? updatedDeal : d)));
        showToast({
          variant: 'success',
          title: `Campaign ${!deal.is_active ? 'Activated' : 'Deactivated'}`,
        });
      }
    } catch (err: any) {
      showToast({ variant: 'error', title: 'Update failed', message: err.message });
    }
  };

  // Quick toggle show on homepage
  const handleToggleShowHomepage = async (deal: BrandDeal) => {
    try {
      const updated = await brandDealsService.update(deal.id, {
        show_on_homepage: !deal.show_on_homepage,
      });
      if (updated.data) {
        const updatedDeal = updated.data;
        setDeals((prev) => prev.map((d) => (d.id === deal.id ? updatedDeal : d)));
        showToast({
          variant: 'success',
          title: updatedDeal.show_on_homepage
            ? 'Added to Homepage Banner'
            : 'Removed from Homepage Banner',
        });
      }
    } catch (err: any) {
      showToast({ variant: 'error', title: 'Update failed', message: err.message });
    }
  };

  // Duplicate campaign
  const handleDuplicate = async (deal: BrandDeal) => {
    setLoading(true);
    try {
      const res = await brandDealsService.duplicate(deal.id);
      if (res.data) {
        const newDeal = res.data;
        setDeals((prev) => [newDeal, ...prev]);
        showToast({ variant: 'success', title: 'Campaign Duplicated', message: `Created "${newDeal.name}"` });
      }
    } catch (err: any) {
      showToast({ variant: 'error', title: 'Duplicate failed', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Delete campaign
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await brandDealsService.delete(deleteTarget.id);
      setDeals((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      showToast({ variant: 'success', title: 'Campaign Deleted' });
      setDeleteTarget(null);
    } catch (err: any) {
      showToast({ variant: 'error', title: 'Delete failed', message: err.message });
    } finally {
      setSaving(false);
    }
  };

// Helper to extract clear human-readable error messages from FAAZO backend responses
function extractApiError(err: any): { message: string; fieldErrors: Record<string, string> } {
  const errData = err?.response?.data;
  const fieldErrors: Record<string, string> = {};

  if (!errData) {
    return { message: err?.message || 'Network error or server unavailable.', fieldErrors };
  }

  // Handle FAAZO standard envelope: { success: false, error: { code, message, details } }
  const errorObj =
    errData.error && typeof errData.error === 'object'
      ? errData.error
      : errData;

  // 1. Details array of objects: [ { field: 'slug', issue: '...' } ]
  if (Array.isArray(errorObj.details) && errorObj.details.length > 0) {
    const msgs: string[] = [];
    for (const d of errorObj.details) {
      if (d && typeof d === 'object') {
        const field = d.field || '';
        const issue = d.issue || d.message || JSON.stringify(d);
        if (field) fieldErrors[field] = issue;
        msgs.push(field ? `${field}: ${issue}` : issue);
      } else if (typeof d === 'string') {
        msgs.push(d);
      }
    }
    return { message: msgs.join(' | '), fieldErrors };
  }

  // 2. Details object with field arrays or strings: { slug: ['already exists'], name: 'required' }
  const detailsObj =
    errorObj.details && typeof errorObj.details === 'object' && !Array.isArray(errorObj.details)
      ? errorObj.details
      : errData.details && typeof errData.details === 'object' && !Array.isArray(errData.details)
      ? errData.details
      : null;

  if (detailsObj) {
    const msgs: string[] = [];
    for (const [k, v] of Object.entries(detailsObj)) {
      const issue = Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v);
      fieldErrors[k] = issue;
      msgs.push(`${k}: ${issue}`);
    }
    return { message: msgs.join(' | '), fieldErrors };
  }

  // 3. Direct DRF error map: { slug: ['...'] }
  if (typeof errData === 'object' && !errData.success && !errData.error) {
    const msgs: string[] = [];
    for (const [k, v] of Object.entries(errData)) {
      if (k === 'success' || k === 'data') continue;
      const issue = Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v);
      fieldErrors[k] = issue;
      msgs.push(`${k}: ${issue}`);
    }
    if (msgs.length > 0) {
      return { message: msgs.join(' | '), fieldErrors };
    }
  }

  // 4. Check message inside errorObj or errData
  if (typeof errorObj.message === 'string' && errorObj.message.trim()) {
    return { message: errorObj.message, fieldErrors };
  }
  if (typeof errData.message === 'string' && errData.message.trim()) {
    return { message: errData.message, fieldErrors };
  }

  return { message: err?.message || 'An unexpected error occurred while saving.', fieldErrors };
}

  // Save Campaign (Create or Update)
  const handleSaveCampaign = async () => {
    const selectedBrandId =
      typeof form.brand === 'object' && form.brand !== null
        ? (form.brand as any).id
        : String(form.brand || '');

    if (!selectedBrandId) {
      showToast({ variant: 'error', title: 'Brand Required', message: 'Please select a brand in Step 1.' });
      setActiveStep(1);
      return;
    }
    if (!form.name.trim() || !form.slug.trim()) {
      showToast({ variant: 'error', title: 'Name & Slug Required', message: 'Campaign name and URL slug are required in Step 1.' });
      setActiveStep(1);
      return;
    }

    // Comprehensive Pricing & Product Validation
    if (!form.is_all_brand_products) {
      if (draftProducts.length === 0) {
        showToast({
          variant: 'error',
          title: 'Products Required',
          message: 'Please add at least one participating product in Step 2, or enable "Include All Brand Products".',
        });
        setActiveStep(2);
        return;
      }

      for (const dp of draftProducts) {
        const mrp = dp.product_mrp || dp.product_selling_price || 0;
        if (!dp.deal_price || dp.deal_price <= 0) {
          showToast({
            variant: 'error',
            title: 'Invalid Campaign Price',
            message: `Product "${dp.product_name}" must have a valid campaign price greater than ₹0.`,
          });
          setActiveStep(2);
          return;
        }
        if (mrp > 0 && dp.deal_price > mrp) {
          showToast({
            variant: 'error',
            title: 'Campaign Price Exceeds MRP',
            message: `Campaign price (₹${dp.deal_price}) for "${dp.product_name}" cannot exceed original MRP (₹${mrp}).`,
          });
          setActiveStep(2);
          return;
        }
        if (dp.discount_percentage < 0 || dp.discount_percentage > 100) {
          showToast({
            variant: 'error',
            title: 'Invalid Discount %',
            message: `Discount percentage for "${dp.product_name}" must be between 0% and 100%.`,
          });
          setActiveStep(2);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('brand', selectedBrandId);
      fd.append('name', form.name.trim());
      fd.append('slug', form.slug.trim());
      fd.append('title', form.title.trim() || form.name.trim());
      fd.append('subtitle', form.subtitle?.trim() || '');
      fd.append('promotional_tag', form.promotional_tag?.trim() || 'EXCLUSIVE BRAND OFFER');
      fd.append('offer_text', form.offer_text?.trim() || 'UP TO 40% OFF');
      fd.append('cta_text', form.cta_text?.trim() || 'Shop the Offer →');
      fd.append('description', form.description?.trim() || '');
      fd.append('bg_color', form.bg_color || '#005F63');
      fd.append('text_color', form.text_color || '#FFFFFF');
      fd.append('accent_color', form.accent_color || '#BFE8E8');
      fd.append('status', form.status || 'active');
      fd.append('is_active', String(form.is_active !== false));
      fd.append('show_on_homepage', String(form.show_on_homepage !== false));
      fd.append('is_all_brand_products', String(!!form.is_all_brand_products));

      if (form.start_datetime && !isNaN(new Date(form.start_datetime).getTime())) {
        fd.append('start_datetime', new Date(form.start_datetime).toISOString());
      } else {
        fd.append('start_datetime', '');
      }

      if (form.end_datetime && !isNaN(new Date(form.end_datetime).getTime())) {
        fd.append('end_datetime', new Date(form.end_datetime).toISOString());
      } else {
        fd.append('end_datetime', '');
      }

      // Append image if new File upload. If explicitly cleared (null), send empty string.
      // If it's an existing URL string, omit it so backend preserves existing image.
      if (form.desktop_image instanceof File) {
        fd.append('desktop_image', form.desktop_image);
      } else if (form.desktop_image === null) {
        fd.append('desktop_image', '');
      }

      if (form.mobile_image instanceof File) {
        fd.append('mobile_image', form.mobile_image);
      } else if (form.mobile_image === null) {
        fd.append('mobile_image', '');
      }

      // Products Payload — always send valid JSON array string
      const productsPayload = draftProducts.map((dp, idx) => {
        const prodId =
          typeof dp.product === 'object' && dp.product !== null
            ? (dp.product as any).id
            : String(dp.product || (dp as any).product_id || '');
        return {
          product: prodId,
          product_id: prodId,
          deal_price: Number(dp.deal_price),
          discount_percentage: Number(dp.discount_percentage),
          is_active: dp.is_active !== false,
          sort_order: idx,
        };
      });
      fd.append('products_data', JSON.stringify(productsPayload));

      // Determine if this is an update or create
      const isUpdate = !!editDeal?.id;

      if (isUpdate) {
        try {
          await brandDealsService.update(editDeal!.id, fd);
          showToast({ variant: 'success', title: 'Campaign Updated Successfully' });
        } catch (updateErr: any) {
          const status = updateErr.response?.status;
          if (status === 404) {
            // Deal was not found by ID — create it fresh
            try {
              await brandDealsService.create(fd);
              showToast({ variant: 'success', title: 'Campaign Created Successfully' });
            } catch (fallbackErr: any) {
              const { message, fieldErrors } = extractApiError(fallbackErr);
              if (fieldErrors.slug || message.toLowerCase().includes('slug')) {
                const newSlug = `${form.slug.trim()}-${Date.now().toString(36)}`;
                fd.set('slug', newSlug);
                setForm((prev) => ({ ...prev, slug: newSlug }));
                await brandDealsService.create(fd);
                showToast({
                  variant: 'success',
                  title: 'Campaign Created',
                  message: `Slug auto-adjusted to '${newSlug}' to avoid conflict.`,
                });
              } else {
                showToast({ variant: 'error', title: 'Save Failed', message });
                setSaving(false);
                return;
              }
            }
          } else {
            const { message, fieldErrors } = extractApiError(updateErr);
            // If slug conflict on update (e.g. user changed slug to another campaign's slug)
            if (fieldErrors.slug || message.toLowerCase().includes('slug')) {
              try {
                const newSlug = `${form.slug.trim()}-${Date.now().toString(36)}`;
                fd.set('slug', newSlug);
                setForm((prev) => ({ ...prev, slug: newSlug }));
                await brandDealsService.update(editDeal!.id, fd);
                showToast({
                  variant: 'success',
                  title: 'Campaign Updated',
                  message: `Slug was auto-adjusted to avoid conflict.`,
                });
                setShowModal(false);
                await loadData();
                return;
              } catch (retryErr: any) {
                const retryErrInfo = extractApiError(retryErr);
                showToast({ variant: 'error', title: 'Save Failed', message: retryErrInfo.message });
                setSaving(false);
                return;
              }
            }
            showToast({ variant: 'error', title: 'Save Failed', message });
            setSaving(false);
            return;
          }
        }
      } else {
        try {
          await brandDealsService.create(fd);
          showToast({ variant: 'success', title: 'Campaign Created Successfully' });
        } catch (createErr: any) {
          const { message, fieldErrors } = extractApiError(createErr);
          // Check for slug conflict and auto-fix
          if (fieldErrors.slug || message.toLowerCase().includes('slug')) {
            try {
              const newSlug = `${form.slug.trim()}-${Date.now().toString(36)}`;
              fd.set('slug', newSlug);
              setForm((prev) => ({ ...prev, slug: newSlug }));
              await brandDealsService.create(fd);
              showToast({
                variant: 'success',
                title: 'Campaign Created',
                message: `Slug was auto-adjusted to '${newSlug}' to avoid conflict.`,
              });
              setShowModal(false);
              await loadData();
              return;
            } catch (retryErr: any) {
              const retryErrInfo = extractApiError(retryErr);
              showToast({ variant: 'error', title: 'Save Failed', message: retryErrInfo.message });
              setSaving(false);
              return;
            }
          }
          showToast({ variant: 'error', title: 'Save Failed', message });
          setSaving(false);
          return;
        }
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      console.error('[BrandDealsManager] Error saving brand deal:', err?.response?.data ?? err);
      const { message } = extractApiError(err);
      showToast({
        variant: 'error',
        title: 'Save Failed',
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  // Selected brand object for preview
  const selectedBrandObj = brands.find((b) => String(b.id) === String(form.brand));

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#006670]/10 text-[#006670] rounded-lg">
              <Award className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-800">Brand Deal Campaigns</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Create high-impact promotional offers for dental brands. Displays as a premium carousel banner on the homepage and redirects to a dedicated campaign landing page.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            title="Refresh Campaigns"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#006670] hover:bg-[#004d55] text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Brand Campaign
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search campaigns or brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006670]/30 focus:border-[#006670]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'scheduled', label: 'Scheduled' },
            { id: 'draft', label: 'Draft' },
            { id: 'expired', label: 'Expired' },
            { id: 'inactive', label: 'Disabled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#006670] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingOverlay message="Loading Brand Deal campaigns..." />
        </div>
      ) : filteredDeals.length === 0 ? (
        <EmptyState
          title="No Brand Deal Campaigns Found"
          description="Create your first dedicated brand promotional deal to showcase on the homepage."
          action={
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-[#006670] hover:bg-[#004d55] text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              + Create Brand Deal
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDeals.map((deal) => {
            const isLive = deal.is_currently_valid && deal.is_active;
            return (
              <div
                key={deal.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Visual Header / Banner Thumbnail */}
                  <div
                    className="relative h-40 p-4 flex flex-col justify-between"
                    style={{
                      background: deal.bg_color || '#005F63',
                      color: deal.text_color || '#FFFFFF',
                    }}
                  >
                    {(deal.banner_desktop || (deal as any).desktop_image_url || (deal as any).desktop_image) && (
                      <div className="absolute inset-0 z-0 pointer-events-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getAbsoluteImageUrl(deal.banner_desktop || (deal as any).desktop_image_url || (deal as any).desktop_image)}
                          alt={deal.name}
                          className="w-full h-full object-cover opacity-30"
                        />
                      </div>
                    )}

                    <div className="relative z-10 flex items-center justify-between">
                      <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full bg-white/20 backdrop-blur-sm">
                        {deal.badge_text || 'EXCLUSIVE DEAL'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                            deal.status === 'active' && deal.is_active
                              ? 'bg-emerald-500/90 text-white'
                              : deal.status === 'scheduled'
                              ? 'bg-blue-500/90 text-white'
                              : deal.status === 'expired'
                              ? 'bg-red-500/90 text-white'
                              : 'bg-slate-700/80 text-white'
                          }`}
                        >
                          {deal.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="relative z-10">
                      <div className="text-xs font-medium opacity-90">{deal.brand_name}</div>
                      <h3 className="text-lg font-bold truncate">{deal.title || deal.name}</h3>
                      {deal.subtitle && <p className="text-xs opacity-80 line-clamp-1">{deal.subtitle}</p>}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{deal.name}</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono">
                        /{deal.slug}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100">
                      <div>
                        <span className="text-slate-400 block">Products:</span>
                        <span className="font-semibold text-slate-700">
                          {deal.deal_products?.length || deal.product_count || 0} items
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Homepage Banner:</span>
                        <span
                          className={`font-semibold ${
                            deal.show_on_homepage ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {deal.show_on_homepage ? '✓ Visible' : '✗ Hidden'}
                        </span>
                      </div>
                    </div>

                    {/* Dates */}
                    {(deal.start_datetime || deal.end_datetime) && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {deal.start_datetime ? new Date(deal.start_datetime).toLocaleDateString() : 'Now'}{' '}
                          →{' '}
                          {deal.end_datetime ? new Date(deal.end_datetime).toLocaleDateString() : 'Ongoing'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(deal)}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        deal.is_active
                          ? 'text-emerald-600 hover:bg-emerald-50'
                          : 'text-slate-400 hover:bg-slate-200'
                      }`}
                      title={deal.is_active ? 'Active (click to disable)' : 'Disabled (click to activate)'}
                    >
                      {deal.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleToggleShowHomepage(deal)}
                      className={`p-1.5 rounded-lg transition cursor-pointer text-xs font-semibold px-2 ${
                        deal.show_on_homepage
                          ? 'bg-[#006670]/10 text-[#006670]'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                      title="Toggle homepage carousel placement"
                    >
                      HP
                    </button>

                    <a
                      href={`/brand-deals/${deal.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-500 hover:text-[#006670] hover:bg-slate-200 rounded-lg transition"
                      title="View Customer Landing Page"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicate(deal)}
                      className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                      title="Duplicate Campaign"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleOpenEdit(deal)}
                      className="p-1.5 text-slate-600 hover:text-[#006670] hover:bg-slate-200 rounded-lg transition cursor-pointer"
                      title="Edit Campaign"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeleteTarget(deal)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          Create / Edit Modal Wizard
      ───────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-slate-200 my-8 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  {editDeal ? `Edit: ${editDeal.name}` : 'New Brand Deal Campaign'}
                </h3>
                <p className="text-xs text-slate-400">
                  Configure brand association, promotional banner visuals, campaign pricing, and product grid.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Navigation Tabs */}
            <div className="px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex gap-1 py-2">
                {[
                  { step: 1, label: '1. Brand & Info' },
                  { step: 2, label: '2. Products & Pricing' },
                  { step: 3, label: '3. Visual Styling' },
                  { step: 4, label: '4. Visibility & Schedule' },
                ].map((s) => (
                  <button
                    key={s.step}
                    onClick={() => setActiveStep(s.step as any)}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                      activeStep === s.step
                        ? 'bg-[#006670] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Step indicator */}
              <div className="text-xs font-semibold text-slate-500">
                Step {activeStep} of 4
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* ──────────────── STEP 1: BRAND & INFO ──────────────── */}
              {activeStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Select Dental Brand *
                      </label>
                      <select
                        value={form.brand}
                        onChange={(e) => handleBrandChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006670]"
                      >
                        <option value="">-- Choose Brand --</option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Campaign Name (Internal Admin Reference) *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Waldent Mega Endo Fest"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006670]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Landing Page URL Slug *
                      </label>
                      <div className="flex items-center">
                        <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-300 text-xs text-slate-500 rounded-l-lg">
                          /brand-deals/
                        </span>
                        <input
                          type="text"
                          placeholder="waldent-mega-deal"
                          value={form.slug}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''),
                            })
                          }
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-r-lg focus:ring-2 focus:ring-[#006670]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Promotional Tag / Badge
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. EXCLUSIVE BRAND OFFER"
                        value={form.promotional_tag}
                        onChange={(e) => setForm({ ...form, promotional_tag: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006670]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Main Display Headline (Title) *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Up to 40% Off on Waldent Endodontics"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006670]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Offer Text / Callout
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. UP TO 40% OFF"
                        value={form.offer_text}
                        onChange={(e) => setForm({ ...form, offer_text: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006670]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Subheading / Supporting Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Premium endodontic rotary instruments, apex locators and obturation units with official manufacturer warranty."
                      value={form.subtitle}
                      onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006670]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      CTA Button Text
                    </label>
                    <input
                      type="text"
                      placeholder="Shop the Offer →"
                      value={form.cta_text}
                      onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                      className="w-full max-w-xs px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006670]"
                    />
                  </div>
                </div>
              )}

              {/* ──────────────── STEP 2: PRODUCTS & PRICING ──────────────── */}
              {activeStep === 2 && (
                <div className="space-y-6">
                  {/* Mode Selector */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-slate-800 block">
                        Include All Brand Products
                      </span>
                      <span className="text-xs text-slate-500">
                        If enabled, all catalogue products for this brand will be shown in the campaign landing page.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.is_all_brand_products}
                        onChange={(e) =>
                          setForm({ ...form, is_all_brand_products: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006670]"></div>
                    </label>
                  </div>

                  {!form.is_all_brand_products && (
                    <div className="space-y-4">
                      {/* Product Selector Bar */}
                      <div className="p-4 bg-[#006670]/5 border border-[#006670]/20 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-[#006670] uppercase tracking-wider">
                            Add Participating Brand Products
                          </h4>
                          <span className="text-xs text-slate-500">
                            {brandProducts.length} brand products in catalogue
                          </span>
                        </div>

                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search by product name or SKU to add..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006670]"
                          />
                        </div>

                        {/* Search Dropdown Results */}
                        {productSearch && (
                          <div className="max-h-48 overflow-y-auto bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 shadow-lg">
                            {availableToAdd.length === 0 ? (
                              <div className="p-3 text-xs text-slate-400 text-center">
                                No matching products found for this brand
                              </div>
                            ) : (
                              availableToAdd.map((p) => (
                                <div
                                  key={p.id}
                                  className="p-2.5 flex items-center justify-between hover:bg-slate-50"
                                >
                                  <div className="flex items-center gap-3">
                                    {p.image_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={p.image_url}
                                        alt={p.name}
                                        className="w-9 h-9 object-contain rounded bg-slate-50 border border-slate-200"
                                      />
                                    ) : (
                                      <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                                        <ImageIcon className="w-4 h-4" />
                                      </div>
                                    )}
                                    <div>
                                      <div className="text-xs font-semibold text-slate-800">
                                        {p.name}
                                      </div>
                                      <div className="text-[11px] text-slate-400">
                                        SKU: {p.sku} • MRP: ₹{p.pricing?.mrp || p.mrp || 0}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleAddProduct(p)}
                                    className="px-3 py-1 bg-[#006670] hover:bg-[#004d55] text-white text-xs font-semibold rounded-md transition"
                                  >
                                    + Add
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Selected Products Table */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold text-slate-700 uppercase">
                            Participating Products ({draftProducts.length})
                          </h4>
                          <span className="text-xs text-slate-400">
                            Custom deal prices are enforced on server-side cart and checkout.
                          </span>
                        </div>

                        {draftProducts.length === 0 ? (
                          <div className="p-8 border border-dashed border-slate-300 rounded-xl text-center text-slate-400 text-xs">
                            No products added yet. Use the search bar above to select products for this brand deal.
                          </div>
                        ) : (
                          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                                <tr>
                                  <th className="p-3">Product</th>
                                  <th className="p-3 w-24">MRP</th>
                                  <th className="p-3 w-32">Discount %</th>
                                  <th className="p-3 w-36">Deal Price (₹)</th>
                                  <th className="p-3 w-28">Savings</th>
                                  <th className="p-3 w-16 text-center">Active</th>
                                  <th className="p-3 w-14 text-center">Remove</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {draftProducts.map((item, idx) => {
                                  const mrp = item.product_mrp || item.product_selling_price || 0;
                                  const savings = mrp > item.deal_price ? mrp - item.deal_price : 0;
                                  return (
                                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                      <td className="p-3 flex items-center gap-3">
                                        {item.product_image_url ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            src={item.product_image_url}
                                            alt={item.product_name}
                                            className="w-10 h-10 object-contain rounded bg-white border border-slate-200"
                                          />
                                        ) : (
                                          <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                                            <ImageIcon className="w-4 h-4" />
                                          </div>
                                        )}
                                        <div className="max-w-[200px]">
                                          <div className="font-semibold text-slate-800 line-clamp-1">
                                            {item.product_name}
                                          </div>
                                          <div className="text-[10px] text-slate-400 font-mono">
                                            SKU: {item.product_sku}
                                          </div>
                                        </div>
                                      </td>

                                      <td className="p-3 font-bold text-slate-500">
                                        ₹{mrp.toLocaleString('en-IN')}
                                      </td>

                                      {/* Discount % Input */}
                                      <td className="p-3">
                                        <div className="relative w-28">
                                          <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={item.discount_percentage === 0 ? '' : item.discount_percentage}
                                            placeholder="0"
                                            onChange={(e) =>
                                              handleUpdateDiscountPercentage(idx, e.target.value)
                                            }
                                            className="w-full pr-7 pl-2.5 py-1.5 text-xs font-bold text-[#006670] bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006670] focus:border-[#006670]"
                                          />
                                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                                            %
                                          </span>
                                        </div>
                                      </td>

                                      {/* Deal Price Input */}
                                      <td className="p-3">
                                        <div className="relative w-32">
                                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                                            ₹
                                          </span>
                                          <input
                                            type="number"
                                            min="1"
                                            max={mrp || undefined}
                                            value={item.deal_price === 0 ? '' : item.deal_price}
                                            placeholder="0"
                                            onChange={(e) =>
                                              handleUpdateProductPrice(idx, e.target.value)
                                            }
                                            className="w-full pl-6 pr-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006670] focus:border-[#006670]"
                                          />
                                        </div>
                                      </td>

                                      {/* Savings Display */}
                                      <td className="p-3">
                                        {savings > 0 ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-bold rounded-md bg-emerald-50 text-emerald-700 text-[11px]">
                                            Save ₹{savings.toLocaleString('en-IN')}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 text-[11px]">—</span>
                                        )}
                                      </td>

                                      <td className="p-3 text-center">
                                        <input
                                          type="checkbox"
                                          checked={item.is_active}
                                          onChange={(e) => {
                                            const copy = [...draftProducts];
                                            copy[idx].is_active = e.target.checked;
                                            setDraftProducts(copy);
                                          }}
                                          className="rounded text-[#006670] focus:ring-[#006670] cursor-pointer"
                                        />
                                      </td>

                                      <td className="p-3 text-center">
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveProduct(idx)}
                                          className="text-slate-400 hover:text-rose-500 p-1 rounded transition cursor-pointer"
                                          title="Remove from campaign"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ──────────────── STEP 3: VISUAL STYLING ──────────────── */}
              {activeStep === 3 && (
                <div className="space-y-6">
                  {/* Color Pickers */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-[#006670]" />
                      Banner Colors & Visual Theme
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Background Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={form.bg_color}
                            onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                            className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={form.bg_color}
                            onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                            className="flex-1 px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Tagline / Accent Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={form.accent_color}
                            onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                            className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={form.accent_color}
                            onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                            className="flex-1 px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Main Text Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={form.text_color}
                            onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                            className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={form.text_color}
                            onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                            className="flex-1 px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Artwork Image Uploaders */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Desktop Banner Artwork (Recommended: 1200x400)
                      </label>
                      <ImageUploader
                        currentUrl={getPreviewSrc(form.desktop_image)}
                        onUpload={(file) => setForm({ ...form, desktop_image: file })}
                        onRemove={() => setForm({ ...form, desktop_image: null })}
                        label="Desktop Banner"
                        aspectRatio={3 / 1}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mobile Banner Artwork (Optional: 600x400)
                      </label>
                      <ImageUploader
                        currentUrl={getPreviewSrc(form.mobile_image)}
                        onUpload={(file) => setForm({ ...form, mobile_image: file })}
                        onRemove={() => setForm({ ...form, mobile_image: null })}
                        label="Mobile Banner"
                        aspectRatio={1.5 / 1}
                      />
                    </div>
                  </div>

                  {/* Live Mini Preview with Desktop / Mobile Toggle & Artwork Rendering */}
                  {(() => {
                    const desktopPreviewSrc = getPreviewSrc(form.desktop_image);
                    const mobilePreviewSrc = getPreviewSrc(form.mobile_image);
                    const activePreviewSrc =
                      previewDevice === 'desktop'
                        ? desktopPreviewSrc || mobilePreviewSrc
                        : mobilePreviewSrc || desktopPreviewSrc;

                    return (
                      <div className="p-4 bg-slate-900 rounded-xl space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                              Live Banner Styling Preview
                            </span>
                            {activePreviewSrc ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Artwork Active
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                Solid Background Mode
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
                            <button
                              type="button"
                              onClick={() => setPreviewDevice('desktop')}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                                previewDevice === 'desktop'
                                  ? 'bg-[#006670] text-white shadow-xs'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Monitor className="w-3.5 h-3.5" />
                              Desktop View
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewDevice('mobile')}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                                previewDevice === 'mobile'
                                  ? 'bg-[#006670] text-white shadow-xs'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Smartphone className="w-3.5 h-3.5" />
                              Mobile View
                            </button>
                          </div>
                        </div>

                        <div
                          className={`rounded-xl relative overflow-hidden transition-all duration-300 shadow-xl border border-white/10 ${
                            previewDevice === 'desktop'
                              ? 'p-6 sm:p-8 min-h-[200px] flex flex-col justify-center'
                              : 'p-6 max-w-sm mx-auto min-h-[240px] flex flex-col justify-between'
                          }`}
                          style={{
                            backgroundColor: form.bg_color || '#005F63',
                            color: form.text_color || '#FFFFFF',
                          }}
                        >
                          {/* Artwork Background / Overlay */}
                          {activePreviewSrc && (
                            <div className="absolute inset-0 z-0 pointer-events-none">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={activePreviewSrc}
                                alt="Live Banner Artwork"
                                className={`w-full h-full object-cover ${
                                  previewDevice === 'desktop' ? 'object-right opacity-60' : 'opacity-40'
                                }`}
                              />
                              <div
                                className="absolute inset-0"
                                style={{
                                  background:
                                    previewDevice === 'desktop'
                                      ? `linear-gradient(to right, ${form.bg_color || '#005F63'} 48%, ${(form.bg_color || '#005F63')}D9 65%, transparent 100%)`
                                      : `linear-gradient(to top, ${form.bg_color || '#005F63'} 70%, transparent 100%)`,
                                }}
                              />
                            </div>
                          )}

                          {/* Content */}
                          <div className="relative z-10 space-y-2.5 max-w-xl">
                            {/* Brand Logo & Badge Tag */}
                            <div className="flex flex-wrap items-center gap-2">
                              {selectedBrandObj?.logo && (
                                <div className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg shadow-xs flex items-center">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={getAbsoluteImageUrl(selectedBrandObj.logo)}
                                    alt={selectedBrandObj.name}
                                    className="h-4 sm:h-5 object-contain"
                                  />
                                </div>
                              )}
                              <span
                                className="px-2.5 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-full bg-white/20 backdrop-blur-md border border-white/20"
                                style={{ color: form.accent_color || '#BFE8E8' }}
                              >
                                {form.promotional_tag || 'EXCLUSIVE BRAND OFFER'}
                              </span>
                            </div>

                            {/* Headline */}
                            <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                              {form.title || 'Brand Deal Title Preview'}
                            </h3>

                            {/* Subtitle */}
                            <p className="text-xs opacity-85 leading-relaxed font-medium line-clamp-2">
                              {form.subtitle || 'Supporting promotional text goes here.'}
                            </p>

                            {/* CTA & Warranty */}
                            <div className="pt-1 flex flex-wrap items-center gap-3">
                              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-slate-900 text-xs font-bold shadow-md hover:bg-slate-100 transition">
                                <span>{form.cta_text || 'Shop the Offer →'}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </div>

                              <div className="flex items-center gap-1.5 text-[11px] opacity-90 font-semibold">
                                <ShieldCheck className="w-3.5 h-3.5" style={{ color: form.accent_color || '#BFE8E8' }} />
                                <span>Official Warranty</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ──────────────── STEP 4: VISIBILITY & SCHEDULE ──────────────── */}
              {activeStep === 4 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Start Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={form.start_datetime}
                        onChange={(e) => setForm({ ...form, start_datetime: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006670]"
                      />
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Leave blank to start immediately upon activation.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        End Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={form.end_datetime}
                        onChange={(e) => setForm({ ...form, end_datetime: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006670]"
                      />
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Leave blank for an ongoing offer.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Campaign Status
                      </label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006670]"
                      >
                        <option value="active">Active (Live when in schedule)</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="draft">Draft (Hidden)</option>
                        <option value="paused">Paused</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>

                    <div className="space-y-3 pt-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.is_active}
                          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                          className="w-4 h-4 rounded text-[#006670] focus:ring-[#006670]"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            Master Campaign Active
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Overall switch to enable/disable deal pricing and landing page.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.show_on_homepage}
                          onChange={(e) =>
                            setForm({ ...form, show_on_homepage: e.target.checked })
                          }
                          className="w-4 h-4 rounded text-[#006670] focus:ring-[#006670]"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            Display Banner on Homepage Carousel
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Shows promo banner in the Brand Deals section below &quot;Why Choose FAAZO&quot;.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-800 space-y-1">
                      <div className="font-bold">Campaign Readiness Summary</div>
                      <div>• Brand: {selectedBrandObj?.name || 'Not selected'}</div>
                      <div>• Products: {form.is_all_brand_products ? 'All Brand Products' : `${draftProducts.length} Selected`}</div>
                      <div>• Landing Page: /brand-deals/{form.slug || '...'}</div>
                      <div>• Homepage Placement: {form.show_on_homepage ? 'Enabled' : 'Disabled'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (activeStep > 1) setActiveStep((prev) => (prev - 1) as any);
                  else setShowModal(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                {activeStep > 1 ? '← Previous' : 'Cancel'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveCampaign}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : activeStep === 4 ? 'Save & Publish Campaign' : 'Save Campaign'}
                </button>

                {activeStep < 4 && (
                  <button
                    type="button"
                    onClick={() => setActiveStep((prev) => (prev + 1) as any)}
                    className="flex items-center gap-1.5 px-5 py-2 bg-[#006670] hover:bg-[#004d55] text-white text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Next Step →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Brand Deal Campaign?"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All associated campaign product prices will be removed.`}
        confirmLabel="Delete Campaign"
        variant="danger"
        loading={saving}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default BrandDealsManager;
