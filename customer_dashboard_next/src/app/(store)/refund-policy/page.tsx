import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { RotateCcw, ShieldCheck, AlertTriangle, CheckCircle2, Clock, PackageCheck, HelpCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Refund & Returns Policy | FAAZO Dental Solutions',
  description: 'Official Return & Refund Policy for FAAZO dental supplies, equipment, quality inspection workflow, and return filing requirements.',
  openGraph: {
    title: 'Refund & Returns Policy | FAAZO Dental Solutions',
    description: 'Official Return & Refund Policy for FAAZO dental supplies, equipment, quality inspection, and return eligibility.',
  },
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 pt-[112px] lg:pt-[180px] pb-16 md:pb-24 text-slate-800 font-sans select-none">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
          <Link href="/" className="hover:text-[#005F63] transition-colors">Home</Link>
          <span>/</span>
          <span className="text-slate-800">Refund Policy</span>
        </nav>

        {/* Hero Header */}
        <div className="bg-gradient-to-br from-slate-900 via-[#00383B] to-[#005F63] rounded-3xl p-8 md:p-12 text-white shadow-xl mb-10 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-teal-200 border border-white/20 text-xs font-bold uppercase tracking-wider mb-4">
              <RotateCcw className="w-4 h-4 text-teal-300" /> Return & Refund Assurance
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white font-display">
              Refund & Returns Policy
            </h1>
            <p className="mt-3 text-sm md:text-base text-slate-200 max-w-2xl leading-relaxed">
              Clear rules governing product return eligibility, quality inspection, replacements, and payment refunds for clinics and dealers.
            </p>
            <div className="mt-6 flex items-center gap-4 text-xs text-teal-100 font-medium border-t border-white/10 pt-4">
              <span>Last Updated: February 2026</span>
              <span>•</span>
              <span>Online Return Portal Supported</span>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 md:p-10 space-y-10">

          {/* SLA Placeholder Notice */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs md:text-sm leading-relaxed">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-950 font-bold mb-0.5">Refund Processing Timeline Notice:</strong>
                Approved refunds are processed back to the original payment method (Razorpay online or bank transfer for COD). 
                <span className="font-semibold text-amber-950 underline underline-offset-2 ml-1">
                  [BUSINESS OWNER TO CONFIRM REFUND TIMELINE (e.g. 5–7 business days)]
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Return Eligibility */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">1</span>
              Return Request Eligibility
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              Products purchased on FAAZO are eligible for return or replacement under the following conditions:
            </p>
            <ul className="space-y-2 text-xs md:text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#005F63] shrink-0 mt-0.5" />
                <span>The item delivered was defective, damaged during transit, or wrong item dispatched.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#005F63] shrink-0 mt-0.5" />
                <span>The product is returned in original, unopened packaging with seal intact.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#005F63] shrink-0 mt-0.5" />
                <span>The request is filed through our online <Link href="/returns" className="text-[#005F63] font-bold hover:underline">Returns Portal</Link> with photo/video evidence.</span>
              </li>
            </ul>
          </section>

          {/* Section 2: Non-Returnable Items */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">2</span>
              Non-Returnable Product Categories
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              For health, hygiene, and clinical sterility reasons, the following items cannot be returned once opened:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <strong className="block text-slate-800 font-bold mb-0.5">Sterile Consumables</strong>
                <span className="text-slate-500">Needles, burs, scalpel blades, sterile drapes</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <strong className="block text-slate-800 font-bold mb-0.5">Opened Resins & Bonding</strong>
                <span className="text-slate-500">Composite materials, etchants, opened adhesives</span>
              </div>
            </div>
          </section>

          {/* Section 3: 3-Step Return Process */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">3</span>
              3-Step Return Workflow
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-[#005F63] text-white flex items-center justify-center font-bold text-xs">1</div>
                <strong className="block text-xs md:text-sm text-slate-800 font-bold">File Return Request</strong>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Submit a return request via your account dashboard under <Link href="/returns" className="text-[#005F63] font-bold">My Returns</Link> with clear evidence photos.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-[#005F63] text-white flex items-center justify-center font-bold text-xs">2</div>
                <strong className="block text-xs md:text-sm text-slate-800 font-bold">Pickup & Inspection</strong>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Upon approval, courier pickup is scheduled. Items undergo quality inspection (QC) upon receipt at our warehouse.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-[#005F63] text-white flex items-center justify-center font-bold text-xs">3</div>
                <strong className="block text-xs md:text-sm text-slate-800 font-bold">Refund or Replacement</strong>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Once QC passes, an automatic refund is initiated to your payment method or a replacement unit is dispatched.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Cancellation */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">4</span>
              Order Cancellation
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              Orders can be cancelled free of charge prior to shipping status update. Upon cancellation, paid amounts are refunded automatically.
            </p>
          </section>

          {/* Contact Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Need help with a return or replacement?</p>
              <p className="text-sm font-semibold text-white mt-0.5">support@faazo.com | +91 98765 43210</p>
            </div>
            <Link
              href="/returns"
              className="px-4 py-2 bg-[#005F63] hover:bg-[#087276] text-white text-xs font-bold rounded-xl transition-all"
            >
              Open Returns Portal
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
