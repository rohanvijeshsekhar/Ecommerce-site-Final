'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/contexts/StoreContext';
import { getAbsoluteImageUrl } from '@/lib/api';
import dynamic from 'next/dynamic';
import Hero from '@/components/store/Hero';
import CategoryList from '@/components/store/CategoryList';
import BrandLogos from '@/components/store/BrandLogos';
const BestSellers = dynamic(() => import('@/components/store/BestSellers'), { ssr: true });
import FeaturedCollection from '@/components/store/FeaturedCollection';
import WhyChooseBanner from '@/components/store/WhyChooseBanner';
const FeaturedCombos = dynamic(() => import('@/components/store/FeaturedCombos'), { ssr: true });
const ExploreSolutions = dynamic(() => import('@/components/store/ExploreSolutions'), { ssr: true });
import WhyChoosePanel from '@/components/store/WhyChoosePanel';
import BrandDealsSection from '@/components/store/BrandDealsSection';
const Testimonials = dynamic(() => import('@/components/store/Testimonials'), { ssr: true });
const Recommended = dynamic(() => import('@/components/store/Recommended'), { ssr: true });
import ProfessionalsChoice from '@/components/store/ProfessionalsChoice';
import DailyOffersSection from '@/components/store/daily-offers/DailyOffersSection';

interface HomeClientProps {
  initialSlides: any[];
  initialCategories: any[];
  initialBestSellers: any[];
  initialRecommended: any[];
  initialCombos: any[];
  initialCollections?: any[];
  initialSolutions?: any[];
  initialDailyOffers?: any[];
  initialBrandDeals?: any[];
}

export default function HomeClient({
  initialSlides,
  initialCategories,
  initialBestSellers,
  initialRecommended,
  initialCombos,
  initialCollections,
  initialSolutions,
  initialDailyOffers,
  initialBrandDeals,
}: HomeClientProps) {
  const router = useRouter();
  const store = useStore();

  const handleProductClick = (slug: string) => {
    router.push(`/products/${slug}`);
  };

  const handleCategoryClick = (categoryName: string) => {
    // Map category name to lower slug
    const slug = categoryName.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
    router.push(`/products/category/${slug}`);
  };

  const handleViewChange = (view: string) => {
    if (view === 'portfolio') router.push('/search');
    else if (view === 'combo-deals') router.push('/combo-deals');
  };

  const handleComboClick = (slug: string) => {
    router.push(`/combo-deals/${slug}`);
  };

  // Safeguards ensuring array inputs even if backend returns pagination envelopes or errors
  const safeCategories = Array.isArray(initialCategories)
    ? initialCategories
    : (initialCategories as any)?.data || (initialCategories as any)?.results || [];
  const safeBestSellers = Array.isArray(initialBestSellers)
    ? initialBestSellers
    : (initialBestSellers as any)?.data || (initialBestSellers as any)?.results || [];
  const safeRecommended = Array.isArray(initialRecommended)
    ? initialRecommended
    : (initialRecommended as any)?.data || (initialRecommended as any)?.results || [];
  const safeSlides = Array.isArray(initialSlides) ? initialSlides : (initialSlides as any)?.data || [];
  const safeCombos = Array.isArray(initialCombos) ? initialCombos : (initialCombos as any)?.data || [];
  const safeCollections = Array.isArray(initialCollections) ? initialCollections : (initialCollections as any)?.data || [];
  const safeSolutions = Array.isArray(initialSolutions) ? initialSolutions : (initialSolutions as any)?.data || [];
  const safeDailyOffers = Array.isArray(initialDailyOffers) ? initialDailyOffers : (initialDailyOffers as any)?.data || [];
  const safeBrandDeals = Array.isArray(initialBrandDeals) ? initialBrandDeals : (initialBrandDeals as any)?.data || [];

  // Maps the categories backend structure to initialCategories props format
  const mappedCategories = safeCategories.map((c: any) => {
    if (!c) return null;
    const slug = c.category_slug ?? c.category ?? '';
    const getCategoryFallbackImage = (sSlug: string): string => {
      const s = String(sSlug || '').toLowerCase();
      if (s.includes('handpiece')) return '/images/category_handpieces.png';
      if (s.includes('camera') || s.includes('scan') || s.includes('imaging') || s.includes('x-ray')) return '/images/category_imaging.png';
      if (s.includes('instrument')) return '/images/category_instruments.png';
      if (s.includes('compressor') || s.includes('suction') || s.includes('equipment')) return '/images/category_equipment.png';
      if (s.includes('chair') || s.includes('seating') || s.includes('stool')) return '/images/category_chairs.png';
      return '/images/category_materials.png';
    };
    return {
      id: c.category_slug ?? c.category,
      title: c.display_title || c.title || 'Category',
      image: getAbsoluteImageUrl(c.card_image_url) || getCategoryFallbackImage(slug),
    };
  }).filter(Boolean);

  const mappedBestSellers = safeBestSellers.map((b: any) => {
    if (!b) return null;
    const price = b.pricing ? parseFloat(b.pricing.effective_price || b.pricing.selling_price || '0') : 0;
    const rawRating = b.average_rating ?? b.avg_rating ?? b.rating;
    const rating = rawRating !== undefined && rawRating !== null ? parseFloat(String(rawRating)) : 0;
    const rawReviews = b.total_reviews ?? b.reviews_count ?? b.review_count ?? b.reviews;
    const reviews = rawReviews !== undefined && rawReviews !== null ? parseInt(String(rawReviews), 10) : 0;
    return {
      id:       b.product_slug ?? b.product,
      title:    b.display_heading || b.product_name || 'Featured Product',
      subtitle: b.display_short_description || '',
      price:    price,
      rating:   rating,
      reviews:  reviews,
      image:    getAbsoluteImageUrl(b.display_image_url) || '/images/nsk_handpiece_portrait.png',
    };
  }).filter(Boolean);

  const mappedRecommended = safeRecommended.map((item: any) => {
    if (!item) return null;
    const price = item.pricing ? parseFloat(item.pricing.effective_price || item.pricing.selling_price || '0') : (item.price ? parseFloat(item.price) : 0);
    const mrp = item.pricing ? parseFloat(item.pricing.mrp || '0') : (item.originalPrice || item.original_price ? parseFloat(item.originalPrice || item.original_price) : undefined);
    const discountPct = item.pricing?.discount_percentage;
    const discountStr = discountPct && discountPct > 0 
      ? `${Math.round(discountPct)}% OFF` 
      : (mrp && mrp > price ? `${Math.round(((mrp - price) / mrp) * 100)}% OFF` : '');

    const rating = item.average_rating || item.avg_rating || item.rating ? parseFloat(item.average_rating || item.avg_rating || item.rating) : undefined;
    const reviews = item.total_reviews || item.reviews_count || item.review_count || item.reviews ? parseInt(item.total_reviews || item.reviews_count || item.review_count || item.reviews) : undefined;

    return {
      id:           item.product_slug ?? item.slug ?? item.product ?? String(item.id),
      title:        item.product_name ?? item.name ?? '',
      manufacturer: item.brand_name || 'Brand',
      category:     item.category_name,
      rating:       rating && rating > 0 ? rating : undefined,
      reviews:      reviews && reviews > 0 ? reviews : undefined,
      price:        price,
      originalPrice: mrp && mrp > price ? mrp : undefined,
      image:        getAbsoluteImageUrl(item.primary_image || (item.images && item.images[0]?.image) || item.image || ''),
      discount:     discountStr,
    };
  }).filter(Boolean);

  return (
    <>
      <Hero initialSlides={safeSlides} />
      <CategoryList onCategoryClick={handleCategoryClick} initialCategories={mappedCategories} />
      <DailyOffersSection initialOffers={safeDailyOffers} />
      <BestSellers
        onProductClick={handleProductClick}
        onOpenLoginModal={store.openLoginModal}
        setCartItems={store.setCartItems}
        wishlistItems={store.wishlistItems}
        setWishlistItems={store.setWishlistItems}
        showToast={store.showToast}
        initialProducts={mappedBestSellers}
      />
      <FeaturedCollection initialCollections={safeCollections} />
      <BrandLogos />
      <WhyChooseBanner />
      <FeaturedCombos
        onComboClick={handleComboClick}
        setCurrentView={handleViewChange}
        setCartItems={store.setCartItems}
        wishlistItems={store.wishlistItems}
        setWishlistItems={store.setWishlistItems}
        showToast={store.showToast}
        onOpenLoginModal={store.openLoginModal}
        initialCombos={safeCombos}
      />
      <ExploreSolutions initialSolutions={safeSolutions} />
      <WhyChoosePanel />
      <BrandDealsSection initialBrandDeals={safeBrandDeals} />
      <Testimonials />
      <Recommended
        onProductClick={handleProductClick}
        onOpenLoginModal={store.openLoginModal}
        setCartItems={store.setCartItems}
        wishlistItems={store.wishlistItems}
        setWishlistItems={store.setWishlistItems}
        showToast={store.showToast}
        initialProducts={mappedRecommended}
      />
      <ProfessionalsChoice />
    </>
  );
}
