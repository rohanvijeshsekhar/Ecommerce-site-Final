import { api } from '@/lib/api';

export interface UserMinimal {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface OrderMinimal {
  id: string;
  order_number: string;
  invoice_number: string;
  status: string;
  created_at: string;
}

export interface WarrantyProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand_name: string;
  primary_image_url: string | null;
  warranty_months: number | null;
  warranty_months_effective: number;
  warranty_provider: string;
  warranty_terms: string;
  warranty_contact_details: string;
  serial_number_required: boolean;
  warranty_website_url: string;
}

export interface WarrantyRegistration {
  id: string;
  user: UserMinimal;
  order: OrderMinimal;
  order_item: string;
  product: WarrantyProduct;
  serial_number: string | null;
  purchase_date: string;
  warranty_start: string;
  warranty_end: string;
  warranty_provider: string;
  warranty_status: 'pending_registration' | 'pending_verification' | 'need_more_info' | 'active' | 'rejected' | 'expired';
  days_remaining: number;
  invoice: string | null;
  invoice_url: string | null;
  notes: string;
  admin_notes: string;
  created_at: string;
}

export interface ImportedProduct {
  id: string;
  order_number: string;
  invoice_number: string;
  purchase_date: string;
  product_name: string;
  brand_name: string;
  sku: string;
  warranty_months: number;
  warranty_provider: string;
  warranty_terms: string;
  warranty_contact_details: string;
  warranty_website_url: string;
  primary_image_url: string | null;
}

export interface WarrantyAttachment {
  id: string;
  file: string;
  attachment_type: 'invoice' | 'product_image' | 'video' | 'other';
  created_at: string;
}

export interface ClaimTimeline {
  id: string;
  action: string;
  performed_by: string | null;
  performed_by_name: string | null;
  performed_by_role: string | null;
  notes: string;
  created_at: string;
}

export interface WarrantyClaim {
  id: string;
  claim_number: string;
  registration: string;
  registration_detail: WarrantyRegistration | null;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'submitted' | 'under_review' | 'need_more_info' | 'approved' | 'assigned' | 'repair_in_progress' | 'completed' | 'closed' | 'rejected';
  assigned_provider: string;
  admin_notes: string;
  resolution: string;
  attachments: WarrantyAttachment[];
  timeline: ClaimTimeline[];
  created_at: string;
  updated_at: string;
}

export interface AdminWarrantyStats {
  total_registrations: number;
  active_warranties: number;
  regs_pending_verification: number;
  regs_approved: number;
  regs_rejected: number;
  claims_submitted: number;
  claims_under_review: number;
  claims_approved: number;
  claims_assigned: number;
  claims_repair_in_progress: number;
  claims_completed: number;
  claims_closed: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export const warrantyService = {
  getRegistrations: async (params?: any): Promise<ApiResponse<WarrantyRegistration[]>> => {
    const res = await api.get('warranty/registrations/', { params });
    return res.data;
  },

  getImportedProducts: async (): Promise<ApiResponse<ImportedProduct[]>> => {
    const res = await api.get('warranty/imported-products/');
    return res.data;
  },

  submitRegistration: async (id: string, formData: FormData): Promise<ApiResponse<WarrantyRegistration>> => {
    const res = await api.patch(`warranty/registrations/${id}/register/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getClaims: async (): Promise<ApiResponse<WarrantyClaim[]>> => {
    const res = await api.get('warranty/claims/');
    return res.data;
  },

  createClaim: async (formData: FormData): Promise<ApiResponse<WarrantyClaim>> => {
    const res = await api.post('warranty/claims/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getClaimDetail: async (id: string): Promise<ApiResponse<WarrantyClaim>> => {
    const res = await api.get(`warranty/claims/${id}/`);
    return res.data;
  },

  getAdminDashboard: async (): Promise<ApiResponse<AdminWarrantyStats>> => {
    const res = await api.get('warranty/admin/dashboard/');
    return res.data;
  },

  getAdminRegistrations: async (params?: any): Promise<ApiResponse<WarrantyRegistration[]>> => {
    const res = await api.get('warranty/admin/registrations/', { params });
    return res.data;
  },

  performRegistrationAction: async (
    id: string,
    action: 'approve' | 'reject' | 'request_info',
    notes?: string
  ): Promise<ApiResponse<WarrantyRegistration>> => {
    const res = await api.post(`warranty/admin/registrations/${id}/action/`, { action, notes });
    return res.data;
  },

  getAdminClaims: async (params?: any): Promise<ApiResponse<WarrantyClaim[]>> => {
    const res = await api.get('warranty/admin/claims/', { params });
    return res.data;
  },

  getAdminClaimDetail: async (id: string): Promise<ApiResponse<WarrantyClaim>> => {
    const res = await api.get(`warranty/admin/claims/${id}/`);
    return res.data;
  },

  performClaimAction: async (
    id: string,
    action: 'approve' | 'reject' | 'request_info' | 'assign' | 'update_status' | 'close',
    payload: {
      notes?: string;
      resolution?: string;
      provider?: string;
      status?: string;
    }
  ): Promise<ApiResponse<WarrantyClaim>> => {
    const res = await api.post(`warranty/admin/claims/${id}/action/`, {
      action,
      ...payload,
    });
    return res.data;
  },
};
