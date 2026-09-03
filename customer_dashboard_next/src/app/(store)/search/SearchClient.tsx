'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Filter,
  ChevronDown,
  Star,
  X,
  SlidersHorizontal,
  Search as SearchIcon,
  Heart,
  ChevronLeft,
  ChevronRight,
  Package,
  ShoppingBag,
  ShoppingCart,
  Zap,
  LayoutGrid,
  List,
  Check,
  Tag,
  RotateCcw,
  Sparkles,
  Percent,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useGuestGuard } from '@/hooks/useGuestGuard';
import { api, getAbsoluteImageUrl } from '@/lib/api';

interface SearchClientProps {
  initialQuery?: string;
  initialBrand?: string;
  initialCategory?: string;
  initialMinPrice?: string;
  initialMaxPrice?: string;
  initialInStock?: string;
  initialOrdering?: string;
  initialPage?: string;
}

export default function SearchClient({
  initialQuery = '',
  initialBrand = '',
  initialCategory = '',
  initialMinPrice = '',
  initialMaxPrice = '',
  initialInStock = '',
  initialOrdering = 'relevance',
  initialPage = '1',
}: SearchClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useStore();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { guardAction } = useGuestGuard(store.openLoginModal, store.showToast);

  // Read current filter state from URL searchParams (reactive to back/forward navigation)
  const q = searchParams.get('q') ?? initialQuery;
  const selectedBrand = searchParams.get('brand') ?? initialBrand;
  const selectedCategory = searchParams.get('category') ?? initialCategory;
  const minPrice = searchParams.get('min_price') ?? initialMinPrice;
  const maxPrice = searchParams.get('max_price') ?? initialMaxPrice;
  const inStockOnly = searchParams.get('in_stock') === 'true' || initialInStock === 'true';
  const ordering = searchParams.get('ordering') ?? initialOrdering;
  const page = parseInt(searchParams.get('page') ?? initialPage, 10) || 1;

  // Layout View Mode state (grid vs list)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ count: 0, total_pages: 1, page: 1, page_size: 20 });
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Local price input state (debounced sync to URL)
  const [inputMinPrice, setInputMinPrice] = useState(minPrice);
  const [inputMaxPrice, setInputMaxPrice] = useState(maxPrice);

  useEffect(() => {
    setInputMinPrice(minPrice);
    setInputMaxPrice(maxPrice);
  }, [minPrice, maxPrice]);

  // Load Categories & Brands filter lists once
  useEffect(() => {
    Promise.all([
      api.get('categories/?page_size=200').catch(() => ({ data: { data: [] } })),
      api.get('brands/?page_size=100').catch(() => ({ data: { data: [] } }))
    ]).then(([catRes, brandRes]) => {
      const catList = catRes.data?.data ?? (Array.isArray(catRes.data) ? catRes.data : []);
      const brandList = brandRes.data?.data ?? (Array.isArray(brandRes.data) ? brandRes.data : []);
      setCategories(catList);
      setBrands(brandList);
    });
  }, []);

  // Fetch search results whenever URL parameters change
  useEffect(() => {
    setIsLoading(true);
    const params: Record<string, any> = {
      page,
      page_size: 20,
    };
    if (q) params.q = q;
    if (selectedBrand) params.brand = selectedBrand;
    if (selectedCategory) params.category = selectedCategory;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    if (inStockOnly) params.in_stock = 'true';
    if (ordering) params.ordering = ordering;

    api.get('products/', { params })
      .then((res) => {
        const prodData = res.data?.data ?? [];
        const metaData = res.data?.meta ?? { count: prodData.length, total_pages: 1, page: 1, page_size: 20 };
        setProducts(prodData);
        setMeta(metaData);
      })
      .catch(() => {
        setProducts([]);
        setMeta({ count: 0, total_pages: 1, page: 1, page_size: 20 });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [q, selectedBrand, selectedCategory, minPrice, maxPrice, inStockOnly, ordering, page]);

  // Helper to update URL query params cleanly
  const updateUrl = (updates: Record<string, string | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '') {
        current.delete(key);
      } else {
        current.set(key, val);
      }
    });

    // Reset to page 1 unless page itself was explicitly set
    if (!('page' in updates)) {
      current.delete('page');
    }

    const search = current.toString();
    const queryStr = search ? `?${search}` : '';
    router.push(`/search${queryStr}`);
  };

  const handleClearAll = () => {
    router.push('/search' + (q ? `?q=${encodeURIComponent(q)}` : ''));
  };

  const handleAddToCart = (e: React.MouseEvent, p: any) => {
    e.stopPropagation();
    const rawImg = p.primary_image || (p.images && p.images[0]?.image);
    const item = {
      id: p.slug || p.id,
      name: p.name,
      category: p.category_name || 'Product',
      price: p.pricing ? parseFloat(p.pricing.effective_price || p.pricing.selling_price || '0') : 0,
      qty: 1,
      image: getAbsoluteImageUrl(rawImg) || '/images/nsk_handpiece_portrait.png',
      originalPrice: p.pricing ? parseFloat(p.pricing.mrp || '0') : undefined,
    };

    if (!guardAction({ type: 'add-to-cart', payload: { item } })) return;
    store.setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, item];
    });
    store.showToast('Added to Cart');
  };

  const handleBuyNow = (e: React.MouseEvent, p: any) => {
    e.stopPropagation();
    const rawImg = p.primary_image || (p.images && p.images[0]?.image);
    const item = {
      id: p.slug || p.id,
      name: p.name,
      category: p.category_name || 'Product',
      price: p.pricing ? parseFloat(p.pricing.effective_price || p.pricing.selling_price || '0') : 0,
      qty: 1,
      image: getAbsoluteImageUrl(rawImg) || '/images/nsk_handpiece_portrait.png',
      originalPrice: p.pricing ? parseFloat(p.pricing.mrp || '0') : undefined,
    };

    if (!guardAction({ type: 'buy-now', payload: { item } })) return;
    store.handleBuyNowDirect(item);
  };

  const handleWishlistToggle = (e: React.MouseEvent, p: any) => {
    e.stopPropagation();
    const rawImg = p.primary_image || (p.images && p.images[0]?.image);
    const item = {
      id: p.slug || p.id,
      name: p.name,
      category: p.category_name || 'Product',
      price: p.pricing ? parseFloat(p.pricing.effective_price || p.pricing.selling_price || '0') : 0,
      qty: 1,
      image: getAbsoluteImageUrl(rawImg) || '/images/nsk_handpiece_portrait.png',
      originalPrice: p.pricing ? parseFloat(p.pricing.mrp || '0') : undefined,
    };
    if (!guardAction({ type: 'wishlist-toggle', payload: { item } })) return;
    toggleWishlist(p);
  };

  const sortOptions = [
    { label: 'Relevance', value: 'relevance' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Newest Arrivals', value: 'newest' },
    { label: 'Popularity', value: 'popular' },
  ];

  const pricePresets = [
    { label: 'Under ₹1k', min: '', max: '1000' },
    { label: '₹1k - ₹5k', min: '1000', max: '5000' },
    { label: '₹5k - ₹20k', min: '5000', max: '20000' },
    { label: 'Above ₹20k', min: '20000', max: '' },
  ];

  const activeCategoryObj = categories.find((c) => c.slug === selectedCategory);
  const activeBrandObj = brands.find((b) => b.slug === selectedBrand);
  const hasActiveFilters = Boolean(selectedBrand || selectedCategory || minPrice || maxPrice || inStockOnly);

  return (
    <div className="bg-[#F8FAFC] min-h-screen pt-24 lg:pt-[180px] pb-24 font-sans text-slate-800 antialiased selection:bg-[#006670]/20 selection:text-[#006670]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Breadcrumb & Search Title Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs mb-8">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold mb-3">
            <button onClick={() => router.push('/')} className="hover:text-[#006670] transition-colors flex items-center gap-1">
              Home
            </button>
            <span>/</span>
            <span className="text-[#006670] font-bold">Search Catalogue</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {q ? (
                    <>
                      Search Results for <span className="text-[#006670]">"{q}"</span>
                    </>
                  ) : (
                    'Product Catalogue'
                  )}
                </h1>
                {!isLoading && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#006670]/10 text-[#006670] font-bold text-xs rounded-full border border-[#006670]/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    {meta.count} {meta.count === 1 ? 'item found' : 'items found'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Explore premium dental & clinical products with guaranteed authenticity.
              </p>
            </div>

            {/* Controls: Grid/List View & Sort Dropdown */}
            <div className="flex items-center gap-3">
              {/* Layout Switcher */}
              <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white text-[#006670] shadow-xs font-bold'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white text-[#006670] shadow-xs font-bold'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Filter Toggle Button */}
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-xs hover:border-[#006670] transition-colors"
              >
                <Filter className="w-4 h-4 text-[#006670]" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-[#006670] animate-pulse" />
                )}
              </button>

              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-xs hover:border-[#006670] transition-all cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#006670]" />
                  <span>
                    Sort: <strong className="text-slate-900">{sortOptions.find((s) => s.value === ordering)?.label || 'Relevance'}</strong>
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform text-slate-400 ${isSortOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSortOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-slate-200/80 shadow-xl py-2 z-40 animate-in fade-in zoom-in-95 duration-150"
                    onMouseLeave={() => setIsSortOpen(false)}
                  >
                    <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Sort Products By
                    </div>
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          updateUrl({ ordering: opt.value });
                          setIsSortOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                          ordering === opt.value
                            ? 'bg-[#006670]/10 text-[#006670]'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {ordering === opt.value && <Check className="w-3.5 h-3.5 text-[#006670]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active Filter Chips Toolbar */}
          {hasActiveFilters && (
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs">
              <span className="font-extrabold text-slate-400 text-[11px] uppercase tracking-wider mr-1">
                Active Filters:
              </span>
              
              {selectedCategory && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-bold border border-slate-200">
                  <Tag className="w-3 h-3 text-[#006670]" />
                  Category: {activeCategoryObj?.name || selectedCategory}
                  <button onClick={() => updateUrl({ category: null })} className="hover:text-rose-500 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedBrand && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-bold border border-slate-200">
                  <ShieldCheck className="w-3 h-3 text-[#006670]" />
                  Brand: {activeBrandObj?.name || selectedBrand}
                  <button onClick={() => updateUrl({ brand: null })} className="hover:text-rose-500 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {(minPrice || maxPrice) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-bold border border-slate-200">
                  Price: ₹{minPrice || '0'} - ₹{maxPrice || '∞'}
                  <button
                    onClick={() => {
                      setInputMinPrice('');
                      setInputMaxPrice('');
                      updateUrl({ min_price: null, max_price: null });
                    }}
                    className="hover:text-rose-500 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {inStockOnly && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  In-Stock Only
                  <button onClick={() => updateUrl({ in_stock: null })} className="hover:text-rose-500 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                onClick={handleClearAll}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-[11px] transition-colors ml-auto cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Clear All
              </button>
            </div>
          )}
        </div>

        {/* Main Grid: Sidebar Filters (Desktop) + Product Results */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Filters — Desktop */}
          <aside className="hidden lg:block space-y-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs h-fit sticky lg:top-[140px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#006670]" /> Filter Catalogue
              </h3>
              {hasActiveFilters && (
                <button
                  onClick={handleClearAll}
                  className="text-[11px] font-extrabold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-wider"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                  Category
                </label>
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => updateUrl({ category: e.target.value || null })}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670] focus:bg-white transition-colors cursor-pointer"
                  >
                    <option value="">All Categories ({categories.length})</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Brand Filter */}
            {brands.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                  Brand
                </label>
                <div className="relative">
                  <select
                    value={selectedBrand}
                    onChange={(e) => updateUrl({ brand: e.target.value || null })}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670] focus:bg-white transition-colors cursor-pointer"
                  >
                    <option value="">All Brands ({brands.length})</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.slug}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Price Filter & Presets */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                Price Range (₹)
              </label>

              {/* Price Preset Chips */}
              <div className="grid grid-cols-2 gap-1.5">
                {pricePresets.map((preset) => {
                  const isActive = minPrice === preset.min && maxPrice === preset.max;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setInputMinPrice(preset.min);
                        setInputMaxPrice(preset.max);
                        updateUrl({ min_price: preset.min || null, max_price: preset.max || null });
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-[#006670] text-white border-[#006670]'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Manual Inputs */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    placeholder="Min"
                    value={inputMinPrice}
                    onChange={(e) => setInputMinPrice(e.target.value)}
                    onBlur={() => updateUrl({ min_price: inputMinPrice || null })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-2 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670] focus:bg-white transition-colors"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={inputMaxPrice}
                    onChange={(e) => setInputMaxPrice(e.target.value)}
                    onBlur={() => updateUrl({ max_price: inputMaxPrice || null })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-2 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006670] focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Availability Filter Toggle Switch */}
            <div className="pt-3 border-t border-slate-100">
              <label className="flex items-center justify-between cursor-pointer select-none">
                <span className="text-xs font-bold text-slate-700">In-Stock Only</span>
                <button
                  type="button"
                  onClick={() => updateUrl({ in_stock: inStockOnly ? null : 'true' })}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    inStockOnly ? 'bg-[#006670]' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      inStockOnly ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            </div>
          </aside>

          {/* Mobile Filter Drawer */}
          {isMobileFilterOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 lg:hidden flex justify-end">
              <div className="w-full max-w-xs bg-white h-full p-6 space-y-6 overflow-y-auto shadow-2xl flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                      <Filter className="w-4 h-4 text-[#006670]" /> Filter Catalogue
                    </h3>
                    <button onClick={() => setIsMobileFilterOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {categories.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-slate-700 uppercase">Category</label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => updateUrl({ category: e.target.value || null })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold"
                      >
                        <option value="">All Categories</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {brands.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-slate-700 uppercase">Brand</label>
                      <select
                        value={selectedBrand}
                        onChange={(e) => updateUrl({ brand: e.target.value || null })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold"
                      >
                        <option value="">All Brands</option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.slug}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-slate-700 uppercase">Price Range (₹)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={inputMinPrice}
                        onChange={(e) => setInputMinPrice(e.target.value)}
                        onBlur={() => updateUrl({ min_price: inputMinPrice || null })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={inputMaxPrice}
                        onChange={(e) => setInputMaxPrice(e.target.value)}
                        onBlur={() => updateUrl({ max_price: inputMaxPrice || null })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-bold text-slate-700">In-Stock Only</span>
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => updateUrl({ in_stock: e.target.checked ? 'true' : null })}
                        className="w-4 h-4 accent-[#006670] rounded"
                      />
                    </label>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-3">
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="w-full py-3 bg-[#006670] hover:bg-[#004d54] text-white font-extrabold text-xs rounded-full transition-all shadow-md"
                  >
                    Apply Filters
                  </button>
                  {hasActiveFilters && (
                    <button
                      onClick={handleClearAll}
                      className="w-full py-2.5 text-center text-xs font-bold text-rose-500 hover:underline"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Results Grid / List Section */}
          <div className="lg:col-span-3">
            {isLoading ? (
              /* Loading Skeletons */
              <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs animate-pulse">
                    <div className="w-full h-48 bg-slate-100 rounded-2xl mb-4" />
                    <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-1/2 mb-4" />
                    <div className="h-8 bg-slate-100 rounded-full w-full" />
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                {/* GRID VIEW */}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((p) => {
                      const rawImage = p.primary_image || (p.images && p.images[0]?.image);
                      const image = getAbsoluteImageUrl(rawImage) || '/images/nsk_handpiece_portrait.png';
                      const price = p.pricing ? parseFloat(p.pricing.effective_price || p.pricing.selling_price || '0') : 0;
                      const originalPrice = p.pricing ? parseFloat(p.pricing.mrp || '0') : undefined;
                      const prodId = p.id || p.product_id;
                      const isStarred = isInWishlist(prodId);

                      // Calculate Discount %
                      const discountPct = originalPrice && originalPrice > price
                        ? Math.round(((originalPrice - price) / originalPrice) * 100)
                        : 0;

                      return (
                        <div
                          key={p.id}
                          onClick={() => router.push(`/products/${p.slug || p.id}`)}
                          className="bg-white rounded-3xl p-4 border border-slate-200/80 hover:border-[#006670]/40 hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group relative overflow-hidden text-left"
                        >
                          <div>
                            {/* Image Box Container */}
                            <div className="relative w-full h-64 rounded-2xl bg-[#EBEBEB] flex items-center justify-center p-4 overflow-hidden mb-4">
                              <img
                                src={image}
                                alt={p.name}
                                className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                              />

                              {/* Wishlist Heart Icon on Top Right */}
                              <button
                                onClick={(e) => handleWishlistToggle(e, p)}
                                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white text-slate-400 hover:text-rose-500 shadow-md flex items-center justify-center transition-all z-10 cursor-pointer"
                                title={isStarred ? 'Remove from Wishlist' : 'Add to Wishlist'}
                              >
                                <Heart className={`w-4.5 h-4.5 ${isStarred ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                              </button>
                            </div>

                            {/* Brand Label */}
                            <span className="text-xs font-black uppercase tracking-wider text-[#006670] mb-1 block">
                              {p.brand_name || (typeof p.brand === 'string' ? p.brand : 'FAAZO')}
                            </span>

                            {/* Product Title */}
                            <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#006670] transition-colors leading-snug line-clamp-2 mb-2">
                              {p.name}
                            </h3>

                            {/* Rating Stars & Count */}
                            <div className="flex items-center gap-1.5 mb-3">
                              <div className="flex items-center text-amber-400 gap-0.5">
                                <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                                <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                                <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                                <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                                <Star className="w-3.5 h-3.5 text-slate-300 stroke-slate-300" />
                              </div>
                              <span className="text-xs font-extrabold text-slate-800 ml-1">4.8</span>
                              <span className="text-xs font-medium text-slate-400 ml-0.5">(48)</span>
                            </div>

                            {/* Divider Line */}
                            <div className="border-b border-slate-100 mb-3" />
                          </div>

                          {/* Price & Action Section */}
                          <div>
                            {/* Price Row with Discount Tag Floated Right */}
                            <div className="flex items-center justify-between gap-2 mb-4">
                              <div className="flex items-baseline gap-2">
                                <span className="text-xl font-black text-slate-900">
                                  ₹{price.toLocaleString('en-IN')}
                                </span>
                                {originalPrice && originalPrice > price && (
                                  <span className="text-xs text-slate-400 line-through font-semibold">
                                    ₹{originalPrice.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>

                              {discountPct > 0 && (
                                <span className="bg-[#E6F7F5] border border-[#A5E8DF] text-[#006670] font-black text-xs px-2.5 py-1 rounded-lg">
                                  {discountPct}% OFF
                                </span>
                              )}
                            </div>

                            {/* Equal Width Buttons */}
                            <div className="grid grid-cols-2 gap-2.5">
                              <button
                                onClick={(e) => handleAddToCart(e, p)}
                                className="flex items-center justify-center gap-1.5 py-2.5 bg-[#006670] hover:bg-[#004d54] text-white text-xs font-extrabold rounded-full transition-all shadow-xs cursor-pointer active:scale-95"
                              >
                                <ShoppingCart className="w-4 h-4 text-white stroke-[2.5]" />
                                <span>Add</span>
                              </button>
                              <button
                                onClick={(e) => handleBuyNow(e, p)}
                                className="flex items-center justify-center gap-1.5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-extrabold rounded-full transition-all shadow-xs cursor-pointer active:scale-95"
                              >
                                <Zap className="w-4 h-4 text-[#FFB800] fill-[#FFB800]" />
                                <span>Buy Now</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* LIST VIEW */
                  <div className="space-y-4">
                    {products.map((p) => {
                      const rawImage = p.primary_image || (p.images && p.images[0]?.image);
                      const image = getAbsoluteImageUrl(rawImage) || '/images/nsk_handpiece_portrait.png';
                      const price = p.pricing ? parseFloat(p.pricing.effective_price || p.pricing.selling_price || '0') : 0;
                      const originalPrice = p.pricing ? parseFloat(p.pricing.mrp || '0') : undefined;
                      const prodId = p.id || p.product_id;
                      const isStarred = isInWishlist(prodId);
                      const discountPct = originalPrice && originalPrice > price
                        ? Math.round(((originalPrice - price) / originalPrice) * 100)
                        : 0;

                      return (
                        <div
                          key={p.id}
                          onClick={() => router.push(`/products/${p.slug || p.id}`)}
                          className="bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-[#006670]/40 hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row items-center gap-6 cursor-pointer group relative"
                        >
                          {/* Image Box */}
                          <div className="relative w-full sm:w-48 h-48 rounded-2xl bg-slate-50 flex items-center justify-center p-4 shrink-0 border border-slate-100">
                            <img
                              src={image}
                              alt={p.name}
                              className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                            />
                            {discountPct > 0 && (
                              <span className="absolute top-2 left-2 bg-[#F58734] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                {discountPct}% OFF
                              </span>
                            )}
                          </div>

                          {/* Content Details */}
                          <div className="flex-1 space-y-2 text-left w-full">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase text-[#006670] bg-[#006670]/10 px-2.5 py-0.5 rounded-md">
                                {p.category_name || 'Clinical'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                {p.brand_name || 'FAAZO'}
                              </span>
                            </div>

                            <h3 className="text-base font-extrabold text-[#006670] group-hover:text-[#004d54] transition-colors leading-snug">
                              {p.name}
                            </h3>

                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <div className="flex items-center text-amber-400">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star key={star} className="w-3 h-3 fill-current" />
                                ))}
                              </div>
                              <span className="font-bold text-slate-700">4.8 (24 reviews)</span>
                            </div>

                            <p className="text-xs text-slate-500 line-clamp-2 font-medium">
                              {p.description || 'High quality professional clinical equipment designed for durability and optimal performance.'}
                            </p>
                          </div>

                          {/* Price & Buttons (Right side on desktop) */}
                          <div className="w-full sm:w-48 shrink-0 sm:border-l sm:border-slate-100 sm:pl-6 pt-4 sm:pt-0 flex flex-col justify-between h-full">
                            <div className="mb-4">
                              <div className="text-xl font-black text-slate-900">
                                ₹{price.toLocaleString('en-IN')}
                              </div>
                              {originalPrice && originalPrice > price && (
                                <div className="text-xs text-slate-400 line-through">
                                  ₹{originalPrice.toLocaleString('en-IN')}
                                </div>
                              )}
                              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">GST Inclusive</span>
                            </div>

                            <div className="space-y-2">
                              <button
                                onClick={(e) => handleAddToCart(e, p)}
                                className="w-full py-2 bg-[#006670] hover:bg-[#004d54] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" /> Add to Cart
                              </button>
                              <button
                                onClick={(e) => handleBuyNow(e, p)}
                                className="w-full py-2 bg-[#F58734] hover:bg-[#e07525] text-white text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <Zap className="w-3.5 h-3.5" /> Buy Now
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination Controls */}
                {meta.total_pages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-12">
                    <button
                      disabled={page <= 1}
                      onClick={() => updateUrl({ page: String(page - 1) })}
                      className="p-3 rounded-2xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-xs"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-extrabold text-slate-700 px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-xs">
                      Page {meta.page} of {meta.total_pages}
                    </span>
                    <button
                      disabled={page >= meta.total_pages}
                      onClick={() => updateUrl({ page: String(page + 1) })}
                      className="p-3 rounded-2xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-xs"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* No Results Elegant State */
              <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto shadow-xs my-6">
                <div className="w-20 h-20 bg-[#006670]/10 rounded-full flex items-center justify-center text-[#006670] mx-auto mb-5">
                  <Package className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-2">
                  No equipment matched your search
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                  We couldn't find any products matching <strong className="text-slate-800">"{q}"</strong>. Try broadening your keywords, expanding your price range, or clearing active filter criteria.
                </p>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleClearAll}
                    className="px-6 py-3 bg-[#006670] hover:bg-[#004d54] text-white text-xs font-extrabold rounded-full transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Clear All Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

