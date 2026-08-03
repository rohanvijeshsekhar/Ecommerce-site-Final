'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  Mail,
  Send,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { shareService, ShareableProduct } from '@/lib/services/shareService';
import { showToast } from './Toast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ShareableProduct | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, product }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !product) return null;

  const canonicalUrl = shareService.getCanonicalUrl(product.slug || product.id);
  const prodImg = product.image_url || product.image || '/images/bestseller_handpiece.png';

  const handlePlatformShare = (platform: string) => {
    // Log analytics event
    shareService.logShareEvent(product.id || product.slug, platform);

    if (platform === 'copy_link') {
      navigator.clipboard.writeText(canonicalUrl);
      setCopied(true);
      showToast('Product link copied successfully.');
      setTimeout(() => setCopied(false), 2500);
      return;
    }

    if (platform === 'native_share') {
      if (typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({
          title: product.name,
          text: shareService.getShareMessage(product),
          url: canonicalUrl,
        }).catch(() => {});
        return;
      }
    }

    const shareUrl = shareService.getPlatformShareUrl(platform, product);
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const platforms = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      bgColor: 'bg-emerald-500 hover:bg-emerald-600',
      textColor: 'text-white',
      icon: <MessageSquare className="w-5 h-5 fill-white" />,
    },
    {
      id: 'telegram',
      name: 'Telegram',
      bgColor: 'bg-sky-500 hover:bg-sky-600',
      textColor: 'text-white',
      icon: <Send className="w-5 h-5" />,
    },
    {
      id: 'facebook',
      name: 'Facebook',
      bgColor: 'bg-blue-600 hover:bg-blue-700',
      textColor: 'text-white',
      icon: <ExternalLink className="w-5 h-5" />,
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      bgColor: 'bg-slate-900 hover:bg-slate-800',
      textColor: 'text-white',
      icon: <Share2 className="w-5 h-5" />,
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      bgColor: 'bg-blue-700 hover:bg-blue-800',
      textColor: 'text-white',
      icon: <ExternalLink className="w-5 h-5" />,
    },
    {
      id: 'email',
      name: 'Email',
      bgColor: 'bg-teal-600 hover:bg-teal-700',
      textColor: 'text-white',
      icon: <Mail className="w-5 h-5" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-left select-none animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                Share Product
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Share with colleagues, clinics, or social channels
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product Preview Card */}
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
            <div className="w-16 h-16 rounded-xl bg-white border border-slate-200/80 p-2 flex items-center justify-center shrink-0">
              <img src={prodImg} alt={product.name} className="max-h-full object-contain" />
            </div>
            <div className="space-y-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-900 truncate">
                {product.name}
              </h4>
              {product.price && (
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-black text-slate-900 font-display">
                    ₹{Number(product.price).toLocaleString('en-IN')}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-[11px] text-slate-400 line-through">
                      ₹{Number(product.originalPrice).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              )}
              <span className="text-[10px] text-teal-700 font-medium truncate block">
                {canonicalUrl}
              </span>
            </div>
          </div>

          {/* Social Platforms Grid */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">
              Share to Social Channels
            </span>
            <div className="grid grid-cols-3 gap-3">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePlatformShare(p.id)}
                  className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl ${p.bgColor} ${p.textColor} shadow-2xs hover:shadow-md transition-all cursor-pointer group`}
                >
                  <div className="group-hover:scale-110 transition-transform">
                    {p.icon}
                  </div>
                  <span className="text-[11px] font-bold">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Copy Link Input Bar */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Direct Product Link
            </span>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 p-1.5 rounded-2xl">
              <input
                type="text"
                readOnly
                value={canonicalUrl}
                className="w-full px-3 py-1.5 text-xs text-slate-600 font-mono bg-transparent outline-none truncate"
              />
              <button
                onClick={() => handlePlatformShare('copy_link')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-teal-600 hover:bg-teal-500 text-white shadow-sm'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Mobile Native Share Sheet Button (If supported) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <div className="pt-2">
              <button
                onClick={() => handlePlatformShare('native_share')}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200/80 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-teal-700" />
                <span>Open Device Native Share Sheet</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
