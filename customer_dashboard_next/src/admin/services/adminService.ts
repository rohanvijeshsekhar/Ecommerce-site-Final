// ─────────────────────────────────────────────────────────────────────────────
// FAAZO Admin Portal — Service Layer
// ─────────────────────────────────────────────────────────────────────────────

import { api } from '@/lib/api';
import type {
  DashboardStat,
  ActivityItem,
  QuickAction,
  AdminNotification,
  Brand,
  Category,
  Product,
  ProductPricing,
  ProductInventory,
  BrandDocument,
  ProductImage,
  ProductAttribute,
  ProductDocument,
  ComboDeal,
  ComboDealImage,
  Customer,
  DealerApplication,
  DealerStats,
} from '../types/admin';

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const dashboardService = {
  async getOverview(period = '7 Days'): Promise<ServiceResponse<any>> {
    try {
      const res = await api.get('admin/dashboard/overview/', { params: { period } });
      return res.data;
    } catch (err: any) {
      // Silently return failure — 401 is expected when the user is not yet authenticated
      return { success: false, message: err.response?.status === 401 ? 'Unauthenticated' : (err.message || 'Failed to fetch dashboard overview') };
    }
  },

  async getRevenue(): Promise<ServiceResponse<any>> {
    try {
      const res = await api.get('admin/dashboard/revenue/');
      return res.data;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  async getOrders(): Promise<ServiceResponse<any>> {
    try {
      const res = await api.get('admin/dashboard/orders/');
      return res.data;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  async getCustomersStats(): Promise<ServiceResponse<any>> {
    try {
      const res = await api.get('admin/dashboard/customers/');
      return res.data;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  async getProductsStats(): Promise<ServiceResponse<any>> {
    try {
      const res = await api.get('admin/dashboard/products/');
      return res.data;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  async getDealersStats(): Promise<ServiceResponse<any>> {
    try {
      const res = await api.get('admin/dashboard/dealers/');
      return res.data;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  async getInventoryStats(): Promise<ServiceResponse<any>> {
    try {
      const res = await api.get('admin/dashboard/inventory/');
      return res.data;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  async getPaymentsStats(): Promise<ServiceResponse<any>> {
    try {
      const res = await api.get('admin/dashboard/payments/');
      return res.data;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  async getStats(): Promise<ServiceResponse<DashboardStat[]>> {
    try {
      const res = await api.get('admin/dashboard/overview/');
      const payload = res.data?.data ?? res.data;
      if (!payload) {
        return { success: false, data: [] };
      }

      const kpis = payload.kpis || {};
      const invHealth = payload.inventory_health || {};
      const summary = payload.summary_counts || {};

      const stats: DashboardStat[] = [
        {
          id: 'revenue',
          label: "Revenue",
          value: kpis.revenue?.value ?? '₹0.00',
          subValue: kpis.revenue?.desc ?? 'All-time: ' + (kpis.revenue?.total_alltime ?? '₹0.00'),
          trend: parseFloat(kpis.revenue?.trend?.replace('%', '') || '0') || 0,
          trendLabel: kpis.revenue?.desc ?? 'vs previous period',
          variant: 'teal',
          icon: 'IndianRupee',
          actionLabel: 'View Orders',
          actionPath: '/admin/orders',
        },
        {
          id: 'orders',
          label: "Orders",
          value: kpis.orders?.value ?? 0,
          subValue: `${summary.pending_orders ?? 0} pending fulfillment`,
          trend: parseFloat(kpis.orders?.trend?.replace('%', '') || '0') || 0,
          trendLabel: kpis.orders?.desc ?? 'vs previous period',
          variant: 'blue',
          icon: 'ShoppingCart',
          actionLabel: 'Manage Orders',
          actionPath: '/admin/orders',
        },
        {
          id: 'pending_orders',
          label: 'Pending Orders',
          value: summary.pending_orders ?? 0,
          subValue: 'Action required',
          trend: 0,
          variant: 'orange',
          icon: 'Clock',
          actionLabel: 'Review Now',
          actionPath: '/admin/orders',
        },
        {
          id: 'low_inventory',
          label: 'Low Stock',
          value: summary.stock_alerts ?? invHealth.low_stock?.count ?? 0,
          subValue: `${invHealth.out_of_stock?.count ?? 0} out of stock`,
          trend: 0,
          variant: 'red',
          icon: 'AlertTriangle',
          actionLabel: 'View Inventory',
          actionPath: '/admin/inventory',
        },
        {
          id: 'dealer_approvals',
          label: 'Dealer Approvals',
          value: summary.pending_dealers ?? 0,
          subValue: `${summary.pending_dealers ?? 0} Applications pending`,
          trend: 0,
          variant: 'purple',
          icon: 'UserCheck',
          actionLabel: 'Review Dealers',
          actionPath: '/admin/dealers',
        },
        {
          id: 'support_tickets',
          label: 'Open Tickets',
          value: summary.open_tickets ?? 0,
          subValue: 'Customer inquiries',
          trend: 0,
          variant: 'green',
          icon: 'HeadphonesIcon',
          actionLabel: 'View Support',
          actionPath: '/admin/support',
        },
        {
          id: 'total_products',
          label: 'Total Products',
          value: kpis.products?.value ?? 0,
          subValue: `${kpis.products?.active ?? 0} active listings`,
          trend: 0,
          variant: 'teal',
          icon: 'Package',
          actionLabel: 'View Products',
          actionPath: '/admin/products',
        },
      ];

      return {
        success: true,
        data: stats,
      };
    } catch (err: any) {
      console.error('Failed to fetch dashboard stats:', err);
      return {
        success: false,
        message: err.message || 'Failed to fetch stats',
        data: [],
      };
    }
  },

  async search(query: string): Promise<ServiceResponse<any>> {
    try {
      const res = await api.get('admin/dashboard/search/', { params: { q: query } });
      return res.data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Search request failed' };
    }
  },

  async getQuickActions(): Promise<ServiceResponse<QuickAction[]>> {
    return {
      success: true,
      data: [
        {
          id: 'add-product',
          label: 'Add Product',
          description: 'List a new dental product',
          icon: 'PackagePlus',
          path: '/admin/products',
          color: 'teal',
        },
        {
          id: 'view-orders',
          label: 'View Orders',
          description: 'Manage customer orders',
          icon: 'ShoppingCart',
          path: '/admin/orders',
          color: 'blue',
        },
        {
          id: 'approve-dealer',
          label: 'Approve Dealer',
          description: 'Review dealer applications',
          icon: 'UserCheck',
          path: '/admin/dealers',
          color: 'purple',
        },
        {
          id: 'manage-customers',
          label: 'Manage Customers',
          description: 'View registered clinic accounts',
          icon: 'UserPlus',
          path: '/admin/customers',
          color: 'green',
        },
        {
          id: 'warranty',
          label: 'Warranty Queue',
          description: 'Process warranty claims',
          icon: 'Shield',
          path: '/admin/warranty',
          color: 'orange',
        },
        {
          id: 'reports',
          label: 'Sales Report',
          description: 'Business analytics & intelligence',
          icon: 'BarChart3',
          path: '/admin/reports',
          color: 'teal',
        },
      ],
    };
  },
};

export const notificationsService = {
  async getAll(params?: { is_read?: boolean; page?: number; page_size?: number }): Promise<ServiceResponse<AdminNotification[]>> {
    try {
      const res = await api.get('notifications/', { params });
      const rawData = res.data?.results ?? res.data?.data ?? res.data ?? [];
      const notifications: AdminNotification[] = Array.isArray(rawData) ? rawData.map((n: any) => ({
        id: String(n.id),
        title: n.title,
        message: n.message,
        type: (n.category || n.notification_type || 'system').toLowerCase() as any,
        isRead: Boolean(n.is_read),
        timestamp: n.created_at,
        actionPath: n.action_url,
        priority: (n.priority || 'medium').toLowerCase() as any,
      })) : [];
      return {
        success: true,
        data: notifications,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to fetch notifications',
        data: [],
      };
    }
  },

  async getUnreadCount(): Promise<number> {
    try {
      const res = await api.get('notifications/unread-count/');
      return res.data?.unread_count ?? res.data?.data?.unread_count ?? 0;
    } catch {
      return 0;
    }
  },

  async markAsRead(id: string): Promise<ServiceResponse<void>> {
    try {
      await api.post(`notifications/${id}/read/`);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  async markAllAsRead(): Promise<ServiceResponse<void>> {
    try {
      await api.post('notifications/read-all/');
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },
};

export const adminProductsService = {
  async getAll(params?: Record<string, unknown>): Promise<ServiceResponse<Product[]>> {
    const res = await api.get('products/', { params });
    return res.data;
  },
};

export const adminService = {
  // ── Brands CRUD ──
  async getBrands(params?: Record<string, unknown>): Promise<ServiceResponse<Brand[]>> {
    const res = await api.get('brands/', { params });
    return res.data;
  },
  async getBrand(slug: string): Promise<ServiceResponse<Brand>> {
    const res = await api.get(`brands/${slug}/`);
    return res.data;
  },
  async getBrandsDropdown(): Promise<ServiceResponse<{ id: string; name: string; slug: string }[]>> {
    const res = await api.get('brands/dropdown/');
    return res.data;
  },
  async createBrand(data: any): Promise<ServiceResponse<Brand>> {
    const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
    const res = await api.post('brands/', data, config);
    return res.data;
  },
  async updateBrand(slug: string, data: any): Promise<ServiceResponse<Brand>> {
    const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
    const res = await api.patch(`brands/${slug}/`, data, config);
    return res.data;
  },
  async deleteBrand(slug: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`brands/${slug}/`);
    return res.data;
  },
  async uploadBrandDocument(slug: string, data: FormData): Promise<ServiceResponse<BrandDocument>> {
    const res = await api.post(`brands/${slug}/documents/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  async deleteBrandDocument(slug: string, docId: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`brands/${slug}/documents/${docId}/`);
    return res.data;
  },

  // ── Categories CRUD ──
  async getCategories(params?: Record<string, unknown>): Promise<ServiceResponse<Category[]>> {
    const res = await api.get('categories/', { params });
    return res.data;
  },
  async getCategoriesTree(): Promise<ServiceResponse<Category[]>> {
    const res = await api.get('categories/tree/');
    return res.data;
  },
  async getCategoriesDropdown(): Promise<ServiceResponse<any[]>> {
    const res = await api.get('categories/dropdown/');
    return res.data;
  },
  async createCategory(data: any): Promise<ServiceResponse<Category>> {
    const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
    const res = await api.post('categories/', data, config);
    return res.data;
  },
  async updateCategory(slug: string, data: any): Promise<ServiceResponse<Category>> {
    const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
    const res = await api.patch(`categories/${slug}/`, data, config);
    return res.data;
  },
  async deleteCategory(slug: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`categories/${slug}/`);
    return res.data;
  },

  // ── Products CRUD ──
  async getProducts(params?: Record<string, unknown>): Promise<ServiceResponse<Product[]>> {
    const res = await api.get('products/', { params });
    return res.data;
  },
  async getProduct(slug: string): Promise<ServiceResponse<Product>> {
    const res = await api.get(`products/${slug}/`);
    return res.data;
  },
  async createProduct(data: any): Promise<ServiceResponse<Product>> {
    const res = await api.post('products/', data);
    return res.data;
  },
  async updateProduct(slug: string, data: any): Promise<ServiceResponse<Product>> {
    const res = await api.patch(`products/${slug}/`, data);
    return res.data;
  },
  async deleteProduct(slug: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`products/${slug}/`);
    return res.data;
  },
  async getProductStatusCounts(): Promise<ServiceResponse<any>> {
    const res = await api.get('products/status-counts/');
    return res.data;
  },

  // ── Product Images ──
  async uploadProductImage(slug: string, data: FormData): Promise<ServiceResponse<ProductImage>> {
    const res = await api.post(`products/${slug}/images/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  async updateProductImage(slug: string, imageId: string, data: any): Promise<ServiceResponse<ProductImage>> {
    const res = await api.patch(`products/${slug}/images/${imageId}/`, data);
    return res.data;
  },
  async deleteProductImage(slug: string, imageId: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`products/${slug}/images/${imageId}/`);
    return res.data;
  },
  async setPrimaryImage(slug: string, imageId: string): Promise<ServiceResponse<void>> {
    const res = await api.patch(`products/${slug}/images/${imageId}/primary/`);
    return res.data;
  },
  async reorderProductImages(slug: string, order: { id: string; sort_order: number }[]): Promise<ServiceResponse<void>> {
    const res = await api.patch(`products/${slug}/images-reorder/`, order);
    return res.data;
  },

  // ── Product Attributes ──
  async addProductAttribute(slug: string, data: any): Promise<ServiceResponse<ProductAttribute>> {
    const res = await api.post(`products/${slug}/attributes/`, data);
    return res.data;
  },
  async updateProductAttribute(slug: string, attrId: string, data: any): Promise<ServiceResponse<ProductAttribute>> {
    const res = await api.patch(`products/${slug}/attributes/${attrId}/`, data);
    return res.data;
  },
  async deleteProductAttribute(slug: string, attrId: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`products/${slug}/attributes/${attrId}/`);
    return res.data;
  },

  // ── Product Documents ──
  async uploadProductDocument(slug: string, data: FormData): Promise<ServiceResponse<ProductDocument>> {
    const res = await api.post(`products/${slug}/documents/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  async deleteProductDocument(slug: string, docId: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`products/${slug}/documents/${docId}/`);
    return res.data;
  },

  // ── Product Pricing ──
  async getProductPricing(slug: string): Promise<ServiceResponse<ProductPricing>> {
    const res = await api.get(`products/${slug}/pricing/`);
    return res.data;
  },
  async saveProductPricing(slug: string, data: Partial<ProductPricing>): Promise<ServiceResponse<ProductPricing>> {
    const res = await api.patch(`products/${slug}/pricing/`, data);
    return res.data;
  },

  // ── Product Inventory ──
  async getProductInventory(slug: string): Promise<ServiceResponse<ProductInventory>> {
    const res = await api.get(`products/${slug}/inventory/`);
    return res.data;
  },
  async saveProductInventory(slug: string, data: Partial<ProductInventory>): Promise<ServiceResponse<ProductInventory>> {
    const res = await api.patch(`products/${slug}/inventory/`, data);
    return res.data;
  },
  async getInventoryStats(): Promise<ServiceResponse<{ total_products: number; in_stock: number; low_stock: number; out_of_stock: number }>> {
    const res = await api.get('products/inventory-stats/');
    return res.data;
  },

  // ── Combo Deals CRUD ──
  async getComboDeals(params?: Record<string, unknown>): Promise<ServiceResponse<ComboDeal[]>> {
    const res = await api.get('combos/', { params });
    return res.data;
  },
  async getComboDeal(slug: string): Promise<ServiceResponse<ComboDeal>> {
    const res = await api.get(`combos/${slug}/`);
    return res.data;
  },
  async createComboDeal(data: any): Promise<ServiceResponse<ComboDeal>> {
    const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
    const res = await api.post('combos/', data, config);
    return res.data;
  },
  async updateComboDeal(slug: string, data: any): Promise<ServiceResponse<ComboDeal>> {
    const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
    const res = await api.patch(`combos/${slug}/`, data, config);
    return res.data;
  },
  async deleteComboDeal(slug: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`combos/${slug}/`);
    return res.data;
  },
  async duplicateComboDeal(slug: string): Promise<ServiceResponse<ComboDeal>> {
    const res = await api.post(`combos/${slug}/duplicate/`);
    return res.data;
  },
  async uploadComboImage(slug: string, data: FormData): Promise<ServiceResponse<ComboDealImage>> {
    const res = await api.post(`combos/${slug}/images/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  async deleteComboImage(slug: string, imageId: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`combos/${slug}/images/${imageId}/`);
    return res.data;
  },
  async getComboBannerSettings(): Promise<ServiceResponse<any>> {
    const res = await api.get('combos/banner/');
    return res.data;
  },
  async updateComboBannerSettings(data: any): Promise<ServiceResponse<any>> {
    const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
    const res = await api.patch('combos/banner/', data, config);
    return res.data;
  },
};

export const adminCustomersService = {
  async getAll(params?: Record<string, unknown>): Promise<ServiceResponse<Customer[]>> {
    const res = await api.get('users/admin/customers/', { params });
    return res.data;
  },
  async getOne(id: string): Promise<ServiceResponse<Customer>> {
    const res = await api.get(`users/admin/customers/${id}/`);
    return res.data;
  },
  async update(id: string, data: any): Promise<ServiceResponse<Customer>> {
    const res = await api.patch(`users/admin/customers/${id}/`, data);
    return res.data;
  },
  async delete(id: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`users/admin/customers/${id}/`);
    return res.data;
  },
  async block(id: string): Promise<ServiceResponse<Customer>> {
    const res = await api.post(`users/admin/customers/${id}/block/`);
    return res.data;
  },
  async unblock(id: string): Promise<ServiceResponse<Customer>> {
    const res = await api.post(`users/admin/customers/${id}/unblock/`);
    return res.data;
  },
  async deactivate(id: string): Promise<ServiceResponse<Customer>> {
    const res = await api.post(`users/admin/customers/${id}/deactivate/`);
    return res.data;
  },
  async activate(id: string): Promise<ServiceResponse<Customer>> {
    const res = await api.post(`users/admin/customers/${id}/activate/`);
    return res.data;
  },
  async getStats(): Promise<ServiceResponse<{
    total_customers: number;
    active_customers: number;
    blocked_customers: number;
    new_customers_this_month: number;
    total_revenue: number;
    repeat_customers: number;
  }>> {
    const res = await api.get('users/admin/customers/stats/');
    return res.data;
  }
};

export const adminDealersService = {
  async getAll(params?: Record<string, unknown>): Promise<ServiceResponse<DealerApplication[]>> {
    const res = await api.get('dealer/admin/applications/', { params });
    return res.data;
  },
  async getOne(id: string): Promise<ServiceResponse<DealerApplication>> {
    const res = await api.get(`dealer/admin/applications/${id}/`);
    return res.data;
  },
  async updateNotes(id: string, admin_notes: string): Promise<ServiceResponse<DealerApplication>> {
    const res = await api.patch(`dealer/admin/applications/${id}/`, { admin_notes });
    return res.data;
  },
  async approve(id: string): Promise<ServiceResponse<DealerApplication>> {
    const res = await api.post(`dealer/admin/applications/${id}/approve/`);
    return res.data;
  },
  async reject(id: string, rejection_reason: string): Promise<ServiceResponse<DealerApplication>> {
    const res = await api.post(`dealer/admin/applications/${id}/reject/`, { rejection_reason });
    return res.data;
  },
  async getStats(): Promise<ServiceResponse<DealerStats>> {
    const res = await api.get('dealer/admin/applications/stats/');
    return res.data;
  },
};

export const homepageService = {
  async getHeroSlides(): Promise<ServiceResponse<import('../types/admin').HeroSlide[]>> {
    const res = await api.get('homepage/hero/');
    return res.data;
  },
  async createHeroSlide(data: FormData): Promise<ServiceResponse<import('../types/admin').HeroSlide>> {
    const res = await api.post('homepage/hero/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  },
  async updateHeroSlide(id: string, data: FormData): Promise<ServiceResponse<import('../types/admin').HeroSlide>> {
    const res = await api.patch(`homepage/hero/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  },
  async deleteHeroSlide(id: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`homepage/hero/${id}/`);
    return res.data;
  },
  async reorderHeroSlides(order: { id: string; sort_order: number }[]): Promise<ServiceResponse<void>> {
    const res = await api.patch('homepage/hero/reorder/', order);
    return res.data;
  },

  async getHomepageCategories(): Promise<ServiceResponse<import('../types/admin').HomepageCategory[]>> {
    const res = await api.get('homepage/categories/');
    return res.data;
  },
  async createHomepageCategory(data: FormData): Promise<ServiceResponse<import('../types/admin').HomepageCategory>> {
    const res = await api.post('homepage/categories/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  },
  async updateHomepageCategory(id: string, data: FormData): Promise<ServiceResponse<import('../types/admin').HomepageCategory>> {
    const res = await api.patch(`homepage/categories/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  },
  async deleteHomepageCategory(id: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`homepage/categories/${id}/`);
    return res.data;
  },
  async reorderHomepageCategories(order: { id: string; sort_order: number }[]): Promise<ServiceResponse<void>> {
    const res = await api.patch('homepage/categories/reorder/', order);
    return res.data;
  },

  async getHomepageBrands(): Promise<ServiceResponse<import('../types/admin').HomepageBrand[]>> {
    const res = await api.get('homepage/brands/');
    return res.data;
  },
  async createHomepageBrand(data: FormData): Promise<ServiceResponse<import('../types/admin').HomepageBrand>> {
    const res = await api.post('homepage/brands/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  },
  async updateHomepageBrand(id: string, data: FormData): Promise<ServiceResponse<import('../types/admin').HomepageBrand>> {
    const res = await api.patch(`homepage/brands/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  },
  async deleteHomepageBrand(id: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`homepage/brands/${id}/`);
    return res.data;
  },
  async reorderHomepageBrands(order: { id: string; sort_order: number }[]): Promise<ServiceResponse<void>> {
    const res = await api.patch('homepage/brands/reorder/', order);
    return res.data;
  },

  async getBestSellers(): Promise<ServiceResponse<import('../types/admin').BestSeller[]>> {
    const res = await api.get('homepage/best-sellers/');
    return res.data;
  },
  async createBestSeller(data: FormData): Promise<ServiceResponse<import('../types/admin').BestSeller>> {
    const res = await api.post('homepage/best-sellers/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  },
  async updateBestSeller(id: string, data: FormData): Promise<ServiceResponse<import('../types/admin').BestSeller>> {
    const res = await api.patch(`homepage/best-sellers/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  },
  async deleteBestSeller(id: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`homepage/best-sellers/${id}/`);
    return res.data;
  },
  async reorderBestSellers(order: { id: string; sort_order: number }[]): Promise<ServiceResponse<void>> {
    const res = await api.patch('homepage/best-sellers/reorder/', order);
    return res.data;
  },

  async getFeaturedCollections(): Promise<ServiceResponse<import('../types/admin').FeaturedCollection[]>> {
    const res = await api.get('homepage/featured-collections/');
    return res.data;
  },
  async createFeaturedCollection(data: any): Promise<ServiceResponse<import('../types/admin').FeaturedCollection>> {
    const res = await api.post('homepage/featured-collections/', data);
    return res.data;
  },
  async updateFeaturedCollection(id: string, data: any): Promise<ServiceResponse<import('../types/admin').FeaturedCollection>> {
    const res = await api.patch(`homepage/featured-collections/${id}/`, data);
    return res.data;
  },
  async deleteFeaturedCollection(id: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`homepage/featured-collections/${id}/`);
    return res.data;
  },
  async createCollectionItem(data: any): Promise<ServiceResponse<import('../types/admin').FeaturedCollectionItem>> {
    const res = await api.post('homepage/collection-items/', data);
    return res.data;
  },
  async deleteCollectionItem(id: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`homepage/collection-items/${id}/`);
    return res.data;
  },

  async getOffers(): Promise<ServiceResponse<import('../types/admin').LimitedTimeOffer[]>> {
    const res = await api.get('homepage/offers/');
    return res.data;
  },
  async createOffer(data: FormData): Promise<ServiceResponse<import('../types/admin').LimitedTimeOffer>> {
    const res = await api.post('homepage/offers/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  },
  async updateOffer(id: string, data: FormData): Promise<ServiceResponse<import('../types/admin').LimitedTimeOffer>> {
    const res = await api.patch(`homepage/offers/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  },
  async deleteOffer(id: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`homepage/offers/${id}/`);
    return res.data;
  },

  async getExploreSolutions(): Promise<ServiceResponse<import('../types/admin').ExploreSolution[]>> {
    const res = await api.get('homepage/explore-solutions/');
    return res.data;
  },
  async createExploreSolution(data: FormData): Promise<ServiceResponse<import('../types/admin').ExploreSolution>> {
    const res = await api.post('homepage/explore-solutions/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  },
  async updateExploreSolution(id: string, data: FormData): Promise<ServiceResponse<import('../types/admin').ExploreSolution>> {
    const res = await api.patch(`homepage/explore-solutions/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  },
  async deleteExploreSolution(id: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`homepage/explore-solutions/${id}/`);
    return res.data;
  },
  async reorderExploreSolutions(order: { id: string; sort_order: number }[]): Promise<ServiceResponse<void>> {
    const res = await api.patch('homepage/explore-solutions/reorder/', order);
    return res.data;
  },

  async getTestimonials(): Promise<ServiceResponse<import('../types/admin').Testimonial[]>> {
    const res = await api.get('homepage/testimonials/');
    return res.data;
  },
  async createTestimonial(data: FormData): Promise<ServiceResponse<import('../types/admin').Testimonial>> {
    const res = await api.post('homepage/testimonials/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  },
  async updateTestimonial(id: string, data: FormData): Promise<ServiceResponse<import('../types/admin').Testimonial>> {
    const res = await api.patch(`homepage/testimonials/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  },
  async deleteTestimonial(id: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`homepage/testimonials/${id}/`);
    return res.data;
  },
  async reorderTestimonials(order: { id: string; sort_order: number }[]): Promise<ServiceResponse<void>> {
    const res = await api.patch('homepage/testimonials/reorder/', order);
    return res.data;
  },

  async getRecommended(): Promise<ServiceResponse<import('../types/admin').RecommendedProduct[]>> {
    const res = await api.get('homepage/recommended/');
    return res.data;
  },
  async createRecommended(data: any): Promise<ServiceResponse<import('../types/admin').RecommendedProduct>> {
    const res = await api.post('homepage/recommended/', data);
    return res.data;
  },
  async updateRecommended(id: string, data: any): Promise<ServiceResponse<import('../types/admin').RecommendedProduct>> {
    const res = await api.patch(`homepage/recommended/${id}/`, data);
    return res.data;
  },
  async deleteRecommended(id: string): Promise<ServiceResponse<void>> {
    const res = await api.delete(`homepage/recommended/${id}/`);
    return res.data;
  },
  async reorderRecommended(order: { id: string; sort_order: number }[]): Promise<ServiceResponse<void>> {
    const res = await api.patch('homepage/recommended/reorder/', order);
    return res.data;
  },
};

export const adminOrdersService = {
  async getOrders(params?: { status?: string; search?: string; page?: number; start_date?: string; end_date?: string }): Promise<ServiceResponse<any[]>> {
    const res = await api.get('orders/admin/', { params });
    return res.data;
  },

  async getOrderDetail(id: string): Promise<ServiceResponse<any>> {
    const res = await api.get(`orders/admin/${id}/`);
    return res.data;
  },

  async updateOrderStatus(
    id: string,
    payload: {
      status: string;
      notes?: string;
      tracking_number?: string;
      shipping_carrier?: string;
      estimated_delivery_date?: string;
    }
  ): Promise<ServiceResponse<any>> {
    const res = await api.patch(`orders/admin/${id}/`, payload);
    return res.data;
  },

  async downloadExportCSV(): Promise<void> {
    const res = await api.get('orders/admin/export/', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `faazo_orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
