// ─────────────────────────────────────────────────────────────────────────────
// FAAZO Admin Portal — Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

// ── Roles ────────────────────────────────────────────────────────────────────

export type AdminRole =
  | 'administrator'
  | 'manager'
  | 'sales_executive'
  | 'support_executive'
  | 'inventory_manager'
  | 'dealer_manager';

export const ROLE_LABELS: Record<AdminRole, string> = {
  administrator: 'Administrator',
  manager: 'Manager',
  sales_executive: 'Sales Executive',
  support_executive: 'Support Executive',
  inventory_manager: 'Inventory Manager',
  dealer_manager: 'Dealer Manager',
};

// ── Permissions ───────────────────────────────────────────────────────────────

export type AdminPermission =
  | 'products.view' | 'products.create' | 'products.edit' | 'products.delete'
  | 'categories.view' | 'categories.create' | 'categories.edit' | 'categories.delete'
  | 'brands.view' | 'brands.create' | 'brands.edit' | 'brands.delete'
  | 'inventory.view' | 'inventory.edit'
  | 'pricing.view' | 'pricing.edit'
  | 'orders.view' | 'orders.edit' | 'orders.cancel'
  | 'customers.view' | 'customers.edit'
  | 'dealers.view' | 'dealers.approve' | 'dealers.edit'
  | 'warranty.view' | 'warranty.process'
  | 'support.view' | 'support.respond' | 'support.close'
  | 'reports.view'
  | 'notifications.view' | 'notifications.send'
  | 'users.view' | 'users.create' | 'users.edit' | 'users.delete'
  | 'audit.view'
  | 'settings.view' | 'settings.edit';

export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  administrator: [
    'products.view', 'products.create', 'products.edit', 'products.delete',
    'categories.view', 'categories.create', 'categories.edit', 'categories.delete',
    'brands.view', 'brands.create', 'brands.edit', 'brands.delete',
    'inventory.view', 'inventory.edit', 'pricing.view', 'pricing.edit',
    'orders.view', 'orders.edit', 'orders.cancel',
    'customers.view', 'customers.edit',
    'dealers.view', 'dealers.approve', 'dealers.edit',
    'warranty.view', 'warranty.process',
    'support.view', 'support.respond', 'support.close',
    'reports.view', 'notifications.view', 'notifications.send',
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'audit.view', 'settings.view', 'settings.edit',
  ],
  manager: [
    'products.view', 'products.create', 'products.edit',
    'categories.view', 'categories.edit', 'brands.view', 'brands.edit',
    'inventory.view', 'inventory.edit', 'pricing.view', 'pricing.edit',
    'orders.view', 'orders.edit',
    'customers.view', 'dealers.view', 'dealers.approve',
    'warranty.view', 'warranty.process',
    'support.view', 'support.respond',
    'reports.view', 'notifications.view',
    'users.view', 'audit.view', 'settings.view',
  ],
  sales_executive: [
    'products.view', 'categories.view', 'brands.view',
    'inventory.view', 'pricing.view',
    'orders.view', 'customers.view',
    'dealers.view', 'reports.view',
  ],
  support_executive: [
    'orders.view', 'customers.view',
    'warranty.view', 'warranty.process',
    'support.view', 'support.respond', 'support.close',
    'notifications.view',
  ],
  inventory_manager: [
    'products.view', 'products.edit',
    'categories.view', 'brands.view',
    'inventory.view', 'inventory.edit',
    'pricing.view',
  ],
  dealer_manager: [
    'dealers.view', 'dealers.approve', 'dealers.edit',
    'customers.view', 'orders.view',
    'reports.view',
  ],
};

// ── Navigation ────────────────────────────────────────────────────────────────

export type AdminSection =
  | 'dashboard'
  | 'homepage'
  | 'products' | 'categories' | 'brands' | 'combos' | 'offers' | 'solutions'
  | 'inventory' | 'pricing'
  | 'orders' | 'fulfillment'
  | 'customers' | 'dealers'
  | 'warranty' | 'support'
  | 'reports' | 'notifications'
  | 'users' | 'audit' | 'settings';

export interface NavItem {
  id: AdminSection;
  label: string;
  icon: string;
  path: string;
  badge?: number;
  badgeVariant?: 'danger' | 'warning' | 'info';
  requiredPermission?: AdminPermission;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardStat {
  id: string;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: number;
  trendLabel?: string;
  variant: 'teal' | 'orange' | 'red' | 'green' | 'blue' | 'purple';
  icon: string;
  actionLabel?: string;
  actionPath?: string;
}

export interface ActivityItem {
  id: string;
  type: 'order' | 'customer' | 'dealer' | 'support' | 'warranty' | 'product' | 'system';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  avatarColor?: string;
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  path: string;
  color: 'teal' | 'orange' | 'blue' | 'purple' | 'green';
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType = 'order' | 'dealer' | 'support' | 'warranty' | 'system' | 'alert';

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionLabel?: string;
  actionPath?: string;
  priority: 'low' | 'medium' | 'high';
}

// ── Data Table ────────────────────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc' | null;

export interface ColumnDef<T = Record<string, unknown>> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: string;
}

// ── Status ────────────────────────────────────────────────────────────────────

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple';

export interface StatusConfig {
  label: string;
  variant: StatusVariant;
}

// ── Filters ───────────────────────────────────────────────────────────────────

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'date' | 'daterange' | 'search';
  options?: FilterOption[];
}

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  displayValue: string;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration?: number;
}

// ── Admin User ────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  role: AdminRole;
  avatar?: string;
}

// ── Catalogue Foundation (Phase 5B) ───────────────────────────────────────────

export interface BrandDocument {
  id: string;
  title: string;
  document_type: 'catalogue' | 'certification' | 'ifu' | 'price_list' | 'other';
  file: string | null;
  external_url: string;
  is_public: boolean;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  logo_url?: string | null;
  description?: string;
  country_of_origin: string;
  support_email: string;
  support_phone: string;
  website_url: string;
  warranty_months_default: number;
  is_warranty_transferable: boolean;
  warranty_policy_text: string;
  service_policy_text: string;
  service_turnaround_days: number | null;
  documentation_url: string;
  certifications: Array<{ name: string; number: string; issued_by: string; valid_until: string }>;
  is_active: boolean;
  documents?: BrandDocument[];
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent: string | null;
  parent_name: string | null;
  full_path: string;
  depth: number;
  sort_order: number;
  description?: string;
  image?: string | null;
  is_active: boolean;
  is_leaf: boolean;
  active_product_count: number;
  children?: Category[];
}

export interface ProductImage {
  id: string;
  image: string;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductAttribute {
  id: string;
  name: string;
  value: string;
  unit: string;
  sort_order: number;
}

export interface ProductDocument {
  id: string;
  title: string;
  document_type: 'brochure' | 'ifu' | 'compliance' | 'manual' | 'other';
  file: string | null;
  external_url: string;
  is_public: boolean;
  created_at: string;
}

export interface ProductPricing {
  id?: string;
  mrp: string;
  selling_price: string;
  offer_price: string | null;
  dealer_price: string | null;
  gst_percentage: string;
  offer_start_date: string | null;
  offer_end_date: string | null;
  is_offer_active: boolean;
  effective_price: string;
  discount_percentage: number | null;
  you_save: string | null;
  updated_at?: string;
}

export interface ProductInventory {
  id?: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  low_stock_threshold: number;
  allow_backorders: boolean;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  is_purchasable: boolean;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  brand_name: string;
  category: string;
  category_name: string;
  status: 'draft' | 'active' | 'archived' | 'discontinued';
  is_featured: boolean;
  primary_image: string | null;
  short_description: string;
  long_description: string;
  warranty_months_override: number | null;
  effective_warranty?: number | null;
  weight_kg: number | null;
  tags: string[];
  images?: ProductImage[];
  attributes?: ProductAttribute[];
  documents?: ProductDocument[];
  pricing?: ProductPricing | null;
  inventory?: ProductInventory | null;
  created_at: string;
}

// ── Homepage CMS ──────────────────────────────────────────────────────────────

export interface HeroSlide {
  id: string;
  heading: string;
  subheading: string;
  cta_text: string;
  cta_link: string;
  desktop_image_url: string | null;
  mobile_image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface HomepageCategory {
  id: string;
  category: string;
  category_name: string;
  category_slug: string;
  display_title: string;
  card_image_url: string | null;
  icon_key: string;
  sort_order: number;
  is_visible: boolean;
}

export interface HomepageBrand {
  id: string;
  brand: string;
  brand_name: string;
  brand_slug: string;
  logo_url: string | null;
  sort_order: number;
  is_visible: boolean;
}

export interface BestSeller {
  id: string;
  product: string;
  product_slug: string;
  product_name: string;
  display_heading: string;
  display_short_description: string;
  display_image_url: string | null;
  sort_order: number;
  is_visible: boolean;
}

export interface FeaturedCollectionItem {
  id: string;
  product: string;
  product_name: string;
  product_slug: string;
  product_image: string | null;
  sort_order: number;
}

export interface FeaturedCollection {
  id: string;
  title: string;
  description: string;
  sort_order: number;
  is_visible: boolean;
  items: FeaturedCollectionItem[];
}

export interface LimitedTimeOffer {
  id: string;
  banner_image_url: string | null;
  heading: string;
  description: string;
  offer_text: string;
  start_date: string | null;
  end_date: string | null;
  cta_text: string;
  cta_link: string;
  sort_order: number;
  is_active: boolean;
}

export interface ExploreSolution {
  id: string;
  category: string;
  category_name: string;
  category_slug: string;
  display_heading: string;
  image_url: string | null;
  sort_order: number;
  is_visible: boolean;
}

export interface Testimonial {
  id: string;
  customer_name: string;
  clinic_name: string;
  photo_url: string | null;
  rating: number;
  review: string;
  sort_order: number;
  is_active: boolean;
}

export interface RecommendedProduct {
  id: string;
  product: string;
  product_name: string;
  product_slug: string;
  product_sku: string;
  brand_name: string;
  short_description: string;
  is_featured: boolean;
  primary_image: string | null;
  sort_order: number;
  is_visible: boolean;
}

export interface ComboDealProduct {
  id: string;
  product: Product;
  quantity: number;
}

export interface ComboDealImage {
  id: string;
  image: string;
  alt_text: string;
  sort_order: number;
}

export interface ComboDeal {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  full_description: string;
  thumbnail: string | null;
  banner: string | null;
  original_price: string;
  combo_price: string;
  dealer_price?: string;
  offer_price: string | null;
  offer_start_date: string | null;
  offer_end_date: string | null;
  is_featured: boolean;
  status: 'draft' | 'active' | 'archived';
  inventory: number;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  images: ComboDealImage[];
  combo_products: ComboDealProduct[];
  discount_percentage: number | null;
  you_save: string | null;
  effective_price: string;
  is_offer_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Customers Module ─────────────────────────────────────────────────────────

export interface CustomerAddress {
  id: string;
  label: string;
  full_name: string;
  mobile: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  address_type: 'shipping' | 'billing' | 'both';
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerAuditLog {
  id: string;
  action: string;
  action_by_name: string | null;
  action_by_email: string | null;
  description: string;
  created_at: string;
}

export interface Customer {
  id: string;
  customer_id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  
  avatar_url: string | null;
  profession: string;
  clinic_name: string;
  gst_number: string;
  clinic_phone: string;
  clinic_email: string;
  is_blocked: boolean;
  is_deleted: boolean;
  admin_notes: string;
  tags: string[];

  addresses: CustomerAddress[];
  default_address: CustomerAddress | null;
  dealer_request_status: 'pending' | 'approved' | 'rejected' | null;
  customer_audit_logs: CustomerAuditLog[];
}

// ── Dealers Module ────────────────────────────────────────────────────────────

export type DealerStatus = 'pending' | 'approved' | 'rejected';

export interface DealerApplication {
  id: string;
  company_name: string;
  status: DealerStatus;
  status_display: string;
  rejection_reason: string;
  admin_notes: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by_email: string | null;
  reviewed_by_name: string | null;
  applicant_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  applicant_role: string;
  date_joined: string;
  last_login: string | null;
  profession: string;
  clinic_name: string;
  gst_number: string;
  clinic_phone: string;
  clinic_email: string;
  city: string;
  state: string;
  address_line1: string;
  address_pincode: string;
  document_url: string | null;
  documents?: { id: string; name: string; document_url: string; }[];
}

export interface DealerStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  approval_rate: number;
}
