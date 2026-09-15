import React from 'react';
import type { Metadata } from 'next';
import { serverFetch } from '../../../../lib/server-api';
import DailyOfferClient from './DailyOfferClient';

export const revalidate = 0; // Dynamic SSR for immediate deal updates

interface DailyOfferPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DailyOfferPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await serverFetch<any>(`homepage/daily-offers/${id}/`, { revalidate: 0 });
    const offer = res.data ?? res;

    if (!offer || !offer.title) {
      return {
        title: 'Daily Offers & Deals | FAAZO Dental Solutions',
        description: 'Special limited-time promotional deals on clinical equipment and dental supplies.',
      };
    }

    const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

    return {
      title: `${offer.title} | FAAZO Daily Hot Deals`,
      description: offer.subheading || `Exclusive limited-time savings on certified dental products on FAAZO.`,
      alternates: {
        canonical: `${baseUrl}/daily-offers/${id}`,
      },
    };
  } catch {
    return {
      title: 'Daily Offers & Deals | FAAZO Dental Solutions',
      description: 'Special limited-time promotional deals on clinical equipment and dental supplies.',
    };
  }
}

export default async function Page({ params }: DailyOfferPageProps) {
  const { id } = await params;

  let initialOffer = null;
  try {
    const res = await serverFetch<any>(`homepage/daily-offers/${id}/`, { revalidate: 0 });
    initialOffer = res.data ?? res;
  } catch {}

  return <DailyOfferClient initialOffer={initialOffer} offerId={id} />;
}
