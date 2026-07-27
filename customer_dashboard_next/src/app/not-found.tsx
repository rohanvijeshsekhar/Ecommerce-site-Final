import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="w-16 h-16 bg-[#006670]/10 rounded-2xl flex items-center justify-center mb-4">
        <span className="text-2xl font-black text-[#006670]">404</span>
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Page Not Found</h1>
      <p className="text-slate-600 text-sm max-w-md mb-6">
        The clinical page or product resource you are looking for has moved or does not exist.
      </p>
      <Link
        href="/"
        className="bg-[#006670] text-white text-xs font-bold px-6 py-3 rounded-xl hover:bg-[#004d54] transition-colors"
      >
        Return to FAAZO Homepage
      </Link>
    </div>
  );
}
