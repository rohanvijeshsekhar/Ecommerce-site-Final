import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, GripVertical, Eye, EyeOff, X, Save, Compass } from 'lucide-react';
import { homepageService, adminService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';
import type { ExploreSolution } from '../../types/admin';
import LoadingOverlay from '../LoadingOverlay';
import ConfirmDialog from '../ConfirmDialog';
import EmptyState from '../EmptyState';
import ImageUploader from '../ImageUploader';

const ExploreSolutionsManager: React.FC = () => {
  const { showToast } = useAdmin();
  const [items, setItems] = useState<ExploreSolution[]>([]);
  const [dropdown, setDropdown] = useState<{ id: string; name: string; full_path: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ExploreSolution | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExploreSolution | null>(null);
  const [form, setForm] = useState({ category: '', heading: '', is_visible: true, image: null as File | string | null });

  const load = async () => {
    setLoading(true);
    try {
      const [eRes, ddRes] = await Promise.all([homepageService.getExploreSolutions(), adminService.getCategoriesDropdown()]);
      if (eRes.success && eRes.data) setItems(eRes.data);
      if (ddRes.success && ddRes.data) setDropdown(ddRes.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditItem(null); setForm({ category: '', heading: '', is_visible: true, image: null }); setShowForm(true); };
  const openEdit = (item: ExploreSolution) => {
    setEditItem(item);
    setForm({
      category: item.category,
      heading: item.display_heading === item.category_name ? '' : item.display_heading,
      is_visible: item.is_visible,
      image: item.image_url || null,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.category) { showToast({ variant: 'error', title: 'Please select a category' }); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('category', form.category);
      fd.append('heading', form.heading);
      fd.append('is_visible', String(form.is_visible));
      if (form.image instanceof File) {
        fd.append('image', form.image);
      } else if (form.image === null) {
        fd.append('image', ''); // Clear image
      }
      const res = editItem ? await homepageService.updateExploreSolution(editItem.id, fd) : await homepageService.createExploreSolution(fd);
      if (res.success) { showToast({ variant: 'success', title: editItem ? 'Updated' : 'Created' }); setShowForm(false); load(); }
    } catch { showToast({ variant: 'error', title: 'Save failed' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => { if (!deleteTarget) return; await homepageService.deleteExploreSolution(deleteTarget.id); showToast({ variant: 'success', title: 'Removed' }); setDeleteTarget(null); load(); };
  const toggleVisible = async (item: ExploreSolution) => { const fd = new FormData(); fd.append('is_visible', String(!item.is_visible)); await homepageService.updateExploreSolution(item.id, fd); load(); };

  if (loading) return <LoadingOverlay message="Loading…" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} solution card{items.length !== 1 ? 's' : ''}</p>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56]">
          <Plus className="w-4 h-4" />Add Solution
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Compass className="w-10 h-10 text-slate-300" />}
          title="No solutions"
          description="Add solution cards to the 'Explore by Solution' section."
          action={
            <button onClick={openCreate} className="mt-4 px-4 py-2 bg-[#006670] text-white rounded-lg text-sm font-semibold">
              Add Solution
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 group">
              <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
              <div className="w-14 h-14 bg-slate-200 rounded-xl overflow-hidden flex-shrink-0">
                {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" alt={item.display_heading} /> : <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">No img</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{item.display_heading}</p>
                <p className="text-xs text-slate-500">{item.category_name}</p>
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
              <h3 className="text-base font-bold">{editItem ? 'Edit Solution' : 'Add Solution'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30">
                  <option value="">— Select category —</option>
                  {dropdown.map(d => <option key={d.id} value={d.id}>{d.full_path}</option>)}
                </select>
              </div>
              <div>
                <ImageUploader
                  label="Card Image"
                  aspectRatio={280 / 380}
                  currentUrl={form.image instanceof File ? URL.createObjectURL(form.image) : form.image}
                  onUpload={(file) => setForm(f => ({ ...f, image: file }))}
                  onRemove={() => setForm(f => ({ ...f, image: null }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Heading Override</label>
                <input type="text" value={form.heading} onChange={e => setForm(f => ({ ...f, heading: e.target.value }))}
                  placeholder="Leave blank to use category name"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm(f => ({ ...f, is_visible: !f.is_visible }))} className={`relative w-10 h-5 rounded-full transition-colors ${form.is_visible ? 'bg-[#006670]' : 'bg-slate-300'}`}>
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
      <ConfirmDialog isOpen={!!deleteTarget} title="Remove Solution" message={`Remove "${deleteTarget?.display_heading}" from homepage?`}
        confirmLabel="Remove" variant="danger" onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </div>
  );
};

export default ExploreSolutionsManager;
