'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Star, ShoppingCart, Heart, ArrowRight } from 'lucide-react';
import { api, getAbsoluteImageUrl } from '../../lib/api';
import { useGuestGuard } from '../../hooks/useGuestGuard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BestSellerProduct {
  id: string;
  title: string;
  brand: string;
  description: string;
  price: number;
  originalPrice?: number;
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
  setCartItems?: React.Dispatch<React.SetStateAction<MockCartItem[]>>;
  wishlistItems?: MockCartItem[];
  setWishlistItems?: React.Dispatch<React.SetStateAction<MockCartItem[]>>;
  showToast?: (msg: string) => void;
  initialProducts?: any[];
}

// ─── Static Fallback Products ─────────────────────────────────────────────────

const STATIC_BEST_SELLERS: BestSellerProduct[] = [
  {
    id: 'nsk-ti-max-z900l',
    title: 'NSK Ti-Max Z900L',
    brand: 'NSK',
    description: 'High-speed turbine handpiece with LED illumination',
    price: 24999,
    originalPrice: 29999,
    rating: 4.8,
    reviews: 124,
    image: '/images/nsk_handpiece_portrait.png',
  },
  {
    id: 'woodpecker-uds-e',
    title: 'Woodpecker UDS-E LED',
    brand: 'Woodpecker',
    description: 'Ultrasonic scaler with built-in LED light guide',
    price: 12499,
    originalPrice: 15000,
    rating: 4.7,
    reviews: 87,
    image: '/images/bestseller_scaler.png',
  },
  {
    id: 'dentsply-x-smart',
    title: 'Dentsply X-Smart Plus',
    brand: 'Dentsply Sirona',
    description: 'Advanced endodontic motor with auto-reverse torque',
    price: 38500,
    originalPrice: 45000,
    rating: 4.9,
    reviews: 63,
    image: '/images/bestseller_scaler.png',
  },
  {
    id: 'planmeca-compact-i',
    title: 'Planmeca Compact i5',
    brand: 'Planmeca',
    description: 'Ergonomic dental unit for modern clinical workflows',
    price: 189000,
    originalPrice: 210000,
    rating: 4.9,
    reviews: 42,
    image: '/images/category_chairs.png',
  },
  {
    id: 'ivoclar-emax',
    title: 'IPS e.max Press',
    brand: 'Ivoclar',
    description: 'Premium lithium disilicate ceramic for restorations',
    price: 8750,
    originalPrice: 9999,
    rating: 4.8,
    reviews: 56,
    image: '/images/category_materials.png',
  },
  {
    id: 'satelec-p5-newtron',
    title: 'Satelec P5 Newtron',
    brand: 'Acteon',
    description: 'Piezoelectric ultrasonic scaler for precision scaling',
    price: 18500,
    originalPrice: 22000,
    rating: 4.7,
    reviews: 39,
    image: '/images/bestseller_scaler.png',
  },
  {
    id: 'morita-root-zx-ii',
    title: 'Morita Root ZX II',
    brand: 'J. Morita',
    description: 'Gold-standard electronic apex locator for endodontics',
    price: 31000,
    originalPrice: 35000,
    rating: 4.9,
    reviews: 72,
    image: '/images/nsk_handpiece_portrait.png',
  },
  {
    id: 'gdc-extraction-kit',
    title: 'GDC Extraction Kit',
    brand: 'GDC',
    description: 'Complete surgical extraction forceps and elevator set',
    price: 7200,
    originalPrice: 8500,
    rating: 4.6,
    reviews: 98,
    image: '/images/category_materials.png',
  },
];

// ─── Scroll-Triggered Fade-Up Hook ────────────────────────────────────────────

function useFadeUp(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

// ─── Product Card ─────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: BestSellerProduct;
  index: number;
  isWishlisted: boolean;
  onProductClick?: (id: string) => void;
  onAddToCart: (e: React.MouseEvent, p: BestSellerProduct) => void;
  onToggleWishlist: (e: React.MouseEvent, p: BestSellerProduct) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  index,
  isWishlisted,
  onProductClick,
  onAddToCart,
  onToggleWishlist,
}) => {
  const { ref, visible } = useFadeUp(0.08);
  const discountPct = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div
      ref={ref}
      className="bs-card"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.45s ease ${index * 0.07}s, transform 0.45s ease ${index * 0.07}s`,
      }}
      onClick={() => onProductClick?.(product.id)}
    >
      {/* Image Container */}
      <div className="bs-image-wrap">
        {/* Best Seller Badge */}
        <span className="bs-badge">★ Best Seller</span>

        {/* Wishlist */}
        <button
          className="bs-wishlist-btn"
          onClick={(e) => onToggleWishlist(e, product)}
          aria-label="Toggle wishlist"
        >
          <Heart
            className={`w-4 h-4 transition-all duration-200 ${
              isWishlisted
                ? 'fill-[#006670] stroke-[#006670]'
                : 'stroke-slate-400'
            }`}
          />
        </button>

        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          className="bs-image"
        />
      </div>

      {/* Card Body */}
      <div className="bs-body">
        {/* Brand */}
        <p className="bs-brand">{product.brand}</p>

        {/* Title */}
        <h3 className="bs-[#1E293B] bs-title">{product.title}</h3>

        {/* Description */}
        <p className="bs-description">{product.description}</p>

        {/* Rating */}
        <div className="bs-rating">
          <div className="bs-stars">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${
                  i < Math.floor(product.rating)
                    ? 'fill-amber-400 stroke-amber-400'
                    : i < product.rating
                    ? 'fill-amber-200 stroke-amber-300'
                    : 'stroke-slate-200 fill-none'
                }`}
              />
            ))}
          </div>
          <span className="bs-rating-score">{product.rating}</span>
          <span className="bs-rating-count">({product.reviews})</span>
        </div>

        {/* Pricing */}
        <div className="bs-pricing">
          <div className="bs-price-block">
            <span className="bs-price">₹{product.price.toLocaleString('en-IN')}</span>
            {product.originalPrice && (
              <span className="bs-original-price">₹{product.originalPrice.toLocaleString('en-IN')}</span>
            )}
          </div>
          {discountPct > 0 && (
            <span className="bs-discount-pill">{discountPct}% off</span>
          )}
        </div>

        {/* Actions */}
        <div className="bs-actions">
          <button
            className="bs-btn-cart"
            onClick={(e) => onAddToCart(e, product)}
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span>Add to Cart</span>
          </button>
          <button
            className="bs-btn-details"
            onClick={(e) => { e.stopPropagation(); onProductClick?.(product.id); }}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── BestSellers Section ──────────────────────────────────────────────────────

const BestSellers: React.FC<BestSellersProps> = ({
  onProductClick,
  onOpenLoginModal,
  setCartItems,
  wishlistItems,
  setWishlistItems,
  showToast,
  initialProducts,
}) => {
  const [products, setProducts] = useState<BestSellerProduct[]>(() => {
    if (Array.isArray(initialProducts) && initialProducts.length > 0) {
      return initialProducts.map((b: any, idx: number) => ({
        id: b.id || b.product_slug || b.slug || String(idx),
        title: b.title || b.display_heading || b.product_name || b.name,
        brand: b.brand || b.brand_name || 'FAAZO',
        description: b.subtitle || b.description || b.display_short_description || b.short_description || '',
        price: typeof b.price === 'number' ? b.price : parseFloat(b.price || '0'),
        originalPrice: b.originalPrice ? parseFloat(b.originalPrice) : undefined,
        rating: b.rating || 4.8,
        reviews: b.reviews || (40 + (idx * 11) % 90),
        image: getAbsoluteImageUrl(b.image || b.display_image_url || b.primary_image) || '/images/nsk_handpiece_portrait.png',
      }));
    }
    return [];
  });

  const { guardAction } = useGuestGuard(onOpenLoginModal ?? (() => {}), showToast);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerVisible, setHeaderVisible] = useState(false);

  // Header fade-up
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setHeaderVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fetch products if initialProducts was not passed or empty
  useEffect(() => {
    if (products.length > 0) return;

    const mapBestSeller = (b: any, idx: number): BestSellerProduct => {
      const price = b.pricing
        ? parseFloat(b.pricing.effective_price || b.pricing.selling_price || '0')
        : (b.price || 0);
      const mrp = b.pricing ? parseFloat(b.pricing.mrp || '0') : (b.originalPrice || 0);
      return {
        id:            b.product_slug ?? b.product ?? b.slug ?? String(idx),
        title:         b.display_heading || b.product_name || b.name || b.title,
        brand:         b.brand_name || b.brand || 'FAAZO',
        description:   b.display_short_description || b.short_description || b.subtitle || '',
        price,
        originalPrice: mrp > price ? mrp : undefined,
        rating:        4.8,
        reviews:       40 + (idx * 11) % 90,
        image:         getAbsoluteImageUrl(b.display_image_url || b.primary_image || b.image) || '/images/nsk_handpiece_portrait.png',
      };
    };

    api.get('homepage/best-sellers/')
      .then(res => {
        const data = res.data?.data ?? res.data?.results ?? res.data ?? [];
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data.map(mapBestSeller));
        } else {
          api.get('products/?page_size=12')
            .then(pRes => {
              const pData = pRes.data?.data ?? pRes.data?.results ?? pRes.data ?? [];
              if (Array.isArray(pData) && pData.length > 0) {
                setProducts(pData.map((item: any, idx: number) => mapBestSeller(item, idx)));
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [products.length]);

  const displayProducts = products.length > 0 ? products : STATIC_BEST_SELLERS;

  const isWishlisted = (id: string) => wishlistItems ? wishlistItems.some(w => w.id === id) : false;

  const handleAddToCart = (e: React.MouseEvent, prod: BestSellerProduct) => {
    e.stopPropagation();
    const item: MockCartItem = {
      id: prod.id,
      name: prod.title,
      category: 'Dental Equipment',
      price: prod.price,
      qty: 1,
      image: prod.image,
      originalPrice: prod.originalPrice,
      rating: prod.rating,
    };
    if (!guardAction({ type: 'add-to-cart', payload: { item } })) return;
    if (setCartItems) {
      setCartItems(prev => {
        const existing = prev.find(c => c.id === prod.id);
        if (existing) return prev.map(c => c.id === prod.id ? { ...c, qty: c.qty + 1 } : c);
        return [...prev, item];
      });
    }
    showToast?.('Added to Cart');
  };

  const handleToggleWishlist = (e: React.MouseEvent, prod: BestSellerProduct) => {
    e.stopPropagation();
    const item: MockCartItem = {
      id: prod.id,
      name: prod.title,
      category: 'Dental Equipment',
      price: prod.price,
      qty: 1,
      image: prod.image,
      originalPrice: prod.originalPrice,
    };
    if (!guardAction({ type: 'wishlist-toggle', payload: { item } })) return;
    if (setWishlistItems) {
      setWishlistItems(prev => {
        const exists = prev.find(w => w.id === prod.id);
        if (exists) {
          showToast?.('Removed from Wishlist');
          return prev.filter(w => w.id !== prod.id);
        } else {
          showToast?.('Added to Wishlist');
          return [...prev, item];
        }
      });
    }
  };

  return (
    <>
      {/* ── Scoped Styles ── */}
      <style>{`
        /* ── Section ── */
        .bs-section {
          width: 100%;
          background: #F8FAFC;
          padding: 80px 0 96px;
          position: relative;
        }
        @media (max-width: 767px) {
          .bs-section { padding: 52px 0 64px; }
        }

        /* ── Container ── */
        .bs-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 48px;
        }
        @media (max-width: 1023px) { .bs-container { padding: 0 28px; } }
        @media (max-width: 767px)  { .bs-container { padding: 0 20px; } }

        /* ── Section Header ── */
        .bs-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 48px;
        }
        @media (max-width: 639px) {
          .bs-header { flex-direction: column; align-items: flex-start; gap: 12px; margin-bottom: 32px; }
        }

        .bs-eyebrow {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #006670;
          margin-bottom: 10px;
        }

        .bs-heading {
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 700;
          color: #0F2D30;
          letter-spacing: -0.03em;
          line-height: 1.15;
          margin: 0 0 10px;
        }

        .bs-subtitle {
          font-size: 15px;
          color: #64748B;
          font-weight: 400;
          line-height: 1.6;
          margin: 0;
          max-width: 440px;
        }
        @media (max-width: 767px) { .bs-subtitle { font-size: 14px; } }

        .bs-view-all {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13.5px;
          font-weight: 600;
          color: #006670;
          text-decoration: none;
          white-space: nowrap;
          transition: color 0.2s ease, gap 0.2s ease;
          flex-shrink: 0;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
        }
        .bs-view-all:hover { color: #004e56; gap: 10px; }

        /* ── Grid ── */
        .bs-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        @media (max-width: 1199px) { .bs-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 767px)  { .bs-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; } }

        /* ── Product Card ── */
        .bs-card {
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 18px;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);
          position: relative;
        }
        .bs-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 32px rgba(0,95,99,0.10), 0 2px 8px rgba(0,0,0,0.04);
          border-color: rgba(0,102,112,0.18);
        }

        /* ── Image Wrapper ── */
        .bs-image-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          background: #F4F8F7;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── Product Image ── */
        .bs-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.35s ease;
        }
        .bs-card:hover .bs-image {
          transform: scale(1.04);
        }

        /* ── Best Seller Badge ── */
        .bs-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 2;
          background: rgba(217, 175, 98, 0.14);
          color: #96750A;
          border: 1px solid rgba(150, 117, 10, 0.22);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 4px 10px;
          border-radius: 100px;
          white-space: nowrap;
          backdrop-filter: blur(4px);
        }

        /* ── Wishlist Button ── */
        .bs-wishlist-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 2;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.80);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.07);
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .bs-wishlist-btn:hover {
          background: rgba(255,255,255,0.95);
          transform: scale(1.08);
        }

        /* ── Card Body ── */
        .bs-body {
          padding: 16px 16px 18px;
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 0;
        }
        @media (max-width: 767px) { .bs-body { padding: 12px 12px 14px; } }

        /* ── Brand ── */
        .bs-brand {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #94A3B8;
          margin: 0 0 5px;
        }

        /* ── Title ── */
        .bs-title {
          font-size: 14px;
          font-weight: 600;
          color: #1E293B;
          letter-spacing: -0.01em;
          line-height: 1.35;
          margin: 0 0 5px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @media (max-width: 767px) { .bs-title { font-size: 13px; } }

        /* ── Description ── */
        .bs-description {
          font-size: 11.5px;
          color: #94A3B8;
          margin: 0 0 10px;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @media (max-width: 767px) { .bs-description { display: none; } }

        /* ── Rating ── */
        .bs-rating {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 12px;
        }
        .bs-stars { display: flex; align-items: center; gap: 2px; }
        .bs-rating-score { font-size: 12px; font-weight: 700; color: #334155; }
        .bs-rating-count { font-size: 11px; color: #94A3B8; font-weight: 500; }

        /* ── Pricing ── */
        .bs-pricing {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 13px;
          gap: 8px;
        }
        .bs-price-block { display: flex; align-items: baseline; gap: 7px; flex-wrap: wrap; }
        .bs-price {
          font-size: 16px;
          font-weight: 700;
          color: #0F2D30;
          letter-spacing: -0.02em;
        }
        @media (max-width: 767px) { .bs-price { font-size: 15px; } }
        .bs-original-price {
          font-size: 12px;
          color: #94A3B8;
          text-decoration: line-through;
          font-weight: 500;
        }
        .bs-discount-pill {
          font-size: 10px;
          font-weight: 700;
          color: #059669;
          background: rgba(5,150,105,0.08);
          border: 1px solid rgba(5,150,105,0.14);
          padding: 3px 8px;
          border-radius: 100px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* ── Actions ── */
        .bs-actions {
          display: flex;
          gap: 8px;
          margin-top: auto;
        }

        /* Primary: Add to Cart */
        .bs-btn-cart {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          background: #006670;
          color: #ffffff;
          font-size: 12.5px;
          font-weight: 600;
          padding: 9px 14px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
          white-space: nowrap;
        }
        .bs-btn-cart:hover {
          background: #004e56;
          box-shadow: 0 4px 14px rgba(0,95,99,0.22);
          transform: translateY(-1px);
        }
        .bs-btn-cart:active { transform: translateY(0); }
        @media (max-width: 767px) { .bs-btn-cart { font-size: 11.5px; padding: 8px 10px; gap: 5px; } }

        /* Secondary: Details */
        .bs-btn-details {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: #475569;
          font-size: 12.5px;
          font-weight: 600;
          padding: 9px 13px;
          border-radius: 10px;
          border: 1px solid #E2E8F0;
          cursor: pointer;
          transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .bs-btn-details:hover {
          border-color: #006670;
          color: #006670;
          background: rgba(0,102,112,0.04);
        }
        @media (max-width: 767px) { .bs-btn-details { font-size: 11.5px; padding: 8px 10px; } }
      `}</style>

      <section className="bs-section" id="best-sellers" aria-label="Best Sellers">
        <div className="bs-container">

          {/* ── Header ── */}
          <div
            ref={headerRef}
            className="bs-header"
            style={{
              opacity: headerVisible ? 1 : 0,
              transform: headerVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}
          >
            <div className="bs-header-left">
              <span className="bs-eyebrow">Best Sellers</span>
              <h2 className="bs-heading">Best Sellers</h2>
              <p className="bs-subtitle">
                Discover the products most trusted by dental professionals across India.
              </p>
            </div>

            <button
              className="bs-view-all"
              onClick={() => onProductClick?.('all-products')}
              aria-label="View all products"
            >
              View All →
            </button>
          </div>

          {/* ── Product Grid ── */}
          <div className="bs-grid">
            {displayProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                isWishlisted={isWishlisted(product.id)}
                onProductClick={onProductClick}
                onAddToCart={handleAddToCart}
                onToggleWishlist={handleToggleWishlist}
              />
            ))}
          </div>

        </div>
      </section>
    </>
  );
};

export default BestSellers;
