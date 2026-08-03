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
    <div className="space-y-8 text-left select-none">
      
      {/* ── Summary & Breakdown Header ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-slate-50/70 border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
        
        {/* Rating Score */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-slate-100 shadow-xs text-center">
          <span className="text-5xl font-black text-slate-900 tracking-tight font-display">
            {summary.average_rating ? summary.average_rating.toFixed(1) : '0.0'}
          </span>
          <div className="flex items-center text-amber-400 gap-1 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  Math.round(summary.average_rating) >= star
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-200 fill-slate-100'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-slate-500">
            Based on {summary.total_reviews} verified customer review{summary.total_reviews === 1 ? '' : 's'}
          </span>

          {/* Verified Purchaser Notice */}
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 font-semibold flex items-center justify-center gap-2 leading-tight">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Reviews are exclusively submitted by verified buyers from their <strong>My Orders</strong> page after delivery.</span>
          </div>
        </div>

        {/* Rating Distribution Progress Bars */}
        <div className="lg:col-span-8 flex flex-col justify-center space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Rating Distribution
          </h4>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.rating_distribution[String(star)] || 0;
            const pct = summary.total_reviews > 0 ? Math.round((count / summary.total_reviews) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-3 text-xs font-semibold">
                <button
                  onClick={() => setSelectedRating(selectedRating === star ? undefined : star)}
                  className={`flex items-center gap-1 w-12 hover:text-teal-600 transition-colors ${
                    selectedRating === star ? 'text-teal-600 font-bold' : 'text-slate-600'
                  }`}
                >
                  <span>{star}</span>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                </button>
                
                {/* Progress Bar Container */}
                <div className="flex-1 h-3 rounded-full bg-slate-200/70 overflow-hidden relative">
                  <div
                    className="h-full bg-amber-400 transition-all duration-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <span className="w-12 text-right text-slate-400 text-[11px] font-mono">{count} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filter & Sort Bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-3 border-b border-slate-200/80">
        
        {/* Rating & Media Quick Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-bold text-slate-500 flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>

          <button
            onClick={() => setSelectedRating(undefined)}
            className={`px-3 py-1.5 rounded-full font-bold transition-all ${
              selectedRating === undefined
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Ratings
          </button>

          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => setSelectedRating(selectedRating === star ? undefined : star)}
              className={`px-3 py-1.5 rounded-full font-bold flex items-center gap-1 transition-all ${
                selectedRating === star
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{star}</span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400 stroke-none" />
            </button>
          ))}

          <button
            onClick={() => setHasPhotos(!hasPhotos)}
            className={`px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all ${
              hasPhotos
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Photos
          </button>

          <button
            onClick={() => setHasVideos(!hasVideos)}
            className={`px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all ${
              hasVideos
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <VideoIcon className="w-3.5 h-3.5" /> Videos
          </button>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="recent">Most Recent</option>
            <option value="rating_high">Highest Rating</option>
            <option value="rating_low">Lowest Rating</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>
      </div>

      {/* ── Reviews Cards List ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-xs font-semibold">Loading clinical customer feedback...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-center p-6 space-y-3">
          <MessageSquarePlus className="w-10 h-10 text-slate-300" />
          <h4 className="text-sm font-bold text-slate-700">No Reviews Matching Criteria</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Be the first verified customer to share clinical feedback for this dental product!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.015)] transition-all hover:border-slate-300"
            >
              {/* Card Header: Author & Verified Badge */}
              <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                    {rev.user_avatar ? (
                      <img src={rev.user_avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      rev.user_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900">{rev.user_name}</h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      {rev.is_verified_purchase && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60">
                          <CheckCircle2 className="w-3 h-3 text-teal-600" /> Verified Purchase
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-medium font-sans">
                        {new Date(rev.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rating Stars */}
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-xl">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Review Title & Content */}
              <h4 className="text-sm font-bold text-slate-900 mb-1.5">{rev.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line font-medium mb-4">
                {rev.comment}
              </p>

              {/* Pros & Cons Chips */}
              {(rev.pros || rev.cons) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 pt-3 border-t border-slate-100">
                  {rev.pros && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/50 text-xs">
                      <span className="font-bold text-emerald-800 uppercase text-[10px] block mb-0.5">
                        Pros
                      </span>
                      <span className="text-emerald-950 font-medium">{rev.pros}</span>
                    </div>
                  )}
                  {rev.cons && (
                    <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200/50 text-xs">
                      <span className="font-bold text-rose-800 uppercase text-[10px] block mb-0.5">
                        Cons
                      </span>
                      <span className="text-rose-950 font-medium">{rev.cons}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Would Recommend Indicator */}
              {rev.would_recommend && (
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 mb-4">
                  <ThumbsUp className="w-3.5 h-3.5" /> Recommends this product
                </div>
              )}

              {/* Media Thumbnails */}
              {rev.media && rev.media.length > 0 && (
                <div className="flex items-center gap-2.5 overflow-x-auto py-2 mb-4">
                  {rev.media.map((item, idx) => (
                    <button
                      key={item.id || idx}
                      onClick={() => handleOpenLightbox(rev.media, idx)}
                      className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group flex-shrink-0 cursor-pointer shadow-xs"
                    >
                      {item.media_type === 'image' ? (
                        <img
                          src={item.url}
                          alt="Customer review photo"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                          <Play className="w-5 h-5 text-teal-400 fill-teal-400" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Helpful Votes Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className="text-[11px] font-semibold text-slate-400">
                  Was this review helpful?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote(rev.id, true)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-xs font-semibold ${
                      rev.user_has_voted && rev.user_vote_type === 'helpful'
                        ? 'bg-teal-50 border-teal-300 text-teal-700 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{rev.helpful_count}</span>
                  </button>

                  <button
                    onClick={() => handleVote(rev.id, false)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-xs font-semibold ${
                      rev.user_has_voted && rev.user_vote_type === 'unhelpful'
                        ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
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
