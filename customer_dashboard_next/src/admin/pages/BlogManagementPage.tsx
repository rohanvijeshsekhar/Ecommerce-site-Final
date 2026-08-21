'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Plus, Search, Filter, Eye, Edit3, Trash2, CheckCircle,
  FileText, Archive, Clock, Sparkles, ChevronLeft, ChevronRight, X, ExternalLink
} from 'lucide-react';
import { adminBlogService, type BlogPost, type BlogCategory, type PostStatus } from '@/lib/blog-api';
import { useToast } from '../components/Toast';

export default function BlogManagementPage() {
  const toast = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals & Drawers state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);

  // Form Fields State
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formAuthorOverride, setFormAuthorOverride] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formTagsStr, setFormTagsStr] = useState('');
  const [formStatus, setFormStatus] = useState<PostStatus>('DRAFT');
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formMetaTitle, setFormMetaTitle] = useState('');
  const [formMetaDescription, setFormMetaDescription] = useState('');
  const [formMetaKeywords, setFormMetaKeywords] = useState('');
  const [formCanonicalUrl, setFormCanonicalUrl] = useState('');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'error') {
      toast.error('Error', message);
    } else {
      toast.success('Success', message);
    }
  };

  const loadCategories = useCallback(async () => {
    try {
      const res = await adminBlogService.getCategories();
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminBlogService.list({
        page,
        page_size: 15,
        status: selectedStatus,
        category: selectedCategory,
        q: search,
      });

      if (res.success && Array.isArray(res.data)) {
        setPosts(res.data);
        if (res.meta) {
          setTotalPages(res.meta.total_pages || 1);
          setTotalCount(res.meta.count || res.data.length);
        } else {
          setTotalCount(res.data.length);
          setTotalPages(1);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch blog posts', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus, selectedCategory, search]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const resetForm = () => {
    setFormTitle('');
    setFormSlug('');
    setFormExcerpt('');
    setFormContent('');
    setFormAuthorOverride('');
    setFormCategoryId('');
    setFormTagsStr('');
    setFormStatus('DRAFT');
    setFormIsFeatured(false);
    setFormMetaTitle('');
    setFormMetaDescription('');
    setFormMetaKeywords('');
    setFormCanonicalUrl('');
    setCurrentPostId(null);
    setIsEditing(false);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (post: BlogPost) => {
    setCurrentPostId(post.id);
    setFormTitle(post.title || '');
    setFormSlug(post.slug || '');
    setFormExcerpt(post.excerpt || '');
    setFormContent(post.content || '');
    setFormAuthorOverride(post.author_name_override || '');
    setFormCategoryId(post.category?.id || '');
    setFormTagsStr(post.tags ? post.tags.map((t) => t.name).join(', ') : '');
    setFormStatus(post.status);
    setFormIsFeatured(post.is_featured);
    setFormMetaTitle(post.meta_title || '');
    setFormMetaDescription(post.meta_description || '');
    setFormMetaKeywords(post.meta_keywords || '');
    setFormCanonicalUrl(post.canonical_url || '');
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Article title is required', 'error');
      return;
    }

    const payload = {
      title: formTitle.trim(),
      slug: formSlug.trim() || undefined,
      excerpt: formExcerpt.trim(),
      content: formContent,
      author_name_override: formAuthorOverride.trim(),
      category_id: formCategoryId || undefined,
      tag_names: formTagsStr.split(',').map((t) => t.trim()).filter(Boolean),
      status: formStatus,
      is_featured: formIsFeatured,
      meta_title: formMetaTitle.trim(),
      meta_description: formMetaDescription.trim(),
      meta_keywords: formMetaKeywords.trim(),
      canonical_url: formCanonicalUrl.trim(),
    };

    try {
      if (isEditing && currentPostId) {
        const res = await adminBlogService.update(currentPostId, payload as any);
        if (res.success) {
          showToast('Article updated successfully');
          setIsModalOpen(false);
          resetForm();
          loadPosts();
        } else {
          showToast(res.message || 'Failed to update article', 'error');
        }
      } else {
        const res = await adminBlogService.create(payload as any);
        if (res.success) {
          showToast('Article created successfully');
          setIsModalOpen(false);
          resetForm();
          loadPosts();
        } else {
          showToast(res.message || 'Failed to create article', 'error');
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Operation failed', 'error');
    }
  };

  const handlePublish = async (post: BlogPost) => {
    try {
      const res = await adminBlogService.publish(post.id);
      if (res.success) {
        showToast(`"${post.title}" published successfully`);
        loadPosts();
      }
    } catch (err: any) {
      showToast('Failed to publish article', 'error');
    }
  };

  const handleDraft = async (post: BlogPost) => {
    try {
      const res = await adminBlogService.draft(post.id);
      if (res.success) {
        showToast(`"${post.title}" moved to draft`);
        loadPosts();
      }
    } catch (err: any) {
      showToast('Failed to move article to draft', 'error');
    }
  };

  const handleArchive = async (post: BlogPost) => {
    try {
      const res = await adminBlogService.archive(post.id);
      if (res.success) {
        showToast(`"${post.title}" archived`);
        loadPosts();
      }
    } catch (err: any) {
      showToast('Failed to archive article', 'error');
    }
  };

  const handleToggleFeatured = async (post: BlogPost) => {
    try {
      const res = await adminBlogService.update(post.id, { is_featured: !post.is_featured });
      if (res.success) {
        showToast(`Featured status updated`);
        loadPosts();
      }
    } catch (err: any) {
      showToast('Failed to toggle featured status', 'error');
    }
  };

  const handleDelete = async () => {
    if (!postToDelete) return;
    try {
      const res = await adminBlogService.delete(postToDelete.id);
      if (res.success) {
        showToast(`Article deleted permanently`);
        setDeleteModalOpen(false);
        setPostToDelete(null);
        loadPosts();
      }
    } catch (err: any) {
      showToast('Failed to delete article', 'error');
    }
  };

  const handleOpenPreview = (post: BlogPost) => {
    setPreviewPost(post);
    setIsPreviewOpen(true);
  };

  const getStatusBadge = (status: PostStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <CheckCircle className="w-3 h-3" /> Published
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
            <Clock className="w-3 h-3" /> Draft
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            <Archive className="w-3 h-3" /> Archived
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#006670]">Catalogue</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-semibold text-slate-500">Blog CMS</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Blog Article Management</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Create, edit, preview, and publish clinical insights and technological guides.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#006670] hover:bg-[#00555e] text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create New Article
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setSelectedStatus(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all capitalize cursor-pointer ${
                  selectedStatus === st
                    ? 'bg-white text-[#006670] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search title, content..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#006670] focus:bg-white transition-all"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:border-[#006670]"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Blog Articles Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading blog articles...</div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-700">No blog articles found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your status filter or search parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3.5 px-6">Article</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Author</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Featured</th>
                  <th className="py-3.5 px-4">Published Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 max-w-xs">
                      <div className="font-bold text-slate-900 truncate" title={post.title}>
                        {post.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">/blog/{post.slug}</div>
                    </td>
                    <td className="py-4 px-4">
                      {post.category ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-teal-50 text-[#006670] font-bold text-[11px]">
                          {post.category.name}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-800">{post.author_name}</td>
                    <td className="py-4 px-4">{getStatusBadge(post.status)}</td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleFeatured(post)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          post.is_featured
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-700'
                        }`}
                        title={post.is_featured ? 'Featured on Blog Home' : 'Set as Featured'}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="py-4 px-4 text-slate-500">
                      {post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Not Published'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenPreview(post)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                          title="Preview Article"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(post)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                          title="Edit Article"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {post.status !== 'PUBLISHED' && (
                          <button
                            onClick={() => handlePublish(post)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 font-bold transition-colors text-[11px]"
                            title="Publish Now"
                          >
                            Publish
                          </button>
                        )}

                        {post.status === 'PUBLISHED' && (
                          <button
                            onClick={() => handleDraft(post)}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 font-bold transition-colors text-[11px]"
                            title="Move to Draft"
                          >
                            Unpublish
                          </button>
                        )}

                        {post.status !== 'ARCHIVED' && (
                          <button
                            onClick={() => handleArchive(post)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setPostToDelete(post);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete Permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <div>Showing page {page} of {totalPages} ({totalCount} items)</div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Article Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-xl font-extrabold text-slate-900">
                {isEditing ? 'Edit Blog Article' : 'Create New Blog Article'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-5 text-xs text-slate-700">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. 3D CBCT Imaging Protocols for Endodontics"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#006670]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Slug <span className="text-slate-400 font-normal">(Optional — Auto-generated if blank)</span>
                  </label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="e.g. 3d-cbct-imaging-protocols"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#006670]"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Category</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#006670]"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">Author Name Override</label>
                  <input
                    type="text"
                    value={formAuthorOverride}
                    onChange={(e) => setFormAuthorOverride(e.target.value)}
                    placeholder="e.g. Dr. Rahul Sharma"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#006670]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">Tags (Comma Separated)</label>
                  <input
                    type="text"
                    value={formTagsStr}
                    onChange={(e) => setFormTagsStr(e.target.value)}
                    placeholder="e.g. Sterilization, Handpieces, Equipment"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#006670]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">Summary Excerpt</label>
                <textarea
                  rows={2}
                  value={formExcerpt}
                  onChange={(e) => setFormExcerpt(e.target.value)}
                  placeholder="Short summary displayed on article cards and search results..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#006670]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Article Content (Rich Text / HTML)
                </label>
                <textarea
                  rows={10}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Enter article content in HTML (h2, p, ul, li, blockquote, strong, em, a, img)..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-[#006670]"
                />
              </div>

              <div className="flex items-center gap-6 py-2 border-y border-slate-100">
                <div className="flex items-center gap-2">
                  <label className="font-bold text-slate-900">Status:</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as PostStatus)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 select-none">
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-[#006670] focus:ring-[#006670]"
                  />
                  Featured Article
                </label>
              </div>

              {/* SEO Section */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-extrabold text-[#006670] uppercase tracking-wider">
                  SEO & OpenGraph Configuration
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">SEO Meta Title</label>
                    <input
                      type="text"
                      value={formMetaTitle}
                      onChange={(e) => setFormMetaTitle(e.target.value)}
                      placeholder="Custom page title for search engines..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Canonical URL</label>
                    <input
                      type="text"
                      value={formCanonicalUrl}
                      onChange={(e) => setFormCanonicalUrl(e.target.value)}
                      placeholder="e.g. https://faazo.com/blog/article-slug"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SEO Meta Description</label>
                  <textarea
                    rows={2}
                    value={formMetaDescription}
                    onChange={(e) => setFormMetaDescription(e.target.value)}
                    placeholder="Custom meta description snippet..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#006670] hover:bg-[#00555e] text-white font-bold shadow-sm"
                >
                  {isEditing ? 'Save Changes' : 'Create Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Article Live Preview Modal */}
      {isPreviewOpen && previewPost && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 sm:p-10 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#006670] uppercase">Article Preview</span>
                {getStatusBadge(previewPost.status)}
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {previewPost.category && (
                <span className="text-xs font-bold text-[#006670] bg-teal-50 px-3 py-1 rounded-md">
                  {previewPost.category.name}
                </span>
              )}

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {previewPost.title}
              </h1>

              <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold border-b border-slate-100 pb-4">
                <span>By {previewPost.author_name}</span>
                <span>•</span>
                <span>{previewPost.published_at ? new Date(previewPost.published_at).toLocaleDateString() : 'Draft'}</span>
              </div>

              {previewPost.excerpt && (
                <p className="text-sm font-semibold text-slate-600 italic bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                  {previewPost.excerpt}
                </p>
              )}

              <div
                className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed space-y-3"
                dangerouslySetInnerHTML={{ __html: previewPost.content }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && postToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">Delete Article Permanently?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900">"{postToDelete.title}"</span>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
