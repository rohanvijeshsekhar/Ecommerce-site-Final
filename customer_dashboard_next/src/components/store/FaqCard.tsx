'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  Package,
  PackageSearch,
  Truck,
  RotateCcw,
  XCircle,
  AlertTriangle,
  Wrench,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { supportService, FAQItem } from '@/lib/services/supportService';
import { useAuth } from '@/hooks/useAuth';

interface FaqCardProps {
  faq: FAQItem;
  defaultExpanded?: boolean;
  userLatestOrderNumber?: string | null;
  onActionClick?: (actionType?: string, url?: string) => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Package,
  PackageSearch,
  Truck,
  RotateCcw,
  XCircle,
  AlertTriangle,
  Wrench,
  HelpCircle,
};

export const FaqCard: React.FC<FaqCardProps> = ({
  faq,
  defaultExpanded = false,
  userLatestOrderNumber = null,
  onActionClick,
}) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [feedbackState, setFeedbackState] = useState<'none' | 'yes' | 'no'>('none');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const IconComponent = ICON_MAP[faq.icon_name || 'HelpCircle'] || HelpCircle;

  const handleFeedback = async (isHelpful: boolean) => {
    setFeedbackState(isHelpful ? 'yes' : 'no');
    try {
      await supportService.submitFeedback(faq.id, isHelpful);
      setFeedbackSubmitted(true);
    } catch (e) {
      console.error('Feedback submission error:', e);
    }
  };

  const handleActionButtonClick = () => {
    if (onActionClick) {
      onActionClick(faq.action_button_type, faq.action_button_url);
    } else if (faq.action_button_url) {
      router.push(faq.action_button_url);
    }
  };

  // Generate WhatsApp pre-filled message
  const customerName = user ? (user.full_name || user.email) : '';
  const customerPhone = user ? (user.phone_number || '') : '';
  const orderNum = userLatestOrderNumber || '';

  const whatsappMessage = `Hello FAAZO Support,

I need assistance with my order.

Name: ${customerName}
Order Number (if available): ${orderNum}
Phone Number: ${customerPhone}
Issue: ${faq.question}`;

  const whatsappUrl = `https://wa.me/919876543210?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 shadow-2xs overflow-hidden ${
        isExpanded ? 'border-teal-500/60 ring-2 ring-teal-500/10 shadow-md' : 'border-slate-200/80 hover:border-teal-200'
      }`}
    >
      {/* Header Button (Clickable Accordion) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between gap-4 text-left transition-colors hover:bg-slate-50/50 cursor-pointer"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100/80 flex items-center justify-center text-teal-700 shrink-0 shadow-2xs">
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 block">
              {faq.category_name || 'General Support'}
            </span>
            <h3 className="text-sm font-bold text-slate-900 leading-snug mt-0.5">
              {faq.question}
            </h3>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-500 shrink-0 transition-transform duration-200">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Body */}
      {isExpanded && (
        <div className="px-5 pb-6 pt-2 border-t border-slate-100 space-y-5 animate-in fade-in duration-150">
          
          {/* Formatted Answer Body */}
          <div className="text-xs text-slate-600 leading-relaxed space-y-3 font-sans font-medium whitespace-pre-line bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            {faq.answer}
          </div>

          {/* Action Button (if configured) */}
          {faq.action_button_label && (
            <div className="pt-1">
              <button
                onClick={handleActionButtonClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-700/20 transition-all cursor-pointer"
              >
                <span>{faq.action_button_label}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Feedback Widget: "Did this answer your question?" */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <span className="text-xs font-bold text-slate-700">
                Did this answer your question?
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFeedback(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    feedbackState === 'yes'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Yes</span>
                </button>

                <button
                  onClick={() => handleFeedback(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    feedbackState === 'no'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>No, I still need help</span>
                </button>
              </div>
            </div>

            {/* If YES selected */}
            {feedbackState === 'yes' && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Thank you for your feedback! Glad we could help.</span>
              </div>
            )}

            {/* If NO selected -> Display Prominent WhatsApp Chat CTA */}
            {feedbackState === 'no' && (
              <div className="mt-4 p-5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                    <MessageCircle className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Need Personalized Assistance?
                    </h4>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Connect directly with a FAAZO support executive on WhatsApp. Your message will be pre-filled with your details.
                    </p>
                  </div>
                </div>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>Chat on WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
