import React from 'react';
import type { Metadata } from 'next';
import BestSellersClient from '@/components/store/BestSellersClient';

export const metadata: Metadata = {
  title: 'Best Sellers | FAAZO',
  description: 'Shop our most popular dental products trusted by professionals.',
  keywords: [
    'Best Sellers',
    'Dental Products',
    'Top Rated Dental Equipment',
    'Popular Clinical Essentials',
    'FAAZO Marketplace',
  ],
  openGraph: {
    title: 'Best Sellers | FAAZO',
    description: 'Shop our most popular dental products trusted by professionals.',
    type: 'website',
    url: 'https://faazo.in/best-sellers',
    siteName: 'FAAZO Dental Marketplace',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Sellers | FAAZO',
    description: 'Shop our most popular dental products trusted by professionals.',
  },
};

export default function BestSellersPage() {
  return <BestSellersClient />;
}
