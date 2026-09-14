import { api } from '../api';
import type { ApiResponse } from './auth';
import type { OrderSuccessData } from './cart';

export interface CreatePaymentResponse {
  razorpay_order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  payment_id: string;
}

export interface CreatePaymentOrderPayload {
  address_id: string;
  delivery_method?: string;
  payment_method: string;
  gst_number?: string;
  items?: Array<{ product_id: string; quantity: number }>;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  payment_id: string;
}

export const paymentService = {
  /**
   * Load Razorpay Checkout SDK dynamically.
   */
  loadScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  },

  /**
   * POST /api/v1/payments/create-order/
   * Creates a Razorpay order from the backend.
   */
  async createPaymentOrder(payload: CreatePaymentOrderPayload): Promise<ApiResponse<CreatePaymentResponse>> {
    const res = await api.post('payments/create-order/', payload);
    return res.data;
  },

  /**
   * POST /api/v1/payments/verify/
   * Verifies payment and returns the placed order info.
   */
  async verifyPayment(payload: VerifyPaymentPayload): Promise<ApiResponse<OrderSuccessData>> {
    const res = await api.post('payments/verify/', payload);
    return res.data;
  },
};
