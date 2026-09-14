'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { wishlistService, WishlistItemData } from '@/lib/services/wishlistService';
import { useStore } from '@/contexts/StoreContext';
import { showToast } from '@/components/store/Toast';

const GUEST_WISHLIST_KEY = 'faazo_guest_wishlist';
const AUTH_WISHLIST_CACHE_KEY = 'faazo_auth_wishlist_cache';

// Synchronously restore last known wishlist from cache on initial mount
const getInitialWishlist = (): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    const cached = localStorage.getItem(AUTH_WISHLIST_CACHE_KEY) || localStorage.getItem(GUEST_WISHLIST_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    // ignore
  }
  return [];
};

interface WishlistContextType {
  wishlistItems: any[];
  wishlistProductIds: Set<string>;
  wishlistCount: number;
  loading: boolean;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: any) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<void>;
  moveToCart: (product: any) => Promise<void>;
  fetchWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { addItemToCart } = useStore();

  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  // Restore cached wishlist items after mounting on client to prevent SSR hydration mismatches
  useEffect(() => {
    try {
      const cached = localStorage.getItem(AUTH_WISHLIST_CACHE_KEY) || localStorage.getItem(GUEST_WISHLIST_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWishlistItems(parsed);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Helper to extract product ID
  const getProdId = (p: any): string => {
    if (!p) return '';
    return typeof p === 'string' ? p : p.id || p.product_id || p.product?.id || '';
  };

  // Set of product IDs (both UUID and slug) for fast O(1) checks
  const wishlistProductIds = useMemo(() => {
    const set = new Set<string>();
    wishlistItems.forEach((item) => {
      const prod = item.product || item;
      const pId = getProdId(prod);
      if (pId) set.add(pId);
      if (prod && typeof prod === 'object') {
        if (prod.id) set.add(String(prod.id));
        if (prod.slug) set.add(String(prod.slug));
        if (prod.product_id) set.add(String(prod.product_id));
      }
    });
    return set;
  }, [wishlistItems]);

  const isInWishlist = (productId: string): boolean => {
    if (!productId) return false;
    return wishlistProductIds.has(productId);
  };

  // Sync cache for authenticated user
  const updateAuthCache = (items: any[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(AUTH_WISHLIST_CACHE_KEY, JSON.stringify(items));
      } catch (e) {
        // ignore
      }
    }
  };

  // Fetch Wishlist from API (for logged-in user) or localStorage (for guest)
  const fetchWishlist = async () => {
    if (isAuthenticated) {
      setLoading(true);
      try {
        const data = await wishlistService.getWishlist();
        const items = data.items || [];
        setWishlistItems(items);
        updateAuthCache(items);
      } catch (err: any) {
        if (err?.response?.status !== 401 && err?.response?.status !== 403) {
          console.error('Error fetching wishlist:', err);
        }
      } finally {
        setLoading(false);
        setInitialFetchDone(true);
      }
    } else {
      // Guest user: read from localStorage
      try {
        const local = localStorage.getItem(GUEST_WISHLIST_KEY);
        if (local) {
          setWishlistItems(JSON.parse(local));
        } else {
          setWishlistItems([]);
        }
      } catch (err) {
        setWishlistItems([]);
      } finally {
        setLoading(false);
        setInitialFetchDone(true);
      }
    }
  };

  // On auth state change, fetch or sync
  useEffect(() => {
    if (authLoading) return; // Wait until initial authentication check completes

    if (isAuthenticated) {
      // Sync guest wishlist items to database upon login
      try {
        const local = localStorage.getItem(GUEST_WISHLIST_KEY);
        if (local) {
          const guestItems = JSON.parse(local);
          const guestIds = guestItems.map((i: any) => getProdId(i.product || i)).filter(Boolean);
          if (guestIds.length > 0) {
            wishlistService.syncGuestWishlist(guestIds).finally(() => {
              localStorage.removeItem(GUEST_WISHLIST_KEY);
              fetchWishlist();
            });
            return;
          }
        }
      } catch (e) {
        // ignore JSON parse error
      }
      fetchWishlist();
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_WISHLIST_CACHE_KEY);
      }
      fetchWishlist();
    }
  }, [isAuthenticated, authLoading, user?.id]);

  // Save guest wishlist to localStorage whenever it changes (if not authenticated)
  const updateGuestStorage = (items: any[]) => {
    if (!isAuthenticated) {
      try {
        localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(items));
      } catch (err) {
        console.error('Error saving guest wishlist:', err);
      }
    }
  };

  // Toggle Wishlist Optimistically
  const toggleWishlist = async (product: any): Promise<boolean> => {
    const prodId = getProdId(product);
    if (!prodId) return false;

    const currentlyInWishlist = isInWishlist(prodId);
    const prevItems = [...wishlistItems];

    if (currentlyInWishlist) {
      // Optimistically remove
      const newItems = prevItems.filter((i) => getProdId(i.product || i) !== prodId);
      setWishlistItems(newItems);
      updateGuestStorage(newItems);
      if (isAuthenticated) updateAuthCache(newItems);
      showToast('Removed from Wishlist');

      if (isAuthenticated) {
        try {
          await wishlistService.removeFromWishlist(prodId);
        } catch (err) {
          // Rollback on failure
          setWishlistItems(prevItems);
          updateGuestStorage(prevItems);
          if (isAuthenticated) updateAuthCache(prevItems);
          showToast('Failed to update Wishlist');
          return true;
        }
      }
      return false;
    } else {
      // Optimistically add
      const newItem = {
        id: `temp-${Date.now()}`,
        product: product,
        product_id: prodId,
        created_at: new Date().toISOString(),
      };
      const newItems = [newItem, ...prevItems];
      setWishlistItems(newItems);
      updateGuestStorage(newItems);
      if (isAuthenticated) updateAuthCache(newItems);
      showToast('Added to Wishlist');

      if (isAuthenticated) {
        try {
          const res = await wishlistService.toggleWishlist(prodId);
          const finalItems = res.wishlist?.items || newItems;
          setWishlistItems(finalItems);
          updateAuthCache(finalItems);
        } catch (err) {
          // Rollback on failure
          setWishlistItems(prevItems);
          updateGuestStorage(prevItems);
          if (isAuthenticated) updateAuthCache(prevItems);
          showToast('Failed to update Wishlist');
          return false;
        }
      }
      return true;
    }
  };

  // Remove from Wishlist Optimistically
  const removeFromWishlist = async (productId: string) => {
    const prevItems = [...wishlistItems];
    const newItems = prevItems.filter((i) => getProdId(i.product || i) !== productId);
    setWishlistItems(newItems);
    updateGuestStorage(newItems);
    if (isAuthenticated) updateAuthCache(newItems);
    showToast('Removed from Wishlist');

    if (isAuthenticated) {
      try {
        await wishlistService.removeFromWishlist(productId);
      } catch (err) {
        setWishlistItems(prevItems);
        updateGuestStorage(prevItems);
        if (isAuthenticated) updateAuthCache(prevItems);
        showToast('Failed to remove item');
      }
    }
  };

  // Move from Wishlist to Cart
  const moveToCart = async (product: any) => {
    const prodId = getProdId(product);
    if (!prodId) return;

    const cartItem = {
      id: product.slug || prodId,
      name: product.name || 'Clinical Product',
      category: product.category_name || product.category || '',
      price: product.pricing?.effective_price || product.price || 0,
      qty: 1,
      image: product.image_url || product.image || '',
    };
    addItemToCart(cartItem);
    await removeFromWishlist(prodId);

    if (isAuthenticated) {
      try {
        await wishlistService.moveToCart(prodId);
      } catch (err) {
        console.error('Error moving to cart:', err);
      }
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistProductIds,
        wishlistCount: wishlistItems.length,
        loading,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        moveToCart,
        fetchWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
