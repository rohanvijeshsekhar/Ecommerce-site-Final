import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, GripVertical, Eye, EyeOff, X, Save, Monitor, Image } from 'lucide-react';
import { homepageService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';
import type { HeroSlide } from '../../types/admin';
import LoadingOverlay from '../LoadingOverlay';
import ConfirmDialog from '../ConfirmDialog';
import EmptyState from '../EmptyState';
import ImageUploader from '../ImageUploader';

// ─────────────────────────────────────────────────────────────────────────────
// HeroManager – CRUD for homepage hero slides
// ─────────────────────────────────────────────────────────────────────────────

const BLANK_FORM = {
  heading: '',
  subheading: '',
  cta_text: 'Explore Products',
  cta_link: '#products',
  is_active: true,
  desktop_image: null as File | string | null,
  mobile_image: null as File | string | null,
};

const HeroManager: React.FC = () => {
  const { showToast } = useAdmin();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editSlide, setEditSlide] = useState<HeroSlide | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HeroSlide | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });

  const load = async () => {
    setLoading(true);
    try {
      const res = await homepageService.getHeroSlides();
      if (res.success && res.data) setSlides(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditSlide(null);
    setForm({ ...BLANK_FORM });
    setShowForm(true);
  };

  const openEdit = (slide: HeroSlide) => {
    setEditSlide(slide);
    setForm({
      heading: slide.heading,
      subheading: slide.subheading,
      cta_text: slide.cta_text,
      cta_link: slide.cta_link,
      is_active: slide.is_active,
      desktop_image: slide.desktop_image_url || null,
      mobile_image: slide.mobile_image_url || null,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('heading', form.heading);
      fd.append('subheading', form.subheading);
      fd.append('cta_text', form.cta_text);
      fd.append('cta_link', form.cta_link);
      fd.append('is_active', String(form.is_active));
      if (form.desktop_image instanceof File) {
        fd.append('desktop_image', form.desktop_image);
      } else if (form.desktop_image === null) {
        fd.append('desktop_image', ''); // Clear image
      }

      if (form.mobile_image instanceof File) {
        fd.append('mobile_image', form.mobile_image);
      } else if (form.mobile_image === null) {
        fd.append('mobile_image', ''); // Clear image
      }

      const res = editSlide
        ? await homepageService.updateHeroSlide(editSlide.id, fd)
        : await homepageService.createHeroSlide(fd);

      if (res.success) {
        showToast({ variant: 'success', title: editSlide ? 'Slide updated' : 'Slide created' });
        setShowForm(false);
        load();
      }
    } catch {
      showToast({ variant: 'error', title: 'Save failed', message: 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await homepageService.deleteHeroSlide(deleteTarget.id);
      showToast({ variant: 'success', title: 'Slide deleted' });
      setDeleteTarget(null);
      load();
    } catch {
      showToast({ variant: 'error', title: 'Delete failed' });
    }
  };

  const toggleActive = async (slide: HeroSlide) => {
    const fd = new FormData();
    fd.append('is_active', String(!slide.is_active));
    await homepageService.updateHeroSlide(slide.id, fd);
    load();
  };

  if (loading) return <LoadingOverlay message="Loading hero slides…" />;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {slides.length} slide{slides.length !== 1 ? 's' : ''} configured
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Slide
        </button>
      </div>

      {/* Slides List */}
      {slides.length === 0 ? (
        <EmptyState
          icon={<Image className="w-10 h-10 text-slate-300" />}
          title="No hero slides"
          description="Add your first hero slide to display on the homepage carousel."
          action={
            <button onClick={openCreate} className="px-4 py-2 bg-[#006670] text-white rounded-lg text-sm font-semibold hover:bg-[#004e56]">
              Add Slide
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 group"
            >
              <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />

              {/* Desktop preview */}
              <div className="w-20 h-12 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                {slide.desktop_image_url ? (
                  <img src={slide.desktop_image_url} alt={slide.heading} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{slide.heading || '(no heading)'}</p>
                <p className="text-xs text-slate-500 truncate">{slide.subheading}</p>
                <p className="text-xs text-[#006670] mt-0.5">{slide.cta_text} → {slide.cta_link}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => toggleActive(slide)}
                  className={`p-1.5 rounded-lg transition-colors ${slide.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                  title={slide.is_active ? 'Hide' : 'Show'}
                >
                  {slide.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => openEdit(slide)}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(slide)}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide Form Panel */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-800">
                {editSlide ? 'Edit Slide' : 'Add Hero Slide'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Images */}
              <div className="grid grid-cols-2 gap-4">
                {/* Desktop Image */}
                <ImageUploader
                  label="Desktop Image"
                  aspectRatio={3}
                  currentUrl={form.desktop_image instanceof File ? URL.createObjectURL(form.desktop_image) : form.desktop_image}
                  onUpload={(file) => setForm(f => ({ ...f, desktop_image: file }))}
                  onRemove={() => setForm(f => ({ ...f, desktop_image: null }))}
                />

                {/* Mobile Image */}
                <ImageUploader
                  label="Mobile Image"
                  aspectRatio={3 / 3.7}
                  currentUrl={form.mobile_image instanceof File ? URL.createObjectURL(form.mobile_image) : form.mobile_image}
                  onUpload={(file) => setForm(f => ({ ...f, mobile_image: file }))}
                  onRemove={() => setForm(f => ({ ...f, mobile_image: null }))}
                />
              </div>

              {/* Heading */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Heading</label>
                <input
                  type="text"
                  value={form.heading}
                  onChange={e => setForm(f => ({ ...f, heading: e.target.value }))}
                  placeholder="e.g. Precision Performance Perfection"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30 focus:border-[#006670]"
                />
              </div>

              {/* Subheading */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Sub Heading</label>
                <input
                  type="text"
                  value={form.subheading}
                  onChange={e => setForm(f => ({ ...f, subheading: e.target.value }))}
                  placeholder="Supporting text"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30 focus:border-[#006670]"
                />
              </div>

              {/* CTA */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">CTA Button Text</label>
                  <input
                    type="text"
                    value={form.cta_text}
                    onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30 focus:border-[#006670]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">CTA Link</label>
                  <input
                    type="text"
                    value={form.cta_link}
                    onChange={e => setForm(f => ({ ...f, cta_link: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30 focus:border-[#006670]"
                  />
                </div>
              </div>

              {/* Active */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-[#006670]' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm font-medium text-slate-700">Active (visible on homepage)</span>
              </label>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56] disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Slide'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Slide"
        message={`Delete "${deleteTarget?.heading || 'this slide'}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default HeroManager;
