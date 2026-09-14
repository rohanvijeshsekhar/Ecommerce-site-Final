'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Star,
  Heart,
  ShoppingCart,
  Zap,
  Package,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useGuestGuard } from '../../hooks/useGuestGuard';
import { useWishlist } from '@/contexts/WishlistContext';
import { useStore } from '@/contexts/StoreContext';
import { api, getAbsoluteImageUrl } from '../../lib/api';
import ListingToolbar, { defaultProductSortOptions } from './listing/ListingToolbar';
import ActiveFilterChips, { ActiveChipItem } from './listing/ActiveFilterChips';
import ListingFilterSidebar, { FilterItemOption } from './listing/ListingFilterSidebar';
import ListingFilterDrawer from './listing/ListingFilterDrawer';
import ListingPagination from './listing/ListingPagination';

interface MockCartItem {
  id: string;
  name: string;
  category: string;
  price: number;
  qty: number;
  image: string;
  originalPrice?: number;
  sku?: string;
}

interface ProductListingPageProps {
  category?: string;
  categorySlug?: string;
  onBackToPortfolio?: () => void;
  onProductClick?: (slug: string) => void;
  setCartItems?: React.Dispatch<React.SetStateAction<MockCartItem[]>>;
  onBuyNowDirect?: (item: MockCartItem) => void;
  showToast?: (message: string) => void;
  onOpenLoginModal?: () => void;
}

export default function ProductListingPage({
  category = 'All Products',
  categorySlug,
  onBackToPortfolio,
  onProductClick,
  setCartItems,
  onBuyNowDirect,
  showToast,
  onOpenLoginModal,
}: ProductListingPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useStore();
  const openLoginModalHandler = onOpenLoginModal || store.openLoginModal;
  const showToastHandler = showToast || store.showToast;
  const { guardAction } = useGuestGuard(openLoginModalHandler, showToastHandler);
  const { isInWishlist, toggleWishlist } = useWishlist();

  // Read URL parameters
  const urlBrand = searchParams.get('brand') || '';
  const urlCategory = categorySlug || searchParams.get('category') || '';
  const urlMinPrice = searchParams.get('min_price') || '';
  const urlMaxPrice = searchParams.get('max_price') || '';
  const urlMinRating = searchParams.get('min_rating') || '';
  const urlInStock = searchParams.get('in_stock') === 'true';
  const urlOrdering = searchParams.get('ordering') || 'relevance';
  const urlPage = parseInt(searchParams.get('page') || '1', 10) || 1;

  // View Mode state (grid vs list)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<FilterItemOption[]>([]);
  const [brandsList, setBrandsList] = useState<FilterItemOption[]>([]);
  const [meta, setMeta] = useState({ count: 0, total_pages: 1, page: 1, page_size: 20 });
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch categories and brands metadata once
  useEffect(() => {
    Promise.all([
      api.get('categories/?page_size=200').catch(() => ({ data: { data: [] } })),
      api.get('brands/?page_size=100').catch(() => ({ data: { data: [] } })),
    ]).then(([catRes, brandRes]) => {
      const cats = catRes.data?.data ?? (Array.isArray(catRes.data) ? catRes.data : []);
      const brands = brandRes.data?.data ?? (Array.isArray(brandRes.data) ? brandRes.data : []);

      setCategoriesList(
        cats.map((c: any) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
        }))
      );

      setBrandsList(
        brands.map((b: any) => ({
          id: b.id,
          slug: b.slug,
          name: b.name,
        }))
      );
    });
  }, []);

  // 2. Fetch products from backend whenever URL filters/sort/page change
  useEffect(() => {
    setIsLoading(true);
    const params: Record<string, any> = {
      page: urlPage,
      page_size: 20,
    };

    if (urlCategory) params.category = urlCategory;
    if (urlBrand) params.brand = urlBrand;
    if (urlMinPrice) params.min_price = urlMinPrice;
    if (urlMaxPrice) params.max_price = urlMaxPrice;
    if (urlMinRating) params.min_rating = urlMinRating;
    if (urlInStock) params.in_stock = 'true';
    if (urlOrdering) params.ordering = urlOrdering;

    api
      .get('products/', { params })
      .then((res) => {
        const prodData = res.data?.data ?? [];
        const metaData = res.data?.meta ?? {
          count: prodData.length,
          total_pages: 1,
          page: 1,
          page_size: 20,
        };
        setProducts(prodData);
        setMeta(metaData);
      })
      .catch((err) => {
        console.error('Failed to load products:', err);
        setProducts([]);
        setMeta({ count: 0, total_pages: 1, page: 1, page_size: 20 });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [urlCategory, urlBrand, urlMinPrice, urlMaxPrice, urlMinRating, urlInStock, urlOrdering, urlPage]);

  // URL State Updater Helper
  const updateUrl = (updates: Record<string, string | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '') {
        current.delete(key);
      } else {
        current.set(key, val);
      }
    });

    // Auto-reset to page 1 unless page itself was explicitly set
    if (!('page' in updates)) {
      current.delete('page');
    }

    const search = current.toString();
    const queryStr = search ? `?${search}` : '';
    
    // Preserve current route path
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/products';
    router.push(`${currentPath}${queryStr}`);
  };

  // Filter Handlers
  const handleSelectCategory = (slug: string | null) => {
    // If route is already scoped by categorySlug, prevent clearing category
    if (categorySlug) return;
    updateUrl({ category: slug });
  };

  const selectedBrandsArray = useMemo(() => {
    if (!urlBrand) return [];
    return urlBrand.split(',').map((s) => s.trim()).filter(Boolean);
  }, [urlBrand]);

  const handleToggleBrand = (slug: string) => {
    let next: string[];
    if (selectedBrandsArray.includes(slug)) {
      next = selectedBrandsArray.filter((s) => s !== slug);
    } else {
      next = [...selectedBrandsArray, slug];
    }
    updateUrl({ brand: next.length > 0 ? next.join(',') : null });
  };

  const handlePriceChange = (min: string | null, max: string | null) => {
    updateUrl({ min_price: min, max_price: max });
  };

  const handleRatingChange = (rating: string | null) => {
    updateUrl({ min_rating: rating });
  };

  const handleToggleInStock = () => {
    updateUrl({ in_stock: urlInStock ? null : 'true' });
  };

  const handleSortChange = (newSort: string) => {
    updateUrl({ ordering: newSort });
  };

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: String(newPage) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearAll = () => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/products';
    router.push(currentPath);
  };

  // Build Active Filter Chips
  const activeChips: ActiveChipItem[] = useMemo(() => {
    const chips: ActiveChipItem[] = [];

    // Category chip (only if not locked by route categorySlug)
    if (!categorySlug && urlCategory) {
      const catObj = categoriesList.find((c) => c.slug === urlCategory);
      chips.push({
        id: 'category',
        label: `Category: ${catObj?.name || urlCategory}`,
        type: 'category',
        onRemove: () => updateUrl({ category: null }),
      });
    }

    // Brand chips
    selectedBrandsArray.forEach((bSlug) => {
      const brandObj = brandsList.find((b) => b.slug === bSlug);
      chips.push({
        id: `brand-${bSlug}`,
        label: `Brand: ${brandObj?.name || bSlug}`,
        type: 'brand',
        onRemove: () => handleToggleBrand(bSlug),
      });
    });

    // Price chip
    if (urlMinPrice || urlMaxPrice) {
      chips.push({
        id: 'price',
        label: `Price: ₹${urlMinPrice || '0'} - ₹${urlMaxPrice || '∞'}`,
        type: 'price',
        onRemove: () => updateUrl({ min_price: null, max_price: null }),
      });
    }

    // Rating chip
    if (urlMinRating) {
      chips.push({
        id: 'rating',
        label: `${urlMinRating}★ & Above`,
        type: 'rating',
        onRemove: () => updateUrl({ min_rating: null }),
      });
    }

    // In-Stock chip
    if (urlInStock) {
      chips.push({
        id: 'in-stock',
        label: 'In-Stock Only',
        type: 'stock',
        onRemove: () => updateUrl({ in_stock: null }),
      });
    }

    return chips;
  }, [categorySlug, urlCategory, selectedBrandsArray, urlMinPrice, urlMaxPrice, urlMinRating, urlInStock, categoriesList, brandsList]);

  const hasActiveFilters = activeChips.length > 0;

  // Cart & Wishlist actions
  const handleProductCardClick = (p: any) => {
    if (onProductClick) {
      onProductClick(p.slug || p.id);
    } else {
      router.push(`/products/${p.slug || p.id}`);
    }
  };

  const handleAddToCart = (e: React.MouseEvent, p: any) => {
    e.stopPropagation();
    const rawImg = p.primary_image || (p.images && p.images[0]?.image);
    const price = p.pricing ? parseFloat(p.pricing.effective_price || p.pricing.selling_price || '0') : 0;
    const mrp = p.pricing ? parseFloat(p.pricing.mrp || '0') : undefined;

    const item: MockCartItem = {
      id: p.slug || p.id,
      name: p.name,
      category: p.category_name || 'Product',
      price: price,
      qty: 1,
      image: getAbsoluteImageUrl(rawImg) || '/images/nsk_handpiece_portrait.png',
      originalPrice: mrp && mrp > price ? mrp : undefined,
      sku: p.sku,
    };

    if (!guardAction({ type: 'add-to-cart', payload: { item } })) return;
    if (setCartItems) {
      setCartItems((prev) => {
        const existing = prev.find((i) => i.id === item.id);
        if (existing) {
          return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
        }
        return [...prev, item];
      });
    } else {
      store.addItemToCart(item);
    }
    showToastHandler('Added to Cart');
  };

  const handleBuyNow = (e: React.MouseEvent, p: any) => {
    e.stopPropagation();
    const rawImg = p.primary_image || (p.images && p.images[0]?.image);
    const price = p.pricing ? parseFloat(p.pricing.effective_price || p.pricing.selling_price || '0') : 0;
    const mrp = p.pricing ? parseFloat(p.pricing.mrp || '0') : undefined;

    const item: MockCartItem = {
      id: p.slug || p.id,
      name: p.name,
      category: p.category_name || 'Product',
      price: price,
      qty: 1,
      image: getAbsoluteImageUrl(rawImg) || '/images/nsk_handpiece_portrait.png',
      originalPrice: mrp && mrp > price ? mrp : undefined,
      sku: p.sku,
    };

    if (!guardAction({ type: 'buy-now', payload: { item } })) return;
    if (onBuyNowDirect) {
      onBuyNowDirect(item);
    } else {
      store.handleBuyNowDirect(item);
    }
  };

  const handleToggleWishlist = (e: React.MouseEvent, p: any) => {
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

  // Header Title determination
  const pageTitle = useMemo(() => {
    if (category && category !== 'All Products' && category !== 'All') {
      return category;
    }
    if (urlCategory) {
      const matched = categoriesList.find((c) => c.slug === urlCategory);
      return matched?.name || urlCategory;
    }
    return 'Dental Equipment & Consumables';
  }, [category, urlCategory, categoriesList]);

  return (
    <div className="bg-[#F8FAFC] min-h-screen pt-[115px] sm:pt-[125px] lg:pt-[144px] pb-24 font-sans text-slate-800 antialiased selection:bg-[#006670]/20 selection:text-[#006670] select-none text-left">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Header Breadcrumb & Title Banner */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-slate-200/80 shadow-xs mb-6">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-slate-400 font-semibold mb-2">
            <button
              onClick={() => router.push('/')}
              className="hover:text-[#006670] transition-colors cursor-pointer"
            >
              Home
            </button>
            <span>/</span>
            <button
              onClick={() => router.push('/products')}
              className="hover:text-[#006670] transition-colors cursor-pointer"
            >
              Products
            </button>
            {category && category !== 'All Products' && (
              <>
                <span>/</span>
                <span className="text-[#006670] font-bold">{pageTitle}</span>
              </>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                  {pageTitle}
                </h1>
                {!isLoading && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-[#006670]/10 text-[#006670] font-black text-xs rounded-full border border-[#006670]/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    {meta.count} {meta.count === 1 ? 'Product' : 'Products'}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 max-w-2xl">
                Explore certified professional dental equipment, surgical handpieces, and clinical supplies.
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid: Sidebar + Product Listings */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          
          {/* Desktop Filter Sidebar */}
          <ListingFilterSidebar
            categories={categoriesList}
            selectedCategory={urlCategory}
            onSelectCategory={handleSelectCategory}
            hideCategoryFilter={Boolean(categorySlug)}
            brands={brandsList}
            selectedBrands={selectedBrandsArray}
            onToggleBrand={handleToggleBrand}
            minPrice={urlMinPrice}
            maxPrice={urlMaxPrice}
            onPriceChange={handlePriceChange}
            minRating={urlMinRating}
            onRatingChange={handleRatingChange}
            inStockOnly={urlInStock}
            onToggleInStock={handleToggleInStock}
            hasActiveFilters={hasActiveFilters}
            onClearAll={handleClearAll}
          />

          {/* Mobile Filter Drawer */}
          <ListingFilterDrawer
            isOpen={isMobileDrawerOpen}
            onClose={() => setIsMobileDrawerOpen(false)}
            totalCount={meta.count}
            categories={categoriesList}
            selectedCategory={urlCategory}
            onSelectCategory={handleSelectCategory}
            hideCategoryFilter={Boolean(categorySlug)}
            brands={brandsList}
            selectedBrands={selectedBrandsArray}
            onToggleBrand={handleToggleBrand}
            minPrice={urlMinPrice}
            maxPrice={urlMaxPrice}
            onPriceChange={handlePriceChange}
            minRating={urlMinRating}
            onRatingChange={handleRatingChange}
            inStockOnly={urlInStock}
            onToggleInStock={handleToggleInStock}
            hasActiveFilters={hasActiveFilters}
            onClearAll={handleClearAll}
          />

          {/* Right Product Grid Area */}
          <main className="lg:col-span-3 flex flex-col">
            
            {/* Unified Listing Toolbar */}
            <ListingToolbar
              totalCount={meta.count}
              isLoading={isLoading}
              onOpenMobileFilters={() => setIsMobileDrawerOpen(true)}
              activeFiltersCount={activeChips.length}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortValue={urlOrdering}
              sortOptions={defaultProductSortOptions}
              onSortChange={handleSortChange}
            />

            {/* Active Filter Chips */}
            <ActiveFilterChips
              chips={activeChips}
              onClearAll={handleClearAll}
            />

            {/* Product Grid / List Content */}
            {isLoading ? (
              <div
                className={`grid gap-3 sm:gap-5 ${
                  viewMode === 'grid'
                    ? 'grid-cols-2 md:grid-cols-3'
                    : 'grid-cols-1'
                }`}
              >
                {Array.from({ length: 9 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs animate-pulse flex flex-col justify-between h-[360px]"
                  >
                    <div className="w-full aspect-square bg-slate-100 rounded-xl mb-3" />
                    <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-1/2 mb-4" />
                    <div className="h-9 bg-slate-100 rounded-xl w-full" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              /* Genuine Empty State (NO dummy products!) */
              <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center my-6 shadow-xs max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200/60">
                  <Package className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">
                  No products match your selected filters.
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
                  Try adjusting your price range, selected brands, or availability filters to find products.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear All Filters</span>
                  </button>
                )}
              </div>
            ) : (
              /* Real Backend Products Grid */
              <div
                className={`grid gap-3 sm:gap-5 ${
                  viewMode === 'grid'
                    ? 'grid-cols-2 md:grid-cols-3'
                    : 'grid-cols-1'
                }`}
              >
                {products.map((p) => {
                  const rawImg = p.primary_image || (p.images && p.images[0]?.image);
                  const image = getAbsoluteImageUrl(rawImg) || '/images/nsk_handpiece_portrait.png';
                  const price = p.pricing ? parseFloat(p.pricing.effective_price || p.pricing.selling_price || '0') : 0;
                  const mrp = p.pricing ? parseFloat(p.pricing.mrp || '0') : 0;
                  const discountPct =
                    p.pricing?.discount_percentage ||
                    (mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0);
                  const isOutOfStock =
                    p.inventory?.stock_status === 'out_of_stock' ||
                    (p.inventory && p.inventory.available_stock <= 0 && !p.inventory.allow_backorders);
                  const wishlisted = isInWishlist(p.slug || p.id);

                  if (viewMode === 'list') {
                    // List View Item
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleProductCardClick(p)}
                        className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row items-center gap-4 cursor-pointer group"
                      >
                        <div className="w-32 h-32 bg-slate-50 rounded-xl p-2 shrink-0 flex items-center justify-center border border-slate-100 relative">
                          <img
                            src={image}
                            alt={p.name}
                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                          />
                          {discountPct > 0 && (
                            <span className="absolute top-2 left-2 bg-[#006670] text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow-xs">
                              {discountPct}% OFF
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                            <span className="text-[#006670]">{p.brand_name || 'FAAZO'}</span>
                            <span>•</span>
                            <span>{p.category_name || 'Equipment'}</span>
                          </div>
                          <h3 className="text-sm font-black text-slate-900 group-hover:text-[#006670] transition-colors line-clamp-1">
                            {p.name}
                          </h3>
                          <p className="text-xs text-slate-500 line-clamp-2">{p.short_description}</p>
                          <div className="flex items-center gap-2 pt-1">
                            {(() => {
                              const ratingVal = p.average_rating ? parseFloat(p.average_rating) : 0;
                              const reviewCount = p.total_reviews ? parseInt(p.total_reviews) : 0;
                              if (reviewCount > 0 && ratingVal > 0) {
                                return (
                                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 text-[10px] font-black text-amber-700">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    <span>{ratingVal.toFixed(1)}</span>
                                    <span className="text-slate-400 font-normal">({reviewCount})</span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            <span
                              className={`text-[10px] font-bold ${
                                isOutOfStock ? 'text-rose-500' : 'text-emerald-600'
                              }`}
                            >
                              {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-between sm:border-l sm:border-slate-100 sm:pl-4 space-y-3 w-full sm:w-auto">
                          <div className="text-right">
                            <div className="text-base sm:text-lg font-black text-[#006670]">
                              ₹{price.toLocaleString('en-IN')}
                            </div>
                            {mrp > price && (
                              <div className="text-xs text-slate-400 line-through">
                                ₹{mrp.toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={(e) => handleAddToCart(e, p)}
                              disabled={isOutOfStock}
                              className="px-3 py-2 bg-slate-100 hover:bg-[#E6F2F2] text-slate-700 hover:text-[#006670] font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>Bag</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleBuyNow(e, p)}
                              disabled={isOutOfStock}
                              className="px-4 py-2 bg-[#006670] hover:bg-[#004e56] text-white font-black text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                            >
                              <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                              <span>Buy</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Standard Grid Card
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleProductCardClick(p)}
                      className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden relative group cursor-pointer"
                    >
                      {/* Top Badges & Wishlist */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
                        {discountPct > 0 ? (
                          <span className="bg-[#006670] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md shadow-sm pointer-events-auto">
                            {discountPct}% OFF
                          </span>
                        ) : p.is_featured ? (
                          <span className="bg-[#006670] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md shadow-sm pointer-events-auto flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-300" /> Featured
                          </span>
                        ) : (
                          <span />
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleToggleWishlist(e, p)}
                          className="pointer-events-auto p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white text-slate-400 hover:text-rose-500 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                          aria-label="Toggle Wishlist"
                        >
                          <Heart
                            className={`w-4 h-4 transition-all ${
                              wishlisted
                                ? 'fill-rose-500 stroke-rose-500'
                                : 'stroke-slate-400 fill-none'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Image Container */}
                      <div className="w-full aspect-square bg-slate-50 p-4 flex items-center justify-center overflow-hidden relative border-b border-slate-100">
                        <img
                          src={image}
                          alt={p.name}
                          loading="lazy"
                          className="w-full h-full max-h-full max-w-full object-contain object-center group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      {/* Content Body */}
                      <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-grow">
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            <span className="truncate max-w-[110px] text-[#006670]">
                              {p.brand_name || 'FAAZO'}
                            </span>
                            {p.category_name && (
                              <span className="truncate max-w-[90px]">{p.category_name}</span>
                            )}
                          </div>

                          <h3 className="font-bold text-xs sm:text-sm text-slate-800 line-clamp-2 leading-snug group-hover:text-[#006670] transition-colors mb-2">
                            {p.name}
                          </h3>
                        </div>

                        <div>
                          {/* Rating & Stock */}
                          <div className="flex items-center justify-between my-2">
                            {(() => {
                              const ratingVal = p.average_rating ? parseFloat(p.average_rating) : 0;
                              const reviewCount = p.total_reviews ? parseInt(p.total_reviews) : 0;
                              if (reviewCount > 0 && ratingVal > 0) {
                                return (
                                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50 text-[10px] font-black text-amber-700">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    <span>{ratingVal.toFixed(1)}</span>
                                    <span className="text-slate-400 font-normal">({reviewCount})</span>
                                  </div>
                                );
                              }
                              return <span />;
                            })()}
                            <span
                              className={`text-[10px] font-bold ${
                                isOutOfStock ? 'text-rose-500' : 'text-emerald-600'
                              }`}
                            >
                              {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                            </span>
                          </div>

                          {/* Pricing */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                            <div>
                              <span className="text-sm sm:text-base font-black text-slate-900 font-display">
                                ₹{price.toLocaleString('en-IN')}
                              </span>
                              {mrp > price && (
                                <span className="text-[11px] text-slate-400 line-through ml-1.5 font-medium">
                                  ₹{mrp.toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* CTA Row */}
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleAddToCart(e, p)}
                              disabled={isOutOfStock}
                              className="w-full py-2 bg-slate-100 hover:bg-[#E6F2F2] text-slate-700 hover:text-[#006670] disabled:opacity-40 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>Bag</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleBuyNow(e, p)}
                              disabled={isOutOfStock}
                              className="w-full py-2 bg-[#006670] hover:bg-[#004e56] text-white disabled:opacity-40 text-[11px] font-black rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                              <span>Buy</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            <ListingPagination
              currentPage={meta.page || urlPage}
              totalPages={meta.total_pages || 1}
              totalCount={meta.count || 0}
              pageSize={meta.page_size || 20}
              onPageChange={handlePageChange}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
