import React, { useState } from 'react';
import { Download, Calendar, FileSpreadsheet, FileText, ChevronDown, Check } from 'lucide-react';

interface ReportsHeaderProps {
  period: string;
  onPeriodChange: (period: string) => void;
  onExport: (format: 'pdf' | 'excel' | 'csv') => void;
  isExporting?: boolean;
}

export const ReportsHeader: React.FC<ReportsHeaderProps> = ({
  period,
  onPeriodChange,
  onExport,
  isExporting = false,
}) => {
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const periods = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: '1y', label: '1 Year' },
  ];

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200/80">
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase bg-[#005F63]/10 text-[#005F63] rounded-full border border-[#005F63]/20">
            Enterprise BI & Analytics
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
          Reports & Intelligence
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-normal">
          Real-time enterprise analytics, financial drivers, customer metrics, and automated decision insights.
        </p>
      </div>

      {/* Toolbar: Filters & Export Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Date Filter Pills */}
        <div className="inline-flex items-center p-1 bg-slate-100/80 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs">
          <Calendar className="w-4 h-4 text-slate-400 ml-2 mr-1 shrink-0" />
          <div className="flex items-center gap-0.5">
            {periods.map((p) => (
              <button
                key={p.key}
                onClick={() => onPeriodChange(p.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
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

        {/* Export Button & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-all duration-200 cursor-pointer disabled:opacity-60"
          >
            <Download className="w-4 h-4 text-[#005F63]" />
            <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showExportDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  onExport('pdf');
                  setShowExportDropdown(false);
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100/80 flex items-center gap-2.5 transition-colors"
              >
                <FileText className="w-4 h-4 text-rose-500" />
                <div>
                  <div className="font-semibold text-slate-800">Export PDF</div>
                  <div className="text-[10px] text-slate-400">Clean print-ready summary</div>
                </div>
              </button>
              <button
                onClick={() => {
                  onExport('excel');
                  setShowExportDropdown(false);
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100/80 flex items-center gap-2.5 transition-colors border-t border-slate-100"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="font-semibold text-slate-800">Export Excel</div>
                  <div className="text-[10px] text-slate-400">Formatted dataset for Excel</div>
                </div>
              </button>
              <button
                onClick={() => {
                  onExport('csv');
                  setShowExportDropdown(false);
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100/80 flex items-center gap-2.5 transition-colors border-t border-slate-100"
              >
                <Download className="w-4 h-4 text-sky-600" />
                <div>
                  <div className="font-semibold text-slate-800">Export Raw CSV</div>
                  <div className="text-[10px] text-slate-400">Structured data feed</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
