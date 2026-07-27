import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Eye, EyeOff, Package, Sparkles } from 'lucide-react';
import { homepageService, adminService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';
import type { RecommendedProduct } from '../../types/admin';
import LoadingOverlay from '../LoadingOverlay';
import ConfirmDialog from '../ConfirmDialog';
import EmptyState from '../EmptyState';

const RecommendedManager: React.FC = () => {
  const { showToast } = useAdmin();
  const [items, setItems] = useState<RecommendedProduct[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; sku: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<RecommendedProduct | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [rRes, pRes] = await Promise.all([
        homepageService.getRecommended(),
        adminService.getProducts({ page_size: 200, status: 'active' }),
      ]);
      if (rRes.success && rRes.data) setItems(rRes.data);
      if (pRes.success && pRes.data) setProducts(pRes.data as any[]);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const addProduct = async () => {
    if (!selectedProduct) return;
    try {
      await homepageService.createRecommended({ product: selectedProduct, sort_order: items.length, is_visible: true });
      showToast({ variant: 'success', title: 'Added to Recommended' });
      setAdding(false); setSelectedProduct(''); load();
    } catch { showToast({ variant: 'error', title: 'Failed to add' }); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await homepageService.deleteRecommended(deleteTarget.id);
    showToast({ variant: 'success', title: 'Removed' }); setDeleteTarget(null); load();
  };

  const toggleVisible = async (item: RecommendedProduct) => {
    await homepageService.updateRecommended(item.id, { is_visible: !item.is_visible }); load();
  };

  if (loading) return <LoadingOverlay message="Loading…" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} recommended product{items.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { setAdding(true); setSelectedProduct(''); }} className="flex items-center gap-2 px-4 py-2 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56]">
          <Plus className="w-4 h-4" />Add Product
        </button>
      </div>

      {/* Add product row */}
      {adding && (
        <div className="flex items-center gap-3 p-4 bg-[#006670]/5 rounded-xl border border-[#006670]/20">
          <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
            className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30">
            <option value="">— Select product to recommend —</option>
            {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
          </select>
          <button onClick={addProduct} className="px-4 py-2.5 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56]">Add</button>
          <button onClick={() => setAdding(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
        </div>
      )}

      {items.length === 0 && !adding ? (
        <EmptyState
          icon={<Sparkles className="w-10 h-10 text-slate-300" />}
          title="No recommended products"
          description="Add products to the 'Recommended For You' section."
          action={
            <button onClick={() => setAdding(true)} className="mt-4 px-4 py-2 bg-[#006670] text-white rounded-lg text-sm font-semibold">
              Add Product
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 group">
              <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
              <div className="w-12 h-12 bg-slate-200 rounded-xl overflow-hidden flex-shrink-0">
                {item.primary_image
                  ? <img src={item.primary_image} className="w-full h-full object-cover" alt={item.product_name} />
                  : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-slate-400" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{item.product_name}</p>
                <p className="text-xs text-slate-500">{item.brand_name} · SKU: {item.product_sku}</p>
                {item.is_featured && <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full mt-0.5">Featured</span>}
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => toggleVisible(item)} className={`p-1.5 rounded-lg ${item.is_visible ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                  {item.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteTarget} title="Remove Product" message={`Remove "${deleteTarget?.product_name}" from Recommended For You?`}
        confirmLabel="Remove" variant="danger" onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </div>
  );
};

export default RecommendedManager;
