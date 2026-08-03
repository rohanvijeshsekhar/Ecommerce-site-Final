'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, Star, X, Save, TrendingUp, Hash } from 'lucide-react';
import { api } from '@/lib/api';
import { useAdmin } from '../../contexts/AdminContext';
import LoadingOverlay from '../LoadingOverlay';
import ConfirmDialog from '../ConfirmDialog';
import EmptyState from '../EmptyState';

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface BestSellerEntry {
  id: number;
  product: string;
  product_name: string;
  product_sku: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  product_detail?: {
    primary_image_url?: string;
    name?: string;
  };
}

const BestSellerProductManager: React.FC = () => {
  const { showToast } = useAdmin();
  const [items, setItems] = useState<BestSellerEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BestSellerEntry | null>(null);
  const [editItem, setEditItem] = useState<BestSellerEntry | null>(null);
  const [form, setForm] = useState({ product: '', display_order: 0, is_active: true });

  const load = async () => {
    setLoading(true);
    try {
      let bsData: BestSellerEntry[] = [];
      try {
        const bsRes = await api.get('bestsellers/admin/products/');
        if (bsRes.data?.success) bsData = bsRes.data.data || [];
      } catch (err: any) {
        if (err?.response?.status === 401) {
          // Public fallback if unauthenticated
          const pubRes = await api.get('bestsellers/products/');
          bsData = pubRes.data?.data?.products || pubRes.data?.products || [];
        }
      }
      setItems(bsData);

      try {
        const pRes = await api.get('products/', { params: { page_size: 200, status: 'active' } });
        if (pRes.data?.success && pRes.data?.data) setProducts(pRes.data.data);
      } catch {
        // Ignore products list errors if unauthenticated
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ product: '', display_order: (items.length + 1), is_active: true });
    setShowForm(true);
  };

  const openEdit = (item: BestSellerEntry) => {
    setEditItem(item);
    setForm({ product: item.product, display_order: item.display_order, is_active: item.is_active });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.product) {
      showToast({ variant: 'error', title: 'Please select a product' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        product: form.product,
        display_order: form.display_order,
        is_active: form.is_active,
      };

      let res;
      if (editItem) {
        res = await api.patch(`bestsellers/admin/products/${editItem.id}/`, payload);
      } else {
        res = await api.post('bestsellers/admin/products/', payload);
      }

      if (res.data?.success) {
        showToast({ variant: 'success', title: editItem ? 'Updated' : 'Added to Best Sellers' });
        setShowForm(false);
        load();
      } else {
        showToast({ variant: 'error', title: 'Save failed' });
      }
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        showToast({ variant: 'error', title: 'Admin session expired. Redirecting to login…' });
        setTimeout(() => { window.location.href = '/admin/login'; }, 1200);
      } else {
        const detail = err?.response?.data?.errors?.product?.[0] || 'Save failed';
        showToast({ variant: 'error', title: detail });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`bestsellers/admin/products/${deleteTarget.id}/`);
      showToast({ variant: 'success', title: 'Removed from Best Sellers' });
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        showToast({ variant: 'error', title: 'Admin session expired. Redirecting to login…' });
        setTimeout(() => { window.location.href = '/admin/login'; }, 1200);
      } else {
        showToast({ variant: 'error', title: 'Delete failed' });
      }
    }
  };

  const toggleActive = async (item: BestSellerEntry) => {
    try {
      await api.patch(`bestsellers/admin/products/${item.id}/`, { is_active: !item.is_active });
      load();
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        showToast({ variant: 'error', title: 'Admin session expired. Redirecting to login…' });
        setTimeout(() => { window.location.href = '/admin/login'; }, 1200);
      } else {
        showToast({ variant: 'error', title: 'Update failed' });
      }
    }
  };

  if (loading) return <LoadingOverlay message="Loading…" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {items.length} product{items.length !== 1 ? 's' : ''} in Best Sellers page
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56]"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="w-10 h-10 text-slate-300" />}
          title="No best sellers yet"
          description="Add products to display on the Best Sellers page."
          action={
            <button onClick={openCreate} className="mt-4 px-4 py-2 bg-[#006670] text-white rounded-lg text-sm font-semibold">
              Add Product
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const img = item.product_detail?.primary_image_url;
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 group"
              >
                {/* Order badge */}
                <div className="w-7 h-7 rounded-full bg-[#006670]/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[#006670]">{item.display_order}</span>
                </div>

                {/* Thumbnail */}
                <div className="w-12 h-12 bg-slate-200 rounded-xl overflow-hidden shrink-0">
                  {img
                    ? <img src={img} className="w-full h-full object-cover" alt={item.product_name} />
                    : <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">No img</div>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{item.product_name}</p>
                  <p className="text-xs text-slate-400">SKU: {item.product_sku}</p>
                </div>

                {/* Status badge */}
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {item.is_active ? 'Active' : 'Hidden'}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => toggleActive(item)} title={item.is_active ? 'Hide' : 'Show'} className={`p-1.5 rounded-lg ${item.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                    {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(item)} title="Edit" className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100">
                    <Hash className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(item)} title="Remove" className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                {editItem ? 'Edit Best Seller' : 'Add to Best Sellers'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Product *</label>
                <select
                  value={form.product}
                  onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30"
                >
                  <option value="">— Select a product —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Display Order</label>
                <input
                  type="number"
                  min={0}
                  value={form.display_order}
                  onChange={e => setForm(f => ({ ...f, display_order: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30"
                />
                <p className="text-xs text-slate-400 mt-1">Lower numbers appear first (1, 2, 3…)</p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-[#006670]' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm font-medium text-slate-700">Visible on Best Sellers page</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56] disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Remove Product"
        message={`Remove "${deleteTarget?.product_name}" from Best Sellers page?`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default BestSellerProductManager;
