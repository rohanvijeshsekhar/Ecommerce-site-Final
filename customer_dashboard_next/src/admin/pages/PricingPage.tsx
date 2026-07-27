'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Edit2, Eye, Package, X
} from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import DataTable from '../components/DataTable';
import AdminModal from '../components/AdminModal';
import { useToast } from '../components/Toast';
import { useBreadcrumbSync } from '../contexts/BreadcrumbContext';
import type { ColumnDef, Product, ProductPricing } from '../types/admin';
import { adminService } from '../services/adminService';
import StatCard from '../components/StatCard';

// ─────────────────────────────────────────────────────────────────────────────
// PricingPage Component
// ─────────────────────────────────────────────────────────────────────────────

const PricingPage: React.FC = () => {
  useBreadcrumbSync([
    { label: 'Operations', path: '/admin/pricing' },
    { label: 'Pricing' },
  ]);

  const router = useRouter();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterOfferStatus, setFilterOfferStatus] = useState<string>('all');

  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Quick edit modal state
  const [quickEditProduct, setQuickEditProduct] = useState<Product | null>(null);
  const [mrp, setMrp] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [offerPrice, setOfferPrice] = useState<string>('');
  const [dealerPrice, setDealerPrice] = useState<string>('');
  const [gstPercentage, setGstPercentage] = useState<string>('18');
  const [offerStartDate, setOfferStartDate] = useState<string>('');
  const [offerEndDate, setOfferEndDate] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await adminService.getProducts();
      if (res.success && res.data) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch pricing products:', err);
      toast.error('Failed to load products pricing.');
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
    activeOffers: products.filter((p) => p.pricing?.is_offer_active).length,
    noPrice: products.filter((p) => !p.pricing || (!p.pricing.selling_price && !p.pricing.mrp)).length,
    averageDiscount: (() => {
      const discounted = products.filter((p) => (p.pricing?.discount_percentage ?? 0) > 0);
      if (discounted.length === 0) return 0;
      const sum = discounted.reduce((acc, p) => acc + (p.pricing?.discount_percentage ?? 0), 0);
      return Math.round(sum / discounted.length);
    })(),
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
    const matchOffer =
      filterOfferStatus === 'all' ||
      (filterOfferStatus === 'active_offer' && p.pricing?.is_offer_active) ||
      (filterOfferStatus === 'no_price' && (!p.pricing || (!p.pricing.selling_price && !p.pricing.mrp)));

    return matchSearch && matchBrand && matchCategory && matchOffer;
  });

  // Local pagination
  const startIndex = (page - 1) * pageSize;
  const paginatedData = filtered.slice(startIndex, startIndex + pageSize);

  // Quick edit modal opener
  const handleOpenQuickEdit = (p: Product) => {
    setQuickEditProduct(p);
    const pr = p.pricing;
    setMrp(pr?.mrp ?? '');
    setSellingPrice(pr?.selling_price ?? '');
    setOfferPrice(pr?.offer_price ?? '');
    setDealerPrice(pr?.dealer_price ?? '');
    setGstPercentage(pr?.gst_percentage ?? '18');
    setOfferStartDate(pr?.offer_start_date ?? '');
    setOfferEndDate(pr?.offer_end_date ?? '');
  };

  // Quick edit save action
  const handleSaveQuickEdit = async () => {
    if (!quickEditProduct) return;
    if (!mrp.trim() || !sellingPrice.trim()) {
      toast.error('MRP and Base Selling Price are required.');
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<ProductPricing> = {
        mrp,
        selling_price: sellingPrice,
        offer_price: offerPrice.trim() ? offerPrice : null,
        dealer_price: dealerPrice.trim() ? dealerPrice : null,
        gst_percentage: gstPercentage,
        offer_start_date: offerStartDate.trim() ? offerStartDate : null,
        offer_end_date: offerEndDate.trim() ? offerEndDate : null,
      };
      const res = await adminService.saveProductPricing(quickEditProduct.slug, payload);
      if (res.success) {
        toast.success(`Pricing updated for "${quickEditProduct.name}"`);
        setQuickEditProduct(null);
        fetchProducts(); // Refresh list to update rates & discount calculations
      } else {
        toast.error('Failed to update pricing details.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  // Route to the existing Product Editor pricing tab
  const handleOpenFullEdit = (p: Product) => {
    router.push(`/admin/products?edit=${p.slug}&tab=pricing`);
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
      key: 'mrp',
      header: 'MRP',
      sortable: true,
      render: (_, p) => {
        const amt = parseFloat(p.pricing?.mrp ?? '0');
        return amt > 0 ? (
          <span className="text-sm font-semibold text-slate-400 line-through">
            ₹{amt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        ) : (
          <span className="text-xs text-slate-300 font-semibold">Not Set</span>
        );
      },
    },
    {
      key: 'selling_price',
      header: 'Selling Price',
      sortable: true,
      render: (_, p) => {
        const amt = parseFloat(p.pricing?.selling_price ?? '0');
        return amt > 0 ? (
          <span className="text-sm font-bold text-slate-700">
            ₹{amt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        ) : (
          <span className="text-xs text-slate-300 font-semibold">—</span>
        );
      },
    },
    {
      key: 'effective_price',
      header: 'Offer Price',
      render: (_, p) => {
        const pr = p.pricing;
        if (!pr || !pr.offer_price) return <span className="text-xs text-slate-300">—</span>;
        const amt = parseFloat(pr.offer_price);
        return (
          <div className="flex flex-col">
            <span className={`text-sm font-bold ${pr.is_offer_active ? 'text-[#005B63]' : 'text-slate-400'}`}>
              ₹{amt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className={`text-[9px] uppercase tracking-wider font-extrabold ${pr.is_offer_active ? 'text-emerald-500' : 'text-slate-300'}`}>
              {pr.is_offer_active ? 'Active' : 'Expired / Pending'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'dealer_price',
      header: 'Dealer Price',
      render: (_, p) => {
        const pr = p.pricing;
        if (!pr || !pr.dealer_price) return <span className="text-xs text-slate-300">—</span>;
        const amt = parseFloat(pr.dealer_price);
        return (
          <span className="text-sm font-semibold text-indigo-600">
            ₹{amt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        );
      },
    },
    {
      key: 'discount_percentage',
      header: 'Discount',
      render: (_, p) => {
        const disc = p.pricing?.discount_percentage;
        return disc && disc > 0 ? (
          <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded font-black">
            {disc}% OFF
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        );
      },
    },
    {
      key: 'gst_percentage',
      header: 'GST',
      render: (_, p) => (
        <span className="text-xs font-semibold text-slate-500">
          {p.pricing?.gst_percentage ?? '18'}%
        </span>
      ),
    },
    {
      key: 'id',
      header: 'Actions',
      render: (_, p) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenQuickEdit(p)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#005B63] hover:bg-[#005B63]/10 transition-colors cursor-pointer"
            title="Quick Edit Pricing"
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
        title="Pricing Operations"
        subtitle="Configure Base Prices, Dealer Rates, Promotional Offers, and Tax Slabs."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard stat={{ id: 'total', label: 'Total Products', value: stats.totalItems, variant: 'teal', icon: 'Package' }} />
        <StatCard stat={{ id: 'active', label: 'Active Offers', value: stats.activeOffers, variant: 'green', icon: 'Percent' }} />
        <StatCard stat={{ id: 'noprice', label: 'No Price Set', value: stats.noPrice, variant: 'orange', icon: 'Info' }} />
        <StatCard stat={{ id: 'avgdiscount', label: 'Avg Offer Discount', value: `${stats.averageDiscount}%`, variant: 'blue', icon: 'IndianRupee' }} />
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

            {/* Offer Status Filter */}
            <select
              value={filterOfferStatus}
              onChange={(e) => {
                setFilterOfferStatus(e.target.value);
                setPage(1);
              }}
              className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none text-slate-600 focus:border-[#005B63] cursor-pointer"
            >
              <option value="all">All Pricings</option>
              <option value="active_offer">Active Offers</option>
              <option value="no_price">No Price Set</option>
            </select>
          </div>

          {(search || filterBrand || filterCategory || filterOfferStatus !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setFilterBrand('');
                setFilterCategory('');
                setFilterOfferStatus('all');
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
        title="Quick Adjust Pricing"
        subtitle={quickEditProduct?.name}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">MRP (Maximum Retail Price) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="text"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl pl-7 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#005B63]/10 focus:border-[#005B63] outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Base Selling Price *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="text"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl pl-7 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#005B63]/10 focus:border-[#005B63] outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Dealer Exclusive Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="text"
                  value={dealerPrice}
                  onChange={(e) => setDealerPrice(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl pl-7 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#005B63]/10 focus:border-[#005B63] outline-none"
                  placeholder="Optional dealer price rate"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">GST Slabs (%)</label>
              <select
                value={gstPercentage}
                onChange={(e) => setGstPercentage(e.target.value)}
                className="w-full border border-slate-200 bg-white rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-[#005B63]/10 focus:border-[#005B63] outline-none cursor-pointer"
              >
                <option value="0">0% (GST Free)</option>
                <option value="5">5% (GST Lower)</option>
                <option value="12">12% (GST Standard)</option>
                <option value="18">18% (GST Standard Higher)</option>
                <option value="28">28% (GST Luxury)</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Promotional Campaign Offer</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-0.5">Offer Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="text"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-7 pr-4 py-1.5 text-xs focus:ring-2 focus:ring-[#005B63]/10 focus:border-[#005B63] outline-none"
                    placeholder="Offer Rate"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-0.5">Offer Start Date</label>
                <input
                  type="date"
                  value={offerStartDate}
                  onChange={(e) => setOfferStartDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-2 py-1.5 text-xs focus:ring-2 focus:ring-[#005B63]/10 focus:border-[#005B63] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-0.5">Offer End Date</label>
                <input
                  type="date"
                  value={offerEndDate}
                  onChange={(e) => setOfferEndDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-2 py-1.5 text-xs focus:ring-2 focus:ring-[#005B63]/10 focus:border-[#005B63] outline-none"
                />
              </div>
            </div>
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
              {saving ? 'Saving...' : 'Save Pricing'}
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
};

export default PricingPage;
