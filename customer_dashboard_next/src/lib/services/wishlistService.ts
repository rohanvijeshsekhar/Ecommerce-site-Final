import { api } from '../api';

export interface WishlistItemData {
  id: string;
  product: any;
  product_id: string;
  created_at: string;
}

export interface WishlistData {
  id: string;
  items: WishlistItemData[];
  item_count: number;
  updated_at: string;
}

export const wishlistService = {
  // Fetch user's wishlist
  async getWishlist(): Promise<WishlistData> {
    const res = await api.get('wishlist/');
    return res.data?.data || res.data;
  },

  // Toggle product in wishlist (idempotent)
  async toggleWishlist(productId: string): Promise<{ is_wishlisted: boolean; wishlist: WishlistData }> {
    const res = await api.post('wishlist/toggle/', { product_id: productId });
    return res.data?.data || res.data;
  },

  // Remove product from wishlist
  async removeFromWishlist(productId: string): Promise<WishlistData> {
    const res = await api.delete(`wishlist/items/${productId}/`);
    return res.data?.data || res.data;
  },

  // Atomically move product from wishlist to cart
  async moveToCart(productId: string): Promise<{ wishlist: WishlistData }> {
    const res = await api.post(`wishlist/items/${productId}/move-to-cart/`);
    return res.data?.data || res.data;
  },

  // Sync guest local storage wishlist product IDs to DB on login
  async syncGuestWishlist(productIds: string[]): Promise<WishlistData> {
    const res = await api.post('wishlist/sync/', { product_ids: productIds });
    return res.data?.data || res.data;
  },
};
