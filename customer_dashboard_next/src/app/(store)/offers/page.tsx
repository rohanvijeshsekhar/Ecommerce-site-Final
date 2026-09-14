import React from 'react';
import type { Metadata } from 'next';
import OffersPage from '../../../components/store/OffersPage';
import { serverFetch } from '../../../lib/server-api';

// 0s revalidation ensures instant sync on every page refresh without cached delay
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Special Offers & B2B Dental Promotions | FAAZO Dental Solutions',
  description: 'Discover exclusive deals, bundle offers and limited-time savings on certified dental equipment, imaging systems, and clinical consumables.',
};

export default async function Page() {
  // Fetch initial page content and offers on server for immediate zero-delay rendering
  const [contentRes, offersRes] = await Promise.all([
    serverFetch<any>('homepage/offers-page-content/', { revalidate: 0 }),
    serverFetch<any[]>('homepage/offers/', { revalidate: 0 }),
  ]);

  const initialPageContent = contentRes.data || null;
  const initialOffersRaw = offersRes.data ?? (offersRes as any)?.results ?? [];

  return (
    <OffersPage
      initialPageContent={initialPageContent}
      initialOffersRaw={Array.isArray(initialOffersRaw) ? initialOffersRaw : []}
    />
  );
}
