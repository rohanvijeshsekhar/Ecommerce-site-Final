'use client';

import React, { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Router runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mb-4 text-rose-600 font-black text-xl">
        !
      </div>
      <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Something went wrong</h1>
      <p className="text-slate-600 text-xs max-w-md mb-4">
        An unexpected application error occurred. Click below to re-render the page.
      </p>
      {error?.message && (
        <div className="mb-6 max-w-lg w-full text-left bg-rose-50 border border-rose-200 rounded-xl p-3.5">
          <p className="text-xs font-bold text-rose-800 mb-1">Error Details:</p>
          <pre className="text-[11px] text-rose-700 font-mono whitespace-pre-wrap break-all">
            {error.message}
          </pre>
          {error.digest && (
            <p className="text-[10px] text-rose-500 font-mono mt-2">Digest: {error.digest}</p>
          )}
        </div>
      )}
      <button
        onClick={() => reset()}
        className="bg-[#006670] text-white text-xs font-bold px-6 py-3 rounded-xl hover:bg-[#004d54] transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
