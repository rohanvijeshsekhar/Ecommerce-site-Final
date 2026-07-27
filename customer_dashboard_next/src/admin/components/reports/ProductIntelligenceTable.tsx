import React, { useState } from 'react';
import { Package, TrendingUp, AlertCircle } from 'lucide-react';
import type { ProductIntelligenceItem } from '../../services/reportsService';

interface ProductIntelligenceTableProps {
  products?: ProductIntelligenceItem[];
}

const ProductImageThumbnail: React.FC<{ src?: string | null; name: string }> = ({ src, name }) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <Package className="w-5 h-5 text-slate-400" />;
  }

  // Format URL: if relative path like "/media/...", prepend Django backend URL
  const imageUrl = src.startsWith('http://') || src.startsWith('https://')
    ? src
    : src.startsWith('/')
    ? `http://localhost:8000${src}`
    : `http://localhost:8000/${src}`;

  return (
    <img
      src={imageUrl}
      alt={name}
      className="w-full h-full object-cover"
      onError={() => setHasError(true)}
    />
  );
};

export const ProductIntelligenceTable: React.FC<ProductIntelligenceTableProps> = ({ products = [] }) => {
  if (!products || products.length === 0) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-teal-50/70 via-emerald-50/30 to-cyan-50/50 backdrop-blur-2xl border border-teal-100/80 rounded-3xl p-6 shadow-[0_10px_35px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.05)] transition-all duration-300">
      <div className="absolute inset-0 bg-white/50 backdrop-blur-md pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-teal-100/80">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Product Intelligence & Best Sellers</h3>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-teal-500/15 text-teal-800 rounded-full border border-teal-500/25">
                Top 10 Drivers
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Dental equipment products ranked by volume and total generated sales revenue.
            </p>
          </div>
        </div>

        {/* Product List Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-teal-100/80 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                <th className="py-3 px-3">Rank</th>
                <th className="py-3 px-3">Product Details</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Units Sold</th>
                <th className="py-3 px-3 text-right">Total Revenue</th>
                <th className="py-3 px-3 text-center">Stock Availability</th>
                <th className="py-3 px-3 text-right">Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-100/50 font-medium">
              {products.map((item) => {
                const rankBadgeClass =
                  item.rank === 1
                    ? 'bg-amber-400 text-amber-950 font-black shadow-xs'
                    : item.rank === 2
                    ? 'bg-slate-200 text-slate-800 font-bold'
                    : item.rank === 3
                    ? 'bg-amber-700/20 text-amber-900 font-bold'
                    : 'bg-slate-100 text-slate-600 font-semibold';

                const stockBadgeClass =
                  item.stock_status === 'In Stock'
                    ? 'bg-emerald-500/15 text-emerald-800 border-emerald-500/25'
                    : item.stock_status === 'Low Stock'
                    ? 'bg-amber-500/15 text-amber-800 border-amber-500/25'
                    : 'bg-rose-500/15 text-rose-800 border-rose-500/25';

                return (
                  <tr key={item.id} className="hover:bg-white/80 backdrop-blur-sm transition-colors group">
                    {/* Rank */}
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${rankBadgeClass}`}>
                        #{item.rank}
                      </span>
                    </td>

                    {/* Product Details */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl border border-teal-100/80 overflow-hidden bg-white/80 shrink-0 flex items-center justify-center shadow-2xs">
                          <ProductImageThumbnail src={item.image} name={item.name} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.sku}</div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/80 text-slate-700 border border-teal-100/60 shadow-2xs">
                        {item.category}
                      </span>
                    </td>

                    {/* Units Sold */}
                    <td className="py-3 px-3 text-right font-bold text-slate-800">
                      {item.units_sold.toLocaleString()} units
                    </td>

                    {/* Total Revenue */}
                    <td className="py-3 px-3 text-right font-extrabold text-[#005F63]">
                      ₹{item.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Stock Availability */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${stockBadgeClass}`}>
                        {item.stock_status === 'Low Stock' && <AlertCircle className="w-3 h-3" />}
                        {item.stock_status} ({item.stock_quantity})
                      </span>
                    </td>

                    {/* Growth */}
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>+{item.growth}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
