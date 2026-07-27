import { api } from '@/lib/api';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface SupportMessage {
  id: string;
  ticket: string;
  sender: string;
  sender_name: string;
  sender_role: string;
  message: string;
  attachment: string | null;
  attachment_url: string | null;
  created_at: string;
}

export interface TicketTimeline {
  id: string;
  ticket: string;
  action: string;
  performed_by: string | null;
  performed_by_name: string;
  performed_by_role: string;
  notes: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user: string;
  customer_detail: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  assigned_admin: string | null;
  assigned_admin_detail: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  } | null;
  related_order: string | null;
  order_detail: {
    id: string;
    order_number: string;
    created_at: string;
  } | null;
  related_product: string | null;
  product_detail: {
    id: string;
    name: string;
    sku: string;
    slug: string;
  } | null;
  messages: SupportMessage[];
  timeline: TicketTimeline[];
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const supportService = {
  async getTickets(params?: any): Promise<ApiResponse<SupportTicket[]>> {
    const response = await api.get('support/tickets/', { params });
    return response.data;
  },

  async getTicket(id: string): Promise<ApiResponse<SupportTicket>> {
    const response = await api.get(`support/tickets/${id}/`);
    return response.data;
  },

  async createTicket(formData: FormData): Promise<ApiResponse<SupportTicket>> {
    const response = await api.post('support/tickets/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async replyTicket(id: string, formData: FormData): Promise<ApiResponse<SupportMessage>> {
    const response = await api.post(`support/tickets/${id}/reply/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async adminAction(id: string, payload: { action: string; notes?: string; assigned_admin?: string; priority?: string; status?: string }): Promise<ApiResponse<SupportTicket>> {
    const response = await api.post(`support/admin/tickets/${id}/action/`, payload);
    return response.data;
  },

  async getAdmins(): Promise<ApiResponse<any[]>> {
    const response = await api.get('support/admin/users/');
    return response.data;
  },
};

export const notificationService = {
  async getNotifications(): Promise<ApiResponse<NotificationItem[]>> {
    const response = await api.get('notifications/');
    return response.data;
  },

  async markRead(id: string): Promise<ApiResponse<NotificationItem>> {
    const response = await api.post(`notifications/${id}/read/`);
    return response.data;
  },

  async markAllRead(): Promise<ApiResponse<any>> {
    const response = await api.post('notifications/mark-all-read/');
    return response.data;
  },
};
