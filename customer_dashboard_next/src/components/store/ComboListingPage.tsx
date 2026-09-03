'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Heart, ShoppingBag, Eye, Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { api, getAbsoluteImageUrl } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import type { CartItem } from '../../types/pendingAction';

interface ComboListingPageProps {
  setCurrentView: (view: any) => void;
  setActiveComboId: (id: string) => void;
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  wishlistItems: CartItem[];
  setWishlistItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  showToast: (msg: string) => void;
  onOpenLoginModal: () => void;
}

const ComboListingPage: React.FC<ComboListingPageProps> = ({
  setCurrentView,
  setActiveComboId,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, price-asc, price-desc, discount
  const [stockFilter, setStockFilter] = useState('all'); // all, instock

  const [bannerSettings, setBannerSettings] = useState<{
    badge_text: string;
    title: string;
    description: string;
    banner_image: string | null;
  }>({
    badge_text: 'SUPER SAVER BUNDLES',
    title: 'Premium Combo Deals',
    description: 'Equip your clinical workflows with carefully curated packages of leading tools. Save big vs buying individual components.',
    banner_image: null,
  });

  useEffect(() => {
    api.get('combos/banner/')
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setBannerSettings(res.data.data);
        }
      })
      .catch(err => console.error('Failed to load combo banner settings:', err));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get('combos/')
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

    setCartItems(prev => {
      const existing = prev.find(i => i.id === combo.id);
      if (existing) {
        return prev.map(i => i.id === combo.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, item];
    });
    showToast('Added to Cart');
  };

  const handleCardClick = (slug: string) => {
    setActiveComboId(slug);
    setCurrentView('combo-detail');
    window.scrollTo(0, 0);
  };

  // Sort and Filter Logic
  const getFilteredAndSorted = () => {
    let result = [...combos];

    // Filter Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.short_description && c.short_description.toLowerCase().includes(q))
      );
    }

    // Filter Stock
    if (stockFilter === 'instock') {
      result = result.filter(c => c.inventory > 0);
    }

    // Sort
    result.sort((a, b) => {
      const priceA = parseFloat(isDealer && a.dealer_price ? a.dealer_price : a.effective_price);
      const priceB = parseFloat(isDealer && b.dealer_price ? b.dealer_price : b.effective_price);

      if (sortBy === 'price-asc') return priceA - priceB;
      if (sortBy === 'price-desc') return priceB - priceA;
      if (sortBy === 'discount') {
        const discA = a.discount_percentage || 0;
        const discB = b.discount_percentage || 0;
        return discB - discA;
      }
      // default newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  };

  const displayList = getFilteredAndSorted();

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-20 select-none text-left pt-[60px] lg:pt-[180px]">
      {/* Hero Banner Section */}
      <div 
        className="relative bg-[#0f172a] text-white py-16 px-6 md:px-12 overflow-hidden shadow-md"
        style={bannerSettings.banner_image ? {
          backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.65)), url(${getAbsoluteImageUrl(bannerSettings.banner_image)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {}}
      >
        {!bannerSettings.banner_image && (
          <>
            {/* Decorative Gradients */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#006670]/10 rounded-full blur-[120px] pointer-events-none" />
          </>
        )}

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-black tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5" /> {bannerSettings.badge_text}
            </div>
            <h1 className="text-4xl md:text-5xl font-black font-display tracking-tight text-white leading-tight">
              {bannerSettings.title}
            </h1>
            <p className="text-sm md:text-base text-slate-400 font-medium leading-relaxed">
              {bannerSettings.description}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-12 mt-10">
        {/* Filters and Toolbar */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search combo packages..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006670]/20 bg-slate-50/50"
            />
          </div>

          {/* Actionable Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Stock Filter */}
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/20">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <select
                value={stockFilter}
                onChange={e => setStockFilter(e.target.value)}
                className="text-xs font-bold text-slate-600 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="all">All Items</option>
                <option value="instock">In Stock Only</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/20">
              <ArrowUpDown className="w-4 h-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="text-xs font-bold text-slate-600 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="newest">New Arrivals</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="discount">Biggest Savings</option>
              </select>
            </div>
          </div>
        </div>

        {/* List Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className="h-[430px] rounded-3xl border border-slate-200/50 bg-white p-5 space-y-4 animate-pulse">
                <div className="w-full aspect-square bg-slate-100 rounded-2xl" />
                <div className="h-4 bg-slate-100 w-2/3 rounded-full" />
                <div className="h-3 bg-slate-100 w-1/2 rounded-full" />
                <div className="h-6 bg-slate-100 w-1/3 rounded-full" />
              </div>
            ))}
          </div>
        ) : displayList.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/60 shadow-sm mt-8">
            <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800">No Combo Deals Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">Try refining your search keyword or selection filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {displayList.map(combo => {
              const activePrice = parseFloat(isDealer && combo.dealer_price ? combo.dealer_price : combo.effective_price);
              const originalPriceVal = parseFloat(combo.original_price);
              const youSaveVal = originalPriceVal - activePrice;
              const discountPct = originalPriceVal > 0 ? Math.round((youSaveVal / originalPriceVal) * 100) : 0;
              const hasOffer = combo.is_offer_active;

              return (
                <div
                  key={combo.id}
                  onClick={() => handleCardClick(combo.slug)}
                  className="group relative bg-white hover:bg-slate-50 border border-slate-200/60 rounded-[24px] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_16px_36px_rgba(0,43,46,0.08)] transition-all duration-300 flex flex-col justify-between cursor-pointer h-[440px] overflow-hidden"
                >
                  <div>
                    {/* Badge & Heart */}
                    <div className="absolute top-6 left-6 z-10 flex flex-col gap-1.5 items-start">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-wider">
                        COMBO DEAL
                      </span>
                      {hasOffer && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-teal-50 text-teal-600 border border-teal-100 uppercase tracking-wider">
                          CAMPAIGN ACTIVE
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => toggleWishlist(combo, e)}
                      className={`absolute top-6 right-6 z-20 w-8 h-8 rounded-full border bg-white flex items-center justify-center transition-all duration-200 cursor-pointer ${isWishlisted(combo.id) ? 'text-rose-500 border-rose-100 bg-rose-50/50' : 'text-slate-400 hover:text-slate-600 border-slate-100 shadow-sm'}`}
                    >
                      <Heart className={`w-4 h-4 ${isWishlisted(combo.id) ? 'fill-rose-500' : ''}`} />
                    </button>

                    {/* Image */}
                    <div className="relative w-full aspect-square rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center p-2 mb-4 overflow-hidden">
                      {combo.thumbnail ? (
                        <img
                          src={getAbsoluteImageUrl(combo.thumbnail)}
                          alt={combo.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <Sparkles className="w-8 h-8 text-slate-300" />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FAAZO EXCLUSIVE</p>
                      <h3 className="text-sm font-bold text-slate-800 line-clamp-1 leading-snug tracking-tight">
                        {combo.title}
                      </h3>
                      <p className="text-[11px] font-semibold text-teal-600">
                        {combo.combo_products.length} products included
                      </p>
                    </div>
                  </div>

                  {/* Pricing and Footer */}
                  <div className="space-y-3.5 mt-4">
                    <div className="space-y-0.5">
                      <div className="flex items-baseline gap-1.5">
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
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black tracking-wide text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">
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
                      <div className="flex gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCardClick(combo.slug); }}
                          className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleAddToCart(combo, e)}
                          disabled={combo.inventory <= 0}
                          className="flex items-center justify-center p-2 text-white bg-[#006670] hover:bg-[#004e56] disabled:bg-slate-100 disabled:text-slate-400 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer shrink-0"
                          title="Add to Cart"
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComboListingPage;
