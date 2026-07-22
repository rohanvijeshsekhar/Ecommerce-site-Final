import React from 'react';
import { InventoryIntelligenceWidget } from '../InventoryIntelligenceWidget';
import type { InventoryIntelligenceData } from '../../../services/reportsService';

interface InventoryTabProps {
  data?: InventoryIntelligenceData;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({ data }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <section>
        <InventoryIntelligenceWidget data={data} />
      </section>
    </div>
  );
};
