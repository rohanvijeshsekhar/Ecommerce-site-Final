import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminPortal from './admin/AdminPortal';
import { Home, LayoutGrid, Compass, User, ShoppingBag, Check, AlertTriangle } from 'lucide-react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import CategoryList from './components/CategoryList';
import BrandLogos from './components/BrandLogos';
import BestSellers from './components/BestSellers';
import WhyChooseBanner from './components/WhyChooseBanner';
import FeaturedCollection from './components/FeaturedCollection';
import SpecialPricing from './components/SpecialPricing';
import ExploreSolutions from './components/ExploreSolutions';
import WhyChoosePanel from './components/WhyChoosePanel';
import Testimonials from './components/Testimonials';
import Recommended from './components/Recommended';
import ProfessionalsChoice from './components/ProfessionalsChoice';
import Footer from './components/Footer';
import { SvgGradients } from './components/DentalIcons';
import ProductDetailPage from './components/ProductDetailPage';
import ProductsLandingPage from './components/ProductsLandingPage';
import ProductListingPage from './components/ProductListingPage';
import ComboListingPage from './components/ComboListingPage';
import ComboDetailPage from './components/ComboDetailPage';
import FeaturedCombos from './components/FeaturedCombos';
import FlipkartCart from './components/FlipkartCart';
import FlipkartWishlist from './components/FlipkartWishlist';
import CheckoutPage from './components/CheckoutPage';
import OrderSuccessPage from './components/OrderSuccessPage';
import ProfileDashboard from './components/ProfileDashboard';
import type { DashboardSection } from './components/ProfileDashboard';
import DealerPortalPage from './components/DealerPortalPage';
import { useAuth } from './hooks/useAuth';
import { useLocalStorage } from './hooks/useLocalStorage';
import LoginModal from './components/LoginModal';
import type { CartItem } from './types/pendingAction';
import { api } from './services/api';

import SolutionDetailPage from './components/SolutionDetailPage';
import ExploreSolutionsAdmin from './components/ExploreSolutionsAdmin';
import OffersPage from './components/OffersPage';

type AppView = 'home' | 'portfolio' | 'listing' | 'detail' | 'cart' | 'wishlist' | 'checkout' | 'order-success' | 'my-orders' | 'profile' | 'combo-deals' | 'combo-detail' | 'dealer-portal' | 'solution-detail' | 'special-offers';

interface Order {
  id: string;
  date: string;
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  items: CartItem[];
  paymentMethod: string;
  total: number;
}

function App() {
  const { isLoading: authLoading, isAuthenticated, user, pendingAction, setPendingAction } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [currentView, _setCurrentView] = useState<AppView>('home');
  const setCurrentView = (view: AppView) => {
    if (view === 'checkout' && user?.can_purchase === false) {
      showToast('Purchasing is disabled until your dealer application is approved.');
      return;
    }
    _setCurrentView(view);
  };

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [activeComboId, setActiveComboId] = useState<string | null>(null);
  const [selectedSolutionSlug, setSelectedSolutionSlug] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [dashboardSection, setDashboardSection] = useState<DashboardSection>('dashboard');

  // Purchase & toast states
  const [checkoutSource, setCheckoutSource] = useState<'cart' | 'buy-now'>('cart');
  const [buyNowItem, setBuyNowItem] = useState<CartItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);


  // Backend-authoritative: show warning when user is a dealer who cannot purchase
  const hasWarning = user?.role === 'dealer' && user?.can_purchase === false;

  // ── Database-backed cart with guest LocalStorage synchronization ──
  const [localCart, setLocalCart] = useLocalStorage<CartItem[]>('faazo_cart', []);
  const [cartItems, setCartItemsState] = useState<CartItem[]>([]);

  const mapBackendCartToFrontend = (backendCart: any): CartItem[] => {
    if (!backendCart || !backendCart.items) return [];
    return backendCart.items.map((item: any) => ({
      id: item.product.slug,
      name: item.product.name,
      category: item.product.category_name,
      price: item.price,
      qty: item.quantity,
      image: item.product.image_url || '',
      originalPrice: item.original_price,
      cartItemId: item.id
    }));
  };

  // Sync cart from backend or local storage
  useEffect(() => {
    if (isAuthenticated) {
      const loadCart = async () => {
        try {
          const { cartService } = await import('./services/cart');
          const res = await cartService.get();
          if (res.success && res.data) {
            setCartItemsState(mapBackendCartToFrontend(res.data));
          }
        } catch (e) {
          console.error(e);
        }
      };
      loadCart();
    } else {
      setCartItemsState(localCart);
    }
  }, [isAuthenticated, localCart]);

  // Login sync: guest cart to backend cart
  useEffect(() => {
    if (isAuthenticated && localCart.length > 0) {
      const syncCart = async () => {
        try {
          const { cartService } = await import('./services/cart');
          const syncItems = localCart.map(item => ({
            product_id: item.id,
            quantity: item.qty
          }));
          const res = await cartService.sync(syncItems);
          if (res.success && res.data) {
            setCartItemsState(mapBackendCartToFrontend(res.data));
            setLocalCart([]);
          }
        } catch (e) {
          console.error(e);
        }
      };
      syncCart();
    }
  }, [isAuthenticated]);

  const setCartItems = async (val: React.SetStateAction<CartItem[]>) => {
    if (user?.can_purchase === false) {
      const newCart = typeof val === 'function' ? (val as Function)(cartItems) : val;
      const oldQty = cartItems.reduce((acc, item) => acc + (item.qty || 1), 0);
      const newQty = newCart.reduce((acc: number, item: any) => acc + (item.qty || 1), 0);
      if (newQty > oldQty) {
        showToast('Purchasing is disabled until your dealer application is approved.');
        return;
      }
    }

    if (!isAuthenticated) {
      setLocalCart(val);
      return;
    }

    const newCart = typeof val === 'function' ? (val as Function)(cartItems) : val;
    
    if (newCart.length === 0) {
      try {
        const { cartService } = await import('./services/cart');
        const res = await cartService.clear();
        if (res.success && res.data) {
          setCartItemsState(mapBackendCartToFrontend(res.data));
        }
      } catch (e) {
        console.error(e);
      }
      return;
    }

    const { cartService } = await import('./services/cart');
    
    if (newCart.length < cartItems.length) {
      const removed = cartItems.filter(item => !newCart.some((n: any) => n.id === item.id));
      for (const item of removed) {
        const cartItemId = (item as any).cartItemId;
        if (cartItemId) {
          try {
            const res = await cartService.removeItem(cartItemId);
            if (res.success && res.data) {
              setCartItemsState(mapBackendCartToFrontend(res.data));
            }
          } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to remove item.');
          }
        }
      }
      return;
    }

    for (const newItem of newCart) {
      const oldItem = cartItems.find(item => item.id === newItem.id);
      if (!oldItem) {
        try {
          const res = await cartService.add(newItem.id, newItem.qty);
          if (res.success && res.data) {
            setCartItemsState(mapBackendCartToFrontend(res.data));
          }
        } catch (err: any) {
          showToast(err.response?.data?.message || 'Failed to add item.');
        }
      } else if (oldItem.qty !== newItem.qty) {
        const cartItemId = (oldItem as any).cartItemId;
        if (cartItemId) {
          try {
            const res = await cartService.updateItem(cartItemId, newItem.qty);
            if (res.success && res.data) {
              setCartItemsState(mapBackendCartToFrontend(res.data));
            }
          } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to update quantity.');
            const res = await cartService.get();
            if (res.success && res.data) {
              setCartItemsState(mapBackendCartToFrontend(res.data));
            }
          }
        }
      }
    }
  };
  const [savedForLaterItems, setSavedForLaterItems] = useLocalStorage<CartItem[]>('faazo_saved', []);
  const [wishlistItems, setWishlistItems] = useLocalStorage<CartItem[]>('faazo_wishlist', []);

  const [orders, setOrders] = useState<Order[]>([]);

  // Load order history from backend when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const loadOrders = async () => {
        try {
          const res = await api.get('orders/');
          if (res.data && res.data.success && Array.isArray(res.data.data)) {
            const mappedOrders: Order[] = res.data.data.map((order: any) => ({
              id: order.id,
              date: new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
              status: order.status,
              items: order.items.map((item: any) => ({
                id: item.product_slug,
                name: item.product_name,
                category: '',
                price: parseFloat(item.price),
                qty: item.quantity,
                image: item.image_url || ''
              })),
              paymentMethod: order.payment_method,
              total: parseFloat(order.total_amount)
            }));
            setOrders(mappedOrders);
          }
        } catch (e) {
          console.error('Failed to load user orders:', e);
        }
      };
      loadOrders();
    } else {
      setOrders([]);
    }
  }, [isAuthenticated]);

  // Use the full OrderSuccessData type (includes real order_number, invoice_number, etc.)
  const [completedOrderData, setCompletedOrderData] = useState<import('./services/cart').OrderSuccessData | null>(null);
  // Track the real backend order ID for post-success navigation
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  const [_activeTrackingOrderId, setActiveTrackingOrderId] = useState<string | null>(null);

  // ── Helper: open login modal ──
  const openLoginModal = () => setIsLoginModalOpen(true);

  // ── Toast helper ──
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(prev => prev === message ? null : prev);
    }, 3000);
  };

  // ── Cart helpers ──
  const addItemToCart = (item: CartItem) => {
    setCartItems(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + (item.qty || 1) } : c);
      }
      return [...prev, { ...item, qty: item.qty || 1 }];
    });
    showToast('Added to Cart');
  };

  const addItemToWishlist = (item: CartItem) => {
    setWishlistItems(prev => {
      if (prev.some(w => w.id === item.id)) return prev;
      return [...prev, { ...item, qty: 1 }];
    });
    showToast('Added to Wishlist');
  };

  // ── Buy Now ──
  const handleBuyNowDirect = (item: CartItem) => {
    if (user?.can_purchase === false) {
      showToast('Purchasing is disabled until your dealer application is approved.');
      return;
    }
    setCheckoutSource('buy-now');
    setBuyNowItem(item);
    setCurrentView('checkout');
    window.scrollTo(0, 0);
  };

  // ── Product navigation ──
  const handleProductClick = (id: string) => {
    setActiveProductId(id);
    setCurrentView('detail');
  };

  const handleBackToHome = () => {
    setActiveProductId(null);
    setSelectedCategory(null);
    setCurrentView('home');
  };

  useEffect(() => {
    if (currentView !== 'checkout') {
      setCheckoutSource('cart');
      setBuyNowItem(null);
    }
  }, [currentView]);

  // ── Pending action replay — fires when user logs in ──
  useEffect(() => {
    if (!isAuthenticated || !pendingAction) return;

    const action = pendingAction;
    setPendingAction(null); // clear before executing

    switch (action.type) {
      case 'add-to-cart':
        if (action.payload?.item) {
          addItemToCart(action.payload.item);
        }
        break;

      case 'buy-now':
        if (action.payload?.item) {
          handleBuyNowDirect(action.payload.item);
        }
        break;

      case 'wishlist-toggle':
        if (action.payload?.item) {
          addItemToWishlist(action.payload.item);
        }
        break;

      case 'open-cart':
        setCurrentView('cart');
        window.scrollTo(0, 0);
        break;

      case 'open-wishlist':
        setCurrentView('wishlist');
        window.scrollTo(0, 0);
        break;

      case 'open-orders':
        setDashboardSection('orders');
        setCurrentView('my-orders');
        window.scrollTo(0, 0);
        break;

      case 'open-account':
        setDashboardSection('dashboard');
        setCurrentView('my-orders');
        window.scrollTo(0, 0);
        break;

      case 'open-checkout':
        setCurrentView('checkout');
        window.scrollTo(0, 0);
        break;
    }
  }, [isAuthenticated, pendingAction]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clear cart/wishlist on logout ──
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      // Don't clear — guests should still see pre-auth cart state
      // Cart/wishlist clear happens explicitly on logout action
    }
  }, [isAuthenticated, authLoading]);

  // ── Browser history sync ──
  useEffect(() => {
    const path = window.location.pathname;
    let initialView: AppView = 'home';
    let initialComboId: string | null = null;
    if (path === '/combo-deals') {
      initialView = 'combo-deals';
      setCurrentView('combo-deals');
    } else if (path.startsWith('/combo-deals/')) {
      const slug = path.split('/')[2];
      initialView = 'combo-detail';
      initialComboId = slug;
      setActiveComboId(slug);
      setCurrentView('combo-detail');
    }

    window.history.replaceState({ view: initialView, category: selectedCategory, productId: activeProductId, comboId: initialComboId }, '');
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        const { view, category, productId, comboId } = event.state;
        setCurrentView(view || 'home');
        setSelectedCategory(category || null);
        setActiveProductId(productId || null);
        setActiveComboId(comboId || null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const currentState = window.history.state;
    const isMatched = currentState &&
      currentState.view === currentView &&
      currentState.category === selectedCategory &&
      currentState.productId === activeProductId &&
      currentState.comboId === activeComboId;
    if (!isMatched) {
      let url = '/';
      if (currentView === 'combo-deals') {
        url = '/combo-deals';
      } else if (currentView === 'combo-detail' && activeComboId) {
        url = `/combo-deals/${activeComboId}`;
      }
      window.history.pushState({ view: currentView, category: selectedCategory, productId: activeProductId, comboId: activeComboId }, '', url);
    }
  }, [currentView, selectedCategory, activeProductId, activeComboId]);

  // ── Scroll Listener ──
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



  if (authLoading) {
    return (
      <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-white select-none">
        <div className="relative flex flex-col items-center justify-center p-8 animate-pulse-scale">
          <div className="w-[180px] h-[50px] md:w-[220px] md:h-[60px] flex items-center justify-center">
            <img src="/images/Artboard 1@4x (1).png" alt="FAAZO Logo" className="max-h-full max-w-full object-contain" />
          </div>
          <span className="text-[10px] md:text-[11px] font-black tracking-[0.25em] text-[#006670] uppercase mt-4 block">
            Engineering Clinical Excellence
          </span>
        </div>
        <div className="w-48 h-[2px] bg-slate-100 rounded-full mt-4 overflow-hidden relative">
          <div className="absolute top-0 bottom-0 left-0 bg-[#006670] rounded-full animate-progress-load" />
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* ── Admin Portal ── */}
      <Route path="/admin/*" element={<AdminPortal />} />

      {/* ── Customer Portal (SPA shell) ── */}
      <Route
        path="*"
        element={
          <div className={`relative min-h-screen bg-slate-50 flex flex-col w-full pb-[56px] md:pb-0 ${hasWarning ? 'has-warning-banner' : ''}`}>
      <SvgGradients />

      <Navbar
        cartItems={cartItems}
        setCartItems={setCartItems}
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        setActiveProductId={setActiveProductId}
        setCurrentView={setCurrentView}
        setSelectedCategory={setSelectedCategory}
        wishlistItems={wishlistItems}
        onOpenLoginModal={openLoginModal}
        setDashboardSection={setDashboardSection}
        setActiveComboId={setActiveComboId}
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
        {currentView === 'solution-detail' && selectedSolutionSlug ? (
          <SolutionDetailPage
            slug={selectedSolutionSlug}
            onBack={() => { setCurrentView('home'); window.scrollTo(0, 0); }}
            onAddToCart={addItemToCart}
          />
        ) : currentView === 'combo-deals' ? (
          <ComboListingPage
            setCurrentView={setCurrentView}
            setActiveComboId={setActiveComboId}
            setCartItems={setCartItems}
            wishlistItems={wishlistItems}
            setWishlistItems={setWishlistItems}
            showToast={showToast}
            onOpenLoginModal={openLoginModal}
          />
        ) : currentView === 'combo-detail' && activeComboId ? (
          <ComboDetailPage
            activeComboId={activeComboId}
            setCurrentView={setCurrentView}
            setActiveProductId={setActiveProductId}
            setCartItems={setCartItems}
            setIsCartOpen={setIsCartOpen}
            wishlistItems={wishlistItems}
            setWishlistItems={setWishlistItems}
            showToast={showToast}
            onOpenLoginModal={openLoginModal}
            onProductClick={handleProductClick}
            onBuyNowDirect={handleBuyNowDirect}
          />
        ) : currentView === 'detail' && activeProductId ? (
          <ProductDetailPage
            activeProductId={activeProductId}
            setCartItems={setCartItems}
            setIsCartOpen={setIsCartOpen}
            onBackToHome={handleBackToHome}
            onProductClick={handleProductClick}
            onBuyNowDirect={handleBuyNowDirect}
            showToast={showToast}
            wishlistItems={wishlistItems}
            setWishlistItems={setWishlistItems}
            onOpenLoginModal={openLoginModal}
          />
        ) : currentView === 'portfolio' ? (
          <ProductsLandingPage
            onCategoryClick={(cat) => {
              setSelectedCategory(cat);
              setCurrentView('listing');
              window.scrollTo(0, 0);
            }}
            onProductClick={handleProductClick}
            setCurrentView={setCurrentView}
          />
        ) : currentView === 'listing' && selectedCategory ? (
          <ProductListingPage
            category={selectedCategory}
            onBackToPortfolio={() => {
              setCurrentView('portfolio');
              setSelectedCategory(null);
              window.scrollTo(0, 0);
            }}
            onProductClick={handleProductClick}
            setCartItems={setCartItems}
            onBuyNowDirect={handleBuyNowDirect}
            showToast={showToast}
            onOpenLoginModal={openLoginModal}
          />
        ) : currentView === 'cart' ? (
          <FlipkartCart
            cartItems={cartItems}
            setCartItems={setCartItems}
            savedForLaterItems={savedForLaterItems}
            setSavedForLaterItems={setSavedForLaterItems}
            setCurrentView={setCurrentView}
            onProductClick={handleProductClick}
            showToast={showToast}
            onOpenLoginModal={openLoginModal}
          />
        ) : currentView === 'wishlist' ? (
          <FlipkartWishlist
            wishlistItems={wishlistItems}
            setWishlistItems={setWishlistItems}
            setCartItems={setCartItems}
            setCurrentView={setCurrentView}
            onProductClick={handleProductClick}
            showToast={showToast}
            onOpenLoginModal={openLoginModal}
          />
        ) : currentView === 'checkout' ? (
          <CheckoutPage
            cartItems={checkoutSource === 'buy-now' && buyNowItem ? [buyNowItem] : cartItems}
            setCurrentView={setCurrentView}
            checkoutSource={checkoutSource}
            onBackCheckout={() => {
              if (checkoutSource === 'buy-now') {
                setCurrentView('detail');
              } else {
                setCurrentView('cart');
              }
              window.scrollTo(0, 0);
            }}
            showToast={showToast}
            onPlaceOrderSuccess={(orderData) => {
              setCompletedOrderData(orderData);
              const newOrder: Order = {
                id: orderData.id,
                date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                status: 'processing',
                items: orderData.items,
                paymentMethod: orderData.paymentMethod,
                total: orderData.pricing.total
              };
              setOrders(prev => [newOrder, ...prev]);
              if (checkoutSource === 'cart') {
                setCartItems([]);
              }
              setCurrentView('order-success');
              window.scrollTo(0, 0);
            }}
          />
        ) : currentView === 'order-success' ? (
          <OrderSuccessPage
            orderData={completedOrderData}
            setCurrentView={setCurrentView}
            setActiveTrackingOrderId={setActiveTrackingOrderId}
            onViewOrder={(orderId) => {
              // Navigate to ProfileDashboard and open the specific order
              setDashboardSection('orders');
              setSuccessOrderId(orderId);
              setCurrentView('my-orders');
              window.scrollTo(0, 0);
            }}
            onContactSupport={(_orderId) => {
              setDashboardSection('support');
              setCurrentView('my-orders');
              window.scrollTo(0, 0);
            }}
          />
        ) : currentView === 'dealer-portal' ? (
          <DealerPortalPage
            setCurrentView={setCurrentView}
            setDashboardSection={setDashboardSection}
            showToast={showToast}
          />
        ) : currentView === 'special-offers' ? (
          <OffersPage
            setCurrentView={setCurrentView}
            setCartItems={setCartItems}
            showToast={showToast}
            onOpenLoginModal={openLoginModal}
            onSelectSolution={(slug) => {
              setSelectedSolutionSlug(slug);
              setCurrentView('solution-detail');
              window.scrollTo(0, 0);
            }}
          />
        ) : currentView === 'my-orders' ? (
          <ProfileDashboard
            activeSection={dashboardSection}
            setActiveSection={setDashboardSection}
            orders={orders}
            setCartItems={setCartItems}
            wishlistItems={wishlistItems}
            setWishlistItems={setWishlistItems}
            setCurrentView={setCurrentView}
            onProductClick={handleProductClick}
            showToast={showToast}
            initialOrderId={successOrderId}
          />
        ) : (
          <>
            <Hero />
            <CategoryList onCategoryClick={(cat) => {
              setSelectedCategory(cat);
              setCurrentView('listing');
            }} />
            <ExploreSolutions
              onSelectSolution={(slug) => {
                setSelectedSolutionSlug(slug);
                setCurrentView('solution-detail');
                window.scrollTo(0, 0);
              }}
              onViewAllSolutions={() => {
                setSelectedSolutionSlug('restorative-dentistry');
                setCurrentView('solution-detail');
                window.scrollTo(0, 0);
              }}
            />
            <BrandLogos />
            <BestSellers
              onProductClick={handleProductClick}
              onOpenLoginModal={openLoginModal}
              setCartItems={setCartItems}
              wishlistItems={wishlistItems}
              setWishlistItems={setWishlistItems}
              showToast={showToast}
            />
            <WhyChooseBanner />
            <FeaturedCollection />
            <FeaturedCombos
              onComboClick={(slug) => {
                setActiveComboId(slug);
                setCurrentView('combo-detail');
                window.scrollTo(0, 0);
              }}
              setCurrentView={setCurrentView}
              setCartItems={setCartItems}
              wishlistItems={wishlistItems}
              setWishlistItems={setWishlistItems}
              showToast={showToast}
              onOpenLoginModal={openLoginModal}
            />
            <SpecialPricing
              onProductClick={handleProductClick}
              onOpenLoginModal={openLoginModal}
              setCartItems={setCartItems}
              showToast={showToast}
            />
            <WhyChoosePanel />
            <Testimonials />
            <Recommended
              onProductClick={handleProductClick}
              onOpenLoginModal={openLoginModal}
              setCartItems={setCartItems}
              wishlistItems={wishlistItems}
              setWishlistItems={setWishlistItems}
              showToast={showToast}
            />
            <ProfessionalsChoice />
          </>
        )}
      </main>

      <Footer onLogoClick={handleBackToHome} />

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/90 pb-safe md:hidden select-none">
        <div className="flex items-center justify-around h-[52px] px-1">
          {/* HOME */}
          <button
            onClick={() => { setCurrentView('home'); window.scrollTo(0, 0); }}
            className={`flex flex-col items-center justify-center flex-grow py-1 cursor-pointer transition-colors duration-150 ${currentView === 'home' ? 'text-[#006670]' : 'text-slate-400 hover:text-[#006670]'}`}
          >
            <Home className={`w-[20px] h-[20px] transition-all duration-150 ${currentView === 'home' ? 'text-[#1B365D] stroke-[2.2]' : 'text-slate-400 stroke-[1.6]'}`} />
            <span className="text-[9px] font-bold tracking-wider mt-1 select-none">HOME</span>
          </button>

          {/* CATEGORIES */}
          <button
            onClick={() => { setCurrentView('portfolio'); window.scrollTo(0, 0); }}
            className={`flex flex-col items-center justify-center flex-grow py-1 cursor-pointer transition-colors duration-150 ${currentView === 'portfolio' ? 'text-[#006670]' : 'text-slate-400 hover:text-[#006670]'}`}
          >
            <LayoutGrid className={`w-[20px] h-[20px] transition-all duration-150 ${currentView === 'portfolio' ? 'text-[#1B365D] stroke-[2.2]' : 'text-slate-400 stroke-[1.6]'}`} />
            <span className="text-[9px] font-bold tracking-wider mt-1 select-none">CATEGORIES</span>
          </button>

          {/* EXPLORE */}
          <button
            onClick={() => { setSelectedCategory('Advanced Dental Equipment & Accessories'); setCurrentView('listing'); window.scrollTo(0, 0); }}
            className={`flex flex-col items-center justify-center flex-grow py-1 cursor-pointer transition-colors duration-150 ${currentView === 'listing' ? 'text-[#006670]' : 'text-slate-400 hover:text-[#006670]'}`}
          >
            <Compass className={`w-[20px] h-[20px] transition-all duration-150 ${currentView === 'listing' ? 'text-[#1B365D] stroke-[2.2]' : 'text-slate-400 stroke-[1.6]'}`} />
            <span className="text-[9px] font-bold tracking-wider mt-1 select-none">EXPLORE</span>
          </button>

          {/* ACCOUNT — guest: opens login modal; auth: goes to profile dashboard */}
          <button
            onClick={() => {
              if (isAuthenticated) {
                setDashboardSection('dashboard');
                setCurrentView('my-orders');
                window.scrollTo(0, 0);
              } else {
                setPendingAction({ type: 'open-account' });
                openLoginModal();
              }
            }}
            className={`flex flex-col items-center justify-center flex-grow py-1 cursor-pointer transition-colors duration-150 ${currentView === 'my-orders' ? 'text-[#006670]' : 'text-slate-400 hover:text-[#006670]'}`}
          >
            <User className={`w-[20px] h-[20px] transition-all duration-150 ${currentView === 'my-orders' ? 'text-[#1B365D] stroke-[2.2]' : 'text-slate-400 stroke-[1.6]'}`} />
            <span className="text-[9px] font-bold tracking-wider mt-1 select-none">ACCOUNT</span>
          </button>

          {/* BAG */}
          <button
            onClick={() => {
              if (isAuthenticated) {
                setCurrentView('cart');
                window.scrollTo(0, 0);
              } else {
                setPendingAction({ type: 'open-cart' });
                openLoginModal();
              }
            }}
            className={`flex flex-col items-center justify-center flex-grow py-1 cursor-pointer transition-colors duration-150 relative ${currentView === 'cart' || currentView === 'checkout' || currentView === 'order-success' ? 'text-[#006670]' : 'text-slate-400 hover:text-[#006670]'}`}
          >
            <div className="relative">
              <ShoppingBag className={`w-[20px] h-[20px] transition-all duration-150 ${currentView === 'cart' || currentView === 'checkout' || currentView === 'order-success' ? 'text-[#1B365D] stroke-[2.2]' : 'text-slate-400 stroke-[1.6]'}`} />
              {cartItems.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[8px] font-black rounded-full w-[14px] h-[14px] flex items-center justify-center border border-white">
                  {cartItems.length}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold tracking-wider mt-1 select-none">BAG</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-20 left-1/2 z-[999] text-white text-xs font-semibold uppercase tracking-wider px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-toast-in border ${
          toastMessage.toLowerCase().includes('disabled') || 
          toastMessage.toLowerCase().includes('pending') || 
          toastMessage.toLowerCase().includes('rejected')
            ? 'bg-amber-950 border-amber-500/30' 
            : 'bg-[#004e56] border-[#006670]/30'
        }`}>
          {toastMessage.toLowerCase().includes('disabled') || 
          toastMessage.toLowerCase().includes('pending') || 
          toastMessage.toLowerCase().includes('rejected') ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 stroke-[2] shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400 stroke-[3] shrink-0" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Login / Register Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
        }}
        />
    </div>
        }
      />
    </Routes>
  );
}

export default App;
