import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, GripVertical, Eye, EyeOff, X, Save, Star, MessageSquare } from 'lucide-react';
import { homepageService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';
import type { Testimonial } from '../../types/admin';
import LoadingOverlay from '../LoadingOverlay';
import ConfirmDialog from '../ConfirmDialog';
import EmptyState from '../EmptyState';
import ImageUploader from '../ImageUploader';

const BLANK = { customer_name: '', clinic_name: '', photo_url: '', rating: 5, review: '', sort_order: 0, is_active: true, photo: null as File | string | null };

const TestimonialsManager: React.FC = () => {
  const { showToast } = useAdmin();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Testimonial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null);
  const [form, setForm] = useState({ ...BLANK });

  const load = async () => { setLoading(true); try { const r = await homepageService.getTestimonials(); if (r.success && r.data) setItems(r.data); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditItem(null); setForm({ ...BLANK }); setShowForm(true); };
  const openEdit = (item: Testimonial) => {
    setEditItem(item);
    setForm({
      customer_name: item.customer_name,
      clinic_name: item.clinic_name,
      photo_url: item.photo_url ?? '',
      rating: item.rating,
      review: item.review,
      sort_order: item.sort_order,
      is_active: item.is_active,
      photo: item.photo_url || null,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.customer_name || !form.review) { showToast({ variant: 'error', title: 'Name and review are required' }); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('customer_name', form.customer_name);
      fd.append('clinic_name', form.clinic_name);
      fd.append('photo_url', form.photo_url);
      fd.append('rating', String(form.rating));
      fd.append('review', form.review);
      fd.append('is_active', String(form.is_active));
      if (form.photo instanceof File) {
        fd.append('photo', form.photo);
      } else if (form.photo === null) {
        fd.append('photo', ''); // Clear photo
      }
      const res = editItem ? await homepageService.updateTestimonial(editItem.id, fd) : await homepageService.createTestimonial(fd);
      if (res.success) { showToast({ variant: 'success', title: editItem ? 'Updated' : 'Added' }); setShowForm(false); load(); }
    } catch { showToast({ variant: 'error', title: 'Save failed' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => { if (!deleteTarget) return; await homepageService.deleteTestimonial(deleteTarget.id); showToast({ variant: 'success', title: 'Deleted' }); setDeleteTarget(null); load(); };
  const toggleActive = async (item: Testimonial) => { const fd = new FormData(); fd.append('is_active', String(!item.is_active)); await homepageService.updateTestimonial(item.id, fd); load(); };

  if (loading) return <LoadingOverlay message="Loading…" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} testimonial{items.length !== 1 ? 's' : ''}</p>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56]">
          <Plus className="w-4 h-4" />Add Testimonial
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-10 h-10 text-slate-300" />}
          title="No testimonials"
          description="Add customer reviews to the testimonial slider."
          action={
            <button onClick={openCreate} className="mt-4 px-4 py-2 bg-[#006670] text-white rounded-lg text-sm font-semibold">
              Add Testimonial
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 group">
              <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
              <div className="w-11 h-11 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                {item.photo_url ? <img src={item.photo_url} className="w-full h-full object-cover" alt={item.customer_name} /> : <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-sm">{item.customer_name[0]}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{item.customer_name}</p>
                <p className="text-xs text-slate-500">{item.clinic_name}</p>
                <div className="flex gap-0.5 mt-0.5">{Array.from({ length: item.rating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}</div>
              </div>
              <p className="text-xs text-slate-500 hidden md:block max-w-[200px] truncate">"{item.review}"</p>
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
              <h3 className="text-base font-bold">{editItem ? 'Edit Testimonial' : 'Add Testimonial'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Photo */}
              <div className="flex items-start gap-4">
                <ImageUploader
                  label="Photo"
                  aspectRatio={1}
                  className="flex-shrink-0"
                  currentUrl={form.photo instanceof File ? URL.createObjectURL(form.photo) : form.photo}
                  onUpload={(file) => setForm(f => ({ ...f, photo: file }))}
                  onRemove={() => setForm(f => ({ ...f, photo: null }))}
                />
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Photo URL (alternative)</label>
                    <input type="url" value={form.photo_url} onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))}
                      placeholder="https://…" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Customer Name *</label>
                  <input type="text" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Dr. Name" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Clinic Name</label>
                  <input type="text" value={form.clinic_name} onChange={e => setForm(f => ({ ...f, clinic_name: e.target.value }))} placeholder="Clinic, City" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30" />
                </div>
              </div>
              {/* Rating */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Rating</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setForm(f => ({ ...f, rating: n }))} className={`p-1 rounded transition-colors ${form.rating >= n ? 'text-amber-400' : 'text-slate-300'}`}>
                      <Star className={`w-6 h-6 ${form.rating >= n ? 'fill-amber-400' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Review *</label>
                <textarea value={form.review} onChange={e => setForm(f => ({ ...f, review: e.target.value }))} rows={3} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30 resize-none" placeholder="Customer review text…" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-[#006670]' : 'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm font-medium text-slate-700">Active (show in slider)</span>
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
      <ConfirmDialog isOpen={!!deleteTarget} title="Delete Testimonial" message={`Delete testimonial from "${deleteTarget?.customer_name}"?`}
        confirmLabel="Delete" variant="danger" onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </div>
  );
};

export default TestimonialsManager;
