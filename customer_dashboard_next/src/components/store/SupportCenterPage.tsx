'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Headphones,
  Package,
  RotateCcw,
  CreditCard,
  Wrench,
  MessageCircle,
  Phone,
  Mail,
  Clock,
  Sparkles,
  ShieldCheck,
  Loader2,
  HelpCircle,
  ChevronRight,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { supportService, FAQItem, FAQCategory } from '@/lib/services/supportService';
import { FaqCard } from './FaqCard';
import { useAuth } from '@/hooks/useAuth';
import { ordersService } from '@/lib/services/ordersService';

export const SupportCenterPage: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [featuredFaqs, setFeaturedFaqs] = useState<FAQItem[]>([]);
  const [searchResults, setSearchResults] = useState<FAQItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [latestOrderNumber, setLatestOrderNumber] = useState<string | null>(null);

  // Fetch FAQs from API
  const fetchFaqs = async () => {
    setLoading(true);
    try {
      if (searchQuery.trim()) {
        const res = await supportService.getFaqs({ search: searchQuery.trim() });
        setSearchResults(res.items || []);
      } else {
        const res = await supportService.getFaqs({ category: selectedCategory !== 'all' ? selectedCategory : undefined });
        setFeaturedFaqs(res.featured_faqs || []);
        setCategories(res.categories || []);
        setSearchResults([]);
      }
    } catch (e) {
      console.error('Error fetching FAQs:', e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch latest order number for pre-filled WhatsApp message
  const fetchLatestOrder = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await ordersService.getOrders({ page_size: 1 });
      if (res.data && res.data.length > 0) {
        setLatestOrderNumber(res.data[0].order_number);
      }
    } catch (e) {
      console.error('Error fetching latest order:', e);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    fetchLatestOrder();
  }, [isAuthenticated]);

  const handleActionClick = (actionType?: string, targetUrl?: string) => {
    if (targetUrl) {
      router.push(targetUrl);
    } else {
      router.push('/orders');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-left select-none pb-16 font-sans">
      
      {/* ── 1. Hero Header & Live Search Bar ── */}
      <section className="relative bg-gradient-to-br from-[#004E56] via-[#006670] to-[#003B41] text-white pt-20 md:pt-24 lg:pt-28 pb-20 px-4 md:px-12 overflow-hidden shadow-lg">
        {/* Background Decorative Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_60%)] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-teal-200 text-xs font-extrabold tracking-wider uppercase backdrop-blur-sm">
            <Headphones className="w-3.5 h-3.5" />
            <span>Tier-1 Customer Support Center</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight font-display text-white">
            How can we help you today?
          </h1>

          <p className="text-xs md:text-sm text-teal-100/90 font-medium max-w-xl mx-auto leading-relaxed">
            Search our instant self-service answers or select a topic below. Real-time order tracking, returns, and payment assistance.
          </p>

          {/* Live Search Input Bar */}
          <div className="relative max-w-2xl mx-auto mt-6">
            <div className="relative flex items-center bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/40 p-1.5 transition-all focus-within:ring-4 focus-within:ring-teal-400/30">
              <Search className="w-5 h-5 text-slate-400 ml-4 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics (e.g. 'Where is my order', 'Payment failed', 'Return')..."
                className="w-full px-4 py-3 text-xs md:text-sm text-slate-900 font-medium placeholder-slate-400 bg-transparent outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mr-3 px-2 py-1 text-xs font-bold text-slate-400 hover:text-slate-600 rounded-md"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Top Quick Action Grid Cards ── */}
      <section className="max-w-5xl mx-auto px-4 md:px-12 -mt-10 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Card 1: Track Order */}
          <button
            onClick={() => router.push('/orders')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md hover:shadow-xl hover:border-teal-400 transition-all text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 mb-3 group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
              Track My Order
            </h4>
            <p className="text-[11px] text-slate-500 font-medium mt-1 leading-tight">
              Real-time courier & shipment status
            </p>
          </button>

          {/* Card 2: Returns & Refunds */}
          <button
            onClick={() => router.push('/orders')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md hover:shadow-xl hover:border-teal-400 transition-all text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 mb-3 group-hover:scale-110 transition-transform">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
              Returns & Exchange
            </h4>
            <p className="text-[11px] text-slate-500 font-medium mt-1 leading-tight">
              7-Day Risk-Free Return Guarantee
            </p>
          </button>

          {/* Card 3: WhatsApp Support */}
          <a
            href="https://wa.me/919876543210"
            target="_blank"
            rel="noreferrer"
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md hover:shadow-xl hover:border-emerald-400 transition-all text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
              <MessageCircle className="w-5 h-5 fill-white" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              WhatsApp Support
            </h4>
            <p className="text-[11px] text-slate-500 font-medium mt-1 leading-tight">
              Instant chat with support executive
            </p>
          </a>

          {/* Card 4: Hotline */}
          <a
            href="tel:18003004545"
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md hover:shadow-xl hover:border-teal-400 transition-all text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-3 group-hover:scale-110 transition-transform">
              <Phone className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
              24/7 Phone Hotline
            </h4>
            <p className="text-[11px] text-slate-500 font-medium mt-1 leading-tight">
              1800 300 4545 (Toll-Free)
            </p>
          </a>
        </div>
      </section>

      {/* ── 3. Main Content: FAQ Cards Section ── */}
      <section className="max-w-5xl mx-auto px-4 md:px-12 pt-12 space-y-8">
        
        {/* Category Tabs */}
        {!searchQuery && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200/80">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/80'
              }`}
            >
              All Support Topics
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat.slug
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/80'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight font-display">
              {searchQuery ? `Search Results for "${searchQuery}"` : 'Frequently Asked Questions'}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Click any question to view step-by-step instructions and action shortcuts.
            </p>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            <p className="text-xs font-semibold">Loading FAAZO support knowledgebase...</p>
          </div>
        ) : searchQuery ? (
          /* Search Results List */
          searchResults.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-dashed border-slate-200 text-center space-y-3">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No Matching Topics Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                We couldn't find an answer for "{searchQuery}". Connect with our team on WhatsApp for instant assistance.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {searchResults.map((faq) => (
                <FaqCard
                  key={faq.id}
                  faq={faq}
                  defaultExpanded={true}
                  userLatestOrderNumber={latestOrderNumber}
                  onActionClick={handleActionClick}
                />
              ))}
            </div>
          )
        ) : (
          /* 6 Core Featured FAQ Cards Grid */
          <div className="space-y-4">
            {featuredFaqs.map((faq, idx) => (
              <FaqCard
                key={faq.id}
                faq={faq}
                defaultExpanded={idx === 0}
                userLatestOrderNumber={latestOrderNumber}
                onActionClick={handleActionClick}
              />
            ))}
          </div>
        )}

      </section>

      {/* ── 4. Emergency Support Banner ── */}
      <section className="max-w-5xl mx-auto px-4 md:px-12 pt-14">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider uppercase text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
              <Sparkles className="w-3 h-3" /> Clinical Hotline Active
            </div>
            <h3 className="text-xl font-bold font-display">
              Still need assistance with clinical equipment?
            </h3>
            <p className="text-xs text-slate-400 font-medium max-w-lg">
              Our biomedical engineers provide remote setup, warranty claim assistance, and equipment calibration.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>WhatsApp Support</span>
            </a>

            <a
              href="tel:18003004545"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>Call Support</span>
            </a>
          </div>
        </div>
      </section>

    </div>
  );
};
