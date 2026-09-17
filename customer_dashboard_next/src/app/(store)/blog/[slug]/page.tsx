import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronRight,
  Clock,
  Calendar,
  User,
  ArrowLeft,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { fetchPublicBlogDetail, type BlogPost } from '@/lib/blog-api';

interface Props {
  params: Promise<{ slug: string }>;
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
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
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
  const title = post.meta_title || `${post.title} | FAAZO Blog`;
  const description =
    post.meta_description ||
    post.excerpt ||
    `Read clinical guidance and equipment insights on ${post.title}.`;
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
  const readingTime = getReadingTime(post.content, post.excerpt);
  const formattedDate = formatDate(post.published_at);

  return (
    <div className="w-full min-h-screen bg-[#FAFCFC] text-slate-800 font-sans text-left select-none pt-[118px] sm:pt-[132px] lg:pt-[152px] pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-12">

        {/* ─── 1. Breadcrumb Navigation ─── */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium flex-wrap">
          <Link href="/" className="hover:text-slate-700 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <Link href="/blog" className="hover:text-slate-700 transition-colors">
            Blog
          </Link>
          {post.category && (
            <>
              <ChevronRight className="w-3 h-3 shrink-0" />
              <Link
                href={`/blog?category=${post.category.slug}`}
                className="hover:text-[#005F63] transition-colors"
              >
                {post.category.name}
              </Link>
            </>
          )}
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="text-slate-700 truncate max-w-[200px] sm:max-w-xs">
            {post.title}
          </span>
        </nav>

        {/* ─── 2. Article Header ─── */}
        <header className="space-y-4 text-left max-w-3xl">
          {post.category && (
            <span className="inline-block text-[10px] font-bold text-[#005F63] bg-teal-50 border border-teal-100/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {post.category.name}
            </span>
          )}

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-sm sm:text-base text-slate-500 font-normal leading-relaxed">
              {post.excerpt}
            </p>
          )}

          {/* Meta Author & Timestamp Bar */}
          <div className="pt-2 flex items-center gap-3 text-xs text-slate-400 border-t border-slate-100 flex-wrap">
            {post.author_name && (
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {post.author_name}
              </span>
            )}
            {formattedDate && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formattedDate}
                </span>
              </>
            )}
            <span>•</span>
            <span className="flex items-center gap-1.5 text-[#005F63] font-medium">
              <Clock className="w-3.5 h-3.5" />
              {readingTime}
            </span>
          </div>
        </header>

        {/* ─── 3. Featured Image ─── */}
        {post.featured_image_display && (
          <div className="w-full rounded-2xl border border-slate-200/80 overflow-hidden bg-slate-100 shadow-2xs aspect-[16/9] sm:aspect-[21/9]">
            <img
              src={post.featured_image_display}
              alt={post.title}
              className="w-full h-full object-cover object-center"
            />
          </div>
        )}

        {/* ─── 4. Article Body Content (Editorial Typography) ─── */}
        <article className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-10 shadow-2xs space-y-6">
          <div
            className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed space-y-4
              prose-headings:font-bold prose-headings:text-slate-900 prose-headings:tracking-tight
              prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3 prose-h2:pb-1.5 prose-h2:border-b prose-h2:border-slate-100
              prose-h3:text-base sm:prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
              prose-p:leading-relaxed prose-p:mb-4
              prose-a:text-[#005F63] prose-a:font-semibold prose-a:underline hover:prose-a:text-[#00474a]
              prose-strong:font-bold prose-strong:text-slate-900
              prose-ul:list-disc prose-ul:pl-5 prose-ul:space-y-1.5
              prose-ol:list-decimal prose-ol:pl-5 prose-ol:space-y-1.5
              prose-blockquote:border-l-4 prose-blockquote:border-[#005F63] prose-blockquote:bg-slate-50/80 prose-blockquote:py-2.5 prose-blockquote:px-4 prose-blockquote:rounded-r-xl prose-blockquote:italic prose-blockquote:text-slate-600
              prose-img:rounded-xl prose-img:border prose-img:border-slate-200/80 prose-img:shadow-2xs
              prose-table:w-full prose-table:border-collapse prose-table:my-4
              prose-th:bg-slate-50 prose-th:p-2.5 prose-th:border prose-th:border-slate-200 prose-th:text-xs prose-th:font-bold prose-th:text-slate-800
              prose-td:p-2.5 prose-td:border prose-td:border-slate-200 prose-td:text-xs prose-td:text-slate-600"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 mr-1">Tags:</span>
              {post.tags.map((t) => (
                <Link
                  key={t.id}
                  href={`/blog?tag=${t.slug}`}
                  className="text-xs font-medium px-2.5 py-1 bg-slate-50 border border-slate-200/80 text-slate-600 rounded-lg hover:border-[#005F63]/40 hover:text-[#005F63] transition-colors"
                >
                  #{t.name}
                </Link>
              ))}
            </div>
          )}
        </article>

        {/* ─── 5. Back Navigation Button ─── */}
        <div className="max-w-3xl mx-auto flex items-center justify-between pt-2">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#005F63] bg-white border border-slate-200/80 hover:bg-slate-50 rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Articles</span>
          </Link>
        </div>

        {/* ─── 6. Related Articles ─── */}
        {relatedPosts.length > 0 && (
          <section className="space-y-4 pt-6 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-[#005F63] uppercase mb-0.5">
                  KEEP READING
                </p>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Related Articles
                </h2>
              </div>
              <Link
                href="/blog"
                className="text-xs font-semibold text-[#005F63] hover:underline inline-flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedPosts.map((rel) => (
                <article
                  key={rel.id}
                  className="group bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-[#005F63]/40 transition-all flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    {/* Thumbnail */}
                    <Link
                      href={`/blog/${rel.slug}`}
                      className="block relative aspect-[16/10] bg-slate-100 overflow-hidden"
                    >
                      {rel.featured_image_display ? (
                        <img
                          src={rel.featured_image_display}
                          alt={rel.title}
                          className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <BookOpen className="w-8 h-8 opacity-40" />
                        </div>
                      )}
                    </Link>

                    {/* Card Body */}
                    <div className="p-4 space-y-1.5">
                      <span className="text-[10px] font-bold text-[#005F63] uppercase tracking-wider">
                        {rel.category?.name || 'General'}
                      </span>

                      <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-snug line-clamp-2 group-hover:text-[#005F63] transition-colors">
                        <Link href={`/blog/${rel.slug}`}>{rel.title}</Link>
                      </h3>

                      {rel.excerpt && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {rel.excerpt}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-4 pb-3.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 text-[10px]">
                      {formatDate(rel.published_at)}
                    </span>
                    <Link
                      href={`/blog/${rel.slug}`}
                      className="text-xs font-semibold text-[#005F63] group-hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Read</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
