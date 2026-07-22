import React from 'react';
import { CustomerAnalyticsGrid } from '../CustomerAnalyticsGrid';
import { ReportsEmptyState } from '../ReportsEmptyState';
import { MapPin, Users } from 'lucide-react';
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

      {/* Geographic Distribution Section */}
      <section className="p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Geographic Client Distribution</h3>
            <p className="text-xs text-slate-500 mt-0.5">Top clinic locations aggregated from DB user addresses</p>
          </div>
          <MapPin className="w-4 h-4 text-emerald-600" />
        </div>

        {geography.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 font-semibold">
            No registered address data available in database yet.
          </div>
        ) : (
          <div className="space-y-3 mt-4 text-xs">
            {geography.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900">{item.location}</span>
                    {item.count !== undefined && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {item.count} {item.count === 1 ? 'client' : 'clients'}
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-black text-[#005F63]">{item.share}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden shadow-inner p-0.5">
                  <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${item.share}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
