'use client';

import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, ArrowLeft } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// ComingSoon — placeholder for unbuilt modules
// ─────────────────────────────────────────────────────────────────────────────

interface ComingSoonProps {
  module: string;
  description?: string;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ module, description }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
    <div className="w-16 h-16 rounded-2xl bg-[#005B63]/10 flex items-center justify-center mb-5">
      <LayoutDashboard className="w-8 h-8 text-[#005B63]" />
    </div>
    <h1 className="text-2xl font-extrabold text-slate-800 mb-2">{module}</h1>
    <p className="text-sm text-slate-400 max-w-sm leading-relaxed mb-1">
      {description ?? `This module is part of the FAAZO Admin roadmap and will be built in an upcoming phase.`}
    </p>
    <p className="text-xs text-slate-300 mb-6">Phase 5 Foundation — Backend integration pending</p>
    <Link
      href="/admin"
      className="inline-flex items-center gap-2 px-4 py-2 bg-[#005B63] text-white text-sm font-semibold
        rounded-xl hover:bg-[#004a50] transition-colors"
    >
      <ArrowLeft className="w-4 h-4" /> Back to Dashboard
    </Link>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// NotFound — 404 admin page
// ─────────────────────────────────────────────────────────────────────────────

const NotFound: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
    <div className="text-7xl font-extrabold text-slate-100 mb-4 leading-none">404</div>
    <h1 className="text-xl font-extrabold text-slate-700 mb-2">Page not found</h1>
    <p className="text-sm text-slate-400 mb-6">The page you're looking for doesn't exist in the admin portal.</p>
    <Link
      href="/admin"
      className="inline-flex items-center gap-2 px-4 py-2 bg-[#005B63] text-white text-sm font-semibold
        rounded-xl hover:bg-[#004a50] transition-colors"
    >
      <ArrowLeft className="w-4 h-4" /> Dashboard
    </Link>
  </div>
);

export default NotFound;
