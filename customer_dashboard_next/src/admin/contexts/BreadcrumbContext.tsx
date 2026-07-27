'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { BreadcrumbItem } from '../types/admin';

interface BreadcrumbContextType {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
  pushBreadcrumb: (item: BreadcrumbItem) => void;
  popBreadcrumb: () => void;
  resetBreadcrumbs: (items?: BreadcrumbItem[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export const BreadcrumbProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [breadcrumbs, setBreadcrumbsState] = useState<BreadcrumbItem[]>([
    { label: 'Dashboard', path: '/admin' },
  ]);

  const setBreadcrumbs = useCallback((items: BreadcrumbItem[]) => {
    setBreadcrumbsState(items);
  }, []);

  const pushBreadcrumb = useCallback((item: BreadcrumbItem) => {
    setBreadcrumbsState((prev) => [...prev, item]);
  }, []);

  const popBreadcrumb = useCallback(() => {
    setBreadcrumbsState((prev) => prev.slice(0, -1));
  }, []);

  const resetBreadcrumbs = useCallback((items?: BreadcrumbItem[]) => {
    setBreadcrumbsState(items ?? [{ label: 'Dashboard', path: '/admin' }]);
  }, []);

  return (
    <BreadcrumbContext.Provider
      value={{ breadcrumbs, setBreadcrumbs, pushBreadcrumb, popBreadcrumb, resetBreadcrumbs }}
    >
      {children}
    </BreadcrumbContext.Provider>
  );
};

export const useBreadcrumb = (): BreadcrumbContextType => {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) throw new Error('useBreadcrumb must be used inside <BreadcrumbProvider>');
  return ctx;
};

export const useBreadcrumbSync = (items: BreadcrumbItem[]) => {
  const { setBreadcrumbs } = useBreadcrumb();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setBreadcrumbs(items); }, []);
};
