'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Eye, Clock, RefreshCw, TrendingUp, AlertTriangle,
  Monitor, Smartphone, Tablet, Globe, Download, ArrowUpRight,
  ArrowDownRight, ShoppingCart, Database, Info, BarChart3,
  Activity, MapPin, ExternalLink, IndianRupee
} from 'lucide-react';
import { adminService } from '../services/adminService';

interface SalesSeriesItem {
  time: string;
  label: string;
  sales: number;
  orders: number;
}

interface SalesOverTimeData {
  period: string;
  interval: 'hourly' | 'daily';
  timezone: string;
  total_sales: number;
  total_orders: number;
  cod_orders: number;
  paid_orders: number;
  prev_total_sales: number;
  prev_total_orders: number;
  pct_sales_change: number | null;
  is_new_activity: boolean;
  series: SalesSeriesItem[];
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<string>('7d');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRealtimeFetch, setLastRealtimeFetch] = useState<number>(Date.now());
  const [realtimeAge, setRealtimeAge] = useState<number>(0);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [liveVisitors, setLiveVisitors] = useState<number>(0);
  const [hoveredSalesIndex, setHoveredSalesIndex] = useState<number | null>(null);

  // ── Data fetching ──
  const fetchDashboard = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    const res = await adminService.getAnalyticsDashboard(p, true);
    if (res.success && res.data) {
      setData(res.data);
      setLiveVisitors(res.data.live_storefront_visitors ?? 0);
      setLastRealtimeFetch(Date.now());
      setRealtimeAge(0);
    } else {
      setError(res.message || 'Unable to load analytics data.');
    }
    setLoading(false);
  }, []);

  const fetchLiveVisitors = useCallback(async () => {
    const res = await adminService.getLiveVisitors();
    if (res.success && res.data) {
      setLiveVisitors(res.data.live_visitors ?? 0);
      setLastRealtimeFetch(Date.now());
      setRealtimeAge(0);
    }
  }, []);

  useEffect(() => { fetchDashboard(period); }, [period, fetchDashboard]);

  // Live visitor presence polling every 15s + 1s elapsed timer
  useEffect(() => {
    const poll = setInterval(fetchLiveVisitors, 15000);
    const tick = setInterval(() => {
      setRealtimeAge(Math.floor((Date.now() - lastRealtimeFetch) / 1000));
    }, 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [lastRealtimeFetch, fetchLiveVisitors]);

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
  const salesOverTime: SalesOverTimeData = data?.sales_over_time || {
    period: period,
    interval: period === 'today' || period === 'yesterday' ? 'hourly' : 'daily',
    timezone: 'Asia/Kolkata',
    total_sales: 0,
    total_orders: 0,
    cod_orders: 0,
    paid_orders: 0,
    prev_total_sales: 0,
    prev_total_orders: 0,
    pct_sales_change: null,
    is_new_activity: false,
    series: []
  };
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

  // Max sales for chart scaling
  const maxSalesVal = useMemo(() => {
    if (!salesOverTime.series || salesOverTime.series.length === 0) return 1;
    return Math.max(...salesOverTime.series.map(s => s.sales || 0), 1);
  }, [salesOverTime.series]);

  // ── Comparison badge ──
  const Badge = ({ current, prev, pct, isNew }: { current: number; prev: number; pct: number | null; isNew?: boolean }) => {
    if ((prev === 0 && current > 0) || isNew) {
      return (
        <span className="text-[10px] font-bold text-[#005F63] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 mt-1 inline-block">
          New activity
        </span>
      );
    }
    if (prev === 0 && current === 0) {
      return (
        <span className="text-[10px] font-medium text-slate-400 mt-1 inline-block">
          No previous data
        </span>
      );
    }
    if (pct === null || pct === undefined) return null;
    return (
      <span className={`text-[10px] font-bold mt-1 inline-flex items-center gap-0.5 ${pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
        {pct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {pct >= 0 ? '↑ ' : '↓ '}{Math.abs(pct)}%
      </span>
    );
  };

  // ── Loading skeleton ──
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] -m-6 p-6 md:p-8">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <div className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse" />)}
          </div>
          <div className="h-64 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] -m-6 p-6 md:p-8 font-sans select-none">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* HEADER */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-[#005F63]" />
                <span className="text-[11px] font-bold text-[#005F63] uppercase tracking-wider">FAAZO Analytics</span>
              </div>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                Website & Business Performance
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-lg">
                See how many people are visiting FAAZO, what they are viewing, where they come from, and how website activity relates to actual orders.
              </p>

              {/* Analytics status toggle */}
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>{isConfigured ? 'Analytics active' : 'Configuration needed'}</span>
                <Info className="w-3 h-3" />
              </button>

              {showConfig && (
                <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500 space-y-0.5 max-w-sm font-mono">
                  <p>Property: <strong className="text-slate-700">546256915</strong></p>
                  <p>Tag: <strong className="text-slate-700">G-PVTHJXFXQ5</strong></p>
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
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#005F63] hover:bg-[#004D50] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>

              <div className="inline-flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-[11px] font-semibold">
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: '7d', label: '7 Days' },
                  { id: '30d', label: '30 Days' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setPeriod(item.id)}
                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      period === item.id
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
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">Google Analytics credentials needed</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Storefront tracking is active (<code className="bg-amber-100 px-1 rounded font-mono text-amber-900">G-PVTHJXFXQ5</code>).
                Configure service account credentials in <code className="bg-amber-100 px-1 rounded font-mono text-amber-900">backend/.env</code> to view analytics data.
              </p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <p className="text-xs text-rose-700 font-medium">{error}</p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TOP ROW: LIVE VISITORS + QUICK OVERVIEW */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* 🟢 FEATURE 1: LIVE VISITORS CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 text-left hover:border-emerald-300 transition-all relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-bold text-slate-800">Live visitors</span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                Storefront Live
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div>
                <p className="text-[11px] font-medium text-slate-500">On your store now</p>
                <p className="text-3xl lg:text-4xl font-black text-slate-900 mt-0.5 tracking-tight">
                  {liveVisitors}
                </p>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Updated {realtimeAge}s ago</p>
            </div>
          </div>

          {/* Total Visitors in Period */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-[#005F63]/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#005F63] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#005F63] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">GA4</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Visitors</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{loading ? '–' : (overview.total_users ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Unique customers in period</p>
            <Badge current={overview.total_users ?? 0} prev={overview.prev_total_users ?? 0} pct={overview.pct_total_users} />
          </div>

          {/* Browsing Sessions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-sky-300/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#005F63] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">GA4</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Visits</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{loading ? '–' : (overview.sessions ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Browsing sessions</p>
            <Badge current={overview.sessions ?? 0} prev={overview.prev_sessions ?? 0} pct={overview.pct_sessions} />
          </div>

          {/* Storefront Page Views */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-indigo-300/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#005F63] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">GA4</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pages Viewed</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{loading ? '–' : (overview.page_views ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Public storefront views</p>
            <Badge current={overview.page_views ?? 0} prev={overview.prev_page_views ?? 0} pct={overview.pct_page_views} />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* FEATURE 2: TOTAL SALES OVER TIME (TIME-SERIES CHART) */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-7 text-left shadow-sm">
          {/* Card Header & Key Stats */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-sm md:text-base font-bold text-slate-900">Total sales over time</h2>
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  FAAZO Data
                </span>
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                  ₹{salesOverTime.total_sales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <Badge
                  current={salesOverTime.total_sales}
                  prev={salesOverTime.prev_total_sales}
                  pct={salesOverTime.pct_sales_change}
                  isNew={salesOverTime.is_new_activity}
                />
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {salesOverTime.total_orders} COD or paid orders
                {salesOverTime.cod_orders > 0 && ` (${salesOverTime.cod_orders} COD, ${salesOverTime.paid_orders} online)`}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-[#005F63] to-[#0B8C90]" />
                <span>Sales (₹)</span>
              </div>
              <span className="text-slate-300">|</span>
              <span className="text-[11px] font-medium text-slate-400">
                {salesOverTime.interval === 'hourly' ? 'Hourly aggregation (IST)' : 'Daily aggregation (IST)'}
              </span>
            </div>
          </div>

          {/* Interactive Chart Body */}
          <div className="pt-6">
            {salesOverTime.series && salesOverTime.series.length > 0 ? (
              <div className="relative">
                {/* Hover active tooltip banner */}
                {hoveredSalesIndex !== null && salesOverTime.series[hoveredSalesIndex] && (
                  <div className="mb-3 px-3.5 py-2 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs animate-fade-in shadow-md">
                    <span className="font-semibold text-teal-200">
                      {salesOverTime.series[hoveredSalesIndex].label}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-white">
                        ₹{salesOverTime.series[hoveredSalesIndex].sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-slate-400 font-medium">
                        {salesOverTime.series[hoveredSalesIndex].orders} order{salesOverTime.series[hoveredSalesIndex].orders !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}

                {/* SVG & Bar Visualization */}
                <div className="h-56 flex items-end gap-1 sm:gap-2 pt-4 pb-3 overflow-x-auto border-b border-slate-100">
                  {salesOverTime.series.map((item: SalesSeriesItem, idx: number) => {
                    const heightPercent = maxSalesVal > 0 && item.sales > 0
                      ? Math.min(100, Math.max(8, (item.sales / maxSalesVal) * 90))
                      : 4;
                    const isHovered = hoveredSalesIndex === idx;

                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredSalesIndex(idx)}
                        onMouseLeave={() => setHoveredSalesIndex(null)}
                        className="flex-1 min-w-[20px] sm:min-w-[28px] flex flex-col items-center group relative h-full justify-end cursor-pointer"
                      >
                        {/* Interactive floating tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-slate-800 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap z-30 shadow-xl pointer-events-none">
                          <span className="text-teal-300 font-bold">{item.label}</span>
                          <span className="text-white mt-0.5 font-bold">
                            ₹{item.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-slate-300 text-[9px]">
                            {item.orders} order{item.orders !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[28px] rounded-t-md transition-all duration-200 ${
                            item.sales > 0
                              ? isHovered
                                ? 'bg-[#004D50] ring-2 ring-[#005F63]/30 scale-105'
                                : 'bg-gradient-to-t from-[#005F63] to-[#0B8C90]'
                              : 'bg-slate-100 hover:bg-slate-200'
                          }`}
                        />

                        {/* X-axis label */}
                        <span className={`text-[8px] sm:text-[9px] font-medium mt-1.5 truncate w-full text-center transition-colors ${
                          isHovered ? 'text-[#005F63] font-bold' : 'text-slate-400'
                        }`}>
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No sales or orders recorded for {periodLabel.toLowerCase()}.
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* GA4 WEBSITE ACTIVITY CHART */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-left">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Website Traffic Trend</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Visitors and page views — {periodLabel}</p>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#005F63] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">GA4</span>
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
                      className="w-full max-w-[24px] bg-gradient-to-t from-[#005F63] to-[#0B8C90] rounded-t-lg group-hover:from-[#004D50] transition-colors"
                    />
                    <span className="text-[9px] font-medium text-slate-400 mt-1.5 truncate w-full text-center">{item.date}</span>
                  </div>
                );
              })}
            </div>
          ) : trend.length === 1 ? (
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-slate-700">Single data point recorded for {trend[0].date}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">More daily data points will appear as visitors browse the storefront.</p>
              </div>
              <div className="flex items-center gap-5 bg-white p-3 rounded-lg border border-slate-200 shrink-0 text-center">
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
        {/* POPULAR PAGES + TRAFFIC SOURCES */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Popular Pages */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Popular Pages</h2>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#005F63] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">GA4</span>
            </div>
            {topPages.length > 0 ? (
              <div className="space-y-2">
                {topPages.slice(0, 8).map((page: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/70 border border-slate-100 text-xs">
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
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Where Visitors Came From</h2>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#005F63] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">GA4</span>
            </div>
            {trafficSources.length > 0 ? (
              <div className="space-y-2">
                {trafficSources.map((src: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/70 border border-slate-100 text-xs">
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
        {/* DEVICES + GEOGRAPHY */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Devices */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">How People Use FAAZO</h2>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#005F63] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">GA4</span>
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
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
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
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Where Visitors Are</h2>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#005F63] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">GA4</span>
            </div>
            {geography.length > 0 ? (
              <div className="space-y-2">
                {geography.map((geo: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/70 border border-slate-100 text-xs">
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

      </div>
    </div>
  );
}
