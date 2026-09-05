'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import {
  Heart, ShoppingCart, Share2, ChevronRight, ChevronLeft,
  ShieldCheck, Truck, Check, Plus, Minus, Shield,
  ArrowLeft, Package, CheckCircle2, Sparkles, X, ZoomIn, ArrowRight
} from 'lucide-react';
import { api, getAbsoluteImageUrl } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useGuestGuard } from '../../hooks/useGuestGuard';
import type { CartItem } from '../../types/pendingAction';

interface ComboDetailPageProps {
  activeComboId: string; // slug
  setCurrentView?: (view: any) => void;
  setActiveProductId?: (id: string) => void;
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setIsCartOpen: (open: boolean) => void;
  wishlistItems: CartItem[];
  setWishlistItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  showToast: (msg: string) => void;
  onOpenLoginModal: () => void;
  onProductClick?: (id: string) => void;
  onBuyNowDirect: (item: CartItem) => void;
}

const ComboDetailPage: React.FC<ComboDetailPageProps> = ({
  activeComboId,
  setCurrentView,
  setCartItems,
  wishlistItems,
  setWishlistItems,
  showToast,
  onOpenLoginModal,
  onProductClick,
  onBuyNowDirect,
}) => {
  const { user } = useAuth();
  const { guardAction } = useGuestGuard(onOpenLoginModal, showToast);
  const isDealer = user?.role === 'dealer';

  const [combo, setCombo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'contents' | 'description' | 'shipping'>('contents');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [swiperRef, setSwiperRef] = useState<any>(null);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragMoved, setDragMoved] = useState(false);
  const [mouseDownTime, setMouseDownTime] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isStickyVisible, setIsStickyVisible] = useState(false);

  // Fetch combo details
  useEffect(() => {
    setLoading(true);
    setActiveImageIndex(0);
    setQuantity(1);
    api.get(`combos/${activeComboId}/`)
      .then(res => {
        const data = res.data?.data ?? res.data;
        if (data && data.id) setCombo(data);
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeComboId]);

  // Image fade transition
  useEffect(() => {
    setIsTransitioning(true);
    const t = setTimeout(() => setIsTransitioning(false), 350);
    return () => clearTimeout(t);
  }, [activeImageIndex]);

  // Sticky bottom bar trigger on scroll
  useEffect(() => {
    const handleScroll = () => {
      const ctaBtn = document.getElementById('combo-add-to-cart-btn');
      if (ctaBtn) {
        const rect = ctaBtn.getBoundingClientRect();
        setIsStickyVisible(rect.bottom < 0);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fullscreen keyboard nav
  useEffect(() => {
    if (!isFullscreenOpen || !combo) return;
    const imagesList = buildImagesList(combo);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsFullscreenOpen(false); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }
      else if (e.key === 'ArrowRight') { setActiveImageIndex(p => (p + 1) % imagesList.length); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }
      else if (e.key === 'ArrowLeft') { setActiveImageIndex(p => (p - 1 + imagesList.length) % imagesList.length); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreenOpen, combo]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#FAFBFB]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#006670]/20 border-t-[#006670] rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse font-sans">Loading Combo Pack...</span>
        </div>
      </div>
    );
  }

  if (!combo) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-12 py-20 text-center">
        <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800">Combo Deal Not Found</h3>
        <p className="text-sm text-slate-500 mt-1">The combo deal you're looking for doesn't exist or has been deactivated.</p>
        <Link href="/combo-deals" className="inline-block mt-6 px-5 py-2.5 bg-[#006670] text-white rounded-xl font-bold hover:bg-[#004e56] cursor-pointer transition-all">
          View All Combos
        </Link>
      </div>
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const buildImagesList = (c: any) => {
    const list = [
      ...(c.thumbnail ? [{ src: getAbsoluteImageUrl(c.thumbnail) || '', alt: c.title }] : []),
      ...(c.banner ? [{ src: getAbsoluteImageUrl(c.banner) || '', alt: c.title + ' banner' }] : []),
      ...(c.images || []).map((img: any) => ({ src: getAbsoluteImageUrl(img.image) || '', alt: img.alt_text || c.title })),
    ];
    if (list.length === 0) list.push({ src: '/images/bestseller_scaler.png', alt: 'Placeholder' });
    return list;
  };

  const comboImages = buildImagesList(combo);

  const activePrice = parseFloat(isDealer && combo.dealer_price ? combo.dealer_price : combo.effective_price);
  const originalPriceVal = parseFloat(combo.original_price);
  const youSaveVal = originalPriceVal - activePrice;
  const discountPct = originalPriceVal > 0 ? Math.round((youSaveVal / originalPriceVal) * 100) : 0;
  const isWishlisted = wishlistItems.some(item => item.id === combo.id);

  const buildCartItem = (): CartItem => ({
    id: combo.id,
    name: combo.title,
    category: 'Combo Deal',
    price: activePrice,
    qty: quantity,
    image: getAbsoluteImageUrl(combo.thumbnail) || '/images/bestseller_scaler.png',
    originalPrice: originalPriceVal,
    isCombo: true,
    slug: combo.slug,
  });

  const toggleWishlist = () => {
    const item = buildCartItem();
    if (!guardAction({ type: 'wishlist-toggle', payload: { item } })) return;
    if (isWishlisted) {
      setWishlistItems(prev => prev.filter(i => i.id !== combo.id));
      showToast('Removed from Wishlist');
    } else {
      setWishlistItems(prev => [...prev, item]);
      showToast('Added to Wishlist');
    }
  };

  const handleAddToCart = () => {
    const item = buildCartItem();
    if (!guardAction({ type: 'add-to-cart', payload: { item } })) return;
    setCartItems(prev => {
      const existing = prev.find(i => i.id === combo.id);
      if (existing) {
        return prev.map(i => i.id === combo.id ? { ...i, qty: i.qty + quantity } : i);
      }
      return [...prev, item];
    });
    showToast(`Added ${quantity}x ${combo.title} to cart`);
  };

  const handleBuyNow = () => {
    const item = buildCartItem();
    if (!guardAction({ type: 'buy-now', payload: { item } })) return;
    onBuyNowDirect(item);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    showToast('Combo link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Fullscreen Pan / Zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragMoved(false);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    setMouseDownTime(Date.now());
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setDragMoved(true);
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dragMoved && Date.now() - mouseDownTime > 150) return;
    if (zoomLevel > 1) { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }
    else { setZoomLevel(2.2); setPanOffset({ x: 0, y: 0 }); }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full bg-[#FAFBFB] pt-[112px] lg:pt-[180px] text-left select-none">

      {/* 1. Breadcrumb row */}
      <div className="max-w-5xl mx-auto px-4 md:px-12 py-4 flex items-center gap-4">
        <Link
          href="/combo-deals"
          className="w-9 h-9 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-100/80 flex items-center justify-center text-slate-600 hover:text-[#006670] hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 hidden md:flex"
          title="Back to Combo Deals"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </Link>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase font-sans overflow-hidden">
          <Link href="/" className="hover:text-[#006670] transition-colors cursor-pointer">Home</Link>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <Link href="/combo-deals" className="hover:text-[#006670] transition-colors cursor-pointer whitespace-nowrap">Combo Deals</Link>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="text-slate-600 truncate">{combo.title}</span>
        </div>
      </div>

      {/* 2. Main product layout */}
      <section className="max-w-5xl mx-auto px-4 md:px-12 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-10">

          {/* ── LEFT: Image Gallery ── */}
          <div className="lg:col-span-6 xl:col-span-7 select-none">

            <style>{`
              .combo-pagination { display:flex; justify-content:center; gap:8px; margin-top:20px; margin-bottom:20px; }
              .combo-pagination .swiper-pagination-bullet { background:#E2E8F0 !important; opacity:1 !important; width:6px !important; height:6px !important; transition:all 0.35s cubic-bezier(0.25,1,0.5,1) !important; }
              .combo-pagination .swiper-pagination-bullet-active { background:#006670 !important; width:20px !important; border-radius:4px !important; }
            `}</style>

            <div className="hidden md:grid grid-cols-[88px_minmax(0,1fr)] gap-[8px] items-start">
              <div className="flex flex-col gap-[10px] shrink-0 sticky top-[140px] self-start w-[88px] z-10">
                {comboImages.map((img: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    onMouseEnter={() => setActiveImageIndex(idx)}
                    className={`w-[88px] h-[88px] bg-white rounded-2xl flex items-center justify-center p-1.5 overflow-hidden transition-all duration-200 cursor-pointer relative group
                      ${activeImageIndex === idx
                        ? 'border-2 border-[#006670] ring-2 ring-[#006670]/25 ring-offset-2 ring-offset-slate-50/50 shadow-md scale-[1.02] z-10 opacity-100'
                        : 'border border-slate-200/80 opacity-65 hover:opacity-100 hover:border-slate-350 hover:scale-[1.01]'
                      }`}
                  >
                    <img src={img.src} alt={img.alt} loading="eager" className="w-full h-full object-contain rounded-xl transition-transform duration-300" />
                  </button>
                ))}
              </div>

              <div
                onClick={() => setIsFullscreenOpen(true)}
                className="w-full aspect-square rounded-[28px] overflow-hidden flex items-center justify-center group relative cursor-zoom-in transition-all duration-300 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.04)] p-4"
              >
                <div className="absolute inset-0 pointer-events-none z-20 rounded-[28px] shadow-[inset_0_0_24px_rgba(0,0,0,0.04)]" />

                <div className="absolute top-6 right-6 flex flex-col gap-3 z-30 pointer-events-auto">
                  <button
                    onClick={e => { e.stopPropagation(); toggleWishlist(); }}
                    className="w-10 h-10 rounded-full bg-white shadow-[0_3px_10px_rgba(0,0,0,0.08)] flex items-center justify-center border border-slate-100 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
                    title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  >
                    <Heart className={`w-5 h-5 transition-all duration-300 ${isWishlisted ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-400 group-hover:text-rose-500'}`} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); copyToClipboard(); }}
                    className="w-10 h-10 rounded-full bg-white shadow-[0_3px_10px_rgba(0,0,0,0.08)] flex items-center justify-center border border-slate-100 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
                    title="Share this combo"
                  >
                    <Share2 className={`w-5 h-5 transition-colors duration-300 ${copiedLink ? 'text-emerald-500' : 'text-slate-400 group-hover:text-[#006670]'}`} />
                  </button>
                </div>

                <div className="absolute top-6 left-6 z-30">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-wider">
                    COMBO DEAL
                  </span>
                </div>

                <img
                  src={comboImages[activeImageIndex]?.src}
                  alt={comboImages[activeImageIndex]?.alt}
                  className="w-full h-full object-contain rounded-2xl select-none transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>

            {/* Mobile gallery — swiper */}
            <div className="block md:hidden w-full">
              <div className="w-full aspect-[4/5] rounded-[24px] relative overflow-hidden bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.015)]">
                <Link
                  href="/combo-deals"
                  className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.06)] flex items-center justify-center border border-slate-100/50 hover:scale-105 active:scale-95 transition-all cursor-pointer text-slate-600 hover:text-[#006670] z-30"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                </Link>
                <div className="absolute top-4 right-4 flex flex-col gap-2.5 z-30">
                  <button
                    onClick={e => { e.stopPropagation(); toggleWishlist(); }}
                    className="w-9 h-9 rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.06)] flex items-center justify-center border border-slate-100 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <Heart className={`w-4 h-4 transition-all duration-300 ${isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); copyToClipboard(); }}
                    className="w-9 h-9 rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.06)] flex items-center justify-center border border-slate-100 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <Share2 className={`w-4 h-4 transition-colors duration-300 ${copiedLink ? 'text-emerald-500' : 'text-slate-400'}`} />
                  </button>
                </div>
                <Swiper
                  modules={[Pagination]}
                  onSwiper={setSwiperRef}
                  pagination={{ clickable: true, el: '.combo-pagination' }}
                  onSlideChange={swiper => setActiveImageIndex(swiper.activeIndex)}
                  className="w-full h-full"
                >
                  {comboImages.map((img: any, idx: number) => (
                    <SwiperSlide key={idx} className="w-full h-full">
                      <div
                        onClick={() => setIsFullscreenOpen(true)}
                        className="w-full h-full flex items-center justify-center p-4 bg-white cursor-zoom-in"
                      >
                        <img src={img.src} alt={img.alt} className="select-none w-full h-full object-cover" />
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
              <div className="combo-pagination" />
              <div className="flex gap-[10px] overflow-x-auto py-3 px-1 scrollbar-none snap-x snap-mandatory">
                {comboImages.map((img: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => { setActiveImageIndex(idx); if (swiperRef) swiperRef.slideTo(idx); }}
                    className={`w-[72px] h-[72px] bg-white rounded-2xl flex items-center justify-center p-1.5 shrink-0 snap-start transition-all duration-200 cursor-pointer overflow-hidden relative
                      ${activeImageIndex === idx
                        ? 'border-2 border-[#006670] ring-2 ring-[#006670]/25 ring-offset-2 ring-offset-slate-50/50 shadow-md scale-[1.02] z-10 opacity-100'
                        : 'border border-slate-200/80 opacity-65 hover:opacity-100 hover:border-slate-350 hover:scale-[1.01]'
                      }`}
                  >
                    <img src={img.src} alt={img.alt} loading="eager" className="w-full h-full object-contain rounded-xl transition-transform duration-300" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Product Info ── */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-start">
            <div className="border-b border-slate-100/60 pb-2.5 mb-2.5">
              <span className="text-[10px] font-extrabold tracking-[0.2em] text-[#006670] uppercase block mb-1 font-sans">
                FAAZO CLINICAL COMBO PACK
              </span>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-tight mb-1.5 font-display">
                {combo.title}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-wider">
                  COMBO DEAL
                </span>
                {combo.is_offer_active && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-wider">
                    LIMITED OFFER
                  </span>
                )}
                {combo.combo_products?.length > 0 && (
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                    {combo.combo_products.length} Products Bundled
                  </span>
                )}
              </div>
            </div>

            <div className="mb-3">
              {isDealer && combo.dealer_price ? (
                <>
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="text-2xl font-black text-[#006670] font-display">
                      ₹{parseFloat(combo.dealer_price).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold font-sans">(Dealer Price)</span>
                    <span className="text-xs text-slate-400 line-through">
                      ₹{parseFloat(combo.combo_price).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] font-black tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md font-sans">
                      EXCLUSIVE WHOLESALE RATE
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="text-2xl font-black text-slate-800 font-display">
                      ₹{activePrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    {originalPriceVal > activePrice && (
                      <span className="text-sm text-slate-400 line-through font-medium">
                        ₹{originalPriceVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    )}
                    {discountPct > 0 && (
                      <span className="text-[10px] font-black tracking-wide text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md font-sans">
                        SAVE {discountPct}%
                      </span>
                    )}
                  </div>
                  {youSaveVal > 0 && (
                    <div className="text-[11px] font-bold text-emerald-700 mt-1 flex items-center gap-1.5 font-sans">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                      Total Bundle Savings: ₹{youSaveVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Included products quick summary pill */}
            {combo.combo_products && combo.combo_products.length > 0 && (
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 mb-3.5">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Includes in this kit:</p>
                <div className="flex flex-wrap gap-1.5">
                  {combo.combo_products.map((cp: any) => (
                    <span key={cp.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200/80 text-[11px] font-semibold text-slate-700 shadow-2xs">
                      <span className="w-4 h-4 rounded-full bg-teal-50 text-[#006670] font-black text-[9px] flex items-center justify-center">{cp.quantity}x</span>
                      {cp.product.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Short description */}
            {combo.short_description && (
              <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed mb-3.5 font-medium">
                {combo.short_description}
              </p>
            )}

            {/* Purchase CTA */}
            <div className="space-y-1.5 mb-3.5">
              <div className="flex gap-2">
                <div className="flex items-center border border-slate-200 rounded-lg px-1 bg-white shrink-0 h-10">
                  <button onClick={() => setQuantity(p => Math.max(1, p - 1))} className="w-6 h-6 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer font-bold"><Minus className="w-3 h-3" /></button>
                  <span className="w-5 text-center text-xs font-bold text-slate-800 font-sans">{quantity}</span>
                  <button onClick={() => setQuantity(p => p + 1)} className="w-6 h-6 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer font-bold"><Plus className="w-3 h-3" /></button>
                </div>
                <button
                  id="combo-add-to-cart-btn"
                  onClick={handleAddToCart}
                  className="flex-grow h-10 rounded-lg bg-white hover:bg-slate-50 text-[#006670] border border-[#006670]/20 hover:border-[#006670] text-xs tracking-wider font-extrabold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                </button>
              </div>
              <button
                onClick={handleBuyNow}
                className="w-full h-10 rounded-lg bg-[#006670] hover:bg-[#004e56] text-white text-xs tracking-wider font-extrabold uppercase transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                Buy Combo Pack Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Prominent "WHAT'S INSIDE THIS COMBO" Section */}
      <section id="combo-whats-inside" className="max-w-5xl mx-auto px-4 md:px-12 pb-12">
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/70 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#006670] shrink-0"></span>
                <span className="text-[10px] font-black tracking-widest text-[#006670] uppercase">WHAT'S INSIDE THIS COMBO</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight font-display">
                Included Products in this Setup
              </h2>
            </div>
            {combo.combo_products && combo.combo_products.length > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-100 text-teal-800 text-xs font-bold shrink-0 self-start sm:self-auto">
                <CheckCircle2 className="w-4 h-4 text-[#006670]" />
                {combo.combo_products.length} {combo.combo_products.length === 1 ? 'Product' : 'Products'} Bundled
              </div>
            )}
          </div>

          {/* Product list */}
          {combo.combo_products && combo.combo_products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
              {combo.combo_products.map((item: any) => {
                const product = item.product;
                const sellingPrice = product.pricing?.selling_price ? parseFloat(product.pricing.selling_price) : null;
                const mrp = product.pricing?.mrp ? parseFloat(product.pricing.mrp) : null;
                const imgUrl = product.primary_image ? getAbsoluteImageUrl(product.primary_image) : '/images/bestseller_scaler.png';

                return (
                  <Link
                    key={item.id}
                    href={`/products/${product.slug}`}
                    className="group relative bg-[#FAFBFB] hover:bg-white border border-slate-200/70 hover:border-[#006670]/40 rounded-2xl p-4 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,102,112,0.08)] flex gap-4 items-center block text-left"
                  >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white border border-slate-200/60 flex items-center justify-center p-2 shrink-0 overflow-hidden relative group-hover:scale-102 transition-transform">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={product.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/bestseller_scaler.png';
                          }}
                        />
                      ) : (
                        <Package className="w-8 h-8 text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-[#006670] text-white uppercase tracking-wider">
                          Qty: {item.quantity}
                        </span>
                        {product.brand_name && (
                          <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-200/70 px-2 py-0.5 rounded-md">
                            {product.brand_name}
                          </span>
                        )}
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> Included in Combo
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-800 group-hover:text-[#006670] transition-colors line-clamp-1 leading-snug">
                        {product.name}
                      </h3>

                      {product.category_name && (
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                          Category: {product.category_name}
                        </p>
                      )}

                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-200/40 pt-1.5">
                        <div className="flex items-baseline gap-1.5">
                          {sellingPrice !== null && (
                            <span className="text-xs font-black text-slate-700">
                              ₹{sellingPrice.toLocaleString('en-IN')}
                            </span>
                          )}
                          {mrp !== null && sellingPrice !== null && mrp > sellingPrice && (
                            <span className="text-[10px] text-slate-400 line-through">
                              ₹{mrp.toLocaleString('en-IN')}
                            </span>
                          )}
                          <span className="text-[9px] text-slate-400 font-medium">
                            (Individual value)
                          </span>
                        </div>

                        <span className="text-[11px] font-bold text-[#006670] inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform shrink-0">
                          View details <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
              <Package className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">No products have been added to this combo yet.</h4>
              <p className="text-xs text-slate-400 mt-1">This bundle setup is currently being prepared.</p>
            </div>
          )}
        </div>
      </section>

      {/* 5. Tabs section */}
      <section className="max-w-5xl mx-auto px-4 md:px-12 pb-16">
        {/* Tab nav */}
        <div className="flex gap-1 border-b border-slate-200/70 mb-8 overflow-x-auto scrollbar-none">
          {(['contents', 'description', 'shipping'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-xs font-extrabold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer border-b-2 -mb-px ${activeTab === tab ? 'border-[#006670] text-[#006670]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              {tab === 'contents' && `What's Inside (${combo.combo_products?.length ?? 0})`}
              {tab === 'description' && 'Description'}
              {tab === 'shipping' && 'Delivery & Returns'}
            </button>
          ))}
        </div>

        {/* Tab: Contents */}
        {activeTab === 'contents' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-medium mb-6">
              This combo pack includes the following <strong className="text-slate-700">{combo.combo_products?.length ?? 0}</strong> products. Click any item to view its complete specifications and manufacturer details.
            </p>
            {combo.combo_products && combo.combo_products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {combo.combo_products.map((item: any) => {
                  const product = item.product;
                  const sellingPrice = product.pricing?.selling_price ? parseFloat(product.pricing.selling_price) : null;
                  const imgUrl = product.primary_image ? getAbsoluteImageUrl(product.primary_image) : '/images/bestseller_scaler.png';

                  return (
                    <Link
                      key={item.id}
                      href={`/products/${product.slug}`}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200/60 hover:border-[#006670]/40 hover:shadow-[0_4px_16px_rgba(0,102,112,0.06)] transition-all cursor-pointer group block text-left"
                    >
                      <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={product.name}
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/bestseller_scaler.png';
                            }}
                          />
                        ) : (
                          <Package className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[9px] font-black uppercase text-[#006670] bg-teal-50 px-1.5 py-0.5 rounded">Qty: {item.quantity}</span>
                          {product.brand_name && (
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{product.brand_name}</span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 group-hover:text-[#006670] transition-colors truncate">{product.name}</h4>
                        {sellingPrice !== null && (
                          <p className="text-[10px] font-bold text-slate-500 mt-1">
                            ₹{sellingPrice.toLocaleString('en-IN')} individual price
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#006670] transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                <Package className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No products have been added to this combo yet.</h4>
              </div>
            )}
          </div>
        )}

        {/* Tab: Description */}
        {activeTab === 'description' && (
          <div
            className="prose max-w-none text-slate-600 leading-relaxed text-sm bg-white p-6 rounded-2xl border border-slate-200/60"
            dangerouslySetInnerHTML={{ __html: combo.full_description || '<p>No detailed description has been published for this combo pack yet.</p>' }}
          />
        )}

        {/* Tab: Shipping */}
        {activeTab === 'shipping' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-600">
            <div className="p-6 bg-white rounded-2xl border border-slate-200/60 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-5 h-5 text-[#006670]" />
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">Delivery Information</h4>
              </div>
              <p className="text-xs">Free shipping on all combo packs across India. Orders placed before 2 PM are dispatched the same day.</p>
              <p className="text-xs">Estimated delivery: <strong className="text-slate-800">3-7 business days</strong> depending on your location.</p>
              <p className="text-xs text-slate-400">Track your order via the profile dashboard after placing.</p>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-slate-200/60 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-[#006670]" />
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">Returns & Warranty</h4>
              </div>
              <p className="text-xs">Easy 7-day return policy. Contact support within 7 days of delivery for a hassle-free return.</p>
              <p className="text-xs">Warranty is applicable on each individual product as per the respective manufacturer's terms.</p>
              <p className="text-xs text-slate-400">For warranty claims, please reach out to FAAZO support with your order ID.</p>
            </div>
          </div>
        )}
      </section>

      {/* 6. Sticky bottom bar (appears when CTA scrolled out of view) */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 ${isStickyVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="max-w-5xl mx-auto px-4 md:px-12 py-3 flex items-center gap-3">
          {combo.thumbnail && (
            <img src={getAbsoluteImageUrl(combo.thumbnail) || ''} alt={combo.title} className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-800 truncate">{combo.title}</p>
            <p className="text-[10px] text-[#006670] font-bold">₹{activePrice.toLocaleString('en-IN')}</p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={combo.inventory <= 0}
            className="px-4 h-9 rounded-lg bg-white border border-[#006670] text-[#006670] text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 transition-all shrink-0 disabled:opacity-50"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Cart
          </button>
          <button
            onClick={handleBuyNow}
            disabled={combo.inventory <= 0}
            className="px-4 h-9 rounded-lg bg-[#006670] hover:bg-[#004e56] text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shrink-0 disabled:opacity-50"
          >
            Buy Now
          </button>
        </div>
      </div>

      {/* 6. Fullscreen Lightbox */}
      {isFullscreenOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => { setIsFullscreenOpen(false); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}
        >
          {/* Close */}
          <button
            onClick={() => { setIsFullscreenOpen(false); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer z-10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Zoom hint */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full text-white text-[10px] font-bold pointer-events-none">
            <ZoomIn className="w-3 h-3" /> Click to {zoomLevel > 1 ? 'zoom out' : 'zoom in'}
          </div>

          {/* Prev */}
          <button
            onClick={e => { e.stopPropagation(); setActiveImageIndex(p => (p - 1 + comboImages.length) % comboImages.length); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer z-10 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Next */}
          <button
            onClick={e => { e.stopPropagation(); setActiveImageIndex(p => (p + 1) % comboImages.length); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer z-10 transition-all"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Image */}
          <div
            className={`max-w-[90vw] max-h-[90vh] overflow-hidden ${zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleImageClick}
          >
            <img
              src={comboImages[activeImageIndex]?.src}
              alt={comboImages[activeImageIndex]?.alt}
              style={{ transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`, transition: isDragging ? 'none' : 'transform 0.3s ease' }}
              className="max-w-[90vw] max-h-[90vh] object-contain select-none"
            />
          </div>

          {/* Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-xs font-bold bg-white/10 px-3 py-1.5 rounded-full">
            {activeImageIndex + 1} / {comboImages.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComboDetailPage;
