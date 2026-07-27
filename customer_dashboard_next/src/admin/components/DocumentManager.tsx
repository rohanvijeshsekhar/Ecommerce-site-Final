import React, { useRef, useState } from 'react';
import { Plus, Trash2, FileText, Link as LinkIcon, Download, Globe } from 'lucide-react';
import type { BrandDocument, ProductDocument } from '../types/admin';

type DocItem = BrandDocument | ProductDocument;

interface DocumentManagerProps {
  documents: DocItem[];
  entityType: 'brand' | 'product';
  onUpload: (data: FormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const BRAND_DOC_TYPES = [
  { value: 'catalogue', label: 'Product Catalogue' },
  { value: 'certification', label: 'Certification Document' },
  { value: 'ifu', label: 'Instructions for Use (IFU)' },
  { value: 'price_list', label: 'Price List' },
  { value: 'other', label: 'Other Documentation' },
];

const PRODUCT_DOC_TYPES = [
  { value: 'brochure', label: 'Product Brochure' },
  { value: 'ifu', label: 'Instructions for Use (IFU)' },
  { value: 'compliance', label: 'Compliance / CE Cert' },
  { value: 'manual', label: 'User Manual' },
  { value: 'other', label: 'Other Documentation' },
];

const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents = [],
  entityType,
  onUpload,
  onDelete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState(entityType === 'brand' ? 'catalogue' : 'brochure');
  const [isPublic, setIsPublic] = useState(true);
  const [externalUrl, setExternalUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const docTypes = entityType === 'brand' ? BRAND_DOC_TYPES : PRODUCT_DOC_TYPES;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 20 * 1024 * 1024) { // 20MB limit for PDFs
        setError("File size exceeds 20MB limit.");
        return;
      }
      setSelectedFile(file);
      setError(null);
      if (!title) {
        // Auto-populate title with file name minus extension
        setTitle(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
      }
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!selectedFile && !externalUrl.trim()) {
      setError("Please select a file or enter an external URL.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('document_type', docType);
      formData.append('is_public', String(isPublic));
      
      if (selectedFile) {
        formData.append('file', selectedFile);
      } else {
        formData.append('external_url', externalUrl.trim());
      }

      await onUpload(formData);
      
      // Reset form
      setTitle('');
      setSelectedFile(null);
      setExternalUrl('');
      setIsPublic(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const getDocTypeLabel = (type: string) => {
    return docTypes.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Upload/Add Form */}
      <form onSubmit={handleAdd} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Upload New Document</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Document Title *</label>
            <input
              type="text"
              placeholder="e.g. User Manual V2, CE Certificate"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#005B63] bg-white font-medium"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#005B63] bg-white font-semibold text-slate-700"
            >
              {docTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* File Upload OR External URL */}
          <div className="space-y-2">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">File Attachment (PDF, DOCX)</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all shadow-sm shrink-0"
              >
                <FileText className="w-4 h-4 text-slate-400" />
                Select File
              </button>
              <span className="text-xs text-slate-500 truncate font-semibold">
                {selectedFile ? selectedFile.name : 'No file selected'}
              </span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Or Hosted External URL</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><LinkIcon className="w-3.5 h-3.5" /></span>
              <input
                type="url"
                placeholder="https://example.com/manual.pdf"
                value={externalUrl}
                onChange={(e) => {
                  setExternalUrl(e.target.value);
                  if (e.target.value) setSelectedFile(null); // Clear file if URL is written
                }}
                disabled={!!selectedFile}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#005B63] bg-white font-medium disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded accent-[#005B63]"
            />
            <span className="text-xs text-slate-600 font-semibold">Make visible to authenticated customers</span>
          </label>

          <button
            type="submit"
            disabled={uploading || !title.trim() || (!selectedFile && !externalUrl.trim())}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#005B63] text-white hover:bg-[#004b52] rounded-xl text-xs font-bold transition-all shadow disabled:opacity-40"
          >
            {uploading ? "Uploading..." : <><Plus className="w-3.5 h-3.5" /> Add Document</>}
          </button>
        </div>

        {error && (
          <p className="text-xs text-rose-500 font-semibold">{error}</p>
        )}
      </form>

      {/* Documents List */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Attached Documents ({documents.length})</h4>
        </div>
        <div className="divide-y divide-slate-100">
          {documents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 italic">
              No files or certificates linked to this item.
            </div>
          ) : (
            documents.map((doc) => {
              const fileUrl = doc.file || doc.external_url;
              return (
                <div key={doc.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/20 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                      {doc.file ? <FileText className="w-4 h-4 text-[#005B63]" /> : <Globe className="w-4 h-4 text-sky-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{doc.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          {getDocTypeLabel(doc.document_type)}
                        </span>
                        {doc.is_public ? (
                          <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100/50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Public</span>
                        ) : (
                          <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Internal Only</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {fileUrl && (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-slate-400 hover:text-[#005B63] hover:bg-slate-50 rounded-xl transition-all"
                        title="Open document"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(doc.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentManager;
