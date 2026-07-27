import React, { useRef, useState } from 'react';
import { Plus, Trash2, Star, Check, Edit3, ArrowLeft, ArrowRight, X, Crop } from 'lucide-react';
import type { ProductImage } from '../types/admin';
import ImageCropModal from './ImageCropModal';

interface ProductGalleryProps {
  images: ProductImage[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetPrimary: (id: string) => Promise<void>;
  onUpdateAltText: (id: string, altText: string) => Promise<void>;
  onReorder: (reorderedList: ProductImage[]) => Promise<void>;
}

const ProductGallery: React.FC<ProductGalleryProps> = ({
  images = [],
  onUpload,
  onDelete,
  onSetPrimary,
  onUpdateAltText,
  onReorder,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [savingAlt, setSavingAlt] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Crop states
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [recropId, setRecropId] = useState<string | null>(null);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setOriginalFile(file);
      setRecropId(null);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = async (croppedBlob: Blob) => {
    const fileName = originalFile ? originalFile.name : 'cropped-image.jpg';
    const croppedFile = new File([croppedBlob], fileName, { type: 'image/jpeg' });
    setUploading(true);
    setIsCropModalOpen(false);
    try {
      if (recropId) {
        await onDelete(recropId);
      }
      await onUpload(croppedFile);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      setRecropId(null);
    }
  };

  const handleOpenRecrop = (img: ProductImage) => {
    setCropImageSrc(img.image);
    setOriginalFile(null);
    setRecropId(img.id);
    setIsCropModalOpen(true);
  };

  const startEditAlt = (img: ProductImage) => {
    setEditingId(img.id);
    setEditAlt(img.alt_text || '');
  };

  const saveAltText = async () => {
    if (!editingId) return;
    setSavingAlt(true);
    try {
      await onUpdateAltText(editingId, editAlt.trim());
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingAlt(false);
    }
  };

  const moveImage = async (index: number, direction: 'left' | 'right') => {
    const list = [...images].sort((a, b) => a.sort_order - b.sort_order);
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    // Swap sort_order
    const temp = list[index].sort_order;
    list[index].sort_order = list[targetIndex].sort_order;
    list[targetIndex].sort_order = temp;

    // Normalize sort orders 1..N
    const reordered = list.map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));

    await onReorder(reordered);
  };

  const sortedImages = [...images].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Product Gallery Images</h4>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">Add multiple product photos. Reorder them using arrows and set the primary thumbnail image.</p>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#005B63] text-white hover:bg-[#004b52] rounded-xl text-xs font-bold transition-all shadow shrink-0 cursor-pointer disabled:opacity-50"
        >
          {uploading ? (
            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Upload Photos
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              processFile(e.target.files[0]);
            }
          }}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Grid of Images */}
      {sortedImages.length === 0 ? (
        <div className="border border-slate-100 rounded-2xl p-12 text-center text-xs text-slate-400 bg-white italic">
          No product images uploaded. Upload at least one product photo to display in storefront search listings.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedImages.map((img, index) => {
            const isEditing = editingId === img.id;
            return (
              <div
                key={img.id}
                className={`relative group bg-white rounded-2xl border transition-all overflow-hidden flex flex-col ${
                  img.is_primary ? 'border-[#005B63] shadow-sm bg-teal-50/5' : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-slate-50 flex items-center justify-center p-3 relative select-none">
                  <img
                    src={img.image}
                    alt={img.alt_text || "Product image"}
                    className="w-full h-full object-contain"
                  />

                  {/* Primary Crown Badge */}
                  {img.is_primary && (
                    <div className="absolute top-2.5 left-2.5 bg-[#005B63] text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 fill-white" /> Primary
                    </div>
                  )}

                  {/* Top Right Action Overlay (only if not primary) */}
                  {!img.is_primary && (
                    <button
                      type="button"
                      onClick={() => onSetPrimary(img.id)}
                      className="absolute top-2.5 right-2.5 p-1.5 bg-white border border-slate-100 hover:bg-[#E6F2F2] hover:text-[#005B63] text-slate-400 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Set as primary"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Footer specs / Order arrows */}
                <div className="p-3 bg-white border-t border-slate-50 flex flex-col gap-1.5 flex-1 justify-between">
                  {/* Alt text edit container */}
                  {isEditing ? (
                    <div className="flex gap-1">
                      <input
                        value={editAlt}
                        onChange={(e) => setEditAlt(e.target.value)}
                        placeholder="Alt text description"
                        className="w-full px-2 py-1 text-[10px] font-medium border border-slate-200 rounded focus:outline-none focus:border-[#005B63]"
                      />
                      <button
                        type="button"
                        onClick={saveAltText}
                        disabled={savingAlt}
                        className="p-1 bg-emerald-50 text-emerald-600 rounded"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1 bg-slate-50 text-slate-400 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] text-slate-500 font-semibold truncate max-w-[120px]">
                        {img.alt_text || <span className="italic text-slate-300">No alt text description</span>}
                      </p>
                      <button
                        type="button"
                        onClick={() => startEditAlt(img)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5 hover:bg-slate-50 rounded"
                        title="Edit alt text"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Image control tray */}
                  <div className="flex items-center justify-between border-t border-slate-100/50 pt-2 mt-1">
                    {/* Sort triggers */}
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveImage(index, 'left')}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(index, 'right')}
                        disabled={index === sortedImages.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex gap-1 items-center">
                      <button
                        type="button"
                        onClick={() => handleOpenRecrop(img)}
                        className="p-1 text-slate-400 hover:text-[#005B63] hover:bg-[#E6F2F2] rounded cursor-pointer"
                        title="Crop photo"
                      >
                        <Crop className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(img.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isCropModalOpen && (
        <ImageCropModal
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          imageSrc={cropImageSrc}
          aspectRatio={1} // 1:1 aspect ratio for product gallery
          onCropSave={handleCropSave}
        />
      )}
    </div>
  );
};

export default ProductGallery;
