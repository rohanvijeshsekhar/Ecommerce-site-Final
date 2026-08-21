import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import SearchClient from './SearchClient';

export const metadata: Metadata = {
  title: 'Search Dental Equipment & Products | FAAZO',
  description: 'Search across thousands of genuine clinical products, dental handpieces, chairs, imaging systems, and dental supplies on FAAZO.',
};

function SearchContent({
  searchParams,
}: {
  searchParams: {
    q?: string;
    brand?: string;
    category?: string;
    min_price?: string;
    max_price?: string;
    in_stock?: string;
    ordering?: string;
    page?: string;
  };
}) {
  return (
    <SearchClient
      initialQuery={searchParams.q || ''}
      initialBrand={searchParams.brand || ''}
      initialCategory={searchParams.category || ''}
      initialMinPrice={searchParams.min_price || ''}
      initialMaxPrice={searchParams.max_price || ''}
      initialInStock={searchParams.in_stock || ''}
      initialOrdering={searchParams.ordering || 'relevance'}
      initialPage={searchParams.page || '1'}
    />
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    brand?: string;
    category?: string;
    min_price?: string;
    max_price?: string;
    in_stock?: string;
    ordering?: string;
    page?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold">Loading Search Results…</div>}>
      <SearchContent searchParams={resolvedParams} />
    </Suspense>
  );
}
