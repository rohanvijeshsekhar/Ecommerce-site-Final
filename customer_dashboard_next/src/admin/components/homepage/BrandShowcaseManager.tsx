import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Eye, EyeOff, X, Save, Award } from 'lucide-react';
import { homepageService, adminService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';
import type { HomepageBrand } from '../../types/admin';
import LoadingOverlay from '../LoadingOverlay';
import ConfirmDialog from '../ConfirmDialog';
import EmptyState from '../EmptyState';

const BrandShowcaseManager: React.FC = () => {
  const { showToast } = useAdmin();
  const [items, setItems] = useState<HomepageBrand[]>([]);
  const [dropdown, setDropdown] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<HomepageBrand | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HomepageBrand | null>(null);
  const [form, setForm] = useState({ brand: '', is_visible: true });

  const load = async () => {
    setLoading(true);
    try {
      const [bRes, ddRes] = await Promise.all([homepageService.getHomepageBrands(), adminService.getBrandsDropdown()]);
      if (bRes.success && bRes.data) setItems(bRes.data);
      if (ddRes.success && ddRes.data) setDropdown(ddRes.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditItem(null); setForm({ brand: '', is_visible: true }); setShowForm(true); };
  const openEdit = (item: HomepageBrand) => {
    setEditItem(item);
    setForm({
      brand: item.brand,
      is_visible: item.is_visible,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.brand) { showToast({ variant: 'error', title: 'Please select a brand' }); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('brand', form.brand);
      fd.append('is_visible', String(form.is_visible));
      const res = editItem ? await homepageService.updateHomepageBrand(editItem.id, fd) : await homepageService.createHomepageBrand(fd);
      if (res.success) { showToast({ variant: 'success', title: editItem ? 'Updated' : 'Created' }); setShowForm(false); load(); }
    } catch { showToast({ variant: 'error', title: 'Save failed' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await homepageService.deleteHomepageBrand(deleteTarget.id);
    showToast({ variant: 'success', title: 'Removed' }); setDeleteTarget(null); load();
  };

  const toggleVisible = async (item: HomepageBrand) => {
    const fd = new FormData(); fd.append('is_visible', String(!item.is_visible));
    await homepageService.updateHomepageBrand(item.id, fd); load();
  };

  if (loading) return <LoadingOverlay message="Loading…" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} brand{items.length !== 1 ? 's' : ''} in the ticker</p>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56] transition-colors">
          <Plus className="w-4 h-4" />Add Brand
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Award className="w-10 h-10 text-slate-300" />}
          title="No brands shown"
          description="Add brands to the 'Trusted by Leading Global Brands' ticker."
          action={
            <button onClick={openCreate} className="mt-4 px-4 py-2 bg-[#006670] text-white rounded-lg text-sm font-semibold hover:bg-[#004e56] transition-colors">
              Add Brand
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-200 transition-all duration-200 group shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-10 h-10 rounded-lg bg-[#006670]/10 flex items-center justify-center flex-shrink-0 border border-[#006670]/15">
                  <Award className="w-5 h-5 text-[#006670]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate" title={item.brand_name}>
                    {item.brand_name}
                  </p>
                  <span className={`inline-flex items-center text-[11px] font-semibold ${item.is_visible ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {item.is_visible ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => toggleVisible(item)}
                  title={item.is_visible ? 'Hide from homepage' : 'Show on homepage'}
                  className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${item.is_visible ? 'text-emerald-600' : 'text-slate-400'}`}
                >
                  {item.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => openEdit(item)}
                  title="Edit brand"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(item)}
                  title="Remove from homepage"
                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">{editItem ? 'Edit Brand' : 'Add Brand'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Brand *</label>
                <select
                  value={form.brand}
                  disabled={!!editItem}
                  onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006670]/30 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">— Select a brand —</option>
                  {(editItem ? dropdown : dropdown.filter(d => !items.some(it => it.brand === d.id))).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {!editItem && dropdown.filter(d => !items.some(it => it.brand === d.id)).length === 0 && (
                  <p className="text-xs text-amber-600 mt-1.5">All catalog brands are already showcased on the homepage.</p>
                )}
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setForm(f => ({ ...f, is_visible: !f.is_visible }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.is_visible ? 'bg-[#006670]' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_visible ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm font-medium text-slate-700">Visible on homepage</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56] disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog isOpen={!!deleteTarget} title="Remove Brand" message={`Remove "${deleteTarget?.brand_name}" from homepage?`}
        confirmLabel="Remove" variant="danger" onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </div>
  );
};

export default BrandShowcaseManager;
