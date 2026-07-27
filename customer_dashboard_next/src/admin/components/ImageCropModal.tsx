import React, { useState, useRef, useMemo } from 'react';
import { RotateCw, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import AdminModal from './AdminModal';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  aspectRatio: number; // e.g. 1 for 1:1, 16/9 for 16:9
  onCropSave: (croppedBlob: Blob) => void;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  aspectRatio,
  onCropSave,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [scale, setScale] = useState<number>(1);
  const [rotate, setRotate] = useState<number>(0); // 0, 90, 180, 270
  const [panX, setPanX] = useState<number>(0);

  const memoizedImageSrc = useMemo(() => {
    if (!imageSrc) return '';
    if (imageSrc.startsWith('data:') || imageSrc.startsWith('blob:')) {
      return imageSrc;
    }
    return `${imageSrc}${imageSrc.includes('?') ? '&' : '?'}t=${Date.now()}`;
  }, [imageSrc]);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initial load size tracker
  const [frameSize, setFrameSize] = useState<{ w: number; h: number }>({ w: 300, h: 300 });
  const [baseRenderSize, setBaseRenderSize] = useState<{ w: number; h: number }>({ w: 300, h: 300 });

  // Calculate sizes on load
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    // Determine crop frame size based on aspect ratio inside a max width/height boundary
    const maxFrameW = 320;
    const maxFrameH = 320;
    let fw = maxFrameW;
    let fh = maxFrameW / aspectRatio;

    if (fh > maxFrameH) {
      fh = maxFrameH;
      fw = maxFrameH * aspectRatio;
    }

    setFrameSize({ w: fw, h: fh });

    // Calculate base rendering dimensions of image to fill the frame (cover)
    let rw = fw;
    let rh = fw * (nh / nw);

    if (rh < fh) {
      rh = fh;
      rw = fh * (nw / nh);
    }

    setBaseRenderSize({ w: rw, h: rh });
    setPanX(0);
    setPanY(0);
    setScale(1);
    setRotate(0);
  };

  // Reset function
  const handleReset = () => {
    setScale(1);
    setRotate(0);
    setPanX(0);
    setPanY(0);
  };

  // Rotate helper
  const handleRotate = () => {
    setRotate((prev) => (prev + 90) % 360);
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - panX, y: e.clientY - panY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.current.x);
    setPanY(e.clientY - dragStart.current.y);
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Touch drag handlers for mobile support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX - panX, y: touch.clientY - panY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPanX(touch.clientX - dragStart.current.x);
    setPanY(touch.clientY - dragStart.current.y);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Canvas Crop & Save
  const handleSave = () => {
    if (!imageRef.current) return;

    // Standard high-res target size based on aspect ratio
    const targetW = aspectRatio >= 1 ? 1200 : 800;
    const targetH = targetW / aspectRatio;

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);

    // Scaling factor from rendering screen size to target canvas size
    const canvasScale = targetW / frameSize.w;

    // Center of the panned image on high-res canvas
    const imgCenterX = targetW / 2 + panX * canvasScale;
    const imgCenterY = targetH / 2 + panY * canvasScale;

    // Translate, rotate, and scale around the panned image center
    ctx.translate(imgCenterX, imgCenterY);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-imgCenterX, -imgCenterY);

    // Compute dimensions and drawing origin to center the image at (imgCenterX, imgCenterY)
    const drawW = baseRenderSize.w * canvasScale;
    const drawH = baseRenderSize.h * canvasScale;
    const drawX = imgCenterX - drawW / 2;
    const drawY = imgCenterY - drawH / 2;

    // Draw the image
    ctx.drawImage(imageRef.current, drawX, drawY, drawW, drawH);

    // Export blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropSave(blob);
        }
      },
      'image/jpeg',
      0.95
    );
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Position & Crop Image"
      subtitle="Zoom, pan, and rotate to fit perfectly within the required frame."
      size="md"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Editor Frame Container */}
        <div
          ref={containerRef}
          className="relative bg-slate-950 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-800 shadow-inner select-none cursor-move touch-none"
          style={{
            width: '340px',
            height: '340px',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Crop Boundary Indicator */}
          <div
            className="absolute border-2 border-emerald-500 rounded-xl shadow-[0_0_0_9999px_rgba(15,23,42,0.7)] z-10 pointer-events-none"
            style={{
              width: `${frameSize.w}px`,
              height: `${frameSize.h}px`,
            }}
          >
            {/* Rule of Thirds Grid Lines Overlay */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
              <div className="border-r border-dashed border-white"></div>
              <div className="border-r border-dashed border-white"></div>
              <div></div>
              <div className="border-b border-dashed border-white col-span-3"></div>
              <div className="border-b border-dashed border-white col-span-3"></div>
            </div>
          </div>

          {/* Target Image */}
          <img
            ref={imageRef}
            src={memoizedImageSrc}
            crossOrigin="anonymous"
            alt="Source Cropping"
            onLoad={handleImageLoad}
            className="absolute origin-center max-w-none pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
              width: `${baseRenderSize.w}px`,
              height: `${baseRenderSize.h}px`,
              transform: `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${scale}) rotate(${rotate}deg)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
          />
        </div>

        {/* Controls */}
        <div className="w-full space-y-4 px-2">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(1, s - 0.1))}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="1"
              max="4"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="flex-1 accent-[#005B63] h-1.5 bg-slate-100 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(4, s + 0.1))}
              className="p-1 text-[#005B63] hover:text-[#004e56] transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-500 w-8 text-right">
              {Math.round(scale * 100)}%
            </span>
          </div>

          {/* Action Tools Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRotate}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" /> Rotate 90°
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-[#005B63] text-white rounded-xl text-xs font-bold transition-all shadow hover:bg-[#004b52] cursor-pointer"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminModal>
  );
};

export default ImageCropModal;
