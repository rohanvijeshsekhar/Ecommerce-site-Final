'use client';

import React, { useState, useEffect } from 'react';
import { Image, Save, Trash2, ToggleLeft, ToggleRight, Plus, AlertCircle, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAdmin } from '../../contexts/AdminContext';
import ImageUploader from '../ImageUploader';
import LoadingOverlay from '../LoadingOverlay';

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  banner_image: string | null;
  banner_image_url: string | null;
  button_text: string;
  button_link: string;
  is_active: boolean;
  updated_at: string;
}

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  button_text: '',
  button_link: '',
  is_active: true,
  banner_image: null as File | string | null,
};

const BestSellerBannerManager: React.FC = () => {
  const { showToast } = useAdmin();
  const [banner, setBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isDirty, setIsDirty] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      let data: Banner | null = null;
      try {
        const res = await api.get('bestsellers/admin/banner/');
        data = res.data?.data ?? null;
      } catch (err: any) {
        if (err?.response?.status === 401) {
          // Unauthenticated fallback — try public storefront banner endpoint
          const pubRes = await api.get('bestsellers/banner/');
          data = pubRes.data?.data?.banner ?? pubRes.data?.banner ?? null;
        } else {
          throw err;
        }
      }
      setBanner(data);
      if (data) {
        setForm({
          title: data.title || '',
          subtitle: data.subtitle || '',
          button_text: data.button_text || '',
          button_link: data.button_link || '',
          is_active: data.is_active ?? true,
          banner_image: data.banner_image_url || null,
        });
      }
      setIsDirty(false);
    } catch {
      // Silently finish loading if no banner is set
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (key: string, value: unknown) => {
    setForm(f => ({ ...f, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title || '');
      fd.append('subtitle', form.subtitle || '');
      fd.append('button_text', form.button_text || '');
      fd.append('button_link', form.button_link || '');
      fd.append('is_active', String(form.is_active));
      if (form.banner_image instanceof File) {
        fd.append('banner_image', form.banner_image);
      }

      let res;
      if (banner) {
        res = await api.patch(`bestsellers/admin/banner/${banner.id}/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('bestsellers/admin/banner/', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (res.data?.success || res.status === 200 || res.status === 201) {
        showToast({ variant: 'success', title: banner ? 'Banner updated' : 'Banner created' });
        setIsDirty(false);
        load();
      } else {
        const errMsg = res.data?.message || 'Save failed';
        showToast({ variant: 'error', title: errMsg });
      }
    } catch (err: any) {
      console.error('Failed to save banner:', err);
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        showToast({ variant: 'error', title: 'Admin session expired. Redirecting to login…' });
        setTimeout(() => {
          window.location.href = '/admin/login';
        }, 1200);
      } else {
        const detail = err?.response?.data?.message || err?.response?.data?.errors?.banner_image?.[0] || err?.message || 'Save failed';
        showToast({ variant: 'error', title: detail });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!banner) return;
    if (!confirm('Delete this banner? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`bestsellers/admin/banner/${banner.id}/`);
      showToast({ variant: 'success', title: 'Banner deleted' });
      setBanner(null);
      setForm({ ...EMPTY_FORM });
      setIsDirty(false);
    } catch {
      showToast({ variant: 'error', title: 'Delete failed' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingOverlay message="Loading banner…" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {banner ? `Last updated: ${new Date(banner.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No banner configured yet'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {banner && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting…' : 'Delete Banner'}
            </button>
          )}

          {isDirty || !banner ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-xs bg-[#006670] text-white hover:bg-[#004e56] active:scale-98"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{banner ? 'Save Changes' : 'Create Banner'}</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-slate-100 border border-slate-200 text-slate-600 cursor-default shadow-2xs"
            >
              <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
              <span>Saved</span>
            </button>
          )}
        </div>
      </div>

      {!banner && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>No banner created yet. Fill in the fields below and click <strong>Create Banner</strong>.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — Image */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Banner Image</label>
            <ImageUploader
              label="Upload Banner (recommended: 1440×420px)"
              aspectRatio={1440 / 420}
              currentUrl={form.banner_image instanceof File ? URL.createObjectURL(form.banner_image) : form.banner_image}
              onUpload={(file) => set('banner_image', file)}
              onRemove={() => set('banner_image', null)}
            />
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
            <button
              type="button"
              onClick={() => set('is_active', !form.is_active)}
              className="focus:outline-none"
            >
              {form.is_active
                ? <ToggleRight className="w-8 h-8 text-[#006670]" />
                : <ToggleLeft className="w-8 h-8 text-slate-300" />
              }
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-700">Show banner on page</p>
              <p className="text-xs text-slate-400">Toggle to enable or disable the banner without deleting it</p>
            </div>
          </label>
        </div>

        {/* Right — Text fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Title <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Our Best Sellers"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subtitle <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              value={form.subtitle}
              onChange={e => set('subtitle', e.target.value)}
              rows={2}
              placeholder="e.g. Most loved products by our customers"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">CTA Button Text <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={form.button_text}
              onChange={e => set('button_text', e.target.value)}
              placeholder="e.g. Shop Now"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">CTA Button Link <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={form.button_link}
              onChange={e => set('button_link', e.target.value)}
              placeholder="e.g. /products or /combos"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006670]/30"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      {(form.banner_image || form.title) && (
        <div className="rounded-xl overflow-hidden border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 px-4 pt-3 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <Image className="w-3.5 h-3.5" /> Preview
          </p>
          <div
            className="relative flex items-center justify-center min-h-[160px] bg-slate-100"
            style={{
              backgroundImage: form.banner_image
                ? `url(${form.banner_image instanceof File ? URL.createObjectURL(form.banner_image) : form.banner_image})`
                : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {(form.title || form.subtitle || form.button_text) && (
              <div className="text-center text-white drop-shadow-lg p-6 space-y-2">
                {form.title && <h2 className="text-2xl font-bold">{form.title}</h2>}
                {form.subtitle && <p className="text-sm opacity-90">{form.subtitle}</p>}
                {form.button_text && (
                  <button className="mt-2 px-5 py-2 bg-white text-slate-900 text-sm font-semibold rounded-full shadow">
                    {form.button_text}
                  </button>
                )}
              </div>
            )}
            {!form.banner_image && !form.title && (
              <div className="text-slate-400 text-sm">No preview</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BestSellerBannerManager;
