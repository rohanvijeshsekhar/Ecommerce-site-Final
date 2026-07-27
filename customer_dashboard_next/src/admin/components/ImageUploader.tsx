import React, { useRef, useState } from 'react';
import { Upload, X, Crop } from 'lucide-react';
import ImageCropModal from './ImageCropModal';

interface ImageUploaderProps {
  currentUrl?: string | null;
  onUpload: (file: File) => void;
  onRemove?: () => void;
  label?: string;
  className?: string;
  aspectRatio?: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  currentUrl,
  onUpload,
  onRemove,
  label = "Upload Image",
  className = "",
  aspectRatio,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cropper states
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  const getAspectRatio = () => {
    if (aspectRatio !== undefined) return aspectRatio;
    const l = label.toLowerCase();
    if (l.includes('banner') || l.includes('hero')) return 16 / 9;
    if (l.includes('category')) return 4 / 3;
    return 1; // Default aspect ratio for products/logos/brands
  };

  const finalAspectRatio = getAspectRatio();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setError(null);
    // Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError("Unsupported file format. Please upload JPG, PNG, WEBP or GIF.");
      return;
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError("File is too large. Maximum size is 5MB.");
      return;
    }

    // Load file reader to trigger crop modal
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setOriginalFile(file);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = (croppedBlob: Blob) => {
    const fileName = originalFile ? originalFile.name : 'cropped-image.jpg';
    const croppedFile = new File([croppedBlob], fileName, { type: 'image/jpeg' });
    onUpload(croppedFile);
    setIsCropModalOpen(false);
  };

  const handleOpenRecrop = () => {
    if (currentUrl) {
      setCropImageSrc(currentUrl);
      setOriginalFile(null);
      setIsCropModalOpen(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </label>
      
      {currentUrl ? (
        <div 
          className="relative group w-full max-w-[240px] rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 shadow-sm flex items-center justify-center"
          style={{ aspectRatio: finalAspectRatio }}
        >
          <img
            src={currentUrl}
            alt="Upload Preview"
            className="w-full h-full object-contain p-2"
          />
          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 px-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1.5 bg-white/95 rounded-lg text-slate-700 hover:bg-white text-[10px] font-bold transition-all shadow"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleOpenRecrop}
              className="p-1.5 bg-[#005B63] rounded-lg text-white hover:bg-[#004b52] transition-all shadow"
              title="Crop Image"
            >
              <Crop className="w-3.5 h-3.5" />
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="p-1.5 bg-rose-500 rounded-lg text-white hover:bg-rose-600 transition-all shadow"
                title="Remove Image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full max-w-md border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
            dragOver
              ? 'border-[#005B63] bg-[#E6F2F2]/30 scale-[0.99]'
              : 'border-slate-200 bg-slate-50/50 hover:border-[#005B63] hover:bg-slate-50'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">Drag image here or click to browse</p>
            <p className="text-[10px] text-slate-400 mt-1">Supports JPG, PNG, WEBP, GIF (Max 5MB)</p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-500 font-medium">{error}</p>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />

      {/* Image Crop Modal Overlay */}
      {isCropModalOpen && (
        <ImageCropModal
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          imageSrc={cropImageSrc}
          aspectRatio={finalAspectRatio}
          onCropSave={handleCropSave}
        />
      )}
    </div>
  );
};

export default ImageUploader;
