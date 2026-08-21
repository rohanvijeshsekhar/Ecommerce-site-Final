import { api } from '@/lib/api';

export interface ReturnItemDetail {
  id: string;
  order_item: string;
  product_name?: string;
  product_sku?: string;
  requested_quantity: number;
  approved_quantity: number;
  unit_price: number;
  refund_amount: number;
}

export interface ReturnEvidenceDetail {
  id: string;
  file: string;
  file_type: string;
  evidence_type: string;
  created_at: string;
}

export interface ReturnEventDetail {
  id: string;
  from_status: string;
  to_status: string;
  actor_name?: string;
  notes: string;
  created_at: string;
}

export interface RefundDetail {
  id: string;
  payment: string;
  razorpay_refund_id: string | null;
  amount: number;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled' | 'unknown_reconciliation';
  failure_reason: string | null;
  created_at: string;
}

export interface ReturnShipmentDetail {
  id: string;
  courier_name: string;
  awb_number: string | null;
  pickup_status: string;
  pickup_scheduled_date: string | null;
  tracking_url: string | null;
}

export interface ReturnRequestDetail {
  id: string;
  customer: string;
  customer_name?: string;
  customer_email?: string;
  order: string;
  order_number?: string;
  request_type: 'return_refund' | 'return_replacement';
  status: string;
  status_display?: string;
  reason: string;
  reason_display?: string;
  customer_notes: string;
  admin_notes: string;
  rejection_reason: string;
  total_refund_amount: number;
  replacement_order: string | null;
  is_inventory_restored: boolean;
  items: ReturnItemDetail[];
  evidence: ReturnEvidenceDetail[];
  events?: ReturnEventDetail[];
  refund?: RefundDetail | null;
  shipment?: ReturnShipmentDetail | null;
  created_at: string;
  updated_at: string;
}

export interface ReturnEligibilityItem {
  order_item_id: string;
  product_name: string;
  product_sku: string;
  quantity_purchased: number;
  price: number;
  is_eligible: boolean;
  reason: string;
  max_returnable_qty: number;
}

export interface ReturnEligibilityResponse {
  order_id: string;
  is_order_eligible: boolean;
  items: ReturnEligibilityItem[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const returnsService = {
  // ── Customer Endpoints ────────────────────────────────────────────────────
  async checkEligibility(orderId: string): Promise<ApiResponse<ReturnEligibilityResponse>> {
    const response = await api.get('returns/eligibility/', { params: { order_id: orderId } });
    return response.data;
  },

  async getCustomerReturns(): Promise<ApiResponse<ReturnRequestDetail[]>> {
    const response = await api.get('returns/');
    return response.data;
  },

  async getCustomerReturnDetail(id: string): Promise<ApiResponse<ReturnRequestDetail>> {
    const response = await api.get(`returns/${id}/`);
    return response.data;
  },

  async createReturnRequest(payload: {
    order_id: string;
    request_type: 'return_refund' | 'return_replacement';
    reason: string;
    customer_notes?: string;
    items: { order_item_id: string; quantity: number }[];
  }): Promise<ApiResponse<ReturnRequestDetail>> {
    const response = await api.post('returns/', payload);
    return response.data;
  },

  async cancelReturnRequest(id: string): Promise<ApiResponse<ReturnRequestDetail>> {
    const response = await api.post(`returns/${id}/cancel/`);
    return response.data;
  },

  // ── Admin Endpoints ───────────────────────────────────────────────────────
  async getAdminReturns(params?: { status?: string; search?: string }): Promise<ApiResponse<ReturnRequestDetail[]>> {
    const response = await api.get('admin/returns/', { params });
    return response.data;
  },

  async getAdminReturnDetail(id: string): Promise<ApiResponse<ReturnRequestDetail>> {
    const response = await api.get(`admin/returns/${id}/`);
    return response.data;
  },

  async adminApprove(id: string, notes?: string): Promise<ApiResponse<ReturnRequestDetail>> {
    const response = await api.post(`admin/returns/${id}/approve/`, { notes });
    return response.data;
  },

  async adminReject(id: string, rejection_reason: string, notes?: string): Promise<ApiResponse<ReturnRequestDetail>> {
    const response = await api.post(`admin/returns/${id}/reject/`, { rejection_reason, notes });
    return response.data;
  },

  async adminSchedulePickup(id: string, payload?: { courier_name?: string; awb_number?: string }): Promise<ApiResponse<ReturnRequestDetail>> {
    const response = await api.post(`admin/returns/${id}/schedule-pickup/`, payload || {});
    return response.data;
  },

  async adminReceiveItem(id: string, notes?: string): Promise<ApiResponse<ReturnRequestDetail>> {
    const response = await api.post(`admin/returns/${id}/receive/`, { notes });
    return response.data;
  },

  async adminSubmitQC(id: string, payload: { qc_result: 'PASS' | 'FAIL'; is_restockable: boolean; notes?: string }): Promise<ApiResponse<ReturnRequestDetail>> {
    const response = await api.post(`admin/returns/${id}/qc/`, payload);
    return response.data;
  },

  async adminApproveRefund(id: string, notes?: string): Promise<ApiResponse<ReturnRequestDetail>> {
    const response = await api.post(`admin/returns/${id}/approve-refund/`, { notes });
    return response.data;
  },

  async adminApproveReplacement(id: string, notes?: string): Promise<ApiResponse<ReturnRequestDetail>> {
    const response = await api.post(`admin/returns/${id}/approve-replacement/`, { notes });
    return response.data;
  },

  async adminRetryRefund(refundId: string): Promise<ApiResponse<RefundDetail>> {
    const response = await api.post(`admin/refunds/${refundId}/retry/`);
    return response.data;
  },
};
