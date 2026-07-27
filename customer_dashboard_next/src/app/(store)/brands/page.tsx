import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import BrandLogos from '@/components/store/BrandLogos';

export const metadata: Metadata = {
  title: 'Authorized Dental Equipment Brands | FAAZO Dental Solutions',
  description: 'Explore genuine clinical equipment and supplies from world-renowned dental manufacturers: 3M, Dentsply Sirona, NSK, Planmeca, Woodpecker, W&H, and more.',
  keywords: ['dental brands', '3M Oral Care', 'Dentsply Sirona', 'NSK Japan', 'Planmeca Finland', 'Woodpecker Dental', 'W&H Dental'],
};

export default function BrandsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <span className="text-xs font-black tracking-widest text-[#006670] uppercase">
            Global Manufacturers
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
            Authorized Brand Partners
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto mt-2 text-sm sm:text-base">
            100% genuine clinical equipment directly sourced from authorized international manufacturers with full warranty support.
          </p>
        </div>

        <BrandLogos />
      </div>
    </div>
  );
}
