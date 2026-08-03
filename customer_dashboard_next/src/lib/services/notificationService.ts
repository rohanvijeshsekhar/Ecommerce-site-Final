import { api } from '../api';

export interface NotificationDelivery {
  id: string;
  channel: string;
  status: string;
  provider_response?: any;
  sent_at?: string;
  error_message?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  category: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  action_url?: string;
  metadata?: Record<string, any>;
  is_read: boolean;
  read_at?: string;
  expires_at?: string;
  is_expired?: boolean;
  deliveries?: NotificationDelivery[];
  created_at: string;
}

export interface PaginatedNotifications {
  count: number;
  next: string | null;
  previous: string | null;
  results: NotificationItem[];
}

export const notificationService = {
  async getNotifications(params?: {
    category?: string;
    is_read?: boolean;
    priority?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedNotifications> {
    const response = await api.get('notifications/', { params });
    return response.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get('notifications/unread-count/');
    return response.data.data.unread_count;
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    const response = await api.patch(`notifications/${id}/read/`);
    return response.data.data;
  },

  async markAllAsRead(): Promise<number> {
    const response = await api.patch('notifications/read-all/');
    return response.data.data.marked_count;
  },

  async deleteNotification(id: string): Promise<void> {
    await api.delete(`notifications/${id}/`);
  },

  async deleteAllNotifications(): Promise<number> {
    const response = await api.delete('notifications/clear-all/');
    return response.data.data.deleted_count;
  },
};
