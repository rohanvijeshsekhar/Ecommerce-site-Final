'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape returned by /api/v1/homepage/brands/ that this component cares about. */
interface HomepageShowcaseBrand {
  /** HomepageBrand record ID */
  id: string;
  /** Display name of the brand */
  name: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BrandLogos: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [brands, setBrands] = useState<HomepageShowcaseBrand[]>([]);

  useEffect(() => {
    setMounted(true);

    let isMounted = true;

    api
      .get('homepage/brands/')
      .then(res => {
        if (!isMounted) return;
        const data: unknown[] =
          res.data?.data ?? res.data?.results ?? res.data ?? [];
        if (Array.isArray(data) && data.length > 0) {
          setBrands(
            data.map((b: any) => ({
              id: String(b.id || b.brand || b.brand_slug || b.brand_name),
              name: String(b.brand_name || b.name || ''),
            }))
          );
        }
        // If the API returns an empty list, we render nothing (rule 11).
      })
      .catch(() => {
        // Silently swallow – the section will simply not render.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Repeat the list enough times so the seamless marquee never runs out of
  // content. We target ≥ 14 visible slots; if fewer brands exist, repeat more.
  const marqueeItems = useMemo(() => {
    if (brands.length === 0) return [];
    const repeat = Math.max(2, Math.ceil(14 / brands.length));
    const result: HomepageShowcaseBrand[] = [];
    for (let i = 0; i < repeat; i++) {
      result.push(...brands);
    }
    return result;
  }, [brands]);

  // Avoid SSR / hydration mismatch; also hides the section when no brands are
  // configured in Admin → Homepage → Brand Logos.
  if (!mounted || brands.length === 0) {
    return null;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee-glass-anim {
          0%   { transform: translateX(0); }
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

      {/* ── Desktop View ─────────────────────────────────────────────────── */}
      <section className="hidden md:block w-full bg-transparent py-12 select-none">
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

            {/* Seamless Text Marquee */}
            <div className="relative z-10 w-full overflow-hidden py-1 glass-marquee-mask">
              <div className="glass-marquee-track-desktop flex items-center gap-12 md:gap-16 py-2">
                {[...marqueeItems, ...marqueeItems].map((brand, idx) => (
                  <div
                    key={`desk-brand-${brand.id}-${idx}`}
                    className="group flex items-center justify-center flex-shrink-0 cursor-default px-4 py-2 transition-all duration-300"
                  >
                    <span className="text-[18px] md:text-[20px] font-extrabold text-slate-700/80 group-hover:text-[#006670] transition-colors duration-300 tracking-tight select-none font-display whitespace-nowrap">
                      {brand.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Mobile View ──────────────────────────────────────────────────── */}
      <section className="block md:hidden w-full bg-transparent px-4 py-6 select-none" id="brands-mobile">
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

          {/* Seamless Text Marquee */}
          <div className="relative z-10 w-full overflow-hidden py-1 glass-marquee-mask">
            <div className="glass-marquee-track-mobile flex items-center gap-8 py-1">
              {[...marqueeItems, ...marqueeItems].map((brand, idx) => (
                <div
                  key={`mob-brand-${brand.id}-${idx}`}
                  className="group flex items-center justify-center flex-shrink-0 px-2 py-1"
                >
                  <span className="text-[15px] font-extrabold text-slate-700/80 group-hover:text-[#006670] transition-colors duration-300 tracking-tight select-none font-display whitespace-nowrap">
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
