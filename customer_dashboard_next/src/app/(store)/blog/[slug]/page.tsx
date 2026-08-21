import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchPublicBlogDetail, type BlogPost } from '@/lib/blog-api';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const res = await fetchPublicBlogDetail(slug);

  if (!res || !res.data) {
    return {
      title: 'Article Not Found | FAAZO Dental Blog',
    };
  }

  const post = res.data;
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
  const pageUrl = `${baseUrl}/blog/${post.slug}`;
  const title = post.meta_title || `${post.title} | FAAZO Dental Blog`;
  const description = post.meta_description || post.excerpt || `Read in-depth clinical analysis and guidance on ${post.title}.`;
  const imageUrl = post.featured_image_display || `${baseUrl}/images/Artboard 1@4x (1).png`;

  return {
    title,
    description,
    keywords: post.meta_keywords ? post.meta_keywords.split(',').map((k) => k.trim()) : undefined,
    alternates: {
      canonical: post.canonical_url || pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'FAAZO Dental Solutions',
      type: 'article',
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at || undefined,
      authors: [post.author_name],
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
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

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const res = await fetchPublicBlogDetail(slug);

  if (!res || !res.data) {
    notFound();
  }

  const post = res.data;
  const relatedPosts = res.related || [];

  return (
    <div className="min-h-screen bg-slate-50 pt-[112px] lg:pt-[180px] pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Main Article Container */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-12 shadow-sm space-y-6">
          <Link href="/blog" className="text-xs font-bold text-[#006670] hover:underline inline-block">
            ← Back to All Articles
          </Link>

          <div>
            {post.category && (
              <span className="inline-block px-3 py-1 bg-teal-50 text-[#006670] font-extrabold text-xs rounded-lg mb-3">
                {post.category.name}
              </span>
            )}
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              {post.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-semibold border-b border-slate-100 pb-6">
            <span>By <strong className="text-slate-800">{post.author_name}</strong></span>
            <span>•</span>
            <span>
              Published{' '}
              {post.published_at
                ? new Date(post.published_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recently'}
            </span>
          </div>

          {/* Featured Image */}
          {post.featured_image_display && (
            <div className="rounded-2xl overflow-hidden bg-slate-100 max-h-96">
              <img
                src={post.featured_image_display}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Excerpt Banner */}
          {post.excerpt && (
            <div className="bg-slate-50 border-l-4 border-[#006670] p-4 rounded-r-xl text-sm font-semibold text-slate-700 leading-relaxed italic">
              {post.excerpt}
            </div>
          )}

          {/* Article Body HTML Content */}
          <div
            className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed space-y-4 pt-2"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1">Tags:</span>
              {post.tags.map((t) => (
                <Link
                  key={t.id}
                  href={`/blog?tag=${t.slug}`}
                  className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 hover:text-slate-900 transition-colors"
                >
                  #{t.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Related Articles Section */}
        {relatedPosts.length > 0 && (
          <div className="space-y-4 pt-4">
            <h2 className="text-xl font-extrabold text-slate-900">Related Clinical Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((rel) => (
                <div
                  key={rel.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <span className="text-[11px] font-bold text-[#006670]">
                      {rel.category?.name || 'Clinical Insights'}
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 mt-2 line-clamp-2 leading-snug">
                      <Link href={`/blog/${rel.slug}`}>{rel.title}</Link>
                    </h3>
                  </div>
                  <Link
                    href={`/blog/${rel.slug}`}
                    className="text-xs font-bold text-[#006670] mt-4 inline-block hover:underline"
                  >
                    Read Article →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
