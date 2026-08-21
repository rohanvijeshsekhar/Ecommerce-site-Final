import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchPublicBlogPosts, fetchPublicBlogCategories, type BlogPost } from '@/lib/blog-api';

export const metadata: Metadata = {
  title: 'Clinical Insights & Dental Technology Blog | FAAZO',
  description: 'Stay updated with modern clinical workflows, equipment maintenance tips, 3D imaging guides, and dental practice optimization.',
  keywords: ['dental blog', 'clinical insights', 'handpiece maintenance', 'CBCT imaging guide', 'FAAZO blog'],
};

interface Props {
  searchParams: Promise<{
    category?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function BlogPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const category = resolvedParams.category || '';
  const q = resolvedParams.q || '';

  const [postsRes, categories] = await Promise.all([
    fetchPublicBlogPosts({ page, page_size: 9, category, q }),
    fetchPublicBlogCategories(),
  ]);

  const posts = postsRes?.data || [];
  const meta = postsRes?.meta;
  const totalPages = meta?.total_pages || 1;

  // Identify featured article (if any)
  const featuredPost = posts.find((p) => p.is_featured) || (page === 1 && !category && !q ? posts[0] : null);
  const gridPosts = featuredPost ? posts.filter((p) => p.id !== featuredPost.id) : posts;

  return (
    <div className="min-h-screen bg-slate-50 pt-[112px] lg:pt-[180px] pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-black tracking-widest text-[#006670] uppercase">
            Clinical Intelligence
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 mt-2 tracking-tight">
            FAAZO Dental Technology Blog
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto mt-3 text-sm sm:text-base leading-relaxed">
            Expert articles on clinical equipment maintenance, practice workflows, and technological innovations.
          </p>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <form method="GET" action="/blog" className="flex flex-col sm:flex-row items-center gap-3">
            {category && <input type="hidden" name="category" value={category} />}
            <div className="relative flex-1 w-full">
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search articles by keyword, equipment, or clinical topic..."
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:outline-none focus:border-[#006670] focus:bg-white transition-all"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-[#006670] hover:bg-[#00555e] text-white font-bold text-xs rounded-2xl shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              Search Articles
            </button>
          </form>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Link
              href={q ? `/blog?q=${encodeURIComponent(q)}` : '/blog'}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                !category
                  ? 'bg-[#006670] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              All Categories
            </Link>
            {categories.map((cat) => {
              const isActive = category === cat.slug;
              const href = `/blog?category=${cat.slug}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
              return (
                <Link
                  key={cat.id}
                  href={href}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#006670] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Featured Article Card (Page 1 without filters) */}
        {featuredPost && (
          <div className="bg-gradient-to-br from-[#004D54] to-[#006670] rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-4 z-10">
              <div className="flex items-center gap-3 text-xs font-bold text-teal-200 uppercase tracking-wider">
                <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg border border-white/20">
                  Featured Article
                </span>
                {featuredPost.category && <span>• {featuredPost.category.name}</span>}
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight">
                <Link href={`/blog/${featuredPost.slug}`} className="hover:text-teal-200 transition-colors">
                  {featuredPost.title}
                </Link>
              </h2>
              <p className="text-teal-50 text-sm leading-relaxed max-w-2xl line-clamp-3">
                {featuredPost.excerpt}
              </p>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-teal-200">By {featuredPost.author_name}</span>
                <Link
                  href={`/blog/${featuredPost.slug}`}
                  className="px-5 py-2.5 bg-white text-[#006670] font-extrabold text-xs rounded-xl hover:bg-teal-50 transition-colors shadow-xs"
                >
                  Read Full Article →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Grid Articles */}
        {gridPosts.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-8">
            {gridPosts.map((art) => (
              <article
                key={art.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#006670] font-bold mb-3">
                    <span>{art.category?.name || 'Clinical Article'}</span>
                    <span className="text-slate-400 font-normal">
                      {art.published_at ? new Date(art.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900 hover:text-[#006670] transition-colors leading-snug">
                    <Link href={`/blog/${art.slug}`}>{art.title}</Link>
                  </h2>
                  <p className="text-slate-600 text-xs mt-3 leading-relaxed line-clamp-3">
                    {art.excerpt}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">{art.author_name}</span>
                  <Link href={`/blog/${art.slug}`} className="text-xs font-bold text-[#006670] hover:underline">
                    Read Article →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : !featuredPost ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500">
            <p className="font-extrabold text-base text-slate-800">No blog articles match your criteria</p>
            <p className="text-xs text-slate-500 mt-1">Try clearing your search query or selecting a different category.</p>
            <Link
              href="/blog"
              className="inline-block mt-4 text-xs font-bold text-[#006670] hover:underline"
            >
              ← Back to All Articles
            </Link>
          </div>
        ) : null}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              const query = new URLSearchParams();
              if (category) query.set('category', category);
              if (q) query.set('q', q);
              query.set('page', String(p));
              const isActive = p === page;
              return (
                <Link
                  key={p}
                  href={`/blog?${query.toString()}`}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                    isActive
                      ? 'bg-[#006670] text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
