'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Award, ShieldCheck, Tag, ShoppingCart, Zap, ArrowRight,
  ChevronRight, Filter, Search, Check, AlertCircle, Sparkles,
  Layers, Package, CheckCircle2
} from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { getAbsoluteImageUrl } from '@/lib/api';

export interface BrandDealProductItem {
  id: string;
  product: string;
  product_id?: string;
  product_name: string;
  product_slug: string;
  product_sku: string;
  product_image_url: string | null;
  product_mrp: number;
  product_selling_price: number;
  deal_price: number;
  discount_percentage: number;
  is_active: boolean;
  sort_order: number;
}

export interface BrandDealDetail {
  id: string;
  brand: string;
  brand_name: string;
  brand_slug: string;
  brand_logo_url: string | null;
  name: string;
  slug: string;
  title: string;
  subtitle: string;
  badge_text: string;
  cta_text: string;
  discount_percentage: number | null;
  banner_desktop: string | null;
  banner_mobile: string | null;
  bg_color: string;
  text_color: string;
  accent_color: string;
  start_datetime: string | null;
  end_datetime: string | null;
  status: string;
  is_active: boolean;
  show_on_homepage: boolean;
  deal_products: BrandDealProductItem[];
}

interface BrandDealClientProps {
  campaign: BrandDealDetail;
}

export default function BrandDealClient({ campaign }: BrandDealClientProps) {
  const router = useRouter();
  const store = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price_low' | 'price_high' | 'discount'>('featured');

  const products = campaign.deal_products || [];

  // Filter & sort products
  const processedProducts = useMemo(() => {
    let result = products.filter((p) => p.is_active !== false);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.product_name.toLowerCase().includes(q) ||
          (p.product_sku && p.product_sku.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'price_low') {
      result = [...result].sort((a, b) => Number(a.deal_price) - Number(b.deal_price));
    } else if (sortBy === 'price_high') {
      result = [...result].sort((a, b) => Number(b.deal_price) - Number(a.deal_price));
    } else if (sortBy === 'discount') {
      result = [...result].sort((a, b) => Number(b.discount_percentage) - Number(a.discount_percentage));
    } else {
      result = [...result].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }

    return result;
  }, [products, searchQuery, sortBy]);

  // Handle Add To Cart
  const handleAddToCart = (item: BrandDealProductItem, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    store.addItemToCart({
      id: item.product,
      name: item.product_name,
      price: Number(item.deal_price),
      originalPrice: Number(item.product_mrp),
      qty: 1,
      image: item.product_image_url || '',
      category: 'Brand Deals',
    });
    store.showToast(`Added ${item.product_name} to cart at ₹${Number(item.deal_price).toLocaleString('en-IN')}`);
  };

  // Handle Buy Now (Direct to checkout with campaign item)
  const handleBuyNow = (item: BrandDealProductItem, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    store.handleBuyNowDirect({
      id: item.product,
      name: item.product_name,
      price: Number(item.deal_price),
      originalPrice: Number(item.product_mrp),
      qty: 1,
      image: item.product_image_url || '',
      category: 'Brand Deals',
    });
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 pt-[100px] lg:pt-[128px]">
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link href="/" className="hover:text-[#006670] transition">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Brand Deals</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-semibold truncate max-w-xs sm:max-w-md">
              {campaign.name}
            </span>
          </nav>
        </div>
      </div>

      {/* Hero Campaign Header - Simple & Clean */}
      <section
        className="w-full relative overflow-hidden border-b border-slate-200"
        style={{
          backgroundColor: campaign.bg_color || '#005F63',
          color: campaign.text_color || '#FFFFFF',
        }}
      >
        {(campaign.banner_desktop || (campaign as any).desktop_image_url || (campaign as any).desktop_image) && (
          <div className="absolute inset-0 z-0 pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getAbsoluteImageUrl(campaign.banner_desktop || (campaign as any).desktop_image_url || (campaign as any).desktop_image)}
              alt={campaign.name}
              className="w-full h-full object-cover object-right opacity-30"
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to right, ${campaign.bg_color || '#005F63'} 45%, transparent 100%)`,
              }}
            />
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
          <div className="max-w-2xl space-y-3">
            {/* Brand Logo & Tag */}
            <div className="flex flex-wrap items-center gap-3">
              {campaign.brand_logo_url && (
                <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getAbsoluteImageUrl(campaign.brand_logo_url)}
                    alt={campaign.brand_name}
                    className="h-6 object-contain"
                  />
                </div>
              )}

              <span
                className="px-3 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-white/20 border border-white/20"
                style={{ color: campaign.accent_color || '#BFE8E8' }}
              >
                {campaign.badge_text || 'EXCLUSIVE BRAND DEAL'}
              </span>

              <span className="text-xs font-medium opacity-90">
                {campaign.brand_name}
              </span>
            </div>

            {/* Campaign Headline */}
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {campaign.title || campaign.name}
            </h1>

            {/* Subheading */}
            {campaign.subtitle && (
              <p className="text-sm sm:text-base opacity-90 leading-relaxed font-normal">
                {campaign.subtitle}
              </p>
            )}

            <div className="pt-1 flex items-center gap-2 text-xs opacity-90 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Official Manufacturer Warranty Included</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Product Catalogue Grid Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Filter / Search / Sorting Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <span>Participating Products</span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#006670]/10 text-[#006670] text-xs font-black">
              {processedProducts.length} items
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search within this offer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006670]"
              />
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500 shrink-0">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full sm:w-auto px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#006670]"
              >
                <option value="featured">Featured Order</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="discount">Highest Discount</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {processedProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Tag className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No matching products found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search keyword or clearing filters to see all participating brand items.
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-[#006670] text-white text-xs font-semibold rounded-lg hover:bg-[#004d55] transition cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
            {processedProducts.map((item) => {
              const hasDiscount = item.discount_percentage > 0;
              const savingsAmount =
                item.product_mrp > item.deal_price ? item.product_mrp - item.deal_price : 0;

              return (
                <div
                  key={item.id}
                  className="group bg-white rounded-2xl border border-slate-200 hover:border-[#006670]/40 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Image & Badges */}
                  <div>
                    <Link
                      href={`/products/${item.product_slug}`}
                      className="block relative aspect-square bg-slate-50 p-4 overflow-hidden border-b border-slate-100"
                    >
                      {item.product_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getAbsoluteImageUrl(item.product_image_url)}
                          alt={item.product_name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Package className="w-12 h-12" />
                        </div>
                      )}

                      {/* Offer Discount Badge */}
                      {hasDiscount && (
                        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-rose-600 text-white shadow-sm tracking-wide">
                          {Math.round(item.discount_percentage)}% OFF
                        </span>
                      )}

                      {/* Brand Deal Ribbon */}
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 text-[9px] font-bold rounded-md bg-[#006670]/10 text-[#006670] border border-[#006670]/20">
                        Brand Offer
                      </span>
                    </Link>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <div className="text-[10px] text-slate-400 font-mono">
                        SKU: {item.product_sku || 'N/A'}
                      </div>

                      <Link
                        href={`/products/${item.product_slug}`}
                        className="block text-xs sm:text-sm font-bold text-slate-800 group-hover:text-[#006670] line-clamp-2 leading-snug transition"
                      >
                        {item.product_name}
                      </Link>

                      {/* Price Section */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-baseline gap-2">
                          <span className="text-base sm:text-lg font-black text-[#006670]">
                            ₹{Number(item.deal_price).toLocaleString('en-IN')}
                          </span>

                          {item.product_mrp > item.deal_price && (
                            <span className="text-xs text-slate-400 line-through">
                              ₹{Number(item.product_mrp).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-500 flex items-center justify-between mt-0.5">
                          <span>(Incl. of all GST)</span>
                          {savingsAmount > 0 && (
                            <span className="text-emerald-600 font-bold">
                              Save ₹{Number(savingsAmount).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 pt-0 space-y-2">
                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(item, e)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#006670] hover:bg-[#004d55] text-white text-xs font-bold shadow-xs hover:shadow transition cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Add to Cart
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleBuyNow(item, e)}
                      className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
                    >
                      <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                      Buy Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
