import { api } from '@/lib/api';
import { serverFetch } from '@/lib/server-api';

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  post_count?: number;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string | null;
  featured_image_url: string | null;
  featured_image_display: string;
  author_name: string;
  author_name_override?: string;
  category: BlogCategory | null;
  tags: BlogTag[];
  status: PostStatus;
  is_featured: boolean;
  published_at: string | null;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  canonical_url?: string;
  created_at: string;
  updated_at: string;
}

export interface BlogListMeta {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: string | null;
  previous: string | null;
}

export interface PublicBlogListResponse {
  success: boolean;
  data: BlogPost[];
  meta?: BlogListMeta;
}

export interface PublicBlogDetailResponse {
  success: boolean;
  data: BlogPost;
  related?: BlogPost[];
}

// ── Public API Helper Methods ─────────────────────────────────

export async function fetchPublicBlogPosts(params?: {
  page?: number;
  page_size?: number;
  category?: string;
  tag?: string;
  q?: string;
  is_featured?: boolean;
}): Promise<PublicBlogListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.page_size) query.set('page_size', String(params.page_size));
  if (params?.category) query.set('category', params.category);
  if (params?.tag) query.set('tag', params.tag);
  if (params?.q) query.set('q', params.q);
  if (params?.is_featured !== undefined) query.set('is_featured', String(params.is_featured));

  const path = `blog/?${query.toString()}`;

  try {
    const res = await serverFetch<PublicBlogListResponse>(path);
    if (res && res.data) {
      return res as any;
    }
    // Fallback to client axios if serverFetch failed or client-side context
    const clientRes = await api.get(`blog/?${query.toString()}`);
    return clientRes.data;
  } catch (err) {
    try {
      const clientRes = await api.get(`blog/?${query.toString()}`);
      return clientRes.data;
    } catch (e) {
      return { success: false, data: [] };
    }
  }
}

export async function fetchPublicBlogDetail(slug: string): Promise<PublicBlogDetailResponse | null> {
  try {
    const res = await serverFetch<PublicBlogDetailResponse>(`blog/${slug}/`);
    if (res && res.data) {
      return res as any;
    }
    const clientRes = await api.get(`blog/${slug}/`);
    return clientRes.data;
  } catch (err) {
    try {
      const clientRes = await api.get(`blog/${slug}/`);
      return clientRes.data;
    } catch (e) {
      return null;
    }
  }
}

export async function fetchPublicBlogCategories(): Promise<BlogCategory[]> {
  try {
    const res = await serverFetch<{ success: boolean; data: BlogCategory[] }>('blog/categories/');
    if (res && res.data && Array.isArray(res.data)) {
      return res.data;
    }
    const clientRes = await api.get('blog/categories/');
    return clientRes.data.data || [];
  } catch (e) {
    return [];
  }
}

// ── Admin API Service Methods ─────────────────────────────────

export const adminBlogService = {
  async list(params?: { page?: number; page_size?: number; status?: string; category?: string; q?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.page_size) query.set('page_size', String(params.page_size));
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    if (params?.q) query.set('q', params.q);

    const res = await api.get(`blog/admin/?${query.toString()}`);
    return res.data;
  },

  async create(data: Partial<BlogPost> & { category_id?: string; tag_names?: string[] }) {
    const res = await api.post('blog/admin/', data);
    return res.data;
  },

  async get(id: string) {
    const res = await api.get(`blog/admin/${id}/`);
    return res.data;
  },

  async update(id: string, data: Partial<BlogPost> & { category_id?: string; tag_names?: string[] }) {
    const res = await api.patch(`blog/admin/${id}/`, data);
    return res.data;
  },

  async delete(id: string) {
    const res = await api.delete(`blog/admin/${id}/`);
    return res.data;
  },

  async publish(id: string) {
    const res = await api.post(`blog/admin/${id}/publish/`);
    return res.data;
  },

  async draft(id: string) {
    const res = await api.post(`blog/admin/${id}/draft/`);
    return res.data;
  },

  async archive(id: string) {
    const res = await api.post(`blog/admin/${id}/archive/`);
    return res.data;
  },

  async getCategories() {
    const res = await api.get('blog/admin/categories/');
    return res.data;
  },
};
