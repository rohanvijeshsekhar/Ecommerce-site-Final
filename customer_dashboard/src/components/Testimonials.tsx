import React, { useState, useEffect } from 'react';
import { ArrowRight, Star, Quote, Sparkles, CheckCircle2 } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import { api } from '../services/api';

import 'swiper/css';
import 'swiper/css/pagination';

interface ReviewItem {
  id: string;
  name: string;
  clinic: string;
  quote: string;
  rating: number;
  image: string;
}

// ─── Static fallback testimonials used when backend returns none ──────────
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
    api.get('homepage/testimonials/')
      .then(res => {
        const data = res.data?.data ?? res.data?.results ?? res.data ?? [];
        const mapped: ReviewItem[] = (Array.isArray(data) ? data : []).map((t: any) => ({
          id:     t.id,
          name:   t.customer_name,
          clinic: t.clinic_name,
          quote:  t.review,
          rating: t.rating,
          image:  t.photo_url ?? '',
        }));
        if (mapped.length > 0) setReviews(mapped);
      })
      .catch(() => {});
  }, []);

  const displayReviews = reviews.length > 0 ? reviews : STATIC_REVIEWS;

  return (
    <>
      {/* Desktop View - Ultra Transparent Glassmorphic */}
      <section className="hidden md:block w-full bg-[#F2FBFB] border-y border-[#E2E8F0] py-20 relative overflow-hidden select-none" id="testimonials">
        {/* Ambient Glass Glow Orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#005F63]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#45AFED]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-40 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-8 relative z-10">
          {/* Section Header */}
          <div className="flex justify-between items-end mb-12 text-left">
            <div>
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

            <a 
              href="#" 
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/40 hover:bg-white/60 border border-white/60 text-sm font-bold text-[#005F63] hover:text-[#0B7C80] shadow-xs hover:shadow-md transition-all duration-300 backdrop-blur-xl"
            >
              <span>View All Reviews</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>

          {/* Ultra Transparent Glass Grid */}
          <div className="grid grid-cols-3 gap-7 text-left">
            {displayReviews.map((rev) => (
              <div 
                key={rev.id} 
                className="group relative rounded-3xl bg-white/25 hover:bg-white/40 backdrop-blur-2xl p-7 border border-white/60 shadow-[0_12px_36px_-8px_rgba(0,95,99,0.08),0_2px_8px_0_rgba(255,255,255,0.4)_inset] hover:shadow-[0_20px_48px_-6px_rgba(0,95,99,0.16),0_2px_12px_0_rgba(255,255,255,0.6)_inset] hover:-translate-y-1.5 transition-all duration-400 flex flex-col justify-between"
              >
                {/* Subtle Glass Top Specular Highlight */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent rounded-t-3xl" />

                <div>
                  {/* Glass Top Row: Quote Icon & Star Rating */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-2xl bg-[#005F63]/10 flex items-center justify-center text-[#005F63] border border-[#005F63]/20 shadow-inner backdrop-blur-md">
                      <Quote className="w-5 h-5 transform -scale-x-100" />
                    </div>

                    <div className="flex items-center gap-1 bg-white/50 border border-white/80 px-3 py-1 rounded-full shadow-2xs backdrop-blur-md">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
                      ))}
                      <span className="text-xs font-black text-amber-700 ml-1">5.0</span>
                    </div>
                  </div>

                  {/* Testimonial Quote Text */}
                  <p className="text-[13.5px] font-semibold text-slate-800 italic leading-relaxed min-h-[76px] mb-6">
                    &quot;{rev.quote}&quot;
                  </p>
                </div>

                {/* Practitioner Info Footer */}
                <div className="flex items-center gap-3.5 pt-4 border-t border-white/40">
                  <div className="relative">
                    <img 
                      src={rev.image} 
                      alt={rev.name} 
                      className="w-12 h-12 rounded-full object-cover border-2 border-white/80 shadow-sm"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#005F63] text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-slate-900 font-display flex items-center gap-1.5">
                      <span>{rev.name}</span>
                    </h4>
                    <p className="text-[11px] font-extrabold text-[#005F63] mt-0.5 tracking-tight">
                      {rev.clinic}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile View - Transparent Glassmorphic Slider */}
      <section className="block md:hidden w-full bg-[#F2FBFB] border-y border-[#E2E8F0] px-5 py-10 relative overflow-hidden select-none" id="testimonials-mobile">
        {/* Mobile Glass Glow Orbs */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#005F63]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#45AFED]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <span className="text-[10px] font-extrabold tracking-wider text-[#005F63] uppercase block mb-1">
                Verified Reviews
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight font-display leading-tight">
                What Customers Say
              </h2>
            </div>
            <a 
              href="#" 
              className="group inline-flex items-center gap-1 text-xs font-bold text-[#005F63]"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Mobile Glass Slider */}
          <div className="w-full">
            <Swiper
              modules={[Pagination]}
              pagination={{ clickable: true, el: '.testimonials-pagination' }}
              spaceBetween={16}
              slidesPerView={1}
              className="w-full"
            >
              {displayReviews.map((rev) => (
                <SwiperSlide key={rev.id}>
                  <div className="rounded-3xl bg-white/30 backdrop-blur-xl p-6 border border-white/60 shadow-[0_12px_32px_-8px_rgba(0,95,99,0.1),0_2px_8px_0_rgba(255,255,255,0.4)_inset] text-left flex flex-col justify-between min-h-[290px]">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-9 h-9 rounded-xl bg-[#005F63]/10 flex items-center justify-center text-[#005F63] border border-[#005F63]/20 backdrop-blur-md">
                          <Quote className="w-4 h-4 transform -scale-x-100" />
                        </div>
                        <div className="flex items-center gap-1 bg-white/50 border border-white/80 px-2.5 py-0.5 rounded-full backdrop-blur-md">
                          {[...Array(rev.rating)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-slate-800 italic leading-relaxed mb-4">
                        &quot;{rev.quote}&quot;
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-white/40">
                      <div className="relative">
                        <img 
                          src={rev.image} 
                          alt={rev.name} 
                          className="w-10 h-10 rounded-full object-cover border-2 border-white/80 shadow-xs"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#005F63] text-white flex items-center justify-center">
                          <CheckCircle2 className="w-2.5 h-2.5 stroke-[2.5]" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 font-display">
                          {rev.name}
                        </h4>
                        <p className="text-[10px] font-extrabold text-[#005F63] mt-0.5">
                          {rev.clinic}
                        </p>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
            <div className="testimonials-pagination flex justify-center items-center gap-1.5 mt-5" />
          </div>
        </div>
      </section>
    </>
  );
};

export default Testimonials;
