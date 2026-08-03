import { api } from '../api';

export interface ReviewMediaItem {
  id: string;
  media_type: 'image' | 'video';
  url: string;
  thumbnail_url?: string | null;
  display_order: number;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface ReviewItem {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  user_id: string;
  user_name: string;
  user_avatar?: string | null;
  order_id?: string | null;
  rating: number;
  title: string;
  comment: string;
  pros?: string;
  cons?: string;
  would_recommend: boolean;
  is_verified_purchase: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  rejection_reason?: string;
  helpful_count: number;
  unhelpful_count: number;
  media: ReviewMediaItem[];
  user_has_voted?: boolean;
  user_vote_type?: 'helpful' | 'unhelpful' | null;
  created_at: string;
  updated_at: string;
}

export interface RatingSummary {
  average_rating: number;
  total_reviews: number;
  rating_distribution: Record<string, number>;
}

export interface PublicReviewsResponse {
  summary: RatingSummary;
  reviews: ReviewItem[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

export interface ReviewEligibilityResponse {
  can_review: boolean;
  is_edit?: boolean;
  existing_review_id?: string | null;
  order_id?: string | null;
  reason: string;
}

export const reviewsService = {
  // Public product reviews
  async getPublicReviews(
    identifier: string,
    params?: {
      rating?: number;
      has_photos?: boolean;
      has_videos?: boolean;
      sort?: 'recent' | 'rating_high' | 'rating_low' | 'helpful';
      page?: number;
      page_size?: number;
    }
  ) {
    const res = await api.get(`products/${identifier}/reviews/`, { params });
    return res.data;
  },

  // Customer eligibility check
  async checkEligibility(productId: string): Promise<ReviewEligibilityResponse> {
    const res = await api.get('reviews/eligibility/', {
      params: { product_id: productId },
    });
    return res.data?.data || res.data;
  },

  // Create review (FormData with files)
  async createReview(formData: FormData) {
    const res = await api.post('reviews/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Update review (FormData)
  async updateReview(reviewId: string, formData: FormData) {
    const res = await api.put(`reviews/${reviewId}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Delete review
  async deleteReview(reviewId: string) {
    const res = await api.delete(`reviews/${reviewId}/`);
    return res.data;
  },

  // Vote helpful/unhelpful
  async voteHelpful(reviewId: string, isHelpful: boolean) {
    const res = await api.post(`reviews/${reviewId}/vote/`, { is_helpful: isHelpful });
    return res.data;
  },

  // Customer review history
  async getMyReviews() {
    const res = await api.get('reviews/me/');
    return res.data;
  },

  // Admin: Get all reviews
  async getAdminReviews(params?: {
    status?: string;
    rating?: number;
    search?: string;
    page?: number;
    page_size?: number;
  }) {
    const res = await api.get('admin/reviews/', { params });
    return res.data;
  },

  // Admin: Update status (Approve, Reject, Hide)
  async updateAdminStatus(reviewId: string, status: string, rejectionReason?: string) {
    const res = await api.patch(`admin/reviews/${reviewId}/status/`, {
      status,
      rejection_reason: rejectionReason || '',
    });
    return res.data;
  },
};
