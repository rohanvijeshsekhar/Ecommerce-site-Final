import React, { useState, useEffect, useRef } from 'react';
import { Plus, ChevronDown, X } from 'lucide-react';
import AdminModal from './AdminModal';
import { adminService } from '../services/adminService';
import ImageUploader from './ImageUploader';
import { useToast } from './Toast';

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

interface BrandOption {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  full_path: string;
  parent: string | null;
  depth?: number;
}

// Depth badge colours for category dropdown
const CAT_DEPTH_BADGE: Record<number, string> = {
  0: 'bg-teal-50 text-[#005B63]',
  1: 'bg-orange-50 text-orange-600',
  2: 'bg-violet-50 text-violet-600',
  3: 'bg-sky-50 text-sky-600',
  4: 'bg-rose-50 text-rose-500',
};
const catDepthBadge = (d: number) => CAT_DEPTH_BADGE[Math.min(d ?? 0, 4)];


// ─────────────────────────────────────────────────────────────────────────────
// Brand Autocomplete Component
// ─────────────────────────────────────────────────────────────────────────────

interface BrandAutocompleteProps {
  value: string;
  onChange: (brandId: string) => void;
  brands: BrandOption[];
  onRefreshRelated: () => Promise<any>;
}

export const BrandAutocomplete: React.FC<BrandAutocompleteProps> = ({
  value,
  onChange,
  brands,
  onRefreshRelated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Tracks the last confirmed display name so click-outside can always restore it
  const confirmedDisplayNameRef = useRef('');
  // Skip the sync effect once after a programmatic set (brand just created)
  const skipNextSyncRef = useRef(false);

  const selectedBrand = brands.find(b => String(b.id) === String(value));

  // Sync search term with selected value
  useEffect(() => {
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    if (selectedBrand) {
      confirmedDisplayNameRef.current = selectedBrand.name;
      setSearchTerm(selectedBrand.name);
    } else if (!value) {
      confirmedDisplayNameRef.current = '';
      setSearchTerm('');
    }
  }, [value, brands]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isModalOpen) return;
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Always restore from confirmed name — avoids issues with async brands list
        setSearchTerm(confirmedDisplayNameRef.current);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModalOpen]);

  const filteredBrands = brands.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (brandId: string) => {
    const brand = brands.find(b => String(b.id) === String(brandId));
    if (brand) {
      confirmedDisplayNameRef.current = brand.name;
      setSearchTerm(brand.name);
    }
    onChange(brandId);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    confirmedDisplayNameRef.current = '';
    onChange('');
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const exactMatch = brands.some(
    b => b.name.toLowerCase() === searchTerm.trim().toLowerCase()
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (selectedBrand && searchTerm === selectedBrand.name) {
              inputRef.current?.select();
            }
          }}
          placeholder="Search and select Brand..."
          className="w-full pl-3 pr-10 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 focus:border-[#005B63] transition-colors bg-white cursor-text"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[150] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filteredBrands.length > 0 ? (
            <div className="py-1">
              {filteredBrands.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelect(b.id)}
                  className={`w-full px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-between ${
                    b.id === value ? 'text-[#005B63] bg-[#E6F2F2]/30' : 'text-slate-700'
                  }`}
                >
                  <span>{b.name} {b.is_active === false && <span className="text-[10px] text-slate-400 font-normal italic"> (Inactive)</span>}</span>
                  {b.id === value && <span className="text-[10px] bg-[#005B63] text-white px-1.5 py-0.5 rounded-md">Selected</span>}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-slate-400 italic">
              No matching brands found
            </div>
          )}

          {!exactMatch && searchTerm.trim() !== '' && (
            <div className="border-t border-slate-100 p-1.5 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full px-2 py-1.5 rounded-lg text-left text-xs font-bold text-[#005B63] hover:bg-[#E6F2F2]/50 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Create New Brand "{searchTerm.trim()}"
              </button>
            </div>
          )}
        </div>
      )}

      <CreateBrandModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialName={searchTerm.trim()}
        onBrandCreated={async (newBrand) => {
          // Set the name immediately so the field shows the brand name
          const createdName = newBrand.name || '';
          confirmedDisplayNameRef.current = createdName;
          setSearchTerm(createdName);
          setIsOpen(false);
          setIsModalOpen(false);
          // Skip the next sync effect run so it doesn't wipe searchTerm
          skipNextSyncRef.current = true;
          // Refresh the list and resolve the ID
          const refreshed = await onRefreshRelated();
          const list: BrandOption[] = refreshed?.brands || [];
          const targetBrand = list.find(b => String(b.id) === String(newBrand.id) || b.name.toLowerCase() === createdName.toLowerCase());
          const brandId = targetBrand?.id || newBrand.id;
          const finalName = targetBrand?.name || createdName;
          confirmedDisplayNameRef.current = finalName;
          if (brandId) {
            skipNextSyncRef.current = true;
            onChange(brandId);
          }
          // Keep the display name
          setSearchTerm(finalName);
        }}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Category Autocomplete Component
// ─────────────────────────────────────────────────────────────────────────────

interface CategoryAutocompleteProps {
  value: string;
  onChange: (categoryId: string) => void;
  categories: CategoryOption[];
  onRefreshRelated: () => Promise<any>;
}

export const CategoryAutocomplete: React.FC<CategoryAutocompleteProps> = ({
  value,
  onChange,
  categories,
  onRefreshRelated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Tracks the last confirmed display name so click-outside can always restore it
  const confirmedDisplayNameRef = useRef('');
  // Skip the sync effect once after a programmatic set (category just created)
  const skipNextSyncRef = useRef(false);

  const selectedCategory = categories.find(c => String(c.id) === String(value));

  useEffect(() => {
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    if (selectedCategory) {
      confirmedDisplayNameRef.current = selectedCategory.full_path;
      setSearchTerm(selectedCategory.full_path);
    } else if (!value) {
      confirmedDisplayNameRef.current = '';
      setSearchTerm('');
    }
  }, [value, categories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isModalOpen) return;
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Always restore from confirmed name — avoids issues with async category list
        setSearchTerm(confirmedDisplayNameRef.current);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModalOpen]);

  const filteredCategories = categories.filter(c =>
    c.full_path.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (categoryId: string) => {
    const hasChildren = categories.some(c => String(c.parent) === String(categoryId));
    const cat = categories.find(c => String(c.id) === String(categoryId));
    if (!cat) return;

    if (hasChildren) {
      // It has subcategories, so we must show them and force selecting one
      const pathWithSeparator = cat.full_path + ' > ';
      confirmedDisplayNameRef.current = pathWithSeparator;
      setSearchTerm(pathWithSeparator);
      setIsOpen(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      // Leaf category, select it
      confirmedDisplayNameRef.current = cat.full_path;
      setSearchTerm(cat.full_path);
      onChange(categoryId);
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    confirmedDisplayNameRef.current = '';
    onChange('');
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const exactMatch = categories.some(
    c => c.name.toLowerCase() === searchTerm.trim().toLowerCase() ||
         c.full_path.toLowerCase() === searchTerm.trim().toLowerCase()
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (selectedCategory && searchTerm === selectedCategory.full_path) {
              inputRef.current?.select();
            }
          }}
          placeholder="Search and select Category (hierarchy path)..."
          className="w-full pl-3 pr-10 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 focus:border-[#005B63] transition-colors bg-white cursor-text"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[150] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filteredCategories.length > 0 ? (
                      <div className="py-1">
              {filteredCategories
                .sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0) || a.full_path.localeCompare(b.full_path))
                .map(c => {
                  const parts = c.full_path.split(' > ');
                  const d = c.depth ?? 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelect(c.id)}
                      className={`w-full px-3 py-2.5 text-left hover:bg-slate-50 transition-colors flex items-start justify-between gap-2 border-b border-slate-50 last:border-0 ${
                        c.id === value ? 'bg-teal-50/40' : ''
                      }`}
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold rounded px-1 py-0.5 flex-shrink-0 ${catDepthBadge(d)}`}>L{d + 1}</span>
                          <span className={`text-xs font-bold truncate ${c.id === value ? 'text-[#005B63]' : 'text-slate-800'}`}>{c.name}</span>
                        </div>
                        {parts.length > 1 && (
                          <span className="text-[10px] text-slate-400 leading-relaxed">
                            {parts.join(' → ')}
                          </span>
                        )}
                      </div>
                      {c.id === value && (
                        <span className="text-[9px] font-black bg-[#005B63] text-white px-1.5 py-0.5 rounded-md flex-shrink-0 mt-0.5">Selected</span>
                      )}
                    </button>
                  );
                })}
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-slate-400 italic">
              No matching categories found
            </div>
          )}

          {!exactMatch && searchTerm.trim() !== '' && (
            <div className="border-t border-slate-100 p-1.5 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full px-2 py-1.5 rounded-lg text-left text-xs font-bold text-[#005B63] hover:bg-[#E6F2F2]/50 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Create New Category "{searchTerm.trim()}"
              </button>
            </div>
          )}
        </div>
      )}

      <CreateCategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialName={searchTerm.trim()}
        categories={categories}
        onCategoryCreated={async (newCategory) => {
          // Set the name immediately so the field shows the created category
          const createdName = newCategory.full_path || newCategory.name || '';
          confirmedDisplayNameRef.current = createdName;
          setSearchTerm(createdName);
          setIsOpen(false);
          setIsModalOpen(false);
          // Skip the next sync effect run
          skipNextSyncRef.current = true;
          // Refresh and resolve the ID
          const refreshed = await onRefreshRelated();
          const list: CategoryOption[] = refreshed?.categories || [];
          const targetCategory = list.find(c => String(c.id) === String(newCategory.id) || c.name.toLowerCase() === newCategory.name.toLowerCase());
          const categoryId = targetCategory?.id || newCategory.id;
          const finalPath = targetCategory?.full_path || createdName;
          confirmedDisplayNameRef.current = finalPath;
          if (categoryId) {
            skipNextSyncRef.current = true;
            onChange(categoryId);
          }
          // Keep the display name as the full path
          setSearchTerm(finalPath);
        }}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Create Brand Modal Component
// ─────────────────────────────────────────────────────────────────────────────

interface CreateBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  onBrandCreated: (newBrand: any) => void;
}

const CreateBrandModal: React.FC<CreateBrandModalProps> = ({
  isOpen,
  onClose,
  initialName,
  onBrandCreated,
}) => {
  const toast = useToast();
  const [name, setName] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [description, setDescription] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initialName
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setCountryOfOrigin('');
      setDescription('');
      setLogoFile(null);
      setLogoPreview(null);
      setError(null);
    }
  }, [isOpen, initialName]);

  const handleUploadLogo = (file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Brand name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      if (countryOfOrigin.trim()) {
        formData.append('country_of_origin', countryOfOrigin.trim());
      }
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const res = await adminService.createBrand(formData);
      if (res.success && res.data) {
        toast.success(`Brand "${res.data.name}" created successfully.`);
        onBrandCreated(res.data);
        // onClose is called by onBrandCreated handler to control timing
      } else {
        setError(res.message || 'Failed to create brand.');
      }
    } catch (err: any) {
      console.error('Error creating brand:', err);
      if (err.response?.data) {
        const resData = err.response.data;
        const msg = resData.name?.[0] || resData.error?.message || resData.message || 'Failed to create brand.';
        setError(msg);
      } else {
        setError(err.message || 'An error occurred while creating the brand.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = "w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 focus:border-[#005B63] transition-colors bg-white";
  const labelClass = "block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1";

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Brand"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-[#005B63] hover:bg-[#004e56] text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Brand'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-xl p-3 text-xs font-semibold">
            {error}
          </div>
        )}

        <div>
          <label className={labelClass}>Brand Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className={fieldClass}
            placeholder="e.g. NSK, Woodpecker, Dentsply"
            required
          />
        </div>

        <div>
          <label className={labelClass}>Country of Origin</label>
          <input
            type="text"
            value={countryOfOrigin}
            onChange={e => setCountryOfOrigin(e.target.value)}
            className={fieldClass}
            placeholder="e.g. Japan, Germany, USA"
          />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className={fieldClass}
            placeholder="Enter brand description, specialized products, or overview..."
            rows={3}
          />
        </div>

        <div>
          <ImageUploader
            currentUrl={logoPreview}
            onUpload={handleUploadLogo}
            onRemove={handleRemoveLogo}
            label="Brand Logo"
          />
        </div>
      </form>
    </AdminModal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Create Category Modal Component
// ─────────────────────────────────────────────────────────────────────────────

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  categories: CategoryOption[];
  onCategoryCreated: (newCategory: any) => void;
}

const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  isOpen,
  onClose,
  initialName,
  categories,
  onCategoryCreated,
}) => {
  const toast = useToast();
  const [name, setName] = useState('');
  const [parent, setParent] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initialName
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setParent('');
      setDescription('');
      setSortOrder('0');
      setImageFile(null);
      setImagePreview(null);
      setError(null);
    }
  }, [isOpen, initialName]);

  const handleUploadImage = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      if (parent) {
        formData.append('parent', parent);
      }
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      formData.append('sort_order', String(Number(sortOrder) || 0));
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const res = await adminService.createCategory(formData);
      if (res.success && res.data) {
        toast.success(`Category "${res.data.name}" created successfully.`);
        onCategoryCreated(res.data);
        // onClose is called by onCategoryCreated handler to control timing
      } else {
        setError(res.message || 'Failed to create category.');
      }
    } catch (err: any) {
      console.error('Error creating category:', err);
      if (err.response?.data) {
        const resData = err.response.data;
        const msg = resData.name?.[0] || resData.error?.message || resData.message || 'Failed to create category.';
        setError(msg);
      } else {
        setError(err.message || 'An error occurred while creating the category.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = "w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005B63]/20 focus:border-[#005B63] transition-colors bg-white";
  const labelClass = "block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1";

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Category"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-[#005B63] hover:bg-[#004e56] text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Category'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-xl p-3 text-xs font-semibold">
            {error}
          </div>
        )}

        <div>
          <label className={labelClass}>Category Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className={fieldClass}
            placeholder="e.g. High Speed Handpieces, Dental Chairs"
            required
          />
        </div>

        <div>
          <label className={labelClass}>Parent Category</label>
          <select
            value={parent}
            onChange={e => setParent(e.target.value)}
            className={fieldClass}
          >
            <option value="">— None (Root Category) —</option>
            {[...categories]
              .sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0) || a.full_path.localeCompare(b.full_path))
              .map(c => (
                <option key={c.id} value={c.id}>
                  {'  '.repeat(c.depth ?? 0)}L{(c.depth ?? 0) + 1} · {c.full_path.split(' > ').join(' → ')}
                </option>
              ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Sort Order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className={fieldClass}
              min="0"
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className={fieldClass}
            placeholder="Enter category description or details..."
            rows={2}
          />
        </div>

        <div>
          <ImageUploader
            currentUrl={imagePreview}
            onUpload={handleUploadImage}
            onRemove={handleRemoveImage}
            label="Category Image / Icon (Optional)"
          />
        </div>
      </form>
    </AdminModal>
  );
};
