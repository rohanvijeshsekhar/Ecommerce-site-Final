import React, { useState, useRef, useMemo } from 'react';
import { RotateCw, ZoomIn, ZoomOut, RefreshCw, Maximize2, Minimize2, Check, FileText, Layers } from 'lucide-react';
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
  aspectRatio = 16 / 9,
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

  // Mode:
  // 'fit-width' -> Fits 100% to left & right edges (0 side borders). Fitting is strictly at top & bottom.
  // 'match-ratio' -> Adapts canvas to exact artwork aspect ratio (0 margins anywhere).
  // 'cover' -> Fills frame edge-to-edge.
  const [fitMode, setFitMode] = useState<'fit-width' | 'match-ratio' | 'cover'>('fit-width');
  const [canvasBgColor, setCanvasBgColor] = useState<string>('#FFFFFF');

  // Sizes tracker
  const [frameSize, setFrameSize] = useState<{ w: number; h: number }>({ w: 340, h: 191 });
  const [baseRenderSize, setBaseRenderSize] = useState<{ w: number; h: number }>({ w: 340, h: 191 });
  const [naturalSize, setNaturalSize] = useState<{ nw: number; nh: number }>({ nw: 1600, nh: 900 });

  const memoizedImageSrc = useMemo(() => {
    if (!imageSrc) return '';
    if (imageSrc.startsWith('data:') || imageSrc.startsWith('blob:')) {
      return imageSrc;
    }
    return `${imageSrc}${imageSrc.includes('?') ? '&' : '?'}t=${Date.now()}`;
  }, [imageSrc]);

  // Compute frame boundary and base render size
  const computeSizes = (nw: number, nh: number, mode: 'fit-width' | 'match-ratio' | 'cover') => {
    const maxFrameW = 340;
    const maxFrameH = 280;

    let targetRatio = aspectRatio || (16 / 9);
    if (mode === 'match-ratio' && nw > 0 && nh > 0) {
      targetRatio = nw / nh;
    }

    let fw = maxFrameW;
    let fh = maxFrameW / targetRatio;

    if (fh > maxFrameH) {
      fh = maxFrameH;
      fw = maxFrameH * targetRatio;
    }

    setFrameSize({ w: Math.round(fw), h: Math.round(fh) });

    let rw = fw;
    let rh = fw * (nh / nw);

    if (mode === 'fit-width') {
      // 100% FIT TO LEFT AND RIGHT:
      // Width is ALWAYS 100% of the frame (0 side borders).
      // Any margin is placed strictly at the TOP and BOTTOM.
      rw = fw;
      rh = fw * (nh / nw);
    } else if (mode === 'match-ratio') {
      // Frame matches exact image ratio: 0 margins anywhere
      rw = fw;
      rh = fh;
    } else {
      // Cover mode: fill frame completely
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
    const nw = img.naturalWidth || 1600;
    const nh = img.naturalHeight || 900;
    setNaturalSize({ nw, nh });
    computeSizes(nw, nh, fitMode);
    setPanX(0);
    setPanY(0);
    setScale(1);
    setRotate(0);
  };

  // Switch fit mode dynamically
  const switchFitMode = (newMode: 'fit-width' | 'match-ratio' | 'cover') => {
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

  // Touch drag handlers
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

  // Canvas Export & Save
  const handleSave = () => {
    if (!imageRef.current) return;

    let targetRatio = aspectRatio || (16 / 9);
    if (fitMode === 'match-ratio' && naturalSize.nw > 0 && naturalSize.nh > 0) {
      targetRatio = naturalSize.nw / naturalSize.nh;
    }

    // High-resolution canvas output (1920px wide)
    const targetW = 1920;
    const targetH = Math.round(targetW / targetRatio);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Fill background with chosen background color (default white margins)
    ctx.fillStyle = canvasBgColor;
    ctx.fillRect(0, 0, targetW, targetH);

    // Canvas scaling factor from screen frame to high-res canvas
    const canvasScale = targetW / (frameSize.w || 1);

    // In 'fit-width' or 'match-ratio' mode without user pan, image starts at X=0 and spans to X=targetW.
    // ZERO left and right borders!
    const drawW = baseRenderSize.w * canvasScale * scale;
    const drawH = baseRenderSize.h * canvasScale * scale;
    const drawX = (targetW - drawW) / 2 + panX * canvasScale;
    const drawY = (targetH - drawH) / 2 + panY * canvasScale;

    ctx.save();
    ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.translate(-(drawX + drawW / 2), -(drawY + drawH / 2));
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
      subtitle="Fits 100% to left and right edges. Any margins are strictly at top and bottom."
      size="md"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Fit Mode Toggle Header */}
        <div className="w-full flex items-center justify-between gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => switchFitMode('fit-width')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              fitMode === 'fit-width'
                ? 'bg-white text-[#005B63] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Spans 100% of width (0 side borders). Margins only at top & bottom."
          >
            <Minimize2 className="w-3.5 h-3.5" />
            Fit Left & Right (Top/Bottom Margins)
          </button>
          <button
            type="button"
            onClick={() => switchFitMode('match-ratio')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              fitMode === 'match-ratio'
                ? 'bg-white text-[#005B63] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Adapts frame to exact artwork aspect ratio. Zero margins anywhere."
          >
            <Layers className="w-3.5 h-3.5" />
            Exact Artwork Ratio (Zero Margins)
          </button>
          <button
            type="button"
            onClick={() => switchFitMode('cover')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              fitMode === 'cover'
                ? 'bg-white text-[#005B63] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Fills frame edge-to-edge"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Fill
          </button>
        </div>

        {/* Editor Frame Container */}
        <div
          ref={containerRef}
          className="relative bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-800 shadow-inner select-none cursor-move touch-none"
          style={{
            width: '100%',
            maxWidth: '380px',
            height: '300px',
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

          {/* Target Image (Spanning full width) */}
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
            {/* Frame Badge */}
            <span className="absolute top-1.5 left-2 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-mono font-bold tracking-wider uppercase">
              {fitMode === 'fit-width'
                ? 'Fit Left & Right (0 Side Borders)'
                : fitMode === 'match-ratio'
                ? 'Exact Ratio (0 Margins)'
                : 'Fill Frame'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="w-full space-y-3 px-1">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.5, Number((s - 0.05).toFixed(2))))}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.02"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="flex-1 accent-[#005B63] h-1.5 bg-slate-100 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2.5, Number((s + 0.05).toFixed(2))))}
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
                  title="Upload original file without any canvas processing"
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
