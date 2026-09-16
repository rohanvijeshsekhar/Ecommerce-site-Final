'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Heart, Zap, ShoppingBag } from 'lucide-react';
import type { DailyOfferProduct } from '@/admin/types/admin';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/hooks/useAuth';

interface DailyOfferCardProps {
  item: DailyOfferProduct;
  productBadgeColor?: string;
  onAddToCart?: (item: DailyOfferProduct) => void;
  className?: string;
}

export const DailyOfferCard: React.FC<DailyOfferCardProps> = ({
  item,
  productBadgeColor = '#005F63',
  onAddToCart,
  className = '',
}) => {
  const store = useStore();
  const { isAuthenticated } = useAuth();
  const [isAdded, setIsAdded] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Price calculations
  const mrp = item.pricing?.mrp ? Number(item.pricing.mrp) : 0;
  const rawDealPrice = item.deal_price ?? item.pricing?.effective_price ?? item.pricing?.selling_price ?? 0;
  const dealPrice = Number(rawDealPrice);

  let discountPct = item.discount_percentage;
  if (discountPct === undefined || discountPct === null) {
    if (mrp > dealPrice && mrp > 0) {
      discountPct = Math.round(((mrp - dealPrice) / mrp) * 100);
    } else {
      discountPct = 0;
    }
  }

  const imageUrl = (!imgError && item.product_image) ? item.product_image : null;
  const productUrl = `/products/${item.product_slug || item.product_id || item.product || item.id}`;

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onAddToCart) {
      onAddToCart(item);
    } else if (store?.addItemToCart) {
      store.addItemToCart({
        id: item.product_id || item.product || item.id,
        name: item.product_name,
        price: dealPrice,
        originalPrice: mrp > 0 ? mrp : undefined,
        category: item.category_name || 'Daily Deals',
        image: imageUrl || '',
        qty: 1,
        slug: item.product_slug,
      });
      store.showToast(`Added ${item.product_name} to cart!`);
    }

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1800);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const cartItem = {
      id: item.product_id || item.product || item.id,
      name: item.product_name,
      price: dealPrice,
      originalPrice: mrp > dealPrice ? mrp : undefined,
      category: item.category_name || 'Daily Deals',
      image: imageUrl || '',
      qty: 1,
      slug: item.product_slug,
      sku: item.product_sku,
    };

    if (store?.handleBuyNowDirect) {
      store.handleBuyNowDirect(cartItem);
    }
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated && store?.openLoginModal) {
      store.openLoginModal();
      return;
    }

    setIsWishlisted(!isWishlisted);
    if (store?.showToast) {
      store.showToast(!isWishlisted ? 'Added to wishlist' : 'Removed from wishlist');
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden relative group ${className}`}
    >
      {/* Top Badges & Wishlist */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
        {discountPct > 0 ? (
          <span className="bg-[#005F63] text-white font-extrabold text-[11px] px-2.5 py-1 rounded-md shadow-sm pointer-events-auto">
            {discountPct}% OFF
          </span>
        ) : item.badge_override ? (
          <span className="bg-[#005F63] text-white font-extrabold text-[11px] px-2.5 py-1 rounded-md shadow-sm pointer-events-auto">
            {item.badge_override}
          </span>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={handleWishlistClick}
          className="pointer-events-auto p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white text-slate-400 hover:text-rose-500 transition-all hover:scale-110 active:scale-95 cursor-pointer border border-slate-100"
          aria-label="Toggle Wishlist"
        >
          <Heart
            className={`w-4 h-4 transition-all ${
              isWishlisted
                ? 'fill-rose-500 stroke-rose-500'
                : 'stroke-slate-400 fill-none'
            }`}
          />
        </button>
      </div>

      {/* Image Container */}
      <Link
        href={productUrl}
        className="w-full aspect-square bg-slate-50 flex items-center justify-center overflow-hidden relative border-b border-slate-100 block cursor-pointer"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.product_name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 select-none">
            <div className="p-3.5 rounded-2xl bg-slate-200/70 shadow-inner">
              <ShoppingBag className="w-8 h-8 text-slate-400" />
            </div>
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mt-2">
              FAAZO DEAL
            </span>
          </div>
        )}
      </Link>

      {/* Content Body */}
      <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-grow">
        <div>
          {/* Brand & Category Row */}
          <div className="flex items-center justify-between text-[11px] font-bold tracking-wider mb-1">
            <span className="truncate max-w-[120px] text-[#006670] uppercase font-bold">
              {item.brand_name || 'LAP'}
            </span>
            <span className="truncate max-w-[100px] text-slate-400 uppercase font-semibold">
              {item.category_name || 'LAPTOP'}
            </span>
          </div>

          {/* Product Title */}
          <Link href={productUrl} className="block group/title">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 line-clamp-1 leading-snug group-hover/title:text-[#006670] transition-colors mb-1.5">
              {item.product_name}
            </h3>
          </Link>
        </div>

        <div>
          {/* In Stock Badge (right-aligned above price) */}
          <div className="flex items-center justify-end my-1">
            <span className="text-xs font-semibold text-emerald-600">
              In Stock
            </span>
          </div>

          {/* Pricing Row */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-lg sm:text-xl font-black text-slate-900 font-display">
              ₹{dealPrice.toLocaleString('en-IN')}
            </span>
            {mrp > dealPrice && (
              <span className="text-xs sm:text-sm text-slate-400 line-through font-medium">
                ₹{mrp.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* CTA Row: Bag & Buy */}
          <div className="grid grid-cols-2 gap-2 mt-auto">
            <button
              type="button"
              onClick={handleCartClick}
              className="w-full py-2.5 bg-slate-100 hover:bg-[#E6F2F2] text-slate-700 hover:text-[#006670] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>{isAdded ? 'Added' : 'Bag'}</span>
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              className="w-full py-2.5 bg-[#005F63] hover:bg-[#004e56] text-white text-xs font-black rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              <span>Buy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyOfferCard;
