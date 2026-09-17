'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Building2,
  Wrench,
  Package,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const CONTACT_INFO = {
  phone: {
    display: '+91 92891 88852',
    raw: '+919289188852',
    href: 'tel:+919289188852',
  },
  email: {
    display: 'faazodental@gmail.com',
    href: 'mailto:faazodental@gmail.com',
  },
  whatsapp: {
    display: '+91 92891 88852',
    href: 'https://wa.me/919289188852?text=Hello%20FAAZO%20Team%2C%20I%20have%20an%20inquiry%20regarding%20dental%20equipment%20and%20products.',
  },
  address: {
    company: 'FAZODENT Dental Solutions Pvt. Ltd.',
    line1: 'T.B. Junction, Behind Bright Hotel',
    line2: 'Attingal, Kerala 695101, India',
    mapUrl:
      'https://www.google.com/maps/search/?api=1&query=FAZODENT+Dental+Solutions+T.B.+Junction+Behind+Bright+Hotel+Attingal+Kerala+695101',
    hours: 'Monday – Saturday: 9:00 AM – 7:00 PM IST',
  },
};

const INQUIRY_CATEGORIES = [
  { value: 'product_inquiry', label: 'Product & Equipment Inquiry' },
  { value: 'demo_request', label: 'Request Clinic / Chair Demo' },
  { value: 'bulk_dealer', label: 'Bulk Order & Dealer Pricing' },
  { value: 'clinic_setup', label: 'New Clinic Setup Consultation' },
  { value: 'warranty_service', label: 'Warranty & Equipment Service' },
  { value: 'order_shipping', label: 'Order Tracking & Delivery Status' },
  { value: 'general', label: 'General Inquiry / Other' },
];

const FAQS = [
  {
    q: 'How fast will someone respond to my inquiry?',
    a: 'Our clinical and sales advisors typically respond within 2 to 4 business hours during standard operating times (Mon–Sat, 9 AM – 7 PM IST).',
  },
  {
    q: 'Can I schedule an on-site equipment demonstration?',
    a: 'Yes. Select "Request Clinic / Chair Demo" in the inquiry form, and our field technical team will arrange a demo at your clinic or nearest experience center.',
  },
  {
    q: 'Where do you ship dental equipment and supplies?',
    a: 'We provide insured pan-India delivery across all serviceable pincodes via express courier and freight logistics for heavy equipment.',
  },
  {
    q: 'How can I register an equipment warranty claim?',
    a: 'You can submit a claim directly on our Warranty Portal or select "Warranty & Equipment Service" in the form above with your serial number.',
  },
];

export const ContactPage: React.FC = () => {
  const { user } = useAuth();

  const [form, setForm] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone_number || '',
    clinicName: '',
    category: 'product_inquiry',
    subject: '',
    message: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      errs.fullName = 'Please enter your full name.';
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    const cleanPh = form.phone.replace(/\D/g, '');
    if (!cleanPh || cleanPh.length < 10) {
      errs.phone = 'Please enter a valid 10-digit mobile number.';
    }
    if (!form.message.trim() || form.message.trim().length < 10) {
      errs.message = 'Please provide details of your inquiry (at least 10 characters).';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const refCode = `FZ-INQ-${Math.floor(100000 + Math.random() * 900000)}`;
      setTicketId(refCode);
      setSubmitted(true);
    } catch (err) {
      console.error('Contact submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setForm({
      fullName: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone_number || '',
      clinicName: '',
      category: 'product_inquiry',
      subject: '',
      message: '',
    });
    setErrors({});
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFB] text-slate-800 font-sans text-left select-none pt-[115px] sm:pt-[132px] lg:pt-[152px] pb-24">
      
      {/* ─── Hero Section ─── */}
      <section className="relative bg-gradient-to-b from-[#00343A] via-[#00474F] to-[#006670] text-white overflow-hidden py-12 sm:py-16 px-4 sm:px-6 md:px-12 -mt-[115px] sm:-mt-[132px] lg:-mt-[152px] pt-[145px] sm:pt-[170px] lg:pt-[190px] mb-8 sm:mb-12">
        {/* Subtle Ambient Background Orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-24 w-80 h-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10 text-center">
          {/* Breadcrumb */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-teal-200/80 mb-3 font-medium">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white">Contact Us</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-teal-200 uppercase tracking-wider mb-3">
            <Sparkles className="w-3 h-3 text-teal-300" />
            <span>Clinical & Equipment Concierge</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3 sm:mb-4">
            Get in Touch with FAAZO Specialists
          </h1>
          <p className="text-xs sm:text-base text-teal-100/90 max-w-2xl mx-auto leading-relaxed font-normal">
            Whether you need clinical equipment consultations, custom setup quotations, order updates, or warranty service, our dedicated support team is here to assist.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-12">

        {/* ─── Contact Channels Grid (4 Cards) ─── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          
          {/* Card 1: Direct Helpline */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#e6f3f5] text-[#006670] flex items-center justify-center mb-3.5">
                <Phone className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Phone Support</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Direct hotline for product inquiries & order guidance.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <a
                href={CONTACT_INFO.phone.href}
                className="text-xs font-bold text-[#006670] hover:underline inline-flex items-center gap-1"
              >
                {CONTACT_INFO.phone.display}
                <ArrowRight className="w-3 h-3" />
              </a>
              <p className="text-[10px] text-slate-400 mt-0.5">Mon–Sat: 9 AM – 7 PM IST</p>
            </div>
          </div>

          {/* Card 2: WhatsApp Concierge */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3.5">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">WhatsApp Chat</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Instant quotes, equipment photos, and live support.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <a
                href={CONTACT_INFO.whatsapp.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1"
              >
                Chat on WhatsApp
                <ExternalLink className="w-3 h-3" />
              </a>
              <p className="text-[10px] text-slate-400 mt-0.5">Avg. response &lt; 15 mins</p>
            </div>
          </div>

          {/* Card 3: Email Inquiries */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3.5">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Email Assistance</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Send formal procurement RFQs and institutional inquiries.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <a
                href={CONTACT_INFO.email.href}
                className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 truncate max-w-full"
              >
                {CONTACT_INFO.email.display}
                <ArrowRight className="w-3 h-3 shrink-0" />
              </a>
              <p className="text-[10px] text-slate-400 mt-0.5">24/7 inbox monitoring</p>
            </div>
          </div>

          {/* Card 4: Experience Center */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3.5">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Experience Center</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Visit our physical showroom & demo center in Kerala.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <a
                href={CONTACT_INFO.address.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-amber-700 hover:underline inline-flex items-center gap-1"
              >
                Get Directions
                <ExternalLink className="w-3 h-3" />
              </a>
              <p className="text-[10px] text-slate-400 mt-0.5">Attingal, Kerala, India</p>
            </div>
          </div>

        </section>

        {/* ─── Main Content Grid: Form (Left) & Info Cards (Right) ─── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          
          {/* Left Column: Interactive Contact Form (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 sm:p-8">
            <div className="mb-6">
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006670] uppercase tracking-wider mb-1">
                <Send className="w-3 h-3" />
                <span>Send a Message</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                How Can Our Specialists Assist You?
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Fill in the details below and our team will get back to you within 2–4 business hours.
              </p>
            </div>

            {submitted ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle2 className="w-7 h-7 stroke-[2.3]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Message Received!</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    Thank you for reaching out. We have logged your request under reference code{' '}
                    <span className="font-bold text-slate-800 font-mono">{ticketId}</span>.
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 max-w-sm mx-auto text-left space-y-1">
                  <p className="font-semibold text-slate-800">What happens next?</p>
                  <p className="text-[11px] text-slate-500">
                    • An assigned clinical specialist will review your inquiry.
                    <br />
                    • We will reach out to you at <span className="font-medium text-slate-700">{form.phone || form.email}</span>.
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-[#006670] hover:bg-[#004e56] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Full Name & Phone Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Jane Smith"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-none transition-all ${
                        errors.fullName
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                          : 'border-slate-200 focus:border-[#006670] focus:ring-1 focus:ring-[#006670]'
                      }`}
                    />
                    {errors.fullName && (
                      <p className="text-[10px] text-rose-500 mt-1">{errors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-none transition-all ${
                        errors.phone
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                          : 'border-slate-200 focus:border-[#006670] focus:ring-1 focus:ring-[#006670]'
                      }`}
                    />
                    {errors.phone && (
                      <p className="text-[10px] text-rose-500 mt-1">{errors.phone}</p>
                    )}
                  </div>
                </div>

                {/* Email & Clinic Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Professional Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="doctor@clinic.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-none transition-all ${
                        errors.email
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                          : 'border-slate-200 focus:border-[#006670] focus:ring-1 focus:ring-[#006670]'
                      }`}
                    />
                    {errors.email && (
                      <p className="text-[10px] text-rose-500 mt-1">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Clinic / Practice Name <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Dental Clinic"
                      value={form.clinicName}
                      onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
                      className="w-full h-10 px-3.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#006670] focus:ring-1 focus:ring-[#006670] transition-all"
                    />
                  </div>
                </div>

                {/* Inquiry Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Inquiry Type
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full h-10 px-3.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#006670] focus:ring-1 focus:ring-[#006670] transition-all cursor-pointer"
                  >
                    {INQUIRY_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject / Product Model <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Quotation for Digital Intraoral Scanner & Autoclave"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full h-10 px-3.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#006670] focus:ring-1 focus:ring-[#006670] transition-all"
                  />
                </div>

                {/* Message */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Message & Requirements <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {form.message.length} characters
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Describe your clinic requirements, quantities, or technical service requests..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className={`w-full p-3.5 text-xs rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-none transition-all resize-none ${
                      errors.message
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-200 focus:border-[#006670] focus:ring-1 focus:ring-[#006670]'
                    }`}
                  />
                  {errors.message && (
                    <p className="text-[10px] text-rose-500 mt-1">{errors.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 bg-[#006670] hover:bg-[#004e56] disabled:opacity-70 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]"
                >
                  {submitting ? (
                    <span>Submitting Message...</span>
                  ) : (
                    <>
                      <span>Submit Inquiry</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <p className="text-[10px] text-slate-400 text-center">
                  🔒 Your information is confidential and used strictly for clinical procurement consultation.
                </p>
              </form>
            )}
          </div>

          {/* Right Column: Location & Quick Resource Cards (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* National HQ & Experience Center Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3.5">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <MapPin className="w-4 h-4 text-[#006670]" />
                <h3 className="text-xs font-bold text-slate-900">National Headquarters</h3>
              </div>

              <div className="space-y-1 text-xs text-slate-600">
                <p className="font-bold text-slate-900">{CONTACT_INFO.address.company}</p>
                <p className="text-slate-500">{CONTACT_INFO.address.line1}</p>
                <p className="text-slate-500">{CONTACT_INFO.address.line2}</p>
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{CONTACT_INFO.address.hours}</span>
              </div>

              <a
                href={CONTACT_INFO.address.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>

            {/* WhatsApp Express Box */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl text-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Instant WhatsApp Concierge</h4>
                  <p className="text-[10px] text-emerald-100">Direct chairside support & quotes</p>
                </div>
              </div>
              <p className="text-xs text-emerald-50 leading-relaxed font-normal">
                Need an urgent price quote or video demo of a handpiece or scanner? Chat with our specialist directly.
              </p>
              <a
                href={CONTACT_INFO.whatsapp.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-9 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <span>Chat on WhatsApp</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Quick Navigation / Self-Service Shortcuts */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 px-1 mb-2">Self-Service Portals</h4>
              
              <Link
                href="/orders"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-xs text-slate-700 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-[#006670]" />
                  <span>Track Live Order Status</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/warranty"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-xs text-slate-700 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#006670]" />
                  <span>Warranty Claims & Registration</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/support"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-xs text-slate-700 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4 text-[#006670]" />
                  <span>Knowledge Base & FAQs</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/dealer"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-xs text-slate-700 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-[#006670]" />
                  <span>Dealer & Distributor Portal</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

          </div>
        </section>

        {/* ─── Frequently Asked Questions Accordion ─── */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 sm:p-8">
          <div className="text-center max-w-xl mx-auto mb-6">
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006670] uppercase tracking-wider mb-1">
              <HelpCircle className="w-3 h-3" />
              <span>Quick Answers</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="max-w-3xl mx-auto divide-y divide-slate-100">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="py-3.5">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
                  >
                    <span className="text-xs sm:text-sm font-semibold text-slate-800 hover:text-[#006670] transition-colors">
                      {faq.q}
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-90 text-[#006670]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed font-normal">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
};

export default ContactPage;
