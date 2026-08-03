import React from 'react';
import type { Metadata } from 'next';
import BrandDetailClient from '@/components/store/BrandDetailClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brandName = slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    title: `${brandName} Dental Equipment & Supplies | FAAZO`,
    description: `Shop 100% authentic ${brandName} clinical equipment, dental materials, and instruments with manufacturer warranty and fast shipping across India.`,
    keywords: [
      brandName,
      `${brandName} dental`,
      `${brandName} price in India`,
      `${brandName} equipment`,
      'clinical dental equipment',
      'FAAZO Marketplace'
    ],
    openGraph: {
      title: `${brandName} Dental Equipment & Supplies | FAAZO`,
      description: `Shop authentic ${brandName} clinical equipment and supplies with warranty.`,
      url: `https://faazo.in/brands/${slug}`,
      siteName: 'FAAZO',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${brandName} Dental Equipment & Supplies | FAAZO`,
      description: `Shop authentic ${brandName} clinical equipment and supplies with warranty.`,
    },
    alternates: {
      canonical: `https://faazo.in/brands/${slug}`,
    },
  };
}

export default async function BrandSlugPage({ params }: Props) {
  const { slug } = await params;
  const brandName = slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://faazo.in',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Brands',
                item: 'https://faazo.in/brands',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: brandName,
                item: `https://faazo.in/brands/${slug}`,
              },
            ],
          }),
        }}
      />
      <BrandDetailClient slug={slug} />
    </>
  );
}
