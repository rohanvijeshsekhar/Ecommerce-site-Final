import React from 'react';
import type { Metadata } from 'next';
import AdminLayout from '@/admin/layouts/AdminLayout';
import { AdminProvider } from '@/admin/contexts/AdminContext';
import { BreadcrumbProvider } from '@/admin/contexts/BreadcrumbContext';

export const metadata: Metadata = {
  title: 'FAAZO Admin Portal | Enterprise Business Operating System',
  description: 'Manage FAAZO products, orders, inventory, pricing, customer & B2B dealer operations.',
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <BreadcrumbProvider>
        <AdminLayout>{children}</AdminLayout>
      </BreadcrumbProvider>
    </AdminProvider>
  );
}
