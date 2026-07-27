import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import CategoryListingClient from '../products/category/[slug]/CategoryListingClient';

export const metadata: Metadata = {
  title: 'Search Dental Equipment & Products | FAAZO',
  description: 'Search across thousands of genuine clinical products, dental handpieces, chairs, imaging systems, and dental supplies.',
};

function SearchContent({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q || 'Search Results';
  return <CategoryListingClient categoryName={query} />;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolvedParams = await searchParams;
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold">Loading Search Results…</div>}>
      <SearchContent searchParams={resolvedParams} />
    </Suspense>
  );
}
