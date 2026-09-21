import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverFetch } from '@/lib/server-api';
import BrandDealClient from './BrandDealClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const res = await serverFetch<any>(`homepage/brand-deals/by-slug/${slug}/`, { revalidate: 0 });
  const campaign = res.data;

  if (!campaign) {
    return {
      title: 'Brand Deal Campaign | FAAZO Dental Solutions',
      description: 'Exclusive brand promotional deals on authentic dental clinic equipment.',
    };
  }

  const brandName = campaign.brand_name || 'Brand';
  const title = `${campaign.title || campaign.name} | ${brandName} Special Offers | FAAZO`;
  const description = campaign.subtitle || `Shop exclusive brand offers on ${brandName} clinical dental equipment and supplies at special campaign prices with manufacturer warranty.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: campaign.banner_desktop ? [{ url: campaign.banner_desktop }] : [],
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/brand-deals/${slug}`,
    },
  };
}

export default async function BrandDealPage({ params }: PageProps) {
  const { slug } = await params;
  const res = await serverFetch<any>(`homepage/brand-deals/by-slug/${slug}/`, { revalidate: 0 });
  const campaign = res.data;

  if (!campaign) {
    notFound();
  }

  return <BrandDealClient campaign={campaign} />;
}
