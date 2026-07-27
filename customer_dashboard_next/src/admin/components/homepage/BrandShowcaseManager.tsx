import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Eye, EyeOff, X, Save, Award } from 'lucide-react';
import { homepageService, adminService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';
import type { HomepageBrand } from '../../types/admin';
import LoadingOverlay from '../LoadingOverlay';
import ConfirmDialog from '../ConfirmDialog';
import EmptyState from '../EmptyState';
import ImageUploader from '../ImageUploader';

const BrandShowcaseManager: React.FC = () => {
  const { showToast } = useAdmin();
  const [items, setItems] = useState<HomepageBrand[]>([]);
  const [dropdown, setDropdown] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<HomepageBrand | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HomepageBrand | null>(null);
  const [form, setForm] = useState({ brand: '', is_visible: true, logo_override: null as File | string | null });

  const load = async () => {
    setLoading(true);
    try {
      const [bRes, ddRes] = await Promise.all([homepageService.getHomepageBrands(), adminService.getBrandsDropdown()]);
      if (bRes.success && bRes.data) setItems(bRes.data);
      if (ddRes.success && ddRes.data) setDropdown(ddRes.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditItem(null); setForm({ brand: '', is_visible: true, logo_override: null }); setShowForm(true); };
  const openEdit = (item: HomepageBrand) => {
    setEditItem(item);
    setForm({
      brand: item.brand,
      is_visible: item.is_visible,
      logo_override: item.logo_url || null,
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
      if (form.logo_override instanceof File) {
        fd.append('logo_override', form.logo_override);
      } else if (form.logo_override === null) {
        fd.append('logo_override', ''); // Clear override
      }
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
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56]">
          <Plus className="w-4 h-4" />Add Brand
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Award className="w-10 h-10 text-slate-300" />}
          title="No brands shown"
          description="Add brands to the 'Trusted by Leading Global Brands' ticker."
          action={
            <button onClick={openCreate} className="mt-4 px-4 py-2 bg-[#006670] text-white rounded-lg text-sm font-semibold">
              Add Brand
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => (
            <div key={item.id} className="relative flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-200 group">
              <div className="w-20 h-12 flex items-center justify-center mb-2">
                {item.logo_url
                  ? <img src={item.logo_url} className="max-w-full max-h-full object-contain" alt={item.brand_name} />
                  : <span className="text-xs text-slate-400 font-bold">{item.brand_name}</span>
                }
              </div>
              <p className="text-xs font-semibold text-slate-700 text-center">{item.brand_name}</p>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => toggleVisible(item)} className={`p-1 rounded ${item.is_visible ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {item.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => openEdit(item)} className="p-1 rounded text-slate-600"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteTarget(item)} className="p-1 rounded text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-base font-bold">{editItem ? 'Edit Brand' : 'Add Brand'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Brand *</label>
                <select value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30">
                  <option value="">— Select a brand —</option>
                  {dropdown.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <ImageUploader
                  label="Logo Override"
                  aspectRatio={5 / 3}
                  currentUrl={form.logo_override instanceof File ? URL.createObjectURL(form.logo_override) : form.logo_override}
                  onUpload={(file) => setForm(f => ({ ...f, logo_override: file }))}
                  onRemove={() => setForm(f => ({ ...f, logo_override: null }))}
                />
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
      <ConfirmDialog isOpen={!!deleteTarget} title="Remove Brand" message={`Remove "${deleteTarget?.brand_name}" from homepage?`}
        confirmLabel="Remove" variant="danger" onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </div>
  );
};

export default BrandShowcaseManager;
