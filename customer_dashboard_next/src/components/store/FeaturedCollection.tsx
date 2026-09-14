'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';

export interface CollectionItem {
  id: string;
  product: string;
  product_name: string;
  product_slug: string;
  product_image: string | null;
  pricing?: {
    effective_price?: string;
    selling_price?: string;
    mrp?: string;
    discount_percentage?: number;
  };
}

export interface CollectionData {
  id: string;
  title: string;
  description: string;
  image?: string | null;
  image_url?: string | null;
  is_visible?: boolean;
  items?: CollectionItem[];
}

interface FeaturedCollectionProps {
  initialCollections?: CollectionData[];
}

const FeaturedCollection: React.FC<FeaturedCollectionProps> = ({ initialCollections }) => {
  const getVisibleList = (list?: CollectionData[]) => {
    if (!Array.isArray(list)) return [];
    return list.filter((c) => c.is_visible !== false);
  };

  const [collections, setCollections] = useState<CollectionData[]>(() => getVisibleList(initialCollections));
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const visible = getVisibleList(initialCollections);
    return visible[0]?.id || null;
  });
  const [hasLoaded, setHasLoaded] = useState<boolean>(initialCollections !== undefined);

  useEffect(() => {
    api.get('homepage/featured-collections/')
      .then(res => {
        const data = res.data?.data ?? res.data?.results ?? res.data ?? [];
        const visible = getVisibleList(data);
        setCollections(visible);
        setSelectedId(prev => (visible.some(c => c.id === prev) ? prev : visible[0]?.id || null));
        setHasLoaded(true);
      })
      .catch(() => {
        setHasLoaded(true);
      });
  }, []);

  // If the data has loaded and no collection is marked visible, don't show the section
  if (hasLoaded && collections.length === 0) {
    return null;
  }

  const activeCollection = collections.find(c => c.id === selectedId) || collections[0] || null;
  const displayTitle = activeCollection?.title || "Advanced Solutions for Every Practice";
  const displayDescription = activeCollection?.description || "Engineered for precision. Designed for comfort. Built to elevate patient care. Experience the future of clinical operation.";
  const collectionImage = activeCollection?.image_url || activeCollection?.image || '/images/hero_equipment.png';

  return (
    <>
      {/* Desktop view */}
      <section className="hidden lg:block max-w-[1400px] mx-auto px-6 py-12 select-none" id="featured-collection">
        <div className="bg-gradient-mint rounded-3xl overflow-hidden border border-[#E2EBEA] grid grid-cols-12 items-center min-h-[460px] p-2 relative shadow-sm hover:shadow-md transition-shadow">
          
          {/* Left Column: Content */}
          <div className="col-span-5 min-w-0 p-10 text-left flex flex-col items-start justify-between h-full z-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#006670]/10 border border-[#006670]/20">
                  <Sparkles className="w-3.5 h-3.5 text-[#006670]" />
                  <span className="text-[11px] font-extrabold text-[#006670] tracking-widest uppercase font-sans">
                    FEATURED COLLECTION
                  </span>
                </div>

                {/* Multiple collection pills if more than 1 visible */}
                {collections.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-[280px]">
                    {collections.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-full transition-all cursor-pointer truncate max-w-[120px] ${
                          c.id === (activeCollection?.id || '')
                            ? 'bg-[#006670] text-white shadow-sm'
                            : 'bg-white/80 text-slate-700 hover:bg-white border border-[#E2EBEA]'
                        }`}
                      >
                        {c.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <h2 className="text-4xl font-black text-slate-800 tracking-tight font-display mb-4 leading-tight break-words w-full line-clamp-2">
                {displayTitle}
              </h2>
              <p className="text-base text-slate-600 mb-8 max-w-md font-medium leading-relaxed break-words w-full line-clamp-3">
                {displayDescription}
              </p>
            </div>
            
            <Link 
              href="/offers"
              className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#006670] hover:bg-[#004e56] text-white text-sm font-bold shadow-md hover:shadow-premium transition-all cursor-pointer"
            >
              Explore Collection
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Right Column: Visual Rendering */}
          <div className="col-span-7 min-w-0 h-full w-full flex justify-center items-center relative p-8">
            {/* Accent lighting sphere */}
            <div className="absolute w-[70%] aspect-square rounded-full bg-white/45 blur-3xl -z-10" />
            
            <img 
              src={collectionImage} 
              alt={displayTitle} 
              className="w-full max-w-[500px] h-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.06)] transform hover:scale-[1.02] transition-transform duration-500"
            />
          </div>

        </div>
      </section>

      {/* Mobile view */}
      <section className="block lg:hidden w-full px-4 py-6 select-none" id="featured-collection-mobile">
        <div className="bg-gradient-mint rounded-2xl border border-[#E2EBEA] p-6 flex flex-col items-start text-left w-full overflow-hidden min-h-[480px] justify-between shadow-sm">
          <div className="w-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#006670]/10 border border-[#006670]/20">
                <Sparkles className="w-3 h-3 text-[#006670]" />
                <span className="text-[10px] font-extrabold text-[#006670] tracking-widest uppercase font-sans">
                  FEATURED COLLECTION
                </span>
              </div>

              {collections.length > 1 && (
                <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-[180px]">
                  {collections.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-all cursor-pointer truncate max-w-[90px] ${
                        c.id === (activeCollection?.id || '')
                          ? 'bg-[#006670] text-white shadow-sm'
                          : 'bg-white/80 text-slate-700 hover:bg-white border border-[#E2EBEA]'
                      }`}
                    >
                      {c.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight font-display mb-3 leading-tight break-words w-full line-clamp-2">
              {displayTitle}
            </h2>
            <p className="text-xs text-slate-600 mb-6 font-medium leading-relaxed font-sans break-words w-full line-clamp-3">
              {displayDescription}
            </p>
          </div>
          
          <div className="w-full">
            <Link 
              href="/offers"
              className="group inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-full bg-[#006670] hover:bg-[#004e56] text-white text-xs font-bold shadow-md transition-all cursor-pointer mb-5"
            >
              Explore Collection
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Image visual */}
            <div className="w-full flex justify-center items-center relative py-2 bg-white/40 rounded-xl">
              <img 
                src={collectionImage} 
                alt={displayTitle} 
                className="w-full max-w-[260px] h-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default FeaturedCollection;

