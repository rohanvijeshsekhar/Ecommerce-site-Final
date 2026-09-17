import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Search,
  Clock,
  Calendar,
  User,
  ArrowRight,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { fetchPublicBlogPosts, fetchPublicBlogCategories, type BlogPost } from '@/lib/blog-api';

export const metadata: Metadata = {
  title: 'Blog | FAAZO Dental Solutions',
  description:
    'Expert articles, clinical guides, and equipment insights on modern dental practice workflows and technology.',
};

interface Props {
  searchParams: Promise<{
    category?: string;
    q?: string;
    page?: string;
  }>;
}

function getReadingTime(content?: string, excerpt?: string): string {
  const text = (content || excerpt || '').replace(/<[^>]*>/g, ' ').trim();
  const words = text ? text.split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
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

  // Identify featured article (if any from backend)
  const featuredPost =
    posts.find((p) => p.is_featured) || (page === 1 && !category && !q ? posts[0] : null);
  const gridPosts = featuredPost ? posts.filter((p) => p.id !== featuredPost.id) : posts;

  return (
    <div className="w-full min-h-screen bg-[#FAFCFC] text-slate-800 font-sans text-left select-none pt-[118px] sm:pt-[132px] lg:pt-[152px] pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-10">

        {/* ─── 1. Page Header ─── */}
        <div className="text-center max-w-2xl mx-auto pt-2 sm:pt-4">
          <p className="text-[11px] font-bold tracking-widest text-[#005F63] uppercase mb-1.5">
            EDITORIAL
          </p>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-2">
            Blog
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Clinical guides, equipment maintenance protocols, and dental practice insights.
          </p>
        </div>

        {/* ─── 2. Search + Categories Bar ─── */}
        <div className="space-y-3.5">
          {/* Search Form */}
          <form method="GET" action="/blog" className="relative max-w-md mx-auto">
            {category && <input type="hidden" name="category" value={category} />}
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search articles by title, topic, or keyword..."
              className="w-full h-10 pl-10 pr-24 text-xs bg-white border border-slate-200/80 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#005F63] focus:ring-1 focus:ring-[#005F63] transition-all shadow-2xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 px-3 h-8 bg-[#005F63] hover:bg-[#004d50] text-white text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Category Filter Pills */}
          <div className="flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <Link
              href={q ? `/blog?q=${encodeURIComponent(q)}` : '/blog'}
              className={`px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                !category
                  ? 'bg-[#005F63] text-white shadow-2xs font-semibold'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              All
            </Link>
            {categories.map((cat) => {
              const isActive = category === cat.slug;
              const href = `/blog?category=${cat.slug}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
              return (
                <Link
                  key={cat.id}
                  href={href}
                  className={`px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-[#005F63] text-white shadow-2xs font-semibold'
                      : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* ─── 3. Featured Article (Editorial Hero) ─── */}
        {featuredPost && (
          <article className="group bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
              
              {/* Image Column */}
              <div className="md:col-span-6 lg:col-span-7 bg-slate-100 relative min-h-[220px] sm:min-h-[280px] md:min-h-full overflow-hidden">
                {featuredPost.featured_image_display ? (
                  <img
                    src={featuredPost.featured_image_display}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full min-h-[220px] flex items-center justify-center bg-slate-100 text-slate-400">
                    <BookOpen className="w-10 h-10 opacity-30" />
                  </div>
                )}
              </div>

              {/* Content Column */}
              <div className="md:col-span-6 lg:col-span-5 p-5 sm:p-8 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-[#005F63] bg-teal-50 border border-teal-100/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {featuredPost.category?.name || 'Featured'}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getReadingTime(featuredPost.content, featuredPost.excerpt)}
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug group-hover:text-[#005F63] transition-colors">
                    <Link href={`/blog/${featuredPost.slug}`}>
                      {featuredPost.title}
                    </Link>
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-500 line-clamp-3 leading-relaxed">
                    {featuredPost.excerpt}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    {featuredPost.author_name && (
                      <span className="font-medium text-slate-700">{featuredPost.author_name}</span>
                    )}
                    {featuredPost.published_at && (
                      <>
                        <span>•</span>
                        <span>{formatDate(featuredPost.published_at)}</span>
                      </>
                    )}
                  </div>

                  <Link
                    href={`/blog/${featuredPost.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#005F63] hover:underline"
                  >
                    <span>Read Article</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>

            </div>
          </article>
        )}

        {/* ─── 4. Article Grid ─── */}
        {gridPosts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {gridPosts.map((art) => (
              <article
                key={art.id}
                className="group bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-[#005F63]/40 transition-all flex flex-col justify-between overflow-hidden"
              >
                <div>
                  {/* Article Thumbnail */}
                  <Link href={`/blog/${art.slug}`} className="block relative aspect-[16/10] bg-slate-100 overflow-hidden">
                    {art.featured_image_display ? (
                      <img
                        src={art.featured_image_display}
                        alt={art.title}
                        className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <BookOpen className="w-8 h-8 opacity-40" />
                      </div>
                    )}
                  </Link>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] gap-2">
                      <span className="text-[10px] font-bold text-[#005F63] uppercase tracking-wider">
                        {art.category?.name || 'General'}
                      </span>
                      <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                        <Clock className="w-2.5 h-2.5" />
                        {getReadingTime(art.content, art.excerpt)}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug line-clamp-2 group-hover:text-[#005F63] transition-colors">
                      <Link href={`/blog/${art.slug}`}>
                        {art.title}
                      </Link>
                    </h3>

                    {art.excerpt && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {art.excerpt}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="px-4 sm:px-5 pb-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <div className="text-slate-400 truncate pr-2">
                    {art.author_name ? (
                      <span className="font-medium text-slate-600">{art.author_name}</span>
                    ) : null}
                    {art.published_at && (
                      <span className="text-slate-400 text-[10px] ml-1.5">
                        {formatDate(art.published_at)}
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/blog/${art.slug}`}
                    className="shrink-0 text-xs font-semibold text-[#005F63] group-hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>Read</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : !featuredPost ? (
          /* Empty Search/Filter State */
          <div className="bg-white rounded-2xl border border-slate-200/80 p-10 sm:p-14 text-center max-w-md mx-auto space-y-3 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No articles found</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              We couldn&apos;t find any blog posts matching your search criteria. Try a different query or category.
            </p>
            <div className="pt-2">
              <Link
                href="/blog"
                className="inline-block px-4 py-2 text-xs font-semibold text-[#005F63] border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Clear all filters
              </Link>
            </div>
          </div>
        ) : null}

        {/* ─── 5. Pagination ─── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-4">
            {page > 1 && (
              <Link
                href={`/blog?${new URLSearchParams({
                  ...(category ? { category } : {}),
                  ...(q ? { q } : {}),
                  page: String(page - 1),
                }).toString()}`}
                className="px-3 h-9 rounded-xl flex items-center justify-center text-xs font-semibold bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Previous
              </Link>
            )}

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
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-colors ${
                    isActive
                      ? 'bg-[#005F63] text-white shadow-2xs'
                      : 'bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </Link>
              );
            })}

            {page < totalPages && (
              <Link
                href={`/blog?${new URLSearchParams({
                  ...(category ? { category } : {}),
                  ...(q ? { q } : {}),
                  page: String(page + 1),
                }).toString()}`}
                className="px-3 h-9 rounded-xl flex items-center justify-center text-xs font-semibold bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
