'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { api, getAbsoluteImageUrl } from '../../lib/api';

import 'swiper/css';

interface ProductItem {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
}

interface MockCartItem {
  id: string;
  name: string;
  category: string;
  price: number;
  qty: number;
  image: string;
  originalPrice?: number;
  rating?: number;
}

interface BestSellersProps {
  onProductClick?: (productId: string) => void;
  onOpenLoginModal?: () => void;
  setCartItems: React.Dispatch<React.SetStateAction<MockCartItem[]>>;
  wishlistItems: MockCartItem[];
  setWishlistItems: React.Dispatch<React.SetStateAction<MockCartItem[]>>;
  showToast?: (msg: string) => void;
  initialProducts?: ProductItem[];
}



// ─── Static fallback products used when backend returns none ──────────────
const STATIC_BEST_SELLERS: ProductItem[] = [
  {
    id: 'nsk-ti-max-z900l',
    title: 'NSK Ti-Max Z900L',
    subtitle: 'High-Speed Turbine Handpiece',
    price: 24999,
    rating: 4.8,
    reviews: 124,
    image: '/images/nsk_handpiece_portrait.png',
  },
  {
    id: 'woodpecker-uds-e',
    title: 'Woodpecker UDS-E LED',
    subtitle: 'Ultrasonic Scaler with LED',
    price: 12499,
    rating: 4.7,
    reviews: 87,
    image: '/images/bestseller_scaler.png',
  },
  {
    id: 'dentsply-x-smart',
    title: 'Dentsply X-Smart Plus',
    subtitle: 'Endodontic Motor System',
    price: 38500,
    rating: 4.9,
    reviews: 63,
    image: '/images/bestseller_scaler.png',
  },
];

const BestSellers: React.FC<BestSellersProps> = ({ 
  onProductClick,
  initialProducts
}) => {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts || []);

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) return;
    const mapBestSeller = (b: any): ProductItem => {
      const price = b.pricing ? parseFloat(b.pricing.effective_price || b.pricing.selling_price || '0') : 0;
      return {
        id:       b.product_slug ?? b.product,
        title:    b.display_heading || b.product_name,
        subtitle: b.display_short_description || '',
        price:    price,
        rating:   4.8,
        reviews:  12,
        image:    getAbsoluteImageUrl(b.display_image_url) || '/images/nsk_handpiece_portrait.png',
      };
    };

    const mapProductToBestSeller = (p: any): ProductItem => {
      const price = p.pricing ? parseFloat(p.pricing.effective_price || p.pricing.selling_price || '0') : 0;
      return {
        id:       p.slug,
        title:    p.name,
        subtitle: p.short_description || '',
        price:    price,
        rating:   4.8,
        reviews:  12,
        image:    getAbsoluteImageUrl(p.primary_image) || '/images/nsk_handpiece_portrait.png',
      };
    };

    api.get('homepage/best-sellers/')
      .then(res => {
        const data = res.data?.data ?? res.data?.results ?? res.data ?? [];
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data.map(mapBestSeller));
        } else {
          // Fallback to active catalog products
          api.get('products/?page_size=10')
            .then(pRes => {
              const pData = pRes.data?.data ?? pRes.data?.results ?? pRes.data ?? [];
              if (Array.isArray(pData) && pData.length > 0) {
                setProducts(pData.map(mapProductToBestSeller));
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [initialProducts]);

  const displayProducts = products.length > 0 ? products : STATIC_BEST_SELLERS;

  return (
    <>
      {/* Desktop view */}
      <section 
        className="hidden md:block w-full py-20 select-none overflow-hidden relative border-y border-slate-200/40" 
        id="products" 
        style={{ 
          perspective: '1400px',
          backgroundColor: '#f7fafb',
          backgroundImage: `
            linear-gradient(to bottom, rgba(248, 250, 252, 0.8), rgba(237, 248, 249, 0.6), rgba(248, 250, 252, 0.8)),
            linear-gradient(rgba(0, 77, 84, 0.30) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 77, 84, 0.30) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 32px 32px, 32px 32px',
        }}
      >

        {/* Ambient Gradient Glow Orbs for Glassmorphic Refraction */}
        <div className="absolute top-1/4 left-1/6 w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-[#006670]/25 via-teal-300/20 to-emerald-200/10 blur-[120px] pointer-events-none z-0 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/6 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-teal-400/20 via-[#004d54]/15 to-emerald-300/15 blur-[120px] pointer-events-none z-0" />

        <div className="max-w-[1400px] mx-auto px-4 md:px-12 text-center relative z-10">

          {/* 3D Glassmorphic Main Card Container (Static) */}
          <div className="w-full bg-white/45 backdrop-blur-2xl border border-white/90 rounded-[40px] shadow-[0_30px_80px_-15px_rgba(0,102,112,0.18),0_15px_35px_-10px_rgba(0,0,0,0.06),inset_0_2px_4px_rgba(255,255,255,0.95),inset_0_-2px_6px_rgba(0,0,0,0.03)] ring-1 ring-black/5 p-8 lg:p-14 relative overflow-hidden group/box">
            {/* Top 3D Light Source Highlight Line */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none z-20" />
            <div className="absolute -top-24 -left-24 w-60 h-60 bg-white/60 rounded-full blur-2xl pointer-events-none z-0" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-white/60 via-white/10 to-transparent rounded-full blur-xl pointer-events-none z-0" />

            {/* Header Section */}
            <div className="mb-14 relative z-10" style={{ transform: 'translateZ(25px)' }}>
              <span className="inline-block text-[11px] font-extrabold tracking-[0.25em] text-[#006670] uppercase mb-3 font-sans bg-[#006670]/10 px-4 py-1.5 rounded-full border border-[#006670]/15 shadow-2xs">
                BEST SELLERS
              </span>
              <h2 className="text-4xl md:text-5xl lg:text-[52px] font-medium text-slate-800 tracking-tight leading-tight mb-4 font-display">
                Crafted for Precision. Preferred by Experts.
              </h2>
              <p className="text-sm md:text-base text-slate-500 font-medium max-w-xl mx-auto">
                Discover our most trusted products, selected by dental professionals
              </p>
            </div>

            {/* CSS Overrides for 3D Bestseller Swiper scale and depth */}
            <style>{`
              .bestseller-swiper {
                overflow: visible !important;
                perspective: 1200px;
                transform-style: preserve-3d;
              }
              .bestseller-swiper .swiper-slide {
                transform: scale(0.82) translateZ(-30px);
                transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.6s ease;
                opacity: 0.4;
                transform-style: preserve-3d;
              }
              .bestseller-swiper .swiper-slide-active {
                transform: scale(1.12) translateZ(45px);
                opacity: 1;
                z-index: 20;
                transform-style: preserve-3d;
              }
              .bestseller-swiper .swiper-slide-active .glass-3d-card {
                box-shadow: 0 25px 50px -12px rgba(0, 95, 99, 0.22), 0 16px 32px -8px rgba(0, 0, 0, 0.08), inset 0 2px 4px rgba(255, 255, 255, 0.95);
                border-color: rgba(255, 255, 255, 0.95);
              }
              .bestseller-swiper .swiper-slide-active .slide-details {
                opacity: 1;
                transform: translateY(0);
              }
              .bestseller-swiper .slide-details {
                transition: opacity 0.5s ease, transform 0.5s ease;
              }
            `}</style>

            {/* Carousel Wrapper */}
            <div className="relative w-full px-10 md:px-14" style={{ transform: 'translateZ(35px)' }}>
              <Swiper
                modules={[Navigation, Autoplay]}
                navigation={{
                  prevEl: '.bestseller-prev',
                  nextEl: '.bestseller-next',
                }}
                autoplay={{
                  delay: 3000,
                  disableOnInteraction: false,
                }}
                loop={displayProducts.length > 3}
                centeredSlides={true}
                slidesPerView={1}
                spaceBetween={20}
                breakpoints={{
                  640: {
                    slidesPerView: 2,
                    spaceBetween: 30,
                  },
                  1024: {
                    slidesPerView: 3,
                    spaceBetween: 40,
                  }
                }}
                className="bestseller-swiper pb-8"
              >
                {displayProducts.map((prod) => (
                  <SwiperSlide key={prod.id}>
                    <div className="flex flex-col items-center cursor-pointer group" onClick={() => onProductClick?.(prod.id)}>

                      {/* Glass 3D Image Panel */}
                      <div className="glass-3d-card w-full aspect-square bg-gradient-to-b from-white/90 to-white/70 backdrop-blur-md rounded-2xl overflow-hidden border border-white/90 shadow-[0_8px_24px_rgba(0,0,0,0.04),inset_0_2px_4px_rgba(255,255,255,0.9)] transition-all duration-500 group-hover:scale-[1.02] flex items-center justify-center relative">
                        <Image
                          src={prod.image || '/images/nsk_handpiece_portrait.png'}
                          alt={prod.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover transform transition-transform duration-700 group-hover:scale-[1.04]"
                        />
                      </div>

                      {/* Centered Details */}
                      <div className="text-center mt-6 slide-details w-full px-2">
                        <h3 className="text-[15px] sm:text-[16px] font-medium text-slate-800 tracking-tight leading-snug">
                          <span className="block font-bold line-clamp-1 min-h-[22px]">{prod.title}</span>
                          <span className="block text-slate-500 mt-0.5 line-clamp-2 min-h-[36px]">{prod.subtitle}</span>
                        </h3>

                        {/* Price */}
                        <p className="text-[16px] font-extrabold text-[#0F2D30] mt-2 font-display">
                          ₹ {prod.price.toLocaleString('en-IN')}
                        </p>

                        {/* Ratings */}
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                          <div className="flex items-center text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${i < Math.floor(prod.rating)
                                    ? 'fill-amber-400 stroke-amber-400'
                                    : 'stroke-slate-300'
                                  }`}
                              />
                            ))}
                          </div>
                          <span className="text-[12px] font-bold text-slate-700 mt-0.5">
                            {prod.rating}
                            <span className="text-slate-400 font-medium ml-1">({prod.reviews})</span>
                          </span>
                        </div>
                      </div>

                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>

              {/* 3D Elevated Navigation Controls */}
              <button
                className="bestseller-prev absolute left-0 top-[40%] -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-gradient-to-br from-[#13373B] to-[#0A2022] text-white flex items-center justify-center hover:from-[#006670] hover:to-[#004d54] transition-all shadow-[0_10px_25px_rgba(0,60,65,0.35),inset_0_1px_2px_rgba(255,255,255,0.3)] border border-white/20 active:scale-95 cursor-pointer transform hover:scale-105"
                aria-label="Previous bestseller"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
              </button>

              <button
                className="bestseller-next absolute right-0 top-[40%] -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-gradient-to-br from-[#13373B] to-[#0A2022] text-white flex items-center justify-center hover:from-[#006670] hover:to-[#004d54] transition-all shadow-[0_10px_25px_rgba(0,60,65,0.35),inset_0_1px_2px_rgba(255,255,255,0.3)] border border-white/20 active:scale-95 cursor-pointer transform hover:scale-105"
                aria-label="Next bestseller"
              >
                <ChevronRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* Mobile view */}
      <section 
        className="block md:hidden w-full py-12 select-none overflow-hidden relative border-y border-slate-200/40" 
        id="products-mobile"
        style={{
          backgroundColor: '#f7fafb',
          backgroundImage: `
            linear-gradient(to bottom, rgba(248, 250, 252, 0.8), rgba(237, 248, 249, 0.6), rgba(248, 250, 252, 0.8)),
            linear-gradient(rgba(0, 77, 84, 0.30) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 77, 84, 0.30) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 24px 24px, 24px 24px',
        }}
      >

        {/* Ambient Gradient Glow Orb */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full bg-gradient-to-tr from-[#006670]/20 via-teal-300/20 to-emerald-200/15 blur-[90px] pointer-events-none z-0" />

        <div className="w-full px-4 text-center relative z-10">

          {/* Glass Container Card */}
          <div className="w-full bg-white/45 backdrop-blur-xl border border-white/80 rounded-3xl p-5 shadow-[0_12px_36px_rgba(0,102,112,0.06),0_1px_2px_rgba(255,255,255,0.8)] relative overflow-hidden">

            {/* Header Section */}
            <div className="mb-8 text-left relative z-10">
              <span className="inline-block text-[10px] font-extrabold tracking-[0.25em] text-[#006670] uppercase mb-2 font-sans bg-[#006670]/10 px-3 py-1 rounded-full border border-[#006670]/15">
                BEST SELLERS
              </span>
              <h2 className="text-[28px] font-black text-slate-800 tracking-tight leading-tight mb-2 font-display">
                Crafted for Precision.<br />Preferred by Experts.
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Discover our most trusted products.
              </p>
            </div>

            {/* Carousel Wrapper */}
            <div className="relative w-full px-0">
              <Swiper
                modules={[Autoplay]}
                autoplay={{
                  delay: 3000,
                  disableOnInteraction: false,
                }}
                loop={displayProducts.length > 3}
                centeredSlides={true}
                slidesPerView={1.2}
                spaceBetween={16}
                allowTouchMove={true}
                grabCursor={true}
                className="bestseller-swiper pb-6"
              >
                {displayProducts.map((prod) => (
                  <SwiperSlide key={prod.id}>
                    <div className="flex flex-col items-center cursor-pointer group text-center" onClick={() => onProductClick?.(prod.id)}>
                      {/* Glass Image Panel */}
                      <div className="w-full aspect-square bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden border border-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.03)] transition-all duration-500 group-hover:shadow-[0_12px_28px_rgba(0,95,99,0.1)] flex items-center justify-center relative">
                        <Image
                          src={prod.image || '/images/nsk_handpiece_portrait.png'}
                          alt={prod.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover transform transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      </div>

                      {/* Centered Details */}
                      <div className="text-center mt-6 slide-details w-full px-2">
                        <h3 className="text-[14px] sm:text-[15px] font-medium text-slate-800 tracking-tight leading-snug">
                          <span className="block font-bold line-clamp-1 min-h-[20px]">{prod.title}</span>
                          <span className="block text-slate-500 mt-0.5 line-clamp-2 min-h-[32px]">{prod.subtitle}</span>
                        </h3>

                        {/* Price */}
                        <p className="text-[16px] font-extrabold text-[#0F2D30] mt-2 font-display">
                          ₹ {prod.price.toLocaleString('en-IN')}
                        </p>

                        {/* Ratings */}
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                          <div className="flex items-center text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${i < Math.floor(prod.rating)
                                    ? 'fill-amber-400 stroke-amber-400'
                                    : 'stroke-slate-300'
                                  }`}
                              />
                            ))}
                          </div>
                          <span className="text-[12px] font-bold text-slate-700 mt-0.5">
                            {prod.rating}
                            <span className="text-slate-400 font-medium ml-1">({prod.reviews})</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default BestSellers;
