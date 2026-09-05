'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/contexts/StoreContext';
import CheckoutPage from '@/components/store/CheckoutPage';

export default function CheckoutRoute() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const store = useStore();
  const [isOrderPlaced, setIsOrderPlaced] = React.useState(false);

  // Determine cart items source (Direct Buy Now item or general Shopping Cart items)
  const activeCheckoutItems = store.checkoutSource === 'buy-now' && store.buyNowItem
    ? [store.buyNowItem]
    : store.cartItems;

  // Authentication Guard: Redirect to homepage if user is unauthenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      store.showToast('Please login to access checkout.');
      store.openLoginModal();
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router, store]);

  // Empty Cart Guard: only redirect if cart is genuinely empty on page load
  // We intentionally skip this if the cart just loaded (cartLoading) or if order was just placed
  useEffect(() => {
    if (
      !isOrderPlaced &&
      !isLoading &&
      !store.cartLoading &&
      isAuthenticated &&
      activeCheckoutItems.length === 0 &&
      store.checkoutSource !== 'buy-now'
    ) {
      store.showToast('Your cart is empty. Please add items to proceed with checkout.');
      router.push('/cart');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrderPlaced, store.cartLoading, isAuthenticated, isLoading, activeCheckoutItems.length, store.checkoutSource]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#006670] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Secure Checkout...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirect handled by useEffect
  }

  const handleViewChange = (view: string) => {
    if (view === 'home') router.push('/');
    else if (view === 'portfolio') router.push('/search');
    else if (view === 'cart') router.push('/cart');
    else if (view === 'wishlist') router.push('/wishlist');
    else if (view === 'order-success') router.push('/order-success');
    else if (view === 'my-orders') {
      store.setDashboardSection('orders');
      router.push('/profile');
    }
  };

  const handlePlaceOrderSuccess = (orderData: any) => {
    setIsOrderPlaced(true);
    store.setCompletedOrderData(orderData);
    // Navigate cleanly to order success page
    router.replace('/order-success');
    // Clear checkout items after transition
    setTimeout(() => {
      store.setCartItems([]);
      store.setBuyNowItem(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('faazo_checkout_source');
        sessionStorage.removeItem('faazo_buy_now_item');
      }
    }, 500);
  };

  const handleBackCheckout = () => {
    if (store.checkoutSource === 'buy-now' && store.buyNowItem) {
      router.push(`/products/${store.buyNowItem.id}`);
    } else {
      router.push('/cart');
    }
  };

  return (
    <>
      {/* Load Razorpay script dynamically for secure payments */}
      <Script 
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <CheckoutPage
        cartItems={activeCheckoutItems}
        setCurrentView={handleViewChange}
        checkoutSource={store.checkoutSource}
        onBackCheckout={handleBackCheckout}
        showToast={store.showToast}
        onPlaceOrderSuccess={handlePlaceOrderSuccess}
      />
    </>
  );
}
