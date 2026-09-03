'use client';

import React from 'react';
import {
  Heart, ShoppingCart, Star, Trash2, Lock,
  User, Award, CreditCard, Compass, Power,
  ChevronRight
} from 'lucide-react';
import type { CartItem as MockCartItem } from '../../types/pendingAction';
import { useAuth } from '../../hooks/useAuth';

interface FlipkartWishlistProps {
  wishlistItems: MockCartItem[];
  setWishlistItems: React.Dispatch<React.SetStateAction<MockCartItem[]>>;
  setCartItems: React.Dispatch<React.SetStateAction<MockCartItem[]>>;
  setCurrentView: (view: 'home' | 'portfolio' | 'listing' | 'detail' | 'cart' | 'wishlist' | 'checkout' | 'order-success' | 'my-orders') => void;
  onProductClick: (id: string) => void;
  showToast?: (message: string) => void;
  onOpenLoginModal: () => void;
  /** When true, renders only the wishlist card (no page wrapper / sidebar) */
  embedded?: boolean;
}

const FlipkartWishlist: React.FC<FlipkartWishlistProps> = ({
  wishlistItems,
  setWishlistItems,
  setCartItems,
  setCurrentView,
  onProductClick,
  showToast,
  onOpenLoginModal,
  embedded = false,
}) => {
  const { isAuthenticated, user } = useAuth();
  
  const handleRemoveItem = (id: string) => {
    setWishlistItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddToCart = (item: MockCartItem) => {
    setCartItems(prev => {
      if (prev.some(c => c.id === item.id)) {
        return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { ...item, qty: 1 }];
    });
    setWishlistItems(prev => prev.filter(w => w.id !== item.id));
    if (showToast) showToast('Product moved to Cart!');
    else alert(`${item.name} moved to Cart!`);
  };

  // ── Wishlist items card (shared between standalone and embedded mode) ──
  const wishlistCard = (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
          My Wishlist ({wishlistItems.length})
        </h2>
      </div>

      {/* Items List */}
      {wishlistItems.length === 0 ? (
        <div className="py-20 px-6 text-center flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-[#e6f3f5] flex items-center justify-center text-[#006670] mb-5">
            <Heart className="w-9 h-9" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">Your Wishlist is Empty</h3>
          <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
            Save products you want to purchase later. Click the heart icon on search results or detail pages.
          </p>
          <button
            onClick={() => setCurrentView('portfolio')}
            className="mt-6 px-7 py-3 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold uppercase tracking-wider rounded-md transition-all shadow-sm cursor-pointer"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {wishlistItems.map((item) => {
            const originalPrice = item.originalPrice || Math.round(item.price * 1.2);
            const discountPercent = Math.round(((originalPrice - item.price) / originalPrice) * 100);
            const rating = item.rating || 4.8;

            return (
              <div key={item.id} className="p-5 md:p-6 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between relative group hover:bg-[#F7FAF9]/25 transition-colors">
                {/* Left/Middle Content */}
                <div className="flex gap-4 md:gap-5 flex-grow text-left">
                  {/* Image Box */}
                  <div 
                    className="w-20 h-20 md:w-24 md:h-24 bg-slate-50 border border-slate-100 rounded p-2 flex items-center justify-center cursor-pointer shrink-0"
                    onClick={() => onProductClick(item.id)}
                  >
                    <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain" />
                  </div>

                  {/* Info Column */}
                  <div className="space-y-1.5 py-0.5">
                    <h3 
                      onClick={() => onProductClick(item.id)}
                      className="text-sm font-bold text-slate-800 hover:text-[#006670] transition-colors leading-snug cursor-pointer line-clamp-2"
                    >
                      {item.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium font-sans">
                      Category: {item.category}
                    </p>

                    {/* Ratings Star Badge */}
                    <div className="flex items-center gap-1.5">
                      <span className="bg-emerald-600 text-white text-[9.5px] font-black rounded px-1.5 py-0.5 flex items-center gap-0.5">
                        {rating} <Star className="w-2.5 h-2.5 fill-white stroke-none mt-[-1px]" />
                      </span>
                      <span className="text-[10px] font-sans text-slate-400">(128)</span>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-base font-black text-slate-900 font-display">
                        ₹{item.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-400 line-through font-semibold">
                        ₹{originalPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-bold text-emerald-600">
                        {discountPercent}% Off
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions Section */}
                <div className="flex flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto shrink-0 border-t border-slate-50 pt-3 md:border-none md:pt-0">
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-2 text-slate-300 hover:text-rose-500 rounded-full hover:bg-rose-50 transition-colors md:absolute md:top-4 md:right-4 cursor-pointer"
                    title="Remove from Wishlist"
                  >
                    <Trash2 className="w-4 h-4 stroke-[2]" />
                  </button>
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="flex-grow md:flex-grow-0 px-5 py-2.5 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold uppercase rounded shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Add to Cart
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Embedded mode — render just the wishlist card ──
  if (embedded) {
    return wishlistCard;
  }

  // ── Standalone mode — full page with sidebar ──
  return (
    <div className="w-full bg-[#f4f7f7] min-h-screen pt-[104px] lg:pt-[180px] pb-16 font-sans select-none text-left">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        {!isAuthenticated ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-14 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mb-5">
              <Lock className="w-9 h-9 text-rose-400" />
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight mb-2">Sign in to View Your Wishlist</h2>
            <p className="text-sm text-slate-400 font-medium max-w-xs leading-relaxed mb-6">
              Your saved items are synced to your account. Sign in to view, manage, and move items to your cart.
            </p>
            <button onClick={onOpenLoginModal} className="px-8 py-3 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer">
              Sign In to Continue
            </button>
            <button onClick={() => setCurrentView('portfolio')} className="mt-3 text-xs font-bold text-[#006670] hover:underline cursor-pointer">
              Browse Products First
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Sidebar */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white rounded-md border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-3 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#e6f3f5] flex items-center justify-center text-[#006670] font-bold">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-sans font-bold leading-none block">Hello,</span>
                  <span className="text-xs font-black text-slate-800 tracking-wide mt-0.5 block">{user?.full_name || 'Dr. Aditya Sharma'}</span>
                </div>
              </div>

              <div className="bg-white rounded-md border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="divide-y divide-slate-100/70 text-xs font-bold text-slate-600">
                  <div className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                    <span className="flex items-center gap-3 uppercase text-slate-700 tracking-wide">
                      <Award className="w-4 h-4 text-[#006670]" />
                      My Orders
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>

                  <div className="p-4">
                    <span className="flex items-center gap-3 uppercase text-slate-400 tracking-widest text-[9.5px] mb-3">
                      <User className="w-4 h-4 text-[#006670]" />
                      Account Settings
                    </span>
                    <ul className="pl-7 space-y-3 font-sans text-xs text-slate-600 font-medium">
                      <li className="hover:text-[#006670] cursor-pointer">Profile Information</li>
                      <li className="hover:text-[#006670] cursor-pointer">Manage Addresses</li>
                      <li className="hover:text-[#006670] cursor-pointer">PAN Card Info</li>
                    </ul>
                  </div>

                  <div className="p-4">
                    <span className="flex items-center gap-3 uppercase text-slate-400 tracking-widest text-[9.5px] mb-3">
                      <CreditCard className="w-4 h-4 text-[#006670]" />
                      Payments
                    </span>
                    <ul className="pl-7 space-y-3 font-sans text-xs text-slate-600 font-medium">
                      <li className="hover:text-[#006670] cursor-pointer">Gift Cards</li>
                      <li className="hover:text-[#006670] cursor-pointer">Saved Cards</li>
                      <li className="hover:text-[#006670] cursor-pointer">Saved UPI</li>
                    </ul>
                  </div>

                  <div className="p-0">
                    <div className="p-4 pb-2">
                      <span className="flex items-center gap-3 uppercase text-slate-400 tracking-widest text-[9.5px] mb-2.5">
                        <Compass className="w-4 h-4 text-[#006670]" />
                        My Stuff
                      </span>
                    </div>
                    <ul className="space-y-0.5 pb-2 font-medium">
                      <li className="px-4 py-2 bg-[#e6f3f5]/45 text-[#006670] border-l-4 border-[#006670] flex items-center justify-between cursor-pointer font-bold">
                        My Wishlist
                        <Heart className="w-3.5 h-3.5 fill-[#006670]" />
                      </li>
                      <li className="px-11 py-2 text-slate-600 hover:text-[#006670] cursor-pointer font-sans text-xs font-medium">My Coupons</li>
                      <li className="px-11 py-2 text-slate-600 hover:text-[#006670] cursor-pointer font-sans text-xs font-medium">My Reviews &amp; Ratings</li>
                    </ul>
                  </div>

                  <div className="p-4 flex items-center gap-3 hover:bg-rose-50 hover:text-rose-500 cursor-pointer text-slate-700">
                    <Power className="w-4 h-4 text-rose-500" />
                    <span>Log Out</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Wishlist Card */}
            <div className="lg:col-span-9">
              {wishlistCard}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlipkartWishlist;
