import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Building2, CreditCard, Percent } from 'lucide-react';
import type { ExecutiveKpisData } from '../../services/reportsService';

interface ExecutiveKpiCardsProps {
  data?: ExecutiveKpisData;
}

export const ExecutiveKpiCards: React.FC<ExecutiveKpiCardsProps> = ({ data }) => {
  if (!data) return null;

  const cards = [
    {
      title: 'Total Revenue',
      value: data.revenue.formatted,
      growth: data.revenue.growth,
      icon: DollarSign,
      color: 'from-[#005F63]/10 via-emerald-500/5 to-white',
      accentColor: 'text-[#005F63]',
      iconBg: 'bg-[#005F63]/10 text-[#005F63] border-[#005F63]/20',
      subtitle: 'Gross platform revenue',
    },
    {
      title: 'Total Orders',
      value: data.orders.formatted,
      growth: data.orders.growth,
      icon: ShoppingBag,
      color: 'from-sky-500/10 via-blue-500/5 to-white',
      accentColor: 'text-sky-700',
      iconBg: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
      subtitle: 'Completed & active orders',
    },
    {
      title: 'Active Customers',
      value: data.customers.formatted,
      growth: data.customers.growth,
      icon: Users,
      color: 'from-indigo-500/10 via-purple-500/5 to-white',
      accentColor: 'text-indigo-700',
      iconBg: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
      subtitle: `${data.customers.new_in_period || 0} new in selected period`,
    },
    {
      title: 'Approved Dealers',
      value: data.dealers.formatted,
      growth: data.dealers.growth,
      icon: Building2,
      color: 'from-amber-500/10 via-yellow-500/5 to-white',
      accentColor: 'text-amber-800',
      iconBg: 'bg-amber-500/10 text-amber-800 border-amber-500/20',
      subtitle: `${data.dealers.new_in_period || 0} approved partners`,
    },
    {
      title: 'Average Order Value',
      value: data.aov.formatted,
      growth: data.aov.growth,
      icon: CreditCard,
      color: 'from-teal-500/10 via-emerald-500/5 to-white',
      accentColor: 'text-teal-700',
      iconBg: 'bg-teal-500/10 text-teal-700 border-teal-500/20',
      subtitle: 'Revenue per transaction',
    },
    {
      title: 'Conversion Rate',
      value: data.conversion_rate.formatted,
      growth: data.conversion_rate.growth,
      icon: Percent,
      color: 'from-purple-500/10 via-pink-500/5 to-white',
      accentColor: 'text-purple-700',
      iconBg: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
      subtitle: 'Checkout completion efficiency',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isPositive = card.growth >= 0;

        return (
          <div
            key={idx}
            className={`relative overflow-hidden bg-gradient-to-br ${card.color} backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 group`}
          >
            {/* Header / Icon */}
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-xl border ${card.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                  isPositive
                    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-700 border-rose-500/20'
                }`}
              >
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{isPositive ? `+${card.growth}%` : `${card.growth}%`}</span>
              </div>
            </div>

            {/* Value */}
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight group-hover:scale-101 transition-transform">
                {card.value}
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">{card.title}</div>
              <div className="text-[10px] text-slate-400 font-medium mt-1 truncate">{card.subtitle}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
