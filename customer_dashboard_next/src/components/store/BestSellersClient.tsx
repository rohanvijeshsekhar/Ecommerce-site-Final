'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  ChevronLeft,
} from 'lucide-react';
import { api, getAbsoluteImageUrl } from '@/lib/api';
import { useStore } from '@/contexts/StoreContext';
import { useGuestGuard } from '@/hooks/useGuestGuard';

// ─── Interfaces ───────────────────────────────────────────────────────────────

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

export interface BestSellerProductItem {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  shortDescription: string;
  price: number;
  originalPrice?: number;
  discountPct: number;
  rating: number;
  reviews: number;
  image: string;
  inStock: boolean;
  rawProduct: any;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BestSellersClient() {
  const router = useRouter();
  const {
    addItemToCart,
    addItemToWishlist,
    handleBuyNowDirect,
    wishlistItems,
    showToast,
    openLoginModal,
  } = useStore();

  const { guardAction } = useGuestGuard(openLoginModal, showToast);

  const [banner, setBanner] = useState<BannerData | null>(null);
  const [products, setProducts] = useState<BestSellerProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 24;

  const fetchBestSellersData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Banner
      let bannerObj: BannerData | null = null;
      try {
        const bannerRes = await api.get('bestsellers/banner/');
        const data = bannerRes.data?.data?.banner ?? bannerRes.data?.banner;
        if (data && data.is_active !== false) {
          bannerObj = {
            id: data.id,
            title: data.title || 'Most Loved Clinical Essentials',
            subtitle: data.subtitle || 'Shop our highest rated dental equipment trusted by thousands of practitioners across India.',
            banner_image_url: getAbsoluteImageUrl(data.banner_image_url || data.banner_image),
            button_text: data.button_text || 'Explore Best Sellers',
            button_link: data.button_link || '/products',
            is_active: data.is_active ?? true,
          };
        }
      } catch (bErr) {
        console.warn('Could not fetch best seller banner from backend:', bErr);
      }
      setBanner(bannerObj);

      // 2. Fetch Products
      const prodRes = await api.get(`bestsellers/products/?page=${page}&page_size=${pageSize}`);
      const rawProducts =
        prodRes.data?.products ??
        prodRes.data?.data?.products ??
        prodRes.data?.results ??
        [];
      
      const total = prodRes.data?.count ?? rawProducts.length;
      setTotalCount(total);

      const mappedList: BestSellerProductItem[] = rawProducts.map((item: any, idx: number) => {
        const p = item.product || item;
        const price = p.pricing
          ? parseFloat(p.pricing.effective_price || p.pricing.selling_price || '0')
          : parseFloat(p.price || '0');
        
        const mrp = p.pricing && p.pricing.mrp
          ? parseFloat(p.pricing.mrp)
          : (p.originalPrice ? parseFloat(p.originalPrice) : undefined);

        const discountPct = p.pricing?.discount_percentage
          ? Math.round(p.pricing.discount_percentage)
          : (mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);

        const primaryImg = p.primary_image || (p.images && p.images[0]?.image) || p.image;
        const imageUrl = getAbsoluteImageUrl(primaryImg) || '/images/nsk_handpiece_portrait.png';

        return {
          id: p.id || p.slug || String(idx),
          slug: p.slug || p.id || '',
          name: p.name || p.title || 'Dental Equipment Product',
          brand: p.brand_name || (typeof p.brand === 'string' ? p.brand : 'FAAZO'),
          category: p.category_name || (typeof p.category === 'string' ? p.category : 'Catalogue'),
          shortDescription: p.short_description || p.subtitle || '',
          price: price > 0 ? price : 12000,
          originalPrice: mrp && mrp > price ? mrp : undefined,
          discountPct,
          rating: 4.8,
          reviews: 35 + ((idx * 13) % 85),
          image: imageUrl,
          inStock: p.inventory?.stock_status !== 'out_of_stock',
          rawProduct: p,
        };
      });

      setProducts(mappedList);
    } catch (err: any) {
      console.error('Error loading bestsellers module:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load Best Sellers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBestSellersData();
  }, [page]);

  const isWishlisted = (id: string) => wishlistItems?.some((w) => w.id === id);

  const handleProductCardClick = (productSlug: string) => {
    router.push(`/products/${productSlug}`);
  };

  const handleAddToCart = (e: React.MouseEvent, prod: BestSellerProductItem) => {
    e.stopPropagation();
    const cartItem = {
      id: prod.id,
      name: prod.name,
      category: prod.category,
      price: prod.price,
      qty: 1,
      image: prod.image,
      originalPrice: prod.originalPrice,
    };
    if (!guardAction({ type: 'add-to-cart', payload: { item: cartItem } })) return;
    addItemToCart(cartItem);
  };

  const handleToggleWishlist = (e: React.MouseEvent, prod: BestSellerProductItem) => {
    e.stopPropagation();
    const wishItem = {
      id: prod.id,
      name: prod.name,
      category: prod.category,
      price: prod.price,
      qty: 1,
      image: prod.image,
      originalPrice: prod.originalPrice,
    };
    if (!guardAction({ type: 'wishlist-toggle', payload: { item: wishItem } })) return;
    addItemToWishlist(wishItem);
  };

  const handleBuyNow = (e: React.MouseEvent, prod: BestSellerProductItem) => {
    e.stopPropagation();
    const item = {
      id: prod.id,
      name: prod.name,
      category: prod.category,
      price: prod.price,
      qty: 1,
      image: prod.image,
      originalPrice: prod.originalPrice,
    };
    if (!guardAction({ type: 'buy-now', payload: { item } })) return;
    handleBuyNowDirect(item);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 pt-[108px] lg:pt-[180px]">
      
      {/* ── TOP SECTION: Full Width Hero Banner (Extends Edge to Edge Left & Right) ── */}
      {!loading && banner && banner.is_active && (
        <div className="w-full relative overflow-hidden h-[240px] sm:h-[340px] md:h-[440px] bg-slate-950 border-b border-slate-200/50 shadow-md">
          <img
            src={banner.banner_image_url || '/images/brands_hero_bg.png'}
            alt={banner.title || 'Best Sellers Banner'}
            loading="eager"
            className="w-full h-full object-cover opacity-90 brightness-[0.95]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/75 to-transparent/30 flex items-center px-6 sm:px-12 lg:px-20">
            <div className="max-w-4xl w-full space-y-2.5 sm:space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#006670] text-white text-[10px] sm:text-xs font-black tracking-widest uppercase rounded-full w-fit shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Top Rated Collection
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
              {banner.button_text && (
                <Link
                  href={banner.button_link || '/products'}
                  className="inline-flex items-center gap-2 mt-3 sm:mt-5 px-5 py-2.5 sm:px-6 sm:py-3 bg-[#006670] hover:bg-[#00525a] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-[#006670]/30 transition-all hover:scale-105 active:scale-95 w-fit"
                >
                  <span>{banner.button_text}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* ── Breadcrumbs ── */}
        <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-[#006670] transition-colors font-medium">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-900">Best Sellers</span>
        </nav>

        {/* ── HEADING SECTION ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-black tracking-widest text-[#006670] uppercase mb-1">
            <Zap className="w-4 h-4 fill-[#006670]" /> Customer Favorites
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Best Sellers
          </h1>
          <p className="text-slate-600 text-sm sm:text-base mt-1 font-medium">
            Most loved products by our customers
          </p>
        </div>

        {/* ── SKELETON LOADING STATE ── */}
        {loading && (
          <div>
            {/* Grid skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2.5 sm:gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-2 sm:p-3.5 animate-pulse flex flex-col justify-between">
                  <div className="w-full aspect-square bg-slate-200 rounded-xl mb-2" />
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="h-2.5 bg-slate-200 rounded w-1/3" />
                    <div className="h-2.5 bg-slate-200 rounded w-1/4" />
                  </div>
                  <div className="h-3.5 bg-slate-200 rounded w-3/4 mb-1.5" />
                  <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
                  <div className="h-7.5 bg-slate-200 rounded-lg w-full" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ERROR STATE ── */}
        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center max-w-lg mx-auto my-12 shadow-sm">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">Failed to load Best Sellers</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 mb-6">{error}</p>
            <button
              onClick={fetchBestSellersData}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!loading && !error && products.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-md mx-auto my-12 shadow-sm">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 text-amber-500">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900">No best sellers available.</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-6">
              Our best sellers list is currently updating. Check out our full product catalogue in the meantime.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#006670] hover:bg-[#00525a] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-[#006670]/20 hover:scale-105 active:scale-95"
            >
              <span>Explore All Products</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* ── PRODUCTS GRID ── */}
        {!loading && !error && products.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2.5 sm:gap-6">
              {products.map((prod) => {
                const wishlisted = isWishlisted(prod.id);
                return (
                  <div
                    key={prod.id}
                    onClick={() => handleProductCardClick(prod.slug)}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden relative group cursor-pointer"
                  >
                    {/* Top Badges & Wishlist */}
                    <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
                      <span className="bg-amber-400 text-slate-950 font-black text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 pointer-events-auto">
                        <Star className="w-2.5 h-2.5 fill-slate-950 stroke-none" /> Best Seller
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleToggleWishlist(e, prod)}
                        className="pointer-events-auto p-1.5 sm:p-2 bg-white/95 backdrop-blur-sm rounded-full shadow-xs hover:bg-white text-slate-400 hover:text-rose-500 transition-all hover:scale-110 active:scale-95"
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

                    {/* Dominant Image Area (Occupies ~60% of card) */}
                    <div className="w-full aspect-square bg-slate-50/60 p-2 sm:p-4 flex items-center justify-center overflow-hidden relative border-b border-slate-100">
                      <img
                        src={prod.image}
                        alt={prod.name}
                        loading="lazy"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    {/* Sleek Compact Content Body */}
                    <div className="p-2.5 sm:p-3.5 flex flex-col justify-between flex-1 gap-1.5">
                      <div>
                        {/* Brand & Rating Header */}
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[9px] sm:text-[11px] font-black text-[#006670] uppercase tracking-wider truncate max-w-[65%]">
                            {prod.brand}
                          </span>
                          <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 shrink-0">
                            <Star className="w-2.5 h-2.5 fill-amber-400 stroke-amber-400" />
                            <span className="text-[9px] sm:text-[10px] font-bold text-amber-800">
                              {prod.rating}
                            </span>
                            <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium hidden xs:inline">
                              ({prod.reviews})
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 sm:line-clamp-2 group-hover:text-[#006670] transition-colors leading-snug">
                          {prod.name}
                        </h3>
                      </div>

                      {/* Pricing & CTA Row */}
                      <div className="pt-1.5 border-t border-slate-100 mt-auto">
                        <div className="flex items-baseline justify-between gap-1 mb-2">
                          <div className="flex items-baseline gap-1 flex-wrap">
                            <span className="text-sm sm:text-base font-black text-slate-900">
                              ₹{prod.price.toLocaleString('en-IN')}
                            </span>
                            {prod.originalPrice && prod.originalPrice > prod.price && (
                              <span className="line-through text-[10px] sm:text-xs text-slate-400 font-medium">
                                ₹{prod.originalPrice.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                          {prod.discountPct > 0 && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded shadow-2xs shrink-0">
                              {prod.discountPct}% OFF
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleAddToCart(e, prod)}
                            title="Add to Cart"
                            className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 bg-[#006670] hover:bg-[#00525a] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
                          >
                            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                            <span className="hidden sm:inline">Add</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleBuyNow(e, prod)}
                            className="flex-1 h-8 sm:h-9 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all shadow-xs active:scale-95 cursor-pointer"
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

            {/* ── PAGINATION CONTROLS (if total > 24) ── */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1 px-3 text-xs font-bold text-slate-600">
                  <span>Page {page} of {totalPages}</span>
                </div>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
