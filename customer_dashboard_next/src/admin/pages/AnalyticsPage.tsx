'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Eye, Clock, RefreshCw, TrendingUp, AlertTriangle,
  Monitor, Smartphone, Tablet, Globe, Download, ArrowUpRight,
  ArrowDownRight, ShoppingCart, Database, Info, BarChart3,
  Activity, MapPin, ExternalLink
} from 'lucide-react';
import { adminService } from '../services/adminService';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<string>('7d');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRealtimeFetch, setLastRealtimeFetch] = useState<number>(Date.now());
  const [realtimeAge, setRealtimeAge] = useState<number>(0);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // ── Data fetching ──
  const fetchDashboard = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    const res = await adminService.getAnalyticsDashboard(p, true);
    if (res.success && res.data) {
      setData(res.data);
      setLastRealtimeFetch(Date.now());
      setRealtimeAge(0);
    } else {
      setError(res.message || 'Unable to load analytics data.');
    }
    setLoading(false);
  }, []);

  const fetchRealtime = useCallback(async () => {
    const res = await adminService.getAnalyticsRealtime();
    if (res.success && res.data) {
      setData((prev: any) => ({ ...prev, realtime: res.data }));
      setLastRealtimeFetch(Date.now());
      setRealtimeAge(0);
    }
  }, []);

  useEffect(() => { fetchDashboard(period); }, [period, fetchDashboard]);

  // Realtime polling every 25s + 1s clock
  useEffect(() => {
    const poll = setInterval(fetchRealtime, 25000);
    const tick = setInterval(() => {
      setRealtimeAge(Math.floor((Date.now() - lastRealtimeFetch) / 1000));
    }, 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [lastRealtimeFetch, fetchRealtime]);

  const handleExport = async () => {
    await adminService.downloadAnalyticsCSV(period, 'overview');
  };

  // ── Data references ──
  const overview = data?.overview || {};
  const trend = data?.trend || [];
  const realtime = data?.realtime || {};
  const topPages = data?.top_pages || [];
  const trafficSources = data?.traffic_sources || [];
  const devices = data?.devices || [];
  const geography = data?.geography || [];
  const faazo = data?.faazo_db_metrics || {};
  const isConfigured = data?.configured ?? true;

  const periodLabel = period === 'today' ? 'Today' : period === 'yesterday' ? 'Yesterday' : period === '30d' ? 'Last 30 Days' : 'Last 7 Days';

  // ── Helpers ──
  const formatPageName = (path: string, title?: string): string => {
    if (!path || path === '/') return 'Homepage';
    if (path === '/products') return 'Products';
    if (path.startsWith('/products/')) return title || 'Product Page';
    if (path === '/categories') return 'Categories';
    if (path.startsWith('/categories/')) return title || 'Category Page';
    if (path === '/cart') return 'Cart';
    if (path === '/checkout') return 'Checkout';
    if (path === '/best-sellers') return 'Best Sellers';
    if (path.startsWith('/brands')) return 'Brands';
    if (path.startsWith('/combo-deals')) return 'Combo Deals';
    if (path.startsWith('/blog')) return 'Blog';
    if (path.startsWith('/support')) return 'Support';
    if (path.startsWith('/warranty')) return 'Warranty';
    return title && title !== 'Page' && !title.includes('FAAZO') ? title : path;
  };

  const formatSource = (source: string, medium: string): string => {
    const s = (source || '').toLowerCase();
    if (s === '(direct)' || s === 'direct') return 'Direct';
    if (s.includes('google')) return 'Google';
    if (s.includes('instagram')) return 'Instagram';
    if (s.includes('facebook')) return 'Facebook';
    if (s.includes('youtube')) return 'YouTube';
    if (s.includes('twitter') || s.includes('x.com')) return 'X (Twitter)';
    return source || 'Other';
  };

  const maxTrendVal = Math.max(...trend.map((t: any) => t.users || 0), 1);
  const totalDeviceUsers = devices.reduce((sum: number, d: any) => sum + (d.users || 0), 0) || 1;

  // ── Comparison badge ──
  const Badge = ({ current, prev, pct }: { current: number; prev: number; pct: number | null }) => {
    if (prev === 0 && current > 0) {
      return (
        <span className="text-[10px] font-bold text-teal-800 bg-teal-500/10 backdrop-blur-sm px-2 py-0.5 rounded-full border border-teal-200/60 mt-1.5 inline-block shadow-sm">
          New activity
        </span>
      );
    }
    if (prev === 0 && current === 0) return null;
    if (pct === null || pct === undefined) return null;
    return (
      <span className={`text-[10px] font-bold mt-1.5 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm ${
        pct >= 0 ? 'text-emerald-700 bg-emerald-500/10 border border-emerald-200/60' : 'text-rose-700 bg-rose-500/10 border border-rose-200/60'
      }`}>
        {pct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {pct >= 0 ? '+' : ''}{pct}%
      </span>
    );
  };

  // ── Loading skeleton ──
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] -m-6 p-6 md:p-8">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <div className="h-32 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/80 animate-pulse shadow-sm" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/80 animate-pulse shadow-sm" />)}
          </div>
          <div className="h-64 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/80 animate-pulse shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] -m-6 p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* HEADER BAR */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 p-6 shadow-sm shadow-slate-100 text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Analytics Dashboard</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50/80 backdrop-blur-sm text-[#005F63] border border-teal-200/70 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#005F63] animate-pulse" />
                  GA4 Live
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Storefront visitor activity &amp; business performance
              </p>
              {isConfigured && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 mt-2">
                  <p>Property: <strong className="text-slate-700 font-mono">{data?.property_id || '546256915'}</strong></p>
                  <p>Tag: <strong className="text-slate-700 font-mono">G-PVTHJXFXQ5</strong></p>
                  <p>Admin routes: <strong className="text-slate-700">Excluded</strong></p>
                  <p>Timezone: <strong className="text-slate-700">Asia/Kolkata (IST)</strong></p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={() => fetchDashboard(period)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/90 backdrop-blur-sm border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-sm hover:shadow"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#005F63] to-[#0A7B7F] hover:from-[#004D50] hover:to-[#08676B] text-white text-xs font-semibold transition-all cursor-pointer shadow-sm hover:shadow"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>

              <div className="inline-flex items-center bg-slate-100/80 backdrop-blur-sm p-1 rounded-xl border border-slate-200/80 text-[11px] font-semibold shadow-inner">
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: '7d', label: '7 Days' },
                  { id: '30d', label: '30 Days' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setPeriod(item.id)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${period === item.id
                        ? 'bg-white text-[#005F63] shadow-sm font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Unconfigured banner */}
        {!isConfigured && (
          <div className="rounded-2xl bg-amber-50/80 backdrop-blur-md border border-amber-200 p-5 flex items-start gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">Google Analytics credentials needed</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Storefront tracking is active (<code className="bg-amber-100/80 px-1 rounded font-mono text-amber-900">G-PVTHJXFXQ5</code>).
                Configure service account credentials in <code className="bg-amber-100/80 px-1 rounded font-mono text-amber-900">backend/.env</code> to view analytics data.
              </p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="rounded-2xl bg-rose-50/80 backdrop-blur-md border border-rose-200 p-4 flex items-center gap-3 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <p className="text-xs text-rose-700 font-medium">{error}</p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* KPI CARDS (LIGHT TINTED GLASS FINISH) */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* 1. Visitors (Light Teal Glass) */}
          <div className="bg-gradient-to-br from-teal-50/80 via-white/85 to-emerald-50/40 backdrop-blur-md rounded-2xl border border-teal-200/70 p-5 text-left hover:border-teal-300 hover:shadow-md hover:shadow-teal-500/5 transition-all duration-300 relative overflow-hidden group shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-[#005F63] border border-teal-200/60 flex items-center justify-center shadow-inner">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-teal-800 bg-teal-100/70 backdrop-blur-sm px-2 py-0.5 rounded-md border border-teal-200/70">GA4</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Visitors</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{loading ? '–' : (overview.total_users ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Unique people who visited</p>
            <Badge current={overview.total_users ?? 0} prev={overview.prev_total_users ?? 0} pct={overview.pct_total_users} />
          </div>

          {/* 2. Visits (Light Sky Blue Glass) */}
          <div className="bg-gradient-to-br from-sky-50/80 via-white/85 to-blue-50/40 backdrop-blur-md rounded-2xl border border-sky-200/70 p-5 text-left hover:border-sky-300 hover:shadow-md hover:shadow-sky-500/5 transition-all duration-300 relative overflow-hidden group shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-200/60 flex items-center justify-center shadow-inner">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-sky-800 bg-sky-100/70 backdrop-blur-sm px-2 py-0.5 rounded-md border border-sky-200/70">GA4</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Visits</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{loading ? '–' : (overview.sessions ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Browsing sessions</p>
            <Badge current={overview.sessions ?? 0} prev={overview.prev_sessions ?? 0} pct={overview.pct_sessions} />
          </div>

          {/* 3. Pages Viewed (Light Indigo Glass) */}
          <div className="bg-gradient-to-br from-indigo-50/80 via-white/85 to-purple-50/40 backdrop-blur-md rounded-2xl border border-indigo-200/70 p-5 text-left hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/5 transition-all duration-300 relative overflow-hidden group shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shadow-inner">
                <Eye className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-800 bg-indigo-100/70 backdrop-blur-sm px-2 py-0.5 rounded-md border border-indigo-200/70">GA4</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pages Viewed</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{loading ? '–' : (overview.page_views ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Storefront pages viewed</p>
            <Badge current={overview.page_views ?? 0} prev={overview.prev_page_views ?? 0} pct={overview.pct_page_views} />
          </div>

          {/* 4. Engagement (Light Warm Amber Glass) */}
          <div className="bg-gradient-to-br from-amber-50/80 via-white/85 to-orange-50/40 backdrop-blur-md rounded-2xl border border-amber-200/70 p-5 text-left hover:border-amber-300 hover:shadow-md hover:shadow-amber-500/5 transition-all duration-300 relative overflow-hidden group shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-200/60 flex items-center justify-center shadow-inner">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/70 backdrop-blur-sm px-2 py-0.5 rounded-md border border-amber-200/70">GA4</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Engagement</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{loading ? '–' : `${overview.engagement_rate ?? 0}%`}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Avg time: {overview.avg_engagement_time ?? '0s'}</p>
            <Badge current={overview.engagement_rate ?? 0} prev={overview.prev_engagement_rate ?? 0} pct={overview.pct_engagement_rate} />
          </div>

          {/* 5. Visitors Right Now (Deep Teal Luminous Glass) */}
          <div className="bg-gradient-to-br from-[#005F63] via-[#08777B] to-[#04484B] rounded-2xl p-5 text-left text-white relative overflow-hidden shadow-lg shadow-teal-900/15 border border-teal-400/30 backdrop-blur-xl group">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[9px] font-bold uppercase tracking-wider text-emerald-100 border border-white/25 shadow-inner">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-300" />
                Live
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/70">GA4</span>
            </div>
            <p className="text-[10px] font-semibold text-teal-100 uppercase tracking-wider">Visitors Right Now</p>
            <p className="text-3xl font-extrabold text-white mt-0.5">{realtime.active_users ?? 0}</p>
            <p className="text-[10px] text-teal-100 mt-0.5">
              {(realtime.active_users ?? 0) === 0 ? 'No visitors active right now' : 'People on FAAZO now'}
            </p>
            <p className="text-[9px] text-teal-200/70 mt-1">Updated {realtimeAge}s ago</p>
          </div>

          {/* 6. Orders (Light Mint Emerald Glass) */}
          <div className="bg-gradient-to-br from-emerald-50/80 via-white/85 to-teal-50/40 backdrop-blur-md rounded-2xl border border-emerald-200/70 p-5 text-left hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-500/5 transition-all duration-300 relative overflow-hidden group shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shadow-inner">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 backdrop-blur-sm px-2 py-0.5 rounded-md border border-emerald-200/70">FAAZO Data</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Orders</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{loading ? '–' : (faazo.total_orders ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">{faazo.paid_orders ?? 0} paid / completed</p>
          </div>

          {/* 7. Actual Revenue (Light Emerald Teal Wide Glass) */}
          <div className="bg-gradient-to-br from-emerald-50/85 via-white/85 to-teal-50/50 backdrop-blur-md rounded-2xl border border-emerald-200/80 p-5 text-left hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-500/5 transition-all duration-300 relative overflow-hidden group col-span-2 lg:col-span-2 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shadow-inner">
                <Database className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 backdrop-blur-sm px-2 py-0.5 rounded-md border border-emerald-200/70">FAAZO Data</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actual Revenue</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">
              {loading ? '–' : `₹${(faazo.total_revenue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Revenue from FAAZO order records</p>
          </div>
        </div>

        {/* GA4 intraday notice — only for Today */}
        {period === 'today' && isConfigured && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <p className="text-[11px] text-slate-500">
              <strong className="text-slate-600">Note:</strong> GA4 daily report data for today may take several hours to fully process. Live visitors are shown instantly above.
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* WEBSITE ACTIVITY CHART */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-white/90 via-slate-50/60 to-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 p-6 text-left shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Website Activity</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Visitors and page views — {periodLabel}</p>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#005F63] bg-teal-100/70 backdrop-blur-sm px-2 py-0.5 rounded-md border border-teal-200/70">GA4</span>
          </div>

          {trend.length > 1 ? (
            <div className="h-52 flex items-end gap-2 pt-8 pb-3 overflow-x-auto border-b border-slate-100">
              {trend.map((item: any, idx: number) => {
                const h = Math.min(80, Math.max(8, (item.users / maxTrendVal) * 80));
                return (
                  <div key={idx} className="flex-1 min-w-[32px] flex flex-col items-center group relative h-full justify-end">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col bg-slate-800 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap z-30 shadow-lg pointer-events-none">
                      <span className="text-teal-300 font-bold">{item.date}</span>
                      <span className="text-slate-300 mt-0.5">{item.users} visitors · {item.page_views} views</span>
                    </div>
                    <div
                      style={{ height: `${h}%` }}
                      className="w-full max-w-[24px] bg-gradient-to-t from-[#005F63] to-[#0B8C90] rounded-t-lg group-hover:from-[#004D50] transition-colors shadow-sm"
                    />
                    <span className="text-[9px] font-medium text-slate-400 mt-1.5 truncate w-full text-center">{item.date}</span>
                  </div>
                );
              })}
            </div>
          ) : trend.length === 1 ? (
            <div className="p-5 rounded-xl bg-white/70 backdrop-blur-sm border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div>
                <p className="text-xs font-bold text-slate-700">Single data point recorded for {trend[0].date}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">More daily data points will appear as visitors browse the storefront.</p>
              </div>
              <div className="flex items-center gap-5 bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-slate-200 shrink-0 text-center shadow-sm">
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-semibold">Visitors</p>
                  <p className="text-sm font-extrabold text-[#005F63]">{trend[0].users}</p>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-semibold">Views</p>
                  <p className="text-sm font-extrabold text-indigo-600">{trend[0].page_views}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-slate-400">
              {isConfigured
                ? 'No website activity recorded for this period.'
                : 'GA4 credentials not configured on backend.'}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* POPULAR PAGES + TRAFFIC SOURCES (side by side) */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Popular Pages */}
          <div className="bg-gradient-to-br from-white/90 via-slate-50/60 to-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 p-6 text-left shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Popular Pages</h2>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#005F63] bg-teal-100/70 backdrop-blur-sm px-2 py-0.5 rounded-md border border-teal-200/70">GA4</span>
            </div>
            {topPages.length > 0 ? (
              <div className="space-y-2">
                {topPages.slice(0, 8).map((page: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200/60 text-xs shadow-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{formatPageName(page.path, page.title)}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{page.path}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-bold text-[#005F63]">{page.views} views</p>
                      <p className="text-[10px] text-slate-400">{page.users} visitors</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No page data recorded for this period.
              </div>
            )}
          </div>

          {/* Traffic Sources */}
          <div className="bg-gradient-to-br from-white/90 via-slate-50/60 to-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 p-6 text-left shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Where Visitors Came From</h2>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#005F63] bg-teal-100/70 backdrop-blur-sm px-2 py-0.5 rounded-md border border-teal-200/70">GA4</span>
            </div>
            {trafficSources.length > 0 ? (
              <div className="space-y-2">
                {trafficSources.map((src: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200/60 text-xs shadow-sm">
                    <div>
                      <p className="font-semibold text-slate-800">{formatSource(src.source, src.medium)}</p>
                      <p className="text-[10px] text-slate-400">{src.sessions} visits</p>
                    </div>
                    <p className="font-bold text-[#005F63] shrink-0">{src.users} visitors</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No traffic source data recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* DEVICES + GEOGRAPHY (side by side) */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Devices */}
          <div className="bg-gradient-to-br from-white/90 via-slate-50/60 to-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 p-6 text-left shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">How People Use FAAZO</h2>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#005F63] bg-teal-100/70 backdrop-blur-sm px-2 py-0.5 rounded-md border border-teal-200/70">GA4</span>
            </div>
            {devices.length > 0 ? (
              <div className="space-y-3">
                {devices.map((dev: any, idx: number) => {
                  const pct = Math.round((dev.users / totalDeviceUsers) * 100);
                  const isMobile = dev.category?.toLowerCase().includes('mobile');
                  const isTablet = dev.category?.toLowerCase().includes('tablet');
                  const Icon = isMobile ? Smartphone : isTablet ? Tablet : Monitor;
                  const color = isMobile ? 'teal' : isTablet ? 'indigo' : 'sky';
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-2 capitalize font-semibold text-slate-700">
                          <Icon className={`w-3.5 h-3.5 text-${color}-500`} />
                          {dev.category || 'Desktop'}
                        </span>
                        <span className="text-slate-500 font-medium">{dev.users} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100/80 h-1.5 rounded-full overflow-hidden shadow-inner">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full rounded-full ${isMobile ? 'bg-teal-500' : isTablet ? 'bg-indigo-500' : 'bg-sky-500'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">No device data recorded.</div>
            )}
          </div>

          {/* Geography */}
          <div className="bg-gradient-to-br from-white/90 via-slate-50/60 to-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 p-6 text-left shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Where Visitors Are</h2>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#005F63] bg-teal-100/70 backdrop-blur-sm px-2 py-0.5 rounded-md border border-teal-200/70">GA4</span>
            </div>
            {geography.length > 0 ? (
              <div className="space-y-2">
                {geography.map((geo: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200/60 text-xs shadow-sm">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {geo.country}{geo.city && geo.city !== '(not set)' ? ` — ${geo.city}` : ''}
                    </span>
                    <span className="font-bold text-[#005F63] shrink-0">{geo.users}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">No location data recorded.</div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* FAAZO BUSINESS PERFORMANCE */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-emerald-50/70 via-white/85 to-teal-50/40 backdrop-blur-md rounded-2xl border border-emerald-200/80 p-6 text-left shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">FAAZO Business Performance</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Source: FAAZO database — {periodLabel}</p>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 backdrop-blur-sm px-2 py-0.5 rounded-md border border-emerald-200/70">FAAZO Data</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-emerald-100/80 shadow-sm">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Total Orders</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{(faazo.total_orders ?? 0).toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-emerald-100/80 shadow-sm">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Paid / Completed</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{(faazo.paid_orders ?? 0).toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-emerald-100/80 shadow-sm">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Actual Revenue</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                ₹{(faazo.total_revenue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-3">
            Actual order records and revenue are sourced 100% from the FAAZO database. Detailed GA4 shopping behaviour is not currently tracked.
          </p>
        </div>

      </div>
    </div>
  );
}
