'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Star,
  Heart,
  ShoppingCart,
  Zap,
  ChevronRight,
  ShieldCheck,
  Package,
  RotateCcw,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  ChevronLeft,
} from 'lucide-react';
import { api, getAbsoluteImageUrl } from '@/lib/api';
import { useStore } from '@/contexts/StoreContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useGuestGuard } from '@/hooks/useGuestGuard';
import ListingToolbar, { defaultProductSortOptions } from './listing/ListingToolbar';
import ActiveFilterChips, { ActiveChipItem } from './listing/ActiveFilterChips';
import ListingFilterSidebar, { FilterItemOption } from './listing/ListingFilterSidebar';
import ListingFilterDrawer from './listing/ListingFilterDrawer';
import ListingPagination from './listing/ListingPagination';

export interface BrandDetailData {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  logo_url?: string;
  banner_image?: string;
  banner_image_url?: string;
  short_description?: string;
  full_description?: string;
  description?: string;
  country_of_origin?: string;
  website_url?: string;
  support_email?: string;
  support_phone?: string;
  warranty_policy_text?: string;
  warranty_months_default?: number;
  is_warranty_transferable?: boolean;
  service_policy_text?: string;
  service_turnaround_days?: number;
  certifications?: any[];
  documentation_url?: string;
  seo_title?: string;
  seo_description?: string;
  product_count?: number;
}

interface BrandDetailClientProps {
  slug: string;
}

export default function BrandDetailClient({ slug }: BrandDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useStore();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { guardAction } = useGuestGuard(store.openLoginModal, store.showToast);

  // URL State
  const urlCategory = searchParams.get('category') || '';
  const urlMinPrice = searchParams.get('min_price') || '';
  const urlMaxPrice = searchParams.get('max_price') || '';
  const urlMinRating = searchParams.get('min_rating') || '';
  const urlInStock = searchParams.get('in_stock') === 'true';
  const urlOrdering = searchParams.get('ordering') || 'newest';
  const urlPage = parseInt(searchParams.get('page') || '1', 10) || 1;

  // View Mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Brand data state
  const [brand, setBrand] = useState<BrandDetailData | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<FilterItemOption[]>([]);
  const [brandLoading, setBrandLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ count: 0, total_pages: 1, page: 1, page_size: 24 });

  // 1. Fetch Brand Info & All Categories
  useEffect(() => {
    setBrandLoading(true);
    setError(null);

    Promise.all([
      api.get(`brands/${slug}/`).catch((err) => {
        console.error('Failed to load brand:', err);
        return { data: null };
      }),
      api.get('categories/?page_size=200').catch(() => ({ data: { data: [] } })),
    ])
      .then(([brandRes, catRes]) => {
        const bData = brandRes.data?.data || brandRes.data;
        if (bData && (bData.name || bData.id)) {
          setBrand(bData);
        } else {
          setError('Brand not found.');
        }

        const cats = catRes.data?.data ?? (Array.isArray(catRes.data) ? catRes.data : []);
        setCategoriesList(
          cats.map((c: any) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
          }))
        );
      })
      .finally(() => {
        setBrandLoading(false);
      });
  }, [slug]);

  // 2. Fetch Brand Products scoped strictly to brand slug
  useEffect(() => {
    setProductsLoading(true);
    const params: Record<string, any> = {
      page: urlPage,
      page_size: 24,
    };

    if (urlCategory) params.category = urlCategory;
    if (urlMinPrice) params.min_price = urlMinPrice;
    if (urlMaxPrice) params.max_price = urlMaxPrice;
    if (urlMinRating) params.min_rating = urlMinRating;
    if (urlInStock) params.in_stock = 'true';
    if (urlOrdering) params.ordering = urlOrdering;

    api
      .get(`brands/${slug}/products/`, { params })
      .then((res) => {
        const prodData = res.data?.data ?? res.data?.products ?? [];
        setProducts(prodData);
        setMeta({
          count: res.data?.count ?? prodData.length,
          total_pages: res.data?.total_pages ?? 1,
          page: res.data?.current_page ?? urlPage,
          page_size: 24,
        });
      })
      .catch((err) => {
        console.error('Failed to load brand products:', err);
        setProducts([]);
        setMeta({ count: 0, total_pages: 1, page: 1, page_size: 24 });
      })
      .finally(() => {
        setProductsLoading(false);
      });
  }, [slug, urlCategory, urlMinPrice, urlMaxPrice, urlMinRating, urlInStock, urlOrdering, urlPage]);

  // Helper to update URL params cleanly
  const updateUrl = (updates: Record<string, string | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '') {
        current.delete(key);
      } else {
        current.set(key, val);
      }
    });

    if (!('page' in updates)) {
      current.delete('page');
    }

    const search = current.toString();
    const queryStr = search ? `?${search}` : '';
    router.push(`/brands/${slug}${queryStr}`);
  };

  const handleSelectCategory = (catSlug: string | null) => {
    updateUrl({ category: catSlug });
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
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const handleClearAll = () => {
    router.push(`/brands/${slug}`);
  };

  // Active Filter Chips
  const activeChips: ActiveChipItem[] = useMemo(() => {
    const chips: ActiveChipItem[] = [];

    if (urlCategory) {
      const catObj = categoriesList.find((c) => c.slug === urlCategory);
      chips.push({
        id: 'category',
        label: `Category: ${catObj?.name || urlCategory}`,
        type: 'category',
        onRemove: () => updateUrl({ category: null }),
      });
    }

    if (urlMinPrice || urlMaxPrice) {
      chips.push({
        id: 'price',
        label: `Price: ₹${urlMinPrice || '0'} - ₹${urlMaxPrice || '∞'}`,
        type: 'price',
        onRemove: () => updateUrl({ min_price: null, max_price: null }),
      });
    }

    if (urlMinRating) {
      chips.push({
        id: 'rating',
        label: `${urlMinRating}★ & Above`,
        type: 'rating',
        onRemove: () => updateUrl({ min_rating: null }),
      });
    }

    if (urlInStock) {
      chips.push({
        id: 'in-stock',
        label: 'In-Stock Only',
        type: 'stock',
        onRemove: () => updateUrl({ in_stock: null }),
      });
    }

    return chips;
  }, [urlCategory, urlMinPrice, urlMaxPrice, urlMinRating, urlInStock, categoriesList]);

  // Cart & Wishlist Handlers
  const handleAddToCart = (e: React.MouseEvent, p: any) => {
    e.stopPropagation();
    const rawImg = p.primary_image || (p.images && p.images[0]?.image) || p.image;
    const price = p.pricing ? parseFloat(p.pricing.effective_price || p.pricing.selling_price || '0') : parseFloat(p.price || '0');
    const mrp = p.pricing ? parseFloat(p.pricing.mrp || '0') : undefined;

    const item = {
      id: p.slug || p.id,
      name: p.name,
      category: p.category_name || brand?.name || 'Brand Product',
      price: price,
      qty: 1,
      image: getAbsoluteImageUrl(rawImg) || '/images/nsk_handpiece_portrait.png',
      originalPrice: mrp && mrp > price ? mrp : undefined,
      sku: p.sku,
    };

    if (!guardAction({ type: 'add-to-cart', payload: { item } })) return;
    store.addItemToCart(item);
    store.showToast(`Added ${p.name} to Bag!`);
  };

  const handleBuyNow = (e: React.MouseEvent, p: any) => {
    e.stopPropagation();
    const rawImg = p.primary_image || (p.images && p.images[0]?.image) || p.image;
    const price = p.pricing ? parseFloat(p.pricing.effective_price || p.pricing.selling_price || '0') : parseFloat(p.price || '0');
    const mrp = p.pricing ? parseFloat(p.pricing.mrp || '0') : undefined;

    const item = {
      id: p.slug || p.id,
      name: p.name,
      category: p.category_name || brand?.name || 'Brand Product',
      price: price,
      qty: 1,
      image: getAbsoluteImageUrl(rawImg) || '/images/nsk_handpiece_portrait.png',
      originalPrice: mrp && mrp > price ? mrp : undefined,
      sku: p.sku,
    };

    if (!guardAction({ type: 'buy-now', payload: { item } })) return;
    store.handleBuyNowDirect(item);
  };

  const handleToggleWishlist = (e: React.MouseEvent, p: any) => {
    e.stopPropagation();
    const rawImg = p.primary_image || (p.images && p.images[0]?.image) || p.image;
    const price = p.pricing ? parseFloat(p.pricing.effective_price || p.pricing.selling_price || '0') : parseFloat(p.price || '0');
    const mrp = p.pricing ? parseFloat(p.pricing.mrp || '0') : undefined;

    const item = {
      id: p.slug || p.id,
      name: p.name,
      category: p.category_name || brand?.name || 'Brand Product',
      price: price,
      qty: 1,
      image: getAbsoluteImageUrl(rawImg) || '/images/nsk_handpiece_portrait.png',
      originalPrice: mrp && mrp > price ? mrp : undefined,
    };

    if (!guardAction({ type: 'wishlist-toggle', payload: { item } })) return;
    toggleWishlist(p);
  };

  const logoSrc = getAbsoluteImageUrl(brand?.logo_url || brand?.logo);
  const bannerSrc = getAbsoluteImageUrl(brand?.banner_image_url || brand?.banner_image);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 pt-[108px] lg:pt-[144px] select-none text-left font-sans text-slate-800">
      
      {/* ── Brand Hero Header ── */}
      {brandLoading ? (
        <div className="w-full h-[240px] sm:h-[320px] bg-slate-200 animate-pulse" />
      ) : error ? (
        <div className="max-w-7xl mx-auto px-4 pt-10 text-center">
          <div className="bg-white rounded-2xl p-10 border border-slate-200 shadow-sm max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 font-black">
              404
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Brand Not Found</h2>
            <p className="text-xs text-slate-500 mb-6">
              The brand you are looking for does not exist or has been removed.
            </p>
            <Link
              href="/brands"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#006670] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Back to All Brands
            </Link>
          </div>
        </div>
      ) : brand ? (
        <div className="w-full relative overflow-hidden bg-slate-900 border-b border-slate-200/50 shadow-md">
          <img
            src={bannerSrc || '/images/brands_hero_bg.png'}
            alt={brand.name}
            loading="eager"
            className="w-full h-[240px] sm:h-[320px] md:h-[360px] object-cover opacity-85 brightness-[0.95]"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/85 to-slate-950/40 backdrop-blur-[2px] flex items-center px-6 sm:px-12 lg:px-20 py-6">
            <div className="max-w-5xl w-full flex flex-col md:flex-row md:items-center gap-6">
              
              {/* Logo Card */}
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-2xl p-4 shadow-xl border border-slate-100 flex items-center justify-center shrink-0">
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt={brand.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl font-black text-[#006670]">
                    {brand.name.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Meta & Description */}
              <div className="space-y-2 text-white flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-[#006670] text-white text-[10px] sm:text-xs font-black tracking-widest uppercase rounded-full shadow-sm">
                    Authorized Brand Scope
                  </span>
                  {brand.country_of_origin && (
                    <span className="px-2.5 py-1 bg-white/10 backdrop-blur-md text-slate-200 text-[10px] font-bold tracking-wider uppercase rounded-full border border-white/20">
                      Origin: {brand.country_of_origin}
                    </span>
                  )}
                  {brand.warranty_months_default ? (
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold tracking-wider uppercase rounded-full border border-emerald-400/30">
                      {brand.warranty_months_default} Months Warranty
                    </span>
                  ) : null}
                </div>

                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
                  {brand.name}
                </h1>

                <p className="text-slate-300 text-xs sm:text-sm max-w-3xl line-clamp-3 leading-relaxed font-medium">
                  {brand.short_description ||
                    brand.full_description ||
                    brand.description ||
                    `Explore 100% genuine ${brand.name} clinical equipment, instruments, and supplies directly from authorized channels.`}
                </p>

                {/* Contacts & Website */}
                <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300">
                  {brand.website_url && (
                    <a
                      href={brand.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-white transition-colors text-[#00a3b4] font-semibold"
                    >
                      <Globe className="w-3.5 h-3.5" /> Official Website <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {brand.support_email && (
                    <span className="inline-flex items-center gap-1.5 opacity-80">
                      <Mail className="w-3.5 h-3.5 text-amber-400" /> {brand.support_email}
                    </span>
                  )}
                  {brand.support_phone && (
                    <span className="inline-flex items-center gap-1.5 opacity-80">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" /> {brand.support_phone}
                    </span>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : null}

      {!error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500 mb-6">
            <Link href="/" className="hover:text-[#006670] transition-colors font-medium">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link href="/brands" className="hover:text-[#006670] transition-colors font-medium">
              Brands
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-900">{brand?.name || slug}</span>
          </nav>

          {/* Main Grid: Sidebar Filters + Products */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            
            {/* Sidebar (Brand filter hidden because context is locked to this brand) */}
            <ListingFilterSidebar
              categories={categoriesList}
              selectedCategory={urlCategory}
              onSelectCategory={handleSelectCategory}
              hideBrandFilter={true}
              minPrice={urlMinPrice}
              maxPrice={urlMaxPrice}
              onPriceChange={handlePriceChange}
              minRating={urlMinRating}
              onRatingChange={handleRatingChange}
              inStockOnly={urlInStock}
              onToggleInStock={handleToggleInStock}
              hasActiveFilters={activeChips.length > 0}
              onClearAll={handleClearAll}
            />

            {/* Mobile Drawer */}
            <ListingFilterDrawer
              isOpen={isMobileDrawerOpen}
              onClose={() => setIsMobileDrawerOpen(false)}
              totalCount={meta.count}
              categories={categoriesList}
              selectedCategory={urlCategory}
              onSelectCategory={handleSelectCategory}
              hideBrandFilter={true}
              minPrice={urlMinPrice}
              maxPrice={urlMaxPrice}
              onPriceChange={handlePriceChange}
              minRating={urlMinRating}
              onRatingChange={handleRatingChange}
              inStockOnly={urlInStock}
              onToggleInStock={handleToggleInStock}
              hasActiveFilters={activeChips.length > 0}
              onClearAll={handleClearAll}
            />

            {/* Product Section */}
            <main className="lg:col-span-3 flex flex-col">
              <ListingToolbar
                totalCount={meta.count}
                itemName={`${brand?.name || 'Brand'} Products`}
                isLoading={productsLoading}
                onOpenMobileFilters={() => setIsMobileDrawerOpen(true)}
                activeFiltersCount={activeChips.length}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                sortValue={urlOrdering}
                sortOptions={defaultProductSortOptions}
                onSortChange={handleSortChange}
              />

              <ActiveFilterChips chips={activeChips} onClearAll={handleClearAll} />

              {productsLoading ? (
                <div
                  className={`grid gap-4 sm:gap-6 ${
                    viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'
                  }`}
                >
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm animate-pulse flex flex-col justify-between h-[340px]"
                    >
                      <div className="w-full aspect-square bg-slate-200 rounded-xl mb-3" />
                      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-slate-100 rounded w-1/2 mb-4" />
                      <div className="h-9 bg-slate-200 rounded-xl w-full" />
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                /* Genuine Empty State */
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm my-6">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-2">No Products Match Filters</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mb-6">
                    No products found under {brand?.name} matching your active filters. Try clearing your filters.
                  </p>
                  {activeChips.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Brand Filters</span>
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className={`grid gap-4 sm:gap-6 ${
                    viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'
                  }`}
                >
                  {products.map((prod) => {
                    const wishlisted = isInWishlist(prod.slug || prod.id);
                    const isOutOfStock =
                      prod.inventory?.stock_status === 'out_of_stock' ||
                      (prod.inventory && prod.inventory.available_stock <= 0 && !prod.inventory.allow_backorders);
                    const mrp = prod.pricing ? parseFloat(prod.pricing.mrp || '0') : 0;
                    const price = prod.pricing ? parseFloat(prod.pricing.effective_price || prod.pricing.selling_price || '0') : parseFloat(prod.price || '0');
                    const discount =
                      prod.pricing?.discount_percentage ||
                      (mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0);
                    const rawImg = prod.primary_image || (prod.images && prod.images[0]?.image) || prod.image;
                    const imgUrl = getAbsoluteImageUrl(rawImg) || '/images/nsk_handpiece_portrait.png';

                    return (
                      <div
                        key={prod.id}
                        onClick={() => router.push(`/products/${prod.slug || prod.id}`)}
                        className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden relative group cursor-pointer"
                      >
                        {/* Top Badges & Wishlist */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
                          {discount > 0 ? (
                            <span className="bg-[#006670] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md shadow-sm pointer-events-auto">
                              {discount}% OFF
                            </span>
                          ) : (
                            <span />
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleToggleWishlist(e, prod)}
                            className="pointer-events-auto p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white text-slate-400 hover:text-rose-500 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                            aria-label="Toggle Wishlist"
                          >
                            <Heart
                              className={`w-4 h-4 transition-all ${
                                wishlisted ? 'fill-rose-500 stroke-rose-500' : 'stroke-slate-400 fill-none'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Image Container */}
                        <div className="w-full aspect-square bg-slate-50 p-4 flex items-center justify-center overflow-hidden relative border-b border-slate-100">
                          <img
                            src={imgUrl}
                            alt={prod.name}
                            loading="lazy"
                            className="w-full h-full max-h-full max-w-full object-contain object-center group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>

                        {/* Content */}
                        <div className="p-4 flex flex-col justify-between flex-grow">
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              <span className="truncate max-w-[110px] text-[#006670]">
                                {brand?.name || prod.brand_name}
                              </span>
                              {prod.category_name && (
                                <span className="truncate max-w-[90px]">{prod.category_name}</span>
                              )}
                            </div>

                            <h3 className="font-bold text-xs sm:text-sm text-slate-800 line-clamp-2 leading-snug group-hover:text-[#006670] transition-colors mb-2">
                              {prod.name}
                            </h3>
                          </div>

                          <div>
                            <div className="flex items-center justify-between my-2">
                              {(() => {
                                const ratingVal = prod.average_rating ? parseFloat(prod.average_rating) : (prod.rating ? parseFloat(prod.rating) : 0);
                                const reviewCount = prod.total_reviews ? parseInt(prod.total_reviews) : (prod.reviews ? parseInt(prod.reviews) : 0);
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

                            <div className="mt-3 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                              <div>
                                <span className="text-sm sm:text-base font-black text-slate-900">
                                  ₹{price.toLocaleString('en-IN')}
                                </span>
                                {mrp > price && (
                                  <span className="text-[11px] text-slate-400 line-through ml-1.5 font-medium">
                                    ₹{mrp.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={(e) => handleAddToCart(e, prod)}
                                disabled={isOutOfStock}
                                className="w-full py-2 bg-slate-100 hover:bg-[#006670] text-slate-700 hover:text-white disabled:opacity-50 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" /> Bag
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleBuyNow(e, prod)}
                                disabled={isOutOfStock}
                                className="w-full py-2 bg-[#006670] hover:bg-[#005159] text-white disabled:opacity-50 text-[11px] font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Zap className="w-3.5 h-3.5 fill-current" /> Buy
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <ListingPagination
                currentPage={meta.page || urlPage}
                totalPages={meta.total_pages || 1}
                totalCount={meta.count || 0}
                pageSize={meta.page_size || 24}
                onPageChange={handlePageChange}
                itemName={`${brand?.name || 'Brand'} Products`}
              />
            </main>
          </div>
        </div>
      )}
    </div>
  );
}
