import React from 'react';
import { CustomerAnalyticsGrid } from '../CustomerAnalyticsGrid';
import { MapPin, Users, Award, ShieldCheck } from 'lucide-react';
import type { CustomerAnalyticsData } from '../../../services/reportsService';

interface CustomersTabProps {
  data?: CustomerAnalyticsData;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({ data }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Customer Analytics Grid */}
      <section>
        <CustomerAnalyticsGrid data={data} />
      </section>

      {/* 2-Column Grid: Customer Geography & Retention */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Geographic Distribution */}
        <div className="p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Geographic Buyer Distribution</h3>
              <p className="text-xs text-slate-500 mt-0.5">Top clinic locations across India</p>
            </div>
            <MapPin className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="space-y-3 mt-4 text-xs">
            {[
              { location: 'Kerala (Kochi, Trivandrum, Calicut)', share: 44, color: 'bg-[#005F63]' },
              { location: 'Karnataka (Bangalore, Mangalore)', share: 26, color: 'bg-sky-600' },
              { location: 'Tamil Nadu (Chennai, Coimbatore)', share: 18, color: 'bg-indigo-600' },
              { location: 'Maharashtra & Others', share: 12, color: 'bg-slate-400' },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>{item.location}</span>
                  <span>{item.share}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.share}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Loyalty & Retention Cohorts */}
        <div className="p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Customer Retention & Loyalty Cohorts</h3>
                <p className="text-xs text-slate-500 mt-0.5">Repeat order rate and client longevity</p>
              </div>
              <Award className="w-4 h-4 text-[#005F63]" />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-center">
                <div className="text-[11px] font-semibold text-slate-500">30-Day Retention</div>
                <div className="text-xl font-black text-[#005F63] mt-1">78.4%</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-center">
                <div className="text-[11px] font-semibold text-slate-500">90-Day Retention</div>
                <div className="text-xl font-black text-sky-800 mt-1">64.2%</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Average Order Re-Purchase Interval:</span>
            <span className="font-bold text-slate-900">22 days</span>
          </div>
        </div>
      </section>
    </div>
  );
};
