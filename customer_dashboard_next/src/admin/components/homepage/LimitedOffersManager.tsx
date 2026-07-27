import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Eye, EyeOff, X, Save, Calendar, Zap } from 'lucide-react';
import { homepageService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';
import type { LimitedTimeOffer } from '../../types/admin';
import LoadingOverlay from '../LoadingOverlay';
import ConfirmDialog from '../ConfirmDialog';
import EmptyState from '../EmptyState';
import ImageUploader from '../ImageUploader';

const BLANK = { heading: '', description: '', offer_text: '', start_date: '', end_date: '', cta_text: 'Shop Now', cta_link: '', is_active: true, banner_image: null as File | string | null };

const LimitedOffersManager: React.FC = () => {
  const { showToast } = useAdmin();
  const [items, setItems] = useState<LimitedTimeOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<LimitedTimeOffer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LimitedTimeOffer | null>(null);
  const [form, setForm] = useState({ ...BLANK });

  const load = async () => { setLoading(true); try { const r = await homepageService.getOffers(); if (r.success && r.data) setItems(r.data); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditItem(null); setForm({ ...BLANK }); setShowForm(true); };
  const openEdit = (item: LimitedTimeOffer) => {
    setEditItem(item);
    setForm({
      heading: item.heading,
      description: item.description,
      offer_text: item.offer_text,
      start_date: item.start_date?.slice(0, 16) ?? '',
      end_date: item.end_date?.slice(0, 16) ?? '',
      cta_text: item.cta_text,
      cta_link: item.cta_link,
      is_active: item.is_active,
      banner_image: item.banner_image_url || null,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.heading) { showToast({ variant: 'error', title: 'Heading is required' }); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      ['heading', 'description', 'offer_text', 'cta_text', 'cta_link'].forEach(k => fd.append(k, (form as any)[k]));
      if (form.start_date) fd.append('start_date', form.start_date);
      if (form.end_date) fd.append('end_date', form.end_date);
      fd.append('is_active', String(form.is_active));
      if (form.banner_image instanceof File) {
        fd.append('banner_image', form.banner_image);
      } else if (form.banner_image === null) {
        fd.append('banner_image', ''); // Clear banner image
      }
      const res = editItem ? await homepageService.updateOffer(editItem.id, fd) : await homepageService.createOffer(fd);
      if (res.success) { showToast({ variant: 'success', title: editItem ? 'Updated' : 'Created' }); setShowForm(false); load(); }
    } catch { showToast({ variant: 'error', title: 'Save failed' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => { if (!deleteTarget) return; await homepageService.deleteOffer(deleteTarget.id); showToast({ variant: 'success', title: 'Deleted' }); setDeleteTarget(null); load(); };
  const toggleActive = async (item: LimitedTimeOffer) => {
    const fd = new FormData(); fd.append('is_active', String(!item.is_active));
    await homepageService.updateOffer(item.id, fd); load();
  };

  if (loading) return <LoadingOverlay message="Loading…" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} offer{items.length !== 1 ? 's' : ''}</p>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56]">
          <Plus className="w-4 h-4" />Add Offer
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Zap className="w-10 h-10 text-slate-300" />}
          title="No offers"
          description="Create limited-time offer banners for the homepage."
          action={
            <button onClick={openCreate} className="mt-4 px-4 py-2 bg-[#006670] text-white rounded-lg text-sm font-semibold">
              Add Offer
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 group">
              <div className="w-20 h-12 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                {item.banner_image_url ? <img src={item.banner_image_url} className="w-full h-full object-cover" alt={item.heading} /> : <div className="w-full h-full flex items-center justify-center"><Calendar className="w-5 h-5 text-slate-400" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{item.heading}</p>
                {item.offer_text && <span className="inline-block text-[10px] font-black text-[#006670] bg-[#006670]/10 px-2 py-0.5 rounded-full">{item.offer_text}</span>}
                {item.end_date && <p className="text-xs text-slate-400 mt-0.5">Ends: {new Date(item.end_date).toLocaleDateString()}</p>}
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => toggleActive(item)} className={`p-1.5 rounded-lg ${item.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                  {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-base font-bold">{editItem ? 'Edit Offer' : 'Add Limited Time Offer'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <ImageUploader
                  label="Banner Image"
                  aspectRatio={16 / 9}
                  currentUrl={form.banner_image instanceof File ? URL.createObjectURL(form.banner_image) : form.banner_image}
                  onUpload={(file) => setForm(f => ({ ...f, banner_image: file }))}
                  onRemove={() => setForm(f => ({ ...f, banner_image: null }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Heading *</label>
                <input type="text" value={form.heading} onChange={e => setForm(f => ({ ...f, heading: e.target.value }))} placeholder="e.g. Summer Sale" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Offer Text</label>
                <input type="text" value={form.offer_text} onChange={e => setForm(f => ({ ...f, offer_text: e.target.value }))} placeholder="e.g. UP TO 50% OFF" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Start Date</label>
                  <input type="datetime-local" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">End Date</label>
                  <input type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">CTA Text</label>
                  <input type="text" value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">CTA Link</label>
                  <input type="text" value={form.cta_link} onChange={e => setForm(f => ({ ...f, cta_link: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30" />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-[#006670]' : 'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm font-medium text-slate-700">Active</span>
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
      <ConfirmDialog isOpen={!!deleteTarget} title="Delete Offer" message={`Delete "${deleteTarget?.heading}"?`} confirmLabel="Delete" variant="danger" onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </div>
  );
};

export default LimitedOffersManager;
