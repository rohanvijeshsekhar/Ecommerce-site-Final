'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/contexts/StoreContext';
import FlipkartCart from '@/components/store/FlipkartCart';

export default function CartPage() {
  const router = useRouter();
  const store = useStore();

  const handleProductClick = (slug: string) => {
    router.push(`/products/${slug}`);
  };

  const handleViewChange = (view: string) => {
    if (view === 'home') router.push('/');
    else if (view === 'portfolio') router.push('/search');
    else if (view === 'checkout') router.push('/checkout');
    else if (view === 'wishlist') router.push('/wishlist');
    else if (view === 'my-orders') {
      store.setDashboardSection('orders');
      router.push('/profile');
    }
  };

  return (
    <FlipkartCart
      cartItems={store.cartItems}
      setCartItems={store.setCartItems}
      savedForLaterItems={store.savedForLaterItems}
      setSavedForLaterItems={store.setSavedForLaterItems}
      setCurrentView={handleViewChange}
      onProductClick={handleProductClick}
      showToast={store.showToast}
      onOpenLoginModal={store.openLoginModal}
    />
  );
}
