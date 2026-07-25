import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';

const GooglePlayBadge: React.FC = () => (
  <a href="#" className="inline-block transform active:scale-95 transition-all">
    <svg width="135" height="40" viewBox="0 0 135 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-10">
      <rect width="135" height="40" rx="6" fill="black" stroke="#A6A6A6" strokeWidth="0.5" />
      {/* Play Icon */}
      <path d="M14 11V29L28 20L14 11Z" fill="#10B981" />
      <path d="M14 11V20L22 15L14 11Z" fill="#3B82F6" />
      <path d="M14 29V20L22 25L14 29Z" fill="#EF4444" />
      <path d="M22 15L28 20L22 25L22 15Z" fill="#FBBF24" />

      {/* Text */}
      <text x="36" y="16" fill="white" fontSize="7" fontWeight="bold" fontFamily="sans-serif">GET IT ON</text>
      <text x="36" y="29" fill="white" fontSize="13" fontWeight="900" fontFamily="sans-serif">Google Play</text>
    </svg>
  </a>
);

const AppStoreBadge: React.FC = () => (
  <a href="#" className="inline-block transform active:scale-95 transition-all">
    <svg width="135" height="40" viewBox="0 0 135 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-10">
      <rect width="135" height="40" rx="6" fill="black" stroke="#A6A6A6" strokeWidth="0.5" />
      {/* Apple Logo */}
      <path d="M19.4 22.8C19.4 20.3 21.4 19.1 21.5 19C20.3 17.3 18.5 17.1 17.9 17C16.4 16.8 14.8 17.9 14 17.9C13.2 17.9 11.9 17 10.7 17C9.1 17 7.6 17.9 6.8 19.3C5.1 22.3 6.4 26.6 8 28.9C8.8 30 9.7 31.3 10.9 31.2C12 31.1 12.5 30.5 13.8 30.5C15.1 30.5 15.5 31.2 16.7 31.2C17.9 31.2 18.7 30 19.5 28.9C20.4 27.6 20.8 26.3 20.8 26.2C20.8 26.2 19.4 25.6 19.4 22.8Z" fill="white" />
      <path d="M17.1 14.7C17.8 13.9 18.2 12.8 18.1 11.7C17.1 11.7 16 12.3 15.3 13.1C14.7 13.8 14.2 14.9 14.4 16C15.5 16.1 16.5 15.5 17.1 14.7Z" fill="white" />

      {/* Text */}
      <text x="36" y="16" fill="white" fontSize="7" fontWeight="bold" fontFamily="sans-serif">Download on the</text>
      <text x="36" y="29" fill="white" fontSize="13" fontWeight="900" fontFamily="sans-serif">App Store</text>
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
      <footer className="hidden md:block w-full bg-[#005F63] text-slate-200 pt-16 pb-8 px-8 border-t border-[#0B7C80]/30 select-none text-left">
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-12 mb-12">

          {/* Column 1: FAAZO branding */}
          <div className="col-span-3 flex flex-col items-start">
            <div className="flex items-center mb-5">
              <a href="#" className="h-9 block cursor-pointer transition-transform active:scale-95" onClick={(e) => { if (onLogoClick) { e.preventDefault(); onLogoClick(); } }}>
                <img 
                  src="/images/Artboard 1@4x (1).png" 
                  alt="FAAZO Logo" 
                  className="h-full w-auto object-contain brightness-0 invert"
                />
              </a>
            </div>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Empowering dental professionals with innovative solutions, premium quality products, and trusted support.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-3">
              <a href="#" className="w-8 h-8 rounded-full border border-slate-700/80 bg-slate-800/40 hover:bg-slate-700 hover:text-white flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                </svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-full border border-slate-700/80 bg-slate-800/40 hover:bg-slate-700 hover:text-white flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-full border border-slate-700/80 bg-slate-800/40 hover:bg-slate-700 hover:text-white flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-full border border-slate-700/80 bg-slate-800/40 hover:bg-slate-700 hover:text-white flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.52 3.5 12 3.5 12 3.5s-7.52 0-9.388.555a3.002 3.002 0 0 0-2.11 2.108C0 8.03 0 12 0 12s0 3.97.502 5.837a3.003 3.003 0 0 0 2.11 2.108C4.48 20.5 12 20.5 12 20.5s7.52 0 9.388-.555a3.003 3.003 0 0 0 2.11-2.108C24 15.97 24 12 24 12s0-3.97-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Shop links */}
          <div className="col-span-2">
            <h4 className="text-[13px] font-extrabold text-white tracking-widest uppercase mb-4 font-display">
              Shop
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Handpieces</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Instruments</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Dental Equipment</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Imaging Systems</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Dental Materials</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Offers</a></li>
            </ul>
          </div>

          {/* Column 3: Company links */}
          <div className="col-span-2">
            <h4 className="text-[13px] font-extrabold text-white tracking-widest uppercase mb-4 font-display">
              Company
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Our Brands</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Contact Us</a></li>
            </ul>
          </div>

          {/* Column 4: Support links */}
          <div className="col-span-2">
            <h4 className="text-[13px] font-extrabold text-white tracking-widest uppercase mb-4 font-display">
              Support
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Shipping & Delivery</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Returns & Refunds</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Warranty</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Terms & Conditions</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Column 5: Resource links */}
          <div className="col-span-3">
            <h4 className="text-[13px] font-extrabold text-white tracking-widest uppercase mb-4 font-display">
              Contact Us
            </h4>

            <ul className="space-y-3.5 text-xs text-slate-400 mb-6">
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <a href="tel:+919876543210" className="hover:text-emerald-400 transition-colors">
                  +91 98765 43210
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <a href="mailto:support@faazo.com" className="hover:text-emerald-400 transition-colors">
                  support@faazo.com
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  FAAZO Dental Solutions Pvt. Ltd.<br />
                  Bangalore, Karnataka 560001, India
                </span>
              </li>
            </ul>

            <h5 className="text-[11px] font-extrabold text-white tracking-wider uppercase mb-3 font-display">
              Download Our App
            </h5>
            <p className="text-[10px] text-slate-400 mb-3">Shop anytime, anywhere.</p>
            <div className="flex flex-wrap gap-2.5">
              <GooglePlayBadge />
              <AppStoreBadge />
            </div>
          </div>

        </div>

        {/* Copyright Strip */}
        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-700/40 text-center select-none">
          <p className="text-xs text-slate-500 font-medium">
            © 2024 FAAZO Dental Solutions. All Rights Reserved.
          </p>
        </div>
      </footer>

      {/* Mobile view */}
      <footer className="block md:hidden w-full bg-[#005F63] text-slate-200 py-10 px-5 border-t border-[#0B7C80]/30 select-none text-left" id="footer-mobile">
        <div className="flex flex-col gap-8">
          {/* Column 1: FAAZO branding */}
          <div className="flex flex-col items-start">
            <a href="#" className="h-8 block cursor-pointer transition-transform active:scale-95 mb-4" onClick={(e) => { if (onLogoClick) { e.preventDefault(); onLogoClick(); } }}>
              <img 
                src="/images/Artboard 1@4x (1).png" 
                alt="FAAZO Logo" 
                className="h-full w-auto object-contain brightness-0 invert"
              />
            </a>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Empowering dental professionals with innovative solutions, premium quality products, and trusted support.
            </p>
          </div>

          {/* Collapsible/Stacked Links */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-[12px] font-extrabold text-white tracking-widest uppercase mb-3 font-display">
                Shop
              </h4>
              <ul className="space-y-2 text-xs text-slate-400 font-sans">
                <li><a href="#" className="hover:text-emerald-400">Handpieces</a></li>
                <li><a href="#" className="hover:text-emerald-400">Instruments</a></li>
                <li><a href="#" className="hover:text-emerald-400">Equipment</a></li>
                <li><a href="#" className="hover:text-emerald-400">Imaging</a></li>
                <li><a href="#" className="hover:text-emerald-400">Materials</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[12px] font-extrabold text-white tracking-widest uppercase mb-3 font-display">
                Company
              </h4>
              <ul className="space-y-2 text-xs text-slate-400 font-sans">
                <li><a href="#" className="hover:text-emerald-400">About Us</a></li>
                <li><a href="#" className="hover:text-emerald-400">Brands</a></li>
                <li><a href="#" className="hover:text-emerald-400">Careers</a></li>
                <li><a href="#" className="hover:text-emerald-400">Contact</a></li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="text-[12px] font-extrabold text-white tracking-widest uppercase mb-3 font-display">
              Support
            </h4>
            <ul className="space-y-2 text-xs text-slate-400 grid grid-cols-2 gap-x-4 gap-y-2 font-sans">
              <li><a href="#" className="hover:text-emerald-400">Help Center</a></li>
              <li><a href="#" className="hover:text-emerald-400">Delivery</a></li>
              <li><a href="#" className="hover:text-emerald-400">Returns</a></li>
              <li><a href="#" className="hover:text-emerald-400">Warranty</a></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="border-t border-slate-800/80 pt-6">
            <h4 className="text-[12px] font-extrabold text-white tracking-widest uppercase mb-3 font-display">
              Contact Us
            </h4>
            <ul className="space-y-3 text-xs text-slate-400 mb-6 font-sans">
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <a href="tel:+919876543210" className="hover:text-emerald-400 font-semibold">+91 98765 43210</a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <a href="mailto:support@faazo.com" className="hover:text-emerald-400 font-semibold font-sans">support@faazo.com</a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  FAAZO Dental Solutions Pvt. Ltd.<br />
                  Bangalore, Karnataka 560001, India
                </span>
              </li>
            </ul>
          </div>

          {/* Download App Badges */}
          <div className="border-t border-slate-800/80 pt-6">
            <h5 className="text-[11px] font-extrabold text-white tracking-wider uppercase mb-2 font-display">
              Download Our App
            </h5>
            <p className="text-[10px] text-slate-400 mb-4 font-sans">Shop clinical products on the go.</p>
            <div className="flex flex-wrap gap-3">
              <GooglePlayBadge />
              <AppStoreBadge />
            </div>
          </div>

          {/* Copyright Strip */}
          <div className="border-t border-slate-800/80 pt-6 text-center select-none">
            <p className="text-[11px] text-slate-500 font-medium">
              © 2024 FAAZO Dental Solutions. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
