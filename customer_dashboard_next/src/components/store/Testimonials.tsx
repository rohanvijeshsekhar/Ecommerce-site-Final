'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Star, Quote, Sparkles, CheckCircle2 } from 'lucide-react';
import { api, getAbsoluteImageUrl } from '../../lib/api';

interface ReviewItem {
  id: string;
  name: string;
  clinic: string;
  quote: string;
  rating: number;
  image: string;
}

const STATIC_REVIEWS: ReviewItem[] = [
  {
    id: 'testimonial-1',
    name: 'Dr. Arjun Mehta',
    clinic: 'Smile Dental Clinic, Mumbai',
    quote: 'Faazo has transformed how we source dental equipment. The quality is outstanding and delivery is always on time. Highly recommend!',
    rating: 5,
    image: '/images/testimonial_1.png',
  },
  {
    id: 'testimonial-2',
    name: 'Dr. Priya Sharma',
    clinic: 'Advanced Dental Care, Bangalore',
    quote: 'Exceptional product range and competitive pricing. The NSK handpieces we ordered have made a significant difference in our patient outcomes.',
    rating: 5,
    image: '/images/testimonial_2.png',
  },
  {
    id: 'testimonial-3',
    name: 'Dr. Rahul Verma',
    clinic: 'City Dental Hub, Delhi',
    quote: 'Best place to source professional dental equipment. The team is knowledgeable and the after-sales support is excellent.',
    rating: 5,
    image: '/images/testimonial_3.png',
  },
];

const Testimonials: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    api.get('homepage/testimonials/')
      .then(res => {
        if (!isMounted) return;
        const data = res.data?.data ?? res.data?.results ?? res.data ?? [];
        if (Array.isArray(data) && data.length > 0) {
          const mapped: ReviewItem[] = data.map((t: any) => ({
            id: String(t.id),
            name: t.customer_name || 'Verified Practitioner',
            clinic: t.clinic_name || 'Dental Clinic',
            quote: t.review || '',
            rating: Number(t.rating) || 5,
            image: t.photo_url || (t.photo ? getAbsoluteImageUrl(t.photo) : '') || '/images/testimonial_1.png',
          }));
          setReviews(mapped);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Duplicate items to ensure a seamless infinite marquee scroll
  const marqueeItems = useMemo(() => {
    const base = reviews.length > 0 ? reviews : STATIC_REVIEWS;
    if (!base || base.length === 0) return [];
    
    // Repeat enough items so the half-track is always longer than standard screens
    const targetCount = Math.max(6, base.length);
    const repeatTimes = Math.ceil(targetCount / base.length);
    
    const singleSet: ReviewItem[] = [];
    for (let i = 0; i < repeatTimes; i++) {
      singleSet.push(...base);
    }
    
    // Return two identical copies for a seamless 0% -> -50% translateX loop
    return [...singleSet, ...singleSet];
  }, [reviews]);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes testimonials-marquee-anim {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .testimonials-marquee-track {
          display: flex;
          width: max-content;
          animation: testimonials-marquee-anim 36s linear infinite;
        }
        .testimonials-marquee-track:hover {
          animation-play-state: paused;
        }
        .testimonials-mask {
          mask-image: linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%);
        }
        @media (max-width: 768px) {
          .testimonials-marquee-track {
            animation-duration: 26s;
          }
        }
      `}} />

      {/* Desktop View - Continuous Infinite Left-Scrolling Marquee */}
      <section className="hidden md:block w-full bg-[#F2FBFB] border-y border-[#E2E8F0] py-20 relative overflow-hidden select-none" id="testimonials">
        {/* Ambient Glass Glow Orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#005F63]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#45AFED]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-40 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-8 relative z-10 mb-10">
          {/* Section Header */}
          <div className="text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#005F63]/10 text-[#005F63] text-xs font-extrabold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Verified Clinical Feedback</span>
            </div>
            <h2 className="text-3.5xl font-black text-slate-800 tracking-tight font-display">
              What Dentists & Surgeons Say
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Trusted by thousands of dental clinics across India for equipment reliability and after-sales support.
            </p>
          </div>
        </div>

        {/* Infinite Scrolling Track */}
        <div className="relative z-10 w-full overflow-hidden testimonials-mask py-4">
          <div className="testimonials-marquee-track flex items-stretch gap-7 px-4">
            {marqueeItems.map((rev, idx) => (
              <div 
                key={`desk-testimonial-${rev.id}-${idx}`} 
                className="group relative w-[390px] lg:w-[420px] flex-shrink-0 rounded-3xl bg-white/40 hover:bg-white/60 backdrop-blur-2xl p-7 border border-white/70 shadow-[0_12px_36px_-8px_rgba(0,95,99,0.08),0_2px_8px_0_rgba(255,255,255,0.5)_inset] hover:shadow-[0_20px_48px_-6px_rgba(0,95,99,0.18),0_2px_12px_0_rgba(255,255,255,0.7)_inset] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Subtle Glass Top Specular Highlight */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent rounded-t-3xl" />

                <div>
                  {/* Glass Top Row: Quote Icon & Star Rating */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-2xl bg-[#005F63]/10 flex items-center justify-center text-[#005F63] border border-[#005F63]/20 shadow-inner backdrop-blur-md">
                      <Quote className="w-5 h-5 transform -scale-x-100" />
                    </div>

                    <div className="flex items-center gap-1 bg-white/60 border border-white/80 px-3 py-1 rounded-full shadow-2xs backdrop-blur-md">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
                      ))}
                      <span className="text-xs font-black text-amber-700 ml-1">5.0</span>
                    </div>
                  </div>

                  {/* Testimonial Quote Text */}
                  <p className="text-[13.5px] font-semibold text-slate-800 italic leading-relaxed min-h-[76px] mb-6 whitespace-normal text-left">
                    &quot;{rev.quote}&quot;
                  </p>
                </div>

                {/* Practitioner Info Footer */}
                <div className="flex items-center gap-3.5 pt-4 border-t border-white/40">
                  <div className="relative flex-shrink-0">
                    <img 
                      src={rev.image || '/images/testimonial_1.png'} 
                      alt={rev.name} 
                      className="w-12 h-12 rounded-full object-cover border-2 border-white/80 shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/testimonial_1.png';
                      }}
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#005F63] text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                    </div>
                  </div>

                  <div className="text-left">
                    <h4 className="text-sm font-black text-slate-900 font-display flex items-center gap-1.5">
                      <span>{rev.name}</span>
                    </h4>
                    <p className="text-[11px] font-extrabold text-[#005F63] mt-0.5 tracking-tight line-clamp-1">
                      {rev.clinic}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile View - Continuous Infinite Left-Scrolling Marquee */}
      <section className="block md:hidden w-full bg-[#F2FBFB] border-y border-[#E2E8F0] px-4 py-10 relative overflow-hidden select-none" id="testimonials-mobile">
        {/* Mobile Glass Glow Orbs */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#005F63]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#45AFED]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Header */}
          <div className="mb-6 px-1 text-left">
            <span className="text-[10px] font-extrabold tracking-wider text-[#005F63] uppercase block mb-1">
              Verified Reviews
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight font-display leading-tight">
              What Customers Say
            </h2>
          </div>

          {/* Mobile Infinite Scrolling Track */}
          <div className="relative z-10 w-full overflow-hidden testimonials-mask py-2">
            <div className="testimonials-marquee-track flex items-stretch gap-4">
              {marqueeItems.map((rev, idx) => (
                <div 
                  key={`mob-testimonial-${rev.id}-${idx}`}
                  className="rounded-3xl bg-white/45 backdrop-blur-xl p-5 border border-white/70 shadow-[0_12px_32px_-8px_rgba(0,95,99,0.1),0_2px_8px_0_rgba(255,255,255,0.4)_inset] text-left flex flex-col justify-between w-[290px] flex-shrink-0"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-8 h-8 rounded-xl bg-[#005F63]/10 flex items-center justify-center text-[#005F63] border border-[#005F63]/20 backdrop-blur-md">
                        <Quote className="w-3.5 h-3.5 transform -scale-x-100" />
                      </div>
                      <div className="flex items-center gap-1 bg-white/60 border border-white/80 px-2 py-0.5 rounded-full backdrop-blur-md">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-500 stroke-amber-500" />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-slate-800 italic leading-relaxed mb-4 whitespace-normal">
                      &quot;{rev.quote}&quot;
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-3.5 border-t border-white/40">
                    <div className="relative flex-shrink-0">
                      <img 
                        src={rev.image || '/images/testimonial_1.png'} 
                        alt={rev.name} 
                        className="w-9 h-9 rounded-full object-cover border-2 border-white/80 shadow-xs"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/testimonial_1.png';
                        }}
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#005F63] text-white flex items-center justify-center">
                        <CheckCircle2 className="w-2.5 h-2.5 stroke-[2.5]" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 font-display">
                        {rev.name}
                      </h4>
                      <p className="text-[10px] font-extrabold text-[#005F63] mt-0.5 line-clamp-1">
                        {rev.clinic}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Testimonials;
