import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp, Eye, EyeOff, X, Save, Package, Layers } from 'lucide-react';
import { homepageService, adminService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';
import type { FeaturedCollection, FeaturedCollectionItem } from '../../types/admin';
import LoadingOverlay from '../LoadingOverlay';
import ConfirmDialog from '../ConfirmDialog';
import EmptyState from '../EmptyState';
import ImageUploader from '../ImageUploader';

const FeaturedCollectionsManager: React.FC = () => {
  const { showToast } = useAdmin();
  const [collections, setCollections] = useState<FeaturedCollection[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; sku: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCollForm, setShowCollForm] = useState(false);
  const [editColl, setEditColl] = useState<FeaturedCollection | null>(null);
  const [deleteColl, setDeleteColl] = useState<FeaturedCollection | null>(null);
  const [deleteItem, setDeleteItem] = useState<FeaturedCollectionItem | null>(null);
  const [addingProductTo, setAddingProductTo] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [collForm, setCollForm] = useState<{
    title: string;
    description: string;
    is_visible: boolean;
    image: File | string | null;
  }>({ title: '', description: '', is_visible: true, image: null });

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        homepageService.getFeaturedCollections(),
        adminService.getProducts({ page_size: 200, status: 'active' }),
      ]);
      if (cRes.success && cRes.data) setCollections(cRes.data);
      if (pRes.success && pRes.data) setProducts(pRes.data as any[]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreateColl = () => {
    setEditColl(null);
    setCollForm({ title: '', description: '', is_visible: true, image: null });
    setShowCollForm(true);
  };
  
  const openEditColl = (c: FeaturedCollection) => {
    setEditColl(c);
    setCollForm({
      title: c.title,
      description: c.description,
      is_visible: c.is_visible,
      image: c.image_url || c.image || null,
    });
    setShowCollForm(true);
  };

  const saveColl = async () => {
    if (!collForm.title.trim()) { showToast({ variant: 'error', title: 'Title is required' }); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', collForm.title.trim());
      fd.append('description', collForm.description);
      fd.append('is_visible', String(collForm.is_visible));
      if (collForm.image instanceof File) {
        fd.append('image', collForm.image);
      } else if (collForm.image === null) {
        fd.append('image', ''); // Explicitly clear image in backend
      }
      const res = editColl
        ? await homepageService.updateFeaturedCollection(editColl.id, fd)
        : await homepageService.createFeaturedCollection(fd);
      if (res.success) {
        showToast({ variant: 'success', title: editColl ? 'Updated' : 'Collection created' });
        setShowCollForm(false);
        load();
      }
    } catch {
      showToast({ variant: 'error', title: 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteColl = async () => {
    if (!deleteColl) return;
    await homepageService.deleteFeaturedCollection(deleteColl.id);
    showToast({ variant: 'success', title: 'Collection deleted' }); setDeleteColl(null); load();
  };

  const addItem = async (collectionId: string) => {
    if (!selectedProduct) return;
    await homepageService.createCollectionItem({ collection: collectionId, product: selectedProduct, sort_order: 0 });
    showToast({ variant: 'success', title: 'Product added' }); setAddingProductTo(null); setSelectedProduct(''); load();
  };

  const removeItem = async () => {
    if (!deleteItem) return;
    await homepageService.deleteCollectionItem(deleteItem.id);
    showToast({ variant: 'success', title: 'Product removed' }); setDeleteItem(null); load();
  };

  const toggleVisible = async (c: FeaturedCollection) => {
    await homepageService.updateFeaturedCollection(c.id, { ...c, is_visible: !c.is_visible }); load();
  };

  if (loading) return <LoadingOverlay message="Loading…" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{collections.length} collection{collections.length !== 1 ? 's' : ''}</p>
        <button onClick={openCreateColl} className="flex items-center gap-2 px-4 py-2 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56]">
          <Plus className="w-4 h-4" />New Collection
        </button>
      </div>

      {collections.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-10 h-10 text-slate-300" />}
          title="No collections"
          description="Create featured collections to showcase curated product groups."
          action={
            <button onClick={openCreateColl} className="mt-4 px-4 py-2 bg-[#006670] text-white rounded-lg text-sm font-semibold">
              New Collection
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {collections.map((coll) => (
            <div key={coll.id} className="border border-slate-200 rounded-xl overflow-hidden">
              {/* Collection Header */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 cursor-pointer hover:bg-slate-100/70 transition-colors" onClick={() => setExpanded(expanded === coll.id ? null : coll.id)}>
                {/* Thumbnail */}
                <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {coll.image_url || coll.image ? (
                    <img src={coll.image_url || coll.image || ''} className="w-full h-full object-cover" alt={coll.title} />
                  ) : (
                    <Layers className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <p className="font-semibold text-slate-800 text-sm truncate">{coll.title}</p>
                    {coll.is_visible ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Active on Homepage
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-200/70 text-slate-500">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{coll.items.length} product{coll.items.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={e => { e.stopPropagation(); toggleVisible(coll); }}
                    title={coll.is_visible ? "Active on homepage (click to deactivate)" : "Set as Active on Homepage"}
                    className={`p-2 rounded-lg transition-all ${coll.is_visible ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300' : 'text-slate-400 hover:bg-slate-200/70'}`}
                  >
                    {coll.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={e => { e.stopPropagation(); openEditColl(coll); }} title="Edit collection" className="p-2 rounded-lg text-slate-600 hover:bg-slate-200/70"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={e => { e.stopPropagation(); setDeleteColl(coll); }} title="Delete collection" className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
                  {expanded === coll.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {/* Expanded Items */}
              {expanded === coll.id && (
                <div className="p-4 space-y-3 border-t border-slate-200">
                  {coll.items.length === 0
                    ? <p className="text-sm text-slate-400 text-center py-4">No products yet — add some below.</p>
                    : coll.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 group">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                          {item.product_image
                            ? <img src={item.product_image} className="w-full h-full object-cover" alt={item.product_name} />
                            : <Package className="w-5 h-5 text-slate-400 m-2.5" />}
                        </div>
                        <span className="flex-1 text-sm font-medium text-slate-700 truncate">{item.product_name}</span>
                        <button onClick={() => setDeleteItem(item)} className="p-1 rounded text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-50 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  }

                  {/* Add Product Row */}
                  {addingProductTo === coll.id ? (
                    <div className="flex items-center gap-2 mt-2">
                      <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30">
                        <option value="">— Select product —</option>
                        {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                      <button onClick={() => addItem(coll.id)} className="px-3 py-2 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56]">Add</button>
                      <button onClick={() => { setAddingProductTo(null); setSelectedProduct(''); }} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setAddingProductTo(coll.id); setSelectedProduct(''); }}
                      className="flex items-center gap-2 text-sm text-[#006670] font-semibold hover:underline mt-1">
                      <Plus className="w-4 h-4" />Add Product
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Collection Form */}
      {showCollForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 flex-shrink-0">
              <h3 className="text-base font-bold">{editColl ? 'Edit Collection' : 'New Collection'}</h3>
              <button onClick={() => setShowCollForm(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Title *</label>
                <input type="text" value={collForm.title} onChange={e => setCollForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. New Arrivals"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
                <textarea value={collForm.description} onChange={e => setCollForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Optional description"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30 resize-none" />
              </div>

              {/* Collection Image */}
              <div>
                <ImageUploader
                  label="Collection Image"
                  aspectRatio={4 / 3}
                  currentUrl={collForm.image instanceof File ? URL.createObjectURL(collForm.image) : collForm.image}
                  onUpload={(file) => setCollForm(f => ({ ...f, image: file }))}
                  onRemove={() => setCollForm(f => ({ ...f, image: null }))}
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 transition-colors">
                <div onClick={() => setCollForm(f => ({ ...f, is_visible: !f.is_visible }))}
                  className={`relative w-10 h-5 rounded-full transition-colors mt-0.5 flex-shrink-0 ${collForm.is_visible ? 'bg-[#006670]' : 'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${collForm.is_visible ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-800 block">Featured on Homepage</span>
                  <span className="text-xs text-slate-500 block mt-0.5">Showcase this collection in the homepage Featured Collection section.</span>
                </div>
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 flex-shrink-0">
              <button onClick={() => setShowCollForm(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={saveColl} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56] disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteColl} title="Delete Collection" message={`Delete "${deleteColl?.title}"? All product entries in this collection will also be removed.`}
        confirmLabel="Delete" variant="danger" onConfirm={handleDeleteColl} onClose={() => setDeleteColl(null)} />
      <ConfirmDialog isOpen={!!deleteItem} title="Remove Product" message={`Remove "${deleteItem?.product_name}" from this collection?`}
        confirmLabel="Remove" variant="danger" onConfirm={removeItem} onClose={() => setDeleteItem(null)} />
    </div>
  );
};

export default FeaturedCollectionsManager;
