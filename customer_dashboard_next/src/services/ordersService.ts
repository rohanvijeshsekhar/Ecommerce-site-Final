import { api } from '@/lib/api';

export interface AddressDetail {
  id: string;
  label: string;
  full_name: string;
  mobile: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderItemDetail {
  id: string;
  product_name: string;
  product_slug: string;
  image_url: string | null;
  quantity: number;
  price: number;
}

export interface OrderStatusHistoryDetail {
  id: string;
  status: string;
  changed_by_name: string;
  changed_by_email: string;
  notes: string;
  created_at: string;
}

export interface OrderDetail {
  id: string;
  order_number: string;
  invoice_number: string;
  shipping_address_label: string;
  shipping_address_detail: AddressDetail;
  status: 'pending_payment' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
  payment_method: string;
  mrp_subtotal: number;
  selling_subtotal: number;
  gst_amount: number;
  shipping_fee: number;
  total_amount: number;
  items: OrderItemDetail[];
  created_at: string;
  updated_at: string;
  status_history: OrderStatusHistoryDetail[];
  razorpay_payment_id: string;
  razorpay_order_id: string;
  payment_status: string;
  customer_email: string;
  customer_name: string;
  estimated_delivery_date: string | null;
  tracking_number: string | null;
  shipping_carrier: string | null;
  notes: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  packed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const ordersService = {
  async getOrders(params?: { status?: string; search?: string; page?: number }): Promise<ApiResponse<OrderDetail[]>> {
    const response = await api.get('orders/', { params });
    return response.data;
  },

  async getOrderDetail(id: string): Promise<ApiResponse<OrderDetail>> {
    const response = await api.get(`orders/${id}/`);
    return response.data;
  },

  async cancelOrder(id: string, reason: string): Promise<ApiResponse<OrderDetail>> {
    const response = await api.post(`orders/${id}/cancel/`, { reason });
    return response.data;
  },
};
