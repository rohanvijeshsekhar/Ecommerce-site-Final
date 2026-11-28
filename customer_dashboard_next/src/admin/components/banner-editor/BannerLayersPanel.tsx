'use client';

import React, { useState } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronsUp,
  ChevronsDown,
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  Type,
  ImageIcon,
  Clock,
  MousePointer,
  Tag,
  Plus,
  Edit2,
  Check,
} from 'lucide-react';
import type { BannerElement, BannerElementType, DeviceBreakpoint } from './types';

interface BannerLayersPanelProps {
  elements: BannerElement[];
  selectedElementId: string | null;
  activeBreakpoint: DeviceBreakpoint;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (updated: BannerElement) => void;
  onReorderElements: (elements: BannerElement[]) => void;
  onAddElement: (type: BannerElementType) => void;
  onDuplicateElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
}

const ELEMENT_TYPE_ICONS: Record<BannerElementType, React.ReactNode> = {
  heading: <Type className="w-3.5 h-3.5 text-slate-700" />,
  subheading: <Type className="w-3.5 h-3.5 text-slate-500" />,
  description: <Type className="w-3.5 h-3.5 text-slate-500" />,
  promotional_text: <Tag className="w-3.5 h-3.5 text-teal-600" />,
  badge: <Tag className="w-3.5 h-3.5 text-amber-600" />,
  discount: <Tag className="w-3.5 h-3.5 text-emerald-600" />,
  countdown: <Clock className="w-3.5 h-3.5 text-blue-600" />,
  cta: <MousePointer className="w-3.5 h-3.5 text-teal-700" />,
  product_image: <ImageIcon className="w-3.5 h-3.5 text-purple-600" />,
  custom_image: <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />,
  logo: <ImageIcon className="w-3.5 h-3.5 text-slate-700" />,
  feature_icon: <Tag className="w-3.5 h-3.5 text-teal-600" />,
  custom_text: <Type className="w-3.5 h-3.5 text-slate-600" />,
};

export const BannerLayersPanel: React.FC<BannerLayersPanelProps> = ({
  elements,
  selectedElementId,
  activeBreakpoint,
  onSelectElement,
  onUpdateElement,
  onReorderElements,
  onAddElement,
  onDuplicateElement,
  onDeleteElement,
}) => {
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Sort layers top-to-bottom by zIndex (highest on top)
  const sortedLayers = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  const startRename = (el: BannerElement) => {
    setEditingNameId(el.id);
    setEditingNameValue(el.name);
  };

  const saveRename = (el: BannerElement) => {
    if (editingNameValue.trim()) {
      onUpdateElement({ ...el, name: editingNameValue.trim() });
    }
    setEditingNameId(null);
  };

  const toggleVisibility = (el: BannerElement, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeBreakpoint === 'desktop') {
      onUpdateElement({
        ...el,
        desktop: { ...el.desktop, visible: !el.desktop.visible },
      });
    } else if (activeBreakpoint === 'tablet') {
      const current = el.tablet?.visible ?? el.desktop.visible;
      onUpdateElement({
        ...el,
        tablet: { ...el.tablet, visible: !current },
      });
    } else {
      const current = el.mobile?.visible ?? el.desktop.visible;
      onUpdateElement({
        ...el,
        mobile: { ...el.mobile, visible: !current },
      });
    }
  };

  const toggleLock = (el: BannerElement, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateElement({ ...el, locked: !el.locked });
  };

  const moveLayer = (el: BannerElement, direction: 'up' | 'down' | 'top' | 'bottom', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIdx = sortedLayers.findIndex((l) => l.id === el.id);
    if (currentIdx === -1) return;

    const newSorted = [...sortedLayers];
    if (direction === 'up' && currentIdx > 0) {
      const temp = newSorted[currentIdx];
      newSorted[currentIdx] = newSorted[currentIdx - 1];
      newSorted[currentIdx - 1] = temp;
    } else if (direction === 'down' && currentIdx < newSorted.length - 1) {
      const temp = newSorted[currentIdx];
      newSorted[currentIdx] = newSorted[currentIdx + 1];
      newSorted[currentIdx + 1] = temp;
    } else if (direction === 'top') {
      const [item] = newSorted.splice(currentIdx, 1);
      newSorted.unshift(item);
    } else if (direction === 'bottom') {
      const [item] = newSorted.splice(currentIdx, 1);
      newSorted.push(item);
    }

    // Re-assign zIndexes so order is preserved
    const total = newSorted.length;
    const reindexed = newSorted.map((item, index) => ({
      ...item,
      zIndex: (total - index) * 10,
    }));
    onReorderElements(reindexed);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white border-r border-slate-200 select-none">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#005F63]" />
          <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            Layers ({elements.length})
          </span>
        </div>

        {/* Add Element Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#005F63] hover:bg-[#004D50] rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>

          {/* Add Elements Popover */}
          {showAddMenu && (
            <div
              className="absolute left-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-1.5 z-50 text-xs text-slate-700"
              onMouseLeave={() => setShowAddMenu(false)}
            >
              <div className="px-3 py-1 font-bold text-[10px] uppercase text-slate-400">Typography</div>
              <button
                type="button"
                onClick={() => { onAddElement('heading'); setShowAddMenu(false); }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2"
              >
                <Type className="w-3.5 h-3.5 text-slate-700" />
                <span>Main Heading</span>
              </button>
              <button
                type="button"
                onClick={() => { onAddElement('description'); setShowAddMenu(false); }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2"
              >
                <Type className="w-3.5 h-3.5 text-slate-500" />
                <span>Text / Paragraph</span>
              </button>
              <button
                type="button"
                onClick={() => { onAddElement('badge'); setShowAddMenu(false); }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2"
              >
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>Offer Badge</span>
              </button>
              <button
                type="button"
                onClick={() => { onAddElement('discount'); setShowAddMenu(false); }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2"
              >
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                <span>Discount Callout</span>
              </button>

              <div className="border-t border-slate-100 my-1" />
              <div className="px-3 py-1 font-bold text-[10px] uppercase text-slate-400">Interactive</div>
              <button
                type="button"
                onClick={() => { onAddElement('cta'); setShowAddMenu(false); }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2"
              >
                <MousePointer className="w-3.5 h-3.5 text-teal-700" />
                <span>CTA Button</span>
              </button>
              <button
                type="button"
                onClick={() => { onAddElement('countdown'); setShowAddMenu(false); }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2"
              >
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Countdown Timer</span>
              </button>

              <div className="border-t border-slate-100 my-1" />
              <div className="px-3 py-1 font-bold text-[10px] uppercase text-slate-400">Media</div>
              <button
                type="button"
                onClick={() => { onAddElement('custom_image'); setShowAddMenu(false); }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2"
              >
                <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                <span>Image / Illustration</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1.5 space-y-1">
        {sortedLayers.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 px-4">
            No active overlay layers. Click Add to insert elements.
          </div>
        ) : (
          sortedLayers.map((el) => {
            const isSelected = el.id === selectedElementId;
            const isVisible =
              activeBreakpoint === 'desktop'
                ? el.desktop.visible
                : activeBreakpoint === 'tablet'
                ? (el.tablet?.visible ?? el.desktop.visible)
                : (el.mobile?.visible ?? el.desktop.visible);

            return (
              <div
                key={el.id}
                onClick={() => onSelectElement(el.id)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-teal-50/90 border border-teal-300 text-teal-900 shadow-xs'
                    : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                }`}
              >
                {/* Layer Icon & Title */}
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                  <div className="p-1 rounded-md bg-white border border-slate-200 shadow-2xs">
                    {ELEMENT_TYPE_ICONS[el.type] || <Type className="w-3.5 h-3.5 text-slate-500" />}
                  </div>

                  {editingNameId === el.id ? (
                    <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingNameValue}
                        onChange={(e) => setEditingNameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename(el);
                          if (e.key === 'Escape') setEditingNameId(null);
                        }}
                        autoFocus
                        className="px-1.5 py-0.5 text-xs border border-teal-500 rounded bg-white w-full outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => saveRename(el)}
                        className="p-1 text-teal-700 hover:text-teal-900"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span
                      onDoubleClick={() => startRename(el)}
                      className={`truncate font-medium ${
                        !isVisible ? 'line-through text-slate-400' : ''
                      }`}
                      title={el.name}
                    >
                      {el.name}
                    </span>
                  )}
                </div>

                {/* Layer Quick Actions */}
                <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                  {/* Visibility */}
                  <button
                    type="button"
                    onClick={(e) => toggleVisibility(el, e)}
                    className={`p-1 rounded hover:bg-slate-200/70 transition-colors ${
                      !isVisible ? 'text-slate-400' : 'text-slate-600'
                    }`}
                    title={isVisible ? 'Hide layer on this device' : 'Show layer'}
                  >
                    {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-red-500" />}
                  </button>

                  {/* Lock */}
                  <button
                    type="button"
                    onClick={(e) => toggleLock(el, e)}
                    className={`p-1 rounded hover:bg-slate-200/70 transition-colors ${
                      el.locked ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title={el.locked ? 'Locked (Click to unlock)' : 'Lock element position'}
                  >
                    {el.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>

                  {/* Move Up / Down */}
                  <button
                    type="button"
                    onClick={(e) => moveLayer(el, 'up', e)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70"
                    title="Bring Forward"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => moveLayer(el, 'down', e)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70"
                    title="Send Backward"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Duplicate */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateElement(el.id);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70"
                    title="Duplicate Layer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteElement(el.id);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Delete Layer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Layer Order Shortcuts Bar */}
      {selectedElementId && (
        <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-around text-slate-600">
          {(() => {
            const el = elements.find((e) => e.id === selectedElementId);
            if (!el) return null;
            return (
              <>
                <button
                  type="button"
                  onClick={(e) => moveLayer(el, 'top', e)}
                  className="px-2 py-1 text-[11px] font-semibold hover:bg-white rounded border border-transparent hover:border-slate-200 flex items-center gap-1"
                  title="Bring to Front"
                >
                  <ChevronsUp className="w-3 h-3 text-slate-600" />
                  <span>Front</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => moveLayer(el, 'bottom', e)}
                  className="px-2 py-1 text-[11px] font-semibold hover:bg-white rounded border border-transparent hover:border-slate-200 flex items-center gap-1"
                  title="Send to Back"
                >
                  <ChevronsDown className="w-3 h-3 text-slate-600" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => startRename(el)}
                  className="px-2 py-1 text-[11px] font-semibold hover:bg-white rounded border border-transparent hover:border-slate-200 flex items-center gap-1"
                  title="Rename Layer"
                >
                  <Edit2 className="w-3 h-3 text-slate-600" />
                  <span>Rename</span>
                </button>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
