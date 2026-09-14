import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, GripVertical, Eye, EyeOff, X, Save, Monitor, Image, Megaphone, Sparkles, ExternalLink, Check } from 'lucide-react';
import { homepageService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';
import type { HeroSlide, HomepagePromoBanner } from '../../types/admin';
import LoadingOverlay from '../LoadingOverlay';
import ConfirmDialog from '../ConfirmDialog';
import EmptyState from '../EmptyState';
import ImageUploader from '../ImageUploader';

// ─────────────────────────────────────────────────────────────────────────────
// HeroManager – CRUD for homepage promo banner & hero slides
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

  // Promo Banner state
  const [promoForm, setPromoForm] = useState({
    title: 'FAAZO SUPER DEALS ARE LIVE:',
    subtitle: 'UP TO 50% OFF + EXTRA 10% OFF ON PREMIUM DENTAL BRANDS',
    link_url: '',
    is_active: true,
  });
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoSaved, setPromoSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [heroRes, promoRes] = await Promise.all([
        homepageService.getHeroSlides(),
        homepageService.getPromoBanner(),
      ]);
      if (heroRes.success && heroRes.data) setSlides(heroRes.data);
      if (promoRes.success && promoRes.data) {
        setPromoForm({
          title: promoRes.data.title || '',
          subtitle: promoRes.data.subtitle || '',
          link_url: promoRes.data.link_url || '',
          is_active: promoRes.data.is_active !== undefined ? promoRes.data.is_active : true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSavePromo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingPromo(true);
    setPromoSaved(false);
    try {
      const res = await homepageService.updatePromoBanner(promoForm);
      if (res.success) {
        setPromoSaved(true);
        setTimeout(() => setPromoSaved(false), 3500);
        showToast({ variant: 'success', title: 'Promo banner updated', message: 'Homepage top announcement is now live.' });
      } else {
        showToast({ variant: 'error', title: 'Update failed', message: res.message || 'Please try again.' });
      }
    } catch {
      showToast({ variant: 'error', title: 'Update failed', message: 'Failed to save announcement banner.' });
    } finally {
      setSavingPromo(false);
    }
  };

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

  if (loading) return <LoadingOverlay message="Loading hero & banner settings…" />;

  return (
    <div className="space-y-8">
      {/* ── Top Promo / Announcement Banner Section ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#006670]/10 flex items-center justify-center text-[#006670]">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Top Announcement / Promo Strip</h2>
              <p className="text-xs text-slate-500">The highlighted promotional banner displayed right above the hero carousel on the storefront.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${promoForm.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${promoForm.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {promoForm.is_active ? 'Live on Storefront' : 'Hidden'}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Live Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Live Storefront Preview
              </span>
              <span className="text-slate-400 font-normal">Real-time preview of headline & offer</span>
            </div>

            <div className={`w-full bg-gradient-to-r from-[#005F63] via-[#0B7C80] to-[#005F63] text-white text-center py-3 px-4 flex flex-col items-center justify-center rounded-xl border border-teal-700 shadow-inner transition-opacity ${!promoForm.is_active ? 'opacity-40 grayscale-[50%]' : ''}`}>
              <span className="text-[10px] md:text-[11px] font-bold tracking-widest text-teal-100/90 uppercase mb-0.5 font-sans">
                {promoForm.title || '(Enter tagline above)'}
              </span>
              <span className="text-[12px] md:text-[14px] font-extrabold tracking-wide uppercase font-sans">
                {promoForm.subtitle || '(Enter main promotion text)'}
              </span>
            </div>
            {!promoForm.is_active && (
              <p className="text-[11px] text-amber-600 italic">Notice: Banner is currently set to hidden and will not be displayed to customers.</p>
            )}
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSavePromo} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Top Tagline / Accent Text
                </label>
                <input
                  type="text"
                  value={promoForm.title}
                  onChange={(e) => {
                    setPromoSaved(false);
                    setPromoForm(prev => ({ ...prev, title: e.target.value }));
                  }}
                  placeholder="e.g. FAAZO SUPER DEALS ARE LIVE:"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30 focus:border-[#006670] transition-all"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Displayed in light teal small capital letters above the main offer.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Main Offer / Subtitle
                </label>
                <input
                  type="text"
                  value={promoForm.subtitle}
                  onChange={(e) => {
                    setPromoSaved(false);
                    setPromoForm(prev => ({ ...prev, subtitle: e.target.value }));
                  }}
                  placeholder="e.g. UP TO 50% OFF + EXTRA 10% OFF ON PREMIUM DENTAL BRANDS"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30 focus:border-[#006670] transition-all font-medium"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Main promotional message in bold capital letters.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Click URL / Destination (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={promoForm.link_url}
                    onChange={(e) => {
                      setPromoSaved(false);
                      setPromoForm(prev => ({ ...prev, link_url: e.target.value }));
                    }}
                    placeholder="e.g. /products or /special-offers"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30 focus:border-[#006670] transition-all"
                  />
                  <ExternalLink className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Optional link: clicking the announcement will redirect users here.</span>
              </div>

              <div className="flex items-center justify-between pt-4 md:pt-0">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={promoForm.is_active}
                    onChange={(e) => {
                      setPromoSaved(false);
                      setPromoForm(prev => ({ ...prev, is_active: e.target.checked }));
                    }}
                    className="w-4 h-4 text-[#006670] rounded border-slate-300 focus:ring-[#006670]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Enable Promo Banner</span>
                    <span className="text-[11px] text-slate-500">Uncheck to hide the top strip without deleting the copy</span>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={savingPromo}
                  className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 ${
                    promoSaved
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/30'
                      : 'bg-[#006670] hover:bg-[#004e56] text-white'
                  }`}
                >
                  {savingPromo ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : promoSaved ? (
                    <>
                      <Check className="w-4 h-4 text-white stroke-[2.5]" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Banner</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Hero Slides Section ── */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Hero Carousel Slides</h2>
            <p className="text-xs text-slate-500">Manage background slides, typography, and call-to-actions on the main carousel.</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#006670] text-white text-sm font-semibold rounded-lg hover:bg-[#004e56] transition-colors shadow-sm"
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
      </div>

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
