import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Download,
  CheckSquare,
  Square,
  Edit2,
  RefreshCw,
} from 'lucide-react';
import { downloadErrorReport } from '../../utils/excelUtils';

export interface ParsedRowItem {
  id: string;
  rowNumber: number;
  registrationNo: string;
  name: string;
  fatherName: string;
  motherName: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  section: string;
  rollNo: string;
  admissionNo: string;
  status: 'valid' | 'duplicate' | 'error';
  errorMessage?: string;
  selected: boolean;
}

interface ImportPreviewTableProps {
  rows: ParsedRowItem[];
  onUpdateRow: (id: string, field: keyof ParsedRowItem, value: any) => void;
  onToggleRowSelect: (id: string) => void;
  onSelectAllValid: (selectAll: boolean) => void;
  skipDuplicates: boolean;
  onToggleSkipDuplicates: (val: boolean) => void;
  duplicateAction: 'skip' | 'update';
  onChangeDuplicateAction: (action: 'skip' | 'update') => void;
  detectedHeaders: string[];
  columnMappings: Record<string, string>;
  onUpdateColumnMapping: (standardKey: string, fileHeader: string) => void;
  missingRequiredColumns: string[];
  rollNoOrderMode: 'file' | 'alphabetical';
  onChangeRollNoOrder: (mode: 'file' | 'alphabetical') => void;
  fileHasRollNos?: boolean;
}

export const ImportPreviewTable: React.FC<ImportPreviewTableProps> = ({
  rows,
  onUpdateRow,
  onToggleRowSelect,
  onSelectAllValid,
  skipDuplicates,
  onToggleSkipDuplicates,
  duplicateAction,
  onChangeDuplicateAction,
  detectedHeaders,
  columnMappings,
  onUpdateColumnMapping,
  missingRequiredColumns,
  rollNoOrderMode,
  onChangeRollNoOrder,
  fileHasRollNos,
}) => {
  // Counts
  const totalRows = rows.length;
  const validRows = rows.filter((r) => r.status === 'valid').length;
  const duplicateRows = rows.filter((r) => r.status === 'duplicate').length;
  const errorRows = rows.filter((r) => r.status === 'error').length;
  const selectedCount = rows.filter((r) => r.selected).length;

  const allValidSelected =
    validRows > 0 &&
    rows
      .filter((r) => r.status === 'valid' || (r.status === 'duplicate' && duplicateAction === 'update'))
      .every((r) => r.selected);

  const handleDownloadErrors = () => {
    const invalidList = rows
      .filter((r) => r.status === 'error' || r.status === 'duplicate')
      .map((r) => ({
        rowNumber: r.rowNumber,
        data: r,
        reason: r.errorMessage || (r.status === 'duplicate' ? 'Duplicate registration number' : 'Validation error'),
      }));
    downloadErrorReport(invalidList);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Missing Required Columns Alert & Manual Mapper */}
      {missingRequiredColumns.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 space-y-3">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Missing Required Column Headers: {missingRequiredColumns.join(', ')}</span>
          </div>
          <p className="text-[11px] text-amber-800">
            Please map the columns below to match your uploaded spreadsheet headers:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {['name', 'fatherName', 'dob'].map((fieldKey) => {
              const label =
                fieldKey === 'name'
                  ? 'Student Name *'
                  : fieldKey === 'fatherName'
                  ? "Father's Name *"
                  : 'DOB *';

              return (
                <div key={fieldKey} className="bg-white p-2.5 rounded border border-amber-200">
                  <label className="font-semibold block mb-1 text-slate-700">
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

      {/* Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex flex-wrap items-center gap-3 font-medium">
          <span className="text-slate-700">
            Total Rows: <strong className="font-mono text-slate-900">{totalRows}</strong>
          </span>
          <span className="text-slate-300">&bull;</span>
          <span className="text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Valid: <strong className="font-mono">{validRows}</strong></span>
          </span>
          <span className="text-slate-300">&bull;</span>
          <span className="text-amber-700 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Duplicates: <strong className="font-mono">{duplicateRows}</strong></span>
          </span>
          <span className="text-slate-300">&bull;</span>
          <span className="text-red-700 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Errors: <strong className="font-mono">{errorRows}</strong></span>
          </span>
        </div>

        {/* Download error report if errors exist */}
        {(errorRows > 0 || duplicateRows > 0) && (
          <button
            type="button"
            onClick={handleDownloadErrors}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-red-300 text-red-700 hover:bg-red-50 rounded text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Error Report</span>
          </button>
        )}
      </div>

      {/* Duplicate Options Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-lg text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 select-none">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => onToggleSkipDuplicates(e.target.checked)}
              className="rounded text-teal-700 focus:ring-teal-500"
            />
            <span>Skip duplicate records</span>
          </label>

          {!skipDuplicates && (
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <span className="text-slate-500 font-medium">Duplicate Action:</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  name="duplicateAction"
                  value="skip"
                  checked={duplicateAction === 'skip'}
                  onChange={() => onChangeDuplicateAction('skip')}
                  className="text-teal-700"
                />
                <span>Skip</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  name="duplicateAction"
                  value="update"
                  checked={duplicateAction === 'update'}
                  onChange={() => onChangeDuplicateAction('update')}
                  className="text-teal-700"
                />
                <span>Update Existing</span>
              </label>
            </div>
          )}
        </div>

        {/* Select all valid toggle */}
        <button
          type="button"
          onClick={() => onSelectAllValid(!allValidSelected)}
          className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
        >
          {allValidSelected ? (
            <>
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Deselect All</span>
            </>
          ) : (
            <>
              <Square className="w-3.5 h-3.5" />
              <span>Select All Valid</span>
            </>
          )}
        </button>
      </div>

      {/* Preview Table with Inline Editing */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[380px] overflow-y-auto shadow-2xs">
        <table className="w-full text-xs text-left border-collapse bg-white">
          <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200 font-bold text-slate-700">
            <tr>
              <th className="py-2.5 px-3 border-r border-slate-200 text-center w-10">
                #
              </th>
              <th className="py-2.5 px-2.5 border-r border-slate-200 text-center w-12">
                Select
              </th>
              <th className="py-2.5 px-3 border-r border-slate-200 text-center w-36">
                Status
              </th>
              <th className="py-2.5 px-3 border-r border-slate-200 min-w-[150px]">
                Registration No
              </th>
              <th className="py-2.5 px-3 border-r border-slate-200 min-w-[170px]">
                Student Name *
              </th>
              <th className="py-2.5 px-3 border-r border-slate-200 min-w-[150px]">
                Father Name *
              </th>
              <th className="py-2.5 px-3 border-r border-slate-200 min-w-[100px]">
                DOB *
              </th>
              <th className="py-2.5 px-2.5 border-r border-slate-200 text-center min-w-[80px]">
                Gender
              </th>
              <th className="py-2.5 px-2 border-r border-slate-200 text-center w-14">
                Sec
              </th>
              <th className="py-2.5 px-2 border-r border-slate-200 text-center w-14">
                Roll
              </th>
              <th className="py-2.5 px-3 min-w-[120px]">
                Admission No
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => {
              const isError = row.status === 'error';
              const isDuplicate = row.status === 'duplicate';
              const isValid = row.status === 'valid';

              return (
                <tr
                  key={row.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    isError
                      ? 'bg-red-50/40'
                      : isDuplicate
                      ? 'bg-amber-50/40'
                      : ''
                  }`}
                >
                  {/* Row number */}
                  <td className="py-2 px-3 border-r border-slate-200 text-center font-mono text-slate-500">
                    {row.rowNumber}
                  </td>

                  {/* Select Checkbox */}
                  <td className="py-2 px-2.5 border-r border-slate-200 text-center">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      disabled={isError}
                      onChange={() => onToggleRowSelect(row.id)}
                      className="rounded text-teal-700 focus:ring-teal-500 disabled:opacity-30"
                    />
                  </td>

                  {/* Status */}
                  <td className="py-2 px-3 border-r border-slate-200">
                    {isValid && (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Valid</span>
                      </span>
                    )}
                    {isDuplicate && (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-700" title={row.errorMessage}>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Duplicate</span>
                      </span>
                    )}
                    {isError && (
                      <div className="font-semibold text-red-700 flex items-center gap-1" title={row.errorMessage}>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                        <span className="truncate max-w-[130px]">{row.errorMessage || 'Error'}</span>
                      </div>
                    )}
                  </td>

                  {/* Registration No (Editable) */}
                  <td className="py-1 px-2 border-r border-slate-200 font-mono">
                    <input
                      type="text"
                      value={row.registrationNo}
                      onChange={(e) => onUpdateRow(row.id, 'registrationNo', e.target.value)}
                      placeholder="(Auto-generate)"
                      className="w-full px-1.5 py-0.5 border border-transparent hover:border-slate-300 focus:border-teal-500 rounded text-xs bg-transparent focus:bg-white"
                    />
                  </td>

                  {/* Student Name (Editable) */}
                  <td className="py-1 px-2 border-r border-slate-200 font-medium">
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => onUpdateRow(row.id, 'name', e.target.value.toUpperCase())}
                      placeholder="Student Name *"
                      className={`w-full px-1.5 py-0.5 border rounded text-xs uppercase ${
                        !row.name.trim()
                          ? 'border-red-400 bg-red-50 text-red-900'
                          : 'border-transparent hover:border-slate-300 focus:border-teal-500 bg-transparent focus:bg-white'
                      }`}
                    />
                  </td>

                  {/* Father Name (Editable) */}
                  <td className="py-1 px-2 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.fatherName}
                      onChange={(e) => onUpdateRow(row.id, 'fatherName', e.target.value.toUpperCase())}
                      placeholder="Father Name *"
                      className={`w-full px-1.5 py-0.5 border rounded text-xs uppercase ${
                        !row.fatherName.trim()
                          ? 'border-red-400 bg-red-50 text-red-900'
                          : 'border-transparent hover:border-slate-300 focus:border-teal-500 bg-transparent focus:bg-white'
                      }`}
                    />
                  </td>

                  {/* DOB (Editable) */}
                  <td className="py-1 px-2 border-r border-slate-200 font-mono">
                    <input
                      type="text"
                      value={row.dob}
                      onChange={(e) => onUpdateRow(row.id, 'dob', e.target.value)}
                      placeholder="dd-mm-yyyy"
                      className="w-full px-1.5 py-0.5 border border-transparent hover:border-slate-300 focus:border-teal-500 rounded text-xs bg-transparent focus:bg-white"
                    />
                  </td>

                  {/* Gender */}
                  <td className="py-1 px-1.5 border-r border-slate-200 text-center">
                    <select
                      value={row.gender}
                      onChange={(e) => onUpdateRow(row.id, 'gender', e.target.value)}
                      className="w-full px-1 py-0.5 border border-transparent hover:border-slate-300 rounded text-xs bg-transparent focus:bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </td>

                  {/* Section */}
                  <td className="py-1 px-1 border-r border-slate-200 text-center font-mono">
                    <input
                      type="text"
                      value={row.section}
                      onChange={(e) => onUpdateRow(row.id, 'section', e.target.value.toUpperCase())}
                      className="w-full text-center px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-teal-500 rounded text-xs bg-transparent focus:bg-white"
                    />
                  </td>

                  {/* Roll No */}
                  <td className="py-1 px-1 border-r border-slate-200 text-center font-mono">
                    <input
                      type="text"
                      value={row.rollNo}
                      onChange={(e) => onUpdateRow(row.id, 'rollNo', e.target.value)}
                      className="w-full text-center px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-teal-500 rounded text-xs bg-transparent focus:bg-white"
                    />
                  </td>

                  {/* Admission No */}
                  <td className="py-1 px-2 font-mono">
                    <input
                      type="text"
                      value={row.admissionNo}
                      onChange={(e) => onUpdateRow(row.id, 'admissionNo', e.target.value)}
                      placeholder="Optional"
                      className="w-full px-1.5 py-0.5 border border-transparent hover:border-slate-300 focus:border-teal-500 rounded text-xs bg-transparent focus:bg-white"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-slate-500 flex items-center justify-between">
        <span>* Click on any cell in the table to fix validation errors before importing.</span>
        <span>
          Selected for import: <strong className="text-teal-800 font-bold">{selectedCount}</strong> rows
        </span>
      </div>
    </div>
  );
};
