import React, { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (item: T, index: number) => React.ReactNode;
  accessor?: (item: T) => any;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchFields?: ((item: T) => string)[];
  searchPlaceholder?: string;
  defaultPageSize?: number;
  emptyMessage?: string;
  rowClassName?: (item: T) => string;
}

export function DataTable<T extends { id?: string | number }>({
  data,
  columns,
  searchFields,
  searchPlaceholder = 'Search name, father name, registration no...',
  defaultPageSize = 10,
  emptyMessage = 'No matching records found.',
  rowClassName,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Search filtering
  const filteredData = useMemo(() => {
    if (!searchQuery.trim() || !searchFields) return data;
    const query = searchQuery.toLowerCase().trim();
    return data.filter((item) =>
      searchFields.some((getField) => {
        const val = getField(item);
        return val ? String(val).toLowerCase().includes(query) : false;
      })
    );
  }, [data, searchQuery, searchFields]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aVal = col.accessor ? col.accessor(a) : (a as any)[sortKey];
      let bVal = col.accessor ? col.accessor(b) : (b as any)[sortKey];

      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDirection, columns]);

  // Pagination
  const totalEntries = sortedData.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedData = useMemo(() => {
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, startIndex, pageSize]);

  const handleSort = (key: string, sortable?: boolean) => {
    if (sortable === false) return;
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Generate page numbers
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('...');
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safePage]);

  return (
    <div className="space-y-3.5">
      {/* Toolbar: Show entries on left, Search on right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="border border-slate-300 rounded px-2 py-1 bg-white text-slate-800 font-mono text-xs focus:ring-2 focus:ring-teal-600 focus:outline-hidden cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>entries</span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="datatable-search" className="font-semibold text-slate-700 whitespace-nowrap">
            Search:
          </label>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              id="datatable-search"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs bg-white">
        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 select-none">
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                const isSortable = col.sortable !== false;

                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key, col.sortable)}
                    style={{ width: col.width }}
                    className={`py-3 px-3 border-r border-slate-200 last:border-r-0 tracking-tight transition-colors ${
                      col.align === 'left'
                        ? 'text-left'
                        : col.align === 'right'
                        ? 'text-right'
                        : 'text-center'
                    } ${
                      isSortable
                        ? 'cursor-pointer hover:bg-slate-200/80 group'
                        : ''
                    }`}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'left' ? 'justify-start' : 'justify-center'
                      }`}
                    >
                      <span>{col.header}</span>
                      {isSortable && (
                        <span className="text-slate-400 group-hover:text-slate-700">
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-teal-700 stroke-[3]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-teal-700 stroke-[3]" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-60" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-10 text-center text-slate-500 font-medium bg-slate-50/50"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => {
                const customClass = rowClassName ? rowClassName(item) : '';
                return (
                  <tr
                    key={(item as any).id || index}
                    id={(item as any).id ? `row-${(item as any).id}` : undefined}
                    className={`hover:bg-slate-50/90 transition-colors ${customClass}`}
                  >
                    {columns.map((col) => {
                      const value = col.accessor
                        ? col.accessor(item)
                        : (item as any)[col.key];

                      return (
                        <td
                          key={col.key}
                          className={`py-2.5 px-3 border-r border-slate-200 last:border-r-0 ${
                            col.align === 'left'
                              ? 'text-left'
                              : col.align === 'right'
                              ? 'text-right'
                              : 'text-center'
                          }`}
                        >
                          {col.render ? col.render(item, index) : value}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer: Showing X to Y of Z on left, Pagination controls on right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 pt-1">
        <div>
          Showing{' '}
          <span className="font-semibold text-slate-900 font-mono">
            {totalEntries > 0 ? startIndex + 1 : 0}
          </span>{' '}
          to{' '}
          <span className="font-semibold text-slate-900 font-mono">
            {Math.min(startIndex + pageSize, totalEntries)}
          </span>{' '}
          of{' '}
          <span className="font-semibold text-slate-900 font-mono">
            {totalEntries}
          </span>{' '}
          entries
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-1 px-1">
            {pageNumbers.map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">
                    ...
                  </span>
                );
              }

              const isCurrent = p === safePage;
              return (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => setCurrentPage(Number(p))}
                  className={`w-7 h-7 rounded text-xs font-mono font-medium transition-colors ${
                    isCurrent
                      ? 'bg-[#0f766e] text-white font-bold shadow-2xs'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
