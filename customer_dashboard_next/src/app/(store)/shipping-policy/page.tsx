import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Truck, Package, Clock, ShieldCheck, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Shipping & Delivery Policy | FAAZO Dental Solutions',
  description: 'FAAZO Shipping & Delivery Policy covering courier dispatch, Shiprocket tracking, transit SLAs, and Pan-India dental clinic delivery.',
  openGraph: {
    title: 'Shipping & Delivery Policy | FAAZO Dental Solutions',
    description: 'Shipping & Delivery Policy covering courier dispatch, tracking, transit SLAs, and delivery for FAAZO orders.',
  },
};

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 pt-[112px] lg:pt-[180px] pb-16 md:pb-24 text-slate-800 font-sans select-none">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
          <Link href="/" className="hover:text-[#005F63] transition-colors">Home</Link>
          <span>/</span>
          <span className="text-slate-800">Shipping Policy</span>
        </nav>

        {/* Hero Header */}
        <div className="bg-gradient-to-br from-slate-900 via-[#00383B] to-[#005F63] rounded-3xl p-8 md:p-12 text-white shadow-xl mb-10 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-teal-200 border border-white/20 text-xs font-bold uppercase tracking-wider mb-4">
              <Truck className="w-4 h-4 text-teal-300" /> Dispatch & Logistics
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white font-display">
              Shipping & Delivery Policy
            </h1>
            <p className="mt-3 text-sm md:text-base text-slate-200 max-w-2xl leading-relaxed">
              Pan-India logistics guidelines, courier tracking via Shiprocket, order processing, and delivery standards.
            </p>
            <div className="mt-6 flex items-center gap-4 text-xs text-teal-100 font-medium border-t border-white/10 pt-4">
              <span>Last Updated: February 2026</span>
              <span>•</span>
              <span>Tracking Available for All Orders</span>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 md:p-10 space-y-10">

          {/* Delivery SLA Notice */}
          <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200/80 text-teal-950 text-xs md:text-sm leading-relaxed">
            <div className="flex items-start gap-2.5">
              <Clock className="w-5 h-5 text-[#005F63] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[#005F63] font-bold mb-0.5">Estimated Delivery SLA:</strong>
                Orders are processed and packed promptly upon payment or COD confirmation.
                <span className="font-semibold text-slate-900 underline underline-offset-2 ml-1">
                  [BUSINESS OWNER TO CONFIRM DELIVERY SLA (e.g. 3–5 business days)]
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Coverage & Logistics Partners */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">1</span>
              Shipping Coverage & Logistics Partners
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              FAAZO delivers dental equipment, consumables, and instruments to clinics and dealers across India. Shipments are processed in partnership with leading courier aggregators including **Shiprocket** and trusted logistics carriers.
            </p>
          </section>

          {/* Section 2: Order Processing & Dispatch */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">2</span>
              Order Dispatch Workflow
            </h2>
            <ul className="space-y-2 text-xs md:text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#005F63] shrink-0 mt-0.5" />
                <span>Orders confirmed before 2:00 PM are queued for packing on the same business day.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#005F63] shrink-0 mt-0.5" />
                <span>Specialized equipment requiring clinical calibration or verification will be packed with extra protective insulation.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#005F63] shrink-0 mt-0.5" />
                <span>Once picked up by the courier, a unique Airway Bill (AWB) tracking number is assigned and notified via SMS and email.</span>
              </li>
            </ul>
          </section>

          {/* Section 3: Tracking & Notifications */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">3</span>
              Shipment Tracking & Status Updates
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              Customers can track order milestones (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-semibold text-slate-800">Packed → Shipped → Out for Delivery → Delivered</code>) directly from the <Link href="/orders" className="text-[#005F63] font-bold hover:underline">My Orders</Link> section in their account.
            </p>
          </section>

          {/* Section 4: Shipping Charges */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">4</span>
              Shipping Charges & Free Delivery Thresholds
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              Shipping charges are calculated dynamically at checkout based on order total, delivery pin code, and package weight. Free delivery offers may apply to orders exceeding specified cart thresholds.
            </p>
          </section>

          {/* Section 5: Delivery Verification */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-lg bg-[#005F63]/10 text-[#005F63] flex items-center justify-center text-xs font-black">5</span>
              Receiving & Inspecting Your Package
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              Please inspect the outer packaging seal upon delivery. If a parcel appears heavily damaged or tampered with, refuse acceptance and notify our support team immediately.
            </p>
          </section>

          {/* Contact Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Tracking assistance or shipping queries?</p>
              <p className="text-sm font-semibold text-white mt-0.5">support@faazo.com | +91 98765 43210</p>
            </div>
            <Link
              href="/orders"
              className="px-4 py-2 bg-[#005F63] hover:bg-[#087276] text-white text-xs font-bold rounded-xl transition-all"
            >
              Track My Order
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
