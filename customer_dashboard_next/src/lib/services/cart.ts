import { api } from '../api';
import type { ApiResponse } from './auth';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartProduct {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  category_name: string;
  sku: string;
}

export interface CartItem {
  id: string;
  product: CartProduct;
  quantity: number;
  price: number;
  original_price: number;
  discount_percentage: number;
  total_price: number;
  stock_available: number;
}

export interface CartDetails {
  id: string;
  items: CartItem[];
  mrp_subtotal: number;
  selling_subtotal: number;
  savings: number;
  shipping: number;
  gst_amount: number;
  total_amount: number;
}

export interface CheckoutPreview {
  mrp_subtotal: number;
  selling_subtotal: number;
  gst_amount: number;
  shipping_fee: number;
  total_amount: number;
  savings: number;
}

export interface Address {
  id: string;
  type: string;
  dentist: string;
  clinic: string;
  street: string;
  city: string;
  pincode: string;
  phone: string;
}

export interface OrderSuccessData {
  id: string;
  items: Array<{
    id: string;
    name: string;
    category: string;
    price: number;
    qty: number;
    image: string;
  }>;
  address: Address;
  paymentMethod: string;
  pricing: {
    subtotal: number;
    shipping: number;
    gst: number;
    discount: number;
    total: number;
    savings: number;
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export const cartService = {
  /**
   * GET /api/v1/cart/
   * Returns current user's cart details.
   */
  async get(): Promise<ApiResponse<CartDetails>> {
    const res = await api.get('cart/');
    return res.data;
  },

  /**
   * POST /api/v1/cart/sync/
   * Sync guest items from LocalStorage with the database cart.
   */
  async sync(localItems: Array<{ product_id: string; quantity: number }>): Promise<ApiResponse<CartDetails>> {
    const res = await api.post('cart/', localItems);
    return res.data;
  },

  /**
   * POST /api/v1/cart/add/
   * Add a product or update its quantity in the cart.
   */
  async add(productId: string, quantity: number): Promise<ApiResponse<CartDetails>> {
    const res = await api.post('cart/add/', { product_id: productId, quantity });
    return res.data;
  },

  /**
   * PATCH /api/v1/cart/items/{id}/
   * Update quantity of a specific cart item.
   */
  async updateItem(itemId: string, quantity: number): Promise<ApiResponse<CartDetails>> {
    const res = await api.patch(`cart/items/${itemId}/`, { quantity });
    return res.data;
  },

  /**
   * DELETE /api/v1/cart/items/{id}/
   * Remove a specific cart item.
   */
  async removeItem(itemId: string): Promise<ApiResponse<CartDetails>> {
    const res = await api.delete(`cart/items/${itemId}/`);
    return res.data;
  },

  /**
   * POST /api/v1/cart/clear/
   * Remove all items in the cart.
   */
  async clear(): Promise<ApiResponse<CartDetails>> {
    const res = await api.post('cart/clear/');
    return res.data;
  },

  /**
   * POST /api/v1/cart/items/{id}/save-for-later/
   * Move item to Save for Later.
   */
  async saveForLater(itemId: string): Promise<ApiResponse<CartDetails>> {
    const res = await api.post(`cart/items/${itemId}/save-for-later/`);
    return res.data;
  },

  /**
   * POST /api/v1/cart/items/{id}/move-to-cart/
   * Move saved item back to active cart.
   */
  async moveToCartFromSaved(itemId: string): Promise<ApiResponse<CartDetails>> {
    const res = await api.post(`cart/items/${itemId}/move-to-cart/`);
    return res.data;
  },

  /**
   * POST /api/v1/checkout/preview/
   * Preview total calculations before placing order.
   */
  async checkoutPreview(
    addressId: string,
    deliveryMethod: string,
    items?: Array<{ product_id: string; quantity: number }>
  ): Promise<ApiResponse<CheckoutPreview>> {
    const res = await api.post('checkout/preview/', { address_id: addressId, delivery_method: deliveryMethod, items });
    return res.data;
  },

  /**
   * POST /api/v1/checkout/place/
   * Place the order and clear the cart.
   */
  async placeOrder(
    addressId: string,
    deliveryMethod: string,
    paymentMethod: string,
    gstNumber?: string,
    items?: Array<{ product_id: string; quantity: number }>
  ): Promise<ApiResponse<OrderSuccessData>> {
    const res = await api.post('checkout/place/', {
      address_id: addressId,
      delivery_method: deliveryMethod,
      payment_method: paymentMethod,
      gst_number: gstNumber,
      items
    });
    return res.data;
  },
};
