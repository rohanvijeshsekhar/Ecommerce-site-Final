'use client';

import React, { useState } from 'react';
import { Star, Image as ImageIcon } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import BestSellerProductManager from '../components/bestsellers/BestSellerProductManager';
import BestSellerBannerManager from '../components/bestsellers/BestSellerBannerManager';

type TabId = 'products' | 'banner';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'products', label: 'Products',    icon: <Star className="w-4 h-4" /> },
  { id: 'banner',   label: 'Page Banner', icon: <ImageIcon className="w-4 h-4" /> },
];

const BestSellersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('products');

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Best Sellers"
        subtitle="Manage which products appear on the Best Sellers page, set display order, and configure the page banner."
      />

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
          {activeTab === 'products' && <BestSellerProductManager />}
          {activeTab === 'banner'   && <BestSellerBannerManager />}
        </div>
      </div>
    </div>
  );
};

export default BestSellersPage;
