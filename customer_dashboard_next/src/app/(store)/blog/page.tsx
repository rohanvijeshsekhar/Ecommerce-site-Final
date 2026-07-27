import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Clinical Insights & Dental Technology Blog | FAAZO',
  description: 'Stay updated with modern clinical workflows, equipment maintenance tips, 3D imaging guides, and dental practice optimization.',
  keywords: ['dental blog', 'clinical insights', 'handpiece maintenance', 'CBCT imaging guide'],
};

const ARTICLES = [
  {
    slug: 'maintenance-guide-dental-handpieces',
    title: 'Essential Sterilization & Lubrication Guide for High-Speed Handpieces',
    excerpt: 'Maximize turbine lifespan and prevent premature bearing failure with daily clinical lubrication protocols.',
    category: 'Equipment Care',
    date: 'July 24, 2026',
    author: 'Dr. Rahul Sharma',
  },
  {
    slug: 'cbct-vs-2d-panoramic-imaging',
    title: '3D CBCT vs 2D Panoramic: Clinical Diagnostic Yield & ROI for Endodontics',
    excerpt: 'Compare diagnostic accuracy in root canal anatomies and calculate practice return on investment for 3D imaging.',
    category: 'Imaging & Diagnostics',
    date: 'July 18, 2026',
    author: 'Dr. Ananya Patel',
  },
  {
    slug: 'choosing-the-right-dental-chair',
    title: 'Ergonomic Criteria for Selecting Ergonomic Patient Chairs in High-Volume Clinics',
    excerpt: 'Reduce practitioner lumbar fatigue and improve patient comfort during extended restorative sessions.',
    category: 'Practice Setup',
    date: 'July 10, 2026',
    author: 'FAAZO Engineering Team',
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-black tracking-widest text-[#006670] uppercase">
            Clinical Intelligence
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
            FAAZO Dental Technology Blog
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto mt-2 text-sm sm:text-base">
            Expert articles on clinical equipment maintenance, practice workflows, and technological innovations.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {ARTICLES.map((art) => (
            <article key={art.slug} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-lg transition-shadow">
              <div>
                <div className="flex items-center justify-between text-xs text-[#006670] font-bold mb-3">
                  <span>{art.category}</span>
                  <span className="text-slate-400 font-normal">{art.date}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 hover:text-[#006670] transition-colors leading-snug">
                  <Link href={`/blog/${art.slug}`}>{art.title}</Link>
                </h2>
                <p className="text-slate-600 text-xs mt-3 leading-relaxed">
                  {art.excerpt}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{art.author}</span>
                <Link href={`/blog/${art.slug}`} className="text-xs font-bold text-[#006670] hover:underline">
                  Read Article →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
