'use client';

import React, { useState, useEffect } from 'react';
import { X, Star, Upload, Image as ImageIcon, Video, ThumbsUp, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { reviewsService, ReviewItem } from '@/lib/services/reviewsService';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  orderId?: string | null;
  existingReview?: ReviewItem | null;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  orderId,
  existingReview,
  onSuccess,
}) => {
  const [rating, setRating] = useState<number>(existingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState(existingReview?.title || '');
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [pros, setPros] = useState(existingReview?.pros || '');
  const [cons, setCons] = useState(existingReview?.cons || '');
  const [wouldRecommend, setWouldRecommend] = useState(existingReview?.would_recommend ?? true);
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ url: string; type: 'image' | 'video'; name: string }[]>([]);
  const [deleteMediaIds, setDeleteMediaIds] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setTitle(existingReview.title);
      setComment(existingReview.comment);
      setPros(existingReview.pros || '');
      setCons(existingReview.cons || '');
      setWouldRecommend(existingReview.would_recommend);
    } else {
      setRating(5);
      setTitle('');
      setComment('');
      setPros('');
      setCons('');
      setWouldRecommend(true);
    }
    setSelectedFiles([]);
    setFilePreviews([]);
    setDeleteMediaIds([]);
    setError(null);
  }, [existingReview, isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    const validFiles: File[] = [];
    const previews: { url: string; type: 'image' | 'video'; name: string }[] = [];
    let err = null;

    let imageCount = selectedFiles.filter(f => f.type.startsWith('image/')).length + (existingReview?.media.filter(m => m.media_type === 'image' && !deleteMediaIds.includes(m.id)).length || 0);
    let videoCount = selectedFiles.filter(f => f.type.startsWith('video/')).length + (existingReview?.media.filter(m => m.media_type === 'video' && !deleteMediaIds.includes(m.id)).length || 0);

    for (const f of files) {
      const isImg = f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(f.name);
      const isVid = f.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(f.name);

      if (isImg) {
        imageCount++;
        if (imageCount > 5) {
          err = 'Maximum 5 images allowed.';
          break;
        }
        if (f.size > 5 * 1024 * 1024) {
          err = `Image '${f.name}' exceeds 5 MB size limit.`;
          break;
        }
        validFiles.push(f);
        previews.push({ url: URL.createObjectURL(f), type: 'image', name: f.name });
      } else if (isVid) {
        videoCount++;
        if (videoCount > 1) {
          err = 'Maximum 1 video allowed.';
          break;
        }
        if (f.size > 100 * 1024 * 1024) {
          err = `Video '${f.name}' exceeds 100 MB size limit.`;
          break;
        }
        validFiles.push(f);
        previews.push({ url: URL.createObjectURL(f), type: 'video', name: f.name });
      } else {
        err = `File '${f.name}' is not supported. Allowed: JPG, PNG, WEBP, MP4, MOV, WEBM.`;
        break;
      }
    }

    if (err) {
      setError(err);
      return;
    }

    setError(null);
    setSelectedFiles((prev) => [...prev, ...previews]);
    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleRemoveExistingMedia = (mediaId: string) => {
    setDeleteMediaIds((prev) => [...prev, mediaId]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !comment.trim()) {
      setError('Please provide both a title and review content.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('product_id', productId);
      formData.append('rating', String(rating));
      formData.append('title', title.trim());
      formData.append('comment', comment.trim());
      formData.append('pros', pros.trim());
      formData.append('cons', cons.trim());
      formData.append('would_recommend', String(wouldRecommend));

      if (orderId) {
        formData.append('order_id', orderId);
      }

      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      deleteMediaIds.forEach((id) => {
        formData.append('delete_media_ids', id);
      });

      if (existingReview) {
        await reviewsService.updateReview(existingReview.id, formData);
      } else {
        await reviewsService.createReview(formData);
      }

      setLoading(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setLoading(false);
      const msg = err.response?.data?.message || err.message || 'Failed to submit review.';
      setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-slate-50 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-display">
              {existingReview ? 'Edit Your Review' : 'Write a Product Review'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Overall Rating */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-teal-50/50 border border-teal-100/80">
            <span className="text-sm font-bold text-slate-700 mb-2">Overall Rating</span>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300 fill-slate-100'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold text-teal-700 mt-2">
              {rating === 5 && 'Outstanding! Highly Recommended'}
              {rating === 4 && 'Very Good! Recommended'}
              {rating === 3 && 'Average / Meets Expectations'}
              {rating === 2 && 'Below Average'}
              {rating === 1 && 'Poor Experience'}
            </span>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Review Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Excellent build quality and fast delivery!"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm font-medium outline-none transition-all"
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Review Description *
            </label>
            <textarea
              required
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your detailed experience with clinical use, performance, durability, etc."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm font-medium outline-none transition-all"
            />
          </div>

          {/* Pros & Cons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1.5">
                Pros (Optional)
              </label>
              <input
                type="text"
                value={pros}
                onChange={(e) => setPros(e.target.value)}
                placeholder="High precision, easy setup..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/20 focus:border-emerald-500 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-rose-700 uppercase tracking-wider mb-1.5">
                Cons (Optional)
              </label>
              <input
                type="text"
                value={cons}
                onChange={(e) => setCons(e.target.value)}
                placeholder="Slightly heavy..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50/20 focus:border-rose-500 text-sm outline-none"
              />
            </div>
          </div>

          {/* Would Recommend Checkbox */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <input
              type="checkbox"
              id="recommend-check"
              checked={wouldRecommend}
              onChange={(e) => setWouldRecommend(e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600"
            />
            <label htmlFor="recommend-check" className="text-sm font-semibold text-slate-700 cursor-pointer">
              I recommend this product to other dental professionals
            </label>
          </div>

          {/* Media Attachments */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Upload Customer Photos & Video (Max 5 Images, 1 Video)
            </label>
            
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-slate-100/60 hover:border-teal-500 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-teal-600" />
                  <p className="text-xs font-semibold text-slate-700">
                    <span className="font-bold text-teal-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">PNG, JPG, WEBP (max 5MB) or MP4, MOV (max 100MB)</p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            {/* Media Items Grid */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              {/* Existing Media */}
              {existingReview?.media
                .filter((m) => !deleteMediaIds.includes(m.id))
                .map((m) => (
                  <div key={m.id} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square">
                    {m.media_type === 'image' ? (
                      <img src={m.url} alt="Media" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                        <Video className="w-6 h-6 text-teal-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingMedia(m.id)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

              {/* Newly Selected Files Previews */}
              {filePreviews.map((preview, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square">
                  {preview.type === 'image' ? (
                    <img src={preview.url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                      <Video className="w-6 h-6 text-teal-400" />
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[9px] font-bold rounded">
                    NEW
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-lg shadow-teal-700/20 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{existingReview ? 'Update Review' : 'Submit Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
