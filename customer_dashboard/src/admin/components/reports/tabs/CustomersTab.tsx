import React from 'react';
import { CustomerAnalyticsGrid } from '../CustomerAnalyticsGrid';
import { ReportsEmptyState } from '../ReportsEmptyState';
import { MapPin } from 'lucide-react';
import type { CustomerAnalyticsData, CustomerGeographyItem } from '../../../services/reportsService';

interface CustomersTabProps {
  data?: CustomerAnalyticsData;
  geography?: CustomerGeographyItem[];
}

export const CustomersTab: React.FC<CustomersTabProps> = ({ data, geography = [] }) => {
  const hasCustomers = data && data.total_customers > 0;

  if (!hasCustomers) {
    return (
      <ReportsEmptyState
        title="No Customer Records Found"
        description="No registered customer accounts exist in the database for the selected period."
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Customer Analytics Grid */}
      <section>
        <CustomerAnalyticsGrid data={data} />
      </section>

      {/* Geographic Distribution Section — Glassy Pastel Outer Box */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50/40 via-sky-50/30 to-teal-50/40 backdrop-blur-2xl border border-slate-200/80 rounded-3xl p-6 shadow-[0_10px_35px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.05)] transition-all duration-300">
        <div className="absolute inset-0 bg-white/40 backdrop-blur-md pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Geographic Client Distribution</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Top clinic locations aggregated from DB user addresses</p>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-700">
              <MapPin className="w-4 h-4 text-emerald-600" />
            </div>
          </div>

          {geography.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 font-semibold">
              No registered address data available in database yet.
            </div>
          ) : (
            <div className="space-y-3.5 mt-5 text-xs">
              {geography.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900">{item.location}</span>
                      {item.count !== undefined && (
                        <span className="text-[10px] font-bold text-slate-500 bg-white/80 border border-slate-200/60 px-2.5 py-0.5 rounded-full shadow-xs">
                          {item.count} {item.count === 1 ? 'client' : 'clients'}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-black text-[#005F63]">{item.share}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200/60 overflow-hidden shadow-inner p-0.5">
                    <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${item.share}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
