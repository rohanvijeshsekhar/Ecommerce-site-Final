import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import BrandsPage from './pages/BrandsPage';
import CategoriesPage from './pages/CategoriesPage';
import ProductsPage from './pages/ProductsPage';
import HomepagePage from './pages/HomepagePage';
import InventoryPage from './pages/InventoryPage';
import PricingPage from './pages/PricingPage';
import ComboDealsPage from './pages/ComboDealsPage';
import NotFound, { ComingSoon } from './pages/NotFound';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import DealersPage from './pages/DealersPage';
import DealerDetailPage from './pages/DealerDetailPage';
import OrdersPage from './pages/OrdersPage';
import AdminOrderDetailPage from './pages/AdminOrderDetailPage';
import WarrantyPage from './pages/WarrantyPage';
import WarrantyClaimDetailPage from './pages/WarrantyClaimDetailPage';
import WarrantyRegistrationDetailPage from './pages/WarrantyRegistrationDetailPage';
import SupportPage from './pages/SupportPage';
import SupportDetailPage from './pages/SupportDetailPage';
import FulfillmentPage from './pages/FulfillmentPage';
import ReportsPage from './pages/ReportsPage';


import ExploreSolutionsAdmin from '../components/ExploreSolutionsAdmin';

// ─────────────────────────────────────────────────────────────────────────────
// AdminRoutes — All admin route definitions
// Future modules plug in here without touching the portal shell.
// ─────────────────────────────────────────────────────────────────────────────

const AdminRoutes: React.FC = () => (
  <AdminLayout>
    <Routes>
      {/* Dashboard */}
      <Route index element={<AdminDashboard />} />

      {/* Catalogue — Phase 5B LIVE */}
      <Route path="products" element={<ProductsPage />} />
      <Route path="categories" element={<CategoriesPage />} />
      <Route path="brands" element={<BrandsPage />} />
      <Route path="combos" element={<ComboDealsPage />} />
      <Route path="solutions" element={<ExploreSolutionsAdmin />} />

      {/* Homepage CMS — Phase 5B LIVE */}
      <Route path="homepage" element={<HomepagePage />} />

      {/* Operations — Phase 5B */}
      <Route path="inventory" element={<InventoryPage />} />
      <Route path="pricing" element={<PricingPage />} />
      <Route path="orders" element={<OrdersPage />} />
      <Route path="orders/:id" element={<AdminOrderDetailPage />} />
      <Route
        path="orders/new"
        element={<ComingSoon module="Create Order" description="Manually place an order on behalf of a customer." />}
      />

      {/* Fulfillment — Phase 13 LIVE */}
      <Route path="fulfillment" element={<FulfillmentPage />} />

      {/* Customers & Dealers — Phase 5C */}
      <Route path="customers" element={<CustomersPage />} />
      <Route path="customers/:id" element={<CustomerDetailPage />} />
      <Route path="dealers" element={<DealersPage />} />
      <Route path="dealers/:id" element={<DealerDetailPage />} />

      {/* Services — Phase 5D */}
      <Route path="warranty" element={<WarrantyPage />} />
      <Route path="warranty/registrations/:id" element={<WarrantyRegistrationDetailPage />} />
      <Route path="warranty/claims/:id" element={<WarrantyClaimDetailPage />} />
      <Route path="support" element={<SupportPage />} />
      <Route path="support/:id" element={<SupportDetailPage />} />

      {/* Intelligence — Phase 5E LIVE */}
      <Route path="reports" element={<ReportsPage />} />
      <Route
        path="notifications"
        element={<ComingSoon module="Notifications" description="System alerts, broadcast messages, and notification management." />}
      />

      {/* System — Phase 5F */}
      <Route
        path="users"
        element={<ComingSoon module="Users & Roles" description="Manage admin users, roles, and permission assignments." />}
      />
      <Route
        path="audit"
        element={<ComingSoon module="Audit Logs" description="Track all admin actions with timestamps and actor attribution." />}
      />
      <Route
        path="settings"
        element={<ComingSoon module="Settings" description="Platform settings, integrations, and system configuration." />}
      />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </AdminLayout>
);

export default AdminRoutes;
