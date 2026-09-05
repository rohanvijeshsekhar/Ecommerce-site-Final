'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Star,
  Heart,
  ShoppingCart,
  Zap,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Package,
  Layers,
  SlidersHorizontal,
  RefreshCw,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  Award,
  ChevronLeft
} from 'lucide-react';
import { api, getAbsoluteImageUrl } from '@/lib/api';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/hooks/useAuth';

export interface ProductItem {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  brand_name?: string;
  category_name?: string;
  image?: string;
  primary_image?: { image: string } | string;
  images?: any[];
  pricing?: {
    mrp: number;
    selling_price: number;
    discount_percent?: number;
  };
  inventory?: {
    stock_quantity: number;
  };
  rating?: number;
}

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
  const store = useStore();
  const { isAuthenticated, setPendingAction } = useAuth();

  const [brand, setBrand] = useState<BrandDetailData | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [brandLoading, setBrandLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 12;

  // Filter & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);

  // 1. Fetch Brand Detail
  const fetchBrandDetail = async () => {
    setBrandLoading(true);
    setError(null);
    try {
      const res = await api.get(`brands/${slug}/`);
      if (res.data?.success && res.data?.data) {
        setBrand(res.data.data);
      } else if (res.data?.id || res.data?.name) {
        setBrand(res.data);
      } else {
        setError('Brand not found.');
      }
    } catch (err: any) {
      console.error('Failed to load brand detail:', err);
      if (err.response?.status === 404) {
        setError('Brand not found.');
      } else {
        setError('Unable to load brand information. Please try again.');
      }
    } finally {
      setBrandLoading(false);
    }
  };

  // 2. Fetch Brand Products
  const fetchBrandProducts = async () => {
    setProductsLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        page_size: pageSize,
        sort: selectedSort,
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (inStockOnly) {
        params.in_stock = 'true';
      }

      const res = await api.get(`brands/${slug}/products/`, { params });
      let prodList: any[] = [];

      if (res.data?.data && Array.isArray(res.data.data)) {
        prodList = res.data.data;
        setTotalPages(res.data.total_pages || 1);
        setTotalCount(res.data.count || prodList.length);
      } else if (res.data?.results && Array.isArray(res.data.results)) {
        prodList = res.data.results;
        setTotalPages(Math.ceil((res.data.count || prodList.length) / pageSize));
        setTotalCount(res.data.count || prodList.length);
      } else if (Array.isArray(res.data)) {
        prodList = res.data;
        setTotalPages(1);
        setTotalCount(prodList.length);
      }

      // Map raw API products to UI model
      const mapped = prodList.map(p => {
        let imgUrl = '/images/placeholder.jpg';
        if (p.primary_image) {
          imgUrl = typeof p.primary_image === 'object' ? p.primary_image.image : p.primary_image;
        } else if (p.images && p.images.length > 0) {
          imgUrl = p.images[0].image || p.images[0];
        } else if (p.image) {
          imgUrl = p.image;
        }

        return {
          id: String(p.id),
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          brand_name: p.brand_name || p.brand?.name || brand?.name,
          category_name: p.category_name || p.category?.name,
          image: getAbsoluteImageUrl(imgUrl),
          pricing: p.pricing ? {
            mrp: Number(p.pricing.mrp || p.pricing.selling_price || 0),
            selling_price: Number(p.pricing.selling_price || 0),
            discount_percent: p.pricing.discount_percent || 0,
          } : undefined,
          inventory: p.inventory ? {
            stock_quantity: Number(p.inventory.stock_quantity || 0),
          } : undefined,
          rating: p.rating || 4.5,
        };
      });

      setProducts(mapped);

      // Extract unique categories for filter
      const cats = Array.from(
        new Set(
          mapped.map(p => p.category_name).filter((c): c is string => Boolean(c))
        )
      );
      if (cats.length > 0) {
        setCategoriesList(cats);
      }
    } catch (err) {
      console.error('Failed to load brand products:', err);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrandDetail();
  }, [slug]);

  useEffect(() => {
    fetchBrandProducts();
  }, [slug, currentPage, selectedSort, selectedCategory, inStockOnly]);

  // Wishlist handler
  const isWishlisted = (id: string) => store.wishlistItems.some(item => String(item.id) === id);

  const handleToggleWishlist = (e: React.MouseEvent, prod: ProductItem) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setPendingAction({ type: 'open-wishlist' });
      store.openLoginModal();
      return;
    }
    if (isWishlisted(prod.id)) {
      store.setWishlistItems(store.wishlistItems.filter(i => String(i.id) !== prod.id));
      store.showToast(`Removed ${prod.name} from Wishlist`);
    } else {
      store.addItemToWishlist({
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        price: prod.pricing?.selling_price || 0,
        image: prod.image || '',
        category: prod.category_name || '',
        qty: 1,
      });
      store.showToast(`Added ${prod.name} to Wishlist!`);
    }
  };

  // Add to Cart handler
  const handleAddToCart = (e: React.MouseEvent, prod: ProductItem) => {
    e.stopPropagation();
    store.addItemToCart({
      id: prod.id,
      name: prod.name,
      slug: prod.slug,
      price: prod.pricing?.selling_price || 0,
      image: prod.image || '',
      category: prod.category_name || '',
      qty: 1,
    });
    store.showToast(`Added ${prod.name} to Bag!`);
  };

  // Buy Now handler
  const handleBuyNow = (e: React.MouseEvent, prod: ProductItem) => {
    e.stopPropagation();
    store.handleBuyNowDirect({
      id: prod.id,
      name: prod.name,
      slug: prod.slug,
      price: prod.pricing?.selling_price || 0,
      image: prod.image || '',
      category: prod.category_name || '',
      qty: 1,
    });
  };

  const logoSrc = getAbsoluteImageUrl(brand?.logo_url || brand?.logo);
  const bannerSrc = getAbsoluteImageUrl(brand?.banner_image_url || brand?.banner_image);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 pt-[108px] lg:pt-[180px]">

      {/* ── BRAND HERO BANNER HEADER ── */}
      {brandLoading ? (
        <div className="w-full h-[220px] sm:h-[300px] bg-slate-200 animate-pulse" />
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
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#006670] text-white font-bold text-xs rounded-xl shadow-md"
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
            className="w-full h-[240px] sm:h-[320px] md:h-[380px] object-cover opacity-85 brightness-[0.95]"
          />

          {/* Overlay with brand details */}
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

              {/* Brand Meta & Description */}
              <div className="space-y-2 text-white flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-[#006670] text-white text-[10px] sm:text-xs font-black tracking-widest uppercase rounded-full shadow-sm">
                    Authorized Brand
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
                  {brand.short_description || brand.full_description || brand.description || `Explore 100% genuine ${brand.name} clinical equipment, instruments, and supplies directly from authorized channels.`}
                </p>

                {/* External Website & Contacts */}
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

          {/* ── Breadcrumb ── */}
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

          {/* ── Filter Bar & Search ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">

            {/* Live Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={`Search ${brand?.name || 'brand'} products...`}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006670]/30 focus:border-[#006670] transition-all"
              />
            </div>

            {/* Category Filter & Stock Filter & Sorting */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Filter */}
              {categoriesList.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={e => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#006670]/30 cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}

              {/* In Stock Toggle */}
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 select-none hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={e => {
                    setInStockOnly(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="rounded text-[#006670] focus:ring-[#006670]"
                />
                In Stock Only
              </label>

              {/* Sorting Select */}
              <select
                value={selectedSort}
                onChange={e => {
                  setSelectedSort(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#006670]/30 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Customer Rating</option>
              </select>
            </div>
          </div>

          {/* ── PRODUCTS GRID ── */}
          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm animate-pulse flex flex-col justify-between h-[320px]"
                >
                  <div className="w-full aspect-square bg-slate-200 rounded-xl mb-3" />
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-1/2 mb-4" />
                  <div className="h-9 bg-slate-200 rounded-xl w-full" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm my-8">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">No Products Found</h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-6">
                {searchQuery || selectedCategory !== 'all'
                  ? 'No products match your filters. Try clearing your search or category filter.'
                  : `Currently there are no products listed under ${brand?.name || 'this brand'}.`}
              </p>
              {(searchQuery || selectedCategory !== 'all' || inStockOnly) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setInStockOnly(false);
                    setCurrentPage(1);
                  }}
                  className="px-5 py-2.5 bg-[#006670] text-white text-xs font-bold rounded-xl hover:bg-[#005159] transition-all shadow-md"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Product Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
                {products.map(prod => {
                  const wishlisted = isWishlisted(prod.id);
                  const isOutOfStock = prod.inventory && prod.inventory.stock_quantity <= 0;
                  const mrp = prod.pricing?.mrp || 0;
                  const price = prod.pricing?.selling_price || 0;
                  const discount = prod.pricing?.discount_percent || (mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0);

                  return (
                    <div
                      key={prod.id}
                      onClick={() => router.push(`/products/${prod.slug}`)}
                      className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden relative group cursor-pointer"
                    >
                      {/* Top Badges & Wishlist */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
                        {discount > 0 ? (
                          <span className="bg-rose-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md shadow-sm pointer-events-auto">
                            {discount}% OFF
                          </span>
                        ) : (
                          <span />
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleToggleWishlist(e, prod)}
                          className="pointer-events-auto p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white text-slate-400 hover:text-rose-500 transition-all hover:scale-110 active:scale-95"
                          aria-label="Toggle Wishlist"
                        >
                          <Heart
                            className={`w-4 h-4 transition-all ${wishlisted ? 'fill-rose-500 stroke-rose-500' : 'stroke-slate-400 fill-none'
                              }`}
                          />
                        </button>
                      </div>

                      {/* Image Container */}
                      <div className="w-full aspect-square bg-slate-50 p-4 flex items-center justify-center overflow-hidden relative border-b border-slate-100">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          loading="lazy"
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      {/* Content Body */}
                      <div className="p-4 flex flex-col justify-between flex-grow">
                        <div>
                          {/* Brand & Category */}
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            <span className="truncate max-w-[110px] text-[#006670]">{brand?.name || prod.brand_name}</span>
                            {prod.category_name && <span className="truncate max-w-[90px]">{prod.category_name}</span>}
                          </div>

                          {/* Title */}
                          <h3 className="font-bold text-xs sm:text-sm text-slate-800 line-clamp-2 leading-snug group-hover:text-[#006670] transition-colors mb-2">
                            {prod.name}
                          </h3>
                        </div>

                        <div>
                          {/* Rating & Stock */}
                          <div className="flex items-center justify-between my-2">
                            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50 text-[10px] font-black text-amber-700">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{prod.rating ? prod.rating.toFixed(1) : '4.5'}</span>
                            </div>
                            <span className={`text-[10px] font-bold ${isOutOfStock ? 'text-rose-500' : 'text-emerald-600'}`}>
                              {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                            </span>
                          </div>

                          {/* Pricing */}
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

                          {/* Actions: Add to Cart / Buy Now */}
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              onClick={(e) => handleAddToCart(e, prod)}
                              disabled={isOutOfStock}
                              className="w-full py-2 bg-slate-100 hover:bg-[#006670] text-slate-700 hover:text-white disabled:opacity-50 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" /> Bag
                            </button>
                            <button
                              onClick={(e) => handleBuyNow(e, prod)}
                              disabled={isOutOfStock}
                              className="w-full py-2 bg-[#006670] hover:bg-[#005159] text-white disabled:opacity-50 text-[11px] font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
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

              {/* ── PAGINATION CONTROLS ── */}
              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2 select-none">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${currentPage === pageNum
                              ? 'bg-[#006670] text-white shadow-md'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      )}
    </div>
  );
}
