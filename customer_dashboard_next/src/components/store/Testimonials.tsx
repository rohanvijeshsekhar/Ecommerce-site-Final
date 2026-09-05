'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Star, Quote, Sparkles } from 'lucide-react';
import { api, getAbsoluteImageUrl } from '../../lib/api';

interface ReviewItem {
  id: string;
  name: string;
  clinic: string;
  quote: string;
  rating: number;
  image: string;
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80';

const STATIC_REVIEWS: ReviewItem[] = [
  {
    id: 'testimonial-1',
    name: 'Dr. Arjun Mehta',
    clinic: 'Smile Dental Clinic, Mumbai',
    quote: 'Faazo has transformed how we source dental equipment. The quality is outstanding and delivery is always on time. Highly recommend!',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'testimonial-2',
    name: 'Dr. Priya Sharma',
    clinic: 'Advanced Dental Care, Bangalore',
    quote: 'Exceptional product range and competitive pricing. The NSK handpieces we ordered have made a significant difference in our patient outcomes.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'testimonial-3',
    name: 'Dr. Rahul Verma',
    clinic: 'City Dental Hub, Delhi',
    quote: 'Best place to source professional dental equipment. The team is knowledgeable and the after-sales support is excellent.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80',
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
            image: t.photo_url || (t.photo ? getAbsoluteImageUrl(t.photo) : '') || DEFAULT_AVATAR,
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
    
    // Repeat the base list so we have enough items to loop continuously without visual gaps
    return [...base, ...base, ...base, ...base];
  }, [reviews]);

  return (
    <>
      <style>{`
        @keyframes testimonials-marquee-anim {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .testimonials-marquee-track {
          width: max-content;
          display: flex;
          animation: testimonials-marquee-anim 36s linear infinite;
        }
        .testimonials-marquee-track:hover {
          animation-play-state: paused;
        }
        .testimonials-mask {
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }
        @media (max-width: 768px) {
          .testimonials-marquee-track {
            animation-duration: 24s;
          }
        }
      `}</style>

      {/* Desktop / Tablet View */}
      <section className="hidden md:block w-full bg-[#F2FBFB] border-y border-[#E2E8F0] py-20 relative overflow-hidden select-none" id="testimonials">
        {/* Glow Spheres */}
        <div className="absolute top-1/2 left-10 -translate-y-1/2 w-96 h-96 bg-[#005F63]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-10 -translate-y-1/2 w-96 h-96 bg-[#45AFED]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#005F63]/10 border border-[#005F63]/20 mb-4 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#005F63]" />
            <span className="text-xs font-black text-[#005F63] uppercase tracking-wider">
              Trusted by 10,000+ Dentists Nationwide
            </span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight font-display">
            What Practitioners Say About FAAZO
          </h2>
          <p className="text-slate-500 font-semibold text-sm max-w-xl mx-auto mt-2">
            Real feedback from clinics across India using our clinical-grade instruments & equipment.
          </p>
        </div>

        {/* Infinite Scrolling Track */}
        <div className="relative z-10 w-full overflow-hidden testimonials-mask py-4">
          <div className="testimonials-marquee-track flex items-stretch gap-7 px-4">
            {marqueeItems.map((rev, idx) => (
              <div 
                key={`desk-testimonial-${rev.id}-${idx}`} 
                className="w-[380px] flex-shrink-0 rounded-3xl bg-white/45 backdrop-blur-xl p-7 border border-white/70 shadow-[0_20px_50px_-12px_rgba(0,95,99,0.1),0_2px_8px_0_rgba(255,255,255,0.6)_inset] text-left flex flex-col justify-between transition-all duration-300 hover:shadow-[0_24px_60px_-8px_rgba(0,95,99,0.18),0_2px_8px_0_rgba(255,255,255,0.8)_inset] hover:-translate-y-1 group"
              >
                <div>
                  {/* Top Quote + Rating Badge */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-2xl bg-[#005F63]/10 flex items-center justify-center text-[#005F63] border border-[#005F63]/20 backdrop-blur-md">
                      <Quote className="w-4 h-4 transform -scale-x-100" />
                    </div>
                    <div className="flex items-center gap-1 bg-white/60 border border-white/80 px-2.5 py-1 rounded-full backdrop-blur-md">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
                      ))}
                    </div>
                  </div>

                  {/* Testimonial Quote Text */}
                  <p className="text-sm font-semibold text-slate-800 italic leading-relaxed mb-6 whitespace-normal">
                    &quot;{rev.quote}&quot;
                  </p>
                </div>

                {/* Practitioner Info Footer */}
                <div className="pt-4 border-t border-white/40 text-left">
                  <h4 className="text-sm font-black text-slate-900 font-display">
                    {rev.name}
                  </h4>
                  <p className="text-[11.5px] font-extrabold text-[#005F63] mt-0.5 tracking-tight line-clamp-1">
                    {rev.clinic}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile View */}
      <section className="block md:hidden w-full bg-[#F2FBFB] border-y border-[#E2E8F0] px-4 py-10 relative overflow-hidden select-none" id="testimonials-mobile">
        <div className="relative z-10">
          <div className="mb-6 px-1 text-left">
            <span className="text-[10px] font-extrabold tracking-wider text-[#005F63] uppercase block mb-1">
              Verified Reviews
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight font-display leading-tight">
              What Customers Say
            </h2>
          </div>

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

                  <div className="pt-3.5 border-t border-white/40 text-left">
                    <h4 className="text-xs font-black text-slate-900 font-display">
                      {rev.name}
                    </h4>
                    <p className="text-[10.5px] font-extrabold text-[#005F63] mt-0.5 line-clamp-1">
                      {rev.clinic}
                    </p>
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
