'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Star, Heart, Check, Flame, Zap } from 'lucide-react';
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
  productBadgeColor = '#DC2626',
  onAddToCart,
  className = '',
}) => {
  const store = useStore();
  const { isAuthenticated } = useAuth();
  const [isAdded, setIsAdded] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

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

  const savings = mrp > dealPrice ? mrp - dealPrice : 0;
  const rating = item.average_rating ? Number(item.average_rating) : 4.8;
  const reviewsCount = item.total_reviews ?? 12;
  const [imgError, setImgError] = useState(false);
  const imageUrl = (!imgError && item.product_image) ? item.product_image : null;
  const badgeText = item.badge_override || 'HOT DEAL';

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
      className={`group relative flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.07)] hover:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.15)] hover:border-slate-300 transition-all duration-300 overflow-hidden ${className}`}
    >
      {/* Top Floating Badges */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        {/* Deal Badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {discountPct > 0 && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-xs font-black tracking-wide shadow-md transform -rotate-1 group-hover:rotate-0 transition-transform"
              style={{ backgroundColor: productBadgeColor }}
            >
              <Zap className="w-3 h-3 fill-current" />
              {discountPct}% OFF
            </span>
          )}
          {badgeText && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/90 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
              <Flame className="w-2.5 h-2.5 fill-current" />
              {badgeText}
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistClick}
          aria-label="Add to Wishlist"
          className="pointer-events-auto p-2 rounded-full bg-white/90 backdrop-blur-md text-slate-400 hover:text-red-500 hover:bg-white shadow-sm border border-slate-100 transition-colors"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
      </div>

      {/* Product Image Link */}
      <Link
        href={`/products/${item.product_slug}`}
        className="relative block aspect-[4/3] w-full bg-gradient-to-b from-slate-50 to-slate-100/60 p-5 overflow-hidden"
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.product_name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onError={() => setImgError(true)}
              className="object-contain p-2 group-hover:scale-108 transition-transform duration-500 ease-out"
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
        </div>

        {/* Stock / Scarcity Badge */}
        <div className="absolute bottom-2 left-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200/60 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            In Stock
          </span>
        </div>
      </Link>

      {/* Product Info & CTA */}
      <div className="flex flex-col flex-1 p-4 sm:p-5">
        {/* Brand / Category */}
        <div className="flex items-center justify-between gap-2 mb-1.5 text-xs text-slate-500">
          <span className="font-semibold text-slate-600 truncate uppercase tracking-wider text-[10px]">
            {item.brand_name || 'FAAZO Dental'}
          </span>
          <div className="flex items-center gap-1 text-amber-500 shrink-0">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-slate-700">{rating.toFixed(1)}</span>
            <span className="text-[10px] text-slate-400">({reviewsCount})</span>
          </div>
        </div>

        {/* Product Title */}
        <Link
          href={`/products/${item.product_slug}`}
          className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 hover:text-[#006670] transition-colors mb-3 group-hover:underline decoration-[#006670]/40 underline-offset-2"
          title={item.product_name}
        >
          {item.product_name}
        </Link>

        {/* Pricing Area */}
        <div className="mt-auto pt-2 border-t border-slate-100 flex flex-col gap-1 mb-4">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans">
              ₹{dealPrice.toLocaleString('en-IN')}
            </span>
            {mrp > dealPrice && (
              <span className="text-xs sm:text-sm text-slate-400 line-through font-medium">
                ₹{mrp.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          {savings > 0 && (
            <span className="text-[11px] font-bold text-emerald-600">
              Save ₹{savings.toLocaleString('en-IN')} with Today's Deal
            </span>
          )}
        </div>

        {/* Add to Cart Action */}
        <button
          onClick={handleCartClick}
          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-sm active:scale-98 ${isAdded
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-900 hover:bg-[#006670] text-white hover:shadow-md'
            }`}
        >
          {isAdded ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Added to Cart!</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>Add to Cart</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DailyOfferCard;
