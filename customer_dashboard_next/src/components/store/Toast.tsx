'use client';

import React from 'react';

type ToastListener = (message: string) => void;
const listeners: Set<ToastListener> = new Set();

export const showToast = (message: string) => {
  listeners.forEach((listener) => listener(message));
};

export const ToastContainer: React.FC = () => {
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleToast = (message: string) => {
      setToastMessage(message);
      setTimeout(() => {
        setToastMessage((prev) => (prev === message ? null : prev));
      }, 3000);
    };

    listeners.add(handleToast);
    return () => {
      listeners.delete(handleToast);
    };
  }, []);

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-bold flex items-center gap-2">
        <span>{toastMessage}</span>
      </div>
    </div>
  );
};
