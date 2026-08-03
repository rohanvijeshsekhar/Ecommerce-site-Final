'use client';

import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { ReviewMediaItem } from '@/lib/services/reviewsService';

interface ReviewMediaLightboxProps {
  media: ReviewMediaItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ReviewMediaLightbox: React.FC<ReviewMediaLightboxProps> = ({
  media,
  initialIndex = 0,
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (!isOpen || !media || media.length === 0) return null;

  const currentItem = media[currentIndex] || media[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md transition-opacity animate-in fade-in duration-200">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 text-slate-300 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Prev / Next buttons */}
      {media.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 text-slate-300 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 text-slate-300 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Main Container */}
      <div className="relative max-w-4xl max-h-[85vh] w-full p-4 flex flex-col items-center justify-center">
        {currentItem.media_type === 'image' ? (
          <img
            src={currentItem.url}
            alt="Customer review media"
            className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-slate-800"
          />
        ) : (
          <video
            src={currentItem.url}
            controls
            autoPlay
            preload="metadata"
            className="max-h-[75vh] max-w-full rounded-2xl shadow-2xl border border-slate-800"
          />
        )}

        {/* Thumbnail Navigation Bar */}
        {media.length > 1 && (
          <div className="flex items-center gap-2 mt-4 overflow-x-auto max-w-full p-2 bg-slate-900/80 rounded-xl border border-slate-800">
            {media.map((item, idx) => (
              <button
                key={item.id || idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                  currentIndex === idx ? 'border-teal-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                {item.media_type === 'image' ? (
                  <img src={item.url} alt="Thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <Play className="w-5 h-5 text-teal-400 fill-teal-400" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
