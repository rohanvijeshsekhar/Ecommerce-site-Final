import React from 'react';
import type { Metadata } from 'next';
import { serverFetch } from '../../../../lib/server-api';
import ProductDetailClient from './ProductDetailClient';

export const revalidate = 60; // Revalidate dynamic product pages every 60 seconds

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  
  // Fetch product detail for SEO tags
  const res = await serverFetch<any>(`products/${slug}/`, { revalidate });
  const product = res.data ?? res;

  if (!product || !product.name) {
    return {
      title: 'Product Details | FAAZO Dental Solutions',
      description: 'Shop genuine clinical dental equipment on FAAZO.',
    };
  }

  // Get first image if available
  const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:8000';
  const rawImage = product.primary_image || (product.images && product.images[0]?.image);
  let imageUrl = '/images/Artboard 1@4x (1).png';
  if (rawImage) {
    imageUrl = rawImage.startsWith('http') ? rawImage : `${mediaUrl}${rawImage}`;
  }

  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

  const title = `${product.name} | FAAZO Dental Solutions`;
  const description = product.short_description || `Buy genuine ${product.name} on FAAZO. Premium clinical quality, full manufacturer warranty, and free door-step delivery.`;
  const canonicalUrl = `${baseUrl}/products/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'FAAZO Dental Solutions',
      type: 'website',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  return (
    <ProductDetailClient slug={slug} />
  );
}
