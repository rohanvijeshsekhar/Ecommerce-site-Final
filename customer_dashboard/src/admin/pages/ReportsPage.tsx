// ─────────────────────────────────────────────────────────────────────────────
// FAAZO Business Intelligence Workspace — Executive Analytics Hub
// 8 Premium Workspace Tabs with Lazy-Loading Data Fetching
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  reportsService,
  type FullReportsOverviewPayload,
  type RevenueAnalyticsData,
  type ProductIntelligenceItem,
  type CategoryAnalyticsData,
  type DealerAnalyticsItem,
  type CustomerAnalyticsData,
  type InventoryIntelligenceData,
  type PaymentAnalyticsData,
  type WarrantyAnalyticsData,
  type SupportAnalyticsData,
  type ReportActivityItem,
} from '../services/reportsService';

import { ReportsWorkspaceHeader, type WorkspaceTabKey } from '../components/reports/ReportsWorkspaceHeader';
import { OverviewTab } from '../components/reports/tabs/OverviewTab';
import { SalesTab } from '../components/reports/tabs/SalesTab';
import { ProductsTab } from '../components/reports/tabs/ProductsTab';
import { CustomersTab } from '../components/reports/tabs/CustomersTab';
import { DealersTab } from '../components/reports/tabs/DealersTab';
import { InventoryTab } from '../components/reports/tabs/InventoryTab';
import { FinanceTab } from '../components/reports/tabs/FinanceTab';
import { OperationsTab } from '../components/reports/tabs/OperationsTab';
import { ReportsSkeleton } from '../components/reports/ReportsSkeleton';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorkspaceTabKey>('overview');
  const [period, setPeriod] = useState<string>('30d');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Tab Data Cache
  const [overviewData, setOverviewData] = useState<FullReportsOverviewPayload | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueAnalyticsData | null>(null);
  const [productsData, setProductsData] = useState<ProductIntelligenceItem[] | null>(null);
  const [categoriesData, setCategoriesData] = useState<CategoryAnalyticsData | null>(null);
  const [dealersData, setDealersData] = useState<DealerAnalyticsItem[] | null>(null);
  const [customersData, setCustomersData] = useState<CustomerAnalyticsData | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryIntelligenceData | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentAnalyticsData | null>(null);
  const [warrantyData, setWarrantyData] = useState<WarrantyAnalyticsData | null>(null);
  const [supportData, setSupportData] = useState<SupportAnalyticsData | null>(null);
  const [activitiesData, setActivitiesData] = useState<ReportActivityItem[] | null>(null);

  // Lazy Fetch Tab Data
  const loadTabData = async (tab: WorkspaceTabKey, selectedPeriod: string) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'overview') {
        const res = await reportsService.getOverview(selectedPeriod);
        if (res.success && res.data) {
          setOverviewData(res.data);
        } else {
          setError(res.message || 'Failed to load overview analytics.');
        }
      } else if (tab === 'sales') {
        const [revRes, prodRes] = await Promise.all([
          reportsService.getRevenue(selectedPeriod),
          reportsService.getProducts(selectedPeriod),
        ]);
        if (revRes.data) setRevenueData(revRes.data);
        if (prodRes.data) setProductsData(prodRes.data);
      } else if (tab === 'products') {
        const [prodRes, catRes] = await Promise.all([
          reportsService.getProducts(selectedPeriod),
          reportsService.getCategories(selectedPeriod),
        ]);
        if (prodRes.data) setProductsData(prodRes.data);
        if (catRes.data) setCategoriesData(catRes.data);
      } else if (tab === 'customers') {
        const res = await reportsService.getCustomers(selectedPeriod);
        if (res.data) setCustomersData(res.data);
      } else if (tab === 'dealers') {
        const res = await reportsService.getDealers(selectedPeriod);
        if (res.data) setDealersData(res.data);
      } else if (tab === 'inventory') {
        const res = await reportsService.getInventory();
        if (res.data) setInventoryData(res.data);
      } else if (tab === 'finance') {
        const res = await reportsService.getPayments(selectedPeriod);
        if (res.data) setPaymentData(res.data);
      } else if (tab === 'operations') {
        const [warrRes, suppRes, actRes] = await Promise.all([
          reportsService.getWarranty(),
          reportsService.getSupport(),
          reportsService.getRecentActivities(),
        ]);
        if (warrRes.data) setWarrantyData(warrRes.data);
        if (suppRes.data) setSupportData(suppRes.data);
        if (actRes.data) setActivitiesData(actRes.data);
      }
    } catch (err: any) {
      setError('Connection error fetching tab analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabData(activeTab, period);
  }, [activeTab, period]);

  // Export Utilities (PDF, Excel, CSV)
  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    setIsExporting(true);
    if (format === 'pdf') {
      window.print();
      setIsExporting(false);
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `FAAZO Enterprise Business Intelligence - ${activeTab.toUpperCase()} Report\r\n`;
    csvContent += `Generated At,${new Date().toLocaleString()}\r\n`;
    csvContent += `Period,${period}\r\n\r\n`;

    if (overviewData) {
      csvContent += 'EXECUTIVE KPIS\r\n';
      csvContent += `Total Revenue,${overviewData.kpis.revenue.formatted},Growth,${overviewData.kpis.revenue.growth}%\r\n`;
      csvContent += `Total Orders,${overviewData.kpis.orders.formatted},Growth,${overviewData.kpis.orders.growth}%\r\n`;
      csvContent += `Active Customers,${overviewData.kpis.customers.formatted},Growth,${overviewData.kpis.customers.growth}%\r\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FAAZO_${activeTab}_Report_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsExporting(false);
    }, 500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Workspace Header Toolbar */}
      <ReportsWorkspaceHeader
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        period={period}
        onPeriodChange={(newPeriod) => setPeriod(newPeriod)}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadTabData(activeTab, period)}
            className="px-3 py-1 bg-white hover:bg-rose-100 text-rose-900 text-xs font-bold rounded-lg border border-rose-300 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Active Tab View Rendering */}
      {loading ? (
        <ReportsSkeleton />
      ) : (
        <>
          {activeTab === 'overview' && overviewData && <OverviewTab data={overviewData} />}
          {activeTab === 'sales' && <SalesTab revenueData={revenueData || overviewData?.revenue_analytics} productsData={productsData || overviewData?.products_intelligence} />}
          {activeTab === 'products' && <ProductsTab productsData={productsData || overviewData?.products_intelligence} categoryData={categoriesData || overviewData?.category_analytics} />}
          {activeTab === 'customers' && <CustomersTab data={customersData || overviewData?.customer_analytics} />}
          {activeTab === 'dealers' && <DealersTab dealersData={dealersData || overviewData?.dealer_analytics} />}
          {activeTab === 'inventory' && <InventoryTab data={inventoryData || overviewData?.inventory_intelligence} />}
          {activeTab === 'finance' && <FinanceTab paymentData={paymentData || overviewData?.payment_analytics} />}
          {activeTab === 'operations' && <OperationsTab warrantyData={warrantyData || overviewData?.warranty_analytics} supportData={supportData || overviewData?.support_analytics} activitiesData={activitiesData || overviewData?.recent_activities} />}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
