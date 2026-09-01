'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { useAdmin } from '../contexts/AdminContext';
import { ToastProvider } from '../components/Toast';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { ShieldAlert, LogOut, Store } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  useAdmin();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  // Hook must be called unconditionally (before any returns)
  React.useEffect(() => {
    if (!isLoading && !user && !isLoginPage) {
      router.push('/admin/login');
    }
  }, [isLoading, user, isLoginPage, router]);

  if (isLoginPage) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-400">Verifying administrator credentials...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> show spinner while redirecting to login
  if (!user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Logged in as a Customer (non-admin) -> Render 403 Access Denied
  if (user.role !== 'admin') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="max-w-md text-center bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">403 — Access Denied</h1>
            <p className="mt-2 text-sm text-slate-400">
              You do not have administrator permissions to access the FAAZO Business Operating System.
            </p>
            <p className="mt-2 text-xs text-amber-400/80 bg-amber-500/10 py-1.5 px-3 rounded-lg border border-amber-500/20">
              Logged in as <span className="font-semibold text-white">{user.email}</span> (Role: <span className="uppercase font-bold">{user.role}</span>)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-all border border-slate-700"
            >
              <Store className="h-4 w-4" /> Go to Storefront
            </Link>
            <button
              onClick={() => logout().then(() => router.push('/admin/login'))}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition-all shadow-lg shadow-red-900/20"
            >
              <LogOut className="h-4 w-4" /> Admin Login
            </button>
          </div>
        </div>
      </div>
    );
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
