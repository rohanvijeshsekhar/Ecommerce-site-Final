import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Warranty Registration & Serial Number Lookup | FAAZO',
  description: 'Register serial numbers for genuine dental equipment purchased on FAAZO, track coverage status, and initiate official manufacturer warranty claims.',
  keywords: ['dental equipment warranty', 'serial registration', 'FAAZO warranty claim', 'dental repair service'],
};

export default function WarrantyPage() {
  return (
    <div className="min-h-screen bg-slate-50 pt-[112px] lg:pt-[180px] pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs font-black tracking-widest text-[#006670] uppercase">
            Official Protection
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
            Equipment Warranty & Serial Protection
          </h1>
          <p className="text-slate-600 max-w-xl mx-auto mt-2 text-sm sm:text-base">
            Every clinical unit purchased on FAAZO includes manufacturer warranty protection and priority service dispatch.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mb-12">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Register Serial Number</h2>
            <p className="text-xs text-slate-600 mb-6">
              Link product serial numbers to your account for automatic warranty activation and digital invoice storage.
            </p>
            <Link
              href="/orders"
              className="inline-block bg-[#006670] text-white text-xs font-bold px-6 py-3 rounded-xl hover:bg-[#004d54] transition-colors"
            >
              View Order History & Register
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
            <h2 className="text-lg font-bold text-slate-900 mb-2">File a Warranty Claim</h2>
            <p className="text-xs text-slate-600 mb-6">
              Need technical support or RMA repair? Submit a claim with photos for 24-hour turnaround dispatch.
            </p>
            <Link
              href="/profile"
              className="inline-block bg-slate-900 text-white text-xs font-bold px-6 py-3 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Go to Support & Claims Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
