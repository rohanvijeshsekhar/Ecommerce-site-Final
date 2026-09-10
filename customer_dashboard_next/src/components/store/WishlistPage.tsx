'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag, Trash2, ArrowRight, ShieldCheck, Star, Share2, Zap } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import { useStore } from '@/contexts/StoreContext';
import { getAbsoluteImageUrl } from '@/lib/api';
import { ShareModal } from './ShareModal';

const getProductImage = (product: any, item: any): string => {
  const candidate =
    product?.primary_image ||
    product?.image_url ||
    product?.image ||
    (product?.images && product.images[0]?.image) ||
    (product?.images && product.images[0]?.src) ||
    item?.image;

  if (!candidate) return '/images/bestseller_handpiece.png';
  const url = typeof candidate === 'object' ? (candidate.image || candidate.src || candidate.url || '') : candidate;
  return getAbsoluteImageUrl(url) || '/images/bestseller_handpiece.png';
};

export const WishlistPage: React.FC = () => {
  const router = useRouter();
  const { wishlistItems, removeFromWishlist, moveToCart, loading } = useWishlist();
  const { handleBuyNowDirect } = useStore();
  const [shareProduct, setShareProduct] = useState<any>(null);

  const handleBuyNow = (product: any, item: any) => {
    const prodId = product.id || product.slug || item.product_id || item.id;
    const cartItem: any = {
      id: product.slug || prodId,
      name: product.name || product.title || 'Clinical Product',
      category: product.category_name || product.category || '',
      price: product.pricing?.effective_price || product.price || 0,
      originalPrice: product.pricing?.mrp || product.originalPrice || undefined,
      qty: 1,
      image: getProductImage(product, item),
    };

    if (handleBuyNowDirect) {
      handleBuyNowDirect(cartItem);
    } else {
      router.push('/checkout');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-left pt-[108px] lg:pt-[180px] pb-16 font-sans select-none">
      <div className="max-w-6xl mx-auto px-4 md:px-12 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-xs font-black uppercase tracking-wider mb-2">
              <Heart className="w-3.5 h-3.5 fill-rose-500" />
              <span suppressHydrationWarning>Saved Items ({loading && wishlistItems.length === 0 ? '...' : wishlistItems.length})</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight font-display">
              My Wishlist
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Your saved clinical products and equipment for fast re-ordering.
            </p>
          </div>

          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#006670] hover:text-[#004e56] transition-colors"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Wishlist Items List */}
        {loading && wishlistItems.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-5 space-y-3 animate-pulse">
                <div className="aspect-square bg-slate-100 rounded-xl w-full" />
                <div className="space-y-1.5">
                  <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                  <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                </div>
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="h-7 bg-slate-100 rounded-lg" />
                  <div className="h-7 bg-slate-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 md:p-16 border border-slate-200/80 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto">
              <Heart className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Your Wishlist is Empty</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Save your favorite clinical instruments, handpieces, and materials by clicking the heart icon on any product.
            </p>
            <div className="pt-2">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 rounded-xl bg-[#006670] hover:bg-[#004e56] text-white font-bold text-xs shadow-md shadow-[#006670]/20 transition-all"
              >
                Browse Products
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {wishlistItems.map((item) => {
              const product = item.product || item;
              const prodId = product.id || product.slug || item.product_id || item.id;
              const prodName = product.name || 'Clinical Product';
              const prodPrice = product.pricing?.effective_price || product.price || 0;
              const prodMrp = product.pricing?.mrp || product.originalPrice || 0;
              const prodImg = getProductImage(product, item);

              return (
                <div
                  key={item.id || prodId}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all p-3 sm:p-5 flex flex-col justify-between group"
                >
                  <div className="space-y-2.5 sm:space-y-4">
                    {/* Image & Remove Action */}
                    <div className="relative aspect-square rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
                      <img
                        src={prodImg}
                        alt={prodName}
                        className="max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />

                      <button
                        onClick={() => removeFromWishlist(prodId)}
                        className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 border border-slate-200/80 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shadow-2xs cursor-pointer"
                        title="Remove from Wishlist"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-0.5 sm:space-y-1">
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#006670] truncate block">
                        {product.category_name || product.category || 'Clinical Supply'}
                      </span>
                      <h3
                        onClick={() => router.push(`/products/${product.slug || prodId}`)}
                        className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 hover:text-[#006670] transition-colors cursor-pointer min-h-[32px] sm:min-h-[40px] leading-tight"
                      >
                        {prodName}
                      </h3>

                      {/* Pricing */}
                      <div className="flex items-baseline gap-1.5 sm:gap-2 pt-1 sm:pt-2">
                        <span className="text-sm sm:text-base font-black text-slate-900 font-display">
                          ₹{Number(prodPrice).toLocaleString('en-IN')}
                        </span>
                        {prodMrp > prodPrice && (
                          <span className="text-[10px] sm:text-xs text-slate-400 line-through">
                            ₹{Number(prodMrp).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2.5 sm:pt-4 border-t border-slate-100 mt-3 flex flex-col gap-1.5 sm:gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => moveToCart(product)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-[#006670] hover:bg-[#004e56] text-white font-bold text-[10px] sm:text-xs shadow-sm transition-all cursor-pointer"
                        title="Add to Cart"
                      >
                        <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                        <span className="truncate">Add to Cart</span>
                      </button>

                      <button
                        onClick={() => setShareProduct(product)}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
                        title="Share Product"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleBuyNow(product, item)}
                      className="w-full flex items-center justify-center gap-1 px-2 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] sm:text-xs shadow-sm transition-all cursor-pointer"
                      title="Buy Now"
                    >
                      <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                      <span>Buy Now</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={!!shareProduct}
        onClose={() => setShareProduct(null)}
        product={shareProduct}
      />
    </div>
  );
};
