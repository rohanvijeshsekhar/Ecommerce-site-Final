'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';

const DEFAULT_BRANDS = [
  { id: '3m',         name: '3M ESPE' },
  { id: 'dentsply',   name: 'Dentsply Sirona' },
  { id: 'ivoclar',    name: 'Ivoclar Vivadent' },
  { id: 'nsk',        name: 'NSK Dental' },
  { id: 'woodpecker', name: 'Woodpecker Medical' },
  { id: 'coltene',    name: 'Coltene Dental' },
  { id: 'planmeca',   name: 'Planmeca' },
];

interface ApiBrand {
  id: string;
  name: string;
  logo_url?: string | null;
}

const BrandLogos: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [apiBrands, setApiBrands] = useState<ApiBrand[]>([]);

  useEffect(() => {
    setMounted(true);

    let isMounted = true;
    api.get('homepage/brands/')
      .then(res => {
        if (!isMounted) return;
        const data = res.data?.data ?? res.data?.results ?? res.data ?? [];
        if (Array.isArray(data) && data.length > 0) {
          setApiBrands(data.map((b: any) => ({
            id: String(b.id || b.slug || b.name),
            name: b.brand_name || b.name,
            logo_url: b.logo_url || b.logo || null,
          })));
        } else {
          api.get('brands/')
            .then(bRes => {
              if (!isMounted) return;
              const bData = bRes.data?.data ?? bRes.data?.results ?? bRes.data ?? [];
              if (Array.isArray(bData) && bData.length > 0) {
                setApiBrands(bData.map((b: any) => ({
                  id: String(b.id || b.slug || b.name),
                  name: b.name,
                  logo_url: b.logo_url || b.logo || null,
                })));
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const items = useMemo(() => {
    const list = apiBrands.length > 0 ? apiBrands : DEFAULT_BRANDS;
    if (list.length === 0) return [];
    const repeat = Math.ceil(14 / list.length);
    const res: ApiBrand[] = [];
    for (let i = 0; i < repeat; i++) {
      res.push(...list);
    }
    return res;
  }, [apiBrands]);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee-glass-anim {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .glass-marquee-track-desktop {
          display: flex;
          width: max-content;
          animation: marquee-glass-anim 35s linear infinite;
        }
        .glass-marquee-track-desktop:hover {
          animation-play-state: paused;
        }
        .glass-marquee-track-mobile {
          display: flex;
          width: max-content;
          animation: marquee-glass-anim 45s linear infinite;
        }
        .glass-marquee-mask {
          mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
        }
      `}} />

      {/* Desktop View */}
      <section className="hidden md:block w-full bg-gradient-to-b from-[#e3f4f5] via-[#d5eef0] to-[#e3f4f5] border-y border-teal-200/60 py-12 select-none">
        <div className="max-w-7xl mx-auto px-8">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-white/85 via-white/60 to-white/40 backdrop-blur-2xl p-9 border border-white/95 shadow-[0_20px_50px_-12px_rgba(0,90,100,0.14),0_6px_16px_0_rgba(0,0,0,0.04)] ring-1 ring-black/5">
          
            {/* Ambient Glass Glow Orbs */}
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#006670]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-teal-400/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-32 bg-[#008C99]/15 rounded-full blur-3xl pointer-events-none" />

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
              
              <Link
                href="/brands"
                className="group inline-flex items-center gap-2 text-sm font-bold text-[#006670] hover:text-[#004e56] px-4 py-2 rounded-full bg-white/60 hover:bg-white/90 border border-slate-200/60 hover:border-[#006670]/30 shadow-sm transition-all duration-300 backdrop-blur-md"
              >
                <span>View All Brands</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Seamless Glass Marquee Container */}
            <div className="relative z-10 w-full overflow-hidden py-1 glass-marquee-mask">
              <div className="glass-marquee-track-desktop flex items-center gap-12 md:gap-16 py-2">
                {[...items, ...items].map((brand, idx) => (
                  <div 
                    key={`desk-brand-${brand.id}-${idx}`} 
                    className="group flex items-center justify-center flex-shrink-0 cursor-pointer px-4 py-2 transition-all duration-300"
                  >
                    <span className="text-[18px] md:text-[20px] font-extrabold text-slate-700/80 group-hover:text-[#006670] transition-colors duration-300 tracking-tight select-none font-display">
                      {brand.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Mobile View */}
      <section className="block md:hidden w-full bg-gradient-to-b from-[#e3f4f5] via-[#d5eef0] to-[#e3f4f5] border-y border-teal-200/60 px-4 py-6 select-none" id="brands-mobile">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/85 via-white/55 to-white/35 backdrop-blur-xl p-6 border border-white/95 shadow-[0_16px_36px_-8px_rgba(0,90,100,0.12)] ring-1 ring-black/5">
          
          {/* Mobile Ambient Glows */}
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-[#006670]/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-teal-400/25 rounded-full blur-2xl pointer-events-none" />

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
            
            <Link
              href="/brands"
              className="group inline-flex items-center gap-1.5 text-xs font-bold text-[#006670] hover:text-[#004e56] px-3 py-1.5 rounded-full bg-white/70 border border-slate-200/60 shadow-xs"
            >
              <span>View All Brands</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Seamless Glass Marquee Container */}
          <div className="relative z-10 w-full overflow-hidden py-1 glass-marquee-mask">
            <div className="glass-marquee-track-mobile flex items-center gap-8 py-1">
              {[...items, ...items].map((brand, idx) => (
                <div 
                  key={`mob-brand-${brand.id}-${idx}`} 
                  className="group flex items-center justify-center flex-shrink-0 px-2 py-1"
                >
                  <span className="text-[15px] font-extrabold text-slate-700/80 tracking-tight select-none font-display">
                    {brand.name}
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
