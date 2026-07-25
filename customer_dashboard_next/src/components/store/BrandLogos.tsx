'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import {
  Brand3M,
  BrandDentsply,
  BrandIvoclar,
  BrandNSK,
  BrandWoodpecker,
  BrandColtene,
  BrandPlanmeca
} from './DentalIcons';

const DEFAULT_BRANDS = [
  { id: '3m',         name: '3M ESPE',             component: <Brand3M /> },
  { id: 'dentsply',   name: 'Dentsply Sirona',     component: <BrandDentsply /> },
  { id: 'ivoclar',    name: 'Ivoclar Vivadent',    component: <BrandIvoclar /> },
  { id: 'nsk',        name: 'NSK Dental',          component: <BrandNSK /> },
  { id: 'woodpecker', name: 'Woodpecker Medical',  component: <BrandWoodpecker /> },
  { id: 'coltene',    name: 'Coltene Dental',      component: <BrandColtene /> },
  { id: 'planmeca',   name: 'Planmeca',            component: <BrandPlanmeca /> },
];

interface ApiBrand {
  id: string;
  brand_name: string;
  logo_url: string | null;
}

const BrandLogos: React.FC = () => {
  const [apiBrands, setApiBrands] = useState<ApiBrand[]>([]);

  useEffect(() => {
    const mapBrand = (b: any): ApiBrand => {
      return {
        id: b.id,
        brand_name: b.name,
        logo_url: b.logo || null
      };
    };

    const mapHomepageBrand = (b: any): ApiBrand => {
      return {
        id: b.id,
        brand_name: b.brand_name,
        logo_url: b.logo_url || null
      };
    };

    api.get('homepage/brands/')
      .then(res => {
        const data = res.data?.data ?? res.data?.results ?? res.data ?? [];
        if (Array.isArray(data) && data.length > 0) {
          setApiBrands(data.map(mapHomepageBrand));
        } else {
          // Fallback to active catalog brands
          api.get('brands/')
            .then(bRes => {
              const bData = bRes.data?.data ?? bRes.data?.results ?? bRes.data ?? [];
              setApiBrands(bData.map(mapBrand));
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const hasApiBrands = apiBrands.length > 0;

  const getMarqueeItems = () => {
    if (hasApiBrands) {
      const items = apiBrands;
      if (items.length === 0) return [];
      const repeat = Math.ceil(14 / items.length);
      const res: ApiBrand[] = [];
      for (let i = 0; i < repeat; i++) {
        res.push(...items);
      }
      return res;
    } else {
      const items = DEFAULT_BRANDS;
      const repeat = Math.ceil(14 / items.length);
      const res: typeof DEFAULT_BRANDS = [];
      for (let i = 0; i < repeat; i++) {
        res.push(...items);
      }
      return res;
    }
  };

  const marqueeItems = getMarqueeItems();
  const hasItems = marqueeItems.length > 0;
  const desktopDuration = marqueeItems.length * 2.8;
  const mobileDuration = marqueeItems.length * 3.8;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee-glass {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .glass-marquee-track-desktop {
          display: flex;
          width: max-content;
          animation: marquee-glass ${desktopDuration}s linear infinite;
        }
        .glass-marquee-track-desktop:hover {
          animation-play-state: paused;
        }
        .glass-marquee-track-mobile {
          display: flex;
          width: max-content;
          animation: marquee-glass ${mobileDuration}s linear infinite;
        }
        .glass-marquee-mask {
          mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
        }
      `}} />

      {/* Desktop View */}
      <section className="hidden md:block w-full bg-[#F2FBFB] border-y border-teal-100/60 py-12 select-none">
        <div className="max-w-7xl mx-auto px-8">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-white/90 via-white/70 to-white/50 backdrop-blur-2xl p-9 border border-white/90 shadow-[0_16px_40px_-12px_rgba(0,102,112,0.08),0_4px_12px_0_rgba(0,0,0,0.03)] ring-1 ring-slate-900/5">
          
          {/* Ambient Glass Glow Orbs */}
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#006670]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-32 bg-sky-200/20 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 flex justify-between items-center mb-8 px-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#006670]/10 backdrop-blur-md flex items-center justify-center border border-[#006670]/20 shadow-inner">
                <Sparkles className="w-4 h-4 text-[#006670]" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight font-display">
                Trusted by Leading Global Brands
              </h2>
            </div>
            
            <a
              href="#"
              className="group inline-flex items-center gap-2 text-sm font-bold text-[#006670] hover:text-[#004e56] px-4 py-2 rounded-full bg-white/60 hover:bg-white/90 border border-slate-200/60 hover:border-[#006670]/30 shadow-sm transition-all duration-300 backdrop-blur-md"
            >
              <span>View All Brands</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>

          {/* Seamless Glass Marquee Container without separation boxes */}
          <div className="relative z-10 w-full overflow-hidden py-1 glass-marquee-mask">
            <div className="glass-marquee-track-desktop flex items-center gap-6 py-2">
              {hasItems && [...marqueeItems, ...marqueeItems].map((brand: any, idx) => (
                <div 
                  key={`${brand.id}-${idx}`} 
                  className="group flex items-center justify-center flex-shrink-0 cursor-pointer px-6 py-2 transition-all duration-300"
                >
                  <span className="text-[18px] font-extrabold text-slate-700/80 group-hover:text-[#006670] transition-colors duration-300 tracking-tight select-none">
                    {brand.brand_name ?? brand.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
        </div>
      </section>

      {/* Mobile View */}
      <section className="block md:hidden w-full bg-[#F2FBFB] border-y border-teal-100/60 px-4 py-6 select-none" id="brands-mobile">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/80 via-white/50 to-white/30 backdrop-blur-xl p-6 border border-white/90 shadow-[0_12px_32px_-8px_rgba(0,102,112,0.08)] ring-1 ring-slate-900/5">
          
          {/* Mobile Ambient Glows */}
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-[#006670]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 flex flex-col items-start gap-2.5 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#006670]/10 flex items-center justify-center border border-[#006670]/20">
                <Sparkles className="w-3.5 h-3.5 text-[#006670]" />
              </div>
              <h2 className="text-[21px] font-black text-slate-900 tracking-tight font-display leading-tight text-left">
                Trusted by Leading Global Brands
              </h2>
            </div>
            
            <a
              href="#"
              className="group inline-flex items-center gap-1.5 text-xs font-bold text-[#006670] hover:text-[#004e56] px-3 py-1.5 rounded-full bg-white/70 border border-slate-200/60 shadow-xs"
            >
              <span>View All Brands</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Seamless Glass Marquee Container */}
          <div className="relative z-10 w-full overflow-hidden py-1 glass-marquee-mask">
            <div className="glass-marquee-track-mobile flex items-center gap-4 py-1">
              {hasItems && [...marqueeItems, ...marqueeItems].map((brand: any, idx) => (
                <div 
                  key={`${brand.id}-mob-${idx}`} 
                  className="flex items-center justify-center flex-shrink-0 px-4 py-1"
                >
                  <span className="text-[15px] font-extrabold text-slate-700/80 tracking-tight select-none">
                    {brand.brand_name ?? brand.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    </>
  );
};

export default BrandLogos;
