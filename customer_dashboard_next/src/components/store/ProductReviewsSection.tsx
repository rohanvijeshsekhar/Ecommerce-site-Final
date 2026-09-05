'use client';

import React, { useState, useEffect } from 'react';
import {
  Star,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Filter,
  Image as ImageIcon,
  Video as VideoIcon,
  MessageSquarePlus,
  Play,
  Check,
  X,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  reviewsService,
  ReviewItem,
  RatingSummary,
  ReviewMediaItem,
} from '@/lib/services/reviewsService';
import { ReviewMediaLightbox } from './ReviewMediaLightbox';
import { ReviewModal } from './ReviewModal';

interface ProductReviewsSectionProps {
  productId: string;
  productSlug?: string;
  productName: string;
  showToast?: (msg: string) => void;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  productId,
  productSlug,
  productName,
  showToast,
}) => {
  const { user, isAuthenticated } = useAuth();

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState<RatingSummary>({
    average_rating: 0,
    total_reviews: 0,
    rating_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
  });
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting
  const [selectedRating, setSelectedRating] = useState<number | undefined>(undefined);
  const [hasPhotos, setHasPhotos] = useState(false);
  const [hasVideos, setHasVideos] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'rating_high' | 'rating_low' | 'helpful'>('recent');

  // Media Lightbox State
  const [activeMediaList, setActiveMediaList] = useState<ReviewMediaItem[]>([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Review Modal & Eligibility State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [eligibility, setEligibility] = useState<{
    can_review: boolean;
    is_edit?: boolean;
    existing_review_id?: string | null;
    order_id?: string | null;
    reason: string;
  } | null>(null);

  const fetchReviews = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await reviewsService.getPublicReviews(productSlug || productId, {
        rating: selectedRating,
        has_photos: hasPhotos || undefined,
        has_videos: hasVideos || undefined,
        sort: sortBy,
        page: pageNum,
        page_size: 10,
      });

      if (res.success && res.data) {
        setSummary(res.data.summary);
        setReviews(res.data.reviews || []);
        setPagination({
          page: res.data.pagination.page,
          total_pages: res.data.pagination.total_pages,
          total: res.data.pagination.total,
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch reviews:', err);
      setError('Failed to load product reviews.');
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await reviewsService.checkEligibility(productId);
      setEligibility(res);
    } catch (e) {
      console.error('Eligibility check error:', e);
    }
  };

  useEffect(() => {
    fetchReviews(1);
  }, [productId, productSlug, selectedRating, hasPhotos, hasVideos, sortBy]);

  useEffect(() => {
    if (isAuthenticated) {
      checkEligibility();
    }
  }, [isAuthenticated, productId]);

  const handleVote = async (reviewId: string, isHelpful: boolean) => {
    if (!isAuthenticated) {
      showToast?.('Please log in to vote on reviews.');
      return;
    }
    try {
      const res = await reviewsService.voteHelpful(reviewId, isHelpful);
      if (res.success && res.data) {
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? {
                  ...r,
                  helpful_count: res.data.helpful_count,
                  unhelpful_count: res.data.unhelpful_count,
                  user_has_voted: true,
                  user_vote_type: isHelpful ? 'helpful' : 'unhelpful',
                }
              : r
          )
        );
      }
    } catch (err: any) {
      showToast?.('Failed to record vote.');
    }
  };

  const handleOpenLightbox = (mediaItems: ReviewMediaItem[], index: number) => {
    setActiveMediaList(mediaItems);
    setActiveMediaIndex(index);
    setIsLightboxOpen(true);
  };

  const existingReviewObject = reviews.find(r => r.id === eligibility?.existing_review_id);

  return (
    <div className="space-y-5 text-left select-none">
      
      {/* ── Summary & Breakdown Header (Flipkart Style) ── */}
      <div className="border border-slate-200/80 rounded-xl p-4 sm:p-5 bg-white shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
          
          {/* Left: Overall Rating & Count */}
          <div className="sm:col-span-4 flex flex-col items-center sm:items-start justify-center sm:border-r sm:border-slate-100 sm:pr-4 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-slate-900 font-display">
                {summary.average_rating ? summary.average_rating.toFixed(1) : '0.0'}
              </span>
              <Star className="w-6 h-6 fill-emerald-600 text-emerald-600 mb-0.5" />
            </div>

            <span className="text-xs font-semibold text-slate-500 mt-1">
              {summary.total_reviews} Ratings & {summary.total_reviews} Reviews
            </span>

            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Verified buyers only</span>
            </div>
          </div>

          {/* Right: Compact Rating Distribution Bars */}
          <div className="sm:col-span-8 flex flex-col justify-center space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.rating_distribution[String(star)] || 0;
              const pct = summary.total_reviews > 0 ? Math.round((count / summary.total_reviews) * 100) : 0;
              const barColor = star >= 4 ? 'bg-emerald-500' : star === 3 ? 'bg-emerald-500' : star === 2 ? 'bg-amber-400' : 'bg-rose-500';

              return (
                <div key={star} className="flex items-center gap-2.5 text-[11px] font-semibold">
                  <button
                    onClick={() => setSelectedRating(selectedRating === star ? undefined : star)}
                    className={`flex items-center gap-0.5 w-7 shrink-0 transition-colors ${
                      selectedRating === star ? 'text-teal-700 font-bold' : 'text-slate-600 hover:text-teal-600'
                    }`}
                  >
                    <span>{star}</span>
                    <Star className="w-2.5 h-2.5 fill-slate-400 text-slate-400" />
                  </button>
                  
                  {/* Progress Bar */}
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all duration-300 rounded-full`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <span className="w-8 text-right text-slate-400 text-[10.5px] font-mono shrink-0">{count}</span>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* ── Filter & Sort Bar (Compact) ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-2 border-b border-slate-100">
        
        {/* Rating & Media Quick Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="font-bold text-slate-400 text-[11px] flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Filters:
          </span>

          <button
            onClick={() => setSelectedRating(undefined)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
              selectedRating === undefined
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>

          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => setSelectedRating(selectedRating === star ? undefined : star)}
              className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-0.5 transition-all ${
                selectedRating === star
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{star}</span>
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 stroke-none" />
            </button>
          ))}

          <button
            onClick={() => setHasPhotos(!hasPhotos)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
              hasPhotos
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ImageIcon className="w-3 h-3" /> Photos
          </button>

          <button
            onClick={() => setHasVideos(!hasVideos)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
              hasVideos
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <VideoIcon className="w-3 h-3" /> Videos
          </button>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span className="text-[11px] font-semibold text-slate-400">Sort:</span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="recent">Most Recent</option>
            <option value="rating_high">Highest Rating</option>
            <option value="rating_low">Lowest Rating</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>
      </div>

      {/* ── Reviews Cards List (Compact) ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          <p className="text-xs font-semibold">Loading reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-center p-5 space-y-2">
          <MessageSquarePlus className="w-8 h-8 text-slate-300" />
          <h4 className="text-xs font-bold text-slate-700">No Reviews Yet</h4>
          <p className="text-[11px] text-slate-400 max-w-sm">
            Be the first verified customer to share feedback for this product!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-xl p-4 border border-slate-200/70 shadow-2xs transition-all hover:border-slate-300"
            >
              {/* Card Header: Rating Badge + Title */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[11px] font-bold">
                  <span>{rev.rating}</span>
                  <Star className="w-2.5 h-2.5 fill-white text-white" />
                </span>
                {rev.title && <h5 className="text-xs font-bold text-slate-900 line-clamp-1">{rev.title}</h5>}
              </div>

              {/* Review Comment */}
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line font-normal mb-2.5">
                {rev.comment}
              </p>

              {/* Pros & Cons Chips */}
              {(rev.pros || rev.cons) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5 pt-2 border-t border-slate-100">
                  {rev.pros && (
                    <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-200/50 text-[11px]">
                      <span className="font-bold text-emerald-800 uppercase text-[9.5px] block mb-0.5">Pros</span>
                      <span className="text-emerald-950 font-medium">{rev.pros}</span>
                    </div>
                  )}
                  {rev.cons && (
                    <div className="p-2 rounded-lg bg-rose-50/60 border border-rose-200/50 text-[11px]">
                      <span className="font-bold text-rose-800 uppercase text-[9.5px] block mb-0.5">Cons</span>
                      <span className="text-rose-950 font-medium">{rev.cons}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Media Thumbnails */}
              {rev.media && rev.media.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto py-1.5 mb-2.5">
                  {rev.media.map((item, idx) => (
                    <button
                      key={item.id || idx}
                      onClick={() => handleOpenLightbox(rev.media, idx)}
                      className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 group flex-shrink-0 cursor-pointer"
                    >
                      {item.media_type === 'image' ? (
                        <img
                          src={item.url}
                          alt="Customer review photo"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                          <Play className="w-4 h-4 text-teal-400 fill-teal-400" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Card Footer: User Name, Verified badge, Date, Helpful counter */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 text-[11px]">
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <span className="font-semibold text-slate-700">{rev.user_name}</span>
                  {rev.is_verified_purchase && (
                    <span className="inline-flex items-center gap-0.5 text-teal-700 font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-teal-600" /> Verified Buyer
                    </span>
                  )}
                  <span className="text-slate-400">
                    {new Date(rev.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote(rev.id, true)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-all text-[11px] font-semibold ${
                      rev.user_has_voted && rev.user_vote_type === 'helpful'
                        ? 'bg-teal-50 border-teal-300 text-teal-700 font-bold'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <ThumbsUp className="w-3 h-3" />
                    <span>{rev.helpful_count}</span>
                  </button>

                  <button
                    onClick={() => handleVote(rev.id, false)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-all text-[11px] font-semibold ${
                      rev.user_has_voted && rev.user_vote_type === 'unhelpful'
                        ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <ThumbsDown className="w-3 h-3" />
                    <span>{rev.unhelpful_count}</span>
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          {Array.from({ length: pagination.total_pages }).map((_, idx) => {
            const pNum = idx + 1;
            return (
              <button
                key={pNum}
                onClick={() => fetchReviews(pNum)}
                className={`w-9 h-9 rounded-xl font-bold text-xs transition-all ${
                  pagination.page === pNum
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {pNum}
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      <ReviewMediaLightbox
        media={activeMediaList}
        initialIndex={activeMediaIndex}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />

      {/* Review Creation / Editing Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        productId={productId}
        productName={productName}
        orderId={eligibility?.order_id}
        existingReview={existingReviewObject}
        onSuccess={() => {
          showToast?.(
            eligibility?.is_edit
              ? 'Review updated successfully!'
              : 'Review submitted! Pending moderation.'
          );
          fetchReviews(1);
          checkEligibility();
        }}
      />
    </div>
  );
};
