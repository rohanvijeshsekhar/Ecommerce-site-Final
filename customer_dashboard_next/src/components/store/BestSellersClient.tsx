'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Star,
  ShoppingCart,
  Heart,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Zap,
  RefreshCw,
  RotateCcw,
  Package,
} from 'lucide-react';
import { api, getAbsoluteImageUrl } from '@/lib/api';
import { useStore } from '@/contexts/StoreContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useGuestGuard } from '@/hooks/useGuestGuard';
import ListingToolbar, { curatedSortOptions } from './listing/ListingToolbar';
import ActiveFilterChips, { ActiveChipItem } from './listing/ActiveFilterChips';
import ListingFilterSidebar, { FilterItemOption } from './listing/ListingFilterSidebar';
import ListingFilterDrawer from './listing/ListingFilterDrawer';
import ListingPagination from './listing/ListingPagination';

export interface BannerData {
  id?: number;
  title: string;
  subtitle: string;
  banner_image?: string;
  banner_image_url?: string;
  button_text: string;
  button_link: string;
  is_active: boolean;
}

export default function BestSellersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    addItemToCart,
    handleBuyNowDirect,
    showToast,
    openLoginModal,
  } = useStore();

  const { isInWishlist, toggleWishlist } = useWishlist();
  const { guardAction } = useGuestGuard(openLoginModal, showToast);

  // Read URL search params
  const urlCategory = searchParams.get('category') || '';
  const urlBrand = searchParams.get('brand') || '';
  const urlMinPrice = searchParams.get('min_price') || '';
  const urlMaxPrice = searchParams.get('max_price') || '';
  const urlMinRating = searchParams.get('min_rating') || '';
  const urlInStock = searchParams.get('in_stock') === 'true';
  const urlOrdering = searchParams.get('ordering') || 'default';
  const urlPage = parseInt(searchParams.get('page') || '1', 10) || 1;

  // View Mode & Drawer
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Data states
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<FilterItemOption[]>([]);
  const [brandsList, setBrandsList] = useState<FilterItemOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ count: 0, total_pages: 1, page: 1, page_size: 24 });

  // 1. Fetch Banner & Filter Option Lists
  useEffect(() => {
    // Fetch Banner
    api
      .get('bestsellers/banner/')
      .then((res) => {
        const data = res.data?.data?.banner ?? res.data?.banner;
        if (data && data.is_active !== false) {
          setBanner({
            id: data.id,
            title: data.title || 'Most Loved Clinical Essentials',
            subtitle:
              data.subtitle ||
              'Shop our highest rated dental equipment trusted by thousands of practitioners across India.',
            banner_image_url: getAbsoluteImageUrl(data.banner_image_url || data.banner_image),
            button_text: data.button_text || 'Explore Best Sellers',
            button_link: data.button_link || '#bestsellers-grid',
            is_active: data.is_active ?? true,
          });
        }
      })
      .catch((bErr) => console.warn('Banner fetch error:', bErr));

    // Fetch Categories & Brands
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

  // 2. Fetch Bestseller Products with backend filters & ordering
  useEffect(() => {
    setLoading(true);
    setError(null);

    const params: Record<string, any> = {
      page: urlPage,
      page_size: 24,
    };

    if (urlCategory) params.category = urlCategory;
    if (urlBrand) params.brand = urlBrand;
    if (urlMinPrice) params.min_price = urlMinPrice;
    if (urlMaxPrice) params.max_price = urlMaxPrice;
    if (urlMinRating) params.min_rating = urlMinRating;
    if (urlInStock) params.in_stock = 'true';
    if (urlOrdering) params.ordering = urlOrdering;

    api
      .get('bestsellers/products/', { params })
      .then((res) => {
        const rawProducts =
          res.data?.products ??
          res.data?.data?.products ??
          res.data?.results ??
          [];
        const count = res.data?.count ?? rawProducts.length;
        const totalPages = res.data?.total_pages ?? (Math.ceil(count / 24) || 1);

        setProducts(rawProducts);
        setMeta({
          count,
          total_pages: totalPages,
          page: res.data?.current_page ?? urlPage,
          page_size: 24,
        });
      })
      .catch((err) => {
        console.error('Failed to load best sellers:', err);
        setError('Failed to load Best Sellers.');
        setProducts([]);
      })
      .finally(() => {
        setLoading(false);
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

    if (!('page' in updates)) {
      current.delete('page');
    }

    const search = current.toString();
    const queryStr = search ? `?${search}` : '';
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/best-sellers';
    router.push(`${currentPath}${queryStr}`);
  };

  const handleSelectCategory = (slug: string | null) => {
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
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const handleClearAll = () => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/best-sellers';
    router.push(currentPath);
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

    selectedBrandsArray.forEach((bSlug) => {
      const brandObj = brandsList.find((b) => b.slug === bSlug);
      chips.push({
        id: `brand-${bSlug}`,
        label: `Brand: ${brandObj?.name || bSlug}`,
        type: 'brand',
        onRemove: () => handleToggleBrand(bSlug),
      });
    });

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
  }, [urlCategory, selectedBrandsArray, urlMinPrice, urlMaxPrice, urlMinRating, urlInStock, categoriesList, brandsList]);

  // Cart & Wishlist
  const handleProductCardClick = (p: any) => {
    const slug = p.product?.slug || p.slug || p.id;
    router.push(`/products/${slug}`);
  };

  const handleAddToCart = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    const p = item.product || item;
    const rawImg = p.primary_image || (p.images && p.images[0]?.image) || p.image;
    const price = p.pricing ? parseFloat(p.pricing.effective_price || p.pricing.selling_price || '0') : parseFloat(p.price || '0');
    const mrp = p.pricing ? parseFloat(p.pricing.mrp || '0') : undefined;

    const cartItem = {
      id: p.slug || p.id,
      name: p.name || item.name,
      category: p.category_name || (typeof p.category === 'string' ? p.category : 'Equipment'),
      price: price,
      qty: 1,
      image: getAbsoluteImageUrl(rawImg) || '/images/nsk_handpiece_portrait.png',
      originalPrice: mrp && mrp > price ? mrp : undefined,
      sku: p.sku,
    };
    if (!guardAction({ type: 'add-to-cart', payload: { item: cartItem } })) return;
    addItemToCart(cartItem);
    showToast(`Added ${cartItem.name} to Cart`);
  };

  const handleBuyNow = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    const p = item.product || item;
    const rawImg = p.primary_image || (p.images && p.images[0]?.image) || p.image;
    const price = p.pricing ? parseFloat(p.pricing.effective_price || p.pricing.selling_price || '0') : parseFloat(p.price || '0');
    const mrp = p.pricing ? parseFloat(p.pricing.mrp || '0') : undefined;

    const cartItem = {
      id: p.slug || p.id,
      name: p.name || item.name,
      category: p.category_name || (typeof p.category === 'string' ? p.category : 'Equipment'),
      price: price,
      qty: 1,
      image: getAbsoluteImageUrl(rawImg) || '/images/nsk_handpiece_portrait.png',
      originalPrice: mrp && mrp > price ? mrp : undefined,
      sku: p.sku,
    };
    if (!guardAction({ type: 'buy-now', payload: { item: cartItem } })) return;
    handleBuyNowDirect(cartItem);
  };

  const handleToggleWishlist = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    const p = item.product || item;
    const rawImg = p.primary_image || (p.images && p.images[0]?.image) || p.image;
    const price = p.pricing ? parseFloat(p.pricing.effective_price || p.pricing.selling_price || '0') : parseFloat(p.price || '0');
    const mrp = p.pricing ? parseFloat(p.pricing.mrp || '0') : undefined;

    const wishItem = {
      id: p.slug || p.id,
      name: p.name || item.name,
      category: p.category_name || 'Equipment',
      price: price,
      qty: 1,
      image: getAbsoluteImageUrl(rawImg) || '/images/nsk_handpiece_portrait.png',
      originalPrice: mrp && mrp > price ? mrp : undefined,
    };
    if (!guardAction({ type: 'wishlist-toggle', payload: { item: wishItem } })) return;
    await toggleWishlist(p);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 pt-[108px] lg:pt-[144px] select-none text-left font-sans text-slate-800">
      
      {/* ── TOP HERO BANNER ── */}
      {banner && banner.is_active && (
        <div className="w-full relative overflow-hidden h-[240px] sm:h-[320px] md:h-[400px] bg-slate-950 border-b border-slate-200/50 shadow-md">
          <img
            src={banner.banner_image_url || '/images/brands_hero_bg.png'}
            alt={banner.title || 'Best Sellers Banner'}
            loading="eager"
            className="w-full h-full object-cover opacity-90 brightness-[0.95]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/75 to-transparent/30 flex items-center px-6 sm:px-12 lg:px-20">
            <div className="max-w-4xl w-full space-y-2.5 sm:space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#006670] text-white text-[10px] sm:text-xs font-black tracking-widest uppercase rounded-full w-fit shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Admin Curated Selection
              </span>
              {banner.title && (
                <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
                  {banner.title}
                </h2>
              )}
              {banner.subtitle && (
                <p className="text-slate-200 text-xs sm:text-base md:text-lg max-w-xl line-clamp-2 font-medium leading-relaxed">
                  {banner.subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6" id="bestsellers-grid">
        
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-[#006670] transition-colors font-medium">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-900">Best Sellers</span>
        </nav>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          
          {/* Filter Sidebar */}
          <ListingFilterSidebar
            categories={categoriesList}
            selectedCategory={urlCategory}
            onSelectCategory={handleSelectCategory}
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
            hasActiveFilters={activeChips.length > 0}
            onClearAll={handleClearAll}
          />

          {/* Main Products Area */}
          <main className="lg:col-span-3 flex flex-col">
            <ListingToolbar
              totalCount={meta.count}
              itemName="Best Sellers"
              isLoading={loading}
              onOpenMobileFilters={() => setIsMobileDrawerOpen(true)}
              activeFiltersCount={activeChips.length}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortValue={urlOrdering}
              sortOptions={curatedSortOptions}
              onSortChange={handleSortChange}
            />

            <ActiveFilterChips chips={activeChips} onClearAll={handleClearAll} />

            {/* Content states */}
            {loading ? (
              <div
                className={`grid gap-3 sm:gap-5 ${
                  viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'
                }`}
              >
                {Array.from({ length: 6 }).map((_, idx) => (
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
            ) : error ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center max-w-lg mx-auto my-12 shadow-sm">
                <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900">Failed to load Best Sellers</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 mb-6">{error}</p>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center max-w-md mx-auto my-6 shadow-xs">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 text-amber-500">
                  <Package className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">No best sellers match your filters.</h3>
                <p className="text-xs text-slate-500 mb-6">
                  Try adjusting your filter criteria to view more curated best seller products.
                </p>
                {activeChips.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#006670] hover:bg-[#004e56] text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Filters</span>
                  </button>
                )}
              </div>
            ) : (
              <div
                className={`grid gap-3 sm:gap-5 ${
                  viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'
                }`}
              >
                {products.map((item) => {
                  const p = item.product || item;
                  const wishlisted = isInWishlist(p.slug || p.id);
                  const price = p.pricing ? parseFloat(p.pricing.effective_price || p.pricing.selling_price || '0') : parseFloat(p.price || '0');
                  const mrp = p.pricing ? parseFloat(p.pricing.mrp || '0') : undefined;
                  const discountPct =
                    p.pricing?.discount_percentage ||
                    (mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);
                  const primaryImg = p.primary_image || (p.images && p.images[0]?.image) || p.image;
                  const imageUrl = getAbsoluteImageUrl(primaryImg) || '/images/nsk_handpiece_portrait.png';
                  const isOutOfStock =
                    p.inventory?.stock_status === 'out_of_stock' ||
                    (p.inventory && p.inventory.available_stock <= 0 && !p.inventory.allow_backorders);

                  return (
                    <div
                      key={item.id || p.id}
                      onClick={() => handleProductCardClick(item)}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden relative group cursor-pointer"
                    >
                      {/* Top Badges & Wishlist */}
                      <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
                        <span className="bg-amber-400 text-slate-950 font-black text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 pointer-events-auto">
                          <Star className="w-2.5 h-2.5 fill-slate-950 stroke-none" /> Best Seller
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleToggleWishlist(e, item)}
                          className="pointer-events-auto p-1.5 sm:p-2 bg-white/95 backdrop-blur-sm rounded-full shadow-xs hover:bg-white text-slate-400 hover:text-rose-500 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                          aria-label="Toggle Wishlist"
                        >
                          <Heart
                            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all ${
                              wishlisted
                                ? 'fill-rose-500 stroke-rose-500'
                                : 'stroke-slate-400 fill-none'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Image Container */}
                      <div className="w-full aspect-square bg-slate-50/60 p-2 sm:p-4 flex items-center justify-center overflow-hidden relative border-b border-slate-100">
                        <img
                          src={imageUrl}
                          alt={p.name || item.name}
                          loading="lazy"
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      {/* Content Body */}
                      <div className="p-3 sm:p-4 flex flex-col justify-between flex-1 gap-1.5">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[9px] sm:text-[11px] font-black text-[#006670] uppercase tracking-wider truncate max-w-[65%]">
                              {p.brand_name || (typeof p.brand === 'string' ? p.brand : 'FAAZO')}
                            </span>
                            {(() => {
                              const ratingVal = p.average_rating ? parseFloat(p.average_rating) : 0;
                              const reviewCount = p.total_reviews ? parseInt(p.total_reviews) : 0;
                              if (reviewCount > 0 && ratingVal > 0) {
                                return (
                                  <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 shrink-0">
                                    <Star className="w-2.5 h-2.5 fill-amber-400 stroke-amber-400" />
                                    <span className="text-[9px] sm:text-[10px] font-bold text-amber-800">
                                      {ratingVal.toFixed(1)}
                                      <span className="text-slate-400 font-normal ml-0.5">({reviewCount})</span>
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>

                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-[#006670] transition-colors leading-snug">
                            {p.name || item.name}
                          </h3>
                        </div>

                        {/* Pricing & CTA */}
                        <div className="pt-1.5 border-t border-slate-100 mt-auto">
                          <div className="flex items-baseline justify-between gap-1 mb-2">
                            <div className="flex items-baseline gap-1 flex-wrap">
                              <span className="text-sm sm:text-base font-black text-slate-900">
                                ₹{price.toLocaleString('en-IN')}
                              </span>
                              {mrp && mrp > price && (
                                <span className="line-through text-[10px] sm:text-xs text-slate-400 font-medium">
                                  ₹{mrp.toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                            {discountPct > 0 && (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded shadow-2xs shrink-0">
                                {discountPct}% OFF
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleAddToCart(e, item)}
                              disabled={isOutOfStock}
                              title="Add to Cart"
                              className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 bg-[#006670] hover:bg-[#00525a] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer disabled:opacity-40"
                            >
                              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                              <span className="hidden sm:inline">Add</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleBuyNow(e, item)}
                              disabled={isOutOfStock}
                              className="flex-1 h-8 sm:h-9 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-40"
                            >
                              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 stroke-none shrink-0" />
                              <span className="whitespace-nowrap font-bold text-[11px] sm:text-xs">Buy Now</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            <ListingPagination
              currentPage={meta.page || urlPage}
              totalPages={meta.total_pages || 1}
              totalCount={meta.count || 0}
              pageSize={meta.page_size || 24}
              onPageChange={handlePageChange}
              itemName="Best Sellers"
            />
          </main>
        </div>
      </div>
    </div>
  );
}
