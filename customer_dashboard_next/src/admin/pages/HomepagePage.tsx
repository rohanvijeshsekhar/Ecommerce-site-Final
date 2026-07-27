'use client';

import React, { useState } from 'react';
import { Image, Tag, Award, TrendingUp, Layers, Zap, Compass, MessageSquare, Sparkles } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import HeroManager from '../components/homepage/HeroManager';
import CategoryShowcaseManager from '../components/homepage/CategoryShowcaseManager';
import BrandShowcaseManager from '../components/homepage/BrandShowcaseManager';
import BestSellersManager from '../components/homepage/BestSellersManager';
import FeaturedCollectionsManager from '../components/homepage/FeaturedCollectionsManager';
import LimitedOffersManager from '../components/homepage/LimitedOffersManager';
import ExploreSolutionsAdmin from '../components/ExploreSolutionsAdmin';
import TestimonialsManager from '../components/homepage/TestimonialsManager';
import RecommendedManager from '../components/homepage/RecommendedManager';

// ─────────────────────────────────────────────────────────────────────────────
// Tab definitions
// ─────────────────────────────────────────────────────────────────────────────

type TabId =
  | 'hero'
  | 'categories'
  | 'brands'
  | 'bestsellers'
  | 'collections'
  | 'offers'
  | 'solutions'
  | 'testimonials'
  | 'recommended';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'hero',         label: 'Hero',              icon: <Image className="w-4 h-4" /> },
  { id: 'categories',  label: 'Shop By Category',   icon: <Tag className="w-4 h-4" /> },
  { id: 'brands',      label: 'Brand Logos',        icon: <Award className="w-4 h-4" /> },
  { id: 'bestsellers', label: 'Best Sellers',        icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'collections', label: 'Collections',         icon: <Layers className="w-4 h-4" /> },
  { id: 'offers',      label: 'Limited Offers',      icon: <Zap className="w-4 h-4" /> },
  { id: 'solutions',   label: 'Explore Solutions',   icon: <Compass className="w-4 h-4" /> },
  { id: 'testimonials',label: 'Testimonials',        icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'recommended', label: 'Recommended',         icon: <Sparkles className="w-4 h-4" /> },
];

// ─────────────────────────────────────────────────────────────────────────────
// HomepagePage
// ─────────────────────────────────────────────────────────────────────────────

const HomepagePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('hero');

  const renderTab = () => {
    switch (activeTab) {
      case 'hero':         return <HeroManager />;
      case 'categories':   return <CategoryShowcaseManager />;
      case 'brands':       return <BrandShowcaseManager />;
      case 'bestsellers':  return <BestSellersManager />;
      case 'collections':  return <FeaturedCollectionsManager />;
      case 'offers':       return <LimitedOffersManager />;
      case 'solutions':    return <ExploreSolutionsAdmin />;
      case 'testimonials': return <TestimonialsManager />;
      case 'recommended':  return <RecommendedManager />;
      default:             return null;
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Homepage Management"
        subtitle="Control every section of the customer homepage. Changes go live immediately."
      />

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Tab Bar */}
        <div className="border-b border-slate-200 overflow-x-auto">
          <div className="flex min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap
                  border-b-2 transition-all duration-150 cursor-pointer
                  ${activeTab === tab.id
                    ? 'border-[#006670] text-[#006670] bg-[#006670]/5'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTab()}
        </div>
      </div>
    </div>
  );
};

export default HomepagePage;
