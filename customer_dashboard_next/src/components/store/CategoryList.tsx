'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import { ArrowRight } from 'lucide-react';
import { api, getAbsoluteImageUrl } from '../../lib/api';

import 'swiper/css';

interface CategoryItem {
  id: string;
  title: string;
  image: string;
}

const categoryMapping: Record<string, string> = {};

// ─── Static fallback used when backend returns no categories ───────────────
const STATIC_CATEGORIES: CategoryItem[] = [
  {
    id: 'dental-handpieces',
    title: 'Dental Handpieces',
    image: '/images/category_handpieces.png',
  },
  {
    id: 'dental-imaging',
    title: 'Dental Imaging',
    image: '/images/category_imaging.png',
  },
  {
    id: 'dental-instruments',
    title: 'Dental Instruments',
    image: '/images/category_instruments.png',
  },
  {
    id: 'dental-equipment',
    title: 'Dental Equipment',
    image: '/images/category_equipment.png',
  },
  {
    id: 'dental-chairs',
    title: 'Dental Chairs',
    image: '/images/category_chairs.png',
  },
  {
    id: 'dental-materials',
    title: 'Dental Materials',
    image: '/images/category_materials.png',
  },
];

interface CategoryListProps {
  onCategoryClick?: (categoryName: string) => void;
  initialCategories?: CategoryItem[];
}

const CategoryList: React.FC<CategoryListProps> = ({ onCategoryClick, initialCategories }) => {
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories || []);

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(initialCategories);
      return;
    }
    const getCategoryFallbackImage = (slug: string): string => {
      const s = slug.toLowerCase();
      if (s.includes('handpiece')) return '/images/category_handpieces.png';
      if (s.includes('camera') || s.includes('scan') || s.includes('imaging') || s.includes('x-ray')) return '/images/category_imaging.png';
      if (s.includes('instrument')) return '/images/category_instruments.png';
      if (s.includes('compressor') || s.includes('suction') || s.includes('equipment')) return '/images/category_equipment.png';
      if (s.includes('chair') || s.includes('seating') || s.includes('stool')) return '/images/category_chairs.png';
      return '/images/category_materials.png';
    };

    const mapCategory = (c: any): CategoryItem => {
      const slug = c.slug || '';
      const title = c.name || '';
      return {
        id: slug || String(c.id),
        title: title,
        image: getAbsoluteImageUrl(c.image) || getCategoryFallbackImage(slug),
      };
    };

    const mapHomepageCategory = (c: any): CategoryItem => {
      const slug = c.category_slug ?? c.category ?? '';
      const title = c.display_title ?? c.category_name ?? '';
      return {
        id: slug,
        title: title,
        image: getAbsoluteImageUrl(c.card_image_url) || getCategoryFallbackImage(slug),
      };
    };

    api.get('homepage/categories/')
      .then(res => {
        const data = res.data?.data ?? res.data?.results ?? res.data ?? [];
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data.map(mapHomepageCategory));
        } else {
          // Fallback to active parent categories
          api.get('categories/?parent__isnull=true')
            .then(cRes => {
              const cData = cRes.data?.data ?? cRes.data?.results ?? cRes.data ?? [];
              if (Array.isArray(cData) && cData.length > 0) {
                setCategories(cData.map(mapCategory));
              }
            })
            .catch(() => { });
        }
      })
      .catch(() => { });
  }, [initialCategories]);

  // Use static fallback when no backend categories loaded yet
  const rawCategories = categories.length > 0 ? categories : STATIC_CATEGORIES;

  // Duplicate slides if list is too small to prevent Swiper from disabling loop mode
  const getLoopCategories = () => {
    if (rawCategories.length === 0) return [];
    const repeat = Math.ceil(12 / rawCategories.length);
    const res: CategoryItem[] = [];
    for (let i = 0; i < repeat; i++) {
      res.push(...rawCategories);
    }
    return res;
  };

  const displayCategories = getLoopCategories();

  const handleCategoryClick = (id: string) => {
    if (onCategoryClick) {
      const name = categoryMapping[id] ?? id;
      onCategoryClick(name);
      window.scrollTo(0, 0);
    }
  };

  return (
    <>
      {/* Desktop view */}
      <section className="hidden md:block w-full py-20 select-none bg-[#F8FAFC]" id="categories">
        <div className="max-w-7xl mx-auto px-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight font-sans">
              Shop by Category
            </h2>
            <a
              href="#"
              className="group inline-flex items-center gap-1.5 text-sm font-bold text-[#006670] hover:text-[#004e56] transition-all duration-300"
            >
              <span>View All Categories</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>
        </div>

        {/* Styles override for linear scrolling Swiper wrapper and hover overflow */}
        <style>{`
          .category-swiper,
          .category-swiper .swiper,
          .category-swiper .swiper-wrapper {
            overflow: visible !important;
          }
          .category-swiper .swiper-wrapper {
            transition-timing-function: linear !important;
          }
        `}</style>

        {/* Continuous Auto-Scrolling Swiper List */}
        <div className="w-full px-8">
          <Swiper
            modules={[Autoplay]}
            slidesPerView="auto"
            spaceBetween={24}
            loop={displayCategories.length > 4}
            speed={4500}
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
              pauseOnMouseEnter: false,
            }}
            allowTouchMove={true}
            className="category-swiper py-8 overflow-visible"
          >
            {displayCategories.map((cat, idx) => (
              <SwiperSlide key={`${cat.id}-${idx}`} style={{ width: 'auto' }}>
                <div onClick={() => handleCategoryClick(cat.id)} className="w-[280px] bg-white border border-slate-200/80 rounded-[32px] shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex flex-col h-[390px] cursor-pointer relative overflow-hidden group">
                  {/* Top: Image Area */}
                  <div className="w-full h-[230px] bg-slate-50 flex items-center justify-center overflow-hidden relative">
                    <Image
                      src={cat.image || '/images/category_materials.png'}
                      alt={cat.title}
                      fill
                      sizes="280px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Bottom: Text area */}
                  <div className="bg-white text-left px-6 pt-5 pb-5 flex flex-col justify-between flex-grow rounded-b-[32px] border-t border-slate-100">
                    <h3 className="text-[17px] font-black text-[#0F2D30] tracking-tight leading-snug font-sans line-clamp-2">
                      {cat.title}
                    </h3>
                    <div className="mt-2 flex items-center gap-1.5 text-sm font-bold text-[#007C82] group-hover:text-[#004e56] transition-colors">
                      <span>Shop Now</span>
                      <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* Mobile view */}
      <section className="block md:hidden w-full py-12 select-none bg-[#F8FAFC]" id="categories-mobile">
        <div className="w-full px-5">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[28px] font-black text-slate-800 tracking-tight font-sans leading-tight">
              Shop by Category
            </h2>
            <a
              href="#"
              className="group inline-flex items-center gap-1 text-xs font-bold text-[#006670] hover:text-[#004e56] transition-all"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Styles override for linear scrolling mobile Swiper wrapper */}
          <style>{`
            .category-swiper-mobile,
            .category-swiper-mobile .swiper,
            .category-swiper-mobile .swiper-wrapper {
              overflow: visible !important;
            }
            .category-swiper-mobile .swiper-wrapper {
              transition-timing-function: linear !important;
            }
          `}</style>

          {/* Continuous Auto-Scrolling Swiper */}
          <Swiper
            modules={[Autoplay]}
            slidesPerView={2.2}
            spaceBetween={12}
            loop={displayCategories.length > 2}
            speed={4500}
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
            }}
            allowTouchMove={true}
            className="category-swiper-mobile w-full py-4 overflow-visible"
          >
            {displayCategories.map((cat, idx) => (
              <SwiperSlide key={`${cat.id}-mob-${idx}`}>
                <div onClick={() => handleCategoryClick(cat.id)} className="w-full bg-gradient-to-br from-white/45 via-[#F2FAF9]/30 to-white/40 backdrop-blur-xl border border-[#006670]/20 rounded-[20px] shadow-[0_4px_16px_rgba(0, 43, 46,0.02)] flex flex-col h-[224px] cursor-pointer relative overflow-hidden group">
                  {/* Top: Image Area */}
                  <div className="w-full h-[130px] bg-[#F5FBFB]/20 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.11)_0%,transparent_65%)] flex items-center justify-center overflow-hidden relative">
                    <img
                      src={cat.image}
                      alt={cat.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Bottom: Text area */}
                  <div className="bg-white/60 text-left px-3.5 pt-4 pb-3 flex flex-col justify-between flex-grow rounded-b-[20px] border-t border-[#006670]/10">
                    <h3 className="text-[13px] font-black text-[#0F2D30] tracking-tight leading-tight font-display line-clamp-2">
                      {cat.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#007C82]">
                      <span>Shop Now</span>
                      <span>→</span>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>
    </>
  );
};

export default CategoryList;
