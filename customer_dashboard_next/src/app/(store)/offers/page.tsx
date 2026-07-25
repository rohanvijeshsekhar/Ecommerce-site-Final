import React from 'react';
import type { Metadata } from 'next';
import OffersPage from '../../../components/store/OffersPage';

export const metadata: Metadata = {
  title: 'Special Offers & B2B Dental Promotions | FAAZO Dental Solutions',
  description: 'Discover exclusive deals, bundle offers and limited-time savings on certified dental equipment, imaging systems, and clinical consumables.',
};

export default function Page() {
  return <OffersPage />;
}
