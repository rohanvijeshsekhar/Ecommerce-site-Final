import { api } from '../api';

export interface FAQItem {
  id: string;
  category: string;
  category_name: string;
  category_slug: string;
  question: string;
  slug: string;
  answer: string;
  action_button_label?: string;
  action_button_url?: string;
  action_button_type?: 'track_order' | 'view_orders' | 'retry_payment' | 'request_return' | 'custom_link';
  icon_name?: string;
  display_order: number;
  is_featured: boolean;
  helpful_count: number;
  unhelpful_count: number;
  created_at: string;
}

export interface FAQCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  display_order: number;
  items: FAQItem[];
}

export interface FAQListResponse {
  search_mode?: boolean;
  items?: FAQItem[];
  featured_faqs?: FAQItem[];
  categories?: FAQCategory[];
}

export const supportService = {
  // Fetch FAQs (list or search)
  async getFaqs(params?: { search?: string; category?: string; featured?: boolean }): Promise<FAQListResponse> {
    const res = await api.get('support/faqs/', { params });
    return res.data?.data || res.data;
  },

  // Submit feedback ("Did this answer your question?")
  async submitFeedback(faqId: string, isHelpful: boolean) {
    const res = await api.post(`support/faqs/${faqId}/feedback/`, { is_helpful: isHelpful });
    return res.data;
  },
};
