'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/contexts/StoreContext';
import MyOrdersPage from '@/components/store/MyOrdersPage';

export default function OrdersRoute() {
  const router = useRouter();
  const store = useStore();

  const handleProductClick = (slug: string) => {
    router.push(`/products/${slug}`);
  };

  const handleViewChange = (view: string) => {
    if (view === 'home') router.push('/');
    else if (view === 'portfolio') router.push('/search');
    else if (view === 'cart') router.push('/cart');
    else if (view === 'wishlist') router.push('/wishlist');
    else if (view === 'checkout') router.push('/checkout');
    else if (view === 'profile') router.push('/profile');
  };

  // Convert wishlist items format
  const mappedWishlistItems = store.wishlistItems.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    qty: item.qty,
    image: item.image,
    originalPrice: item.originalPrice
  }));

  return (
    <MyOrdersPage
      orders={store.orders}
      setCartItems={store.setCartItems as any}
      wishlistItems={mappedWishlistItems}
      setCurrentView={handleViewChange}
      activeTrackingOrderId={null}
      onProductClick={handleProductClick}
      showToast={store.showToast}
    />
  );
}
