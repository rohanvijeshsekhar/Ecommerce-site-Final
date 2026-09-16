'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Flame, Sparkles, ChevronRight, ShoppingBag, RefreshCw } from 'lucide-react';
import type { DailyOffer } from '@/admin/types/admin';
import { api } from '@/lib/api';
import DailyOfferCountdown from '@/components/store/daily-offers/DailyOfferCountdown';
import DailyOfferCard from '@/components/store/daily-offers/DailyOfferCard';

interface DailyOfferClientProps {
  initialOffer?: DailyOffer | null;
  offerId: string;
}

export default function DailyOfferClient({ initialOffer, offerId }: DailyOfferClientProps) {
  const [offer, setOffer] = useState<DailyOffer | null>(initialOffer || null);
  const [loading, setLoading] = useState<boolean>(!initialOffer);

  useEffect(() => {
    if (!initialOffer) {
      api
        .get(`homepage/daily-offers/${offerId}/`)
        .then((res) => {
          if (res.data?.data) {
            setOffer(res.data.data);
          } else if (res.data && res.data.id) {
            setOffer(res.data);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [initialOffer, offerId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20">
        <RefreshCw className="w-10 h-10 text-[#006670] animate-spin mb-4" />
        <p className="text-slate-600 font-semibold text-sm">Loading today's exclusive deals...</p>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Offer Not Found or Expired</h2>
        <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
          This promotional event has concluded or is no longer active. Explore our active catalog for more deals.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#006670] hover:bg-[#004D54] text-white font-bold text-sm transition-colors shadow-md"
        >
          Return to Homepage
        </Link>
      </div>
    );
  }

  const productBadgeColor = offer.product_badge_color || '#006670';
  const items = offer.items || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ============================================================
          1. BREADCRUMBS
         ============================================================ */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link href="/" className="hover:text-[#006670] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link href="/daily-offers" className="hover:text-[#006670] transition-colors">
              Daily Offers
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 truncate max-w-[200px] sm:max-w-xs">{offer.title || 'Featured Deal Products'}</span>
          </nav>
        </div>
      </div>

      {/* ============================================================
          2. FEATURED DEAL PRODUCTS (NO BANNER IMAGES)
         ============================================================ */}
      <main id="deal-products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Header with Title, Badges & Countdown */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              {/* Badges */}
              <div className="flex items-center gap-2.5 flex-wrap mb-2.5">
                {offer.badge_text && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide bg-amber-100 text-amber-900 border border-amber-200 uppercase">
                    <Flame className="w-3.5 h-3.5 fill-current text-amber-600 animate-bounce" />
                    {offer.badge_text}
                  </span>
                )}
                {offer.offer_text && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider bg-teal-50 text-[#006670] border border-teal-200 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    {offer.offer_text}
                  </span>
                )}
                <span className="text-xs font-bold text-[#006670] bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                  {items.length} {items.length === 1 ? 'Product' : 'Products'} on Deal
                </span>
              </div>

              {/* Title & Subheading */}
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {offer.title || 'Featured Deal Products'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5 max-w-2xl">
                {offer.subheading || 'Lock in discounted pricing on verified clinical instruments and consumables before the timer expires.'}
              </p>
            </div>

            {/* Countdown Timer */}
            {offer.countdown_enabled && (
              <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0 bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-xl border md:border-0 border-slate-100">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  Deals Expire In:
                </span>
                <DailyOfferCountdown
                  endDate={offer.end_date}
                  startDate={offer.start_date}
                  bgColor="#002B30"
                  textColor="#FFFFFF"
                />
              </div>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center my-8">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Deal Products Added Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-5">
              Check back soon as new clinical products are discounted and added to this offer daily.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#006670] text-white font-bold text-xs"
            >
              Browse Full Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item, idx) => (
              <DailyOfferCard
                key={item.id || item.product_id || idx}
                item={item}
                productBadgeColor={productBadgeColor}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
