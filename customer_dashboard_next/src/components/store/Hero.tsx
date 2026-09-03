'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';

import 'swiper/css';
import 'swiper/css/pagination';

interface SlideData {
  id: string;
  heading: string;
  subheading: string;
  cta_text: string;
  cta_link: string;
  desktop_image_url: string | null;
  mobile_image_url: string | null;
}

interface HeroProps {
  initialSlides?: SlideData[];
}

const Hero: React.FC<HeroProps> = ({ initialSlides }) => {
  const [slides, setSlides] = useState<SlideData[]>(initialSlides || []);

  useEffect(() => {
    if (initialSlides && initialSlides.length > 0) return;
    api.get('homepage/hero/')
      .then(res => {
        const data = res.data?.data ?? res.data?.results ?? res.data ?? [];
        if (Array.isArray(data)) {
          setSlides(data);
        }
      })
      .catch(() => {});
  }, [initialSlides]);

  // Provide static fallbacks if backend configuration is empty
  const displaySlides = slides.length > 0 ? slides : [
    {
      id: 'fallback-1',
      heading: 'Precision Performance Perfection',
      subheading: '',
      cta_text: 'Explore Products',
      cta_link: '#products',
      desktop_image_url: '/images/hero_ecommerce.png',
      mobile_image_url: '/images/hero_ecommerce.png'
    },
    {
      id: 'fallback-2',
      heading: 'Advanced dental solutions engineered for modern practices',
      subheading: '',
      cta_text: 'Explore Products',
      cta_link: '#products',
      desktop_image_url: '/images/hero1_ecommerce.png',
      mobile_image_url: '/images/hero1_ecommerce.png'
    }
  ];

  return (
    <div className="relative w-full bg-transparent pt-[60px] md:pt-[76px] lg:pt-[180px] px-0 md:px-8">
      <div className="max-w-[1440px] mx-auto w-full overflow-hidden rounded-none md:rounded-[24px] shadow-none md:shadow-[0_8px_30px_rgba(0,95,99,0.04)] border-b md:border border-[#E2E8F0] bg-white">
        {/* Promo Banner */}
        <div className="w-full bg-gradient-to-r from-[#005F63] via-[#0B7C80] to-[#005F63] text-white text-center py-2.5 px-4 flex flex-col items-center justify-center select-none border-b border-black/10">
          <span className="text-[9px] md:text-[11px] font-bold tracking-widest text-teal-100/90 uppercase mb-0.5 font-sans">
            FAAZO SUPER DEALS ARE LIVE:
          </span>
          <span className="text-[11px] md:text-[14px] font-extrabold tracking-wide uppercase font-sans">
            UP TO 50% OFF + EXTRA 10% OFF ON PREMIUM DENTAL BRANDS
          </span>
        </div>
        {/* Swiper Slider */}
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        navigation={{
          prevEl: '.hero-swiper-prev',
          nextEl: '.hero-swiper-next',
        }}
        pagination={{
          clickable: true,
          el: '.hero-swiper-pagination',
        }}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        loop={true}
        className="w-full relative"
      >
        {displaySlides.map((slide, idx) => {
          // Keep design layout, classes, overlays exactly as original
          const isSecondSlide = idx === 1;
          return (
            <SwiperSlide key={slide.id}>
              <div className="relative w-full aspect-[3/3.7] sm:aspect-[16/9] md:aspect-[3/1] flex items-center">
                {/* Background image */}
                <div className="absolute inset-0 w-full h-full z-0 select-none">
                  <Image
                    src={slide.desktop_image_url || '/images/hero_ecommerce.png'}
                    alt={slide.heading}
                    fill
                    priority={idx === 0}
                    sizes="100vw"
                    className="object-cover object-[center_right] md:object-center z-0 select-none"
                  />
                </div>

                {/* Desktop Content Overlay */}
                <div className="hidden md:flex relative z-10 max-w-7xl mx-auto w-full px-12 md:px-20 justify-end items-end pb-8 md:pb-10 lg:pb-12 h-full pointer-events-none">
                  <div className="text-right select-none pointer-events-auto">
                    {slide.heading && slide.heading.trim().length > 0 && (
                      <h1 className="text-[28px] lg:text-[42px] xl:text-[54px] 2xl:text-[64px] font-black text-slate-800 tracking-tight leading-[1.08] mb-4 flex flex-col font-display text-left">
                        {isSecondSlide ? (
                          <>
                            <span>{slide.heading.split(' engineered ')[0] || slide.heading}</span>
                            {slide.heading.includes(' engineered ') && (
                              <>
                                <span className="text-[#005F63]">engineered for</span>
                                <span>{slide.heading.split(' engineered ')[1] || ''}</span>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <span>{slide.heading.split(' ')[0] || ''}</span>
                            {slide.heading.split(' ')[1] && (
                              <span className="text-[#005F63]">{slide.heading.split(' ')[1]}</span>
                            )}
                            {slide.heading.split(' ').length > 2 && (
                              <span>{slide.heading.split(' ').slice(2).join(' ')}</span>
                            )}
                          </>
                        )}
                      </h1>
                    )}

                    {slide.cta_text && (
                      <a
                        href={slide.cta_link || '#products'}
                        className="group inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white/95 hover:bg-[#005F63] text-[#005F63] hover:text-white text-sm font-extrabold shadow-[0_6px_20px_rgba(0,0,0,0.18)] hover:shadow-[0_8px_25px_rgba(0,95,99,0.3)] backdrop-blur-md border border-white/80 transition-all duration-300 cursor-pointer tracking-wide active:scale-95"
                      >
                        <span>{slide.cta_text}</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Mobile Content Overlay (Ajio Reference Style) */}
                <div className="flex md:hidden relative z-10 w-full h-full flex-col items-center justify-end pb-24 select-none">
                  <h2 className="text-[17px] font-black text-slate-800 uppercase tracking-tight font-display">
                    {isSecondSlide ? 'DENTAL SOLUTIONS' : 'CLINICAL EQUIPMENT'}
                  </h2>
                  <span className="text-[34px] font-display font-black text-[#005F63] tracking-tight -mt-1.5 mb-1">
                    {isSecondSlide ? 'Summit' : 'Carnival'}
                  </span>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.16em] mb-1.5 font-display">
                    {slide.heading.toUpperCase()}
                  </p>
                  <div className="w-8 h-[1.5px] bg-[#005F63]/40 mb-2" />
                  <span className="text-[12px] font-black text-[#005F63] uppercase tracking-wider mb-2 font-display">
                    {isSecondSlide ? 'UP TO 40% OFF' : 'UP TO 50% OFF'}
                  </span>
                  <p className="text-[8px] font-extrabold text-slate-600 tracking-wide uppercase mt-1 font-display">
                    {isSecondSlide ? '3SHAPE | MEDIT | CARESTREAM' : 'NSK | WOODPECKER | DENTSPLY SIRONA'}
                  </p>
                </div>
              </div>
            </SwiperSlide>
          );
        })}

        {/* Circular Slider Navigation Controls */}
        <button
          className="hero-swiper-prev absolute left-3 md:left-8 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-11 md:h-11 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-[#005F63] hover:text-white transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer transition-opacity duration-300"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 stroke-[2]" />
        </button>
        <button
          className="hero-swiper-next absolute right-3 md:right-8 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-11 md:h-11 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-[#005F63] hover:text-white transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer transition-opacity duration-300"
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4 md:w-5 md:h-5 stroke-[2]" />
        </button>
      </Swiper>


      {/* Pagination bullets */}
      <div className="relative md:absolute md:bottom-3 left-0 right-0 z-20 flex justify-center py-3.5 md:py-0 bg-white md:bg-transparent border-b md:border-b-0 border-slate-100">
        <div className="hero-swiper-pagination flex justify-center items-center gap-1.5" />
      </div>


      </div>
    </div>
  );
};

export default Hero;

