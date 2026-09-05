'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/contexts/StoreContext';
import dynamic from 'next/dynamic';
import Hero from '@/components/store/Hero';
import CategoryList from '@/components/store/CategoryList';
import { getCategoryIconBadge } from '@/utils/categoryIcons';
import BrandLogos from '@/components/store/BrandLogos';
const BestSellers = dynamic(() => import('@/components/store/BestSellers'), { ssr: true });
import WhyChooseBanner from '@/components/store/WhyChooseBanner';
const FeaturedCombos = dynamic(() => import('@/components/store/FeaturedCombos'), { ssr: true });
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
}

export default function HomeClient({
  initialSlides,
  initialCategories,
  initialBestSellers,
  initialRecommended,
  initialCombos
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
      icon: getCategoryIconBadge(c.display_title, slug, c.icon_key),
      icon_key: c.icon_key
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

  const mappedRecommended = initialRecommended.map((item: any, index: number) => {
    const price = item.pricing ? parseFloat(item.pricing.effective_price || item.pricing.selling_price || '0') : (item.price || 10499);
    const mrp = item.pricing ? parseFloat(item.pricing.mrp || '0') : item.originalPrice;
    const discountPct = item.pricing?.discount_percentage;
    const discountStr = discountPct && discountPct > 0 ? `${Math.round(discountPct)}% OFF` : '';

    const scales = [1.25, 1.35, 1.45, 1.15, 1.3];
    const gradients = [
      'linear-gradient(135deg, #FCFCFC 0%, #F4F8F7 50%, #E2EDEC 100%)',
      'linear-gradient(135deg, #FCFCFC 0%, #F2F7F8 55%, #DFEEF0 100%)',
      'linear-gradient(135deg, #FAFBFB 0%, #EFF5F5 45%, #DCECEC 100%)',
      'linear-gradient(135deg, #FCFCFC 0%, #F1F6F5 60%, #DEEAE8 100%)',
      'linear-gradient(135deg, #FAFAFA 0%, #F3F7F7 50%, #E1ECEB 100%)'
    ];

    return {
      id:           item.product_slug ?? item.product ?? item.slug,
      title:        item.product_name ?? item.name,
      manufacturer: item.brand_name || 'Brand',
      rating:       4.8,
      reviews:      50 + (index * 7) % 80,
      price:        price,
      originalPrice: mrp && mrp > price ? mrp : undefined,
      image:        item.primary_image || item.image || '/images/bestseller_scaler.png',
      discount:     discountStr,
      scale:        scales[index % scales.length],
      gradient:     gradients[index % gradients.length],
      glowColor:    'rgba(0, 43, 46, 0.05)'
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
