// ─────────────────────────────────────────────────────────────────────────────
// FAAZO Enterprise Reports & Business Intelligence Service Layer
// ─────────────────────────────────────────────────────────────────────────────

import { api } from '@/lib/api';
import type { ServiceResponse } from './adminService';

export interface DatePeriodInfo {
  period: string;
  start_date: string;
  end_date: string;
  days: number;
}

export interface FinancialsBreakdown {
  gross_sales: number;
  gross_sales_formatted: string;
  refunds: number;
  refunds_formatted: string;
  net_sales: number;
  net_sales_formatted: string;
  taxable_sales: number;
  taxable_sales_formatted: string;
  gst_included: number;
  gst_included_formatted: string;
}

export interface KpiMetric {
  value: number;
  formatted: string;
  prev_value?: number;
  growth: number;
  new_in_period?: number;
  total_attempts?: number;
  other_attempts?: number;
  subtitle?: string;
  gross_sales?: number;
  refunds?: number;
  net_sales?: number;
}

export interface ExecutiveKpisData {
  revenue: KpiMetric;
  orders: KpiMetric;
  customers: KpiMetric;
  dealers: KpiMetric;
  aov: KpiMetric;
  conversion_rate: KpiMetric;
  financials?: FinancialsBreakdown;
}

export interface RevenueAnalyticsData {
  labels: string[];
  revenue_series: number[];
  orders_series: number[];
  aov_series: number[];
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
}

export interface ProductIntelligenceItem {
  rank: number;
  id: string;
  name: string;
  sku: string;
  category: string;
  image?: string | null;
  units_sold: number;
  revenue: number;
  growth: number;
  stock_status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  stock_quantity: number;
}

export interface CategoryAnalyticsItem {
  id: string;
  name: string;
  revenue: number;
  orders: number;
  percentage: number;
  color: string;
}

export interface CategoryAnalyticsData {
  categories: CategoryAnalyticsItem[];
  total_categories: number;
  total_revenue: number;
}

export interface DealerAnalyticsItem {
  rank: number;
  id: string;
  name: string;
  company: string;
  location: string;
  revenue: number;
  orders: number;
  growth: number;
  status: string;
}

export interface CustomerAnalyticsData {
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  repeat_purchase_rate: number;
  customer_ltv: number;
  avg_orders_per_customer: number;
}

export interface CustomerGeographyItem {
  location: string;
  count?: number;
  share: number;
  color: string;
}

export interface InventoryMovementItem {
  type: string;
  product: string;
  quantity: string;
  time: string;
}

export interface InventoryIntelligenceData {
  total_inventory_value: number;
  total_skus: number;
  healthy_stock_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  health_score_percentage: number;
  recent_movements: InventoryMovementItem[];
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  revenue: number;
}

export interface PaymentAnalyticsData {
  total_transactions: number;
  successful_payments: number;
  failed_payments: number;
  pending_payments: number;
  success_rate: number;
  online_payments: number;
  cod_orders: number;
  methods_breakdown: PaymentMethodBreakdown[];
}

export interface SalesChannelBreakdown {
  customer_revenue: number;
  customer_share: number;
  dealer_revenue: number;
  dealer_share: number;
  total_revenue: number;
}

export interface WeeklySalesHeatmapItem {
  day: string;
  count: number;
  level: string;
}

export interface WarrantyAnalyticsData {
  total_registrations: number;
  total_claims: number;
  pending_claims: number;
  approved_claims: number;
  rejected_claims: number;
  claim_rate_percentage: number;
}

export interface SupportAnalyticsData {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
  avg_resolution_hours: number;
  customer_satisfaction_score: number;
}

export interface ReportActivityItem {
  id: string;
  type: 'Order' | 'Dealer' | 'Warranty' | 'Support' | 'Inventory';
  title: string;
  description: string;
  timestamp: string;
  status: string;
  badge_color: string;
}

export interface BusinessInsightItem {
  id: string;
  category: string;
  type: 'positive' | 'warning' | 'neutral';
  title: string;
  description: string;
  action_label: string;
}

export interface FullReportsOverviewPayload {
  date_info: DatePeriodInfo;
  kpis: ExecutiveKpisData;
  revenue_analytics: RevenueAnalyticsData;
  products_intelligence: ProductIntelligenceItem[];
  category_analytics: CategoryAnalyticsData;
  dealer_analytics: DealerAnalyticsItem[];
  customer_analytics: CustomerAnalyticsData;
  customer_geography: CustomerGeographyItem[];
  inventory_intelligence: InventoryIntelligenceData;
  payment_analytics: PaymentAnalyticsData;
  warranty_analytics: WarrantyAnalyticsData;
  support_analytics: SupportAnalyticsData;
  sales_channel: SalesChannelBreakdown;
  weekly_heatmap: WeeklySalesHeatmapItem[];
  recent_activities: ReportActivityItem[];
  business_insights: BusinessInsightItem[];
}

export const reportsService = {
  getOverview: async (period = '30d', startDate?: string, endDate?: string): Promise<ServiceResponse<FullReportsOverviewPayload>> => {
    try {
      const response = await api.get('/admin/reports/overview/', {
        params: { period, start_date: startDate, end_date: endDate }
      });
      return {
        success: true,
        data: response.data.data
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.response?.data?.message || 'Failed to fetch enterprise reports overview'
      };
    }
  },

  getKpis: async (period = '30d'): Promise<ServiceResponse<ExecutiveKpisData>> => {
    try {
      const response = await api.get('/admin/reports/kpis/', { params: { period } });
      return { success: true, data: response.data.data };
    } catch (err: any) {
      return { success: false, message: 'Failed to fetch KPIs' };
    }
  },

  getRevenue: async (period = '30d'): Promise<ServiceResponse<RevenueAnalyticsData>> => {
    try {
      const response = await api.get('/admin/reports/revenue/', { params: { period } });
      return { success: true, data: response.data.data };
    } catch (err: any) {
      return { success: false, message: 'Failed to fetch revenue analytics' };
    }
  },

  getProducts: async (period = '30d'): Promise<ServiceResponse<ProductIntelligenceItem[]>> => {
    try {
      const response = await api.get('/admin/reports/products/', { params: { period } });
      return { success: true, data: response.data.data };
    } catch (err: any) {
      return { success: false, message: 'Failed to fetch product intelligence' };
    }
  },

  getCategories: async (period = '30d'): Promise<ServiceResponse<CategoryAnalyticsData>> => {
    try {
      const response = await api.get('/admin/reports/categories/', { params: { period } });
      return { success: true, data: response.data.data };
    } catch (err: any) {
      return { success: false, message: 'Failed to fetch category analytics' };
    }
  },

  getDealers: async (period = '30d'): Promise<ServiceResponse<DealerAnalyticsItem[]>> => {
    try {
      const response = await api.get('/admin/reports/dealers/', { params: { period } });
      return { success: true, data: response.data.data };
    } catch (err: any) {
      return { success: false, message: 'Failed to fetch dealer analytics' };
    }
  },

  getCustomers: async (period = '30d'): Promise<ServiceResponse<CustomerAnalyticsData>> => {
    try {
      const response = await api.get('/admin/reports/customers/', { params: { period } });
      return { success: true, data: response.data.data };
    } catch (err: any) {
      return { success: false, message: 'Failed to fetch customer analytics' };
    }
  },

  getInventory: async (): Promise<ServiceResponse<InventoryIntelligenceData>> => {
    try {
      const response = await api.get('/admin/reports/inventory/');
      return { success: true, data: response.data.data };
    } catch (err: any) {
      return { success: false, message: 'Failed to fetch inventory intelligence' };
    }
  },

  getPayments: async (period = '30d'): Promise<ServiceResponse<PaymentAnalyticsData>> => {
    try {
      const response = await api.get('/admin/reports/payments/', { params: { period } });
      return { success: true, data: response.data.data };
    } catch (err: any) {
      return { success: false, message: 'Failed to fetch payment analytics' };
    }
  },

  getWarranty: async (): Promise<ServiceResponse<WarrantyAnalyticsData>> => {
    try {
      const response = await api.get('/admin/reports/warranty/');
      return { success: true, data: response.data.data };
    } catch (err: any) {
      return { success: false, message: 'Failed to fetch warranty analytics' };
    }
  },

  getSupport: async (): Promise<ServiceResponse<SupportAnalyticsData>> => {
    try {
      const response = await api.get('/admin/reports/support/');
      return { success: true, data: response.data.data };
    } catch (err: any) {
      return { success: false, message: 'Failed to fetch support analytics' };
    }
  },

  getRecentActivities: async (): Promise<ServiceResponse<ReportActivityItem[]>> => {
    try {
      const response = await api.get('/admin/reports/recent-activities/');
      return { success: true, data: response.data.data };
    } catch (err: any) {
      return { success: false, message: 'Failed to fetch recent activities' };
    }
  }
};
