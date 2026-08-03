import type { Metadata } from 'next';
import { serverFetch } from '../../lib/server-api';
import HomeClient from './components/HomeClient';

// Dynamic homepage CMS rendering (0s revalidation so Admin changes show instantly)
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'FAAZO Dental Solutions | Premium B2B Clinical Equipment & Supplies',
  description: 'Shop authentic clinical dental equipment, materials, compressors, handpieces, and 3D scanners on FAAZO. Exclusive doctor pricing, manufacturer warranties, and free delivery across India.',
  alternates: {
    canonical: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
  },
};

export default async function HomePage() {
  // Fetch homepage data in parallel on the server side for maximum performance and SEO
  const [
    heroRes,
    categoriesRes,
    bestsellersRes,
    recommendedRes,
    combosRes
  ] = await Promise.all([
    serverFetch<any[]>('homepage/hero/', { revalidate }),
    serverFetch<any[]>('homepage/categories/', { revalidate }),
    serverFetch<any[]>('homepage/best-sellers/', { revalidate }),
    serverFetch<any[]>('homepage/recommended/', { revalidate }),
    serverFetch<any[]>('combos/', { revalidate, params: { is_featured: true } }),
  ]);

  const initialSlides = heroRes.data || [];
  const initialCategories = categoriesRes.data || [];
  const initialBestSellers = bestsellersRes.data || [];
  const initialRecommended = recommendedRes.data || [];
  const initialCombos = combosRes.data || [];

  return (
    <HomeClient
      initialSlides={initialSlides}
      initialCategories={initialCategories}
      initialBestSellers={initialBestSellers}
      initialRecommended={initialRecommended}
      initialCombos={initialCombos}
    />
  );
}
