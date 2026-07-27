import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, GripVertical, Eye, EyeOff, X, Save, TrendingUp } from 'lucide-react';
import { homepageService, adminService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';
import type { BestSeller } from '../../types/admin';
import LoadingOverlay from '../LoadingOverlay';
import ConfirmDialog from '../ConfirmDialog';
import EmptyState from '../EmptyState';
import ImageUploader from '../ImageUploader';

const BestSellersManager: React.FC = () => {
  const { showToast } = useAdmin();
  const [items, setItems] = useState<BestSeller[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; sku: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<BestSeller | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BestSeller | null>(null);
  const [form, setForm] = useState({ product: '', custom_heading: '', short_description: '', is_visible: true, display_image: null as File | string | null });

  const load = async () => {
    setLoading(true);
    try {
      const [bsRes, pRes] = await Promise.all([
        homepageService.getBestSellers(),
        adminService.getProducts({ page_size: 200, status: 'active' }),
      ]);
      if (bsRes.success && bsRes.data) setItems(bsRes.data);
      if (pRes.success && pRes.data) setProducts(pRes.data as any[]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditItem(null); setForm({ product: '', custom_heading: '', short_description: '', is_visible: true, display_image: null }); setShowForm(true); };
  const openEdit = (item: BestSeller) => {
    setEditItem(item);
    setForm({
      product: item.product,
      custom_heading: item.display_heading === item.product_name ? '' : item.display_heading,
      short_description: item.display_short_description,
      is_visible: item.is_visible,
      display_image: item.display_image_url || null,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.product) { showToast({ variant: 'error', title: 'Please select a product' }); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('product', form.product);
      fd.append('custom_heading', form.custom_heading);
      fd.append('short_description', form.short_description);
      fd.append('is_visible', String(form.is_visible));
      if (form.display_image instanceof File) {
        fd.append('display_image', form.display_image);
      } else if (form.display_image === null) {
        fd.append('display_image', ''); // Clear override
      }
      const res = editItem ? await homepageService.updateBestSeller(editItem.id, fd) : await homepageService.createBestSeller(fd);
      if (res.success) { showToast({ variant: 'success', title: editItem ? 'Updated' : 'Added to Best Sellers' }); setShowForm(false); load(); }
    } catch { showToast({ variant: 'error', title: 'Save failed' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await homepageService.deleteBestSeller(deleteTarget.id);
    showToast({ variant: 'success', title: 'Removed' }); setDeleteTarget(null); load();
  };

  const toggleVisible = async (item: BestSeller) => {
    const fd = new FormData(); fd.append('is_visible', String(!item.is_visible));
    await homepageService.updateBestSeller(item.id, fd); load();
  };

  if (loading) return <LoadingOverlay message="Loading…" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} product{items.length !== 1 ? 's' : ''} in Best Sellers</p>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56]">
          <Plus className="w-4 h-4" />Add Product
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="w-10 h-10 text-slate-300" />}
          title="No best sellers"
          description="Add products to the 'Best Sellers' section."
          action={
            <button onClick={openCreate} className="mt-4 px-4 py-2 bg-[#006670] text-white rounded-lg text-sm font-semibold">
              Add Product
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 group">
              <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
              <div className="w-14 h-14 bg-slate-200 rounded-xl overflow-hidden flex-shrink-0">
                {item.display_image_url
                  ? <img src={item.display_image_url} className="w-full h-full object-cover" alt={item.display_heading} />
                  : <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px] text-center px-1">No Image</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{item.display_heading}</p>
                <p className="text-xs text-slate-500 truncate">{item.display_short_description}</p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => toggleVisible(item)} className={`p-1.5 rounded-lg ${item.is_visible ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                  {item.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-base font-bold">{editItem ? 'Edit Best Seller' : 'Add Best Seller'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Product *</label>
                <select value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30">
                  <option value="">— Select a product —</option>
                  {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div>
                <ImageUploader
                  label="Display Image (override)"
                  aspectRatio={1}
                  currentUrl={form.display_image instanceof File ? URL.createObjectURL(form.display_image) : form.display_image}
                  onUpload={(file) => setForm(f => ({ ...f, display_image: file }))}
                  onRemove={() => setForm(f => ({ ...f, display_image: null }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Custom Heading (override)</label>
                <input type="text" value={form.custom_heading} onChange={e => setForm(f => ({ ...f, custom_heading: e.target.value }))}
                  placeholder="Leave blank to use product name"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Short Description (override)</label>
                <textarea value={form.short_description} onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))}
                  rows={2} placeholder="Leave blank to use product short description"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30 resize-none" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm(f => ({ ...f, is_visible: !f.is_visible }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.is_visible ? 'bg-[#006670]' : 'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_visible ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm font-medium text-slate-700">Visible on homepage</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56] disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog isOpen={!!deleteTarget} title="Remove Product" message={`Remove "${deleteTarget?.display_heading}" from Best Sellers?`}
        confirmLabel="Remove" variant="danger" onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </div>
  );
};

export default BestSellersManager;
