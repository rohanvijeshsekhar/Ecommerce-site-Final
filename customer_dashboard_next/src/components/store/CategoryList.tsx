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
  icon: React.ReactNode;
}

// Custom SVG Icons matching the reference design badges
const HandpieceBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[#006670] group-hover:text-white transition-colors duration-300">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const ImagingBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[#006670] group-hover:text-white transition-colors duration-300">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const InstrumentsBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[#006670] group-hover:text-white transition-colors duration-300">
    <path d="M6 19 L15 10" />
    <path d="M15 10 C16 9, 17 9, 17.5 8 C18 7, 17.5 5.5, 16 5.5" />
    <path d="M10 19 L17 12" />
    <circle cx="18.5" cy="10.5" r="2.5" />
  </svg>
);

const EquipmentBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[#006670] group-hover:text-white transition-colors duration-300">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const MaterialsBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[#006670] group-hover:text-white transition-colors duration-300">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const ChairsBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[#006670] group-hover:text-white transition-colors duration-300">
    <path d="M19 9l1.25-2.5A2 2 0 0 0 18.46 4H5.54a2 2 0 0 0-1.79 2.5L5 9" />
    <path d="M5 9v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
    <path d="M9 17v4" />
    <path d="M15 17v4" />
  </svg>
);

// Maps icon_key → existing predefined SVG icon component
const ICON_MAP: Record<string, React.ReactNode> = {
  handpiece:      <HandpieceBadgeIcon />,
  imaging:        <ImagingBadgeIcon />,
  instruments:    <InstrumentsBadgeIcon />,
  equipment:      <EquipmentBadgeIcon />,
  materials:      <MaterialsBadgeIcon />,
  chairs:         <ChairsBadgeIcon />,
  sterilization:  <HandpieceBadgeIcon />,
  endo:           <InstrumentsBadgeIcon />,
  implants:       <ImagingBadgeIcon />,
  other:          <MaterialsBadgeIcon />,
};

const categoryMapping: Record<string, string> = {};

// ─── Static fallback used when backend returns no categories ───────────────
const STATIC_CATEGORIES: CategoryItem[] = [
  {
    id: 'dental-handpieces',
    title: 'Dental Handpieces',
    image: '/images/category_handpieces.png',
    icon: <HandpieceBadgeIcon />,
  },
  {
    id: 'dental-imaging',
    title: 'Dental Imaging',
    image: '/images/category_imaging.png',
    icon: <ImagingBadgeIcon />,
  },
  {
    id: 'dental-instruments',
    title: 'Dental Instruments',
    image: '/images/category_instruments.png',
    icon: <InstrumentsBadgeIcon />,
  },
  {
    id: 'dental-equipment',
    title: 'Dental Equipment',
    image: '/images/category_equipment.png',
    icon: <EquipmentBadgeIcon />,
  },
  {
    id: 'dental-chairs',
    title: 'Dental Chairs',
    image: '/images/category_chairs.png',
    icon: <ChairsBadgeIcon />,
  },
  {
    id: 'dental-materials',
    title: 'Dental Materials',
    image: '/images/category_materials.png',
    icon: <MaterialsBadgeIcon />,
  },
];


interface CategoryListProps {
  onCategoryClick?: (categoryName: string) => void;
  initialCategories?: CategoryItem[];
}

const CategoryList: React.FC<CategoryListProps> = ({ onCategoryClick, initialCategories }) => {
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories || []);

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) return;
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
      let iconKey = 'other';
      if (slug.includes('handpiece')) iconKey = 'handpiece';
      else if (slug.includes('camera') || slug.includes('scan') || slug.includes('imaging') || slug.includes('x-ray')) iconKey = 'imaging';
      else if (slug.includes('instrument')) iconKey = 'instruments';
      else if (slug.includes('compressor') || slug.includes('suction') || slug.includes('equipment')) iconKey = 'equipment';
      else if (slug.includes('material') || slug.includes('composite')) iconKey = 'materials';
      else if (slug.includes('chair') || slug.includes('seating') || slug.includes('stool')) iconKey = 'chairs';

      return {
        id:    c.slug || String(c.id),
        title: c.name,
        image: getAbsoluteImageUrl(c.image) || getCategoryFallbackImage(slug),
        icon:  ICON_MAP[iconKey] ?? <MaterialsBadgeIcon />,
      };
    };

    const mapHomepageCategory = (c: any): CategoryItem => {
      const slug = c.category_slug ?? c.category ?? '';
      return {
        id:    c.category_slug ?? c.category,
        title: c.display_title,
        image: getAbsoluteImageUrl(c.card_image_url) || getCategoryFallbackImage(slug),
        icon:  ICON_MAP[c.icon_key] ?? <MaterialsBadgeIcon />,
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
              // else: keep static defaults showing
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
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
      <section className="hidden md:block w-full py-20 select-none bg-white overflow-hidden" id="categories">
        <div className="max-w-7xl mx-auto px-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight font-display">
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

        {/* Styles override for linear scrolling Swiper wrapper */}
        <style>{`
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
            className="category-swiper py-4 overflow-visible"
          >
            {displayCategories.map((cat, idx) => (
              <SwiperSlide key={`${cat.id}-${idx}`} style={{ width: 'auto' }}>
                <div onClick={() => handleCategoryClick(cat.id)} className="w-[280px] bg-gradient-to-br from-white/45 via-[#F2FAF9]/30 to-white/40 backdrop-blur-xl border border-[#006670]/20 rounded-[32px] shadow-[0_8px_32px_rgba(0, 43, 46,0.03)] hover:shadow-[0_20px_40px_rgba(0, 43, 46,0.08)] hover:border-[#006670]/35 hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-[390px] cursor-pointer group relative overflow-hidden">
                  {/* Top: Image Area */}
                  <div className="w-full h-[250px] bg-[#F5FBFB]/20 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.11)_0%,transparent_65%)] flex items-center justify-center overflow-hidden relative">
                    <Image
                      src={cat.image || '/images/category_materials.png'}
                      alt={cat.title}
                      fill
                      sizes="280px"
                      className="object-cover transform group-hover:scale-[1.05] transition-transform duration-500"
                    />
                  </div>

                  {/* Overlapping floating badge */}
                  <div className="absolute top-[223px] left-[24px] z-10 w-[52px] h-[52px] bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center shadow-[0_4px_14px_rgba(0,43,46,0.12)] border border-[#006670]/20 group-hover:scale-110 group-hover:bg-[#006670] group-hover:border-[#006670] transition-all duration-300">
                    {cat.icon}
                  </div>

                  {/* Bottom: Text area */}
                  <div className="bg-white/60 backdrop-blur-md text-left px-6.5 pt-9 pb-6 flex flex-col justify-between flex-grow rounded-b-[32px] border-t border-[#006670]/10">
                    <h3 className="text-[19px] font-black text-[#0F2D30] tracking-tight leading-snug group-hover:text-[#006670] transition-colors duration-300 font-display">
                      {cat.title}
                    </h3>
                    <div className="mt-3 flex items-center gap-1.5 text-sm font-bold text-[#007C82] hover:text-[#006670] transition-colors duration-300">
                      <span>Shop Now</span>
                      <span className="transform group-hover:translate-x-1.5 transition-transform duration-300">→</span>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* Mobile view */}
      <section className="block md:hidden w-full py-12 select-none bg-white overflow-hidden" id="categories-mobile">
        <div className="w-full px-5">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[28px] font-black text-slate-800 tracking-tight font-display leading-tight">
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
            className="category-swiper-mobile w-full py-2"
          >
            {displayCategories.map((cat, idx) => (
              <SwiperSlide key={`${cat.id}-mob-${idx}`}>
                <div onClick={() => handleCategoryClick(cat.id)} className="w-full bg-gradient-to-br from-white/45 via-[#F2FAF9]/30 to-white/40 backdrop-blur-xl border border-[#006670]/20 rounded-[20px] shadow-[0_4px_16px_rgba(0, 43, 46,0.02)] flex flex-col h-[224px] cursor-pointer group relative overflow-hidden">
                  {/* Top: Image Area */}
                  <div className="w-full h-[140px] bg-[#F5FBFB]/20 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.11)_0%,transparent_65%)] flex items-center justify-center overflow-hidden relative">
                    <img
                      src={cat.image}
                      alt={cat.title}
                      className="w-full h-full object-cover transform group-hover:scale-[1.05] transition-transform duration-500"
                    />
                  </div>

                  {/* Overlapping floating badge */}
                  <div className="absolute top-[118px] left-3.5 z-10 w-9 h-9 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center shadow-md border border-[#006670]/20 group-hover:bg-[#006670] transition-colors">
                    <div className="scale-90 flex items-center justify-center">
                      {cat.icon}
                    </div>
                  </div>

                  {/* Bottom: Text area */}
                  <div className="bg-white/60 text-left px-4 pt-5 pb-3 flex flex-col justify-between flex-grow rounded-b-[20px] border-t border-[#006670]/10">
                    <h3 className="text-[13px] font-black text-[#0F2D30] tracking-tight leading-tight group-hover:text-[#006670] transition-colors duration-300 font-display truncate">
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
