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

// Helper to cleanly render structured answer markdown text with high readability
const renderFormattedAnswer = (text: string) => {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed font-sans">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={index} className="h-1.5" />;
        }
        // Headers (### Heading)
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={index} className="text-xs font-bold text-slate-900 tracking-wide mt-2 mb-1">
              {trimmed.replace(/^###\s+/, '')}
            </h4>
          );
        }
        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          return (
            <h3 key={index} className="text-sm font-extrabold text-slate-900 mt-2 mb-1">
              {trimmed.replace(/^#+\s+/, '')}
            </h3>
          );
        }
        // Bullet or Numbered items
        const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ') || /^\d+\.\s/.test(trimmed);
        const content = trimmed.replace(/^[\*\-]\s+/, '').replace(/^\d+\.\s+/, '');
        
        // Parse bold text **bold**
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        const renderedParts = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className="font-bold text-slate-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          const match = trimmed.match(/^(\d+)\.\s/);
          const prefix = match ? `${match[1]}.` : '•';
          return (
            <div key={index} className="flex items-start gap-2.5 my-1">
              <span className="font-bold text-slate-900 text-xs shrink-0 select-none mt-0.5">{prefix}</span>
              <div className="flex-1 leading-relaxed text-slate-700">{renderedParts}</div>
            </div>
          );
        }

        // Italic note: *Note text*
        if (trimmed.startsWith('*') && trimmed.endsWith('*') && !trimmed.startsWith('**')) {
          return (
            <p key={index} className="text-[11px] text-slate-600 italic my-2 font-medium bg-slate-100/70 p-2.5 rounded-lg border border-slate-200/60">
              {trimmed.slice(1, -1)}
            </p>
          );
        }

        return (
          <p key={index} className="my-1 text-slate-700 leading-relaxed">
            {renderedParts}
          </p>
        );
      })}
    </div>
  );
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
      className={`rounded-2xl transition-all duration-200 bg-white overflow-hidden ${
        isExpanded
          ? 'border border-slate-300 shadow-md ring-1 ring-slate-200'
          : 'border border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-xs'
      }`}
    >
      {/* Header Button (Clickable Accordion) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between gap-4 text-left transition-colors hover:bg-slate-50/70 cursor-pointer"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-[#0B7C80] shrink-0 shadow-2xs">
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              {faq.category_name || 'General Support'}
            </span>
            <h3 className="text-sm font-bold text-slate-900 leading-snug mt-0.5">
              {faq.question}
            </h3>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-500 shrink-0 transition-transform duration-200">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Body */}
      {isExpanded && (
        <div className="px-5 pb-6 pt-2 border-t border-slate-100 space-y-5 animate-in fade-in duration-150">
          
          {/* Clean Formatted Answer Body */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/70 font-sans">
            {renderFormattedAnswer(faq.answer)}
          </div>

          {/* Action Button (if configured) */}
          {faq.action_button_label && (
            <div className="pt-1">
              <button
                onClick={handleActionButtonClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B7C80] hover:bg-[#096669] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <span>{faq.action_button_label}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Feedback Widget: "Did this answer your question?" */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200/70">
              <span className="text-xs font-bold text-slate-800">
                Did this answer your question?
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFeedback(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    feedbackState === 'yes'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
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
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
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
              <div className="mt-4 p-5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
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
                  className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
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
