import React from 'react';
import type { Metadata } from 'next';
import CategoryList from '@/components/store/CategoryList';
import ProductsLandingPage from '@/components/store/ProductsLandingPage';

export const metadata: Metadata = {
  title: 'All Dental Product Categories | FAAZO Dental Solutions',
  description: 'Browse FAAZO complete clinical equipment categories: Dental Handpieces, Intraoral Cameras, LED Cure Lights, Dental Chairs, 3D Scanners & Air Compressors.',
  keywords: ['dental handpieces', 'intraoral cameras', 'light cure unit', 'dental chair', '3D dental scanner', 'dental compressor'],
};

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <span className="text-xs font-black tracking-widest text-[#006670] uppercase">
            Clinical Equipment Categories
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
            Explore Dental Specialties
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto mt-2 text-sm sm:text-base">
            Select a specialty category to discover engineered products tailored for dental practices.
          </p>
        </div>

        <ProductsLandingPage />
      </div>
    </div>
  );
}
