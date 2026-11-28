import React, { useState, useRef, useMemo, useEffect } from 'react';
import { RotateCw, ZoomIn, ZoomOut, RefreshCw, Maximize2, Minimize2, Check, FileText } from 'lucide-react';
import AdminModal from './AdminModal';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  aspectRatio: number; // e.g. 1 for 1:1, 16/9 for 16:9
  originalFile?: File | null;
  onCropSave: (croppedBlob: Blob) => void;
}

const PRESET_BG_COLORS = [
  { name: 'Pure White', hex: '#FFFFFF' },
  { name: 'Mint Clean', hex: '#E8F5F4' },
  { name: 'Warm Cream', hex: '#FFFBEB' },
  { name: 'Slate Ice', hex: '#F1F5F9' },
  { name: 'Dark Navy', hex: '#0F172A' },
];

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  aspectRatio,
  originalFile,
  onCropSave,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [scale, setScale] = useState<number>(1);
  const [rotate, setRotate] = useState<number>(0); // 0, 90, 180, 270
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mode: 'contain' fits entire image with white margins (letterbox); 'cover' crops edges to fill
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [canvasBgColor, setCanvasBgColor] = useState<string>('#FFFFFF');

  // Initial load size tracker
  const [frameSize, setFrameSize] = useState<{ w: number; h: number }>({ w: 320, h: 180 });
  const [baseRenderSize, setBaseRenderSize] = useState<{ w: number; h: number }>({ w: 320, h: 180 });
  const [naturalSize, setNaturalSize] = useState<{ nw: number; nh: number }>({ nw: 1, nh: 1 });

  const memoizedImageSrc = useMemo(() => {
    if (!imageSrc) return '';
    if (imageSrc.startsWith('data:') || imageSrc.startsWith('blob:')) {
      return imageSrc;
    }
    return `${imageSrc}${imageSrc.includes('?') ? '&' : '?'}t=${Date.now()}`;
  }, [imageSrc]);

  // Compute frame boundary and base render size
  const computeSizes = (nw: number, nh: number, mode: 'contain' | 'cover') => {
    const maxFrameW = 340;
    const maxFrameH = 300;
    let fw = maxFrameW;
    let fh = maxFrameW / (aspectRatio || 1);

    if (fh > maxFrameH) {
      fh = maxFrameH;
      fw = maxFrameH * (aspectRatio || 1);
    }

    setFrameSize({ w: Math.round(fw), h: Math.round(fh) });

    let rw = fw;
    let rh = fw * (nh / nw);

    if (mode === 'contain') {
      // Contain mode: entire image fits inside frame (letterbox/pillarbox with white margins)
      if (rh > fh) {
        rh = fh;
        rw = fh * (nw / nh);
      }
    } else {
      // Cover mode: fill frame edge-to-edge
      if (rh < fh) {
        rh = fh;
        rw = fh * (nw / nh);
      }
    }

    setBaseRenderSize({ w: Math.round(rw), h: Math.round(rh) });
  };

  // Calculate sizes on image load
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth || 800;
    const nh = img.naturalHeight || 600;
    setNaturalSize({ nw, nh });
    computeSizes(nw, nh, fitMode);
    setPanX(0);
    setPanY(0);
    setScale(1);
    setRotate(0);
  };

  // Switch fit mode dynamically
  const switchFitMode = (newMode: 'contain' | 'cover') => {
    setFitMode(newMode);
    if (naturalSize.nw > 1 && naturalSize.nh > 1) {
      computeSizes(naturalSize.nw, naturalSize.nh, newMode);
      setPanX(0);
      setPanY(0);
      setScale(1);
    }
  };

  // Reset function
  const handleReset = () => {
    setScale(1);
    setRotate(0);
    setPanX(0);
    setPanY(0);
    if (naturalSize.nw > 1) {
      computeSizes(naturalSize.nw, naturalSize.nh, fitMode);
    }
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

    // High-resolution canvas output (1920px for wide banners, 1200px otherwise)
    const targetW = aspectRatio >= 1.5 ? 1920 : (aspectRatio >= 1 ? 1400 : 1000);
    const targetH = Math.round(targetW / (aspectRatio || 1));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Fill background with chosen background color (default white margins)
    ctx.fillStyle = canvasBgColor;
    ctx.fillRect(0, 0, targetW, targetH);

    // Scaling factor from rendering screen size to target canvas size
    const canvasScale = targetW / (frameSize.w || 1);

    // Center of the panned image on high-res canvas
    const imgCenterX = targetW / 2 + panX * canvasScale;
    const imgCenterY = targetH / 2 + panY * canvasScale;

    ctx.save();
    ctx.translate(imgCenterX, imgCenterY);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-imgCenterX, -imgCenterY);

    const drawW = baseRenderSize.w * canvasScale;
    const drawH = baseRenderSize.h * canvasScale;
    const drawX = imgCenterX - drawW / 2;
    const drawY = imgCenterY - drawH / 2;

    ctx.drawImage(imageRef.current, drawX, drawY, drawW, drawH);
    ctx.restore();

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
      title="Fit & Position Image"
      subtitle="Fit whole artwork with white margins, or fill the frame."
      size="md"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Fit Mode Toggle Header */}
        <div className="w-full flex items-center justify-between gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => switchFitMode('contain')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              fitMode === 'contain'
                ? 'bg-white text-[#005B63] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Preserves entire original artwork and adds clean top/bottom or side white space"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            Fit Whole Image (White Margins)
          </button>
          <button
            type="button"
            onClick={() => switchFitMode('cover')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              fitMode === 'cover'
                ? 'bg-white text-[#005B63] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Scales image to fill the frame completely, cropping edges"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Fill Frame (Crop Edges)
          </button>
        </div>

        {/* Editor Frame Container */}
        <div
          ref={containerRef}
          className="relative bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-800 shadow-inner select-none cursor-move touch-none"
          style={{
            width: '100%',
            maxWidth: '380px',
            height: '320px',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Target Canvas Background Area (White Margin Preview) */}
          <div
            className="absolute rounded-xl transition-colors pointer-events-none"
            style={{
              width: `${frameSize.w}px`,
              height: `${frameSize.h}px`,
              backgroundColor: canvasBgColor,
            }}
          />

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
              transition: isDragging ? 'none' : 'transform 0.12s ease-out',
            }}
          />

          {/* Crop Boundary Indicator & Dark Mask */}
          <div
            className="absolute border-2 border-emerald-500 rounded-xl shadow-[0_0_0_9999px_rgba(15,23,42,0.85)] z-10 pointer-events-none"
            style={{
              width: `${frameSize.w}px`,
              height: `${frameSize.h}px`,
            }}
          >
            {/* Grid overlay */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20 pointer-events-none">
              <div className="border-r border-dashed border-white"></div>
              <div className="border-r border-dashed border-white"></div>
              <div></div>
              <div className="border-b border-dashed border-white col-span-3"></div>
              <div className="border-b border-dashed border-white col-span-3"></div>
            </div>
            {/* Frame Aspect Badge */}
            <span className="absolute top-1.5 left-2 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-mono font-bold tracking-wider uppercase">
              {fitMode === 'contain' ? 'Fit & Letterbox' : 'Fill & Crop'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="w-full space-y-3 px-1">
          {/* Zoom Slider (Allows zoom-out down to 0.25 to add extra white space) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.25, Number((s - 0.1).toFixed(2))))}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Zoom Out (Add more margin)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="0.25"
              max="3.0"
              step="0.02"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="flex-1 accent-[#005B63] h-1.5 bg-slate-100 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(3.0, Number((s + 0.1).toFixed(2))))}
              className="p-1 text-[#005B63] hover:text-[#004e56] transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-600 w-12 text-right">
              {Math.round(scale * 100)}%
            </span>
          </div>

          {/* Quick presets and Margin Color Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
            {/* Margin Color */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500">Margin:</span>
              {PRESET_BG_COLORS.map((bg) => (
                <button
                  key={bg.hex}
                  type="button"
                  onClick={() => setCanvasBgColor(bg.hex)}
                  className={`w-5 h-5 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
                    canvasBgColor === bg.hex ? 'ring-2 ring-[#005B63] scale-110' : 'border-slate-300'
                  }`}
                  style={{ backgroundColor: bg.hex }}
                  title={`${bg.name} margin`}
                >
                  {canvasBgColor === bg.hex && (
                    <Check className={`w-3 h-3 ${bg.hex === '#FFFFFF' || bg.hex === '#E8F5F4' || bg.hex === '#FFFBEB' || bg.hex === '#F1F5F9' ? 'text-slate-800' : 'text-white'}`} />
                  )}
                </button>
              ))}
            </div>

            {/* Rotation and Reset */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRotate}
                className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                title="Rotate 90 degrees"
              >
                <RotateCw className="w-3.5 h-3.5" /> 90°
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                title="Reset zoom and position"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {originalFile && (
                <button
                  type="button"
                  onClick={() => {
                    onCropSave(originalFile);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                  title="Upload original file without adding margins or cropping"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Use Original
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#005B63] text-white rounded-xl text-xs font-bold transition-all shadow hover:bg-[#004b52] cursor-pointer"
              >
                Save Image
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminModal>
  );
};

export default ImageCropModal;
