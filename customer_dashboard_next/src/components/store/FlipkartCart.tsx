'use client';

import React, { useState } from 'react';
import { Trash2, Plus, Minus, MapPin, Shield, ArrowLeft, Heart, ShoppingBag, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getAbsoluteImageUrl } from '../../lib/api';

interface MockCartItem {
  id: string;
  name: string;
  category: string;
  price: number;
  qty: number;
  image: string;
  originalPrice?: number;
}

interface FlipkartCartProps {
  cartItems: MockCartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<MockCartItem[]>>;
  savedForLaterItems: MockCartItem[];
  setSavedForLaterItems: React.Dispatch<React.SetStateAction<MockCartItem[]>>;
  setCurrentView: (view: 'home' | 'portfolio' | 'listing' | 'detail' | 'cart' | 'wishlist' | 'checkout' | 'order-success' | 'my-orders') => void;
  onProductClick: (id: string) => void;
  showToast?: (message: string) => void;
  onOpenLoginModal: () => void;
}

const FlipkartCart: React.FC<FlipkartCartProps> = ({
  cartItems,
  setCartItems,
  savedForLaterItems,
  setSavedForLaterItems,
  setCurrentView,
  onProductClick,
  showToast,
  onOpenLoginModal,
}) => {
  const { isAuthenticated, user } = useAuth();
  const [pincode, setPincode] = useState('400001');
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [pinInput, setPinInput] = useState('400001');

  // Backend cart calculations cache
  const [backendCart, setBackendCart] = useState<any>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      const getBackendCart = async () => {
        try {
          const { cartService } = await import('../../lib/services/cart');
          const res = await cartService.get();
          if (res.success && res.data) {
            setBackendCart(res.data);
          }
        } catch (e) {
          console.error(e);
        }
      };
      getBackendCart();
    } else {
      setBackendCart(null);
    }
  }, [isAuthenticated, cartItems]);

  // Calculations
  const totalOriginalPrice = backendCart ? backendCart.mrp_subtotal : cartItems.reduce((acc, item) => {
    const orig = item.originalPrice || Math.round(item.price * 1.2);
    return acc + orig * item.qty;
  }, 0);

  const cartTotal = backendCart ? backendCart.total_amount : cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const discountTotal = backendCart ? backendCart.savings : (totalOriginalPrice - cartItems.reduce((acc, item) => acc + item.price * item.qty, 0));
  const gstAmount = backendCart ? backendCart.gst_amount : 0;

  const handleQtyChange = (id: string, delta: number) => {
    setCartItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveForLater = (item: MockCartItem) => {
    // Remove from cart
    setCartItems(prev => prev.filter(c => c.id !== item.id));
    // Add to save for later if not already there
    setSavedForLaterItems(prev => {
      if (prev.some(s => s.id === item.id)) return prev;
      return [...prev, item];
    });
  };

  const handleMoveToCart = (item: MockCartItem) => {
    // Remove from save for later
    setSavedForLaterItems(prev => prev.filter(s => s.id !== item.id));
    // Add to cart
    setCartItems(prev => {
      if (prev.some(c => c.id === item.id)) return prev;
      return [...prev, item];
    });
  };

  const handleRemoveSaved = (id: string) => {
    setSavedForLaterItems(prev => prev.filter(item => item.id !== id));
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim().length === 6) {
      setPincode(pinInput);
      setIsEditingPin(false);
    } else {
      if (showToast) showToast('Please enter a valid 6-digit Pincode');
      else alert('Please enter a valid 6-digit Pincode');
    }
  };

  return (
    <div className="w-full bg-[#f4f7f7] min-h-screen pt-[112px] lg:pt-[180px] pb-16 font-sans select-none">
      <div className="max-w-6xl mx-auto px-4 md:px-6">

        {/* Back navigation */}
        <button
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-1 text-[#006670] hover:text-[#004e56] font-bold text-xs uppercase tracking-wider mb-5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Store
        </button>

        {/* ─── GUEST GATE: show login CTA instead of cart ─── */}
        {!isAuthenticated ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-14 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-[#e6f3f5] flex items-center justify-center mb-5">
              <Lock className="w-9 h-9 text-[#006670]" />
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight mb-2">Sign in to View Your Cart</h2>
            <p className="text-sm text-slate-400 font-medium max-w-xs leading-relaxed mb-6">
              Your procurement cart is secured. Sign in to add, review, and checkout your clinical equipment.
            </p>
            <button
              onClick={onOpenLoginModal}
              className="px-8 py-3 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Sign In to Continue
            </button>
            <button
              onClick={() => setCurrentView('portfolio')}
              className="mt-3 text-xs font-bold text-[#006670] hover:underline cursor-pointer"
            >
              Browse Products First
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* Left Column: Cart items & Saved for Later */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Header & Pin Code */}
            <div className="bg-white rounded-md border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="flex border-b border-slate-100">
                <button className="flex-1 py-3.5 text-center text-xs font-bold text-[#006670] uppercase tracking-wider border-b-2 border-[#006670] bg-[#e6f3f5]/20">
                  FAAZO Clinic Store ({cartItems.length})
                </button>
              </div>

              {/* Delivery Address Block */}
              <div className="p-4 flex flex-wrap items-center justify-between gap-4 text-left">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4.5 h-4.5 text-[#006670]" />
                  {isEditingPin ? (
                    <form onSubmit={handlePinSubmit} className="flex gap-2 items-center">
                      <input 
                        type="text" 
                        value={pinInput} 
                        onChange={(e) => setPinInput(e.target.value)} 
                        maxLength={6}
                        className="border border-slate-200 px-2 py-1 rounded text-xs font-bold focus:outline-none focus:border-[#006670] w-24 bg-white"
                        placeholder="Pincode"
                      />
                      <button type="submit" className="bg-[#006670] text-white text-xs px-2.5 py-1 rounded font-bold cursor-pointer hover:bg-[#004e56]">
                        Apply
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs font-medium text-slate-700">
                      Deliver to: <strong className="text-slate-900">{user?.full_name || 'Dr. Aditya Sharma'}, {pincode}</strong>
                    </span>
                  )}
                </div>
                {!isEditingPin && (
                  <button 
                    onClick={() => setIsEditingPin(true)} 
                    className="text-xs font-bold text-[#006670] hover:text-[#004e56] cursor-pointer"
                  >
                    Change Pincode
                  </button>
                )}
              </div>
            </div>

            {/* Cart Items Card */}
            <div className="bg-white rounded-md border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              {cartItems.length === 0 ? (
                <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-[#e6f3f5] flex items-center justify-center text-[#006670] mb-5">
                    <ShoppingBag className="w-9 h-9" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-800">Your Procurement Cart is Empty</h3>
                  <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                    Add clinical equipment, restoratives, and other components to start your setup order.
                  </p>
                  <button
                    onClick={() => setCurrentView('portfolio')}
                    className="mt-6 px-7 py-3 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold uppercase tracking-wider rounded-md transition-all shadow-sm cursor-pointer"
                  >
                    Explore Portfolio
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cartItems.map((item) => {
                    const originalPrice = item.originalPrice || Math.round(item.price * 1.2);
                    const discountPercent = Math.round(((originalPrice - item.price) / originalPrice) * 100);

                    return (
                      <div key={item.id} className="p-5 md:p-6 flex flex-col md:flex-row gap-6 text-left items-start hover:bg-slate-50/30 transition-colors">
                        {/* Image & Qty controls column */}
                        <div className="flex flex-col items-center gap-3.5 shrink-0">
                          <div 
                            className="w-24 h-24 bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-center cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow shrink-0"
                            onClick={() => onProductClick(item.id)}
                          >
                            <img src={getAbsoluteImageUrl(item.image)} alt={item.name} className="max-w-full max-h-full object-contain" />
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2 mt-0.5">
                            <button
                              onClick={() => handleQtyChange(item.id, -1)}
                              disabled={item.qty <= 1}
                              className={`w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center cursor-pointer transition-all bg-white hover:bg-slate-50 text-slate-600 font-extrabold shadow-sm active:scale-95
                                ${item.qty <= 1 ? 'opacity-30 cursor-not-allowed active:scale-100' : ''}`}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="text"
                              value={item.qty}
                              readOnly
                              className="w-9 h-6 border border-slate-200 text-center text-xs font-black bg-white text-slate-800 rounded focus:outline-none"
                            />
                            <button
                              onClick={() => handleQtyChange(item.id, 1)}
                              className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center cursor-pointer transition-all bg-white hover:bg-slate-50 text-slate-600 font-extrabold shadow-sm active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Product details and text actions */}
                        <div className="flex-grow flex flex-col justify-between py-1 self-stretch">
                          <div className="space-y-2">
                            <h4 
                              onClick={() => onProductClick(item.id)}
                              className="text-sm md:text-base font-extrabold text-slate-800 hover:text-[#006670] transition-colors leading-snug cursor-pointer line-clamp-2"
                            >
                              {item.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                              <span className="px-2 py-0.5 bg-slate-50 border border-slate-200/60 text-slate-500 rounded text-[9.5px] uppercase tracking-wider">{item.category}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-400 uppercase tracking-wider">Seller: FAAZO Authorized</span>
                            </div>
                            
                            {/* Pricing Block */}
                            <div className="flex items-baseline gap-2.5 pt-1">
                              <span className="text-lg font-black text-slate-900 font-display">
                                ₹{item.price.toLocaleString('en-IN')}
                              </span>
                              <span className="text-xs text-slate-400 line-through font-semibold">
                                ₹{originalPrice.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {discountPercent}% Off
                              </span>
                            </div>
                          </div>

                          {/* Action Links */}
                          <div className="flex gap-6 mt-6 border-t border-slate-50 pt-4">
                            <button
                              onClick={() => handleSaveForLater(item)}
                              className="text-[11px] font-bold text-slate-500 hover:text-[#006670] transition-colors uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                            >
                              <Heart className="w-3.5 h-3.5 stroke-[2] opacity-80" />
                              Save for Later
                            </button>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-[11px] font-bold text-slate-500 hover:text-rose-500 transition-colors uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2] opacity-80" />
                              Remove
                            </button>
                          </div>
                        </div>

                        {/* Right: Delivery status info */}
                        <div className="shrink-0 text-left md:text-right mt-3 md:mt-1 bg-slate-50/60 px-3 py-2 rounded-lg border border-slate-100/50">
                          <p className="text-[11px] font-bold text-slate-700">
                            Delivery by Wed, Jun 24
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                            Standard Medical Transit | <span className="text-emerald-600 font-bold">FREE</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Checkout CTA footer block inside list card */}
                  <div className="p-4 flex justify-end bg-white border-t border-slate-100">
                    <button
                      onClick={() => { setCurrentView('checkout'); window.scrollTo(0, 0); }}
                      className="px-8 py-3.5 rounded-md bg-[#006670] hover:bg-[#004e56] text-white text-xs tracking-wider font-extrabold uppercase transition-all shadow-md hover:shadow-premium cursor-pointer"
                    >
                      Place Order
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Saved For Later Card */}
            {savedForLaterItems.length > 0 && (
              <div className="bg-white rounded-md border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden text-left">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Saved for Later ({savedForLaterItems.length})
                  </h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {savedForLaterItems.map((item) => {
                    const originalPrice = item.originalPrice || Math.round(item.price * 1.2);
                    const discountPercent = Math.round(((originalPrice - item.price) / originalPrice) * 100);

                    return (
                      <div key={item.id} className="p-4 md:p-6 flex flex-col md:flex-row gap-5">
                        {/* Image column */}
                        <div className="shrink-0 flex flex-col items-center">
                          <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded p-2 flex items-center justify-center">
                            <img src={getAbsoluteImageUrl(item.image)} alt={item.name} className="max-w-full max-h-full object-contain" />
                          </div>
                        </div>

                        {/* Details and buttons */}
                        <div className="flex-grow flex flex-col justify-between py-0.5">
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-800 hover:text-[#006670] cursor-pointer line-clamp-1" onClick={() => onProductClick(item.id)}>
                              {item.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-sans">
                              Category: {item.category}
                            </p>
                            
                            {/* Pricing */}
                            <div className="flex items-baseline gap-2 pt-1">
                              <span className="text-sm font-black text-slate-900 font-display">
                                ₹{item.price.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[11px] text-slate-400 line-through">
                                ₹{originalPrice.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-600">
                                {discountPercent}% Off
                              </span>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-5 mt-4 pt-2">
                            <button
                              onClick={() => handleMoveToCart(item)}
                              className="text-[11px] font-bold text-[#006670] hover:text-[#004e56] transition-colors uppercase tracking-wider cursor-pointer"
                            >
                              Move to Cart
                            </button>
                            <button
                              onClick={() => handleRemoveSaved(item.id)}
                              className="text-[11px] font-bold text-slate-500 hover:text-rose-500 transition-colors uppercase tracking-wider cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {/* Delivery */}
                        <div className="shrink-0 text-left md:text-right text-[11px] text-slate-400 mt-1 md:mt-0">
                          Delivery in 2-5 days
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Price breakdown card */}
          <div className="lg:col-span-4 lg:sticky lg:top-[140px]">
            <div className="bg-white rounded-md border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-4 text-left">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4">
                Price Details
              </h3>
              
              <div className="space-y-3 font-sans text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Price ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})</span>
                  <span className="font-semibold text-slate-800">₹{totalOriginalPrice.toLocaleString('en-IN')}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Clinic discount</span>
                  <span className="font-bold text-emerald-600">-₹{discountTotal.toLocaleString('en-IN')}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="text-emerald-600 font-bold">FREE</span>
                </div>

                {backendCart && (
                  <div className="flex justify-between">
                    <span>GST (Included)</span>
                    <span className="font-semibold text-slate-800">₹{gstAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Secured Medical Packaging</span>
                  <span className="text-slate-800 font-semibold">FREE</span>
                </div>

                <div className="border-t border-slate-100 pt-3.5 mt-2 flex justify-between text-sm font-black text-slate-900 border-b border-slate-100 pb-3.5">
                  <span>Total Amount</span>
                  <span className="text-[#006670] font-display">₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>

                <div className="pt-1.5 font-bold text-emerald-600 text-xs text-center">
                  You will save ₹{discountTotal.toLocaleString('en-IN')} on this order
                </div>
              </div>
            </div>

            {/* Safe procurement promise */}
            <div className="mt-4 flex items-center gap-3 p-3 bg-slate-100/40 border border-slate-200/30 rounded-md text-left">
              <Shield className="w-7 h-7 text-[#006670] shrink-0" />
              <p className="text-[10px] text-slate-400 font-sans leading-normal">
                Safe and Secure Payments. 100% Authentic clinical equipment with official warranty.
              </p>
            </div>
          </div>

        </div>
        )}

      </div>

      {/* Mobile Sticky Action Bar — only for authenticated users with items */}
      {isAuthenticated && cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between md:hidden shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          <div className="text-left">
            <span className="text-[9.5px] text-slate-400 font-sans uppercase font-bold block leading-none mb-1">Total Procurement</span>
            <span className="text-base font-black text-[#006670] font-display leading-none">
              ₹{cartTotal.toLocaleString('en-IN')}
            </span>
          </div>
          <button
            onClick={() => { setCurrentView('checkout'); window.scrollTo(0, 0); }}
            className="px-6 py-3 bg-[#006670] hover:bg-[#004e56] text-white text-xs tracking-wider font-extrabold uppercase rounded-md shadow-sm transition-all cursor-pointer"
          >
            Place Order
          </button>
        </div>
      )}
    </div>
  );
};

export default FlipkartCart;
