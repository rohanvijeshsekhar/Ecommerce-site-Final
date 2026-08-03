'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { AdminRole, AdminPermission, AdminSection, ToastMessage } from '../types/admin';
import { ROLE_PERMISSIONS } from '../types/admin';

interface AdminContextType {
  adminRole: AdminRole;
  hasPermission: (permission: AdminPermission) => boolean;

  activeSection: AdminSection;
  setActiveSection: (section: AdminSection) => void;

  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;

  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  unreadNotifCount: number;
  setUnreadNotifCount: (n: number) => void;
}

import { useAuth } from '@/hooks/useAuth';

const AdminContext = createContext<AdminContextType | undefined>(undefined);

interface AdminProviderProps {
  children: ReactNode;
  initialRole?: AdminRole;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({
  children,
  initialRole = 'administrator',
}) => {
  const { user } = useAuth();
  const actualRole: AdminRole = user?.role === 'admin' ? 'administrator' : 'viewer';
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadNotifCount, setUnreadNotifCount] = useState(2);

  const hasPermission = useCallback(
    (permission: AdminPermission): boolean => {
      if (!user || user.role !== 'admin') {
        return false;
      }
      return ROLE_PERMISSIONS[actualRole]?.includes(permission) ?? false;
    },
    [actualRole, user],
  );

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const full: ToastMessage = { ...toast, id, duration: toast.duration ?? 4000 };
    setToasts((prev) => [...prev, full]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, full.duration);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <AdminContext.Provider
      value={{
        adminRole: actualRole,
        hasPermission,
        activeSection,
        setActiveSection,
        isSidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        isMobileSidebarOpen,
        setMobileSidebarOpen,
        toasts,
        showToast,
        dismissToast,
        isSearchOpen,
        setSearchOpen,
        searchQuery,
        setSearchQuery,
        unreadNotifCount,
        setUnreadNotifCount,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>');
  return ctx;
};
