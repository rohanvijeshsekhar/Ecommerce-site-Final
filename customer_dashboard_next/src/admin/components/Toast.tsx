import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { ToastMessage, ToastVariant } from '../types/admin';

// ─────────────────────────────────────────────────────────────────────────────
// Toast System — Context + Provider + useToast hook
// ─────────────────────────────────────────────────────────────────────────────

interface ToastContextType {
  show: (toast: Omit<ToastMessage, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  addToast: (message: string, type?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const VARIANT_CONFIG: Record<ToastVariant, {
  bg: string; border: string; icon: React.ReactNode; title: string;
}> = {
  success: {
    bg: 'bg-white', border: 'border-emerald-200',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    title: 'text-emerald-700',
  },
  error: {
    bg: 'bg-white', border: 'border-rose-200',
    icon: <XCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    title: 'text-rose-700',
  },
  warning: {
    bg: 'bg-white', border: 'border-amber-200',
    icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    title: 'text-amber-700',
  },
  info: {
    bg: 'bg-white', border: 'border-blue-200',
    icon: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
    title: 'text-blue-700',
  },
};

// Single toast item
const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const cfg = VARIANT_CONFIG[toast.variant];
  const duration = toast.duration ?? 4000;

  return (
    <div
      className={`relative flex items-start gap-3 w-80 ${cfg.bg} border ${cfg.border}
        rounded-2xl shadow-lg px-4 py-3.5 animate-[slideInRight_0.25s_ease]`}
    >
      {cfg.icon}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${cfg.title} leading-tight`}>{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600
          transition-colors shrink-0 -mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 rounded-b-2xl ${
          toast.variant === 'success' ? 'bg-emerald-400' :
          toast.variant === 'error' ? 'bg-rose-400' :
          toast.variant === 'warning' ? 'bg-amber-400' : 'bg-blue-400'
        }`}
        style={{
          animation: `shrinkWidth ${duration}ms linear forwards`,
          width: '100%',
        }}
      />
    </div>
  );
};

// Toast container (portal)
const ToastContainer: React.FC<{
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[300] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>,
    document.body,
  );
};

// Provider
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}`;
    const full: ToastMessage = { ...toast, id, duration: toast.duration ?? 4000 };
    setToasts((prev) => [...prev.slice(-4), full]); // max 5 at once
    setTimeout(() => dismiss(id), full.duration);
  }, [dismiss]);

  const success = useCallback((title: string, message?: string) =>
    show({ variant: 'success', title, message }), [show]);
  const error = useCallback((title: string, message?: string) =>
    show({ variant: 'error', title, message }), [show]);
  const warning = useCallback((title: string, message?: string) =>
    show({ variant: 'warning', title, message }), [show]);
  const info = useCallback((title: string, message?: string) =>
    show({ variant: 'info', title, message }), [show]);
  const addToast = useCallback((message: string, type?: string) => {
    const variant: ToastVariant = (type === 'danger' || type === 'error') ? 'error' : (type === 'warning' ? 'warning' : 'success');
    show({ variant, title: message });
  }, [show]);

  const contextValue = useMemo(() => ({ show, success, error, warning, info, addToast }), [show, success, error, warning, info, addToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

// Hook
export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

export default ToastProvider;
