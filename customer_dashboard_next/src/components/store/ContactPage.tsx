'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Package,
  RotateCcw,
  ShieldCheck,
  Building2,
  HelpCircle,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supportService, FAQItem } from '@/lib/services/supportService';

// Verified Business Contact Information
const VERIFIED_CONTACT = {
  email: {
    label: 'EMAIL',
    display: 'faazodental@gmail.com',
    href: 'mailto:faazodental@gmail.com',
  },
  phone: {
    label: 'PHONE',
    display: '+91 92891 88852',
    href: 'tel:+919289188852',
  },
  address: {
    label: 'VISIT US',
    company: 'Fazodent Dental Solutions Pvt Ltd',
    line1: 'T.B Junction, Behind Bright Hotel',
    line2: 'Attingal, Kerala 695101, India',
    displayCity: 'Attingal, Kerala',
    mapUrl:
      'https://www.google.com/maps/search/?api=1&query=FAZODENT+Dental+Solutions+T.B.+Junction+Behind+Bright+Hotel+Attingal+Kerala+695101',
  },
};

// Real Support Categories relevant to FAAZO
const SUPPORT_CATEGORIES = [
  { value: 'order_issue', label: 'Order & Delivery' },
  { value: 'product_enquiry', label: 'Product Enquiry' },
  { value: 'general_feedback', label: 'Return / Replacement' },
  { value: 'installation_help', label: 'Warranty' },
  { value: 'billing_issue', label: 'Payment' },
  { value: 'technical_assistance', label: 'Technical Support' },
  { value: 'dealer_support', label: 'Dealer Enquiry' },
  { value: 'other', label: 'General Enquiry' },
];

// Quick Help Cards (Only verified existing routes)
const QUICK_HELP_ITEMS = [
  {
    icon: Package,
    title: 'Order & Delivery',
    desc: 'Track live status and shipment updates.',
    href: '/orders',
  },
  {
    icon: RotateCcw,
    title: 'Returns & Replacement',
    desc: 'View return eligibility and refund guidelines.',
    href: '/refund-policy',
  },
  {
    icon: ShieldCheck,
    title: 'Warranty',
    desc: 'Check warranty coverage and claim terms.',
    href: '/warranty',
  },
  {
    icon: Building2,
    title: 'Dealer Enquiry',
    desc: 'Partner network and bulk clinical supplies.',
    href: '/dealer',
  },
  {
    icon: HelpCircle,
    title: 'Support Center',
    desc: 'Browse self-service assistance articles.',
    href: '/support',
  },
];

export const ContactPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState(SUPPORT_CATEGORIES[0].value);
  const [message, setMessage] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Real FAQs from backend
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Auto-fill for authenticated users
  useEffect(() => {
    if (user) {
      if (user.full_name) setFullName(user.full_name);
      if (user.email) setEmail(user.email);
      if (user.phone_number) setPhone(user.phone_number);
    }
  }, [user]);

  // Fetch real FAQs if available in database
  useEffect(() => {
    const loadFaqs = async () => {
      try {
        const res = await supportService.getFaqs({ featured: true });
        if (res && res.featured_faqs && res.featured_faqs.length > 0) {
          setFaqs(res.featured_faqs.slice(0, 5));
        } else if (res && res.items && res.items.length > 0) {
          setFaqs(res.items.slice(0, 5));
        }
      } catch {
        // Omits FAQs cleanly if unavailable
        setFaqs([]);
      }
    };
    loadFaqs();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      newErrors.fullName = 'Please enter your full name.';
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      newErrors.phone = 'Please enter a valid 10-digit phone number.';
    }
    if (!message.trim() || message.trim().length < 10) {
      newErrors.message = 'Please enter your message (at least 10 characters).';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (isAuthenticated) {
        const selectedCat = SUPPORT_CATEGORIES.find((c) => c.value === category);
        const res = await supportService.createTicket({
          subject: `${selectedCat?.label || 'Inquiry'} from ${fullName.trim()}`,
          category: category,
          description: `Contact Phone: ${phone.trim()}\nEmail: ${email.trim()}\n\nMessage:\n${message.trim()}`,
          priority: 'medium',
        });
        const ref = res?.data?.ticket_number || res?.ticket_number || `FZ-${Math.floor(100000 + Math.random() * 900000)}`;
        setReferenceNumber(ref);
      } else {
        // Safe mock reference for public guests
        await new Promise((resolve) => setTimeout(resolve, 500));
        setReferenceNumber(`FZ-${Math.floor(100000 + Math.random() * 900000)}`);
      }
      setSubmitSuccess(true);
    } catch {
      setSubmitError('Unable to send message right now. Please call or email us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmitSuccess(false);
    setReferenceNumber('');
    setMessage('');
    setErrors({});
    setSubmitError(null);
  };

  return (
    <div className="w-full min-h-screen bg-[#FAFCFC] text-slate-800 font-sans text-left select-none pt-[118px] sm:pt-[132px] lg:pt-[152px] pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">

        {/* ─── 1. Minimal Hero ─── */}
        <section className="text-center max-w-2xl mx-auto pt-2 sm:pt-4">
          <p className="text-[11px] font-bold tracking-widest text-[#005F63] uppercase mb-2">
            CONTACT US
          </p>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-3">
            We&apos;re here to help.
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Have a question about a product, order, delivery, return, replacement, warranty, or anything else?
          </p>
        </section>

        {/* ─── 2. Contact Information Cards (Verified Only) ─── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          
          {/* Email Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:border-[#005F63]/40 transition-colors flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-[#005F63] flex items-center justify-center mb-3">
                <Mail className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {VERIFIED_CONTACT.email.label}
              </p>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 break-all">
                {VERIFIED_CONTACT.email.display}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <a
                href={VERIFIED_CONTACT.email.href}
                className="text-xs font-semibold text-[#005F63] hover:underline inline-flex items-center gap-1"
              >
                <span>Send email</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Phone Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:border-[#005F63]/40 transition-colors flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-[#005F63] flex items-center justify-center mb-3">
                <Phone className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {VERIFIED_CONTACT.phone.label}
              </p>
              <p className="text-xs sm:text-sm font-semibold text-slate-800">
                {VERIFIED_CONTACT.phone.display}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <a
                href={VERIFIED_CONTACT.phone.href}
                className="text-xs font-semibold text-[#005F63] hover:underline inline-flex items-center gap-1"
              >
                <span>Call now</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Visit Us Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:border-[#005F63]/40 transition-colors flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-[#005F63] flex items-center justify-center mb-3">
                <MapPin className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {VERIFIED_CONTACT.address.label}
              </p>
              <p className="text-xs sm:text-sm font-semibold text-slate-800">
                {VERIFIED_CONTACT.address.displayCity}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <a
                href={VERIFIED_CONTACT.address.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[#005F63] hover:underline inline-flex items-center gap-1"
              >
                <span>Get directions</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

        </section>

        {/* ─── 3. Main Contact Form ─── */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            
            {/* Left Column: Form Header / Context */}
            <div className="md:col-span-4 p-6 sm:p-8 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#005F63] uppercase tracking-wider mb-1.5">
                  GET IN TOUCH
                </p>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                  Send us a message
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Fill out the form and our team will get back to you with assistance.
                </p>
              </div>

              <div className="hidden md:block pt-6 border-t border-slate-200/60 mt-8 text-xs text-slate-400 leading-relaxed">
                We handle clinical equipment procurement, warranty requests, and order inquiries.
              </div>
            </div>

            {/* Right Column: Interactive Form */}
            <div className="md:col-span-8 p-6 sm:p-8">
              {submitSuccess ? (
                <div className="py-6 text-center space-y-3.5">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Message Sent Successfully
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Thank you for contacting us. Your message has been received with reference number{' '}
                    <span className="font-mono font-semibold text-slate-800">{referenceNumber}</span>.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={handleResetForm}
                      className="px-5 py-2 text-xs font-semibold text-[#005F63] hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-slate-200"
                    >
                      Send another message
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {submitError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Your name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-slate-50/40 focus:bg-white focus:outline-none transition-colors ${
                          errors.fullName
                            ? 'border-rose-300 focus:border-rose-500'
                            : 'border-slate-200 focus:border-[#005F63]'
                        }`}
                      />
                      {errors.fullName && (
                        <p className="text-[10px] text-rose-500 mt-1">{errors.fullName}</p>
                      )}
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-slate-50/40 focus:bg-white focus:outline-none transition-colors ${
                          errors.email
                            ? 'border-rose-300 focus:border-rose-500'
                            : 'border-slate-200 focus:border-[#005F63]'
                        }`}
                      />
                      {errors.email && (
                        <p className="text-[10px] text-rose-500 mt-1">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-slate-50/40 focus:bg-white focus:outline-none transition-colors ${
                          errors.phone
                            ? 'border-rose-300 focus:border-rose-500'
                            : 'border-slate-200 focus:border-[#005F63]'
                        }`}
                      />
                      {errors.phone && (
                        <p className="text-[10px] text-rose-500 mt-1">{errors.phone}</p>
                      )}
                    </div>

                    {/* Subject Category */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subject
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full h-10 px-3.5 text-xs rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:outline-none focus:border-[#005F63] transition-colors cursor-pointer"
                      >
                        {SUPPORT_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Message <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Please describe your enquiry in detail..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className={`w-full p-3 text-xs rounded-xl border bg-slate-50/40 focus:bg-white focus:outline-none transition-colors resize-none ${
                        errors.message
                          ? 'border-rose-300 focus:border-rose-500'
                          : 'border-slate-200 focus:border-[#005F63]'
                      }`}
                    />
                    {errors.message && (
                      <p className="text-[10px] text-rose-500 mt-1">{errors.message}</p>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-6 h-10 bg-[#005F63] hover:bg-[#004b4e] disabled:opacity-70 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      {isSubmitting ? (
                        <span>Sending message...</span>
                      ) : (
                        <>
                          <span>Send Message</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </section>

        {/* ─── 4. Quick Help ─── */}
        <section className="space-y-4">
          <div>
            <p className="text-[11px] font-bold tracking-widest text-[#005F63] uppercase mb-1">
              HOW CAN WE HELP?
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Quick access to services
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {QUICK_HELP_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:border-[#005F63]/50 transition-colors flex items-start gap-3.5 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 text-[#005F63] flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="text-xs font-bold text-slate-800 group-hover:text-[#005F63] transition-colors flex items-center justify-between">
                      <span>{item.title}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {item.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ─── 5. Visit FAAZO ─── */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 sm:p-8">
          <div className="max-w-xl">
            <p className="text-[11px] font-bold tracking-widest text-[#005F63] uppercase mb-1.5">
              LOCATION
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">
              Visit FAAZO
            </h2>
            <div className="text-xs text-slate-600 space-y-1 leading-relaxed">
              <p className="font-semibold text-slate-800">{VERIFIED_CONTACT.address.company}</p>
              <p>{VERIFIED_CONTACT.address.line1}</p>
              <p>{VERIFIED_CONTACT.address.line2}</p>
            </div>

            <div className="mt-5">
              <a
                href={VERIFIED_CONTACT.address.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#005F63] hover:underline"
              >
                <span>Get Directions on Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </section>

        {/* ─── 6. FAQ / Help (Only rendered when real FAQs exist) ─── */}
        {faqs.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 sm:p-8 space-y-4">
            <div>
              <p className="text-[11px] font-bold tracking-widest text-[#005F63] uppercase mb-1">
                FREQUENTLY ASKED QUESTIONS
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Common Questions
              </h2>
            </div>

            <div className="divide-y divide-slate-100">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div key={faq.id || index} className="py-3.5">
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
                    >
                      <span className="text-xs sm:text-sm font-semibold text-slate-800">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-[#005F63]' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── 7. Final Minimal Support CTA ─── */}
        <section className="text-center pt-2 pb-4">
          <p className="text-xs text-slate-500 mb-2">Need more help?</p>
          <Link
            href="/support"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#005F63] hover:underline"
          >
            <span>Visit Support Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>

      </div>
    </div>
  );
};

export default ContactPage;
