import { redirect } from 'next/navigation';
import { serverFetch } from '../../../lib/server-api';
import DailyOfferClient from './[id]/DailyOfferClient';

export const revalidate = 0;

export default async function DailyOffersRootPage() {
  let offers: any[] = [];
  try {
    const res = await serverFetch<any[]>('homepage/daily-offers/', { revalidate: 0 });
    offers = res.data ?? (res as any)?.results ?? [];
  } catch {}

  if (Array.isArray(offers) && offers.length > 0 && offers[0]?.id) {
    redirect(`/daily-offers/${offers[0].id}`);
  }

  return <DailyOfferClient initialOffer={null} offerId="" />;
}
