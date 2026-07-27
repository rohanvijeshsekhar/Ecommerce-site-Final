'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { useAdmin } from '../contexts/AdminContext';
import { ToastProvider } from '../components/Toast';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  useAdmin();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ToastProvider>
      <div className="flex h-screen bg-slate-50/80 overflow-hidden">
        <AdminSidebar />
        <div className={`flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300`}>
          <AdminHeader />
          <main id="admin-content" className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="min-h-full p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
};

export default AdminLayout;
