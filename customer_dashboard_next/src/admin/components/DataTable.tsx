import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ColumnDef, SortDirection } from '../types/admin';

// ─────────────────────────────────────────────────────────────────────────────
// DataTable — Enterprise data table with sorting, bulk selection, pagination
// ─────────────────────────────────────────────────────────────────────────────

interface DataTableProps<T extends { id: string | number }> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string | number>;
  onSelectionChange?: (ids: Set<string | number>) => void;
  onRowClick?: (row: T) => void;
  bulkActions?: React.ReactNode;
  emptyState?: React.ReactNode;
  stickyHeader?: boolean;
  // Pagination
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

function DataTable<T extends { id: string | number }>({
  columns,
  data,
  loading = false,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  onRowClick,
  bulkActions,
  emptyState,
  stickyHeader = true,
  page = 1,
  pageSize = 25,
  total = 0,
  onPageChange,
  onPageSizeChange,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'));
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const allSelected = data.length > 0 && data.every((r) => selectedIds.has(r.id));
  const someSelected = data.some((r) => selectedIds.has(r.id));

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      const next = new Set(selectedIds);
      data.forEach((r) => next.delete(r.id));
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      data.forEach((r) => next.add(r.id));
      onSelectionChange(next);
    }
  };

  const handleSelectRow = (id: string | number) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectionChange(next);
  };

  const totalPages = Math.ceil(total / pageSize);

  // Skeleton rows
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] lg:min-w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {selectable && <th className="w-10 px-4 py-3" />}
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left">
                    <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {selectable && <td className="px-4 py-3.5"><div className="w-4 h-4 bg-slate-100 rounded animate-pulse" /></td>}
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <div className={`h-3.5 bg-slate-100 rounded animate-pulse ${i % 2 === 0 ? 'w-28' : 'w-20'}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      {/* Bulk action bar */}
      {selectable && selectedIds.size > 0 && bulkActions && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#005B63]/5 border-b border-[#005B63]/10">
          <span className="text-sm font-semibold text-[#005B63]">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2 ml-2">{bulkActions}</div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] lg:min-w-full">
          {/* Header */}
          <thead>
            <tr className={`border-b border-slate-100 bg-slate-50/70 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-[#005B63] focus:ring-[#005B63]/30 w-4 h-4 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={`px-4 py-3 text-${col.align ?? 'left'}`}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1 text-xs font-bold text-slate-500 uppercase tracking-wider
                        hover:text-[#005B63] transition-colors group"
                    >
                      {col.header}
                      <span className="text-slate-300 group-hover:text-[#005B63]/60">
                        {sortKey === col.key && sortDir === 'asc' ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : sortKey === col.key && sortDir === 'desc' ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 opacity-30" />
                        )}
                      </span>
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {col.header}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-12 text-center">
                  {emptyState ?? (
                    <div className="text-slate-400 text-sm">No data found.</div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-slate-50 transition-colors duration-100
                    ${onRowClick ? 'cursor-pointer hover:bg-[#005B63]/[0.03]' : ''}
                    ${selectedIds.has(row.id) ? 'bg-[#005B63]/[0.04]' : idx % 2 === 0 ? '' : 'bg-slate-50/40'}`}
                >
                  {selectable && (
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                        className="rounded border-slate-300 text-[#005B63] focus:ring-[#005B63]/30 w-4 h-4 cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3.5 text-sm text-slate-700 text-${col.align ?? 'left'}`}
                    >
                      {col.render
                        ? col.render((row as Record<string, unknown>)[col.key], row)
                        : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && onPageChange && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:ring-2
                focus:ring-[#005B63]/30 focus:border-[#005B63] outline-none bg-white"
            >
              {[10, 25, 50, 100].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span>
              Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50
                disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let p = i + 1;
              if (totalPages > 5) {
                if (page > 3) p = page - 2 + i;
                if (p > totalPages) p = totalPages - (4 - i);
              }
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold transition-colors
                    ${p === page
                      ? 'bg-[#005B63] text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {p}
                </button>
              );
            })}

            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50
                disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
