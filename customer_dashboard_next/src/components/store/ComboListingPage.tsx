'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Sparkles, Heart, ShoppingCart, ShoppingBag, Zap, Eye, Search, Layers } from 'lucide-react';
import { api, getAbsoluteImageUrl } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useWishlist } from '@/contexts/WishlistContext';
import { useStore } from '@/contexts/StoreContext';
import type { CartItem } from '../../types/pendingAction';
import ListingToolbar, { SortOption } from './listing/ListingToolbar';
import ActiveFilterChips from './listing/ActiveFilterChips';
import ListingFilterSidebar from './listing/ListingFilterSidebar';
import ListingFilterDrawer from './listing/ListingFilterDrawer';

interface ComboListingPageProps {
  setCurrentView: (view: any) => void;
  setActiveComboId: (id: string) => void;
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  wishlistItems: CartItem[];
  setWishlistItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  showToast: (msg: string) => void;
  onOpenLoginModal: () => void;
}

const comboSortOptions: SortOption[] = [
  { value: 'newest', label: 'New Arrivals' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'discount', label: 'Biggest Savings' },
];

const ComboListingPage: React.FC<ComboListingPageProps> = ({
  setCurrentView,
  setActiveComboId,
  setCartItems,
  wishlistItems,
  setWishlistItems,
  showToast,
  onOpenLoginModal
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const store = useStore();
  const { isInWishlist, toggleWishlist: dbToggleWishlist } = useWishlist();
  const { user, isAuthenticated } = useAuth();
  const isDealer = user?.role === 'dealer';

  const [combos, setCombos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // URL-driven filter states
  const searchQuery = searchParams.get('q') || '';
  const sortBy = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';
  const inStockOnly = searchParams.get('in_stock') === 'true';

  const [bannerSettings, setBannerSettings] = useState<{
    badge_text: string;
    title: string;
    description: string;
    banner_image: string | null;
  }>({
    badge_text: 'SUPER SAVER BUNDLES',
    title: 'Premium Combo Deals',
    description: 'Equip your clinical workflows with carefully curated packages of leading tools. Save big vs buying individual components.',
    banner_image: null,
  });

  // URL updater
  const updateUrlParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === undefined) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const queryString = params.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
  };

  useEffect(() => {
    api.get('combos/banner/')
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setBannerSettings(res.data.data);
        }
      })
      .catch(err => console.error('Failed to load combo banner settings:', err));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get('combos/')
      .then(res => {
        const data = res.data?.data ?? res.data?.results ?? res.data ?? [];
        if (Array.isArray(data)) {
          setCombos(data);
        }
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const isWishlisted = (id: string) => {
    return isInWishlist(id) || wishlistItems.some(item => item.id === id);
  };

  const toggleWishlist = async (combo: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      onOpenLoginModal();
      return;
    }

    const price = parseFloat(isDealer && combo.dealer_price ? combo.dealer_price : combo.effective_price);
    const itemData = {
      id: combo.id,
      name: combo.title,
      slug: combo.slug,
      price: price,
      image: getAbsoluteImageUrl(combo.thumbnail) || '/images/bestseller_scaler.png',
      category_name: 'Combo Deal',
    };

    if (dbToggleWishlist) {
      await dbToggleWishlist(itemData);
    } else {
      const isFav = isWishlisted(combo.id);
      if (isFav) {
        setWishlistItems(prev => prev.filter(item => item.id !== combo.id));
        showToast('Removed from Wishlist');
      } else {
        const item: CartItem = {
          id: combo.id,
          name: combo.title,
          category: 'Combo Deal',
          price: price,
          qty: 1,
          image: getAbsoluteImageUrl(combo.thumbnail) || '/images/bestseller_scaler.png',
          originalPrice: parseFloat(combo.original_price),
          isCombo: true,
          slug: combo.slug
        };
        setWishlistItems(prev => [...prev, item]);
        showToast('Added to Wishlist');
      }
    }
  };

  const handleAddToCart = (combo: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      onOpenLoginModal();
      return;
    }

    if (combo.inventory <= 0) {
      showToast('Item is out of stock');
      return;
    }

    const price = parseFloat(isDealer && combo.dealer_price ? combo.dealer_price : combo.effective_price);
    const item: CartItem = {
      id: combo.id,
      name: combo.title,
      category: 'Combo Deal',
      price: price,
      qty: 1,
      image: getAbsoluteImageUrl(combo.thumbnail) || '/images/bestseller_scaler.png',
      originalPrice: parseFloat(combo.original_price),
      isCombo: true,
      slug: combo.slug
    };

    if (store?.addItemToCart) {
      store.addItemToCart(item);
    } else {
      setCartItems(prev => {
        const existing = prev.find(i => i.id === combo.id);
        if (existing) {
          return prev.map(i => i.id === combo.id ? { ...i, qty: i.qty + 1 } : i);
        }
        return [...prev, item];
      });
    }
    showToast('Added to Cart');
  };

  const handleBuyNow = (combo: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      onOpenLoginModal();
      return;
    }

    if (combo.inventory <= 0) {
      showToast('Item is out of stock');
      return;
    }

    const price = parseFloat(isDealer && combo.dealer_price ? combo.dealer_price : combo.effective_price);
    const item: CartItem = {
      id: combo.id,
      name: combo.title,
      category: 'Combo Deal',
      price: price,
      qty: 1,
      image: getAbsoluteImageUrl(combo.thumbnail) || '/images/bestseller_scaler.png',
      originalPrice: parseFloat(combo.original_price),
      isCombo: true,
      slug: combo.slug
    };

    if (store?.handleBuyNowDirect) {
      store.handleBuyNowDirect(item);
    } else {
      setCartItems(prev => {
        const existing = prev.find(i => i.id === combo.id);
        if (existing) {
          return prev.map(i => i.id === combo.id ? { ...i, qty: i.qty + 1 } : i);
        }
        return [...prev, item];
      });
      router.push('/checkout');
    }
  };

  // Filter and Sort calculation
  const displayList = useMemo(() => {
    let result = [...combos];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.short_description && c.short_description.toLowerCase().includes(q))
      );
    }

    // Min Price
    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        result = result.filter(c => {
          const price = parseFloat(isDealer && c.dealer_price ? c.dealer_price : c.effective_price);
          return price >= min;
        });
      }
    }

    // Max Price
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        result = result.filter(c => {
          const price = parseFloat(isDealer && c.dealer_price ? c.dealer_price : c.effective_price);
          return price <= max;
        });
      }
    }

    // Stock Filter
    if (inStockOnly) {
      result = result.filter(c => c.inventory > 0);
    }

    // Sort
    result.sort((a, b) => {
      const priceA = parseFloat(isDealer && a.dealer_price ? a.dealer_price : a.effective_price);
      const priceB = parseFloat(isDealer && b.dealer_price ? b.dealer_price : b.effective_price);

      if (sortBy === 'price-asc') return priceA - priceB;
      if (sortBy === 'price-desc') return priceB - priceA;
      if (sortBy === 'discount') {
        const discA = a.discount_percentage || 0;
        const discB = b.discount_percentage || 0;
        return discB - discA;
      }
      // default newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [combos, searchQuery, minPrice, maxPrice, inStockOnly, sortBy, isDealer]);

  const activeFilterCount = (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (inStockOnly ? 1 : 0) + (searchQuery ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  const activeChips = useMemo(() => {
    const list: any[] = [];
    if (searchQuery) {
      list.push({
        id: 'search',
        label: `"${searchQuery}"`,
        type: 'other',
        onRemove: () => updateUrlParams({ q: null }),
      });
    }
    if (minPrice || maxPrice) {
      list.push({
        id: 'price',
        label: `₹${minPrice || '0'} - ₹${maxPrice || '∞'}`,
        type: 'price',
        onRemove: () => updateUrlParams({ min_price: null, max_price: null }),
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
    return list;
  }, [searchQuery, minPrice, maxPrice, inStockOnly]);

  const handleClearAll = () => {
    updateUrlParams({
      q: null,
      min_price: null,
      max_price: null,
      in_stock: null,
    });
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-20 select-none text-left pt-[108px] lg:pt-[180px]">
      {/* Hero Banner Section */}
      <div 
        className="relative bg-[#0f172a] text-white py-14 px-6 md:px-12 overflow-hidden shadow-md"
        style={bannerSettings.banner_image ? {
          backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.65)), url(${getAbsoluteImageUrl(bannerSettings.banner_image)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {}}
      >
        {!bannerSettings.banner_image && (
          <>
            <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#006670]/10 rounded-full blur-[120px] pointer-events-none" />
          </>
        )}

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-black tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5" /> {bannerSettings.badge_text}
            </div>
            <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight text-white leading-tight">
              {bannerSettings.title}
            </h1>
            <p className="text-sm md:text-base text-slate-400 font-medium leading-relaxed">
              {bannerSettings.description}
            </p>
          </div>

          {/* Quick Search in Banner */}
          <div className="w-full md:w-80">
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search combo deals..."
                value={searchQuery}
                onChange={(e) => updateUrlParams({ q: e.target.value || null })}
                className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-slate-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white/20 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          <ListingFilterSidebar
            hideCategoryFilter={true}
            hideBrandFilter={true}
            hideRatingFilter={true}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onPriceChange={(min, max) => updateUrlParams({ min_price: min, max_price: max })}
            inStockOnly={inStockOnly}
            onToggleInStock={() => updateUrlParams({ in_stock: inStockOnly ? null : 'true' })}
            hasActiveFilters={hasActiveFilters}
            onClearAll={handleClearAll}
            className="lg:col-span-1"
          />

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-5">
            {/* Unified Toolbar */}
            <ListingToolbar
              totalCount={displayList.length}
              itemName="combos"
              sortValue={sortBy}
              onSortChange={(val) => updateUrlParams({ sort: val })}
              sortOptions={comboSortOptions}
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

            {/* List Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(idx => (
                  <div key={idx} className="h-[430px] rounded-3xl border border-slate-200/50 bg-white p-5 space-y-4 animate-pulse">
                    <div className="w-full aspect-square bg-slate-100 rounded-2xl" />
                    <div className="h-4 bg-slate-100 w-2/3 rounded-full" />
                    <div className="h-3 bg-slate-100 w-1/2 rounded-full" />
                    <div className="h-6 bg-slate-100 w-1/3 rounded-full" />
                  </div>
                ))}
              </div>
            ) : displayList.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/60 shadow-xs">
                <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-800">No Combo Deals Found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                  {hasActiveFilters ? 'No combo bundles match your selected filters.' : 'There are currently no active combo deals.'}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="mt-5 px-5 py-2.5 bg-[#006670] hover:bg-[#004e56] text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6' : 'space-y-4'}>
                {displayList.map(combo => {
                  const activePrice = parseFloat(isDealer && combo.dealer_price ? combo.dealer_price : combo.effective_price);
                  const originalPriceVal = parseFloat(combo.original_price);
                  const youSaveVal = originalPriceVal - activePrice;
                  const discountPct = originalPriceVal > 0 ? Math.round((youSaveVal / originalPriceVal) * 100) : 0;
                  const hasOffer = combo.is_offer_active;
                  const isOutOfStock = combo.inventory <= 0;
                  const wishlisted = isWishlisted(combo.id);

                  if (viewMode === 'list') {
                    return (
                      <div
                        key={combo.id}
                        onClick={() => router.push(`/combo-deals/${combo.slug}`)}
                        className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row items-center gap-4 cursor-pointer group text-left relative"
                      >
                        <div className="w-32 h-32 bg-slate-50 rounded-xl p-2 shrink-0 flex items-center justify-center border border-slate-100 relative overflow-hidden">
                          {combo.thumbnail ? (
                            <img
                              src={getAbsoluteImageUrl(combo.thumbnail)}
                              alt={combo.title}
                              className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <Sparkles className="w-8 h-8 text-slate-300" />
                          )}
                          <span className="absolute top-2 left-2 bg-[#006670] text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow-xs">
                            COMBO
                          </span>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                            <span className="text-[#006670]">FAAZO EXCLUSIVE</span>
                            <span>•</span>
                            <span>{combo.combo_products?.length || 0} Products</span>
                          </div>
                          <h3 className="text-sm font-black text-slate-900 group-hover:text-[#006670] transition-colors line-clamp-1">
                            {combo.title}
                          </h3>
                          <div className="flex items-center gap-2 pt-1">
                            <span className={`text-[10px] font-bold ${isOutOfStock ? 'text-rose-500' : combo.inventory > 5 ? 'text-emerald-600' : 'text-amber-500'}`}>
                              {isOutOfStock ? 'Out of Stock' : combo.inventory > 5 ? 'In Stock' : 'Low Stock'}
                            </span>
                            {originalPriceVal > activePrice && (
                              <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                SAVE {discountPct}% (Save ₹{youSaveVal.toLocaleString('en-IN')})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-between sm:border-l sm:border-slate-100 sm:pl-4 space-y-3 w-full sm:w-auto">
                          <div className="text-right">
                            <div className="text-base sm:text-lg font-black text-[#006670]">
                              ₹{activePrice.toLocaleString('en-IN')}
                            </div>
                            {originalPriceVal > activePrice && (
                              <div className="text-xs text-slate-400 line-through font-semibold">
                                ₹{originalPriceVal.toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={(e) => toggleWishlist(combo, e)}
                              className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-colors cursor-pointer"
                              title="Toggle Wishlist"
                            >
                              <Heart className={`w-4 h-4 ${wishlisted ? 'fill-rose-500 text-rose-500 stroke-rose-500' : 'fill-none stroke-slate-400'}`} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleAddToCart(combo, e)}
                              disabled={isOutOfStock}
                              className="px-3 py-2 bg-slate-100 hover:bg-[#E6F2F2] text-slate-700 hover:text-[#006670] font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>Bag</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleBuyNow(combo, e)}
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

                  // Grid View Card
                  return (
                    <div
                      key={combo.id}
                      onClick={() => router.push(`/combo-deals/${combo.slug}`)}
                      className="group relative bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl sm:rounded-[24px] p-2.5 sm:p-4 shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer min-h-0 overflow-hidden no-underline block"
                    >
                      <div>
                        {/* Badge & Wishlist Button */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[8px] sm:text-[9px] font-black bg-[#006670] text-white uppercase tracking-wider shadow-xs pointer-events-auto">
                              COMBO DEAL
                            </span>
                            {hasOffer && (
                              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[8px] sm:text-[9px] font-black bg-teal-50 text-teal-700 border border-teal-200 uppercase tracking-wider pointer-events-auto">
                                CAMPAIGN
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => toggleWishlist(combo, e)}
                            className="pointer-events-auto p-1.5 sm:p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white text-slate-400 hover:text-rose-500 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                            aria-label="Toggle Wishlist"
                          >
                            <Heart
                              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all ${
                                wishlisted
                                  ? 'fill-rose-500 stroke-rose-500 text-rose-500'
                                  : 'stroke-slate-400 fill-none text-slate-400'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Image */}
                        <div className="relative w-full aspect-square rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center p-2 mb-2.5 sm:mb-4 overflow-hidden">
                          {combo.thumbnail ? (
                            <img
                              src={getAbsoluteImageUrl(combo.thumbnail)}
                              alt={combo.title}
                              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <Sparkles className="w-8 h-8 text-slate-300" />
                          )}
                        </div>

                        {/* Metadata */}
                        <div className="space-y-0.5 sm:space-y-1 text-left">
                          <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">FAAZO EXCLUSIVE</p>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 leading-snug tracking-tight">
                            {combo.title}
                          </h3>
                          <p className="text-[10px] sm:text-[11px] font-semibold text-teal-600 truncate">
                            {combo.combo_products?.length || 0} products included
                          </p>
                        </div>
                      </div>

                      {/* Pricing and Action Buttons */}
                      <div className="space-y-2 mt-2.5 sm:mt-3 text-left">
                        <div>
                          <div className="flex items-baseline gap-1 sm:gap-1.5 flex-wrap">
                            <span className="text-sm sm:text-lg font-black text-slate-900">
                              ₹{activePrice.toLocaleString('en-IN')}
                            </span>
                            {originalPriceVal > activePrice && (
                              <span className="text-[10px] sm:text-xs text-slate-400 line-through font-semibold">
                                ₹{originalPriceVal.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                          {originalPriceVal > activePrice && (
                            <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[8px] sm:text-[10px] font-black tracking-wide text-rose-600 bg-rose-50 px-1 sm:px-1.5 py-0.5 rounded">
                                SAVE {discountPct}%
                              </span>
                              <span className="text-[8px] sm:text-[10px] font-bold text-slate-400">
                                Save ₹{youSaveVal.toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold">
                          <span className={isOutOfStock ? 'text-rose-500' : combo.inventory > 5 ? 'text-emerald-600' : 'text-amber-500'}>
                            {isOutOfStock ? 'Out of Stock' : combo.inventory > 5 ? 'In Stock' : 'Low Stock'}
                          </span>
                        </div>

                        {/* Full Action Buttons: Bag & Buy */}
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={(e) => handleAddToCart(combo, e)}
                            disabled={isOutOfStock}
                            className="py-1.5 sm:py-2 px-1.5 sm:px-2 bg-slate-100 hover:bg-[#E6F2F2] text-slate-700 hover:text-[#006670] font-bold text-[11px] sm:text-xs rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Bag</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleBuyNow(combo, e)}
                            disabled={isOutOfStock}
                            className="py-1.5 sm:py-2 px-1.5 sm:px-2 bg-[#006670] hover:bg-[#004e56] text-white font-black text-[11px] sm:text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                          >
                            <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                            <span>Buy</span>
                          </button>
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
        hideCategoryFilter={true}
        hideBrandFilter={true}
        hideRatingFilter={true}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onPriceChange={(min, max) => updateUrlParams({ min_price: min, max_price: max })}
        inStockOnly={inStockOnly}
        onToggleInStock={() => updateUrlParams({ in_stock: inStockOnly ? null : 'true' })}
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
        totalCount={displayList.length}
      />
    </div>
  );
};

export default ComboListingPage;
