import React, { useState, useEffect, useRef } from 'react';
import { 
  Percent, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Clock, 
  Tag, 
  Building2, 
  AlertCircle,
  Eye,
  Check,
  X,
  Package,
  ChevronDown,
  Image as LucideImage,
  Upload,
  LayoutTemplate,
  Save,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { api, getAbsoluteImageUrl } from '@/lib/api';

export interface AdminOfferItem {
  id: string;
  product?: string | null;
  productSlug?: string | null;
  productName?: string | null;
  productSku?: string | null;
  stockQuantity?: number | null;
  title: string;
  badge: string;
  category: string;
  brand: string;
  offerType: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  savingsText: string;
  validityText: string;
  /** ISO date string YYYY-MM-DD — blank string means no date set */
  startDate: string;
  /** ISO date string YYYY-MM-DD — blank string means no date set */
  endDate: string;
  image: string;
  isActive: boolean;
  isFeatured?: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
  slug?: string;
}

interface BrandOption {
  id: string;
  name: string;
  slug?: string;
}

interface ProductOption {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand_name?: string;
  category_name?: string;
  short_description?: string;
  primary_image?: string;
  pricing?: {
    mrp?: number | string;
    selling_price?: number | string;
  };
  inventory?: {
    stock_available?: number;
  };
}

const BADGE_OPTIONS = [
  'Limited Time',
  'Bundle Offer',
  'Exclusive',
  'Best Value',
  'Buy More Save More',
  'Flash Sale',
  'Clearance',
  'Seasonal'
];

const SpecialOffersAdmin: React.FC = () => {
  const toast = useToast();
  const [offers, setOffers] = useState<AdminOfferItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Page-Level CMS Content (Top Hero Area)
  const [heroBadge, setHeroBadge] = useState('PROFESSIONAL CLINICAL SAVINGS');
  const [heroTitle, setHeroTitle] = useState('Special Offers');
  const [heroDescription, setHeroDescription] = useState('Discover exclusive deals, bundle offers and limited-time savings on premium certified dental equipment, imaging systems, and clinical consumables.');
  const [heroCtaText, setHeroCtaText] = useState('EXPLORE OFFERS');
  const [heroTrustText, setHeroTrustText] = useState('✓ 100% Genuine Direct Import • Manufacturer Warranty');
  const [loadingPageContent, setLoadingPageContent] = useState(true);
  const [savingPageContent, setSavingPageContent] = useState(false);
  const [pageContentSavedSuccess, setPageContentSavedSuccess] = useState(false);

  // Dynamic Categories, Brands, and Products from Database
  const [categoriesList, setCategoriesList] = useState<CategoryOption[]>([]);
  const [brandsList, setBrandsList] = useState<BrandOption[]>([]);
  const [productsList, setProductsList] = useState<ProductOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const fetchPageContent = async () => {
    try {
      setLoadingPageContent(true);
      const res = await api.get('homepage/offers-page-content/');
      const data = res.data?.data ?? res.data;
      if (data) {
        if (data.hero_badge !== undefined) setHeroBadge(data.hero_badge);
        if (data.hero_title !== undefined) setHeroTitle(data.hero_title);
        if (data.hero_description !== undefined) setHeroDescription(data.hero_description);
        if (data.hero_cta_text !== undefined) setHeroCtaText(data.hero_cta_text);
        if (data.hero_trust_text !== undefined) setHeroTrustText(data.hero_trust_text);
      }
    } catch (err) {
      console.error('Failed to load special offers page content:', err);
    } finally {
      setLoadingPageContent(false);
    }
  };

  const handleSavePageContent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSavingPageContent(true);
      setPageContentSavedSuccess(false);
      await api.patch('homepage/offers-page-content/', {
        hero_badge: heroBadge,
        hero_title: heroTitle,
        hero_description: heroDescription,
        hero_cta_text: heroCtaText,
        hero_trust_text: heroTrustText,
      });
      toast.addToast('Special Offers page content updated successfully!', 'success');
      setPageContentSavedSuccess(true);
      setTimeout(() => setPageContentSavedSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to update page content:', err);
      const msg = err?.response?.data?.error?.message || err?.message || 'Error updating page content';
      toast.addToast(`Failed to update page content: ${msg}`, 'danger');
    } finally {
      setSavingPageContent(false);
    }
  };

  const fetchAdminOffers = async () => {
    try {
      setLoading(true);
      const res = await api.get('homepage/offers/');
      const rawData = res.data?.data ?? res.data?.results ?? res.data ?? [];
      if (Array.isArray(rawData)) {
        const mapped: AdminOfferItem[] = rawData.map((item: any) => {
          const orig = parseFloat(item.original_price ?? '0') || 0;
          const disc = parseFloat(item.discounted_price ?? '0') || 0;
          const diff = Math.max(0, orig - disc);
          const pct = orig > 0 ? Math.round((diff / orig) * 100) : 0;
          const savings = orig > disc ? `Save ₹${diff.toLocaleString('en-IN')} (${pct}% OFF)` : '';

          // Parse start_date / end_date — backend returns ISO datetime or null
          const parseDate = (raw: any): string => {
            if (!raw) return '';
            // Slice to YYYY-MM-DD for the HTML date input
            return String(raw).slice(0, 10);
          };

          return {
            id: String(item.id),
            product: item.product || null,
            productSlug: item.product_slug || null,
            productName: item.product_name || null,
            productSku: item.product_sku || null,
            stockQuantity: item.stock_quantity ?? null,
            title: item.heading || item.title || '',
            badge: item.badge || 'Limited Time',
            category: item.category || '',
            brand: item.brand || '',
            offerType: item.badge || 'Limited Time',
            description: item.description || '',
            originalPrice: orig,
            discountedPrice: disc,
            savingsText: item.savings_text || savings,
            validityText: item.validity_text || '',
            startDate: parseDate(item.start_date),
            endDate: parseDate(item.end_date),
            image: item.image_url || item.banner_image || item.image || '',
            isActive: Boolean(item.is_active),
            isFeatured: Boolean(item.is_featured),
          };
        });
        setOffers(mapped);
      }
    } catch (err) {
      console.error('Failed to load offers from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealTaxonomyAndProducts = async () => {
    // 1. Fetch real Categories
    try {
      setLoadingCategories(true);
      const res = await api.get('categories/dropdown/');
      const cats = res.data?.data ?? res.data?.results ?? res.data ?? [];
      if (Array.isArray(cats) && cats.length > 0) {
        setCategoriesList(cats.map((c: any) => ({ id: String(c.id), name: c.name, slug: c.slug })));
      } else {
        const fallbackRes = await api.get('categories/');
        const fallbackCats = fallbackRes.data?.data ?? fallbackRes.data?.results ?? fallbackRes.data ?? [];
        if (Array.isArray(fallbackCats)) {
          setCategoriesList(fallbackCats.map((c: any) => ({ id: String(c.id), name: c.name, slug: c.slug })));
        }
      }
    } catch (err) {
      console.error('Failed to load real categories:', err);
    } finally {
      setLoadingCategories(false);
    }

    // 2. Fetch real Brands
    try {
      setLoadingBrands(true);
      const res = await api.get('brands/dropdown/');
      const brands = res.data?.data ?? res.data?.results ?? res.data ?? [];
      if (Array.isArray(brands) && brands.length > 0) {
        setBrandsList(brands.map((b: any) => ({ id: String(b.id), name: b.name, slug: b.slug })));
      } else {
        const fallbackRes = await api.get('brands/');
        const fallbackBrands = fallbackRes.data?.data ?? fallbackRes.data?.results ?? fallbackRes.data ?? [];
        if (Array.isArray(fallbackBrands)) {
          setBrandsList(fallbackBrands.map((b: any) => ({ id: String(b.id), name: b.name, slug: b.slug })));
        }
      }
    } catch (err) {
      console.error('Failed to load real brands:', err);
    } finally {
      setLoadingBrands(false);
    }

    // 3. Fetch real Products
    try {
      setLoadingProducts(true);
      const res = await api.get('products/?status=active');
      const prods = res.data?.data ?? res.data?.results ?? res.data ?? [];
      if (Array.isArray(prods)) {
        setProductsList(prods.map((p: any) => ({
          id: String(p.id),
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          brand_name: p.brand_name,
          category_name: p.category_name,
          short_description: p.short_description,
          primary_image: p.primary_image ? getAbsoluteImageUrl(p.primary_image) : (p.images && p.images[0]?.image ? getAbsoluteImageUrl(p.images[0].image) : ''),
          pricing: p.pricing,
          inventory: p.inventory,
        })));
      }
    } catch (err) {
      console.error('Failed to load real products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchPageContent();
    fetchAdminOffers();
    fetchRealTaxonomyAndProducts();
  }, []);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBadge, setFilterBadge] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<AdminOfferItem | null>(null);

  // Searchable Product Dropdown State
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Form Fields (Clean initial state without dummy data)
  const [formProductId, setFormProductId] = useState<string>('');
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formBadge, setFormBadge] = useState('Limited Time');
  const [formDescription, setFormDescription] = useState('');
  const [formOriginalPrice, setFormOriginalPrice] = useState<number>(0);
  const [formDiscountedPrice, setFormDiscountedPrice] = useState<number>(0);
  const [formValidityText, setFormValidityText] = useState('');
  /** YYYY-MM-DD or '' — maps to LimitedTimeOffer.start_date → ProductPricing.offer_start_date */
  const [formStartDate, setFormStartDate] = useState('');
  /** YYYY-MM-DD or '' — maps to LimitedTimeOffer.end_date → ProductPricing.offer_end_date */
  const [formEndDate, setFormEndDate] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCustomImageUrl, setShowCustomImageUrl] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsFeatured, setFormIsFeatured] = useState(false);

  const openCreateModal = () => {
    setEditingOffer(null);
    setFormProductId('');
    setProductSearchQuery('');
    setIsProductDropdownOpen(false);
    setShowCustomImageUrl(false);
    setFormImageFile(null);
    setFormTitle('');
    setFormCategory(categoriesList.length > 0 ? categoriesList[0].name : '');
    setFormBrand(brandsList.length > 0 ? brandsList[0].name : '');
    setFormBadge('Limited Time');
    setFormDescription('');
    setFormOriginalPrice(0);
    setFormDiscountedPrice(0);
    setFormValidityText('');
    setFormStartDate('');
    setFormEndDate('');
    setFormImage('');
    setFormIsActive(true);
    setFormIsFeatured(false);
    setIsModalOpen(true);
  };

  const openEditModal = (offer: AdminOfferItem) => {
    setEditingOffer(offer);
    setFormProductId(offer.product || '');
    setProductSearchQuery('');
    setIsProductDropdownOpen(false);
    setShowCustomImageUrl(false);
    setFormImageFile(null);
    setFormTitle(offer.title);
    setFormCategory(offer.category);
    setFormBrand(offer.brand);
    setFormBadge(offer.badge);
    setFormDescription(offer.description);
    setFormOriginalPrice(offer.originalPrice);
    setFormDiscountedPrice(offer.discountedPrice);
    setFormValidityText(offer.validityText);
    setFormStartDate(offer.startDate || '');
    setFormEndDate(offer.endDate || '');
    setFormImage(offer.image);
    setFormIsActive(offer.isActive);
    setFormIsFeatured(offer.isFeatured || false);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setFormImage(objectUrl);
    }
  };

  const handleProductSelect = (productId: string) => {
    setFormProductId(productId);
    if (!productId) return;

    const selectedProduct = productsList.find(p => p.id === productId);
    if (selectedProduct) {
      setFormTitle(selectedProduct.name);
      if (selectedProduct.category_name) {
        setFormCategory(selectedProduct.category_name);
      }
      if (selectedProduct.brand_name) {
        setFormBrand(selectedProduct.brand_name);
      }
      const mrp = parseFloat(String(selectedProduct.pricing?.mrp || selectedProduct.pricing?.selling_price || '0')) || 0;
      if (mrp > 0) {
        setFormOriginalPrice(mrp);
      }
      if (selectedProduct.primary_image) {
        setFormImageFile(null);
        setFormImage(selectedProduct.primary_image);
      }
      if (selectedProduct.short_description) {
        setFormDescription(selectedProduct.short_description);
      }
    }
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.addToast('Please enter an offer title.', 'danger');
      return;
    }

    if (formDiscountedPrice < 0) {
      toast.addToast('Special discounted price cannot be negative.', 'danger');
      return;
    }

    if (formOriginalPrice > 0 && formDiscountedPrice > formOriginalPrice) {
      toast.addToast('Special discounted price cannot exceed original price.', 'danger');
      return;
    }

    // Frontend date validation — backend will also validate
    if (formStartDate && formEndDate && formEndDate < formStartDate) {
      toast.addToast('Offer end date cannot be earlier than the start date.', 'danger');
      return;
    }

    const formData = new FormData();
    if (formProductId) {
      formData.append('product', formProductId);
    }
    formData.append('heading', formTitle);
    formData.append('category', formCategory);
    formData.append('brand', formBrand);
    formData.append('badge', formBadge);
    formData.append('description', formDescription);
    formData.append('original_price', String(formOriginalPrice));
    formData.append('discounted_price', String(formDiscountedPrice));
    formData.append('validity_text', formValidityText);
    formData.append('is_active', String(formIsActive));
    formData.append('is_featured', String(formIsFeatured));

    // Offer validity period — sent as ISO datetime strings (backend accepts DateTimeField)
    // A blank string means "clear the date" (null on the backend)
    if (formStartDate) {
      // Append as start-of-day UTC to satisfy DateTimeField
      formData.append('start_date', `${formStartDate}T00:00:00`);
    } else {
      formData.append('start_date', '');
    }
    if (formEndDate) {
      // Append as end-of-day to include the full end date
      formData.append('end_date', `${formEndDate}T23:59:59`);
    } else {
      formData.append('end_date', '');
    }

    if (formImageFile) {
      formData.append('banner_image', formImageFile);
    } else if (formImage && !formImage.startsWith('blob:')) {
      formData.append('image_url', formImage);
    }

    const config = {
      headers: { 'Content-Type': 'multipart/form-data' }
    };

    try {
      if (editingOffer) {
        await api.patch(`homepage/offers/${editingOffer.id}/`, formData, config);
        toast.addToast(`Updated offer "${formTitle}" successfully!`, 'success');
      } else {
        await api.post('homepage/offers/', formData, config);
        toast.addToast(`Created new limited offer "${formTitle}"!`, 'success');
      }
      await fetchAdminOffers();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save offer:', err);
      const apiErrors = err?.response?.data;
      const errMsg =
        apiErrors?.detail ||
        apiErrors?.message ||
        apiErrors?.discounted_price?.[0] ||
        apiErrors?.start_date?.[0] ||
        apiErrors?.end_date?.[0] ||
        apiErrors?.product?.[0] ||
        err?.message ||
        'Error saving offer';
      toast.addToast(`Failed to save offer: ${errMsg}`, 'danger');
    }
  };

  const handleDirectImageUpload = async (offerId: string, offerTitle: string, file: File) => {
    const formData = new FormData();
    formData.append('banner_image', file);
    try {
      await api.patch(`homepage/offers/${offerId}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.addToast(`Uploaded image for "${offerTitle}"!`, 'success');
      await fetchAdminOffers();
    } catch (err: any) {
      console.error('Failed to upload image:', err);
      toast.addToast('Failed to upload image', 'danger');
    }
  };

  const handleToggleActive = async (id: string) => {
    const target = offers.find(o => o.id === id);
    if (!target) return;
    try {
      await api.patch(`homepage/offers/${id}/`, { is_active: !target.isActive });
      await fetchAdminOffers();
      toast.addToast('Updated offer status', 'info');
    } catch (err: any) {
      console.error('Failed to toggle offer status:', err);
      toast.addToast('Failed to update offer status', 'danger');
    }
  };

  const handleDeleteOffer = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete offer "${title}"?`)) {
      try {
        await api.delete(`homepage/offers/${id}/`);
        await fetchAdminOffers();
        toast.addToast(`Deleted offer "${title}"`, 'warning');
      } catch (err: any) {
        console.error('Failed to delete offer:', err);
        toast.addToast('Failed to delete offer', 'danger');
      }
    }
  };

  // Filtered List
  const filteredOffers = offers.filter(o => {
    if (searchQuery && !o.title.toLowerCase().includes(searchQuery.toLowerCase()) && !o.brand.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterBadge !== 'All' && o.badge !== filterBadge) return false;
    if (filterCategory !== 'All' && o.category !== filterCategory) return false;
    return true;
  });

  const activeCount = offers.filter(o => o.isActive).length;
  const featuredCount = offers.filter(o => o.isFeatured).length;
  const currentFeaturedOffer = offers.find(o => o.isFeatured && o.isActive) || offers.find(o => o.isFeatured) || null;

  return (
    <div className="space-y-6 text-left select-none pb-12 font-sans">
      
      {/* ── HEADER BAR ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-[#006670] font-black text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Catalogue CMS Management</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Limited & Special Offers
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure promotional deals, bundle discounts, and limited-time offers rendered on the Special Offers page.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-3 rounded-xl bg-[#006670] hover:bg-[#004e56] text-white text-xs font-extrabold uppercase tracking-wider transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Offer</span>
        </button>
      </div>

      {/* ── SPECIAL OFFERS PAGE CONTENT (HERO CMS) ───────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100/70 p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#006670] font-black text-xs uppercase tracking-wider mb-1">
              <LayoutTemplate className="w-4 h-4" />
              <span>Customer-Facing Page Content (/offers)</span>
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Special Offers Page Content
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Control the top hero heading, description, badge, CTA, and trust statement displayed on the customer-facing <code className="text-[#006670] font-bold">/offers</code> page.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSavePageContent}
            disabled={savingPageContent || loadingPageContent}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer shrink-0 shadow-md ${
              pageContentSavedSuccess
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-[#006670] hover:bg-[#004e56] text-white'
            }`}
          >
            {savingPageContent ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : pageContentSavedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved to PostgreSQL!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>

        {/* Content Form & Live Preview */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Fields */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                  Hero Badge Text
                </label>
                <input
                  type="text"
                  value={heroBadge}
                  onChange={(e) => setHeroBadge(e.target.value)}
                  placeholder="e.g. PROFESSIONAL CLINICAL SAVINGS"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                  CTA Button Text
                </label>
                <input
                  type="text"
                  value={heroCtaText}
                  onChange={(e) => setHeroCtaText(e.target.value)}
                  placeholder="e.g. EXPLORE OFFERS"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                Main Hero Heading
              </label>
              <input
                type="text"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                placeholder="e.g. Special Offers"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-slate-900 focus:outline-none focus:border-[#006670] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                Hero Description
              </label>
              <textarea
                rows={3}
                value={heroDescription}
                onChange={(e) => setHeroDescription(e.target.value)}
                placeholder="Detailed hero promotional description..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#006670] focus:bg-white transition-all resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                Trust Statement (Under CTA)
              </label>
              <input
                type="text"
                value={heroTrustText}
                onChange={(e) => setHeroTrustText(e.target.value)}
                placeholder="e.g. ✓ 100% Genuine Direct Import • Manufacturer Warranty"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Right Column: Live Visual Hero Preview + Featured Offer Linking Notice */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4.5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#006670]" />
                  <span>Live Hero Preview</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                  /offers
                </span>
              </div>

              {/* Preview Mini Box */}
              <div className="bg-gradient-to-r from-[#D9E3D0] to-[#DAE4D2] p-4 rounded-xl border border-[#6E8154]/20 space-y-2">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#006670]/10 border border-[#006670]/20 text-[#006670] text-[9.5px] font-black uppercase tracking-wider">
                  {heroBadge || 'HERO BADGE'}
                </span>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  {heroTitle || 'Hero Heading'}
                </h3>
                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed font-medium">
                  {heroDescription || 'Hero description text...'}
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <span className="px-3 py-1 bg-[#006670] text-white text-[10px] font-extrabold rounded-full uppercase">
                    {heroCtaText || 'Explore Offers'}
                  </span>
                  <span className="text-[9.5px] text-slate-500 font-bold truncate">
                    {heroTrustText}
                  </span>
                </div>
              </div>

              {/* Featured Offer Link Callout */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Featured Promotion Card</span>
                  </span>
                  {currentFeaturedOffer ? (
                    <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                      Active Featured Offer
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                      None Selected
                    </span>
                  )}
                </div>

                <div className="pt-1 pb-2">
                  <select
                    value={currentFeaturedOffer?.id || ''}
                    onChange={async (e) => {
                      const newId = e.target.value;
                      if (!newId) return;
                      try {
                        await api.patch(`homepage/offers/${newId}/`, { is_featured: true });
                        await fetchAdminOffers();
                        toast.addToast('Updated featured offer', 'success');
                      } catch (err: any) {
                        console.error('Failed to set featured offer:', err);
                        toast.addToast('Failed to update featured offer', 'danger');
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] cursor-pointer"
                  >
                    <option value="" disabled>-- Select an offer to feature --</option>
                    {offers.filter(o => o.isActive).map(offer => (
                      <option key={offer.id} value={offer.id}>
                        {offer.title} (₹{offer.discountedPrice.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                {currentFeaturedOffer ? (
                  <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
                      {currentFeaturedOffer.image ? (
                        <img src={getAbsoluteImageUrl(currentFeaturedOffer.image)} alt={currentFeaturedOffer.title} className="w-full h-full object-contain" />
                      ) : (
                        <Tag className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-bold text-slate-800 truncate">{currentFeaturedOffer.title}</h5>
                      <p className="text-[10px] text-emerald-600 font-bold truncate">
                        ₹{currentFeaturedOffer.discountedPrice.toLocaleString('en-IN')} {currentFeaturedOffer.savingsText && `(${currentFeaturedOffer.savingsText})`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 font-medium leading-normal mt-1">
                    Select an active offer from the dropdown above to display it on the <code className="text-[#006670] font-bold">/offers</code> hero section.
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── METRIC STAT CARDS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Offers</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">{offers.length}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#006670]/10 text-[#006670] flex items-center justify-center">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Promotions</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{activeCount}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Featured Showcase</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{featuredCount}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ────────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search offer title, brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#006670]"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <select
              value={filterBadge}
              onChange={(e) => setFilterBadge(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] cursor-pointer"
            >
              <option value="All">All Badges</option>
              {BADGE_OPTIONS.map(badge => (
                <option key={badge} value={badge}>{badge}</option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] cursor-pointer"
            >
              <option value="All">All Categories</option>
              {categoriesList.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* ── OFFERS MANAGEMENT TABLE ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-4">Offer Details</th>
                <th className="px-5 py-4">Badge / Type</th>
                <th className="px-5 py-4">Category & Brand</th>
                <th className="px-5 py-4">Pricing & Savings</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Loading promotional offers...
                  </td>
                </tr>
              ) : filteredOffers.length > 0 ? (
                filteredOffers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Title & Image */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3.5 min-w-[240px]">
                        <label 
                          className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 p-1 shrink-0 flex items-center justify-center overflow-hidden relative group/thumb cursor-pointer hover:border-[#006670] transition-colors"
                          title="Click to upload / change image"
                        >
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleDirectImageUpload(offer.id, offer.title, file);
                            }}
                          />
                          {offer.image ? (
                            <img src={getAbsoluteImageUrl(offer.image)} alt={offer.title} className="w-full h-full object-contain" />
                          ) : (
                            <Tag className="w-5 h-5 text-slate-400" />
                          )}
                          <div className="absolute inset-0 bg-[#006670]/80 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                            <Upload className="w-4 h-4 text-white" />
                          </div>
                        </label>
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h4 className="font-bold text-slate-800 text-xs line-clamp-1">{offer.title}</h4>
                            {offer.isFeatured && (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">
                                Featured
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 font-medium">
                            {offer.validityText || (offer.productSku ? `SKU: ${offer.productSku}` : 'Active deal')}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Badge */}
                    <td className="px-5 py-4 shrink-0">
                      <span className="px-2.5 py-1 rounded-full bg-[#006670]/10 text-[#006670] text-[10.5px] font-extrabold uppercase tracking-wider">
                        {offer.badge}
                      </span>
                    </td>

                    {/* Category & Brand */}
                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-700 block">{offer.brand || '—'}</span>
                      <span className="text-[11px] text-slate-400 font-medium">{offer.category || '—'}</span>
                    </td>

                    {/* Pricing */}
                    <td className="px-5 py-4">
                      <div className="flex items-baseline gap-2">
                        <span className="font-black text-slate-900 text-sm">₹{offer.discountedPrice.toLocaleString('en-IN')}</span>
                        {offer.originalPrice > offer.discountedPrice && (
                          <span className="text-slate-400 line-through text-[11px]">₹{offer.originalPrice.toLocaleString('en-IN')}</span>
                        )}
                      </div>
                      {offer.savingsText && (
                        <span className="text-[10px] font-bold text-emerald-600 block">{offer.savingsText}</span>
                      )}
                    </td>

                    {/* Status Toggle */}
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggleActive(offer.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                          offer.isActive 
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {offer.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{offer.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <label 
                          className="p-2 rounded-lg bg-slate-100 hover:bg-[#006670] text-slate-600 hover:text-white transition-colors cursor-pointer"
                          title="Upload / Change Image"
                        >
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleDirectImageUpload(offer.id, offer.title, file);
                            }}
                          />
                          <Upload className="w-3.5 h-3.5" />
                        </label>
                        <button
                          onClick={() => openEditModal(offer)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-[#006670] text-slate-600 hover:text-white transition-colors cursor-pointer"
                          title="Edit Offer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteOffer(offer.id, offer.title)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-rose-600 text-slate-600 hover:text-white transition-colors cursor-pointer"
                          title="Delete Offer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No limited offers match your search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE / EDIT OFFER MODAL ────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#006670] font-black text-sm">
                <Percent className="w-4 h-4" />
                <span>{editingOffer ? 'Edit Special Offer' : 'Add New Limited Offer'}</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveOffer} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Product Selector Option with Real-Time Search */}
              <div className="relative" ref={productDropdownRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Catalogue Product (Optional – Auto-fills Details)
                  </label>
                  {formProductId && (
                    <button
                      type="button"
                      onClick={() => handleProductSelect('')}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                    >
                      Clear Product Link
                    </button>
                  )}
                </div>

                {/* Trigger Button */}
                <div
                  onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                  className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isProductDropdownOpen
                      ? 'border-[#006670] ring-2 ring-[#006670]/10 bg-white'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Package className={`w-4 h-4 shrink-0 ${formProductId ? 'text-[#006670]' : 'text-slate-400'}`} />
                    <span className="truncate">
                      {formProductId ? (
                        (() => {
                          const p = productsList.find(item => item.id === formProductId);
                          if (!p) return 'Selected Product';
                          return (
                            <span>
                              <span className="text-slate-900 font-black">{p.name}</span>
                              {p.sku && <span className="text-slate-500 font-mono ml-1.5 font-normal">[{p.sku}]</span>}
                              {p.brand_name && <span className="text-slate-400 font-normal"> — {p.brand_name}</span>}
                              <span className="text-emerald-600 ml-1.5 font-extrabold">
                                | MRP: ₹{Number(p.pricing?.mrp || p.pricing?.selling_price || 0).toLocaleString('en-IN')}
                              </span>
                            </span>
                          );
                        })()
                      ) : (
                        <span className="text-slate-400 font-medium">-- Standalone Promotion (No Direct Product Link) --</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isProductDropdownOpen ? 'rotate-180 text-[#006670]' : ''}`} />
                  </div>
                </div>

                {/* Searchable Dropdown Menu */}
                {isProductDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-100">
                    {/* Search Bar */}
                    <div className="p-2.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search product by name, SKU, brand, or category..."
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
                      />
                      {productSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setProductSearchQuery('')}
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {/* Standalone option */}
                      <button
                        type="button"
                        onClick={() => {
                          handleProductSelect('');
                          setIsProductDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                          !formProductId ? 'bg-[#006670]/5 text-[#006670] font-bold' : 'text-slate-600'
                        }`}
                      >
                        <span className="italic text-slate-500">-- Standalone Promotion (No Direct Product Link) --</span>
                        {!formProductId && <Check className="w-3.5 h-3.5 text-[#006670]" />}
                      </button>

                      {/* Filtered Products */}
                      {(() => {
                        const filteredProds = productsList.filter(p => {
                          if (!productSearchQuery.trim()) return true;
                          const q = productSearchQuery.toLowerCase();
                          return (
                            p.name.toLowerCase().includes(q) ||
                            (p.sku && p.sku.toLowerCase().includes(q)) ||
                            (p.brand_name && p.brand_name.toLowerCase().includes(q)) ||
                            (p.category_name && p.category_name.toLowerCase().includes(q))
                          );
                        });

                        if (loadingProducts) {
                          return (
                            <div className="py-6 text-center text-xs text-slate-400 font-medium">
                              Loading catalogue products...
                            </div>
                          );
                        }

                        if (filteredProds.length === 0) {
                          return (
                            <div className="py-6 text-center text-xs text-slate-400 font-medium">
                              No products found matching &quot;{productSearchQuery}&quot;
                            </div>
                          );
                        }

                        return filteredProds.map((p) => {
                          const isSelected = formProductId === p.id;
                          const mrp = Number(p.pricing?.mrp || p.pricing?.selling_price || 0);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                handleProductSelect(p.id);
                                setIsProductDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between gap-3 hover:bg-slate-50 cursor-pointer ${
                                isSelected ? 'bg-[#006670]/5 text-[#006670] font-bold' : 'text-slate-700'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-bold text-slate-900 truncate">{p.name}</span>
                                  {p.sku && (
                                    <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded text-[10px] font-mono shrink-0">
                                      {p.sku}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap font-normal">
                                  {p.brand_name && <span className="font-medium text-slate-600">{p.brand_name}</span>}
                                  {p.category_name && <span>• {p.category_name}</span>}
                                  {mrp > 0 && (
                                    <span className="font-bold text-emerald-600">
                                      • MRP: ₹{mrp.toLocaleString('en-IN')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-[#006670] shrink-0" />}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Offer Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter offer title..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#006670]"
                />
              </div>

              {/* Live Visual Product Image Preview & File Upload (Positioned Prominently) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Offer / Product Image
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-[#006670] bg-[#006670]/10 hover:bg-[#006670]/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Image File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomImageUrl(!showCustomImageUrl)}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                    >
                      {showCustomImageUrl ? 'Hide URL' : 'Custom URL'}
                    </button>
                  </div>
                </div>

                {/* Visual Image Card */}
                <div 
                  onClick={() => {
                    if (!formImage) fileInputRef.current?.click();
                  }}
                  className={`bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3.5 transition-all ${
                    !formImage ? 'hover:border-[#006670] hover:bg-slate-50/80 cursor-pointer' : ''
                  }`}
                >
                  <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 p-1 shrink-0 flex items-center justify-center overflow-hidden shadow-xs">
                    {formImage ? (
                      <img
                        src={getAbsoluteImageUrl(formImage)}
                        alt="Offer Preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <LucideImage className="w-7 h-7 text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {formImage ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 text-[9.5px] font-black uppercase tracking-wider mb-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {formImageFile ? 'Uploaded File Selected' : 'Active Product Photo'}
                        </span>
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {formImageFile ? formImageFile.name : (formProductId ? (formTitle || 'Catalogue Product Image') : 'Promotional Image')}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate font-mono">
                          {formImageFile ? `${(formImageFile.size / 1024).toFixed(1)} KB` : formImage.replace(/^https?:\/\/[^/]+/, '')}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-[#006670]" /> Click to Upload or Select Product
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Upload any JPG/PNG/WebP file from your computer, or choose a catalogue product above.
                        </p>
                      </div>
                    )}
                  </div>

                  {formImage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="p-2 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Change image"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormImage('');
                          setFormImageFile(null);
                        }}
                        className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Clear image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Collapsible custom URL editor */}
                {showCustomImageUrl && (
                  <div className="mt-2 animate-in fade-in duration-100">
                    <input
                      type="text"
                      placeholder="Enter custom image URL (e.g. https://... or /media/...)"
                      value={formImage.startsWith('blob:') ? '' : formImage}
                      onChange={(e) => {
                        setFormImageFile(null);
                        setFormImage(e.target.value);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#006670]"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] cursor-pointer"
                  >
                    {loadingCategories ? (
                      <option value="">Loading categories...</option>
                    ) : categoriesList.length > 0 ? (
                      categoriesList.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))
                    ) : (
                      <option value="">Select Category</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Brand *
                  </label>
                  <select
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] cursor-pointer"
                  >
                    {loadingBrands ? (
                      <option value="">Loading brands...</option>
                    ) : brandsList.length > 0 ? (
                      brandsList.map((brand) => (
                        <option key={brand.id} value={brand.name}>
                          {brand.name}
                        </option>
                      ))
                    ) : (
                      <option value="">Select Brand</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Offer Badge *
                  </label>
                  <select
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#006670] cursor-pointer"
                  >
                    {BADGE_OPTIONS.map((badge) => (
                      <option key={badge} value={badge}>
                        {badge}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Short Clinical Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe clinical features or promotional inclusions..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#006670]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Original Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formOriginalPrice || ''}
                    placeholder="0"
                    onChange={(e) => setFormOriginalPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Special Discounted Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formDiscountedPrice || ''}
                    placeholder="0"
                    onChange={(e) => setFormDiscountedPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#006670] focus:outline-none focus:border-[#006670]"
                  />
                </div>
              </div>

              {/* ── VALIDITY PERIOD ───────────────────────────────────────────── */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#006670] shrink-0" />
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Validity Period
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-400 -mt-1">
                  Set when the special price becomes active and when it expires.
                  Leave blank for an open-ended promotion.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="offer-start-date"
                      className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1"
                    >
                      Offer Start Date
                    </label>
                    <input
                      id="offer-start-date"
                      type="date"
                      value={formStartDate}
                      max={formEndDate || undefined}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#006670] focus:ring-2 focus:ring-[#006670]/10 cursor-pointer"
                    />
                    {formStartDate && (
                      <button
                        type="button"
                        onClick={() => setFormStartDate('')}
                        className="mt-1 text-[9.5px] font-bold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        Clear start date
                      </button>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="offer-end-date"
                      className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1"
                    >
                      Offer End Date
                    </label>
                    <input
                      id="offer-end-date"
                      type="date"
                      value={formEndDate}
                      min={formStartDate || undefined}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#006670] focus:ring-2 focus:ring-[#006670]/10 cursor-pointer"
                    />
                    {formEndDate && (
                      <button
                        type="button"
                        onClick={() => setFormEndDate('')}
                        className="mt-1 text-[9.5px] font-bold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        Clear end date
                      </button>
                    )}
                  </div>
                </div>

                {/* Live status indicator */}
                {(formStartDate || formEndDate) && (() => {
                  const today = new Date().toISOString().slice(0, 10);
                  const hasStart = Boolean(formStartDate);
                  const hasEnd = Boolean(formEndDate);
                  const notStarted = hasStart && formStartDate > today;
                  const expired = hasEnd && formEndDate < today;
                  const active = (!hasStart || formStartDate <= today) && (!hasEnd || formEndDate >= today);

                  if (formStartDate && formEndDate && formEndDate < formStartDate) {
                    return (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="text-[10.5px] font-bold text-rose-600">End date is before start date — this will be rejected.</span>
                      </div>
                    );
                  }
                  if (notStarted) {
                    return (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-[10.5px] font-bold text-amber-700">Scheduled — special price activates on {new Date(formStartDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.</span>
                      </div>
                    );
                  }
                  if (expired) {
                    return (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg">
                        <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-[10.5px] font-bold text-slate-500">Expired — offer period has passed. Normal price is effective.</span>
                      </div>
                    );
                  }
                  if (active) {
                    return (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-[10.5px] font-bold text-emerald-700">Active — special price is currently effective{hasEnd ? ` until ${new Date(formEndDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}.</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Validity & Stock Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Valid while stock lasts • Limited Units"
                  value={formValidityText}
                  onChange={(e) => setFormValidityText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#006670]"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#006670] focus:ring-[#006670]"
                  />
                  <span className="text-xs font-bold text-slate-700">Active Offer</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-[#006670] focus:ring-[#006670]"
                  />
                  <span className="text-xs font-bold text-amber-700">Set as Featured Promotion</span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-extrabold uppercase hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#006670] hover:bg-[#004e56] text-white text-xs font-extrabold uppercase tracking-wider transition-colors shadow-md cursor-pointer"
                >
                  {editingOffer ? 'Save Changes' : 'Create Offer'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SpecialOffersAdmin;

