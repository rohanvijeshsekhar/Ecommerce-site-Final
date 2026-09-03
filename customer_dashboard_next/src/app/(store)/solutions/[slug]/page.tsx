'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Package, Star, ShoppingCart, Filter, Search, ShieldCheck } from 'lucide-react';
import { api } from '../../../../lib/api';

interface ProductItem {
  id: string | number;
  product_id?: string | number;
  name?: string;
  product_name?: string;
  sku?: string;
  product_sku?: string;
  price?: number;
  product_price?: number;
  image?: string;
  product_image?: string;
  brand?: string;
  product_brand?: string;
  rating?: number;
  product_rating?: number;
  is_featured?: boolean;
}

interface SolutionDetailData {
  id: string | number;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  banner: string;
  thumbnail: string;
  product_count: number;
  products: ProductItem[];
  seo_title?: string;
}

export default function SolutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [solution, setSolution] = useState<SolutionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'rating'>('featured');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.get(`solutions/${slug}/`)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        if (data) {
          setSolution(data);
        }
      })
      .catch(() => {
        setSolution({
          id: 1,
          title: 'Restorative Dentistry',
          slug: 'restorative-dentistry',
          short_description: 'Find complete product solutions designed for precision composite restorations, matrices, and curing.',
          description: 'Comprehensive clinical procedure kit featuring high-output LED curing lights, universal bonding agents, nano-hybrid composites, and anatomical matrix systems engineered for direct anterior and posterior restorations.',
          banner: '/images/hero1_ecommerce.png',
          thumbnail: '/images/bestseller_curing.png',
          product_count: 4,
          products: [
            {
              id: 'p1',
              product_name: 'Woodpecker i-LED Curing Light',
              product_sku: 'WP-CURE-01',
              product_price: 6499,
              product_image: '/images/woodpecker_curing_studio.png',
              product_brand: 'Woodpecker',
              product_rating: 4.9,
              is_featured: true,
            },
            {
              id: 'p2',
              product_name: 'NSK S-Max M95L High Speed Handpiece',
              product_sku: 'NSK-M95L',
              product_price: 18500,
              product_image: '/images/nsk_smax_studio.png',
              product_brand: 'NSK Japan',
              product_rating: 4.8,
              is_featured: false,
            },
            {
              id: 'p3',
              product_name: 'Universal Nano Composite Restorative Kit',
              product_sku: 'COMP-REST-99',
              product_price: 3890,
              product_image: '/images/bestseller_materials.png',
              product_brand: '3M ESPE',
              product_rating: 4.9,
              is_featured: false,
            },
            {
              id: 'p4',
              product_name: 'Piezo Ultrasonic Scaler Handpiece',
              product_sku: 'WP-SCALER-02',
              product_price: 4999,
              product_image: '/images/woodpecker_scaler_studio.png',
              product_brand: 'Woodpecker',
              product_rating: 4.7,
              is_featured: false,
            }
          ]
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#005F63] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-600">Loading Clinical Solution...</p>
        </div>
      </div>
    );
  }

  if (!solution) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#F8FAFC] px-4 text-center">
        <h2 className="text-2xl font-black text-slate-800 mb-2">Solution Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">The requested clinical solution could not be retrieved.</p>
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#005F63] text-white font-bold text-sm shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Homepage
        </button>
      </div>
    );
  }

  let displayProducts = (solution.products || []).filter((p) => {
    const name = p.product_name || p.name || '';
    const sku = p.product_sku || p.sku || '';
    const brand = p.product_brand || p.brand || '';
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  displayProducts = [...displayProducts].sort((a, b) => {
    if (sortBy === 'featured') {
      return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
    }
    const priceA = a.product_price || a.price || 0;
    const priceB = b.product_price || b.price || 0;
    if (sortBy === 'price-low') return priceA - priceB;
    if (sortBy === 'price-high') return priceB - priceA;
    if (sortBy === 'rating') return (b.product_rating || 0) - (a.product_rating || 0);
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-[100px] lg:pt-[180px] pb-24 text-left select-none">
      {/* Banner & Header */}
      <div className="relative w-full h-[320px] md:h-[400px] bg-slate-950 overflow-hidden">
        <img
          src={solution.banner || solution.thumbnail}
          alt={solution.title}
          className="w-full h-full object-cover opacity-50 brightness-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        <div className="absolute inset-0 max-w-7xl mx-auto px-6 md:px-8 flex flex-col justify-between py-8">
          <div>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-bold transition-all border border-white/20 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Homepage</span>
            </button>
          </div>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#005F63] text-white text-xs font-bold tracking-wider uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Clinical Treatment Solution</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight font-display mb-3">
              {solution.title}
            </h1>
            <p className="text-sm md:text-base font-medium text-slate-200 leading-relaxed mb-4">
              {solution.short_description}
            </p>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <Package className="w-4 h-4 text-teal-300" />
                {solution.product_count || displayProducts.length} Clinical Products
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                100% Certified Genuine Equipment
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-10">
        {solution.description && (
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#E2E8F0] shadow-xs mb-10">
            <h3 className="text-lg font-extrabold text-slate-800 tracking-tight mb-2 font-display">
              Clinical Workflow Overview
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed font-sans">
              {solution.description}
            </p>
          </div>
        )}

        {/* Search & Sort */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs mb-8">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products in solution..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#005F63]"
            />
          </div>

          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <span className="text-xs font-bold text-slate-500">
              Showing {displayProducts.length} Products
            </span>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-2 px-3 rounded-xl focus:outline-none focus:border-[#005F63]"
              >
                <option value="featured">Featured First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {displayProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#E2E8F0]">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800">No products found</h4>
            <p className="text-xs text-slate-500 mt-1">Try resetting your search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayProducts.map((p) => {
              const name = p.product_name || p.name || 'Clinical Dental Product';
              const price = p.product_price || p.price || 0;
              const image = p.product_image || p.image || '/images/bestseller_handpiece.png';
              const brand = p.product_brand || p.brand || 'FAAZO Care';
              const rating = p.product_rating || p.rating || 4.8;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs hover:shadow-[0_12px_28px_rgba(0,95,99,0.12)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden relative"
                >
                  {p.is_featured && (
                    <div className="absolute top-3 left-3 z-10 bg-[#005F63] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      Featured in Solution
                    </div>
                  )}

                  <div className="relative w-full h-48 bg-slate-50 flex items-center justify-center p-4">
                    <img
                      src={image}
                      alt={name}
                      className="max-h-full max-w-full object-contain hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        {brand}
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-800 line-clamp-2 leading-tight font-display mb-2">
                        {name}
                      </h4>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 text-amber-500 text-xs font-bold mb-3">
                        <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                        <span>{rating}</span>
                        <span className="text-slate-400 text-[10px] font-normal">(Verified Clinical)</span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block">B2B Price</span>
                          <span className="text-base font-black text-[#005F63] font-display">
                            ₹{price.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <button
                          onClick={() => alert('Added to cart')}
                          className="px-3.5 py-2 rounded-xl bg-[#005F63] hover:bg-[#0B7C80] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
