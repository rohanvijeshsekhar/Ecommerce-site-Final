'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/contexts/StoreContext';
import FlipkartCart from '@/components/store/FlipkartCart';
import { ShoppingBag, RefreshCw } from 'lucide-react';

interface CartErrorBoundaryProps {
  children: ReactNode;
}

interface CartErrorBoundaryState {
  hasError: boolean;
}

class CartErrorBoundary extends Component<CartErrorBoundaryProps, CartErrorBoundaryState> {
  constructor(props: CartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): CartErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Cart rendering error caught by CartErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full bg-[#f8fafc] min-h-screen pt-[120px] pb-28 px-4 flex items-center justify-center text-center">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 max-w-md w-full shadow-sm flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[#E6F2F2] flex items-center justify-center text-[#006670] mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Your Cart is Updating</h2>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              We encountered a temporary issue while loading your clinical cart. Please reload to view your items.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  if (typeof window !== 'undefined') window.location.reload();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Cart</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    <CartErrorBoundary>
      <FlipkartCart
        cartItems={store.cartItems}
        setCartItems={store.setCartItems}
        savedForLaterItems={store.savedForLaterItems}
        setSavedForLaterItems={store.setSavedForLaterItems}
        setCurrentView={handleViewChange}
        onProductClick={handleProductClick}
        showToast={store.showToast}
        onOpenLoginModal={store.openLoginModal}
        loading={store.cartLoading}
      />
    </CartErrorBoundary>
  );
}
