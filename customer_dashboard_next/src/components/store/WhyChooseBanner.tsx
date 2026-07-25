'use client';

import React from 'react';
import { ShieldCheck, Truck, Users, Headphones, ArrowRight } from 'lucide-react';

const WhyChooseBanner: React.FC = () => {
  return (
    <>
      {/* Desktop view */}
      <section className="hidden md:block w-full py-8 px-8 select-none">
        <div className="relative max-w-7xl mx-auto overflow-hidden rounded-[2.5rem] bg-[#EAF8F8] backdrop-blur-2xl p-8 border border-[#E2E8F0] shadow-[0_16px_40px_-12px_rgba(0,95,99,0.08)] ring-1 ring-slate-900/5">
          
          {/* Ambient Glass Glow Orbs */}
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-[#005F63]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-[#45AFED]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-28 bg-[#0B7C80]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Content Track */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-6 w-full px-2">
            <div className="flex flex-wrap items-center gap-x-8 lg:gap-x-12 gap-y-4 text-slate-800 text-sm font-semibold">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#005F63]/10 flex items-center justify-center border border-[#005F63]/20 shadow-xs">
                  <ShieldCheck className="w-4.5 h-4.5 text-[#005F63] stroke-[2.2]" />
                </div>
                <span className="text-slate-800 font-bold tracking-tight">100% Genuine Products</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#005F63]/10 flex items-center justify-center border border-[#005F63]/20 shadow-xs">
                  <Truck className="w-4.5 h-4.5 text-[#005F63] stroke-[2.2]" />
                </div>
                <span className="text-slate-800 font-bold tracking-tight">Pan India Delivery</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#005F63]/10 flex items-center justify-center border border-[#005F63]/20 shadow-xs">
                  <Users className="w-4.5 h-4.5 text-[#005F63] stroke-[2.2]" />
                </div>
                <span className="text-slate-800 font-bold tracking-tight">Trusted by 500+ Clinics</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#005F63]/10 flex items-center justify-center border border-[#005F63]/20 shadow-xs">
                  <Headphones className="w-4.5 h-4.5 text-[#005F63] stroke-[2.2]" />
                </div>
                <span className="text-slate-800 font-bold tracking-tight">Expert Customer Support</span>
              </div>
            </div>

            {/* Glass CTA Button */}
            <a 
              href="#about"
              className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#005F63] hover:bg-[#0B7C80] text-white text-sm font-bold shadow-[0_4px_20px_0_rgba(0,95,99,0.22)] hover:shadow-[0_6px_24px_0_rgba(0,95,99,0.32)] transition-all duration-300 select-none cursor-pointer"
            >
              <span>Explore Now</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </section>

      {/* Mobile view */}
      <section className="block md:hidden w-full py-5 px-4 select-none" id="why-choose-banner-mobile">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-emerald-50/90 via-white/85 to-teal-50/90 backdrop-blur-xl p-6 border border-white/90 shadow-[0_12px_32px_-8px_rgba(0,102,112,0.08)] ring-1 ring-slate-900/5">
          
          {/* Mobile Ambient Orbs */}
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-[#006670]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-start gap-4 text-slate-800 text-xs font-semibold w-full">
            <div className="flex items-center gap-3 w-full">
              <div className="w-8 h-8 rounded-lg bg-[#006670]/10 flex items-center justify-center border border-[#006670]/20">
                <ShieldCheck className="w-4 h-4 text-[#006670] stroke-[2.2]" />
              </div>
              <span className="text-slate-800 font-bold">100% Genuine Products</span>
            </div>

            <div className="flex items-center gap-3 w-full">
              <div className="w-8 h-8 rounded-lg bg-[#006670]/10 flex items-center justify-center border border-[#006670]/20">
                <Truck className="w-4 h-4 text-[#006670] stroke-[2.2]" />
              </div>
              <span className="text-slate-800 font-bold">Pan India Delivery</span>
            </div>

            <div className="flex items-center gap-3 w-full">
              <div className="w-8 h-8 rounded-lg bg-[#006670]/10 flex items-center justify-center border border-[#006670]/20">
                <Users className="w-4 h-4 text-[#006670] stroke-[2.2]" />
              </div>
              <span className="text-slate-800 font-bold">Trusted by 500+ Clinics</span>
            </div>

            <div className="flex items-center gap-3 w-full">
              <div className="w-8 h-8 rounded-lg bg-[#006670]/10 flex items-center justify-center border border-[#006670]/20">
                <Headphones className="w-4 h-4 text-[#006670] stroke-[2.2]" />
              </div>
              <span className="text-slate-800 font-bold">Expert Customer Support</span>
            </div>
            
            <a 
              href="#about"
              className="group inline-flex items-center justify-center gap-2 w-full mt-2 px-5 py-3 rounded-full bg-[#006670] text-white text-xs font-bold shadow-[0_4px_16px_0_rgba(0,102,112,0.2)] transition-all select-none cursor-pointer"
            >
              <span>Explore Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>
    </>
  );
};

export default WhyChooseBanner;
