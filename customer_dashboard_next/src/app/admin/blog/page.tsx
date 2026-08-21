import React from 'react';
import type { Metadata } from 'next';
import BlogManagementPage from '@/admin/pages/BlogManagementPage';

export const metadata: Metadata = {
  title: 'Blog Article Management | FAAZO Admin Portal',
  description: 'Create, edit, publish, draft, and archive FAAZO blog articles.',
};

export default function AdminBlogPage() {
  return <BlogManagementPage />;
}
