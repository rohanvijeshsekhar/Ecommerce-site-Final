import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Lock, Eye, FileText, Smartphone, CreditCard, Mail, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | FAAZO Dental Solutions',
  description: 'FAAZO Privacy Policy governing customer data, phone number E.164 normalization, B2B dealer verification documents, and payment processing.',
  openGraph: {
    title: 'Privacy Policy | FAAZO Dental Solutions',
    description: 'Privacy Policy governing customer data, phone number normalization, dealer verification, and payment processing on FAAZO.',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 pt-[112px] lg:pt-[180px] pb-16 md:pb-24 text-slate-800 font-sans select-none">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
          <Link href="/" className="hover:text-[#005F63] transition-colors">Home</Link>
          <span>/</span>
          <span className="text-slate-800">Privacy Policy</span>
        </nav>

        {/* Hero Header */}
        <div className="bg-gradient-to-br from-slate-900 via-[#00383B] to-[#005F63] rounded-3xl p-8 md:p-12 text-white shadow-xl mb-10 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-teal-200 border border-white/20 text-xs font-bold uppercase tracking-wider mb-4">
              <ShieldCheck className="w-4 h-4 text-teal-300" /> Legal & Data Governance
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white font-display">
              Privacy Policy
            </h1>
            <p className="mt-3 text-sm md:text-base text-slate-200 max-w-2xl leading-relaxed">
              Transparent rules on how FAAZO Dental Solutions collects, normalizes, uses, and protects clinic, dealer, and customer data.
            </p>
            <div className="mt-6 flex items-center gap-4 text-xs text-teal-100 font-medium border-t border-white/10 pt-4">
              <span>Last Updated: February 2026</span>
              <span>•</span>
              <span>Applies to Website & Mobile App</span>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 md:p-10 space-y-10">
          
          {/* Executive Summary Callout */}
          <div className="p-5 rounded-2xl bg-teal-50/80 border border-teal-200/60 text-slate-800">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-[#005F63] shrink-0 mt-0.5" />
              <div className="text-xs md:text-sm leading-relaxed">
                <p className="font-bold text-[#005F63] mb-1">Key Summary:</p>
                <p className="text-slate-700">
                  FAAZO respects your privacy. We collect data necessary for dental equipment & supply ordering, E.164 phone verification, GST invoicing, and B2B dealer verification. 
                  <strong className="text-slate-900 font-semibold"> We do NOT store your credit/debit card numbers or bank passwords.</strong> Payments are securely processed via Razorpay.
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: Introduction */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">1</span>
              Introduction & Scope
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              FAAZO Dental Solutions Pvt. Ltd. (&quot;FAAZO&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the FAAZO dental e-commerce website and mobile application. This Privacy Policy details our commitment to safeguarding the personal and professional data of dentists, clinic managers, B2B dealers, and retail customers who use our services.
            </p>
          </section>

          {/* Section 2: Data Collection */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">2</span>
              Information We Collect
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs md:text-sm text-slate-800">
                  <Smartphone className="w-4 h-4 text-[#005F63]" /> Account & Contact Data
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Full name, email address, and physical mobile numbers. Mobile numbers are normalized into canonical E.164 format (<code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">+91XXXXXXXXXX</code>) for OTP verification and account identification.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs md:text-sm text-slate-800">
                  <FileText className="w-4 h-4 text-[#005F63]" /> B2B Dealer Documents
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Company/clinic name, GSTIN certificate, trade licenses, or business registration documents submitted for B2B wholesale pricing approval.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs md:text-sm text-slate-800">
                  <CreditCard className="w-4 h-4 text-[#005F63]" /> Delivery & Billing Addresses
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Delivery address, pin code, state, city, and tax details required for GST compliant invoice generation and courier dispatch.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs md:text-sm text-slate-800">
                  <Eye className="w-4 h-4 text-[#005F63]" /> Technical Data & Log Files
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Client IP address, user-agent string, device details, and session metadata used for security audits and lockout prevention.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Payment Handling */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">3</span>
              Payment & Security Processing
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              Online payments are processed securely through **Razorpay**. FAAZO servers receive only confirmation tokens, transaction status, and payment IDs. We do not store, process, or transmit credit card numbers, CVVs, or NetBanking credentials on our infrastructure.
            </p>
          </section>

          {/* Section 4: How We Use Data */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">4</span>
              How We Use Information
            </h2>
            <ul className="space-y-2 text-xs md:text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#005F63] shrink-0 mt-0.5" />
                <span>Processing orders, dental equipment purchases, and GST tax invoice generation.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#005F63] shrink-0 mt-0.5" />
                <span>Dispatching order confirmation, tracking updates, and OTP verification via SMS and Email.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#005F63] shrink-0 mt-0.5" />
                <span>Reviewing and verifying B2B Dealer applications for tier pricing access.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#005F63] shrink-0 mt-0.5" />
                <span>Managing serial-number warranty registrations and customer support ticket resolutions.</span>
              </li>
            </ul>
          </section>

          {/* Section 5: Cookies & Storage */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">5</span>
              Cookies & Local Storage
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              We use <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-semibold">HttpOnly</code> cookies for secure JWT refresh token rotation (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">faazo_refresh</code>) and local storage for guest shopping carts and user UI preferences.
            </p>
          </section>

          {/* Section 6: Data Sharing & Third Parties */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">6</span>
              Third-Party Service Providers
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              Data is shared exclusively with necessary operational partners:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <strong className="block text-slate-800">Razorpay</strong>
                <span className="text-slate-500">Payment Processing</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <strong className="block text-slate-800">Shiprocket</strong>
                <span className="text-slate-500">Logistics & Tracking</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <strong className="block text-slate-800">Sangamam / SMS Gateways</strong>
                <span className="text-slate-500">OTP & Order Alerts</span>
              </div>
            </div>
          </section>

          {/* Section 7: User Rights & Contact */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">7</span>
              Your Rights & Contact Information
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              You may review, update, or request corrections to your account information through your profile settings or by contacting customer support.
            </p>
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Data Protection & Privacy Contact</p>
                <p className="text-sm font-semibold text-white mt-0.5">support@faazo.com | +91 98765 43210</p>
              </div>
              <Link
                href="/support"
                className="px-4 py-2 bg-[#005F63] hover:bg-[#087276] text-white text-xs font-bold rounded-xl transition-all"
              >
                Contact Support
              </Link>
            </div>
          </section>

        </div>

      </div>
    </div>
  );
}
