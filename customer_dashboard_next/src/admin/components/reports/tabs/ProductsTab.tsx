import React from 'react';
import { ProductIntelligenceTable } from '../ProductIntelligenceTable';
import { CategoryAnalyticsChart } from '../CategoryAnalyticsChart';
import type { ProductIntelligenceItem, CategoryAnalyticsData } from '../../../services/reportsService';

interface ProductsTabProps {
  productsData?: ProductIntelligenceItem[];
  categoryData?: CategoryAnalyticsData;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({ productsData, categoryData }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Product Intelligence Table */}
      <section>
        <ProductIntelligenceTable products={productsData} />
      </section>

      {/* Category Analytics Chart */}
      <section>
        <CategoryAnalyticsChart data={categoryData} />
      </section>
    </div>
  );
};
