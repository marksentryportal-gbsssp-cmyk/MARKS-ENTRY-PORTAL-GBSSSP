import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { usePortal } from '../../store/portalStore';
import { Student } from '../../types';
import { StepIndicator } from './StepIndicator';
import { FileDropzone } from './FileDropzone';
import { ImportPreviewTable, ParsedRowItem } from './ImportPreviewTable';
import {
  matchHeaderToKey,
  normalizeDateInput,
  normalizeGender,
  StandardHeaderKey,
} from '../../utils/excelUtils';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClassId: string;
  targetClassName: string;
  targetAcademicYear: string;
  targetExamId: string;
  onImportComplete?: (importedStudentIds: string[]) => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  targetClassId,
  targetClassName,
  targetAcademicYear,
  targetExamId,
  onImportComplete,
}) => {
  const {
    students,
    createStudent,
    updateStudent,
    generateNextRegNo,
    addStudentToExam,
    addToast,
  } = usePortal();

  // Workflow Step: 1 = Upload, 2 = Preview/Validate, 3 = Complete
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Raw file metadata
  const [loadedFileName, setLoadedFileName] = useState<string>('');
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [rawSheetRows, setRawSheetRows] = useState<any[]>([]);

  // Parsed and validated rows
  const [previewRows, setPreviewRows] = useState<ParsedRowItem[]>([]);

  // Duplicate settings
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update'>('skip');

  // Import Execution state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    skipped: number;
    errors: number;
  }>({ imported: 0, skipped: 0, errors: 0 });

  if (!isOpen) return null;

  // Validation function that maps and checks rows
  const validateRows = (
    rawRows: any[],
    mappings: Record<string, string>,
    existingStudents: Student[]
  ): ParsedRowItem[] => {
    const parsedList: ParsedRowItem[] = [];
    const seenRegNosInFile = new Set<string>();

    rawRows.forEach((rowObj, idx) => {
      const getVal = (standardKey: StandardHeaderKey) => {
        const fileCol = mappings[standardKey];
        if (!fileCol) return '';
        const v = rowObj[fileCol];
        return v !== undefined && v !== null ? v : '';
      };

      const rawRegNo = String(getVal('registrationNo')).trim();
      const rawName = String(getVal('name')).trim().toUpperCase();
      const rawFather = String(getVal('fatherName')).trim().toUpperCase();
      const rawMother = String(getVal('motherName')).trim().toUpperCase();
      const rawDob = getVal('dob');
      const rawGender = getVal('gender');
      const rawSection = String(getVal('section')).trim().toUpperCase() || 'A';
      const rawRoll = String(getVal('rollNo')).trim() || String(idx + 1).padStart(2, '0');
      const rawAdm = String(getVal('admissionNo')).trim();

      const { dateStr: formattedDob, isValid: isDobValid } = normalizeDateInput(rawDob);
      const normalizedGen = normalizeGender(rawGender);

      // Status check
      let status: 'valid' | 'duplicate' | 'error' = 'valid';
      let errorMessage = '';

      if (!rawName) {
        status = 'error';
        errorMessage = 'Student Name is required';
      } else if (!rawFather) {
        status = 'error';
        errorMessage = "Father's Name is required";
      } else if (!isDobValid || !formattedDob) {
        status = 'error';
        errorMessage = 'Invalid DOB format (use dd-mm-yyyy)';
      } else if (rawRegNo) {
        // Check duplicate in file
        if (seenRegNosInFile.has(rawRegNo)) {
          status = 'duplicate';
          errorMessage = 'Duplicate registration number in uploaded file';
        } else {
          seenRegNosInFile.add(rawRegNo);
          // Check duplicate against existing students in same class & academic year
          const existing = existingStudents.find(
            (s) =>
              s.registrationNo === rawRegNo &&
              s.classId === targetClassId &&
              s.academicYear === targetAcademicYear
          );
          if (existing) {
            status = 'duplicate';
            errorMessage = `Already enrolled in ${targetClassName} (${existing.name})`;
          }
        }
      }

      parsedList.push({
        id: `row-${idx}-${Date.now()}`,
        rowNumber: idx + 1,
        registrationNo: rawRegNo,
        name: rawName,
        fatherName: rawFather,
        motherName: rawMother,
        dob: formattedDob || String(rawDob || ''),
        gender: normalizedGen,
        section: rawSection,
        rollNo: rawRoll,
        admissionNo: rawAdm,
        status,
        errorMessage,
        selected: status === 'valid',
      });
    });

    return parsedList;
  };

  // Step 1: Read and parse file using SheetJS
  const handleFileLoaded = async (file: File) => {
    setLoadedFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert sheet to json with headers
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        defval: '',
        raw: false,
      });

      if (jsonRows.length === 0) {
        addToast('Spreadsheet appears to be empty or contains no data rows', 'error');
        return;
      }

      // Detect header keys from first row
      const sampleRow = jsonRows[0];
      const headers = Object.keys(sampleRow);
      setDetectedHeaders(headers);

      // Auto-map headers
      const newMappings: Record<string, string> = {};
      headers.forEach((hdr) => {
        const matchedKey = matchHeaderToKey(hdr);
        if (matchedKey && !newMappings[matchedKey]) {
          newMappings[matchedKey] = hdr;
        }
      });
      setColumnMappings(newMappings);
      setRawSheetRows(jsonRows);

      // Validate rows
      const validated = validateRows(jsonRows, newMappings, students);
      setPreviewRows(validated);
      setCurrentStep(2);
    } catch (err) {
      console.error(err);
      addToast('Failed to parse spreadsheet file', 'error');
    }
  };

  // Missing required columns check
  const missingRequired = ['name', 'fatherName', 'dob'].filter(
    (key) => !columnMappings[key]
  );

  const handleUpdateColumnMapping = (key: string, fileHeader: string) => {
    const updated = { ...columnMappings, [key]: fileHeader };
    setColumnMappings(updated);
    const revalidated = validateRows(rawSheetRows, updated, students);
    setPreviewRows(revalidated);
  };

  // Inline row edit handler
  const handleUpdateRow = (id: string, field: keyof ParsedRowItem, value: any) => {
    setPreviewRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const updated = { ...row, [field]: value };
          // Re-evaluate validity
          let status: 'valid' | 'duplicate' | 'error' = 'valid';
          let errorMessage = '';

          if (!updated.name.trim()) {
            status = 'error';
            errorMessage = 'Student Name is required';
          } else if (!updated.fatherName.trim()) {
            status = 'error';
            errorMessage = "Father's Name is required";
          } else if (!updated.dob.trim() || !updated.dob.match(/^\d{2}-\d{2}-\d{4}$/)) {
            status = 'error';
            errorMessage = 'DOB must be dd-mm-yyyy';
          }

          return {
            ...updated,
            status,
            errorMessage,
            selected: status === 'valid' ? true : updated.selected,
          };
        }
        return row;
      })
    );
  };

  const handleToggleRowSelect = (id: string) => {
    setPreviewRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSelectAllValid = (selectAll: boolean) => {
    setPreviewRows((prev) =>
      prev.map((r) => {
        if (r.status === 'valid' || (r.status === 'duplicate' && duplicateAction === 'update')) {
          return { ...r, selected: selectAll };
        }
        return r;
      })
    );
  };

  // Step 3: Execute Import
  const handleExecuteImport = async () => {
    const rowsToImport = previewRows.filter((r) => r.selected);
    if (rowsToImport.length === 0) {
      addToast('No rows selected for import', 'error');
      return;
    }

    setIsImporting(true);
    setImportProgress(10);

    const importedIds: string[] = [];
    let skippedCount = previewRows.filter((r) => !r.selected).length;
    let errorCount = previewRows.filter((r) => r.status === 'error').length;

    // Simulate progressive batching for large lists
    const total = rowsToImport.length;
    for (let i = 0; i < total; i++) {
      const row = rowsToImport[i];
      const regNo = row.registrationNo.trim() || generateNextRegNo();

      // Check if duplicate update
      const existingStudent = students.find(
        (s) => s.registrationNo === regNo && s.classId === targetClassId
      );

      if (existingStudent && duplicateAction === 'update') {
        updateStudent(existingStudent.id, {
          name: row.name,
          fatherName: row.fatherName,
          motherName: row.motherName || undefined,
          dob: row.dob,
          gender: row.gender,
          section: row.section,
          rollNo: row.rollNo,
          admissionNo: row.admissionNo || undefined,
        });
        addStudentToExam(targetExamId, existingStudent.id);
        importedIds.push(existingStudent.id);
      } else {
        const created = createStudent(
          {
            registrationNo: regNo,
            name: row.name,
            fatherName: row.fatherName,
            motherName: row.motherName || undefined,
            dob: row.dob,
            gender: row.gender,
            classId: targetClassId,
            section: row.section || 'A',
            rollNo: row.rollNo || String(i + 1).padStart(2, '0'),
            academicYear: targetAcademicYear,
            admissionNo: row.admissionNo || undefined,
            active: true,
          },
          targetExamId
        );
        importedIds.push(created.id);
      }

      if (i % 10 === 0 || i === total - 1) {
        setImportProgress(Math.round(((i + 1) / total) * 100));
        // Yield momentarily to let UI update
        await new Promise((r) => setTimeout(r, 15));
      }
    }

    setIsImporting(false);
    setImportSummary({
      imported: importedIds.length,
      skipped: skippedCount,
      errors: errorCount,
    });
    setCurrentStep(3);

    if (onImportComplete) {
      onImportComplete(importedIds);
    }
  };

  const handleResetModal = () => {
    setCurrentStep(1);
    setLoadedFileName('');
    setRawSheetRows([]);
    setPreviewRows([]);
    setImportProgress(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-teal-50 border border-teal-200 text-[#0f766e]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm md:text-base">
                Bulk Import Students &bull; Class {targetClassName} {targetAcademicYear}
              </h3>
              <p className="text-[11px] text-slate-400">
                Automated spreadsheet upload, duplicate validation &amp; exam enrollment
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetModal}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Step Indicator */}
        <StepIndicator currentStep={currentStep} />

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* STEP 1: Upload */}
          {currentStep === 1 && (
            <FileDropzone
              className={targetClassName}
              academicYear={targetAcademicYear}
              onFileLoaded={handleFileLoaded}
            />
          )}

          {/* STEP 2: Preview & Validate */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div className="text-xs text-slate-500">
                  File: <strong className="text-slate-800">{loadedFileName}</strong> &bull; Review candidate records before enrollment
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-[11px] text-teal-700 hover:underline flex items-center gap-1 font-semibold"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Choose Different File</span>
                </button>
              </div>

              <ImportPreviewTable
                rows={previewRows}
                onUpdateRow={handleUpdateRow}
                onToggleRowSelect={handleToggleRowSelect}
                onSelectAllValid={handleSelectAllValid}
                skipDuplicates={skipDuplicates}
                onToggleSkipDuplicates={setSkipDuplicates}
                duplicateAction={duplicateAction}
                onChangeDuplicateAction={setDuplicateAction}
                detectedHeaders={detectedHeaders}
                columnMappings={columnMappings}
                onUpdateColumnMapping={handleUpdateColumnMapping}
                missingRequiredColumns={missingRequired}
              />
            </div>
          )}

          {/* STEP 3: Complete & Progress */}
          {currentStep === 3 && (
            <div className="py-8 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h4 className="text-lg font-bold text-slate-800">
                Bulk Import Completed Successfully!
              </h4>

              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Imported</span>
                  <strong className="text-base text-emerald-700 font-mono">
                    {importSummary.imported}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Skipped</span>
                  <strong className="text-base text-amber-700 font-mono">
                    {importSummary.skipped}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Errors</span>
                  <strong className="text-base text-slate-500 font-mono">
                    {importSummary.errors}
                  </strong>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Candidates have been enrolled in <strong>Class {targetClassName}</strong> with initial marks entry status set to <em>&ldquo;Not Completed&rdquo;</em>. Newly added rows are highlighted in the student roster table.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetModal}
                  className="px-6 py-2.5 bg-[#0f766e] hover:bg-teal-800 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Done &amp; View Student Roster
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (for Step 2 actions) */}
        {currentStep === 2 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-3.5 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors"
            >
              Back to Upload
            </button>

            <div className="flex items-center gap-3">
              {isImporting && (
                <div className="flex items-center gap-2 text-xs text-teal-800 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
                  <span>Importing {importProgress}%...</span>
                </div>
              )}

              <button
                type="button"
                disabled={isImporting || previewRows.filter((r) => r.selected).length === 0}
                onClick={handleExecuteImport}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#0f766e] hover:bg-teal-800 disabled:opacity-40 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <span>
                  Import {previewRows.filter((r) => r.selected).length} Students
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
