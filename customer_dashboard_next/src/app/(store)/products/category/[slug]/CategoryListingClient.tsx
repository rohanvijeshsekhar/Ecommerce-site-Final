'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/contexts/StoreContext';
import ProductListingPage from '@/components/store/ProductListingPage';
import { getCategoryDisplayName } from '@/lib/utils';

interface CategoryListingClientProps {
  slug?: string;
  categoryName?: string;
}

export default function CategoryListingClient({ slug, categoryName }: CategoryListingClientProps) {
  const router = useRouter();
  const store = useStore();
  const categoryDisplayName = categoryName || (slug ? getCategoryDisplayName(slug) : 'All Products');

  const handleProductClick = (productSlug: string) => {
    router.push(`/products/${productSlug}`);
  };

  const handleBackToPortfolio = () => {
    router.push('/products');
  };

  return (
    <ProductListingPage
      category={categoryDisplayName}
      onBackToPortfolio={handleBackToPortfolio}
      onProductClick={handleProductClick}
      setCartItems={store.setCartItems}
      onBuyNowDirect={store.handleBuyNowDirect}
      showToast={store.showToast}
      onOpenLoginModal={store.openLoginModal}
    />
  );
}
