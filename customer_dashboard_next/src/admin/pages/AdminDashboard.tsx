'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock, ArrowUpRight, ShoppingBag,
  IndianRupee, Package, Users, Layers,
  Calendar, Activity,
  Handshake, Tag, Award, Sparkles, PlusCircle,
  CheckCircle2, AlertTriangle, XCircle
} from 'lucide-react';
import { useBreadcrumbSync } from '../contexts/BreadcrumbContext';
import { useAuth } from '@/hooks/useAuth';
import { dashboardService } from '../services/adminService';

const ANALYTICS_DATA: Record<string, Record<string, { labels: string[]; values: number[]; dates: string[] }>> = {
  '7 Days': {
    'Revenue': {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      values: [12000, 24000, 18000, 35000, 29000, 42000, 38000],
      dates: ['July 1', 'July 2', 'July 3', 'July 4', 'July 5', 'July 6', 'July 7']
    },
    'Orders': {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      values: [3, 6, 4, 9, 7, 12, 10],
      dates: ['July 1', 'July 2', 'July 3', 'July 4', 'July 5', 'July 6', 'July 7']
    }
  },
  '30 Days': {
    'Revenue': {
      labels: ['W1', 'W2', 'W3', 'W4'],
      values: [120000, 185000, 290000, 340000],
      dates: ['Week 1', 'Week 2', 'Week 3', 'Week 4']
    },
    'Orders': {
      labels: ['W1', 'W2', 'W3', 'W4'],
      values: [42, 58, 85, 96],
      dates: ['Week 1', 'Week 2', 'Week 3', 'Week 4']
    }
  },
  '90 Days': {
    'Revenue': {
      labels: ['Apr', 'May', 'Jun'],
      values: [450000, 720000, 890000],
      dates: ['April 2026', 'May 2026', 'June 2026']
    },
    'Orders': {
      labels: ['Apr', 'May', 'Jun'],
      values: [120, 195, 245],
      dates: ['April 2026', 'May 2026', 'June 2026']
    }
  },
  '1 Year': {
    'Revenue': {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      values: [1420000, 1850000, 2490000, 3120000],
      dates: ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026']
    },
    'Orders': {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      values: [480, 590, 810, 990],
      dates: ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026']
    }
  }
};

const RECENT_ORDERS = [
  { id: 'ORD-9024', customer: 'Dr. Amit Patel', avatar: 'AP', amount: '₹1,24,500', status: 'Completed', date: 'Jul 7, 2026' },
  { id: 'ORD-9023', customer: 'Dr. Sneha Rao', avatar: 'SR', amount: '₹48,900', status: 'Processing', date: 'Jul 7, 2026' },
  { id: 'ORD-9022', customer: 'Care Dental Clinic', avatar: 'CD', amount: '₹2,10,000', status: 'Shipped', date: 'Jul 6, 2026' },
  { id: 'ORD-9021', customer: 'Dr. Vikram Malhotra', avatar: 'VM', amount: '₹15,200', status: 'Completed', date: 'Jul 6, 2026' },
  { id: 'ORD-9020', customer: 'Apex Dental Lab', avatar: 'AD', amount: '₹89,000', status: 'Pending', date: 'Jul 5, 2026' },
];

const RECENT_ACTIVITIES = [
  { type: 'product', title: 'Product listed', desc: 'Samsung S24 listed under Dental Chairs', time: '2 hours ago' },
  { type: 'brand', title: 'Brand adjusted', desc: 'Apple brand metadata and warranty policy adjusted', time: '4 hours ago' },
  { type: 'combo', title: 'Combo published', desc: 'Orthodontic Starter Kit combo now live', time: 'Yesterday' },
  { type: 'stock', title: 'Inventory updated', desc: 'Added 50 units to NSK Pana-Max Air Turbine stock', time: '2 days ago' },
];

const AdminDashboard: React.FC = () => {
  useBreadcrumbSync([{ label: 'Dashboard' }]);
  const router = useRouter();
  const navigate = (path: string) => router.push(path);
  const { user } = useAuth();

  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7 Days' | '30 Days' | '90 Days' | '1 Year'>('7 Days');
  const [analyticsMetric, setAnalyticsMetric] = useState<'Revenue' | 'Orders'>('Revenue');
  const [useDemoData, setUseDemoData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overviewData, setOverviewData] = useState<any | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  // Time of Day Greeting helper
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good morning';
    if (hrs < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Live Date & Time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }));
      setDateStr(now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async (period: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardService.getOverview(period);
      if (res.success && res.data) {
        setOverviewData(res.data);
      } else {
        setError(res.message || 'Failed to load real-time analytics data.');
      }
    } catch (err: any) {
      console.error('Failed to load dashboard metrics:', err);
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(analyticsPeriod);
  }, [analyticsPeriod]);

  const adminName = user?.full_name?.split(' ')[0] || 'Admin';

  // SVG Chart Calculation (Live data or Demo fallback)
  const currentChart = useDemoData
    ? ANALYTICS_DATA[analyticsPeriod][analyticsMetric]
    : (overviewData?.chart?.[analyticsMetric] || { labels: [], values: [], dates: [] });

  const svgHeight = 180;
  const svgWidth = 600;
  const paddingX = 40;
  const paddingY = 20;
  const chartHeight = svgHeight - paddingY * 2;
  const chartWidth = svgWidth - paddingX * 2;

  const chartValues: number[] = currentChart.values || [];
  const maxVal = Math.max(...(chartValues.length ? chartValues : [100])) * 1.15 || 100;
  const points = chartValues.map((v, i) => {
    const x = paddingX + (i / Math.max(1, chartValues.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - (v / maxVal) * chartHeight;
    return { x, y, value: v, label: currentChart.labels?.[i] || '', date: currentChart.dates?.[i] || '' };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`
    : '';

  // Get Stock List to render
  const stockItemsToRender = (!useDemoData && overviewData?.inventory_health?.items?.length)
    ? overviewData.inventory_health.items.slice(0, 3)
    : [
        { name: 'Contra-angle speed handpiece', sku: 'NSK-CA-802', current_stock: 2, low_stock_threshold: 5 },
        { name: 'LED cordless curing light', sku: 'DENT-CL-04', current_stock: 1, low_stock_threshold: 3 },
        { name: '3D intraoral scanner pro', sku: 'SCAN-3D-X', current_stock: 0, low_stock_threshold: 2 },
      ];


  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-16 px-4 md:px-6">

      {/* ── Top Hero Section ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#005F63]/12 via-[#0F766E]/8 to-[#14B8A6]/5 border border-[#005F63]/20 rounded-[24px] p-6 md:p-8 shadow-[0_10px_35px_rgba(0,95,99,0.06)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {/* Soft decorative glow background highlights */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#0F766E]/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-[#14B8A6]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-3 relative z-10">
          <span className="text-[11px] font-extrabold text-[#004D51] uppercase tracking-widest bg-[#005F63]/12 border border-[#005F63]/20 px-3.5 py-1 rounded-full shadow-2xs">
            Platform control center
          </span>
          <h1 className="text-[36px] md:text-[40px] font-extrabold text-[#0F172A] tracking-tight leading-none pt-1">
            {getGreeting()}, <span className="text-[#005F63]">{adminName}</span>
          </h1>
          <p className="text-[13px] text-[#475569] font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#0F766E]" />
            <span className="font-semibold text-slate-700">{dateStr}</span>
            <span className="text-slate-300">•</span>
            <Clock className="w-4 h-4 text-[#0F766E]" />
            <span className="font-bold text-slate-800">{timeStr}</span>
          </p>
          <p className="text-[12px] text-[#004D51] font-semibold bg-[#005F63]/10 border border-[#005F63]/20 px-4 py-2 rounded-xl inline-block mt-1 shadow-2xs">
            System status operational • You have <strong className="font-extrabold">{overviewData?.summary_counts?.stock_alerts ?? 0}</strong> stock alerts and <strong className="font-extrabold">{overviewData?.summary_counts?.pending_orders ?? 0}</strong> pending orders.
          </p>
        </div>
      </div>

      {/* Loading Skeleton or Error Banner */}
      {loading && (
        <div className="p-4 bg-teal-50 border border-teal-200 text-teal-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-pulse">
          <div className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span>Fetching live production database analytics for {analyticsPeriod}...</span>
        </div>
      )}
      {error && !useDemoData && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-semibold flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => loadData(analyticsPeriod)} className="underline hover:text-amber-950 font-bold">Retry</button>
        </div>
      )}

      {/* ── KPI Grid (Refined Square Layout) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            title: 'Revenue',
            value: useDemoData ? '₹1.84L' : (overviewData?.kpis?.revenue?.value || '₹0.00'),
            trend: useDemoData ? '+18.00%' : (overviewData?.kpis?.revenue?.trend || '0.00%'),
            trendType: overviewData?.kpis?.revenue?.trend_type || 'up',
            desc: useDemoData ? 'vs last month' : (overviewData?.kpis?.revenue?.desc || 'vs previous period'),
            icon: IndianRupee,
            bgColor: 'bg-gradient-to-br from-amber-500/15 via-yellow-400/5 to-white/90 border-amber-500/30 shadow-[0_8px_32px_0_rgba(245,158,11,0.08)]',
            iconColor: 'bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 shadow-sm border border-amber-300/80 font-black',
            trendColor: 'text-amber-900 bg-amber-500/15 border border-amber-500/30 font-bold'
          },
          {
            title: 'Orders',
            value: useDemoData ? '42' : (overviewData?.kpis?.orders?.value || '0'),
            trend: useDemoData ? '+8.20%' : (overviewData?.kpis?.orders?.trend || '0.00%'),
            trendType: overviewData?.kpis?.orders?.trend_type || 'up',
            desc: useDemoData ? 'vs last week' : (overviewData?.kpis?.orders?.desc || 'vs previous period'),
            icon: ShoppingBag,
            bgColor: 'bg-gradient-to-br from-[#5D5FEF]/12 via-[#5D5FEF]/5 to-white/80 border-[#5D5FEF]/20 shadow-[0_8px_32px_0_rgba(93,95,239,0.06)]',
            iconColor: 'bg-[#5D5FEF] text-white shadow-xs',
            trendColor: 'text-[#5D5FEF] bg-[#5D5FEF]/10 border border-[#5D5FEF]/20'
          },
          {
            title: 'Customers',
            value: useDemoData ? '842' : (overviewData?.kpis?.customers?.value || '0'),
            trend: '+14.80%',
            trendType: 'up',
            desc: useDemoData ? 'active accounts' : (overviewData?.kpis?.customers?.desc || 'registered accounts'),
            icon: Users,
            bgColor: 'bg-gradient-to-br from-[#10B981]/12 via-[#10B981]/5 to-white/80 border-[#10B981]/20 shadow-[0_8px_32px_0_rgba(16,185,129,0.06)]',
            iconColor: 'bg-[#10B981] text-white shadow-xs',
            trendColor: 'text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20'
          },
          {
            title: 'Products',
            value: useDemoData ? '10' : (overviewData?.kpis?.products?.value || '0'),
            trend: '+4.10%',
            trendType: 'up',
            desc: useDemoData ? 'active listings' : (overviewData?.kpis?.products?.desc || 'catalog items'),
            icon: Package,
            bgColor: 'bg-gradient-to-br from-[#EC4899]/12 via-[#EC4899]/5 to-white/80 border-[#EC4899]/20 shadow-[0_8px_32px_0_rgba(236,72,153,0.06)]',
            iconColor: 'bg-[#EC4899] text-white shadow-xs',
            trendColor: 'text-[#EC4899] bg-[#EC4899]/10 border border-[#EC4899]/20'
          }
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div
              key={i}
              className={`relative overflow-hidden rounded-[22px] p-5.5 backdrop-blur-xl hover:shadow-xl hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between h-[190px] border ${kpi.bgColor}`}
            >
              {/* Glossy sheen top highlight */}
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/60 rounded-full blur-lg pointer-events-none" />

              {/* Top Row: Icon and Trend Badge */}
              <div className="flex items-center justify-between relative z-10">
                <div className={`w-9.5 h-9.5 rounded-full flex items-center justify-center ${kpi.iconColor}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-0.5 leading-none ${kpi.trendColor}`}>
                  {kpi.trend} {kpi.trendType === 'up' ? '↗' : '↘'}
                </span>
              </div>

              {/* Bottom Stack: Label, Value, Description */}
              <div className="flex flex-col mt-3.5 relative z-10">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                  {kpi.title}
                </span>
                <h4 className="text-[29px] font-black text-slate-900 tracking-tight leading-none mt-2">
                  {kpi.value}
                </h4>
                <span className="text-[11px] font-semibold text-slate-450 mt-1.5 leading-none">
                  {kpi.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Dashboard Layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Left Col (65% width) */}
        <div className="xl:col-span-2 space-y-8">

          {/* Sales Analytics Chart Card */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_10px_35px_rgba(0,0,0,0.01)] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="space-y-1">
                <h3 className="text-[18px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#005F63]" /> Sales analytics
                </h3>
                <p className="text-[13px] text-slate-400 font-medium">Monitor customer purchase volume and values</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Metric Selector */}
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                  {(['Revenue', 'Orders'] as const).map(metric => (
                    <button
                      key={metric}
                      onClick={() => setAnalyticsMetric(metric)}
                      className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        analyticsMetric === metric 
                          ? 'bg-white text-[#005F63] shadow-2xs font-extrabold' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {metric}
                    </button>
                  ))}
                </div>

                {/* Period Selector */}
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                  {(['7 Days', '30 Days', '90 Days', '1 Year'] as const).map(period => (
                    <button
                      key={period}
                      onClick={() => setAnalyticsPeriod(period)}
                      className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        analyticsPeriod === period 
                          ? 'bg-white text-[#005F63] shadow-2xs font-extrabold' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>

                {/* Live vs Demo Toggle */}
                <button
                  onClick={() => setUseDemoData(!useDemoData)}
                  className={`px-2.5 py-1.5 text-[10px] font-bold rounded-xl border transition-colors ${
                    !useDemoData 
                      ? 'border-[#005F63]/25 bg-[#005F63]/5 text-[#005F63]' 
                      : 'border-slate-200 text-slate-455 hover:bg-slate-50'
                  }`}
                >
                  {!useDemoData ? 'Live data' : 'Demo view'}
                </button>
              </div>
            </div>

            {/* Analytics Content */}
            {points.length === 0 ? (
              <div className="h-[220px] border border-dashed border-slate-200 rounded-[20px] flex flex-col items-center justify-center bg-slate-50/50 p-6 text-center">
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200/50">
                  <Layers className="w-5 h-5" />
                </div>
                <h4 className="text-[14px] font-bold text-slate-800">No transactional records</h4>
                <p className="text-[13px] text-slate-450 max-w-[320px] mt-1 leading-relaxed">
                  No orders recorded for the selected period ({analyticsPeriod}).
                </p>
              </div>
            ) : (
              <div className="relative pt-6">
                {/* SVG Area Chart */}
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" className="overflow-visible">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#005F63" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#005F63" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  {/* Y Axis Gridlines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = paddingY + chartHeight * ratio;
                    return (
                      <line 
                        key={idx} 
                        x1={paddingX} 
                        y1={y} 
                        x2={svgWidth - paddingX} 
                        y2={y} 
                        stroke="#EEF3F7" 
                        strokeWidth={1} 
                        strokeDasharray="4 4"
                      />
                    );
                  })}

                  {/* Area fill */}
                  <path d={areaPath} fill="url(#chartGrad)" />

                  {/* Line path */}
                  <path 
                    d={linePath} 
                    fill="none" 
                    stroke="#005F63" 
                    strokeWidth={3} 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />

                  {/* Nodes */}
                  {points.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={hoveredPoint?.index === i ? 6 : 4}
                      fill="#FFFFFF"
                      stroke="#005F63"
                      strokeWidth={hoveredPoint?.index === i ? 3.5 : 2}
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() => setHoveredPoint({ ...p, index: i })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  ))}
                </svg>

                {/* X Axis Labels */}
                <div className="flex justify-between px-[40px] mt-3">
                  {(currentChart.labels || []).map((lbl: string, idx: number) => (
                    <span key={idx} className="text-[10px] font-bold text-slate-400">{lbl}</span>
                  ))}
                </div>

                {/* Interactive Tooltip Card */}
                {hoveredPoint && (
                  <div 
                    className="absolute bg-slate-900/95 backdrop-blur-xs text-white rounded-xl p-2.5 shadow-xl border border-slate-800 z-10 flex flex-col pointer-events-none transition-all duration-100"
                    style={{ 
                      left: `${(hoveredPoint.x / svgWidth) * 100}%`, 
                      top: `${(hoveredPoint.y / svgHeight) * 100 - 32}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mb-0.5">{hoveredPoint.date}</span>
                    <span className="text-xs font-extrabold">
                      {analyticsMetric === 'Revenue' ? `₹${hoveredPoint.value.toLocaleString('en-IN')}` : `${hoveredPoint.value} Orders`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions Grid */}
          <div className="space-y-4">
            <h3 className="text-[16px] font-bold text-slate-800 px-1">Quick operational shortcuts</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { title: 'Add product', path: '/admin/products', icon: PlusCircle, bg: 'from-emerald-500/10 via-teal-500/5 to-white/60', text: 'text-teal-700', border: 'border-teal-500/25 shadow-[0_8px_32px_0_rgba(20,184,166,0.08)]' },
                { title: 'Create brand', path: '/admin/brands', icon: Award, bg: 'from-blue-500/10 via-indigo-500/5 to-white/60', text: 'text-blue-700', border: 'border-blue-500/25 shadow-[0_8px_32px_0_rgba(59,130,246,0.08)]' },
                { title: 'Import inventory', path: '/admin/inventory', icon: Layers, bg: 'from-purple-500/10 via-pink-500/5 to-white/60', text: 'text-purple-700', border: 'border-purple-500/25 shadow-[0_8px_32px_0_rgba(168,85,247,0.08)]' },
                { title: 'Manage categories', path: '/admin/categories', icon: Tag, bg: 'from-amber-500/10 via-orange-500/5 to-white/60', text: 'text-amber-700', border: 'border-amber-500/25 shadow-[0_8px_32px_0_rgba(245,158,11,0.08)]' },
                { title: 'Create combo', path: '/admin/combos', icon: Sparkles, bg: 'from-rose-500/10 via-red-500/5 to-white/60', text: 'text-rose-700', border: 'border-rose-500/25 shadow-[0_8px_32px_0_rgba(244,63,94,0.08)]' },
                { title: 'Manage dealers', path: '/admin/dealers', icon: Handshake, bg: 'from-sky-500/10 via-cyan-500/5 to-white/60', text: 'text-sky-700', border: 'border-sky-500/25 shadow-[0_8px_32px_0_rgba(14,165,233,0.08)]' }
              ].map((action, i) => {
                const Icon = action.icon;
                return (
                  <button
                    key={i}
                    onClick={() => navigate(action.path)}
                    className={`relative overflow-hidden flex items-center gap-3.5 p-4.5 rounded-[22px] bg-gradient-to-br ${action.bg} backdrop-blur-xl border ${action.border} hover:shadow-xl hover:scale-[1.03] hover:-translate-y-0.5 transition-all duration-300 text-left group cursor-pointer`}
                  >
                    {/* Glossy inner light sheen effect */}
                    <div className="absolute -top-12 -left-12 w-28 h-28 bg-white/50 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />

                    <div className="w-10.5 h-10.5 rounded-xl bg-white/85 backdrop-blur-md border border-white/70 flex items-center justify-center shadow-xs shrink-0 group-hover:scale-110 group-hover:bg-white transition-all duration-300 relative z-10">
                      <Icon className={`w-5 h-5 ${action.text}`} />
                    </div>
                    <div className="relative z-10">
                      <p className="text-[13px] font-bold text-slate-800 leading-tight">{action.title}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Quick setup →</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent Orders Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#005F63]/[0.03] via-teal-500/[0.02] to-white/90 backdrop-blur-xl border border-[#005F63]/15 shadow-[0_12px_40px_rgba(0,95,99,0.03)] rounded-[26px] p-6.5">
            {/* Top Glossy Corner Glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#005F63]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-5 relative z-10">
              <div>
                <h3 className="text-[17px] font-extrabold text-slate-900 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#005F63]/10 border border-[#005F63]/20 flex items-center justify-center text-[#005F63]">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  Recent orders
                </h3>
                <p className="text-[12.5px] text-slate-450 font-medium mt-1">The latest live orders processed through the platform</p>
              </div>
              <button 
                onClick={() => navigate('/admin/orders')}
                className="text-[11px] font-bold text-[#005F63] hover:text-[#0B7C80] flex items-center gap-1 bg-[#005F63]/8 hover:bg-[#005F63]/15 px-3.5 py-1.5 rounded-xl transition-all duration-200 border border-[#005F63]/20 shadow-2xs cursor-pointer"
              >
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-hidden border border-teal-500/15 rounded-2xl bg-white/80 backdrop-blur-md shadow-2xs relative z-10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-indigo-100/60 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider bg-[#F1F0FA]">
                    <th className="py-3.5 px-4.5">Order ID</th>
                    <th className="py-3.5 px-4.5">Customer</th>
                    <th className="py-3.5 px-4.5 text-right">Amount</th>
                    <th className="py-3.5 px-4.5 text-center">Status</th>
                    <th className="py-3.5 px-4.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-500/10">
                  {((overviewData?.recent_orders && overviewData.recent_orders.length > 0)
                    ? overviewData.recent_orders
                    : (useDemoData ? RECENT_ORDERS : (overviewData?.recent_orders || []))
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400 text-xs font-semibold">
                        No recent orders found in database.
                      </td>
                    </tr>
                  ) : (
                    ((overviewData?.recent_orders && overviewData.recent_orders.length > 0)
                      ? overviewData.recent_orders
                      : (useDemoData ? RECENT_ORDERS : (overviewData?.recent_orders || []))
                    ).map((ord: any, i: number) => (
                      <tr 
                        key={i} 
                        onClick={() => navigate(ord.raw_id ? `/admin/orders/${ord.raw_id}` : '/admin/orders')}
                        className="hover:bg-[#005F63]/[0.03] transition-all duration-200 text-xs font-semibold text-slate-700 cursor-pointer group"
                      >
                        <td className="py-3.5 px-4.5 text-[#005F63] font-bold font-mono group-hover:underline">
                          {ord.id}
                        </td>
                        <td className="py-3.5 px-4.5 font-medium">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7.5 h-7.5 rounded-xl bg-gradient-to-br from-teal-100/80 via-emerald-50 to-white text-teal-800 flex items-center justify-center font-extrabold text-[11px] border border-teal-200/60 shadow-2xs group-hover:scale-105 transition-transform duration-200">
                              {ord.avatar || 'CU'}
                            </div>
                            <span className="font-bold text-slate-800 group-hover:text-[#005F63] transition-colors">{ord.customer}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4.5 text-right font-black text-slate-900">{ord.amount}</td>
                        <td className="py-3.5 px-4.5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold shadow-2xs transition-all ${
                            ord.status === 'Completed' || ord.status === 'Delivered'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' 
                              : ord.status === 'Processing' || ord.status === 'Packed' 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/80' 
                              : ord.status === 'Shipped' 
                              ? 'bg-sky-50 text-sky-700 border border-sky-200/80' 
                              : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              ord.status === 'Completed' || ord.status === 'Delivered' ? 'bg-emerald-500' :
                              ord.status === 'Processing' || ord.status === 'Packed' ? 'bg-amber-500' :
                              ord.status === 'Shipped' ? 'bg-sky-500' :
                              'bg-rose-500'
                            }`} />
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4.5 text-slate-450 font-medium whitespace-nowrap">{ord.date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col (35% width) - Stacked Widgets */}
        <div className="space-y-8">

          {/* Inventory Health Widget */}
          <div className="relative overflow-hidden bg-gradient-to-br from-teal-500/[0.04] via-emerald-500/[0.02] to-white/95 backdrop-blur-2xl border border-teal-500/20 shadow-[0_12px_40px_rgba(0,95,99,0.04)] rounded-[26px] p-6.5">
            {/* Glossy sheen corner glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-5 relative z-10">
              <div>
                <h3 className="text-[16px] font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#005F63]/10 border border-[#005F63]/20 flex items-center justify-center text-[#005F63]">
                    <Layers className="w-4 h-4" />
                  </div>
                  Inventory distribution
                </h3>
                <p className="text-[11.5px] text-slate-450 font-medium mt-0.5">Live stock status across all catalog items</p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-extrabold text-[#005F63] bg-[#005F63]/10 border border-[#005F63]/20 shadow-2xs shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Stock
              </span>
            </div>

            <div className="space-y-3 relative z-10">
              {[
                { 
                  label: 'In stock', 
                  count: (overviewData?.inventory_health) ? overviewData.inventory_health.in_stock.count : 0, 
                  pct: (overviewData?.inventory_health) ? overviewData.inventory_health.in_stock.pct : 0, 
                  color: 'from-[#005F63] to-teal-500',
                  bgColor: 'bg-teal-50/80 text-teal-700 border-teal-200/60',
                  icon: CheckCircle2
                },
                { 
                  label: 'Low stock', 
                  count: (overviewData?.inventory_health) ? overviewData.inventory_health.low_stock.count : 0, 
                  pct: (overviewData?.inventory_health) ? overviewData.inventory_health.low_stock.pct : 0, 
                  color: 'from-amber-400 to-orange-400',
                  bgColor: 'bg-amber-50/80 text-amber-700 border-amber-200/60',
                  icon: AlertTriangle
                },
                { 
                  label: 'Out of stock', 
                  count: (overviewData?.inventory_health) ? overviewData.inventory_health.out_of_stock.count : 0, 
                  pct: (overviewData?.inventory_health) ? overviewData.inventory_health.out_of_stock.pct : 0, 
                  color: 'from-rose-500 to-red-500',
                  bgColor: 'bg-rose-50/80 text-rose-700 border-rose-200/60',
                  icon: XCircle
                }
              ].map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div key={idx} className="p-3.5 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/70 shadow-2xs hover:shadow-md hover:scale-[1.01] transition-all duration-300 space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border shadow-2xs ${item.bgColor}`}>
                          <ItemIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-slate-800 font-bold">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-900 font-black text-xs">{item.count} items</span>
                        <span className="text-[10px] font-extrabold text-slate-450 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                          {item.pct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 border border-slate-200/60 rounded-full overflow-hidden shadow-2xs">
                      <div 
                        className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-700 ease-out`} 
                        style={{ width: `${item.pct}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pro Top Revenue Drivers & Best Sellers Leaderboard Widget */}
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/[0.06] via-yellow-500/[0.03] to-white/95 backdrop-blur-2xl border border-amber-500/25 shadow-[0_12px_40px_rgba(245,158,11,0.05)] rounded-[26px] p-6.5 space-y-4">
            {/* Glossy sheen corner glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div>
                <h3 className="text-[16px] font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-800">
                    <Award className="w-4 h-4" />
                  </div>
                  Top Revenue Drivers
                </h3>
                <p className="text-[11.5px] text-slate-450 font-medium mt-0.5">Best-selling dental equipment by revenue & volume</p>
              </div>

              <button
                onClick={() => navigate('/admin/products')}
                className="text-[11px] font-bold text-amber-900 hover:text-amber-950 flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-xl transition-all duration-200 border border-amber-500/25 shadow-2xs cursor-pointer shrink-0"
              >
                Catalog <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 relative z-10">
              {(overviewData?.top_products || []).length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-semibold bg-white/60 rounded-2xl border border-amber-500/15">
                  No catalog products found in database.
                </div>
              ) : (
                (overviewData?.top_products || []).map((product: any, idx: number) => {
                  const cardPastelStyles = [
                    // #1: Soft Pastel Emerald / Mint Glass
                    {
                      bg: 'from-emerald-500/12 via-teal-500/5 to-white/90',
                      border: 'border-emerald-500/25 hover:border-emerald-500/50',
                      shadow: 'shadow-[0_8px_30px_rgb(16,185,129,0.06)]',
                      hoverText: 'group-hover:text-emerald-800',
                      divider: 'border-emerald-500/15',
                      rank: 'bg-gradient-to-br from-emerald-200/90 to-teal-100 text-emerald-950 border-emerald-300/80 shadow-xs'
                    },
                    // #2: Soft Pastel Sky / Indigo Glass
                    {
                      bg: 'from-sky-500/12 via-indigo-500/5 to-white/90',
                      border: 'border-sky-500/25 hover:border-sky-500/50',
                      shadow: 'shadow-[0_8px_30px_rgb(14,165,233,0.06)]',
                      hoverText: 'group-hover:text-sky-800',
                      divider: 'border-sky-500/15',
                      rank: 'bg-gradient-to-br from-sky-200/90 to-blue-100 text-sky-950 border-sky-300/80 shadow-xs'
                    },
                    // #3: Soft Pastel Rose / Pink Glass
                    {
                      bg: 'from-rose-500/12 via-pink-500/5 to-white/90',
                      border: 'border-rose-500/25 hover:border-rose-500/50',
                      shadow: 'shadow-[0_8px_30px_rgb(244,63,94,0.06)]',
                      hoverText: 'group-hover:text-rose-800',
                      divider: 'border-rose-500/15',
                      rank: 'bg-gradient-to-br from-rose-200/90 to-pink-100 text-rose-950 border-rose-300/80 shadow-xs'
                    },
                    // #4: Soft Pastel Lavender / Purple Glass
                    {
                      bg: 'from-purple-500/12 via-indigo-500/5 to-white/90',
                      border: 'border-purple-500/25 hover:border-purple-500/50',
                      shadow: 'shadow-[0_8px_30px_rgb(168,85,247,0.06)]',
                      hoverText: 'group-hover:text-purple-800',
                      divider: 'border-purple-500/15',
                      rank: 'bg-gradient-to-br from-purple-200/90 to-indigo-100 text-purple-950 border-purple-300/80 shadow-xs'
                    }
                  ];

                  const style = cardPastelStyles[idx % cardPastelStyles.length];

                  return (
                    <div 
                      key={idx} 
                      onClick={() => navigate('/admin/products')}
                      className={`relative overflow-hidden p-4 rounded-[20px] bg-gradient-to-br ${style.bg} backdrop-blur-xl border ${style.border} ${style.shadow} hover:shadow-xl hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300 space-y-2.5 cursor-pointer group`}
                    >
                      {/* Inner Glass Sheen Glow */}
                      <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/60 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

                      <div className="flex items-start justify-between gap-3 relative z-10">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Rank Badge */}
                          <div className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center font-black text-xs border shrink-0 ${style.rank}`}>
                            #{idx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs font-bold text-slate-900 truncate transition-colors ${style.hoverText}`}>{product.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-semibold">
                              <span>SKU: {product.sku}</span>
                              <span>•</span>
                              <span className="bg-white/80 backdrop-blur-md px-2 py-0.5 rounded-md text-slate-700 font-bold border border-white/80 shadow-2xs">{product.category}</span>
                            </div>
                          </div>
                        </div>

                        <span className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-md border shrink-0 shadow-2xs ${
                          product.stock_status === 'In Stock' 
                            ? 'bg-emerald-50/90 text-emerald-700 border-emerald-200/80' 
                            : product.stock_status === 'Low Stock' 
                            ? 'bg-amber-50/90 text-amber-700 border-amber-200/80' 
                            : 'bg-rose-50/90 text-rose-700 border-rose-200/80'
                        }`}>
                          {product.stock_status}
                        </span>
                      </div>

                      <div className={`flex items-center justify-between pt-2 border-t ${style.divider} text-xs relative z-10`}>
                        <span className="text-[11px] font-semibold text-slate-500">
                          <span className="font-bold text-slate-900">{product.units_sold}</span> units sold
                        </span>
                        <span className="font-black text-slate-900 text-[13px] tracking-tight">
                          {product.revenue}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Dealer & B2B Partner Portal Widget */}
          <div className="relative overflow-hidden bg-gradient-to-br from-sky-500/[0.04] via-blue-500/[0.02] to-white/95 backdrop-blur-2xl border border-sky-500/20 shadow-[0_12px_40px_rgba(14,165,233,0.04)] rounded-[26px] p-6.5 space-y-4">
            {/* Glossy sheen corner glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div>
                <h3 className="text-[16px] font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-700">
                    <Handshake className="w-4 h-4" />
                  </div>
                  Dealer & B2B Portal
                </h3>
                <p className="text-[11.5px] text-slate-450 font-medium mt-0.5">Recent dealer applications & partner status</p>
              </div>

              <button
                onClick={() => navigate('/admin/dealers')}
                className="text-[11px] font-bold text-sky-900 hover:text-sky-950 flex items-center gap-1 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 rounded-xl transition-all duration-200 border border-sky-500/25 shadow-2xs cursor-pointer shrink-0"
              >
                Dealers <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 relative z-10">
              {(overviewData?.recent_dealers || []).length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-semibold bg-white/60 rounded-2xl border border-sky-500/15">
                  No dealer applications found in database.
                </div>
              ) : (
                (overviewData?.recent_dealers || []).map((dealer: any, idx: number) => {
                  const isApproved = dealer.status === 'Approved';
                  return (
                    <div 
                      key={idx} 
                      onClick={() => navigate('/admin/dealers')}
                      className="p-3.5 rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-md hover:bg-white hover:border-sky-500/40 hover:shadow-md hover:scale-[1.015] transition-all duration-300 space-y-2.5 cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Company Avatar */}
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-100/90 via-blue-50 to-white text-sky-900 flex items-center justify-center font-black text-xs border border-sky-200/80 shadow-2xs shrink-0 group-hover:scale-105 transition-transform duration-200">
                            {dealer.avatar || 'DL'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate group-hover:text-sky-800 transition-colors">{dealer.company_name}</p>
                            <p className="text-[10.5px] text-slate-450 font-medium mt-0.5 truncate">{dealer.applicant_name}</p>
                          </div>
                        </div>

                        <span className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-md border shrink-0 shadow-2xs ${
                          isApproved 
                            ? 'bg-emerald-50/90 text-emerald-700 border-emerald-200/80' 
                            : 'bg-amber-50/90 text-amber-700 border-amber-200/80'
                        }`}>
                          {dealer.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="text-[10.5px] font-semibold text-slate-400">Applied {dealer.date}</span>
                        <span className="font-bold text-[#005F63] text-[11px] group-hover:underline flex items-center gap-0.5">
                          Manage Partner →
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default AdminDashboard;
