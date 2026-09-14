'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductsLandingPage from '@/components/store/ProductsLandingPage';

export default function CategoriesPage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const checkViewport = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        router.replace('/products');
      }
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, [router]);

  const handleCategoryClick = (categoryName: string) => {
    const slug = categoryName.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
    router.push(`/products/category/${slug}`);
  };

  const handleProductClick = (slug: string) => {
    router.push(`/products/${slug}`);
  };

  const handleViewChange = (view: string) => {
    if (view === 'home') router.push('/');
  };

  // Do not render the legacy desktop showcase if on desktop
  if (isMobile === false) {
    return null;
  }

  return (
    <ProductsLandingPage
      onCategoryClick={handleCategoryClick}
      onProductClick={handleProductClick}
      setCurrentView={handleViewChange}
    />
  );
}


