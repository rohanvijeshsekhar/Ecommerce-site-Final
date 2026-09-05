'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/contexts/StoreContext';
import ProfileDashboard from '@/components/store/ProfileDashboard';

export default function ProfileRoute() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const store = useStore();

  // Authentication Guard: Redirect to home page if user is unauthenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      store.showToast('Please login to access your clinical dashboard.');
      store.openLoginModal();
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router, store]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#006670] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Clinical Dashboard...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirect handled by useEffect
  }

  const handleProductClick = (slug: string) => {
    router.push(`/products/${slug}`);
  };

  const handleViewChange = (view: string) => {
    if (view === 'home') router.push('/');
    else if (view === 'portfolio') router.push('/search');
    else if (view === 'cart') router.push('/cart');
    else if (view === 'wishlist') router.push('/wishlist');
    else if (view === 'checkout') router.push('/checkout');
    else if (view === 'dealer-portal') router.push('/dealer');
  };

  // Convert wishlist MockCartItem[] to the format expected by ProfileDashboard/FlipkartWishlist
  const mappedWishlistItems = store.wishlistItems.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    qty: item.qty,
    image: item.image,
    originalPrice: item.originalPrice
  }));

  // Convert cart MockCartItem[] to the format expected
  const mappedCartItems = store.cartItems.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    qty: item.qty,
    image: item.image,
    originalPrice: item.originalPrice
  }));

  return (
    <ProfileDashboard
      activeSection={store.dashboardSection}
      setActiveSection={store.setDashboardSection}
      orders={store.orders}
      setCartItems={store.setCartItems as any}
      wishlistItems={mappedWishlistItems}
      setWishlistItems={store.setWishlistItems as any}
      setCurrentView={handleViewChange}
      onProductClick={handleProductClick}
      showToast={store.showToast}
    />
  );
}
