import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Download,
  Trash2,
  RotateCcw,
  Sparkles,
  ArrowDown,
  Search,
  Filter,
  ArrowUpDown,
  Wand2,
  Info,
} from 'lucide-react';
import { ClassInfo } from '../../types';
import { downloadErrorReport } from '../../utils/excelUtils';

export interface RowErrorState {
  name?: string;
  class?: string;
  section?: string;
  rollNo?: string;
  dob?: string;
  gender?: string;
  address?: string;
  fatherName?: string;
  motherName?: string;
  duplicate?: string;
}

export interface RowWarningState {
  classMismatch?: {
    detectedClassId: string;
    detectedClassName: string;
  };
  classDidYouMean?: string;
  ageWarning?: string;
  missingMother?: string;
  missingAddress?: string;
}

export interface ParsedStudentRow {
  id: string;
  rowNumber: number;
  name: string;
  class: string;
  resolvedClassId: string;
  section: string;
  rollNo: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other' | string;
  currentAddress: string;
  fatherName: string;
  motherName: string;
  registrationNo: string;
  admissionNo: string;
  status: 'valid' | 'warning' | 'error';
  isDeleted: boolean;
  errors: RowErrorState;
  warnings: RowWarningState;
}

interface ImportPreviewTableProps {
  rows: ParsedStudentRow[];
  targetClassId: string;
  targetClassName: string;
  targetAcademicYear: string;
  availableClasses: ClassInfo[];
  rollNoOrderMode: 'file' | 'alphabetical';
  onChangeRollNoOrder: (mode: 'file' | 'alphabetical') => void;
  onUpdateCell: (id: string, field: keyof ParsedStudentRow, value: any) => void;
  onDeleteRow: (id: string) => void;
  onRestoreRow: (id: string) => void;
  onFixAllDates: () => void;
  onFindAndReplace: (column: string, findText: string, replaceText: string) => void;
  onApplyClassSuggestion: (id: string, correctedName: string, correctedId: string) => void;
  onChangeRowClassToTarget: (id: string) => void;
  onChangeRowClassToDetected: (id: string, detectedClassId: string, detectedClassName: string) => void;
  // Missing required column mapper
  missingRequiredColumns: string[];
  detectedHeaders: string[];
  columnMappings: Record<string, string>;
  onUpdateColumnMapping: (standardKey: string, fileHeader: string) => void;
  // Skip errors setting
  skipErrors: boolean;
  onToggleSkipErrors: (val: boolean) => void;
}

export const ImportPreviewTable: React.FC<ImportPreviewTableProps> = ({
  rows,
  targetClassId,
  targetClassName,
  targetAcademicYear,
  availableClasses,
  rollNoOrderMode,
  onChangeRollNoOrder,
  onUpdateCell,
  onDeleteRow,
  onRestoreRow,
  onFixAllDates,
  onFindAndReplace,
  onApplyClassSuggestion,
  onChangeRowClassToTarget,
  onChangeRowClassToDetected,
  missingRequiredColumns,
  detectedHeaders,
  columnMappings,
  onUpdateColumnMapping,
  skipErrors,
  onToggleSkipErrors,
}) => {
  // Filter tabs: 'all' | 'errors' | 'warnings' | 'valid' | 'deleted'
  const [filterTab, setFilterTab] = useState<'all' | 'errors' | 'warnings' | 'valid' | 'deleted'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Find and replace modal/bar
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [frColumn, setFrColumn] = useState<string>('class');
  const [frFind, setFrFind] = useState('');
  const [frReplace, setFrReplace] = useState('');

  // Row refs for "Go to next error"
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const activeRows = rows.filter((r) => !r.isDeleted);
  const deletedRows = rows.filter((r) => r.isDeleted);

  const totalCount = activeRows.length;
  const errorCount = activeRows.filter((r) => r.status === 'error').length;
  const warningCount = activeRows.filter((r) => r.status === 'warning').length;
  const validCount = activeRows.filter((r) => r.status === 'valid').length;
  const duplicateCount = activeRows.filter((r) => Boolean(r.errors.duplicate)).length;

  // Jump to next error
  const handleGoToNextError = () => {
    const firstError = activeRows.find((r) => r.status === 'error');
    if (firstError) {
      const el = rowRefs.current[firstError.id];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('bg-red-100');
        setTimeout(() => el.classList.remove('bg-red-100'), 1500);
      }
    }
  };

  const handleApplyFindReplace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frFind) return;
    onFindAndReplace(frColumn, frFind, frReplace);
    setFrFind('');
    setFrReplace('');
    setShowFindReplace(false);
  };

  const handleDownloadErrorsExcel = () => {
    const invalidList = activeRows
      .filter((r) => r.status === 'error' || r.status === 'warning')
      .map((r) => {
        const reasons = [
          ...Object.values(r.errors).filter(Boolean),
          r.warnings.classMismatch ? `Class mismatch: ${r.class}` : undefined,
          r.warnings.classDidYouMean ? `Unknown class. Suggestion: ${r.warnings.classDidYouMean}` : undefined,
          r.warnings.ageWarning,
        ].filter(Boolean);

        return {
          rowNumber: r.rowNumber,
          data: r,
          reason: reasons.join('; ') || 'Validation warning',
        };
      });
    downloadErrorReport(invalidList);
  };

  // Filter rows
  const filteredRows = rows.filter((row) => {
    if (filterTab === 'deleted') return row.isDeleted;
    if (row.isDeleted) return false;

    if (filterTab === 'errors' && row.status !== 'error') return false;
    if (filterTab === 'warnings' && row.status !== 'warning') return false;
    if (filterTab === 'valid' && row.status !== 'valid') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        row.name.toLowerCase().includes(q) ||
        row.fatherName.toLowerCase().includes(q) ||
        row.rollNo.includes(q) ||
        row.dob.includes(q) ||
        row.class.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="space-y-3.5 text-xs">
      {/* Missing Required Columns Alert & Mapper */}
      {missingRequiredColumns.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-amber-950 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Missing Required Column Headers: {missingRequiredColumns.join(', ')}</span>
          </div>
          <p className="text-[11px] text-amber-800">
            We couldn&apos;t automatically match some required columns. Please select which header from your spreadsheet corresponds to each field:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {['name', 'class', 'fatherName', 'dob'].map((fieldKey) => {
              const label =
                fieldKey === 'name'
                  ? 'Student Name *'
                  : fieldKey === 'class'
                  ? 'Class *'
                  : fieldKey === 'fatherName'
                  ? "Father's Name *"
                  : 'Date of Birth *';

              return (
                <div key={fieldKey} className="bg-white p-2 rounded border border-amber-200">
                  <label className="font-semibold block mb-1 text-slate-700 text-[11px]">
                    {label}:
                  </label>
                  <select
                    value={columnMappings[fieldKey] || ''}
                    onChange={(e) => onUpdateColumnMapping(fieldKey, e.target.value)}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white text-slate-800"
                  >
                    <option value="">-- Select File Header --</option>
                    {detectedHeaders.map((hdr) => (
                      <option key={hdr} value={hdr}>
                        {hdr}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Total Rows
            </span>
            <span className="text-base font-bold text-slate-900 font-mono">
              {totalCount}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">in file</span>
        </div>

        <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Valid
            </span>
            <span className="text-base font-bold text-emerald-900 font-mono">
              {validCount}
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">ready to import</span>
        </div>

        <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              Warnings
            </span>
            <span className="text-base font-bold text-amber-900 font-mono">
              {warningCount}
            </span>
          </div>
          <span className="text-[10px] text-amber-700 font-medium">soft issues</span>
        </div>

        <div className="p-2.5 bg-red-50/70 border border-red-200 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-red-800 tracking-wider block flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-red-600" />
              Errors
            </span>
            <span className="text-base font-bold text-red-900 font-mono">
              {errorCount}
            </span>
          </div>
          <span className="text-[10px] text-red-700 font-medium">must fix / skip</span>
        </div>

        <div className="p-2.5 bg-purple-50/70 border border-purple-200 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-purple-800 tracking-wider block">
              Duplicates
            </span>
            <span className="text-base font-bold text-purple-900 font-mono">
              {duplicateCount}
            </span>
          </div>
          <span className="text-[10px] text-purple-700 font-medium">name+father+dob</span>
        </div>
      </div>

      {/* Toolbar & Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 bg-slate-100/90 rounded-lg border border-slate-200">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
              filterTab === 'all'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('errors')}
            className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1 ${
              filterTab === 'errors'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'text-red-700 hover:bg-red-50'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            <span>Errors ({errorCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('warnings')}
            className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1 ${
              filterTab === 'warnings'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Warnings ({warningCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('valid')}
            className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1 ${
              filterTab === 'valid'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Valid ({validCount})</span>
          </button>
          {deletedRows.length > 0 && (
            <button
              type="button"
              onClick={() => setFilterTab('deleted')}
              className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                filterTab === 'deleted'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              Deleted ({deletedRows.length})
            </button>
          )}
        </div>

        {/* Action Tools */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Roll No. ordering toggle */}
          <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-300 text-[11px]">
            <ArrowUpDown className="w-3 h-3 text-slate-500" />
            <span className="text-slate-500">Roll No. Order:</span>
            <button
              type="button"
              onClick={() => onChangeRollNoOrder('file')}
              className={`px-1.5 py-0.5 rounded font-semibold cursor-pointer ${
                rollNoOrderMode === 'file'
                  ? 'bg-teal-100 text-teal-800'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Same as file
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => onChangeRollNoOrder('alphabetical')}
              className={`px-1.5 py-0.5 rounded font-semibold cursor-pointer ${
                rollNoOrderMode === 'alphabetical'
                  ? 'bg-teal-100 text-teal-800'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Alphabetical
            </button>
          </div>

          {/* Fix all dates tool */}
          <button
            type="button"
            onClick={onFixAllDates}
            className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-slate-300 hover:border-teal-400 text-teal-800 rounded font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            title="Auto-format all dates into dd-mm-yyyy"
          >
            <Wand2 className="w-3 h-3 text-teal-600" />
            <span>Fix all dates in column</span>
          </button>

          {/* Find & Replace tool */}
          <button
            type="button"
            onClick={() => setShowFindReplace((prev) => !prev)}
            className={`px-2.5 py-1 border rounded font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer ${
              showFindReplace
                ? 'bg-teal-700 text-white border-teal-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
          >
            <Search className="w-3 h-3" />
            <span>Find &amp; Replace</span>
          </button>

          {/* Go to next error */}
          {errorCount > 0 && (
            <button
              type="button"
              onClick={handleGoToNextError}
              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-300 text-red-800 rounded font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowDown className="w-3 h-3 text-red-600" />
              <span>Go to next error</span>
            </button>
          )}

          {/* Download error report */}
          {(errorCount > 0 || warningCount > 0) && (
            <button
              type="button"
              onClick={handleDownloadErrorsExcel}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              title="Download spreadsheet report of rows with issues"
            >
              <Download className="w-3 h-3 text-slate-500" />
              <span>Download Error Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Find and Replace Popover Bar */}
      {showFindReplace && (
        <form
          onSubmit={handleApplyFindReplace}
          className="p-3 bg-teal-50/90 border border-teal-300 rounded-lg flex flex-wrap items-center gap-2 animate-in fade-in duration-100"
        >
          <span className="font-bold text-teal-900 text-xs">Find &amp; Replace in:</span>
          <select
            value={frColumn}
            onChange={(e) => setFrColumn(e.target.value)}
            className="px-2 py-1 border border-slate-300 rounded bg-white text-xs text-slate-800"
          >
            <option value="class">Class</option>
            <option value="section">Section</option>
            <option value="currentAddress">Current Address</option>
            <option value="gender">Gender</option>
            <option value="fatherName">Father&apos;s Name</option>
            <option value="motherName">Mother&apos;s Name</option>
          </select>

          <input
            type="text"
            placeholder="Find text..."
            value={frFind}
            onChange={(e) => setFrFind(e.target.value)}
            className="px-2.5 py-1 border border-slate-300 rounded bg-white text-xs w-36"
            required
          />

          <span className="text-teal-700 font-bold">&rarr;</span>

          <input
            type="text"
            placeholder="Replace with..."
            value={frReplace}
            onChange={(e) => setFrReplace(e.target.value)}
            className="px-2.5 py-1 border border-slate-300 rounded bg-white text-xs w-36"
          />

          <button
            type="submit"
            className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded text-xs cursor-pointer shadow-2xs"
          >
            Replace All
          </button>

          <button
            type="button"
            onClick={() => setShowFindReplace(false)}
            className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs cursor-pointer"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Review & Edit Table */}
      <div
        ref={tableContainerRef}
        className="border border-slate-200 rounded-lg overflow-x-auto max-h-[50vh] bg-white shadow-2xs"
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/90 text-slate-700 sticky top-0 z-10 border-b border-slate-300 select-none">
            <tr>
              <th className="py-2 px-2.5 font-bold text-center w-12 border-r border-slate-200">#</th>
              <th className="py-2 px-2.5 font-bold min-w-[160px] border-r border-slate-200">
                Student Name <span className="text-red-500">*</span>
              </th>
              <th className="py-2 px-2.5 font-bold min-w-[110px] border-r border-slate-200">
                Class <span className="text-red-500">*</span>
              </th>
              <th className="py-2 px-2 font-bold w-16 text-center border-r border-slate-200">
                Sec <span className="text-red-500">*</span>
              </th>
              <th className="py-2 px-2 font-bold w-16 text-center border-r border-slate-200">
                Roll No.
              </th>
              <th className="py-2 px-2.5 font-bold min-w-[115px] border-r border-slate-200">
                DOB (dd-mm-yyyy) <span className="text-red-500">*</span>
              </th>
              <th className="py-2 px-2 font-bold min-w-[85px] border-r border-slate-200">
                Gender <span className="text-red-500">*</span>
              </th>
              <th className="py-2 px-2.5 font-bold min-w-[160px] border-r border-slate-200">
                Current Address
              </th>
              <th className="py-2 px-2.5 font-bold min-w-[150px] border-r border-slate-200">
                Father&apos;s Name <span className="text-red-500">*</span>
              </th>
              <th className="py-2 px-2.5 font-bold min-w-[140px] border-r border-slate-200">
                Mother&apos;s Name
              </th>
              <th className="py-2 px-2.5 font-bold min-w-[90px] text-center border-r border-slate-200">
                Status
              </th>
              <th className="py-2 px-2 font-bold w-12 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-8 text-center text-slate-400">
                  No student records match the active filter.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const hasError = row.status === 'error';
                const hasWarning = row.status === 'warning';
                const isCrossClass =
                  Boolean(row.warnings.classMismatch) &&
                  row.warnings.classMismatch?.detectedClassId !== targetClassId;

                return (
                  <tr
                    key={row.id}
                    ref={(el) => {
                      rowRefs.current[row.id] = el;
                    }}
                    className={`transition-colors ${
                      row.isDeleted
                        ? 'opacity-40 bg-slate-100 line-through'
                        : hasError
                        ? 'bg-red-50/40 hover:bg-red-50/70'
                        : hasWarning
                        ? 'bg-amber-50/40 hover:bg-amber-50/70'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Row Index */}
                    <td className="py-2 px-2 text-center text-slate-500 font-mono text-[11px] border-r border-slate-200">
                      {row.rowNumber}
                    </td>

                    {/* Student Name */}
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <input
                        type="text"
                        disabled={row.isDeleted}
                        value={row.name}
                        onChange={(e) => onUpdateCell(row.id, 'name', e.target.value.toUpperCase())}
                        className={`w-full px-2 py-1 rounded border text-xs uppercase font-medium focus:ring-1 focus:outline-none ${
                          row.errors.name
                            ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-500'
                            : 'border-slate-300 bg-white text-slate-800 focus:ring-teal-500'
                        }`}
                        placeholder="STUDENT NAME"
                      />
                      {row.errors.name && (
                        <span className="text-[10px] text-red-600 block mt-0.5 leading-tight font-medium">
                          {row.errors.name}
                        </span>
                      )}
                      {row.errors.duplicate && (
                        <span className="text-[10px] text-purple-700 block mt-0.5 leading-tight font-medium">
                          {row.errors.duplicate}
                        </span>
                      )}
                    </td>

                    {/* Class */}
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <input
                        type="text"
                        disabled={row.isDeleted}
                        value={row.class}
                        onChange={(e) => onUpdateCell(row.id, 'class', e.target.value)}
                        className={`w-full px-2 py-1 rounded border text-xs focus:ring-1 focus:outline-none ${
                          row.errors.class
                            ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-500'
                            : isCrossClass
                            ? 'border-amber-500 bg-amber-50 text-amber-900 focus:ring-amber-500'
                            : 'border-slate-300 bg-white text-slate-800 focus:ring-teal-500'
                        }`}
                        placeholder="Class"
                      />
                      {row.errors.class && (
                        <span className="text-[10px] text-red-600 block mt-0.5 leading-tight font-medium">
                          {row.errors.class}
                        </span>
                      )}
                      {/* Did you mean suggestion */}
                      {row.warnings.classDidYouMean && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-800">
                          <span>Did you mean <strong>{row.warnings.classDidYouMean}</strong>?</span>
                          <button
                            type="button"
                            onClick={() => {
                              const match = availableClasses.find(
                                (c) => c.name.toLowerCase() === row.warnings.classDidYouMean?.toLowerCase()
                              );
                              if (match) {
                                onApplyClassSuggestion(row.id, match.name, match.id);
                              }
                            }}
                            className="text-teal-700 font-bold underline hover:text-teal-900 cursor-pointer"
                          >
                            Apply
                          </button>
                        </div>
                      )}
                      {/* Cross-Class Mismatch 1-Click Fixes */}
                      {isCrossClass && row.warnings.classMismatch && (
                        <div className="mt-1 p-1 bg-amber-100/80 rounded text-[10px] text-amber-900 space-y-0.5">
                          <span className="font-semibold block">
                            Different Class: {row.warnings.classMismatch.detectedClassName}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => onChangeRowClassToTarget(row.id)}
                              className="text-left text-teal-800 hover:text-teal-950 font-bold underline cursor-pointer"
                            >
                              &rarr; Change to Class {targetClassName}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onChangeRowClassToDetected(
                                  row.id,
                                  row.warnings.classMismatch!.detectedClassId,
                                  row.warnings.classMismatch!.detectedClassName
                                )
                              }
                              className="text-left text-amber-800 hover:text-amber-950 font-medium underline cursor-pointer"
                            >
                              &rarr; Import into Class {row.warnings.classMismatch.detectedClassName} instead
                            </button>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Section */}
                    <td className="py-1.5 px-1.5 text-center border-r border-slate-200">
                      <input
                        type="text"
                        disabled={row.isDeleted}
                        maxLength={2}
                        value={row.section}
                        onChange={(e) => onUpdateCell(row.id, 'section', e.target.value.toUpperCase())}
                        className={`w-full px-1.5 py-1 rounded border text-center text-xs uppercase font-semibold focus:ring-1 focus:outline-none ${
                          row.errors.section
                            ? 'border-red-500 bg-red-50 text-red-900'
                            : 'border-slate-300 bg-white text-slate-800 focus:ring-teal-500'
                        }`}
                      />
                      {row.errors.section && (
                        <span className="text-[10px] text-red-600 block mt-0.5 leading-tight font-medium">
                          {row.errors.section}
                        </span>
                      )}
                    </td>

                    {/* Roll No */}
                    <td className="py-1.5 px-1.5 text-center border-r border-slate-200">
                      <input
                        type="text"
                        disabled={row.isDeleted}
                        value={row.rollNo}
                        onChange={(e) => onUpdateCell(row.id, 'rollNo', e.target.value)}
                        className={`w-full px-1.5 py-1 rounded border text-center font-mono text-xs focus:ring-1 focus:outline-none ${
                          row.errors.rollNo
                            ? 'border-red-500 bg-red-50 text-red-900'
                            : 'border-slate-300 bg-white text-slate-800 focus:ring-teal-500'
                        }`}
                        placeholder="Auto"
                      />
                      {row.errors.rollNo && (
                        <span className="text-[10px] text-red-600 block mt-0.5 leading-tight font-medium">
                          {row.errors.rollNo}
                        </span>
                      )}
                    </td>

                    {/* Date of Birth */}
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <input
                        type="text"
                        disabled={row.isDeleted}
                        value={row.dob}
                        onChange={(e) => onUpdateCell(row.id, 'dob', e.target.value)}
                        className={`w-full px-2 py-1 rounded border font-mono text-xs focus:ring-1 focus:outline-none ${
                          row.errors.dob
                            ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-500'
                            : 'border-slate-300 bg-white text-slate-800 focus:ring-teal-500'
                        }`}
                        placeholder="dd-mm-yyyy"
                      />
                      {row.errors.dob && (
                        <span className="text-[10px] text-red-600 block mt-0.5 leading-tight font-medium">
                          {row.errors.dob}
                        </span>
                      )}
                      {row.warnings.ageWarning && !row.errors.dob && (
                        <span className="text-[10px] text-amber-700 block mt-0.5 leading-tight font-medium">
                          {row.warnings.ageWarning}
                        </span>
                      )}
                    </td>

                    {/* Gender */}
                    <td className="py-1.5 px-1.5 border-r border-slate-200">
                      <select
                        disabled={row.isDeleted}
                        value={row.gender}
                        onChange={(e) => onUpdateCell(row.id, 'gender', e.target.value)}
                        className={`w-full px-1.5 py-1 rounded border text-xs focus:ring-1 focus:outline-none bg-white ${
                          row.errors.gender
                            ? 'border-red-500 bg-red-50 text-red-900'
                            : 'border-slate-300 text-slate-800 focus:ring-teal-500'
                        }`}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {row.errors.gender && (
                        <span className="text-[10px] text-red-600 block mt-0.5 leading-tight font-medium">
                          {row.errors.gender}
                        </span>
                      )}
                    </td>

                    {/* Current Address */}
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <input
                        type="text"
                        disabled={row.isDeleted}
                        value={row.currentAddress}
                        onChange={(e) => onUpdateCell(row.id, 'currentAddress', e.target.value)}
                        className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs text-slate-800 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                        placeholder="Village, Post, PIN"
                      />
                      {row.warnings.missingAddress && !row.currentAddress && (
                        <span className="text-[10px] text-amber-600 block mt-0.5 leading-tight">
                          Address empty (optional)
                        </span>
                      )}
                    </td>

                    {/* Father's Name */}
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <input
                        type="text"
                        disabled={row.isDeleted}
                        value={row.fatherName}
                        onChange={(e) => onUpdateCell(row.id, 'fatherName', e.target.value.toUpperCase())}
                        className={`w-full px-2 py-1 rounded border text-xs uppercase focus:ring-1 focus:outline-none ${
                          row.errors.fatherName
                            ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-500'
                            : 'border-slate-300 bg-white text-slate-800 focus:ring-teal-500'
                        }`}
                        placeholder="FATHER'S NAME"
                      />
                      {row.errors.fatherName && (
                        <span className="text-[10px] text-red-600 block mt-0.5 leading-tight font-medium">
                          {row.errors.fatherName}
                        </span>
                      )}
                    </td>

                    {/* Mother's Name */}
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <input
                        type="text"
                        disabled={row.isDeleted}
                        value={row.motherName}
                        onChange={(e) => onUpdateCell(row.id, 'motherName', e.target.value.toUpperCase())}
                        className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs uppercase text-slate-800 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                        placeholder="MOTHER'S NAME"
                      />
                      {row.warnings.missingMother && !row.motherName && (
                        <span className="text-[10px] text-amber-600 block mt-0.5 leading-tight">
                          Mother empty (optional)
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 whitespace-nowrap">
                      {row.isDeleted ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                          Deleted
                        </span>
                      ) : hasError ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          <AlertCircle className="w-3 h-3 text-red-600" />
                          <span>Error</span>
                        </span>
                      ) : hasWarning ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Warning</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Valid</span>
                        </span>
                      )}
                    </td>

                    {/* Action Column */}
                    <td className="py-1.5 px-2 text-center">
                      {row.isDeleted ? (
                        <button
                          type="button"
                          onClick={() => onRestoreRow(row.id)}
                          className="p-1 text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded cursor-pointer"
                          title="Restore row"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onDeleteRow(row.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Delete row from import"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Yellow Warning Bar if Errors Remain */}
      {errorCount > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-950 block">
                {errorCount} student row(s) contain validation errors.
              </span>
              <p className="text-[11px] text-amber-800">
                You can fix the highlighted red cells directly in the table above, or choose to skip the invalid rows and import only the valid records.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 p-2 bg-white rounded border border-amber-300 font-semibold text-slate-800 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={skipErrors}
              onChange={(e) => onToggleSkipErrors(e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-[11px]">
              Skip rows with errors and import {validCount + warningCount} valid student(s)
            </span>
          </label>
        </div>
      )}
    </div>
  );
};
