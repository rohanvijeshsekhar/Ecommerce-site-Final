'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGuestGuard } from '../../hooks/useGuestGuard';
import { api, getAbsoluteImageUrl } from '../../lib/api';

interface PromoProduct {
  id: string;
  title: string;
  manufacturer: string;
  price: number;
  originalPrice: number;
  discount: number;
  image: string;
  rating?: number;
  reviews?: number;
}

interface MockCartItem {
  id: string;
  name: string;
  category: string;
  price: number;
  qty: number;
  image: string;
  originalPrice?: number;
}

interface SpecialPricingProps {
  onProductClick?: (id: string) => void;
  onOpenLoginModal: () => void;
  setCartItems: React.Dispatch<React.SetStateAction<MockCartItem[]>>;
  showToast?: (message: string) => void;
}

interface OfferData {
  heading: string;
  description: string;
  offer_text: string;
  end_date: string | null;
}

const SpecialPricing: React.FC<SpecialPricingProps> = ({ onProductClick, onOpenLoginModal, showToast }) => {
  const { guardAction } = useGuestGuard(onOpenLoginModal, showToast);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [promoProducts, setPromoProducts] = useState<PromoProduct[]>([]);

  // Fetch campaign details and items
  useEffect(() => {
    // 1. Fetch Offer details
    api.get('homepage/offers/')
      .then(res => {
        const data = res.data?.data ?? res.data?.results ?? res.data ?? [];
        const activeOffer = Array.isArray(data) ? data.find((o: any) => o.is_active) : null;
        if (activeOffer) {
          setOffer({
            heading: activeOffer.heading,
            description: activeOffer.description,
            offer_text: activeOffer.offer_text,
            end_date: activeOffer.end_date
          });
        }
      })
      .catch(() => {});

    // 2. Fetch campaign products (using Recommended endpoints)
    const mapPromoProduct = (item: any): PromoProduct => {
      const price = item.pricing ? parseFloat(item.pricing.effective_price || item.pricing.selling_price || '0') : (item.price ? parseFloat(item.price) : 0);
      const mrp = item.pricing ? parseFloat(item.pricing.mrp || '0') : (item.original_price ? parseFloat(item.original_price) : price);
      const discount = item.pricing?.discount_percentage 
        ? Math.round(item.pricing.discount_percentage) 
        : (mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0);

      const rating = item.rating || item.avg_rating ? parseFloat(item.rating || item.avg_rating) : undefined;
      const reviews = item.reviews_count || item.review_count ? parseInt(item.reviews_count || item.review_count) : undefined;

      return {
        id: item.product_slug ?? item.product ?? item.slug ?? String(item.id),
        title: item.product_name ?? item.name ?? 'Special Product',
        manufacturer: item.brand_name || 'Brand',
        price: price,
        originalPrice: mrp,
        discount: discount,
        image: getAbsoluteImageUrl(item.primary_image || item.image) || '/images/bestseller_scaler.png',
        rating: rating,
        reviews: reviews
      };
    };

    api.get('homepage/recommended/')
      .then(res => {
        const data = res.data?.data ?? res.data?.results ?? res.data ?? [];
        if (Array.isArray(data) && data.length > 0) {
          setPromoProducts(data.map(mapPromoProduct));
        } else {
          // Fallback to active catalog products
          api.get('products/?page_size=10')
            .then(pRes => {
              const pData = pRes.data?.data ?? pRes.data?.results ?? pRes.data ?? [];
              if (Array.isArray(pData) && pData.length > 0) {
                setPromoProducts(pData.map(mapPromoProduct));
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // Countdown timer logic
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      let targetDate = new Date();
      
      if (offer?.end_date) {
        targetDate = new Date(offer.end_date);
      } else {
        targetDate.setHours(23, 59, 59, 999);
      }
      
      const diff = targetDate.getTime() - now.getTime();
      if (diff <= 0) {
        return { hours: 24, minutes: 0, seconds: 0 };
      }
      
      const hours = Math.floor((diff / (1000 * 60 * 60)));
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      return { hours, minutes, seconds };
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [offer]);

  // Autoplay logic - pauses when hovered
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      handleNext();
    }, 3000);
    return () => clearInterval(interval);
  }, [isHovered, promoProducts]);

  const handlePrev = () => {
    if (promoProducts.length === 0) return;
    setCurrentIndex(prev => (prev === 0 ? promoProducts.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (promoProducts.length === 0) return;
    setCurrentIndex(prev => (prev === promoProducts.length - 1 ? 0 : prev + 1));
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const p = promoProducts.find(prod => prod.id === id);
    if (!p) return;
    const item: MockCartItem = { id: p.id, name: p.title, category: 'Clinical Equipment', price: p.price, qty: 1, image: p.image, originalPrice: p.originalPrice };
    if (!guardAction({ type: 'wishlist-toggle', payload: { item } })) return;
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const padZero = (num: number) => String(num).padStart(2, '0');

  // If no active offer or no promo products exist in database, gracefully hide the section
  if (!offer || promoProducts.length === 0) {
    return null;
  }

  const activeProduct = promoProducts[currentIndex % promoProducts.length];

  const campaignHeading = offer.heading;
  const campaignDescription = offer.description;
  const badgeText = offer.offer_text;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-8 select-none" id="campaign">
      
      {/* Custom Keyframe Animations */}
      <style>{`
        @keyframes progress-fill {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-progress-fill {
          animation: progress-fill 3000ms linear forwards;
        }

        @keyframes slide-fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-fade-in {
          animation: slide-fade-in 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes parallax-image {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-parallax-image {
          animation: parallax-image 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }

        @keyframes soft-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 14px rgba(0, 43, 46, 0.15); }
          50% { transform: scale(1.05); box-shadow: 0 8px 20px rgba(0, 43, 46, 0.25); }
        }
        .animate-soft-pulse {
          animation: soft-pulse 2s ease-in-out infinite;
        }

        @keyframes sheen {
          100% {
            left: 125%;
          }
        }
        .animate-sheen {
          position: absolute;
          top: 0;
          left: -75%;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.25) 100%
          );
          transform: skewX(-25deg);
          transition: 0.75s;
        }
        .group:hover .animate-sheen {
          animation: sheen 850ms;
        }
      `}</style>

      {/* Main Container: Apple/Dyson style */}
      {/* Desktop view */}
      {/* Desktop view */}
      <div className="hidden lg:grid bg-white rounded-[32px] p-8 border border-slate-200/50 grid-cols-12 gap-8 items-center shadow-[0_15px_35px_rgba(15,23,42,0.02)] h-[400px] max-h-[400px] overflow-hidden">
        
        {/* Left Column: Campaign Copy (col-span-5) */}
        <div className="col-span-5 text-left flex flex-col justify-between h-[336px] w-full pr-4 select-none">
          
          <div>
            {/* Glowing Glass Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 max-w-max">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-black tracking-widest text-[#006670] uppercase font-sans">
                {badgeText}
              </span>
            </div>

            {/* Campaign Heading & Description (Clamped) */}
            <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-tight mt-4 font-display line-clamp-1">
              {campaignHeading}
            </h2>
            <p className="text-xs text-slate-500 mt-2 font-sans line-clamp-2 max-w-xs leading-relaxed">
              {campaignDescription}
            </p>
          </div>

          <div className="w-full">
            {/* Countdown Timer */}
            <div className="bg-slate-50/60 border border-slate-100/80 p-3.5 rounded-2xl w-full max-w-[260px] flex flex-col mb-4">
              {/* Numbers & Colons Row */}
              <div className="flex items-center justify-between px-1">
                <div className="flex-1 text-center">
                  <span className="font-display font-black text-slate-800 text-xl tracking-tight leading-none">
                    {padZero(timeLeft.hours)}
                  </span>
                </div>
                <span className="text-[#006670]/40 font-bold text-base px-0.5 select-none">:</span>
                <div className="flex-1 text-center">
                  <span className="font-display font-black text-slate-800 text-xl tracking-tight leading-none">
                    {padZero(timeLeft.minutes)}
                  </span>
                </div>
                <span className="text-[#006670]/40 font-bold text-base px-0.5 select-none">:</span>
                <div className="flex-1 text-center">
                  <span className="font-display font-black text-[#006670] text-xl tracking-tight leading-none animate-pulse">
                    {padZero(timeLeft.seconds)}
                  </span>
                </div>
              </div>

              {/* Labels Row */}
              <div className="flex justify-between px-1 mt-1 text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="flex-1 text-center">Hours</div>
                <span className="text-transparent text-base px-0.5 select-none">:</span>
                <div className="flex-1 text-center">Mins</div>
                <span className="text-transparent text-base px-0.5 select-none">:</span>
                <div className="flex-1 text-center">Secs</div>
              </div>
            </div>

            {/* CTA Button */}
            <a
              href="#shop"
              onClick={(e) => { e.preventDefault(); if(onProductClick) onProductClick(activeProduct.id); }}
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold shadow-sm transition-all cursor-pointer max-w-max"
            >
              <span>Shop the Campaign</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>

        {/* Right Column: Dynamic Image Container (col-span-7) */}
        <div 
          className="col-span-7 h-[336px] relative rounded-3xl overflow-hidden border border-slate-100 bg-[#FAFBFB] shadow-xs group/image"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Main Campaign Image */}
          <div key={currentIndex} className="w-full h-full animate-slide-fade-in select-none">
            <img
              src={activeProduct.image}
              alt={activeProduct.title}
              className="w-full h-full object-cover transition-transform duration-700 pointer-events-none"
            />

            {/* Pulse Discount Badge */}
            {activeProduct.discount > 0 && (
              <div className="absolute top-4 left-4 bg-[#006670] text-white text-[9.5px] font-black px-3.5 py-1.5 rounded-full shadow-[0_2px_8px_rgba(0,43,46,0.12)] tracking-wider uppercase font-display border border-white/20 animate-soft-pulse z-20">
                {activeProduct.discount}% OFF
              </div>
            )}

            {/* Heart Wishlist Button */}
            <button
              onClick={(e) => toggleFavorite(activeProduct.id, e)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/95 hover:bg-white text-slate-400 hover:text-rose-500 transition-colors shadow-sm border border-slate-100 cursor-pointer z-20"
            >
              <Heart
                className={`w-3.5 h-3.5 ${favorites[activeProduct.id] ? 'fill-rose-500 stroke-rose-500' : 'stroke-slate-400'}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile view container */}
      <div className="block lg:hidden w-full bg-gradient-to-br from-white via-white to-[#F2FAF9]/40 rounded-2xl p-5 border border-slate-200/50 text-left shadow-[0_10px_30px_rgba(15,23,42,0.02)]" id="campaign-mobile">
        {/* Glowing glass pill badge */}
        <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 mb-4">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[9px] font-black tracking-widest text-[#006670] uppercase font-sans">
            {badgeText}
          </span>
        </div>

        <h2 className="text-[28px] font-black text-slate-800 tracking-tight leading-tight mb-2 font-display line-clamp-2">
          {campaignHeading}
        </h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed font-sans line-clamp-3">
          {campaignDescription}
        </p>

        {/* Countdown Timer */}
        <div className="bg-white/60 backdrop-blur-md border border-white/80 p-3.5 rounded-xl shadow-[0_4px_16px_rgba(0, 43, 46,0.01)] w-full max-w-[260px] mb-6 flex flex-col">
          <div className="flex items-center justify-between px-1">
            <div className="flex-1 text-center">
              <span className="font-display font-black text-slate-800 text-xl tracking-tight leading-none">
                {padZero(timeLeft.hours)}
              </span>
            </div>
            <span className="text-[#006670]/40 font-bold text-base px-0.5">:</span>
            <div className="flex-1 text-center">
              <span className="font-display font-black text-slate-800 text-xl tracking-tight leading-none">
                {padZero(timeLeft.minutes)}
              </span>
            </div>
            <span className="text-[#006670]/40 font-bold text-base px-0.5">:</span>
            <div className="flex-1 text-center">
              <span className="font-display font-black text-[#006670] text-xl tracking-tight leading-none animate-pulse">
                {padZero(timeLeft.seconds)}
              </span>
            </div>
          </div>
          <div className="flex justify-between px-1 mt-1 text-[8px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="flex-1 text-center">Hours</div>
            <span className="text-transparent text-base px-0.5">:</span>
            <div className="flex-1 text-center">Mins</div>
            <span className="text-transparent text-base px-0.5">:</span>
            <div className="flex-1 text-center">Secs</div>
          </div>
        </div>

        <a
          href="#shop"
          onClick={(e) => { e.preventDefault(); if(onProductClick) onProductClick(activeProduct.id); }}
          className="group inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-full bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold shadow-md transition-all cursor-pointer mb-8"
        >
          <span>Shop the Campaign</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>

        {/* Product Display */}
        <div 
          className="relative w-full text-center"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Navigation Controls */}
          <div className="absolute top-2.5 right-2.5 flex gap-1.5 z-25">
            <button
              onClick={handlePrev}
              className="w-8 h-8 rounded-full bg-white/95 border border-slate-100 flex items-center justify-center text-[#0F2D30] shadow-sm cursor-pointer"
              aria-label="Previous product"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="w-8 h-8 rounded-full bg-white/95 border border-slate-100 flex items-center justify-center text-[#0F2D30] shadow-sm cursor-pointer"
              aria-label="Next product"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Product Image Panel */}
          <div 
            key={`img-mobile-${currentIndex}`} 
            onClick={() => onProductClick && onProductClick(activeProduct.id)}
            className="relative w-full h-[220px] flex items-center justify-center bg-white rounded-2xl overflow-hidden border border-slate-200/40 p-4 cursor-pointer"
          >
            <img
              src={activeProduct.image}
              alt={activeProduct.title}
              className="max-w-full max-h-full object-contain pointer-events-none mix-blend-multiply"
            />
            {/* Discount Badge */}
            {activeProduct.discount > 0 && (
              <div className="absolute top-3 left-3 bg-[#006670] text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow-sm tracking-wider uppercase">
                {activeProduct.discount}% OFF
              </div>
            )}
          </div>

          {/* Product Details */}
          <div key={`details-mobile-${currentIndex}`} className="text-center mt-4">
            <p className="text-[9px] font-extrabold text-[#006670] tracking-widest uppercase mb-0.5 line-clamp-1">
              {activeProduct.manufacturer}
            </p>
            <h3 className="text-sm font-bold text-slate-800 font-display leading-snug line-clamp-2 min-h-[40px]">
              {activeProduct.title}
            </h3>
            
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-sm font-black text-[#0F2D30] font-display">
                ₹ {activeProduct.price.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-400 line-through">
                ₹ {activeProduct.originalPrice.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Indicators */}
          <div className="flex justify-center gap-1.5 mt-4">
            {promoProducts.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-6 h-1 rounded-full transition-all ${i === currentIndex ? 'bg-[#006670]' : 'bg-slate-200'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SpecialPricing;
