'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { getCategoryIcon } from './CategoryMegaMenu';
import { useCategories } from '../../hooks/useCategories';
import { api, getAbsoluteImageUrl } from '../../lib/api';

interface ProductsLandingPageProps {
  onCategoryClick?: (categoryName: string) => void;
  setCurrentView?: (view: 'home' | 'portfolio' | 'listing' | 'detail') => void;
  onProductClick?: (productId: string) => void;
}

const ProductsLandingPage: React.FC<ProductsLandingPageProps> = ({
  onCategoryClick,
  onProductClick
}) => {
  const rightPanelRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const updateVisible = () => {
      setIsMobile(window.innerWidth < 768);
    };
    updateVisible();
    window.addEventListener('resize', updateVisible);
    return () => window.removeEventListener('resize', updateVisible);
  }, []);

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

  if (!isMobile) {
    return null;
  }

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
};

export default ProductsLandingPage;
