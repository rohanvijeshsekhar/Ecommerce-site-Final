import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, CheckCircle2, ShieldAlert, Award, ShoppingBag, Truck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms & Conditions | FAAZO Dental Solutions',
  description: 'Official Terms & Conditions governing dental clinic orders, B2B dealer tier pricing, GST invoicing, warranty claims, and platform usage.',
  openGraph: {
    title: 'Terms & Conditions | FAAZO Dental Solutions',
    description: 'Terms & Conditions governing dental clinic purchasing, B2B dealer tier pricing, GST invoicing, and return policies on FAAZO.',
  },
};

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 pt-[112px] lg:pt-[180px] pb-16 md:pb-24 text-slate-800 font-sans select-none">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
          <Link href="/" className="hover:text-[#005F63] transition-colors">Home</Link>
          <span>/</span>
          <span className="text-slate-800">Terms & Conditions</span>
        </nav>

        {/* Hero Header */}
        <div className="bg-gradient-to-br from-slate-900 via-[#00383B] to-[#005F63] rounded-3xl p-8 md:p-12 text-white shadow-xl mb-10 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-teal-200 border border-white/20 text-xs font-bold uppercase tracking-wider mb-4">
              <FileText className="w-4 h-4 text-teal-300" /> Commercial Agreement
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white font-display">
              Terms & Conditions
            </h1>
            <p className="mt-3 text-sm md:text-base text-slate-200 max-w-2xl leading-relaxed">
              Standard commercial terms governing purchases, B2B dealer tier pricing, GST tax invoicing, and platform operations.
            </p>
            <div className="mt-6 flex items-center gap-4 text-xs text-teal-100 font-medium border-t border-white/10 pt-4">
              <span>Last Updated: February 2026</span>
              <span>•</span>
              <span>FAAZO Dental Solutions Pvt. Ltd.</span>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 md:p-10 space-y-10">

          {/* Section 1: User Account & Registration */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">1</span>
              Account Registration & Eligibility
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              By creating an account on FAAZO, you certify that you are a qualified dental practitioner, clinic manager, authorized medical equipment dealer, or retail customer. Accounts are linked to a single physical mobile number normalized into canonical E.164 format (<code className="bg-slate-100 px-1 py-0.5 rounded text-xs">+91XXXXXXXXXX</code>).
            </p>
          </section>

          {/* Section 2: B2B Dealer Verification */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">2</span>
              B2B Dealer Application & Tier Pricing
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              Customers who apply for B2B Dealer status must upload valid verification documents (GSTIN Certificate, Trade License, or Clinic Registration). 
              <strong className="text-slate-800 font-semibold"> Wholesale dealer tier pricing becomes visible and active only after administrative verification and status approval.</strong> Unapproved applications default to standard customer pricing.
            </p>
          </section>

          {/* Section 3: Product Pricing & GST */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">3</span>
              Product Pricing, Taxes & Invoices
            </h2>
            <ul className="space-y-2 text-xs md:text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#005F63] shrink-0 mt-0.5" />
                <span>All product prices listed on FAAZO include applicable Goods and Services Tax (GST).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#005F63] shrink-0 mt-0.5" />
                <span>GST Tax Invoices with line-item breakdowns (CGST, SGST, IGST, HSN codes) are generated upon order placement and accessible from your profile.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#005F63] shrink-0 mt-0.5" />
                <span>FAAZO reserves the right to correct pricing errors before dispatching an order.</span>
              </li>
            </ul>
          </section>

          {/* Section 4: Orders & Stock Locks */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">4</span>
              Order Placement & Inventory Locking
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              When an order is submitted, inventory is atomically locked to prevent overselling. Orders are confirmed upon successful online payment via Razorpay or upon verification of Cash on Delivery (COD) eligibility.
            </p>
          </section>

          {/* Section 5: Order Cancellation */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">5</span>
              Order Cancellation Policy
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              Customers may cancel an order directly from their account dashboard prior to handover to courier partners. Once dispatched, cancellations are subject to our Return & Refund Policy.
            </p>
          </section>

          {/* Section 6: Shipping & Returns Summary */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">6</span>
              Shipping & Returns Overview
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              Shipping is fulfilled via tracking-enabled courier partners (including Shiprocket). Product returns, replacements, and quality inspections are governed by our dedicated <Link href="/refund-policy" className="text-[#005F63] font-bold hover:underline">Refund & Returns Policy</Link> and <Link href="/shipping-policy" className="text-[#005F63] font-bold hover:underline">Shipping Policy</Link>.
            </p>
          </section>

          {/* Section 7: Limitation of Liability */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">7</span>
              Limitation of Liability
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              FAAZO supplies certified dental products and equipment. Product usage must adhere strictly to manufacturer instructions. FAAZO shall not be liable for damages resulting from improper clinical application or unauthorized product modification.
            </p>
          </section>

          {/* Contact Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Questions about our Commercial Terms?</p>
              <p className="text-sm font-semibold text-white mt-0.5">support@faazo.com | +91 98765 43210</p>
            </div>
            <Link
              href="/support"
              className="px-4 py-2 bg-[#005F63] hover:bg-[#087276] text-white text-xs font-bold rounded-xl transition-all"
            >
              Contact Support
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
