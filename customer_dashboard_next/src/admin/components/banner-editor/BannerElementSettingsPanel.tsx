'use client';

import React from 'react';
import {
  Sliders,
  Type,
  Palette,
  Maximize2,
  Move,
  RotateCw,
  Layers,
  MousePointer,
  Clock,
  ExternalLink,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImageIcon,
} from 'lucide-react';
import type { BannerElement, DeviceBreakpoint } from './types';
import { resolveElementTransform } from './types';
import { BANNER_FONTS } from '@/lib/bannerFonts';

interface BannerElementSettingsPanelProps {
  element: BannerElement | null;
  activeBreakpoint: DeviceBreakpoint;
  onUpdateElement: (updated: BannerElement) => void;
  onResetElementPosition: (id: string) => void;
}

export const BannerElementSettingsPanel: React.FC<BannerElementSettingsPanelProps> = ({
  element,
  activeBreakpoint,
  onUpdateElement,
  onResetElementPosition,
}) => {
  if (!element) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-white border-l border-slate-200 select-none">
        <Sliders className="w-8 h-8 text-slate-300 mb-2" />
        <p className="text-xs font-semibold text-slate-500">No Element Selected</p>
        <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
          Click any element on the banner canvas or select a layer to customize positioning and styling.
        </p>
      </div>
    );
  }

  const transform = resolveElementTransform(element, activeBreakpoint);

  // Helper to update active breakpoint transform
  const updateTransform = (changes: Partial<typeof transform>) => {
    if (activeBreakpoint === 'desktop') {
      onUpdateElement({
        ...element,
        desktop: { ...element.desktop, ...changes },
      });
    } else if (activeBreakpoint === 'tablet') {
      onUpdateElement({
        ...element,
        tablet: { ...element.tablet, ...changes },
      });
    } else {
      onUpdateElement({
        ...element,
        mobile: { ...element.mobile, ...changes },
      });
    }
  };

  const isTextElement = [
    'heading',
    'subheading',
    'description',
    'promotional_text',
    'badge',
    'discount',
    'custom_text',
  ].includes(element.type);

  return (
    <div className="w-full h-full flex flex-col bg-white border-l border-slate-200 select-none overflow-y-auto divide-y divide-slate-100 text-xs">
      {/* Element Header */}
      <div className="p-3.5 bg-slate-50/80 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            {element.name}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-medium border border-teal-200">
              Editing: {activeBreakpoint.toUpperCase()}
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-mono">
              {element.type}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onResetElementPosition(element.id)}
          className="text-[11px] text-slate-500 hover:text-red-600 px-2 py-1 rounded hover:bg-slate-200/50 transition-colors"
          title="Reset position to default coordinates"
        >
          Reset Position
        </button>
      </div>

      {/* Content Text Editor (if text element) */}
      {isTextElement && (
        <div className="p-3.5 space-y-2">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-[#005F63]" />
            <span>Text Content</span>
          </label>
          <textarea
            value={element.content || ''}
            onChange={(e) => onUpdateElement({ ...element, content: e.target.value })}
            rows={element.type === 'heading' ? 2 : 3}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs text-slate-800"
            placeholder="Enter text..."
          />
        </div>
      )}

      {/* Position & Coordinates */}
      <div className="p-3.5 space-y-3">
        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Move className="w-3.5 h-3.5 text-[#005F63]" />
          <span>Position & Dimensions (%)</span>
        </label>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[10px] font-semibold text-slate-500">X (Horizontal %)</label>
            <div className="flex items-center gap-1 mt-0.5">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={Math.round(transform.x * 10) / 10}
                onChange={(e) => updateTransform({ x: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) })}
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"
              />
              <span className="text-slate-400 font-mono text-[11px]">%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={transform.x}
              onChange={(e) => updateTransform({ x: parseFloat(e.target.value) })}
              className="w-full accent-teal-600 mt-1 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-500">Y (Vertical %)</label>
            <div className="flex items-center gap-1 mt-0.5">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={Math.round(transform.y * 10) / 10}
                onChange={(e) => updateTransform({ y: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) })}
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"
              />
              <span className="text-slate-400 font-mono text-[11px]">%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={transform.y}
              onChange={(e) => updateTransform({ y: parseFloat(e.target.value) })}
              className="w-full accent-teal-600 mt-1 cursor-pointer"
            />
          </div>
        </div>

        {/* Width & Height */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-slate-500">Width</label>
              <button
                type="button"
                onClick={() => updateTransform({ width: transform.width === 'auto' ? 50 : 'auto' })}
                className="text-[9px] text-teal-700 font-medium hover:underline"
              >
                {transform.width === 'auto' ? 'Custom %' : 'Auto'}
              </button>
            </div>
            {transform.width === 'auto' ? (
              <div className="py-1 px-2 border border-slate-200 rounded text-slate-400 text-center mt-0.5">
                Auto
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={transform.width}
                  onChange={(e) => updateTransform({ width: Math.max(5, Math.min(100, parseFloat(e.target.value) || 20)) })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                />
                <span className="text-slate-400 font-mono text-[11px]">%</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-slate-500">Height</label>
              <button
                type="button"
                onClick={() => updateTransform({ height: transform.height === 'auto' ? 30 : 'auto' })}
                className="text-[9px] text-teal-700 font-medium hover:underline"
              >
                {transform.height === 'auto' ? 'Custom %' : 'Auto'}
              </button>
            </div>
            {transform.height === 'auto' ? (
              <div className="py-1 px-2 border border-slate-200 rounded text-slate-400 text-center mt-0.5">
                Auto
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={transform.height}
                  onChange={(e) => updateTransform({ height: Math.max(5, Math.min(100, parseFloat(e.target.value) || 20)) })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                />
                <span className="text-slate-400 font-mono text-[11px]">%</span>
              </div>
            )}
          </div>
        </div>

        {/* Rotation & Z-Index */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div>
            <label className="text-[10px] font-semibold text-slate-500">Rotation (°)</label>
            <div className="flex items-center gap-1 mt-0.5">
              <input
                type="number"
                min={0}
                max={360}
                value={transform.rotation || 0}
                onChange={(e) => updateTransform({ rotation: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"
              />
              <span className="text-slate-400 font-mono text-[11px]">deg</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500">Layer Z-Index</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={element.zIndex}
              onChange={(e) => onUpdateElement({ ...element, zIndex: parseInt(e.target.value) || 10 })}
              className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono mt-0.5"
            />
          </div>
        </div>
      </div>

      {/* Typography Settings (for text or CTA) */}
      {(isTextElement || element.type === 'cta') && (
        <div className="p-3.5 space-y-3">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-[#005F63]" />
            <span>Typography</span>
          </label>

          {/* Font Family */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500">Font Family</label>
            <select
              value={element.typography?.fontFamily || 'Inter'}
              onChange={(e) =>
                onUpdateElement({
                  ...element,
                  typography: { ...element.typography, fontFamily: e.target.value },
                })
              }
              className="w-full px-2 py-1 text-xs border border-slate-300 rounded mt-0.5 bg-white font-medium"
            >
              {BANNER_FONTS.map((font) => (
                <option key={font.id} value={font.id}>
                  {font.name}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size & Weight */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-semibold text-slate-500">
                Font Size ({activeBreakpoint})
              </label>
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="number"
                  min={10}
                  max={96}
                  value={transform.fontSize || element.typography?.fontSize || 16}
                  onChange={(e) => updateTransform({ fontSize: parseInt(e.target.value) || 16 })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                />
                <span className="text-slate-400 font-mono text-[11px]">px</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-500">Font Weight</label>
              <select
                value={element.typography?.fontWeight || 'bold'}
                onChange={(e) =>
                  onUpdateElement({
                    ...element,
                    typography: { ...element.typography, fontWeight: e.target.value as any },
                  })
                }
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded mt-0.5 bg-white"
              >
                <option value="normal">Normal (400)</option>
                <option value="medium">Medium (500)</option>
                <option value="semibold">Semibold (600)</option>
                <option value="bold">Bold (700)</option>
                <option value="extrabold">Extra Bold (800)</option>
                <option value="black">Black (900)</option>
              </select>
            </div>
          </div>

          {/* Text Color & Text Align */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-semibold text-slate-500">Text Color</label>
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="color"
                  value={element.typography?.textColor || '#0F172A'}
                  onChange={(e) =>
                    onUpdateElement({
                      ...element,
                      typography: { ...element.typography, textColor: e.target.value },
                    })
                  }
                  className="w-7 h-7 p-0 border border-slate-200 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={element.typography?.textColor || '#0F172A'}
                  onChange={(e) =>
                    onUpdateElement({
                      ...element,
                      typography: { ...element.typography, textColor: e.target.value },
                    })
                  }
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-500">Alignment</label>
              <div className="flex items-center gap-1 mt-0.5 border border-slate-200 rounded p-0.5 bg-slate-50">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => updateTransform({ textAlign: align })}
                    className={`flex-1 py-1 rounded flex justify-center ${
                      transform.textAlign === align ? 'bg-white shadow-xs text-teal-800 font-bold' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    {align === 'left' ? <AlignLeft className="w-3.5 h-3.5" /> : align === 'center' ? <AlignCenter className="w-3.5 h-3.5" /> : <AlignRight className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Button Specific Settings (when type === 'cta') */}
      {element.type === 'cta' && (
        <div className="p-3.5 space-y-3 bg-teal-50/20">
          <label className="block text-[11px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
            <MousePointer className="w-3.5 h-3.5 text-teal-700" />
            <span>CTA Button Settings</span>
          </label>

          <div>
            <label className="text-[10px] font-semibold text-slate-500">Button Label</label>
            <input
              type="text"
              value={element.cta?.label || 'Shop Now'}
              onChange={(e) =>
                onUpdateElement({
                  ...element,
                  cta: { ...element.cta, label: e.target.value },
                })
              }
              className="w-full px-2 py-1 text-xs border border-slate-300 rounded mt-0.5"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-500">Destination URL</label>
            <input
              type="text"
              value={element.cta?.link || '/offers'}
              onChange={(e) =>
                onUpdateElement({
                  ...element,
                  cta: { ...element.cta, link: e.target.value },
                })
              }
              placeholder="/offers or https://..."
              className="w-full px-2 py-1 text-xs border border-slate-300 rounded mt-0.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-semibold text-slate-500">Design Template</label>
              <select
                value={element.cta?.template || 'solid'}
                onChange={(e) =>
                  onUpdateElement({
                    ...element,
                    cta: { ...element.cta, template: e.target.value as any },
                  })
                }
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded mt-0.5 bg-white"
              >
                <option value="solid">Minimal Solid</option>
                <option value="outline">Outline</option>
                <option value="text_link">Text Link</option>
                <option value="soft_filled">Soft Filled</option>
                <option value="dark_premium">Premium Dark</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-500">Button Size</label>
              <select
                value={element.cta?.size || 'medium'}
                onChange={(e) =>
                  onUpdateElement({
                    ...element,
                    cta: { ...element.cta, size: e.target.value as any },
                  })
                }
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded mt-0.5 bg-white"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={element.cta?.showArrow !== false}
                onChange={(e) =>
                  onUpdateElement({
                    ...element,
                    cta: { ...element.cta, showArrow: e.target.checked },
                  })
                }
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>Show Arrow</span>
            </label>

            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={element.cta?.openNewTab || false}
                onChange={(e) =>
                  onUpdateElement({
                    ...element,
                    cta: { ...element.cta, openNewTab: e.target.checked },
                  })
                }
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>Open in New Tab</span>
            </label>
          </div>
        </div>
      )}

      {/* Countdown Specific Settings (when type === 'countdown') */}
      {element.type === 'countdown' && (
        <div className="p-3.5 space-y-3 bg-blue-50/20">
          <label className="block text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Countdown Settings</span>
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-semibold text-slate-500">Design Template</label>
              <select
                value={element.countdown?.template || 'minimal_inline'}
                onChange={(e) =>
                  onUpdateElement({
                    ...element,
                    countdown: { ...element.countdown, template: e.target.value as any },
                  })
                }
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded mt-0.5 bg-white"
              >
                <option value="minimal_inline">Minimal Inline</option>
                <option value="compact_cards">Compact Cards</option>
                <option value="elegant_text">Elegant Text</option>
                <option value="outlined">Outlined</option>
                <option value="dark_premium">Dark Premium</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-500">Scale / Size</label>
              <select
                value={element.countdown?.size || 'regular'}
                onChange={(e) =>
                  onUpdateElement({
                    ...element,
                    countdown: { ...element.countdown, size: e.target.value as any },
                  })
                }
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded mt-0.5 bg-white"
              >
                <option value="compact">Compact</option>
                <option value="regular">Regular</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Appearance & Borders */}
      <div className="p-3.5 space-y-3">
        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-[#005F63]" />
          <span>Appearance & Borders</span>
        </label>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[10px] font-semibold text-slate-500">Background Color</label>
            <div className="flex items-center gap-1 mt-0.5">
              <input
                type="color"
                value={element.appearance?.backgroundColor || '#ffffff'}
                onChange={(e) =>
                  onUpdateElement({
                    ...element,
                    appearance: { ...element.appearance, backgroundColor: e.target.value },
                  })
                }
                className="w-7 h-7 p-0 border border-slate-200 rounded cursor-pointer"
              />
              <input
                type="text"
                value={element.appearance?.backgroundColor || ''}
                onChange={(e) =>
                  onUpdateElement({
                    ...element,
                    appearance: { ...element.appearance, backgroundColor: e.target.value },
                  })
                }
                placeholder="transparent"
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-500">Border Color</label>
            <div className="flex items-center gap-1 mt-0.5">
              <input
                type="color"
                value={element.appearance?.borderColor || '#cccccc'}
                onChange={(e) =>
                  onUpdateElement({
                    ...element,
                    appearance: { ...element.appearance, borderColor: e.target.value },
                  })
                }
                className="w-7 h-7 p-0 border border-slate-200 rounded cursor-pointer"
              />
              <input
                type="text"
                value={element.appearance?.borderColor || ''}
                onChange={(e) =>
                  onUpdateElement({
                    ...element,
                    appearance: { ...element.appearance, borderColor: e.target.value },
                  })
                }
                placeholder="none"
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[10px] font-semibold text-slate-500">Border Radius (px)</label>
            <input
              type="number"
              min={0}
              max={999}
              value={element.appearance?.borderRadius ?? 0}
              onChange={(e) =>
                onUpdateElement({
                  ...element,
                  appearance: { ...element.appearance, borderRadius: parseInt(e.target.value) || 0 },
                })
              }
              className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono mt-0.5"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-500">Opacity (0 - 1)</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={element.appearance?.opacity ?? 1}
              onChange={(e) =>
                onUpdateElement({
                  ...element,
                  appearance: { ...element.appearance, opacity: parseFloat(e.target.value) || 1 },
                })
              }
              className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono mt-0.5"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
