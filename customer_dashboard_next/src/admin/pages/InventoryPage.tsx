'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Edit2, Eye, Package, X
} from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import AdminModal from '../components/AdminModal';
import { useToast } from '../components/Toast';
import { useBreadcrumbSync } from '../contexts/BreadcrumbContext';
import type { ColumnDef, Product, ProductInventory } from '../types/admin';
import { adminService } from '../services/adminService';
import StatCard from '../components/StatCard';

// ─────────────────────────────────────────────────────────────────────────────
// InventoryPage Component
// ─────────────────────────────────────────────────────────────────────────────

const InventoryPage: React.FC = () => {
  useBreadcrumbSync([
    { label: 'Operations', path: '/admin/inventory' },
    { label: 'Inventory' },
  ]);

  const router = useRouter();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState<string>('all');

  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Quick edit modal state
  const [quickEditProduct, setQuickEditProduct] = useState<Product | null>(null);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [allowBackorders, setAllowBackorders] = useState<boolean>(false);
  const [isPurchasable, setIsPurchasable] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await adminService.getProducts();
      if (res.success && res.data) {
        // Sort by id or name
        setProducts(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch inventory products:', err);
      toast.error('Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [brandRes, catRes] = await Promise.all([
        adminService.getBrands(),
        adminService.getCategories(),
      ]);
      if (brandRes.success && brandRes.data) setBrands(brandRes.data);
      if (catRes.success && catRes.data) setCategories(catRes.data);
    } catch (err) {
      console.error('Failed to load filters metadata:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchDropdowns();
  }, []);

  // Stats computation
  const stats = {
    totalItems: products.length,
    inStock: products.filter((p) => p.inventory?.stock_status === 'in_stock').length,
    lowStock: products.filter((p) => p.inventory?.stock_status === 'low_stock').length,
    outOfStock: products.filter((p) => p.inventory?.stock_status === 'out_of_stock').length,
  };

  // Filtering
  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand_name && p.brand_name.toLowerCase().includes(search.toLowerCase())) ||
      (p.category_name && p.category_name.toLowerCase().includes(search.toLowerCase()));

    const matchBrand = !filterBrand || p.brand === filterBrand;
    const matchCategory = !filterCategory || p.category === filterCategory;
    const matchStock =
      filterStockStatus === 'all' ||
      (p.inventory && p.inventory.stock_status === filterStockStatus);

    return matchSearch && matchBrand && matchCategory && matchStock;
  });

  // Local pagination
  const startIndex = (page - 1) * pageSize;
  const paginatedData = filtered.slice(startIndex, startIndex + pageSize);

  // Quick edit modal opener
  const handleOpenQuickEdit = (p: Product) => {
    setQuickEditProduct(p);
    const inv = p.inventory;
    setCurrentStock(inv?.current_stock ?? 0);
    setLowStockThreshold(inv?.low_stock_threshold ?? 5);
    setAllowBackorders(inv?.allow_backorders ?? false);
    setIsPurchasable(inv?.is_purchasable ?? true);
  };

  // Quick edit save action
  const handleSaveQuickEdit = async () => {
    if (!quickEditProduct) return;
    setSaving(true);
    try {
      const payload: Partial<ProductInventory> = {
        current_stock: currentStock,
        low_stock_threshold: lowStockThreshold,
        allow_backorders: allowBackorders,
        is_purchasable: isPurchasable,
      };
      const res = await adminService.saveProductInventory(quickEditProduct.slug, payload);
      if (res.success) {
        toast.success(`Inventory updated for "${quickEditProduct.name}"`);
        setQuickEditProduct(null);
        fetchProducts(); // Refresh list to get updated stock and status
      } else {
        toast.error(res.message || 'Failed to update inventory.');
      }
    } catch (err: any) {
      console.error(err);
      const resData = err?.response?.data;
      const errMsg =
        resData?.error?.current_stock?.[0] ||
        resData?.error?.message ||
        resData?.message ||
        resData?.detail ||
        err?.message ||
        'An error occurred while saving inventory.';
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  // Route to the existing Product Editor pricing/inventory tab
  const handleOpenFullEdit = (p: Product) => {
    router.push(`/admin/products?edit=${p.slug}&tab=inventory`);
  };

  // Columns definition
  const columns: ColumnDef<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      render: (_, p) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center p-1 shrink-0">
            {p.primary_image ? (
              <img src={p.primary_image} alt={p.name} className="max-h-full max-w-full object-contain" />
            ) : (
              <Package className="w-4 h-4 text-slate-300" />
            )}
          </div>
          <div className="min-w-0">
            <p
              onClick={() => handleOpenFullEdit(p)}
              className="font-semibold text-slate-800 text-sm hover:text-[#005B63] cursor-pointer truncate hover:underline"
            >
              {p.name}
            </p>
            <p className="text-xs text-slate-400 font-mono">{p.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'brand_name',
      header: 'Brand / Category',
      sortable: true,
      render: (_, p) => (
        <div>
          <p className="text-sm font-medium text-slate-700">{p.brand_name || '—'}</p>
          <p className="text-xs text-slate-400">{p.category_name || '—'}</p>
        </div>
      ),
    },
    {
      key: 'current_stock',
      header: 'Current Stock',
      sortable: true,
      render: (_, p) => (
        <span className="text-sm font-bold text-slate-700">
          {p.inventory?.current_stock ?? 0}
        </span>
      ),
    },
    {
      key: 'available_stock',
      header: 'Available Stock',
      render: (_, p) => (
        <span className="text-sm font-semibold text-slate-600">
          {p.inventory?.available_stock ?? 0}
        </span>
      ),
    },
    {
      key: 'low_stock_threshold',
      header: 'Threshold',
      render: (_, p) => (
        <span className="text-xs font-mono text-slate-500">
          {p.inventory?.low_stock_threshold ?? 5}
        </span>
      ),
    },
    {
      key: 'stock_status',
      header: 'Status',
      render: (_, p) => {
        const status = p.inventory?.stock_status ?? 'out_of_stock';
        const STYLES: Record<string, { label: string; cls: 'success' | 'warning' | 'error' }> = {
          in_stock: { label: 'In Stock', cls: 'success' },
          low_stock: { label: 'Low Stock', cls: 'warning' },
          out_of_stock: { label: 'Out of Stock', cls: 'error' },
        };
        const cfg = STYLES[status] || STYLES.out_of_stock;
        return <StatusBadge variant={cfg.cls} label={cfg.label} />;
      },
    },
    {
      key: 'id',
      header: 'Actions',
      render: (_, p) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenQuickEdit(p)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#005B63] hover:bg-[#005B63]/10 transition-colors cursor-pointer"
            title="Quick Edit Stock"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleOpenFullEdit(p)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
            title="Full Edit / View"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <SectionHeader
        title="Inventory Operations"
        subtitle="Monitor warehouse stock, manage thresholds, and execute fast adjustments."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard stat={{ id: 'total', label: 'Total Products', value: stats.totalItems, variant: 'teal', icon: 'Package' }} />
        <StatCard stat={{ id: 'instock', label: 'In Stock', value: stats.inStock, variant: 'green', icon: 'CheckCircle' }} />
        <StatCard stat={{ id: 'lowstock', label: 'Low Stock', value: stats.lowStock, variant: 'orange', icon: 'TrendingDown' }} />
        <StatCard stat={{ id: 'outofstock', label: 'Out of Stock', value: stats.outOfStock, variant: 'red', icon: 'AlertTriangle' }} />
      </div>

      {/* Filter and Table container */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products, SKUs..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#005B63]/10 focus:border-[#005B63] outline-none"
              />
            </div>

            {/* Brand Filter */}
            <select
              value={filterBrand}
              onChange={(e) => {
                setFilterBrand(e.target.value);
                setPage(1);
              }}
              className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none text-slate-600 focus:border-[#005B63] cursor-pointer"
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPage(1);
              }}
              className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none text-slate-600 focus:border-[#005B63] cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Stock Status Filter */}
            <select
              value={filterStockStatus}
              onChange={(e) => {
                setFilterStockStatus(e.target.value);
                setPage(1);
              }}
              className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none text-slate-600 focus:border-[#005B63] cursor-pointer"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          {(search || filterBrand || filterCategory || filterStockStatus !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setFilterBrand('');
                setFilterCategory('');
                setFilterStockStatus('all');
                setPage(1);
              }}
              className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={paginatedData}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Quick Edit Modal */}
      <AdminModal
        isOpen={!!quickEditProduct}
        onClose={() => setQuickEditProduct(null)}
        title="Quick Adjust Stock"
        subtitle={quickEditProduct?.name}
        size="md"
      >
        <div className="space-y-4">
          {/* Reserved Stock Info Banner if items are reserved for orders */}
          {(quickEditProduct?.inventory?.reserved_stock ?? 0) > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
              <span className="text-base">📦</span>
              <div>
                <p className="font-bold">
                  {quickEditProduct?.inventory?.reserved_stock} unit(s) reserved for pending orders.
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Available for new customers: <strong className="font-extrabold">{Math.max(0, currentStock - (quickEditProduct?.inventory?.reserved_stock ?? 0))}</strong> units.
                  {!allowBackorders && currentStock < (quickEditProduct?.inventory?.reserved_stock ?? 0) && (
                    <span className="text-rose-600 block font-semibold mt-1">
                      ⚠️ Current stock cannot be less than reserved units without enabling &ldquo;Allow Backorders&rdquo;.
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Current Stock Level</label>
              <input
                type="number"
                min={0}
                value={currentStock}
                onChange={(e) => setCurrentStock(Math.max(0, Number(e.target.value)))}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-[#005B63]/10 focus:border-[#005B63] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Low Stock Warning Threshold</label>
              <input
                type="number"
                min={0}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Math.max(0, Number(e.target.value)))}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-[#005B63]/10 focus:border-[#005B63] outline-none"
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allowBackorders}
                onChange={(e) => setAllowBackorders(e.target.checked)}
                className="w-4 h-4 rounded text-[#005B63] focus:ring-[#005B63]/30 cursor-pointer"
              />
              <div>
                <span className="text-xs text-slate-700 font-bold">Allow Backorders</span>
                <p className="text-[10px] text-slate-400">Let customers purchase this product when out of stock.</p>
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPurchasable}
                onChange={(e) => setIsPurchasable(e.target.checked)}
                className="w-4 h-4 rounded text-[#005B63] focus:ring-[#005B63]/30 cursor-pointer"
              />
              <div>
                <span className="text-xs text-slate-700 font-bold">Is Purchasable</span>
                <p className="text-[10px] text-slate-400">Controls if the Add to Cart button is enabled for this item.</p>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setQuickEditProduct(null)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveQuickEdit}
              disabled={saving}
              className="px-4 py-2 bg-[#005B63] text-white rounded-xl text-xs font-bold transition-all shadow hover:bg-[#004b52] disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Stock'}
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
};

export default InventoryPage;
