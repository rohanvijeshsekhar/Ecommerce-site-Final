import React, { useState } from 'react';
import { Calendar, Download, FileSpreadsheet, FileText, ChevronDown, LayoutDashboard, TrendingUp, Package, Users, Building2, Warehouse, DollarSign, Activity } from 'lucide-react';

export type WorkspaceTabKey =
  | 'overview'
  | 'sales'
  | 'products'
  | 'customers'
  | 'dealers'
  | 'inventory'
  | 'finance'
  | 'operations';

interface ReportsWorkspaceHeaderProps {
  activeTab: WorkspaceTabKey;
  onTabChange: (tab: WorkspaceTabKey) => void;
  period: string;
  onPeriodChange: (period: string) => void;
  onExport: (format: 'pdf' | 'excel' | 'csv') => void;
  isExporting?: boolean;
}

export const ReportsWorkspaceHeader: React.FC<ReportsWorkspaceHeaderProps> = ({
  activeTab,
  onTabChange,
  period,
  onPeriodChange,
  onExport,
  isExporting = false,
}) => {
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const tabs: { key: WorkspaceTabKey; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'sales', label: 'Sales', icon: TrendingUp },
    { key: 'products', label: 'Products', icon: Package },
    { key: 'customers', label: 'Customers', icon: Users },
    { key: 'dealers', label: 'Dealers', icon: Building2 },
    { key: 'inventory', label: 'Inventory', icon: Warehouse },
    { key: 'finance', label: 'Finance', icon: DollarSign },
    { key: 'operations', label: 'Operations', icon: Activity },
  ];

  const periods = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: '1y', label: '1 Year' },
  ];

  return (
    <div className="space-y-5 pb-2 border-b border-slate-200/80">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#005F63]/10 text-[#005F63] rounded-full border border-[#005F63]/20">
              Business Intelligence Workspace
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Executive insights, financial performance, catalog intelligence, and operations.
          </p>
        </div>

        {/* Date Selector & Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Filter Pills */}
          <div className="inline-flex items-center p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1 shrink-0" />
            <div className="flex items-center gap-0.5">
              {periods.map((p) => (
                <button
                  key={p.key}
                  onClick={() => onPeriodChange(p.key)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    period === p.key
                      ? 'bg-white text-[#005F63] shadow-xs border border-slate-200/80 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-all cursor-pointer disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5 text-[#005F63]" />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-44 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl z-50 py-1.5">
                <button
                  onClick={() => {
                    onExport('pdf');
                    setShowExportDropdown(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100/80 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-rose-500" />
                  <span>Export PDF</span>
                </button>
                <button
                  onClick={() => {
                    onExport('excel');
                    setShowExportDropdown(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100/80 flex items-center gap-2 border-t border-slate-100"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Export Excel</span>
                </button>
                <button
                  onClick={() => {
                    onExport('csv');
                    setShowExportDropdown(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100/80 flex items-center gap-2 border-t border-slate-100"
                >
                  <Download className="w-4 h-4 text-sky-600" />
                  <span>Export CSV</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 8 Premium Horizontal Workspace Tabs */}
      <div className="overflow-x-auto no-scrollbar pt-1">
        <div className="inline-flex items-center p-1 bg-slate-100/80 border border-slate-200/80 rounded-2xl gap-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;

            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#005F63] shadow-sm border border-slate-200/80 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#005F63]' : 'text-slate-400'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
