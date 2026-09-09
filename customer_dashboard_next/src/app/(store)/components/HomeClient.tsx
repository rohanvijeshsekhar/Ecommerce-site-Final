'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/contexts/StoreContext';
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
const Testimonials = dynamic(() => import('@/components/store/Testimonials'), { ssr: true });
const Recommended = dynamic(() => import('@/components/store/Recommended'), { ssr: true });
import ProfessionalsChoice from '@/components/store/ProfessionalsChoice';

interface HomeClientProps {
  initialSlides: any[];
  initialCategories: any[];
  initialBestSellers: any[];
  initialRecommended: any[];
  initialCombos: any[];
  initialCollections?: any[];
  initialSolutions?: any[];
}

export default function HomeClient({
  initialSlides,
  initialCategories,
  initialBestSellers,
  initialRecommended,
  initialCombos,
  initialCollections,
  initialSolutions
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

  // Maps the categories backend structure to initialCategories props format
  const mappedCategories = initialCategories.map((c: any) => {
    const slug = c.category_slug ?? c.category ?? '';
    const getCategoryFallbackImage = (sSlug: string): string => {
      const s = sSlug.toLowerCase();
      if (s.includes('handpiece')) return '/images/category_handpieces.png';
      if (s.includes('camera') || s.includes('scan') || s.includes('imaging') || s.includes('x-ray')) return '/images/category_imaging.png';
      if (s.includes('instrument')) return '/images/category_instruments.png';
      if (s.includes('compressor') || s.includes('suction') || s.includes('equipment')) return '/images/category_equipment.png';
      if (s.includes('chair') || s.includes('seating') || s.includes('stool')) return '/images/category_chairs.png';
      return '/images/category_materials.png';
    };
    return {
      id: c.category_slug ?? c.category,
      title: c.display_title,
      image: c.card_image_url || getCategoryFallbackImage(slug),
    };
  });

  const mappedBestSellers = initialBestSellers.map((b: any) => {
    const price = b.pricing ? parseFloat(b.pricing.effective_price || b.pricing.selling_price || '0') : 0;
    return {
      id:       b.product_slug ?? b.product,
      title:    b.display_heading || b.product_name,
      subtitle: b.display_short_description || '',
      price:    price,
      rating:   4.8,
      reviews:  12,
      image:    b.display_image_url || '/images/nsk_handpiece_portrait.png',
    };
  });

  const mappedRecommended = initialRecommended.map((item: any) => {
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
      image:        item.primary_image || (item.images && item.images[0]?.image) || item.image || '',
      discount:     discountStr,
    };
  });

  return (
    <>
      <Hero initialSlides={initialSlides} />
      <CategoryList onCategoryClick={handleCategoryClick} initialCategories={mappedCategories} />
      <BestSellers
        onProductClick={handleProductClick}
        onOpenLoginModal={store.openLoginModal}
        setCartItems={store.setCartItems}
        wishlistItems={store.wishlistItems}
        setWishlistItems={store.setWishlistItems}
        showToast={store.showToast}
        initialProducts={mappedBestSellers}
      />
      <FeaturedCollection initialCollections={initialCollections} />
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
        initialCombos={initialCombos}
      />
      <ExploreSolutions initialSolutions={initialSolutions} />
      <WhyChoosePanel />
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
