/**
 * Structured pending action stored when a guest attempts a protected action.
 * After login, App.tsx replays it automatically.
 */

export interface CartItem {
  id: string;
  name: string;
  category: string;
  price: number;
  qty: number;
  image: string;
  originalPrice?: number;
  rating?: number;
  average_rating?: string | number;
  total_reviews?: number;
  reviews?: number;
  isCombo?: boolean;
  slug?: string;
}

export type PendingActionType =
  | 'add-to-cart'
  | 'buy-now'
  | 'wishlist-toggle'
  | 'open-cart'
  | 'open-wishlist'
  | 'open-orders'
  | 'open-checkout'
  | 'open-account';

export interface PendingAction {
  type: PendingActionType;
  payload?: {
    item?: CartItem;
  };
}

/** Human-readable messaging shown in the LoginModal based on the pending action */
export const PENDING_ACTION_MESSAGES: Record<
  PendingActionType,
  { title: string; subtitle: string }
> = {
  'add-to-cart': {
    title: 'Sign in to add to cart',
    subtitle: 'Your item will be added to your cart automatically after signing in.',
  },
  'buy-now': {
    title: 'Sign in to purchase',
    subtitle: 'You\'ll be taken directly to checkout after signing in.',
  },
  'wishlist-toggle': {
    title: 'Sign in to save items',
    subtitle: 'Your wishlist syncs securely across all your devices.',
  },
  'open-cart': {
    title: 'Sign in to view your cart',
    subtitle: 'Access and manage your saved equipment procurement list.',
  },
  'open-wishlist': {
    title: 'Sign in to view wishlist',
    subtitle: 'Your saved products are waiting for you.',
  },
  'open-orders': {
    title: 'Sign in to view orders',
    subtitle: 'Track, manage, and reorder your equipment purchases.',
  },
  'open-checkout': {
    title: 'Sign in to checkout',
    subtitle: 'Complete your purchase securely after signing in.',
  },
  'open-account': {
    title: 'Sign in to your account',
    subtitle: 'Access your clinical profile, order tracking, and procurement settings.',
  },
};
