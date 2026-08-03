'use client';

import React, { useState, useEffect } from 'react';
import {
  Star,
  CheckCircle2,
  XCircle,
  EyeOff,
  Filter,
  Search,
  MessageSquare,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Play,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { reviewsService, ReviewItem } from '@/lib/services/reviewsService';
import { ReviewMediaLightbox } from '@/components/store/ReviewMediaLightbox';

export const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, hidden: 0 });
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'hidden'>('pending');
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);

  // Moderation Modal State
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | 'hidden' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Lightbox
  const [lightboxMedia, setLightboxMedia] = useState<any[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const fetchAdminReviews = async (page = 1) => {
    setLoading(true);
    try {
      const res = await reviewsService.getAdminReviews({
        status: activeTab,
        rating: ratingFilter,
        search: search.trim() || undefined,
        page,
        page_size: 10,
      });

      if (res.success && res.data) {
        setCounts(res.data.counts || { pending: 0, approved: 0, rejected: 0, hidden: 0 });
        setReviews(res.data.reviews || []);
        setPagination({
          page: res.data.pagination.page,
          total_pages: res.data.pagination.total_pages,
          total: res.data.pagination.total,
        });
      }
    } catch (e) {
      console.error('Failed to load admin reviews:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminReviews(1);
  }, [activeTab, ratingFilter, search]);

  const handleModerationSubmit = async () => {
    if (!selectedReview || !actionType) return;
    setSubmittingAction(true);
    try {
      await reviewsService.updateAdminStatus(selectedReview.id, actionType, rejectionReason);
      setSubmittingAction(false);
      setSelectedReview(null);
      setActionType(null);
      setRejectionReason('');
      fetchAdminReviews(pagination.page);
    } catch (e) {
      console.error('Failed to moderate review:', e);
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6 text-left select-none p-4 md:p-6 max-w-7xl mx-auto">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
            Customer Reviews Moderation
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Review, approve, or reject customer feedback and media submissions across FAAZO.
          </p>
        </div>
      </div>

      {/* Moderation Tabs Header */}
      <div className="flex border-b border-slate-200 overflow-x-auto bg-white rounded-2xl p-1.5 shadow-2xs border border-slate-200">
        {[
          { key: 'pending', label: 'Pending Moderation', count: counts.pending, color: 'bg-amber-500 text-white' },
          { key: 'approved', label: 'Approved', count: counts.approved, color: 'bg-emerald-500 text-white' },
          { key: 'rejected', label: 'Rejected', count: counts.rejected, color: 'bg-red-500 text-white' },
          { key: 'hidden', label: 'Hidden', count: counts.hidden, color: 'bg-slate-500 text-white' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.key
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${tab.color}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Rating Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product, customer, or title..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Rating Filter */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="text-slate-400">Filter Stars:</span>
          <select
            value={ratingFilter || ''}
            onChange={(e) => setRatingFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="">All Stars</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      {/* Reviews Table / Card List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-xs font-semibold">Loading reviews queue...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Reviews in {activeTab.toUpperCase()} Queue</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            All reviews in this category have been processed or no matching records were found.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4"
            >
              {/* Row 1: Product info, Rating & Status */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-teal-700 tracking-wider">
                    {rev.product_name}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">{rev.title}</h4>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-100'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-bold text-amber-900 ml-1">{rev.rating}.0</span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                      rev.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rev.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : rev.status === 'hidden'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {rev.status}
                  </span>
                </div>
              </div>

              {/* Row 2: Customer details & Verified Badge */}
              <div className="flex items-center gap-3 text-xs">
                <span className="font-bold text-slate-800">{rev.user_name}</span>
                <span className="text-slate-400">•</span>
                {rev.is_verified_purchase && (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Order {rev.order_id ? `#${rev.order_id.slice(0, 8)}` : ''}
                  </span>
                )}
                <span className="text-slate-400">•</span>
                <span className="text-slate-400">
                  {new Date(rev.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Row 3: Review Comment */}
              <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                {rev.comment}
              </p>

              {/* Row 4: Pros / Cons */}
              {(rev.pros || rev.cons) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {rev.pros && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200/40">
                      <span className="font-bold text-emerald-800 text-[10px] uppercase block">Pros:</span>
                      <span className="text-slate-700 font-medium">{rev.pros}</span>
                    </div>
                  )}
                  {rev.cons && (
                    <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-200/40">
                      <span className="font-bold text-rose-800 text-[10px] uppercase block">Cons:</span>
                      <span className="text-slate-700 font-medium">{rev.cons}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Row 5: Media Thumbnails */}
              {rev.media && rev.media.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {rev.media.map((item, idx) => (
                    <button
                      key={item.id || idx}
                      onClick={() => {
                        setLightboxMedia(rev.media);
                        setLightboxIndex(idx);
                        setIsLightboxOpen(true);
                      }}
                      className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group flex-shrink-0 cursor-pointer"
                    >
                      {item.media_type === 'image' ? (
                        <img src={item.url} alt="Media" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                          <Play className="w-5 h-5 text-teal-400 fill-teal-400" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Rejection reason if rejected */}
              {rev.rejection_reason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-medium">
                  <strong>Rejection Reason:</strong> {rev.rejection_reason}
                </div>
              )}

              {/* Row 6: Admin Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                {rev.status !== 'approved' && (
                  <button
                    onClick={() => {
                      setSelectedReview(rev);
                      setActionType('approved');
                      setRejectionReason('');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                )}

                {rev.status !== 'rejected' && (
                  <button
                    onClick={() => {
                      setSelectedReview(rev);
                      setActionType('rejected');
                      setRejectionReason('');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                )}

                {rev.status !== 'hidden' && (
                  <button
                    onClick={() => {
                      setSelectedReview(rev);
                      setActionType('hidden');
                      setRejectionReason('');
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <EyeOff className="w-4 h-4" /> Hide
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Moderation Confirmation Modal */}
      {selectedReview && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Confirm Review Moderation Action
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              You are about to set status of review for <strong className="text-slate-800">{selectedReview.product_name}</strong> to{' '}
              <strong className="uppercase text-teal-700">{actionType}</strong>.
            </p>

            {actionType === 'rejected' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Rejection Reason (will be sent to customer) *
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Contains off-topic language or irrelevant promotional content."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-red-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setSelectedReview(null);
                  setActionType(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleModerationSubmit}
                disabled={submittingAction}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md ${
                  actionType === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : actionType === 'rejected'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                {submittingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm {actionType.toUpperCase()}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      <ReviewMediaLightbox
        media={lightboxMedia}
        initialIndex={lightboxIndex}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
};
