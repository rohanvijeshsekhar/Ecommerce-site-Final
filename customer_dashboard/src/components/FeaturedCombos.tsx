import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation, Autoplay } from 'swiper/modules';
import { ArrowRight, ShoppingCart, Heart, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api, getAbsoluteImageUrl } from '../services/api';
import type { CartItem } from '../types/pendingAction';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

interface FeaturedCombosProps {
  onComboClick: (slug: string) => void;
  setCurrentView: (view: any) => void;
  setCartItems: React.SetStateAction<any>;
  wishlistItems: CartItem[];
  setWishlistItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  showToast: (msg: string) => void;
  onOpenLoginModal: () => void;
}

const FeaturedCombos: React.FC<FeaturedCombosProps> = ({
  onComboClick,
  setCurrentView,
  setCartItems,
  wishlistItems,
  setWishlistItems,
  showToast,
  onOpenLoginModal
}) => {
  const { user, isAuthenticated } = useAuth();
  const isDealer = user?.role === 'dealer';

  const [combos, setCombos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('combos/?is_featured=true')
      .then(res => {
        const data = res.data?.data ?? res.data?.results ?? res.data ?? [];
        if (Array.isArray(data)) {
          setCombos(data);
        }
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const isWishlisted = (id: string) => wishlistItems.some(item => item.id === id);

  const toggleWishlist = (combo: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      onOpenLoginModal();
      return;
    }

    const isFav = isWishlisted(combo.id);
    if (isFav) {
      setWishlistItems(prev => prev.filter(item => item.id !== combo.id));
      showToast('Removed from Wishlist');
    } else {
      const item: CartItem = {
        id: combo.id,
        name: combo.title,
        category: 'Combo Deal',
        price: parseFloat(isDealer && combo.dealer_price ? combo.dealer_price : combo.effective_price),
        qty: 1,
        image: getAbsoluteImageUrl(combo.thumbnail) || '/images/bestseller_scaler.png',
        originalPrice: parseFloat(combo.original_price),
        isCombo: true,
        slug: combo.slug
      };
      setWishlistItems(prev => [...prev, item]);
      showToast('Added to Wishlist');
    }
  };

  const handleAddToCart = (combo: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      onOpenLoginModal();
      return;
    }

    if (combo.inventory <= 0) {
      showToast('Item is out of stock');
      return;
    }

    const price = parseFloat(isDealer && combo.dealer_price ? combo.dealer_price : combo.effective_price);
    const item: CartItem = {
      id: combo.id,
      name: combo.title,
      category: 'Combo Deal',
      price: price,
      qty: 1,
      image: getAbsoluteImageUrl(combo.thumbnail) || '/images/bestseller_scaler.png',
      originalPrice: parseFloat(combo.original_price),
      isCombo: true,
      slug: combo.slug
    };

    setCartItems((prev: any) => {
      const existing = prev.find((i: any) => i.id === combo.id);
      if (existing) {
        return prev.map((i: any) => i.id === combo.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, item];
    });
    showToast('Added to Cart');
  };

  if (loading || combos.length === 0) return null;

  return (
    <>
      {/* Desktop view */}
      <section className="hidden md:block w-full bg-[#F8FAFC] border-y border-slate-200/60 py-16 select-none" id="featured-combos">
        <div className="max-w-7xl mx-auto px-8">
        <style>{`
          .combo-swiper-pagination .swiper-pagination-bullet {
            background: #CBD5E1 !important;
            opacity: 1 !important;
            width: 8px !important;
            height: 4px !important;
            border-radius: 2px !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            margin: 0 3px !important;
          }
          .combo-swiper-pagination .swiper-pagination-bullet-active {
            background: #006670 !important;
            width: 24px !important;
          }
        `}</style>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 text-left">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mb-0.5 animate-pulse"></span>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight font-display">
                Featured Combo Deals
              </h2>
            </div>
            <p className="text-sm text-slate-500 font-medium pl-[18px]">
              Unlock massive savings with our pre-packaged dental tool setups and clinician bundles.
            </p>
          </div>
          <button
            onClick={() => { setCurrentView('combo-deals'); window.scrollTo(0, 0); }}
            className="group inline-flex items-center gap-1.5 text-sm font-bold text-[#006670] hover:text-[#004e56] transition-colors cursor-pointer"
          >
            View All Combo Deals
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Swiper Slider */}
        <div className="w-full relative px-0">
          <Swiper
            modules={[Pagination, Navigation, Autoplay]}
            pagination={{ clickable: true, el: '.combo-swiper-pagination' }}
            navigation={{
              prevEl: '.combo-prev',
              nextEl: '.combo-next',
            }}
            autoplay={{
              delay: 4000,
              disableOnInteraction: false,
            }}
            loop={combos.length > 3}
            spaceBetween={24}
            slidesPerView={Math.min(combos.length, 4)}
            className="pb-16"
          >
            {combos.map((combo) => {
              const activePrice = parseFloat(isDealer && combo.dealer_price ? combo.dealer_price : combo.effective_price);
              const originalPriceVal = parseFloat(combo.original_price);
              const youSaveVal = originalPriceVal - activePrice;
              const discountPct = originalPriceVal > 0 ? Math.round((youSaveVal / originalPriceVal) * 100) : 0;

              return (
                <SwiperSlide key={combo.id}>
                  <div
                    className="group relative bg-white hover:bg-slate-50 rounded-[24px] p-5 border border-slate-100 shadow-sm hover:shadow-premium transition-all duration-500 ease-out cursor-pointer h-[445px] overflow-hidden flex flex-col justify-between"
                    onClick={() => onComboClick(combo.slug)}
                  >
                    <div>
                      {/* Badge / Wishlist */}
                      <span className="absolute top-8 left-8 z-10 inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-wider">
                        COMBO DEAL
                      </span>
                      <button
                        onClick={(e) => toggleWishlist(combo, e)}
                        className={`absolute top-8 right-8 z-20 w-8 h-8 rounded-full border bg-white flex items-center justify-center transition-all duration-200 cursor-pointer ${isWishlisted(combo.id) ? 'text-rose-500 border-rose-100 bg-rose-50' : 'text-slate-400 hover:text-slate-600 border-slate-100 shadow-xs'}`}
                      >
                        <Heart className={`w-4 h-4 ${isWishlisted(combo.id) ? 'fill-rose-500' : ''}`} />
                      </button>

                      {/* Image */}
                      <div className="relative w-full aspect-square rounded-2xl bg-slate-50 border border-slate-100/50 flex items-center justify-center p-2 mb-4 overflow-hidden">
                        {combo.thumbnail ? (
                          <img
                            src={getAbsoluteImageUrl(combo.thumbnail)}
                            alt={combo.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <Sparkles className="w-8 h-8 text-slate-300" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="space-y-1 text-left">
                        <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">FAAZO EXCLUSIVE</span>
                        <h3 className="text-sm font-bold text-slate-800 line-clamp-1 leading-snug tracking-tight">
                          {combo.title}
                        </h3>
                        <p className="text-xs font-semibold text-teal-600">
                          {combo.combo_products.length} products included
                        </p>
                      </div>
                    </div>

                    {/* Bottom Pricing */}
                    <div className="space-y-3 mt-4 text-left">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black text-slate-800">
                            ₹{activePrice.toLocaleString('en-IN')}
                          </span>
                          {originalPriceVal > activePrice && (
                            <span className="text-xs text-slate-400 line-through">
                              ₹{originalPriceVal.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        {originalPriceVal > activePrice && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-black tracking-wide text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">
                              SAVE {discountPct}%
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              Save ₹{youSaveVal.toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <span className={`text-[10px] font-bold ${combo.inventory > 5 ? 'text-emerald-600' : combo.inventory > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                          {combo.inventory > 5 ? 'In Stock' : combo.inventory > 0 ? 'Low Stock' : 'Out of Stock'}
                        </span>
                        <button
                          onClick={(e) => handleAddToCart(combo, e)}
                          disabled={combo.inventory <= 0}
                          className="flex items-center justify-center p-2 text-white bg-[#006670] hover:bg-[#004e56] disabled:bg-slate-100 disabled:text-slate-400 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer shrink-0"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>

          {/* Navigation controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
            <button className="combo-prev w-9 h-9 rounded-xl bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all shadow-xs cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="combo-swiper-pagination flex items-center justify-center min-w-16" />
            <button className="combo-next w-9 h-9 rounded-xl bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all shadow-xs cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Mobile view */}
      <section className="block md:hidden w-full px-5 py-8 select-none bg-[#F8FAFC] border-y border-slate-200/60" id="featured-combos-mobile">
        <div className="flex items-center justify-between mb-6 text-left">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Featured Combo Deals
            </h2>
            <p className="text-xs text-slate-400 font-medium">Pre-packaged dental setups.</p>
          </div>
          <button
            onClick={() => { setCurrentView('combo-deals'); window.scrollTo(0, 0); }}
            className="text-xs font-bold text-[#006670] hover:text-[#004e56] shrink-0"
          >
            View All
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory">
          {combos.map((combo) => {
            const activePrice = parseFloat(isDealer && combo.dealer_price ? combo.dealer_price : combo.effective_price);
            const originalPriceVal = parseFloat(combo.original_price);
            const youSaveVal = originalPriceVal - activePrice;
            const discountPct = originalPriceVal > 0 ? Math.round((youSaveVal / originalPriceVal) * 100) : 0;

            return (
              <div
                key={combo.id}
                onClick={() => onComboClick(combo.slug)}
                className="w-64 bg-white border border-slate-200/50 rounded-2xl p-4 shrink-0 snap-start shadow-xs flex flex-col justify-between h-[360px]"
              >
                <div>
                  <div className="relative aspect-square rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-1 mb-3 overflow-hidden">
                    {combo.thumbnail ? (
                      <img src={getAbsoluteImageUrl(combo.thumbnail)} alt={combo.title} className="w-full h-full object-cover" />
                    ) : (
                      <Sparkles className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 line-clamp-1 leading-snug">{combo.title}</h3>
                  <p className="text-[10px] font-semibold text-teal-600 mt-0.5">{combo.combo_products.length} products included</p>
                </div>

                <div className="space-y-3 mt-3">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-black text-slate-850">₹{activePrice.toLocaleString('en-IN')}</span>
                      {originalPriceVal > activePrice && (
                        <span className="text-[10px] text-slate-450 line-through">₹{originalPriceVal.toLocaleString('en-IN')}</span>
                      )}
                    </div>
                    {originalPriceVal > activePrice && (
                      <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1 py-0.5 rounded-md inline-block mt-0.5">
                        SAVE {discountPct}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] font-bold">
                    <span className={combo.inventory > 0 ? 'text-emerald-600' : 'text-rose-500'}>
                      {combo.inventory > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                    <button
                      onClick={(e) => handleAddToCart(combo, e)}
                      disabled={combo.inventory <= 0}
                      className="p-1.5 text-white bg-[#006670] rounded-lg cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
};

export default FeaturedCombos;
