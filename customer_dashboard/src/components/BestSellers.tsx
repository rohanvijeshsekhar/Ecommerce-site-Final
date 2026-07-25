import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { api, getAbsoluteImageUrl } from '../services/api';

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
}

// Rich, high-density small dental equipment illustration background pattern (11% opacity)
const DentalEquipmentDoodlePattern = ({ id }: { id: string }) => (
  <div className="absolute inset-0 pointer-events-none opacity-[0.11] overflow-hidden z-0 select-none">
    <svg className="w-full h-full text-slate-800" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={id} width="160" height="160" patternUnits="userSpaceOnUse">
          {/* 1. High-Speed Dental Handpiece / Drill */}
          <g transform="translate(10, 10) scale(0.65)">
            <path d="M5 25 L35 15 M35 15 L40 5 M40 5 C43 5, 45 8, 43 11 L35 15" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
            <circle cx="41" cy="7" r="3" fill="currentColor"/>
            <path d="M5 25 C4 28, 7 31, 10 30 L22 25" fill="none" stroke="currentColor" strokeWidth="2.2"/>
          </g>

          {/* 2. Dental Mouth Mirror */}
          <g transform="translate(95, 12) scale(0.65)">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.6"/>
            <path d="M12 22 L28 42" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
            <line x1="6" y1="8" x2="18" y2="16" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2 2"/>
          </g>

          {/* 3. Molar Tooth with Sparkles */}
          <g transform="translate(55, 8) scale(0.6)">
            <path d="M10 8 C10 3, 16 0, 21 0 C26 0, 28 4, 31 4 C34 4, 36 0, 41 0 C46 0, 52 3, 52 8 C52 17, 49 28, 45 35 C43 38, 40 34, 37 28 C34 34, 31 38, 29 35 C25 28, 10 17, 10 8 Z" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M55 2 L57 8 L63 10 L57 12 L55 18 L53 12 L47 10 L53 8 Z" fill="currentColor"/>
          </g>

          {/* 4. Dental Explorer Probe */}
          <g transform="translate(12, 60) scale(0.65)">
            <path d="M5 40 L25 20 C30 15, 35 10, 32 5 C30 2, 25 5, 24 8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
            <line x1="5" y1="40" x2="0" y2="45" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"/>
          </g>

          {/* 5. Ultrasonic Scaler Unit */}
          <g transform="translate(55, 58) scale(0.6)">
            <rect x="5" y="15" width="40" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="2.6"/>
            <path d="M45 22 L58 22 L65 14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
            <circle cx="15" cy="22" r="3" fill="currentColor"/>
            <path d="M0 22 L5 22" stroke="currentColor" strokeWidth="2.8"/>
          </g>

          {/* 6. Anesthetic Syringe */}
          <g transform="translate(105, 62) scale(0.6)">
            <rect x="10" y="10" width="30" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2.6"/>
            <line x1="0" y1="16" x2="10" y2="16" stroke="currentColor" strokeWidth="2.6"/>
            <line x1="40" y1="16" x2="52" y2="16" stroke="currentColor" strokeWidth="2.6"/>
            <line x1="52" y1="12" x2="52" y2="20" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
          </g>

          {/* 7. Clinical Dental Chair */}
          <g transform="translate(10, 108) scale(0.65)">
            <path d="M10 5 L10 25 L35 25 L45 35" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="20" y1="25" x2="20" y2="42" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"/>
            <line x1="12" y1="42" x2="28" y2="42" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"/>
          </g>

          {/* 8. Sterilization Autoclave Pouch */}
          <g transform="translate(58, 110) scale(0.65)">
            <path d="M10 5 L35 5 C38 5, 40 7, 40 10 L40 35 C40 38, 38 40, 35 40 L10 40 C7 40, 5 38, 5 35 L5 10 C5 7, 7 5, 10 5 Z" fill="none" stroke="currentColor" strokeWidth="2.6"/>
            <path d="M15 18 L22 25 L32 15" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
          </g>

          {/* 9. Endodontic Root Canal File */}
          <g transform="translate(110, 108) scale(0.65)">
            <path d="M10 40 L25 10" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"/>
            <path d="M12 36 L16 38 M15 30 L19 32 M18 24 L22 26 M21 18 L25 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            <rect x="5" y="40" width="10" height="8" rx="2" fill="currentColor"/>
          </g>

          {/* 10. Dental Curing Light */}
          <g transform="translate(130, 58) scale(0.55)">
            <path d="M10 5 L20 5 L20 30 L10 30 Z" fill="none" stroke="currentColor" strokeWidth="2.6"/>
            <path d="M15 30 L15 45 L5 55" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
          </g>

          {/* 11. Dental Forceps */}
          <g transform="translate(132, 108) scale(0.55)">
            <path d="M10 5 C10 15, 20 20, 20 35 M20 5 C20 15, 10 20, 10 35" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  </div>
);

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

const BestSellers: React.FC<BestSellersProps> = ({ onProductClick }) => {
  const [products, setProducts] = useState<ProductItem[]>([]);

  useEffect(() => {
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
  }, []);

  const displayProducts = products.length > 0 ? products : STATIC_BEST_SELLERS;

  return (
    <>
      {/* Desktop view */}
      <section className="hidden md:block w-full bg-white py-20 select-none overflow-hidden relative" id="products">
        {/* High-density dental equipment illustration background */}
        <DentalEquipmentDoodlePattern id="dental-equip-pattern-vite-desk" />

        <div className="max-w-[1400px] mx-auto px-4 md:px-12 text-center relative z-10">

          {/* Header Section */}
          <div className="mb-14">
            <span className="block text-[11px] font-extrabold tracking-[0.25em] text-[#006670] uppercase mb-3 font-sans">
              BEST SELLERS
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-[52px] font-medium text-slate-800 tracking-tight leading-tight mb-4">
              Crafted for Precision. Preferred by Experts.
            </h2>
            <p className="text-sm md:text-base text-slate-500 font-medium max-w-xl mx-auto">
              Discover our most trusted products, selected by dental professionals
            </p>
          </div>

          {/* CSS Overrides for Bestseller Swiper scale and opacity */}
          <style>{`
            .bestseller-swiper {
              overflow: visible !important;
            }
            .bestseller-swiper .swiper-slide {
              transform: scale(0.85);
              transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.6s ease;
              opacity: 0.45;
            }
            .bestseller-swiper .swiper-slide-active {
              transform: scale(1.1);
              opacity: 1;
              z-index: 10;
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
          <div className="relative w-full px-10 md:px-14">
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

                    {/* Image Panel */}
                    <div className="w-full aspect-square bg-[#F7FAF9] rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.02)] transition-shadow duration-300 group-hover:shadow-[0_12px_28px_rgba(0,0,0,0.05)] flex items-center justify-center relative">
                      <img
                        src={prod.image}
                        alt={prod.title}
                        className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-[1.03]"
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

            {/* Navigation Controls */}
            <button
              className="bestseller-prev absolute left-0 top-[40%] -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-[#0F2D30] text-white flex items-center justify-center hover:bg-[#006670] transition-all shadow-md active:scale-95 cursor-pointer"
              aria-label="Previous bestseller"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>

            <button
              className="bestseller-next absolute right-0 top-[40%] -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-[#0F2D30] text-white flex items-center justify-center hover:bg-[#006670] transition-all shadow-md active:scale-95 cursor-pointer"
              aria-label="Next bestseller"
            >
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

        </div>
      </section>

      {/* Mobile view */}
      <section className="block md:hidden w-full bg-white py-12 select-none overflow-hidden relative" id="products-mobile">
        {/* High-density dental equipment illustration background */}
        <DentalEquipmentDoodlePattern id="dental-equip-pattern-vite-mob" />

        <div className="w-full px-5 text-center relative z-10">
          {/* Header Section */}
          <div className="mb-8 text-left">
            <span className="block text-[10px] font-extrabold tracking-[0.25em] text-[#006670] uppercase mb-2 font-sans">
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
                    {/* Image Panel */}
                    <div className="w-full aspect-square bg-[#F7FAF9] rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.02)] transition-shadow duration-300 group-hover:shadow-[0_12px_28px_rgba(0,0,0,0.05)] flex items-center justify-center relative">
                      <img
                        src={prod.image}
                        alt={prod.title}
                        className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-[1.03]"
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
      </section>
    </>
  );
};

export default BestSellers;
