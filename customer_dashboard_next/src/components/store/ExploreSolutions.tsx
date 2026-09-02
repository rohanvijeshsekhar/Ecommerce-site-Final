'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, Package } from 'lucide-react';
import { api } from '../../lib/api';

export interface ClinicalSolutionData {
  id: string | number;
  title: string;
  slug: string;
  short_description: string;
  banner: string;
  thumbnail: string;
  product_count: number;
  display_order: number;
  is_active: boolean;
  show_on_homepage: boolean;
}

const STATIC_SOLUTIONS: ClinicalSolutionData[] = [
  {
    id: 1,
    title: 'Restorative Dentistry',
    slug: 'restorative-dentistry',
    short_description: 'Complete workflow for composite fillings, matrices, curing lights, and bonding agents.',
    banner: '/images/hero1_ecommerce.png',
    thumbnail: '/images/bestseller_curing.png',
    product_count: 8,
    display_order: 1,
    is_active: true,
    show_on_homepage: true,
  },
  {
    id: 2,
    title: 'Endodontic Solutions',
    slug: 'endodontic-solutions',
    short_description: 'Endo motors, rotary files, apex locators, and obturation systems for root canal treatments.',
    banner: '/images/hero_ecommerce.png',
    thumbnail: '/images/bestseller_locator.png',
    product_count: 6,
    display_order: 2,
    is_active: true,
    show_on_homepage: true,
  },
  {
    id: 3,
    title: 'Orthodontic Solutions',
    slug: 'orthodontic-solutions',
    short_description: 'Brackets, archwires, pliers, aligner accessories, and orthodontic bonding.',
    banner: '/images/hero_equipment.png',
    thumbnail: '/images/category_instruments.png',
    product_count: 12,
    display_order: 3,
    is_active: true,
    show_on_homepage: true,
  },
  {
    id: 4,
    title: 'Prosthodontic Solutions',
    slug: 'prosthodontic-solutions',
    short_description: 'Impression materials, crown & bridge resins, retraction cords, and articulators.',
    banner: '/images/hero1_ecommerce.png',
    thumbnail: '/images/category_materials.png',
    product_count: 9,
    display_order: 4,
    is_active: true,
    show_on_homepage: true,
  },
  {
    id: 5,
    title: 'Implant Solutions',
    slug: 'implant-solutions',
    short_description: 'Surgical physiodispensers, implant handpieces, torque wrenches, and bone grafting instruments.',
    banner: '/images/hero_ecommerce.png',
    thumbnail: '/images/category_equipment.png',
    product_count: 5,
    display_order: 5,
    is_active: true,
    show_on_homepage: true,
  },
  {
    id: 6,
    title: 'Preventive Care',
    slug: 'preventive-care',
    short_description: 'Ultrasonic scalers, prophy handpieces, fluoride gels, and dental hygiene consumables.',
    banner: '/images/hero_equipment.png',
    thumbnail: '/images/bestseller_scaler.png',
    product_count: 10,
    display_order: 6,
    is_active: true,
    show_on_homepage: true,
  },
  {
    id: 7,
    title: 'Pediatric Dentistry',
    slug: 'pediatric-dentistry',
    short_description: 'Child-friendly pediatric crowns, topical anesthetics, space maintainers, and gentle handpieces.',
    banner: '/images/hero1_ecommerce.png',
    thumbnail: '/images/category_handpieces.png',
    product_count: 7,
    display_order: 7,
    is_active: true,
    show_on_homepage: true,
  },
  {
    id: 8,
    title: 'Oral Surgery',
    slug: 'oral-surgery',
    short_description: 'Surgical burs, extraction forceps, elevators, bone chisels, and surgical suctions.',
    banner: '/images/hero_ecommerce.png',
    thumbnail: '/images/category_instruments.png',
    product_count: 11,
    display_order: 8,
    is_active: true,
    show_on_homepage: true,
  },
];

interface ExploreSolutionsProps {
  onSelectSolution?: (slug: string) => void;
  onViewAllSolutions?: () => void;
  onViewPortfolio?: () => void;
}

const ExploreSolutions: React.FC<ExploreSolutionsProps> = ({ onSelectSolution, onViewAllSolutions }) => {
  const router = useRouter();
  const [solutions, setSolutions] = useState<ClinicalSolutionData[]>(STATIC_SOLUTIONS);

  useEffect(() => {
    api.get('solutions/?homepage=true')
      .then((res) => {
        const data = res.data?.data ?? res.data?.results ?? res.data ?? [];
        if (Array.isArray(data) && data.length > 0) {
          setSolutions(data);
        }
      })
      .catch(() => {
        // Fallback to static data if offline
      });
  }, []);

  const handleSolutionClick = (slug: string) => {
    if (onSelectSolution) {
      onSelectSolution(slug);
    } else {
      router.push(`/solutions/${slug}`);
    }
  };

  return (
    <>
      {/* Desktop view */}
      <section className="hidden md:block w-full bg-[#F2FBFB] py-16 select-none" id="solutions">
        <div className="max-w-7xl mx-auto px-8">
          {/* Header */}
          <div className="flex justify-between items-end mb-10 text-left">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#005F63]/10 text-[#005F63] text-xs font-extrabold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Procedure Workflows</span>
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight font-display">
                Explore by Solutions
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Find complete product solutions designed for every clinical procedure.
              </p>
            </div>

            <button
              onClick={() => onViewAllSolutions ? onViewAllSolutions() : handleSolutionClick(solutions[0]?.slug || 'restorative-dentistry')}
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#E2E8F0] text-sm font-bold text-[#005F63] hover:bg-[#F2FBFB] hover:border-[#005F63] transition-all shadow-xs cursor-pointer"
            >
              <span>View All Solutions</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Solutions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {solutions.map((sol) => (
              <div
                key={sol.id}
                onClick={() => handleSolutionClick(sol.slug)}
                className="group relative rounded-2xl overflow-hidden bg-white border border-[#E2E8F0] shadow-sm hover:shadow-[0_16px_36px_rgba(0,95,99,0.14)] hover:-translate-y-2 transition-all duration-300 cursor-pointer flex flex-col justify-between h-[360px]"
              >
                {/* Background Banner Image with Dark Gradient Overlay */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <img
                    src={sol.banner || sol.thumbnail}
                    alt={sol.title}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 brightness-[0.85] group-hover:brightness-[0.95]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/50 to-slate-900/10" />
                </div>

                {/* Top Badge: Product Count */}
                <div className="relative z-10 p-4 flex justify-between items-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[11px] font-bold text-[#005F63] border border-white/40 shadow-xs">
                    <Package className="w-3.5 h-3.5" />
                    {sol.product_count} Products Included
                  </span>
                </div>

                {/* Bottom Content Area */}
                <div className="relative z-10 p-5 flex flex-col justify-end">
                  <h3 className="text-xl font-extrabold text-white tracking-tight font-display mb-1.5 leading-snug">
                    {sol.title}
                  </h3>
                  <p className="text-xs text-slate-200/90 font-medium line-clamp-2 leading-relaxed mb-4">
                    {sol.short_description}
                  </p>

                  <div className="inline-flex items-center justify-between w-full pt-3 border-t border-white/20 text-xs font-bold text-white group-hover:text-teal-200 transition-colors">
                    <span className="flex items-center gap-1">
                      Explore Solution
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                    <span className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm group-hover:bg-[#005F63] flex items-center justify-center transition-colors">
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile view */}
      <section className="block md:hidden w-full bg-[#F2FBFB] px-5 py-8 select-none" id="solutions-mobile">
        <div className="flex flex-col mb-6 text-left">
          <span className="text-[10px] font-extrabold text-[#005F63] tracking-widest uppercase mb-1">
            Procedure Workflows
          </span>
          <h2 className="text-[26px] font-black text-slate-800 tracking-tight font-display leading-tight">
            Explore by Solutions
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Find complete product solutions designed for every clinical procedure.
          </p>
        </div>

        <div className="flex flex-col gap-4 text-left">
          {solutions.map((sol) => (
            <div
              key={sol.id}
              onClick={() => handleSolutionClick(sol.slug)}
              className="group relative rounded-xl overflow-hidden bg-slate-900 border border-[#E2E8F0] shadow-sm active:scale-[0.99] transition-all cursor-pointer h-[240px] flex flex-col justify-between p-4"
            >
              <div className="absolute inset-0 z-0">
                <img
                  src={sol.banner || sol.thumbnail}
                  alt={sol.title}
                  className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
              </div>

              <div className="relative z-10 flex justify-between items-center">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/90 text-[10px] font-bold text-[#005F63]">
                  <Package className="w-3 h-3" />
                  {sol.product_count} Products
                </span>
              </div>

              <div className="relative z-10">
                <h3 className="text-lg font-extrabold text-white tracking-tight font-display mb-1">
                  {sol.title}
                </h3>
                <p className="text-[11px] text-slate-300 font-medium line-clamp-2 mb-3">
                  {sol.short_description}
                </p>
                <div className="inline-flex items-center gap-1 text-xs font-bold text-teal-300">
                  <span>Explore Solution</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export default ExploreSolutions;
