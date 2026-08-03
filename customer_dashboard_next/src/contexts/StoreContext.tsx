'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { CartItem } from '../types/pendingAction';
import { api } from '../lib/api';

export interface Order {
  id: string;
  date: string;
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  items: CartItem[];
  paymentMethod: string;
  total: number;
}

export type DashboardSection = 'dashboard' | 'profile' | 'clinic' | 'addresses' | 'orders' | 'wishlist' | 'warranty' | 'support' | 'security' | 'dealer-status';

export interface StoreContextType {
  cartItems: CartItem[];
  setCartItems: (val: React.SetStateAction<CartItem[]>) => Promise<void>;
  cartLoading: boolean;
  wishlistItems: CartItem[];
  setWishlistItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  savedForLaterItems: CartItem[];
  setSavedForLaterItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  toastMessage: string | null;
  showToast: (message: string) => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (isOpen: boolean) => void;
  openLoginModal: () => void;
  checkoutSource: 'cart' | 'buy-now';
  setCheckoutSource: (source: 'cart' | 'buy-now') => void;
  buyNowItem: CartItem | null;
  setBuyNowItem: (item: CartItem | null) => void;
  completedOrderData: any | null;
  setCompletedOrderData: (data: any) => void;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  addItemToCart: (item: CartItem) => void;
  addItemToWishlist: (item: CartItem) => void;
  handleBuyNowDirect: (item: CartItem) => void;
  dashboardSection: DashboardSection;
  setDashboardSection: (section: DashboardSection) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, pendingAction, setPendingAction } = useAuth();

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [dashboardSection, setDashboardSection] = useState<DashboardSection>('dashboard');

  const [checkoutSource, setCheckoutSource] = useState<'cart' | 'buy-now'>('cart');
  const [buyNowItem, setBuyNowItem] = useState<CartItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cart/wishlist sync hooks
  const [localCart, setLocalCart] = useLocalStorage<CartItem[]>('faazo_cart', []);
  const [cartItems, setCartItemsState] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(false);

  const [savedForLaterItems, setSavedForLaterItems] = useLocalStorage<CartItem[]>('faazo_saved', []);
  const [wishlistItems, setWishlistItems] = useLocalStorage<CartItem[]>('faazo_wishlist', []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [completedOrderData, setCompletedOrderData] = useState<any | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 3000);
  };

  const openLoginModal = () => setIsLoginModalOpen(true);

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
      cartItemId: item.id,
    }));
  };

  // Sync cart from backend or local storage
  useEffect(() => {
    if (isAuthenticated) {
      const loadCart = async () => {
        setCartLoading(true);
        try {
          const { cartService } = await import('../lib/services/cart');
          const res = await cartService.get();
          if (res.success && res.data) {
            setCartItemsState(mapBackendCartToFrontend(res.data));
          }
        } catch (e: any) {
          if (e?.response?.status !== 401) {
            console.error('Failed to load user cart:', e);
          }
        } finally {
          setCartLoading(false);
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
          const { cartService } = await import('../lib/services/cart');
          const syncItems = localCart.map((item) => ({
            product_id: item.id,
            quantity: item.qty,
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
  }, [isAuthenticated, localCart, setLocalCart]);

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
        const { cartService } = await import('../lib/services/cart');
        const res = await cartService.clear();
        if (res.success && res.data) {
          setCartItemsState(mapBackendCartToFrontend(res.data));
        }
      } catch (e) {
        console.error(e);
      }
      return;
    }

    const { cartService } = await import('../lib/services/cart');

    if (newCart.length < cartItems.length) {
      const removed = cartItems.filter((item) => !newCart.some((n: any) => n.id === item.id));
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
      const oldItem = cartItems.find((item) => item.id === newItem.id);
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

  // Load order history from backend when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const loadOrders = async () => {
        try {
          const res = await api.get('orders/');
          if (res.data && res.data.success && Array.isArray(res.data.data)) {
            const mappedOrders: Order[] = res.data.data.map((order: any) => ({
              id: order.id,
              date: new Date(order.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
              status: order.status,
              items: order.items.map((item: any) => ({
                id: item.product_slug,
                name: item.product_name,
                category: '',
                price: parseFloat(item.price),
                qty: item.quantity,
                image: item.image_url || '',
              })),
              paymentMethod: order.payment_method,
              total: parseFloat(order.total_amount),
            }));
            setOrders(mappedOrders);
          }
        } catch (e: any) {
          if (e?.response?.status !== 401) {
            console.error('Failed to load user orders:', e);
          }
        }
      };
      loadOrders();
    } else {
      setOrders([]);
    }
  }, [isAuthenticated]);

  const addItemToCart = (item: CartItem) => {
    setCartItems((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + (item.qty || 1) } : c));
      }
      return [...prev, { ...item, qty: item.qty || 1 }];
    });
    showToast('Added to Cart');
  };

  const addItemToWishlist = (item: CartItem) => {
    setWishlistItems((prev) => {
      if (prev.some((w) => w.id === item.id)) return prev;
      return [...prev, { ...item, qty: 1 }];
    });
    showToast('Added to Wishlist');
  };

  const handleBuyNowDirect = (item: CartItem) => {
    if (user?.can_purchase === false) {
      showToast('Purchasing is disabled until your dealer application is approved.');
      return;
    }
    setCheckoutSource('buy-now');
    setBuyNowItem(item);
    // Routing transitions should be handled by Router.push('/checkout') by the caller
  };

  return (
    <StoreContext.Provider
      value={{
        cartItems,
        setCartItems,
        cartLoading,
        wishlistItems,
        setWishlistItems,
        savedForLaterItems,
        setSavedForLaterItems,
        toastMessage,
        showToast,
        isLoginModalOpen,
        setIsLoginModalOpen,
        openLoginModal,
        checkoutSource,
        setCheckoutSource,
        buyNowItem,
        setBuyNowItem,
        completedOrderData,
        setCompletedOrderData,
        orders,
        setOrders,
        addItemToCart,
        addItemToWishlist,
        handleBuyNowDirect,
        dashboardSection,
        setDashboardSection,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

const defaultStoreContext: StoreContextType = {
  cartItems: [],
  setCartItems: async () => {},
  cartLoading: false,
  wishlistItems: [],
  setWishlistItems: () => {},
  savedForLaterItems: [],
  setSavedForLaterItems: () => {},
  toastMessage: null,
  showToast: () => {},
  isLoginModalOpen: false,
  setIsLoginModalOpen: () => {},
  openLoginModal: () => {},
  checkoutSource: 'cart',
  setCheckoutSource: () => {},
  buyNowItem: null,
  setBuyNowItem: () => {},
  completedOrderData: null,
  setCompletedOrderData: () => {},
  orders: [],
  setOrders: () => {},
  addItemToCart: () => {},
  addItemToWishlist: () => {},
  handleBuyNowDirect: () => {},
  dashboardSection: 'dashboard',
  setDashboardSection: () => {},
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    return defaultStoreContext;
  }
  return context;
};
