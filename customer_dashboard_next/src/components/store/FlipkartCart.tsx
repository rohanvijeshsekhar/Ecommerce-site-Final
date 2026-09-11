'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Minus, MapPin, Shield, ArrowLeft, ShoppingBag, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
  savedForLaterItems?: MockCartItem[];
  setSavedForLaterItems?: React.Dispatch<React.SetStateAction<MockCartItem[]>>;
  setCurrentView: (view: 'home' | 'portfolio' | 'listing' | 'detail' | 'cart' | 'wishlist' | 'checkout' | 'order-success' | 'my-orders') => void;
  onProductClick: (id: string) => void;
  showToast?: (message: string) => void;
  onOpenLoginModal: () => void;
  loading?: boolean;
}

const FlipkartCart: React.FC<FlipkartCartProps> = ({
  cartItems,
  setCartItems,
  setCurrentView,
  onProductClick,
  showToast,
  onOpenLoginModal,
  loading = false,
}) => {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [pincode, setPincode] = useState('400001');
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [pinInput, setPinInput] = useState('400001');
  const [showPriceDetailsModal, setShowPriceDetailsModal] = useState(false);

  // Backend cart calculations cache
  const [backendCart, setBackendCart] = useState<any>(null);

  useEffect(() => {
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
    const orig = item.originalPrice || Math.round(item.price * 1.3);
    return acc + orig * item.qty;
  }, 0);

  const cartTotal = backendCart ? backendCart.total_amount : cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const discountTotal = backendCart ? backendCart.savings : Math.max(0, totalOriginalPrice - cartTotal);
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
    if (showToast) showToast('Item removed from cart');
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
    <div className="w-full bg-[#f8fafc] min-h-screen pt-[108px] lg:pt-[176px] pb-28 font-sans select-none text-left">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6">

        {/* Top Breadcrumb / Back button */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setCurrentView('home')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#006670] hover:text-[#004e56] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continue Shopping</span>
          </button>
        </div>

        {/* ─── GUEST GATE: show login CTA instead of cart ─── */}
        {!isAuthenticated ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-10 sm:p-14 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-[#E6F2F2] flex items-center justify-center mb-5">
              <Lock className="w-9 h-9 text-[#006670]" />
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight mb-2">Sign in to View Your Cart</h2>
            <p className="text-sm text-slate-500 font-medium max-w-xs leading-relaxed mb-6">
              Your clinical cart is saved to your account. Sign in to review items and place procurement orders.
            </p>
            <button
              onClick={onOpenLoginModal}
              className="px-8 py-3 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#006670]/20 cursor-pointer"
            >
              Sign In to Continue
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

            {/* Left Column: Cart items & Saved for Later */}
            <div className="lg:col-span-8 space-y-3">
              
              {/* Delivery Address Block (FAAZO Style) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 sm:p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#E6F2F2] flex items-center justify-center text-[#006670] shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  {isEditingPin ? (
                    <form onSubmit={handlePinSubmit} className="flex gap-2 items-center flex-wrap">
                      <input 
                        type="text" 
                        value={pinInput} 
                        onChange={(e) => setPinInput(e.target.value)} 
                        maxLength={6}
                        className="border border-slate-300 px-2.5 py-1 rounded-lg text-xs font-bold focus:outline-none focus:border-[#006670] w-28 bg-white"
                        placeholder="Pincode"
                      />
                      <button type="submit" className="bg-[#006670] text-white text-xs px-3 py-1 rounded-lg font-bold cursor-pointer hover:bg-[#004e56]">
                        Apply
                      </button>
                    </form>
                  ) : (
                    <div className="min-w-0">
                      <p className="text-xs text-slate-700 truncate">
                        Deliver to: <span className="font-bold text-slate-900">{user?.full_name || 'Dr. Rohan Vijesh Sekhar'}, {pincode}</span>
                      </p>
                      <p className="text-[11px] text-slate-400">Standard Clinic Delivery</p>
                    </div>
                  )}
                </div>
                {!isEditingPin && (
                  <button 
                    onClick={() => setIsEditingPin(true)} 
                    className="text-xs font-bold text-[#006670] hover:text-white hover:bg-[#006670] border border-[#006670]/40 px-3.5 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer shadow-2xs"
                  >
                    Change
                  </button>
                )}
              </div>

              {/* Cart Items Container */}
              {(loading || authLoading) && cartItems.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 animate-pulse">
                      <div className="flex gap-4 items-start">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-2.5">
                          <div className="h-4 bg-slate-100 rounded-md w-3/4" />
                          <div className="h-3 bg-slate-100 rounded-md w-1/3" />
                          <div className="h-5 bg-slate-100 rounded-md w-1/4 mt-2" />
                        </div>
                      </div>
                      <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between">
                        <div className="h-7 bg-slate-100 rounded-lg w-24" />
                        <div className="h-7 bg-slate-100 rounded-lg w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : cartItems.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs py-14 px-6 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-[#E6F2F2] flex items-center justify-center text-[#006670] mb-4">
                    <ShoppingBag className="w-9 h-9" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Your Cart is Empty!</h3>
                  <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                    Explore our clinical instruments, handpieces, and restorative catalog.
                  </p>
                  <button
                    onClick={() => setCurrentView('portfolio')}
                    className="mt-5 px-6 py-2.5 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#006670]/20 cursor-pointer"
                  >
                    Shop Now
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Stock Warnings Banner */}
                  {backendCart?.stock_warnings && backendCart.stock_warnings.length > 0 && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-rose-900">Inventory Alert</p>
                        {backendCart.stock_warnings.map((msg: string, idx: number) => (
                          <p key={idx} className="font-medium">{msg}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Individual Product Cards (FAAZO Style) */}
                  {cartItems.map((item) => {
                    const originalPrice = item.originalPrice || Math.round(item.price * 1.3);
                    const discountPercent = Math.round(((originalPrice - item.price) / originalPrice) * 100);

                    // Cross-reference with live backend cart item
                    const backendItem = backendCart?.items?.find((bi: any) => 
                      bi.product?.slug === item.id || String(bi.product?.id) === item.id
                    );
                    const hasStockIssue = backendItem && !backendItem.has_sufficient_stock;

                    return (
                      <div key={item.id} className={`bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-colors ${hasStockIssue ? 'border-rose-200 bg-rose-50/10' : ''}`}>
                        
                        {/* Upper Details: Image on Left, Details on Right */}
                        <div className="p-3.5 sm:p-4 flex gap-3.5 sm:gap-4 items-start">
                          {/* Product Thumbnail */}
                          <div 
                            className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 border border-slate-100 rounded-xl p-2 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden"
                            onClick={() => onProductClick(item.id)}
                          >
                            <img 
                              src={getAbsoluteImageUrl(item.image)} 
                              alt={item.name} 
                              className="max-h-full max-w-full object-contain hover:scale-105 transition-transform" 
                            />
                          </div>

                          {/* Product Details */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <h4 
                                onClick={() => onProductClick(item.id)}
                                className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 hover:text-[#006670] transition-colors leading-snug cursor-pointer"
                              >
                                {item.name}
                              </h4>
                              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
                                {item.category && <span className="uppercase font-semibold tracking-wider text-[#006670]">{item.category} • </span>}
                                Seller: <span className="font-medium text-slate-600">FAAZO Authorized</span>
                              </p>

                              {/* Stock Warning Badge */}
                              {hasStockIssue && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-[10px] font-bold text-rose-600 mt-1">
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  <span>
                                    {backendItem.stock_available <= 0
                                      ? 'Out of Stock'
                                      : `Only ${backendItem.stock_available} available`}
                                  </span>
                                </div>
                              )}

                              {/* Pricing Block */}
                              <div className="flex items-baseline gap-2 pt-1.5 flex-wrap">
                                <span className="text-sm sm:text-base font-black text-slate-900 font-display">
                                  ₹{Number(item.price * item.qty).toLocaleString('en-IN')}
                                </span>
                                {originalPrice > item.price && (
                                  <span className="text-xs text-slate-400 line-through">
                                    ₹{Number(originalPrice * item.qty).toLocaleString('en-IN')}
                                  </span>
                                )}
                                {discountPercent > 0 && (
                                  <span className="text-[10px] font-bold text-[#006670] bg-[#E6F2F2] px-2 py-0.5 rounded-full">
                                    {discountPercent}% Off
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1.5 font-medium">
                              Delivery by <span className="font-bold text-slate-800">Wed, Jun 24</span> | <span className="text-[#006670] font-bold">FREE</span>
                            </p>
                          </div>
                        </div>

                        {/* Lower Action Toolbar: Quantity Selector + Save for Later + Remove */}
                        <div className="border-t border-slate-100 px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between bg-slate-50/60 flex-wrap gap-2">
                          {/* Quantity Counter */}
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-[11px] font-bold text-slate-500 mr-1 hidden sm:inline">Qty:</span>
                            <button
                              onClick={() => handleQtyChange(item.id, -1)}
                              disabled={item.qty <= 1}
                              className={`w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center font-bold text-slate-700 hover:bg-[#E6F2F2] hover:text-[#006670] hover:border-[#006670]/30 transition-colors cursor-pointer active:scale-95 ${item.qty <= 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 h-7 border border-slate-200 bg-white rounded-lg flex items-center justify-center text-xs font-bold text-slate-900">
                              {item.qty}
                            </span>
                            <button
                              onClick={() => handleQtyChange(item.id, 1)}
                              className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center font-bold text-slate-700 hover:bg-[#E6F2F2] hover:text-[#006670] hover:border-[#006670]/30 transition-colors cursor-pointer active:scale-95"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Action Links */}
                          <div className="flex items-center">
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-[11px] sm:text-xs font-bold text-slate-500 hover:text-rose-600 uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}

                  {/* Desktop Place Order Box */}
                  <div className="hidden lg:flex bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Order confirmation will be sent to <span className="font-bold text-slate-700">{user?.email}</span>
                    </p>
                    <button
                      onClick={() => {
                        if (backendCart && !backendCart.is_checkout_allowed) {
                          if (showToast) showToast('Please resolve out-of-stock items before placing order.');
                          return;
                        }
                        setCurrentView('checkout');
                        window.scrollTo(0, 0);
                      }}
                      disabled={backendCart ? !backendCart.is_checkout_allowed : false}
                      className={`px-8 py-3.5 rounded-xl text-xs tracking-wider font-extrabold uppercase transition-all ${
                        backendCart && !backendCart.is_checkout_allowed
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                          : 'bg-[#006670] hover:bg-[#004e56] text-white shadow-md shadow-[#006670]/20 cursor-pointer'
                      }`}
                    >
                      Place Order
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Price breakdown card (FAAZO Style) */}
            <div className="lg:col-span-4 lg:sticky lg:top-[140px] space-y-3">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 text-left">
                <h3 className="text-xs font-extrabold text-[#006670] uppercase tracking-wider border-b border-slate-100 pb-3 mb-3.5">
                  Price Details
                </h3>
                
                <div className="space-y-3 font-sans text-xs sm:text-sm text-slate-700">
                  <div className="flex justify-between">
                    <span>Price ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})</span>
                    <span className="font-semibold text-slate-900">₹{Number(totalOriginalPrice).toLocaleString('en-IN')}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span className="font-bold text-[#006670]">− ₹{Number(discountTotal).toLocaleString('en-IN')}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Delivery Charges</span>
                    <span className="text-[#006670] font-bold">FREE</span>
                  </div>

                  {backendCart && (
                    <div className="flex justify-between">
                      <span>GST (Included)</span>
                      <span className="font-semibold text-slate-900">₹{Number(gstAmount).toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="border-t border-dashed border-slate-200 pt-3.5 mt-2 flex justify-between text-sm sm:text-base font-black text-slate-900 border-b border-slate-100 pb-3.5">
                    <span>Total Amount</span>
                    <span className="font-display text-[#006670]">₹{Number(cartTotal).toLocaleString('en-IN')}</span>
                  </div>

                  {discountTotal > 0 && (
                    <div className="p-2.5 rounded-xl bg-[#E6F2F2] text-[#006670] font-bold text-xs text-center">
                      You will save ₹{Number(discountTotal).toLocaleString('en-IN')} on this order
                    </div>
                  )}
                </div>
              </div>

              {/* Safe procurement promise */}
              <div className="flex items-center gap-3 p-3.5 bg-white border border-slate-200/80 rounded-2xl text-left shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-[#E6F2F2] flex items-center justify-center text-[#006670] shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                  Safe and Secure Payments. 100% Authentic clinical products with manufacturer warranty.
                </p>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Mobile Sticky Action Bar — FAAZO Style */}
      {isAuthenticated && cartItems.length > 0 && (
        <>
          <div className="fixed bottom-[52px] md:bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/80 px-4 py-3 flex items-center justify-between lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="text-left flex flex-col justify-center">
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-black text-slate-900 font-display leading-none">
                  ₹{Number(cartTotal).toLocaleString('en-IN')}
                </span>
                {discountTotal > 0 && (
                  <span className="text-[11px] text-[#006670] font-extrabold">
                    Save ₹{Number(discountTotal).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <button 
                onClick={() => setShowPriceDetailsModal(true)}
                className="text-[11px] text-[#006670] font-bold hover:underline text-left mt-0.5 cursor-pointer flex items-center gap-0.5"
              >
                <span>View price details</span>
              </button>
            </div>

            <button
              onClick={() => {
                if (backendCart && !backendCart.is_checkout_allowed) {
                  if (showToast) showToast('Please resolve out-of-stock items before placing order.');
                  return;
                }
                setCurrentView('checkout');
                window.scrollTo(0, 0);
              }}
              className="px-8 py-3 bg-[#006670] hover:bg-[#004e56] active:scale-[0.98] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-[#006670]/25 transition-all cursor-pointer"
            >
              Place Order
            </button>
          </div>

          {/* Mobile Price Breakdown Modal / Sheet */}
          {showPriceDetailsModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end justify-center lg:hidden" onClick={() => setShowPriceDetailsModal(false)}>
              <div 
                className="bg-white w-full rounded-t-3xl p-5 border-t border-slate-200 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-sm font-extrabold text-[#006670] uppercase tracking-wider">
                    Price Details ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
                  </h3>
                  <button 
                    onClick={() => setShowPriceDetailsModal(false)}
                    className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-slate-200"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 font-sans text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span>Total MRP</span>
                    <span className="font-semibold text-slate-900">₹{Number(totalOriginalPrice).toLocaleString('en-IN')}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Discount on MRP</span>
                    <span className="font-bold text-[#006670]">− ₹{Number(discountTotal).toLocaleString('en-IN')}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Delivery Charges</span>
                    <span className="text-[#006670] font-bold">FREE</span>
                  </div>

                  {backendCart && (
                    <div className="flex justify-between">
                      <span>GST (Included)</span>
                      <span className="font-semibold text-slate-900">₹{Number(gstAmount).toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="border-t border-dashed border-slate-200 pt-3 flex justify-between text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
                    <span>Total Payable</span>
                    <span className="font-display text-[#006670]">₹{Number(cartTotal).toLocaleString('en-IN')}</span>
                  </div>

                  {discountTotal > 0 && (
                    <div className="p-2.5 rounded-xl bg-[#E6F2F2] text-[#006670] font-bold text-xs text-center">
                      You will save ₹{Number(discountTotal).toLocaleString('en-IN')} on this order
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowPriceDetailsModal(false);
                      if (backendCart && !backendCart.is_checkout_allowed) {
                        if (showToast) showToast('Please resolve out-of-stock items before placing order.');
                        return;
                      }
                      setCurrentView('checkout');
                      window.scrollTo(0, 0);
                    }}
                    className="w-full mt-3 py-3.5 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-[#006670]/25 transition-all cursor-pointer"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FlipkartCart;
