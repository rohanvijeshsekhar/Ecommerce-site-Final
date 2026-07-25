import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, GripVertical, Eye, EyeOff, X, Save, Tag } from 'lucide-react';
import { homepageService, adminService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';
import type { HomepageCategory } from '../../types/admin';
import LoadingOverlay from '../LoadingOverlay';
import ConfirmDialog from '../ConfirmDialog';
import EmptyState from '../EmptyState';
import ImageUploader from '../ImageUploader';

const ICON_OPTIONS = [
  { key: 'handpiece', label: 'Handpiece' },
  { key: 'imaging', label: 'Imaging' },
  { key: 'instruments', label: 'Instruments' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'materials', label: 'Materials' },
  { key: 'chairs', label: 'Dental Chairs' },
  { key: 'sterilization', label: 'Sterilization' },
  { key: 'endo', label: 'Endodontics' },
  { key: 'implants', label: 'Implants' },
  { key: 'other', label: 'Other' },
];

const autoDetectIconKey = (name: string): string => {
  const s = name.toLowerCase();
  if (s.includes('handpiece') || s.includes('rotary') || s.includes('drill') || s.includes('turbine')) return 'handpiece';
  if (s.includes('imaging') || s.includes('camera') || s.includes('scan') || s.includes('x-ray') || s.includes('xray') || s.includes('sensor')) return 'imaging';
  if (s.includes('instrument') || s.includes('scaler') || s.includes('forceps') || s.includes('pliers') || s.includes('elevator') || s.includes('mirror')) return 'instruments';
  if (s.includes('equipment') || s.includes('compressor') || s.includes('suction') || s.includes('unit') || s.includes('motor')) return 'equipment';
  if (s.includes('material') || s.includes('composite') || s.includes('cement') || s.includes('impression') || s.includes('resin')) return 'materials';
  if (s.includes('chair') || s.includes('seating') || s.includes('stool')) return 'chairs';
  if (s.includes('steriliz') || s.includes('autoclave') || s.includes('clean') || s.includes('pouch') || s.includes('disinfect')) return 'sterilization';
  if (s.includes('endo') || s.includes('canal') || s.includes('file') || s.includes('gutta')) return 'endo';
  if (s.includes('implant') || s.includes('prosthetic') || s.includes('abutment')) return 'implants';
  if (s.includes('iphone') || s.includes('phone') || s.includes('mobile') || s.includes('apple')) return 'phone';
  return 'other';
};

const BLANK_FORM = {
  category: '',
  title_override: '',
  icon_key: 'other',
  is_visible: true,
  card_image: null as File | string | null,
};

const CategoryShowcaseManager: React.FC = () => {
  const { showToast } = useAdmin();
  const [items, setItems] = useState<HomepageCategory[]>([]);
  const [dropdown, setDropdown] = useState<{ id: string; name: string; full_path: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<HomepageCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HomepageCategory | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });

  const load = async () => {
    setLoading(true);
    try {
      const [catRes, ddRes] = await Promise.all([
        homepageService.getHomepageCategories(),
        adminService.getCategoriesDropdown(),
      ]);
      if (catRes.success && catRes.data) setItems(catRes.data);
      if (ddRes.success && ddRes.data) setDropdown(ddRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditItem(null); setForm({ ...BLANK_FORM }); setShowForm(true); };
  const openEdit = (item: HomepageCategory) => {
    setEditItem(item);
    setForm({
      category: item.category,
      title_override: item.display_title === item.category_name ? '' : item.display_title,
      icon_key: item.icon_key || 'other',
      is_visible: item.is_visible,
      card_image: item.card_image_url || null,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.category) { showToast({ variant: 'error', title: 'Please select a category' }); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('category', form.category);
      fd.append('title_override', form.title_override);
      fd.append('icon_key', form.icon_key);
      fd.append('is_visible', String(form.is_visible));
      if (form.card_image instanceof File) {
        fd.append('card_image', form.card_image);
      } else if (form.card_image === null) {
        fd.append('card_image', ''); // Clear override
      }
      const res = editItem
        ? await homepageService.updateHomepageCategory(editItem.id, fd)
        : await homepageService.createHomepageCategory(fd);
      if (res.success) { showToast({ variant: 'success', title: editItem ? 'Updated' : 'Created' }); setShowForm(false); load(); }
    } catch { showToast({ variant: 'error', title: 'Save failed' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await homepageService.deleteHomepageCategory(deleteTarget.id);
    showToast({ variant: 'success', title: 'Removed' });
    setDeleteTarget(null); load();
  };

  const toggleVisible = async (item: HomepageCategory) => {
    const fd = new FormData(); fd.append('is_visible', String(!item.is_visible));
    await homepageService.updateHomepageCategory(item.id, fd); load();
  };

  if (loading) return <LoadingOverlay message="Loading…" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} categor{items.length !== 1 ? 'ies' : 'y'} on homepage</p>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56] transition-colors">
          <Plus className="w-4 h-4" />Add Category
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Tag className="w-10 h-10 text-slate-300" />}
          title="No categories shown"
          description="Add categories to the 'Shop By Category' section."
          action={
            <button onClick={openCreate} className="mt-4 px-4 py-2 bg-[#006670] text-white rounded-lg text-sm font-semibold">
              Add Category
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 group">
              <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
              <div className="w-14 h-14 bg-slate-200 rounded-xl overflow-hidden flex-shrink-0">
                {item.card_image_url
                  ? <img src={item.card_image_url} className="w-full h-full object-cover" alt={item.display_title} />
                  : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">{item.icon_key}</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{item.display_title}</p>
                <p className="text-xs text-slate-500">{item.category_name}</p>
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded-full text-slate-500">{item.icon_key}</span>
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
              <h3 className="text-base font-bold text-slate-800">{editItem ? 'Edit Category' : 'Add Category'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Category picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Catalogue Category *</label>
                <select value={form.category} onChange={e => {
                  const catId = e.target.value;
                  const selectedCat = dropdown.find(d => d.id === catId);
                  const detectedIcon = selectedCat ? autoDetectIconKey(selectedCat.name) : form.icon_key;
                  setForm(f => ({ ...f, category: catId, icon_key: detectedIcon }));
                }}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30">
                  <option value="">— Select a category —</option>
                  {dropdown.map(d => <option key={d.id} value={d.id}>{d.full_path}</option>)}
                </select>
              </div>
              {/* Card image */}
              <div>
                <ImageUploader
                  label="Card Image"
                  aspectRatio={280 / 250}
                  currentUrl={form.card_image instanceof File ? URL.createObjectURL(form.card_image) : form.card_image}
                  onUpload={(file) => setForm(f => ({ ...f, card_image: file }))}
                  onRemove={() => setForm(f => ({ ...f, card_image: null }))}
                />
              </div>
              {/* Title override */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Display Title (optional override)</label>
                <input type="text" value={form.title_override} onChange={e => setForm(f => ({ ...f, title_override: e.target.value }))}
                  placeholder="Leave blank to use category name"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30" />
              </div>
              {/* Icon key */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Icon</label>
                <select value={form.icon_key} onChange={e => setForm(f => ({ ...f, icon_key: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30">
                  {ICON_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>
              {/* Visible */}
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

      <ConfirmDialog isOpen={!!deleteTarget} title="Remove Category" message={`Remove "${deleteTarget?.display_title}" from homepage?`}
        confirmLabel="Remove" variant="danger" onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </div>
  );
};

export default CategoryShowcaseManager;
