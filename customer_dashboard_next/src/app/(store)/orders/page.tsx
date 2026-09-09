'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/contexts/StoreContext';
import { useWishlist } from '@/contexts/WishlistContext';
import MyOrdersPage from '@/components/store/MyOrdersPage';

export default function OrdersRoute() {
  const router = useRouter();
  const store = useStore();
  const { wishlistItems } = useWishlist();

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

  // Convert wishlist items format from WishlistContext
  const mappedWishlistItems = wishlistItems.map(item => ({
    id: String(item.id || item.product?.id || ''),
    name: item.name || item.product?.name || '',
    category: item.category_name || item.product?.category_name || '',
    price: Number(item.price || item.product?.pricing?.selling_price || 0),
    qty: 1,
    image: item.image || item.product?.primary_image || '',
    originalPrice: Number(item.product?.pricing?.mrp || 0),
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
