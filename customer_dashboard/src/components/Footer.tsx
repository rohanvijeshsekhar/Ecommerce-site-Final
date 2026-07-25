import React, { useState } from 'react';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Truck, 
  Award, 
  Headphones, 
  Send,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const GooglePlayBadge: React.FC = () => (
  <a 
    href="#" 
    aria-label="Download FAAZO App on Google Play Store"
    className="group inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 backdrop-blur-md transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm"
  >
    <svg width="22" height="22" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <path d="M325.8 243.7L85.3 12.3C77.4 4.8 66.8 0 54.9 0 24.6 0 0 24.6 0 54.9V457.1C0 487.4 24.6 512 54.9 512c11.9 0 22.5-4.8 30.4-12.3l240.5-231.4c6.7-6.5 6.7-18.1 0-24.6z" fill="#4285F4"/>
      <path d="M492.3 226.7L385.7 124.2 325.8 243.7 385.7 363.2l106.6-102.5c15.2-14.6 15.2-19.4 0-34z" fill="#FBBC04"/>
      <path d="M85.3 499.7l240.5-231.4-60-119.5L85.3 12.3c-9.1-8.7-22.1-12.3-34.3-8.8l200.7 379.8 73.6 116.4z" fill="#EA4335"/>
      <path d="M85.3 12.3L325.8 243.7 385.7 124.2 85.3 12.3z" fill="#34A853"/>
    </svg>
    <div className="text-left leading-none">
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 block mb-0.5">GET IT ON</span>
      <span className="text-xs font-black text-white font-display tracking-tight">Google Play</span>
    </div>
  </a>
);

const AppStoreBadge: React.FC = () => (
  <a 
    href="#" 
    aria-label="Download FAAZO App on Apple App Store"
    className="group inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 backdrop-blur-md transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm"
  >
    <svg width="22" height="22" viewBox="0 0 170 170" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 fill-white">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.9.13-9.76-1.93-14.59-6.17-3.21-2.77-7.05-7.38-11.53-13.84-6.3-9.15-11.13-19.46-14.5-30.93-3.37-11.47-5.06-22.56-5.06-33.27 0-15.63 3.96-28.53 11.89-38.68 7.93-10.15 17.84-15.34 29.74-15.57 4.23 0 9.17 1.15 14.83 3.45 5.66 2.3 9.47 3.45 11.43 3.45 1.54 0 5.48-1.22 11.83-3.66 6.34-2.44 11.41-3.52 15.22-3.24 11.25.9 20.67 5.06 28.25 12.49-10.13 6.1-15.08 14.8-14.85 26.09.23 8.7 3.58 15.93 10.05 21.68 6.47 5.75 14.15 9.02 23.04 9.8-2.6 7.64-6.07 15.42-10.42 23.34zM119.22 31.25c0-6.93 2.51-13.62 7.53-20.07 5.02-6.45 11.38-10.45 19.08-11.98.24 1.05.36 2.05.36 3.01 0 6.83-2.64 13.58-7.92 20.25-5.28 6.67-11.75 10.74-19.41 12.21-.08-.94-.12-1.92-.12-2.92z"/>
    </svg>
    <div className="text-left leading-none">
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 block mb-0.5">Download on the</span>
      <span className="text-xs font-black text-white font-display tracking-tight">App Store</span>
    </div>
  </a>
);

interface FooterProps {
  onLogoClick?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onLogoClick }) => {
  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setSubscribed(true);
      setEmailInput('');
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="w-full text-slate-200 select-none text-left font-sans">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIM TRUST STRIP ABOVE FOOTER */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="w-full bg-gradient-to-r from-[#003B3E] via-[#004D52] to-[#003B3E] border-t border-b border-[#006066]/40 py-5 px-6 shadow-inner">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-6 text-center md:text-left">
          
          {/* Trust Pillar 1 */}
          <div className="flex items-center gap-3.5 justify-center md:justify-start md:border-r border-[#006A70]/50 pr-4">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#45AFED] shrink-0 border border-white/10 shadow-xs">
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white tracking-tight">Genuine Products</h4>
              <p className="text-[11px] text-slate-300 font-medium">100% Certified Import</p>
            </div>
          </div>

          {/* Trust Pillar 2 */}
          <div className="flex items-center gap-3.5 justify-center md:justify-start md:border-r border-[#006A70]/50 pr-4">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#45AFED] shrink-0 border border-white/10 shadow-xs">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white tracking-tight">Secure Payments</h4>
              <p className="text-[11px] text-slate-300 font-medium">256-Bit SSL Encrypted</p>
            </div>
          </div>

          {/* Trust Pillar 3 */}
          <div className="flex items-center gap-3.5 justify-center md:justify-start md:border-r border-[#006A70]/50 pr-4">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#45AFED] shrink-0 border border-white/10 shadow-xs">
              <Truck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white tracking-tight">Fast Delivery</h4>
              <p className="text-[11px] text-slate-300 font-medium">Insured Priority Ship</p>
            </div>
          </div>

          {/* Trust Pillar 4 */}
          <div className="flex items-center gap-3.5 justify-center md:justify-start md:border-r border-[#006A70]/50 pr-4">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#45AFED] shrink-0 border border-white/10 shadow-xs">
              <Award className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white tracking-tight">Manufacturer Warranty</h4>
              <p className="text-[11px] text-slate-300 font-medium">Official Brand Backed</p>
            </div>
          </div>

          {/* Trust Pillar 5 */}
          <div className="flex items-center gap-3.5 justify-center md:justify-start col-span-2 md:col-span-1">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#45AFED] shrink-0 border border-white/10 shadow-xs">
              <Headphones className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white tracking-tight">Dedicated Support</h4>
              <p className="text-[11px] text-slate-300 font-medium">Clinical Expert Team</p>
            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MAIN ENTERPRISE FOOTER BODY */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-[#004D52] via-[#003C40] to-[#002D30] pt-16 pb-12 px-6 md:px-12 relative overflow-hidden">
        
        {/* Soft Ambient Radial Lighting */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#45AFED]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[35rem] h-[35rem] bg-teal-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          
          {/* ── Top Newsletter Subscription Section ──────────────────────── */}
          <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl p-8 md:p-10 mb-16 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-xl text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#45AFED]/15 text-[#45AFED] text-[11px] font-extrabold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Clinical Newsletter</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight font-display">
                Stay Updated
              </h3>
              <p className="text-xs md:text-sm text-slate-300 font-medium mt-1">
                Receive updates about new products, offers and industry innovations.
              </p>
            </div>

            <form onSubmit={handleSubscribe} className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
              <input
                type="email"
                required
                placeholder="Enter your clinical email address..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full sm:w-80 px-5 py-3.5 rounded-full bg-[#002D30]/80 border border-white/20 text-white placeholder-slate-400 text-xs font-semibold focus:outline-none focus:border-[#45AFED] focus:ring-1 focus:ring-[#45AFED] shadow-inner transition-all"
              />
              <button
                type="submit"
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#45AFED] hover:bg-[#389BD6] text-slate-950 font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 inline-flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <span>{subscribed ? 'Subscribed ✓' : 'Subscribe'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* ── Main 4-Column Layout ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
            
            {/* COLUMN 1: Brand & Company (4 Cols) */}
            <div className="md:col-span-4 flex flex-col items-start space-y-5">
              <a 
                href="#" 
                className="h-10 block cursor-pointer transition-transform active:scale-95" 
                onClick={(e) => { if (onLogoClick) { e.preventDefault(); onLogoClick(); } }}
              >
                <img 
                  src="/images/Artboard 1@4x (1).png" 
                  alt="FAAZO Logo" 
                  className="h-full w-auto object-contain brightness-0 invert"
                />
              </a>

              <p className="text-xs text-slate-300 leading-relaxed font-medium max-w-sm">
                India's premier B2B clinical technology & equipment marketplace empowering dental professionals with certified innovations, direct imports, and full-spectrum after-sales support.
              </p>

              {/* Redesigned Glass Outlined Social Media Buttons */}
              <div className="pt-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-3">
                  Connect With Us
                </span>
                <div className="flex items-center gap-3">
                  {/* Facebook */}
                  <a href="#" aria-label="Facebook" className="w-9 h-9 rounded-full bg-white/5 hover:bg-[#45AFED] border border-white/15 hover:border-[#45AFED] text-white hover:text-slate-950 flex items-center justify-center transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(69,175,237,0.3)] cursor-pointer">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                  {/* Instagram */}
                  <a href="#" aria-label="Instagram" className="w-9 h-9 rounded-full bg-white/5 hover:bg-[#45AFED] border border-white/15 hover:border-[#45AFED] text-white hover:text-slate-950 flex items-center justify-center transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(69,175,237,0.3)] cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  </a>
                  {/* LinkedIn */}
                  <a href="#" aria-label="LinkedIn" className="w-9 h-9 rounded-full bg-white/5 hover:bg-[#45AFED] border border-white/15 hover:border-[#45AFED] text-white hover:text-slate-950 flex items-center justify-center transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(69,175,237,0.3)] cursor-pointer">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                  </a>
                  {/* YouTube */}
                  <a href="#" aria-label="YouTube" className="w-9 h-9 rounded-full bg-white/5 hover:bg-[#45AFED] border border-white/15 hover:border-[#45AFED] text-white hover:text-slate-950 flex items-center justify-center transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(69,175,237,0.3)] cursor-pointer">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.52 3.5 12 3.5 12 3.5s-7.52 0-9.388.555a3.002 3.002 0 0 0-2.11 2.108C0 8.03 0 12 0 12s0 3.97.502 5.837a3.003 3.003 0 0 0 2.11 2.108C4.48 20.5 12 20.5 12 20.5s7.52 0 9.388-.555a3.003 3.003 0 0 0 2.11-2.108C24 15.97 24 12 24 12s0-3.97-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  </a>
                </div>
              </div>

              {/* Medical Certifications Badges */}
              <div className="pt-2 flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300">
                  ✓ ISO 13485 Certified
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300">
                  ✓ CDSCO Registered
                </span>
              </div>
            </div>

            {/* COLUMN 2: Quick Links (2 Cols) */}
            <div className="md:col-span-2">
              <h4 className="text-xs font-black text-white tracking-widest uppercase mb-5 font-display border-b border-white/10 pb-2">
                Quick Links
              </h4>
              <ul className="space-y-3 text-xs">
                <li><a href="#" className="text-[#DCE8E8] hover:text-[#45AFED] transition-all duration-200 inline-block hover:translate-x-1">Shop All Products</a></li>
                <li><a href="#" className="text-[#DCE8E8] hover:text-[#45AFED] transition-all duration-200 inline-block hover:translate-x-1">Categories</a></li>
                <li><a href="#" className="text-[#DCE8E8] hover:text-[#45AFED] transition-all duration-200 inline-block hover:translate-x-1">Brands</a></li>
                <li><a href="#" className="text-[#DCE8E8] hover:text-[#45AFED] transition-all duration-200 inline-block hover:translate-x-1">Combo Deals</a></li>
                <li><a href="#solutions" className="text-[#DCE8E8] hover:text-[#45AFED] transition-all duration-200 inline-block hover:translate-x-1">Explore by Solutions</a></li>
                <li><a href="#" className="text-[#DCE8E8] hover:text-[#45AFED] transition-all duration-200 inline-block hover:translate-x-1">Offers & Flash Sales</a></li>
              </ul>
            </div>

            {/* COLUMN 3: Customer Support (2 Cols) */}
            <div className="md:col-span-2">
              <h4 className="text-xs font-black text-white tracking-widest uppercase mb-5 font-display border-b border-white/10 pb-2">
                Customer Support
              </h4>
              <ul className="space-y-3 text-xs">
                <li><a href="#" className="text-[#DCE8E8] hover:text-[#45AFED] transition-all duration-200 inline-block hover:translate-x-1">Help Center</a></li>
                <li><a href="#" className="text-[#DCE8E8] hover:text-[#45AFED] transition-all duration-200 inline-block hover:translate-x-1">Shipping & Delivery</a></li>
                <li><a href="#" className="text-[#DCE8E8] hover:text-[#45AFED] transition-all duration-200 inline-block hover:translate-x-1">Returns & Refunds</a></li>
                <li><a href="#" className="text-[#DCE8E8] hover:text-[#45AFED] transition-all duration-200 inline-block hover:translate-x-1">Warranty Policy</a></li>
                <li><a href="#" className="text-[#DCE8E8] hover:text-[#45AFED] transition-all duration-200 inline-block hover:translate-x-1">Contact Us</a></li>
                <li><a href="#" className="text-[#DCE8E8] hover:text-[#45AFED] transition-all duration-200 inline-block hover:translate-x-1">FAQs</a></li>
              </ul>
            </div>

            {/* COLUMN 4: Contact Information & App Download (4 Cols) */}
            <div className="md:col-span-4 space-y-6">
              {/* Premium Contact Info Card */}
              <div className="rounded-3xl bg-white/5 border border-white/15 p-6 backdrop-blur-xl space-y-4 shadow-xl">
                <h4 className="text-xs font-black text-white tracking-widest uppercase font-display border-b border-white/10 pb-2">
                  Contact Information
                </h4>

                <ul className="space-y-3.5 text-xs text-slate-300">
                  <li className="flex items-start gap-3 group">
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#45AFED] shrink-0 mt-0.5 group-hover:bg-[#45AFED] group-hover:text-slate-950 transition-colors">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Toll-Free Clinical Support</span>
                      <a href="tel:+919876543210" className="text-white hover:text-[#45AFED] font-extrabold transition-colors">
                        +91 1800-FAAZO-DENTAL (+91 98765 43210)
                      </a>
                    </div>
                  </li>

                  <li className="flex items-start gap-3 group">
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#45AFED] shrink-0 mt-0.5 group-hover:bg-[#45AFED] group-hover:text-slate-950 transition-colors">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Official Inquiries</span>
                      <a href="mailto:support@faazo.in" className="text-white hover:text-[#45AFED] font-extrabold transition-colors">
                        support@faazo.in
                      </a>
                    </div>
                  </li>

                  <li className="flex items-start gap-3 group">
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#45AFED] shrink-0 mt-0.5 group-hover:bg-[#45AFED] group-hover:text-slate-950 transition-colors">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Corporate Headquarters</span>
                      <span className="text-slate-300 font-semibold leading-relaxed block">
                        FAAZO Healthcare Towers, BKC Commercial Complex, Mumbai - 400051
                      </span>
                    </div>
                  </li>

                  <li className="flex items-start gap-3 group">
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#45AFED] shrink-0 mt-0.5 group-hover:bg-[#45AFED] group-hover:text-slate-950 transition-colors">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Business Hours</span>
                      <span className="text-slate-300 font-semibold block">
                        Mon - Sat: 9:00 AM - 7:00 PM IST
                      </span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Mobile App Download Section */}
              <div className="pt-2">
                <h5 className="text-[11px] font-extrabold text-white tracking-widest uppercase mb-2 font-display">
                  FAAZO Mobile App
                </h5>
                <p className="text-[11px] text-slate-300 mb-3">Shop clinical equipment on the go.</p>
                <div className="flex flex-wrap gap-3">
                  <GooglePlayBadge />
                  <AppStoreBadge />
                </div>
              </div>
            </div>

          </div>

          {/* ── Enterprise Bottom Copyright Bar ──────────────────────────────── */}
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p className="font-semibold text-center md:text-left">
              © {new Date().getFullYear()} FAAZO Dental Solutions Pvt. Ltd. All rights reserved.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold">
              <a href="#" className="hover:text-[#45AFED] transition-colors">Privacy Policy</a>
              <span className="text-slate-600">•</span>
              <a href="#" className="hover:text-[#45AFED] transition-colors">Terms & Conditions</a>
              <span className="text-slate-600">•</span>
              <a href="#" className="hover:text-[#45AFED] transition-colors">Cookie Policy</a>
              <span className="text-slate-600">•</span>
              <a href="#" className="hover:text-[#45AFED] transition-colors">Sitemap</a>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-slate-300">
              <span>Made with ❤️ in India</span>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
