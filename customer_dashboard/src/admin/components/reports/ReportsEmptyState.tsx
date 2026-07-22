import React from 'react';
import { Database, Inbox } from 'lucide-react';

interface ReportsEmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const ReportsEmptyState: React.FC<ReportsEmptyStateProps> = ({
  title = 'No Data Available',
  description = 'No database records found for the selected filter period.',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="p-8 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs text-center flex flex-col items-center justify-center my-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mb-3">
        <Inbox className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mt-1">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-1.5 text-xs font-bold text-[#005F63] bg-[#005F63]/10 hover:bg-[#005F63]/20 border border-[#005F63]/20 rounded-xl transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
