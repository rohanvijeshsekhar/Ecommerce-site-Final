import React, { useState, useEffect } from 'react';
import { ArrowRight, Star, Quote } from 'lucide-react';
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
        // Map backend fields → existing JSX field names (no JSX changes)
        const mapped: ReviewItem[] = (Array.isArray(data) ? data : []).map((t: any) => ({
          id:     t.id,
          name:   t.customer_name,
          clinic: t.clinic_name,
          quote:  t.review,
          rating: t.rating,
          image:  t.photo_url ?? '',
        }));
        if (mapped.length > 0) setReviews(mapped);
        // else: keep static defaults showing
      })
      .catch(() => {}); // silently fall back to static
  }, []);

  // Use static fallback when no testimonials configured yet
  const displayReviews = reviews.length > 0 ? reviews : STATIC_REVIEWS;

  return (
    <>
      {/* Desktop view */}
      <section className="hidden md:block w-full bg-[#F2FBFB] border-y border-teal-100/60 py-16 select-none">
        <div className="max-w-7xl mx-auto px-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight font-display">
              What Our Customers Say
            </h2>
            <a 
              href="#" 
              className="group inline-flex items-center gap-1.5 text-sm font-bold text-[#006670] hover:text-[#004e56] transition-colors"
            >
              View All Reviews
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          {/* Grid for desktop */}
          <div className="grid grid-cols-3 gap-6 text-left">
            {displayReviews.map((rev) => (
              <div 
                key={rev.id} 
                className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_rgba(0,102,112,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
              <div>
                <Quote className="w-8 h-8 text-[#006670]/25 mb-4 transform -scale-x-100" />
                <p className="text-sm font-medium text-slate-700 italic leading-relaxed min-h-[72px]">
                  "{rev.quote}"
                </p>
                
                {/* Star Rating */}
                <div className="flex items-center text-amber-500 gap-0.5 mt-4 mb-6">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-500 stroke-amber-500" />
                  ))}
                </div>
              </div>

              {/* Doctor Info */}
              <div className="flex items-center gap-3.5 pt-4 border-t border-slate-200/50">
                <img 
                  src={rev.image} 
                  alt={rev.name} 
                  className="w-11 h-11 rounded-full object-cover border-2 border-[#e6f3f5]"
                />
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 font-display">
                    {rev.name}
                  </h4>
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                    {rev.clinic}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile view */}
      <section className="block md:hidden w-full bg-[#F2FBFB] border-y border-teal-100/60 px-5 py-8 select-none" id="testimonials-mobile">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[28px] font-black text-slate-800 tracking-tight font-display leading-tight">
            What Customers Say
          </h2>
          <a 
            href="#" 
            className="group inline-flex items-center gap-1 text-xs font-bold text-[#006670]"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Mobile Slider */}
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
                <div className="bg-[#F7FAF9] border border-slate-100 rounded-2xl p-6 text-left flex flex-col justify-between min-h-[300px]">
                  <div>
                    <Quote className="w-8 h-8 text-[#006670]/25 mb-4 transform -scale-x-100" />
                    <p className="text-sm font-medium text-slate-700 italic leading-relaxed mb-4 font-sans">
                      "{rev.quote}"
                    </p>
                    
                    <div className="flex items-center text-amber-500 gap-0.5 mb-6">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-500 stroke-amber-500" />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 pt-4 border-t border-slate-200/50">
                    <img 
                      src={rev.image} 
                      alt={rev.name} 
                      className="w-10 h-10 rounded-full object-cover border border-[#e6f3f5]"
                    />
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-800 font-display">
                        {rev.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {rev.clinic}
                      </p>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
          <div className="testimonials-pagination flex justify-center items-center gap-1.5 mt-4" />
        </div>
      </section>
    </>
  );
};

export default Testimonials;
