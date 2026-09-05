'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Users,
  Wrench,
  Shield,
  Award,
  ChevronLeft,
  ChevronRight,
  Phone,
  Search
} from 'lucide-react';
import {
  Brand3M,
  BrandDentsply,
  BrandIvoclar,
  BrandNSK,
  BrandWoodpecker,
  BrandColtene,
  BrandPlanmeca
} from './DentalIcons';
import { getCategoryIcon } from './CategoryMegaMenu';
import { useCategories } from '../../hooks/useCategories';
import { api, getAbsoluteImageUrl } from '../../lib/api';

const BrandEMS: React.FC = () => (
  <svg viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 md:h-8">
    <text x="20" y="27" fill="#009fe3" fontSize="22" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.5">EMS</text>
  </svg>
);

interface CategoryCard {
  id: string;
  title: string;
  desc: string;
  image: string;
  count: string;
}

interface ProductsLandingPageProps {
  onCategoryClick?: (categoryName: string) => void;
  setCurrentView?: (view: 'home' | 'portfolio' | 'listing' | 'detail') => void;
  onProductClick?: (productId: string) => void;
}

const ProductsLandingPage: React.FC<ProductsLandingPageProps> = ({
  onCategoryClick,
  setCurrentView,
  onProductClick
}) => {
  const portfolioRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);
  const [isMobile, setIsMobile] = useState(false);

  const categoriesList = useCategories();

  // Mobile Category Browser States
  const [activeMobileCatId, setActiveMobileCatId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Lazy loading states for categories
  const [productCache, setProductCache] = useState<Record<string, any[]>>({});
  const [loadingCats, setLoadingCats] = useState<Record<string, boolean>>({});
  const [errorCats, setErrorCats] = useState<Record<string, boolean>>({});

  const loadProductsForCategory = (catId: string) => {
    if (!catId) return;
    if (productCache[catId]) return;
    if (loadingCats[catId]) return;

    setLoadingCats(prev => ({ ...prev, [catId]: true }));
    setErrorCats(prev => ({ ...prev, [catId]: false }));

    api.get(`products/?category=${catId}&page_size=100`)
      .then(res => {
        const prods = res.data?.data ?? res.data ?? [];
        setProductCache(prev => ({ ...prev, [catId]: Array.isArray(prods) ? prods : [] }));
        setLoadingCats(prev => ({ ...prev, [catId]: false }));
      })
      .catch(err => {
        console.error(`Failed to load products for category ${catId}:`, err);
        setLoadingCats(prev => ({ ...prev, [catId]: false }));
        setErrorCats(prev => ({ ...prev, [catId]: true }));
      });
  };

  // Reset right panel scroll position on category switch
  useEffect(() => {
    if (rightPanelRef.current) {
      rightPanelRef.current.scrollTop = 0;
    }
  }, [activeMobileCatId]);



  useEffect(() => {
    if (categoriesList.length > 0 && !activeMobileCatId) {
      setActiveMobileCatId(categoriesList[0].id);
    }
  }, [categoriesList, activeMobileCatId]);

  const specialtiesCount = 6;
  const maxIndex = Math.max(0, specialtiesCount - visibleCount);

  useEffect(() => {
    const updateVisible = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 1024) {
        setVisibleCount(3);
      } else if (window.innerWidth >= 640) {
        setVisibleCount(2);
      } else {
        setVisibleCount(1);
      }
    };
    updateVisible();
    window.addEventListener('resize', updateVisible);
    return () => window.removeEventListener('resize', updateVisible);
  }, []);

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  const nextSlide = () => {
    setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
  };

  const prevSlide = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  // Auto-play timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= maxIndex) {
          return 0; // wrap around
        }
        return prev + 1;
      });
    }, 4500);
    return () => clearInterval(timer);
  }, [maxIndex]);

  const scrollPortfolio = () => {
    portfolioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Manufactured Under FAAZO Category Cards
  const manufacturedCategories: CategoryCard[] = [
    {
      id: 'Dental Handpieces',
      title: 'Dental Handpieces',
      desc: 'High-speed air turbines and micro-motors engineered for micro-precision and clinical durability.',
      image: '/images/category_handpieces.png',
      count: '6 Products'
    },
    {
      id: 'Intraoral Cameras',
      title: 'Intraoral Cameras',
      desc: 'HD diagnostics offering advanced clinical visualization, detail capture, and patient communication.',
      image: '/images/nsk_handpiece_head.png',
      count: '3 Products'
    },
    {
      id: 'LED Light Cure Units',
      title: 'LED Light Cure Units',
      desc: 'Broadband composite polymerization systems offering rapid curing times and uniform light output.',
      image: '/images/bestseller_curing.png',
      count: '4 Products'
    }
  ];

  // Imported Dental Equipment Category Cards
  const importedCategories: CategoryCard[] = [
    {
      id: 'Dental Chairs',
      title: 'Dental Chairs',
      desc: 'Ergonomic treatment centers integrated with smart dental assistant controls and clinical upholstery.',
      image: '/images/category_chairs.png',
      count: '5 Products'
    },
    {
      id: '3D Oral Scanners',
      title: '3D Oral Scanners',
      desc: 'High-precision 3D intraoral digital scanners offering rapid speeds and seamless CAD/CAM exports.',
      image: '/images/category_imaging.png',
      count: '4 Products'
    },
    {
      id: 'Dental Air Compressors',
      title: 'Dental Air Compressors',
      desc: 'Medical-grade oil-free silent compressors delivering pure, dry, and contaminant-free clinical air.',
      image: '/images/bestseller_scaler.png',
      count: '3 Products'
    },
    {
      id: 'Advanced Dental Equipment & Accessories',
      title: 'Advanced Dental Equipment & Accessories',
      desc: 'Specialized clinical tools including ultrasonic scalers, apex locators, and surgical accessories.',
      image: '/images/category_instruments.png',
      count: '8 Products'
    }
  ];

  // Trust elements
  const trustPillars = [
    {
      icon: <Award className="w-5 h-5 text-[#006670]" />,
      title: "Manufactured by FAAZO",
      desc: "ISO certified precision, rigorous in-house QA protocols."
    },
    {
      icon: <Users className="w-5 h-5 text-[#006670]" />,
      title: "Imported Global Brands",
      desc: "Authorized partner distribution channel for NSK, Woodpecker, Planmeca."
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-[#006670]" />,
      title: "Genuine Products",
      desc: "100% original equipment verified via manufacturer serials."
    },
    {
      icon: <Phone className="w-5 h-5 text-[#006670]" />,
      title: "Nationwide Support",
      desc: "Emergency field engineers on call across all major cities."
    },
    {
      icon: <Wrench className="w-5 h-5 text-[#006670]" />,
      title: "Installation Services",
      desc: "Seamless clinical installation, calibration, and training."
    },
    {
      icon: <Shield className="w-5 h-5 text-[#006670]" />,
      title: "Warranty Coverage",
      desc: "Comprehensive warranty support with original spare parts."
    }
  ];

  // Clinical specialties
  const clinicalSpecialties = [
    { title: 'General Dentistry', image: '/images/category_chairs.png', desc: 'Restorations, hygiene & preventive suites.' },
    { title: 'Endodontics', image: '/images/bestseller_locator.png', desc: 'Canal diagnostics & root canal therapy.' },
    { title: 'Orthodontics', image: '/images/category_imaging.png', desc: 'Intraoral scans, diagnostics & alignments.' },
    { title: 'Implantology', image: '/images/nsk_handpiece_head.png', desc: 'High-torque motors & surgical toolkits.' },
    { title: 'Oral Surgery', image: '/images/nsk_handpiece_angle.png', desc: 'Guided surgical devices & soft-tissue lasers.' },
    { title: 'Dental Laboratory', image: '/images/category_instruments.png', desc: 'CAD/CAM milling, digital dental workflows.' }
  ];

  const specialtyCategoryMap: Record<string, string> = {
    'General Dentistry': 'Dental Chairs',
    'Endodontics': 'Advanced Dental Equipment & Accessories',
    'Orthodontics': '3D Oral Scanners',
    'Implantology': 'Dental Handpieces',
    'Oral Surgery': 'Advanced Dental Equipment & Accessories',
    'Dental Laboratory': '3D Oral Scanners'
  };

  // Featured collections
  const collectionsList = [
    { title: 'Best Sellers', tag: 'Top Rated', desc: 'The most preferred choices of premium clinics.', bg: 'from-slate-900 to-slate-800' },
    { title: 'New Launches', tag: 'Latest', desc: 'FAAZO\'s newest clinical breakthroughs and systems.', bg: 'from-[#004e56] to-[#004d54]' },
    { title: 'Most Popular', tag: 'Trending', desc: 'Leading products trending across oral healthcare networks.', bg: 'from-emerald-950 to-emerald-900' },
    { title: 'Premium Equipment', tag: 'Imported', desc: 'Luxury chair suites and 3D diagnostics.', bg: 'from-cyan-950 to-cyan-900' },
    { title: 'Clinical Essentials', tag: 'Consumables', desc: 'Curing lights, handpieces, and daily restorative items.', bg: 'from-[#0f2d30] to-[#0a1e20]' }
  ];

  const filteredCategories = searchQuery.trim()
    ? categoriesList.filter(
        cat =>
          cat.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.subCategories.some(
            sub =>
              sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              sub.subItems.some(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
          )
      )
    : categoriesList;

  // Automatically fallback active category if filter excludes current selection
  useEffect(() => {
    if (isMobile && filteredCategories.length > 0 && !filteredCategories.some(c => c.id === activeMobileCatId)) {
      setActiveMobileCatId(filteredCategories[0].id);
    }
  }, [filteredCategories, activeMobileCatId, isMobile]);

  const activeMobileCat = categoriesList.find(c => c.id === activeMobileCatId) ?? categoriesList[0];

  // Trigger loading for the active category's descendant tree on mobile
  useEffect(() => {
    if (isMobile && activeMobileCat) {
      const isLeafRoot = activeMobileCat.subCategories.length === 0;
      if (isLeafRoot) {
        loadProductsForCategory(activeMobileCat.id);
      } else {
        activeMobileCat.subCategories.forEach(sub => {
          if (sub.subItems && sub.subItems.length > 0) {
            sub.subItems.forEach(child => {
              loadProductsForCategory(child.id);
            });
          } else {
            loadProductsForCategory(sub.id);
          }
        });
      }
    }
  }, [activeMobileCat, isMobile]);

  if (isMobile) {
    const getItemImage = (name: string) => {
      const lower = name.toLowerCase();
      if (lower.includes('handpiece') || lower.includes('oil') || lower.includes('rotary') || lower.includes('file')) {
        return '/images/category_handpieces.png';
      }
      if (lower.includes('chair') || lower.includes('stool') || lower.includes('unit')) {
        return '/images/category_chairs.png';
      }
      if (lower.includes('x-ray') || lower.includes('sensor') || lower.includes('cbct') || lower.includes('opg') || lower.includes('imaging') || lower.includes('sensor')) {
        return '/images/category_imaging.png';
      }
      if (lower.includes('scaler') || lower.includes('apex') || lower.includes('locator') || lower.includes('curing') || lower.includes('light') || lower.includes('motor') || lower.includes('camera') || lower.includes('milling') || lower.includes('cad') || lower.includes('compressor')) {
        return '/images/category_equipment.png';
      }
      if (lower.includes('material') || lower.includes('acrylic') || lower.includes('resin') || lower.includes('plaster') || lower.includes('stone') || lower.includes('alginate') || lower.includes('silicone') || lower.includes('putty') || lower.includes('crown') || lower.includes('dappen') || lower.includes('glass ionomer') || lower.includes('fluoride') || lower.includes('sealant')) {
        return '/images/category_materials.png';
      }
      if (lower.includes('instrument') || lower.includes('suture') || lower.includes('blade') || lower.includes('graft') || lower.includes('implant') || lower.includes('membrane') || lower.includes('pmt') || lower.includes('retractor') || lower.includes('mirror') || lower.includes('holder')) {
        return '/images/category_instruments.png';
      }
      return '/images/category_materials.png';
    };

    const getSubcategoryItems = (sub: any) => {
      const items: any[] = [];
      
      // 1. Add sub-subcategories (if any)
      if (sub.subItems && sub.subItems.length > 0) {
        sub.subItems.forEach((child: any) => {
          const prods = productCache[child.id] || [];
          items.push({
            id: `child-${child.id}`,
            name: child.name,
            image: getItemImage(child.name),
            isProduct: false,
            count: prods.length > 0 ? `${prods.length} items` : null,
            onClick: (e: React.MouseEvent) => {
              e.preventDefault();
              onCategoryClick?.(child.name);
            }
          });
        });
      }

      // 2. Add products directly assigned to this subcategory
      const prods = productCache[sub.id] || [];
      prods.forEach((p: any) => {
        items.push({
          id: `prod-${p.slug}`,
          name: p.name,
          image: getAbsoluteImageUrl(p.primary_image) || (p.images && p.images[0]?.image ? getAbsoluteImageUrl(p.images[0].image) : null) || getItemImage(p.category_name || sub.name),
          isProduct: true,
          onClick: (e: React.MouseEvent) => {
            e.preventDefault();
            if (onProductClick) {
              onProductClick(p.slug);
            } else {
              onCategoryClick?.(sub.name);
            }
          }
        });
      });

      return items;
    };

    const isSubcategoryLoading = (sub: any) => {
      if (sub.subItems && sub.subItems.length > 0) {
        return sub.subItems.some((child: any) => loadingCats[child.id]);
      }
      return loadingCats[sub.id];
    };

    const hasSubcategoryError = (sub: any) => {
      if (sub.subItems && sub.subItems.length > 0) {
        return sub.subItems.some((child: any) => errorCats[child.id]);
      }
      return errorCats[sub.id];
    };

    const retrySubcategoryLoad = (sub: any) => {
      if (sub.subItems && sub.subItems.length > 0) {
        sub.subItems.forEach((child: any) => {
          if (errorCats[child.id]) {
            loadProductsForCategory(child.id);
          }
        });
      } else {
        if (errorCats[sub.id]) {
          loadProductsForCategory(sub.id);
        }
      }
    };

    const renderSkeletons = () => (
      <div className="grid grid-cols-3 gap-x-2 gap-y-4 py-1.5">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex flex-col items-center text-center w-20 h-28 animate-pulse">
            <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200/20 shrink-0" />
            <div className="h-2 w-12 bg-slate-100 rounded mt-2.5" />
            <div className="h-2 w-8 bg-slate-100 rounded mt-1.5" />
          </div>
        ))}
      </div>
    );

    const renderError = (sub: any) => (
      <div className="py-6 px-4 bg-rose-50/50 rounded-xl border border-rose-100/50 text-center space-y-2">
        <p className="text-[11px] font-bold text-rose-600">Failed to load items</p>
        <button
          onClick={() => retrySubcategoryLoad(sub)}
          className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black uppercase tracking-wider transition-all"
        >
          Retry
        </button>
      </div>
    );

    const renderEmptyState = () => (
      <div className="py-10 text-center space-y-1">
        <div className="text-[24px] text-slate-300">📦</div>
        <p className="text-[11px] font-extrabold text-slate-400">No products available</p>
      </div>
    );
    const renderCircularImage = (imageUrl: string, altText: string) => {
      const isPlaceholder = !imageUrl || imageUrl.startsWith('/images/');
      return (
        <div className={`w-14 h-14 rounded-full border border-slate-200/40 bg-[#f4f8f9] flex items-center justify-center overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.02)] group-active:scale-95 transition-transform duration-100 shrink-0 ${
          isPlaceholder ? 'p-1.5' : 'p-0'
        }`}>
          <img
            src={imageUrl || '/images/nsk_handpiece_portrait.png'}
            alt={altText}
            className={`w-full h-full rounded-full ${
              isPlaceholder ? 'object-contain mix-blend-multiply' : 'object-cover'
            } filter brightness-[1.02]`}
          />
        </div>
      );
    };

    // Compute total active items for activeMobileCat using cache or direct counts
    const isLeafRoot = activeMobileCat ? activeMobileCat.subCategories.length === 0 : false;
    const totalMobileItems = isLeafRoot
      ? (productCache[activeMobileCat.id] || []).length
      : activeMobileCat?.subCategories.reduce((acc, sub) => {
          if (sub.subItems && sub.subItems.length > 0) {
            return acc + sub.subItems.reduce((sum, child) => sum + (productCache[child.id] || []).length, 0);
          }
          return acc + (productCache[sub.id] || []).length;
        }, 0);

    return (
      <div className="fixed top-[100px] bottom-[52px] left-0 right-0 bg-white flex flex-col font-sans select-none overflow-hidden">
        {/* Header Search Bar */}
        <div className="p-3 border-b border-slate-100 bg-[#f0f0f0]">
          <div className="flex items-center gap-2 bg-white border border-[#006670]/15 rounded-full px-3.5 py-1.5 focus-within:border-[#006670]/40 transition-all shadow-sm">
            <Search className="w-3.5 h-3.5 text-[#006670] shrink-0" />
            <input
              type="text"
              placeholder="Search Category"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[12px] w-full text-slate-700 placeholder-slate-400 font-semibold"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 font-sans text-xs">Clear</button>
            )}
          </div>
        </div>

        {/* 2-Column Split View */}
        <div className="flex-grow flex overflow-hidden" style={{ minHeight: 0 }}>
          
          {/* Left Column: Categories Sidebar */}
          <div 
            className="w-[100px] shrink-0 bg-[#f8fafb] border-r border-slate-100 overflow-y-auto no-scrollbar flex flex-col py-1 pb-16 overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
          >
            {filteredCategories.map(cat => {
              const isActive = cat.id === activeMobileCatId;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveMobileCatId(cat.id)}
                  className={`
                    flex flex-col items-center justify-center text-center px-1.5 py-3 gap-1.5 w-full border-b border-slate-200/20
                    transition-all duration-150 cursor-pointer
                    ${isActive
                      ? 'bg-white text-[#006670] font-black border-l-3 border-[#006670]'
                      : 'text-slate-500 font-bold border-l-3 border-transparent hover:bg-slate-50/50'
                    }
                  `}
                >
                  <span className={`
                    w-6.5 h-6.5 rounded-full flex items-center justify-center shrink-0 transition-colors
                    ${isActive ? 'bg-[#cccccc] text-[#006670]' : 'bg-[#e0e0e0] text-slate-500'}
                  `}>
                    {getCategoryIcon(cat.slug || cat.id)}
                  </span>
                  <span className="text-[10px] leading-tight font-sans tracking-wide">{cat.label}</span>
                </button>
              );
            })}
            {filteredCategories.length === 0 && (
              <div className="py-8 text-center text-[10px] text-slate-400 font-sans">No results</div>
            )}
          </div>

          {/* Right Column: Subcategories & Sub-items */}
          <div
            ref={rightPanelRef}
            className="flex-grow bg-white overflow-y-auto no-scrollbar p-3.5 pb-20 text-left overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
          >
            {/* Promo banner matching Myntra/Flipkart design */}
            <div className="relative w-full h-[84px] rounded-xl overflow-hidden mb-4 bg-gradient-to-r from-[#004d54] to-[#006670] p-3 flex items-center justify-between text-white shadow-[0_4px_12px_rgba(0,77,84,0.06)]">
              <div className="text-left max-w-[65%] z-10">
                <span className="text-[8px] font-black uppercase tracking-widest text-[#F58734]">FAAZO Special</span>
                <h4 className="text-[11px] font-black leading-tight mt-0.5">{activeMobileCat?.label}</h4>
                <p className="text-[9px] text-teal-100/80 font-sans mt-0.5 leading-none">CLINICAL EXCELLENCE</p>
              </div>
              <div className="w-[35%] h-full relative flex items-center justify-center">
                <img
                  src={getItemImage(activeMobileCat?.label || '')}
                  alt={activeMobileCat?.label}
                  className="max-w-[120%] max-h-[120%] object-contain absolute -right-2 bottom-0 z-0 select-none mix-blend-multiply brightness-[1.05]"
                />
              </div>
            </div>

            <div className="mb-3.5 pb-2 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[13px] font-black text-slate-800 tracking-tight font-display">{activeMobileCat?.label}</h3>
              <span className="bg-[#e6f3f5] text-[#006670] text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                {totalMobileItems} Items
              </span>
            </div>

            <div className="space-y-6">
              {isLeafRoot ? (
                /* Render leaf root items directly (e.g. iphone) */
                <>
                  {loadingCats[activeMobileCat.id] ? (
                    renderSkeletons()
                  ) : errorCats[activeMobileCat.id] ? (
                    renderError(activeMobileCat)
                  ) : (
                    <div className="grid grid-cols-3 gap-x-2 gap-y-4 py-1.5">
                      {(productCache[activeMobileCat.id] || []).map((p: any) => (
                        <a
                          key={p.id || p.slug}
                          href={`#product-${p.slug}`}
                          onClick={(e) => {
                            e.preventDefault();
                            if (onProductClick) onProductClick(p.slug);
                          }}
                          className="flex flex-col items-center text-center group cursor-pointer w-20 h-28"
                        >
                          {renderCircularImage(
                            getAbsoluteImageUrl(p.primary_image) || (p.images && p.images[0]?.image ? getAbsoluteImageUrl(p.images[0].image) : null) || getItemImage(p.category_name || ''),
                            p.name
                          )}
                          <span className="text-[10px] leading-tight font-extrabold text-slate-600 mt-2 line-clamp-2 w-full px-0.5 tracking-tight group-active:text-[#006670] transition-colors">
                            {p.name}
                          </span>
                        </a>
                      ))}
                      {(!productCache[activeMobileCat.id] || productCache[activeMobileCat.id].length === 0) && renderEmptyState()}
                    </div>
                  )}
                </>
              ) : (
                /* Render normal subcategories and their products/sub-subcategories */
                activeMobileCat?.subCategories.map((sub, idx) => {
                  const items = getSubcategoryItems(sub);
                  return (
                    <div key={idx} className="space-y-2.5">
                      {/* Subcategory title */}
                      <div
                        onClick={() => onCategoryClick?.(sub.name)}
                        className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-md border border-slate-100/50 cursor-pointer active:scale-[0.98] transition-all"
                      >
                        <span className="text-[11px] font-extrabold text-[#006670] hover:underline">{sub.name}</span>
                        <span className="text-[9px] font-bold text-slate-400">
                          {isSubcategoryLoading(sub) ? 'Loading...' : `${items.length} items`}
                        </span>
                      </div>

                      {/* Content Area */}
                      {isSubcategoryLoading(sub) ? (
                        renderSkeletons()
                      ) : hasSubcategoryError(sub) ? (
                        renderError(sub)
                      ) : items.length === 0 ? (
                        renderEmptyState()
                      ) : (
                        <div className="grid grid-cols-3 gap-x-2 gap-y-4 py-1.5">
                          {items.map((item) => (
                            <a
                              key={item.id}
                              href={item.isProduct ? `#product-${item.id}` : '#products'}
                              onClick={item.onClick}
                              className="flex flex-col items-center text-center group cursor-pointer w-20 h-28"
                            >
                              {renderCircularImage(item.image, item.name)}
                              <span className="text-[10px] leading-tight font-extrabold text-slate-600 mt-2 line-clamp-2 w-full px-0.5 tracking-tight group-active:text-[#006670] transition-colors">
                                {item.name}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FAFBFB] pt-[108px] lg:pt-[180px] text-slate-800 select-none overflow-x-hidden font-sans">

      {/* 1. Premium Hero Section with Full-Bleed Background Image */}
      <section className="relative w-full overflow-hidden select-none bg-white">

        {/* Full-width Image element - Crystal Clear, No foggy overlays */}
        <div className="w-full h-[50vh] md:h-auto relative z-10 max-w-none bg-white">
          <img
            src="/images/product_page.png"
            alt="FAAZO Premium Dental Showcase"
            style={{ objectPosition: isMobile ? 'center center' : 'center center' }}
            className="w-full h-full md:h-auto object-cover max-h-[750px] lg:max-h-[820px] block opacity-100 filter brightness-100 contrast-100"
          />
          {/* Subtle bottom edge-blending gradient to merge with light background content below */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none z-15" />
        </div>

        {/* Actions Dock (Centered below the image on desktop, below the image on mobile) */}
        <div className="relative z-30 flex flex-col sm:flex-row items-center justify-center gap-2.5 md:gap-3 bg-transparent md:bg-white/75 backdrop-none md:backdrop-blur-lg p-0 md:px-6 md:py-3.5 rounded-none md:rounded-full border-none md:border md:border-slate-200/50 shadow-none md:shadow-[0_8px_30px_rgba(0,0,0,0.04)] mx-auto my-5 md:my-8 max-w-[85%] sm:max-w-max">
          <button
            onClick={scrollPortfolio}
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-1 px-3.5 py-1.5 md:px-6 md:py-3 rounded-full bg-[#006670] hover:bg-[#004e56] text-white text-[9.5px] md:text-xs tracking-wider font-extrabold uppercase transition-all cursor-pointer whitespace-nowrap"
          >
            Explore Portfolio
            <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            onClick={() => window.location.href = 'tel:+919876543210'}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-3.5 py-1.5 md:px-6 md:py-3 rounded-full bg-white hover:bg-slate-50 text-[#006670] border border-slate-200 text-[9.5px] md:text-xs tracking-wider font-extrabold uppercase transition-all cursor-pointer whitespace-nowrap"
          >
            Talk to an Expert
          </button>
        </div>

      </section>

      {/* 2. Portfolio Overview Section */}
      <section ref={portfolioRef} className="w-full py-16 bg-white border-t border-slate-100 select-none">
        <div className="max-w-7xl mx-auto px-4 md:px-12 text-left">

          {/* Header */}
          <div className="mb-14 max-w-2xl">
            <span className="block text-[11px] font-extrabold tracking-[0.25em] text-[#006670] uppercase mb-3 font-sans">
              PORTFOLIO ARCHITECTURE
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-[46px] font-black text-slate-900 tracking-tight leading-tight mb-4">
              Explore Our Dental Technology Ecosystem
            </h2>
            <p className="text-sm md:text-base text-slate-500 font-semibold">
              Browse our clinical portfolio categories structured to suit high-fidelity restorative dentistry, surgical workflows, and oral diagnostics.
            </p>
          </div>

          {/* Collection One: Manufactured Under FAAZO */}
          <div className="mb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-100 pb-5 mb-8">
              <div className="text-left">
                <span className="inline-block px-3 py-0.5 text-[9px] font-black tracking-widest text-[#006670] bg-[#e6f3f5] border border-[#006670]/15 rounded-full uppercase mb-2">
                  Designed & Manufactured by FAAZO
                </span>
                <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight font-display">
                  Manufactured Under FAAZO
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-400 font-semibold mt-2 md:mt-0 max-w-md md:text-right leading-relaxed">
                Precision engineering and dental components crafted in our local high-tech cleanroom facility.
              </p>
            </div>

            {/* Category Cards Grid (3 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {manufacturedCategories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => onCategoryClick?.(cat.id)}
                  className="group bg-[#F8FAFB] rounded-[24px] border border-slate-100/50 p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0, 43, 46,0.04)] hover:border-[#006670]/15"
                >
                  <div>
                    {/* Image floats directly on the card background */}
                    <div className="aspect-square flex items-center justify-center relative mb-5">
                      <img
                        src={cat.image}
                        alt={cat.title}
                        className="max-w-[90%] max-h-[90%] object-contain mix-blend-multiply filter brightness-[1.04] contrast-[1.02] transform transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <span className="absolute top-0 left-0 px-2.5 py-0.5 text-[8px] font-bold bg-[#FAFBFB] text-[#006670] rounded-full uppercase tracking-wider border border-[#006670]/5">
                        {cat.count}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-slate-800 group-hover:text-[#006670] transition-colors tracking-tight font-display">
                      {cat.title}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                      {cat.desc}
                    </p>
                  </div>

                  <div className="w-full py-3 mt-5 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-semibold rounded-full flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-xs hover:shadow-md">
                    Explore Collection
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Collection Two: Imported Dental Equipment */}
          <div>
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-100 pb-5 mb-8">
              <div className="text-left">
                <span className="inline-block px-3 py-0.5 text-[9px] font-black tracking-widest text-[#006670] bg-[#e6f3f5] border border-[#006670]/15 rounded-full uppercase mb-2">
                  Authorized Global Brands
                </span>
                <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight font-display">
                  Imported Dental Equipment
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-400 font-semibold mt-2 md:mt-0 max-w-md md:text-right leading-relaxed">
                Volumetric diagnostic suites, advanced patient chairs, and logistics tools imported from authorized international partners.
              </p>
            </div>

            {/* Category Cards Grid (4 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {importedCategories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => onCategoryClick?.(cat.id)}
                  className="group bg-[#F8FAFB] rounded-[24px] border border-slate-100/50 p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0, 43, 46,0.04)] hover:border-[#006670]/15"
                >
                  <div>
                    {/* Image floats directly on the card background */}
                    <div className="aspect-square flex items-center justify-center relative mb-4.5">
                      <img
                        src={cat.image}
                        alt={cat.title}
                        className="max-w-[85%] max-h-[85%] object-contain mix-blend-multiply filter brightness-[1.04] contrast-[1.02] transform transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <span className="absolute top-0 left-0 px-2 py-0.5 text-[8px] font-bold bg-[#FAFBFB] text-[#006670] rounded-full uppercase tracking-wider border border-[#006670]/5">
                        {cat.count}
                      </span>
                    </div>

                    <h4 className="text-[14.5px] font-black text-slate-800 group-hover:text-[#006670] transition-colors tracking-tight font-display line-clamp-1">
                      {cat.title}
                    </h4>
                    <p className="text-[11.5px] text-slate-500 font-medium mt-1.5 leading-relaxed line-clamp-3">
                      {cat.desc}
                    </p>
                  </div>

                  <div className="w-full py-3 mt-5 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-semibold rounded-full flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-xs hover:shadow-md">
                    Explore Collection
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* 3. Why Choose FAAZO Section (Premium Trust) */}
      <section className="w-full py-16 bg-[#FAFBFB] border-t border-b border-slate-100 select-none">
        <div className="max-w-7xl mx-auto px-4 md:px-12 text-left">

          {/* Header */}
          <div className="mb-12 max-w-2xl">
            <span className="block text-[11px] font-extrabold tracking-[0.25em] text-[#006670] uppercase mb-3 font-sans">
              UNCOMPROMISING STANDARDS
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight font-display mb-4">
              Designed for Clinical Excellence
            </h2>
            <p className="text-sm text-slate-500 font-semibold">
              Why dental professionals and medical networks trust FAAZO as their primary technology integration partner.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trustPillars.map((pt, i) => (
              <div
                key={i}
                className="bg-white/85 backdrop-blur-md rounded-2xl p-5.5 border border-slate-200/50 shadow-[0_4px_25px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_35px_rgba(0, 43, 46,0.04)] transition-all duration-300"
              >
                <div className="w-9 h-9 rounded-xl bg-[#e6f3f5]/80 flex items-center justify-center mb-4 border border-[#006670]/10">
                  {pt.icon}
                </div>
                <h4 className="text-[13.5px] font-black text-slate-800 tracking-tight mb-1.5 font-display">
                  {pt.title}
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {pt.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 4. Featured Brands Logo Wall */}
      <section className="w-full py-14 bg-white select-none">
        <div className="max-w-7xl mx-auto px-4 md:px-12 text-center">
          <span className="block text-[10px] font-extrabold tracking-[0.2em] text-slate-400 uppercase mb-8">
            AUTHORIZED GLOBAL BRANDS & COMPATIBILITY
          </span>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 items-center justify-items-center">
            {[
              { component: <BrandNSK />, id: 'nsk' },
              { component: <BrandWoodpecker />, id: 'woodpecker' },
              { component: <BrandPlanmeca />, id: 'planmeca' },
              { component: <Brand3M />, id: '3m' },
              { component: <BrandEMS />, id: 'ems' },
              { component: <BrandIvoclar />, id: 'ivoclar' },
              { component: <BrandColtene />, id: 'coltene' },
              { component: <BrandDentsply />, id: 'dentsply' }
            ].map((brand) => (
              <div
                key={brand.id}
                className="w-full h-16 bg-[#FAFBFB] hover:bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center p-3 filter grayscale contrast-[0.8] brightness-[1.04] opacity-50 hover:grayscale-0 hover:contrast-100 hover:brightness-100 hover:opacity-100 transition-all duration-400 cursor-pointer"
              >
                {brand.component}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Clinical Solutions Supported Section */}
      <section className="w-full py-16 bg-white border-t border-b border-slate-100 select-none">
        <div className="max-w-7xl mx-auto px-4 md:px-12 text-left">

          <style>{`
            .specialties-track {
              --card-shift: calc(100% + 24px);
            }
            @media (min-width: 640px) {
              .specialties-track {
                --card-shift: calc(50% + 12px);
              }
            }
            @media (min-width: 1024px) {
              .specialties-track {
                --card-shift: calc(33.333% + 8px);
              }
            }
          `}</style>

          {/* Header */}
          <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="block text-[11px] font-extrabold tracking-[0.25em] text-[#006670] uppercase mb-3 font-sans">
                SPECIALTY INTEGRATION
              </span>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight font-display mb-2">
                Supported Clinical Specialties
              </h2>
              <p className="text-sm text-slate-500 font-semibold">
                Device sets curated precisely for specific dental workflows and patient operations.
              </p>
            </div>

            <div className="flex items-center gap-4 mt-2 md:mt-0">
              <button
                onClick={() => setCurrentView?.('home')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#006670] hover:text-[#004e56] cursor-pointer"
              >
                Learn About Workflows
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Navigation Arrows */}
              <div className="flex items-center gap-2">
                <button
                  onClick={prevSlide}
                  className="w-8 h-8 rounded-full border border-slate-200 hover:border-[#006670] flex items-center justify-center text-slate-500 hover:text-[#006670] transition-all hover:bg-[#e6f3f5]/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextSlide}
                  className="w-8 h-8 rounded-full border border-slate-200 hover:border-[#006670] flex items-center justify-center text-slate-500 hover:text-[#006670] transition-all hover:bg-[#e6f3f5]/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={currentIndex >= maxIndex}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Carousel Slider (move to left one-by-one, kept bigger) */}
          <div className="overflow-hidden w-full py-2">
            <div
              className="flex gap-6 transition-transform duration-500 ease-out specialties-track"
              style={{ transform: `translateX(calc(-${currentIndex} * var(--card-shift)))` }}
            >
              {clinicalSpecialties.map((spec, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    const targetCat = specialtyCategoryMap[spec.title] || spec.title;
                    onCategoryClick?.(targetCat);
                  }}
                  className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] flex-shrink-0 group bg-[#F8FAFB] rounded-2xl border border-slate-100 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-[0_12px_35px_rgba(0, 43, 46,0.03)] hover:border-[#006670]/15 cursor-pointer hover:-translate-y-1"
                >
                  <div className="aspect-[4/3] w-full relative flex items-center justify-center p-4 bg-white border-b border-slate-100/60">
                    <img
                      src={spec.image}
                      alt={spec.title}
                      className="max-w-[85%] max-h-[85%] object-contain mix-blend-multiply filter brightness-[1.04] contrast-[1.02] transform transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>

                  <div className="p-5 text-left flex-grow flex flex-col justify-between">
                    <div>
                      <h4 className="text-[13.5px] font-black text-slate-800 tracking-tight font-display mb-1.5 line-clamp-1">
                        {spec.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        {spec.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* 6. Featured Collections Section (Banners - not grids) */}
      <section className="w-full py-16 bg-white select-none">
        <div className="max-w-7xl mx-auto px-4 md:px-12 text-left">

          {/* Header */}
          <div className="mb-10">
            <span className="block text-[11px] font-extrabold tracking-[0.25em] text-[#006670] uppercase mb-3 font-sans">
              CURATED SUITES
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight font-display mb-2">
              Featured Clinical Collections
            </h2>
            <p className="text-sm text-slate-500 font-semibold">
              Explore hardware suites assembled by clinical experts for common setup scopes.
            </p>
          </div>

          {/* Horizontal scrollable flex on mobile, Grid on desktop */}
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-none md:grid md:grid-cols-5 md:overflow-visible">
            {collectionsList.map((col, idx) => (
              <div
                key={idx}
                onClick={() => {
                  let target = col.title;
                  if (col.title === 'Most Popular') target = 'Best Sellers';
                  if (col.title === 'Premium Equipment') target = 'Dental Chairs';
                  if (col.title === 'Clinical Essentials') target = 'Dental Handpieces';
                  onCategoryClick?.(target);
                }}
                className={`min-w-[240px] md:min-w-0 bg-gradient-to-br ${col.bg} rounded-[20px] p-6 text-white flex flex-col justify-between min-h-[220px] shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 cursor-pointer`}
              >
                <div>
                  <span className="inline-block bg-white/15 backdrop-blur-md text-[9px] font-extrabold tracking-wider px-2.5 py-0.5 rounded-full uppercase mb-4">
                    {col.tag}
                  </span>
                  <h4 className="text-base font-black tracking-tight font-display mb-1.5 leading-snug">
                    {col.title}
                  </h4>
                  <p className="text-[11px] text-white/70 font-sans leading-relaxed">
                    {col.desc}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-[9px] font-extrabold tracking-widest uppercase text-white/95 mt-4">
                  Browse Suite
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>



    </div>
  );
};

export default ProductsLandingPage;
