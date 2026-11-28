'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Save,
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Eye,
  Sliders,
  Sparkles,
  Check,
} from 'lucide-react';
import type { UniversalBannerLayout, BannerElement, BannerElementType, DeviceBreakpoint } from './types';
import { createDefaultBannerLayout } from './types';
import { BannerLayersPanel } from './BannerLayersPanel';
import { BannerCanvas } from './BannerCanvas';
import { BannerElementSettingsPanel } from './BannerElementSettingsPanel';
import ConfirmDialog from '../ConfirmDialog';

interface UniversalBannerEditorModalProps {
  isOpen: boolean;
  bannerTitle?: string;
  bannerType?: string;
  initialLayout?: UniversalBannerLayout | null;
  bannerRawData?: any; // Fallback banner data if initialLayout is not set yet
  onClose: () => void;
  onSave: (layout: UniversalBannerLayout) => Promise<void> | void;
}

export const UniversalBannerEditorModal: React.FC<UniversalBannerEditorModalProps> = ({
  isOpen,
  bannerTitle = 'Promotional Banner Visual Editor',
  bannerType = 'promo',
  initialLayout,
  bannerRawData = {},
  onClose,
  onSave,
}) => {
  // Initialize layout from initialLayout or build default layout
  const [layout, setLayout] = useState<UniversalBannerLayout>(() => {
    if (initialLayout && initialLayout.elements && initialLayout.elements.length > 0) {
      return { ...initialLayout, enabled: true };
    }
    return createDefaultBannerLayout(bannerRawData, bannerType);
  });

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeBreakpoint, setActiveBreakpoint] = useState<DeviceBreakpoint>('desktop');
  const [zoom, setZoom] = useState<number>(0.85);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<UniversalBannerLayout[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Confirmation dialogs
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Reset or initialize when modal opens or initialLayout changes
  useEffect(() => {
    if (isOpen) {
      const init =
        initialLayout && initialLayout.elements && initialLayout.elements.length > 0
          ? { ...initialLayout, enabled: true }
          : createDefaultBannerLayout(bannerRawData, bannerType);

      setLayout(init);
      setHistory([init]);
      setHistoryIndex(0);
      setSelectedElementId(init.elements[0]?.id || null);
      setActiveBreakpoint('desktop');
      setIsPreviewMode(false);
    }
  }, [isOpen, initialLayout, bannerType]);

  // Push snapshot to history stack
  const pushHistorySnapshot = useCallback(() => {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      const next = [...upToCurrent, JSON.parse(JSON.stringify(layout))];
      if (next.length > 30) next.shift(); // Keep max 30 snapshots
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [layout, historyIndex]);

  // Undo & Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      setLayout(JSON.parse(JSON.stringify(history[targetIndex])));
      setHistoryIndex(targetIndex);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      setLayout(JSON.parse(JSON.stringify(history[targetIndex])));
      setHistoryIndex(targetIndex);
    }
  }, [history, historyIndex]);

  // Keyboard shortcuts for Undo (Ctrl+Z) and Redo (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleUndo, handleRedo]);

  if (!isOpen) return null;

  // Selected element object
  const selectedElement = layout.elements.find((el) => el.id === selectedElementId) || null;

  // Update single element
  const handleUpdateElement = (updated: BannerElement) => {
    setLayout((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === updated.id ? updated : el)),
    }));
  };

  // Reorder elements
  const handleReorderElements = (reordered: BannerElement[]) => {
    setLayout((prev) => ({ ...prev, elements: reordered }));
    pushHistorySnapshot();
  };

  // Add new element
  const handleAddElement = (type: BannerElementType) => {
    const newId = `elem_${type}_${Date.now().toString(36)}`;
    const maxZ = layout.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);

    let defaultName = 'New Element';
    let defaultContent = 'New Promotional Content';
    let defaultWidth: number | 'auto' = 40;
    let defaultHeight: number | 'auto' = 'auto';

    if (type === 'heading') {
      defaultName = 'Main Heading';
      defaultContent = 'Promotional Headline';
      defaultWidth = 60;
    } else if (type === 'description') {
      defaultName = 'Text Block';
      defaultContent = 'Add descriptive copy and offer terms here.';
      defaultWidth = 50;
    } else if (type === 'badge') {
      defaultName = 'Offer Badge';
      defaultContent = 'HOT DEAL';
      defaultWidth = 'auto';
    } else if (type === 'discount') {
      defaultName = 'Discount Tag';
      defaultContent = 'SAVE 30%';
      defaultWidth = 'auto';
    } else if (type === 'cta') {
      defaultName = 'CTA Button';
      defaultContent = '';
      defaultWidth = 'auto';
    } else if (type === 'countdown') {
      defaultName = 'Countdown Timer';
      defaultContent = '';
      defaultWidth = 'auto';
    } else if (type === 'custom_image') {
      defaultName = 'Promotional Image';
      defaultContent = '';
      defaultWidth = 35;
      defaultHeight = 45;
    }

    const newElement: BannerElement = {
      id: newId,
      type,
      name: defaultName,
      zIndex: maxZ + 10,
      content: defaultContent,
      typography: {
        fontFamily: 'Inter',
        fontSize: type === 'heading' ? 36 : type === 'description' ? 15 : 13,
        fontWeight: type === 'heading' ? 'extrabold' : 'normal',
        textColor: '#0F172A',
      },
      desktop: { x: 15, y: 30, width: defaultWidth, height: defaultHeight, visible: true },
      mobile: { x: 10, y: 25, width: defaultWidth === 'auto' ? 'auto' : 80, height: defaultHeight, visible: true },
    };

    setLayout((prev) => ({
      ...prev,
      elements: [...prev.elements, newElement],
    }));
    setSelectedElementId(newId);
    pushHistorySnapshot();
  };

  // Duplicate element
  const handleDuplicateElement = (id: string) => {
    const target = layout.elements.find((el) => el.id === id);
    if (!target) return;

    const newId = `elem_${target.type}_${Date.now().toString(36)}`;
    const maxZ = layout.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);

    const clone: BannerElement = {
      ...JSON.parse(JSON.stringify(target)),
      id: newId,
      name: `${target.name} (Copy)`,
      zIndex: maxZ + 10,
      desktop: {
        ...target.desktop,
        x: Math.min(95, target.desktop.x + 3),
        y: Math.min(95, target.desktop.y + 3),
      },
      mobile: target.mobile
        ? {
            ...target.mobile,
            x: Math.min(95, (target.mobile.x ?? target.desktop.x) + 3),
            y: Math.min(95, (target.mobile.y ?? target.desktop.y) + 3),
          }
        : undefined,
    };

    setLayout((prev) => ({
      ...prev,
      elements: [...prev.elements, clone],
    }));
    setSelectedElementId(newId);
    pushHistorySnapshot();
  };

  // Delete element
  const handleDeleteElement = (id: string) => {
    setLayout((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== id),
    }));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
    pushHistorySnapshot();
  };

  // Reset element position
  const handleResetElementPosition = (id: string) => {
    const defaultLayout = createDefaultBannerLayout(bannerRawData, bannerType);
    const defEl = defaultLayout.elements.find((e) => e.id === id || e.type === selectedElement?.type);
    if (!defEl || !selectedElement) return;

    handleUpdateElement({
      ...selectedElement,
      desktop: { ...defEl.desktop },
      tablet: defEl.tablet ? { ...defEl.tablet } : undefined,
      mobile: defEl.mobile ? { ...defEl.mobile } : undefined,
    });
    pushHistorySnapshot();
  };

  // Reset entire layout
  const handleResetEntireLayout = () => {
    const fresh = createDefaultBannerLayout(bannerRawData, bannerType);
    setLayout(fresh);
    setSelectedElementId(fresh.elements[0]?.id || null);
    pushHistorySnapshot();
    setShowResetConfirm(false);
  };

  // Save changes
  const handleSaveAndPublish = async () => {
    setSaving(true);
    try {
      await onSave({ ...layout, enabled: true });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4">
      <div className="w-full h-full max-w-[1720px] max-h-[96vh] bg-slate-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300">
        {/* Top Studio Control Bar */}
        <div className="h-14 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 select-none">
          {/* Left Title & Status */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-teal-50 border border-teal-200">
              <Sparkles className="w-4 h-4 text-[#005F63]" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 leading-tight">
                {bannerTitle}
              </h1>
              <p className="text-[11px] text-slate-500">
                Universal Visual Positioning & Typography Studio
              </p>
            </div>
          </div>

          {/* Center: Device Breakpoints & Preview Toggle */}
          <div className="flex items-center gap-3">
            {/* Device Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {(
                [
                  { id: 'desktop', label: 'Desktop', icon: Monitor },
                  { id: 'tablet', label: 'Tablet', icon: Tablet },
                  { id: 'mobile', label: 'Mobile', icon: Smartphone },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveBreakpoint(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeBreakpoint === id
                      ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Mode: Edit vs Preview */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setIsPreviewMode(false)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  !isPreviewMode
                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Editor</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPreviewMode(true);
                  setSelectedElementId(null);
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  isPreviewMode
                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            </div>

            {/* Undo / Redo */}
            <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                className="text-slate-500 hover:text-slate-800"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] font-bold text-slate-700 w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
                className="text-slate-500 hover:text-slate-800"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Layout</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveAndPublish}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#005F63] hover:bg-[#004D50] rounded-lg shadow-sm transition-colors disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save & Publish'}</span>
            </button>
          </div>
        </div>

        {/* Studio Workspace 3-Pane Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Layers Panel */}
          <div className="w-64 xl:w-72 shrink-0 h-full overflow-hidden">
            <BannerLayersPanel
              elements={layout.elements}
              selectedElementId={selectedElementId}
              activeBreakpoint={activeBreakpoint}
              onSelectElement={setSelectedElementId}
              onUpdateElement={handleUpdateElement}
              onReorderElements={handleReorderElements}
              onAddElement={handleAddElement}
              onDuplicateElement={handleDuplicateElement}
              onDeleteElement={(id) => setDeleteTargetId(id)}
            />
          </div>

          {/* Center Pane: Interactive Canvas */}
          <div className="flex-1 h-full overflow-hidden relative">
            <BannerCanvas
              layout={layout}
              selectedElementId={selectedElementId}
              activeBreakpoint={activeBreakpoint}
              zoom={zoom}
              isPreviewMode={isPreviewMode}
              onSelectElement={setSelectedElementId}
              onUpdateElement={handleUpdateElement}
              onHistorySnapshot={pushHistorySnapshot}
              onDeleteElement={(id) => setDeleteTargetId(id)}
            />
          </div>

          {/* Right Pane: Element Settings Panel */}
          <div className="w-72 xl:w-80 shrink-0 h-full overflow-hidden">
            <BannerElementSettingsPanel
              element={selectedElement}
              activeBreakpoint={activeBreakpoint}
              onUpdateElement={handleUpdateElement}
              onResetElementPosition={handleResetElementPosition}
            />
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Reset Banner Layout?"
        message="This will reset all manual element positions and typography to the default template coordinates. Any unsaved custom positioning will be discarded."
        confirmLabel="Reset to Defaults"
        variant="danger"
        onConfirm={handleResetEntireLayout}
        onClose={() => setShowResetConfirm(false)}
      />

      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        title="Delete Layer?"
        message="Are you sure you want to remove this element from the banner? This action can be undone using Ctrl+Z."
        confirmLabel="Delete Element"
        variant="danger"
        onConfirm={() => {
          if (deleteTargetId) handleDeleteElement(deleteTargetId);
          setDeleteTargetId(null);
        }}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
