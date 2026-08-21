import { api } from '../api';
import type { ApiResponse } from './auth';

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

  async getShipmentTracking(orderId: string): Promise<ApiResponse<any>> {
    const response = await api.get(`orders/${orderId}/shipment/`);
    return response.data;
  },

  async checkPincode(pincode: string, weight = 1.0, cod = false): Promise<ApiResponse<any>> {
    const response = await api.post('shipping/pincode-check/', { pincode, weight, cod });
    return response.data;
  },

  async calculateShippingCost(data: {
    subtotal: number;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    destination_pincode: string;
    is_cod?: boolean;
  }): Promise<ApiResponse<any>> {
    const response = await api.post('shipping/calculate-cost/', data);
    return response.data;
  },

  async downloadInvoice(orderId: string, invoiceNumber?: string, showToast?: (msg: string) => void): Promise<void> {
    if (!orderId) return;
    try {
      showToast?.('Downloading GST Tax Invoice PDF...');
      const response = await api.get(`orders/${orderId}/invoice/`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = invoiceNumber
        ? `FAAZO-Invoice-${invoiceNumber}.pdf`
        : `FAAZO-Invoice-${orderId}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast?.('Downloaded GST Tax Invoice PDF.');
    } catch (err: any) {
      console.error('Failed to download invoice PDF:', err);
      showToast?.('Failed to download invoice PDF. Please try again.');
    }
  },
};
