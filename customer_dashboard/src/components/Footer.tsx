import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';

const GooglePlayBadge: React.FC = () => (
  <a 
    href="#" 
    aria-label="Get it on Google Play"
    className="inline-block transform hover:scale-[1.03] active:scale-95 transition-transform duration-250 opacity-90 hover:opacity-100"
  >
    <svg width="135" height="40" viewBox="0 0 135 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-10">
      <rect width="135" height="40" rx="6" fill="#111111" stroke="#2A2A2A" strokeWidth="1" />
      <path d="M14 11V29L28 20L14 11Z" fill="#10B981" />
      <path d="M14 11V20L22 15L14 11Z" fill="#3B82F6" />
      <path d="M14 29V20L22 25L14 29Z" fill="#EF4444" />
      <path d="M22 15L28 20L22 25L22 15Z" fill="#FBBF24" />
      <text x="36" y="16" fill="#888888" fontSize="7" fontWeight="bold" fontFamily="sans-serif">GET IT ON</text>
      <text x="36" y="29" fill="#FFFFFF" fontSize="13" fontWeight="700" fontFamily="sans-serif">Google Play</text>
    </svg>
  </a>
);

const AppStoreBadge: React.FC = () => (
  <a 
    href="#" 
    aria-label="Download on App Store"
    className="inline-block transform hover:scale-[1.03] active:scale-95 transition-transform duration-250 opacity-90 hover:opacity-100"
  >
    <svg width="135" height="40" viewBox="0 0 135 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-10">
      <rect width="135" height="40" rx="6" fill="#111111" stroke="#2A2A2A" strokeWidth="1" />
      <path d="M19.4 22.8C19.4 20.3 21.4 19.1 21.5 19C20.3 17.3 18.5 17.1 17.9 17C16.4 16.8 14.8 17.9 14 17.9C13.2 17.9 11.9 17 10.7 17C9.1 17 7.6 17.9 6.8 19.3C5.1 22.3 6.4 26.6 8 28.9C8.8 30 9.7 31.3 10.9 31.2C12 31.1 12.5 30.5 13.8 30.5C15.1 30.5 15.5 31.2 16.7 31.2C17.9 31.2 18.7 30 19.5 28.9C20.4 27.6 20.8 26.3 20.8 26.2C20.8 26.2 19.4 25.6 19.4 22.8Z" fill="#FFFFFF" />
      <path d="M17.1 14.7C17.8 13.9 18.2 12.8 18.1 11.7C17.1 11.7 16 12.3 15.3 13.1C14.7 13.8 14.2 14.9 14.4 16C15.5 16.1 16.5 15.5 17.1 14.7Z" fill="#FFFFFF" />
      <text x="36" y="16" fill="#888888" fontSize="7" fontWeight="bold" fontFamily="sans-serif">Download on the</text>
      <text x="36" y="29" fill="#FFFFFF" fontSize="13" fontWeight="700" fontFamily="sans-serif">App Store</text>
    </svg>
  </a>
);

interface FooterProps {
  onLogoClick?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onLogoClick }) => {
  return (
    <>
      {/* Desktop view */}
      <footer className="hidden md:block w-full bg-[#0B0B0B] text-slate-300 pt-20 pb-10 px-10 border-t border-white/[0.08] select-none text-left font-sans">
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-12 mb-16">

          {/* Column 1: FAAZO branding */}
          <div className="col-span-3 flex flex-col items-start pr-4">
            <div className="flex items-center mb-6">
              <a 
                href="#" 
                className="h-9 block cursor-pointer transition-opacity duration-250 hover:opacity-80 active:scale-95" 
                onClick={(e) => { if (onLogoClick) { e.preventDefault(); onLogoClick(); } }}
              >
                <img 
                  src="/images/Artboard 1@4x (1).png" 
                  alt="FAAZO Logo" 
                  className="h-full w-auto object-contain brightness-0 invert"
                />
              </a>
            </div>

            <p className="text-xs text-[#888888] mb-8 leading-relaxed font-normal max-w-xs">
              Empowering dental professionals with innovative solutions, premium quality products, and trusted support.
            </p>

            {/* Outlined Minimal Social Icons */}
            <div className="flex items-center gap-3">
              <a 
                href="#" 
                aria-label="Facebook"
                className="w-9 h-9 rounded-full border border-[#2A2A2A] bg-transparent hover:bg-white text-[#B8B8B8] hover:text-black flex items-center justify-center transition-all duration-250 transform hover:scale-105 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                </svg>
              </a>
              <a 
                href="#" 
                aria-label="Instagram"
                className="w-9 h-9 rounded-full border border-[#2A2A2A] bg-transparent hover:bg-white text-[#B8B8B8] hover:text-black flex items-center justify-center transition-all duration-250 transform hover:scale-105 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a 
                href="#" 
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-full border border-[#2A2A2A] bg-transparent hover:bg-white text-[#B8B8B8] hover:text-black flex items-center justify-center transition-all duration-250 transform hover:scale-105 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
              <a 
                href="#" 
                aria-label="YouTube"
                className="w-9 h-9 rounded-full border border-[#2A2A2A] bg-transparent hover:bg-white text-[#B8B8B8] hover:text-black flex items-center justify-center transition-all duration-250 transform hover:scale-105 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.52 3.5 12 3.5 12 3.5s-7.52 0-9.388.555a3.002 3.002 0 0 0-2.11 2.108C0 8.03 0 12 0 12s0 3.97.502 5.837a3.003 3.003 0 0 0 2.11 2.108C4.48 20.5 12 20.5 12 20.5s7.52 0 9.388-.555a3.003 3.003 0 0 0 2.11-2.108C24 15.97 24 12 24 12s0-3.97-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Shop links */}
          <div className="col-span-2">
            <h4 className="text-xs font-bold text-white tracking-widest uppercase mb-5 font-sans">
              Shop
            </h4>
            <ul className="space-y-3 text-xs">
              <li><a href="#" className="text-[#B8B8B8] hover:text-white transition-colors duration-250 group hover:underline underline-offset-4 decoration-[#0B7C80] decoration-2 block">Handpieces</a></li>
              <li><a href="#" className="text-[#B8B8B8] hover:text-white transition-colors duration-250 group hover:underline underline-offset-4 decoration-[#0B7C80] decoration-2 block">Instruments</a></li>
              <li><a href="#" className="text-[#B8B8B8] hover:text-white transition-colors duration-250 group hover:underline underline-offset-4 decoration-[#0B7C80] decoration-2 block">Dental Equipment</a></li>
              <li><a href="#" className="text-[#B8B8B8] hover:text-white transition-colors duration-250 group hover:underline underline-offset-4 decoration-[#0B7C80] decoration-2 block">Imaging Systems</a></li>
              <li><a href="#" className="text-[#B8B8B8] hover:text-white transition-colors duration-250 group hover:underline underline-offset-4 decoration-[#0B7C80] decoration-2 block">Dental Materials</a></li>
              <li><a href="#" className="text-[#B8B8B8] hover:text-white transition-colors duration-250 group hover:underline underline-offset-4 decoration-[#0B7C80] decoration-2 block">Offers</a></li>
            </ul>
          </div>

          {/* Column 3: Company links */}
          <div className="col-span-2">
            <h4 className="text-xs font-bold text-white tracking-widest uppercase mb-5 font-sans">
              Company
            </h4>
            <ul className="space-y-3 text-xs">
              <li><a href="#" className="text-[#B8B8B8] hover:text-white transition-colors duration-250 group hover:underline underline-offset-4 decoration-[#0B7C80] decoration-2 block">About Us</a></li>
              <li><a href="#" className="text-[#B8B8B8] hover:text-white transition-colors duration-250 group hover:underline underline-offset-4 decoration-[#0B7C80] decoration-2 block">Our Brands</a></li>
              <li><a href="#" className="text-[#B8B8B8] hover:text-white transition-colors duration-250 group hover:underline underline-offset-4 decoration-[#0B7C80] decoration-2 block">Blog</a></li>
              <li><a href="#" className="text-[#B8B8B8] hover:text-white transition-colors duration-250 group hover:underline underline-offset-4 decoration-[#0B7C80] decoration-2 block">Careers</a></li>
              <li><a href="#" className="text-[#B8B8B8] hover:text-white transition-colors duration-250 group hover:underline underline-offset-4 decoration-[#0B7C80] decoration-2 block">Contact Us</a></li>
            </ul>
          </div>

          {/* Column 4: Support links */}
          <div className="col-span-2">
            <h4 className="text-xs font-bold text-white tracking-widest uppercase mb-5 font-sans">
              Support
            </h4>
            <ul className="space-y-3 text-xs">
              <li><a href="#" className="text-[#B8B8B8] hover:text-white transition-colors duration-250 group hover:underline underline-offset-4 decoration-[#0B7C80] decoration-2 block">Help Center</a></li>
              <li><a href="#" className="text-[#B8B8B8] hover:text-white transition-colors duration-250 group hover:underline underline-offset-4 decoration-[#0B7C80] decoration-2 block">Shipping & Delivery</a></li>
              <li><a href="#" className="text-[#B8B8B8] hover:text-white transition-colors duration-250 group hover:underline underline-offset-4 decoration-[#0B7C80] decoration-2 block">Returns & Refunds</a></li>
              <li><a href="#" className="text-[#B8B8B8] hover:text-white transition-colors duration-250 group hover:underline underline-offset-4 decoration-[#0B7C80] decoration-2 block">Warranty</a></li>
              <li><a href="#" className="text-[#B8B8B8] hover:text-white transition-colors duration-250 group hover:underline underline-offset-4 decoration-[#0B7C80] decoration-2 block">Terms & Conditions</a></li>
              <li><a href="#" className="text-[#B8B8B8] hover:text-white transition-colors duration-250 group hover:underline underline-offset-4 decoration-[#0B7C80] decoration-2 block">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Column 5: Contact & App Download */}
          <div className="col-span-3">
            <h4 className="text-xs font-bold text-white tracking-widest uppercase mb-5 font-sans">
              Contact Us
            </h4>

            <ul className="space-y-4 text-xs text-[#B8B8B8] mb-8">
              <li className="flex items-start gap-3 group">
                <Phone className="w-4 h-4 text-slate-400 group-hover:text-[#0B7C80] transition-colors duration-250 shrink-0 mt-0.5" />
                <a href="tel:+919876543210" className="hover:text-white transition-colors duration-250">
                  +91 98765 43210
                </a>
              </li>
              <li className="flex items-start gap-3 group">
                <Mail className="w-4 h-4 text-slate-400 group-hover:text-[#0B7C80] transition-colors duration-250 shrink-0 mt-0.5" />
                <a href="mailto:support@faazo.com" className="hover:text-white transition-colors duration-250">
                  support@faazo.com
                </a>
              </li>
              <li className="flex items-start gap-3 group">
                <MapPin className="w-4 h-4 text-slate-400 group-hover:text-[#0B7C80] transition-colors duration-250 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  FAAZO Dental Solutions Pvt. Ltd.<br />
                  Bangalore, Karnataka 560001, India
                </span>
              </li>
            </ul>

            <h5 className="text-[11px] font-bold text-white tracking-wider uppercase mb-2 font-sans">
              Download Our App
            </h5>
            <p className="text-[11px] text-[#888888] mb-4">Shop anytime, anywhere.</p>
            <div className="flex flex-wrap gap-3">
              <GooglePlayBadge />
              <AppStoreBadge />
            </div>
          </div>

        </div>

        {/* Minimal Copyright Strip */}
        <div className="bg-[#050505] -mx-10 -mb-10 px-10 py-6 border-t border-white/[0.08] text-center">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#888888]">
            <p className="font-normal">
              © {new Date().getFullYear()} FAAZO Dental Solutions. All Rights Reserved.
            </p>
            <div className="flex items-center gap-6 text-xs text-[#888888]">
              <a href="#" className="hover:text-white transition-colors duration-250">Privacy Policy</a>
              <span>•</span>
              <a href="#" className="hover:text-white transition-colors duration-250">Terms of Service</a>
              <span>•</span>
              <a href="#" className="hover:text-[#0B7C80] transition-colors duration-250">Security</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile view */}
      <footer className="block md:hidden w-full bg-[#0B0B0B] text-slate-300 py-12 px-6 border-t border-white/[0.08] select-none text-left font-sans" id="footer-mobile">
        <div className="flex flex-col gap-10">
          {/* FAAZO branding */}
          <div className="flex flex-col items-start">
            <a 
              href="#" 
              className="h-8 block cursor-pointer transition-opacity mb-4" 
              onClick={(e) => { if (onLogoClick) { e.preventDefault(); onLogoClick(); } }}
            >
              <img 
                src="/images/Artboard 1@4x (1).png" 
                alt="FAAZO Logo" 
                className="h-full w-auto object-contain brightness-0 invert"
              />
            </a>
            <p className="text-xs text-[#888888] leading-relaxed">
              Empowering dental professionals with innovative solutions, premium quality products, and trusted support.
            </p>
            
            {/* Outlined Social Buttons */}
            <div className="flex items-center gap-3 mt-5">
              <a href="#" aria-label="Facebook" className="w-8 h-8 rounded-full border border-[#2A2A2A] bg-transparent hover:bg-white text-[#B8B8B8] hover:text-black flex items-center justify-center transition-all duration-250">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/></svg>
              </a>
              <a href="#" aria-label="Instagram" className="w-8 h-8 rounded-full border border-[#2A2A2A] bg-transparent hover:bg-white text-[#B8B8B8] hover:text-black flex items-center justify-center transition-all duration-250">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="#" aria-label="LinkedIn" className="w-8 h-8 rounded-full border border-[#2A2A2A] bg-transparent hover:bg-white text-[#B8B8B8] hover:text-black flex items-center justify-center transition-all duration-250">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
              <a href="#" aria-label="YouTube" className="w-8 h-8 rounded-full border border-[#2A2A2A] bg-transparent hover:bg-white text-[#B8B8B8] hover:text-black flex items-center justify-center transition-all duration-250">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.52 3.5 12 3.5 12 3.5s-7.52 0-9.388.555a3.002 3.002 0 0 0-2.11 2.108C0 8.03 0 12 0 12s0 3.97.502 5.837a3.003 3.003 0 0 0 2.11 2.108C4.48 20.5 12 20.5 12 20.5s7.52 0 9.388-.555a3.003 3.003 0 0 0 2.11-2.108C24 15.97 24 12 24 12s0-3.97-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="text-xs font-bold text-white tracking-widest uppercase mb-4">Shop</h4>
              <ul className="space-y-2.5 text-xs">
                <li><a href="#" className="text-[#B8B8B8] hover:text-white">Handpieces</a></li>
                <li><a href="#" className="text-[#B8B8B8] hover:text-white">Instruments</a></li>
                <li><a href="#" className="text-[#B8B8B8] hover:text-white">Equipment</a></li>
                <li><a href="#" className="text-[#B8B8B8] hover:text-white">Imaging</a></li>
                <li><a href="#" className="text-[#B8B8B8] hover:text-white">Materials</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white tracking-widest uppercase mb-4">Company</h4>
              <ul className="space-y-2.5 text-xs">
                <li><a href="#" className="text-[#B8B8B8] hover:text-white">About Us</a></li>
                <li><a href="#" className="text-[#B8B8B8] hover:text-white">Brands</a></li>
                <li><a href="#" className="text-[#B8B8B8] hover:text-white">Careers</a></li>
                <li><a href="#" className="text-[#B8B8B8] hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white tracking-widest uppercase mb-4">Support</h4>
            <ul className="space-y-2.5 text-xs grid grid-cols-2 gap-x-4 gap-y-2.5">
              <li><a href="#" className="text-[#B8B8B8] hover:text-white">Help Center</a></li>
              <li><a href="#" className="text-[#B8B8B8] hover:text-white">Delivery</a></li>
              <li><a href="#" className="text-[#B8B8B8] hover:text-white">Returns</a></li>
              <li><a href="#" className="text-[#B8B8B8] hover:text-white">Warranty</a></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="border-t border-white/[0.08] pt-8">
            <h4 className="text-xs font-bold text-white tracking-widest uppercase mb-4">Contact Us</h4>
            <ul className="space-y-3 text-xs text-[#B8B8B8] mb-6">
              <li className="flex items-center gap-3 group">
                <Phone className="w-4 h-4 text-slate-400 group-hover:text-[#0B7C80] shrink-0" />
                <a href="tel:+919876543210" className="hover:text-white">+91 98765 43210</a>
              </li>
              <li className="flex items-center gap-3 group">
                <Mail className="w-4 h-4 text-slate-400 group-hover:text-[#0B7C80] shrink-0" />
                <a href="mailto:support@faazo.com" className="hover:text-white">support@faazo.com</a>
              </li>
              <li className="flex items-start gap-3 group">
                <MapPin className="w-4 h-4 text-slate-400 group-hover:text-[#0B7C80] shrink-0 mt-0.5" />
                <span>
                  FAAZO Dental Solutions Pvt. Ltd.<br />
                  Bangalore, Karnataka 560001, India
                </span>
              </li>
            </ul>
          </div>

          {/* App Badges */}
          <div className="border-t border-white/[0.08] pt-8">
            <h5 className="text-[11px] font-bold text-white tracking-wider uppercase mb-2">Download Our App</h5>
            <p className="text-[11px] text-[#888888] mb-4">Shop clinical products on the go.</p>
            <div className="flex flex-wrap gap-3">
              <GooglePlayBadge />
              <AppStoreBadge />
            </div>
          </div>

          {/* Copyright Strip */}
          <div className="border-t border-white/[0.08] pt-8 text-center bg-[#050505] -mx-6 -mb-12 px-6 pb-8">
            <p className="text-[11px] text-[#888888]">
              © {new Date().getFullYear()} FAAZO Dental Solutions. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
