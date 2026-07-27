import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, Mail, Phone,
  Shield, Check, ToggleLeft, ToggleRight, ArrowLeft
} from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';
import { useToast } from '../components/Toast';
import { useBreadcrumbSync } from '../contexts/BreadcrumbContext';
import type { ColumnDef, Brand, BrandDocument } from '../types/admin';
import { adminService } from '../services/adminService';
import ImageUploader from '../components/ImageUploader';
import DocumentManager from '../components/DocumentManager';

const emptyForm = {
  name: '',
  description: '',
  country_of_origin: '',
  support_email: '',
  support_phone: '',
  website_url: '',
  warranty_months_default: 12,
  is_warranty_transferable: false,
  warranty_policy_text: '',
  service_policy_text: '',
  service_turnaround_days: null as number | null,
  documentation_url: '',
  certifications: [] as Array<{ name: string; number: string; issued_by: string; valid_until: string }>,
  is_active: true,
};


// ─── Brands Page ─────────────────────────────────────────────────────────────

const BrandsPage: React.FC = () => {
  useBreadcrumbSync([
    { label: 'Catalogue', path: '/admin/brands' },
    { label: 'Brands' },
  ]);

  const toast = useToast();

  const [brands, setBrands]       = useState<Brand[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // View mode & edit state
  const [viewMode, setViewMode]       = useState<'list' | 'create' | 'edit'>('list');
  const [editBrand, setEditBrand]     = useState<Brand | null>(null);
  const [form, setForm]               = useState(emptyForm);
  const [saving, setSaving]           = useState(false);

  const [activeTab, setActiveTab] = useState('general');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandDocs, setBrandDocs] = useState<BrandDocument[]>([]);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const res = await adminService.getBrands();
      if (res.success && res.data) {
        setBrands(res.data);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load brands.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  // ── Filtered list ───────────────────────────────────────────────────────────

  const filtered = brands.filter(b => {
    const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase())
      || b.country_of_origin.toLowerCase().includes(search.toLowerCase());
    const matchActive = filterActive === 'all'
      || (filterActive === 'active' && b.is_active)
      || (filterActive === 'inactive' && !b.is_active);
    return matchSearch && matchActive;
  });

  // ── Wizard View & Navigation handlers ──────────────────────────────────────

  const handleExitWizard = () => {
    setViewMode('list');
    setEditBrand(null);
    setForm(emptyForm);
    setLogoFile(null);
    setLogoUrl(null);
    setBrandDocs([]);
    setActiveTab('general');
  };

  const handleStepClick = (stepId: string) => {
    if (!editBrand && stepId !== 'general') {
      toast.error("Please save the Brand details first to unlock other sections.");
      return;
    }
    setActiveTab(stepId);
  };

  const openCreate = () => {
    setEditBrand(null);
    setForm(emptyForm);
    setLogoFile(null);
    setLogoUrl(null);
    setBrandDocs([]);
    setActiveTab('general');
    setViewMode('create');
  };

  const openEdit = async (brand: Brand) => {
    setEditBrand(brand);
    setForm({
      name: brand.name,
      description: brand.description || '',
      country_of_origin: brand.country_of_origin,
      support_email: brand.support_email,
      support_phone: brand.support_phone,
      website_url: brand.website_url,
      warranty_months_default: brand.warranty_months_default,
      is_warranty_transferable: brand.is_warranty_transferable,
      warranty_policy_text: brand.warranty_policy_text,
      service_policy_text: brand.service_policy_text,
      service_turnaround_days: brand.service_turnaround_days,
      documentation_url: brand.documentation_url,
      certifications: brand.certifications,
      is_active: brand.is_active,
    });
    setLogoFile(null);
    setLogoUrl(brand.logo);
    setBrandDocs([]);
    setActiveTab('general');
    setViewMode('edit');

    // Fetch brand documents (from full detail endpoint)
    try {
      const res = await adminService.getBrand(brand.slug);
      if (res.success && res.data?.documents) {
        setBrandDocs(res.data.documents);
      }
    } catch (err) {
      console.error('Failed to load brand documents:', err);
    }
  };

  const handleSaveStep = async (nextTab?: string) => {
    if (!form.name.trim()) { toast.error('Brand name is required.'); return false; }
    
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('description', form.description.trim());
      formData.append('country_of_origin', form.country_of_origin.trim());
      formData.append('support_email', form.support_email.trim());
      formData.append('support_phone', form.support_phone.trim());
      formData.append('website_url', form.website_url.trim());
      formData.append('warranty_months_default', String(form.warranty_months_default));
      formData.append('is_warranty_transferable', String(form.is_warranty_transferable));
      formData.append('warranty_policy_text', form.warranty_policy_text.trim());
      formData.append('service_policy_text', form.service_policy_text.trim());
      formData.append('service_turnaround_days', form.service_turnaround_days !== null ? String(form.service_turnaround_days) : '');
      formData.append('documentation_url', form.documentation_url.trim());
      formData.append('certifications', JSON.stringify(form.certifications));
      formData.append('is_active', String(form.is_active));

      if (logoFile) {
        formData.append('logo', logoFile);
      }

      let res;
      if (editBrand) {
        res = await adminService.updateBrand(editBrand.slug, formData);
        if (res.success) {
          toast.success('Brand updated.');
          if (res.data) setEditBrand(res.data);
        }
      } else {
        res = await adminService.createBrand(formData);
        if (res.success && res.data) {
          toast.success('Brand created.');
          setEditBrand(res.data);
          setViewMode('edit');
        }
      }

      fetchBrands();
      if (nextTab) {
        setActiveTab(nextTab);
      }
      return true;
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save brand.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminService.deleteBrand(deleteTarget.slug);
      toast.success(`"${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      fetchBrands();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete brand.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Table columns ───────────────────────────────────────────────────────────

  const columns: ColumnDef<Brand>[] = [
    {
      key: 'name',
      header: 'Brand',
      sortable: true,
      render: (_, b) => (
        <div className="flex items-center gap-3">
          {b.logo ? (
            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center p-1 shrink-0">
              <img src={b.logo} alt={b.name} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[#E6F2F2] flex items-center justify-center text-[#005B63] font-bold text-sm shrink-0">
              {b.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-slate-800 text-sm">{b.name}</p>
            <p className="text-xs text-slate-400">{b.country_of_origin || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'support_email',
      header: 'Support Contact',
      render: (_, b) => (
        <div className="space-y-0.5">
          {b.support_email && <p className="text-xs text-slate-600 flex items-center gap-1"><Mail className="w-3 h-3" />{b.support_email}</p>}
          {b.support_phone && <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{b.support_phone}</p>}
        </div>
      ),
    },
    {
      key: 'warranty_months_default',
      header: 'Warranty',
      sortable: true,
      render: (_, b) => (
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-[#005B63]" />
          <span className="text-sm font-medium text-slate-700">{b.warranty_months_default}m</span>
          {b.is_warranty_transferable && (
            <span className="text-xs bg-blue-50 text-blue-600 rounded px-1.5 py-0.5">Transferable</span>
          )}
        </div>
      ),
    },

    {
      key: 'is_active',
      header: 'Status',
      render: (_, b) => <StatusBadge variant={b.is_active ? 'success' : 'neutral'} label={b.is_active ? 'Active' : 'Inactive'} />,
    },
    {
      key: 'id',
      header: 'Actions',
      render: (_, b) => (
        <div className="flex items-center gap-2">
          <button onClick={() => openEdit(b)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#005B63] hover:bg-[#E6F2F2] transition-colors"
            title="Edit brand">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setDeleteTarget(b)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
            title="Delete brand">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // Document actions
  const handleUploadDoc = async (formData: FormData) => {
    if (!editBrand) return;
    const res = await adminService.uploadBrandDocument(editBrand.slug, formData);
    if (res.success && res.data) {
      setBrandDocs(prev => [...prev, res.data!]);
      toast.success("Document uploaded successfully.");
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!editBrand) return;
    const res = await adminService.deleteBrandDocument(editBrand.slug, docId);
    if (res.success) {
      setBrandDocs(prev => prev.filter(d => d.id !== docId));
      toast.success("Document deleted.");
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (viewMode !== 'list') {
    const STEPS = [
      { id: 'general',    label: 'Identity & Support' },
      { id: 'warranty',   label: 'Warranty & Service' },
      { id: 'compliance', label: 'Compliance & Certs' },
      { id: 'documents',  label: 'Documents' },
    ];
    const activeIndex = STEPS.findIndex(s => s.id === activeTab);

    return (
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExitWizard}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer shadow-sm"
              title="Back to brands list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 leading-tight">
                {viewMode === 'edit' ? 'Edit Brand' : 'Add New Brand'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {viewMode === 'edit' ? `${editBrand?.name}` : 'Configure contact info, warranty policy, certifications, and documents.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center shrink-0">
            {viewMode === 'edit' && (
              <button
                onClick={() => editBrand && setDeleteTarget(editBrand)}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm select-none overflow-x-auto no-scrollbar">
          <div className="flex items-center justify-between min-w-[550px] md:min-w-0 max-w-2xl mx-auto gap-4">
            {STEPS.map((step, idx) => {
              const isCompleted = idx < activeIndex;
              const isActive = idx === activeIndex;
              const isDisabled = !editBrand && idx > 0;

              return (
                <React.Fragment key={step.id}>
                  {/* Step Node */}
                  <div
                    onClick={() => !isDisabled && handleStepClick(step.id)}
                    className={`flex flex-col items-center gap-2 cursor-pointer group shrink-0 ${isDisabled ? 'cursor-not-allowed opacity-55' : ''}`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                        isActive
                          ? 'bg-[#005B63] text-white ring-4 ring-[#005B63]/15'
                          : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider transition-colors text-center max-w-[100px] md:max-w-none ${
                        isActive
                          ? 'text-[#005B63]'
                          : isCompleted
                          ? 'text-[#10B981]'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {/* Connecting Line */}
                  {idx < STEPS.length - 1 && (
                    <div className="flex-grow h-[2px] bg-slate-100 mx-4 relative -mt-6">
                      <div
                        className={`absolute top-0 bottom-0 left-0 bg-emerald-500 transition-all duration-300 ${
                          idx < activeIndex ? 'w-full' : 'w-0'
                        }`}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Wizard Step Content Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <BrandForm
            form={form}
            setForm={setForm}
            logoUrl={logoUrl}
            onLogoUpload={(file) => {
              setLogoFile(file);
              setLogoUrl(URL.createObjectURL(file));
            }}
            onLogoRemove={() => {
              setLogoFile(null);
              setLogoUrl(null);
            }}
            activeTab={activeTab}
            brandDocs={brandDocs}
            onUploadDoc={handleUploadDoc}
            onDeleteDoc={handleDeleteDoc}
          />

          {/* Stepper Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-100">
            {activeIndex > 0 ? (
              <button
                type="button"
                onClick={() => handleStepClick(STEPS[activeIndex - 1].id)}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExitWizard}
                className="px-5 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                if (activeIndex === 0) {
                  await handleSaveStep('warranty');
                } else if (activeIndex === 1) {
                  await handleSaveStep('compliance');
                } else if (activeIndex === 2) {
                  await handleSaveStep('documents');
                } else {
                  // Final step: Documents
                  handleExitWizard();
                  toast.success('Brand fully configured and saved.');
                }
              }}
              disabled={saving}
              className="px-6 py-2.5 bg-[#005B63] hover:bg-[#004a51] text-white rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</>
              ) : activeIndex === 3 ? (
                'Finish'
              ) : (
                'Save & Next'
              )}
            </button>
          </div>
        </div>

        {/* Delete Confirm */}
        <ConfirmDialog
          isOpen={!!deleteTarget}
          title="Delete Brand"
          message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleting}
          onConfirm={async () => {
            await handleDelete();
            handleExitWizard();
          }}
          onClose={() => setDeleteTarget(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Brands"
        subtitle={`${brands.filter(b => b.is_active).length} active brands in the marketplace`}
        actions={
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#005B63] text-white rounded-xl text-sm font-semibold hover:bg-[#004a51] transition-colors shadow-sm cursor-pointer">
            <Plus className="w-4 h-4" /> Add Brand
          </button>
        }
      />

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search brands, country…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 focus:border-[#005B63]"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button key={f}
              onClick={() => setFilterActive(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                filterActive === f
                  ? 'bg-[#005B63] text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <SkeletonLoader type="table" rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          preset="no-results"
          title="No brands found"
          description={search ? `No brands match "${search}"` : 'Add your first brand to get started.'}
          action={
            <button onClick={openCreate} className="px-4 py-2 text-sm font-semibold text-white bg-[#005B63] hover:bg-[#004a50] rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#005B63]/30 cursor-pointer">
              Add Brand
            </button>
          }
        />
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Brand"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};

// ─── Brand Form ───────────────────────────────────────────────────────────────

type FormState = typeof emptyForm;

const BrandForm: React.FC<{
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  logoUrl: string | null;
  onLogoUpload: (file: File) => void;
  onLogoRemove: () => void;
  activeTab: string;
  brandDocs: BrandDocument[];
  onUploadDoc: (data: FormData) => Promise<void>;
  onDeleteDoc: (id: string) => Promise<void>;
}> = ({
  form,
  setForm,
  logoUrl,
  onLogoUpload,
  onLogoRemove,
  activeTab,
  brandDocs,
  onUploadDoc,
  onDeleteDoc,
}) => {
  const set = (k: keyof FormState, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));

  const fieldClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 focus:border-[#005B63] transition-colors";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";
  const sectionClass = "space-y-4";

  // Certification add state
  const [certName, setCertName] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [certIssuedBy, setCertIssuedBy] = useState('');
  const [certValidUntil, setCertValidUntil] = useState('');

  const handleAddCert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certName.trim()) return;
    const newCert = {
      name: certName.trim(),
      number: certNumber.trim(),
      issued_by: certIssuedBy.trim(),
      valid_until: certValidUntil,
    };
    set('certifications', [...form.certifications, newCert]);
    setCertName('');
    setCertNumber('');
    setCertIssuedBy('');
    setCertValidUntil('');
  };

  const handleRemoveCert = (idx: number) => {
    const list = [...form.certifications];
    list.splice(idx, 1);
    set('certifications', list);
  };

  if (activeTab === 'general') {
    return (
      <div className={sectionClass}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Brand Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className={fieldClass} placeholder="e.g. NSK" required />
            </div>
            <div>
              <label className={labelClass}>Description / Notes</label>
              <textarea rows={4} value={form.description} onChange={e => set('description', e.target.value)} className={fieldClass} placeholder="Enter brand background details..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Country of Origin</label>
                <input value={form.country_of_origin} onChange={e => set('country_of_origin', e.target.value)} className={fieldClass} placeholder="Japan" />
              </div>
              <div>
                <label className={labelClass}>Website URL</label>
                <input type="url" value={form.website_url} onChange={e => set('website_url', e.target.value)} className={fieldClass} placeholder="https://brand.com" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <ImageUploader
              label="Brand Logo Upload"
              currentUrl={logoUrl}
              onUpload={onLogoUpload}
              onRemove={onLogoRemove}
            />

            <div>
              <label className={labelClass}>Support Email</label>
              <input type="email" value={form.support_email} onChange={e => set('support_email', e.target.value)} className={fieldClass} placeholder="support@brand.com" />
            </div>
            <div>
              <label className={labelClass}>Support Phone</label>
              <input value={form.support_phone} onChange={e => set('support_phone', e.target.value)} className={fieldClass} placeholder="+91-XXXXXXXXXX" />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="button" onClick={() => set('is_active', !form.is_active)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                  form.is_active ? 'border-[#005B63] bg-[#E6F2F2] text-[#005B63]' : 'border-slate-200 text-slate-500'
                }`}>
                {form.is_active ? <ToggleRight className="w-4.5 h-4.5" /> : <ToggleLeft className="w-4.5 h-4.5" />}
                {form.is_active ? 'Active Brand' : 'Inactive'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'warranty') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-4">
          <p className="text-xs font-bold text-[#005B63] uppercase tracking-wider">Warranty Policies</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className={labelClass}>Default Duration (months)</label>
              <input type="number" min={0} value={form.warranty_months_default}
                onChange={e => set('warranty_months_default', Number(e.target.value))} className={fieldClass} />
            </div>
            <div className="pt-2 sm:pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.is_warranty_transferable}
                  onChange={e => set('is_warranty_transferable', e.target.checked)}
                  className="w-4 h-4 rounded accent-[#005B63]" />
                <span className="text-xs text-slate-600 font-semibold">Warranty Transferable</span>
              </label>
            </div>
          </div>
          <div>
            <label className={labelClass}>Warranty Policy Details</label>
            <textarea rows={4} value={form.warranty_policy_text} onChange={e => set('warranty_policy_text', e.target.value)} className={fieldClass} placeholder="Enter warranty terms and claim conditions..." />
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-bold text-[#005B63] uppercase tracking-wider">Service & SLA Policies</p>
          <div>
            <label className={labelClass}>Service Turnaround (SLA business days)</label>
            <input type="number" min={0} value={form.service_turnaround_days ?? ''}
              onChange={e => set('service_turnaround_days', e.target.value ? Number(e.target.value) : null)} className={fieldClass} placeholder="e.g. 7" />
          </div>
          <div>
            <label className={labelClass}>Service Policy Terms</label>
            <textarea rows={4} value={form.service_policy_text} onChange={e => set('service_policy_text', e.target.value)} className={fieldClass} placeholder="Describe pick-up and repair workflow..." />
          </div>
          <div>
            <label className={labelClass}>Documentation Portal Link</label>
            <input type="url" value={form.documentation_url} onChange={e => set('documentation_url', e.target.value)} className={fieldClass} placeholder="https://brand.com/support/docs" />
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'compliance') {
    return (
      <div className="space-y-6">
        {/* Compliance list */}
        <div className="bg-white border border-slate-100 rounded-2xl overflow-x-auto shadow-sm no-scrollbar">
          <table className="w-full text-xs text-left min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-100 font-semibold text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-4 py-2.5">Certification</th>
                <th className="px-4 py-2.5">License/ID</th>
                <th className="px-4 py-2.5">Issued By</th>
                <th className="px-4 py-2.5">Valid Until</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {form.certifications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400 italic">No certifications listed yet. Add CE, ISO, or CDSCO licenses below.</td>
                </tr>
              ) : (
                form.certifications.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors font-medium">
                    <td className="px-4 py-2.5 font-bold text-slate-800">{c.name}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-600">{c.number || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{c.issued_by || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{c.valid_until || '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button type="button" onClick={() => handleRemoveCert(i)} className="p-1 text-rose-500 hover:bg-rose-50 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add Cert Form */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/80 space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Add Professional Compliance Certificate</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className={labelClass}>Cert Name *</label>
              <input value={certName} onChange={e => setCertName(e.target.value)} className={fieldClass} placeholder="e.g. ISO 13485" />
            </div>
            <div>
              <label className={labelClass}>License Number</label>
              <input value={certNumber} onChange={e => setCertNumber(e.target.value)} className={fieldClass} placeholder="e.g. LIC-998811" />
            </div>
            <div>
              <label className={labelClass}>Issued By</label>
              <input value={certIssuedBy} onChange={e => setCertIssuedBy(e.target.value)} className={fieldClass} placeholder="e.g. CDSCO India" />
            </div>
            <div>
              <label className={labelClass}>Valid Until</label>
              <input type="date" value={certValidUntil} onChange={e => setCertValidUntil(e.target.value)} className={fieldClass} />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={handleAddCert} disabled={!certName.trim()}
              className="px-4 py-2 bg-[#005B63] text-white rounded-xl text-xs font-bold transition-all shadow disabled:opacity-40 cursor-pointer">
              Add Cert
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'documents') {
    return (
      <DocumentManager
        documents={brandDocs}
        entityType="brand"
        onUpload={onUploadDoc}
        onDelete={onDeleteDoc}
      />
    );
  }

  return null;
};

export default BrandsPage;
