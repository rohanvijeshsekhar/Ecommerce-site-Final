'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import type { BannerElement, UniversalBannerLayout, DeviceBreakpoint } from './types';
import { resolveElementTransform, BREAKPOINT_CONFIGS } from './types';
import { getFontFamilyCss } from '@/lib/bannerFonts';
import { getAbsoluteImageUrl } from '@/lib/api';
import { useNaturalAspectRatio } from '@/components/store/banner/PreservedBannerImage';

interface BannerCanvasProps {
  layout: UniversalBannerLayout;
  selectedElementId: string | null;
  activeBreakpoint: DeviceBreakpoint;
  zoom: number; // 0.5 to 1.5
  isPreviewMode: boolean;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (updated: BannerElement) => void;
  onHistorySnapshot: () => void;
  onDeleteElement: (id: string) => void;
}

export const BannerCanvas: React.FC<BannerCanvasProps> = ({
  layout,
  selectedElementId,
  activeBreakpoint,
  zoom,
  isPreviewMode,
  onSelectElement,
  onUpdateElement,
  onHistorySnapshot,
  onDeleteElement,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [snapLineX, setSnapLineX] = useState<number | null>(null);
  const [snapLineY, setSnapLineY] = useState<number | null>(null);

  const bpConfig = BREAKPOINT_CONFIGS[activeBreakpoint];

  // Resolve background image based on active breakpoint
  const bgImage =
    activeBreakpoint === 'mobile' && layout.mobileBackgroundImageUrl
      ? layout.mobileBackgroundImageUrl
      : layout.backgroundImageUrl;

  const { aspectRatio: naturalRatio } = useNaturalAspectRatio(
    bgImage,
    activeBreakpoint === 'mobile'
      ? (layout.mobileBackgroundImageUrl ? '3/3.7' : '2048/762')
      : '2048/762'
  );

  const activeCanvasAspectRatio =
    activeBreakpoint === 'mobile'
      ? (layout.aspectRatio?.mobile && layout.aspectRatio?.mobile !== '3/3.7'
          ? layout.aspectRatio.mobile
          : layout.mobileBackgroundImageUrl
          ? naturalRatio
          : naturalRatio)
      : activeBreakpoint === 'tablet'
      ? (layout.aspectRatio?.tablet && layout.aspectRatio?.tablet !== '2/1'
          ? layout.aspectRatio.tablet
          : naturalRatio)
      : (layout.aspectRatio?.desktop && layout.aspectRatio?.desktop !== '3/1'
          ? layout.aspectRatio.desktop
          : naturalRatio);

  // Keyboard navigation for nudging selected element
  useEffect(() => {
    if (isPreviewMode || !selectedElementId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const el = layout?.elements?.find((item) => item.id === selectedElementId);
      if (!el || el.locked) return;

      const step = e.shiftKey ? 3 : 0.5;
      const t = resolveElementTransform(el, activeBreakpoint);

      let newX = t.x;
      let newY = t.y;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        newX = Math.max(0, t.x - step);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        newX = Math.min(100, t.x + step);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        newY = Math.max(0, t.y - step);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        newY = Math.min(100, t.y + step);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteElement(el.id);
        return;
      } else {
        return;
      }

      const updated = { ...el };
      if (activeBreakpoint === 'desktop') {
        updated.desktop = { ...el.desktop, x: newX, y: newY };
      } else if (activeBreakpoint === 'tablet') {
        updated.tablet = { ...el.tablet, x: newX, y: newY };
      } else {
        updated.mobile = { ...el.mobile, x: newX, y: newY };
      }

      onUpdateElement(updated);
      onHistorySnapshot();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, activeBreakpoint, isPreviewMode, layout.elements]);

  // Dragging handler
  const handleElementPointerDown = (
    el: BannerElement,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    onSelectElement(el.id);

    if (isPreviewMode || el.locked || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const startClientX = e.clientX;
    const startClientY = e.clientY;

    const currentT = resolveElementTransform(el, activeBreakpoint);
    const startX = currentT.x;
    const startY = currentT.y;

    const handlePointerMove = (moveEv: PointerEvent) => {
      const deltaXPercent = ((moveEv.clientX - startClientX) / canvasRect.width) * 100;
      const deltaYPercent = ((moveEv.clientY - startClientY) / canvasRect.height) * 100;

      let nextX = Math.max(0, Math.min(98, startX + deltaXPercent));
      let nextY = Math.max(0, Math.min(98, startY + deltaYPercent));

      // Snap to canvas center (50%)
      if (Math.abs(nextX - 50) < 1.2) {
        nextX = 50;
        setSnapLineX(50);
      } else {
        setSnapLineX(null);
      }

      if (Math.abs(nextY - 50) < 1.2) {
        nextY = 50;
        setSnapLineY(50);
      } else {
        setSnapLineY(null);
      }

      const updated = { ...el };
      if (activeBreakpoint === 'desktop') {
        updated.desktop = { ...el.desktop, x: Math.round(nextX * 10) / 10, y: Math.round(nextY * 10) / 10 };
      } else if (activeBreakpoint === 'tablet') {
        updated.tablet = { ...el.tablet, x: Math.round(nextX * 10) / 10, y: Math.round(nextY * 10) / 10 };
      } else {
        updated.mobile = { ...el.mobile, x: Math.round(nextX * 10) / 10, y: Math.round(nextY * 10) / 10 };
      }

      onUpdateElement(updated);
    };

    const handlePointerUp = () => {
      setSnapLineX(null);
      setSnapLineY(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      onHistorySnapshot();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Resize handler
  const handleResizePointerDown = (
    el: BannerElement,
    handle: string,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    if (isPreviewMode || el.locked || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const startClientX = e.clientX;
    const startClientY = e.clientY;

    const currentT = resolveElementTransform(el, activeBreakpoint);
    const initialX = currentT.x;
    const initialY = currentT.y;
    const initialWidth = typeof currentT.width === 'number' ? currentT.width : 25;
    const initialHeight = typeof currentT.height === 'number' ? currentT.height : 15;

    const handlePointerMove = (moveEv: PointerEvent) => {
      const deltaXPercent = ((moveEv.clientX - startClientX) / canvasRect.width) * 100;
      const deltaYPercent = ((moveEv.clientY - startClientY) / canvasRect.height) * 100;

      let newX = initialX;
      let newY = initialY;
      let newWidth = initialWidth;
      let newHeight = initialHeight;

      if (handle.includes('e')) {
        newWidth = Math.max(5, Math.min(100 - initialX, initialWidth + deltaXPercent));
      }
      if (handle.includes('s')) {
        newHeight = Math.max(4, Math.min(100 - initialY, initialHeight + deltaYPercent));
      }
      if (handle.includes('w')) {
        const potentialWidth = initialWidth - deltaXPercent;
        if (potentialWidth >= 5) {
          newWidth = potentialWidth;
          newX = initialX + deltaXPercent;
        }
      }
      if (handle.includes('n')) {
        const potentialHeight = initialHeight - deltaYPercent;
        if (potentialHeight >= 4) {
          newHeight = potentialHeight;
          newY = initialY + deltaYPercent;
        }
      }

      const updated = { ...el };
      const patch = {
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY * 10) / 10,
        width: Math.round(newWidth * 10) / 10,
        height: Math.round(newHeight * 10) / 10,
      };

      if (activeBreakpoint === 'desktop') {
        updated.desktop = { ...el.desktop, ...patch };
      } else if (activeBreakpoint === 'tablet') {
        updated.tablet = { ...el.tablet, ...patch };
      } else {
        updated.mobile = { ...el.mobile, ...patch };
      }

      onUpdateElement(updated);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      onHistorySnapshot();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      onClick={() => onSelectElement(null)}
      className="w-full h-full flex-1 overflow-auto bg-slate-900/10 flex items-center justify-center p-8 select-none relative"
      style={{
        backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      {/* Banner Canvas Container with Zoom Scale */}
      <div
        ref={canvasRef}
        style={{
          width: `${bpConfig.width}px`,
          maxWidth: '100%',
          aspectRatio: activeCanvasAspectRatio,
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          backgroundColor: layout.backgroundColor || '#005F63',
          transition: 'width 0.3s ease, aspect-ratio 0.3s ease',
        }}
        className="relative shadow-2xl rounded-xl overflow-hidden border border-slate-300 group"
      >
        {/* Background Image Layer (complete original display, zero cropping) */}
        {bgImage && (
          <div className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getAbsoluteImageUrl(bgImage)}
              alt="Banner Background"
              className="w-full h-full object-contain object-center block select-none pointer-events-none"
            />
          </div>
        )}

        {/* Optional Overlay Gradient */}
        {layout.overlayGradient && layout.overlayGradient !== 'none' && (
          <div
            className="absolute inset-0 pointer-events-none select-none z-1"
            style={{
              background:
                layout.overlayGradient === 'dark'
                  ? 'linear-gradient(to right, rgba(0,0,0,0.7), transparent)'
                  : layout.overlayGradient === 'light'
                  ? 'linear-gradient(to right, rgba(255,255,255,0.85), transparent)'
                  : layout.overlayGradient === 'fade-right'
                  ? 'linear-gradient(to right, rgba(0,95,99,0.85) 40%, transparent 100%)'
                  : 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
              opacity: layout.overlayOpacity ?? 0.25,
            }}
          />
        )}

        {/* Alignment Snap Lines */}
        {snapLineX !== null && (
          <div
            className="absolute top-0 bottom-0 w-[1px] bg-cyan-400 z-50 pointer-events-none"
            style={{ left: `${snapLineX}%` }}
          />
        )}
        {snapLineY !== null && (
          <div
            className="absolute left-0 right-0 h-[1px] bg-cyan-400 z-50 pointer-events-none"
            style={{ top: `${snapLineY}%` }}
          />
        )}

        {/* Overlay Elements Loop */}
        {(layout?.elements || []).map((el) => {
          const t = resolveElementTransform(el, activeBreakpoint);
          if (!t.visible && isPreviewMode) return null;

          const isSelected = !isPreviewMode && el.id === selectedElementId;

          // Render element content based on type
          const renderElementBody = () => {
            const fontCss = getFontFamilyCss(el.typography?.fontFamily);
            const textStyle: React.CSSProperties = {
              fontFamily: fontCss,
              fontSize: `${t.fontSize || el.typography?.fontSize || 16}px`,
              fontWeight:
                el.typography?.fontWeight === 'extrabold'
                  ? 800
                  : el.typography?.fontWeight === 'bold'
                  ? 700
                  : el.typography?.fontWeight === 'semibold'
                  ? 600
                  : el.typography?.fontWeight === 'black'
                  ? 900
                  : 400,
              color: el.typography?.textColor || '#0F172A',
              textAlign: t.textAlign || el.typography?.textAlign || 'left',
              lineHeight: el.typography?.lineHeight || 1.25,
              letterSpacing: el.typography?.letterSpacing || 'normal',
            };

            // 1. Heading
            if (el.type === 'heading') {
              return (
                <h2 style={textStyle} className="tracking-tight wrap-break-word">
                  {el.content || 'Promotional Heading'}
                </h2>
              );
            }

            // 2. Subheading / Description / Custom Text
            if (
              el.type === 'subheading' ||
              el.type === 'description' ||
              el.type === 'promotional_text' ||
              el.type === 'custom_text'
            ) {
              return (
                <p style={textStyle} className="wrap-break-word">
                  {el.content || 'Promotional description and offer details.'}
                </p>
              );
            }

            // 3. Badge or Discount Pill
            if (el.type === 'badge' || el.type === 'discount') {
              return (
                <span
                  style={{
                    ...textStyle,
                    backgroundColor: el.appearance?.backgroundColor || (el.type === 'badge' ? '#E6F4F4' : '#F0FDFA'),
                    borderColor: el.appearance?.borderColor || (el.type === 'badge' ? '#B2DFDB' : '#99F6E4'),
                    borderWidth: `${el.appearance?.borderWidth ?? 1}px`,
                    borderRadius: `${el.appearance?.borderRadius ?? 9999}px`,
                    padding: el.appearance?.padding || '4px 12px',
                    display: 'inline-block',
                  }}
                  className="shadow-2xs font-bold"
                >
                  {el.content || (el.type === 'badge' ? 'LIMITED TIME' : 'UP TO 50% OFF')}
                </span>
              );
            }

            // 4. CTA Button
            if (el.type === 'cta') {
              const cta = el.cta || {};
              const template = cta.template || 'solid';
              let btnClass = 'inline-flex items-center gap-1.5 font-bold transition-all shadow-md ';

              let btnBg = cta.bgColor || '#005F63';
              let btnColor = cta.textColor || '#FFFFFF';
              let btnBorder = cta.borderColor || '#005F63';

              if (template === 'outline') {
                btnBg = 'transparent';
                btnColor = cta.textColor || '#005F63';
                btnBorder = cta.borderColor || '#005F63';
              } else if (template === 'text_link') {
                btnBg = 'transparent';
                btnColor = cta.textColor || '#005F63';
                btnBorder = 'transparent';
                btnClass = 'inline-flex items-center gap-1 font-bold underline ';
              } else if (template === 'soft_filled') {
                btnBg = cta.bgColor || '#E6F4F4';
                btnColor = cta.textColor || '#005F63';
                btnBorder = 'transparent';
              } else if (template === 'dark_premium') {
                btnBg = cta.bgColor || '#0F172A';
                btnColor = '#FFFFFF';
                btnBorder = '#1E293B';
              }

              const paddingClass =
                cta.size === 'small'
                  ? 'px-3 py-1.5 text-xs'
                  : cta.size === 'large'
                  ? 'px-6 py-3 text-base'
                  : 'px-4 py-2 text-sm';

              const rad =
                cta.borderRadius === 'none'
                  ? '0px'
                  : cta.borderRadius === 'sm'
                  ? '4px'
                  : cta.borderRadius === 'lg'
                  ? '12px'
                  : cta.borderRadius === 'full'
                  ? '9999px'
                  : '8px';

              return (
                <button
                  type="button"
                  style={{
                    backgroundColor: btnBg,
                    color: btnColor,
                    borderColor: btnBorder,
                    borderWidth: template === 'outline' ? '1.5px' : '1px',
                    borderRadius: rad,
                    fontFamily: fontCss,
                  }}
                  className={`${btnClass} ${paddingClass}`}
                >
                  <span>{cta.label || 'Shop Now'}</span>
                  {cta.showArrow !== false && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              );
            }

            // 5. Countdown Timer
            if (el.type === 'countdown') {
              const cd = el.countdown || {};
              const tmpl = cd.template || 'minimal_inline';

              return (
                <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-xs text-white px-3 py-2 rounded-lg border border-slate-700/80 shadow-md">
                  <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <div className="flex items-center gap-1 text-xs font-mono font-bold tracking-wider">
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded">02</span>
                    <span>:</span>
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded">14</span>
                    <span>:</span>
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded">35</span>
                  </div>
                  <span className="text-[9px] uppercase text-cyan-300 font-bold ml-1">
                    {tmpl.replace('_', ' ')}
                  </span>
                </div>
              );
            }

            // 6. Image / Artwork
            if (el.type === 'custom_image' || el.type === 'product_image' || el.type === 'logo') {
              const img = el.imageUrl || el.content || '/images/hero_ecommerce.png';
              return (
                <img
                  src={getAbsoluteImageUrl(img)}
                  alt={el.name}
                  className="w-full h-full object-contain pointer-events-none select-none rounded-lg"
                />
              );
            }

            return <div>{el.name}</div>;
          };

          return (
            <div
              key={el.id}
              onPointerDown={(e) => handleElementPointerDown(el, e)}
              style={{
                position: 'absolute',
                left: `${t.x}%`,
                top: `${t.y}%`,
                width: t.width === 'auto' ? 'max-content' : `${t.width}%`,
                height: t.height === 'auto' ? 'auto' : `${t.height}%`,
                transform: `rotate(${t.rotation || 0}deg)`,
                zIndex: el.zIndex,
                opacity: !t.visible ? 0.35 : el.appearance?.opacity ?? 1,
                cursor: isPreviewMode || el.locked ? 'default' : 'move',
              }}
              className={`select-none transition-[opacity] ${
                isSelected
                  ? 'outline-2 outline-teal-500 outline-dashed ring-4 ring-teal-500/20'
                  : !isPreviewMode && !el.locked
                  ? 'hover:outline-1 hover:outline-dashed hover:outline-teal-400/70'
                  : ''
              }`}
            >
              {renderElementBody()}

              {/* Resize Handles (Only for selected element when NOT in preview mode and NOT locked) */}
              {isSelected && !el.locked && (
                <>
                  {/* Coordinate / Dimension Pill Tooltip */}
                  <div className="absolute -top-6 left-0 bg-slate-900 text-cyan-300 text-[10px] font-mono px-1.5 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-50">
                    X: {Math.round(t.x)}% Y: {Math.round(t.y)}% {t.width !== 'auto' && `W: ${Math.round(t.width as number)}%`}
                  </div>

                  {/* 8 Corner and Edge Handles */}
                  {(['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'] as const).map((handle) => {
                    let posStyle: React.CSSProperties = {};
                    if (handle === 'nw') posStyle = { top: -4, left: -4, cursor: 'nwse-resize' };
                    if (handle === 'ne') posStyle = { top: -4, right: -4, cursor: 'nesw-resize' };
                    if (handle === 'se') posStyle = { bottom: -4, right: -4, cursor: 'nwse-resize' };
                    if (handle === 'sw') posStyle = { bottom: -4, left: -4, cursor: 'nesw-resize' };
                    if (handle === 'n') posStyle = { top: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
                    if (handle === 's') posStyle = { bottom: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
                    if (handle === 'w') posStyle = { top: '50%', left: -4, transform: 'translateY(-50%)', cursor: 'ew-resize' };
                    if (handle === 'e') posStyle = { top: '50%', right: -4, transform: 'translateY(-50%)', cursor: 'ew-resize' };

                    return (
                      <div
                        key={handle}
                        onPointerDown={(e) => handleResizePointerDown(el, handle, e)}
                        style={posStyle}
                        className="absolute w-2.5 h-2.5 bg-white border-2 border-teal-600 rounded-full shadow-md z-50 hover:scale-125 transition-transform"
                      />
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
