import React from 'react';
import { PackageSearch, SearchX, ShieldOff, ServerOff } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState + ErrorState
// ─────────────────────────────────────────────────────────────────────────────

type EmptyPreset = 'no-data' | 'no-results' | 'no-access' | 'offline';

interface EmptyStateProps {
  preset?: EmptyPreset;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  compact?: boolean;
}

const PRESETS: Record<EmptyPreset, {
  icon: React.ReactNode;
  title: string;
  description: string;
}> = {
  'no-data': {
    icon: <PackageSearch className="w-10 h-10 text-slate-300" />,
    title: 'No data yet',
    description: 'There is nothing here yet. Get started by adding an entry.',
  },
  'no-results': {
    icon: <SearchX className="w-10 h-10 text-slate-300" />,
    title: 'No results found',
    description: 'Try adjusting your search or filters to find what you\'re looking for.',
  },
  'no-access': {
    icon: <ShieldOff className="w-10 h-10 text-slate-300" />,
    title: 'Access restricted',
    description: 'You don\'t have permission to view this content. Contact your administrator.',
  },
  'offline': {
    icon: <ServerOff className="w-10 h-10 text-slate-300" />,
    title: 'Unable to connect',
    description: 'The backend is unavailable. Please check your connection and try again.',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  preset = 'no-data',
  title,
  description,
  action,
  icon,
  compact = false,
}) => {
  const p = PRESETS[preset];
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-6'}`}>
      <div className={`${compact ? 'mb-3' : 'mb-4'} opacity-70`}>
        {icon ?? p.icon}
      </div>
      <h3 className={`font-bold text-slate-600 ${compact ? 'text-sm mb-1' : 'text-base mb-2'}`}>
        {title ?? p.title}
      </h3>
      <p className={`text-slate-400 leading-relaxed max-w-xs ${compact ? 'text-xs' : 'text-sm'}`}>
        {description ?? p.description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ErrorState
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  compact = false,
}) => (
  <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-6'}`}>
    <div className={`${compact ? 'w-10 h-10 mb-3' : 'w-14 h-14 mb-4'} rounded-full bg-rose-100 flex items-center justify-center`}>
      <svg className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} text-rose-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <h3 className={`font-bold text-slate-700 ${compact ? 'text-sm mb-1' : 'text-base mb-2'}`}>{title}</h3>
    <p className={`text-slate-400 leading-relaxed max-w-xs ${compact ? 'text-xs' : 'text-sm'}`}>{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-5 px-4 py-2 text-sm font-semibold text-white bg-[#005B63] hover:bg-[#004a50]
          rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#005B63]/30"
      >
        Try again
      </button>
    )}
  </div>
);

export default EmptyState;
