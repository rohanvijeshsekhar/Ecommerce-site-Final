'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/contexts/StoreContext';
import ProductListingPage from '@/components/store/ProductListingPage';

export default function ProductsPage() {
  const router = useRouter();
  const store = useStore();

  const handleProductClick = (slug: string) => {
    router.push(`/products/${slug}`);
  };

  const handleBackToPortfolio = () => {
    router.push('/');
  };

  return (
    <ProductListingPage
      category="All Products"
      onBackToPortfolio={handleBackToPortfolio}
      onProductClick={handleProductClick}
      setCartItems={store.setCartItems}
      onBuyNowDirect={store.handleBuyNowDirect}
      showToast={store.showToast}
      onOpenLoginModal={store.openLoginModal}
    />
  );
}
