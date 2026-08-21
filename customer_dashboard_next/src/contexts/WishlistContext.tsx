'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { wishlistService, WishlistItemData } from '@/lib/services/wishlistService';
import { useStore } from '@/contexts/StoreContext';
import { showToast } from '@/components/store/Toast';

const GUEST_WISHLIST_KEY = 'faazo_guest_wishlist';

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
  const { user, isAuthenticated } = useAuth();
  const { addItemToCart } = useStore();

  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Helper to extract product ID
  const getProdId = (p: any): string => {
    if (!p) return '';
    return typeof p === 'string' ? p : p.id || p.product_id || p.product?.id || '';
  };

  // Set of product IDs for fast O(1) checks
  const wishlistProductIds = useMemo(() => {
    const set = new Set<string>();
    wishlistItems.forEach((item) => {
      const pId = getProdId(item.product || item);
      if (pId) set.add(pId);
    });
    return set;
  }, [wishlistItems]);

  const isInWishlist = (productId: string): boolean => {
    if (!productId) return false;
    return wishlistProductIds.has(productId);
  };

  // Fetch Wishlist from API (for logged-in user) or localStorage (for guest)
  const fetchWishlist = async () => {
    if (isAuthenticated) {
      setLoading(true);
      try {
        const data = await wishlistService.getWishlist();
        setWishlistItems(data.items || []);
      } catch (err: any) {
        if (err?.response?.status !== 401 && err?.response?.status !== 403) {
          console.error('Error fetching wishlist:', err);
        }
      } finally {
        setLoading(false);
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
      }
    }
  };

  // On auth state change, fetch or sync
  useEffect(() => {
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
      fetchWishlist();
    }
  }, [isAuthenticated, user?.id]);

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
      showToast('Removed from Wishlist');

      if (isAuthenticated) {
        try {
          await wishlistService.removeFromWishlist(prodId);
        } catch (err) {
          // Rollback on failure
          setWishlistItems(prevItems);
          updateGuestStorage(prevItems);
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
      showToast('Added to Wishlist');

      if (isAuthenticated) {
        try {
          const res = await wishlistService.toggleWishlist(prodId);
          setWishlistItems(res.wishlist?.items || newItems);
        } catch (err) {
          // Rollback on failure
          setWishlistItems(prevItems);
          updateGuestStorage(prevItems);
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
    showToast('Removed from Wishlist');

    if (isAuthenticated) {
      try {
        await wishlistService.removeFromWishlist(productId);
      } catch (err) {
        setWishlistItems(prevItems);
        updateGuestStorage(prevItems);
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
