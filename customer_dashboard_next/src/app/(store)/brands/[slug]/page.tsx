import React from 'react';
import type { Metadata } from 'next';
import CategoryListingClient from '../../products/category/[slug]/CategoryListingClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brandName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return {
    title: `${brandName} Dental Equipment & Supplies | FAAZO`,
    description: `Shop authentic ${brandName} dental equipment, instruments, and clinical materials with warranty and fast shipping across India.`,
    keywords: [brandName, `${brandName} dental`, `${brandName} price in India`, 'clinical dental equipment'],
  };
}

export default async function BrandSlugPage({ params }: Props) {
  const { slug } = await params;
  const brandName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return <CategoryListingClient categoryName={brandName} />;
}
