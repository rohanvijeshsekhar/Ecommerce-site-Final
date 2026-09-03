'use client';

import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import {
  Heart, ShoppingCart, Share2, ChevronRight, ChevronLeft,
  ShieldCheck, Truck, Check, Plus, Minus, Shield,
  ArrowLeft, Package, CheckCircle2, Sparkles, X, ZoomIn
} from 'lucide-react';
import { api, getAbsoluteImageUrl } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useGuestGuard } from '../../hooks/useGuestGuard';
import type { CartItem } from '../../types/pendingAction';

interface ComboDetailPageProps {
  activeComboId: string; // slug
  setCurrentView: (view: any) => void;
  setActiveProductId: (id: string) => void;
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setIsCartOpen: (open: boolean) => void;
  wishlistItems: CartItem[];
  setWishlistItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  showToast: (msg: string) => void;
  onOpenLoginModal: () => void;
  onProductClick: (id: string) => void;
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
  const [activeTab, setActiveTab] = useState<'description' | 'contents' | 'shipping'>('description');
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
        showToast('Failed to load combo details');
      })
      .finally(() => setLoading(false));
  }, [activeComboId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Image fade transition
  useEffect(() => {
    setIsTransitioning(true);
    const t = setTimeout(() => setIsTransitioning(false), 350);
    return () => clearTimeout(t);
  }, [activeImageIndex]);

  // Scroll-based sticky bar
  useEffect(() => {
    window.scrollTo(0, 0);
    const handleScroll = () => {
      const btn = document.getElementById('combo-add-to-cart-btn');
      if (btn) setIsStickyVisible(btn.getBoundingClientRect().bottom < 0);
    };
    window.addEventListener('scroll', handleScroll);
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
      <div className="flex-grow flex items-center justify-center min-h-[400px] w-full bg-slate-50">
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
        <button onClick={() => setCurrentView('combo-deals')} className="mt-6 px-5 py-2.5 bg-[#006670] text-white rounded-xl font-bold hover:bg-[#004e56] cursor-pointer transition-all">
          View All Combos
        </button>
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
    if (combo.inventory <= 0) { showToast('Item is out of stock'); return; }
    setCartItems(prev => {
      const ex = prev.find(i => i.id === combo.id);
      if (ex) return prev.map(i => i.id === combo.id ? { ...i, qty: i.qty + quantity } : i);
      return [...prev, item];
    });
    showToast('Added to Cart');
  };

  const handleBuyNow = () => {
    const item = buildCartItem();
    if (!guardAction({ type: 'buy-now', payload: { item } })) return;
    if (combo.inventory <= 0) { showToast('Item is out of stock'); return; }
    onBuyNowDirect(item);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    showToast('Combo Link Copied!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Lightbox drag helpers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel === 1) return;
    setIsDragging(true); setDragMoved(false); setMouseDownTime(Date.now());
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = Math.abs(e.clientX - (dragStart.x + panOffset.x));
    const dy = Math.abs(e.clientY - (dragStart.y + panOffset.y));
    if (dx > 4 || dy > 4) setDragMoved(true);
    setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
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
        <button
          onClick={() => setCurrentView('combo-deals')}
          className="w-9 h-9 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-100/80 flex items-center justify-center text-slate-600 hover:text-[#006670] hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 hidden md:flex"
          title="Back to Combo Deals"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase font-sans overflow-hidden">
          <button onClick={() => setCurrentView('home')} className="hover:text-[#006670] transition-colors cursor-pointer">Home</button>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <button onClick={() => setCurrentView('combo-deals')} className="hover:text-[#006670] transition-colors cursor-pointer whitespace-nowrap">Combo Deals</button>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="text-slate-600 truncate">{combo.title}</span>
        </div>
      </div>

      {/* 2. Main product layout */}
      <section className="max-w-5xl mx-auto px-4 md:px-12 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-10">

          {/* ── LEFT: Image Gallery ── */}
          <div className="lg:col-span-6 xl:col-span-7 select-none">

            {/* Swiper pagination styles */}
            <style>{`
              .combo-pagination { display:flex; justify-content:center; gap:8px; margin-top:20px; margin-bottom:20px; }
              .combo-pagination .swiper-pagination-bullet { background:#E2E8F0 !important; opacity:1 !important; width:6px !important; height:6px !important; transition:all 0.35s cubic-bezier(0.25,1,0.5,1) !important; }
              .combo-pagination .swiper-pagination-bullet-active { background:#006670 !important; width:20px !important; border-radius:4px !important; }
            `}</style>

            {/* Desktop gallery — vertical strip + main stage */}
            <div className="hidden md:grid grid-cols-[88px_minmax(0,1fr)] gap-[8px] items-start">
              {/* Left Side: Vertical Thumbnails Strip */}
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

              {/* Main stage */}
              <div
                onClick={() => setIsFullscreenOpen(true)}
                className="w-full aspect-square rounded-[28px] overflow-hidden flex items-center justify-center group relative cursor-zoom-in transition-all duration-300 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.04)] p-4"
              >
                <div className="absolute inset-0 pointer-events-none z-20 rounded-[28px] shadow-[inset_0_0_24px_rgba(0,0,0,0.04)]" />

                {/* Wishlist + Share buttons */}
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
                    title="Share Combo"
                  >
                    <Share2 className={`w-4 h-4 transition-colors duration-300 ${copiedLink ? 'text-emerald-500' : 'text-slate-400 group-hover:text-[#006670]'}`} />
                  </button>
                </div>

                {/* COMBO DEAL badge */}
                <div className="absolute top-6 left-6 z-30">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-wider">
                    COMBO DEAL
                  </span>
                </div>

                {/* Seamless Stacked Image Layers (Zero Blinking / Instant Crossfade like Flipkart/Myntra) */}
                <div className="relative w-full h-full overflow-hidden rounded-[24px]">
                  {comboImages.map((img: any, idx: number) => {
                    const isActive = activeImageIndex === idx;
                    return (
                      <img
                        key={idx}
                        src={img.src}
                        alt={img.alt || ''}
                        loading="eager"
                        className={`absolute inset-0 w-full h-full object-cover select-none transition-all duration-250 ease-out
                          ${isActive
                            ? 'opacity-100 scale-100 z-10'
                            : 'opacity-0 scale-[1.01] z-0 pointer-events-none'
                          }`}
                      />
                    );
                  })}
                </div>

                {/* Prev/next nav buttons (show on hover) */}
                <button
                  onClick={e => { e.stopPropagation(); setActiveImageIndex(p => (p - 1 + comboImages.length) % comboImages.length); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/45 backdrop-blur-md border border-white/20 text-slate-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white/60 hover:scale-105 active:scale-95 shadow-sm cursor-pointer z-20"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setActiveImageIndex(p => (p + 1) % comboImages.length); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/45 backdrop-blur-md border border-white/20 text-slate-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white/60 hover:scale-105 active:scale-95 shadow-sm cursor-pointer z-20"
                >
                  <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Mobile gallery — swiper */}
            <div className="block md:hidden w-full">
              <div className="w-full aspect-[4/5] rounded-[24px] relative overflow-hidden bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.015)]">
                <button
                  onClick={() => setCurrentView('combo-deals')}
                  className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.06)] flex items-center justify-center border border-slate-100/50 hover:scale-105 active:scale-95 transition-all cursor-pointer text-slate-600 hover:text-[#006670] z-30"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
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
                  {comboImages.map((img, idx) => (
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
                {comboImages.map((img, idx) => (
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

            {/* Preload next image */}
            <img src={comboImages[(activeImageIndex + 1) % comboImages.length]?.src} className="hidden" alt="preload" />
          </div>

          {/* ── RIGHT: Product Info ── */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-start">

            {/* Brand + Title + Badge row */}
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
                  <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                    {combo.combo_products.length} Products Bundled
                  </span>
                )}
              </div>
            </div>

            {/* Pricing block */}
            <div className="mb-3">
              {isDealer && combo.dealer_price ? (
                <>
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="text-2xl font-black text-[#006670] font-display">
                      ₹{parseFloat(combo.dealer_price).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold font-sans">(Dealer Price)</span>
                    {parseFloat(combo.combo_price) > parseFloat(combo.dealer_price) && (
                      <span className="text-xs text-slate-400 line-through font-semibold font-sans">
                        ₹{parseFloat(combo.combo_price).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-teal-600" />
                    <p className="text-[10px] text-teal-600 font-bold">Verified wholesale dealer rate applied.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="text-2xl font-black text-slate-900 font-display">
                      ₹{activePrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    {originalPriceVal > activePrice && (
                      <span className="text-xs text-slate-400 line-through font-semibold font-sans">
                        ₹{originalPriceVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    )}
                    {discountPct > 0 && (
                      <span className="px-2 py-0.5 text-[9.5px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full font-sans">
                        {discountPct}% OFF
                      </span>
                    )}
                  </div>
                  {youSaveVal > 0 && (
                    <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                      You save ₹{youSaveVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} vs buying individually
                    </p>
                  )}
                </>
              )}

              {/* Stock status */}
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${combo.inventory > 5 ? 'bg-emerald-500 animate-pulse' : combo.inventory > 0 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                <span className={`text-[10.5px] font-bold ${combo.inventory > 5 ? 'text-slate-600' : combo.inventory > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {combo.inventory > 5 ? 'In Stock' : combo.inventory > 0 ? 'Low Stock' : 'Out of Stock'}
                </span>
                {combo.inventory > 5 && <span className="text-[10.5px] text-slate-400 font-medium font-sans">• Ready to Ship</span>}
                {combo.inventory > 0 && combo.inventory <= 5 && <span className="text-[10.5px] text-amber-500 font-medium font-sans">• Only {combo.inventory} left!</span>}
              </div>
            </div>

            {/* Short description */}
            {combo.short_description && (
              <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed mb-3.5 font-medium">
                {combo.short_description}
              </p>
            )}

            {/* USP mini badges */}
            <div className="grid grid-cols-2 gap-1.5 mb-3.5 border-t border-b border-slate-100/50 py-2.5">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                <div className="w-6 h-6 rounded-md bg-[#e6f3f5]/80 flex items-center justify-center text-[#006670] shrink-0"><ShieldCheck className="w-3.5 h-3.5" /></div>
                <span>100% Genuine</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                <div className="w-6 h-6 rounded-md bg-[#e6f3f5]/80 flex items-center justify-center text-[#006670] shrink-0"><Shield className="w-3.5 h-3.5" /></div>
                <span>Warranty Included</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                <div className="w-6 h-6 rounded-md bg-[#e6f3f5]/80 flex items-center justify-center text-[#006670] shrink-0"><Truck className="w-3.5 h-3.5" /></div>
                <span>Pan India Delivery</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                <div className="w-6 h-6 rounded-md bg-[#e6f3f5]/80 flex items-center justify-center text-[#006670] shrink-0"><Sparkles className="w-3.5 h-3.5" /></div>
                <span>Bundle Savings</span>
              </div>
            </div>

            {/* Purchase CTA */}
            <div className="space-y-1.5 mb-3.5">
              <div className="flex gap-2">
                {/* Quantity */}
                <div className="flex items-center border border-slate-200 rounded-lg px-1 bg-white shrink-0 h-10">
                  <button onClick={() => setQuantity(p => Math.max(1, p - 1))} className="w-6 h-6 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer font-bold"><Minus className="w-3 h-3" /></button>
                  <span className="w-5 text-center text-xs font-bold text-slate-800 font-sans">{quantity}</span>
                  <button onClick={() => setQuantity(p => p + 1)} className="w-6 h-6 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer font-bold"><Plus className="w-3 h-3" /></button>
                </div>
                {/* Add to Cart */}
                <button
                  id="combo-add-to-cart-btn"
                  onClick={handleAddToCart}
                  disabled={combo.inventory <= 0}
                  className="flex-grow h-10 rounded-lg bg-white hover:bg-slate-50 text-[#006670] border border-[#006670]/20 hover:border-[#006670] text-xs tracking-wider font-extrabold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                </button>
              </div>
              {/* Buy Now */}
              <button
                onClick={handleBuyNow}
                disabled={combo.inventory <= 0}
                className="w-full h-10 rounded-lg bg-[#006670] hover:bg-[#004e56] text-white text-xs tracking-wider font-extrabold uppercase transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Buy Combo Pack Now
              </button>
            </div>

            {/* Wishlist & Share links */}
            <div className="flex gap-4 text-[10px] font-bold text-slate-400 mb-3.5 border-b border-slate-100/60 pb-3.5">
              <button onClick={toggleWishlist} className="flex items-center gap-1.5 hover:text-[#006670] transition-colors cursor-pointer">
                <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500 stroke-rose-500 text-rose-500' : ''}`} />
                {isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
              </button>
              <button onClick={copyToClipboard} className="flex items-center gap-1.5 hover:text-[#006670] transition-colors cursor-pointer">
                <Share2 className="w-3.5 h-3.5" />
                {copiedLink ? 'Link Copied!' : 'Share Combo'}
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Trust strip */}
      <section className="bg-white border-t border-b border-slate-100/70 py-4 mb-8 shadow-[0_1px_8px_rgba(0,0,0,0.01)]">
        <div className="max-w-5xl mx-auto px-4 md:px-12 grid grid-cols-2 md:grid-cols-4 gap-5 text-center">
          {[
            { Icon: ShieldCheck, label: '100% Genuine', sub: 'Verified clinical brands' },
            { Icon: Truck, label: 'Free Delivery', sub: 'Pan India shipping' },
            { Icon: Check, label: 'Easy Returns', sub: '7-day return policy' },
            { Icon: Shield, label: 'Warranty', sub: 'On all bundled items' },
          ].map(({ Icon, label, sub }) => (
            <div key={label} className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-xl bg-[#e6f3f5]/80 flex items-center justify-center mb-2">
                <Icon className="w-4.5 h-4.5 text-[#006670]" />
              </div>
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">{label}</span>
              <span className="text-[9px] text-slate-400 font-medium mt-0.5">{sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Tabs section */}
      <section className="max-w-5xl mx-auto px-4 md:px-12 pb-16">
        {/* Tab nav */}
        <div className="flex gap-1 border-b border-slate-200/70 mb-8 overflow-x-auto scrollbar-none">
          {(['description', 'contents', 'shipping'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-xs font-extrabold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer border-b-2 -mb-px ${activeTab === tab ? 'border-[#006670] text-[#006670]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              {tab === 'description' && 'Description'}
              {tab === 'contents' && `What's Inside (${combo.combo_products?.length ?? 0})`}
              {tab === 'shipping' && 'Delivery & Returns'}
            </button>
          ))}
        </div>

        {/* Tab: Description */}
        {activeTab === 'description' && (
          <div
            className="prose max-w-none text-slate-600 leading-relaxed text-sm"
            dangerouslySetInnerHTML={{ __html: combo.full_description || '<p>No detailed description has been published for this combo pack yet.</p>' }}
          />
        )}

        {/* Tab: Contents */}
        {activeTab === 'contents' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-medium mb-6">
              This combo pack includes the following <strong className="text-slate-700">{combo.combo_products?.length}</strong> products. Click any item to view its full details.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {combo.combo_products?.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => onProductClick(item.product.slug)}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200/60 hover:border-[#006670]/40 hover:shadow-[0_4px_16px_rgba(0,102,112,0.06)] transition-all cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                    {item.product.primary_image ? (
                      <img src={item.product.primary_image} alt={item.product.name} className="max-h-full max-w-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-800 group-hover:text-[#006670] transition-colors truncate">{item.product.name}</h4>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {item.product.brand_name && <span className="text-[#006670] font-bold">{item.product.brand_name} · </span>}
                      Qty: <strong className="text-slate-700">{item.quantity}</strong>
                    </p>
                    {item.product.pricing?.selling_price && (
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                        ₹{parseFloat(item.product.pricing.selling_price).toLocaleString('en-IN')} each
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#006670] transition-colors shrink-0" />
                </div>
              ))}
            </div>
          </div>
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

      {/* 5. Sticky bottom bar (appears when CTA scrolled out of view) */}
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
