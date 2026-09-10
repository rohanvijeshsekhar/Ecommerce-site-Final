'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ArrowLeft, Sparkles, Package, ShieldCheck, Heart, ShoppingCart, Check, Zap } from 'lucide-react';
import { api, getAbsoluteImageUrl } from '../../../../lib/api';
import { useStore } from '@/contexts/StoreContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useGuestGuard } from '@/hooks/useGuestGuard';
import ListingToolbar, { SortOption } from '@/components/store/listing/ListingToolbar';
import ActiveFilterChips from '@/components/store/listing/ActiveFilterChips';
import ListingFilterSidebar, { FilterItemOption } from '@/components/store/listing/ListingFilterSidebar';
import ListingFilterDrawer from '@/components/store/listing/ListingFilterDrawer';

interface ProductItem {
  id: string | number;
  product_id?: string | number;
  name?: string;
  product_name?: string;
  slug?: string;
  product_slug?: string;
  sku?: string;
  product_sku?: string;
  price?: number;
  product_price?: number;
  mrp?: number;
  product_mrp?: number;
  image?: string;
  product_image?: string;
  brand?: string;
  product_brand?: string;
  category?: string;
  product_category?: string;
  rating?: number;
  product_rating?: number;
  average_rating?: string | number;
  total_reviews?: number;
  reviews?: number;
  is_featured?: boolean;
  in_stock?: boolean;
}

interface SolutionDetailData {
  id: string | number;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  banner: string;
  thumbnail: string;
  product_count: number;
  products: ProductItem[];
  seo_title?: string;
}

const solutionSortOptions: SortOption[] = [
  { value: 'featured', label: 'Featured First' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
];

export default function SolutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;

  const { addItemToCart, handleBuyNowDirect, openLoginModal, showToast, cartItems } = useStore();
  const { guardAction } = useGuestGuard(openLoginModal, showToast);
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [solution, setSolution] = useState<SolutionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // URL state
  const searchQuery = searchParams.get('q') || '';
  const selectedCategory = searchParams.get('category') || '';
  const brandParam = searchParams.get('brand') || '';
  const selectedBrands = useMemo(() => brandParam ? brandParam.split(',').filter(Boolean) : [], [brandParam]);
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';
  const minRating = searchParams.get('min_rating') || '';
  const inStockOnly = searchParams.get('in_stock') === 'true';
  const sortBy = searchParams.get('sort') || 'featured';

  const updateUrlParams = (updates: Record<string, string | null>) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === undefined) {
        p.delete(key);
      } else {
        p.set(key, value);
      }
    });
    const queryString = p.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
  };

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.get(`solutions/${slug}/`)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        if (data && (data.title || data.slug)) {
          setSolution(data);
        } else {
          setSolution(null);
        }
      })
      .catch(() => {
        setSolution(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  // Extract available categories and brands from the solution's real products
  const { availableCategories, availableBrands } = useMemo(() => {
    if (!solution || !solution.products) return { availableCategories: [], availableBrands: [] };
    
    const catMap = new Map<string, number>();
    const brandMap = new Map<string, number>();

    solution.products.forEach((p) => {
      const cat = p.product_category || p.category;
      if (cat) catMap.set(cat, (catMap.get(cat) || 0) + 1);

      const br = p.product_brand || p.brand;
      if (br) brandMap.set(br, (brandMap.get(br) || 0) + 1);
    });

    const categories: FilterItemOption[] = Array.from(catMap.entries()).map(([name, count]) => ({
      id: name,
      slug: name,
      name,
      count,
    }));

    const brands: FilterItemOption[] = Array.from(brandMap.entries()).map(([name, count]) => ({
      id: name,
      slug: name,
      name,
      count,
    }));

    return { availableCategories: categories, availableBrands: brands };
  }, [solution]);

  // Filter and sort display products
  const displayProducts = useMemo(() => {
    if (!solution || !solution.products) return [];

    let filtered = solution.products.filter((p) => {
      const name = p.product_name || p.name || '';
      const sku = p.product_sku || p.sku || '';
      const brand = p.product_brand || p.brand || '';
      const category = p.product_category || p.category || '';
      const price = p.product_price || p.price || 0;
      const rating = typeof p.product_rating === 'number' ? p.product_rating : (typeof p.rating === 'number' ? p.rating : 0);
      const inStock = p.in_stock !== false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!name.toLowerCase().includes(q) && !sku.toLowerCase().includes(q) && !brand.toLowerCase().includes(q)) {
          return false;
        }
      }

      // Category
      if (selectedCategory && category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // Brand
      if (selectedBrands.length > 0 && !selectedBrands.some(b => b.toLowerCase() === brand.toLowerCase())) {
        return false;
      }

      // Price range
      if (minPrice && price < parseFloat(minPrice)) return false;
      if (maxPrice && price > parseFloat(maxPrice)) return false;

      // Rating
      if (minRating && rating < parseFloat(minRating)) return false;

      // Stock
      if (inStockOnly && !inStock) return false;

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'featured') {
        return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
      }
      const priceA = a.product_price || a.price || 0;
      const priceB = b.product_price || b.price || 0;
      if (sortBy === 'price-low') return priceA - priceB;
      if (sortBy === 'price-high') return priceB - priceA;
      if (sortBy === 'rating') {
        const ratingA = typeof a.product_rating === 'number' ? a.product_rating : (typeof a.rating === 'number' ? a.rating : 0);
        const ratingB = typeof b.product_rating === 'number' ? b.product_rating : (typeof b.rating === 'number' ? b.rating : 0);
        return ratingB - ratingA;
      }
      return 0;
    });

    return filtered;
  }, [solution, searchQuery, selectedCategory, selectedBrands, minPrice, maxPrice, minRating, inStockOnly, sortBy]);

  const activeFilterCount = (selectedCategory ? 1 : 0) +
    selectedBrands.length +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (minRating ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (searchQuery ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  const handleToggleBrand = (brandSlug: string) => {
    let next: string[];
    if (selectedBrands.includes(brandSlug)) {
      next = selectedBrands.filter((b) => b !== brandSlug);
    } else {
      next = [...selectedBrands, brandSlug];
    }
    updateUrlParams({ brand: next.length > 0 ? next.join(',') : null });
  };

  const activeChips = useMemo(() => {
    const list: any[] = [];
    if (selectedCategory) {
      list.push({
        id: 'category',
        label: `Category: ${availableCategories.find(c => c.slug === selectedCategory)?.name || selectedCategory}`,
        type: 'category',
        onRemove: () => updateUrlParams({ category: null }),
      });
    }
    selectedBrands.forEach((bSlug) => {
      const bName = availableBrands.find(b => b.slug === bSlug)?.name || bSlug;
      list.push({
        id: `brand-${bSlug}`,
        label: `Brand: ${bName}`,
        type: 'brand',
        onRemove: () => handleToggleBrand(bSlug),
      });
    });
    if (minPrice || maxPrice) {
      list.push({
        id: 'price',
        label: `₹${minPrice || '0'} - ₹${maxPrice || '∞'}`,
        type: 'price',
        onRemove: () => updateUrlParams({ min_price: null, max_price: null }),
      });
    }
    if (minRating) {
      list.push({
        id: 'rating',
        label: `${minRating}★ & above`,
        type: 'rating',
        onRemove: () => updateUrlParams({ min_rating: null }),
      });
    }
    if (inStockOnly) {
      list.push({
        id: 'stock',
        label: 'In Stock Only',
        type: 'stock',
        onRemove: () => updateUrlParams({ in_stock: null }),
      });
    }
    if (searchQuery) {
      list.push({
        id: 'search',
        label: `"${searchQuery}"`,
        type: 'other',
        onRemove: () => updateUrlParams({ q: null }),
      });
    }
    return list;
  }, [selectedCategory, availableCategories, selectedBrands, availableBrands, minPrice, maxPrice, minRating, inStockOnly, searchQuery]);

  const handleClearAll = () => {
    updateUrlParams({
      q: null,
      category: null,
      brand: null,
      min_price: null,
      max_price: null,
      min_rating: null,
      in_stock: null,
    });
  };

  const isInCart = (prodId: string | number) => {
    return cartItems.some(item => String(item.id) === String(prodId));
  };

  const handleAddToCart = (e: React.MouseEvent, p: ProductItem) => {
    e.stopPropagation();
    const price = p.product_price || p.price || 0;
    const cartItem = {
      id: String(p.product_id || p.id),
      name: p.product_name || p.name || 'Clinical Dental Product',
      category: p.product_category || p.category || 'Clinical Solutions',
      price: price,
      qty: 1,
      image: p.product_image || p.image || '/images/bestseller_handpiece.png',
      originalPrice: price,
      slug: p.product_slug || p.slug,
    };
    if (!guardAction({ type: 'add-to-cart', payload: { item: cartItem } })) return;
    addItemToCart(cartItem);
    showToast(`Added ${cartItem.name} to cart`);
  };

  const handleBuyNow = (e: React.MouseEvent, p: ProductItem) => {
    e.stopPropagation();
    const price = p.product_price || p.price || 0;
    const item = {
      id: String(p.product_id || p.id),
      name: p.product_name || p.name || 'Clinical Dental Product',
      category: p.product_category || p.category || 'Clinical Solutions',
      price: price,
      qty: 1,
      image: p.product_image || p.image || '/images/bestseller_handpiece.png',
      originalPrice: p.product_mrp || p.mrp || price,
      slug: p.product_slug || p.slug,
    };
    if (!guardAction({ type: 'buy-now', payload: { item } })) return;
    handleBuyNowDirect(item);
  };

  const handleToggleWishlist = (e: React.MouseEvent, prodId: string | number) => {
    e.stopPropagation();
    toggleWishlist(String(prodId));
  };

  const handleProductCardClick = (p: ProductItem) => {
    const target = p.product_slug || p.slug || p.product_id || p.id;
    if (target) {
      router.push(`/products/${target}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#005F63] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-600">Loading Clinical Solution...</p>
        </div>
      </div>
    );
  }

  if (!solution) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#F8FAFC] px-4 text-center">
        <h2 className="text-2xl font-black text-slate-800 mb-2">Solution Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">The requested clinical solution could not be retrieved.</p>
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#005F63] text-white font-bold text-sm shadow cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Homepage
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-[100px] lg:pt-[160px] pb-24 text-left select-none">
      {/* Banner & Header */}
      <div className="relative w-full h-[320px] md:h-[380px] bg-slate-950 overflow-hidden">
        <img
          src={getAbsoluteImageUrl(solution.banner || solution.thumbnail || '/images/hero1_ecommerce.png')}
          alt={solution.title}
          className="w-full h-full object-cover opacity-50 brightness-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        <div className="absolute inset-0 max-w-7xl mx-auto px-6 md:px-8 flex flex-col justify-between pt-5 pb-10 md:pb-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-bold transition-all border border-white/20 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Homepage</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-300/80">
              <span className="hover:text-white cursor-pointer" onClick={() => router.push('/')}>Home</span>
              <span>/</span>
              <span className="hover:text-white cursor-pointer" onClick={() => router.push('/#solutions')}>Solutions</span>
              <span>/</span>
              <span className="text-teal-300 font-semibold">{solution.title}</span>
            </div>
          </div>

          <div className="max-w-3xl -translate-y-2 md:-translate-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#005F63] text-white text-xs font-bold tracking-wider uppercase mb-2.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Clinical Treatment Solution</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight font-display mb-2.5">
              {solution.title}
            </h1>
            <p className="text-sm md:text-base font-medium text-slate-200 leading-relaxed mb-3.5">
              {solution.short_description}
            </p>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <Package className="w-4 h-4 text-teal-300" />
                {solution.product_count || solution.products?.length || 0} Clinical Products
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                100% Certified Genuine Equipment
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {solution.description && (
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#E2E8F0] shadow-xs mb-8">
            <h3 className="text-lg font-extrabold text-slate-800 tracking-tight mb-2 font-display">
              Clinical Workflow Overview
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed font-sans">
              {solution.description}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          <ListingFilterSidebar
            categories={availableCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => updateUrlParams({ category: cat })}
            brands={availableBrands}
            selectedBrands={selectedBrands}
            onToggleBrand={handleToggleBrand}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onPriceChange={(min, max) => updateUrlParams({ min_price: min, max_price: max })}
            minRating={minRating}
            onRatingChange={(rating) => updateUrlParams({ min_rating: rating })}
            inStockOnly={inStockOnly}
            onToggleInStock={() => updateUrlParams({ in_stock: inStockOnly ? null : 'true' })}
            hasActiveFilters={hasActiveFilters}
            onClearAll={handleClearAll}
            className="lg:col-span-1"
          />

          {/* Main Listing Section */}
          <div className="lg:col-span-3 space-y-5">
            {/* Unified Toolbar */}
            <ListingToolbar
              totalCount={displayProducts.length}
              itemName="products"
              sortValue={sortBy}
              onSortChange={(val) => updateUrlParams({ sort: val })}
              sortOptions={solutionSortOptions}
              onOpenMobileFilters={() => setMobileFilterOpen(true)}
              activeFiltersCount={activeFilterCount}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            {/* Active Chips */}
            <ActiveFilterChips
              chips={activeChips}
              onClearAll={handleClearAll}
            />

            {/* Product Grid */}
            {displayProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-[#E2E8F0] shadow-xs">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-800">No products found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  {hasActiveFilters ? 'No products match your selected filters in this clinical solution.' : 'There are no products currently mapped to this solution.'}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="mt-5 px-5 py-2.5 bg-[#005F63] hover:bg-[#004e56] text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {displayProducts.map((p) => {
                  const prodId = p.product_id || p.id;
                  const name = p.product_name || p.name || 'Clinical Dental Product';
                  const price = p.product_price || p.price || 0;
                  const mrp = p.product_mrp || p.mrp || 0;
                  const image = getAbsoluteImageUrl(p.product_image || p.image || '/images/bestseller_handpiece.png');
                  const brand = p.product_brand || p.brand || '';
                  const category = p.product_category || p.category || '';
                  const rating = typeof p.product_rating === 'number' ? p.product_rating : (typeof p.rating === 'number' ? p.rating : (p.average_rating ? parseFloat(String(p.average_rating)) : 0));
                  const totalReviews = p.total_reviews ? parseInt(String(p.total_reviews), 10) : (p.reviews ? parseInt(String(p.reviews), 10) : 0);
                  const inStock = p.in_stock !== false;
                  const alreadyInCart = isInCart(prodId);
                  const wishlisted = isInWishlist(String(prodId));
                  const discount = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleProductCardClick(p)}
                      className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs hover:shadow-[0_14px_30px_rgba(0,95,99,0.12)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden relative cursor-pointer group select-none"
                    >
                      {/* Top Badges & Wishlist */}
                      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {p.is_featured ? (
                            <span className="inline-flex items-center gap-1 bg-[#005F63] text-white text-[9.5px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs">
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              Featured
                            </span>
                          ) : discount > 0 ? (
                            <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
                              {discount}% OFF
                            </span>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleToggleWishlist(e, prodId)}
                          className="pointer-events-auto w-8 h-8 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-xs hover:shadow-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                          title={wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                          aria-label="Wishlist"
                        >
                          <Heart
                            className={`w-4 h-4 transition-colors ${
                              wishlisted ? 'fill-rose-500 stroke-rose-500 text-rose-500' : 'stroke-slate-400 fill-none'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Product Image */}
                      <div className="relative w-full aspect-square bg-slate-50/80 p-4 flex items-center justify-center overflow-hidden border-b border-slate-100">
                        <img
                          src={image}
                          alt={name}
                          loading="lazy"
                          className="w-full h-full max-h-full max-w-full object-contain object-center group-hover:scale-105 transition-transform duration-500 filter brightness-[1.02]"
                        />
                      </div>

                      {/* Card Content Body */}
                      <div className="p-4 flex flex-col justify-between flex-grow text-left">
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider mb-1 text-slate-400">
                            <span className="truncate max-w-[120px] text-[#006670]">{brand || 'FAAZO'}</span>
                            {category && <span className="truncate max-w-[100px]">{category}</span>}
                          </div>

                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 line-clamp-2 leading-snug group-hover:text-[#006670] transition-colors mb-2 font-display">
                            {name}
                          </h4>
                        </div>

                        <div>
                          <div className="flex items-center justify-between my-2">
                            {totalReviews > 0 && rating > 0 ? (
                              <div className="flex items-center gap-1 bg-amber-50/80 border border-amber-200/60 px-2 py-0.5 rounded-md text-[10px] font-bold text-amber-800">
                                <span>★</span>
                                <span>{rating.toFixed(1)}</span>
                                <span className="text-amber-600/70 font-normal">({totalReviews})</span>
                              </div>
                            ) : <span />}

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              inStock ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-rose-600 bg-rose-50 border border-rose-100'
                            }`}>
                              {inStock ? 'In Stock' : 'Out of Stock'}
                            </span>
                          </div>

                          <div className="pt-2.5 border-t border-slate-100 flex items-baseline justify-between mb-3">
                            <div>
                              <span className="text-base sm:text-lg font-black text-slate-900 font-display">
                                {price > 0 ? `₹${price.toLocaleString('en-IN')}` : 'Price on Request'}
                              </span>
                              {mrp > price && (
                                <span className="text-xs text-slate-400 line-through ml-2 font-medium">
                                  ₹{mrp.toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>

                            {discount > 0 && !p.is_featured && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                {discount}% OFF
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleAddToCart(e, p)}
                              disabled={!inStock}
                              className={`py-2 px-2.5 rounded-xl text-[11px] font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 shadow-xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                                alreadyInCart
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                  : 'bg-white border border-[#006670]/30 hover:border-[#006670] text-[#006670] hover:bg-[#006670]/5'
                              }`}
                            >
                              {alreadyInCart ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                                  <span>In Cart</span>
                                </>
                              ) : (
                                <>
                                  <ShoppingCart className="w-3.5 h-3.5 text-[#006670] stroke-[2.2]" />
                                  <span>Cart</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleBuyNow(e, p)}
                              disabled={!inStock}
                              className="py-2 px-2.5 bg-[#006670] hover:bg-[#004e56] text-white text-[11px] font-bold tracking-wider uppercase rounded-xl transition-all duration-200 shadow-xs hover:shadow-sm cursor-pointer active:scale-95 flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0" />
                              <span>Buy Now</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <ListingFilterDrawer
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        categories={availableCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => updateUrlParams({ category: cat })}
        brands={availableBrands}
        selectedBrands={selectedBrands}
        onToggleBrand={handleToggleBrand}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onPriceChange={(min, max) => updateUrlParams({ min_price: min, max_price: max })}
        minRating={minRating}
        onRatingChange={(rating) => updateUrlParams({ min_rating: rating })}
        inStockOnly={inStockOnly}
        onToggleInStock={() => updateUrlParams({ in_stock: inStockOnly ? null : 'true' })}
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
        totalCount={displayProducts.length}
      />
    </div>
  );
}
