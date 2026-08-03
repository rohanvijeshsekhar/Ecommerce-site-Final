'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CategoryMegaMenu from './CategoryMegaMenu';
import { useCategories } from '../../hooks/useCategories';
import {
  Search,
  User,
  ShoppingCart,
  Heart,
  Bell,
  ChevronDown,
  X,
  Menu,
  ArrowRight,
  Shield,
  FileText,
  Phone,
  Briefcase,
  Compass,
  LogOut,
  CheckCircle2,
  Package,
  Handshake
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import NotificationBell from './NotificationBell';

// FAAZO logo component
export const FaazoLogo: React.FC<{ 
  className?: string; 
  style?: React.CSSProperties;
  onlyIcon?: boolean;
}> = ({ className = "", style, onlyIcon = false }) => {
  if (onlyIcon) {
    return (
      <div
        className={`w-[32px] h-[30px] flex-shrink-0 flex items-center justify-start overflow-hidden relative ${className}`}
        style={style}
      >
        <img
          src="/images/Artboard 1@4x (1).png"
          alt="FAAZO Logo"
          className="h-[92%] max-w-none object-contain absolute left-0"
          style={{ width: 'auto' }}
        />
      </div>
    );
  }

  return (
    <div
      className={`w-[110px] h-[30px] lg:w-[136px] lg:h-[38px] flex-shrink-0 flex items-center justify-start ${className}`}
      style={style}
    >
      <img
        src="/images/Artboard 1@4x (1).png"
        alt="FAAZO Logo"
        className="h-[92%] w-auto object-contain flex-shrink-0"
      />
    </div>
  );
};

// Dropdown Content definitions
interface DropdownItem {
  name: string;
  desc: string;
  href: string;
}





const supportDropdown: DropdownItem[] = [
  { name: 'Help Center', desc: 'Device manuals, setup videos, and troubleshooting.', href: '#support' },
  { name: 'Warranty', desc: 'Register hardware and inspect active coverages.', href: '#support' },
  { name: 'Service & Repairs', desc: 'Book direct on-site servicing and component repairs.', href: '#support' },
  { name: 'Contact Support', desc: 'Emergency 24/7 technical hotline for clinics.', href: '#support' }
];

const aboutDropdown: DropdownItem[] = [
  { name: 'Our Story', desc: 'How we engineer clinical excellence.', href: '#about' },
  { name: 'Why FAAZO', desc: 'Uncompromising certifications and partner network.', href: '#about' },
  { name: 'Careers', desc: 'Shape the next generation of med-tech systems.', href: '#careers' },
  { name: 'Contact', desc: 'Global offices, agents, and distributor locations.', href: '#contact' }
];

export interface MockCartItem {
  id: string;
  name: string;
  category: string;
  price: number;
  qty: number;
  image: string;
}

interface NavbarProps {
  cartItems: MockCartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<MockCartItem[]>>;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  setActiveProductId: (id: string | null) => void;
  setCurrentView: (view: any) => void;
  setSelectedCategory: (category: string | null) => void;
  wishlistItems: MockCartItem[];
  onOpenLoginModal: () => void;
  setActiveComboId?: (id: string | null) => void;
  setDashboardSection?: (section: 'dashboard' | 'profile' | 'clinic' | 'addresses' | 'orders' | 'wishlist' | 'warranty' | 'support' | 'security') => void;
}

const Navbar: React.FC<NavbarProps> = ({
  cartItems,
  setCartItems,
  isCartOpen,
  setIsCartOpen,
  setActiveProductId,
  setCurrentView,
  setSelectedCategory,
  wishlistItems,
  onOpenLoginModal,
  setDashboardSection,
  setActiveComboId
}) => {
  const router = useRouter();
  const { user, isAuthenticated, logout, setPendingAction } = useAuth();
  const categoriesList = useCategories();

  // Derive avatar initials and display name
  const avatarInitials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';
  const displayFirstName = user?.full_name?.split(' ')[0] ?? 'Account';
  const [scrolled, setScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Notifications & Search states
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mega dropdown Category states

  interface NotificationItem {
    id: string;
    title: string;
    body: string;
    time: string;
    route: 'home' | 'portfolio' | 'listing' | 'detail' | 'cart' | 'wishlist' | 'checkout' | 'order-success' | 'my-orders';
    read: boolean;
  }

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: 'Order Status Update',
      body: 'Your order FZ-2026-8945 has been processed and is ready for dispatch.',
      time: 'Just now',
      route: 'my-orders',
      read: false
    },
    {
      id: 'notif-2',
      title: 'Warranty Registered',
      body: 'NSK Pana-Max Handpiece serial code registered successfully.',
      time: '2 hours ago',
      route: 'my-orders',
      read: false
    },
    {
      id: 'notif-3',
      title: 'Price Drop Alert',
      body: 'Werther Silent Compressor price dropped. View spec updates.',
      time: '1 day ago',
      route: 'home',
      read: true
    }
  ]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const [dynamicSearchResults, setDynamicSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setDynamicSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(() => {
      const fetchProducts = api.get(`products/?search=${encodeURIComponent(searchQuery)}&page_size=5`);
      const fetchCombos = api.get(`combos/?search=${encodeURIComponent(searchQuery)}&page_size=5`);
      
      Promise.all([fetchProducts, fetchCombos])
        .then(([prodRes, comboRes]) => {
          const prodData = prodRes.data?.data ?? prodRes.data?.results ?? prodRes.data ?? [];
          const comboData = comboRes.data?.data ?? comboRes.data?.results ?? comboRes.data ?? [];
          
          const productsMapped = prodData.map((p: any) => ({
            id: p.slug,
            title: p.name,
            category: p.category_name || 'Product',
            type: 'product'
          }));
          
          const combosMapped = comboData.map((c: any) => ({
            id: c.slug,
            title: c.title,
            category: 'Combo Deal',
            type: 'combo'
          }));
          
          setDynamicSearchResults([...productsMapped, ...combosMapped]);
        })
        .catch(() => {});
    }, 300);
    
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const filteredSearch = dynamicSearchResults;

  const handleSearchProductClick = (id: string, _category: string, type?: string) => {
    closeAllMenus();
    setSearchQuery('');
    if (type === 'combo') {
      if (setActiveComboId) {
        setActiveComboId(id);
      }
      setCurrentView('combo-detail');
    } else {
      setActiveProductId(id);
      setCurrentView('detail');
    }
    window.scrollTo(0, 0);
  };

  // Mobile accordions state
  const [mobileAccordions, setMobileAccordions] = useState<Record<string, boolean>>({});

  // Debounce ref for menu close delays
  const closeTimeoutRef = useRef<number | null>(null);

  const cartTotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);

  // Handles scroll listener for the shrink effect, click outside, and Escape key
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('.search-container-desktop') &&
        !target.closest('.search-container-mobile') &&
        !target.closest('.search-overlay-container') &&
        !target.closest('button[aria-label="Toggle Search"]')
      ) {
        setIsSearchOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const closeAllMenus = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActiveMenu(null);
    setIsSearchOpen(false);
    setIsCartOpen(false);
    setIsAccountOpen(false);
    setIsNotificationsOpen(false);
  };

  const handleMegaMenuCategoryClick = (name: string, e: React.MouseEvent) => {
    e.preventDefault();
    closeAllMenus();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    router.push(`/categories/${slug}`);
    if (setSelectedCategory) setSelectedCategory(name);
    if (setCurrentView) setCurrentView('listing');
    window.scrollTo(0, 0);
  };

  const handleMouseEnter = (menuId: string) => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActiveMenu(menuId);
    setIsAccountOpen(false);
  };

  const handleMouseLeave = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = window.setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  const handleDropdownMouseEnter = (menuId: string) => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActiveMenu(menuId);
  };

  const toggleMobileAccordion = (key: string) => {
    setMobileAccordions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <>
      {/* Background Overlay for categories mega menu, cart drawer, or mobile menu */}
      {(activeMenu === 'categories' || isCartOpen || isMobileMenuOpen) && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity duration-300"
          onClick={closeAllMenus}
        />
      )}

      {/* Main Premium Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full flex flex-col transition-all duration-300 ease-in-out select-none
          h-[100px] ${scrolled ? 'lg:h-[124px] bg-white/95 backdrop-blur-2xl border-b border-slate-200/80 shadow-[0_2px_20px_rgba(0,0,0,0.03)]' : 'lg:h-[160px] bg-white border-b border-slate-200/40'}`}
      >
        {/* Top Bar (Dark Teal Green) */}
        <div
          className={`w-full bg-[#004d54] text-[#f8f9fa] text-[11px] font-sans hidden lg:flex items-center justify-between px-6 md:px-12 transition-all duration-300 overflow-hidden top-bar-container ${
            scrolled ? 'h-0 opacity-0' : 'h-9 py-2 border-b border-[#002b2e]'
          }`}
        >
          {/* Left Side Links */}
          <div className="flex items-center gap-4.5">
            <a href="#about" onClick={(e) => { e.preventDefault(); setCurrentView('home'); }} className="hover:text-[#F58734] transition-colors font-semibold">About Us</a>
            <a href="#contact" className="hover:text-[#F58734] transition-colors font-semibold">Contact Us</a>
            <a href="#blogs" className="hover:text-[#F58734] transition-colors font-semibold">Blogs</a>
            <a href="#faqs" className="hover:text-[#F58734] transition-colors font-semibold">FAQ's</a>
          </div>

          {/* Right Side: Whatsapp, Social icons */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5 font-semibold">
              <svg className="w-3.5 h-3.5 fill-current text-white hover:text-emerald-400 cursor-pointer" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.966C16.588 1.974 14.12 .95 11.5 1.01 6.064 1.01 1.64 5.38 1.636 10.81c-.001 1.63.452 3.224 1.31 4.646L1.93 20.89l5.525-1.444l-.808-.292zm11.758-6.196c-.29-.145-1.716-.848-1.98-.942-.266-.096-.46-.145-.654.145-.19.29-.74.943-.907 1.137-.166.19-.333.213-.623.068-1.51-.75-2.6-1.3-3.633-3.085-.27-.464.27-.43.774-1.436.082-.164.041-.31-.02-.455-.06-.145-.654-1.576-.897-2.155-.236-.57-.477-.493-.654-.502-.17-.008-.364-.01-.56-.01-.194 0-.51.073-.777.363-.268.29-1.02.997-1.02 2.431 0 1.434 1.042 2.82 1.188 3.012.145.19 2.053 3.134 4.975 4.397.694.3 1.237.48 1.66.615.698.223 1.332.19 1.834.116.56-.083 1.717-.702 1.96-1.38.242-.676.242-1.256.17-1.38-.073-.12-.267-.193-.56-.338z" />
              </svg>
              <span>+91 92891 88852</span>
            </div>
            <div className="flex items-center gap-3">
              <a href="#" className="hover:text-[#F58734] transition-colors" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="#" className="hover:text-[#F58734] transition-colors" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </a>
              <a href="#" className="hover:text-[#F58734] transition-colors" aria-label="Youtube">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17Z"/><path d="m10 15 5-3-5-3z"/></svg>
              </a>
              <a href="#" className="hover:text-[#F58734] transition-colors" aria-label="Linkedin">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
            </div>
          </div>
        </div>

        {/* Row 1 (White): Logo, Search, Utilities */}
        <div className="hidden lg:block w-full bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto w-full px-6 md:px-12 h-[76px] flex items-center justify-between gap-6">
            {/* Logo */}
            <a href="#" className="flex-shrink-0 transition-transform active:scale-95 z-50" onClick={(e) => { e.preventDefault(); closeAllMenus(); setActiveProductId(null); setCurrentView('home'); }}>
              <FaazoLogo className="transition-transform duration-300 transform" />
            </a>

            {/* Search bar */}
            <div className="search-container-desktop flex-1 max-w-[500px] xl:max-w-[620px] mx-8 relative z-50">
              <div className="flex items-center w-full h-[44px] px-4.5 rounded-full border border-[#006670]/25 bg-white hover:border-[#006670]/50 focus-within:border-[#006670]/60 hover:shadow-[0_1px_8px_rgba(0,102,112,0.08)] focus-within:shadow-[0_1px_8px_rgba(0,102,112,0.12)] transition-all duration-200 gap-3.5 relative">
                {/* Left Magnifying Glass */}
                <Search className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!isSearchOpen) {
                      setIsSearchOpen(true);
                      setIsCartOpen(false);
                      setIsAccountOpen(false);
                      setActiveMenu(null);
                    }
                  }}
                  onFocus={() => {
                    setIsSearchOpen(true);
                    setIsCartOpen(false);
                    setIsAccountOpen(false);
                    setActiveMenu(null);
                  }}
                  placeholder="Search for..."
                  className="flex-grow h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[14px] font-medium text-slate-800 placeholder-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Utilities */}
            <div className="flex items-center gap-6 z-50">
              {/* Account (Log In / Account dropdown) */}
              <div
                className="relative"
                onMouseEnter={() => { if (isAuthenticated) { setIsAccountOpen(true); setActiveMenu(null); } }}
                onClick={() => {
                  if (isAuthenticated) {
                    setIsAccountOpen(!isAccountOpen);
                  } else {
                    onOpenLoginModal();
                  }
                }}
              >
                <button className="flex flex-col items-center justify-center text-slate-800 hover:text-[#006670] transition-colors cursor-pointer select-none">
                  {isAuthenticated && user ? (
                    <div className="w-[20px] h-[20px] rounded-full bg-[#006670] text-white text-[9px] font-black flex items-center justify-center shrink-0 mb-0.5">
                      {avatarInitials}
                    </div>
                  ) : (
                    <User className="w-[20px] h-[20px] stroke-[1.8] mb-0.5" />
                  )}
                  <span className="text-[10px] font-bold tracking-wider uppercase leading-none mt-0.5">
                    {isAuthenticated && user ? displayFirstName : 'LOG IN'}
                  </span>
                </button>

                {/* Authenticated Dropdown */}
                {isAuthenticated && isAccountOpen && user && (
                  <div
                    className="absolute right-0 top-[56px] w-72 bg-white rounded-2xl border border-slate-100 shadow-[0_15px_35px_rgba(0,0,0,0.06)] p-5 z-50 text-left select-none animate-in fade-in slide-in-from-top-2 duration-200"
                    onMouseLeave={() => setIsAccountOpen(false)}
                  >
                    <div className="border-b border-slate-100 pb-3 mb-3">
                      <span className="text-[10px] font-extrabold tracking-widest text-[#006670] uppercase block mb-1">
                        {user.role === 'dealer' ? 'Dealer Portal' : 'Clinic Portal'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800">{user.full_name}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{user.email}</p>
                      {user.role === 'dealer' && (
                        <span className="inline-block bg-orange-100 text-orange-800 text-[9px] font-bold px-2 py-0.5 rounded-full mt-1.5">
                          B2B Dealer
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1.5">
                      {/* Dealer Portal link — only visible to dealer accounts */}
                      {user.role === 'dealer' && (
                        <li>
                          <a href="#dealer-portal" onClick={(e) => { e.preventDefault(); setIsAccountOpen(false); setCurrentView('dealer-portal'); window.scrollTo(0, 0); }}
                            className="flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-[#005B63] bg-[#005B63]/5 hover:bg-[#005B63]/10 transition-colors border border-[#005B63]/10 mb-2">
                            <div className="flex items-center gap-2">
                              <Handshake className="w-4 h-4 opacity-80" />
                              Dealer Portal
                            </div>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                              user.dealer_status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                              user.dealer_status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>{user.dealer_status ?? 'pending'}</span>
                          </a>
                        </li>
                      )}
                      <li>
                        <a href="#dashboard" onClick={(e) => { e.preventDefault(); setIsAccountOpen(false); setDashboardSection?.('dashboard'); setCurrentView('my-orders'); window.scrollTo(0, 0); }}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#006670] transition-colors">
                          <Compass className="w-4 h-4 opacity-70" /> Clinical Dashboard
                        </a>
                      </li>
                      <li>
                        <a href="#orders" onClick={(e) => { e.preventDefault(); setIsAccountOpen(false); setDashboardSection?.('orders'); setCurrentView('my-orders'); window.scrollTo(0, 0); }}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#006670] transition-colors">
                          <Package className="w-4 h-4 opacity-70" /> My Orders
                        </a>
                      </li>
                      <li>
                        <a href="#wishlist" onClick={(e) => { e.preventDefault(); setIsAccountOpen(false); setDashboardSection?.('wishlist'); setCurrentView('my-orders'); window.scrollTo(0, 0); }}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#006670] transition-colors">
                          <Heart className="w-4 h-4 opacity-70" /> Wishlist
                        </a>
                      </li>
                      <li>
                        <a href="#warranty" onClick={(e) => { e.preventDefault(); setIsAccountOpen(false); setDashboardSection?.('warranty'); setCurrentView('my-orders'); window.scrollTo(0, 0); }}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#006670] transition-colors">
                          <Shield className="w-4 h-4 opacity-70" /> Warranty
                        </a>
                      </li>
                      <li className="border-t border-slate-100 pt-2.5 mt-2.5">
                        <button onClick={() => { setIsAccountOpen(false); logout(); }}
                          className="flex items-center w-full gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer text-left">
                          <LogOut className="w-4 h-4 opacity-80" /> Sign Out
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Wishlist Icon */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  closeAllMenus();
                  if (isAuthenticated) {
                    setCurrentView('wishlist');
                    window.scrollTo(0, 0);
                  } else {
                    setPendingAction({ type: 'open-wishlist' });
                    onOpenLoginModal();
                  }
                }}
                className="relative flex flex-col items-center justify-center text-slate-800 hover:text-rose-500 transition-colors cursor-pointer"
                aria-label="Wishlist"
              >
                <div className="relative">
                  <Heart className="w-[20px] h-[20px] stroke-[1.8] mb-0.5" />
                  <span className="absolute -top-1.5 -right-2.5 bg-[#004d54] text-white text-[8px] font-black rounded-full w-[14px] h-[14px] flex items-center justify-center border border-white">
                    {wishlistItems.length}
                  </span>
                </div>
                <span className="text-[10px] font-bold tracking-wider uppercase leading-none mt-0.5">WISHLIST</span>
              </button>

              {/* Cart Icon */}
              <button
                onClick={() => {
                  closeAllMenus();
                  if (isAuthenticated) {
                    setCurrentView('cart');
                    window.scrollTo(0, 0);
                  } else {
                    setPendingAction({ type: 'open-cart' });
                    onOpenLoginModal();
                  }
                }}
                className="relative flex flex-col items-center justify-center text-slate-800 hover:text-[#006670] transition-colors cursor-pointer"
                aria-label="Shopping Cart"
              >
                <div className="relative">
                  <ShoppingCart className="w-[20px] h-[20px] stroke-[1.8] mb-0.5" />
                  <span className="absolute -top-1.5 -right-2.5 bg-[#004d54] text-white text-[8px] font-black rounded-full w-[14px] h-[14px] flex items-center justify-center border border-white">
                    {cartItems.length}
                  </span>
                </div>
                <span className="text-[10px] font-bold tracking-wider uppercase leading-none mt-0.5">CART</span>
              </button>

              {/* Notification Center Bell */}
              <NotificationBell onOpenLoginModal={onOpenLoginModal} />
            </div>
          </div>
        </div>

        {/* Mobile Navbar Container */}
        <div className="flex lg:hidden w-full h-[60px] items-center justify-between px-3.5 sm:px-5 relative z-50">
          {/* Left-aligned FAAZO Logo */}
          <a href="#" className="transition-transform active:scale-95 flex items-center" onClick={(e) => { e.preventDefault(); closeAllMenus(); setActiveProductId(null); setCurrentView('home'); }}>
            <FaazoLogo onlyIcon={true} />
          </a>

          {/* Search bar - Mobile */}
          <div className="search-container-mobile flex-1 min-w-0 mx-2.5 sm:mx-6 max-w-[360px] relative z-50">
            <div className="flex items-center w-full h-[36px] px-3.5 rounded-full border border-[#006670]/25 bg-white hover:border-[#006670]/50 focus-within:border-[#006670]/60 hover:shadow-[0_1px_8px_rgba(0,102,112,0.08)] focus-within:shadow-[0_1px_8px_rgba(0,102,112,0.12)] transition-all duration-200 gap-2 relative">
              {/* Left Magnifying Glass */}
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!isSearchOpen) {
                    setIsSearchOpen(true);
                    setIsCartOpen(false);
                    setIsAccountOpen(false);
                    setActiveMenu(null);
                  }
                }}
                onFocus={() => {
                  setIsSearchOpen(true);
                  setIsCartOpen(false);
                  setIsAccountOpen(false);
                  setActiveMenu(null);
                }}
                placeholder="Search for..."
                className="flex-grow min-w-0 h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[12px] font-medium text-slate-800 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Utilities on Right */}
          <div className="flex items-center gap-1 sm:gap-1.5 relative shrink-0">

            {/* Account Icon — Mobile */}
            <div
              className="relative block"
              onClick={() => setIsAccountOpen(!isAccountOpen)}
            >
              {isAuthenticated && user ? (
                <>
                  {/* Avatar icon for small mobile (<640px) */}
                  <button
                    className="p-1 sm:hidden rounded-full transition-all duration-300 hover:bg-slate-50 cursor-pointer text-slate-700 hover:text-[#006670] flex items-center justify-center"
                    aria-label="My Account"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#006670] text-white text-[10px] font-black flex items-center justify-center shrink-0">
                      {avatarInitials}
                    </span>
                  </button>

                  {/* Avatar chip for mobile tablet (>=640px) */}
                  <button
                    className={`hidden sm:flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full border transition-all duration-200 cursor-pointer select-none
                      ${isAccountOpen
                        ? 'border-[#006670] bg-[#e6f3f5] text-[#006670]'
                        : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    aria-label="My Account"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#006670] text-white text-[10px] font-black flex items-center justify-center shrink-0">
                      {avatarInitials}
                    </span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isAccountOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Mobile authenticated dropdown */}
                  {isAccountOpen && (
                    <div
                      className="absolute right-0 top-[48px] w-72 bg-white rounded-2xl border border-slate-100 shadow-[0_15px_35px_rgba(0,0,0,0.06)] p-5 z-50 text-left select-none animate-in fade-in slide-in-from-top-2 duration-200"
                      onMouseLeave={() => setIsAccountOpen(false)}
                    >
                      <div className="border-b border-slate-100 pb-3 mb-3">
                        <span className="text-[10px] font-extrabold tracking-widest text-[#006670] uppercase block mb-1">
                          {user.role === 'dealer' ? 'Dealer Portal' : 'Clinic Portal'}
                        </span>
                        <h4 className="text-sm font-bold text-slate-800">{user.full_name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{user.email}</p>
                        {user.role === 'dealer' && (
                          <span className="inline-block bg-orange-100 text-orange-800 text-[9px] font-bold px-2 py-0.5 rounded-full mt-1.5">
                            B2B Dealer
                          </span>
                        )}
                      </div>
                      <ul className="space-y-1.5">
                        <li><a href="#dashboard" onClick={(e) => { e.preventDefault(); setIsAccountOpen(false); setCurrentView('my-orders'); window.scrollTo(0, 0); }} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#006670] transition-colors"><Compass className="w-4 h-4 opacity-70" /> Clinical Dashboard</a></li>
                        <li><a href="#orders" onClick={(e) => { e.preventDefault(); setIsAccountOpen(false); setCurrentView('my-orders'); window.scrollTo(0, 0); }} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#006670] transition-colors"><Package className="w-4 h-4 opacity-70" /> My Orders</a></li>
                        <li><a href="#wishlist" onClick={(e) => { e.preventDefault(); setIsAccountOpen(false); setCurrentView('wishlist'); window.scrollTo(0, 0); }} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#006670] transition-colors"><Heart className="w-4 h-4 opacity-70" /> Wishlist</a></li>
                        <li><a href="#warranty" onClick={(e) => { e.preventDefault(); setIsAccountOpen(false); setCurrentView('my-orders'); window.scrollTo(0, 0); }} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#006670] transition-colors"><Shield className="w-4 h-4 opacity-70" /> Warranty</a></li>
                        <li className="border-t border-slate-100 pt-2.5 mt-2.5">
                          <button onClick={() => { setIsAccountOpen(false); logout(); }} className="flex items-center w-full gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer text-left">
                            <LogOut className="w-4 h-4 opacity-80" /> Sign Out
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Guest: Login icon button for small mobile (<640px) */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsAccountOpen(false); onOpenLoginModal(); }}
                    className="p-1.5 sm:hidden rounded-full transition-all duration-300 hover:bg-slate-50 cursor-pointer text-slate-700 hover:text-[#006670]"
                    aria-label="Login"
                  >
                    <User className="w-[18px] h-[18px] stroke-[1.8]" />
                  </button>

                  {/* Guest: Login pill button for mobile tablet (>=640px) */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsAccountOpen(false); onOpenLoginModal(); }}
                    className="hidden sm:flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full border border-[#006670] text-[#006670] text-[10px] font-black uppercase tracking-wider hover:bg-[#006670] hover:text-white transition-all duration-200 cursor-pointer select-none"
                    aria-label="Login"
                  >
                    <User className="w-3 h-3" />
                    Login
                  </button>
                </>
              )}
            </div>

            {/* Wishlist Icon Trigger */}
            <button
              onClick={(e) => { e.preventDefault(); closeAllMenus(); setCurrentView('wishlist'); window.scrollTo(0, 0); }}
              className="relative p-1.5 sm:p-2 rounded-full transition-all duration-300 hover:bg-slate-50 cursor-pointer text-slate-700 hover:text-rose-500"
              aria-label="Wishlist"
            >
              <Heart className="w-[18px] h-[18px] stroke-[1.8]" />
              {wishlistItems.length > 0 && (
                <span className="absolute rounded-full bg-rose-600 text-white text-[8px] font-bold flex items-center justify-center border border-white w-[14px] h-[14px] top-[1px] right-[1px]">
                  {wishlistItems.length}
                </span>
              )}
            </button>

            {/* Notification Bell Icon Trigger & Dropdown */}
            <div 
              className="relative"
              onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsAccountOpen(false); }}
            >
              <button
                className={`p-1.5 sm:p-2 rounded-full transition-all duration-300 hover:bg-slate-50 cursor-pointer text-slate-700 hover:text-[#006670]
                  ${isNotificationsOpen ? 'bg-slate-50 text-[#006670]' : ''}`}
                aria-label="Notifications"
              >
                <Bell className="w-[18px] h-[18px] stroke-[1.8]" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute rounded-full bg-rose-600 w-2 h-2 top-[5px] right-[5px] sm:top-[7px] sm:right-[7px]" />
                )}
              </button>

              {isNotificationsOpen && (
                <div
                  className="absolute right-[-40px] sm:right-0 top-[48px] w-72 sm:w-80 bg-white rounded-2xl border border-slate-100 shadow-[0_15px_35px_rgba(0,0,0,0.06)] p-4 sm:p-5 z-50 text-left select-none"
                  onMouseLeave={() => { setIsNotificationsOpen(false); markAllAsRead(); }}
                >
                  <div className="border-b border-slate-100 pb-3 mb-3 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-extrabold tracking-widest text-[#006670] uppercase block mb-1">Alerts Portal</span>
                      <h4 className="text-sm font-bold text-slate-800">Notifications</h4>
                    </div>
                    {notifications.some(n => !n.read) && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); markAllAsRead(); }} 
                        className="text-[9px] font-extrabold uppercase text-[#006670] hover:underline cursor-pointer"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar">
                    {notifications.map(n => (
                      <div 
                        key={n.id}
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          setCurrentView(n.route);
                          window.scrollTo(0, 0);
                        }}
                        className={`p-2.5 rounded-xl cursor-pointer transition-colors ${n.read ? 'hover:bg-slate-50 bg-white' : 'bg-slate-50/50 border-l-2 border-[#006670]'}`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <h5 className={`text-[11px] leading-tight ${n.read ? 'font-bold text-slate-700' : 'font-extrabold text-[#006670]'}`}>{n.title}</h5>
                          <span className="text-[9px] text-slate-400 whitespace-nowrap">{n.time}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-snug mt-1 font-medium font-sans">{n.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2 (Grey/Teal Tint with border): Categories dropdown (Desktop), Sub-Navigation Links (Mobile & Desktop) */}
        <div className="w-full bg-[#f6fafb] lg:bg-[#f5f5f5] border-b border-slate-200/60 shadow-2xs">
          <div className="max-w-7xl mx-auto w-full px-3.5 sm:px-6 md:px-12 h-[36px] lg:h-[48px] flex items-center justify-center lg:justify-start gap-4 lg:gap-12">
            {/* Categories Button (Desktop) */}
            <div
              className="hidden lg:block relative py-1 group shrink-0"
              onMouseEnter={() => handleMouseEnter('categories')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  closeAllMenus();
                  router.push('/products');
                }}
                className={`flex items-center gap-2 text-white text-[12px] font-extrabold uppercase tracking-widest px-5 py-2.5 rounded-sm cursor-pointer transition-colors ${
                  activeMenu === 'categories' ? 'bg-[#006670]' : 'bg-[#004d54] hover:bg-[#006670]'
                }`}
              >
                <Menu className="w-4 h-4" />
                <span>Categories</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeMenu === 'categories' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Navigation Links — Positioned Below Navbar in Mobile View */}
            <nav className="flex items-center text-slate-800 font-sans font-semibold text-[11.5px] sm:text-[13px] tracking-[0.01em] gap-2.5 sm:gap-4.5 overflow-x-auto no-scrollbar w-full lg:w-auto py-1 justify-center lg:justify-start select-none">
              <Link href="/offers" onClick={() => { closeAllMenus(); if (setCurrentView) setCurrentView('special-offers'); }} className="hover:text-[#006670] transition-colors py-0.5 cursor-pointer font-bold shrink-0">Special Offers</Link>
              <span className="text-slate-300 select-none shrink-0">•</span>
              <Link href="/best-sellers" onClick={() => closeAllMenus()} className="hover:text-[#006670] transition-colors py-0.5 cursor-pointer font-bold shrink-0">Bestsellers</Link>
              <span className="text-slate-300 select-none shrink-0">•</span>
              <Link href="/combo-deals" onClick={() => { closeAllMenus(); if (setCurrentView) setCurrentView('combo-deals'); }} className="hover:text-[#006670] transition-colors py-0.5 cursor-pointer font-bold shrink-0">Combo Deals</Link>
              <span className="text-slate-300 select-none shrink-0">•</span>
              <Link href="/brands" onClick={() => closeAllMenus()} className="hover:text-[#006670] transition-colors py-0.5 cursor-pointer font-bold shrink-0">Brands</Link>
            </nav>
          </div>
        </div>

        {/* 4. Dentalkart-Style 3-Level Category Mega Menu */}
        <CategoryMegaMenu
          isOpen={activeMenu === 'categories'}
          onMouseEnter={() => handleDropdownMouseEnter('categories')}
          onMouseLeave={handleMouseLeave}
          onItemClick={handleMegaMenuCategoryClick}
          onProductClick={(productId, e) => {
            e.preventDefault();
            closeAllMenus();
            setActiveProductId(productId);
            setCurrentView('detail');
            window.scrollTo(0, 0);
          }}
        />



        {/* 7. Support Dropdown Floating Panel */}
        <div
          className={`hidden lg:block absolute left-1/2 -translate-x-1/2 w-full max-w-7xl top-[calc(100%+24px)] bg-white border border-[#EEF2F7] rounded-[22px] shadow-[0_25px_70px_rgba(15,23,42,0.10)] p-6 md:p-7 z-45 transition-all duration-300 ease-out text-left select-none
            ${activeMenu === 'support'
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 -translate-y-2 pointer-events-none'
            }`}
          onMouseEnter={() => handleDropdownMouseEnter('support')}
          onMouseLeave={handleMouseLeave}
        >
          <div className="grid grid-cols-12 gap-6">

            {/* Left list (8 Cols) */}
            <div className="col-span-8 border-r border-[#EEF2F7]/85 pr-6 grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="col-span-2">
                <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">HELP & TECHNICAL SERVICE</span>
              </div>
              {supportDropdown.map((item, idx) => (
                <a
                  key={idx}
                  href={item.href}
                  onClick={() => setActiveMenu(null)}
                  className="group p-2 rounded-xl hover:bg-[#e6f3f5]/60 hover:shadow-[0_4px_12px_rgba(0, 43, 46,0.03)] transition-all duration-250 ease-in-out flex flex-col items-start"
                >
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#006670] transition-colors flex items-center gap-1 transition-transform duration-250 group-hover:translate-x-[4px]">
                    {item.name}
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all text-[#006670]" />
                  </h4>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5 font-medium">{item.desc}</p>
                </a>
              ))}
            </div>

            {/* Right helpline panel (4 Cols) */}
            <div className="col-span-4 bg-gradient-to-br from-[#00525b] to-[#006670] text-white rounded-[18px] p-5 flex flex-col justify-between text-left">
              <div>
                <h4 className="text-sm font-bold flex items-center gap-1.5">
                  <Shield className="w-4.5 h-4.5 text-emerald-300" />
                  Certified Support
                </h4>
                <p className="text-[10.5px] text-slate-200 mt-2 font-sans leading-relaxed font-medium">
                  Our factory-trained clinical hardware engineers ensure system calibrations and diagnostic uptime across India.
                </p>
              </div>
              <div className="mt-4 flex flex-col w-full">
                <div className="flex items-center gap-2 text-xs font-bold bg-white/10 p-2.5 rounded-xl">
                  <Phone className="w-4 h-4 text-emerald-300" />
                  <span>Support: 1800 300 4545</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 8. About Dropdown Floating Panel */}
        <div
          className={`hidden lg:block absolute left-1/2 -translate-x-1/2 w-full max-w-7xl top-[calc(100%+24px)] bg-white border border-[#EEF2F7] rounded-[22px] shadow-[0_25px_70px_rgba(15,23,42,0.10)] p-6 md:p-7 z-45 transition-all duration-300 ease-out text-left select-none
            ${activeMenu === 'about'
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 -translate-y-2 pointer-events-none'
            }`}
          onMouseEnter={() => handleDropdownMouseEnter('about')}
          onMouseLeave={handleMouseLeave}
        >
          <div className="grid grid-cols-12 gap-6">

            {/* Left list (8 Cols) */}
            <div className="col-span-8 border-r border-[#EEF2F7]/85 pr-6 grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="col-span-2">
                <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">CORPORATE OVERVIEW</span>
              </div>
              {aboutDropdown.map((item, idx) => (
                <a
                  key={idx}
                  href={item.href}
                  onClick={() => setActiveMenu(null)}
                  className="group flex items-start gap-3 p-2 rounded-xl hover:bg-[#e6f3f5]/60 hover:shadow-[0_4px_12px_rgba(0, 43, 46,0.03)] transition-all duration-250 ease-in-out"
                >
                  <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0 group-hover:bg-[#e6f3f5] transition-colors">
                    <Briefcase className="w-3.5 h-3.5 text-[#006670]" />
                  </div>
                  <div className="transition-transform duration-250 group-hover:translate-x-[4px] text-left">
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#006670]">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5 font-medium">{item.desc}</p>
                  </div>
                </a>
              ))}
            </div>

            {/* Right panel highlight (4 Cols) */}
            <div className="col-span-4 bg-[#F7FAF9] rounded-[18px] p-5 border border-[#EEF2F7] flex flex-col justify-between items-start text-left">
              <div>
                <span className="text-[9px] font-black tracking-widest bg-emerald-100 text-[#006670] px-2.5 py-0.5 rounded-full uppercase font-sans">
                  FAAZO Trust
                </span>
                <h4 className="text-xs font-bold text-[#004d54] mt-3">Global Quality Certifications</h4>
                <p className="text-[10px] text-slate-400 font-sans mt-1 leading-relaxed font-medium">
                  All distributed systems and restorative composites are certified with European CE and international ISO standards.
                </p>
              </div>
              <div className="flex gap-2.5 mt-3 items-center">
                <CheckCircle2 className="w-4 h-4 text-[#006670]" />
                <span className="text-[10.5px] font-bold text-slate-600">ISO 13485:2016 Compliant</span>
              </div>
            </div>

          </div>
        </div>

      </header>

      {/* 9. Slide-down Search Suggestion Overlay */}
      {/* 9. Slide-down Search Suggestion Overlay */}
      {isSearchOpen && (
        <div
          className={`fixed left-0 right-0 z-48 bg-white/95 backdrop-blur-2xl border-b border-slate-200 shadow-[0_20px_40px_rgba(0,0,0,0.06)] animate-in slide-in-from-top duration-300 ease-out text-left select-none top-[60px] lg:top-[160px] ${scrolled ? 'lg:top-[124px]' : 'lg:top-[160px]'} search-overlay-container`}
          style={{ height: '360px' }}
        >
          <div className="max-w-3xl mx-auto px-6 pt-8 pb-10 flex flex-col justify-start h-full">


            {searchQuery.trim() ? (
              <div className="flex-grow overflow-y-auto mt-4 max-h-[180px] lg:max-h-[240px] no-scrollbar">
                {filteredSearch.length > 0 ? (
                  <div className="space-y-1.5 text-left">
                    <h4 className="text-[10px] font-black tracking-widest text-[#006670] uppercase mb-2">Matching Catalog Items ({filteredSearch.length})</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredSearch.map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleSearchProductClick(p.id, p.category, p.type)}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-[#006670]/30 hover:bg-[#e6f3f5]/10 transition-all cursor-pointer group"
                        >
                          <div className="text-left">
                            <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider leading-none mb-1">{p.category}</span>
                            <span className="text-xs font-bold text-slate-700 group-hover:text-[#006670] transition-colors">{p.title}</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#006670] group-hover:translate-x-0.5 transition-all" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100/50 rounded-2xl p-6 text-center select-none shadow-xs mt-2">
                    <span className="text-xs font-bold text-slate-600 block">No Match Found for "{searchQuery}"</span>
                    <p className="text-[10.5px] text-slate-400 mt-1 font-medium font-sans">We couldn't find any products matching your query. Try searching for "handpiece", "light", "curing", or "scanner".</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 lg:mt-0">
                <div>
                  <h4 className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-3">Popular Searches</h4>
                  <ul className="space-y-2">
                    <li>
                      <a href="#scalers" onClick={(e) => { e.preventDefault(); handleMegaMenuCategoryClick('Advanced Dental Equipment & Accessories', e); }} className="text-xs font-semibold text-slate-600 hover:text-[#006670] transition-colors flex items-center gap-1.5">
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        Woodpecker Ultrasonic Scaler
                      </a>
                    </li>
                    <li>
                      <a href="#" onClick={(e) => { e.preventDefault(); closeAllMenus(); setActiveProductId('nsk-handpiece'); setCurrentView('detail'); }} className="text-xs font-semibold text-slate-600 hover:text-[#006670] transition-colors flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                        NSK Pana-Max High Speed Handpiece
                      </a>
                    </li>
                    <li>
                      <a href="#chairs" onClick={(e) => { e.preventDefault(); handleMegaMenuCategoryClick('Dental Chairs', e); }} className="text-xs font-semibold text-slate-600 hover:text-[#006670] transition-colors flex items-center gap-1.5">
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        Ergonomic Dental Chairs & Units
                      </a>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-3">Recent Research & Catalogues</h4>
                  <ul className="space-y-2">
                    <li>
                      <a href="#research" onClick={closeAllMenus} className="text-xs font-semibold text-[#006670] hover:underline flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        CBCT 3D Diagnostic Volumetric Safety.pdf
                      </a>
                    </li>
                    <li>
                      <a href="#catalogues" onClick={closeAllMenus} className="text-xs font-semibold text-[#006670] hover:underline flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        FAAZO Full Product Catalogue 2026.pdf
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-400 text-center font-sans">Press ESC to dismiss search window.</p>
          </div>
        </div>
      )}

      {/* 10. Slide-out Cart Drawer Overlay (Right Side) */}
      <aside
        className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white shadow-[[-15px_0_35px_rgba(0,0,0,0.06)]] border-l border-slate-100 flex flex-col justify-between transition-transform duration-500 ease-out select-none
          ${isCartOpen ? 'translate-x-0' : 'translate-x-full invisible'}`}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-[#006670]" />
              Clinical Cart
            </h3>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">Procuring products for your dental practice</p>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 hover:bg-slate-50 rounded-full cursor-pointer text-slate-400 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-4">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">Your Cart is Empty</h4>
              <p className="text-xs text-slate-400 max-w-xs mt-1 font-sans">Explore our premium catalog to add clinical systems and materials to your setup.</p>
              <button
                onClick={() => { setIsCartOpen(false); }}
                className="mt-6 px-6 py-2.5 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold rounded-full transition-all cursor-pointer shadow-sm"
              >
                Browse Products
              </button>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="flex gap-4 p-3 border border-slate-100 rounded-xl hover:shadow-[0_4px_15px_rgba(0,0,0,0.02)] transition-shadow">
                <div className="w-16 h-16 bg-[#F7FAF9] rounded-lg p-2 flex items-center justify-center flex-shrink-0 border border-slate-50">
                  <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex-grow text-left flex flex-col justify-between py-0.5">
                  <div>
                    <span className="text-[9px] font-extrabold tracking-wider text-slate-400 uppercase font-sans">{item.category}</span>
                    <h4 className="text-xs font-bold text-slate-800 leading-snug line-clamp-1 cursor-pointer hover:text-[#006670]" onClick={() => { setIsCartOpen(false); setActiveProductId('nsk-handpiece'); setCurrentView('detail'); }}>{item.name}</h4>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#0F2D30] font-display">₹ {item.price.toLocaleString('en-IN')}</span>
                    <div className="flex items-center gap-2.5 border border-slate-100 rounded-full px-2 py-0.5 bg-slate-50">
                      <button
                        onClick={() => {
                          setCartItems(prev => prev.map(c => c.id === item.id ? { ...c, qty: Math.max(1, c.qty - 1) } : c));
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-slate-700 px-1 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-slate-700 font-sans">{item.qty}</span>
                      <button
                        onClick={() => {
                          setCartItems(prev => prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-slate-700 px-1 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setCartItems(prev => prev.filter(c => c.id !== item.id))}
                  className="text-xs text-slate-300 hover:text-rose-500 p-1 self-start transition-colors cursor-pointer"
                  title="Remove item"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {cartItems.length > 0 && (
          <div className="p-6 border-t border-slate-100 bg-[#F7FAF9]">
            <div className="space-y-2 mb-4 text-left">
              <div className="flex justify-between text-xs font-bold text-slate-500 font-sans">
                <span>Items Subtotal</span>
                <span>₹ {cartTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-500 font-sans">
                <span>Shipping & Setup</span>
                <span className="text-emerald-500 uppercase font-black text-[10px]">Free Delivery</span>
              </div>
              <div className="border-t border-slate-200/50 pt-2 flex justify-between text-sm font-black text-slate-800">
                <span>Total Procurement Cost</span>
                <span className="text-[#006670] font-display">₹ {cartTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={() => { setIsCartOpen(false); setCurrentView('checkout'); window.scrollTo(0, 0); }}
              className="w-full py-3.5 rounded-full bg-[#006670] hover:bg-[#004e56] text-white text-xs tracking-wider font-extrabold uppercase transition-all shadow-md hover:shadow-premium cursor-pointer flex items-center justify-center gap-2"
            >
              Proceed to Secure Checkout
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[9px] text-slate-400 text-center font-sans mt-2">Certified medical equipment delivery with full transit warranty.</p>
          </div>
        )}
      </aside>

      {/* 11. Slide-in Mobile Navigation Drawer (Right Side) */}
      <aside
        className={`fixed top-0 right-0 bottom-0 z-50 w-3/5 bg-white shadow-2xl flex flex-col justify-between transition-transform duration-500 ease-out select-none lg:hidden
          ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full invisible'}`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <a href="#" className="transition-transform active:scale-95" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); closeAllMenus(); setActiveProductId(null); setCurrentView('home'); }}>
            <FaazoLogo />
          </a>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 hover:bg-slate-50 rounded-full cursor-pointer text-slate-400 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable List of accordions */}
        <div className="flex-grow overflow-y-auto px-6 py-4 space-y-4">

          {/* Products Accordion */}
          <div className="border-b border-slate-100 pb-3">
            <button
              onClick={() => toggleMobileAccordion('products')}
              className="flex justify-between items-center w-full text-left font-display font-bold text-xs uppercase tracking-wider text-slate-800 py-1.5 cursor-pointer"
            >
              <span>Products</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${mobileAccordions['products'] ? 'rotate-180' : ''}`} />
            </button>
            {mobileAccordions['products'] && (
              <div className="mt-3 pl-3 space-y-4 text-left animate-in slide-in-from-top-1 duration-200">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    closeAllMenus();
                    setCurrentView('portfolio');
                    window.scrollTo(0, 0);
                  }}
                  className="w-full flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-[#006670] hover:text-[#004e56] mb-2 text-left cursor-pointer"
                >
                  Explore Complete Portfolio
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                {categoriesList.map(cat => (
                  <div key={cat.id}>
                    <span className="block text-[10px] font-black tracking-widest text-[#006670] uppercase mb-1.5">{cat.label}</span>
                    <ul className="space-y-1.5">
                      {cat.subCategories.map((sub, sIdx) => (
                        <li key={sIdx}>
                          <a
                            href="#products"
                            onClick={(e) => {
                              setIsMobileMenuOpen(false);
                              handleMegaMenuCategoryClick(sub.name, e);
                            }}
                            className="text-xs font-semibold text-slate-600 hover:text-[#006670] block py-1 font-sans cursor-pointer"
                          >
                            {sub.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>



          {/* Support Accordion */}
          <div className="border-b border-slate-100 pb-3">
            <button
              onClick={() => toggleMobileAccordion('support')}
              className="flex justify-between items-center w-full text-left font-display font-bold text-xs uppercase tracking-wider text-slate-800 py-1.5 cursor-pointer"
            >
              <span>Support</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${mobileAccordions['support'] ? 'rotate-180' : ''}`} />
            </button>
            {mobileAccordions['support'] && (
              <ul className="mt-2 pl-3 space-y-2 text-left animate-in slide-in-from-top-1 duration-200">
                {supportDropdown.map((item, idx) => (
                  <li key={idx}>
                    <a
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-xs font-semibold text-slate-600 hover:text-[#006670] block py-1 font-sans"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* About Accordion */}
          <div className="border-b border-slate-100 pb-3">
            <button
              onClick={() => toggleMobileAccordion('about')}
              className="flex justify-between items-center w-full text-left font-display font-bold text-xs uppercase tracking-wider text-slate-800 py-1.5 cursor-pointer"
            >
              <span>About</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${mobileAccordions['about'] ? 'rotate-180' : ''}`} />
            </button>
            {mobileAccordions['about'] && (
              <ul className="mt-2 pl-3 space-y-2 text-left animate-in slide-in-from-top-1 duration-200">
                {aboutDropdown.map((item, idx) => (
                  <li key={idx}>
                    <a
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-xs font-semibold text-slate-600 hover:text-[#006670] block py-1 font-sans"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>

        {/* Mobile menu account / help CTA at bottom */}
        {isAuthenticated && user ? (
          <div className="p-6 bg-slate-50 border-t border-slate-100 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-extrabold uppercase text-sm select-none">
                {user.full_name.charAt(0)}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">{user.full_name}</h4>
                <p className="text-[10px] text-slate-400 font-sans">{user.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (user.role === 'dealer') {
                    setCurrentView('dealer-portal');
                  } else {
                    setCurrentView('my-orders');
                  }
                  window.scrollTo(0, 0);
                }}
                className="flex-grow py-2 rounded-lg bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                {user.role === 'dealer' ? 'Dealer Portal' : 'Go to Portal'}
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-50 border-t border-slate-100 text-left">
            <h4 className="text-xs font-bold text-slate-800 mb-1">Welcome to FAAZO</h4>
            <p className="text-[10px] text-slate-400 mb-4">Sign in to check orders, warranty, and special dentist or B2B pricing.</p>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenLoginModal();
              }}
              className="w-full py-2.5 rounded-full bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              Sign In / Register
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default Navbar;

