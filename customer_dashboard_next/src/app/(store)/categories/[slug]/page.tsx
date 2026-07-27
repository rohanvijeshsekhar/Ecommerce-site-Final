import React from 'react';
import type { Metadata } from 'next';
import CategoryListingClient from '../../products/category/[slug]/CategoryListingClient';
import { getCategoryDisplayName } from '@/lib/utils';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const categoryName = getCategoryDisplayName(slug);

  return {
    title: `${categoryName} | FAAZO Dental Solutions`,
    description: `Shop top-rated ${categoryName} online. Genuine manufacturer warranties, clinical support, and nationwide delivery.`,
    keywords: [categoryName, `${categoryName} price`, 'buy dental equipment online'],
  };
}

export default async function CategorySlugPage({ params }: Props) {
  const { slug } = await params;
  const categoryName = getCategoryDisplayName(slug);

  return <CategoryListingClient categoryName={categoryName} />;
}
