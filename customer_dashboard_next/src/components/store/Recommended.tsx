'use client';

import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation, Autoplay } from 'swiper/modules';
import { ArrowRight, Star, ShoppingCart, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGuestGuard } from '../../hooks/useGuestGuard';
import { api, getAbsoluteImageUrl } from '../../lib/api';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

interface RecProduct {
  id: string;
  title: string;
  manufacturer: string;
  rating: number;
  reviews: number;
  price: number;
  originalPrice?: number;
  image: string;
  discount: string;
  scale?: number;
  gradient?: string;
  glowColor?: string;
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

interface RecommendedProps {
  onProductClick: (id: string) => void;
  onOpenLoginModal: () => void;
  setCartItems: React.Dispatch<React.SetStateAction<MockCartItem[]>>;
  wishlistItems: MockCartItem[];
  setWishlistItems: React.Dispatch<React.SetStateAction<MockCartItem[]>>;
  showToast?: (message: string) => void;
  initialProducts?: RecProduct[];
}

// ─── Static fallback products matching reference design ──────────────
const STATIC_REC_PRODUCTS: RecProduct[] = [
  {
    id: 'nsk-ti-max-z900l',
    title: 'NSK Ti-Max Z900L',
    manufacturer: 'NSK',
    rating: 5,
    reviews: 124,
    price: 24999,
    originalPrice: 29999,
    image: '/images/nsk_handpiece_portrait.png',
    discount: '17% OFF',
  },
  {
    id: 'woodpecker-uds-e',
    title: 'Woodpecker UDS-E LED',
    manufacturer: 'WOODPECKER',
    rating: 5,
    reviews: 87,
    price: 12499,
    originalPrice: 15000,
    image: '/images/bestseller_scaler.png',
    discount: '17% OFF',
  },
  {
    id: 'dentsply-x-smart',
    title: 'Dentsply X-Smart Plus',
    manufacturer: 'DENTSPLY SIRONA',
    rating: 5,
    reviews: 63,
    price: 38500,
    originalPrice: 45000,
    image: '/images/bestseller_scaler.png',
    discount: '14% OFF',
  },
  {
    id: 'planmeca-compact-i',
    title: 'Planmeca Compact i5',
    manufacturer: 'PLANMECA',
    rating: 5,
    reviews: 42,
    price: 189000,
    originalPrice: 210000,
    image: '/images/category_chairs.png',
    discount: '10% OFF',
  },
  {
    id: 'ivoclar-emax',
    title: 'Ivoclar IPS e.max',
    manufacturer: 'IVOCLAR',
    rating: 5,
    reviews: 56,
    price: 8750,
    originalPrice: 9999,
    image: '/images/category_materials.png',
    discount: '13% OFF',
  },
  {
    id: '3m-filtek-z350-xt',
    title: '3M Filtek Z350 XT Composite',
    manufacturer: '3M ESPE',
    rating: 5,
    reviews: 142,
    price: 3200,
    originalPrice: 3850,
    image: '/images/category_materials.png',
    discount: '17% OFF',
  },
  {
    id: 'woodpecker-ai-pex',
    title: 'Woodpecker Ai-Pex Apex Locator',
    manufacturer: 'WOODPECKER',
    rating: 5,
    reviews: 95,
    price: 14800,
    originalPrice: 17500,
    image: '/images/category_small_equipment.png',
    discount: '15% OFF',
  },
  {
    id: 'nsk-pana-max2-m4',
    title: 'NSK Pana-Max2 M4 High Speed',
    manufacturer: 'NSK',
    rating: 5,
    reviews: 110,
    price: 7800,
    originalPrice: 9500,
    image: '/images/category_handpieces.png',
    discount: '18% OFF',
  },
  {
    id: 'vatech-ezsensor-classic',
    title: 'Vatech EzSensor Classic HD',
    manufacturer: 'VATECH',
    rating: 5,
    reviews: 48,
    price: 125000,
    originalPrice: 142000,
    image: '/images/category_imaging.png',
    discount: '12% OFF',
  },
  {
    id: 'waldent-o-star-curing',
    title: 'Waldent O-Star Curing Light',
    manufacturer: 'WALDENT',
    rating: 5,
    reviews: 73,
    price: 4999,
    originalPrice: 6500,
    image: '/images/category_small_equipment.png',
    discount: '23% OFF',
  },
];

const Recommended: React.FC<RecommendedProps> = ({ 
  onProductClick,
  onOpenLoginModal,
  setCartItems,
  showToast,
  initialProducts
}) => {
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [recProducts, setRecProducts] = useState<RecProduct[]>(initialProducts || []);
  const { guardAction } = useGuestGuard(onOpenLoginModal, showToast);

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) return;
    const mapRecProduct = (item: any, index: number): RecProduct => {
      const price = item.pricing ? parseFloat(item.pricing.effective_price || item.pricing.selling_price || '0') : (item.price || 10499);
      const mrp = item.pricing ? parseFloat(item.pricing.mrp || '0') : item.originalPrice;
      const discountPct = item.pricing?.discount_percentage;
      const discountStr = discountPct && discountPct > 0 ? `${Math.round(discountPct)}% OFF` : '';

      return {
        id:           item.product_slug ?? item.product ?? item.slug,
        title:        item.product_name ?? item.name,
        manufacturer: (item.brand_name || 'Brand').toUpperCase(),
        rating:       5,
        reviews:      50 + (index * 7) % 80,
        price:        price,
        originalPrice: mrp && mrp > price ? mrp : undefined,
        image:        getAbsoluteImageUrl(item.primary_image || item.image) || '/images/bestseller_scaler.png',
        discount:     discountStr,
      };
    };

    api.get('homepage/recommended/')
      .then(res => {
        const data = res.data?.data ?? res.data?.results ?? res.data ?? [];
        if (Array.isArray(data) && data.length > 0) {
          setRecProducts(data.map((item, idx) => mapRecProduct(item, idx)));
        } else {
          api.get('products/?page_size=10')
            .then(pRes => {
              const pData = pRes.data?.data ?? pRes.data?.results ?? pRes.data ?? [];
              if (Array.isArray(pData) && pData.length > 0) {
                setRecProducts(pData.map((item: any, idx: number) => mapRecProduct(item, idx)));
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [initialProducts]);

  const displayProducts = recProducts.length > 0 ? recProducts : STATIC_REC_PRODUCTS;

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const p = displayProducts.find(prod => prod.id === id);
    if (!p) return;
    const item: MockCartItem = { id: p.id, name: p.title, category: 'Clinical Equipment', price: p.price, qty: 1, image: p.image, originalPrice: p.originalPrice };
    if (!guardAction({ type: 'wishlist-toggle', payload: { item } })) return;
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCartClick = (e: React.MouseEvent, prod: RecProduct) => {
    e.stopPropagation();
    const item: MockCartItem = { id: prod.id, name: prod.title, category: 'Clinical Equipment', price: prod.price, qty: 1, image: prod.image, originalPrice: prod.originalPrice };
    if (!guardAction({ type: 'add-to-cart', payload: { item } })) return;
    setCartItems(prev => {
      const existing = prev.find(c => c.id === prod.id);
      if (existing) return prev.map(c => c.id === prod.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, item];
    });
    if (showToast) showToast('Added to Cart');
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-10 md:py-14 select-none">
      {/* Pagination bullets custom CSS */}
      <style>{`
        .rec-swiper-pagination .swiper-pagination-bullet {
          background: #CBD5E1 !important;
          opacity: 1 !important;
          width: 8px !important;
          height: 4px !important;
          border-radius: 2px !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          margin: 0 3px !important;
        }
        .rec-swiper-pagination .swiper-pagination-bullet-active {
          background: #006670 !important;
          width: 24px !important;
        }
      `}</style>

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 text-left">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#006670] shrink-0" />
            <h2 className="text-2xl sm:text-3xl md:text-[32px] font-black text-[#0B1D26] tracking-tight font-display">
              Recommended for You
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium pl-5">
            Handpicked solutions based on what professionals like you use.
          </p>
        </div>
        <a 
          href="/products" 
          className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#006670] hover:text-[#004e56] transition-colors shrink-0"
        >
          <span>View All Recommendations</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </a>
      </div>

      {/* Swiper Slider */}
      <div className="w-full relative px-0">
        <Swiper
          modules={[Pagination, Navigation, Autoplay]}
          pagination={{ clickable: true, el: '.rec-swiper-pagination' }}
          navigation={{
            prevEl: '.rec-prev',
            nextEl: '.rec-next',
          }}
          autoplay={{
            delay: 4000,
            disableOnInteraction: false,
          }}
          loop={displayProducts.length > 5}
          spaceBetween={20}
          breakpoints={{
            0: { slidesPerView: 1.2, spaceBetween: 14 },
            480: { slidesPerView: 2, spaceBetween: 16 },
            768: { slidesPerView: 3, spaceBetween: 18 },
            1024: { slidesPerView: 4, spaceBetween: 20 },
            1280: { slidesPerView: 5, spaceBetween: 20 },
          }}
          className="pb-14"
        >
          {displayProducts.map((prod) => (
            <SwiperSlide key={prod.id} className="h-auto">
              <div 
                onClick={() => onProductClick(prod.id)}
                className="group relative bg-white rounded-[28px] p-3.5 border border-slate-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(0,95,99,0.12)] hover:border-[#006670]/30 transition-all duration-300 cursor-pointer flex flex-col justify-between h-full select-none"
              >
                {/* Image Container */}
                <div className="relative w-full aspect-[4/3.6] sm:h-[210px] rounded-[22px] overflow-hidden bg-slate-50 flex items-center justify-center mb-3.5">
                  <img 
                    src={prod.image || '/images/nsk_handpiece_portrait.png'} 
                    alt={prod.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {/* Discount Badge */}
                  {prod.discount && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-extrabold text-white uppercase tracking-wider bg-[#005F63] rounded-full shadow-xs z-10">
                      {prod.discount}
                    </span>
                  )}

                  {/* Wishlist Button */}
                  <button 
                    onClick={(e) => toggleFavorite(prod.id, e)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md text-slate-400 hover:text-rose-500 flex items-center justify-center transition-all duration-200 shadow-xs cursor-pointer z-10"
                    title="Add to Wishlist"
                  >
                    <Heart 
                      className={`w-4 h-4 transition-colors ${
                        favorites[prod.id] 
                          ? 'fill-rose-500 stroke-rose-500 text-rose-500' 
                          : 'stroke-slate-400'
                      }`} 
                    />
                  </button>
                </div>

                {/* Product Information */}
                <div className="flex flex-col flex-1 justify-between text-left px-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-sans">
                      {prod.manufacturer}
                    </span>
                    <h3 className="text-[14px] font-extrabold text-[#0B1D26] tracking-tight truncate mb-2 font-sans">
                      {prod.title}
                    </h3>
                    
                    {/* Star Ratings */}
                    <div className="flex items-center gap-1 mb-3">
                      <div className="flex items-center text-amber-400 gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" 
                          />
                        ))}
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 ml-1">
                        ({prod.reviews})
                      </span>
                    </div>
                  </div>

                  {/* Pricing & Cart Button */}
                  <div className="flex items-center justify-between pt-1 mt-auto">
                    <div className="flex flex-col text-left">
                      <span className="text-base sm:text-[17px] font-black text-[#0B1D26] font-display leading-tight">
                        ₹{prod.price.toLocaleString('en-IN')}
                      </span>
                      {prod.originalPrice && (
                        <span className="text-[11px] text-slate-400 line-through font-semibold mt-0.5">
                          ₹{prod.originalPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={(e) => handleCartClick(e, prod)}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#006670] hover:bg-[#004e56] text-white flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
                      title="Add to Cart"
                    >
                      <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        
        {/* Navigation Arrows */}
        <button 
          className="rec-prev absolute -left-5 sm:-left-6 top-[45%] -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white border border-slate-200/80 text-slate-700 hover:text-[#006670] hover:border-[#006670]/40 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Previous recommendation"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <button 
          className="rec-next absolute -right-5 sm:-right-6 top-[45%] -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white border border-slate-200/80 text-slate-700 hover:text-[#006670] hover:border-[#006670]/40 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Next recommendation"
        >
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Pagination Bullets */}
        <div className="rec-swiper-pagination flex justify-center items-center gap-1.5 absolute bottom-0 left-0 right-0 z-10" />
      </div>
    </section>
  );
};

export default Recommended;
