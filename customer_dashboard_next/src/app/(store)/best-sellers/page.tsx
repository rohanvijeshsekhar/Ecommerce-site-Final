import React from 'react';
import type { Metadata } from 'next';
import BestSellers from '@/components/store/BestSellers';

export const metadata: Metadata = {
  title: 'Best Selling Dental Equipment & Supplies | FAAZO',
  description: 'Discover the most trusted and top-rated clinical equipment chosen by thousands of dental practitioners across India.',
  keywords: ['best selling dental equipment', 'top dental chairs', 'popular handpieces', 'dentist recommended tools'],
};

export default function BestSellersPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <span className="text-xs font-black tracking-widest text-[#006670] uppercase">
            Top Practitioner Choices
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
            Best Sellers & Clinical Essentials
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto mt-2 text-sm sm:text-base">
            Engineered for high-volume practices with proven clinical longevity and superior warranty coverage.
          </p>
        </div>

        <BestSellers />
      </div>
    </div>
  );
}
