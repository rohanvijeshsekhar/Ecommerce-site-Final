import React from 'react';
import type { Metadata } from 'next';
import BestSellersClient from '@/components/store/BestSellersClient';

export const metadata: Metadata = {
  title: 'Best Sellers | FAAZO',
  description: 'Shop our most popular dental products trusted by professionals.',
  openGraph: {
    title: 'Best Sellers | FAAZO',
    description: 'Shop our most popular dental products trusted by professionals.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Sellers | FAAZO',
    description: 'Shop our most popular dental products trusted by professionals.',
  },
};

export default function PagesBestSellersPage() {
  return <BestSellersClient />;
}
