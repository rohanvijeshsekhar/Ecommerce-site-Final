import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const title = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return {
    title: `${title} | FAAZO Dental Blog`,
    description: `Read in-depth clinical analysis and guidance on ${title}. Written by experienced dental specialists.`,
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const title = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm">
        <Link href="/blog" className="text-xs font-bold text-[#006670] hover:underline mb-6 inline-block">
          ← Back to All Articles
        </Link>
        
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-4">
          {title}
        </h1>

        <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold mb-8 pb-6 border-b border-slate-100">
          <span>Published by FAAZO Clinical Advisory Board</span>
          <span>•</span>
          <span>Updated July 2026</span>
        </div>

        <div className="prose prose-slate max-w-none text-slate-700 space-y-4 text-sm sm:text-base leading-relaxed">
          <p>
            Operating a modern dental practice requires seamless integration between clinical technique and reliable equipment engineering.
            In this guide, we break down essential maintenance protocols and operational standards to ensure peak performance and equipment longevity.
          </p>
          <h2 className="text-xl font-bold text-slate-900 mt-6">Clinical Maintenance Best Practices</h2>
          <p>
            Proper sterilization protocols not only meet infection control standards but also protect delicate internal micro-bearings and optic fibers.
          </p>
        </div>
      </div>
    </div>
  );
}
