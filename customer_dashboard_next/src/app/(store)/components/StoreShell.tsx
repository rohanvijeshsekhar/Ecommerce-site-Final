'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, LayoutGrid, Compass, User, ShoppingBag, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/contexts/StoreContext';
import dynamic from 'next/dynamic';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';
const LoginModal = dynamic(() => import('@/components/store/LoginModal'), { ssr: false });
import { SvgGradients } from '@/components/store/DentalIcons';

interface StoreShellProps {
  children: React.ReactNode;
}

export default function StoreShell({ children }: StoreShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, setPendingAction } = useAuth();
  const store = useStore();

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const hasWarning = user?.role === 'dealer' && user?.can_purchase === false;

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync state view mappings to real Next.js URLs
  const handleViewChange = (view: string) => {
    if (view === 'home') router.push('/');
    else if (view === 'portfolio') router.push('/products');
    else if (view === 'cart') router.push('/cart');
    else if (view === 'wishlist') router.push('/wishlist');
    else if (view === 'checkout') router.push('/checkout');
    else if (view === 'order-success') router.push('/order-success');
    else if (view === 'my-orders') {
      store.setDashboardSection('orders');
      router.push('/profile');
    }
    else if (view === 'dealer-portal') router.push('/dealer');
    else if (view === 'combo-deals') router.push('/combo-deals');
    else if (view === 'brands') router.push('/brands');
  };

  const handleProductClick = (slug: string | null) => {
    if (slug) router.push(`/products/${slug}`);
  };

  const handleCategoryClick = (categoryName: string | null) => {
    if (categoryName) {
      const slug = categoryName.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
      router.push(`/products/category/${slug}`);
    }
  };

  const handleComboClick = (slug: string | null) => {
    if (slug) router.push(`/combo-deals/${slug}`);
  };

  return (
    <div className={`relative min-h-screen bg-slate-50 flex flex-col w-full pb-[56px] md:pb-0 ${hasWarning ? 'has-warning-banner' : ''}`}>
      <SvgGradients />

      <Navbar
        cartItems={store.cartItems}
        setCartItems={store.setCartItems}
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        setActiveProductId={handleProductClick}
        setCurrentView={handleViewChange}
        setSelectedCategory={handleCategoryClick}
        wishlistItems={store.wishlistItems}
        onOpenLoginModal={store.openLoginModal}
        setDashboardSection={store.setDashboardSection}
        setActiveComboId={handleComboClick}
      />

      {hasWarning && (
        <div className={`fixed left-0 right-0 z-40 bg-amber-50 border-b border-amber-100 px-4 py-2.5 text-center text-xs font-bold text-amber-800 flex items-center justify-center gap-2 select-none shadow-xs transition-all duration-300 ${
          scrolled 
            ? 'top-[-100px] opacity-0 pointer-events-none' 
            : 'top-[60px] lg:top-[160px] opacity-100'
        }`}>
          <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
          <span>
            {user.dealer_status === 'rejected'
              ? 'Your B2B dealer application was rejected. Please contact support or re-submit documents.'
              : 'Your B2B dealer registration is currently under review. You can browse products, but ordering is disabled until admin approval.'}
          </span>
        </div>
      )}

      <main className="flex-grow flex flex-col">
        {children}
      </main>

      <Footer onLogoClick={() => router.push('/')} />

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/90 pb-safe md:hidden select-none">
        <div className="flex items-center justify-around h-[52px] px-1">
          {/* HOME */}
          <button
            onClick={() => { router.push('/'); window.scrollTo(0, 0); }}
            className={`flex flex-col items-center justify-center flex-grow py-1 cursor-pointer transition-colors duration-150 ${pathname === '/' ? 'text-[#006670]' : 'text-slate-400 hover:text-[#006670]'}`}
          >
            <Home className={`w-[20px] h-[20px] transition-all duration-150 ${pathname === '/' ? 'text-[#1B365D] stroke-[2.2]' : 'text-slate-400 stroke-[1.6]'}`} />
            <span className="text-[9px] font-bold tracking-wider mt-1 select-none">HOME</span>
          </button>

          {/* CATEGORIES */}
          <button
            onClick={() => { router.push('/products'); window.scrollTo(0, 0); }}
            className={`flex flex-col items-center justify-center flex-grow py-1 cursor-pointer transition-colors duration-150 ${pathname.startsWith('/categories') ? 'text-[#006670]' : 'text-slate-400 hover:text-[#006670]'}`}
          >
            <LayoutGrid className={`w-[20px] h-[20px] transition-all duration-150 ${pathname.startsWith('/categories') ? 'text-[#1B365D] stroke-[2.2]' : 'text-slate-400 stroke-[1.6]'}`} />
            <span className="text-[9px] font-bold tracking-wider mt-1 select-none">CATEGORIES</span>
          </button>

          {/* EXPLORE */}
          <button
            onClick={() => { router.push('/products/category/advanced-dental-equipment-accessories'); window.scrollTo(0, 0); }}
            className={`flex flex-col items-center justify-center flex-grow py-1 cursor-pointer transition-colors duration-150 ${pathname.includes('/category/') ? 'text-[#006670]' : 'text-slate-400 hover:text-[#006670]'}`}
          >
            <Compass className={`w-[20px] h-[20px] transition-all duration-150 ${pathname.includes('/category/') ? 'text-[#1B365D] stroke-[2.2]' : 'text-slate-400 stroke-[1.6]'}`} />
            <span className="text-[9px] font-bold tracking-wider mt-1 select-none">EXPLORE</span>
          </button>

          {/* ACCOUNT */}
          <button
            onClick={() => {
              if (isAuthenticated) {
                store.setDashboardSection('dashboard');
                router.push('/profile');
              } else {
                setPendingAction({ type: 'open-account' });
                store.openLoginModal();
              }
            }}
            className={`flex flex-col items-center justify-center flex-grow py-1 cursor-pointer transition-colors duration-150 ${pathname === '/profile' ? 'text-[#006670]' : 'text-slate-400 hover:text-[#006670]'}`}
          >
            <User className={`w-[20px] h-[20px] transition-all duration-150 ${pathname === '/profile' ? 'text-[#1B365D] stroke-[2.2]' : 'text-slate-400 stroke-[1.6]'}`} />
            <span className="text-[9px] font-bold tracking-wider mt-1 select-none">ACCOUNT</span>
          </button>

          {/* BAG */}
          <button
            onClick={() => {
              if (isAuthenticated) {
                router.push('/cart');
              } else {
                setPendingAction({ type: 'open-cart' });
                store.openLoginModal();
              }
            }}
            className={`flex flex-col items-center justify-center flex-grow py-1 cursor-pointer transition-colors duration-150 relative ${pathname === '/cart' || pathname === '/checkout' || pathname === '/order-success' ? 'text-[#006670]' : 'text-slate-400 hover:text-[#006670]'}`}
          >
            <div className="relative">
              <ShoppingBag className={`w-[20px] h-[20px] transition-all duration-150 ${pathname === '/cart' || pathname === '/checkout' || pathname === '/order-success' ? 'text-[#1B365D] stroke-[2.2]' : 'text-slate-400 stroke-[1.6]'}`} />
              {store.cartItems.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[8px] font-black rounded-full w-[14px] h-[14px] flex items-center justify-center border border-white">
                  {store.cartItems.length}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold tracking-wider mt-1 select-none">BAG</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {store.toastMessage && (
        <div className={`fixed bottom-20 left-1/2 z-[999] text-white text-xs font-semibold uppercase tracking-wider px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-toast-in border ${
          store.toastMessage.toLowerCase().includes('disabled') || 
          store.toastMessage.toLowerCase().includes('pending') || 
          store.toastMessage.toLowerCase().includes('rejected')
            ? 'bg-amber-950 border-amber-500/30' 
            : 'bg-[#004e56] border-[#006670]/30'
        }`}>
          {store.toastMessage.toLowerCase().includes('disabled') || 
          store.toastMessage.toLowerCase().includes('pending') || 
          store.toastMessage.toLowerCase().includes('rejected') ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 stroke-[2] shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400 stroke-[3] shrink-0" />
          )}
          <span>{store.toastMessage}</span>
        </div>
      )}

      {/* Login / Register Modal */}
      <LoginModal
        isOpen={store.isLoginModalOpen}
        onClose={() => {
          store.setIsLoginModalOpen(false);
        }}
      />
    </div>
  );
}
