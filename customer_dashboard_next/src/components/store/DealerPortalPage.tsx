'use client';

/**
 * FAAZO – Dealer Portal Page
 *
 * Accessible to ALL dealers (pending, approved, rejected).
 * Displays:
 *   - Status banner (pending / approved / rejected)
 *   - Application & company info
 *   - Dealer benefits section
 *   - Quick navigation (Products, Profile, Documents)
 *
 * Purchase gating is handled by the parent App.tsx via can_purchase.
 * This page does NOT duplicate the product listing; it links into the existing flow.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Clock, CheckCircle2, XCircle, Building2, FileText,
  ShoppingBag, User, RefreshCw, Tag, Award, Phone, Mail,
  Handshake, ChevronRight, AlertTriangle, Calendar, Hash,
  Star, Shield, Truck, HeadphonesIcon, Percent, Package,
  Info,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { dealerService } from '../../lib/services/dealer';
import type { DealerApplicationStatus } from '../../lib/services/dealer';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (dt: string | null | undefined): string =>
  dt ? new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    label: 'Application Under Review',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
    textColor: 'text-amber-800',
    badgeBg: 'bg-amber-100 text-amber-700 border-amber-200',
    message:
      'Your dealer application is currently under review by our team. You can browse all products and view dealer pricing, but purchasing will be enabled once your application is approved.',
    cta: 'Estimated review time: 2–3 business days.',
  },
  approved: {
    icon: CheckCircle2,
    label: 'Dealer Account Active',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    textColor: 'text-emerald-800',
    badgeBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    message:
      'Your dealer account is active. You have full access to dealer pricing, exclusive products, and can place B2B orders.',
    cta: '',
  },
  rejected: {
    icon: XCircle,
    label: 'Application Not Approved',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-100',
    textColor: 'text-rose-800',
    badgeBg: 'bg-rose-100 text-rose-700 border-rose-200',
    message:
      'Your dealer application was not approved at this time. You can view products and pricing but purchasing is disabled. Please contact our support team for assistance.',
    cta: 'Please contact support to discuss your application or to re-apply.',
  },
};

// ── Benefit cards ─────────────────────────────────────────────────────────────

const BENEFITS = [
  {
    icon: Percent,
    title: 'Exclusive Dealer Pricing',
    desc: 'Access wholesale prices on our full catalog, saving significantly on every order.',
    color: 'text-[#005B63]',
    bg: 'bg-[#005B63]/8',
  },
  {
    icon: Tag,
    title: 'Volume Discounts',
    desc: 'The more you order, the more you save — tiered pricing based on quantity.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Truck,
    title: 'Priority Fulfillment',
    desc: 'Dealer orders are prioritized in our fulfillment queue for faster delivery.',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    icon: Shield,
    title: 'Dedicated Support',
    desc: 'A dedicated account manager for your practice — direct line, no wait queues.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: Package,
    title: 'Bulk Order Management',
    desc: 'Manage large orders efficiently with streamlined B2B workflows.',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    icon: Star,
    title: 'Early Access',
    desc: 'Be the first to access new products, limited editions, and pre-launch offers.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
];

// ── Info Field ─────────────────────────────────────────────────────────────────

const InfoField: React.FC<{ label: string; value: string | null | undefined; icon?: React.ReactNode; mono?: boolean }> = ({
  label, value, icon, mono,
}) => (
  <div className="flex flex-col gap-1">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
    <div className="flex items-center gap-2">
      {icon && <span className="text-slate-400">{icon}</span>}
      <p className={`text-sm font-semibold text-slate-800 ${mono ? 'font-mono' : ''} ${!value ? 'text-slate-400 italic' : ''}`}>
        {value || '—'}
      </p>
    </div>
  </div>
);

// ── Quick Action Card ─────────────────────────────────────────────────────────

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  desc: string;
  onClick: () => void;
  disabled?: boolean;
  color?: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, desc, onClick, disabled, color = '#005B63' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`group w-full text-left bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4
      transition-all duration-200 shadow-sm
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#005B63]/30 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'}`}
  >
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
      style={{ backgroundColor: disabled ? '#f1f5f9' : `${color}15`, color: disabled ? '#94a3b8' : color }}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-slate-800 leading-tight">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
    </div>
    {!disabled && <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#005B63] group-hover:translate-x-0.5 transition-all shrink-0" />}
  </button>
);

// ── Props ─────────────────────────────────────────────────────────────────────

interface DealerPortalPageProps {
  setCurrentView: (view: any) => void;
  setDashboardSection: (s: any) => void;
  showToast: (msg: string) => void;
}

// ── Main Component ─────────────────────────────────────────────────────────────

const DealerPortalPage: React.FC<DealerPortalPageProps> = ({
  setCurrentView,
  setDashboardSection,
  showToast,
}) => {
  const { user, refreshUser } = useAuth();

  const [application, setApplication] = useState<DealerApplicationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiMessage, setApiMessage] = useState('');

  const fetchStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await dealerService.getStatus();
      if (res.success && res.data) {
        setApplication(res.data);
        setApiMessage(res.message || '');
      }
    } catch (err) {
      if (!silent) console.error('[DealerPortal] Failed to fetch status:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // On mount: refresh user state from backend (ensures can_purchase is up-to-date)
    // then fetch dealer application status
    const init = async () => {
      await refreshUser();
      await fetchStatus();
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    await fetchStatus(true);
    showToast('Dealer status refreshed.');
  };

  // ── Loading skeleton ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-6 animate-pulse">
        <div className="h-8 bg-slate-100 rounded-xl w-56" />
        <div className="h-28 bg-slate-100 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0,1,2].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="h-48 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  const status = application?.status ?? user?.dealer_status ?? 'pending';
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;
  const isApproved = status === 'approved';

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-[100px] lg:pt-[180px] pb-20 flex flex-col gap-6">

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-[#005B63]/10 flex items-center justify-center">
              <Handshake className="w-4 h-4 text-[#005B63]" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-800 font-display tracking-tight">
              Dealer Portal
            </h1>
          </div>
          <p className="text-sm text-slate-400 font-sans">
            {application?.company_name || user?.full_name || 'Your Dealer Account'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-60 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh Status'}
        </button>
      </div>

      {/* ── Status Banner ─────────────────────────────────────────────── */}
      <div className={`${cfg.bg} ${cfg.border} border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-start gap-4`}>
        <div className={`w-11 h-11 rounded-xl ${cfg.iconBg} flex items-center justify-center shrink-0`}>
          <StatusIcon className={`w-5 h-5 ${cfg.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
            <h2 className={`text-sm font-extrabold ${cfg.textColor}`}>{cfg.label}</h2>
            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border ${cfg.badgeBg} capitalize`}>
              {status}
            </span>
          </div>
          <p className={`text-xs ${cfg.textColor} leading-relaxed`}>{cfg.message}</p>
          {status === 'rejected' && application?.rejection_reason && (
            <div className="mt-2.5 bg-white/60 border border-rose-100 rounded-xl px-3.5 py-2.5">
              <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">Rejection Reason</p>
              <p className="text-xs text-rose-800 font-medium">"{application.rejection_reason}"</p>
            </div>
          )}
          {cfg.cta && (
            <p className={`text-[10px] font-semibold ${cfg.textColor} opacity-70 mt-2`}>{cfg.cta}</p>
          )}
        </div>
      </div>

      {/* ── Application Info Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Application Status</p>
          <div className={`flex items-center gap-1.5 mt-1`}>
            <StatusIcon className={`w-4 h-4 ${cfg.iconColor}`} />
            <p className={`text-sm font-extrabold ${cfg.textColor} capitalize`}>{status}</p>
          </div>
          {application?.created_at && (
            <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Applied {fmt(application.created_at)}
            </p>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company</p>
          <p className="text-sm font-extrabold text-slate-800 mt-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {application?.company_name || '—'}
          </p>
          {application?.reviewed_at && (
            <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Reviewed {fmt(application.reviewed_at)}
            </p>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Purchase Access</p>
          {isApproved ? (
            <div className="flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <p className="text-sm font-extrabold text-emerald-700">Enabled</p>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-extrabold text-amber-700">Pending Approval</p>
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-0.5">
            {isApproved ? 'Add to cart, Buy Now & Checkout active' : 'Browsing & pricing visible; orders disabled'}
          </p>
        </div>
      </div>

      {/* ── Account Details ────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#005B63]/10 flex items-center justify-center">
            <User className="w-4 h-4 text-[#005B63]" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800">Account Information</h3>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoField label="Full Name" value={user?.full_name} />
          <InfoField label="Email Address" value={user?.email} />
          <InfoField
            label="Application ID"
            value={application ? `DA-${application.id.slice(0, 8).toUpperCase()}` : '—'}
            icon={<Hash className="w-3.5 h-3.5" />}
            mono
          />
          <InfoField label="Member Since" value={fmt(user?.date_joined ?? undefined)} icon={<Calendar className="w-3.5 h-3.5" />} />
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800">Quick Actions</h3>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickAction
            icon={<ShoppingBag className="w-5 h-5" />}
            label="Browse Products"
            desc="View the full catalog with dealer pricing"
            onClick={() => { setCurrentView('portfolio'); window.scrollTo(0, 0); }}
            color="#005B63"
          />
          <QuickAction
            icon={<User className="w-5 h-5" />}
            label="My Profile"
            desc="Manage clinic info, addresses & security"
            onClick={() => {
              setDashboardSection('profile');
              setCurrentView('my-orders');
              window.scrollTo(0, 0);
            }}
            color="#3b82f6"
          />
          <QuickAction
            icon={<FileText className="w-5 h-5" />}
            label="My Orders"
            desc={isApproved ? 'View and track your dealer orders' : 'Orders available after approval'}
            onClick={() => {
              if (!isApproved) {
                showToast('Order history is available once your account is approved.');
                return;
              }
              setDashboardSection('orders');
              setCurrentView('my-orders');
              window.scrollTo(0, 0);
            }}
            color={isApproved ? '#8b5cf6' : undefined}
            disabled={!isApproved}
          />
          <QuickAction
            icon={<HeadphonesIcon className="w-5 h-5" />}
            label="Contact Support"
            desc="Get help with your account or application"
            onClick={() => {
              setDashboardSection('support');
              setCurrentView('my-orders');
              window.scrollTo(0, 0);
            }}
            color="#f59e0b"
          />
        </div>
      </div>

      {/* ── Dealer Benefits ────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">Dealer Benefits</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {isApproved ? 'All benefits are active on your account.' : 'Benefits activate upon approval.'}
            </p>
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} className={`flex flex-col gap-2.5 p-3.5 rounded-xl border ${isApproved ? 'border-slate-100 bg-slate-50/50' : 'border-slate-100 bg-slate-50/30 opacity-70'}`}>
                <div className={`w-8 h-8 rounded-lg ${b.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${b.color}`} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 leading-snug">{b.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{b.desc}</p>
                </div>
                {isApproved && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-semibold text-emerald-600">Active</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Support Notice (for rejected) ──────────────────────────────── */}
      {status === 'rejected' && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-start gap-3">
          <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-slate-700 mb-1">Need Help?</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              If you believe your application was rejected in error or would like to provide additional documentation,
              please contact our support team. We're here to help get your dealer account approved.
            </p>
            <button
              onClick={() => { setDashboardSection('support'); setCurrentView('my-orders'); window.scrollTo(0, 0); }}
              className="mt-3 flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#005B63] bg-white border border-[#005B63]/20 rounded-xl hover:bg-[#005B63]/5 transition-colors"
            >
              <HeadphonesIcon className="w-3.5 h-3.5" /> Contact Support
            </button>
          </div>
        </div>
      )}

      {/* ── Pending Notice ─────────────────────────────────────────────── */}
      {status === 'pending' && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800 mb-1">What Happens Next?</p>
            <ul className="text-xs text-amber-700 space-y-1.5 leading-relaxed">
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" />Our team will review your submitted documents and company information.</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" />You'll receive an email notification once a decision is made.</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" />Once approved, all dealer benefits and pricing activate immediately.</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" />Use the Refresh Status button above to check for updates anytime.</li>
            </ul>
          </div>
        </div>
      )}

    </div>
  );
};

export default DealerPortalPage;
