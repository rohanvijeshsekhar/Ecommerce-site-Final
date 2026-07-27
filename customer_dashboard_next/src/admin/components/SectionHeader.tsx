'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { useBreadcrumb } from '../contexts/BreadcrumbContext';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbOverride?: { label: string; path?: string }[];
  className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actions,
  breadcrumbOverride,
  className = '',
}) => {
  const { breadcrumbs: ctxBreadcrumbs } = useBreadcrumb();

  const breadcrumbs = breadcrumbOverride ?? ctxBreadcrumbs;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6 ${className}`}>
      <div className="min-w-0">
        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 mb-2 flex-wrap">
            <Link
              href="/admin"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#005B63] transition-colors"
            >
              <Home className="w-3 h-3" />
              <span>Admin</span>
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                {crumb.path && i < breadcrumbs.length - 1 ? (
                  <Link
                    href={crumb.path}
                    className="text-xs text-slate-400 hover:text-[#005B63] transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-xs font-semibold text-slate-600">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <h1 className="text-xl font-extrabold text-slate-800 leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
};

export default SectionHeader;
