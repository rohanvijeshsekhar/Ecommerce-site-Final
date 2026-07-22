import React from 'react';
import { WarrantyAnalyticsWidget } from '../WarrantyAnalyticsWidget';
import { SupportAnalyticsWidget } from '../SupportAnalyticsWidget';
import { RecentActivitiesTimeline } from '../RecentActivitiesTimeline';
import type { WarrantyAnalyticsData, SupportAnalyticsData, ReportActivityItem } from '../../../services/reportsService';

interface OperationsTabProps {
  warrantyData?: WarrantyAnalyticsData;
  supportData?: SupportAnalyticsData;
  activitiesData?: ReportActivityItem[];
}

export const OperationsTab: React.FC<OperationsTabProps> = ({ warrantyData, supportData, activitiesData }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 2-Column Grid: Warranty & Support */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WarrantyAnalyticsWidget data={warrantyData} />
        <SupportAnalyticsWidget data={supportData} />
      </section>

      {/* Activity Timeline */}
      <section>
        <RecentActivitiesTimeline activities={activitiesData} />
      </section>
    </div>
  );
};
