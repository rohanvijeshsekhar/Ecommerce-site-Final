import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// SkeletonLoader — Shimmer loading placeholders
// ─────────────────────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`bg-slate-200/80 animate-pulse rounded ${className}`} />
);

// Stat card skeleton
export const StatCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
    <div className="animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-16 rounded" />
      <Skeleton className="h-2.5 w-32 rounded-full" />
    </div>
  </div>
);

// Table row skeleton
export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <>
    {Array.from({ length: 6 }).map((_, i) => (
      <tr key={i} className="border-b border-slate-50">
        {Array.from({ length: cols }).map((_, j) => (
          <td key={j} className="px-4 py-3.5">
            <Skeleton className={`h-3.5 rounded-full ${j === 0 ? 'w-32' : j === 1 ? 'w-24' : 'w-16'}`} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

// Activity feed skeleton
export const ActivitySkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex items-start gap-3">
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-48 rounded-full" />
          <Skeleton className="h-2.5 w-64 rounded-full" />
          <Skeleton className="h-2 w-20 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

// Generic card skeleton
export const CardSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm animate-pulse">
    <Skeleton className="h-4 w-40 mb-4 rounded-full" />
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={`h-3 rounded-full mb-2.5 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </div>
);

// Full page loader
export const PageSkeleton: React.FC = () => (
  <div className="p-6 space-y-6">
    {/* Stat cards row */}
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)}
    </div>
    {/* Main content */}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div className="xl:col-span-2"><CardSkeleton lines={6} /></div>
      <CardSkeleton lines={4} />
    </div>
  </div>
);

interface SkeletonLoaderProps {
  type?: 'card' | 'table' | 'stat' | 'activity' | 'page';
  rows?: number;
  cols?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = 'card',
  rows = 3,
  cols = 5,
  className = '',
}) => {
  if (type === 'table') {
    return (
      <div className={`w-full overflow-hidden ${className}`}>
        <table className="w-full">
          <tbody>
            <TableRowSkeleton cols={cols} />
          </tbody>
        </table>
      </div>
    );
  }
  if (type === 'stat') return <StatCardSkeleton />;
  if (type === 'activity') return <ActivitySkeleton />;
  if (type === 'page') return <PageSkeleton />;
  return <CardSkeleton lines={rows} />;
};

export default SkeletonLoader;
