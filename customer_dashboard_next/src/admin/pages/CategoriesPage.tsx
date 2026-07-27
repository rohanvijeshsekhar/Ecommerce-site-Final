'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Edit2, Trash2, ChevronRight,
  FolderOpen, Folder, FolderTree, Layers,
  Check, Info, ChevronDown, Package
} from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';
import { useToast } from '../components/Toast';
import { useBreadcrumbSync } from '../contexts/BreadcrumbContext';
import type { Category } from '../types/admin';
import { adminService } from '../services/adminService';
import ImageUploader from '../components/ImageUploader';

// ─── Depth colour palette ─────────────────────────────────────────────────────
const DEPTH_COLORS: Record<number, { border: string; badgeBg: string; badgeText: string; dot: string; text: string }> = {
  0: { border: 'border-[#005B63]',  badgeBg: 'bg-teal-50',    badgeText: 'text-[#005B63]',  dot: 'bg-[#005B63]',  text: 'text-[#005B63]' },
  1: { border: 'border-orange-400', badgeBg: 'bg-orange-50',   badgeText: 'text-orange-600', dot: 'bg-orange-400', text: 'text-orange-600' },
  2: { border: 'border-violet-400', badgeBg: 'bg-violet-50',   badgeText: 'text-violet-600', dot: 'bg-violet-400', text: 'text-violet-600' },
  3: { border: 'border-sky-400',    badgeBg: 'bg-sky-50',      badgeText: 'text-sky-600',    dot: 'bg-sky-400',    text: 'text-sky-600' },
  4: { border: 'border-rose-300',   badgeBg: 'bg-rose-50',     badgeText: 'text-rose-500',   dot: 'bg-rose-300',   text: 'text-rose-500' },
};
const dc = (depth: number) => DEPTH_COLORS[Math.min(depth, 4)];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildPath = (id: string | null, all: Category[]): string => {
  if (!id) return '';
  const chain: string[] = [];
  let current: Category | undefined = all.find(c => c.id === id);
  while (current) {
    chain.unshift(current.name);
    current = current.parent ? all.find(c => c.id === current!.parent) : undefined;
  }
  return chain.join(' → ');
};

const emptyForm = { name: '', parent: '', sort_order: 0, description: '', is_active: true };

// ─── Main Page ────────────────────────────────────────────────────────────────

const CategoriesPage: React.FC = () => {
  useBreadcrumbSync([
    { label: 'Catalogue', path: '/admin/categories' },
    { label: 'Categories' },
  ]);

  const router = useRouter();
  const toast = useToast();

  const [categories, setCategories]     = useState<Category[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [viewMode, setViewMode]         = useState<'tree' | 'flat'>('tree');
  const [expandedIds, setExpandedIds]   = useState<Set<string>>(new Set());
  const [highlightId, setHighlightId]   = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editCat, setEditCat]           = useState<Category | null>(null);
  const [form, setForm]                 = useState(emptyForm);
  const [saving, setSaving]             = useState(false);
  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [imageUrl, setImageUrl]         = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchCategories = useCallback(async (highlightAfter?: string) => {
    setLoading(true);
    try {
      const res = await adminService.getCategories();
      if (res.success && res.data) {
        const data = res.data;
        setCategories(data);
        // Auto-expand root nodes
        setExpandedIds(prev => {
          const next = new Set(prev);
          data.filter(c => c.parent === null).forEach(c => next.add(c.id));
          if (highlightAfter) {
            // Walk ancestors of the new/edited node to expand them
            let cur = data.find(c => c.id === highlightAfter);
            while (cur?.parent) {
              next.add(cur.parent);
              cur = data.find(c => c.id === cur!.parent);
            }
          }
          return next;
        });
        if (highlightAfter) {
          setHighlightId(highlightAfter);
          setTimeout(() => setHighlightId(null), 2800);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = search
    ? categories.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.full_path.toLowerCase().includes(search.toLowerCase()))
    : categories;

  const roots = filtered.filter(c => c.parent === null);

  const toggleExpand   = (id: string) => setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const expandAll      = () => setExpandedIds(new Set(categories.map(c => c.id)));
  const collapseAll    = () => setExpandedIds(new Set(categories.filter(c => !c.parent).map(c => c.id)));

  // ── Drawer helpers ─────────────────────────────────────────────────────────

  const openCreate = (parentId?: string) => {
    setEditCat(null);
    setForm({ ...emptyForm, parent: parentId || '' });
    setImageFile(null); setImageUrl(null);
    setDrawerOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditCat(cat);
    setForm({ name: cat.name, parent: cat.parent || '', sort_order: cat.sort_order, description: cat.description || '', is_active: cat.is_active });
    setImageFile(null); setImageUrl(cat.image || null);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Category name is required.'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name',        form.name.trim());
      fd.append('parent',      form.parent);
      fd.append('sort_order',  String(form.sort_order));
      fd.append('description', form.description.trim());
      fd.append('is_active',   String(form.is_active));
      if (imageFile)          fd.append('image', imageFile);
      else if (!imageUrl)     fd.append('image', '');

      if (editCat) {
        await adminService.updateCategory(editCat.slug, fd);
        toast.success('Category updated.');
        setDrawerOpen(false);
        fetchCategories(editCat.id);
      } else {
        const res = await adminService.createCategory(fd);
        toast.success('Category created.');
        setDrawerOpen(false);
        fetchCategories(res.data?.id);
      }
    } catch (err: any) {
      const msg = err.response?.data?.name?.[0] || err.response?.data?.message || err.message || 'Failed to save.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminService.deleteCategory(deleteTarget.slug);
      toast.success(`"${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete.');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddProduct = (catId: string) => {
    router.push(`/admin/products?category=${catId}`);
  };

  // ── Drawer display text ────────────────────────────────────────────────────

  const parentPath  = buildPath(form.parent || null, categories);
  const previewPath = [parentPath, form.name.trim() || '…'].filter(Boolean).join(' → ');

  const drawerTitle    = editCat ? `Edit — ${editCat.name}` : 'New Category';
  const drawerSubtitle = editCat
    ? `Full path: ${editCat.full_path}`
    : form.parent ? `Adding under: ${parentPath}` : 'Creating a root-level category';

  const totalActive = categories.filter(c => c.is_active).length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Categories"
        subtitle={`${totalActive} active · ${categories.filter(c => !c.parent).length} root nodes · ${categories.length} total`}
        actions={
          <button onClick={() => openCreate()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#005B63] text-white rounded-xl text-sm font-semibold hover:bg-[#004a51] transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add Root Category
          </button>
        }
      />

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search categories…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 focus:border-[#005B63]" />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(['tree', 'flat'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === m ? 'bg-white text-[#005B63] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {m === 'tree' ? <FolderTree className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
              {m === 'tree' ? 'Tree View' : 'Flat List'}
            </button>
          ))}
        </div>
        {viewMode === 'tree' && (
          <div className="flex gap-1">
            <button onClick={expandAll}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-[#005B63] hover:bg-teal-50 rounded-lg border border-slate-200 transition-colors">
              Expand All
            </button>
            <button onClick={collapseAll}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-[#005B63] hover:bg-teal-50 rounded-lg border border-slate-200 transition-colors">
              Collapse All
            </button>
          </div>
        )}
      </div>

      {/* Depth legend */}
      <div className="flex flex-wrap gap-3 items-center px-1">
        {[0,1,2,3,4].map(d => {
          const c = DEPTH_COLORS[d];
          return (
            <span key={d} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={`w-2 h-2 rounded-full ${c.dot}`} />
              Level {d + 1}
            </span>
          );
        })}
        <span className="text-xs text-slate-400 ml-2">· Hover a row to see actions · Click <ChevronRight className="w-3 h-3 inline" /> to expand</span>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonLoader type="table" rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState preset="no-results" title="No categories found"
          description={search ? `No categories match "${search}"` : 'Create your first root category.'}
          action={
            <button onClick={() => openCreate()}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#005B63] hover:bg-[#004a50] rounded-xl transition-colors">
              Add Root Category
            </button>
          } />
      ) : viewMode === 'tree' ? (
        /* ── Tree ── */
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Category Hierarchy</p>
            <span className="text-xs text-slate-400">{categories.length} total categories</span>
          </div>
          <div>
            {roots.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400 italic">No root categories match your search.</p>
            ) : roots.map(root => (
              <CategoryTreeNode
                key={root.id} node={root} all={categories}
                expandedIds={expandedIds} highlightId={highlightId}
                onToggleExpand={toggleExpand}
                onEdit={openEdit} onDelete={setDeleteTarget} onAddChild={openCreate}
                onAddProduct={handleAddProduct}
                depth={0}
              />
            ))}
          </div>
        </div>
      ) : (
        /* ── Flat Table ── */
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Category', 'Full Path', 'Level', 'Children', 'Products', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered
                .sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name))
                .map(cat => {
                  const c = dc(cat.depth);
                  const childCount = categories.filter(x => x.parent === cat.id).length;
                  return (
                    <tr key={cat.id}
                      className={`hover:bg-slate-50 transition-colors ${highlightId === cat.id ? 'bg-teal-50/60' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-1 h-4 rounded-full shrink-0 ${c.dot}`} />
                          <span className="font-semibold text-slate-800">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <span className="text-xs text-slate-500 truncate block">{cat.full_path}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${c.badgeBg} ${c.badgeText}`}>L{cat.depth + 1}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{childCount}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{cat.active_product_count}</td>
                      <td className="px-4 py-3">
                        <StatusBadge variant={cat.is_active ? 'success' : 'neutral'} label={cat.is_active ? 'Active' : 'Inactive'} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(cat)} title="Edit"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#005B63] hover:bg-teal-50 transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openCreate(cat.id)} title="Add sub-category"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#F58220] hover:bg-orange-50 transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleAddProduct(cat.id)} title="Add Product"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors">
                            <Package className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(cat)} title="Delete"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Drawer ─────────────────────────────────────────────────────────── */}
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}
        title={drawerTitle} subtitle={drawerSubtitle} width="md"
        footer={
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDrawerOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#005B63] text-white hover:bg-[#004a51] disabled:opacity-60 flex items-center gap-2 transition-colors">
              {saving
                ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</>
                : <><Check className="w-3.5 h-3.5" />Save Category</>}
            </button>
          </div>
        }>
        <div className="space-y-5 pb-4">

          {/* Live path preview */}
          <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Info className="w-3 h-3 text-[#005B63]" /> Category Path Preview
            </p>
            <p className="text-sm font-semibold text-slate-800 break-all leading-relaxed">
              {previewPath !== '…'
                ? previewPath
                : <span className="italic font-normal text-slate-400">Start typing a name…</span>}
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Category Name <span className="text-rose-400">*</span>
            </label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. High-Speed Handpieces"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 focus:border-[#005B63] transition-colors" />
          </div>

          {/* Parent */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Parent Category
            </label>
            <div className="relative">
              <select value={form.parent} onChange={e => setForm(p => ({ ...p, parent: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 focus:border-[#005B63] bg-white appearance-none pr-8 transition-colors">
                <option value="">— None (root category) —</option>
                {categories
                  .filter(c => c.id !== editCat?.id)
                  .sort((a, b) => a.depth - b.depth || a.full_path.localeCompare(b.full_path))
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {'  '.repeat(c.depth)}L{c.depth + 1} · {c.full_path}
                    </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {form.parent && (
              <p className="mt-1.5 text-xs text-slate-500">
                Will be created inside: <span className="font-semibold text-[#005B63]">{parentPath}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Short description of products in this category…"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 focus:border-[#005B63] resize-none transition-colors" />
          </div>

          {/* Image */}
          <ImageUploader label="Category Image" currentUrl={imageUrl}
            onUpload={file => { setImageFile(file); setImageUrl(URL.createObjectURL(file)); }}
            onRemove={() => { setImageFile(null); setImageUrl(null); }} />

          {/* Sort order + Active */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Sort Order</label>
              <input type="number" min={0} value={form.sort_order}
                onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 focus:border-[#005B63] transition-colors" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${form.is_active ? 'bg-[#005B63]' : 'bg-slate-200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${form.is_active ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-sm font-medium text-slate-700">Active</span>
              </label>
            </div>
          </div>
        </div>
      </Drawer>

      {/* ── Delete Dialog ────────────────────────────────────────────────────── */}
      <ConfirmDialog isOpen={!!deleteTarget} title="Delete Category"
        message={
          deleteTarget?.active_product_count
            ? `"${deleteTarget?.name}" has ${deleteTarget?.active_product_count} product(s). Reassign them before deleting.`
            : `Delete "${deleteTarget?.name}"? Sub-categories will also be removed. This cannot be undone.`
        }
        confirmLabel="Delete" variant="danger" loading={deleting}
        onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </div>
  );
};

// ─── Tree Node ────────────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: Category; all: Category[];
  expandedIds: Set<string>; highlightId: string | null;
  onToggleExpand: (id: string) => void;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
  onAddChild: (parentId: string) => void;
  onAddProduct: (categoryId: string) => void;
  depth?: number;
}

const CategoryTreeNode: React.FC<TreeNodeProps> = ({
  node, all, expandedIds, highlightId,
  onToggleExpand, onEdit, onDelete, onAddChild, onAddProduct, depth = 0,
}) => {
  const children    = all.filter(c => c.parent === node.id).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const isExpanded  = expandedIds.has(node.id);
  const isHighlighted = highlightId === node.id;
  const c = dc(depth);

  return (
    <div className={`border-b border-slate-50 last:border-0 ${isHighlighted ? 'animate-pulse' : ''}`}>
      {/* Row */}
      <div
        className={`flex items-center gap-2 py-2.5 pr-3 group transition-colors
          border-l-[3px] ${c.border}
          ${isHighlighted ? 'bg-teal-50/70' : 'hover:bg-slate-50'}`}
        style={{ paddingLeft: `${14 + depth * 22}px` }}
      >
        {/* Expand toggle */}
        <button onClick={() => onToggleExpand(node.id)}
          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all
            ${children.length > 0 ? 'text-slate-400 hover:text-[#005B63] hover:bg-teal-50' : 'text-transparent cursor-default'}`}>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded && children.length > 0 ? 'rotate-90' : ''}`} />
        </button>

        {/* Folder icon */}
        {node.image
          ? <img src={node.image} alt={node.name} className="w-6 h-6 rounded object-contain bg-slate-50 border border-slate-100 shrink-0" />
          : isExpanded && children.length > 0
            ? <FolderOpen className={`w-4 h-4 shrink-0 ${node.is_active ? c.text : 'text-slate-300'}`} />
            : <Folder className={`w-4 h-4 shrink-0 ${node.is_active ? c.text : 'text-slate-300'}`} />
        }

        {/* Name */}
        <span className={`flex-1 text-sm font-semibold min-w-0 truncate ${node.is_active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
          {node.name}
        </span>

        {/* Info badges */}
        <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
          <span className={`font-bold rounded px-1.5 py-0.5 ${c.badgeBg} ${c.badgeText}`}>L{depth + 1}</span>
          {children.length > 0 && (
            <span className="text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">{children.length} sub</span>
          )}
          {node.active_product_count > 0 && (
            <span className="bg-teal-50 text-[#005B63] rounded px-1.5 py-0.5">{node.active_product_count} products</span>
          )}
          {!node.is_active && <span className="bg-slate-100 text-slate-400 rounded px-1.5 py-0.5">Inactive</span>}
        </div>

        {/* Action icons (subdued, bright on hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onEdit(node)} title="Edit"
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#005B63] hover:bg-teal-50 transition-colors">
            <Edit2 className="w-3 h-3" />
          </button>
          <button onClick={() => onAddProduct(node.id)} title="Add product"
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#005B63] hover:bg-teal-50 transition-colors">
            <Package className="w-3 h-3" />
          </button>
          <button onClick={() => onDelete(node)} title="Delete"
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* Action pills (always on root, hover-reveal on children) */}
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {/* "+ Sub-category" pill */}
          <button onClick={() => onAddChild(node.id)}
            title={`Add sub-category under "${node.name}"`}
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border transition-all shrink-0
              ${depth === 0
                ? 'border-orange-200 text-orange-500 bg-orange-50 hover:bg-orange-100'
                : 'border-slate-200 text-slate-400 bg-white hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50 opacity-0 group-hover:opacity-100'
              }`}>
            <Plus className="w-2.5 h-2.5" /> Sub-category
          </button>

          {/* "Add Product" pill */}
          <button onClick={() => onAddProduct(node.id)}
            title={`Add product under "${node.name}"`}
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border transition-all shrink-0
              ${depth === 0
                ? 'border-teal-200 text-teal-600 bg-teal-50 hover:bg-teal-100'
                : 'border-slate-200 text-slate-400 bg-white hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50 opacity-0 group-hover:opacity-100'
              }`}>
            <Package className="w-2.5 h-2.5" /> Add Product
          </button>
        </div>
      </div>

      {/* Children */}
      {isExpanded && children.length > 0 && (
        <div>
          {children.map(child => (
            <CategoryTreeNode
              key={child.id} node={child} all={all}
              expandedIds={expandedIds} highlightId={highlightId}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild}
              onAddProduct={onAddProduct}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
