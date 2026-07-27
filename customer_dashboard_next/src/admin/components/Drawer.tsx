import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Drawer — Slide-in side panel
// ─────────────────────────────────────────────────────────────────────────────

type DrawerWidth = 'sm' | 'md' | 'lg' | 'full';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  width?: DrawerWidth;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: 'right' | 'left';
}

const WIDTH_MAP: Record<DrawerWidth, string> = {
  sm: 'w-full max-w-[380px]',
  md: 'w-full max-w-[520px]',
  lg: 'w-full max-w-[700px]',
  full: 'w-full',
};

const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  width = 'md',
  children,
  footer,
  side = 'right',
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mounted, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (!mounted) return;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mounted, isOpen]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed ${side === 'right' ? 'right-0 top-0 bottom-0' : 'left-0 top-0 bottom-0'}
          z-[151] flex flex-col bg-white shadow-2xl
          ${WIDTH_MAP[width]}
          transition-transform duration-300 ease-out
          ${isOpen
            ? 'translate-x-0'
            : side === 'right' ? 'translate-x-full' : '-translate-x-full'}`}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 shrink-0">
            <div>
              {title && <h2 className="text-base font-bold text-slate-800">{title}</h2>}
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600
                transition-colors shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
            {footer}
          </div>
        )}
      </div>
    </>,
    document.body,
  );
};

export default Drawer;
