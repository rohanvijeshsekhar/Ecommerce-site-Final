import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit3, Trash2, Eye, ArrowUp, ArrowDown,
  CheckCircle, XCircle, Sparkles, Package, Layers, Image as ImageIcon,
  Save, X, Star, Move, Globe, Shield, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

export interface AdminSolutionItem {
  id: string | number;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  banner: string;
  thumbnail: string;
  display_order: number;
  is_active: boolean;
  show_on_homepage: boolean;
  product_count: number;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  products?: any[];
  updated_at?: string;
}

interface ProductSearchResult {
  id: string | number;
  name: string;
  sku: string;
  price: number;
  brand?: string;
  image?: string;
}

const ExploreSolutionsAdmin: React.FC<{ onPreviewSolution?: (slug: string) => void }> = ({ onPreviewSolution }) => {
  const [solutions, setSolutions] = useState<AdminSolutionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'images' | 'products' | 'seo'>('basic');

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    short_description: '',
    description: '',
    banner: '',
    thumbnail: '',
    display_order: 0,
    is_active: true,
    show_on_homepage: true,
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
  });

  // Selected Products Mapping in Modal
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    id: string | number;
    name: string;
    sku: string;
    price: number;
    brand: string;
    is_featured: boolean;
  }>>([]);

  // Product Autocomplete State
  const [productSearchInput, setProductSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  useEffect(() => {
    fetchSolutions();
  }, []);

  const fetchSolutions = () => {
    setLoading(true);
    api.get('solutions/admin/list/')
      .then((res) => {
        const data = res.data?.data ?? res.data?.results ?? res.data ?? [];
        if (Array.isArray(data)) {
          setSolutions(data);
        }
      })
      .catch(() => {
        // Fallback default solutions if offline/backend starting
      })
      .finally(() => setLoading(false));
  };

  // Handle Product Search Autocomplete
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchingProducts(true);
      const query = productSearchInput.trim();
      const url = query ? `products/?search=${encodeURIComponent(query)}` : 'products/';
      api.get(url)
        .then((res) => {
          const list = res.data?.results ?? res.data?.data ?? res.data ?? [];
          if (Array.isArray(list)) {
            setSearchResults(list.map((p: any) => ({
              id: p.id,
              name: p.name || p.title,
              sku: p.sku || `SKU-${p.id}`,
              price: p.pricing?.offer_price || p.pricing?.selling_price || p.price || 0,
              brand: p.brand?.name || p.brand || 'FAAZO',
              image: p.primary_image_url || '/images/bestseller_handpiece.png',
            })));
          }
        })
        .catch(() => {})
        .finally(() => setSearchingProducts(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearchInput]);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      title: '',
      slug: '',
      short_description: '',
      description: '',
      banner: '/images/hero1_ecommerce.png',
      thumbnail: '/images/category_equipment.png',
      display_order: solutions.length + 1,
      is_active: true,
      show_on_homepage: true,
      seo_title: '',
      seo_description: '',
      seo_keywords: '',
    });
    setSelectedProducts([]);
    setActiveTab('basic');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sol: AdminSolutionItem) => {
    setEditingId(sol.id);
    setFormData({
      title: sol.title,
      slug: sol.slug,
      short_description: sol.short_description,
      description: sol.description || '',
      banner: sol.banner || '',
      thumbnail: sol.thumbnail || '',
      display_order: sol.display_order || 0,
      is_active: sol.is_active,
      show_on_homepage: sol.show_on_homepage,
      seo_title: sol.seo_title || '',
      seo_description: sol.seo_description || '',
      seo_keywords: sol.seo_keywords || '',
    });
    
    // Fetch detail using slug or id
    const lookupKey = sol.slug || sol.id;
    api.get(`solutions/admin/${lookupKey}/`)
      .then((res) => {
        const detail = res.data?.data ?? res.data;
        if (detail && Array.isArray(detail.products)) {
          setSelectedProducts(detail.products.map((p: any) => ({
            id: p.product_id || p.id,
            name: p.product_name || p.name,
            sku: p.product_sku || p.sku,
            price: p.product_price || p.price,
            brand: p.product_brand || p.brand || '',
            is_featured: p.is_featured || false,
          })));
        }
      })
      .catch(() => {});
      
    setActiveTab('basic');
    setIsModalOpen(true);
  };

  const handleToggleStatus = (id: string | number) => {
    api.patch(`solutions/admin/${id}/status/`)
      .then(() => {
        fetchSolutions();
      })
      .catch(() => {
        setSolutions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s))
        );
      });
  };

  const handleDeleteSolution = (id: string | number) => {
    if (!window.confirm('Are you sure you want to delete this clinical solution?')) return;
    api.delete(`solutions/admin/${id}/`)
      .then(() => {
        fetchSolutions();
      })
      .catch(() => {
        setSolutions((prev) => prev.filter((s) => s.id !== id));
      });
  };

  const handleAddProductToSolution = (prod: ProductSearchResult) => {
    if (selectedProducts.some((p) => String(p.id) === String(prod.id))) return;
    setSelectedProducts((prev) => [
      ...prev,
      {
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        price: prod.price,
        brand: prod.brand || '',
        is_featured: false,
      },
    ]);
    setProductSearchInput('');
    setSearchResults([]);
  };

  const handleRemoveProductFromSolution = (prodId: string | number) => {
    setSelectedProducts((prev) => prev.filter((p) => String(p.id) !== String(prodId)));
  };

  const handleToggleFeaturedProduct = (prodId: string | number) => {
    setSelectedProducts((prev) =>
      prev.map((p) => (String(p.id) === String(prodId) ? { ...p, is_featured: !p.is_featured } : p))
    );
  };

  const handleSaveSolution = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      product_ids: selectedProducts.map((p) => p.id),
      featured_product_ids: selectedProducts.filter((p) => p.is_featured).map((p) => p.id),
    };

    if (editingId) {
      api.put(`solutions/admin/${editingId}/`, payload)
        .then(() => {
          setIsModalOpen(false);
          fetchSolutions();
        })
        .catch((err) => {
          alert('Error saving solution: ' + JSON.stringify(err.response?.data || err.message));
        });
    } else {
      api.post('solutions/admin/list/', payload)
        .then(() => {
          setIsModalOpen(false);
          fetchSolutions();
        })
        .catch((err) => {
          alert('Error creating solution: ' + JSON.stringify(err.response?.data || err.message));
        });
    }
  };

  // Filter Solutions
  const filteredSolutions = solutions.filter((sol) => {
    const matchesSearch =
      sol.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sol.slug.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === 'active') return matchesSearch && sol.is_active;
    if (statusFilter === 'inactive') return matchesSearch && !sol.is_active;
    return matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto bg-slate-50 min-h-screen text-left select-none">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#005F63] uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Product Management</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight font-display">
            Explore by Solutions CMS
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Manage clinical procedure solutions, attach products, set display orders, and control homepage visibility.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#005F63] hover:bg-[#0B7C80] text-white text-xs font-extrabold shadow transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Solution</span>
        </button>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs mb-6">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#005F63] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Solutions ({solutions.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Active ({solutions.filter((s) => s.is_active).length})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              statusFilter === 'inactive'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Inactive ({solutions.filter((s) => !s.is_active).length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by solution name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#005F63]"
          />
        </div>
      </div>

      {/* Solutions Data Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
              <th className="py-3.5 px-4 w-12 text-center">Order</th>
              <th className="py-3.5 px-4 w-16">Banner</th>
              <th className="py-3.5 px-4">Solution Name & Slug</th>
              <th className="py-3.5 px-4 w-28 text-center">Products</th>
              <th className="py-3.5 px-4 w-28 text-center">Status</th>
              <th className="py-3.5 px-4 w-28 text-center">Homepage</th>
              <th className="py-3.5 px-4 w-36 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredSolutions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                  No clinical solutions found. Click "Create New Solution" to get started.
                </td>
              </tr>
            ) : (
              filteredSolutions.map((sol) => (
                <tr key={sol.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-center text-slate-500">
                    {sol.display_order}
                  </td>
                  <td className="py-3 px-4">
                    <img
                      src={sol.thumbnail || sol.banner || '/images/category_equipment.png'}
                      alt={sol.title}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-extrabold text-slate-800 text-sm font-display block">
                      {sol.title}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 font-mono">
                      /solutions/{sol.slug}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[11px]">
                      <Package className="w-3 h-3 text-[#005F63]" />
                      {sol.product_count || 0}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(sol.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                        sol.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {sol.is_active ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-slate-400" />
                          <span>Inactive</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        sol.show_on_homepage
                          ? 'bg-teal-50 text-[#005F63]'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {sol.show_on_homepage ? 'Visible' : 'Hidden'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onPreviewSolution && onPreviewSolution(sol.slug)}
                        title="Preview Solution Page"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#005F63] hover:bg-teal-50 transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(sol)}
                        title="Edit Solution"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#005F63] hover:bg-teal-50 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSolution(sol.id)}
                        title="Delete Solution"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 font-display">
                  {editingId ? 'Edit Clinical Solution' : 'Create New Clinical Solution'}
                </h3>
                <p className="text-xs text-slate-500">
                  Define clinical workflow, attach products, and configure display settings.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 px-6 gap-6 bg-slate-50/50 text-xs font-extrabold">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`py-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'basic'
                    ? 'border-[#005F63] text-[#005F63]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Basic Information
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'products'
                    ? 'border-[#005F63] text-[#005F63]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Product Mapping</span>
                <span className="px-2 py-0.5 rounded-full bg-[#005F63]/10 text-[#005F63] text-[10px]">
                  {selectedProducts.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('images')}
                className={`py-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'images'
                    ? 'border-[#005F63] text-[#005F63]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Banners & Images
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('seo')}
                className={`py-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'seo'
                    ? 'border-[#005F63] text-[#005F63]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                SEO Settings
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveSolution} className="flex-1 overflow-y-auto p-6 text-xs">
              {/* TAB 1: BASIC INFO */}
              {activeTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Solution Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Endodontic Solutions"
                        value={formData.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            title: val,
                            slug: prev.slug || val.toLowerCase().replace(/[^a-z0-0]+/g, '-').replace(/(^-|-$)/g, '')
                          }));
                        }}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:border-[#005F63]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Slug (Auto-generated) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="endodontic-solutions"
                        value={formData.slug}
                        onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold font-mono text-slate-800 focus:outline-none focus:border-[#005F63]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Short Description (Homepage Card) *
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Brief 1-2 sentence overview of the treatment procedure..."
                      value={formData.short_description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, short_description: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:border-[#005F63]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Detailed Clinical Description (Rich Overview)
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Detailed explanation of clinical steps, recommended tools, and clinical outcomes..."
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:border-[#005F63]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Display Order
                      </label>
                      <input
                        type="number"
                        value={formData.display_order}
                        onChange={(e) => setFormData((prev) => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:border-[#005F63]"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                        className="w-4 h-4 text-[#005F63] rounded border-slate-300 focus:ring-[#005F63]"
                      />
                      <label htmlFor="is_active" className="font-bold text-slate-800 cursor-pointer">
                        Is Active Status
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="show_on_homepage"
                        checked={formData.show_on_homepage}
                        onChange={(e) => setFormData((prev) => ({ ...prev, show_on_homepage: e.target.checked }))}
                        className="w-4 h-4 text-[#005F63] rounded border-slate-300 focus:ring-[#005F63]"
                      />
                      <label htmlFor="show_on_homepage" className="font-bold text-slate-800 cursor-pointer">
                        Show on Homepage
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRODUCT MAPPING */}
              {activeTab === 'products' && (
                <div className="space-y-4">
                  {/* Search Autocomplete */}
                  <div className="relative">
                    <label className="block font-bold text-slate-700 mb-1">
                      Search & Attach Products (by Name, SKU, or Brand)
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Type product name or SKU..."
                        value={productSearchInput}
                        onChange={(e) => setProductSearchInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:border-[#005F63]"
                      />
                    </div>

                    {/* Autocomplete Dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {searchResults.map((prod) => (
                          <div
                            key={prod.id}
                            onClick={() => handleAddProductToSolution(prod)}
                            className="p-3 hover:bg-teal-50 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-8 h-8 rounded object-contain border border-slate-200"
                              />
                              <div>
                                <span className="font-bold text-slate-800 block">
                                  {prod.name}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {prod.brand} • SKU: {prod.sku}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs font-black text-[#005F63]">
                              ₹{prod.price.toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Products List */}
                  <div>
                    <h4 className="font-extrabold text-slate-800 mb-2">
                      Attached Products ({selectedProducts.length})
                    </h4>

                    {selectedProducts.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-semibold">
                        No products attached to this solution yet. Search above to add products.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedProducts.map((p, idx) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                                {idx + 1}
                              </span>
                              <div>
                                <span className="font-bold text-slate-800 block">
                                  {p.name}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  SKU: {p.sku} • ₹{p.price.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleToggleFeaturedProduct(p.id)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  p.is_featured
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <Star className={`w-3 h-3 ${p.is_featured ? 'fill-amber-500 stroke-amber-500' : ''}`} />
                                {p.is_featured ? 'Featured' : 'Mark Featured'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemoveProductFromSolution(p.id)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: BANNERS & IMAGES */}
              {activeTab === 'images' && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Banner Image URL / Asset Path
                    </label>
                    <input
                      type="text"
                      placeholder="/images/hero1_ecommerce.png"
                      value={formData.banner}
                      onChange={(e) => setFormData((prev) => ({ ...prev, banner: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:border-[#005F63]"
                    />
                    {formData.banner && (
                      <img
                        src={formData.banner}
                        alt="Banner Preview"
                        className="mt-2 h-32 w-full object-cover rounded-xl border border-slate-200"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Thumbnail Image URL / Asset Path
                    </label>
                    <input
                      type="text"
                      placeholder="/images/category_equipment.png"
                      value={formData.thumbnail}
                      onChange={(e) => setFormData((prev) => ({ ...prev, thumbnail: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:border-[#005F63]"
                    />
                    {formData.thumbnail && (
                      <img
                        src={formData.thumbnail}
                        alt="Thumbnail Preview"
                        className="mt-2 h-24 w-24 object-cover rounded-xl border border-slate-200"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: SEO SETTINGS */}
              {activeTab === 'seo' && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      SEO Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Endodontic Procedure Solutions | FAAZO"
                      value={formData.seo_title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, seo_title: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:border-[#005F63]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      SEO Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Meta description for search engines..."
                      value={formData.seo_description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, seo_description: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:border-[#005F63]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      SEO Keywords
                    </label>
                    <input
                      type="text"
                      placeholder="endodontics, apex locator, endo motor, NiTi files"
                      value={formData.seo_keywords}
                      onChange={(e) => setFormData((prev) => ({ ...prev, seo_keywords: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:border-[#005F63]"
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#005F63] hover:bg-[#0B7C80] text-white font-extrabold shadow transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingId ? 'Save Changes' : 'Create Solution'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExploreSolutionsAdmin;
