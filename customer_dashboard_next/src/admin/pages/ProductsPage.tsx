'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus, Search, Edit2, Trash2, Check, Eye, ArrowLeft,
  Package, Shield, Star, FileText, IndianRupee
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
import type { ColumnDef, Product, ProductImage, ProductAttribute, ProductDocument, ProductPricing, ProductInventory } from '../types/admin';
import { adminService } from '../services/adminService';
import ProductGallery from '../components/ProductGallery';
import SpecsEditor from '../components/SpecsEditor';
import DocumentManager from '../components/DocumentManager';
import AdminModal from '../components/AdminModal';
import { BrandAutocomplete } from '../components/AutocompleteSelectors';
import PricingTab from '../components/PricingTab';
import InventoryTab from '../components/InventoryTab';

const emptyForm = {
  name: '', sku: '', brand: '', category: '',
  short_description: '', long_description: '',
  status: 'draft' as Product['status'],
  is_featured: false,
  warranty_months_override: '' as string | number,
  weight_kg: '' as string | number,
  tags: '',
  desc_overview: '',
  desc_features: [] as string[],
  desc_benefits: [] as string[],
  desc_applications: [] as string[],
  desc_additional: '',
};

const STATUS_VARIANT: Record<Product['status'], 'success' | 'warning' | 'neutral' | 'error'> = {
  active:       'success',
  draft:        'warning',
  archived:     'neutral',
  discontinued: 'error',
};

// ─── Products Page ────────────────────────────────────────────────────────────

const ProductsPage: React.FC = () => {
  useBreadcrumbSync([
    { label: 'Catalogue', path: '/admin/products' },
    { label: 'Products' },
  ]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [products, setProducts]   = useState<Product[]>([]);
  const [cameFromCategories, setCameFromCategories] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Product['status']>('all');
  const [filterBrand, setFilterBrand]   = useState('');

  const [brands, setBrands]       = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [viewMode, setViewMode]     = useState<'list' | 'create' | 'edit'>('list');
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);

  // Tabs and lists
  const [activeTab, setActiveTab] = useState('details');
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productSpecs, setProductSpecs] = useState<ProductAttribute[]>([]);
  const [productDocs, setProductDocs] = useState<ProductDocument[]>([]);

  // Preview state
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  // Bulk actions checkboxes
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Pricing & Inventory state (Phase 6A)
  const [productPricing, setProductPricing]     = useState<ProductPricing | null>(null);
  const [productInventory, setProductInventory] = useState<ProductInventory | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await adminService.getProducts();
      if (res.success && res.data) {
        setProducts(res.data);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  // Load pricing + inventory for the current product in the wizard
  const fetchPricingInventory = async (slug: string) => {
    try {
      const [pRes, iRes] = await Promise.all([
        adminService.getProductPricing(slug),
        adminService.getProductInventory(slug),
      ]);
      if (pRes.success && pRes.data) setProductPricing(pRes.data);
      if (iRes.success && iRes.data) setProductInventory(iRes.data);
    } catch (err) {
      console.error('Failed to load pricing/inventory:', err);
    }
  };

  const fetchRelated = async () => {
    try {
      const [brandRes, catRes] = await Promise.all([
        adminService.getBrandsDropdown(),
        adminService.getCategoriesDropdown()
      ]);
      if (brandRes.success && brandRes.data) {
        setBrands(brandRes.data);
      }
      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
      return {
        brands: brandRes.data || [],
        categories: catRes.data || [],
      };
    } catch (err) {
      console.error('Failed to load dropdown options:', err);
      return { brands: [], categories: [] };
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchRelated();
  }, []);

  // Counts for stat cards
  const counts = {
    total:        products.length,
    active:       products.filter(p => p.status === 'active').length,
    draft:        products.filter(p => p.status === 'draft').length,
    featured:     products.filter(p => p.is_featured).length,
  };

  const filtered = products.filter(p => {
    const matchSearch = !search
      || p.name.toLowerCase().includes(search.toLowerCase())
      || p.sku.toLowerCase().includes(search.toLowerCase())
      || (p.brand_name && p.brand_name.toLowerCase().includes(search.toLowerCase()))
      || (p.category_name && p.category_name.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchBrand  = !filterBrand || p.brand === filterBrand;
    return matchSearch && matchStatus && matchBrand;
  });

  const clearWizardSession = () => {
    localStorage.removeItem('faazo_product_wizard_slug');
    localStorage.removeItem('faazo_product_wizard_active_step');
  };

  const saveStep = async (nextTab?: string) => {
    if (activeTab === 'details') {
      if (!form.name.trim()) { toast.error('Product name is required.'); return false; }
      if (!form.sku.trim()) { toast.error('SKU is required.'); return false; }
      if (!form.brand) { toast.error('Brand is required.'); return false; }
      if (!form.category) { toast.error('Category is required.'); return false; }
      const hasChildren = categories.some(c => String(c.parent) === String(form.category));
      if (hasChildren) {
        toast.error('Please select a subcategory (leaf category) rather than a parent category.');
        return false;
      }
    }

    setSaving(true);
    try {
      const wizardDesc = {
        description: form.desc_overview || '',
        features: form.desc_features || [],
        benefits: form.desc_benefits || [],
        applications: form.desc_applications || [],
        additional_content: form.desc_additional || '',
      };

      const formattedForm = {
        ...form,
        long_description: JSON.stringify(wizardDesc),
        warranty_months_override: form.warranty_months_override === '' ? null : Number(form.warranty_months_override),
        weight_kg: form.weight_kg === '' ? null : Number(form.weight_kg),
        tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };

      if (editProduct) {
        const res = await adminService.updateProduct(editProduct.slug, formattedForm);
        if (res.success) {
          toast.success(activeTab === 'details' ? 'General details saved.' : 'Descriptions saved.');
          if (res.data) {
            setEditProduct(res.data);
            // Save slug and step position in localStorage
            localStorage.setItem('faazo_product_wizard_slug', res.data.slug);
          }
        } else {
          toast.error(res.message || 'Failed to update product details.');
          return false;
        }
      } else {
        const res = await adminService.createProduct(formattedForm);
        if (res.success && res.data) {
          toast.success('Product created.');
          setEditProduct(res.data);
          // Save slug in localStorage
          localStorage.setItem('faazo_product_wizard_slug', res.data.slug);
        } else {
          toast.error(res.message || 'Failed to create product.');
          return false;
        }
      }

      fetchProducts();
      if (nextTab) {
        setActiveTab(nextTab);
        localStorage.setItem('faazo_product_wizard_active_step', nextTab);
      }
      return true;
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to save product details.';
      toast.error(errorMsg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleStepClick = (stepId: string) => {
    if (!editProduct && stepId !== 'details') {
      toast.error('Please save General Details first to unlock other sections.');
      return;
    }
    setActiveTab(stepId);
    localStorage.setItem('faazo_product_wizard_active_step', stepId);
  };

  const handleExitWizard = () => {
    clearWizardSession();
    if (cameFromCategories) {
      router.push('/admin/categories');
    } else {
      setViewMode('list');
    }
  };

  // Restore wizard state on load, or intercept category pre-selection from Categories tree page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get('category');

    if (catParam) {
      setCameFromCategories(true);
      clearWizardSession();
      setEditProduct(null);
      setForm({
        ...emptyForm,
        category: catParam,
      });
      setProductImages([]);
      setProductSpecs([]);
      setProductDocs([]);
      setActiveTab('details');
      setViewMode('create');

      // Clear search query param so refresh doesn't reset form state again
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      return;
    }

    const savedSlug = localStorage.getItem('faazo_product_wizard_slug');
    const savedStep = localStorage.getItem('faazo_product_wizard_active_step');
    if (savedSlug && savedStep) {
      const loadWizardProduct = async () => {
        try {
          const res = await adminService.getProduct(savedSlug);
          if (res.success && res.data) {
            let descObj = { description: '', features: [] as string[], benefits: [] as string[], applications: [] as string[], additional_content: '' };
            try {
              if (res.data.long_description && res.data.long_description.startsWith('{')) {
                descObj = JSON.parse(res.data.long_description);
              } else {
                descObj.description = res.data.long_description || '';
              }
            } catch {
              descObj.description = res.data.long_description || '';
            }

            setEditProduct(res.data);
            setForm({
              name: res.data.name, sku: res.data.sku, brand: res.data.brand, category: res.data.category,
              short_description: res.data.short_description || '', long_description: res.data.long_description || '',
              status: res.data.status, is_featured: res.data.is_featured,
              warranty_months_override: res.data.warranty_months_override ?? '',
              weight_kg: res.data.weight_kg ?? '',
              tags: res.data.tags.join(', '),
              desc_overview: descObj.description || '',
              desc_features: descObj.features || [],
              desc_benefits: descObj.benefits || [],
              desc_applications: descObj.applications || [],
              desc_additional: descObj.additional_content || '',
            });
            setProductImages(res.data.images || []);
            setProductSpecs(res.data.attributes || []);
            setProductDocs(res.data.documents || []);
            setActiveTab(savedStep);
            setViewMode('edit');
            toast.info('Restored your previous product creation progress.');
          }
        } catch (err) {
          console.error("Failed to restore wizard state:", err);
          clearWizardSession();
        }
      };
      loadWizardProduct();
    }
  }, []);

  const openCreate = () => {
    clearWizardSession();
    setEditProduct(null);
    setForm(emptyForm);
    setProductImages([]);
    setProductSpecs([]);
    setProductDocs([]);
    setProductPricing(null);
    setProductInventory(null);
    setActiveTab('details');
    setViewMode('create');
  };

  const openEdit = async (p: Product) => {
    clearWizardSession();
    setEditProduct(p);

    // Initial preliminary form layout using list info
    setForm({
      name: p.name, sku: p.sku, brand: p.brand, category: p.category,
      short_description: '', long_description: '',
      status: p.status, is_featured: p.is_featured,
      warranty_months_override: '',
      weight_kg: '',
      tags: '',
      desc_overview: '',
      desc_features: [],
      desc_benefits: [],
      desc_applications: [],
      desc_additional: '',
    });
    setProductImages([]);
    setProductSpecs([]);
    setProductDocs([]);
    setActiveTab('details');
    setViewMode('edit');
    // Save to localStorage for refresh durability
    localStorage.setItem('faazo_product_wizard_slug', p.slug);
    localStorage.setItem('faazo_product_wizard_active_step', 'details');

    try {
      const res = await adminService.getProduct(p.slug);
      if (res.success && res.data) {
        const d = res.data;
        let descObj = { description: '', features: [] as string[], benefits: [] as string[], applications: [] as string[], additional_content: '' };
        try {
          if (d.long_description && d.long_description.startsWith('{')) {
            descObj = JSON.parse(d.long_description);
          } else {
            descObj.description = d.long_description || '';
          }
        } catch {
          descObj.description = d.long_description || '';
        }

        setForm({
          name: d.name, sku: d.sku, brand: d.brand, category: d.category,
          short_description: d.short_description || '', long_description: d.long_description || '',
          status: d.status, is_featured: d.is_featured,
          warranty_months_override: d.warranty_months_override ?? '',
          weight_kg: d.weight_kg ?? '',
          tags: d.tags ? d.tags.join(', ') : '',
          desc_overview: descObj.description || '',
          desc_features: descObj.features || [],
          desc_benefits: descObj.benefits || [],
          desc_applications: descObj.applications || [],
          desc_additional: descObj.additional_content || '',
        });

        setProductImages(d.images || []);
        setProductSpecs(d.attributes || []);
        setProductDocs(d.documents || []);

        // Load pricing + inventory
        await fetchPricingInventory(d.slug);
      }
    } catch (err) {
      console.error("Failed to load product sub-elements:", err);
    }
  };

  useEffect(() => {
    const editSlug = searchParams.get('edit');
    const tabParam = searchParams.get('tab');
    const isNew = searchParams.get('new') === 'true';

    if (isNew) {
      setViewMode('create');
    } else if (editSlug && products.length > 0) {
      const found = products.find(p => p.slug === editSlug);
      if (found) {
        openEdit(found).then(() => {
          if (tabParam) {
            setActiveTab(tabParam);
            localStorage.setItem('faazo_product_wizard_active_step', tabParam);
          }
        });
      }
    }
  }, [searchParams, products]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminService.deleteProduct(deleteTarget.slug);
      toast.success(`"${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      setViewMode('list');
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to delete product.';
      toast.error(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = () => {
    if (!editProduct) return;
    setEditProduct(null);
    setForm(prev => ({
      ...prev,
      name: `${prev.name} (Copy)`,
      sku: `${prev.sku}-COPY`,
      status: 'draft',
    }));
    setProductImages([]);
    setProductSpecs([]);
    setProductDocs([]);
    setActiveTab('details');
    setViewMode('create');
    toast.success("Product cloned as draft. Update details and click Save Product.");
  };

  const handleArchive = async () => {
    if (!editProduct) return;
    setSaving(true);
    try {
      const formattedForm = {
        ...form,
        warranty_months_override: form.warranty_months_override === '' ? null : Number(form.warranty_months_override),
        weight_kg: form.weight_kg === '' ? null : Number(form.weight_kg),
        tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        status: 'archived',
      };
      await adminService.updateProduct(editProduct.slug, formattedForm);
      toast.success('Product archived.');
      setViewMode('list');
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to archive product.');
    } finally {
      setSaving(false);
    }
  };

  // ── Image Gallery API Handlers ──────────────────────────────────────────────

  const handleUploadImage = async (file: File) => {
    if (!editProduct) return;
    const formData = new FormData();
    formData.append('image', file);
    formData.append('sort_order', String(productImages.length + 1));
    formData.append('alt_text', editProduct.name);
    
    const res = await adminService.uploadProductImage(editProduct.slug, formData);
    if (res.success && res.data) {
      setProductImages(prev => [...prev, res.data!]);
      toast.success("Photo added to gallery.");
    }
  };

  const handleDeleteImage = async (imgId: string) => {
    if (!editProduct) return;
    const res = await adminService.deleteProductImage(editProduct.slug, imgId);
    if (res.success) {
      setProductImages(prev => prev.filter(img => img.id !== imgId));
      toast.success("Photo removed.");
    }
  };

  const handleSetPrimaryImage = async (imgId: string) => {
    if (!editProduct) return;
    const res = await adminService.setPrimaryImage(editProduct.slug, imgId);
    if (res.success) {
      setProductImages(prev => prev.map(img => ({
        ...img,
        is_primary: img.id === imgId
      })));
      toast.success("Primary hero image locked.");
    }
  };

  const handleUpdateAltText = async (imgId: string, altText: string) => {
    if (!editProduct) return;
    const res = await adminService.updateProductImage(editProduct.slug, imgId, { alt_text: altText });
    if (res.success && res.data) {
      setProductImages(prev => prev.map(img => img.id === imgId ? res.data! : img));
      toast.success("Alt text saved.");
    }
  };

  const handleReorderImages = async (reorderedList: ProductImage[]) => {
    if (!editProduct) return;
    setProductImages(reorderedList);
    const payload = reorderedList.map(item => ({ id: item.id, sort_order: item.sort_order }));
    await adminService.reorderProductImages(editProduct.slug, payload);
  };

  // ── Technical Specs (Attributes) API Handlers ─────────────────────────────────

  const handleAddSpec = async (spec: Omit<ProductAttribute, 'id'>) => {
    if (!editProduct) return;
    const res = await adminService.addProductAttribute(editProduct.slug, spec);
    if (res.success && res.data) {
      setProductSpecs(prev => [...prev, res.data!]);
      toast.success("Specification added.");
    }
  };

  const handleUpdateSpec = async (id: string, spec: Partial<ProductAttribute>) => {
    if (!editProduct) return;
    const res = await adminService.updateProductAttribute(editProduct.slug, id, spec);
    if (res.success && res.data) {
      setProductSpecs(prev => prev.map(item => item.id === id ? res.data! : item));
      toast.success("Specification saved.");
    }
  };

  const handleDeleteSpec = async (id: string) => {
    if (!editProduct) return;
    const res = await adminService.deleteProductAttribute(editProduct.slug, id);
    if (res.success) {
      setProductSpecs(prev => prev.filter(item => item.id !== id));
      toast.success("Specification removed.");
    }
  };

  const handleReorderSpecs = async (reorderedList: ProductAttribute[]) => {
    if (!editProduct) return;
    setProductSpecs(reorderedList);
    try {
      await Promise.all(
        reorderedList.map(item =>
          adminService.updateProductAttribute(editProduct.slug, item.id, { sort_order: item.sort_order })
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  // ── Product Documents API Handlers ────────────────────────────────────────────

  const handleUploadDoc = async (formData: FormData) => {
    if (!editProduct) return;
    const res = await adminService.uploadProductDocument(editProduct.slug, formData);
    if (res.success && res.data) {
      setProductDocs(prev => [...prev, res.data!]);
      toast.success("Document uploaded successfully.");
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!editProduct) return;
    const res = await adminService.deleteProductDocument(editProduct.slug, docId);
    if (res.success) {
      setProductDocs(prev => prev.filter(doc => doc.id !== docId));
      toast.success("Document deleted.");
    }
  };

  // ── Pricing Handlers (Phase 6A) ───────────────────────────────────────────

  const handleSavePricing = async (data: Partial<ProductPricing>) => {
    if (!editProduct) return;
    const res = await adminService.saveProductPricing(editProduct.slug, data);
    if (res.success && res.data) {
      setProductPricing(res.data);
      toast.success('Pricing saved successfully.');
    } else {
      toast.error(res.message || 'Failed to save pricing.');
    }
  };

  // ── Inventory Handlers (Phase 6A) ─────────────────────────────────────────

  const handleSaveInventory = async (data: Partial<ProductInventory>) => {
    if (!editProduct) return;
    const res = await adminService.saveProductInventory(editProduct.slug, data);
    if (res.success && res.data) {
      setProductInventory(res.data);
      toast.success('Inventory saved successfully.');
    } else {
      toast.error(res.message || 'Failed to save inventory.');
    }
  };

  // ── Bulk Actions Handlers ─────────────────────────────────────────────────────

  const handleBulkAction = async (actionType: 'active' | 'archived' | 'delete') => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      if (actionType === 'delete') {
        await Promise.all(
          selectedIds.map(async (id) => {
            const prod = products.find(p => p.id === id);
            if (prod) await adminService.deleteProduct(prod.slug);
          })
        );
        toast.success(`Deleted ${selectedIds.length} products.`);
      } else {
        await Promise.all(
          selectedIds.map(async (id) => {
            const prod = products.find(p => p.id === id);
            if (prod) await adminService.updateProduct(prod.slug, { status: actionType });
          })
        );
        toast.success(`Updated status of ${selectedIds.length} products.`);
      }
      setSelectedIds([]);
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error("Failed to execute bulk action.");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleOpenPreview = async (p: Product) => {
    try {
      const res = await adminService.getProduct(p.slug);
      if (res.success && res.data) {
        setPreviewProduct(res.data);
      }
    } catch {
      toast.error("Failed to load product details for preview.");
    }
  };

  // ── Table columns ───────────────────────────────────────────────────────────

  const columns: ColumnDef<Product>[] = [
    {
      key: 'checkbox',
      header: '',
      render: (_, p) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(p.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedIds(prev => [...prev, p.id]);
            } else {
              setSelectedIds(prev => prev.filter(id => id !== p.id));
            }
          }}
          className="rounded border-slate-300 text-[#005B63] focus:ring-[#005B63] w-4 h-4 cursor-pointer"
        />
      ),
      width: '40px',
    },
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      render: (_, p) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center p-1 shrink-0">
            {p.primary_image ? (
              <img src={p.primary_image} alt={p.name} className="max-h-full max-w-full object-contain" />
            ) : (
              <Package className="w-4 h-4 text-slate-300" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-sans">
              <p className="font-semibold text-slate-800 text-sm truncate">{p.name}</p>
              {p.is_featured && <Star className="w-3 h-3 text-[#F58220] fill-[#F58220] flex-shrink-0" />}
            </div>
            <p className="text-xs text-slate-400 font-mono">{p.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'brand_name',
      header: 'Brand',
      sortable: true,
      render: (_, p) => (
        <div>
          <p className="text-sm font-medium text-slate-700">{p.brand_name}</p>
          <p className="text-xs text-slate-400">{p.category_name}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, p) => (
        <StatusBadge
          variant={STATUS_VARIANT[p.status] ?? 'neutral'}
          label={p.status ? (p.status.charAt(0).toUpperCase() + p.status.slice(1)) : '—'}
        />
      ),
    },
    {
      key: 'pricing',
      header: 'Price',
      render: (_, p) => {
        const pr = p.pricing;
        if (!pr || (!pr.selling_price && !pr.mrp)) {
          return <span className="text-xs text-slate-300 font-semibold">Not set</span>;
        }
        const sp = parseFloat(pr.effective_price || pr.selling_price || '0');
        const mrp = parseFloat(pr.mrp || '0');
        const disc = pr.discount_percentage;
        return (
          <div>
            <div className="flex items-center gap-1">
              <IndianRupee className="w-3 h-3 text-[#005B63]" />
              <span className="text-sm font-bold text-slate-800">
                {sp.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              {disc && disc > 0 && (
                <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1 py-0.5 rounded font-black">{disc}% OFF</span>
              )}
            </div>
            {mrp > sp && (
              <p className="text-[10px] text-slate-400 line-through font-semibold">
                ₹{mrp.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'inventory',
      header: 'Stock',
      render: (_, p) => {
        const inv = p.inventory;
        if (!inv) {
          return <span className="text-xs text-slate-300 font-semibold">—</span>;
        }
        const STOCK_BADGE: Record<string, { label: string; cls: string }> = {
          in_stock:    { label: 'In Stock',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          low_stock:   { label: 'Low Stock',    cls: 'bg-amber-50 text-amber-700 border-amber-100' },
          out_of_stock:{ label: 'Out of Stock', cls: 'bg-rose-50 text-rose-700 border-rose-100' },
        };
        const cfg = STOCK_BADGE[inv.stock_status] || STOCK_BADGE.out_of_stock;
        return (
          <div>
            <span className={`text-[10px] border px-1.5 py-0.5 rounded font-black ${cfg.cls}`}>{cfg.label}</span>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{inv.current_stock} units</p>
          </div>
        );
      },
    },
    {
      key: 'id',
      header: 'Actions',
      render: (_, p) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleOpenPreview(p)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
            title="Preview Product">
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => openEdit(p)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#005B63] hover:bg-[#005B63]/10 transition-colors cursor-pointer"
            title="Edit product">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setDeleteTarget(p)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Delete product">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];


  // ─── Render ───────────────────────────────────────────────────────────────

  if (viewMode !== 'list') {
    const STEPS = [
      { id: 'details',   label: 'General Details' },
      { id: 'content',   label: 'Description' },
      { id: 'images',    label: 'Image Gallery' },
      { id: 'specs',     label: 'Technical Specs' },
      { id: 'documents', label: 'Documentation' },
      { id: 'pricing',   label: 'Pricing' },
      { id: 'inventory', label: 'Inventory' },
    ];
    const activeIndex = STEPS.findIndex(s => s.id === activeTab);

    return (
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExitWizard}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer shadow-sm"
              title="Back to products list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 leading-tight">
                {viewMode === 'edit' ? 'Edit Product' : 'Add New Product'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {viewMode === 'edit' ? `${editProduct?.name} · SKU: ${form.sku}` : 'Configure default specifications, details, and files.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center shrink-0">
            {viewMode === 'edit' && (
              <>
                <button
                  onClick={handleDuplicate}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                >
                  Duplicate
                </button>
                {form.status !== 'archived' && (
                  <button
                    onClick={handleArchive}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    Archive
                  </button>
                )}
                <button
                  onClick={() => editProduct && setDeleteTarget(editProduct)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm select-none overflow-x-auto no-scrollbar">
          <div className="flex items-center justify-between min-w-[750px] lg:min-w-0 max-w-4xl mx-auto gap-4">
            {STEPS.map((step, idx) => {
              const isCompleted = idx < activeIndex;
              const isActive = idx === activeIndex;
              const isDisabled = !editProduct && idx > 0;

              return (
                <React.Fragment key={step.id}>
                  {/* Step Node */}
                  <div
                    onClick={() => !isDisabled && handleStepClick(step.id)}
                    className={`flex flex-col items-center gap-2 cursor-pointer group shrink-0 ${isDisabled ? 'cursor-not-allowed opacity-55' : ''}`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                        isActive
                          ? 'bg-[#005B63] text-white ring-4 ring-[#005B63]/15'
                          : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider transition-colors text-center max-w-[100px] lg:max-w-none ${
                        isActive
                          ? 'text-[#005B63]'
                          : isCompleted
                          ? 'text-[#10B981]'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {/* Connecting Line */}
                  {idx < STEPS.length - 1 && (
                    <div className="flex-grow h-[2px] bg-slate-100 mx-4 relative -mt-6">
                      <div
                        className={`absolute top-0 bottom-0 left-0 bg-emerald-500 transition-all duration-300 ${
                          idx < activeIndex ? 'w-full' : 'w-0'
                        }`}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Wizard Step Content Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <ProductForm
            form={form}
            setForm={setForm}
            brands={brands}
            categories={categories}
            onRefreshRelated={fetchRelated}
            activeTab={activeTab}
            isEdit={!!editProduct}
            images={productImages}
            onUploadImage={handleUploadImage}
            onDeleteImage={handleDeleteImage}
            onSetPrimaryImage={handleSetPrimaryImage}
            onUpdateAltText={handleUpdateAltText}
            onReorderImages={handleReorderImages}
            specs={productSpecs}
            onAddSpec={handleAddSpec}
            onUpdateSpec={handleUpdateSpec}
            onDeleteSpec={handleDeleteSpec}
            onReorderSpecs={handleReorderSpecs}
            docs={productDocs}
            onUploadDoc={handleUploadDoc}
            onDeleteDoc={handleDeleteDoc}
          />

          {/* Stepper Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-100">
            {activeIndex > 0 ? (
              <button
                type="button"
                onClick={() => handleStepClick(STEPS[activeIndex - 1].id)}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExitWizard}
                className="px-5 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                if (activeIndex === 0) {
                  await saveStep('content');
                } else if (activeIndex === 1) {
                  await saveStep('images');
                } else if (activeIndex === 6) {
                  // Final step: Inventory
                  clearWizardSession();
                  setViewMode('list');
                  toast.success('Product fully configured and saved.');
                } else {
                  handleStepClick(STEPS[activeIndex + 1].id);
                }
              }}
              disabled={saving}
              className="px-6 py-2.5 bg-[#005B63] hover:bg-[#004a51] text-white rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</>
              ) : activeIndex === 6 ? (
                'Finish'
              ) : activeIndex === 4 || activeIndex === 5 ? (
                'Next'
              ) : (
                'Save & Next'
              )}
            </button>
          </div>
        </div>

        {/* Pricing and Inventory tabs rendered OUTSIDE the stepper nav card */}
        {activeTab === 'pricing' && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm mt-0 -mt-2">
            <PricingTab
              isEdit={!!editProduct}
              pricing={productPricing}
              onSave={handleSavePricing}
            />
          </div>
        )}
        {activeTab === 'inventory' && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm mt-0 -mt-2">
            <InventoryTab
              isEdit={!!editProduct}
              inventory={productInventory}
              onSave={handleSaveInventory}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Products"
        subtitle={`${counts.total} products · ${counts.active} active · ${counts.draft} draft`}
        actions={
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#005B63] text-white rounded-xl text-sm font-semibold hover:bg-[#004a51] transition-colors shadow-sm cursor-pointer">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard stat={{ id: 'total', label: 'Total Products', value: counts.total, variant: 'teal',   icon: 'Package' }} />
        <StatCard stat={{ id: 'active', label: 'Active',          value: counts.active,  variant: 'green',  icon: 'CheckCircle' }} />
        <StatCard stat={{ id: 'draft',  label: 'Drafts',          value: counts.draft,   variant: 'orange', icon: 'FileEdit' }} />
        <StatCard stat={{ id: 'feat',   label: 'Featured',        value: counts.featured,variant: 'blue',   icon: 'Star' }} />
      </div>

      {/* Bulk Action Panel */}
      {selectedIds.length > 0 && (
        <div className="bg-[#E6F2F2] border border-[#005B63]/20 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between shadow-sm animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-[#005B63] uppercase tracking-wider">{selectedIds.length} Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('active')}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 bg-white border border-[#005B63]/20 text-[#005B63] rounded-lg text-xs font-bold hover:bg-[#005B63]/5 disabled:opacity-50 transition-all cursor-pointer"
            >
              Activate
            </button>
            <button
              onClick={() => handleBulkAction('archived')}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
            >
              Archive
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 disabled:opacity-50 transition-all cursor-pointer"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, SKU, brand…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 focus:border-[#005B63]" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
          <option value="discontinued">Discontinued</option>
        </select>
        <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 bg-white">
          <option value="">All Brands</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonLoader type="table" rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState preset="no-results" title="No products found"
          description={search ? `No products match "${search}"` : 'Add your first product.'}
          action={
            <button onClick={openCreate} className="px-4 py-2 text-sm font-semibold text-white bg-[#005B63] hover:bg-[#004a50] rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#005B63]/30 cursor-pointer">
              Add Product
            </button>
          } />
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}



      {/* Preview Modal */}
      {previewProduct && (
        <AdminModal
          isOpen={!!previewProduct}
          onClose={() => setPreviewProduct(null)}
          title="Catalogue Product Preview"
          size="lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
            {/* Gallery Preview */}
            <div className="space-y-4">
              <div className="aspect-square bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center p-4">
                {previewProduct.primary_image ? (
                  <img src={previewProduct.primary_image} alt={previewProduct.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <Package className="w-12 h-12 text-slate-300" />
                )}
              </div>
              {previewProduct.images && previewProduct.images.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {previewProduct.images.map((img) => (
                    <div key={img.id} className="aspect-square rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center p-1">
                      <img src={img.image} alt={img.alt_text} className="max-h-full max-w-full object-contain" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Meta details */}
            <div className="space-y-4">
              <div>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black uppercase tracking-wider font-sans">
                  {previewProduct.brand_name}
                </span>
                <h3 className="text-base font-black text-slate-800 mt-1.5">{previewProduct.name}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">SKU: {previewProduct.sku}</p>
              </div>

              <div className="flex gap-2">
                <StatusBadge variant={STATUS_VARIANT[previewProduct.status]} label={previewProduct.status.toUpperCase()} />
                {previewProduct.is_featured && (
                  <span className="bg-amber-50 text-amber-600 border border-amber-100/50 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Featured
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Short Description</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{previewProduct.short_description || "No short description."}</p>
              </div>

              {previewProduct.tags && previewProduct.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {previewProduct.tags.map(t => (
                    <span key={t} className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">#{t}</span>
                  ))}
                </div>
              )}

              {previewProduct.effective_warranty && (
                <div className="pt-2 border-t border-slate-100 text-xs flex items-center gap-1.5 text-slate-600">
                  <Shield className="w-4 h-4 text-[#005B63]" />
                  <span>Warranty: <strong>{previewProduct.effective_warranty} Months</strong></span>
                </div>
              )}
            </div>

            {/* Spec / Technical Table */}
            <div className="col-span-1 md:col-span-2 pt-4 border-t border-slate-100">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Technical Specifications</h4>
              {previewProduct.attributes && previewProduct.attributes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6">
                  {previewProduct.attributes.sort((a,b) => a.sort_order - b.sort_order).map((attr) => (
                    <div key={attr.id} className="flex justify-between border-b border-slate-50 py-1">
                      <span className="text-xs text-slate-400 font-semibold">{attr.name}</span>
                      <span className="text-xs text-slate-700 font-bold">{attr.value} {attr.unit}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No specifications listed.</p>
              )}
            </div>

            {/* Documents Preview */}
            <div className="col-span-1 md:col-span-2 pt-4 border-t border-slate-100">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Downloadable Resources</h4>
              {previewProduct.documents && previewProduct.documents.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {previewProduct.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-2.5">
                      <span className="text-xs text-slate-700 font-bold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#005B63]" /> {doc.title}
                      </span>
                      <a href={doc.file || doc.external_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#005B63] hover:underline">Download</a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No resources attached.</p>
              )}
            </div>
          </div>
        </AdminModal>
      )}

      <ConfirmDialog isOpen={!!deleteTarget} title="Delete Product"
        message={`Delete "${deleteTarget?.name}" (${deleteTarget?.sku})? This action soft-deletes the product — historical orders remain intact.`}
        confirmLabel="Delete" variant="danger" loading={deleting}
        onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </div>
  );
};

// ─── Product Form ─────────────────────────────────────────────────────────────

const ProductForm: React.FC<{
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  brands: any[];
  categories: any[];
  onRefreshRelated: () => Promise<any>;
  activeTab: string;
  isEdit: boolean;
  images: ProductImage[];
  onUploadImage: (file: File) => Promise<void>;
  onDeleteImage: (id: string) => Promise<void>;
  onSetPrimaryImage: (id: string) => Promise<void>;
  onUpdateAltText: (id: string, altText: string) => Promise<void>;
  onReorderImages: (list: ProductImage[]) => Promise<void>;
  specs: ProductAttribute[];
  onAddSpec: (spec: Omit<ProductAttribute, 'id'>) => Promise<void>;
  onUpdateSpec: (id: string, spec: Partial<ProductAttribute>) => Promise<void>;
  onDeleteSpec: (id: string) => Promise<void>;
  onReorderSpecs: (list: ProductAttribute[]) => Promise<void>;
  docs: ProductDocument[];
  onUploadDoc: (data: FormData) => Promise<void>;
  onDeleteDoc: (id: string) => Promise<void>;
}> = ({
  form,
  setForm,
  brands,
  categories,
  onRefreshRelated,
  activeTab,
  isEdit,
  images,
  onUploadImage,
  onDeleteImage,
  onSetPrimaryImage,
  onUpdateAltText,
  onReorderImages,
  specs,
  onAddSpec,
  onUpdateSpec,
  onDeleteSpec,
  onReorderSpecs,
  docs,
  onUploadDoc,
  onDeleteDoc,
}) => {
  const set = (k: keyof typeof emptyForm, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));
  const fieldClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 focus:border-[#005B63] transition-colors bg-white";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";
  const sectionClass = "space-y-4";

  // Local states for dependent dropdowns
  const [rootCatId, setRootCatId] = React.useState('');
  const [subCatId, setSubCatId] = React.useState('');
  const [subSubCatId, setSubSubCatId] = React.useState('');

  // Sync dropdowns when form.category changes (e.g. on load / edit)
  React.useEffect(() => {
    if (!form.category || categories.length === 0) {
      setRootCatId('');
      setSubCatId('');
      setSubSubCatId('');
      return;
    }

    const currentCat = categories.find(c => String(c.id) === String(form.category));
    if (!currentCat) return;

    if (currentCat.depth === 2) {
      setSubSubCatId(currentCat.id);
      setSubCatId(currentCat.parent || '');
      const parentCat = categories.find(c => String(c.id) === String(currentCat.parent));
      setRootCatId(parentCat?.parent || '');
    } else if (currentCat.depth === 1) {
      setSubSubCatId('');
      setSubCatId(currentCat.id);
      setRootCatId(currentCat.parent || '');
    } else if (currentCat.depth === 0) {
      setSubSubCatId('');
      setSubCatId('');
      setRootCatId(currentCat.id);
    }
  }, [form.category, categories]);

  // Root category change handler
  const handleRootChange = (id: string) => {
    setRootCatId(id);
    setSubCatId('');
    setSubSubCatId('');
    
    if (!id) {
      set('category', '');
      return;
    }

    // Check if the selected root category has subcategories
    const hasSubs = categories.some(c => String(c.parent) === String(id));
    if (hasSubs) {
      set('category', '');
    } else {
      set('category', id);
    }
  };

  // Subcategory change handler
  const handleSubChange = (id: string) => {
    setSubCatId(id);
    setSubSubCatId('');

    if (!id) {
      set('category', '');
      return;
    }

    // Check if the selected subcategory has sub-subcategories
    const hasSubSubs = categories.some(c => String(c.parent) === String(id));
    if (hasSubSubs) {
      set('category', '');
    } else {
      set('category', id);
    }
  };

  // Sub-subcategory change handler
  const handleSubSubChange = (id: string) => {
    setSubSubCatId(id);
    if (!id) {
      set('category', '');
    } else {
      set('category', id);
    }
  };

  // Computed: has a leaf category been fully resolved?
  const categoryResolved = !!form.category && !categories.some(c => String(c.parent) === String(form.category));
  const categoryResolvedName = categoryResolved ? categories.find(c => String(c.id) === String(form.category))?.name : null;

  if (activeTab === 'details') {
    return (
      <div className={sectionClass}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Product Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className={fieldClass} placeholder="e.g. NSK Pana-Max 2 Air Turbine" required />
          </div>
          <div>
            <label className={labelClass}>SKU *</label>
            <input value={form.sku} onChange={e => set('sku', e.target.value.toUpperCase())} className={`${fieldClass} font-mono`} placeholder="NSK-PM2-001" required />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Brand *</label>
            <BrandAutocomplete
              value={form.brand}
              onChange={val => set('brand', val)}
              brands={brands}
              onRefreshRelated={onRefreshRelated}
            />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass} style={{marginBottom: 0}}>Category *</label>
                {categoryResolved && (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    {categoryResolvedName}
                  </span>
                )}
                {rootCatId && !categoryResolved && (
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Select deeper ↓
                  </span>
                )}
              </div>
              <select
                value={rootCatId}
                onChange={e => handleRootChange(e.target.value)}
                className={fieldClass}
                required
              >
                <option value="">Select Category...</option>
                {categories.filter(c => !c.parent).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Subcategory</label>
              {(() => {
                const subOptions = rootCatId ? categories.filter(c => String(c.parent) === String(rootCatId)) : [];
                const isDisabled = !rootCatId || subOptions.length === 0;
                const placeholder = !rootCatId 
                  ? "Select Category first..." 
                  : subOptions.length === 0 
                  ? "No subcategories available" 
                  : "Select Subcategory...";
                return (
                  <select
                    value={subCatId}
                    onChange={e => handleSubChange(e.target.value)}
                    className={`${fieldClass} ${isDisabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200/60' : ''}`}
                    disabled={isDisabled}
                    required={!isDisabled}
                  >
                    <option value="">{placeholder}</option>
                    {subOptions.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                );
              })()}
            </div>

            <div>
              <label className={labelClass}>Sub-subcategory</label>
              {(() => {
                const subSubOptions = subCatId ? categories.filter(c => String(c.parent) === String(subCatId)) : [];
                const isDisabled = !subCatId || subSubOptions.length === 0;
                const placeholder = !subCatId 
                  ? "Select Subcategory first..." 
                  : subSubOptions.length === 0 
                  ? "No sub-subcategories available" 
                  : "Select Sub-subcategory...";
                return (
                  <select
                    value={subSubCatId}
                    onChange={e => handleSubSubChange(e.target.value)}
                    className={`${fieldClass} ${isDisabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200/60' : ''}`}
                    disabled={isDisabled}
                    required={!isDisabled}
                  >
                    <option value="">{placeholder}</option>
                    {subSubOptions.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={fieldClass}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="discontinued">Discontinued</option>
            </select>
          </div>
          <div className="flex flex-col justify-end pb-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)} className="w-4 h-4 rounded accent-[#F58220]" />
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1"><Star className="w-3.5 h-3.5 text-[#F58220]" /> Featured Product</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Weight (kg)</label>
            <input type="number" min={0} step={0.001} value={form.weight_kg}
              onChange={e => set('weight_kg', e.target.value)} className={fieldClass} placeholder="0.000" />
          </div>
          <div>
            <label className={labelClass}>Warranty Override (months)</label>
            <input type="number" min={0} value={form.warranty_months_override}
              onChange={e => set('warranty_months_override', e.target.value)} className={fieldClass}
              placeholder="Blank = use brand default" />
          </div>
        </div>

        {!form.warranty_months_override && (
          <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
            <Shield className="w-4 h-4 text-slate-400" /> Warranty duration will resolve to the selected brand's default.
          </p>
        )}
      </div>
    );
  }



  if (activeTab === 'content') {
    return (
      <div className={sectionClass}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Short Description</label>
              <span className="text-[10px] text-slate-400 font-bold">{(form.short_description || '').length} / 500</span>
            </div>
            <textarea rows={3} maxLength={500} value={form.short_description} onChange={e => set('short_description', e.target.value)} className={fieldClass} placeholder="Brief details shown on product cards. Max 500 chars." />
          </div>
          <div>
            <label className={labelClass}>Tags <span className="normal-case text-slate-400 font-normal">(comma separated)</span></label>
            <textarea rows={3} value={form.tags} onChange={e => set('tags', e.target.value)} className={fieldClass} placeholder="e.g. turbine, surgical, handpiece" />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <label className={labelClass}>Full Product Description (Rich Text/HTML compatible)</label>
          <textarea rows={6} value={form.desc_overview} onChange={e => set('desc_overview', e.target.value)} className={fieldClass} placeholder="Enter full details, clinical features, and general info..." />
        </div>

        {/* Dynamic Bullet Lists for Features, Benefits, Applications */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 pt-4">
          {/* Features */}
          <div className="space-y-2">
            <label className={labelClass}>Features</label>
            <div className="flex gap-2">
              <input
                id="new_feature_input"
                type="text"
                placeholder="Add highlight bullet..."
                className={fieldClass}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.currentTarget.value.trim();
                    if (val) {
                      set('desc_features', [...(form.desc_features || []), val]);
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('new_feature_input') as HTMLInputElement;
                  const val = el?.value?.trim();
                  if (val) {
                    set('desc_features', [...(form.desc_features || []), val]);
                    el.value = '';
                  }
                }}
                className="px-3 bg-[#005B63] hover:bg-[#004a51] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Add
              </button>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {(form.desc_features || []).map((feat, idx) => (
                <div key={idx} className="flex items-start justify-between bg-slate-50 border border-slate-100 rounded-xl p-2 text-xs text-slate-700 font-semibold gap-2">
                  <span className="break-all">{feat}</span>
                  <button
                    type="button"
                    onClick={() => set('desc_features', form.desc_features.filter((_, i) => i !== idx))}
                    className="text-rose-500 hover:text-rose-600 font-bold shrink-0 cursor-pointer text-[10px]"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <label className={labelClass}>Benefits</label>
            <div className="flex gap-2">
              <input
                id="new_benefit_input"
                type="text"
                placeholder="Add benefit bullet..."
                className={fieldClass}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.currentTarget.value.trim();
                    if (val) {
                      set('desc_benefits', [...(form.desc_benefits || []), val]);
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('new_benefit_input') as HTMLInputElement;
                  const val = el?.value?.trim();
                  if (val) {
                    set('desc_benefits', [...(form.desc_benefits || []), val]);
                    el.value = '';
                  }
                }}
                className="px-3 bg-[#005B63] hover:bg-[#004a51] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Add
              </button>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {(form.desc_benefits || []).map((ben, idx) => (
                <div key={idx} className="flex items-start justify-between bg-slate-50 border border-slate-100 rounded-xl p-2 text-xs text-slate-700 font-semibold gap-2">
                  <span className="break-all">{ben}</span>
                  <button
                    type="button"
                    onClick={() => set('desc_benefits', form.desc_benefits.filter((_, i) => i !== idx))}
                    className="text-rose-500 hover:text-rose-600 font-bold shrink-0 cursor-pointer text-[10px]"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Applications */}
          <div className="space-y-2">
            <label className={labelClass}>Applications</label>
            <div className="flex gap-2">
              <input
                id="new_app_input"
                type="text"
                placeholder="Add application bullet..."
                className={fieldClass}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.currentTarget.value.trim();
                    if (val) {
                      set('desc_applications', [...(form.desc_applications || []), val]);
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('new_app_input') as HTMLInputElement;
                  const val = el?.value?.trim();
                  if (val) {
                    set('desc_applications', [...(form.desc_applications || []), val]);
                    el.value = '';
                  }
                }}
                className="px-3 bg-[#005B63] hover:bg-[#004a51] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Add
              </button>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {(form.desc_applications || []).map((app, idx) => (
                <div key={idx} className="flex items-start justify-between bg-slate-50 border border-slate-100 rounded-xl p-2 text-xs text-slate-700 font-semibold gap-2">
                  <span className="break-all">{app}</span>
                  <button
                    type="button"
                    onClick={() => set('desc_applications', form.desc_applications.filter((_, i) => i !== idx))}
                    className="text-rose-500 hover:text-rose-600 font-bold shrink-0 cursor-pointer text-[10px]"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 font-sans">
          <label className={labelClass}>Additional Content (optional)</label>
          <textarea rows={3} value={form.desc_additional} onChange={e => set('desc_additional', e.target.value)} className={fieldClass} placeholder="Warranty overrides terms, safety notes, certification notes..." />
        </div>
      </div>
    );
  }

  if (activeTab === 'images') {
    if (!isEdit) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
          <div className="w-12 h-12 rounded-full bg-[#005B63]/10 flex items-center justify-center text-[#005B63] mb-4">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800">Media gallery is locked</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
            Please save the product details first. Once the product is created, you will be able to upload, reorder, and tag the images gallery.
          </p>
        </div>
      );
    }
    return (
      <ProductGallery
        images={images}
        onUpload={onUploadImage}
        onDelete={onDeleteImage}
        onSetPrimary={onSetPrimaryImage}
        onUpdateAltText={onUpdateAltText}
        onReorder={onReorderImages}
      />
    );
  }

  if (activeTab === 'specs') {
    if (!isEdit) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
          <div className="w-12 h-12 rounded-full bg-[#005B63]/10 flex items-center justify-center text-[#005B63] mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800">Technical specifications are locked</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
            Please save the product details first. Once the product is created, you will be able to define, edit, and sort technical attribute specifications.
          </p>
        </div>
      );
    }
    return (
      <SpecsEditor
        specs={specs}
        onAdd={onAddSpec}
        onUpdate={onUpdateSpec}
        onDelete={onDeleteSpec}
        onReorder={onReorderSpecs}
      />
    );
  }

  if (activeTab === 'documents') {
    if (!isEdit) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
          <div className="w-12 h-12 rounded-full bg-[#005B63]/10 flex items-center justify-center text-[#005B63] mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800">Documents & manuals are locked</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
            Please save the product details first. Once the product is created, you will be able to attach manuals, safety instructions, and catalogs.
          </p>
        </div>
      );
    }
    return (
      <DocumentManager
        documents={docs}
        entityType="product"
        onUpload={onUploadDoc}
        onDelete={onDeleteDoc}
      />
    );
  }

  return null;
};

export default ProductsPage;
