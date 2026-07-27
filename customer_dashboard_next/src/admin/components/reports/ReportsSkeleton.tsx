import React from 'react';

export const ReportsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse p-6">
      {/* Header Skeleton */}
      <div className="h-14 bg-slate-200/80 rounded-2xl w-full" />

      {/* 6 KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-200/60 rounded-2xl" />
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="h-80 bg-slate-200/60 rounded-2xl w-full" />

      {/* 2 Column Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-96 bg-slate-200/60 rounded-2xl" />
        <div className="h-96 bg-slate-200/60 rounded-2xl" />
      </div>

      {/* Table Skeleton */}
      <div className="h-72 bg-slate-200/60 rounded-2xl w-full" />
    </div>
  );
};
