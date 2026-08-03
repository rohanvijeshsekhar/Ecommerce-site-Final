'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag, Trash2, ArrowRight, ShieldCheck, Star, Share2 } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import { ShareModal } from './ShareModal';

export const WishlistPage: React.FC = () => {
  const router = useRouter();
  const { wishlistItems, removeFromWishlist, moveToCart, loading } = useWishlist();

  return (
    <div className="min-h-screen bg-slate-50 text-left pt-28 pb-16 font-sans select-none">
      <div className="max-w-6xl mx-auto px-4 md:px-12 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-xs font-black uppercase tracking-wider mb-2">
              <Heart className="w-3.5 h-3.5 fill-rose-500" />
              <span>Saved Items ({wishlistItems.length})</span>
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
            className="inline-flex items-center gap-2 text-xs font-bold text-teal-700 hover:text-teal-600 transition-colors"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Wishlist Items List */}
        {wishlistItems.length === 0 ? (
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
                className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-700/20 transition-all"
              >
                Browse Products
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((item) => {
              const product = item.product || item;
              const prodId = product.id || product.slug || item.product_id || item.id;
              const prodName = product.name || 'Clinical Product';
              const prodPrice = product.pricing?.effective_price || product.price || 0;
              const prodMrp = product.pricing?.mrp || product.originalPrice || 0;
              const prodImg = product.image_url || product.image || (product.images && product.images[0]?.image) || '/images/bestseller_handpiece.png';

              return (
                <div
                  key={item.id || prodId}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Image & Remove Action */}
                    <div className="relative aspect-square rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-4 overflow-hidden">
                      <img
                        src={prodImg}
                        alt={prodName}
                        className="max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />

                      <button
                        onClick={() => removeFromWishlist(prodId)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 border border-slate-200/80 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shadow-2xs cursor-pointer"
                        title="Remove from Wishlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700">
                        {product.category_name || product.category || 'Clinical Supply'}
                      </span>
                      <h3
                        onClick={() => router.push(`/products/${product.slug || prodId}`)}
                        className="text-sm font-bold text-slate-900 line-clamp-2 hover:text-teal-700 transition-colors cursor-pointer"
                      >
                        {prodName}
                      </h3>

                      {/* Pricing */}
                      <div className="flex items-baseline gap-2 pt-2">
                        <span className="text-base font-black text-slate-900 font-display">
                          ₹{Number(prodPrice).toLocaleString('en-IN')}
                        </span>
                        {prodMrp > prodPrice && (
                          <span className="text-xs text-slate-400 line-through">
                            ₹{Number(prodMrp).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-5 border-t border-slate-100 mt-4 flex items-center gap-2">
                    <button
                      onClick={() => moveToCart(product)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Move to Cart</span>
                    </button>

                    <button
                      onClick={() => setShareProduct(product)}
                      className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
                      title="Share Product"
                    >
                      <Share2 className="w-4 h-4" />
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
