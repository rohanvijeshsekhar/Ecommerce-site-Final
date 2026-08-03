import React from 'react';
import type { Metadata } from 'next';
import BrandsClient from '@/components/store/BrandsClient';

export const metadata: Metadata = {
  title: 'Brands | FAAZO Dental Marketplace',
  description: 'Discover premium dental brands available on FAAZO. Explore 100% authentic clinical equipment and supplies directly from leading global manufacturers with full warranty support.',
  keywords: [
    'Brands',
    'Dental Brands',
    '3M Dental',
    'NSK Dental',
    'Dentsply Sirona',
    'Planmeca',
    'Woodpecker',
    'FAAZO Marketplace',
    'Clinical Dental Equipment'
  ],
  openGraph: {
    title: 'Brands | FAAZO Dental Marketplace',
    description: 'Explore 100% authentic clinical equipment and supplies directly from leading global manufacturers.',
    url: 'https://faazo.in/brands',
    siteName: 'FAAZO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Brands | FAAZO Dental Marketplace',
    description: 'Explore 100% authentic clinical equipment and supplies directly from leading global manufacturers.',
  },
  alternates: {
    canonical: 'https://faazo.in/brands',
  },
};

export default function BrandsPage() {
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
            ],
          }),
        }}
      />
      <BrandsClient />
    </>
  );
}
