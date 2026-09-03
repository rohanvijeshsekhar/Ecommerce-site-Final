'use client';

import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { ProductReviewsSection } from './ProductReviewsSection';
import { useWishlist } from '@/contexts/WishlistContext';
import { ShareModal } from './ShareModal';
import {
  Star,
  ShoppingCart,
  Heart,
  Share2,
  ChevronRight,
  ShieldCheck,
  Truck,
  Wrench,
  Check,
  Plus,
  Minus,
  FileText,
  Download,
  Shield,
  RotateCcw,
  Phone,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  X
} from 'lucide-react';
import { useGuestGuard } from '../../hooks/useGuestGuard';
import { useAuth } from '../../hooks/useAuth';
import { api, getAbsoluteImageUrl } from '../../lib/api';
import { allProducts } from './ProductListingPage';

interface MockCartItem {
  id: string;
  name: string;
  category: string;
  price: number;
  qty: number;
  image: string;
  originalPrice?: number;
}

interface ProductDetailPageProps {
  activeProductId?: string;
  setCartItems: React.Dispatch<React.SetStateAction<MockCartItem[]>>;
  setIsCartOpen: (open: boolean) => void;
  onBackToHome: () => void;
  onProductClick: (id: string) => void;
  onBuyNowDirect?: (item: MockCartItem) => void;
  showToast?: (message: string) => void;
  wishlistItems?: MockCartItem[];
  setWishlistItems?: React.Dispatch<React.SetStateAction<MockCartItem[]>>;
  onOpenLoginModal: () => void;
}

const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  activeProductId,
  setCartItems,
  setIsCartOpen,
  onBackToHome,
  onProductClick,
  onBuyNowDirect,
  showToast,
  wishlistItems,
  setWishlistItems,
  onOpenLoginModal
}) => {
  const { guardAction } = useGuestGuard(onOpenLoginModal, showToast);
  const { user } = useAuth();

  const [productData, setProductData] = useState<any>(null);
  const [fetching, setFetching] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const getStaticProductDetail = (slug: string): any => {
    const sp = allProducts.find(p => p.id === slug || p.id.replace(/-/g, '') === slug.replace(/-/g, ''));
    if (!sp) return null;
    return {
      id: sp.id,
      name: sp.title,
      slug: sp.id,
      sku: sp.id.toUpperCase(),
      brand_detail: { name: sp.brand },
      category_detail: { name: sp.category },
      short_description: sp.subtitle,
      long_description: JSON.stringify({
        description: sp.subtitle,
        features: ['Clinical grade build', 'Ergonomic shape', 'Premium durability'],
        benefits: ['Consistent performance', 'Dentist trusted'],
        applications: ['Standard clinical procedures'],
        additional_content: ''
      }),
      effective_warranty: 12,
      weight_kg: 0.5,
      images: [{ image: sp.image, alt_text: sp.title }],
      attributes: [
        { name: 'Category', value: sp.category, unit: '' },
        { name: 'Brand', value: sp.brand, unit: '' }
      ],
      documents: []
    };
  };

  // --- All hooks MUST be before any early returns (Rules of Hooks) ---
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'description' | 'features' | 'specifications' | 'downloads' | 'reviews'>('description');
  const [localWishlisted, setLocalWishlisted] = useState(false);

  useEffect(() => {
    if (!activeProductId) {
      setProductData(null);
      return;
    }
    setFetching(true);
    setActiveImageIndex(0);
    setQuantity(1);
    api.get(`products/${activeProductId}/`)
      .then(res => {
        // Support both envelope formats: {success, data: {...}} and raw object
        const payload = res.data?.data ?? res.data;
        if (payload && (payload.id || payload.slug)) {
          setProductData(payload);
        } else {
          // API responded but no usable data — try static mock
          const localProd = getStaticProductDetail(activeProductId);
          setProductData(localProd);
        }
      })
      .catch(() => {
        // API error (404, network) — try static mock
        const localProd = getStaticProductDetail(activeProductId);
        setProductData(localProd);
      })
      .finally(() => {
        setFetching(false);
      });
  }, [activeProductId]);

  const getResolvedPrice = (): number => {
    if (productData?.pricing && parseFloat(productData.pricing.selling_price || '0') > 0) {
      if (user?.role === 'dealer' && productData.pricing.dealer_price) {
        return parseFloat(productData.pricing.dealer_price);
      }
      return parseFloat(productData.pricing.effective_price || productData.pricing.selling_price);
    }
    const staticSlug = activeProductId || 'nsk-handpiece';
    const sp = allProducts.find(p => p.id === staticSlug || p.id.replace(/-/g, '') === staticSlug.replace(/-/g, ''));
    return sp ? sp.price : 18999;
  };

  const getResolvedOriginalPrice = (): number => {
    if (productData?.pricing && parseFloat(productData.pricing.selling_price || '0') > 0) {
      return parseFloat(productData.pricing.mrp || productData.pricing.selling_price);
    }
    const staticSlug = activeProductId || 'nsk-handpiece';
    const sp = allProducts.find(p => p.id === staticSlug || p.id.replace(/-/g, '') === staticSlug.replace(/-/g, ''));
    return sp ? (sp.originalPrice || sp.price) : 22499;
  };


  // Gallery images (actual photographic views of the NSK Pana-Max handpiece)
  const defaultImages = [
    { src: '/images/category_handpieces.png', alt: 'NSK Pana-Max Clinical Setup View' },
    { src: '/images/bestseller_handpiece.png', alt: 'NSK Pana-Max Main Pedestal View', isLifestyle: true },
    { src: '/images/nsk_handpiece_head.png', alt: 'NSK Pana-Max Head Detail' },
    { src: '/images/nsk_handpiece_angle.png', alt: 'NSK Pana-Max Angled View' },
    { src: '/images/nsk_handpiece_back.png', alt: 'NSK Pana-Max Turbine Connection' }
  ];

  const productImages = productData
    ? (productData.images && productData.images.length > 0
        ? productData.images.map((img: any) => ({
            src: getAbsoluteImageUrl(img.image),
            alt: img.alt_text || productData.name
          }))
        : [{ src: '/images/category_handpieces.png', alt: productData.name }])
    : defaultImages;

  let parsedDesc = {
    description: '',
    features: [] as string[],
    benefits: [] as string[],
    applications: [] as string[],
    additional_content: ''
  };
  if (productData) {
    try {
      if (productData.long_description && productData.long_description.startsWith('{')) {
        parsedDesc = JSON.parse(productData.long_description);
      } else {
        parsedDesc.description = productData.long_description || '';
      }
    } catch {
      parsedDesc.description = productData.long_description || '';
    }
  }

  const { isInWishlist, toggleWishlist: toggleWishlistContext } = useWishlist();
  const currentProdId = productData ? productData.id || productData.slug : 'nsk-handpiece';
  const isWishlisted = isInWishlist(currentProdId) || isInWishlist(productData?.slug || '');

  const handleWishlistToggle = () => {
    if (productData) {
      toggleWishlistContext(productData);
    } else {
      toggleWishlistContext({
        id: 'nsk-handpiece',
        name: 'NSK Pana-Max High Speed Handpiece',
        slug: 'nsk-handpiece',
        price: getResolvedPrice(),
        image_url: productImages[0]?.src || '/images/bestseller_handpiece.png',
      });
    }
  };

  const [isStickyVisible, setIsStickyVisible] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // States for Gallery transitions & Fullscreen lightbox
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [swiperRef, setSwiperRef] = useState<any>(null);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragMoved, setDragMoved] = useState(false);
  const [mouseDownTime, setMouseDownTime] = useState(0);

  // Elegant swap image fade-out/in transition
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 350);
    return () => clearTimeout(timer);
  }, [activeImageIndex]);

  // Fullscreen keyboard navigation (Escape, Left, Right)
  useEffect(() => {
    if (!isFullscreenOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreenOpen(false);
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
      } else if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev + 1) % productImages.length);
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
      } else if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenOpen, productImages.length]);

  // Lightbox Zoom & Drag helpers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel === 1) return;
    setIsDragging(true);
    setDragMoved(false);
    setMouseDownTime(Date.now());
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = Math.abs(e.clientX - (dragStart.x + panOffset.x));
    const dy = Math.abs(e.clientY - (dragStart.y + panOffset.y));
    if (dx > 4 || dy > 4) {
      setDragMoved(true);
    }
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dragMoved && Date.now() - mouseDownTime > 150) {
      return; // was dragging
    }
    if (zoomLevel > 1) {
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    } else {
      setZoomLevel(2.2);
      setPanOffset({ x: 0, y: 0 });
    }
  };

  // Gallery images list moved to top of component body

  // Related products
  const relatedProducts = [
    {
      id: 'nsk-pana-max-2-m4-high-speed-turbine',
      title: 'NSK Pana-Max 2 M4',
      subtitle: 'High Speed Turbine Handpiece',
      price: 7800,
      originalPrice: 9500,
      rating: 4.9,
      reviews: 96,
      image: '/images/category_handpieces.png',
      style: {}
    },
    {
      id: 'woodpecker-ledh-orthodontic-curing-light',
      title: 'Woodpecker LED.H Curing Light',
      subtitle: 'Orthodontic Curing Light',
      price: 6500,
      originalPrice: 8500,
      rating: 4.8,
      reviews: 128,
      image: '/images/woodpecker_scaler_studio.png',
      style: {}
    },
    {
      id: 'wh-synea-vision-wk-93-lt-contra-angle',
      title: 'W&H Synea Vision WK-93 LT',
      subtitle: 'Contra-Angle Handpiece',
      price: 18000,
      originalPrice: 22000,
      rating: 4.8,
      reviews: 86,
      image: '/images/nsk_smax_studio.png',
      style: {}
    },
    {
      id: 'iphone-a2',
      title: 'Iphone A2',
      subtitle: 'Smart Devices',
      price: 22999,
      originalPrice: 45000,
      rating: 4.7,
      reviews: 64,
      image: '/images/woodpecker_curing_studio.png',
      style: {}
    },
    {
      id: 'iphone-a1',
      title: 'Iphone A1',
      subtitle: 'Smart Devices',
      price: 149999,
      originalPrice: 200000,
      rating: 4.7,
      reviews: 52,
      image: '/images/nsk_prophy_studio.png',
      style: {}
    }
  ];

  useEffect(() => {
    window.scrollTo(0, 0);

    const handleScroll = () => {
      const mainAddToCartBtn = document.getElementById('main-add-to-cart-btn');
      if (mainAddToCartBtn) {
        const rect = mainAddToCartBtn.getBoundingClientRect();
        // Show sticky bar once the main Add to Cart button is scrolled out of view
        setIsStickyVisible(rect.bottom < 0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (fetching) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px] w-full bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#006670]/20 border-t-[#006670] rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse font-sans">Loading Catalogue Item...</span>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    const itemId = productData ? productData.slug : 'nsk-handpiece';
    const itemName = productData ? productData.name : 'NSK Pana-Max High Speed Handpiece';
    const itemCat = productData ? (productData.category_detail?.name || 'Clinical Equipment') : 'Clinical Equipment';
    const itemImg = productImages[0]?.src || '/images/bestseller_handpiece.png';

    const item: MockCartItem = {
      id: itemId,
      name: itemName,
      category: itemCat,
      price: getResolvedPrice(),
      qty: quantity,
      image: itemImg
    };
    if (!guardAction({ type: 'add-to-cart', payload: { item } })) return;
    setCartItems(prev => {
      const existing = prev.find(item => item.id === itemId);
      if (existing) {
        return prev.map(item =>
          item.id === itemId ? { ...item, qty: item.qty + quantity } : item
        );
      }
      return [
        ...prev,
        {
          id: itemId,
          name: itemName,
          category: itemCat,
          price: getResolvedPrice(),
          qty: quantity,
          image: itemImg
        }
      ];
    });
    if (showToast) {
      showToast("Added to Cart");
    }
  };

  const handleBuyNow = () => {
    const itemId = productData ? productData.slug : 'nsk-handpiece';
    const itemName = productData ? productData.name : 'NSK Pana-Max High Speed Handpiece';
    const itemCat = productData ? (productData.category_detail?.name || 'Clinical Equipment') : 'Clinical Equipment';
    const itemImg = productImages[0]?.src || '/images/bestseller_handpiece.png';

    const item: MockCartItem = {
      id: itemId,
      name: itemName,
      category: itemCat,
      price: getResolvedPrice(),
      qty: quantity,
      image: itemImg,
      originalPrice: getResolvedOriginalPrice()
    };
    if (!guardAction({ type: 'buy-now', payload: { item } })) return;
    if (onBuyNowDirect) {
      onBuyNowDirect(item);
    } else {
      handleAddToCart();
      setIsCartOpen(true);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    if (showToast) showToast("Product Link Copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="w-full bg-[#FAFBFB] pt-[62px] lg:pt-[180px] text-left select-none">

      {/* 1. Back Button and Breadcrumbs Row (Desktop/Tablet) */}
      <div className="max-w-5xl mx-auto px-4 md:px-12 py-4 flex items-center gap-4">
        <button
          onClick={onBackToHome}
          className="w-9 h-9 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-100/80 flex items-center justify-center text-slate-600 hover:text-[#006670] hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 hidden md:flex"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase font-sans overflow-hidden">
          <button onClick={onBackToHome} className="hover:text-[#006670] transition-colors cursor-pointer">
            Home
          </button>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="hover:text-[#006670] transition-colors cursor-pointer whitespace-nowrap">Dental Equipment</span>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="hover:text-[#006670] transition-colors cursor-pointer whitespace-nowrap">
            {productData && productData.category_detail ? productData.category_detail.name : 'Dental Equipment'}
          </span>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="text-slate-600 truncate">
            {productData ? productData.name : 'NSK Pana-Max High Speed Handpiece'}
          </span>
        </div>
      </div>

      {/* 2. Main Product Info Section */}
      <section className="max-w-5xl mx-auto px-4 md:px-12 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-10">

          {/* Left Column: Interactive Image Gallery */}
          <div className="lg:col-span-6 xl:col-span-7 select-none animate-fadeIn">

            {/* Custom Pagination Bullet Styles for Premium Swiper Carousel */}
            <style>{`
              .gallery-mobile-pagination {
                display: flex;
                justify-content: center;
                gap: 8px;
                margin-top: 20px;
                margin-bottom: 20px;
              }
              .gallery-mobile-pagination .swiper-pagination-bullet {
                background: #E2E8F0 !important;
                opacity: 1 !important;
                width: 6px !important;
                height: 6px !important;
                transition: all 0.35s cubic-bezier(0.25, 1, 0.5, 1) !important;
              }
              .gallery-mobile-pagination .swiper-pagination-bullet-active {
                background: #006670 !important;
                width: 20px !important;
                border-radius: 4px !important;
              }
            `}</style>

            {/* Desktop Gallery View (md and above) */}
            <div className="hidden md:grid grid-cols-[88px_minmax(0,1fr)] gap-[8px] items-start">

              {/* Left Side: Vertical Thumbnails Strip (Sticky while scrolling) */}
              <div className="flex flex-col gap-[10px] shrink-0 sticky top-[140px] self-start w-[88px] z-10">
                {productImages.map((img: any, idx: number) => (
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
                    <img
                      src={img.src}
                      alt={img.alt}
                      loading="eager"
                      className={`w-full h-full object-contain rounded-xl transition-transform duration-300
                        ${img.isLifestyle ? 'object-cover' : 'filter brightness-[1.02]'}`}
                    />
                  </button>
                ))}
              </div>

              {/* Right Side: Main Stage Aspect-Square Container (Perfect 1:1 Square, White Background, Soft Shadow, No Border) */}
              <div
                onClick={() => setIsFullscreenOpen(true)}
                className={`w-full aspect-square rounded-[28px] overflow-hidden flex items-center justify-center group relative cursor-zoom-in transition-all duration-300
                  ${productImages[activeImageIndex]?.isLifestyle
                    ? 'bg-transparent shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-0'
                    : 'bg-white shadow-[0_20px_60px_rgba(0,0,0,0.04)] p-4'
                  }`}
              >
                <div className={`absolute inset-0 pointer-events-none z-20 rounded-[28px] transition-all duration-300
                  ${productImages[activeImageIndex]?.isLifestyle
                    ? 'shadow-[inset_0_0_24px_rgba(0,0,0,0.06)]'
                    : 'shadow-[inset_0_0_24px_rgba(0,0,0,0.04)]'
                  }`}
                />
                
                {/* Flipkart Inspired Action Buttons (Wishlist & Share) */}
                <div className="absolute top-6 right-6 flex flex-col gap-3 z-30 pointer-events-auto">
                  {/* Wishlist Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWishlistToggle();
                    }}
                    className="w-10 h-10 rounded-full bg-white shadow-[0_3px_10px_rgba(0,0,0,0.08)] flex items-center justify-center border border-slate-100 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group"
                    title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <Heart
                      className={`w-5 h-5 transition-all duration-300 ${
                        isWishlisted
                          ? 'fill-rose-500 text-rose-500 scale-110'
                          : 'text-slate-400 group-hover:text-rose-500 group-hover:scale-105'
                      }`}
                    />
                  </button>
                  {/* Share Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard();
                    }}
                    className="w-10 h-10 rounded-full bg-white shadow-[0_3px_10px_rgba(0,0,0,0.08)] flex items-center justify-center border border-slate-100 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group"
                    title="Share Product"
                  >
                    <Share2
                      className={`w-4.5 h-4.5 transition-colors duration-300 ${
                        copiedLink ? 'text-emerald-500' : 'text-slate-400 group-hover:text-[#006670]'
                      }`}
                    />
                  </button>
                </div>

                {/* Seamless Stacked Image Layers (Zero Blinking / Instant Crossfade like Flipkart/Myntra) */}
                <div className="relative w-full h-full overflow-hidden rounded-[24px]">
                  {productImages.map((img: any, idx: number) => {
                    const isActive = activeImageIndex === idx;
                    return (
                      <img
                        key={idx}
                        src={img.src || '/images/nsk_handpiece_portrait.png'}
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

                {/* Elegant Circular Previous Navigation Button on Hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/45 backdrop-blur-md border border-white/20 text-slate-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white/60 hover:scale-105 active:scale-95 shadow-sm cursor-pointer z-20"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>

                {/* Elegant Circular Next Navigation Button on Hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex((prev) => (prev + 1) % productImages.length);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/45 backdrop-blur-md border border-white/20 text-slate-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white/60 hover:scale-105 active:scale-95 shadow-sm cursor-pointer z-20"
                >
                  <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

            </div>

            {/* Mobile Gallery View (below md) */}
            <div className="block md:hidden w-full">

              {/* Main Swiper Stage - 4:5 Aspect Ratio, White Background, Rounded 24px */}
              <div className={`w-full aspect-[4/5] rounded-[24px] relative overflow-hidden transition-all duration-300
                ${productImages[activeImageIndex].isLifestyle
                  ? 'bg-transparent shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
                  : 'bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.015)]'
                }`}>
                {/* Floating Mobile Back Button (Ajio style) */}
                <button
                  onClick={onBackToHome}
                  className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.06)] flex items-center justify-center border border-slate-100/50 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer text-slate-600 hover:text-[#006670] z-30"
                  title="Back"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                </button>

                {/* Flipkart Inspired Action Buttons (Wishlist & Share) - Mobile Positioning */}
                <div className="absolute top-4 right-4 flex flex-col gap-2.5 z-30 pointer-events-auto">
                  {/* Wishlist Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWishlistToggle();
                    }}
                    className="w-9 h-9 rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.06)] flex items-center justify-center border border-slate-100 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group"
                    title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <Heart
                      className={`w-4.5 h-4.5 transition-all duration-300 ${
                        isWishlisted
                          ? 'fill-rose-500 text-rose-500 scale-110'
                          : 'text-slate-400 group-hover:text-rose-500 group-hover:scale-105'
                      }`}
                    />
                  </button>
                  {/* Share Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard();
                    }}
                    className="w-9 h-9 rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.06)] flex items-center justify-center border border-slate-100 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group"
                    title="Share Product"
                  >
                    <Share2
                      className={`w-4 h-4 transition-colors duration-300 ${
                        copiedLink ? 'text-emerald-500' : 'text-slate-400 group-hover:text-[#006670]'
                      }`}
                    />
                  </button>
                </div>
                <Swiper
                  modules={[Pagination]}
                  onSwiper={setSwiperRef}
                  pagination={{ clickable: true, el: '.gallery-mobile-pagination' }}
                  onSlideChange={(swiper) => setActiveImageIndex(swiper.activeIndex)}
                  className="w-full h-full"
                >
                  {productImages.map((img: any, idx: number) => (
                    <SwiperSlide key={idx} className="w-full h-full">
                      <div
                        onClick={() => setIsFullscreenOpen(true)}
                        className={`w-full h-full flex items-center justify-center cursor-zoom-in transition-all duration-300 relative
                          ${img.isLifestyle ? 'p-0' : 'p-4 bg-white'}`}
                      >
                        <img
                          src={img.src}
                          alt={img.alt}
                          className="select-none transition-all duration-300 z-0 w-full h-full object-cover"
                        />
                        <div className={`absolute inset-0 pointer-events-none z-10 rounded-[24px] transition-all duration-300
                          ${img.isLifestyle
                            ? 'shadow-[inset_0_0_20px_rgba(0,0,0,0.05)]'
                            : 'shadow-[inset_0_0_20px_rgba(0,0,0,0.03)]'
                          }`}
                        />
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>

              {/* Custom Mobile Pagination Bullets */}
              <div className="gallery-mobile-pagination" />

              {/* Horizontal Scrollable Thumbnails Strip with Snap Scrolling */}
              <div className="flex gap-[10px] overflow-x-auto py-3 px-1 scrollbar-none snap-x snap-mandatory justify-start">
                {productImages.map((img: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveImageIndex(idx);
                      if (swiperRef) {
                        swiperRef.slideTo(idx);
                      }
                    }}
                    className={`w-[72px] h-[72px] bg-white rounded-2xl flex items-center justify-center p-1.5 shrink-0 snap-start transition-all duration-200 cursor-pointer overflow-hidden relative
                      ${activeImageIndex === idx
                        ? 'border-2 border-[#006670] ring-2 ring-[#006670]/25 ring-offset-2 ring-offset-slate-50/50 shadow-md scale-[1.02] z-10 opacity-100'
                        : 'border border-slate-200/80 opacity-65 hover:opacity-100 hover:border-slate-350 hover:scale-[1.01]'
                      }`}
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      loading="eager"
                      className={`w-full h-full object-contain rounded-xl transition-transform duration-300
                        ${img.isLifestyle ? 'object-cover' : 'filter brightness-[1.02]'}`}
                    />
                  </button>
                ))}
              </div>

            </div>

            {/* Preload Next Image for Seamless Switching Performance */}
            <img
              src={productImages[(activeImageIndex + 1) % productImages.length].src}
              className="hidden"
              alt="preload-next-gallery-image"
            />

          </div>

          {/* Right Column: Detail Information Block (7 Cols) */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-start">

            {/* Brand Title Ratings */}
            <div className="border-b border-slate-100/60 pb-2.5 mb-2.5">
              <span className="text-[10px] font-extrabold tracking-[0.2em] text-[#006670] uppercase block mb-1 font-sans">
                {productData && productData.brand_detail ? productData.brand_detail.name : 'NSK'}
              </span>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-tight mb-1 font-display">
                {productData ? productData.name : 'NSK Pana-Max High Speed Handpiece'}
              </h1>
              {productData && <p className="text-[10px] font-mono text-slate-400 -mt-0.5 mb-1">SKU: {productData.sku}</p>}

              <div className="flex items-center gap-1.5">
                <div className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
                  ))}
                </div>
                <span className="text-[11px] font-bold text-slate-700 mt-0.5">
                  {productData?.average_rating ? parseFloat(productData.average_rating).toFixed(1) : '0.0'}
                  <span className="text-slate-400 font-medium ml-1.5 hover:text-[#006670] hover:underline cursor-pointer" onClick={() => setActiveTab('reviews')}>
                    ({productData?.total_reviews ?? 0} Reviews)
                  </span>
                </span>
              </div>
            </div>

            {/* Pricing block — live from API */}
            <div className="mb-3">
              {productData?.pricing && parseFloat(productData.pricing.selling_price || '0') > 0 ? (
                <>
                  {user?.role === 'dealer' && productData.pricing.dealer_price ? (
                    // Dealer view
                    <>
                      <div className="flex items-baseline gap-2.5 flex-wrap">
                        <span className="text-2xl font-black text-[#006670] font-display">
                          ₹{parseFloat(productData.pricing.dealer_price).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold font-sans">
                          (Dealer Price)
                        </span>
                        {parseFloat(productData.pricing.selling_price) > parseFloat(productData.pricing.dealer_price) && (
                          <span className="text-xs text-slate-400 line-through font-semibold font-sans">
                            Regular Price: ₹{parseFloat(productData.pricing.selling_price).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </div>
                      {parseFloat(productData.pricing.mrp) > parseFloat(productData.pricing.dealer_price) && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                          Save ₹{(parseFloat(productData.pricing.mrp) - parseFloat(productData.pricing.dealer_price)).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({Math.round(((parseFloat(productData.pricing.mrp) - parseFloat(productData.pricing.dealer_price)) / parseFloat(productData.pricing.mrp)) * 100)}% OFF vs MRP ₹{parseFloat(productData.pricing.mrp).toLocaleString('en-IN', { maximumFractionDigits: 0 })})
                        </p>
                      )}
                    </>
                  ) : (
                    // Customer view
                    <>
                      <div className="flex items-baseline gap-2.5 flex-wrap">
                        <span className="text-2xl font-black text-slate-900 font-display">
                          ₹{parseFloat(productData.pricing.effective_price).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        {parseFloat(productData.pricing.mrp) > parseFloat(productData.pricing.effective_price) && (
                          <span className="text-xs text-slate-400 line-through font-semibold font-sans">
                            ₹{parseFloat(productData.pricing.mrp).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        )}
                        {productData.pricing.discount_percentage && productData.pricing.discount_percentage > 0 && (
                          <span className="px-2 py-0.5 text-[9.5px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full font-sans">
                            {productData.pricing.discount_percentage.toFixed(1)}% OFF
                          </span>
                        )}
                        {productData.pricing.is_offer_active && productData.pricing.offer_price && (
                          <span className="px-2 py-0.5 text-[9.5px] font-bold text-[#F58220] bg-orange-50 border border-orange-100 rounded-full font-sans">
                            LIMITED OFFER
                          </span>
                        )}
                      </div>
                      {productData.pricing.you_save && parseFloat(productData.pricing.you_save) > 0 && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                          You save ₹{parseFloat(productData.pricing.you_save).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-baseline gap-2.5">
                  <span className="text-2xl font-black text-slate-900 font-display">₹18,999</span>
                  <span className="text-xs text-slate-400 line-through font-semibold font-sans">₹22,499</span>
                  <span className="px-2 py-0.5 text-[9.5px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full font-sans">15% OFF</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-1">
                {productData?.inventory ? (
                  <>
                    <span className={`w-2 h-2 rounded-full ${productData.inventory.stock_status === 'in_stock' ? 'bg-emerald-500 animate-pulse' : productData.inventory.stock_status === 'low_stock' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                    <span className={`text-[10.5px] font-bold ${productData.inventory.stock_status === 'in_stock' ? 'text-slate-600' : productData.inventory.stock_status === 'low_stock' ? 'text-amber-600' : 'text-rose-600'}`}>
                      {productData.inventory.stock_status === 'in_stock' ? 'In Stock' : productData.inventory.stock_status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                    </span>
                    {productData.inventory.stock_status === 'in_stock' && <span className="text-[10.5px] text-slate-400 font-medium font-sans">• Ready to Ship</span>}
                    {productData.inventory.stock_status === 'low_stock' && <span className="text-[10.5px] text-amber-500 font-medium font-sans">• Only {productData.inventory.available_stock} left!</span>}
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10.5px] font-bold text-slate-600">In Stock</span>
                    <span className="text-[10.5px] text-slate-400 font-medium font-sans">• Ready to Ship</span>
                  </>
                )}
              </div>
            </div>

            {/* Product short description */}
            <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed mb-3.5 font-medium">
              {productData ? productData.short_description : 'Advanced high speed handpiece engineered for precision, durability and superior performance. Built with NSK\'s leading technology for smooth operation and long life.'}
            </p>

            {/* USP Mini badges */}
            <div className="grid grid-cols-2 gap-1.5 mb-3.5 border-t border-b border-slate-100/50 py-2.5">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                <div className="w-6 h-6 rounded-md bg-[#e6f3f5]/80 flex items-center justify-center text-[#006670] shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span>FDA Approved</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                <div className="w-6 h-6 rounded-md bg-[#e6f3f5]/80 flex items-center justify-center text-[#006670] shrink-0">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <span>{productData && productData.effective_warranty ? `${productData.effective_warranty} Months Warranty` : '2 Years Warranty'}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                <div className="w-6 h-6 rounded-md bg-[#e6f3f5]/80 flex items-center justify-center text-[#006670] shrink-0">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <span>Pan India Delivery</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                <div className="w-6 h-6 rounded-md bg-[#e6f3f5]/80 flex items-center justify-center text-[#006670] shrink-0">
                  <Wrench className="w-3.5 h-3.5" />
                </div>
                <span>Installation Included</span>
              </div>
            </div>

            {/* Purchase CTA buttons */}
            <div className="space-y-1.5 mb-3.5">
              <div className="flex gap-2">

                {/* Quantity selector */}
                <div className="flex items-center border border-slate-200 rounded-lg px-1 bg-white shrink-0 h-10">
                  <button
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    className="w-6 h-6 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer font-bold"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center text-xs font-bold text-slate-800 font-sans">{quantity}</span>
                  <button
                    onClick={() => setQuantity(prev => prev + 1)}
                    className="w-6 h-6 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer font-bold"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Add to Cart button */}
                <button
                  id="main-add-to-cart-btn"
                  onClick={handleAddToCart}
                  className="flex-grow h-10 rounded-lg bg-white hover:bg-slate-50 text-[#006670] border border-[#006670]/20 hover:border-[#006670] text-xs tracking-wider font-extrabold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Add to Cart
                </button>
              </div>

              {/* Buy Now button */}
              {productData?.inventory?.available_stock > 0 && (
                <button
                  onClick={handleBuyNow}
                  className="w-full h-10 rounded-lg bg-[#006670] hover:bg-[#004e56] text-white text-xs tracking-wider font-extrabold uppercase transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  Buy Now
                </button>
              )}
            </div>

            {/* Wishlist & Share link */}
            <div className="flex gap-4 text-[10px] font-bold text-slate-400 mb-3.5 border-b border-slate-100/60 pb-3.5">
              <button
                onClick={() => handleWishlistToggle()}
                className="flex items-center gap-1.5 hover:text-[#006670] transition-colors cursor-pointer"
              >
                <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500 stroke-rose-500 text-rose-500' : ''}`} />
                {isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
              </button>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-1.5 hover:text-[#006670] transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Product</span>
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* 3. Core Trust Strip details */}
      <section className="bg-white border-t border-b border-slate-100/70 py-4.5 mb-8 shadow-[0_1px_8px_rgba(0,0,0,0.01)]">
        <div className="max-w-5xl mx-auto px-4 md:px-12 grid grid-cols-2 md:grid-cols-5 gap-5 text-center">

          <div className="flex flex-col items-center">
            <ShieldCheck className="w-5 h-5 text-[#006670] mb-1" />
            <h4 className="text-[11px] font-bold text-slate-800">
              {productData && productData.effective_warranty ? `${productData.effective_warranty} Months Warranty` : '2 Years Warranty'}
            </h4>
            <p className="text-[9.5px] text-slate-400 mt-0.5 font-sans">On All Products</p>
          </div>

          <div className="flex flex-col items-center">
            <Wrench className="w-5 h-5 text-[#006670] mb-1" />
            <h4 className="text-[11px] font-bold text-slate-800">Free Installation</h4>
            <p className="text-[9.5px] text-slate-400 mt-0.5 font-sans">By Certified Experts</p>
          </div>

          <div className="flex flex-col items-center col-span-2 md:col-span-1">
            <Truck className="w-5 h-5 text-[#006670] mb-1" />
            <h4 className="text-[11px] font-bold text-slate-800">Pan India Delivery</h4>
            <p className="text-[9.5px] text-slate-400 mt-0.5 font-sans">2-5 Business Days</p>
          </div>

          <div className="flex flex-col items-center">
            <Phone className="w-5 h-5 text-[#006670] mb-1" />
            <h4 className="text-[11px] font-bold text-slate-800">Dedicated Support</h4>
            <p className="text-[9.5px] text-slate-400 mt-0.5 font-sans">+91 98765 43210</p>
          </div>

          <div className="flex flex-col items-center">
            <RotateCcw className="w-5 h-5 text-[#006670] mb-1" />
            <h4 className="text-[11px] font-bold text-slate-800">7 Days Returns</h4>
            <p className="text-[9.5px] text-slate-400 mt-0.5 font-sans">No Questions Asked</p>
          </div>

        </div>
      </section>

      {/* 4. Tab Panels / Interactive Sheets Container */}
      <section className="max-w-5xl mx-auto px-4 md:px-12 pb-10">
        <div>

          {/* Tab Header Row */}
          <div className="flex border-b border-slate-200/80 overflow-x-auto bg-transparent scrollbar-none mb-6">
            {(['description', 'features', 'specifications', 'downloads', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-xs tracking-wider font-extrabold uppercase border-b-2 transition-all cursor-pointer block whitespace-nowrap shrink-0
                  ${activeTab === tab
                    ? 'border-[#006670] text-[#006670] font-black'
                    : 'border-transparent text-slate-400 hover:text-slate-650'
                  }`}
              >
                {tab === 'reviews' ? 'Reviews (128)' : tab}
              </button>
            ))}
          </div>

          {/* Tab Contents Frame */}
          <div className="py-2 text-left min-h-[240px]">
            {activeTab === 'description' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-6 space-y-4">
                  <h3 className="text-lg font-bold text-slate-800">Product Overview</h3>
                  {productData ? (
                    <div
                      className="text-sm text-slate-500 leading-relaxed space-y-3 font-medium font-sans"
                      dangerouslySetInnerHTML={{ __html: parsedDesc.description || 'No overview available.' }}
                    />
                  ) : (
                    <>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        The NSK Pana-Max High Speed Handpiece delivers exceptional cutting performance with minimal vibration and noise. Its ergonomic design ensures superior comfort and precise control for dental professionals.
                      </p>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        Built with clean head system technology to prevent back-siphonage of contaminants, and high durability ceramic bearings that reduce friction and heat, this handpiece provides maximum lifespan under severe sterilization parameters.
                      </p>
                    </>
                  )}
                  {productData && parsedDesc.additional_content && (
                    <div className="pt-4 border-t border-slate-100 mt-4">
                      <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Additional Information</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{parsedDesc.additional_content}</p>
                    </div>
                  )}
                </div>

                {/* Specifications summary table */}
                <div className="lg:col-span-6 bg-white border border-slate-200/60 rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.015)] animate-fadeIn">
                  <h4 className="text-[10px] font-black tracking-widest text-[#006670] uppercase mb-4">
                    Key Performance Metrics
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {productData && productData.attributes && productData.attributes.length > 0 ? (
                      productData.attributes.slice(0, 6).map((attr: any) => (
                        <div key={attr.id}>
                          <span className="text-slate-400 block mb-0.5">{attr.name}</span>
                          <span className="font-bold text-slate-700">{attr.value} {attr.unit || ''}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Power Source</span>
                          <span className="font-bold text-slate-700">Air Pressure</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Noise Level</span>
                          <span className="font-bold text-slate-700">≤ 60 dB</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Speed</span>
                          <span className="font-bold text-slate-700">Up to 450,000 RPM</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Head Size</span>
                          <span className="font-bold text-slate-700">Standard Head</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Bur Type</span>
                          <span className="font-bold text-slate-700">FG (1.59 - 1.60 mm)</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Connection</span>
                          <span className="font-bold text-slate-700">Standard 4 Hole</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'features' && (
              <div className="max-w-3xl space-y-6">
                {productData ? (
                  <>
                    {parsedDesc.features && parsedDesc.features.length > 0 && (
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-[#006670] mb-3">Key Highlights</h3>
                        <ul className="space-y-2.5">
                          {parsedDesc.features.map((feat: string, fIdx: number) => (
                            <li key={fIdx} className="flex items-start gap-3 text-sm text-slate-650 font-semibold leading-normal">
                              <div className="w-5 h-5 rounded-full bg-[#e6f3f5] flex items-center justify-center text-[#006670] shrink-0 mt-0.5">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {parsedDesc.benefits && parsedDesc.benefits.length > 0 && (
                      <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-sm font-black uppercase tracking-wider text-[#006670] mb-3">Key Benefits</h3>
                        <ul className="space-y-2.5">
                          {parsedDesc.benefits.map((ben: string, bIdx: number) => (
                            <li key={bIdx} className="flex items-start gap-3 text-sm text-slate-655 font-semibold leading-normal">
                              <div className="w-5 h-5 rounded-full bg-[#e6f3f5] flex items-center justify-center text-[#006670] shrink-0 mt-0.5">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                              <span>{ben}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {parsedDesc.applications && parsedDesc.applications.length > 0 && (
                      <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-sm font-black uppercase tracking-wider text-[#006670] mb-3">Clinical Applications</h3>
                        <ul className="space-y-2.5">
                          {parsedDesc.applications.map((app: string, aIdx: number) => (
                            <li key={aIdx} className="flex items-start gap-3 text-sm text-slate-655 font-semibold leading-normal">
                              <div className="w-5 h-5 rounded-full bg-[#e6f3f5] flex items-center justify-center text-[#006670] shrink-0 mt-0.5">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                              <span>{app}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(!parsedDesc.features || parsedDesc.features.length === 0) &&
                     (!parsedDesc.benefits || parsedDesc.benefits.length === 0) &&
                     (!parsedDesc.applications || parsedDesc.applications.length === 0) && (
                       <p className="text-xs text-slate-400 italic">No features or bullet highlights defined.</p>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Key Clinical Highlights</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-sm text-slate-600 font-semibold leading-normal">
                        <div className="w-5 h-5 rounded-full bg-[#e6f3f5] flex items-center justify-center text-[#006670] shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <span>Quadruple Spray for efficient water cooling and dental cavity cleansing.</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-slate-600 font-semibold leading-normal">
                        <div className="w-5 h-5 rounded-full bg-[#e6f3f5] flex items-center justify-center text-[#006670] shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <span>High-durability Ceramic Bearings for friction-free, quiet, and smooth operation.</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-slate-600 font-semibold leading-normal">
                        <div className="w-5 h-5 rounded-full bg-[#e6f3f5] flex items-center justify-center text-[#006670] shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <span>Push Button Chuck for easy, safe, and lightning-fast clinical bur changes.</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-slate-600 font-semibold leading-normal">
                        <div className="w-5 h-5 rounded-full bg-[#e6f3f5] flex items-center justify-center text-[#006670] shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <span>Stainless Steel Body providing lightweight ergonomics and long corrosion durability.</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-slate-600 font-semibold leading-normal">
                        <div className="w-5 h-5 rounded-full bg-[#e6f3f5] flex items-center justify-center text-[#006670] shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <span>Fully Autoclavable up to 135°C, ensuring compliance with clinic hygiene parameters.</span>
                      </li>
                    </ul>
                  </>
                )}
              </div>
            )}

            {activeTab === 'specifications' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3.5">
                {productData && productData.attributes && productData.attributes.length > 0 ? (
                  productData.attributes.map((attr: any, aIdx: number) => (
                    <div key={aIdx} className="flex justify-between py-2.5 border-b border-slate-200/60 text-xs font-semibold">
                      <span className="text-slate-400 uppercase tracking-wider">{attr.name}</span>
                      <span className="text-slate-800">{attr.value} {attr.unit || ''}</span>
                    </div>
                  ))
                ) : (
                  [
                    { label: 'Power Source', val: 'Air Pressure' },
                    { label: 'Noise Level', val: '≤ 60 dB' },
                    { label: 'Speed', val: 'Up to 450,000 RPM' },
                    { label: 'Head Size', val: 'Standard Head' },
                    { label: 'Bur Type', val: 'FG (1.59 – 1.60 mm)' },
                    { label: 'Connection', val: 'Standard 4 Hole' },
                    { label: 'Spray', val: 'Quadruple Water Spray' },
                    { label: 'Autoclavable', val: 'Up to 135°C' }
                  ].map((spec, sIdx) => (
                    <div key={sIdx} className="flex justify-between py-2.5 border-b border-slate-200/60 text-xs font-semibold">
                      <span className="text-slate-400 uppercase tracking-wider">{spec.label}</span>
                      <span className="text-slate-800">{spec.val}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'downloads' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {productData && productData.documents && productData.documents.length > 0 ? (
                  productData.documents.map((doc: any, dIdx: number) => (
                    <div key={dIdx} className="flex items-center gap-4 bg-white border border-slate-200/60 rounded-2xl p-4.5 hover:border-[#006670]/25 hover:shadow-[0_8px_24px_rgba(0,0,0,0.02)] transition-all">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[#006670] shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-grow text-left">
                        <h4 className="text-xs font-bold text-slate-800">{doc.title}</h4>
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                          {doc.document_type ? doc.document_type.toUpperCase() : 'DOCUMENT'} • PDF FORMAT
                        </p>
                      </div>
                      <a
                        href={doc.file || doc.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 hover:bg-slate-200/50 rounded-full text-[#006670] transition-colors cursor-pointer"
                      >
                        <Download className="w-4.5 h-4.5" />
                      </a>
                    </div>
                  ))
                ) : (
                  <>
                    {/* Manual Box */}
                    <div className="flex items-center gap-4 bg-white border border-slate-200/60 rounded-2xl p-4.5 hover:border-[#006670]/25 hover:shadow-[0_8px_24px_rgba(0,0,0,0.02)] transition-all">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[#006670] shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-grow text-left">
                        <h4 className="text-xs font-bold text-slate-800">User Technical Manual</h4>
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5">PDF Format • 2.4 MB</p>
                      </div>
                      <button className="p-2.5 hover:bg-slate-200/50 rounded-full text-[#006670] transition-colors cursor-pointer">
                        <Download className="w-4.5 h-4.5" />
                      </button>
                    </div>

                    {/* Brochure Box */}
                    <div className="flex items-center gap-4 bg-white border border-slate-200/60 rounded-2xl p-4.5 hover:border-[#006670]/25 hover:shadow-[0_8px_24px_rgba(0,0,0,0.02)] transition-all">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[#006670] shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-grow text-left">
                        <h4 className="text-xs font-bold text-slate-800">NSK Product Brochure</h4>
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5">PDF Format • 1.8 MB</p>
                      </div>
                      <button className="p-2.5 hover:bg-slate-200/50 rounded-full text-[#006670] transition-colors cursor-pointer">
                        <Download className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <ProductReviewsSection
                productId={productData?.id || activeProductId || ''}
                productSlug={productData?.slug}
                productName={productData?.name || 'Product'}
                showToast={showToast}
              />
            )}

            {/* Application Areas Section inside panel */}
            <div className="mt-8 border-t border-slate-100/80 pt-6">
              <span className="text-[10px] font-black tracking-widest text-[#006670] uppercase block mb-5 text-center">
                Recommended Application Areas
              </span>
              <div className="flex flex-wrap justify-center gap-6 md:gap-10">
                {[
                  { label: 'General Dentistry', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2Z" /><path d="M12 6v12M6 12h12" /></svg> },
                  { label: 'Endodontics', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M4.5 22v-5M19.5 22v-5M12 2v20M8 8l8 8" /></svg> },
                  { label: 'Implantology', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 2v20M6 8l12 8M6 16l12-8" /></svg> },
                  { label: 'Prosthodontics', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 2L2 22h20L12 2Z" /></svg> },
                  { label: 'Orthodontics', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M3 3h18v18H3zM9 9h6v6H9z" /></svg> }
                ].map((area, aIdx) => (
                  <div key={aIdx} className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#006670]/5 border border-[#006670]/10 flex items-center justify-center text-[#006670]">
                      {area.icon}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">{area.label}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. You May Also Like Swiper Carousel (AJIO Style) */}
      <section className="max-w-5xl mx-auto px-4 md:px-12 pb-14 select-none relative">

        {/* Header */}
        <div className="flex items-end justify-between mb-8 text-left">
          <div>
            <span className="block text-[10px] font-extrabold tracking-[0.25em] text-[#006670] uppercase mb-1.5 font-sans">
              RELATED EQUIPMENTS
            </span>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight font-display">
              You May Also Like
            </h2>
          </div>
          <button
            onClick={onBackToHome}
            className="group inline-flex items-center gap-1.5 text-xs font-bold text-[#006670] hover:text-[#004e56] transition-colors cursor-pointer"
          >
            View All Products
            <ArrowRight className="w-4.5 h-4.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* AJIO Carousel Row Container */}
        <div className="relative group/carousel">
          {/* Scroll Container */}
          <div
            id="related-products-container"
            className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory flex-nowrap pb-4"
          >
            {relatedProducts.map((prod) => {
              const originalPrice = prod.originalPrice || Math.round(prod.price * 1.2);
              const discountPercent = Math.round(((originalPrice - prod.price) / originalPrice) * 100);
              const isProdWishlisted = wishlistItems?.some(w => w.id === prod.id);

              return (
                <div
                  key={prod.id}
                  onClick={() => {
                    onProductClick(prod.id);
                    window.scrollTo(0, 0);
                  }}
                  className="w-[180px] sm:w-[220px] bg-white rounded-3xl p-3 border border-slate-100 hover:border-[#006670]/25 hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] cursor-pointer transition-all duration-300 flex-shrink-0 flex flex-col justify-between snap-start relative group/card"
                >
                  <div>
                    {/* Image Container with aspect-[4/5] - AJIO Full Container Image style */}
                    <div className="aspect-[4/5] bg-[#F7FAF9] rounded-2xl flex items-center justify-center relative overflow-hidden border border-slate-50 mb-3">
                      <img
                        src={prod.image}
                        alt={prod.title}
                        style={prod.style}
                        className="w-full h-full object-cover transform transition-transform duration-500 group-hover/card:scale-[1.04]"
                      />
                      
                      {/* Wishlist Heart Icon floating top-right (Ajio style) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (wishlistItems && setWishlistItems) {
                            if (isProdWishlisted) {
                              setWishlistItems(prev => prev.filter(w => w.id !== prod.id));
                              if (showToast) showToast("Removed from Wishlist");
                            } else {
                              setWishlistItems(prev => [
                                ...prev,
                                {
                                  id: prod.id,
                                  name: `${prod.title} ${prod.subtitle}`,
                                  category: 'Clinical Equipment',
                                  price: prod.price,
                                  qty: 1,
                                  image: prod.image,
                                  originalPrice: originalPrice,
                                  rating: prod.rating
                                }
                              ]);
                              if (showToast) showToast("Added to Wishlist");
                            }
                          }
                        }}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.04)] flex items-center justify-center border border-slate-100/50 hover:scale-105 transition-transform"
                      >
                        <Heart
                          className={`w-4 h-4 transition-colors ${
                            isProdWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-400 hover:text-[#006670]'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="text-left px-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {prod.id.includes('nsk') ? 'NSK' : 'Woodpecker'}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1 mt-0.5 leading-snug">
                        {prod.title}
                      </h4>
                      <p className="text-[10.5px] text-slate-400 font-sans mt-0.5 font-medium leading-tight">
                        {prod.subtitle}
                      </p>

                      {/* Star Rating */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="bg-emerald-600 text-white text-[9.5px] font-black rounded px-1.5 py-0.5 flex items-center gap-0.5 leading-none">
                          {prod.rating} <Star className="w-2.5 h-2.5 fill-white stroke-none mt-[-1px]" />
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold font-sans">({prod.reviews || 45})</span>
                      </div>
                    </div>
                  </div>

                  {/* Price Row (Ajio fashion style: offer price, original price, discount % in a row) */}
                  <div className="flex items-baseline gap-1.5 flex-wrap mt-3.5 pt-2.5 border-t border-slate-50 px-1">
                    <span className="text-xs font-black text-slate-900">
                      ₹{prod.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400 line-through font-semibold">
                      ₹{originalPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] font-black text-[#F58734]">
                      ({discountPercent}% OFF)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Carousel Left Navigation Arrow */}
          <button
            onClick={() => {
              const container = document.getElementById('related-products-container');
              if (container) container.scrollLeft -= 240;
            }}
            className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-[0_3px_10px_rgba(0,0,0,0.08)] border border-slate-100 flex items-center justify-center text-slate-600 hover:text-[#006670] hover:scale-105 transition-all z-20 cursor-pointer hidden md:flex"
            title="Previous"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          
          {/* Carousel Right Navigation Arrow */}
          <button
            onClick={() => {
              const container = document.getElementById('related-products-container');
              if (container) container.scrollLeft += 240;
            }}
            className="absolute right-[-16px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-[0_3px_10px_rgba(0,0,0,0.08)] border border-slate-100 flex items-center justify-center text-slate-600 hover:text-[#006670] hover:scale-105 transition-all z-20 cursor-pointer hidden md:flex"
            title="Next"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </section>

      {/* 6. Sticky Bottom Bar Panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-45 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] py-3 px-4 md:px-12 transition-transform duration-500 text-left select-none
          ${isStickyVisible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">

          {/* Left information */}
          <div className="hidden md:flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F7FAF9] border border-slate-100 p-1 flex items-center justify-center shrink-0">
              <img src={productImages[0]?.src || "/images/bestseller_handpiece.png"} alt="Product Thumbnail" className="w-full h-full object-cover" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 leading-snug line-clamp-1">
                {productData ? productData.name : 'NSK Pana-Max High Speed Handpiece'}
              </h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex text-amber-500">
                  <Star className="w-3 h-3 fill-amber-500 stroke-amber-500" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 mt-0.5">4.8 (128 Reviews)</span>
              </div>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-between md:justify-end shrink-0">

            {/* Price */}
            <div className="flex flex-col text-right justify-center hidden sm:flex">
              <span className="text-base font-extrabold text-[#0F2D30] font-display leading-tight">
                ₹{getResolvedPrice().toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              {getResolvedOriginalPrice() > getResolvedPrice() && (
                <span className="text-[10px] text-slate-400 line-through font-semibold leading-none">
                  ₹{getResolvedOriginalPrice().toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>

            {/* Quantity select */}
            <div className="flex items-center border border-slate-200 rounded-xl px-1.5 py-0.5 bg-white shrink-0">
              <button
                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                className="w-6 h-6 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer font-bold text-xs"
              >
                -
              </button>
              <span className="w-5 text-center text-xs font-bold text-slate-800 font-sans">{quantity}</span>
              <button onClick={() => setQuantity(prev => prev + 1)} className="w-6 h-6 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer font-bold text-xs">+</button>
            </div>
            <button
              onClick={handleAddToCart}
              className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#006670] border border-[#006670]/20 hover:border-[#006670] text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap text-center"
            >
              Add to Cart
            </button>
            {productData?.inventory?.available_stock > 0 && (
              <button
                onClick={handleBuyNow}
                className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer whitespace-nowrap text-center"
              >
                Buy Now
              </button>
            )}
          </div>
        </div>
      </div>

      {isFullscreenOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center animate-fadeIn select-none" onClick={() => { setIsFullscreenOpen(false); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}>
          <button onClick={() => { setIsFullscreenOpen(false); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }} className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all cursor-pointer z-55 shadow-md"><X className="w-5 h-5" /></button>
          <button onClick={(e) => { e.stopPropagation(); setActiveImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }} className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all cursor-pointer z-55 shadow-md"><ChevronLeft className="w-5 h-5 stroke-[2.5]" /></button>
          <button onClick={(e) => { e.stopPropagation(); setActiveImageIndex((prev) => (prev + 1) % productImages.length); setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }} className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all cursor-pointer z-55 shadow-md"><ChevronRight className="w-5 h-5 stroke-[2.5]" /></button>
          <div className="relative w-[90vw] h-[80vh] flex items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <img
              src={productImages[activeImageIndex]?.src || '/images/nsk_handpiece_portrait.png'}
              alt={productImages[activeImageIndex]?.alt || ''}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleImageClick}
              style={{
                transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                transition: isDragging ? 'none' : 'transform 350ms cubic-bezier(.22,.61,.36,1), opacity 300ms ease',
                maxHeight: '100%',
                maxWidth: '100%'
              }}
              className={`object-contain select-none rounded-3xl transition-transform duration-300
                ${productImages[activeImageIndex]?.isLifestyle
                  ? 'p-0 shadow-[0_24px_70px_rgba(0,0,0,0.6)]'
                  : 'bg-white p-8 shadow-[0_24px_70px_rgba(0,0,0,0.5)]'
                }`}
            />
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-white/50 bg-white/5 px-4.5 py-2 rounded-full backdrop-blur-sm pointer-events-none">
            {activeImageIndex + 1} / {productImages.length} • Click image to Zoom {zoomLevel > 1 ? 'Out' : 'In'} • Drag to Pan
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        product={{
          id: productData?.id || activeProductId,
          name: productData?.name || 'Clinical Product',
          slug: productData?.slug || activeProductId,
          price: getResolvedPrice(),
          originalPrice: getResolvedOriginalPrice(),
          image_url: productImages[0]?.src || '/images/bestseller_handpiece.png',
        }}
      />
    </div>
  );
};

export default ProductDetailPage;
