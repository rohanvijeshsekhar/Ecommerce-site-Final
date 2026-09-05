'use client';

import React from 'react';
import { ArrowRight, Users, CheckCircle, Cpu, Clock } from 'lucide-react';

const WhyChoosePanel: React.FC = () => {
  const points = [
    {
      icon: <Users className="w-5 h-5 text-[#006670]" />,
      title: "500+ Clinics Trust Us",
      desc: "Widespread medical network support"
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-[#006670]" />,
      title: "Premium Quality Products",
      desc: "Certified genuine equipment only"
    },
    {
      icon: <Cpu className="w-5 h-5 text-[#006670]" />,
      title: "Advanced Technology Solutions",
      desc: "Modern digital tools for practices"
    },
    {
      icon: <Clock className="w-5 h-5 text-[#006670]" />,
      title: "Reliable After-Sales Support",
      desc: "On-site and remote repair support"
    }
  ];

  return (
    <>
      {/* Desktop view */}
      <section className="hidden lg:block max-w-7xl mx-auto px-8 py-10 select-none">
        <div className="relative rounded-[2.5rem] bg-gradient-to-br from-white/90 via-[#EAF8F8]/85 to-white/70 backdrop-blur-2xl p-0 border border-white/95 shadow-[0_20px_50px_-12px_rgba(0,95,99,0.14),0_6px_16px_0_rgba(0,0,0,0.03),inset_0_2px_4px_rgba(255,255,255,0.95)] ring-1 ring-black/5 overflow-hidden grid grid-cols-12 items-stretch min-h-[360px]">
          
          {/* Top 3D Glass Light Highlight Line */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none z-30" />

          {/* Ambient Glass Glow Orbs */}
          <div className="absolute -top-16 -left-16 w-60 h-60 bg-[#006670]/10 rounded-full blur-3xl pointer-events-none z-0" />
          <div className="absolute -bottom-16 -right-16 w-60 h-60 bg-teal-400/15 rounded-full blur-3xl pointer-events-none z-0" />
          
          {/* Left Column: Headline copy */}
          <div className="col-span-4 p-8 lg:p-9 text-left flex flex-col items-start justify-center relative z-10">
            <span className="text-xs font-extrabold text-[#005F63] tracking-widest uppercase mb-2 block font-display">
              WHY CHOOSE FAAZO?
            </span>
            <h2 className="text-3xl lg:text-[32px] font-black text-slate-800 tracking-tight leading-tight mb-5 font-display">
              Trusted by Dentists. Built for Excellence.
            </h2>
            <a 
              href="#about"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#005F63] hover:bg-[#0B7C80] text-white text-sm font-bold shadow transition-all cursor-pointer"
            >
              Learn More
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>

          {/* Center Column: Interactive Stats points */}
          <div className="col-span-4 p-6 lg:p-8 grid grid-cols-1 gap-4.5 text-left relative z-10 flex flex-col justify-center">
            {points.map((pt, i) => (
              <div key={i} className="flex items-center gap-3.5">
                <div className="w-9.5 h-9.5 rounded-xl bg-white/80 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-xs border border-white/90">
                  {pt.icon}
                </div>
                <div>
                  <h4 className="text-[13.5px] font-bold text-slate-800 leading-none">
                    {pt.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {pt.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Real Dental Operatory Equipment - Seamless Feathered Left Blend */}
          <div className="col-span-4 h-full w-full relative p-0 overflow-hidden self-stretch flex items-center justify-center z-10">
            <img 
              src="/images/why_choose_dental_equipment.jpg" 
              alt="Clinical Dental Operatory Equipment & Chair" 
              style={{
                maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 2%, rgba(0,0,0,0.85) 6%, black 10%, black 100%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 2%, rgba(0,0,0,0.85) 6%, black 10%, black 100%)',
              }}
              className="w-full h-full min-h-[360px] object-cover object-left block"
            />
            {/* Soft gradient blend on the seam */}
            <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#EAF8F8]/90 via-[#EAF8F8]/40 to-transparent pointer-events-none z-20" />
          </div>

        </div>
      </section>

      {/* Mobile view */}
      <section className="block lg:hidden w-full px-5 py-6 select-none" id="why-choose-panel-mobile">
        <div className="relative rounded-3xl bg-gradient-to-br from-white/90 via-[#EAF8F8]/85 to-white/70 backdrop-blur-2xl border border-white/95 shadow-[0_16px_36px_-8px_rgba(0,95,99,0.12),inset_0_2px_4px_rgba(255,255,255,0.9)] ring-1 ring-black/5 overflow-hidden flex flex-col gap-6 text-left">
          
          {/* Top 3D Light Highlight */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none z-30" />
          
          {/* Top: Headline */}
          <div className="p-6 pb-0 relative z-10">
            <span className="text-[10px] font-extrabold text-[#005F63] tracking-widest uppercase mb-1.5 block font-sans">
              WHY CHOOSE FAAZO?
            </span>
            <h2 className="text-[28px] font-black text-slate-800 tracking-tight leading-tight font-display mb-4">
              Trusted by Dentists. Built for Excellence.
            </h2>
            <a 
              href="#about"
              className="group inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-full bg-[#005F63] hover:bg-[#0B7C80] text-white text-xs font-bold shadow transition-all cursor-pointer"
            >
              Learn More
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Center: Stats points */}
          <div className="flex flex-col gap-5 px-6 py-4 border-t border-b border-white/60 relative z-10">
            {points.map((pt, i) => (
              <div key={i} className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-white/80 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-xs border border-white/90">
                  {pt.icon}
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-slate-800 leading-none">
                    {pt.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-sans">
                    {pt.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom: Real Dental Equipment Image - Seamless Top Blend */}
          <div className="w-full relative overflow-hidden p-0 z-10">
            <img 
              src="/images/why_choose_dental_equipment.jpg" 
              alt="Clinical Dental Operatory Equipment & Chair" 
              style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 2%, rgba(0,0,0,0.85) 6%, black 10%, black 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 2%, rgba(0,0,0,0.85) 6%, black 10%, black 100%)',
              }}
              className="w-full h-auto max-h-[260px] object-cover object-left block"
            />
            <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#EAF8F8] via-[#EAF8F8]/40 to-transparent pointer-events-none z-20" />
          </div>

        </div>
      </section>
    </>
  );
};

export default WhyChoosePanel;
